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
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const manifestPath = resolve(root, "asset-manifest.json");

// キーごとのソース集合。生成スクリプト自身もソースに含める
// （出力パラメータの変更も「生成物の更新が要る変更」のため）。
// ディレクトリは再帰的に全ファイルを対象にする。
const SOURCE_SETS = {
  og: ["public/og-default.svg", "scripts/gen-og.mjs"],
  "how-to-play-video": [
    "video/how-to-play",
    "scripts/gen-how-to-play-video.mjs",
  ],
};

// 生成コマンドの案内（verify 失敗時のメッセージ用）
const REGEN_COMMANDS = {
  og: "pnpm run og:gen",
  "how-to-play-video": "pnpm run video:howtoplay:gen",
};

async function listFiles(path) {
  const abs = resolve(root, path);
  const info = await stat(abs);
  if (info.isFile()) return [abs];
  const entries = await readdir(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

export async function computeSourceHash(key) {
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
  entries.sort();
  return createHash("sha256").update(entries.join("")).digest("hex");
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

export async function updateManifest(key) {
  const manifest = await readManifest();
  manifest[key] = {
    source_hash: await computeSourceHash(key),
    generated_at: new Date().toISOString(),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`updated ${manifestPath} (${key})`);
}

async function verify() {
  const manifest = await readManifest();
  let failed = false;
  for (const key of Object.keys(SOURCE_SETS)) {
    const recorded = manifest[key]?.source_hash;
    const actual = await computeSourceHash(key);
    if (recorded === actual) {
      console.log(`${key}: ok`);
      continue;
    }
    failed = true;
    const hint = recorded
      ? "ソースが生成コマンドの実行後に変更されています"
      : "マニフェストに記録がありません";
    console.error(
      `::error::${key}: ${hint}。ローカルで ${REGEN_COMMANDS[key]} を実行して、生成物と asset-manifest.json をコミットしてください。`
    );
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
