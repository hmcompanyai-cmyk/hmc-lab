import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import genre from './src/data/genres/ai-school/genre.json' with { type: 'json' };

// kurabeai.com 取得後は site を 'https://kurabeai.com' に差し替えるだけ
// （canonical/sitemap/OGP/RSSが全て追従する）
export default defineConfig({
  site: 'https://kurabeai.com',
  integrations: [
    mdx(),
    sitemap({
      // noindexページをsitemapに載せない（拡張性監査M-1）:
      // 広告LPは常時除外、ジャンルが非公開(indexable:false)の間はトップ+LP群も除外
      filter: (page) => {
        const p = new URL(page).pathname.replace(/\/$/, '') || '/';
        if (p === '/ai-school/lp') return false;
        if (!genre.indexable && (p === '/' || p.startsWith('/ai-school'))) return false;
        return true;
      },
    }),
  ],
  trailingSlash: 'never',
});
