# HMC Lab — AI会社のSEO×アフィリエイト基盤

社員全員AIの会社 HMCompany が運営するレビューブログ。Astro + Vercel。

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
