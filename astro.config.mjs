import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import genre from './src/data/genres/ai-school/genre.json' with { type: 'json' };

// 本番ドメイン aibanzuke.com（2026-07-11取得・お名前.com/NSはVercel委任）
// canonical/sitemap/OGP/RSSはすべてこのsiteから導出される
export default defineConfig({
  site: 'https://aibanzuke.com',
  integrations: [
    mdx(),
    sitemap({
      // noindexページをsitemapに載せない（拡張性監査M-1 + 技術SEO監査B-2）:
      // 非公開(indexable:false)の間は全ページnoindexなのでsitemapも空にする（矛盾ゼロ）。
      // 公開後も 広告LP と /info重複のorphan(about/privacy) は常時除外
      filter: (page) => {
        if (!genre.indexable) return false;
        const p = new URL(page).pathname.replace(/\/$/, '') || '/';
        if (p === '/ai-school/lp' || p === '/about' || p === '/privacy' || p === '/links') return false;
        return true;
      },
    }),
  ],
  trailingSlash: 'never',
});
