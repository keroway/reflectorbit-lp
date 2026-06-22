// LP 全体で参照する定数の単一の出所。
// 外部リンクと表データの正典は docs/copy.md（CTA / How to Play / Download セクション）。

// リリース公開ゲート。
// 本体 keroway/reflectorbit は初回リリース未公開・非公開リポのため、
// DOWNLOAD_URL（releases/latest）と REPO_URL（リポトップ）は匿名訪問者には 404 を返す。
// 公開されるまでの間 false のままにし、ダウンロード CTA とリポリンクを安全側に倒す。
//
// 公開後の戻し方:
//   1. RELEASE_AVAILABLE = true にする
//   2. docs/copy.md の CTA / Download / フッター節を再度同期する
//   3. Layout.astro の JSON-LD `offers` がそのまま InStock として復活する
export const RELEASE_AVAILABLE = false;

// 外部リンク (docs/copy.md の CTA / Download セクションが正典)
export const PLAY_URL = 'https://reflectorbit.pages.dev';
export const DOWNLOAD_URL =
  'https://github.com/keroway/reflectorbit/releases/latest';
export const REPO_URL = 'https://github.com/keroway/reflectorbit';

// 本体リポが非公開の間に使う到達可能なフォールバック先（作者アカウント = 200 OK）。
export const REPO_FALLBACK_URL = 'https://github.com/keroway';

// 操作方法 (docs/copy.md の How to Play より)
export const controls = [
  { key: 'Space', desc: '軌道半径を縮小（角速度が上がる）' },
  { key: 'Shift', desc: '軌道半径を拡大（角速度が下がる）' },
  { key: 'P', desc: 'ポーズ / 再開' },
  { key: '↑ / ↓', desc: 'タイトルで難易度選択' },
];

// ダウンロード (docs/copy.md の Download より)
export const downloads = [
  { os: 'Linux (x86_64)', file: 'reflectorbit-linux-x86_64' },
  { os: 'macOS (Apple Silicon)', file: 'reflectorbit-macos-aarch64' },
  { os: 'Windows (x86_64)', file: 'reflectorbit-windows-x86_64.exe' },
];
