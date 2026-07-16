# 動画演出の設計メモ

LP に動画表現を導入するための設計ドキュメント。後続タスク（別モデル / 別エージェント）が
このドキュメントだけを読んで実装に着手できることを目的にまとめる。

## 背景

現状 LP に動的な映像はない（Hero はインライン SVG + SMIL アニメーション、How to Play は
静的 SVG 図解）。よりリッチにするため、以下 2 系統で動画を導入する。

- **Track A: 実写トレーラー動画** — ブラウザ版の実プレイ映像を撮影し、新設 Trailer セクションで
  `<video>` 埋め込みする。
- **Track B: HyperFrames による HTML 駆動の動画生成** — [Hyperframes](https://hyperframes.heygen.com/introduction)
  （HTML を frame-by-frame で確定的にレンダリングして MP4 化する OSS CLI）を使い、
  How to Play の操作図解を「動く図解」として作り直す。

> **HyperFrames の性質に注意**: 動画プレーヤーや埋め込み SDK ではなく、
> `npx hyperframes render --output out.mp4` で HTML コンポジションを MP4 に書き出す
> **ビルドツール**。実写映像の配信には使わない（Track A とは無関係）。

両トラックとも、生成・撮影した動画ファイルは **`public/videos/` にコミットする静的アセット**として
扱う。`scripts/gen-og.mjs` / `npm run og:gen` と同じ運用（ローカルで生成 → コミット、
Cloudflare Pages の `npm run build` では再生成しない）に揃える。

## 全体方針（共通）

- **CLS 対策**: 動画を置く枠は `PlayableDemo.astro` に倣い `aspect-video` などで
  高さを先に確保し、レイアウトシフトを防ぐ。
- **自動再生の扱い**: 音声なしのループ背景素材（Hero 用途など）を除き、
  **クリックで初めてロード・再生するファサード方式**を既定にする
  （`PlayableDemo.astro` の起動ボタンパターンを流用）。モバイル / 低速回線での
  無駄な帯域消費を避けるため。
- **`prefers-reduced-motion`**: `reduce` の場合は自動再生・自動ループを行わない。
  Hero の SMIL 制御（`Hero.astro` 内のスクリプト）と同様に、JS で明示的にオン/オフを切り替える。
  静止ポスター画像（1 枚目のフレーム）を必ず用意し、動きを止めても内容が伝わるようにする。
- **音声**: 現時点で用意する映像はすべて BGM/効果音なしのミュート素材と想定。
  `muted` 属性必須、キャプション（字幕）は不要。将来音声付き素材を追加する場合は
  別途このドキュメントを更新すること。
- **フォーマット**: `mp4`（H.264 / yuv420p / `+faststart`）を主系統、`webm`（VP9）を
  副系統として両方用意し `<source>` で出し分ける。ポスターは `jpg`（quality 80 目安）。
- **Biome 対象**: 新規追加する `scripts/*.mjs` は Biome の lint/format 対象（`.astro` は対象外の
  既存ルールと混同しないこと）。
- **ファイル配置規約**: 配信用の最終アセットは `public/videos/<name>.mp4` /
  `public/videos/<name>.webm` / `public/videos/<name>-poster.jpg` に統一する。

---

## Track A: 実写トレーラー動画

### 目的・配置

- 新設 `src/components/Trailer.astro` セクションを追加。
- ページ内の位置: **Concept の直後、Screenshots の前**
  （Hero → Concept → **Trailer** → Screenshots → How to Play → Playable Demo → Download → Footer）。
  静止画（Screenshots）の前に動く映像で世界観を掴ませ、その後に個別カットを見せる導線。
- Hero 背景の SVG ループはそのまま維持する（軽量・実装済み・`prefers-reduced-motion` 対応済みのため、
  今回のスコープでは置き換えない。将来的に実写ループへ差し替える案は本ドキュメント末尾の
  「将来検討」に残す）。

### 素材仕様

- 取得元: ブラウザ版 <https://reflectorbit.pages.dev> の画面録画。
  Stage モードで「反射 → 攻撃 → PERFECT REFLECT」が一通り見える 15〜30 秒程度のプレイを収録。
- 解像度: 収録は 1920x1080 以上推奨、書き出しは **1280x720**（16:9）にダウンスケール。
- 長さ: 15〜30 秒、ループ再生前提（先頭と末尾のつながりが不自然にならないカットを選ぶ）。
- エンコード目安（1 本あたり数MB〜10MB程度に収める）:
  - `trailer.mp4`: H.264, yuv420p, CRF 26〜28, `-movflags +faststart`, 音声トラックなし
  - `trailer.webm`: VP9, CRF 30〜32 相当, 音声トラックなし
  - `trailer-poster.jpg`: 先頭付近の見栄えの良い 1 フレームを書き出し、quality 80
- 参考 ffmpeg コマンド例（実際のパラメータは素材を見て調整）:

  ```sh
  ffmpeg -i raw-capture.mov -vf scale=1280:720 -an -c:v libx264 -crf 27 -movflags +faststart public/videos/trailer.mp4
  ffmpeg -i raw-capture.mov -vf scale=1280:720 -an -c:v libvpx-vp9 -crf 31 -b:v 0 public/videos/trailer.webm
  ffmpeg -i public/videos/trailer.mp4 -vf "select=eq(n\,30)" -frames:v 1 -q:v 3 public/videos/trailer-poster.jpg
  ```

### 実装仕様

- `PlayableDemo.astro` と同じ「ファサード起動」パターンを踏襲する:
  1. 初期表示は `poster` 画像 + 再生ボタンのオーバーレイのみ（`<video>` 要素はまだ生成しない）。
  2. クリックで `<video>` 要素を生成し `src`/`<source>` をセットして `.play()`。
  3. `muted playsinline loop controls` を付与（`controls` はユーザーが一時停止できるように必須。
     ミュートループなので著作権/自動再生ポリシー上のブロックは基本発生しないが、
     iOS Safari 等の挙動を考慮し `playsinline` を必ず付ける）。
  4. 読み込みに時間がかかる場合のフォールバック文言は不要（動画は自己ホストで `PlayableDemo` の
     iframe ほど重くない想定のため）。ただしロード失敗時は `poster` 画像のまま留まるので、
     alt 相当のキャプション文（例:「読み込みに失敗した場合はスクリーンショットをご覧ください」）を
     Screenshots セクションへの導線として一言添える。
- コンポーネント props は不要（`consts.ts` 経由の URL 管理は不要、`public/videos/` 内の固定パス参照でよい）。

### コピー草案（`docs/copy.md` へ反映する下書き）

- 見出し: **トレーラー**
- リード文（案）: 「反射して攻撃する軌道アクションを、実際のプレイ映像で。」
- 再生ボタン文言: 「クリックしてトレーラーを再生」
- 音声なしの注記（案）: 「※ 音声なし・ループ再生」

### 受け入れ条件（この Track 全体の完了条件）

- [ ] `public/videos/trailer.mp4` / `trailer.webm` / `trailer-poster.jpg` が上記仕様でコミットされている
- [ ] `src/components/Trailer.astro` が実装され、`src/pages/index.astro` に
      Concept と Screenshots の間で組み込まれている
- [ ] クリックするまで `<video>` がロードされない（DevTools Network で確認）
- [ ] `aspect-video` 等でレイアウトシフトが起きない
- [ ] `prefers-reduced-motion: reduce` でも自動再生されない（もともとファサード方式なので問題ない想定だが、
      確認する）
- [ ] `docs/copy.md` / `docs/design.md` / `docs/assets.md` / `README.md` のページ構成一覧を更新
- [ ] Playwright smoke テスト（`tests/smoke.test.ts`）に Trailer セクションの表示確認を追加

---

## Track B: HyperFrames による How to Play 動画

### 対象・目的

- 現状 `src/pages/index.astro` にインライン SVG で実装されている「Space で軌道半径を縮小 /
  Shift で拡大」の対比図解を、**HyperFrames で HTML/CSS から生成した動画**に置き換える
  （または併設する）。
- 角運動量保存（ω = L / r²）による「半径を縮めると速く回る」動きは静止図より動画の方が
  伝わりやすく、このセクションが最も動画化の価値が高いと判断（Hero 背景ループの動画化は
  価値対コストが低いため対象外、末尾の「将来検討」参照）。

### 前提環境

- HyperFrames CLI（`npx hyperframes`）の実行には **Chrome（Playwright 経由 or システム Chrome）と
  FFmpeg** が必要。ローカル開発機 or CI のジョブランナーで実行可能か、着手前に確認すること。
  このリポジトリの Cloudflare Pages ビルド環境では実行しない（後述のとおりローカル生成 → コミット運用）。
- `npx hyperframes render` はプロジェクトディレクトリ（例: `video/how-to-play/`）を位置引数として受け取り、
  `--format mp4` / `--format webm` で出力形式を指定、`-o` で出力パスを指定する（`--input`/`--output`
  フラグはない）。`webm` は HyperFrames が `--format webm` で直接書き出せるため、ffmpeg での
  mp4 → webm 変換フォールバックは不要（ffmpeg は先頭フレームの poster 抽出のみに使う）。
  実装は `scripts/gen-how-to-play-video.mjs` 参照。

### コンポジション設計（たたき台）

- ディレクトリ: リポジトリ直下に `video/how-to-play/`（Astro の `src/` とは独立させる。
  HyperFrames のコンポジションはプレーンな HTML ファイルであり、Astro のビルドパイプラインには
  乗せない）。
  - `video/how-to-play/index.html` — コンポジション本体
  - `video/how-to-play/style.css` — ブランドトークンを使ったスタイル（下記参照）
- 内容（案）: 画面を左右 2 分割し、
  - 左: Shield が小さい半径で高速回転（Space 側）
  - 右: Shield が大きい半径で低速回転（Shift 側）
  - 中央下部に「Space → 半径縮小・高速」「Shift → 半径拡大・低速」のラベル
  - Meteor が Core に向かって重力加速しつつ、Shield に反射されて味方色（`#4DFF8C` エメラルド）に
    変わる一瞬を両側に挿入し、「反射して攻撃する」フックも同時に示す
- 色は `docs/design.md` のブランドカラー表を直接参照する（LP 独自色を作らない）:
  - Core: `#ADBDFF` / Shield: `#FF33CC` / Meteor: `#FF801A` / Reflected: `#4DFF8C` /
    Background: `#0A0A0F`
- 尺: 4〜6 秒ループ（How to Play の対比が 1 サイクルで伝わる長さ）。
- アニメーション手段: HyperFrames は GSAP / Lottie / CSS のいずれも frame-seek 可能であれば使える。
  実装難易度を優先するなら **CSS `@keyframes` + `animation-play-state` 制御**で十分
  （既存 `Hero.astro` の SMIL 相当の発想を CSS に置き換えたイメージ）。複雑な緩急が必要になったら
  GSAP 導入を検討。

### ビルドスクリプト方針

- `scripts/gen-how-to-play-video.mjs` を新設し、`npm run video:howtoplay:gen` から実行する。
  `scripts/gen-og.mjs` と同じトーン（Node スクリプト、コメントで運用ポリシーを明記）で:
  1. `npx --no-install hyperframes render video/how-to-play --format mp4 -o public/videos/how-to-play.mp4`
     を `child_process`（`execFileSync`）で実行。プロジェクトディレクトリを位置引数として渡し、`--input`/`--output`
     フラグは使わない。`hyperframes` は `package.json` の `devDependencies` に固定バージョンで
     入れ、`--no-install` でローカル依存のみを使う（生成物をコミットするため、毎回最新版を取得して
     再現性が崩れないようにする）。
  2. 同様に `--format webm -o public/videos/how-to-play.webm` で webm を直接出力（HyperFrames が
     webm をサポートするため ffmpeg での mp4 → webm 変換は不要）。
  3. 先頭フレームを ffmpeg で `public/videos/how-to-play-poster.jpg` として書き出し（ffmpeg の利用は
     poster 抽出のみ）。
- **CI では実行しない**。ローカルで `npm run video:howtoplay:gen` を実行し、
  生成物（`public/videos/how-to-play.mp4` / `.webm` / `-poster.jpg`）を通常のアセットとして
  コミットする（`og:gen` と同じ運用方針、README の理由付けもそれに揃える）。

### 統合方法（How to Play セクション）

- `src/pages/index.astro` 内の既存インライン SVG 図解を、動画に置き換えるか併設するかは
  実装時に判断してよいが、**推奨は置き換え**（同じ情報を二重に持たない）。
- 表示は Track A の Trailer とは異なり、**このセクションは常時ループ再生する動く図解**という
  性質上、ファサード方式ではなく即時ロードでよい（ファイルサイズが小さいループのため）。
  ただし:
  - `prefers-reduced-motion: reduce` では自動再生・ループを止め、`poster` 静止画のみ表示する
    （`Hero.astro` の `pauseAnimations()` 相当の分岐を `<video>` の `autoplay` 制御で実装。
    具体的には reduced-motion 時は `<video>` に `autoplay` を付けず `controls` を出す）。
  - `muted loop playsinline` を付与。
  - キーボード操作の表（`consts.ts` の `controls` 配列 / 既存の表組み）はそのまま残し、
    動画は「視覚的な補助」の位置づけとする（表がある以上、動画がロードされなくても情報は欠落しない）。

### 受け入れ条件

この Track の完了条件は、(a) 動画生成基盤の完了条件と (b) How to Play セクションへの統合の
完了条件に分けて管理する。(a) が本 PR（Issue #87）のスコープ、(b) は**別 Issue（#88）で扱う**。

#### (a) 動画生成基盤の完了条件（Issue #87 のスコープ）

- [x] HyperFrames CLI 実行環境（Chrome + FFmpeg）が使えることを確認済み
- [x] `video/how-to-play/` にコンポジション（HTML/CSS）が実装されている
- [x] `scripts/gen-how-to-play-video.mjs` と `npm run video:howtoplay:gen` が追加されている
- [x] `public/videos/how-to-play.mp4` / `.webm` / `-poster.jpg` がコミットされている

#### (b) How to Play セクションへの統合の完了条件（別 Issue #88 のスコープ）

- [ ] 既存のインライン SVG 図解を置換（または併設）し、How to Play セクションに動画が統合され、
      既存の操作表と併存している
- [ ] `prefers-reduced-motion: reduce` で自動再生・ループが止まり、静止表示になることを確認
- [ ] `docs/copy.md` / `docs/design.md` / `docs/assets.md` / `README.md` を更新
- [ ] Playwright smoke / a11y テストを更新（動画要素の存在確認、reduced-motion 分岐があれば axe 実行時に影響ないか確認）

---

## 将来検討（今回のスコープ外）

- Hero 背景の SVG ループを HyperFrames 製の実写 or モーション動画に差し替える案。
  現行 SVG 実装は軽量・`prefers-reduced-motion` 対応済みで LCP への影響も小さいため、
  優先度は低い。ページ全体の動画点数が増えると総転送量が肥大するリスクもあるため、
  Track A / B が実装され効果検証できてから再検討する。
- Cloudflare Stream など動画専用ホスティングへの移行（`public/` 自己ホストで転送量/ビルドサイズが
  問題になった場合に検討）。

## 関連ドキュメント

- `docs/copy.md` — Trailer / How to Play セクションのコピー正典（本ドキュメントの草案を反映する）
- `docs/design.md` — ブランドカラー・トーン（Track B のコンポジション配色の出所）
- `docs/assets.md` — アセットチェックリスト（動画アセットの項目を追加する）
