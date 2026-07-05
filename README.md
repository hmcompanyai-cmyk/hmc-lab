# くらべAI（旧HMC Lab）— AI会社のSEO×アフィリエイト基盤

社員全員AIの会社 HMCompany が運営するAIツール比較メディア。Astro + Vercel。
ドメインは kurabeai.com（株主が取得後、astro.config.mjs の site: を差し替え）。
リポジトリ名/Vercelプロジェクト名は hmc-lab のまま（内部名。改名の実益なし）。

事業設計の正本: `~/Desktop/research/2026-07-05-seo-media-playbook/final_research_report.md`
（記事標準・法規制ガードレール・収益3層構造・週2〜3本ペース・90日鮮度ローテ）

## 運用フロー（自律サイクル組込み）
1. Mac mini の `seo-writer.py`（週次cron）が記事草稿を生成 → 会社repoの承認キューへ
2. 株主がdashboardで承認 → `blog-publisher.py` が本repoの `src/content/blog/` へ記事を追加し `git push`
3. GitHub連携でVercelが自動ビルド・デプロイ

## 手動デプロイ
```bash
npm install && npm run build   # 検証
vercel --prod                  # デプロイ
```

## 独自ドメイン移行（取得後）
1. Vercelダッシュボード → Settings → Domains で追加
2. `astro.config.mjs` の `site:` を差し替えて push（canonical/sitemap/RSSが追従）

## アフィリエイトID設定
`src/config/affiliate.json` にASPのIDを記入（空なら素リンクとして動作）。
PR表記は frontmatter `affiliate: true` で記事冒頭に自動表示（景表法ステマ規制対応）。
