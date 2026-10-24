/**
 * AI HEAVEN - LazyCodex Hierarchical Codebase Memory & Directory Instructions Service
 * Upstream Reference: code-yeongyu/lazycodex ($init-deep, AGENTS.md, hierarchical memory)
 * 
 * Architecture:
 * 1. Resolves directory-level agent instructions (AGENTS.md, INSTRUCTIONS.md, ARCHITECTURE.md)
 *    recursively up the directory hierarchy from the target file to the workspace root.
 * 2. Merges parent architectural constraints with specialized sub-directory rules.
 * 3. Extracts structural landmarks, forbidden patterns, and local owner droids.
 * 4. Supplies incoming autonomous agents with targeted, low-overhead context before editing.
 */

import fs from 'fs';
import path from 'path';

export interface DirectoryInstructionLevel {
  directoryPath: string;
  sourceFile: string;
  instructions: string;
  rules: string[];
  forbiddenPatterns: string[];
  depth: number;
}

export interface ResolvedHierarchicalContext {
  targetPath: string;
  levels: DirectoryInstructionLevel[];
  mergedInstructions: string;
  allRules: string[];
  forbiddenPatterns: string[];
  suggestedRole: string;
}

export interface DirectoryLandmark {
  path: string;
  name: string;
  role: 'api' | 'services' | 'components' | 'types' | 'tests' | 'database' | 'contracts' | 'other';
  summary: string;
  keyFiles: string[];
  exportedSymbolsCount?: number;
}

const INSTRUCTION_FILE_NAMES = [
  'AGENTS.md',
  'CLAUDE.md',
  'INSTRUCTIONS.md',
  '.codex/AGENTS.md',
  'ARCHITECTURE.md'
];

export class HierarchicalMemoryService {
  private cache: Map<string, { data: ResolvedHierarchicalContext; timestamp: number }> = new Map();
  private cacheTtlMs = 30000;

