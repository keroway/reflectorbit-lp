# デザインガイド

LP のデザイン検討の土台。配色は **ゲーム本体 [REFLECTORBIT](https://github.com/keroway/reflectorbit)
の `src/constants.zig` から抽出した実値**で、ここを正典とする。LP 独自に色を発明せず、
本体の色定数が更新されたらこのファイル → `src/styles/global.css` の `@theme` の順で同期する。

## ブランドカラー

ゲーム内の各エンティティ色をそのまま LP のパレットに採用。Zig 側は `[4]f32`（RGBA 各 0.0〜1.0）
で定義されており、`値 × 255` を四捨五入して hex 化している。

| 役割 | hex | `@theme` トークン | 元定数 (`constants.zig`) | 用途 |
|---|---|---|---|---|
| Core / Primary | `#33E6FF` | `--color-rb-core` | `CORE_COLOR` (0.2, 0.9, 1.0) | シアン。タイトル・主役・リンク強調 |
| Shield / Secondary | `#FF33CC` | `--color-rb-shield` | `SHIELD_COLOR` (1.0, 0.2, 0.8) | マゼンタ。対の主役・アクセント |
| Combo / Gold | `#FFE61A` | `--color-rb-combo` | `SHIELD_COLOR_HIGH_COMBO` (1.0, 0.9, 0.1) | 高揚・ハイライト・主 CTA 候補 |
| Meteor / Orange | `#FF801A` | `--color-rb-meteor` | `METEOR_COLOR` (1.0, 0.5, 0.1) | 動き・暖色アクセント |
| Spawner / Danger | `#E63333` | `--color-rb-danger` | `SPAWNER_COLOR` (0.9, 0.2, 0.2) | 危機・警告 |
| Heavy / Violet | `#9919CC` | `--color-rb-violet` | `HEAVY_METEOR_COLOR` (0.6, 0.1, 0.8) | 深みの差し色 |
| Particle / Spark | `#FFCC4D` | `--color-rb-spark` | `PARTICLE_BURST_COLOR` (1.0, 0.8, 0.3) | 火花・微アクセント |
| Background | `#0A0A0F` | `--color-rb-bg` | clear color (0.04, 0.04, 0.06) | ほぼ黒。サイトのベース背景 |
| Text secondary | `#CCCCCC` | `--color-rb-muted` | `UI_COLOR_TEXT_SECONDARY` (0.8, 0.8, 0.8) | 本文・補助テキスト |

**象徴アイデンティティ**: シアン `#33E6FF` × マゼンタ `#FF33CC` の対比。CTA や見出しはこの 2 色＋
ゴールド `#FFE61A` を軸にする。Core 被弾時に背景が赤くフラッシュする演出（`#0A0A0F` → 赤寄り）が
本体にあるため、危機表現は `#E63333` を使う。

## トーン & ボイス

- ビジュアル: **ダーク背景 × ネオン発光**、ベクター（円・線・パーティクル・軌道）調。
  ゲーム画面のスクリーンショット／ループ動画をそのまま主役素材にする
- コピー: 短く・断定的・テックでクール。例「弾くな、撃ち返せ。」「2 キーで操る、軌道反射アクション。」
  （正典は `docs/copy.md`）
- 物理の読み合い（角運動量保存 ω = L / r²、可変軌道半径 × メテオ重力加速）が売りなので、
  How to Play では「Space=縮小／Shift=拡大」の対比を図解で見せる

## タイポグラフィ方針

- 見出し・ロゴ: ベクター調に合うジオメトリック／等幅寄りのサンセリフ。タイトル「REFLECTORBIT」は
  シアンで字間を広めに
- 本文: 可読性重視のサンセリフ、`#CCCCCC` 系。ネオン色は強調箇所に限定して使う（全面発光は避ける）
- グロー（text-shadow / box-shadow）は控えめに。`prefers-reduced-motion` を尊重しアニメは抑制可能に

## セクション別の意図（`docs/copy.md` と対応）

| セクション | デザイン意図 |
|---|---|
| Hero | 全画面に近いダーク背景＋反射シーンのビジュアル。タイトル（シアン）＋キャッチ＋主 CTA「▶ ブラウザで今すぐプレイ」 |
| Concept | 「守る」だけでなく「反射→攻撃」のコアフックを 1〜2 文＋簡易図で |
| How to Play | Space / Shift の 2 キー操作を対の図解で。P / ↑↓ は補足表で |
| Playable Demo（将来） | WASM 版を `<iframe>` / `<canvas>` 埋め込み。今は枠のみ |
| Download | Linux / macOS / Windows の 3 バイナリへのリンク。未署名警告の注記 |
| Footer | 本体リポジトリ・ライセンス・クレジット（制作: keroway） |

## 必要アセット

ロゴ・スクショ・OGP・favicon の収集チェックリストは `docs/assets.md` を参照。
配色だけは本ファイルで確定済み（上表）。
