// public/_headers (Cloudflare Pages のレスポンスヘッダ定義) を静的にパースし、
// `/*` ブロックにセキュリティ関連の必須ディレクティブが揃っているかを検証する。
// Cloudflare Pages の _headers パーサは不正な行を黙ってスキップする仕様のため、
// インデント崩れやキー名の typo があっても本番で気づきにくい（#264）。
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const headersPath = resolve(root, "public/_headers");

// #261 で設定したセキュリティヘッダ一式。増減したらここも同時に更新する。
const REQUIRED_DIRECTIVES = [
  "Content-Security-Policy",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
];

// Cloudflare Pages の _headers 記法: パス行 (行頭、非空白開始) の後に、
// インデントされた `Key: Value` 行が続く。空行・`#` コメントは無視する。
// 参考: https://developers.cloudflare.com/pages/configuration/headers/
export function parseHeaders(text) {
  const blocks = [];
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const isIndented = /^\s/.test(line);
    if (!isIndented) {
      current = { path: line.trim(), directives: [] };
      blocks.push(current);
      continue;
    }

    if (!current) {
      // パス行より前にインデント行が来るのは不正な記法。
      throw new Error(`パス行が無いままヘッダ行が出現しました: "${line}"`);
    }

    const match = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      throw new Error(`"Key: Value" 形式で解釈できない行です: "${line}"`);
    }
    const [, key, value] = match;
    current.directives.push({ key: key.trim(), value: value.trim() });
  }

  return blocks;
}

export function checkBlocks(blocks) {
  const violations = [];

  const wildcard = blocks.find((b) => b.path === "/*");
  if (!wildcard) {
    violations.push("`/*` ブロックが見つかりません");
    return violations;
  }

  const keys = wildcard.directives.map((d) => d.key);
  for (const required of REQUIRED_DIRECTIVES) {
    if (!keys.includes(required)) {
      violations.push(`\`/*\` ブロックに ${required} がありません`);
    }
  }

  for (const { key, value } of wildcard.directives) {
    if (value === "") {
      violations.push(`${key} の値が空です`);
    }
  }

  return violations;
}

function main() {
  const text = readFileSync(headersPath, "utf8");
  let blocks;
  try {
    blocks = parseHeaders(text);
  } catch (err) {
    console.error(`public/_headers のパースに失敗しました: ${err.message}`);
    process.exit(1);
  }

  const violations = checkBlocks(blocks);
  if (violations.length > 0) {
    console.error("public/_headers の検証に失敗しました:");
    for (const v of violations) {
      console.error(`  ${v}`);
    }
    process.exit(1);
  }

  console.log(
    `public/_headers: \`/*\` ブロックに必須ディレクティブ ${REQUIRED_DIRECTIVES.length}件が揃っています`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
