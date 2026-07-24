// HyperFrames (npx hyperframes) を使い、video/how-to-play/ の HTML/CSS コンポジションを
// public/videos/how-to-play.mp4 / .webm / -poster.jpg に書き出す。
// 出力はコミット対象。ローカルで `npm run video:howtoplay:gen` を実行して更新する運用で、
// Cloudflare Pages の `npm run build` では再生成しない（scripts/gen-og.mjs と同じ方針）。
//
// 前提: HyperFrames CLI の実行には Chrome と FFmpeg が必要
// （`npx hyperframes doctor` で確認できる）。webm は HyperFrames が `--format webm` で
// 直接書き出せるため、ffmpeg でのフォーマット変換は行わない（先頭フレームの poster 抽出にのみ
// ffmpeg を使う）。
// バージョンは package.json の devDependencies に固定した hyperframes を使う
// （`npx --no-install` でローカル依存のみ解決し、都度最新版を取得しないことで再生成結果の
// 再現性を担保する）。
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const compositionDir = resolve(root, "video", "how-to-play");
const outDir = resolve(root, "public", "videos");
const mp4Path = resolve(outDir, "how-to-play.mp4");
const webmPath = resolve(outDir, "how-to-play.webm");
const posterPath = resolve(outDir, "how-to-play-poster.jpg");

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
}

run("npx", [
  "--no-install",
  "hyperframes",
  "render",
  compositionDir,
  "--format",
  "mp4",
  "-o",
  mp4Path,
]);

run("npx", [
  "--no-install",
  "hyperframes",
  "render",
  compositionDir,
  "--format",
  "webm",
  "-o",
  webmPath,
]);

run("ffmpeg", ["-y", "-i", mp4Path, "-frames:v", "1", "-q:v", "3", posterPath]);

console.log(`wrote ${mp4Path}`);
console.log(`wrote ${webmPath}`);
console.log(`wrote ${posterPath}`);
