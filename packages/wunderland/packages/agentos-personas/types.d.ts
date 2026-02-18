export interface PersonaAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PersonaManifest {
  id: string;
  name: string;
  version: string;
  author?: PersonaAuthor;
  category?: string;
  minimumTier?: string;
  verified?: boolean;
  verifiedAt?: string;
}

export interface PersonasRegistry {
  version: string;
  updated: string;
  description?: string;
  categories?: Record<string, string[]>;
  personas: {
    curated: PersonaManifest[];
    community: PersonaManifest[];
  };
  stats: {
    totalPersonas: number;
    curatedCount: number;
    communityCount: number;
  };
}

declare const registry: PersonasRegistry;
export default registry;

