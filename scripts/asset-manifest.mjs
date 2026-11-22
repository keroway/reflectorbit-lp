// 生成アセット（OGP 画像 / How to Play 動画）の「ソースと生成物の同期」を
// 環境非依存に検知するためのマニフェスト (#185)。
//
// 旧方式（CI で再生成して git diff --exit-code）は「再生成すればバイト一致する」
// 前提だったが、これは同一環境内でのみ成立し、ubuntu ランナーでは headless
// レンダリングのフォント差等で常にバイト差分が出て誤検知になった。
// 代わりに、生成コマンド（og:gen / video:howtoplay:gen）の実行時にソース一式の
// ハッシュを asset-manifest.json へ記録し、CI はソースのハッシュを再計算して
// 記録値と照合する。ハッシュ計算は決定論的（ファイル内容のみ）なので環境に依存しない。
// ソースを編集して生成コマンドを実行し忘れると、ハッシュが一致せず CI が落ちる。
//
// 使い方:
//   node scripts/asset-manifest.mjs verify        # 照合（CI 用。乖離があれば exit 1）
//   node scripts/asset-manifest.mjs update <key>  # 記録（gen スクリプトが呼ぶ）
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const manifestPath = resolve(root, "asset-manifest.json");

// キーごとのソース集合。生成スクリプト自身もソースに含める
// （出力パラメータの変更も「生成物の更新が要る変更」のため）。
// ディレクトリは再帰的に全ファイルを対象にする。
// 生成に使う依存（#366）。pnpm-lock.yaml のルート importer が参照するバージョン（#406）だけをハッシュに含める。
// package.json / lockfile 全体を入れると無関係な依存更新（Renovate）のたびに再生成が要るため、
// 生成物の出力に直接効くパッケージに限る。transitive（sharp の @img/* など）は
// 本体のバージョンに連動して上がるので追わない。
// 依存を増減したら .github/workflows/asset-drift.yml の pull_request.paths も確認する。
const DEPENDENCY_SETS = {
  og: ["sharp"],
  "how-to-play-video": ["hyperframes"],
};
const lockPath = resolve(root, "pnpm-lock.yaml");

// キーやパスを増減したら .github/workflows/asset-drift.yml の pull_request.paths も更新する。
const SOURCE_SETS = {
  og: ["public/og-default.svg", "scripts/gen-og.mjs"],
  "how-to-play-video": [
    "video/how-to-play",
    "scripts/gen-how-to-play-video.mjs",
  ],
};

// キーごとの期待する生成物。source hash が一致していても、これらが欠落・空なら
// verify を失敗させる（#189: source hash だけでは生成物自体の欠落を検出できない）。
//
// trailer / screenshots は SOURCE_SETS を持たない（本体リポジトリ由来のコミット済み
// 静的アセットで生成スクリプトが無いため、ソースハッシュとの照合は不可能）。
// 欠落・空ファイル検知のみで、意図しない削除・破損を asset-drift.yml でカバーする
// （trailer は #270、screenshots は #276）。
const EXPECTED_OUTPUTS = {
  og: ["public/og-default.png"],
  "how-to-play-video": [
    "public/videos/how-to-play.mp4",
    "public/videos/how-to-play.webm",
    "public/videos/how-to-play-poster.jpg",
  ],
  trailer: [
    "public/videos/trailer.mp4",
    "public/videos/trailer.webm",
    "public/videos/trailer-poster.jpg",
  ],
  screenshots: [
    "public/screenshots/screenshot-title.png",
    "public/screenshots/screenshot-playing.png",
    "public/screenshots/screenshot-gameover.png",
  ],
};

// 生成コマンドの案内（verify 失敗時のメッセージ用）。trailer は手動撮影・エンコードの
// ため生成コマンドが無く、docs/video.md の手順を案内する。
const REGEN_COMMANDS = {
  og: "pnpm run og:gen",
  "how-to-play-video": "pnpm run video:howtoplay:gen",
  trailer: "docs/video.md の Track A 節の手順で撮影・エンコードし直して",
  screenshots: "ゲーム本体リポジトリからスクリーンショットを撮り直して",
};

async function listFiles(path) {
  const abs = resolve(root, path);
  const info = await stat(abs);
  if (info.isFile()) return [abs];
  const entries = await readdir(abs, { withFileTypes: true, recursive: true });
  return (
    entries
      .filter((e) => e.isFile())
      .map((e) => join(e.parentPath, e.name))
      // hyperframes 0.9 系は生成時に video-state 等の作業ファイルを .hyperframes/ へ
      // 書き出す（コミットしない）。ソースではないのでハッシュから除外する。
      .filter((f) => !f.split(sep).includes(".hyperframes"))
  );
}

