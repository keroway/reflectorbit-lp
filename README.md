# reflectorbit-lp

[![Astro](https://img.shields.io/badge/Astro-7-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Biome](https://img.shields.io/badge/Biome-2-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Deployed-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

[REFLECTORBIT](https://github.com/keroway/reflectorbit) の紹介用ランディングページです。  
ゲーム本体は Zig + sokol-zig 製のベクター調・軌道反射アクションゲームで、このサイトはその世界観・遊び方・導線を 1 ページで伝えるために作られています。

- Live: <https://reflectorbit-lp.pages.dev>
- Play in browser: <https://reflectorbit.pages.dev>
- Game repository: <https://github.com/keroway/reflectorbit>

## このサイトについて

この LP の役割はシンプルです。

- ゲームの第一印象を伝える
- 「反射して攻撃する」コアフックを短く説明する
- ブラウザ版プレイとネイティブ版ダウンロードへつなぐ

## ページ構成

- **Hero** — タイトル、キャッチ、メイン CTA
- **Concept** — ゲームのコアアイデア
- **Trailer** — 実プレイ映像のトレーラー動画（詳細は `docs/video.md` Track A）
- **Screenshots** — タイトル / プレイ中 / GAME OVER
- **How to Play** — 操作方法とルールの要点
- **Playable Demo** — ブラウザ版への試遊導線
- **Download** — GitHub Releases への導線
- **Footer** — リポジトリ / クレジット

## 技術スタック

- **Astro 7** — 静的サイト生成
- **Tailwind CSS 4** — `@theme` ベースのデザイントークン運用
- **Biome** — lint / format
- **Playwright** — smoke / a11y チェック
- **Cloudflare Pages** — ホスティング

## 技術的な工夫

- **1 ページ完結の静的構成**で、LP として軽く配信
- **ゲーム本体由来のカラートークン**を流用し、サイトとゲームの見た目を同期
- **Playable Demo は遅延起動寄りの導線**にして、初期表示の負荷を抑制
- **OGP 画像を SVG ソースから生成**し、共有用ビジュアルを管理
- **Playwright で最低限の表示・アクセシビリティ確認**を自動化

## ローカル開発

```sh
npm install
npm run dev
```

主なコマンドや運用メモは [`docs/development.md`](./docs/development.md) にまとめています。

## ドキュメント

- [`docs/copy.md`](./docs/copy.md) — 掲載文言の正典
- [`docs/design.md`](./docs/design.md) — 配色・トーン・デザイントークン
- [`docs/assets.md`](./docs/assets.md) — アセット管理メモ
- [`docs/video.md`](./docs/video.md) — 動画演出（Trailer / How to Play 動画化）の設計メモ
- [`docs/development.md`](./docs/development.md) — 開発・ビルド・デプロイ情報

## License

[MIT](./LICENSE)
