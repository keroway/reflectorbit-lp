# Development

この文書は、この LP を保守・運用する人向けのメモです。

## セットアップ

```sh
pnpm install
pnpm run dev        # http://127.0.0.1:4321
pnpm run build      # dist/ に静的出力
pnpm run typecheck  # astro check
pnpm run preview    # ビルド結果の確認
pnpm run lint       # Biome
pnpm run format     # Biome で整形
pnpm run smoke      # Playwright smoke test
pnpm run smoke:a11y # Playwright + axe-core
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
- Build command: `pnpm run build`
- Build output directory: `dist`

> ゲーム本体のブラウザ版 `reflectorbit.pages.dev` とは別プロジェクトです。

## OGP 画像

`public/og-default.png` は `public/og-default.svg` を元に生成しています。

```sh
pnpm run og:gen
```

デザインを更新したら PNG も再生成してコミットしてください。

## 動画アセット

How to Play セクションの図解動画は HyperFrames（`video/how-to-play/` のコンポジション）から生成します。

```sh
pnpm run video:howtoplay:gen
```

- 出力: `public/videos/how-to-play.mp4` / `.webm` / `how-to-play-poster.jpg`
- 前提: Chrome（Playwright 経由）+ FFmpeg が必要
- `og:gen` と同じく **ローカルで生成 → コミット** 運用。CI では再生成しません
- コンポジション設計・配色などの詳細仕様は [`video.md`](./video.md)（Track B）を参照

> トレーラー動画（`public/videos/trailer.*`）は現状スクリーンショットのスライドショーによる
> プレースホルダです。実プレイ映像の収録は別 issue（#85）で対応し、同名ファイルの差し替えで反映されます。

## 関連ドキュメント

- [`copy.md`](./copy.md)
- [`design.md`](./design.md)
- [`assets.md`](./assets.md)
- [`video.md`](./video.md)
