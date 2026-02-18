// File: frontend/src/components/agents/CodingAgent/CodingAgentExportUtils.ts
/**
 * @file CodingAgentExportUtils.ts
 * @description Comprehensive export utilities for the CodePilot agent.
 * Supports language-specific exports, project scaffolding, development environment files,
 * and various sharing formats for coding sessions and projects.
 * @version 1.0.5 - Corrected syntax error in _generateFileHeader for closingComment.
 */

import JSZip from 'jszip';
import type { CodingSession } from './CodingAgentTypes';

/**
 * @interface ExportFormat
 * @description Available export formats and their configurations
 */
export interface ExportFormat {
  id: string;
  label: string;
  description: string;
  icon: string; // Emoji or path to icon
  category: 'individual' | 'project' | 'sharing' | 'documentation';
  extensions: string[]; // e.g., ['py', 'js'] or ['zip'] for project types
  supportsMultiple: boolean; // If the format can contain multiple sessions/files
  requiresLanguage?: string[]; // If specific to certain languages
}

/**
 * @interface ProjectTemplate
 * @description Project template configuration (conceptual)
 */
export interface ProjectTemplate {
  name: string;
  language: string;
  files: Record<string, string>; // filename: content_template
  dependencies?: Record<string, string>; // package_name: version
  scripts?: Record<string, string>; // script_name: command
  metadata: {
    description: string;
    author?: string;
    license?: string;
    version?: string;
  };
}


/**
 * @interface ExportOptions
 * @description Configuration options for exports
 */
export interface ExportOptions {
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeComments: boolean; // Add generated comments/headers to files
  formatCode: boolean; // (Placeholder for future code formatting)
  createProjectStructure: boolean; // For project exports, create dirs, config files
  includeReadme: boolean; // Generate a README for project exports
  includeDependencies: boolean; // Include dependency files (e.g. requirements.txt, package.json)
  compressionLevel?: number; // For ZIP, 0-9 (0 no compression, 9 max)
  customTemplate?: string; // ID of a custom project template (future use)
}

/**
 * @constant SUPPORTED_EXPORT_FORMATS
 * @description All supported export formats with metadata
 */
export const SUPPORTED_EXPORT_FORMATS: ExportFormat[] = [
  // Individual File Exports
  {
    id: 'source_file',
    label: 'Source Code File(s)',
    description: 'Export as language-specific source file(s) in a ZIP.',
    icon: '📄',
    category: 'individual',
    extensions: ['py', 'js', 'ts', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'md', 'html', 'css', 'json', 'txt'],
    supportsMultiple: true // Can zip multiple individual files
  },
  {
    id: 'notebook',
    label: 'Jupyter Notebook',
    description: 'Export as interactive Jupyter Notebook (.ipynb). Best with Python.',
    icon: '📓',
    category: 'individual',
    extensions: ['ipynb'],
    supportsMultiple: false, // Typically one session per notebook
    requiresLanguage: ['python', 'r', 'julia', 'scala']
  },
  // Project Exports
  {
    id: 'npm_project',
    label: 'NPM Project (JS/TS)',
    description: 'Export as a complete Node.js/JavaScript/TypeScript project structure.',
    icon: '📦',
    category: 'project',
    extensions: ['zip'],
    supportsMultiple: true,
    requiresLanguage: ['javascript', 'typescript']
  },
  {
    id: 'python_package',
    label: 'Python Package',
    description: 'Export as a complete Python package with setup files.',
    icon: '🐍',
    category: 'project',
    extensions: ['zip'],
    supportsMultiple: true,
    requiresLanguage: ['python']
  },
  {
    id: 'docker_project', // Generic Dockerized project
    label: 'Dockerized Project',
    description: 'Project with a basic Dockerfile and source files.',
    icon: '🐳',
    category: 'project',
    extensions: ['zip'],
    supportsMultiple: true
    // No specific language requirement, adapts based on primary language of sessions
  },
  // Sharing Formats
  {
    id: 'github_gist',
    label: 'GitHub Gist (JSON)',
    description: 'Export as a JSON object suitable for creating a GitHub Gist.',
    icon: '🔗',
    category: 'sharing',
    extensions: ['json'],
    supportsMultiple: true
  },
  // Documentation Formats
  {
    id: 'markdown_report',
    label: 'Markdown Report',
    description: 'Export all selected sessions as a single Markdown document.',
    icon: '📝',
    category: 'documentation',
    extensions: ['md'],
    supportsMultiple: true
  },
  {
    id: 'json_backup',
    label: 'JSON Backup',
    description: 'Export complete session data as a JSON backup file.',
    icon: '💾',
    category: 'documentation',
    extensions: ['json'],
    supportsMultiple: true
  },
  {
    id: 'csv_data',
    label: 'CSV Data Summary',
    description: 'Export a summary of sessions in CSV format.',
    icon: '📊',
    category: 'documentation',
    extensions: ['csv'],
    supportsMultiple: true
  }
];

