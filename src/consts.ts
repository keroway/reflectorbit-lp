// LP 全体で参照する定数の単一の出所。
// 外部リンクと表データの正典は docs/copy.md（CTA / How to Play / Download セクション）。

// ダウンロード公開ゲート。
// ネイティブ版バイナリは keroway/reflectorbit-releases（配布専用の公開リポジトリ。
// ソースコードは含まない）から配布中。DOWNLOAD_URL は匿名訪問者にも到達可能。
export const DOWNLOAD_AVAILABLE = true;

// ソースリポジトリ公開ゲート。
// 本体 keroway/reflectorbit は非公開で運用する方針（成果物のみ公開ミラーで配布）。
// REPO_URL（リポトップ）は匿名訪問者には 404 を返すため、公開するまで false のままにする。
//
// 公開後の戻し方:
//   1. SOURCE_AVAILABLE = true にする
//   2. docs/copy.md の フッター節を再度同期する
//   3. Layout.astro の JSON-LD `sameAs` にリポジトリが含まれるようになる
export const SOURCE_AVAILABLE = false;

// 外部リンク (docs/copy.md の CTA / Download セクションが正典)
export const PLAY_URL = "https://reflectorbit.pages.dev";
export const DOWNLOAD_URL =
  "https://github.com/keroway/reflectorbit-releases/releases/latest";
export const REPO_URL = "https://github.com/keroway/reflectorbit";

// 本体リポが非公開の間に使う到達可能なフォールバック先（作者アカウント = 200 OK）。
export const REPO_FALLBACK_URL = "https://github.com/keroway";

// 操作方法 (docs/copy.md の How to Play より)
export const controls = [
  {
    key: "← / →",
    desc: "Shield を反時計 / 時計回りに回転（手動回転・離すと停止）",
  },
  { key: "Space", desc: "軌道半径を縮小（内周へ）" },
  { key: "Shift", desc: "軌道半径を拡大（外周へ）" },
  { key: "P", desc: "ポーズ / 再開" },
  {
    key: "↑ / ↓",
    desc: "タイトルメニューを選択（Space/Enter で決定。MODE & DIFFICULTY では ←/→ で Stage/Endless/Daily を切替）",
  },
];

// ダウンロード (docs/copy.md の Download より)
export const downloads = [
  { os: "Linux (x86_64)", file: "reflectorbit-linux-x86_64" },
  { os: "macOS (Apple Silicon)", file: "reflectorbit-macos-aarch64" },
  { os: "Windows (x86_64)", file: "reflectorbit-windows-x86_64.exe" },
];
