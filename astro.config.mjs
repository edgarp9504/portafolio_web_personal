import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://tudominio.com', // 👈 Cambia esto a tu dominio real
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('rss.xml'),
    }),
    mdx(),
  ],
  output: 'static',
});
