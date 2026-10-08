import assert from "node:assert/strict";
import { test } from "node:test";
import { checkBlocks, parseHeaders } from "./check-headers.mjs";

const VALID = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function build(overrides = {}) {
  const merged = { ...VALID, ...overrides };
  const lines = Object.entries(merged)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `  ${k}: ${v}`);
  return `/*\n${lines.join("\n")}\n`;
}

function violationsFor(overrides) {
  return checkBlocks(parseHeaders(build(overrides)));
}

test("すべての必須ディレクティブが揃っていれば違反なし", () => {
  assert.deepEqual(violationsFor({}), []);
});

test("必須ディレクティブが欠けていると検出する", () => {
  const text = `/*
  X-Frame-Options: DENY
`;
  const violations = checkBlocks(parseHeaders(text));
  assert.ok(violations.some((v) => v.includes("Content-Security-Policy")));
  assert.ok(violations.some((v) => v.includes("X-Content-Type-Options")));
});

test("`/*` ブロックが無いと検出する", () => {
  const text = `/some/path
  X-Frame-Options: DENY
`;
  const blocks = parseHeaders(text);
  assert.deepEqual(checkBlocks(blocks), ["`/*` ブロックが見つかりません"]);
});

test("値が空のディレクティブを検出する", () => {
  const violations = violationsFor({ "X-Frame-Options": "" });
  assert.ok(violations.some((v) => v.includes("X-Frame-Options")));
});

test("コメント行・空行は無視する", () => {
  const text = `# comment\n${build().replace("\n  X-Frame", "\n\n  X-Frame")}`;
  assert.deepEqual(checkBlocks(parseHeaders(text)), []);
});

test("パス行より前にヘッダ行が来ると例外を投げる", () => {
  const text = "  X-Frame-Options: DENY\n";
  assert.throws(() => parseHeaders(text));
});

test("Key: Value 形式でない行は例外を投げる", () => {
  const text = "/*\n  not-a-valid-header-line\n";
  assert.throws(() => parseHeaders(text));
});

test("X-Frame-Options が DENY 以外だと検出する", () => {
  const violations = violationsFor({ "X-Frame-Options": "SAMEORIGIN" });
  assert.ok(violations.some((v) => v.includes("X-Frame-Options")));
});

test("X-Content-Type-Options が nosniff 以外だと検出する", () => {
  const violations = violationsFor({ "X-Content-Type-Options": "sniff" });
  assert.ok(violations.some((v) => v.includes("X-Content-Type-Options")));
});

test("Referrer-Policy が弱い値だと検出する", () => {
  for (const value of ["unsafe-url", "no-referrer-when-downgrade"]) {
    const violations = violationsFor({ "Referrer-Policy": value });
    assert.ok(
      violations.some((v) => v.includes("Referrer-Policy")),
      value
    );
  }
});

test("Permissions-Policy で無効化が外れていると検出する", () => {
  const violations = violationsFor({
    "Permissions-Policy": "geolocation=(self), microphone=(), camera=()",
  });
  assert.ok(violations.some((v) => v.includes("geolocation")));
  assert.ok(violations.some((v) => v.includes("payment")));
});

test("HSTS の max-age が短いと検出する", () => {
  for (const value of [
    "max-age=0; includeSubDomains",
    "max-age=86400; includeSubDomains",
  ]) {
    const violations = violationsFor({ "Strict-Transport-Security": value });
    assert.ok(
      violations.some((v) => v.includes("max-age")),
      value
    );
  }
});

test("HSTS に includeSubDomains が無いと検出する", () => {
  const violations = violationsFor({
    "Strict-Transport-Security": "max-age=31536000",
  });
  assert.ok(violations.some((v) => v.includes("includeSubDomains")));
});

test("CSP の必須ポリシー欠落を検出する", () => {
  const violations = violationsFor({
    "Content-Security-Policy": "img-src 'self'",
  });
  for (const name of [
    "default-src",
    "frame-ancestors",
    "base-uri",
    "form-action",
  ]) {
    assert.ok(
      violations.some((v) => v.includes(name)),
      name
    );
  }
});

test("CSP の frame-ancestors が 'none' 以外だと検出する", () => {
  const csp = VALID["Content-Security-Policy"].replace(
    "frame-ancestors 'none'",
    "frame-ancestors *"
  );
  const violations = violationsFor({ "Content-Security-Policy": csp });
  assert.ok(violations.some((v) => v.includes("frame-ancestors")));
});

test("CSP の script-src に 'unsafe-eval' やワイルドカードがあると検出する", () => {
  for (const token of ["'unsafe-eval'", "*", "https:"]) {
    const csp = VALID["Content-Security-Policy"].replace(
      "script-src 'self'",
      `script-src 'self' ${token}`
    );
    const violations = violationsFor({ "Content-Security-Policy": csp });
    assert.ok(
      violations.some((v) => v.includes("script-src")),
      token
    );
  }
});