/**
 * @constant LANGUAGE_CONFIGURATIONS
 * @description Language-specific configuration for exports
 */
export const LANGUAGE_CONFIGURATIONS: Record<string, {
  extension: string;
  executable?: boolean;
  shebang?: string;
  commentPrefix: string;
  defaultFilename: string;
  packageManager?: string;
  configFiles?: Record<string, string | ((_sessions: CodingSession[]) => string)>; // filename: content or generator function
  dependencies?: Record<string, string>; // Default dependencies
}> = {
  python: {
    extension: 'py', executable: true, shebang: '#!/usr/bin/env python3', commentPrefix: '#', defaultFilename: 'script',
    packageManager: 'pip',
    configFiles: {
        'requirements.txt': (_sessions: CodingSession[]) => "requests\nnumpy\npandas", // Example, could be dynamic
        'README.md': "Python project generated by CodePilot."
    },
    dependencies: { 'requests': '^2.28.0', 'numpy': '^1.24.0', 'pandas': '^2.0.0' }
  },
  javascript: {
    extension: 'js', executable: true, shebang: '#!/usr/bin/env node', commentPrefix: '//', defaultFilename: 'index',
    packageManager: 'npm',
    configFiles: {
        'package.json': (_sessions: CodingSession[]) => JSON.stringify({
            name: 'codepilot-js-export', version: '1.0.0', main: 'index.js',
            scripts: { start: 'node index.js' }, dependencies: { express: '^4.18.0' }
        }, null, 2),
        '.gitignore': "node_modules/\n*.log"
    },
    dependencies: { 'express': '^4.18.0', 'lodash': '^4.17.0', 'axios': '^1.4.0' }
  },
  typescript: {
    extension: 'ts', commentPrefix: '//', defaultFilename: 'main',
    packageManager: 'npm',
     configFiles: {
        'package.json': (_sessions: CodingSession[]) => JSON.stringify({
            name: 'codepilot-ts-export', version: '1.0.0', main: 'dist/main.js',
            scripts: { build: "tsc", start: "node dist/main.js", dev: "ts-node src/main.ts" },
            devDependencies: { typescript: '^5.0.0', 'ts-node': '^10.9.0', '@types/node': '^20.0.0' }
        }, null, 2),
        'tsconfig.json': JSON.stringify({
            compilerOptions: { target: 'es6', module: 'commonjs', outDir: './dist', rootDir: './src', strict: true, esModuleInterop: true },
            include: ['src/**/*']
        }, null, 2),
        '.gitignore': "node_modules/\ndist/\n*.log"
    },
    dependencies: { 'typescript': '^5.0.0', '@types/node': '^20.0.0' }
  },
  java: {
    extension: 'java', commentPrefix: '//', defaultFilename: 'MainApp',
    configFiles: { 'README.md': "Java project generated by CodePilot."}
  },
  cpp: { extension: 'cpp', commentPrefix: '//', defaultFilename: 'main' },
  c: { extension: 'c', commentPrefix: '//', defaultFilename: 'main' },
  csharp: { extension: 'cs', commentPrefix: '//', defaultFilename: 'Program' },
  go: { extension: 'go', commentPrefix: '//', defaultFilename: 'main' },
  rust: {
    extension: 'rs', commentPrefix: '//', defaultFilename: 'main',
    configFiles: { 'README.md': "Rust project generated by CodePilot. For a full Cargo project, consider using the Dockerized Project export."}
  },
  php: { extension: 'php', executable: true, shebang: '#!/usr/bin/env php', commentPrefix: '//', defaultFilename: 'index' },
  ruby: { extension: 'rb', executable: true, shebang: '#!/usr/bin/env ruby', commentPrefix: '#', defaultFilename: 'main' },
  swift: { extension: 'swift', commentPrefix: '//', defaultFilename: 'main' },
  kotlin: { extension: 'kt', commentPrefix: '//', defaultFilename: 'Main' },
  dart: { extension: 'dart', commentPrefix: '//', defaultFilename: 'main' },
  scala: { extension: 'scala', commentPrefix: '//', defaultFilename: 'Main' },
  html: { extension: 'html', commentPrefix: '<!--', defaultFilename: 'index' },
  css: { extension: 'css', commentPrefix: '/*', defaultFilename: 'styles' },
  markdown: { extension: 'md', commentPrefix: '<!--', defaultFilename: 'document' },
  json: { extension: 'json', commentPrefix: '', defaultFilename: 'data' },
  text: { extension: 'txt', commentPrefix: '#', defaultFilename: 'notes' }
};


