# reflectorbit-lp

[REFLECTORBIT](https://github.com/keroway/reflectorbit) の紹介用ランディングページ（LP）。

ゲーム本体は Zig + sokol-zig 製のベクター調反射アクションゲーム。
この LP はゲームの世界観・操作・遊びどころを伝え、**ブラウザ版プレイ**と**ネイティブ版ダウンロード**へ誘導することを目的とする。

- ゲーム本体リポジトリ: <https://github.com/keroway/reflectorbit>
- ブラウザで今すぐプレイ: <https://reflectorbit.pages.dev>

## このリポジトリのゴール

1. ゲームの第一印象（ビジュアル・コンセプト）を 1 スクロールで伝える
2. 「ブラウザで遊ぶ」「ダウンロード」への明確な CTA
3. 操作方法・遊び方の最小限の説明
4. （将来）WASM 版をページ内に埋め込んでその場で試遊できるようにする

## 想定セクション構成（ドラフト）

| セクション | 内容 |
|---|---|
| Hero | タイトルロゴ + キャッチコピー + 「今すぐプレイ」CTA |
| Concept | 「反射して攻撃する」コアフックを 1〜2 文で |
| How to Play | Space / Shift の 2 キー操作とルールの図解 |
| Playable Demo（将来） | WASM 版をページ内 `<iframe>` / `<canvas>` で埋め込み |
| Download | ネイティブ版（Linux / macOS / Windows）へのリンク |
| Footer | 本体リポジトリ・ライセンス・クレジット |

コピー素材は `docs/copy.md` を参照。

## 技術スタック（推奨・未確定）

> 言語 / FW は別途検討。以下は推奨案。最終決定したら本セクションを更新する。

**第一推奨: [Astro](https://astro.build/)**

- 静的サイト生成（SSG）で出力がほぼ素の HTML/CSS → 高速・高 Lighthouse スコア
- JS をデフォルトで出力しない（Islands Architecture）ので、LP のように「ほぼ静的 + 一部だけ動的」に最適
- ゲーム本体と同じく **Cloudflare Pages** に素直にデプロイできる
- WASM 版の試遊埋め込みも `<iframe>` / `<canvas>` で容易

**代替案**

| 選択肢 | 向いている場合 |
|---|---|
| Vite + Vanilla TS/HTML | 依存を最小にしたい・1 ページで十分なとき |
| Next.js | 将来ブログやニュース等の動的コンテンツを足す予定があるとき |
| 素の HTML/CSS | ビルドツールすら持ちたくない最小構成 |

ホスティングはゲーム本体に合わせ **Cloudflare Pages** を想定。

## セットアップ（FW 決定後に追記）

```sh
# 例: Astro を採用する場合
npm create astro@latest .
npm install
npm run dev      # ローカル開発サーバ
npm run build    # dist/ に静的出力
```

## ディレクトリ構成（予定）

```
.
├── README.md          # このファイル
├── docs/
│   ├── copy.md        # LP に載せる文言・キャッチコピー集
│   └── assets.md      # 必要なスクショ / ロゴ / OGP 素材リスト
└── (FW 決定後にソース一式)
```

## ライセンス

未定（ゲーム本体のライセンス方針に合わせる）。
