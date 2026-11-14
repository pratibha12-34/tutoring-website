# Garvit frontend

## Local development

Install dependencies and start the Vite development server:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_API_BASE` to the backend origin. Do not commit `.env` or credentials.

## Production build and SEO

Set `VITE_SITE_URL` to the public HTTPS origin (for example, `https://garvit.example`) before building. Set `VITE_API_BASE` to the deployed backend origin as well.

```sh
npm run build
```

The build writes `robots.txt` and `sitemap.xml` into `dist`. The sitemap lists the public home, about, contact, course-catalog, and batch-catalog pages. If the configured backend is reachable during the build, it also adds the current course and batch detail URLs. Build output warns when the site URL or catalog API is unavailable, rather than silently claiming the sitemap is complete.

The app updates title, description, canonical, social-preview, and structured-data metadata as public routes render. Search engines that do not execute JavaScript may not see route-specific metadata or course details; server-side rendering or prerendering is a separate deployment improvement.