// lockfile のルート importer（`importers:` 配下の `  .:`）が実際に参照している解決バージョンを返す (#406)。
// `packages:` 全体を走査すると、複数バージョン共存時に「ルートの参照先だけ変わった」変更や
// 無関係な推移依存としての別バージョン追加を区別できない。生成スクリプトが import するのは
// ルート importer の直接依存なので、そこだけを見る。peer 付きサフィックス（`(@types/node@…)`）は
// 生成物に効かないため落とす。pnpm 12 の lockfile は先頭に環境用ドキュメント（importers が
// pnpm のみ）を持つので、`.` ブロックを全て走査して最初に見つかったものを採用する。
// 見つからなければ、検査を黙って素通りさせず例外にする。
export function resolveDependencyVersions(lockText, names) {
  const lines = lockText.split("\n");
  const rootBlocks = [];
  let inImporters = false;
  let current = null;
  for (const line of lines) {
    if (/^\S/.test(line)) {
      inImporters = /^importers:\s*$/.test(line);
      current = null;
    } else if (inImporters && /^ {2}\S/.test(line)) {
      current = /^ {2}\.:\s*$/.test(line) ? [] : null;
      if (current) rootBlocks.push(current);
    } else if (current) {
      current.push(line);
    }
  }
  const versions = [];
  for (const name of names) {
    const found = new Set();
    for (const block of rootBlocks) {
      const at = block.findIndex(
        (l) =>
          unquote(l.trim().slice(0, -1)) === name &&
          l.endsWith(":") &&
          /^ {6}\S/.test(l)
      );
      if (at < 0) continue;
      for (const l of block.slice(at + 1)) {
        if (/^ {6}\S/.test(l)) break;
        const m = l.match(/^ {8}version:\s*(.+?)\s*$/);
        if (m) found.add(unquote(m[1]).replace(/\(.*$/, ""));
      }
    }
    if (found.size === 0) {
      throw new Error(
        `pnpm-lock.yaml のルート importer に ${name} の解決バージョンがありません`
      );
    }
    for (const v of found) versions.push(`root:${name}@${v}\n`);
  }
  return versions;
}

function unquote(s) {
  return s.replace(/^['"]|['"]$/g, "");
}

export async function computeSourceHash(key, lockfile = lockPath) {
  const sources = SOURCE_SETS[key];
  if (!sources) throw new Error(`unknown manifest key: ${key}`);
  const files = (await Promise.all(sources.map(listFiles))).flat();
  const entries = await Promise.all(
    files.map(async (abs) => {
      const content = await readFile(abs);
      const digest = createHash("sha256").update(content).digest("hex");
      return `${relative(root, abs)}\n${digest}\n`;
    })
  );
  const deps = DEPENDENCY_SETS[key] ?? [];
  if (deps.length > 0) {
    entries.push(
      ...resolveDependencyVersions(await readFile(lockfile, "utf8"), deps)
    );
  }
  entries.sort();
  return createHash("sha256").update(entries.join("")).digest("hex");
}

// 新規作成（ファイル無し）だけを空扱いにする。読み込み失敗・不正 JSON を {} に
// 潰すと、updateManifest が既存の他キーを黙って上書き破棄する (#280)。
export async function readManifest(path = manifestPath) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return {};
    throw new Error(`${path} を読み込めません: ${e.message}`, { cause: e });
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`${path} が不正な JSON です: ${e.message}`, { cause: e });
  }
  // 配列は名前付きプロパティが JSON.stringify で落ち、null / プリミティブは
  // 代入で例外になる。書き込み前にオブジェクト以外を拒否する (#292)。
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${path} のトップレベルが JSON オブジェクトではありません`);
  }
  return parsed;
}

export async function updateManifest(key, path = manifestPath) {
  const manifest = await readManifest(path);
  manifest[key] = {
    source_hash: await computeSourceHash(key),
    generated_at: new Date().toISOString(),
  };
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`updated ${path} (${key})`);
}

async function findMissingOutputs(key) {
  const missing = [];
  for (const output of EXPECTED_OUTPUTS[key]) {
    const abs = resolve(root, output);
    const info = await stat(abs).catch(() => null);
    if (!info?.isFile() || info.size === 0) missing.push(output);
  }
  return missing;
}

async function verify() {
  const manifest = await readManifest();
  let failed = false;
  const keys = new Set([
    ...Object.keys(SOURCE_SETS),
    ...Object.keys(EXPECTED_OUTPUTS),
  ]);
  for (const key of keys) {
    const hasSourceSet = key in SOURCE_SETS;
    const recorded = manifest[key]?.source_hash;
    const actual = hasSourceSet ? await computeSourceHash(key) : null;
    const missingOutputs = await findMissingOutputs(key);
    if ((!hasSourceSet || recorded === actual) && missingOutputs.length === 0) {
      console.log(`${key}: ok`);
      continue;
    }
    failed = true;
    if (missingOutputs.length > 0) {
      const action = hasSourceSet
        ? `ローカルで ${REGEN_COMMANDS[key]} を実行して`
        : REGEN_COMMANDS[key];
      console.error(
        `::error::${key}: 生成物が欠落または空です (${missingOutputs.join(", ")})。${action}、生成物${hasSourceSet ? "と asset-manifest.json " : " "}をコミットしてください。`
      );
    }
    if (hasSourceSet && recorded !== actual) {
      const hint = recorded
        ? "ソースが生成コマンドの実行後に変更されています"
        : "マニフェストに記録がありません";
      console.error(
        `::error::${key}: ${hint}。ローカルで ${REGEN_COMMANDS[key]} を実行して、生成物と asset-manifest.json をコミットしてください。`
      );
    }
  }
  if (failed) process.exit(1);
}

const command = process.argv[2];
if (command === "verify") {
  await verify();
} else if (command === "update") {
  const key = process.argv[3];
  if (!key) {
    console.error("usage: node scripts/asset-manifest.mjs update <key>");
    process.exit(2);
  }
  await updateManifest(key);
} else if (command !== undefined) {
  console.error("usage: node scripts/asset-manifest.mjs <verify|update <key>>");
  process.exit(2);
}
