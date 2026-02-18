// frontend/src/utils/ContentAnalyzer.ts - Advanced Content Analysis and Problem Detection

// Exporting interfaces needed by other modules (e.g., Home.vue)
export interface LeetCodePattern {
  keywords: string[];
  patterns: RegExp[];
  problemTypes: string[];
  dataStructures: string[];
  algorithms: string[];
}

export interface SystemDesignPattern {
  keywords: string[];
  patterns: RegExp[];
  components: string[];
  concepts: string[];
}

export interface ComplexityInfo {
  time?: string;
  space?: string;
  explanation?: string;
  approach?: string;
  optimizations?: string[];
}

export interface CodeBlock {
  type: 'fenced' | 'inline';
  language?: string;
  code: string;
  fullMatch: string;
  lineCount: number;
  hasComments: boolean;
  complexity?: string;
}

export interface DiagramHint {
  type: 'tree' | 'graph' | 'array' | 'system' | 'flowchart';
  description: string;
  mermaidCode?: string;
  priority: number;
}

export interface ContentSuggestion {
  type: 'diagram' | 'complexity' | 'code' | 'explanation' | 'example';
  message: string;
  priority: 'high' | 'medium' | 'low';
  implementation?: string;
}

export interface ProblemMetadata {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  dataStructures?: string[];
  algorithms?: string[];
  patterns?: string[];
}

// Define the union type for content types - Added 'error' type
export type ContentAnalysisType = 'leetcode' | 'systemDesign' | 'concept' | 'tutorial' | 'documentation' | 'general' | 'error';

export interface ContentAnalysis {
  type: ContentAnalysisType;
  subtype?: string;
  confidence: number;
  displayTitle?: string;
  shouldVisualize: boolean;
  shouldGenerateDiagram: boolean;
  shouldCreateSlides: boolean;
  interactiveElements: boolean;
  complexity: ComplexityInfo | null;
  codeBlocks: CodeBlock[];
  estimatedReadTime: number; // in seconds
  wordCount: number;
  problemMetadata?: ProblemMetadata;
  language: string | null;
  keywords: string[];
  entities: string[];
  suggestions: ContentSuggestion[];
  diagramHints: DiagramHint[];
  slideCount: number;
  slideDuration: number; // Default duration per slide in ms
  slideTopics: string[];
}

interface AdvancedPatterns {
  leetcode: LeetCodePattern;
  systemDesign: SystemDesignPattern;
  complexity: {
    time: RegExp[];
    space: RegExp[];
    combined: RegExp[];
  };
  codeBlocks: {
    fenced: RegExp;
    inline: RegExp;
    withComments: RegExp;
  };
  diagrams: {
    mermaid: RegExp;
    plantuml: RegExp;
    ascii: RegExp;
  };
}

// Mode to content type mapping for better analysis
const MODE_TO_CONTENT_TYPE_MAP: Record<string, ContentAnalysisType> = {
  'coding': 'leetcode',
  'system_design': 'systemDesign',
  'meeting': 'documentation',
  'general': 'general'
};

