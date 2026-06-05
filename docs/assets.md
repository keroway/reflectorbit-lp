# 必要アセット一覧

LP 制作で用意・収集が必要な素材のチェックリスト。

## 画像 / 動画

- [ ] タイトルロゴ（SVG 推奨。ベクター調に合わせる）
- [ ] Hero 用スクリーンショット or ループ動画（プレイ中の反射シーン）
- [ ] How to Play 用の操作図解（Space で縮小 / Shift で拡大の概念図）
- [ ] ギャラリー用スクショ数枚（コンボ・GameOver・難易度選択など）

## SNS / メタ

- [x] OGP 画像（1200×630px、`public/og-default.png`。デザインソースは `public/og-default.svg`、生成は `npm run og:gen`）
- [x] favicon（`public/favicon.svg`）
- [x] サイトタイトル / description（`src/layouts/Layout.astro` の props 既定値）
- [x] `public/robots.txt`（`sitemap-index.xml` を参照）
- [x] JSON-LD 構造化データ（`Layout.astro` で `VideoGame`）

## ブランドカラー（ゲーム本体に合わせる）

- ネオン / サイバーパンク調を踏襲（円・線・パーティクルのベクター表現）
- 具体的なカラーコードはゲーム本体の `src/constants.zig` / `src/render.zig` を参照して抽出する

## 取得元

- スクショ / 動画: ブラウザ版 <https://reflectorbit.pages.dev> から撮影
- ロゴ・配色: ゲーム本体リポジトリ <https://github.com/keroway/reflectorbit>
