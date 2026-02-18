import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

// Load root .env as single source of truth for all apps
const rootEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
  for (const line of fs.readFileSync(rootEnvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'discord.js',
    '@discordjs/ws',
    '@discordjs/rest',
    '@discordjs/collection',
    '@discordjs/builders',
    'telegraf',
    'openai',
    'zlib-sync',
    'bufferutil',
    'utf-8-validate',
  ],
};

export default nextConfig;
