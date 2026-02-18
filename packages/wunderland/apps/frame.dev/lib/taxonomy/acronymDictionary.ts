/**
 * Comprehensive Tech Acronym Dictionary
 * @module lib/taxonomy/acronymDictionary
 *
 * Maps acronyms to their full forms for taxonomy deduplication.
 * Covers: AI/ML, Web Development, DevOps, Security, Databases,
 * Programming Languages, Cloud Services, and more.
 *
 * Usage:
 * - ACRONYM_DICTIONARY['ai'] → ['artificial-intelligence']
 * - EXPANSION_TO_ACRONYM.get('artificial-intelligence') → 'ai'
 */

// ============================================================================
// ACRONYM → EXPANSION(S) DICTIONARY
// ============================================================================

export const ACRONYM_DICTIONARY: Record<string, string[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AI / MACHINE LEARNING
  // ═══════════════════════════════════════════════════════════════════════════
  'ai': ['artificial-intelligence'],
  'ml': ['machine-learning'],
  'dl': ['deep-learning'],
  'nlp': ['natural-language-processing'],
  'nlg': ['natural-language-generation'],
  'nlu': ['natural-language-understanding'],
  'cv': ['computer-vision'],
  'nn': ['neural-network', 'neural-networks'],
  'ann': ['artificial-neural-network'],
  'cnn': ['convolutional-neural-network'],
  'rnn': ['recurrent-neural-network'],
  'lstm': ['long-short-term-memory'],
  'gru': ['gated-recurrent-unit'],
  'gan': ['generative-adversarial-network'],
  'vae': ['variational-autoencoder'],
  'llm': ['large-language-model'],
  'gpt': ['generative-pre-trained-transformer'],
  'bert': ['bidirectional-encoder-representations-transformers'],
  'rag': ['retrieval-augmented-generation'],
  'rlhf': ['reinforcement-learning-human-feedback'],
  'sft': ['supervised-fine-tuning'],
  'ppo': ['proximal-policy-optimization'],
  'dpo': ['direct-preference-optimization'],
  'mlops': ['machine-learning-operations'],
  'aiops': ['artificial-intelligence-operations'],
  'automl': ['automated-machine-learning'],
  'asr': ['automatic-speech-recognition'],
  'tts': ['text-to-speech'],
  'ocr': ['optical-character-recognition'],
  'ner': ['named-entity-recognition'],
  'pos': ['part-of-speech'],
  'rl': ['reinforcement-learning'],
  'sl': ['supervised-learning'],
  'usl': ['unsupervised-learning'],
  'xai': ['explainable-ai', 'explainable-artificial-intelligence'],

  // ═══════════════════════════════════════════════════════════════════════════
  // WEB DEVELOPMENT / APIs
  // ═══════════════════════════════════════════════════════════════════════════
  'api': ['application-programming-interface'],
  'rest': ['representational-state-transfer'],
  'restful': ['representational-state-transfer'],
  'graphql': ['graph-query-language'],
  'grpc': ['google-remote-procedure-call'],
  'rpc': ['remote-procedure-call'],
  'sdk': ['software-development-kit'],
  'cli': ['command-line-interface'],
  'gui': ['graphical-user-interface'],
  'ui': ['user-interface'],
  'ux': ['user-experience'],
  'dx': ['developer-experience'],
  'spa': ['single-page-application'],
  'mpa': ['multi-page-application'],
  'pwa': ['progressive-web-app'],
  'ssr': ['server-side-rendering'],
  'ssg': ['static-site-generation'],
  'csr': ['client-side-rendering'],
  'isr': ['incremental-static-regeneration'],
  'seo': ['search-engine-optimization'],
  'sem': ['search-engine-marketing'],
  'dom': ['document-object-model'],
  'bom': ['browser-object-model'],
  'svg': ['scalable-vector-graphics'],
  'webgl': ['web-graphics-library'],
  'wasm': ['webassembly'],
  'cors': ['cross-origin-resource-sharing'],
  'ajax': ['asynchronous-javascript-and-xml'],
  'xhr': ['xmlhttprequest'],
  'url': ['uniform-resource-locator'],
  'uri': ['uniform-resource-identifier'],
  'urn': ['uniform-resource-name'],
  'cms': ['content-management-system'],
  'lms': ['learning-management-system'],
  'crm': ['customer-relationship-management'],
  'erp': ['enterprise-resource-planning'],
  'saas': ['software-as-a-service'],
  'paas': ['platform-as-a-service'],
  'iaas': ['infrastructure-as-a-service'],
  'baas': ['backend-as-a-service'],
  'faas': ['function-as-a-service'],
  'daas': ['data-as-a-service'],

  // ═══════════════════════════════════════════════════════════════════════════
  // REACT / FRONTEND FRAMEWORKS
  // ═══════════════════════════════════════════════════════════════════════════
  'jsx': ['javascript-xml'],
  'tsx': ['typescript-xml'],
  'hoc': ['higher-order-component'],
  'hof': ['higher-order-function'],
  'rsc': ['react-server-components'],
  'vdom': ['virtual-dom'],

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASES
  // ═══════════════════════════════════════════════════════════════════════════
  'db': ['database'],
  'dbms': ['database-management-system'],
  'rdbms': ['relational-database-management-system'],
  'sql': ['structured-query-language'],
  'nosql': ['not-only-sql'],
  'orm': ['object-relational-mapping'],
  'odm': ['object-document-mapping'],
  'crud': ['create-read-update-delete'],
  'acid': ['atomicity-consistency-isolation-durability'],
  'cap': ['consistency-availability-partition-tolerance'],
  'etl': ['extract-transform-load'],
  'olap': ['online-analytical-processing'],
  'oltp': ['online-transaction-processing'],
  'dw': ['data-warehouse'],
  'dl-data': ['data-lake'],
  'ddl': ['data-definition-language'],
  'dml': ['data-manipulation-language'],
  'dcl': ['data-control-language'],

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRAMMING LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════
  'js': ['javascript'],
  'ts': ['typescript'],
  'py': ['python'],
  'rb': ['ruby'],
  'cpp': ['c-plus-plus', 'cplusplus'],
  'cs': ['c-sharp', 'csharp'],
  'fs': ['f-sharp', 'fsharp'],
  'vb': ['visual-basic'],
  'asm': ['assembly'],

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKUP / DATA FORMATS
  // ═══════════════════════════════════════════════════════════════════════════
  'html': ['hypertext-markup-language'],
  'xhtml': ['extensible-hypertext-markup-language'],
  'css': ['cascading-style-sheets'],
  'scss': ['sassy-cascading-style-sheets'],
  'sass': ['syntactically-awesome-style-sheets'],
  'less': ['leaner-style-sheets'],
  'xml': ['extensible-markup-language'],
  'json': ['javascript-object-notation'],
  'yaml': ['yet-another-markup-language', 'yaml-aint-markup-language'],
  'toml': ['toms-obvious-minimal-language'],
  'csv': ['comma-separated-values'],
  'tsv': ['tab-separated-values'],
  'md': ['markdown'],
  'rst': ['restructured-text'],
  'rtf': ['rich-text-format'],
  'pdf': ['portable-document-format'],

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVOPS / CI/CD
  // ═══════════════════════════════════════════════════════════════════════════
  'ci': ['continuous-integration'],
  'cd': ['continuous-deployment', 'continuous-delivery'],
  'cicd': ['continuous-integration-continuous-deployment'],
  'devops': ['development-operations'],
  'devsecops': ['development-security-operations'],
  'gitops': ['git-operations'],
  'sre': ['site-reliability-engineering'],
  'iac': ['infrastructure-as-code'],
  'k8s': ['kubernetes'],
  'eks': ['elastic-kubernetes-service'],
  'aks': ['azure-kubernetes-service'],
  'gke': ['google-kubernetes-engine'],
  'ecs': ['elastic-container-service'],
  'ecr': ['elastic-container-registry'],
  'gcr': ['google-container-registry'],
  'acr': ['azure-container-registry'],

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════
  'aws': ['amazon-web-services'],
  'gcp': ['google-cloud-platform'],
  'ec2': ['elastic-compute-cloud'],
  's3': ['simple-storage-service'],
  'rds': ['relational-database-service'],
  'sqs': ['simple-queue-service'],
  'sns': ['simple-notification-service'],
  'ses': ['simple-email-service'],
  'iam': ['identity-access-management'],
  'vpc': ['virtual-private-cloud'],
  'elb': ['elastic-load-balancer'],
  'alb': ['application-load-balancer'],
  'nlb': ['network-load-balancer'],
  'cdn': ['content-delivery-network'],
  'cf': ['cloudflare', 'cloudfront', 'cloudformation'],
  'lambda': ['aws-lambda'],
  'vm': ['virtual-machine'],
  'vps': ['virtual-private-server'],

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORKING
  // ═══════════════════════════════════════════════════════════════════════════
  'http': ['hypertext-transfer-protocol'],
  'https': ['hypertext-transfer-protocol-secure'],
  'tcp': ['transmission-control-protocol'],
  'udp': ['user-datagram-protocol'],
  'ip': ['internet-protocol'],
  'ftp': ['file-transfer-protocol'],
  'sftp': ['secure-file-transfer-protocol', 'ssh-file-transfer-protocol'],
  'smtp': ['simple-mail-transfer-protocol'],
  'imap': ['internet-message-access-protocol'],
  'pop3': ['post-office-protocol'],
  'dns': ['domain-name-system'],
  'dhcp': ['dynamic-host-configuration-protocol'],
  'nat': ['network-address-translation'],
  'lan': ['local-area-network'],
  'wan': ['wide-area-network'],
  'vpn': ['virtual-private-network'],
  'ssh': ['secure-shell'],
  'ssl': ['secure-sockets-layer'],
  'tls': ['transport-layer-security'],
  'mtls': ['mutual-transport-layer-security'],
  'ws': ['websocket'],
  'wss': ['websocket-secure'],
  'mqtt': ['message-queuing-telemetry-transport'],
  'amqp': ['advanced-message-queuing-protocol'],

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY / AUTH
  // ═══════════════════════════════════════════════════════════════════════════
  'oauth': ['open-authorization'],
  'oidc': ['openid-connect'],
  'jwt': ['json-web-token'],
  'jws': ['json-web-signature'],
  'jwe': ['json-web-encryption'],
  'jwk': ['json-web-key'],
  'sso': ['single-sign-on'],
  'mfa': ['multi-factor-authentication'],
  '2fa': ['two-factor-authentication'],
  'otp': ['one-time-password'],
  'totp': ['time-based-one-time-password'],
  'hotp': ['hmac-based-one-time-password'],
  'rbac': ['role-based-access-control'],
  'abac': ['attribute-based-access-control'],
  'acl': ['access-control-list'],
  'xss': ['cross-site-scripting'],
  'csrf': ['cross-site-request-forgery'],
  'sqli': ['sql-injection'],
  'mitm': ['man-in-the-middle'],
  'dos': ['denial-of-service'],
  'ddos': ['distributed-denial-of-service'],
  'pii': ['personally-identifiable-information'],
  'phi': ['protected-health-information'],
  'gdpr': ['general-data-protection-regulation'],
  'ccpa': ['california-consumer-privacy-act'],
  'soc2': ['service-organization-control-2'],
  'pci': ['payment-card-industry'],
  'hipaa': ['health-insurance-portability-accountability-act'],
  'kms': ['key-management-service'],
  'hsm': ['hardware-security-module'],
  'pki': ['public-key-infrastructure'],
  'ca': ['certificate-authority'],

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPMENT PRACTICES
  // ═══════════════════════════════════════════════════════════════════════════
  'oop': ['object-oriented-programming'],
  'fp': ['functional-programming'],
  'aop': ['aspect-oriented-programming'],
  'tdd': ['test-driven-development'],
  'bdd': ['behavior-driven-development'],
  'ddd': ['domain-driven-design'],
  'dry': ['dont-repeat-yourself'],
  'kiss': ['keep-it-simple-stupid'],
  'yagni': ['you-aint-gonna-need-it'],
  'solid': ['single-responsibility-open-closed-liskov-interface-dependency'],
  'srp': ['single-responsibility-principle'],
  'ocp': ['open-closed-principle'],
  'lsp': ['liskov-substitution-principle'],
  'isp': ['interface-segregation-principle'],
  'dip': ['dependency-inversion-principle'],
  'mvc': ['model-view-controller'],
  'mvvm': ['model-view-viewmodel'],
  'mvp': ['model-view-presenter', 'minimum-viable-product'],
  'cqrs': ['command-query-responsibility-segregation'],
  'es': ['event-sourcing'],
  'di': ['dependency-injection'],
  'ioc': ['inversion-of-control'],
  'poc': ['proof-of-concept'],
  'wip': ['work-in-progress'],
  'pr': ['pull-request'],
  'mr': ['merge-request'],
  'cr': ['code-review'],
  'qa': ['quality-assurance'],
  'uat': ['user-acceptance-testing'],
  'e2e': ['end-to-end'],

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  'vcs': ['version-control-system'],
  'scm': ['source-control-management', 'software-configuration-management'],
  'svn': ['subversion'],

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER TECH CONCEPTS
  // ═══════════════════════════════════════════════════════════════════════════
  'ide': ['integrated-development-environment'],
  'repl': ['read-eval-print-loop'],
  'regex': ['regular-expression'],
  'regexp': ['regular-expression'],
  'ascii': ['american-standard-code-information-interchange'],
  'utf': ['unicode-transformation-format'],
  'uuid': ['universally-unique-identifier'],
  'guid': ['globally-unique-identifier'],
  'mime': ['multipurpose-internet-mail-extensions'],
  'base64': ['base-64-encoding'],
  'cpu': ['central-processing-unit'],
  'gpu': ['graphics-processing-unit'],
  'tpu': ['tensor-processing-unit'],
  'npu': ['neural-processing-unit'],
  'ram': ['random-access-memory'],
  'rom': ['read-only-memory'],
  'ssd': ['solid-state-drive'],
  'hdd': ['hard-disk-drive'],
  'io': ['input-output'],
  'os': ['operating-system'],
  'jvm': ['java-virtual-machine'],
  'clr': ['common-language-runtime'],
  'gc': ['garbage-collection', 'garbage-collector'],
  'jit': ['just-in-time'],
  'aot': ['ahead-of-time'],
  'eof': ['end-of-file'],
  'eol': ['end-of-line', 'end-of-life'],
  'ttl': ['time-to-live'],
  'fifo': ['first-in-first-out'],
  'lifo': ['last-in-first-out'],
  'lru': ['least-recently-used'],
  'lfu': ['least-frequently-used'],
  'pub': ['publish'],
  'sub': ['subscribe'],
  'pubsub': ['publish-subscribe'],
}

