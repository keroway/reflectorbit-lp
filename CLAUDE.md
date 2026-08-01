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

- フレームワーク: **Astro** (v7) — SSG / Islands Architecture
- スタイリング: **Tailwind CSS** (v4 / `@tailwindcss/vite` プラグイン経由)。
  グローバル CSS は `src/styles/global.css` の `@import "tailwindcss";` のみ。
  v3 系の `tailwind.config.js` や `@astrojs/tailwind` 統合は使わない。
  デザイントークンは同ファイルの `@theme` ブロックで定義する。
- パッケージマネージャ: **pnpm 11**（`packageManager` フィールドでピン。
  Node 26 / pnpm 11 は `mise.toml` でもピン）。依存の build スクリプトは
  `pnpm-workspace.yaml` の `allowBuilds` で明示許可制（lefthook のみ許可）
- Lint / Format: **Biome**（`biome.json`、double quote）。対象は `*.ts` / `*.js` / `*.mjs` / `*.json`。
  `.md` のみ補助 Prettier（`pnpm run lint` / `format` に統合済み）。
  `.astro` は Biome の整形対象外（テンプレートは手で整える）
- ホスティング: **Cloudflare Pages**（ゲーム本体と同じ。GitHub 連携で main push 時に自動デプロイ。
  Build command = `pnpm run build`、Build output = `dist/`）。
  公開先は **LP = `reflectorbit-lp.pages.dev`**、**ゲーム本体 = `reflectorbit.pages.dev`** で別プロジェクト。
  LP の「ブラウザで今すぐプレイ」リンク（`src/consts.ts` の `PLAY_URL`）はゲーム側 `reflectorbit.pages.dev` を指す。
  混同しないこと。セットアップ手順は `docs/development.md` を参照

```sh
pnpm run dev        # 開発サーバー (http://127.0.0.1:4321)
pnpm run build      # 静的出力 → dist/  (astro build。型チェックは含まない)
pnpm run typecheck  # 型チェック (astro check。CI では site.yml の Typecheck ジョブ)
pnpm run preview    # ビルド結果のプレビュー
pnpm run lint       # Biome で lint (CI と同じ)
pnpm run format     # Biome で format 適用
```

## アーキテクチャ

1 ページ完結。セクション構成は `docs/copy.md` / README に対応:
**SiteNav → Hero → Concept → Trailer → Screenshots → How to Play → Playable Demo → Download → Footer**。

- `astro.config.mjs` — `site`（`https://reflectorbit-lp.pages.dev`）と Tailwind の Vite プラグイン、
  sitemap。Cloudflare Pages へは静的出力（`output` 既定）でデプロイするため `base` は付けない
  （ゲーム本体 LP の code-tactics-lp は GitHub Pages のサブパス配信で `base` が要るが、
  こちらは独立ドメイン配信なので不要）
- `src/layouts/Layout.astro` — `<head>` / meta / OGP / favicon
- `src/pages/index.astro` — LP 本体（1 ページ）。全セクション
  （SiteNav / Hero / Concept / Trailer / Screenshots / HowToPlay / PlayableDemo / Download / SiteFooter）を組み立てる
- `src/components/PlayableDemo.astro` — WASM 版（`reflectorbit.pages.dev`）を
  `<iframe>` で埋め込む。クリック起動のファサード方式で初期負荷を抑制し、
  読み込み遅延時は別タブ導線にフォールバックする

## デザイントークン（重要な制約）

ブランドカラーの **正は `docs/design.md`**、その出所は **ゲーム本体 `src/constants.zig`** の
色定数（ブルーバイオレット Core / マゼンタ Shield など）。LP 側で色を独自に発明しない。
色を足す・変えるときは「本体 `constants.zig` → `docs/design.md` → `global.css` の `@theme`」の
順で同期させる。`@theme` トークンは `--color-rb-*` 命名で、Tailwind の `bg-rb-bg` /
`text-rb-core` のように使う。

