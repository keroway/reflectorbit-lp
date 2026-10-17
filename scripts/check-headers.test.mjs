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

test("Permissions-Policy の同名機能の重複を検出する", () => {
  for (const value of [
    "geolocation=(), geolocation=*, microphone=(), camera=(), payment=()",
    "geolocation=*, geolocation=(), microphone=(), camera=(), payment=()",
    "geolocation=()=junk, geolocation=(), microphone=(), camera=(), payment=()",
  ]) {
    const violations = violationsFor({ "Permissions-Policy": value });
    assert.ok(
      violations.some((v) => v.includes("geolocation") && v.includes("重複")),
      value
    );
  }
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

test("HSTS の max-age の不正な末尾と重複指定を検出する", () => {
  for (const value of [
    "max-age=31536000garbage; includeSubDomains",
    "max-age=31536000; max-age=0; includeSubDomains",
    "max-age=; includeSubDomains",
    "max-age=31536000=garbage; includeSubDomains",
    'max-age="31536000"=x; includeSubDomains',
    "max-age; includeSubDomains",
    "max-age; max-age=31536000; includeSubDomains",
    "max-age=31536000; max-age; includeSubDomains",
  ]) {
    const violations = violationsFor({ "Strict-Transport-Security": value });
    assert.ok(
      violations.some((v) => v.includes("max-age")),
      value
    );
  }
});

test("HSTS の正常値は違反にならない", () => {
  const violations = violationsFor({
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  });
  assert.equal(
    violations.filter((v) => v.includes("Strict-Transport-Security")).length,
    0
  );
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

test("CSP の frame-ancestors に 'none' と追加許可先の混在を検出する (#310)", () => {
  for (const token of ["*", "https:", "https://example.com", "'self'"]) {
    const csp = VALID["Content-Security-Policy"].replace(
      "frame-ancestors 'none'",
      `frame-ancestors 'none' ${token}`
    );
    const violations = violationsFor({ "Content-Security-Policy": csp });
    assert.ok(
      violations.some(
        (v) => v.includes("frame-ancestors") && v.includes(token)
      ),
      token
    );
  }
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

test("CSP の script-src-elem / script-src-attr の禁止ソースを検出する (#302)", () => {
  for (const name of ["script-src-elem", "script-src-attr"]) {
    const csp = VALID["Content-Security-Policy"].replace(
      "script-src 'self'",
      `${name} https:; script-src 'self'`
    );
    const violations = violationsFor({ "Content-Security-Policy": csp });
    assert.ok(
      violations.some((v) => v.includes(name) && v.includes("https:")),
      name
    );
  }
});

test("CSP の base-uri / form-action に 'self' 以外の許可先が追加されると検出する (#304)", () => {
  for (const name of ["base-uri", "form-action"]) {
    for (const token of ["*", "https:", "https://example.com"]) {
      const csp = VALID["Content-Security-Policy"].replace(
        `${name} 'self'`,
        `${name} 'self' ${token}`
      );
      const violations = violationsFor({ "Content-Security-Policy": csp });
      assert.ok(
        violations.some((v) => v.includes(name) && v.includes(token)),
        `${name} ${token}`
      );
    }
  }
});

test("CSP の重複ディレクティブを拒否し、先頭の禁止ソースも検出する (#302)", () => {
  const csp = `default-src *; ${VALID["Content-Security-Policy"]}`;
  const violations = violationsFor({ "Content-Security-Policy": csp });
  assert.ok(violations.some((v) => v.includes("default-src が重複")));
  assert.ok(
    violations.some((v) => v.includes("default-src") && v.includes("*"))
  );
});

test("追加パスブロックの弱いヘッダ値を検出する (#312)", () => {
  const text = `${build()}\n/videos/*\n  X-Frame-Options: SAMEORIGIN\n`;
  const violations = checkBlocks(parseHeaders(text));
  assert.ok(
    violations.some((v) => v.includes("/videos/*") && v.includes("X-Frame"))
  );
});

test("追加パスブロックの正しい値と無関係なヘッダは違反にしない (#312)", () => {
  const text = `${build()}\n/videos/*\n  X-Frame-Options: DENY\n  Cache-Control: public, max-age=60\n`;
  assert.deepEqual(checkBlocks(parseHeaders(text)), []);
});

test("重複した `/*` ブロックを拒否し、2個目の弱い値も検出する (#312)", () => {
  const text = `${build()}\n/*\n  X-Frame-Options: SAMEORIGIN\n`;
  const violations = checkBlocks(parseHeaders(text));
  assert.ok(violations.some((v) => v.includes("ブロックが 2 個")));
  assert.ok(violations.some((v) => v.includes("X-Frame")));
});

test("追加パスブロックの小文字ヘッダ名でも弱い値を検出する (#315)", () => {
  const text = `${build()}\n/test/*\n  x-frame-options: SAMEORIGIN\n  x-content-type-options: invalid\n  referrer-policy: unsafe-url\n  strict-transport-security: max-age=0\n`;
  const violations = checkBlocks(parseHeaders(text));
  for (const name of [
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(
      violations.some((v) => v.includes("/test/*") && v.includes(name)),
      `${name} の違反が検出されません`
    );
  }
});

test("`/*` ブロックの小文字ヘッダ名も必須扱いで値を検査する (#315)", () => {
  const toText = (entries) =>
    `/*\n${entries.map(([k, v]) => `  ${k}: ${v}`).join("\n")}\n`;
  const lower = Object.entries(VALID).map(([k, v]) => [k.toLowerCase(), v]);
  assert.deepEqual(checkBlocks(parseHeaders(toText(lower))), []);

  const weak = lower.map(([k, v]) =>
    k === "x-frame-options" ? [k, "SAMEORIGIN"] : [k, v]
  );
  const violations = checkBlocks(parseHeaders(toText(weak)));
  assert.ok(violations.some((v) => v.includes("X-Frame-Options")));
});
