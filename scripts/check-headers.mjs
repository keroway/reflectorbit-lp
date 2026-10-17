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

// HSTS の max-age 下限（1 年）。これ未満への変更は弱体化とみなす。
const MIN_HSTS_MAX_AGE = 31536000;
const STRONG_REFERRER_POLICIES = [
  "no-referrer",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
];
// 常に空 allowlist `()` で無効化しておくべき Permissions-Policy 機能。
const DISABLED_FEATURES = ["geolocation", "microphone", "camera", "payment"];

// CSP の必須制約。ディレクティブ名 → 値に含まれるべきトークン。
const CSP_REQUIRED = {
  "default-src": ["'self'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};
// 許可トークンを固定するディレクティブ。'self' を残したまま `*` や外部オリジンを
// 足す緩和を拒否する（#304）。ここに無いトークンはすべて違反とする。
const CSP_ALLOWED_ONLY = {
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'", "'none'"],
  "form-action": ["'self'", "'none'"],
};
// script 系で許さないソース（任意スクリプト実行・任意オリジン許可）。
const CSP_FORBIDDEN_SCRIPT_TOKENS = ["*", "'unsafe-eval'", "http:", "https:"];

// 禁止ソース検査の対象。script-src-elem / script-src-attr は script-src より
// 優先して適用されるため、ここに https: 等を足されても素通りさせない（#302）。
const CSP_SCRIPT_DIRECTIVES = [
  "default-src",
  "script-src",
  "script-src-elem",
  "script-src-attr",
];

// 同名ディレクティブが複数あるとブラウザは最初の1つだけを採用する（CSP3 §2.2.1）。
// 後勝ちで上書きすると先頭の禁止ソースを見失うため、全出現のトークンを結合し、
// 重複した名前は duplicates として返して別途違反にする。
function parseCsp(value) {
  const map = new Map();
  const duplicates = new Set();
  for (const part of value.split(";")) {
    const [rawName, ...tokens] = part.trim().split(/\s+/);
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (map.has(name)) {
      duplicates.add(name);
      map.get(name).push(...tokens);
    } else {
      map.set(name, tokens);
    }
  }
  return { map, duplicates };
}

// HTTP のヘッダ名は大小文字を区別しない（RFC 9110 §5.1）。小文字・混在表記でも
// 同じ検査を適用するため、既知の名前は固定表記へ正規化して照合する（#315）。
const CANONICAL_NAMES = new Map(
  REQUIRED_DIRECTIVES.map((name) => [name.toLowerCase(), name])
);

function checkValue(rawKey, value) {
  const problems = [];
  const key = CANONICAL_NAMES.get(rawKey.toLowerCase()) ?? rawKey;
  switch (key) {
    case "X-Frame-Options":
      if (value.toUpperCase() !== "DENY") {
        problems.push(
          `X-Frame-Options は DENY である必要があります: "${value}"`
        );
      }
      break;
    case "X-Content-Type-Options":
      if (value.toLowerCase() !== "nosniff") {
        problems.push(
          `X-Content-Type-Options は nosniff である必要があります: "${value}"`
        );
      }
      break;
    case "Referrer-Policy": {
      const policies = value.split(",").map((p) => p.trim().toLowerCase());
      if (!policies.every((p) => STRONG_REFERRER_POLICIES.includes(p))) {
        problems.push(`Referrer-Policy が弱い値です: "${value}"`);
      }
      break;
    }
    case "Permissions-Policy": {
      // 同名機能が複数あると Map の後勝ちで先頭の弱い値・不正値を見失うため、
      // 上書きする前に重複を検出して違反にする（#329）。
      const features = new Map();
      const duplicates = new Set();
      for (const f of value.split(",")) {
        const [name, ...rest] = f.trim().split("=");
        const featureName = name.trim();
        if (features.has(featureName)) duplicates.add(featureName);
        features.set(featureName, rest.join("=").trim());
      }
      for (const name of duplicates) {
        problems.push(`Permissions-Policy の ${name} が重複しています`);
      }
      for (const feature of DISABLED_FEATURES) {
        if (features.get(feature) !== "()") {
          problems.push(
            `Permissions-Policy の ${feature} は () で無効化する必要があります`
          );
        }
      }
      break;
    }
    case "Strict-Transport-Security": {
      // RFC 6797 §6.1: ディレクティブは ; 区切り。max-age は 1 回だけ、値は数字のみ。
      const maxAges = value
        .split(";")
        .map((d) => d.trim())
        .filter((d) => /^max-age\s*(?:=|$)/i.test(d));
      if (maxAges.length > 1) {
        problems.push(
          `Strict-Transport-Security の max-age が重複しています: "${value}"`
        );
      } else {
        const raw = maxAges[0]
          ?.replace(/^[^=]*=/, "")
          .trim()
          .replace(/^"(.*)"$/, "$1");
        if (
          raw === undefined ||
          !/^\d+$/.test(raw) ||
          Number(raw) < MIN_HSTS_MAX_AGE
        ) {
          problems.push(
            `Strict-Transport-Security の max-age は ${MIN_HSTS_MAX_AGE} 以上の整数が必要です: "${value}"`
          );
        }
      }
      if (!/(?:^|;)\s*includeSubDomains\s*(?:;|$)/i.test(value)) {
        problems.push(
          "Strict-Transport-Security に includeSubDomains がありません"
        );
      }
      break;
    }
    case "Content-Security-Policy": {
      const { map: csp, duplicates } = parseCsp(value);
      for (const name of duplicates) {
        problems.push(`CSP の ${name} が重複しています`);
      }
      for (const [name, required] of Object.entries(CSP_REQUIRED)) {
        const tokens = csp.get(name);
        if (!tokens) {
          problems.push(`CSP に ${name} がありません`);
          continue;
        }
        for (const token of required) {
          if (!tokens.includes(token)) {
            problems.push(`CSP の ${name} に ${token} が必要です`);
          }
        }
      }
      for (const [name, allowed] of Object.entries(CSP_ALLOWED_ONLY)) {
        for (const token of csp.get(name) ?? []) {
          if (!allowed.includes(token.toLowerCase())) {
            problems.push(
              `CSP の ${name} に許可できないソース ${token} があります`
            );
          }
        }
      }
      for (const name of CSP_SCRIPT_DIRECTIVES) {
        for (const token of csp.get(name) ?? []) {
          if (CSP_FORBIDDEN_SCRIPT_TOKENS.includes(token.toLowerCase())) {
            problems.push(
              `CSP の ${name} に許可できないソース ${token} があります`
            );
          }
        }
      }
      break;
    }
  }
  return problems;
}

export function checkBlocks(blocks) {
  const violations = [];

  const wildcards = blocks.filter((b) => b.path === "/*");
  const wildcard = wildcards[0];
  if (!wildcard) {
    violations.push("`/*` ブロックが見つかりません");
    return violations;
  }
  if (wildcards.length > 1) {
    violations.push(
      `\`/*\` ブロックが ${wildcards.length} 個あります（1 個にまとめてください）`
    );
  }

  // 最初の `/*` 以外のブロックも、含まれるセキュリティヘッダの値は検査する。
  // 必須ディレクティブの有無は最初の `/*` ブロックだけで判定する。
  for (const block of blocks) {
    if (block === wildcard) continue;
    for (const { key, value } of block.directives) {
      if (value === "") {
        violations.push(`${block.path}: ${key} の値が空です`);
      } else {
        violations.push(
          ...checkValue(key, value).map((p) => `${block.path}: ${p}`)
        );
      }
    }
  }

  const keys = wildcard.directives.map((d) => d.key.toLowerCase());
  for (const required of REQUIRED_DIRECTIVES) {
    if (!keys.includes(required.toLowerCase())) {
      violations.push(`\`/*\` ブロックに ${required} がありません`);
    }
  }

  for (const { key, value } of wildcard.directives) {
    if (value === "") {
      violations.push(`${key} の値が空です`);
    } else {
      violations.push(...checkValue(key, value));
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
