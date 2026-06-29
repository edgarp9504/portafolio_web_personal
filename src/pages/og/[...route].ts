import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';
import { SITE } from '../../config/site';

// Una OG por post de blog + una "home" por defecto para el resto del sitio.
const posts = await getCollection('blog');

const pages: Record<string, { title: string; description: string }> = {
  home: {
    title: `${SITE.name} · ${SITE.role}`,
    description:
      'Pipelines de datos, Azure, AWS, IA empresarial y automatización. Cancún, México.',
  },
};

for (const post of posts) {
  pages[post.slug] = {
    title: post.data.title,
    description: post.data.description,
  };
}

export const { getStaticPaths, GET } = OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [8, 11, 20],
      [15, 21, 38],
    ],
    border: { color: [45, 212, 191], width: 12, side: 'inline-start' },
    padding: 72,
    font: {
      title: {
        color: [241, 245, 249],
        size: 64,
        weight: 'Bold',
        lineHeight: 1.15,
        families: ['Space Grotesk'],
      },
      description: {
        color: [148, 163, 184],
        size: 30,
        lineHeight: 1.4,
        families: ['Inter'],
      },
    },
    // Fuentes de marca servidas como TTF por la API de Fontsource (build-time).
    fonts: [
      'https://api.fontsource.org/v1/fonts/space-grotesk/latin-700-normal.ttf',
      'https://api.fontsource.org/v1/fonts/inter/latin-400-normal.ttf',
    ],
  }),
});
