import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 独自ドメイン取得後はここを差し替えるだけ（canonical/sitemap/OGP/RSSが全て追従する）
export default defineConfig({
  site: 'https://hmc-lab.vercel.app',
  integrations: [sitemap()],
  trailingSlash: 'never',
});
