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

test("文字列末尾のエスケープされたバックスラッシュの後続宣言も検査する (#342)", () => {
  assert.deepEqual(
    checkCss(`.x { content: "\\\\"; color: #${OFF_BRAND_RED}; }`),
    [`#${OFF_BRAND_RED}`]
  );
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

test("rad / grad 単位の hsl() と指数表記 rgb() のブランド外色を検出する (#317)", () => {
  assert.deepEqual(checkCss(".probe { color: hsl(0rad 100% 50%); }"), [
    "hsl(0rad 100% 50%)",
  ]);
  assert.deepEqual(checkCss(".probe { color: hsl(0grad 100% 50%); }"), [
    "hsl(0grad 100% 50%)",
  ]);
  assert.deepEqual(checkCss(".probe { color: rgb(1e2 0 0); }"), [
    "rgb(1e2 0 0)",
  ]);
});

test("解釈できない rgb() / hsl() 構文は違反として拒否する (#317)", () => {
  assert.deepEqual(checkCss(".probe { color: rgb(from red r g b); }"), [
    "rgb(from red r g b)",
    "red",
  ]);
  assert.deepEqual(checkCss(".probe { color: hsl(none 100% 50%); }"), [
    "hsl(none 100% 50%)",
  ]);
});

test("rad / grad 単位の許可色 hsl() は成功として扱う (#317)", () => {
  // 228.28deg = 3.9843rad = 253.64grad。
  assert.deepEqual(
    checkCss(".probe { color: hsl(253.64grad 100% 83.92%); }"),
    []
  );
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

test("文字列中の閉じ括弧の後の宣言も検出する (#250)", () => {
  assert.deepEqual(checkCss('.probe::before { content: "}"; color: red; }'), [
    "red",
  ]);
});

test("@media 内のネストしたクラスセレクタは誤検出しない (#250)", () => {
  assert.deepEqual(
    checkCss(
      `@media (min-width: 1px) { .red { color: #${ALLOWED_HEX_SAMPLE}; } }`
    ),
    []
  );
});

test("@media 内のネストした ID セレクタは誤検出しない (#250)", () => {
  assert.deepEqual(
    checkCss(
      `@media (min-width: 1px) { #abc { color: #${ALLOWED_HEX_SAMPLE}; } }`
    ),
    []
  );
});

test("@media 内のネストしたセレクタでもブランド外色は検出する (#250)", () => {
  assert.deepEqual(
    checkCss(`@media (min-width: 1px) { .red { color: #${OFF_BRAND_RED}; } }`),
    [`#${OFF_BRAND_RED}`]
  );
});

test("ネストしたルール (&:hover) の直前の親宣言も検出する (#252)", () => {
  assert.deepEqual(
    checkCss(
      `.probe { color: #${OFF_BRAND_RED}; &:hover { color: #${ALLOWED_HEX_SAMPLE}; } }`
    ),
    [`#${OFF_BRAND_RED}`]
  );
});

test("ネストした @media の直前の親宣言も検出する (#252)", () => {
  assert.deepEqual(
    checkCss(
      `.probe { color: #${OFF_BRAND_RED}; @media (min-width: 1px) { color: #${ALLOWED_HEX_SAMPLE}; } }`
    ),
    [`#${OFF_BRAND_RED}`]
  );
});

test("ネストしたルール自身のブランド外色も検出する (#252)", () => {
  assert.deepEqual(
    checkCss(
      `.probe { color: #${ALLOWED_HEX_SAMPLE}; &:hover { color: #${OFF_BRAND_RED}; } }`
    ),
    [`#${OFF_BRAND_RED}`]
  );
});

test("color() をパレット比較できない色関数として拒否する (#294)", () => {
  assert.deepEqual(checkCss(".probe { color: color(srgb 1 0 0); }"), [
    "color(",
  ]);
});

test("hwb() をパレット比較できない色関数として拒否する (#294)", () => {
  assert.deepEqual(checkCss(".probe { color: hwb(0 0% 0%); }"), ["hwb("]);
});

test("device-cmyk() を拒否する (#341)", () => {
  assert.deepEqual(checkCss(".x { color: device-cmyk(0 1 1 0); }"), [
    "device-cmyk(",
  ]);
  assert.deepEqual(checkCss(".x { color: DEVICE-CMYK(0 1 1 0); }"), [
    "DEVICE-CMYK(",
  ]);
});

test("oklch() / oklab() / lab() / lch() / color-mix() を拒否する (#294)", () => {
  assert.deepEqual(checkCss(".probe { color: oklch(60% 0.25 30); }"), [
    "oklch(",
  ]);
  assert.deepEqual(checkCss(".probe { color: OKLAB(60% 0.1 0.1); }"), [
    "OKLAB(",
  ]);
  assert.deepEqual(checkCss(".probe { color: lab(50% 40 59); }"), ["lab("]);
  assert.deepEqual(checkCss(".probe { color: lch(50% 80 30); }"), ["lch("]);
  assert.deepEqual(
    checkCss(
      ".probe { color: color-mix(in srgb, currentcolor 50%, transparent); }"
    ),
    ["color-mix("]
  );
});

test("プロパティ名 color / background-color は色関数として誤検出しない (#294)", () => {
  assert.deepEqual(
    checkCss(
      `.probe { color: #${ALLOWED_HEX_SAMPLE}; background-color: #${ALLOWED_HEX_SAMPLE}; }`
    ),
    []
  );
});

test("CSS 変数名・var() 参照・アニメーション名の色名は誤検出しない (#323)", () => {
  assert.deepEqual(
    checkCss(".x { --brand-blue: #adbdff; color: var(--brand-blue); }"),
    []
  );
  assert.deepEqual(checkCss(".x { animation: blue 1s; color: #adbdff; }"), []);
  assert.deepEqual(checkCss(".x { animation-name: red; color: #adbdff; }"), []);
});

test("CSS エスケープされた色名・色関数名も検出する (#325)", () => {
  assert.deepEqual(checkCss(".x { color: \\72 ed; }"), ["red"]);
  assert.deepEqual(checkCss(".x { color: r\\65 d; }"), ["red"]);
  assert.deepEqual(checkCss(".x { color: \\72 gb(255 0 0); }"), [
    "rgb(255 0 0)",
  ]);
  assert.deepEqual(checkCss(".x { color: \\000072ed; }"), ["red"]);
  assert.deepEqual(checkCss(".x { color: \\#ff0000; }"), ["#ff0000"]);
});

test("エスケープを含んでも許可色・文字列・URL・セレクタは誤検出しない (#325)", () => {
  assert.deepEqual(checkCss(".x { color: #adbdff; }"), []);
  assert.deepEqual(checkCss('.x { content: "\\72 ed"; color: #adbdff; }'), []);
  assert.deepEqual(
    checkCss(".x { background: url(/a/\\72 ed.svg); color: #adbdff; }"),
    []
  );
  assert.deepEqual(checkCss(".\\72 ed { color: #adbdff; }"), []);
});

test("CSS 変数の値や通常プロパティの色名は引き続き検出する (#323)", () => {
  assert.deepEqual(checkCss(".x { color: blue; }"), ["blue"]);
  assert.deepEqual(checkCss(".x { --brand-blue: blue; }"), ["blue"]);
  assert.deepEqual(checkCss(".x { color: var(--c, red); }"), ["red"]);
});

test("末尾セミコロンを省略した隣接ルールでも色名を検出する (#331)", () => {
  assert.deepEqual(checkCss(".a{color:red}"), ["red"]);
  assert.deepEqual(checkCss(".a{color:red}.b{color:#adbdff}"), ["red"]);
  assert.deepEqual(checkCss(".a{color:red;}.b{color:#adbdff}"), ["red"]);
  assert.deepEqual(checkCss(".a{color:#adbdff}.b{color:blue}"), ["blue"]);
  assert.deepEqual(checkCss(".red{color:#adbdff}.blue{color:#ff33cc}"), []);
});

test("文字列内のコメント記号で後続宣言を見逃さない (#338)", () => {
  assert.deepEqual(
    checkCss('.x { content: "/*"; color: #ff0000; --label: "*/"; }'),
    ["#ff0000"]
  );
  assert.deepEqual(
    checkCss('.x { content: "/*"; color: rgb(255 0 0); --label: "*/"; }'),
    ["rgb(255 0 0)"]
  );
  assert.deepEqual(checkCss(".x { content: '/*'; color: red; --l: '*/'; }"), [
    "red",
  ]);
});

test("実コメントは従来どおり除去し、コメント内の色は無視する (#338)", () => {
  assert.deepEqual(checkCss(".x { /* color: red; */ color: #adbdff; }"), []);
  assert.deepEqual(checkCss(".x { color: #adbdff; /* #ff0000 */ }"), []);
});
