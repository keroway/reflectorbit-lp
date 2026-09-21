// video/**/*.css で使われている色が docs/design.md のブランドカラー表から外れていないかを検証する。
// HyperFrames コンポジション (video/) は Biome の対象外 (*.css) かつ site.yml の paths からも
// 漏れていたため、ブランドカラーの乖離が CI をすり抜けていた（#158）。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const videoDir = resolve(root, "video");

// docs/design.md の表に載っているブランドカラー（hex, 小文字）。
// 色を足す・変えるときは docs/design.md の表と同時に更新すること。
const ALLOWED_HEX = new Set([
  "adbdff", // Core / Primary
  "ff33cc", // Shield / Secondary
  "ffe61a", // Combo / Gold
  "ff801a", // Meteor / Orange
  "e63333", // Spawner / Danger
  "991acc", // Heavy / Violet
  "ffcc4d", // Particle / Spark
  "0a0a0f", // Background
  "cccccc", // Text secondary
  "4dff8c", // Reflected / Emerald
  "9eff29", // Perfect / Lime
  "ff2e1f", // Fast / Red-orange
  "e6e61a", // Arc / Gold
  "40ff94", // Trail Reflected
]);

// CSS 標準の拡張色名 (transparent / currentcolor を除く)。brand palette は
// すべて hex 定義のため、これらの名前が使われていれば即ブランド外とみなす。
const CSS_COLOR_NAMES = [
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
];
const NAMED_COLOR_PATTERN = new RegExp(
  `\\b(?:${CSS_COLOR_NAMES.join("|")})\\b`,
  "gi"
);

function normalizeHex(hex) {
  const h = hex.toLowerCase();
  // 3桁・4桁 (alpha付き) は各桁を複製して6桁化し、4桁目の alpha は落とす
  if (h.length === 3 || h.length === 4) {
    return h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  // 8桁 (alpha付き) は末尾2桁を落として比較する
  return h.length === 8 ? h.slice(0, 6) : h;
}

function rgbToHex(r, g, b) {
  return [r, g, b].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
}

// `50%` のようなパーセント表記は 0-255 レンジへ変換し、整数値はそのまま使う。
function rgbChannel(value) {
  return value.endsWith("%")
    ? Math.round((Number.parseFloat(value) / 100) * 255)
    : Number(value);
}

function hslToHex(h, unit, s, l) {
  // `turn` は 1turn = 360deg。`deg` (省略時含む) はそのまま度として扱う。
  const degrees = unit === "turn" ? Number(h) * 360 : Number(h);
  const hue = ((degrees % 360) + 360) % 360;
  const sat = Number(s) / 100;
  const light = Number(l) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
}

function findCssFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...findCssFiles(full));
    } else if (extname(entry) === ".css") {
      results.push(full);
    }
  }
  return results;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// セレクタ (`.red`, `#abc` 等) や at-rule プレリュードは宣言値ではないため、
// `{ ... }` の中身だけを検査対象として残す。文字列リテラル中の `{`/`}` は
// ブロック境界として扱わない。ネストしたルール (`.x { color: red; &:hover { ... } }`)
// に入るときは、そのネスト境界のバッファ全体ではなく直近のセミコロン以降
// （ネストしたルールのセレクタ/at-rule プレリュード部分）だけを捨て、それより前の
// 親宣言はバッファが破棄される前に out へ確定させる（ネストしたルール自身の宣言は、
// それが閉じる `}` で別途 out に積まれる）。
function extractDeclarations(css) {
  let depth = 0;
  const bufStack = [];
  let out = "";
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (depth > 0) bufStack[depth - 1] += ch;
      if (ch === quote && css[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (depth > 0) bufStack[depth - 1] += ch;
      continue;
    }
    if (ch === "{") {
      if (depth > 0) {
        const buffer = bufStack[depth - 1];
        const lastSemi = buffer.lastIndexOf(";");
        out += lastSemi === -1 ? "" : buffer.slice(0, lastSemi + 1);
        bufStack[depth - 1] = "";
      }
      bufStack.push("");
      depth++;
      continue;
    }
    if (ch === "}") {
      if (depth > 0) {
        out += bufStack.pop();
        depth--;
      }
      continue;
    }
    if (depth > 0) bufStack[depth - 1] += ch;
  }
  return out;
}

// `url(...)` の中身と文字列リテラルは色値ではないため、検査前に空にする
// (`content: "red"` や `url("/images/black.svg")` を誤検出させないため)。
function stripUrlsAndStrings(declarations) {
  return declarations
    .replace(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, "url()")
    .replace(/"[^"]*"|'[^']*'/g, '""');
}

export function checkCss(rawCss) {
  const css = stripUrlsAndStrings(extractDeclarations(stripComments(rawCss)));
  const violations = [];

  for (const match of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    const hex = normalizeHex(match[1]);
    if (hex.length === 6 && !ALLOWED_HEX.has(hex)) {
      violations.push(`#${match[1]}`);
    }
  }

  // カンマ区切り (`rgb(255, 0, 0)`)・空白区切り (`rgb(255 0 0)`)、整数・パーセント値
  // (`rgb(100% 0% 0%)`)、大文字関数名 (`RGB(...)`) を検査する。
  const CHANNEL = "\\d+(?:\\.\\d+)?%?";
  for (const match of css.matchAll(
    new RegExp(
      `rgba?\\(\\s*(${CHANNEL})\\s*,\\s*(${CHANNEL})\\s*,\\s*(${CHANNEL})\\s*(?:,[^)]+)?\\)`,
      "gi"
    )
  )) {
    const hex = rgbToHex(
      rgbChannel(match[1]),
      rgbChannel(match[2]),
      rgbChannel(match[3])
    );
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  for (const match of css.matchAll(
    new RegExp(
      `rgba?\\(\\s*(${CHANNEL})\\s+(${CHANNEL})\\s+(${CHANNEL})\\s*(?:\\/[^)]+)?\\)`,
      "gi"
    )
  )) {
    const hex = rgbToHex(
      rgbChannel(match[1]),
      rgbChannel(match[2]),
      rgbChannel(match[3])
    );
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  // カンマ区切り・空白区切り、`deg`/`turn` サフィックス、alpha 付き、大文字関数名の
  // hsl() を検査する。
  for (const match of css.matchAll(
    /hsla?\(\s*(-?\d+(?:\.\d+)?)(deg|turn)?[,\s]+(\d+(?:\.\d+)?)%[,\s]+(\d+(?:\.\d+)?)%\s*(?:[,/][^)]+)?\)/gi
  )) {
    const hex = hslToHex(match[1], match[2], match[3], match[4]);
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  // CSS 標準の色名 (`red` 等) は brand palette がすべて hex 定義のため、
  // 使われていれば無条件でブランド外として検出する。
  for (const match of css.matchAll(NAMED_COLOR_PATTERN)) {
    violations.push(match[0]);
  }

  return violations;
}

function checkFile(path) {
  return checkCss(readFileSync(path, "utf8"));
}

function main() {
  const cssFiles = findCssFiles(videoDir);
  let hasViolation = false;

  for (const file of cssFiles) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      hasViolation = true;
      console.error(
        `${file}: docs/design.md にないブランドカラーを検出しました`
      );
      for (const v of violations) {
        console.error(`  ${v}`);
      }
    }
  }

  if (hasViolation) {
    console.error(
      "\nvideo/**/*.css の色は docs/design.md のブランドカラー表から選ぶこと。"
    );
    process.exit(1);
  }

  console.log(
    `checked ${cssFiles.length} file(s) under video/ — all colors match docs/design.md`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
