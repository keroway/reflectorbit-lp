// asset-manifest.mjs の readManifest / updateManifest の回帰テスト (#280)。
// 実行: node --test scripts/asset-manifest.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readManifest, updateManifest } from "./asset-manifest.mjs";

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

test("ENOENT 以外の読み込み失敗（ディレクトリ等）は停止する", async () => {
  await withTempManifest(async (path) => {
    const dir = join(path, "..");
    await assert.rejects(readManifest(dir), /読み込めません/);
  });
});
