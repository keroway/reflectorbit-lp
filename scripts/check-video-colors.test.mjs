import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCss } from "./check-video-colors.mjs";

const ALLOWED_HEX_SAMPLE = "adbdff"; // Core / Primary
const OFF_BRAND_RED = "ff0000";

test("6桁 hex のブランド外色を検出する", () => {
  assert.deepEqual(checkCss(`.probe { color: #${OFF_BRAND_RED}; }`), [
    `#${OFF_BRAND_RED}`,
  ]);
});

test("4桁 hex (alpha付き) のブランド外色を検出する (#210)", () => {
  assert.deepEqual(checkCss(".probe { color: #f00f; }"), ["#f00f"]);
});

test("空白区切り rgb() のブランド外色を検出する (#210)", () => {
  assert.deepEqual(checkCss(".probe { color: rgb(255 0 0); }"), [
    "rgb(255 0 0)",
  ]);
});

test("hsl() のブランド外色を検出する (#210)", () => {
  assert.deepEqual(checkCss(".probe { color: hsl(0 100% 50%); }"), [
    "hsl(0 100% 50%)",
  ]);
});

test("カンマ区切り hsl() のブランド外色を検出する", () => {
  assert.deepEqual(checkCss(".probe { color: hsl(0, 100%, 50%); }"), [
    "hsl(0, 100%, 50%)",
  ]);
});

test("許可色 (6桁 hex) は成功として扱う", () => {
  assert.deepEqual(checkCss(`.probe { color: #${ALLOWED_HEX_SAMPLE}; }`), []);
});

test("許可色と同値の 4桁 hex は成功として扱う", () => {
  // #adbdff の各桁を複製すると再現できないため、単色の許可値 (#0a0a0f -> 000f 相当) で検証する。
  assert.deepEqual(checkCss(".probe { color: #cccf; }"), []);
});

test("許可色と同値の rgb() は成功として扱う", () => {
  assert.deepEqual(checkCss(".probe { color: rgb(173, 189, 255); }"), []);
  assert.deepEqual(checkCss(".probe { color: rgb(173 189 255); }"), []);
});

test("許可色と同値の hsl() は成功として扱う", () => {
  // #adbdff (173,189,255) 相当の hsl 値。
  assert.deepEqual(checkCss(".probe { color: hsl(228.28 100% 83.92%); }"), []);
});
