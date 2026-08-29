// SVG → PNG 変換: public/og-default.svg を 1200×630 の OGP 画像に書き出す。
// 出力は public/og-default.png（コミット対象）。CI では再生成しない想定で、
// デザイン変更時にローカルで `npm run og:gen` を実行して PNG を更新する。
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { updateManifest } from "./asset-manifest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(here, "..", "public", "og-default.svg");
const pngPath = resolve(here, "..", "public", "og-default.png");

const svg = await readFile(svgPath);
const png = await sharp(svg, { density: 192 })
  .resize(1200, 630, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(pngPath, png);
console.log(`wrote ${pngPath} (${png.length} bytes)`);
// ソース一式のハッシュを記録し、CI の asset-drift(再生成ではなくハッシュ照合)が
// 「ソース編集後に生成コマンドが実行されたか」を環境非依存に検証できるようにする (#185)
await updateManifest("og");
