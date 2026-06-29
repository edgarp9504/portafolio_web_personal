import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://www.edgar-perez.com',
  integrations: [
    icon(),
    sitemap({
      filter: (page) => !page.endsWith('rss.xml'),
    }),
    mdx(),
  ],
  output: 'static',
});
