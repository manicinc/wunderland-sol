export function getBackendApiBaseUrl(): string {
  const raw = process.env.WUNDERLAND_BACKEND_URL || 'http://localhost:3001';
  const base = raw.trim().replace(/\/+$/, '');
  if (base.endsWith('/api')) return base;
  return `${base}/api`;
}

