import removeMarkdown from 'remove-markdown'

export function sentenceCase(input: string) {
  if (!input) return ''
  const lower = input.replace(/[-_]/g, ' ').toLowerCase()
  return lower.replace(/\b\w/g, (char) => char.toUpperCase()).trim()
}

export function deriveSummary(raw: string, maxLength = 180) {
  const stripped = removeMarkdown(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!stripped) return ''
  if (stripped.length <= maxLength) return stripped
  return `${stripped.slice(0, maxLength - 1).trim()}…`
}

const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/
const HTML_IMAGE_REGEX = /<img[^>]+src=["'](?<url>[^"']+)["'][^>]*>/i

export function findFirstImageUrl(raw: string) {
  if (!raw) return undefined

  const markdownMatch = raw.match(MARKDOWN_IMAGE_REGEX)
  if (markdownMatch?.groups?.url) return markdownMatch.groups.url.trim()

  const htmlMatch = raw.match(HTML_IMAGE_REGEX)
  if (htmlMatch?.groups?.url) return htmlMatch.groups.url.trim()

  return undefined
}


