// LP 全体で参照する定数の単一の出所。
// 外部リンクと表データの正典は docs/copy.md（CTA / How to Play / Download セクション）。

// 外部リンク (docs/copy.md の CTA / Download セクションが正典)
export const PLAY_URL = 'https://reflectorbit.pages.dev';
export const DOWNLOAD_URL =
  'https://github.com/keroway/reflectorbit/releases/latest';
export const REPO_URL = 'https://github.com/keroway/reflectorbit';

// 操作方法 (docs/copy.md の How to Play より)
export const controls = [
  {
    key: '← / →',
    desc: 'Shield を反時計 / 時計回りに回転（手動回転・離すと停止）',
  },
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
