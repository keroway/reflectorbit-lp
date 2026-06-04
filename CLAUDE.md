# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリの性質

ゲーム本体ではなく、ベクター調・軌道反射アクションゲーム
[REFLECTORBIT](https://github.com/keroway/reflectorbit)（Zig + sokol-zig 製）の
**紹介ページ (LP)**。1 ページ完結の静的サイトで、世界観とコアフック（反射して攻撃する）を
伝え、**ブラウザ版プレイ**（<https://reflectorbit.pages.dev>）と
**ネイティブ版ダウンロード**（GitHub Releases）へ誘導するのが目的。ログインや双方向 UI は不要。

正典コピー（タイトル・キャッチ・操作・ダウンロード文言）は `docs/copy.md` が出所。
本文・CTA 文言を変えるときは `docs/copy.md` も同時に更新する。

## 現状とスタック

確定済みスタック:

- フレームワーク: **Astro** (v6) — SSG / Islands Architecture
- スタイリング: **Tailwind CSS** (v4 / `@tailwindcss/vite` プラグイン経由)。
  グローバル CSS は `src/styles/global.css` の `@import "tailwindcss";` のみ。
  v3 系の `tailwind.config.js` や `@astrojs/tailwind` 統合は使わない。
  デザイントークンは同ファイルの `@theme` ブロックで定義する。
- Lint / Format: **Biome**（`biome.json`）。対象は `*.ts` / `*.js` / `*.mjs` / `*.json` / `*.css`。
  `.astro` は Biome の整形対象外（テンプレートは手で整える）
- ホスティング: **Cloudflare Pages**（ゲーム本体と同じ。GitHub 連携で main push 時に自動デプロイ。
  Build command = `npm run build`、Build output = `dist/`）

```sh
npm run dev        # 開発サーバー (http://127.0.0.1:4321)
npm run build      # 型チェック + 静的出力 → dist/  (astro check && astro build)
npm run preview    # ビルド結果のプレビュー
npm run lint       # Biome で lint (CI と同じ)
npm run format     # Biome で format 適用
```

## アーキテクチャ

1 ページ完結。セクション構成は `docs/copy.md` / README に対応:
**Hero → Concept → How to Play → Playable Demo（将来）→ Download → Footer**。

- `astro.config.mjs` — `site`（`https://reflectorbit.pages.dev`）と Tailwind の Vite プラグイン、
  sitemap。Cloudflare Pages へは静的出力（`output` 既定）でデプロイするため `base` は付けない
  （ゲーム本体 LP の code-tactics-lp は GitHub Pages のサブパス配信で `base` が要るが、
  こちらは独立ドメイン配信なので不要）
- `src/layouts/Layout.astro` — `<head>` / meta / OGP / favicon
- `src/pages/index.astro` — LP 本体（1 ページ）。Hero は実装済み、それ以外のセクションは
  枠 + TODO のスケルトン。将来の WASM 試遊埋め込み（`<iframe>` / `<canvas>`）は
  Playable Demo 枠が予定地

## デザイントークン（重要な制約）

ブランドカラーの **正は `docs/design.md`**、その出所は **ゲーム本体 `src/constants.zig`** の
色定数（シアン Core / マゼンタ Shield など）。LP 側で色を独自に発明しない。
色を足す・変えるときは「本体 `constants.zig` → `docs/design.md` → `global.css` の `@theme`」の
順で同期させる。`@theme` トークンは `--color-rb-*` 命名で、Tailwind の `bg-rb-bg` /
`text-rb-core` のように使う。

## ビルド時の落とし穴（外さないこと）

- **`package.json` の `overrides.vite` (`^7.3.5`)**: `@tailwindcss/vite@4.3.0` は放っておくと
  vite 8（rolldown ベース）をネストで引き、`astro build` が
  `Missing field tsconfigPaths on BindingViteResolvePluginConfig` で失敗する。
  vite を 7 系に固定して回避している。Astro / Tailwind を上げる際はこの override を見直す。
- **Biome は `.css` / `.astro` を対象外** (`biome.json` の `includes`): Biome の CSS パーサは
  Tailwind v4 の `@theme` / `@apply` / `@import "tailwindcss"` を解釈できずパースエラーになるため。
  `global.css` の整形は手で行う。

## ドキュメント

- `docs/copy.md` — LP に載せる文言・キャッチコピー（正典）
- `docs/design.md` — ブランドカラー（hex + 元定数）・トーン・タイポ・セクション意図
- `docs/assets.md` — 必要なロゴ / スクショ / OGP 素材のチェックリスト