## OGP 画像の生成

`public/og-default.png` (1200×630) は `public/og-default.svg` から
`scripts/gen-og.mjs` (sharp) で書き出す。デザインソース更新後は
`pnpm run og:gen` を実行して PNG を更新しコミットする。
CI では再生成しない（`pnpm run build` は PNG がコミット済み前提）。

## CI

- `.github/workflows/ci.yml`（`CI` / `Lint`）— `pnpm run lint`。paths フィルタなしで**全 PR に必ず起動**する
  （prettier が `**/*.md` を見るため、docs だけの変更でも必要）
- `.github/workflows/site.yml`（`Site` / `Typecheck`・`E2E`）— `astro check` とビルド + Playwright（`pnpm test`。
  `chromium` と `mobile-320` の両 project、smoke/a11y/mobile 回帰を 1 プロセスで実行）。
  **`src/**` `public/**` `tests/**` や設定ファイルに触った PR だけ起動**し、docs のみの PR ではスキップされる。
  手動でフル検証したいときは `workflow_dispatch`
- 依存脆弱性は `osv-scan.yml` が単独で担当（PR は `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`
  変更時のみ起動 + 毎週月曜 cron）。**`pnpm audit` は CI から意図的に外してある**
  （外部 advisory DB の更新タイミングで無関係な PR の Lint が赤くなるのを避けるため）。復活させないこと
- 秘密情報スキャン (`gitleaks.yml`) だけは PR に加えて `push: main` も維持している。
  秘密漏洩は取り返しがつかないため、直 push が起きた場合に週次 cron まで検知が遅れるリスクを許容しない
- ローカルの `just check` は `lint` → `typecheck` → `build` → `pnpm test` を通しで実行する（CI と同じ組み合わせ）

### CI を変更する前に読む不変条件

- main-protection ruleset の required status check は **`CI / Lint` のみ**。
  `Site` の Typecheck / E2E を required に追加する場合は、workflow-level `paths` のスキップ方式をやめて
  「常に起動し、先頭の `changes` ジョブで後続を `if:` 制御する」方式（兄弟リポ `code-tactics-lp` の
  `.github/workflows/ci.yml` が前例）へ移行すること。さもないと docs だけの PR が Pending のまま
  マージ不能になる
- `docs/copy.md` は LP 文言の正典で `src/` と同時に更新する運用のため、`site.yml` の paths には含めていない
  （`src/` 側の変更が必ず伴うので結果的に検証される）
- `public/**` は現行テストでは実体（画像・動画ファイル）そのものは検証していないが、
  将来のカバレッジ確保のため意図的に `site.yml` の paths に含めてある
- `src/styles/global.css` は Biome も `astro check` も対象外なので、`site.yml` の E2E（axe の
  色コントラスト検査を含む）が唯一の自動検証。CSS だけの変更でも `site.yml` の paths（`src/**`）で拾われる

## ビルド時の落とし穴（外さないこと）

- **Astro 7 は Vite v8 を必要とする**: Astro 7 への移行時に `overrides.vite` を `^7.x` に固定して
  いると `astro build` が `rollupOptions.input should not be an html file when building for SSR`
  で失敗する。Astro 7 以降は `overrides.vite` を削除し、Astro が同梱する Vite v8 をそのまま使う。
- **Biome は `.css` / `.astro` を対象外** (`biome.json` の `includes`): Biome の CSS パーサは
  Tailwind v4 の `@theme` / `@apply` / `@import "tailwindcss"` を解釈できずパースエラーになるため。
  `global.css` の整形は手で行う。

## ドキュメント

- `docs/copy.md` — LP に載せる文言・キャッチコピー（正典）
- `docs/design.md` — ブランドカラー（hex + 元定数）・トーン・タイポ・セクション意図
- `docs/assets.md` — 必要なロゴ / スクショ / OGP 素材のチェックリスト
