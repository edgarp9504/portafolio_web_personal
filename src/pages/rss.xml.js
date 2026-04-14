import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Blog · Edgar Pérez — Data Engineer & Cloud Consultant',
    description: 'Artículos sobre ingeniería de datos, pipelines, Cloud (Azure/AWS) e IA empresarial.',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map(post => ({
        title:       post.data.title,
        pubDate:     post.data.pubDate,
        description: post.data.description,
        link:        `/blog/${post.slug}/`,
      })),
    customData: '<language>es-mx</language>',
  });
}
