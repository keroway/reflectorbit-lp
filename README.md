# reflectorbit-lp

[REFLECTORBIT](https://github.com/keroway/reflectorbit) の紹介用ランディングページ（LP）。

ゲーム本体は Zig + sokol-zig 製のベクター調反射アクションゲーム。
この LP はゲームの世界観・操作・遊びどころを伝え、**ブラウザ版プレイ**と**ネイティブ版ダウンロード**へ誘導することを目的とする。

- この LP（公開先）: <https://reflectorbit-lp.pages.dev>
- ゲーム本体リポジトリ: <https://github.com/keroway/reflectorbit>
- ブラウザで今すぐプレイ（ゲーム本体）: <https://reflectorbit.pages.dev>

## このリポジトリのゴール

1. ゲームの第一印象（ビジュアル・コンセプト）を 1 スクロールで伝える
2. 「ブラウザで遊ぶ」「ダウンロード」への明確な CTA
3. 操作方法・遊び方の最小限の説明
4. WASM 版をページ内に埋め込んでその場で試遊できる（Playable Demo セクションで実装済み）

## 想定セクション構成（ドラフト）

| セクション | 内容 |
|---|---|
| Hero | タイトルロゴ + キャッチコピー + 「今すぐプレイ」CTA |
| Concept | 「反射して攻撃する」コアフックを 1〜2 文で |
| How to Play | Space / Shift の 2 キー操作とルールの図解 |
| Playable Demo | WASM 版（[reflectorbit.pages.dev](https://reflectorbit.pages.dev)）を `<iframe>` でページ内に遅延埋め込み |
| Download | ネイティブ版（Linux / macOS / Windows）へのリンク |
| Footer | 本体リポジトリ・ライセンス・クレジット |

コピー素材は `docs/copy.md`、配色・トーンは `docs/design.md` を参照。

## 技術スタック（確定）

- **フレームワーク: [Astro](https://astro.build/)** (v6) — SSG / Islands Architecture で
  出力はほぼ素の HTML/CSS。LP のような「ほぼ静的 + 一部だけ動的」に最適で、WASM 版の試遊埋め込みも
  `<iframe>` / `<canvas>` で容易
- **スタイリング: [Tailwind CSS](https://tailwindcss.com/)** (v4 / `@tailwindcss/vite`)。
  デザイントークンは `src/styles/global.css` の `@theme` で定義
- **Lint / Format: [Biome](https://biomejs.dev/)**
- **ホスティング: Cloudflare Pages**（ゲーム本体と同じ。GitHub 連携で main push 時に自動デプロイ）

> 検討の経緯は当初 Astro / Vite+TS / 素の HTML を比較し、SSG・Cloudflare Pages 親和性・
> WASM 埋め込みのしやすさから Astro に確定。雛形は同作者の code-tactics-lp に倣う。

## デプロイ（Cloudflare Pages）

公開先は **<https://reflectorbit-lp.pages.dev>**（ゲーム本体の `reflectorbit.pages.dev` とは
別の Pages プロジェクト）。Cloudflare ダッシュボードの **GitHub Git 連携**で配信し、
`main` への push をトリガーに自動でビルド・デプロイされる（CI 側にデプロイ設定は持たない）。

初回セットアップ（Cloudflare ダッシュボードで一度だけ）:

1. **Workers & Pages → Create → Pages → Connect to Git** を開く
2. GitHub App に `keroway/reflectorbit-lp`（private）への権限を付与し、リポジトリを選択
3. ビルド設定:
   - **Project name**: `reflectorbit-lp`（= `reflectorbit-lp.pages.dev`）
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Save and Deploy** → 初回ビルド後に公開。以降は `main` への push で自動再デプロイ

> OGP・canonical・sitemap は `astro.config.mjs` の `site`（`https://reflectorbit-lp.pages.dev`）から
> 生成される。独自ドメインに切り替える場合は `site` も合わせて更新する。

## セットアップ

```sh
npm install
npm run dev      # 開発サーバ (http://127.0.0.1:4321)
npm run build    # 型チェック + dist/ に静的出力
npm run preview  # ビルド結果のプレビュー
npm run lint     # Biome で lint
npm run format   # Biome で format 適用
```

## ディレクトリ構成

```
.
├── CLAUDE.md          # Claude Code 向けのリポジトリガイド
├── README.md          # このファイル
├── astro.config.mjs   # Astro 設定 (site / Tailwind / sitemap)
├── biome.json         # Lint / Format 設定
├── docs/
│   ├── copy.md        # LP に載せる文言・キャッチコピー集（正典）
│   ├── design.md      # ブランドカラー・トーン・タイポ
│   └── assets.md      # 必要なスクショ / ロゴ / OGP 素材リスト
├── public/            # favicon / OGP など静的アセット
└── src/
    ├── layouts/       # Layout.astro (head / meta / OGP)
    ├── pages/         # index.astro (LP 本体・1 ページ)
    └── styles/        # global.css (@theme デザイントークン)
```

## ライセンス

[MIT License](./LICENSE)。ゲーム本体 [keroway/reflectorbit](https://github.com/keroway/reflectorbit) と同方針。