/**
 * @class CodingAgentExporter
 * @description Main exporter class with comprehensive functionality
 */
export class CodingAgentExporter {
  private defaultOptions: ExportOptions = {
    includeMetadata: true,
    includeTimestamps: true,
    includeComments: true,
    formatCode: false,
    createProjectStructure: true,
    includeReadme: true,
    includeDependencies: true,
    compressionLevel: 6
  };

  /**
   * @method exportSessions
   * @description Export sessions in specified format
   */
  async exportSessions(
    sessions: CodingSession[],
    formatId: string,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob | null> {
    const mergedOptions: ExportOptions = { ...this.defaultOptions, ...options };
    const formatInfo = SUPPORTED_EXPORT_FORMATS.find(f => f.id === formatId);

    if (!formatInfo) {
      console.error(`Unsupported export format ID: ${formatId}`);
      return null;
    }

    if (!formatInfo.supportsMultiple && sessions.length > 1) {
      console.warn(`Format ${formatId} supports single session, using first of ${sessions.length} sessions.`);
      sessions = [sessions[0]];
    }
    if (sessions.length === 0) {
        console.warn(`No sessions provided for export format ${formatId}.`);
        return null;
    }

    switch (formatId) {
      case 'source_file':
        return this._exportAsSourceFiles(sessions, mergedOptions);
      case 'notebook':
        if (!sessions[0] || (!sessions[0].generatedCode && !sessions[0].explanationMarkdown)) {
            console.warn("Cannot generate notebook from empty session data for format:", formatId);
            return null;
        }
        return this._exportAsNotebook(sessions[0], mergedOptions);
      case 'npm_project':
        return this._exportAsNpmProject(sessions, mergedOptions);
      case 'python_package':
        return this._exportAsPythonPackage(sessions, mergedOptions);
      case 'docker_project':
        return this._exportAsDockerProject(sessions, mergedOptions);
      case 'github_gist':
        return this._exportAsGithubGist(sessions, mergedOptions);
      case 'markdown_report':
        return this._exportAsMarkdownReport(sessions, mergedOptions);
      case 'json_backup':
        return this._exportAsJsonBackup(sessions, mergedOptions);
      case 'csv_data':
        return this._exportAsCsvData(sessions, mergedOptions);
      default:
        console.error(`Export logic for format '${formatId}' not implemented.`);
        return null;
    }
  }

  private _sanitizeFilename(filename: string, defaultName: string = "file"): string {
    const sanitized = filename
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return sanitized || defaultName;
  }

  private _generateFileHeader(session: CodingSession, commentPrefixParam: string, options: ExportOptions): string {
    if (!options.includeComments || !commentPrefixParam) return '';

    const langConfig = LANGUAGE_CONFIGURATIONS[session.language.toLowerCase()];
    const fileExtension = langConfig?.extension || 'txt';
    // Determine closing comment syntax based on prefix
    const closingComment = commentPrefixParam === '' ? '' : (commentPrefixParam === '/*' ? ' */' : '');

    let header = `${commentPrefixParam} File: ${this._sanitizeFilename(session.title)}.${fileExtension}${closingComment}\n`;
    header += `${commentPrefixParam} Generated by CodePilot${closingComment}\n`;
    header += `${commentPrefixParam} Language: ${session.language}${closingComment}\n`;
    if (options.includeTimestamps) {
      header += `${commentPrefixParam} Created: ${new Date(session.createdAt).toLocaleString()}${closingComment}\n`;
    }
    if (options.includeMetadata && session.userInputQuery) {
      header += `${commentPrefixParam} Original Query: ${session.userInputQuery.substring(0, 100).replace(/\n/g, ' ')}...${closingComment}\n`;
    }
    return header + `${commentPrefixParam}${closingComment}\n`;
  }

  private async _exportAsSourceFiles(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    const zip = new JSZip();
    sessions.forEach(session => {
      const langConfig = LANGUAGE_CONFIGURATIONS[session.language.toLowerCase()] || LANGUAGE_CONFIGURATIONS['text'];
      const filename = `${this._sanitizeFilename(session.title, langConfig.defaultFilename)}.${langConfig.extension}`;
      let content = session.generatedCode || session.explanationMarkdown || '';

      if (options.includeComments && session.generatedCode && langConfig.commentPrefix) {
        content = this._generateFileHeader(session, langConfig.commentPrefix, options) + content;
      }
      if (langConfig.executable && langConfig.shebang && session.generatedCode) {
        content = `${langConfig.shebang}\n${content}`;
      }
      zip.file(filename, content);

      if (session.generatedCode && session.explanationMarkdown && options.includeMetadata) {
        const mdFilename = `${this._sanitizeFilename(session.title, langConfig.defaultFilename)}_explanation.md`;
        zip.file(mdFilename, `# Explanation for: ${session.title}\n\n${session.explanationMarkdown}`);
      }
    });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: options.compressionLevel ?? 6 } });
  }

   private async _exportAsNotebook(session: CodingSession, options: ExportOptions): Promise<Blob> {
    const langInfo = LANGUAGE_CONFIGURATIONS[session.language.toLowerCase()];
    const kernelName = session.language.toLowerCase() === 'python' ? 'python3' : session.language.toLowerCase();
    const notebook = {
      cells: [] as any[],
      metadata: {
        kernelspec: { display_name: langInfo?.defaultFilename || session.language, language: session.language.toLowerCase(), name: kernelName },
        language_info: { name: session.language.toLowerCase() }
      },
      nbformat: 4,
      nbformat_minor: 5
    };

    let titleCellSource = `# ${session.title}\n\n`;
    if (options.includeMetadata) {
      titleCellSource += `**Language:** ${session.language}\n`;
      if (options.includeTimestamps) titleCellSource += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
      titleCellSource += `\n**Query:**\n\`\`\`\n${session.userInputQuery}\n\`\`\`\n\n`;
    }
    notebook.cells.push({ cell_type: 'markdown', metadata: {}, source: titleCellSource.split('\n').map(line => line + '\n') });

    if (session.explanationMarkdown) {
      notebook.cells.push({ cell_type: 'markdown', metadata: {}, source: session.explanationMarkdown.split('\n').map(line => line + '\n') });
    }

    if (session.generatedCode) {
      notebook.cells.push({
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: session.generatedCode.split('\n').map(line => line + '\n')
      });
    }

    const content = JSON.stringify(notebook, null, 2);
    return new Blob([content], { type: 'application/vnd.jupyter.notebook+json' });
  }

  private async _createProjectZip(
    sessions: CodingSession[],
    options: ExportOptions,
    projectType: 'npm' | 'python' | 'docker',
    primaryLanguage: string
  ): Promise<Blob> {
    const zip = new JSZip();
    const langConfig = LANGUAGE_CONFIGURATIONS[primaryLanguage.toLowerCase()] || LANGUAGE_CONFIGURATIONS['text'];
    const rootFolderName = this._sanitizeFilename(sessions[0]?.title || `${projectType}_project`, `${projectType}_project`);
    const projectRoot = options.createProjectStructure ? zip.folder(rootFolderName) : zip;

    const srcFolder = options.createProjectStructure ? projectRoot!.folder('src') : projectRoot;
    sessions.forEach(session => {
      if (session.language.toLowerCase() === primaryLanguage || projectType === 'docker') {
        const sessionLangConfig = LANGUAGE_CONFIGURATIONS[session.language.toLowerCase()] || LANGUAGE_CONFIGURATIONS['text'];
        const filename = `${this._sanitizeFilename(session.title, sessionLangConfig.defaultFilename)}.${sessionLangConfig.extension}`;
        let content = session.generatedCode || '';
        if (options.includeComments && session.generatedCode && sessionLangConfig.commentPrefix) {
          content = this._generateFileHeader(session, sessionLangConfig.commentPrefix, options) + content;
        }
        srcFolder!.file(filename, content);
      }
    });

    if (options.createProjectStructure) {
        if(options.includeReadme) {
            projectRoot!.file('README.md', this._generateProjectReadme(sessions, projectType.toUpperCase() + " Project", primaryLanguage));
        }
        if (langConfig.configFiles && options.includeDependencies) {
            for (const [filename, contentOrFn] of Object.entries(langConfig.configFiles)) {
                const content = typeof contentOrFn === 'function' ? contentOrFn(sessions) : contentOrFn;
                projectRoot!.file(filename, content);
            }
        }
        if (projectType === 'docker') {
            projectRoot!.file('Dockerfile', this._generateDockerfile(primaryLanguage, sessions));
            projectRoot!.file('.dockerignore', "node_modules\n*.pyc\n__pycache__/\n.git\n.vscode\ndist/");
        }
    }

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: options.compressionLevel ?? 6 } });
  }

  private async _exportAsNpmProject(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    const primaryLang = this._detectPrimaryLanguage(sessions, ['javascript', 'typescript']) || 'javascript';
    return this._createProjectZip(sessions, options, 'npm', primaryLang);
  }

  private async _exportAsPythonPackage(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
     const primaryLang = this._detectPrimaryLanguage(sessions, ['python']) || 'python';
    return this._createProjectZip(sessions, options, 'python', primaryLang);
  }

  private async _exportAsDockerProject(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    const primaryLang = this._detectPrimaryLanguage(sessions) || 'text';
    return this._createProjectZip(sessions, options, 'docker', primaryLang);
  }

  private _generateDockerfile(language: string, sessions: CodingSession[]): string {
    const mainSessionForFilename = sessions.find(s=>s.language.toLowerCase() === language.toLowerCase()) || sessions[0];
    const langConfig = LANGUAGE_CONFIGURATIONS[language.toLowerCase()];
    const mainFile = this._sanitizeFilename(mainSessionForFilename?.title || langConfig?.defaultFilename || 'app', langConfig?.defaultFilename || 'app') + '.' + (langConfig?.extension || 'txt');

    switch (language.toLowerCase()) {
      case 'python':
        return `FROM python:3.11-slim\nWORKDIR /app\nCOPY src/ /app/\n${LANGUAGE_CONFIGURATIONS.python.configFiles?.['requirements.txt'] ? 'COPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n' : ''}\nCMD ["python", "${mainFile}"]`;
      case 'javascript':
        return `FROM node:20-alpine\nWORKDIR /app\nCOPY src/ /app/src/\n${LANGUAGE_CONFIGURATIONS.javascript.configFiles?.['package.json'] ? 'COPY package*.json ./\nRUN npm install --omit=dev\n' : ''}\nCMD ["node", "src/${mainFile}"]`;
      case 'typescript':
        return `FROM node:20-alpine\nWORKDIR /app\nCOPY src/ /app/src/\nCOPY tsconfig.json ./\nCOPY package*.json ./\nRUN npm install\nRUN npm run build\nCMD ["npm", "start"]`;
      default:
        return `FROM alpine:latest\nWORKDIR /app\nCOPY src/ /app/\n# Replace with command to run your application based on '${mainFile}' or other files`;
    }
  }

   private async _exportAsGithubGist(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    const gistFiles: Record<string, { content: string }> = {};
    sessions.forEach(session => {
      const langConfig = LANGUAGE_CONFIGURATIONS[session.language.toLowerCase()] || LANGUAGE_CONFIGURATIONS['text'];
      const filename = `${this._sanitizeFilename(session.title, langConfig.defaultFilename)}.${langConfig.extension}`;
      let content = session.generatedCode || session.explanationMarkdown || "No content.";

      if (options.includeComments && session.generatedCode && langConfig.commentPrefix) {
        content = this._generateFileHeader(session, langConfig.commentPrefix, options) + content;
      }
      gistFiles[filename] = { content };

      if (options.includeMetadata && session.explanationMarkdown && session.generatedCode) {
        const mdFilename = `${this._sanitizeFilename(session.title, langConfig.defaultFilename)}_explanation.md`;
        gistFiles[mdFilename] = { content: `# Explanation for: ${session.title}\n\n${session.explanationMarkdown}` };
      }
    });

    const gistPayload = {
      description: `CodePilot Export - ${sessions.length} session(s) - ${new Date().toLocaleDateString()}`,
      public: false,
      files: gistFiles,
    };
    return new Blob([JSON.stringify(gistPayload, null, 2)], { type: 'application/json' });
  }

  private async _exportAsMarkdownReport(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    let report = `# CodePilot Sessions Report\n\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    sessions.forEach((session, index) => {
      report += `## Session ${index + 1}: ${session.title}\n\n`;
      if (options.includeMetadata) {
        report += `**Language:** ${session.language}\n`;
        if (options.includeTimestamps) report += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n`;
        if(session.tags && session.tags.length > 0) report += `**Tags:** ${session.tags.join(', ')}\n`;
        report += `\n**Query:**\n\`\`\`\n${session.userInputQuery}\n\`\`\`\n\n`;
      }
      if (session.generatedCode) {
        report += `**Code (${session.language}):**\n\`\`\`${session.language.toLowerCase()}\n${session.generatedCode}\n\`\`\`\n\n`;
      }
      if (session.explanationMarkdown) {
        report += `**Explanation:**\n${session.explanationMarkdown}\n\n`;
      }
      report += '---\n\n';
    });
    return new Blob([report], { type: 'text/markdown;charset=utf-8' });
  }

  private async _exportAsJsonBackup(sessions: CodingSession[], options: ExportOptions): Promise<Blob> {
    const backupData = {
      exportVersion: "1.1",
      exportedAt: new Date().toISOString(),
      optionsUsed: options,
      sessions: sessions,
    };
    return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  }

  private async _exportAsCsvData(sessions: CodingSession[], _options: ExportOptions): Promise<Blob> {
    const headers = ['ID', 'Title', 'Language', 'Created At', 'Updated At', 'Tags', 'Query Length', 'Code Length', 'Explanation Length', 'Is Favorite'];
    const rows = sessions.map(s => [
      s.id,
      `"${s.title.replace(/"/g, '""')}"`,
      s.language,
      s.createdAt,
      s.updatedAt,
      `"${(s.tags || []).join('; ')}"`,
      s.userInputQuery.length,
      s.generatedCode?.length || 0,
      s.explanationMarkdown?.length || 0,
      s.isFavorite ? 'Yes' : 'No'
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  }

  private _detectPrimaryLanguage(sessions: CodingSession[], preferredOrder?: string[]): string | null {
    if (!sessions || sessions.length === 0) return null;
    const langCounts: Record<string, number> = {};
    sessions.forEach(s => {
      if(s.language) {
        const lang = s.language.toLowerCase();
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }
    });

    if (preferredOrder) {
        for (const lang of preferredOrder) {
            if (langCounts[lang.toLowerCase()]) return lang.toLowerCase();
        }
    }

    let primaryLanguage = sessions[0].language?.toLowerCase() || null;
    let maxCount = 0;
    for (const lang in langCounts) {
      if (langCounts[lang] > maxCount) {
        maxCount = langCounts[lang];
        primaryLanguage = lang;
      }
    }
    return primaryLanguage;
  }

  private _generateProjectReadme(sessions: CodingSession[], projectTypeName: string, mainLanguage: string): string {
    const mainLangConfig = LANGUAGE_CONFIGURATIONS[mainLanguage.toLowerCase()];
    let installInstructions = '';
    if (mainLangConfig?.packageManager === 'pip' && mainLangConfig.configFiles?.['requirements.txt']) {
        installInstructions = 'Ensure you have Python 3.8+ and pip installed. Create a virtual environment and run `pip install -r requirements.txt`.';
    } else if (mainLangConfig?.packageManager === 'npm' && mainLangConfig.configFiles?.['package.json']) {
        installInstructions = 'Ensure you have Node.js (LTS) and npm/yarn installed. Run `npm install` or `yarn install`.';
    }

    return `# ${projectTypeName} - Generated by CodePilot

**Main Language:** ${mainLanguage}
**Generated on:** ${new Date().toLocaleString()}

This project contains ${sessions.length} session(s) exported from CodePilot.

## Sessions Overview
${sessions.map(s => `- **${s.title}** (${s.language}) - Query: "${s.userInputQuery.substring(0,50).replace(/\n/g, ' ')}..."`).join('\n')}

## Getting Started
${installInstructions}

Refer to individual files in the \`src/\` directory or the main project file.
`;
  }
}

export function createExporter(): CodingAgentExporter {
  return new CodingAgentExporter();
}

export function getExportFormatsForLanguage(language: string): ExportFormat[] {
  const lowerLang = language.toLowerCase();
  return SUPPORTED_EXPORT_FORMATS.filter(format =>
    !format.requiresLanguage || format.requiresLanguage.includes(lowerLang)
  );
}

export function getLanguageConfig(language: string) {
  return LANGUAGE_CONFIGURATIONS[language.toLowerCase()];
}

export default {
  CodingAgentExporter,
  createExporter,
  getExportFormatsForLanguage,
  getLanguageConfig,
  SUPPORTED_EXPORT_FORMATS,
  LANGUAGE_CONFIGURATIONS
};
