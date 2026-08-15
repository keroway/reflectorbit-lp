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
  if (h.length === 3) {
    return h
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

function checkFile(path) {
  const css = readFileSync(path, "utf8");
  const violations = [];

  for (const match of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    const hex = normalizeHex(match[1]);
    if (hex.length === 6 && !ALLOWED_HEX.has(hex)) {
      violations.push(`#${match[1]}`);
    }
  }

  for (const match of css.matchAll(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,[^)]+)?\)/g
  )) {
    const hex = rgbToHex(match[1], match[2], match[3]);
    if (!ALLOWED_HEX.has(hex)) {
      violations.push(match[0]);
    }
  }

  return violations;
}

const cssFiles = findCssFiles(videoDir);
let hasViolation = false;

for (const file of cssFiles) {
  const violations = checkFile(file);
  if (violations.length > 0) {
    hasViolation = true;
    console.error(`${file}: docs/design.md にないブランドカラーを検出しました`);
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
