# デザインガイド

LP のデザイン検討の土台。配色は **ゲーム本体 [REFLECTORBIT](https://github.com/keroway/reflectorbit)
の `src/constants.zig` から抽出した実値**で、ここを正典とする。LP 独自に色を発明せず、
本体の色定数が更新されたらこのファイル → `src/styles/global.css` の `@theme` の順で同期する。

## ブランドカラー

ゲーム内の各エンティティ色をそのまま LP のパレットに採用。Zig 側は `[4]f32`（RGBA 各 0.0〜1.0）
で定義されており、`値 × 255` を四捨五入して hex 化している。

| 役割                | hex       | `@theme` トークン      | 元定数 (`constants.zig`)                   | 用途                                                                                                |
| ------------------- | --------- | ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Core / Primary      | `#ADBDFF` | `--color-rb-core`      | `CORE_COLOR` (0.68, 0.74, 1.0)             | ブルーバイオレット。タイトル・主役・リンク強調。**M17 (#414/#415) で旧シアン `#33E6FF` から変更**   |
| Shield / Secondary  | `#FF33CC` | `--color-rb-shield`    | `SHIELD_COLOR` (1.0, 0.2, 0.8)             | マゼンタ。対の主役・アクセント                                                                      |
| Combo / Gold        | `#FFE61A` | `--color-rb-combo`     | `SHIELD_COLOR_HIGH_COMBO` (1.0, 0.9, 0.1)  | 高揚・ハイライト・主 CTA 候補                                                                       |
| Meteor / Orange     | `#FF801A` | `--color-rb-meteor`    | `METEOR_COLOR` (1.0, 0.5, 0.1)             | 動き・暖色アクセント（Normal 種）                                                                   |
| Spawner / Danger    | `#E63333` | `--color-rb-danger`    | `SPAWNER_COLOR` (0.9, 0.2, 0.2)            | 危機・警告                                                                                          |
| Heavy / Violet      | `#991ACC` | `--color-rb-violet`    | `HEAVY_METEOR_COLOR` (0.6, 0.1, 0.8)       | 深みの差し色（Heavy 種）                                                                            |
| Particle / Spark    | `#FFCC4D` | `--color-rb-spark`     | `PARTICLE_BURST_COLOR` (1.0, 0.8, 0.3)     | 火花・微アクセント                                                                                  |
| Background          | `#0A0A0F` | `--color-rb-bg`        | clear color (0.04, 0.04, 0.06)             | ほぼ黒。サイトのベース背景                                                                          |
| Text secondary      | `#CCCCCC` | `--color-rb-muted`     | `UI_COLOR_TEXT_SECONDARY` (0.8, 0.8, 0.8)  | 本文・補助テキスト                                                                                  |
| Reflected / Emerald | `#4DFF8C` | `--color-rb-reflected` | `REFLECTED_METEOR_COLOR` (0.30, 1.0, 0.55) | 反射済み弾の味方化（エメラルド）。**M17 で旧黄緑 `#80FF4D` から変更**                               |
| Perfect / Lime      | `#9EFF29` | `--color-rb-perfect`   | `PERFECT_METEOR_COLOR` (0.62, 1.0, 0.16)   | PERFECT 反射済み弾（ライム）。**M17 で旧シアン `#33FFE6` から変更**（Core/Fast との色相衝突を解消） |
| Fast / Red-orange   | `#FF2E1F` | `--color-rb-fast`      | `FAST_METEOR_COLOR` (1.0, 0.18, 0.12)      | 高速メテオ（警戒の赤橙）。**M17 で旧水色シアン `#4DFFFF` から変更**（危险信号として暖色化）         |
| Arc / Gold          | `#E6E61A` | `--color-rb-arc`       | `ARC_METEOR_COLOR` (0.9, 0.9, 0.1)         | 曲がるメテオ（Arc 種）。M13 で追加された新メテオ種                                                  |
| Trail Reflected     | `#40FF94` | —                      | `TRAIL_REFLECTED_COLOR` (0.25, 1.0, 0.58)  | 反射後トレイル（エメラルド）。図解参照用。表のみ記載                                                |

**象徴アイデンティティ**: ブルーバイオレット `#ADBDFF`（Core）× マゼンタ `#FF33CC`（Shield）の対比。CTA や見出しはこの 2 色＋
ゴールド `#FFE61A` を軸にする。Core 被弾時に背景が赤くフラッシュする演出（`#0A0A0F` → 赤寄り）が
本体にあるため、危機表現は `#E63333` を使う。

> **M17 パレット統一（Issue #414）の背景**: 旧パレットでは Core・Fast・PERFECTがすべてシアン系に集中していたため、本体は役割別に色相を分離した（Core=ブルーバイオレットの守る対象、Fast=警戒の暖色、PERFECT=報酬のライム）。LP の主色（CTA・見出し・リンク）もこれに従いシアンからブルーバイオレットへ変更済み。ブランド素材（`public/favicon.svg` / `public/og-default.svg`）も同様に同期し、`npm run og:gen` で PNG を再生成済み。

## トーン & ボイス

- ビジュアル: **ダーク背景 × ネオン発光**、ベクター（円・線・パーティクル・軌道）調。
  ゲーム画面のスクリーンショット／ループ動画をそのまま主役素材にする
- コピー: 短く・断定的・テックでクール。例「弾くな、撃ち返せ。」「2 キーで操る、軌道反射アクション。」
  （正典は `docs/copy.md`）
- 物理の読み合い（角運動量保存 ω = L / r²、可変軌道半径 × メテオ重力加速）が売りなので、
  How to Play では「Space=縮小／Shift=拡大」の対比を動画（HyperFrames 生成ループ）で見せる

## タイポグラフィ方針

- 見出し・ロゴ: ベクター調に合うジオメトリック／等幅寄りのサンセリフ。タイトル「REFLECTORBIT」は
  シアンで字間を広めに
- 本文: 可読性重視のサンセリフ、`#CCCCCC` 系。ネオン色は強調箇所に限定して使う（全面発光は避ける）
- グロー（text-shadow / box-shadow）は控えめに。`prefers-reduced-motion` を尊重しアニメは抑制可能に

## セクション別の意図（`docs/copy.md` と対応）

| セクション    | デザイン意図                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero          | 全画面に近いダーク背景＋反射シーンのビジュアル。タイトル（Core ブルーバイオレット）＋キャッチ＋主 CTA「▶ ブラウザで今すぐプレイ」                                       |
| Concept       | 「守る」だけでなく「反射→攻撃」のコアフックを 1〜2 文＋簡易図で。メテオ変化4種・3モード（Stage/Endless/Daily）・コスメティックアンロックも箇条書きで追記                |
| Trailer       | Concept 直後・Screenshots 直前。実プレイ映像で世界観を掴ませるファサード起動の動画枠（`src/components/Trailer.astro`、詳細は `docs/video.md` Track A）                  |
| Screenshots   | 本体 `assets/press/` の実スクリーンショット（タイトル・プレイ中・GAME OVER）を3枚ギャラリー表示（`src/components/Screenshots.astro`）                                   |
| How to Play   | Space / Shift の 2 キー操作を対の図解動画（`public/videos/how-to-play.mp4`/`.webm`）で。P / ↑↓・MODE & DIFFICULTY サブメニュー（Stage/Endless/Daily・難易度）は補足表で |
| Playable Demo | WASM 版を `<iframe>` 埋め込み（`src/components/PlayableDemo.astro`）。クリック起動のファサード方式で初期負荷を抑制                                                      |
| Download      | Linux / macOS / Windows の 3 バイナリへのリンク。未署名警告の注記                                                                                                       |
| Footer        | 本体リポジトリ・ライセンス・クレジット（制作: keroway）                                                                                                                 |

## 動画演出

Hero 背景の実写化・How to Play の動画化など、動画表現の設計・実装仕様は
`docs/video.md` にまとめている（Trailer セクション新設 / HyperFrames を使った
How to Play 動画化の2トラック）。配色は本ファイルの表を出所として使うこと。

## 必要アセット

ロゴ・スクショ・OGP・favicon の収集チェックリストは `docs/assets.md` を参照。
配色だけは本ファイルで確定済み（上表）。

> 本体リポに `assets/press/screenshot-{title,playing,gameover}.png`（README 埋め込み用、#411）が追加された。
> LP には `public/screenshots/` にコピーして `src/components/Screenshots.astro` のギャラリーで使用済み。
> 本体でスクショが再生成されたら同じ手順で差し替える。
