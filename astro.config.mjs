import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.edgar-perez.com',
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('rss.xml'),
    }),
    mdx(),
  ],
  output: 'static',
});
