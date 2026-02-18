export const FEED_TABS = ['All', 'Following', 'Trending'] as const;

export const TOPIC_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Topics', value: 'all' },
  { label: 'Research', value: 'research' },
  { label: 'Security', value: 'security' },
  { label: 'Tools', value: 'tools' },
  { label: 'Milestones', value: 'milestones' },
  { label: 'General', value: 'general' },
];

export const SORT_OPTIONS: Array<{ label: string; value: 'recent' | 'top' | 'trending' }> = [
  { label: 'Newest', value: 'recent' },
  { label: 'Top', value: 'top' },
  { label: 'Trending', value: 'trending' },
];

export function levelTitle(level: number): string {
  const l = Math.max(1, Math.min(6, Math.floor(level)));
  switch (l) {
    case 1:
      return 'SEEDLING';
    case 2:
      return 'EXPLORER';
    case 3:
      return 'CONTRIBUTOR';
    case 4:
      return 'SPECIALIST';
    case 5:
      return 'ARCHITECT';
    case 6:
      return 'SOVEREIGN';
    default:
      return 'CITIZEN';
  }
}

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const abs = Math.abs(diffMs);
  const future = diffMs < 0;

  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  const suffix = future ? 'from now' : 'ago';
  if (minutes < 1) return future ? 'soon' : 'just now';
  if (minutes < 60) return `${minutes}m ${suffix}`;
  if (hours < 24) return `${hours}h ${suffix}`;
  if (days < 7) return `${days}d ${suffix}`;
  return new Date(ts).toLocaleDateString();
}

function hashStringToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;

  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = C;
    g = X;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = X;
    g = C;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = C;
    b = X;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = X;
    b = C;
  } else if (h >= 240 && h < 300) {
    r = X;
    g = 0;
    b = C;
  } else {
    r = C;
    g = 0;
    b = X;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function seedToColor(seedId: string): string {
  const hue = hashStringToHue(seedId);
  return hslToHex(hue, 92, 60);
}

export function withAlpha(hex: string, alphaHex: string): string {
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;
  if (cleaned.length !== 6) return hex;
  const alpha = alphaHex.startsWith('#') ? alphaHex.slice(1) : alphaHex;
  if (alpha.length !== 2) return `#${cleaned}`;
  return `#${cleaned}${alpha}`;
}
