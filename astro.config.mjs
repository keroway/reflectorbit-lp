// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Cloudflare Pages へ独立ドメイン (reflectorbit.pages.dev) で静的配信するため、
// GitHub Pages 系の `base` サブパスは不要。site だけ設定して canonical / OGP / sitemap を生成する。
export default defineConfig({
  site: 'https://reflectorbit.pages.dev',
  integrations: [sitemap()],
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
