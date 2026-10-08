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
// script 系で許さないソース（任意スクリプト実行・任意オリジン許可）。
const CSP_FORBIDDEN_SCRIPT_TOKENS = ["*", "'unsafe-eval'", "http:", "https:"];

function parseCsp(value) {
  const map = new Map();
  for (const part of value.split(";")) {
    const [name, ...tokens] = part.trim().split(/\s+/);
    if (name) map.set(name.toLowerCase(), tokens);
  }
  return map;
}

function checkValue(key, value) {
  const problems = [];
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
      const features = new Map(
        value.split(",").map((f) => {
          const [name, ...rest] = f.trim().split("=");
          return [name.trim(), rest.join("=").trim()];
        })
      );
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
      const maxAge = value.match(/(?:^|;)\s*max-age=(\d+)/i);
      if (!maxAge || Number(maxAge[1]) < MIN_HSTS_MAX_AGE) {
        problems.push(
          `Strict-Transport-Security の max-age は ${MIN_HSTS_MAX_AGE} 以上が必要です: "${value}"`
        );
      }
      if (!/(?:^|;)\s*includeSubDomains\s*(?:;|$)/i.test(value)) {
        problems.push(
          "Strict-Transport-Security に includeSubDomains がありません"
        );
      }
      break;
    }
    case "Content-Security-Policy": {
      const csp = parseCsp(value);
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
      for (const name of ["default-src", "script-src"]) {
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
