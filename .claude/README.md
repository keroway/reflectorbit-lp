# reflectorbit-lp — Claude Code Setup

このディレクトリは Claude Code の動作をこのプロジェクト用に整える共有設定です。
リポジトリルートの `CLAUDE.md` と一緒に読んでください。

## 構成

```
.claude/
├── hooks/
│   └── post-stop-check.sh  # Stop: 変更範囲に応じた biome check / astro check
├── settings.json           # 共有設定（hook 登録、コミット対象）
├── settings.local.json     # 個人設定（.gitignore で除外）
└── worktrees/              # git worktree 置き場（.gitignore で除外）
```

## 依存ツール

| ツール | 用途 | 必須？ |
|---|---|---|
| `pnpm` | lint・typecheck の実行 | 必須（hook が PATH を要求、無いと Stop hook が exit 2 で通知） |
| `jq` | hook 内 JSON 抽出 | 無い環境では非依存フォールバックで動作 |

## Hooks の挙動

### Stop: `post-stop-check.sh`

- 発火条件: Claude が応答を終えたとき（変更ファイルが無ければ即終了）
- 動作: 変更ファイル（uncommitted + untracked + 未 push commit）を分類し、
  `src/**` / `public/**` / `tests/**` やビルド関連設定に変更があれば
  `biome check .` + `astro check` を実行（CI の Lint / Typecheck ジョブのサブセット）
- 失敗時: exit 2 で Claude にフィードバック（ブロッキング）
- pnpm が見つからない等「検証できない」場合も exit 2（silent-pass しない）
- 一時的に止めたい場合: `RBLP_SKIP_STOP_HOOK=1`

E2E (Playwright) はブラウザ起動コストが高く秒オーダーに収まらないため Stop hook の対象外。
CI (`.github/workflows/site.yml`) と、PR 前の `just check` に委ねる。

## keroway ワークスペース方針との関係

`keroway/CLAUDE.md`「Stop hook / codex review の方針」の段階 1（ターン終了ごとの決定的チェック）を
本リポジトリで実現するのがこの hook。codex stop review gate（段階の外側、LLM レビュー）は
このリポジトリでも無効のまま — 設計レビューが必要なときは `/code-review` を手動起動する。

## 他環境への移植

このディレクトリは macOS / Linux いずれでも動作するように書かれています:

- hook スクリプトは `#!/usr/bin/env bash`
- 絶対パスは `$CLAUDE_PROJECT_DIR` で解決する

新しい開発者がリポジトリをクローンした場合、追加でやることはありません。Claude Code が
`settings.json` を読み込めば hook が有効になります。
