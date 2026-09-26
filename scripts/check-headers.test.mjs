import assert from "node:assert/strict";
import { test } from "node:test";
import { checkBlocks, parseHeaders } from "./check-headers.mjs";

const VALID_TEXT = `/*
  Content-Security-Policy: default-src 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=()
  Strict-Transport-Security: max-age=31536000
`;

test("すべての必須ディレクティブが揃っていれば違反なし", () => {
  const blocks = parseHeaders(VALID_TEXT);
  assert.deepEqual(checkBlocks(blocks), []);
});

test("必須ディレクティブが欠けていると検出する", () => {
  const text = `/*
  X-Frame-Options: DENY
`;
  const blocks = parseHeaders(text);
  const violations = checkBlocks(blocks);
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
  const text = `/*
  Content-Security-Policy: default-src 'self'
  X-Frame-Options:
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=()
  Strict-Transport-Security: max-age=31536000
`;
  const blocks = parseHeaders(text);
  const violations = checkBlocks(blocks);
  assert.ok(violations.some((v) => v.includes("X-Frame-Options")));
});

test("コメント行・空行は無視する", () => {
  const text = `# comment
/*
  Content-Security-Policy: default-src 'self'

  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=()
  Strict-Transport-Security: max-age=31536000
`;
  const blocks = parseHeaders(text);
  assert.deepEqual(checkBlocks(blocks), []);
});

test("パス行より前にヘッダ行が来ると例外を投げる", () => {
  const text = "  X-Frame-Options: DENY\n";
  assert.throws(() => parseHeaders(text));
});

test("Key: Value 形式でない行は例外を投げる", () => {
  const text = "/*\n  not-a-valid-header-line\n";
  assert.throws(() => parseHeaders(text));
});