  /**
   * Resolves hierarchical agent instructions for a given file or directory path.
   * Walks upward from the target directory to the workspace root, merging instructions.
   */
  public resolveInstructionsForPath(
    targetPath: string,
    workspaceRoot: string = process.cwd()
  ): ResolvedHierarchicalContext {
    const cacheKey = `${workspaceRoot}::${targetPath}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const resolvedRoot = path.resolve(workspaceRoot);
    const resolvedTarget = path.resolve(resolvedRoot, targetPath);

    let currentDir = fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory()
      ? resolvedTarget
      : path.dirname(resolvedTarget);

    const levels: DirectoryInstructionLevel[] = [];
    let depth = 0;

    // Traverse directory tree upwards until reaching workspace root
    while (currentDir.startsWith(resolvedRoot) && depth < 10) {
      for (const fileName of INSTRUCTION_FILE_NAMES) {
        const filePath = path.join(currentDir, fileName);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = this.parseInstructionFile(content);
            levels.unshift({
              directoryPath: path.relative(resolvedRoot, currentDir) || '.',
              sourceFile: fileName,
              instructions: content,
              rules: parsed.rules,
              forbiddenPatterns: parsed.forbidden,
              depth
            });
            break; // Stop after first matched instruction file in this directory
          } catch {
            // Ignore unreadable files
          }
        }
      }

      if (currentDir === resolvedRoot) break;
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
      depth++;
    }

    // Default system fallback rules if no AGENTS.md was found
    if (levels.length === 0) {
      levels.push({
        directoryPath: '.',
        sourceFile: 'default_system_invariants',
        instructions: '# Root Workspace Security Invariants\n- Isolated sandbox execution only.\n- Exit code 126 on host escalation attempts.\n- Verified tests and lint checks required before completion.',
        rules: [
          'Isolated sandbox execution only',
          'Exit code 126 on host escalation attempts',
          'Evidence-based verification required before completion'
        ],
        forbiddenPatterns: ['sudo ', 'rm -rf /', '/etc/shadow'],
        depth: 0
      });
    }

    // Combine rules and forbidden patterns
    const allRules: string[] = [];
    const forbiddenPatterns: string[] = [];
    const instructionBlocks: string[] = [];

    for (const lvl of levels) {
      allRules.push(...lvl.rules);
      forbiddenPatterns.push(...lvl.forbiddenPatterns);
      instructionBlocks.push(
        `### Scope: [${lvl.directoryPath}] (via ${lvl.sourceFile})\n${lvl.instructions.trim()}`
      );
    }

    // Heuristic: determine suggested agent role based on path
    let suggestedRole = 'coder';
    const relLower = path.relative(resolvedRoot, resolvedTarget).toLowerCase();
    if (relLower.includes('test') || relLower.includes('audit')) suggestedRole = 'tester';
    else if (relLower.includes('security') || relLower.includes('scanner') || relLower.includes('auth')) suggestedRole = 'security';
    else if (relLower.includes('research') || relLower.includes('docs') || relLower.includes('fable')) suggestedRole = 'researcher';
    else if (relLower.includes('review') || relLower.includes('evolution')) suggestedRole = 'reviewer';

    const result: ResolvedHierarchicalContext = {
      targetPath: path.relative(resolvedRoot, resolvedTarget),
      levels,
      mergedInstructions: instructionBlocks.join('\n\n---\n\n'),
      allRules: Array.from(new Set(allRules)),
      forbiddenPatterns: Array.from(new Set(forbiddenPatterns)),
      suggestedRole
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  /**
   * Generates structural landmarks for a directory (LazyCodex $init-deep landmarking).
   */
  public indexDirectoryLandmarks(targetDir = '.', workspaceRoot = process.cwd()): DirectoryLandmark[] {
    return this.generateDirectoryLandmarks(targetDir, workspaceRoot);
  }

  public generateDirectoryLandmarks(targetDir = '.', workspaceRoot = process.cwd()): DirectoryLandmark[] {
    const resolvedRoot = path.resolve(workspaceRoot);
    const resolvedTarget = path.resolve(resolvedRoot, targetDir);

    if (!fs.existsSync(resolvedTarget)) return [];

    const landmarks: DirectoryLandmark[] = [];

    const scanDirectory = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;

          if (entry.isDirectory()) {
            const subPath = path.join(dir, entry.name);
            const relPath = path.relative(resolvedRoot, subPath);

            let role: DirectoryLandmark['role'] = 'other';
            let summary = 'General project directory';

            if (/api/i.test(entry.name)) {
              role = 'api';
              summary = 'REST API routers, middleware & HTTP controller handlers';
            } else if (/services/i.test(entry.name)) {
              role = 'services';
              summary = 'Core business logic, agent orchestration & service providers';
            } else if (/components/i.test(entry.name)) {
              role = 'components';
              summary = 'React UI presentation components and user workspaces';
            } else if (/types|contracts/i.test(entry.name)) {
              role = 'types';
              summary = 'Type definitions, interfaces & system contracts';
            } else if (/tests/i.test(entry.name)) {
              role = 'tests';
              summary = 'Automated unit, integration, and security verification suites';
            } else if (/db|data/i.test(entry.name)) {
              role = 'database';
              summary = 'Data stores, PostgreSQL persistence & initial seeds';
            }

            let keyFiles: string[] = [];
            try {
              keyFiles = fs.readdirSync(subPath)
                .filter(f => !f.startsWith('.') && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.json')))
                .slice(0, 5);
            } catch {
              // Ignore
            }

            landmarks.push({
              path: relPath,
              name: entry.name,
              role,
              summary,
              keyFiles
            });

            if (entry.name === 'src') {
              scanDirectory(subPath);
            }
          }
        }
      } catch {
        // Ignore unreadable
      }
    };

    scanDirectory(resolvedTarget);
    return landmarks;
  }

  private parseInstructionFile(content: string): { rules: string[]; forbidden: string[] } {
    const rules: string[] = [];
    const forbidden: string[] = [];

    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
        const cleanRule = line.replace(/^[-*\d.]+\s*/, '').trim();
        if (cleanRule.length > 5) {
          rules.push(cleanRule);
          if (/forbid|never|prohibit|do not|block|deny/i.test(cleanRule)) {
            forbidden.push(cleanRule);
          }
        }
      }
    }

    return { rules, forbidden };
  }
}

export const hierarchicalMemoryService = new HierarchicalMemoryService();
