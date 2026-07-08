# Development

この文書は、この LP を保守・運用する人向けのメモです。

## セットアップ

```sh
npm install
npm run dev        # http://127.0.0.1:4321
npm run build      # dist/ に静的出力
npm run typecheck  # astro check
npm run preview    # ビルド結果の確認
npm run lint       # Biome
npm run format     # Biome で整形
npm run smoke      # Playwright smoke test
npm run smoke:a11y # Playwright + axe-core
```

## ディレクトリ概要

```text
.
├── docs/               # コピー、デザイン、アセット、運用メモ
├── public/             # favicon / OGP / screenshots など
├── scripts/            # 補助スクリプト
├── src/components/     # 各セクション
├── src/layouts/        # Layout.astro
├── src/pages/          # index.astro / 404.astro
├── src/styles/         # global.css (@theme)
└── tests/              # Playwright テスト
```

## デプロイ

- ホスティング先: **Cloudflare Pages**
- 公開 URL: <https://reflectorbit-lp.pages.dev>
- `main` への push で自動デプロイ
- Build command: `npm run build`
- Build output directory: `dist`

> ゲーム本体のブラウザ版 `reflectorbit.pages.dev` とは別プロジェクトです。

## OGP 画像

`public/og-default.png` は `public/og-default.svg` を元に生成しています。

```sh
npm run og:gen
```

デザインを更新したら PNG も再生成してコミットしてください。

## 関連ドキュメント

- [`copy.md`](./copy.md)
- [`design.md`](./design.md)
- [`assets.md`](./assets.md)
