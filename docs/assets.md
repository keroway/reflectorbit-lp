# 必要アセット一覧

LP 制作で用意・収集が必要な素材のチェックリスト。

## 画像 / 動画

- [ ] タイトルロゴ（SVG 推奨。ベクター調に合わせる）。本体は 2dca98b（#435）でベクターワードマーク・app icon（`assets/icon/*`）・favicon・cover art に刷新済み。LP は独自の `public/favicon.svg`/`og-default.svg` を維持中で未対応
- [x] Hero 用スクリーンショット or ループ動画（プレイ中の反射シーン）— SVG インラインアニメーションで代替実装済み（`src/components/Hero.astro`）。実ゲーム画像が揃い次第差し替え可能
- [x] How to Play 用の操作図解（Space で縮小 / Shift で拡大の概念図。HyperFrames 生成の動画（`public/videos/how-to-play.mp4`/`.webm`）を `src/components/HowToPlay.astro` で統合済み。旧インライン SVG 図解は置換済み）
- [x] ギャラリー用スクショ数枚 — 本体 `assets/press/screenshot-{title,playing,gameover}.png`（#411）を `public/screenshots/` にコピーし、`src/components/Screenshots.astro` のギャラリーで使用中。コンボ・難易度選択画面のカットは本体に未収録

## 動画（新規 — 詳細仕様は `docs/video.md`）

- [ ] トレーラー動画（実写プレイ映像。`public/videos/trailer.mp4` / `.webm` / `-poster.jpg`。
      現状はスクリーンショット 3 枚のスライドショーによる**プレースホルダ**をコミット済み。
      セクション実装（`src/components/Trailer.astro`）は完了しており、実プレイ映像の収録（#85）が
      済み次第、同名ファイルの差し替えのみで反映される）
- [x] How to Play 動画（HyperFrames 生成。`public/videos/how-to-play.mp4` / `.webm` / `-poster.jpg`。コンポジションは `video/how-to-play/`、生成は `pnpm run video:howtoplay:gen`。How to Play セクションへの統合完了済み（#88）

## SNS / メタ

- [x] OGP 画像（1200×630px、`public/og-default.png`。デザインソースは `public/og-default.svg`、生成は `pnpm run og:gen`）
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
