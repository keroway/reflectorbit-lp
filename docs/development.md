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

## PlayableDemo の iframe 読み込み失敗検出について（既知の限界）

`src/components/PlayableDemo.astro` は `iframe` の `error` イベントで読み込み失敗
（`demo-error` パネル表示）を検出しているが、これは実ブラウザでは
**`X-Frame-Options` / CSP `frame-ancestors` によるブロックを検出できない**（issue #219 で実測済み）。

Playwright(Chromium) で `PLAY_URL` に `X-Frame-Options: DENY` を返すよう
route interception した場合の実測結果:

- `iframe` は `error` ではなく **`load` を発火する**（ブロックされたナビゲーションも
  「読み込み完了」として扱われるため）。
- `load` 発火後に `iframe.contentWindow.location.href` を読もうとすると、
  ブロック時・成功時のどちらも `SecurityError` で例外になり、**この方法では
  ブロックされたかどうかを判別できない**（クロスオリジンの `iframe` は成功時も
  中身を読めないため、ブロック時と区別が付かない）。

つまり、埋め込み先（`reflectorbit.pages.dev`）と協調した通知手段
（例: 埋め込み先から `postMessage` で「起動できた」を送る）を追加しない限り、
LP 側の JS だけで「実際に遊べる状態で読み込めたか」を確実に判定する方法は無い。
このため現状は以下の多層フォールバックで実用上の到達可能性を担保している
（`load` イベント自体の誤検出耐性を高める対応ではない点に注意）:

1. 起動後 8 秒で応答が無い場合に「別タブで開く」導線を表示（`fallbackTimer`）
2. セクション下部に常設の「うまく動かない場合は別タブで開く」リンク

`reflectorbit`（ゲーム本体）側に `postMessage` ハンドシェイクを追加すればより確実な
検出が可能になるが、それは別リポジトリの変更を要するため本リポジトリの scope 外。

## 関連ドキュメント

- [`copy.md`](./copy.md)
- [`design.md`](./design.md)
- [`assets.md`](./assets.md)
- [`video.md`](./video.md)
