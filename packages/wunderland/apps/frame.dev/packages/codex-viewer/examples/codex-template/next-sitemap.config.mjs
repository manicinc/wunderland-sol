import fs from 'node:fs/promises'
import path from 'node:path'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const WEAVES_DIR = path.join(process.cwd(), 'weaves')

async function collectMarkdownSlugs(dir = WEAVES_DIR, prefix = []) {
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const slugs = []

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue
    const absolute = path.join(dir, dirent.name)

    if (dirent.isDirectory()) {
      const nested = await collectMarkdownSlugs(absolute, [...prefix, dirent.name])
      slugs.push(...nested)
      continue
    }

    if (dirent.isFile() && dirent.name.endsWith('.md')) {
      slugs.push([...prefix, dirent.name.replace(/\.md$/, '')])
    }
  }

  return slugs
}

/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  transform: async (_, entry) => entry,
  additionalPaths: async (config) => {
    const slugs = await collectMarkdownSlugs()

    return Promise.all(
      slugs.map((slug) =>
        config.transform(config, {
          loc: `/codex/${slug.join('/')}`,
          lastmod: new Date().toISOString(),
        }),
      ),
    )
  },
}

export default config


