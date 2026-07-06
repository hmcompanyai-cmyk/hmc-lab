# ARCHITECTURE.md — くらべAI 技術設計書（下位モデル/後任向け）

最終更新: 2026-07-06 / 対象: このリポジトリ全体（ブログ＋生成AIスクール比較LP）
設計の経緯・調査の正本: `~/Desktop/research/2026-07-06-ai-school-data/`（特に10-unified-design.md）

## 1. 前提（絶対に守ること）
- Astro 5 静的生成・Vercelホスティング。**UIフレームワーク/アイランド/Alpine禁止、vanilla JSのみ**
- 外部CDN・外部フォント・追加SaaS禁止（自己完結）。インタラクションはカスタム要素＋co-located `<script>`
- 記事・LPの文章規律: **絵文字禁止・ストレート引用符禁止・編集方針の自己言及禁止**（「広告非連動」等はアフィリ自白になる）
- 捏造禁止: 口コミ・数字・体験は実在＋出典URLが必須。無ければ「調査中」と書く

## 2. ディレクトリ地図
```
src/
  data/genres/ai-school/   ← スクール比較のデータ正本（genre/schools/segments/changelog）
  lib/schools.ts           ← zod検証・順位算出・構造化データ（ビルド時に全検証が走る）
  lib/subsidy.ts           ← 給付金計算と条件注記文
  components/school/       ← LP部品13個（props駆動。ジャンルデータの直import禁止※PrLabelのみ例外）
  layouts/Base.astro       ← 全ページ共有シェル（title/desc/canonical/OGP/noindex/jsonLd）
  layouts/LpLayout.astro   ← LP用（Base+StickyBar+法務リンク+lp.css）
  layouts/Post.astro       ← ブログ記事用
  pages/ai-school/         ← index(メインLP) / [slug](サブLP4+個別7) / lp(広告用・常時noindex)
  pages/info.astro         ← 法務集約（運営者/評価方法/免責/プライバシー）
  styles/global.css        ← 全体テーマ（白基調・CSS変数）/ lp.css ← LP専用
```
触ってよい範囲: 上記src配下。**ブログ既存ページ（blog/*, index, about, privacy）とLPは独立**——LP改修でブログを壊さないこと。

## 3. ルーティング規約
- `/ai-school` = defaultセグメント。`/ai-school/{slug}` は [slug].astro が **segment(4本)とschool(7本)を混在生成**し`kind`で分岐
- **segment slugとschool idの衝突はlib/schools.tsがビルド時にthrow**（新規追加時は自動で守られる）
- noindex: `data/genres/ai-school/genre.json` の `indexable` **1箇所**で全LP/個別/infoが切り替わる（lp.astroだけ常時noindex）。公開GOはこのフラグをtrueにして再デプロイするだけ

## 4. データ契約（genres/ai-school/）
- **schools.json**: 全フィールドはlib/schools.tsのzodスキーマが正。重要:
  - `scores`(5軸1-5点) — 順位はここから算出。**手打ちの順位フィールドは存在しない（作るな）**
  - `affiliate:false` — ASP提携したらtrueに。**それだけでPR表記(PrLabel)とrel="sponsored nofollow"が同一ビルドで自動有効化**（景表法対応が原子的）
  - `verified:false` + `verifyNote` — 料金未確認校。PriceTableが注記を強制描画
  - `subsidy.conditionNote` — 10字未満だとビルドが落ちる（注記なしの給付金表示を構造的に禁止）
  - `voices[]` — quote/attr/year/media/url全部必須（引用と出典の1:1近接表示）
- **segments.json**: weights合計=1（±0.01）でないとビルドが落ちる。`requireSubsidy:true`で対象校を絞る
- **changelog.json**: `expiresAt`を過ぎた項目は自動非表示。**再確認のたびに1エントリ追記＋genre.jsonのcheckedDate更新**が運用規約（変更なし月も「再確認済み」を入れて鮮度を前進させる）

## 5. 診断フィルタ仕様（DiagnosisForm.astro）
- 4軸: p(目的)/b(予算)/f(形式)/k(こだわり)。**軸間AND・軸内は単一選択**
- カード側の`data-purpose|format|kodawari|monthly|total|subsidy|score`とマッチング
- 予算は数値比較: m2=月額≤29,999 / t5=総額≤50,000 / sub=給付金型
- 状態はURLSearchParams（`?p=&b=&f=&k=`）。**enumホワイトリスト外の値は無視**（XSS/M-1対応）。DOM更新はclassList/textContentのみ・innerHTML禁止
- JS無効時は全カード表示（プログレッシブ・エンハンスメント）

## 6. コンポーネントAPI要点
- SchoolCard: props={school, rank, score, segment}。relはaffiliateフラグから自動決定
- PriceTable: **実質価格を主表示にしない**原則のまま「価格インパクトパネル」（総額取り消し線→実質を大きく・conditionNoteは同パネル内に近接）。数字の大きさは自由だが**条件注記を隣から離すな**
- Stars: 表示は「編集部評価」明示＋/info#ranking-basisへリンク（H-3）。口コミ件数はVoices側で別表示
- SegmentSection: LP本体の単一描画経路。メインLPもサブLPもこれを通す（差分はsegments.jsonのみ）
- Voices: 3件以上でScroll Snapカルーセル（`<voice-carousel>`）、2件以下はグリッド。JS無効時は`:not(:defined)`で折返しグリッドに戻る。アバターは属性の頭文字（数字・年代はスキップ）
- StickyBar: ナビ4＋主CTA1。props.cta={href,label,rel}で差し替え（個別ページは当該校の無料相談）。ページに無いアンカーは実行時に`GENRE.basePath#id`へ自動フォールバック
- QuickDiagnosis: 完全一致0件でも最近接1校を「n/m条件に合致」と正直に提示（行き止まり禁止）。結果には無料相談CTA（主）＋詳細リンク（副）
- DiagnosisForm: 0件時は同条件のクエリ付きで全校一覧へ逃がすリンクを出す。適用時は結果カードへscrollIntoView

## 7. 給付金シミュレータ（SubsidySimulator/subsidy.ts）
- 式: `granted = min(floor(fee×rate), cap)` / rate・capはコンポーネントのdata-*属性経由（lib定数が単一ソース）
- 入力は0〜5,000,000にクランプ・制度はenum照合。結果はサーバー側既定値を描画済み（CLSゼロ）
- **CONDITION_NOTE（割引ではない旨）はJS非依存で常時表示**。消すな（優良誤認リスク）

## 8. CWVチェックリスト
画像はwidth/height明示＋loading="lazy" / フィルタ0件時もmin-height確保 / hydrationなし（カスタム要素のみ） / scroll-behavior:smooth＋scroll-margin-top

## 9. 構造化データ
**ItemListとBreadcrumbListのみ**。自作ランキングへのAggregateRating/Reviewマークアップは**Google手動対策リスクがあるため禁止**（05-astro-tech.md調査結論）

## 10. 法規制ガードレール（変更時は必ず参照）
1. PR表記はaffiliateフラグ駆動の自動表示のみ。手書き追加も削除もしない
2. 給付金・補助金は「条件達成後の支給」注記を全表示箇所で必須（conditionNoteスキーマ強制）
3. 「No.1」「限定」等は客観根拠・実在特典なしに書かない
4. 順位・評価は/infoのスコア表と機械的一致（lib経由でしか表示しない）
5. 口コミは実在・出典1:1近接・**一次ソースのみ（孫引き禁止）**。掲載前に出典URLをフェッチして引用文の存在を機械照合する。中略は「…」、編集部の補足は「〔編集部注: 〕」で明示（無断改変禁止）。公式サイト掲載の声は「公式掲載・選抜あり」と明示しない限り混ぜない。詳細ガイドライン=会社repo ops/audits/2026-07-07-kurabeai-prelaunch/03-legal-audit.md
6. verified:falseの学校は注記が自動で出る。**公開(index化)前に公式再確認して解消するのが原則**
7. 免責は穏当な文言（「一切責任を負わない」型の全部免責は書かない）
8. 禁止ジャンル: 薬機法（美容健康）・金商法（投資）・医療・法律

## 11. アクセシビリティ
開閉は`<details>/<summary>`優先 / 比較表はth scope＋role="region"＋tabindex="0" / 装飾はCSS::before（絵文字不使用） / aria-live（診断結果）

## 12. デザイントークン
global.cssの`:root`変数（--primary青/--cta橙/--marker黄）が正。第2ジャンル追加時は`<body data-genre>`スコープで変数上書き（テーマfork禁止）

## 13. noindex→index化の手順（公開フロー）
1. verified:false校の料金を公式再確認しschools.json更新（verifiedをtrueに）
2. `genre.json`の`indexable`をtrueに
3. build→deploy→`grep noindex dist/ai-school/index.html`が0件であることを確認
4. Google Search Consoleにサイトマップ送信（ドメイン取得後）

## 14. テスト戦略
`npx vitest run` — lib層のユニットテスト（順位算出・給付金計算・失効・検証）。**カバレッジ80%以上を維持**。データ変更時もテストが順位の整合を守る。UIはビルド成功＋dist検品（noindex/ItemList/PR表記）で担保

## 15. 将来の拡張（第2ジャンル追加の手順）
1. `src/data/genres/{new-genre}/`を作成（ai-schoolのJSON構造をコピー）
2. lib/schools.tsをジャンルパラメータ化（この時点で初めて[genre]動的ルート化を検討——YAGNI原則で現在は未実装）
3. components/school/はprops駆動なのでそのまま再利用可能
4. **注意（拡張性監査M-4）**: トップページ(index.astro)とBase.astroのnav/footerはai-schoolハードコード。第2ジャンル時はトップの「ジャンルハブ化」とナビの配列駆動化が必要

## 16. 記事工場ガードレール（blog運用ルール・拡張性監査2026-07-07）

### 16.1 frontmatter契約（content.config.ts）
- `targetKeyword`（必須）: この記事が所有する主要KW。1KW=1URL
- `cluster` / `pillar`: 所属クラスタとピラー宣言（クラスタ=ピラー1本+子記事5本前後）
- `relatedGenre` / `relatedSchoolId`: 指定するとPost.astroが比較LP/個別ページへの収益動線カードを自動描画
- `sources`: 一次情報の出典（label/url/checkedAt）。**affiliate:trueの記事は1件以上必須**（zod refine）

### 16.2 ビルド時品質ゲート（lib/blog-checks.ts、blog/index.astroから実行）
違反はビルドが落ちる: ①targetKeywordの記事間重複 ②LP所有KWとのカニバリ ③内部リンク切れ ④収益動線ゼロ（relatedGenre未指定かつ本文にLPリンクなし）

### 16.3 カニバリ防止の役割分担（最重要）
- **スクール単体の「評判/料金/口コミ/レビュー」は `/ai-school/[school]` が所有。blogでは書かない**
- blogが書けるのは: head-to-head比較（A vs B）・howto（給付金ガイド等）・条件別比較・ツール横断比較・自社実測データ公開
- このルールはseo-writer.py（Mac mini）のプロンプトにも焼き込むこと

### 16.4 記事内CTA
- MDX導入済み（@astrojs/mdx@4）。新規記事は`.mdx`にし、アフィリリンクは`<Aff href label />`（components/Aff.astro）を使う。**手書き`<a class="aff-btn">`は禁止**（rel=sponsored漏れを構造的に防ぐ）
- 既存`.md`2本は経過措置（手書きCTAあり）。次回更新時に.mdx化する
