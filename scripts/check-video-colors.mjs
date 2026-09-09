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

function hslToHex(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
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

export function checkCss(css) {
  const violations = [];

  for (const match of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    const hex = normalizeHex(match[1]);
    if (hex.length === 6 && !ALLOWED_HEX.has(hex)) {
      violations.push(`#${match[1]}`);
    }
  }

  // カンマ区切り (`rgb(255, 0, 0)`) と空白区切り (`rgb(255 0 0)`) の両方を検査する。
  for (const match of css.matchAll(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,[^)]+)?\)/g
  )) {
    const hex = rgbToHex(match[1], match[2], match[3]);
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  for (const match of css.matchAll(
    /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/[^)]+)?\)/g
  )) {
    const hex = rgbToHex(match[1], match[2], match[3]);
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  // カンマ区切り・空白区切り、`deg` サフィックス、alpha 付きの hsl() を検査する。
  for (const match of css.matchAll(
    /hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?[,\s]+(\d+(?:\.\d+)?)%[,\s]+(\d+(?:\.\d+)?)%\s*(?:[,/][^)]+)?\)/g
  )) {
    const hex = hslToHex(match[1], match[2], match[3]);
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
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
