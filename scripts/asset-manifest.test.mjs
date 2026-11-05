// asset-manifest.mjs の readManifest / updateManifest の回帰テスト (#280)。
// 実行: node --test scripts/asset-manifest.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  computeSourceHash,
  readManifest,
  resolveDependencyVersions,
  updateManifest,
} from "./asset-manifest.mjs";

async function withTempManifest(fn) {
  const dir = await mkdtemp(join(tmpdir(), "asset-manifest-"));
  try {
    await fn(join(dir, "asset-manifest.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("ファイルが無ければ新規作成として空オブジェクトを返す", async () => {
  await withTempManifest(async (path) => {
    assert.deepEqual(await readManifest(path), {});
    await updateManifest("og", path);
    assert.deepEqual(Object.keys(JSON.parse(await readFile(path, "utf8"))), [
      "og",
    ]);
  });
});

test("更新しても他キーを保持する", async () => {
  await withTempManifest(async (path) => {
    const other = { source_hash: "abc", generated_at: "2026-01-01T00:00:00Z" };
    await writeFile(path, JSON.stringify({ "how-to-play-video": other }));
    await updateManifest("og", path);
    const result = JSON.parse(await readFile(path, "utf8"));
    assert.deepEqual(result["how-to-play-video"], other);
    assert.ok(result.og.source_hash);
  });
});

test("不正 JSON のときは停止し、ファイルを書き換えない", async () => {
  await withTempManifest(async (path) => {
    const broken = '{"how-to-play-video": {';
    await writeFile(path, broken);
    await assert.rejects(updateManifest("og", path), /不正な JSON/);
    assert.equal(await readFile(path, "utf8"), broken);
  });
});

test("トップレベルが非オブジェクトの JSON は拒否し、ファイルを書き換えない", async () => {
  for (const content of ["[]", "null", "42", '"text"']) {
    await withTempManifest(async (path) => {
      await writeFile(path, content);
      await assert.rejects(
        updateManifest("og", path),
        /JSON オブジェクトではありません/
      );
      assert.equal(await readFile(path, "utf8"), content);
    });
  }
});

test("ENOENT 以外の読み込み失敗（ディレクトリ等）は停止する", async () => {
  await withTempManifest(async (path) => {
    const dir = join(path, "..");
    await assert.rejects(readManifest(dir), /読み込めません/);
  });
});

const lock = (sharp, hyperframes, extra = "") => `lockfileVersion: '9.0'

packages:

  '@img/sharp-linux-x64@${sharp}':
    cpu: [x64]

  hyperframes@${hyperframes}:
    engines: {node: '>=22'}

  sharp@${sharp}:
    engines: {node: '>=20'}
${extra}
snapshots:

  sharp@${sharp}(@types/node@24.0.0):
    dependencies: {}
`;

async function hashWithLock(key, text) {
  const dir = await mkdtemp(join(tmpdir(), "asset-lock-"));
  try {
    const path = join(dir, "pnpm-lock.yaml");
    await writeFile(path, text);
    return await computeSourceHash(key, path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("解決バージョンを packages セクションから取り出す（peer 付き snapshots と @img/* は除く）", () => {
  assert.deepEqual(
    resolveDependencyVersions(lock("0.35.5", "0.8.1"), ["sharp"]),
    ["dep:sharp@0.35.5\n"]
  );
});

test("依存が lockfile に無ければ例外にする", () => {
  assert.throws(
    () => resolveDependencyVersions("packages:\n", ["sharp"]),
    /sharp の解決バージョンがありません/
  );
});

test("生成ツールのバージョンが変わるとそのキーのハッシュだけ変わる (#366)", async () => {
  const base = lock("0.35.5", "0.8.1");
  const sharpUp = lock("0.35.6", "0.8.1");
  const hyperUp = lock("0.35.5", "0.8.2");
  assert.notEqual(
    await hashWithLock("og", base),
    await hashWithLock("og", sharpUp)
  );
  assert.equal(
    await hashWithLock("og", base),
    await hashWithLock("og", hyperUp)
  );
  assert.notEqual(
    await hashWithLock("how-to-play-video", base),
    await hashWithLock("how-to-play-video", hyperUp)
  );
  assert.equal(
    await hashWithLock("how-to-play-video", base),
    await hashWithLock("how-to-play-video", sharpUp)
  );
});

test("無関係な依存の追加・更新ではハッシュが変わらない (#366)", async () => {
  const extra = "\n  other@9.9.9:\n    engines: {node: '>=20'}\n";
  assert.equal(
    await hashWithLock("og", lock("0.35.5", "0.8.1")),
    await hashWithLock("og", lock("0.35.5", "0.8.1", extra))
  );
});