// ============================================================================
// REVERSE MAPPING: EXPANSION → ACRONYM
// ============================================================================

/**
 * Reverse mapping from full expansion to acronym
 * Built automatically from ACRONYM_DICTIONARY
 */
export const EXPANSION_TO_ACRONYM: Map<string, string> = new Map()

// Build reverse mapping
for (const [acronym, expansions] of Object.entries(ACRONYM_DICTIONARY)) {
  for (const expansion of expansions) {
    // Only set if not already mapped (first acronym wins)
    if (!EXPANSION_TO_ACRONYM.has(expansion)) {
      EXPANSION_TO_ACRONYM.set(expansion, acronym)
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all acronyms in the dictionary
 */
export function getAllAcronyms(): string[] {
  return Object.keys(ACRONYM_DICTIONARY)
}

/**
 * Get all expansions in the dictionary
 */
export function getAllExpansions(): string[] {
  return Array.from(EXPANSION_TO_ACRONYM.keys())
}

/**
 * Check if a term is a known acronym
 */
export function isKnownAcronym(term: string): boolean {
  return term.toLowerCase() in ACRONYM_DICTIONARY
}

/**
 * Check if a term is a known expansion
 */
export function isKnownExpansion(term: string): boolean {
  const normalized = term.toLowerCase().replace(/\s+/g, '-')
  return EXPANSION_TO_ACRONYM.has(normalized)
}

/**
 * Get expansions for an acronym
 */
export function getExpansions(acronym: string): string[] {
  return ACRONYM_DICTIONARY[acronym.toLowerCase()] || []
}

/**
 * Get acronym for an expansion
 */
export function getAcronym(expansion: string): string | undefined {
  const normalized = expansion.toLowerCase().replace(/\s+/g, '-')
  return EXPANSION_TO_ACRONYM.get(normalized)
}

/**
 * Get acronym count by category (approximate)
 */
export function getAcronymStats(): {
  total: number
  categories: Record<string, number>
} {
  // Categorize based on common patterns (simplified)
  const categories: Record<string, number> = {
    'ai-ml': 0,
    'web': 0,
    'devops': 0,
    'security': 0,
    'database': 0,
    'networking': 0,
    'other': 0,
  }

  const aiPatterns = ['ai', 'ml', 'nn', 'deep', 'neural', 'learning', 'nlp', 'llm', 'gpt']
  const webPatterns = ['web', 'http', 'api', 'rest', 'ui', 'ux', 'html', 'css', 'js', 'react', 'spa', 'pwa']
  const devopsPatterns = ['ci', 'cd', 'deploy', 'container', 'kubernetes', 'docker', 'aws', 'cloud']
  const securityPatterns = ['auth', 'oauth', 'jwt', 'ssl', 'tls', 'xss', 'csrf', 'encrypt', 'security']
  const dbPatterns = ['db', 'sql', 'database', 'orm', 'crud', 'acid']
  const networkPatterns = ['tcp', 'udp', 'http', 'ftp', 'dns', 'ip', 'network', 'protocol']

  for (const [acronym, expansions] of Object.entries(ACRONYM_DICTIONARY)) {
    const allText = [acronym, ...expansions].join(' ').toLowerCase()

    if (aiPatterns.some(p => allText.includes(p))) {
      categories['ai-ml']++
    } else if (webPatterns.some(p => allText.includes(p))) {
      categories['web']++
    } else if (devopsPatterns.some(p => allText.includes(p))) {
      categories['devops']++
    } else if (securityPatterns.some(p => allText.includes(p))) {
      categories['security']++
    } else if (dbPatterns.some(p => allText.includes(p))) {
      categories['database']++
    } else if (networkPatterns.some(p => allText.includes(p))) {
      categories['networking']++
    } else {
      categories['other']++
    }
  }

  return {
    total: Object.keys(ACRONYM_DICTIONARY).length,
    categories,
  }
}

// ============================================================================
// DYNAMIC ACRONYM LEARNING
// ============================================================================

/**
 * Runtime-learned acronyms (not persisted)
 * Map from acronym → expansions (same format as ACRONYM_DICTIONARY)
 */
const learnedAcronyms = new Map<string, string[]>()

/**
 * Pattern to detect acronym definitions in text
 * Matches: "Natural Language Processing (NLP)", "API (Application Programming Interface)"
 */
const ACRONYM_DEFINITION_PATTERNS = [
  // Full form followed by acronym in parens: "Natural Language Processing (NLP)"
  /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s+\(([A-Z]{2,6})\)/g,
  // Acronym followed by full form in parens: "NLP (Natural Language Processing)"
  /\b([A-Z]{2,6})\s+\(([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\)/g,
  // Acronym followed by "stands for": "API stands for Application Programming Interface"
  /\b([A-Z]{2,6})\s+(?:stands for|means)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)/gi,
]

/**
 * Learn acronyms from text content
 * Detects patterns like "Natural Language Processing (NLP)" or "NLP (Natural Language Processing)"
 *
 * @param content - Text content to scan for acronym definitions
 * @returns Array of newly learned acronyms { acronym, expansion }
 */
export function learnAcronymsFromText(content: string): Array<{ acronym: string; expansion: string }> {
  const learned: Array<{ acronym: string; expansion: string }> = []

  // Pattern 1: "Full Form (ACRONYM)"
  const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)+)\s+\(([A-Z]{2,6})\)/g
  let match

  while ((match = pattern1.exec(content)) !== null) {
    const expansion = match[1].trim()
    const acronym = match[2].toLowerCase()

    // Validate: acronym letters should match first letters of expansion words
    const words = expansion.split(/\s+/)
    const expectedAcronym = words.map(w => w[0].toUpperCase()).join('')

    if (expectedAcronym === match[2]) {
      const normalizedExpansion = expansion.toLowerCase().replace(/\s+/g, '-')

      // Only learn if not already known
      if (!isKnownAcronym(acronym) && !learnedAcronyms.has(acronym)) {
        learnedAcronyms.set(acronym, [normalizedExpansion])
        learned.push({ acronym, expansion: normalizedExpansion })
      }
    }
  }

  // Pattern 2: "ACRONYM (Full Form)"
  const pattern2 = /\b([A-Z]{2,6})\s+\(([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)+)\)/g

  while ((match = pattern2.exec(content)) !== null) {
    const acronym = match[1].toLowerCase()
    const expansion = match[2].trim()
    const normalizedExpansion = expansion.toLowerCase().replace(/\s+/g, '-')

    // Validate acronym matches expansion initials
    const words = expansion.split(/\s+/)
    const expectedAcronym = words.map(w => w[0].toUpperCase()).join('')

    if (expectedAcronym === match[1]) {
      if (!isKnownAcronym(acronym) && !learnedAcronyms.has(acronym)) {
        learnedAcronyms.set(acronym, [normalizedExpansion])
        learned.push({ acronym, expansion: normalizedExpansion })
      }
    }
  }

  return learned
}

/**
 * Get expansion for an acronym, including learned ones
 */
export function getExpansionsWithLearned(acronym: string): string[] {
  const lower = acronym.toLowerCase()

  // Check static dictionary first
  const staticExpansions = ACRONYM_DICTIONARY[lower]
  if (staticExpansions) return staticExpansions

  // Check learned acronyms
  return learnedAcronyms.get(lower) || []
}

/**
 * Check if an acronym is known (static or learned)
 */
export function isKnownAcronymWithLearned(term: string): boolean {
  const lower = term.toLowerCase()
  return lower in ACRONYM_DICTIONARY || learnedAcronyms.has(lower)
}

/**
 * Get all learned acronyms (for debugging/display)
 */
export function getLearnedAcronyms(): Array<{ acronym: string; expansions: string[] }> {
  return Array.from(learnedAcronyms.entries()).map(([acronym, expansions]) => ({
    acronym,
    expansions,
  }))
}

/**
 * Clear all learned acronyms
 */
export function clearLearnedAcronyms(): void {
  learnedAcronyms.clear()
}

/**
 * Manually add a learned acronym
 */
export function addLearnedAcronym(acronym: string, expansion: string): void {
  const lower = acronym.toLowerCase()
  const normalizedExpansion = expansion.toLowerCase().replace(/\s+/g, '-')

  const existing = learnedAcronyms.get(lower) || []
  if (!existing.includes(normalizedExpansion)) {
    learnedAcronyms.set(lower, [...existing, normalizedExpansion])
  }
}

/**
 * Get count of learned acronyms
 */
export function getLearnedAcronymCount(): number {
  return learnedAcronyms.size
}

export default ACRONYM_DICTIONARY
