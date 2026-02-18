# Codex Template

Starter repository for launching your own analog knowledge OS with **@framers/codex-viewer**. This mirrors the exact weave → loom → strand structure that powers [frame.dev/codex](https://frame.dev/codex).

## Quick start

```bash
git clone https://github.com/framersai/codex-template
cd codex-template
cp env.example .env.local
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to explore the embedded viewer.

### Docker / Compose

```bash
docker compose up --build
```

The site will be available on `http://localhost:3000`. Override env vars via `docker-compose.yml`.

## Repository layout

```
codex-template
├─ app/                     # Next.js App Router entry
│  ├─ (marketing)/page.tsx  # Hero, instructions, embedded viewer
│  ├─ codex/[...slug]/      # Static strand renderer (SSR + ISR)
│  └─ api/                  # OG generator + ISR webhook
├─ components/
│  └─ EmbeddedCodex.tsx     # Client component that renders <CodexViewer />
├─ weaves/                  # Your knowledge fabric (OpenStrand docs mirrored here)
│  └─ openstrand/
├─ codex.config.json        # Optional global metadata + links
├─ env.example              # Copy to .env.local and tweak owner/repo/branch
└─ package.json             # Next.js + @framers/codex-viewer dependency
```

### Weave schema overview (4-tier hierarchy)

| Layer  | Description                       | Example in repo                         | Graph Color   |
| ------ | --------------------------------- | --------------------------------------- | ------------- |
| Fabric | Entire knowledge base (`weaves/`) | this repo                               | Zinc/Gray     |
| Weave  | Top-level collection              | `weaves/openstrand`                     | Amber/Gold    |
| Loom   | Folder inside a weave             | `weaves/openstrand/schema`              | Cyan/Blue     |
| Strand | Markdown file                     | `weaves/openstrand/schema/hierarchy.md` | Violet/Purple |

Each `loom.yaml` contains metadata (title, summary, tags). Each strand can include YAML frontmatter; the viewer parses and surfaces it in the metadata panel.

### Built-in visualization

- **Knowledge Graph**: Interactive D3.js visualization at `/codex/graph`
- **Sidebar Graph**: Contextual graph view for navigation
- **Outline/TOC**: Dynamic table of contents with reading metrics
- **NLP Analysis**: Client-side entity extraction and auto-tagging

### OpenStrand content mirrored

Instead of lorem ipsum, this template mirrors the official OpenStrand schema docs:

- `openstrand/overview.md` – explains weave/loom/strand concepts
- `openstrand/schema/**` – hierarchy + metadata reference
- `openstrand/playbooks/**` – indexing/publishing guides

Feel free to keep these strands as living docs or replace them with your own knowledge base once you understand the structure.

## Configuration

Set up environment variables (copy `env.example` → `.env.local`):

| Variable                        | Description                                         | Default                 |
| ------------------------------- | --------------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_CODEX_REPO_OWNER`  | GitHub org or user                                  | `framersai`             |
| `NEXT_PUBLIC_CODEX_REPO_NAME`   | Repository to read (`weaves/` lives here)           | `codex-template`        |
| `NEXT_PUBLIC_CODEX_REPO_BRANCH` | Branch to pull from                                 | `main`                  |
| `NEXT_PUBLIC_SITE_URL`          | Absolute URL for canonical + OG links               | `http://localhost:3000` |
| `REVALIDATE_SECRET`             | Shared secret for `/api/revalidate-codex`           | _(set manually)_        |
| `CODEX_PRERENDER_LIMIT`         | (Optional) # of strands to pre-render at build time | `100`                   |

> Codex content is streamed directly from GitHub’s Content + Trees API. Push your markdown first, then run the template locally or deploy to Vercel/Netlify.

### Static strand pages + SEO

- Each markdown file under `weaves/**` automatically compiles to `/codex/<slug...>` using App Router, SSR, and 1-hour ISR (`revalidate = 3600`).
- `generateMetadata()` reads frontmatter + markdown to output `<title>`, Open Graph/Twitter cards, canonical links, and JSON-LD article metadata.
- The first inline `<img>` (markdown or HTML) becomes the OG background. If no image exists, the generator falls back to `/og/codex-generic.png`.
- `/api/og` (Edge) renders cards with the weave badge, title, summary, and Frame logo. Pass `image`/`summary` via query params (handled automatically by the strand pages).
- `next-sitemap` runs after every `pnpm build`, emitting `/sitemap.xml`, `/robots.txt`, and `/sitemap-codex.xml` entries for every strand.
- Need to refresh a single strand post-publish? Hit `POST /api/revalidate-codex` with `{ "secret": "...", "slug": "openstrand/schema/hierarchy" }`. The endpoint revalidates that page + the sitemap.

Read the full rationale in [`docs/CODEX_SEO_PLAYBOOK.md`](../../docs/CODEX_SEO_PLAYBOOK.md).

## Deployment

1. Push your fork/template repo to GitHub.
2. Connect to Vercel, Netlify, or your host of choice.
3. Set the `NEXT_PUBLIC_CODEX_*`, `NEXT_PUBLIC_SITE_URL`, and `REVALIDATE_SECRET` env vars in your hosting dashboard.
4. Optional: wire a GitHub Action to POST to `/api/revalidate-codex` after every content push (see `.github/workflows/revalidate.yml` for a starting point).
5. Deploy. The `/` route includes the embedded viewer; `/codex/**` serves static HTML for crawlers and deep-links.

## Extending

- Add more weaves/looms/strands by dropping folders + markdown files under `weaves/`.
- Want custom OG art? Replace `/public/og/codex-generic.png` and/or extend `app/api/og/route.ts`.
- Enable analytics exactly like `frame.dev` by embedding the `Analytics` component from the main repo (optional).
- Want mobile/desktop installability? Add a `public/manifest.json` (see `apps/frame.dev/public/manifest.json` for reference).

## Where to learn more

- Documentation + schema guide: **[frame.dev/codex](https://frame.dev/codex)**
- Component API reference: [`packages/codex-viewer/README.md`](../../packages/codex-viewer/README.md)
- NPM: [@framers/codex-viewer](https://www.npmjs.com/package/@framers/codex-viewer)
- Starter issues & roadmap: [GitHub Issues](https://github.com/framersai/codex-template/issues)
- Questions: [team@frame.dev](mailto:team@frame.dev)

## License

MIT © Frame.dev — feel free to fork, remix, and deploy.
