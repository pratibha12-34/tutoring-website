# Garvit frontend

## Local development

Install dependencies and start the Vite development server:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_API_BASE` to the backend origin. Do not commit `.env` or credentials.

## Production build and SEO

Set `VITE_SITE_URL` to the public HTTPS origin before building. `VITE_API_BASE` can point to the deployed backend origin; it defaults to `/api` in production and `http://localhost:5000` in development.

```sh
npm run build
```

The build writes `robots.txt` and `sitemap.xml` into `dist`. The sitemap lists the public home, about, contact, course-catalog, and batch-catalog pages. If the configured backend is reachable during the build, it also adds the current course and batch detail URLs. Build output warns when the site URL or catalog API is unavailable, rather than silently claiming the sitemap is complete.

The app updates title, description, canonical, social-preview, and structured-data metadata as public routes render. Search engines that do not execute JavaScript may not see route-specific metadata or course details; server-side rendering or prerendering is a separate deployment improvement.

## Deploying the full app to Vercel

The repository root is configured as one Vercel project: it builds `frontend` and rewrites `/api/*`, including nested paths, to the shared Express function in `api/dispatch.js`. The rewrite passes the original API path to the function. Keep the Vercel project root set to the repository root. Add production backend values under the project's Environment Variables before relying on database-backed features:

- `MONGODB_URI` and `JWT_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` for private video and note attachments
- `FRONTEND_URL` set to the production site origin
- SMTP and UPI settings only if those features are enabled
- `VITE_API_BASE=/api` for same-origin API calls
- `VITE_SITE_URL` set to the production site origin for canonical metadata and sitemap generation

Never commit these values or put backend secrets in `VITE_*` variables. Redeploy after changing environment variables.
