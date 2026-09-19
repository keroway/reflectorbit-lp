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

test("コメント内の旧色コードは無視し、実際の宣言だけを検査する (#221)", () => {
  assert.deepEqual(
    checkCss(
      `/* previous color: #${OFF_BRAND_RED} */\n.probe { color: #${ALLOWED_HEX_SAMPLE}; }`
    ),
    []
  );
});

test("コメントと同じ色コードが実際の宣言にあれば検出する (#221)", () => {
  assert.deepEqual(
    checkCss(
      `/* previous color: #${OFF_BRAND_RED} */\n.probe { color: #${OFF_BRAND_RED}; }`
    ),
    [`#${OFF_BRAND_RED}`]
  );
});

test("パーセント表記 rgb() のブランド外色を検出する (#246)", () => {
  assert.deepEqual(checkCss(".probe { color: rgb(100% 0% 0%); }"), [
    "rgb(100% 0% 0%)",
  ]);
});

test("大文字関数名 RGB() のブランド外色を検出する (#246)", () => {
  assert.deepEqual(checkCss(".probe { color: RGB(255 0 0); }"), [
    "RGB(255 0 0)",
  ]);
});

test("色名 (red) のブランド外色を検出する (#246)", () => {
  assert.deepEqual(checkCss(".probe { color: red; }"), ["red"]);
});

test("turn 単位の hsl() のブランド外色を検出する (#246)", () => {
  assert.deepEqual(checkCss(".probe { color: hsl(0turn 100% 50%); }"), [
    "hsl(0turn 100% 50%)",
  ]);
});

test("パーセント表記の許可色 rgb() は成功として扱う (#246)", () => {
  // #adbdff (173,189,255) 相当のパーセント値 (67.84%, 74.12%, 100%)。
  assert.deepEqual(checkCss(".probe { color: rgb(67.84% 74.12% 100%); }"), []);
});

test("クラス名の色名は誤検出しない (#248)", () => {
  assert.deepEqual(checkCss(`.red { color: #${ALLOWED_HEX_SAMPLE}; }`), []);
});

test("ID セレクタの hex は誤検出しない (#248)", () => {
  assert.deepEqual(checkCss(`#abc { color: #${ALLOWED_HEX_SAMPLE}; }`), []);
});

test("表示文字列中の色名は誤検出しない (#248)", () => {
  assert.deepEqual(
    checkCss(
      `.probe::before { content: "red"; color: #${ALLOWED_HEX_SAMPLE}; }`
    ),
    []
  );
});

test("画像 URL 中の色名は誤検出しない (#248)", () => {
  assert.deepEqual(
    checkCss('.probe { background-image: url("/images/black.svg"); }'),
    []
  );
});

test("クォート無し url() 中の色名も誤検出しない (#248)", () => {
  assert.deepEqual(
    checkCss(".probe { background-image: url(/images/black.svg); }"),
    []
  );
});

test("宣言値の色名は引き続き検出する (#248)", () => {
  assert.deepEqual(checkCss('.red-alert { content: "red"; color: red; }'), [
    "red",
  ]);
});