export class ContentAnalyzer {
  private readonly patterns: AdvancedPatterns = {
    leetcode: {
      keywords: [
        'two sum', 'three sum', 'binary search', 'binary tree', 'linked list',
        'dynamic programming', 'dp', 'sliding window', 'two pointers', 'backtracking',
        'divide and conquer', 'greedy', 'graph traversal', 'dfs', 'bfs',
        'trie', 'heap', 'priority queue', 'stack', 'queue', 'hash map', 'hash table',
        'easy problem', 'medium problem', 'hard problem', 'leetcode',
        'coding interview', 'technical interview', 'algorithm problem',
        'brute force', 'naive approach', 'optimal solution', 'efficient solution',
        'recursive', 'iterative', 'memoization', 'tabulation',
        'time complexity', 'space complexity', 'big o', 'o(n)', 'o(1)', 'o(log n)',
        'o(n²)', 'o(2^n)', 'o(n log n)', 'linear', 'logarithmic', 'quadratic', 'exponential'
      ],
      patterns: [
        /(?:problem|question)[:\s]*(.{1,100})/i, 
        /(?:given|input)[:\s]*(.{1,150})/i,
        /(?:return|output|find)[:\s]*(.{1,100})/i, 
        /(?:example|test case)[:\s]*(.{1,200})/i,
        /(?:constraint|limit)[s]?[:\s]*(.{1,100})/i, 
        /(?:follow[- ]?up|extension)[:\s]*(.{1,100})/i,
        /(?:approach|solution|algorithm)[:\s]*(.{1,200})/i, 
        /(?:step \d+|first|second|third|then|next|finally)[:\s]*(.{1,150})/i
      ],
      problemTypes: [
        'array manipulation', 'string processing', 'tree traversal', 'graph algorithms',
        'dynamic programming', 'searching', 'sorting', 'linked list operations',
        'stack/queue problems', 'hash table usage', 'bit manipulation', 'math problems'
      ],
      dataStructures: [
        'array', 'string', 'linked list', 'binary tree', 'binary search tree', 'bst',
        'heap', 'priority queue', 'stack', 'queue', 'hash map', 'hash set', 'hash table',
        'trie', 'graph', 'matrix', 'prefix tree'
      ],
      algorithms: [
        'binary search', 'depth-first search', 'dfs', 'breadth-first search', 'bfs', 'merge sort',
        'quick sort', 'dijkstra', 'union find', 'topological sort', 'kadane algorithm',
        'kmp algorithm', 'sliding window', 'two pointers', 'backtracking'
      ]
    },
    systemDesign: {
      keywords: [
        'load balancer', 'api gateway', 'microservices', 'database', 'cache', 'cdn',
        'message queue', 'pub/sub', 'event streaming', 'service mesh', 'horizontal scaling',
        'vertical scaling', 'sharding', 'replication', 'consistency', 'availability',
        'partition tolerance', 'cap theorem', 'eventual consistency', 'acid properties',
        'base properties', 'event-driven architecture', 'domain-driven design', 'cqrs',
        'event sourcing', 'saga pattern', 'circuit breaker', 'bulkhead pattern', 'rate limiting',
        'kubernetes', 'docker', 'redis', 'elasticsearch', 'kafka', 'rabbitmq',
        'nginx', 'apache', 'mysql', 'postgresql', 'mongodb', 'cassandra', 'design a system',
        'system architecture'
      ],
      patterns: [
        /design\s+(?:a|an|the)?\s*(.{1,50})\s*(?:system|application|service)/i,
        /how\s+(?:would\s+you\s+)?(?:design|build|architect|scale)\s+(.{1,100})/i,
        /(?:scalability|performance|availability)\s+(?:requirements|considerations|challenges)/i,
        /(?:database|storage|caching)\s+(?:design|strategy|approach)/i,
        /(?:api|service|component)\s+(?:design|architecture|structure)/i,
        /(?:traffic|load|users?)\s+(?:handling|management|distribution)/i
      ],
      components: [
        'web servers', 'application servers', 'databases', 'caches', 'load balancers',
        'content delivery networks', 'message brokers', 'search engines', 'monitoring systems'
      ],
      concepts: [
        'high availability', 'fault tolerance', 'disaster recovery', 'data consistency',
        'performance optimization', 'cost optimization', 'security considerations'
      ]
    },
    complexity: {
      time: [ 
        /time\s+complexity(?:\s+is)?[:\s]*O\(([^)]+)\)/gi, 
        /runtime(?:\s+is)?[:\s]*O\(([^)]+)\)/gi, 
        /(?:takes|runs\s+in)[:\s]*O\(([^)]+)\)/gi 
      ],
      space: [ 
        /space\s+complexity(?:\s+is)?[:\s]*O\(([^)]+)\)/gi, 
        /memory\s+usage(?:\s+is)?[:\s]*O\(([^)]+)\)/gi, 
        /(?:uses|requires)[:\s]*O\(([^)]+)\)\s*(?:space|memory)/gi 
      ],
      combined: [ 
        /O\(([^)]+)\)\s*(?:for\s*)?(?:time|space|memory)/gi, 
        /complexity(?:\s+is)?[:\s]*O\(([^)]+)\)/gi 
      ]
    },
    codeBlocks: {
      fenced: /```(?:(\w+)\n)?([\s\S]*?)\n?```/g,
      inline: /`([^`\n]+?)`/g,
      withComments: /(?:\/\/|#|\/\*[\s\S]*?\*\/|).*/g
    },
    diagrams: {
      mermaid: /```mermaid\n([\s\S]*?)\n```/g,
      plantuml: /```plantuml\n([\s\S]*?)\n```/g,
      ascii: /```(?:text|ascii)?\n([\s\S]*?(?:[-+|=]{3,}|[┌┬┐└┴┘├┼┤│─]{2,})[\s\S]*?)\n```/g
    }
  };

  private readonly leetcodeProblemKeywords = new Map<string, Partial<ProblemMetadata>>([
    ['two sum', { 
      difficulty: 'Easy', 
      category: 'Array', 
      approach: 'Hash Map', 
      dataStructures: ['Array', 'Hash Map'], 
      algorithms: ['Hash Table lookup'] 
    }],
    ['reverse linked list', { 
      difficulty: 'Easy', 
      category: 'Linked List', 
      approach: 'Iterative or Recursive', 
      dataStructures: ['Linked List'], 
      algorithms: ['Two Pointers'] 
    }],
    ['binary tree inorder traversal', { 
      difficulty: 'Easy', 
      category: 'Tree', 
      approach: 'Recursion or Iteration with Stack', 
      dataStructures: ['Binary Tree', 'Stack'], 
      algorithms: ['DFS']
    }],
    ['valid parentheses', {
      difficulty: 'Easy',
      category: 'Stack',
      approach: 'Stack matching',
      dataStructures: ['Stack'],
      algorithms: ['Stack operations']
    }],
    ['maximum subarray', {
      difficulty: 'Easy',
      category: 'Dynamic Programming',
      approach: 'Kadane\'s Algorithm',
      dataStructures: ['Array'],
      algorithms: ['Kadane Algorithm']
    }]
  ]);

  public analyzeContent(content: string, mode: string = 'general'): ContentAnalysis {
    const analysis: ContentAnalysis = {
      type: 'general', 
      confidence: 0, 
      shouldVisualize: false, 
      shouldGenerateDiagram: false,
      shouldCreateSlides: false, 
      interactiveElements: false, 
      complexity: null, 
      codeBlocks: [],
      estimatedReadTime: 0, 
      wordCount: 0, 
      language: null, 
      keywords: [], 
      entities: [],
      suggestions: [], 
      diagramHints: [], 
      slideCount: 0, 
      slideDuration: 7000, 
      slideTopics: [],
      displayTitle: 'General Content'
    };

    if (!content || typeof content !== 'string' || content.trim() === "") {
        return analysis;
    }

    analysis.wordCount = this.countWords(content);
    analysis.estimatedReadTime = this.calculateReadTime(content);

    const typeResult = this.determineContentType(content, mode);
    analysis.type = typeResult.type;
    analysis.subtype = typeResult.subtype;
    analysis.confidence = typeResult.confidence;
    analysis.keywords = typeResult.keywords;
    analysis.displayTitle = this.getDisplayTitle(analysis.type, analysis.subtype);

    analysis.codeBlocks = this.extractCodeBlocks(content);
    analysis.language = this.detectLanguage(content, analysis.codeBlocks);
    analysis.complexity = this.extractComplexity(content);

    if (analysis.type === 'leetcode') {
      analysis.problemMetadata = this.analyzeLeetCodeProblem(content, analysis.keywords);
      analysis.interactiveElements = true;
    } else if (analysis.type === 'systemDesign') {
        analysis.interactiveElements = true;
    }

    analysis.diagramHints = this.generateDiagramHints(analysis, content);
    analysis.suggestions = this.generateSuggestions(analysis, content);

    analysis.shouldVisualize = this.shouldVisualize(analysis);
    analysis.shouldGenerateDiagram = this.shouldGenerateDiagram(analysis);
    analysis.shouldCreateSlides = this.shouldCreateSlides(analysis);

    if (analysis.shouldCreateSlides) {
      const slideData = this.planSlides(content, analysis);
      analysis.slideCount = slideData.count;
      analysis.slideDuration = slideData.duration;
      analysis.slideTopics = slideData.topics;
    }

    return analysis;
  }

  private getDisplayTitle(type: ContentAnalysisType, subtype?: string): string {
    if (subtype) {
        return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${subtype.charAt(0).toUpperCase() + subtype.slice(1)}`;
    }
    const titles: Record<ContentAnalysisType, string> = {
        leetcode: "LeetCode Problem",
        systemDesign: "System Design Discussion",
        concept: "Conceptual Explanation",
        tutorial: "Tutorial / Guide",
        documentation: "Documentation Snippet",
        general: "General Content",
        error: "Error Occurred"
    };
    return titles[type] || "Content";
  }

  private determineContentType(content: string, mode: string): {
    type: ContentAnalysisType; 
    subtype?: string; 
    confidence: number; 
    keywords: string[];
  } {
    const normalizedContent = content.toLowerCase();
    const scores: Record<ContentAnalysisType, number> = {
        'leetcode': 0, 
        'systemDesign': 0, 
        'concept': 0,
        'tutorial': 0, 
        'documentation': 0, 
        'general': 0,
        'error': 0
    };
    const detectedKeywords: Set<string> = new Set();
    const codeBlockCount = this.extractCodeBlocks(content).length;

    // Enhanced scoring logic with better keyword weighting
    let leetcodeScore = 0;
    this.patterns.leetcode.keywords.forEach(kw => { 
      if (normalizedContent.includes(kw)) { 
        leetcodeScore += this.getKeywordWeight(kw); 
        detectedKeywords.add(kw); 
      } 
    });
    this.patterns.leetcode.patterns.forEach(p => { 
      if (p.test(content)) leetcodeScore += 3; 
    });
    
    // Language-specific code blocks boost
    if (content.match(/```(?:python|java|c\+\+|javascript|swift|kotlin|go|rust|cpp|js|ts)/i)) {
      leetcodeScore += 2;
    }
    
    // Direct mentions boost
    if (normalizedContent.includes("leetcode") || normalizedContent.includes("coding problem")) {
      leetcodeScore += 5;
    }
    
    scores.leetcode = leetcodeScore;

    let systemDesignScore = 0;
    this.patterns.systemDesign.keywords.forEach(kw => { 
      if (normalizedContent.includes(kw)) { 
        systemDesignScore += this.getKeywordWeight(kw); 
        detectedKeywords.add(kw); 
      } 
    });
    this.patterns.systemDesign.patterns.forEach(p => { 
      if (p.test(content)) systemDesignScore += 4; 
    });
    
    // System design specific phrases
    if (normalizedContent.includes("design a") || normalizedContent.includes("system architecture")) {
      systemDesignScore += 5;
    }
    
    scores.systemDesign = systemDesignScore;

    // Tutorial detection
    if (codeBlockCount > 1 && (normalizedContent.includes("how to") || normalizedContent.includes("step-by-step"))) {
        scores.tutorial = (scores.tutorial || 0) + codeBlockCount * 1.5 + 3;
    }
    
    // Documentation detection
    if (codeBlockCount > 0 && (normalizedContent.includes("api documentation") || normalizedContent.includes("reference"))) {
        scores.documentation = (scores.documentation || 0) + codeBlockCount * 1 + 2;
    }
    
    // Concept explanation detection
    if (codeBlockCount <= 1 && (normalizedContent.includes("explain") || normalizedContent.includes("what is") || normalizedContent.includes("concept of"))) {
        scores.concept = (scores.concept || 0) + 3;
    }

    // Apply mode bias for better context awareness
    const modeBias = this.getModeBias(mode);
    (Object.keys(scores) as ContentAnalysisType[]).forEach(type => {
      if (modeBias.has(type)) {
        scores[type] = scores[type] * (modeBias.get(type) ?? 1);
      }
    });

    // Find the winner
    let maxScore = -1;
    let winnerType: ContentAnalysisType = 'general';
    (Object.keys(scores) as ContentAnalysisType[]).forEach(type => {
      if (scores[type] > maxScore) {
        maxScore = scores[type];
        winnerType = type;
      }
    });
    
    if (maxScore <= 0) {
        maxScore = 0;
        winnerType = 'general' as any;
    }

    
    // Determine subtype based on the winning type
    let subtype: string | undefined;
    switch (winnerType) {
        case 'leetcode':
            subtype = this.determineLeetCodeSubtype(content, Array.from(detectedKeywords));
            break;
        case 'systemDesign':
            const systemNameMatch = content.match(this.patterns.systemDesign.patterns[0]);
            if (systemNameMatch && systemNameMatch[1]) {
                subtype = systemNameMatch[1].trim();
            }
            break;
        // Other types don't need subtypes for now
    }

    // Low confidence override - if score is too low, fall back to simpler classification
    if (maxScore < 3) {
      winnerType = codeBlockCount > 0 ? 'tutorial' : 'concept';
      // Clear subtype since we're overriding the type
      subtype = undefined;
    }

    // Calculate confidence based on score and mode alignment
    const modeExpectedType = MODE_TO_CONTENT_TYPE_MAP[mode];
    const modeAlignment = modeExpectedType && modeExpectedType === winnerType ? 1.2 : 1.0;
    const confidence = Math.min((maxScore * modeAlignment) / 25, 1.0);

    return {
      type: winnerType,
      subtype,
      confidence,
      keywords: Array.from(detectedKeywords).slice(0, 10)
    };
  }

  private analyzeLeetCodeProblem(content: string, keywords: string[]): ProblemMetadata {
    const metadata: ProblemMetadata = {};
    const normalizedContent = content.toLowerCase();

    // Check against known problems first
    for (const [problemName, knownMeta] of this.leetcodeProblemKeywords) {
        if (normalizedContent.includes(problemName)) {
            return { 
              ...metadata, 
              ...knownMeta, 
              category: knownMeta.category || problemName.replace(/\b\w/g, l => l.toUpperCase())
            };
        }
    }
    
    // Extract difficulty
    const difficultyMatch = content.match(/\b(easy|medium|hard)(?:\s+(?:problem|question|level))?\b/i);
    if (difficultyMatch) {
      const diffStr = difficultyMatch[1].charAt(0).toUpperCase() + difficultyMatch[1].slice(1).toLowerCase();
      metadata.difficulty = diffStr as ProblemMetadata['difficulty'];
    }
    
    // Extract data structures and algorithms from keywords and content
    metadata.dataStructures = this.patterns.leetcode.dataStructures.filter(ds => 
      keywords.some(kw => kw.includes(ds.toLowerCase())) || 
      normalizedContent.includes(ds.toLowerCase())
    );
    
    metadata.algorithms = this.patterns.leetcode.algorithms.filter(algo => 
      keywords.some(kw => kw.includes(algo.toLowerCase())) || 
      normalizedContent.includes(algo.toLowerCase())
    );
    
    // Extract approach
    const approachKeywords = [
      'brute force', 'optimal', 'recursive', 'iterative', 'dp', 'greedy', 
      'dynamic programming', 'divide and conquer', 'sliding window', 'two pointers'
    ];
    for (const approach of approachKeywords) { 
      if (normalizedContent.includes(approach)) { 
        metadata.approach = approach; 
        break; 
      } 
    }
    
    // Extract complexity information
    const complexityInfo = this.extractComplexity(content);
    if (complexityInfo) { 
      metadata.timeComplexity = complexityInfo.time; 
      metadata.spaceComplexity = complexityInfo.space; 
    }
    
    // Set category if not already set
    if (!metadata.category) {
        if (metadata.dataStructures && metadata.dataStructures.length > 0) {
          metadata.category = metadata.dataStructures[0].replace(/\b\w/g, l => l.toUpperCase());
        } else if (metadata.algorithms && metadata.algorithms.length > 0) {
          metadata.category = metadata.algorithms[0].replace(/\b\w/g, l => l.toUpperCase());
        }
    }
    
    return metadata;
  }

  private extractCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    
    // Extract fenced code blocks
    const fencedMatches = [...content.matchAll(this.patterns.codeBlocks.fenced)];
    fencedMatches.forEach(match => {
      const language = (match[1] || 'plaintext').toLowerCase();
      const code = match[2] || '';
      blocks.push({
        type: 'fenced', 
        language, 
        code, 
        fullMatch: match[0],
        lineCount: code.split('\n').length,
        hasComments: this.patterns.codeBlocks.withComments.test(code),
        complexity: this.estimateCodeComplexity(code)
      });
    });
    
    return blocks;
  }

  private detectLanguage(content: string, codeBlocks: CodeBlock[]): string | null {
    // First, check declared languages in code blocks
    const declaredLanguages = codeBlocks
      .map(block => block.language)
      .filter(lang => lang && lang !== 'unknown' && lang !== 'plaintext');
      
    if (declaredLanguages.length > 0) {
      const langCounts = declaredLanguages.reduce((acc, lang) => {
        acc[lang!] = (acc[lang!] || 0) + 1; 
        return acc;
      }, {} as Record<string, number>);
      return Object.keys(langCounts).sort((a,b) => langCounts[b] - langCounts[a])[0];
    }
    
    // Fallback to content-based detection
    const lowerContent = content.toLowerCase();
    
    // Python detection
    if (/\b(def|import|class)\s/.test(content) && content.includes(':')) return 'python';
    
    // JavaScript/TypeScript detection
    if (/\b(function|const|let|var)\s/.test(content) && (content.includes('{') || content.includes('=>'))) {
      return lowerContent.includes('typescript') || content.includes(': ') ? 'typescript' : 'javascript';
    }
    
    // Java detection
    if (/\b(public\s+(class|static|void)|System\.out\.print)/.test(content)) return 'java';
    
    // C++ detection
    if (/#include|std::/.test(content)) return 'cpp';
    
    return null;
  }

  private generateDiagramHints(analysis: ContentAnalysis, content: string): DiagramHint[] {
    const hints: DiagramHint[] = [];
    const normalizedContent = content.toLowerCase();
    
    // System design diagrams
    if (analysis.type === 'systemDesign' || normalizedContent.includes('architecture') || normalizedContent.includes('component diagram')) {
      hints.push({ 
        type: 'system', 
        description: 'System architecture diagram', 
        priority: 9, 
        mermaidCode: this.generateSystemArchitectureDiagram(analysis.subtype || 'system') 
      });
    }
    
    // Tree/Graph diagrams for data structure problems
    if (analysis.type === 'leetcode' && analysis.problemMetadata?.dataStructures?.some(ds => ['tree', 'graph'].includes(ds.toLowerCase()))) {
        if (analysis.problemMetadata.dataStructures.includes('tree')) {
             hints.push({ 
               type: 'tree', 
               description: 'Tree structure visualization', 
               priority: 8, 
               mermaidCode: this.generateTreeDiagram() 
             });
        } else {
             hints.push({ 
               type: 'graph', 
               description: 'Graph structure visualization', 
               priority: 8, 
               mermaidCode: this.generateGraphDiagram() 
             });
        }
    }
    
    // Flowchart for algorithms
    if (normalizedContent.includes('flowchart') || (normalizedContent.includes('algorithm') && normalizedContent.includes('steps'))) {
        hints.push({ 
          type: 'flowchart', 
          description: 'Algorithm/process flowchart', 
          priority: 7, 
          mermaidCode: this.generateFlowchartDiagram() 
        });
    }
    
    return hints.sort((a, b) => b.priority - a.priority);
  }

  private generateSuggestions(analysis: ContentAnalysis, content: string): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Complexity analysis suggestion
    if (analysis.type === 'leetcode' && !analysis.complexity) {
      suggestions.push({ 
        type: 'complexity', 
        message: 'Add Big O complexity analysis', 
        priority: 'high' 
      });
    }
    
    // Code example suggestion
    if (analysis.type === 'concept' && analysis.codeBlocks.length === 0) {
      suggestions.push({ 
        type: 'code', 
        message: 'Include a code example', 
        priority: 'medium' 
      });
    }
    
    // Diagram suggestion
    if (analysis.shouldGenerateDiagram && analysis.diagramHints.length > 0 && !content.match(this.patterns.diagrams.mermaid)) {
        suggestions.push({ 
          type: 'diagram', 
          message: `Consider adding a ${analysis.diagramHints[0].type} diagram`, 
          priority: 'high', 
          implementation: analysis.diagramHints[0].mermaidCode
        });
    }
    
    // Content length suggestion
    if (analysis.wordCount > 700) {
        suggestions.push({ 
          type: 'explanation', 
          message: 'Summarize key points or break into sections', 
          priority: 'medium' 
        });
    }
    
    return suggestions;
  }

  // Improved diagram generation methods
  private generateTreeDiagram(): string { 
    return `graph TD
    A[Root] --> B[Left Child]
    A --> C[Right Child]
    B --> D[Left Leaf]
    B --> E[Right Leaf]
    C --> F[Left Leaf]
    C --> G[Right Leaf]`; 
  }
  
  private generateGraphDiagram(): string { 
    return `graph LR
    N1[Node 1] --- N2[Node 2]
    N2 --- N3[Node 3]
    N1 --- N3
    N3 --- N4[Node 4]`; 
  }
  
  private generateSystemArchitectureDiagram(systemName: string = 'system'): string { 
    return `graph TB
    User[👤 User] --> WebApp[🌐 Web Application]
    WebApp --> APIGateway[🚪 API Gateway]
    APIGateway --> Service1[📦 ${systemName} Service]
    APIGateway --> Service2[📦 Auth Service]
    Service1 --> Database[(🗄️ Database)]
    Service1 --> Cache[💾 Cache]
    Service2 --> UserDB[(👥 User DB)]`; 
  }
  
  private generateFlowchartDiagram(): string { 
    return `graph TD
    Start([🚀 Start]) --> Input[📥 Input Data]
    Input --> Process{🔄 Process}
    Process -->|Success| Output[📤 Output Result]
    Process -->|Error| ErrorHandle[⚠️ Handle Error]
    ErrorHandle --> End([🏁 End])
    Output --> End`; 
  }

  // Utility methods with better implementations
  private getKeywordWeight(keyword: string): number { 
    const highPriorityKeywords = ['leetcode', 'system design', 'time complexity', 'big o', 'algorithm', 'data structure'];
    return highPriorityKeywords.some(h => keyword.includes(h)) ? 3 : 1; 
  }
  
  private getModeBias(mode: string): Map<ContentAnalysisType, number> { 
    const bias = new Map<ContentAnalysisType, number>(); 
    
    switch (mode) {
      case 'coding':
        bias.set('leetcode', 1.5);
        bias.set('tutorial', 1.2);
        break;
      case 'system_design':
        bias.set('systemDesign', 1.8);
        break;
      case 'meeting':
        bias.set('documentation', 1.3);
        break;
    }
    
    return bias; 
  }
  
  private determineLeetCodeSubtype(content: string, keywords: string[]): string { 
    const normalizedContent = content.toLowerCase();
    
    const ds = this.patterns.leetcode.dataStructures.find(d => 
      keywords.includes(d.toLowerCase()) || normalizedContent.includes(d.toLowerCase())
    );
    
    const algo = this.patterns.leetcode.algorithms.find(a => 
      keywords.includes(a.toLowerCase()) || normalizedContent.includes(a.toLowerCase())
    );
    
    if (ds && algo) return `${ds} + ${algo}`;
    return ds || algo || 'General Problem'; 
  }
  
  private countWords(content: string): number { 
    return content.split(/\s+/).filter(Boolean).length; 
  }
  
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200; 
    const codeLinesPerMinute = 70;
    
    const codeBlockContent = (this.extractCodeBlocks(content) || [])
      .map(b => b.code)
      .join('\n');
    const codeLineCount = codeBlockContent.split('\n').length;
    
    const textContent = content.replace(/```[\s\S]*?```/g, '');
    const textWordCount = this.countWords(textContent);
    
    const timeForText = (textWordCount / wordsPerMinute) * 60;
    const timeForCode = (codeLineCount / codeLinesPerMinute) * 60;
    
    return Math.max(15, Math.round(timeForText + timeForCode));
  }

  private extractComplexity(content: string): ComplexityInfo | null {
    const info: ComplexityInfo = {}; 
    const lowerContent = content.toLowerCase(); 
    let match;
    
    // Extract time complexity
    for (const pattern of this.patterns.complexity.time) { 
      pattern.lastIndex = 0; 
      match = pattern.exec(content); 
      if (match) { 
        info.time = `O(${match[1]})`; 
        break; 
      } 
    }
    
    // Extract space complexity
    for (const pattern of this.patterns.complexity.space) { 
      pattern.lastIndex = 0; 
      match = pattern.exec(content); 
      if (match) { 
        info.space = `O(${match[1]})`; 
        break; 
      } 
    }
    
    // Fallback to combined patterns
    if (!info.time && !info.space) { 
      for (const pattern of this.patterns.complexity.combined) { 
        pattern.lastIndex = 0; 
        match = pattern.exec(content); 
        if (match) { 
          const beforeMatch = lowerContent.substring(0, match.index);
          if (beforeMatch.includes('time')) {
            info.time = `O(${match[1]})`;
          } else if (beforeMatch.includes('space')) {
            info.space = `O(${match[1]})`;
          } else { 
            info.time = `O(${match[1]})`;
          }
          break; 
        } 
      } 
    }
    
    return Object.keys(info).length > 0 ? info : null;
  }

  private estimateCodeComplexity(code: string): string {
    const loopKeywords = /\b(for|while|do)\b/g;
    const recursionPattern = /(\w+)\s*\([^)]*\)\s*{[\s\S]*?\b\1\b\s*\(/;

    let loopCount = (code.match(loopKeywords) || []).length;
    
    // Check for nested loops
    if (loopCount > 1 && code.match(/(\s+(for|while|do)[\s\S]*?\n)+\s+(for|while|do)/)) {
        return 'O(N^2)';
    }

    if (recursionPattern.test(code)) return 'O(2^N) or O(N)';
    if (loopCount >= 2) return 'O(N^2)';
    if (loopCount === 1) return 'O(N)';
    return 'O(1)';
  }

  // Analysis decision methods
  private shouldVisualize(analysis: ContentAnalysis): boolean { 
    return analysis.type === 'leetcode' || 
           analysis.type === 'systemDesign' || 
           (analysis.estimatedReadTime > 120 && analysis.codeBlocks.length > 0) || 
           analysis.diagramHints.length > 0; 
  }
  
  private shouldGenerateDiagram(analysis: ContentAnalysis): boolean { 
    return analysis.diagramHints.length > 0 || 
           analysis.type === 'systemDesign' || 
           (analysis.type === 'leetcode' && 
            analysis.problemMetadata?.dataStructures?.some(ds => 
              ['tree', 'graph', 'linked list'].includes(ds.toLowerCase())
            ) === true); 
  }

  private shouldCreateSlides(analysis: ContentAnalysis): boolean {
    return (analysis.shouldVisualize) &&
           (analysis.wordCount > 300 ||
            analysis.codeBlocks.length > 0 ||
            analysis.type === 'leetcode' ||
            analysis.type === 'systemDesign');
  }

  private planSlides(content: string, analysis: ContentAnalysis): { count: number; duration: number; topics: string[] } {
    const topics: string[] = [];
    
    if (analysis.type === 'leetcode') { 
      topics.push('Problem Statement', 'Approach & Logic'); 
      if (analysis.codeBlocks.length > 0) topics.push('Code Implementation'); 
      if (analysis.complexity) topics.push('Complexity Analysis');
    } else if (analysis.type === 'systemDesign') { 
      topics.push('Requirements & Goals', 'High-Level Architecture', 'Components Deep-Dive', 'Trade-offs & Scalability');
    } else { 
      // Extract headers or create sections based on content
      const headers = content.match(/^#{1,3}\s+(.+)$/gm); 
      if (headers && headers.length > 1) { 
        topics.push(...headers.map(h => h.replace(/^#+\s+/, '').trim()).slice(0,5)); 
      } else { 
        const sections = Math.min(5, Math.max(1, Math.ceil(analysis.wordCount / 200))); 
        for (let i = 1; i <= sections; i++) topics.push(`Key Section ${i}`); 
      } 
    }
    
    if (topics.length === 0) topics.push(analysis.displayTitle || "Overview");
    
    // Calculate appropriate slide duration
    const baseDuration = Math.max(5000, Math.min(15000, 
      Math.round(analysis.estimatedReadTime / Math.max(1, topics.length)) * 1000
    ));
    
    return { 
      count: topics.length, 
      duration: baseDuration, 
      topics 
    };
  }

  public generateEnhancedPrompt(analysis: ContentAnalysis, originalSystemPrompt: string, language: string): string {
    let enhancedPrompt = originalSystemPrompt; 
    const langOrDefault = language || 'python';
    
    enhancedPrompt += `\n\n## Content Analysis Insights (for AI model awareness):
- Detected Content Type: ${analysis.type}
- Detected Subtype/Topic: ${analysis.subtype || 'N/A'}
- Primary Language (if code present): ${analysis.language || 'N/A'}
- Estimated Reading Time: ${Math.ceil(analysis.estimatedReadTime / 60)} minutes
- Keywords: ${analysis.keywords.join(', ')}
- Confidence Score: ${(analysis.confidence * 100).toFixed(1)}%`;

    if (analysis.type === 'leetcode') { 
      enhancedPrompt += `\n- LeetCode Problem Metadata: 
  - Difficulty: ${analysis.problemMetadata?.difficulty || 'N/A'}
  - Data Structures: ${analysis.problemMetadata?.dataStructures?.join(', ') || 'N/A'}
  - Algorithms: ${analysis.problemMetadata?.algorithms?.join(', ') || 'N/A'}`;
      
      enhancedPrompt += `\n\n## Instructions for LeetCode Problem Response:
1. **Problem Understanding:** Briefly re-state the problem and clarify any constraints
2. **Solution Approach:** Clearly explain your main approach and reasoning
3. **Code Implementation:** Provide a complete, correct, and runnable solution in \`\`\`${langOrDefault}
   // Your solution here
   \`\`\`
4. **Complexity Analysis:** Include time and space complexity with explanation
5. **(Optional) Alternative Approaches:** Mention other possible solutions if relevant`;

    } else if (analysis.type === 'systemDesign') { 
      enhancedPrompt += `\n- System Design Keywords: ${analysis.keywords.filter(kw => 
        this.patterns.systemDesign.keywords.includes(kw)).join(', ') || 'N/A'}`;
      
      enhancedPrompt += `\n\n## Instructions for System Design Response:
1. **Requirements Clarification:** Ask clarifying questions if needed
2. **High-Level Design:** Provide overall architecture overview
3. **Component Deep-Dive:** Detail key components and their interactions
4. **Data Storage & Schema:** Discuss database design and data flow
5. **Scalability and Availability:** Address performance and reliability concerns
6. **API Design:** Provide example API endpoints if relevant
7. **Trade-offs:** Discuss pros/cons of design decisions`;

    } else if (analysis.type === 'tutorial') { 
      enhancedPrompt += `\n\n## Instructions for Tutorial Response:
Provide a clear, step-by-step tutorial. Include code examples in \`\`\`${analysis.language || langOrDefault}
// Your code examples here
\`\`\` where appropriate. Make it practical and actionable.`;

    } else if (analysis.type === 'concept') { 
      enhancedPrompt += `\n\n## Instructions for Concept Explanation:
Explain the concept clearly and concisely. Use analogies or examples where helpful. 
If relevant, include simple code examples to illustrate the concept.`;
    }
    
    if (analysis.shouldGenerateDiagram && analysis.diagramHints.length > 0) { 
      const topHint = analysis.diagramHints[0]; 
      enhancedPrompt += `\n\n**Diagram Request:** Please include a ${topHint.type} diagram using Mermaid syntax:
\`\`\`mermaid
${topHint.mermaidCode}
\`\`\`
Feel free to modify or enhance this diagram as appropriate.`; 
    }
    
    if (analysis.shouldCreateSlides) { 
      enhancedPrompt += `\n\n**Presentation Structure:** Please structure your response with clear Markdown headings for sections like:
${analysis.slideTopics.map(topic => `- ## ${topic}`).join('\n')}
This will make the content more scannable and organized.`; 
    }
    
    enhancedPrompt += `\n\nEnsure your response is well-formatted with Markdown, be accurate and helpful, and adapt your tone to match the content type detected.`;
    
    return enhancedPrompt;
  }
}