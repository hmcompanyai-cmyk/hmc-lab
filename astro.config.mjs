import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// kurabeai.com 取得後は site を 'https://kurabeai.com' に差し替えるだけ
// （canonical/sitemap/OGP/RSSが全て追従する）
export default defineConfig({
  site: 'https://kurabeai.com',
  integrations: [sitemap()],
  trailingSlash: 'never',
});
