# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Portfolio + Blog site for Edgar Pérez — Data Engineer, Cloud Consultant & IA Empresarial.
Built with **Astro 4 (static output)** + Markdown content collections. Deployed on **Vercel** (auto-deploy on push to `main`).

## Commands

```bash
npm run dev      # dev server at http://localhost:4321
npm run build    # production build → dist/
npm run preview  # preview the dist/ build locally
```

## Architecture

```
src/
├── components/       # One .astro file per section
│   ├── Nav.astro
│   ├── Hero.astro
│   ├── About.astro
│   ├── Services.astro
│   ├── AISection.astro   ← IA para Empresas section (purple theme, --accent3)
│   ├── Projects.astro
│   ├── Stack.astro
│   ├── Testimonials.astro
│   ├── CTA.astro
│   ├── Footer.astro
│   └── WAFloat.astro     ← floating WhatsApp button
├── layouts/
│   ├── BaseLayout.astro  ← SEO meta tags, global CSS, schema.org JSON-LD
│   └── BlogLayout.astro  ← blog post chrome (nav, author, source CTA)
├── pages/
│   ├── index.astro         ← home (assembles all components)
│   ├── blog/index.astro    ← blog listing
│   ├── blog/[...slug].astro← blog post (renders from content collection)
│   └── rss.xml.js          ← RSS feed endpoint
├── content/
│   ├── config.ts           ← zod schema: title, description, pubDate, tags, readingTime, featured
│   └── blog/*.md           ← blog posts in Markdown
└── styles/
    └── global.css          ← all shared CSS, design tokens in :root
```

### CSS design system

All tokens are CSS custom properties in `:root` (global.css):
- `--accent` (#00d4ff) — cyan, main brand color
- `--accent2` (#00ff88) — green, impact/success highlights
- `--accent3` (#a855f7) — purple, exclusively for the AI section
- `--bg`, `--bg2`, `--bg3`, `--card`, `--border` — dark background layers

### Adding a blog post

Create `src/content/blog/my-slug.md` with this frontmatter:

```markdown
---
title: "Título del artículo"
description: "Descripción para SEO y listing (1-2 oraciones)"
pubDate: 2025-04-15
tags: ["AWS", "Data Engineering"]
readingTime: 8
featured: false
---
```

### Things to update before going live

1. **Domain** — set `site` in `astro.config.mjs` and `public/robots.txt` with the real domain
2. **LinkedIn/GitHub** — update links in `Footer.astro`
3. **Schema.org** — update `sameAs` URLs in `BaseLayout.astro`

### Deployment (Vercel)

Push to `main` → Vercel builds and deploys automatically.
Build config is in `vercel.json`: uses `chmod +x ./node_modules/.bin/astro` before build to fix Linux permission issue.
