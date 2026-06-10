// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Cloudflare Pages へ独立ドメイン (reflectorbit-lp.pages.dev) で静的配信するため、
// GitHub Pages 系の `base` サブパスは不要。site だけ設定して canonical / OGP / sitemap を生成する。
// 注: reflectorbit.pages.dev はゲーム本体のプレイ URL。LP は別プロジェクト reflectorbit-lp.pages.dev。
export default defineConfig({
  site: 'https://reflectorbit-lp.pages.dev',
  integrations: [sitemap()],
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
