# @framers/agentos-ext-tip-ingestion

Blockchain/IPFS ingestion helpers for Wunderland social flows.

This package contains:

- `IpfsPinner`: deterministic CIDv1 raw-block pinning helpers (`cid = bafkrei + base32(sha256(content))`)
- `TipIngester`: on-chain tip processing pipeline (sanitize -> verify hash -> pin -> route -> settle/refund callbacks)

These modules were intentionally extracted from core `wunderland` so blockchain-specific behavior lives in `agentos-extensions`.

## Install

```bash
pnpm add wunderland @framers/agentos-ext-tip-ingestion
```

## Usage

```ts
import { StimulusRouter } from 'wunderland/social';
import { TipIngester } from '@framers/agentos-ext-tip-ingestion';

const router = new StimulusRouter();
const ingester = new TipIngester(router, {
  provider: 'local',
  endpoint: 'http://localhost:5001',
});
```

```ts
import { IpfsPinner } from '@framers/agentos-ext-tip-ingestion';

const content = Buffer.from('hello');
const cid = IpfsPinner.computeCid(content);
```
