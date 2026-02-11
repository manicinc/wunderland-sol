/**
 * Random agent name generator for the mint wizard.
 * All generated names fit within 32 UTF-8 bytes (Solana on-chain limit).
 */

const ADJECTIVES = [
  'Arcane', 'Astral', 'Blazing', 'Bright', 'Calm', 'Clever',
  'Cobalt', 'Cosmic', 'Crimson', 'Crystal', 'Cyber', 'Dark',
  'Dawn', 'Deep', 'Drift', 'Dusk', 'Echo', 'Elder',
  'Ember', 'Enigma', 'Faint', 'Feral', 'Flux', 'Forge',
  'Frost', 'Ghost', 'Glass', 'Gold', 'Grey', 'Haze',
  'Hex', 'Hyper', 'Iron', 'Jade', 'Keen', 'Lunar',
  'Mist', 'Neon', 'Night', 'Noble', 'Nova', 'Null',
  'Onyx', 'Pale', 'Phase', 'Pixel', 'Prism', 'Pulse',
  'Quiet', 'Rapid', 'Rogue', 'Rust', 'Sage', 'Sharp',
  'Silent', 'Solar', 'Spark', 'Steel', 'Storm', 'Swift',
  'Tidal', 'True', 'Umbra', 'Vast', 'Void', 'Warp',
  'Wild', 'Zen', 'Zero', 'Zinc',
];

const NOUNS = [
  'Agent', 'Anchor', 'Arc', 'Atlas', 'Axis', 'Beacon',
  'Blade', 'Bolt', 'Cache', 'Cipher', 'Citadel', 'Claw',
  'Coil', 'Core', 'Cortex', 'Crow', 'Daemon', 'Drift',
  'Edge', 'Falcon', 'Fang', 'Flare', 'Fox', 'Gate',
  'Glyph', 'Golem', 'Hawk', 'Helm', 'Herald', 'Hound',
  'Index', 'Jolt', 'Kernel', 'Lance', 'Lens', 'Link',
  'Loom', 'Lynx', 'Mage', 'Matrix', 'Mind', 'Mirror',
  'Moth', 'Nexus', 'Node', 'Opal', 'Oracle', 'Orbit',
  'Owl', 'Pawn', 'Phantom', 'Pilot', 'Proxy', 'Pulse',
  'Raven', 'Reef', 'Relay', 'Root', 'Rover', 'Sage',
  'Scout', 'Seed', 'Shard', 'Shell', 'Sigma', 'Slate',
  'Smith', 'Spark', 'Spine', 'Sprite', 'Strix', 'Surge',
  'Synth', 'Thorn', 'Tide', 'Tower', 'Trace', 'Valve',
  'Vane', 'Vault', 'Viper', 'Vortex', 'Ward', 'Wave',
  'Weave', 'Wolf', 'Wraith', 'Wren', 'Zenith',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random agent name guaranteed to be <= 32 UTF-8 bytes.
 * Format: "{Adjective} {Noun}" (e.g. "Cosmic Falcon", "Neon Wraith")
 */
export function generateRandomAgentName(): string {
  // All words are ASCII, so byte length === string length.
  // Max adjective (6) + space (1) + max noun (7) = 14 bytes, well under 32.
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
