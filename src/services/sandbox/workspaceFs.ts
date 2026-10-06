/**
 * AI HEAVEN - Workspace Virtual Filesystem Provider
 * Enforces strict tenant/workspace isolation, path traversal prevention,
 * and agent filesystem scope rules ('workspace_only' | 'read_only' | 'none').
 */

import { FsFileContent, FsNodeMetadata, IWorkspaceFilesystemProvider } from '../../types/execution';

interface VirtualFileRecord {
  content: string;
  size_bytes: number;
  updated_at: string;
}

export class WorkspaceVirtualFilesystem implements IWorkspaceFilesystemProvider {
  // Tenant-isolated in-memory filesystem store: workspace_id -> (normalized_path -> file_record)
  private storage = new Map<string, Map<string, VirtualFileRecord>>();

  constructor() {
    // Seed with a default workspace structure for demo workspaces
    this.ensureWorkspaceInitialized('ws_default_demo');
  }

  public ensureWorkspaceInitialized(workspaceId: string) {
    if (!this.storage.has(workspaceId)) {
      const store = new Map<string, VirtualFileRecord>();
      const now = new Date().toISOString();
      store.set('README.md', {
        content: '# Workspace\nInitialized in AI Heaven sandboxed environment.',
        size_bytes: 58,
        updated_at: now
      });
      store.set('config/settings.json', {
        content: JSON.stringify({ environment: 'sandboxed', version: '2026.1' }, null, 2),
        size_bytes: 54,
        updated_at: now
      });
      this.storage.set(workspaceId, store);
    }
  }

  /**
   * Validates and sanitizes a relative path within a workspace.
   * Throws Error if path traversal, absolute path, null byte, or escape is detected.
   */
  public sanitizePath(rawPath: string): string {
    if (!rawPath || typeof rawPath !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    // Check for null bytes
    if (rawPath.includes('\0')) {
      throw new Error('Path contains invalid null byte');
    }

    // Normalize slashes
    let normalized = rawPath.replace(/\\/g, '/').trim();

    // Disallow absolute paths (POSIX leading slash or Windows drive root)
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
      throw new Error('Absolute path access forbidden; paths must be relative to workspace root');
    }

    // Split segments and verify no traversal
    const segments = normalized.split('/').filter(Boolean);
    const resolved: string[] = [];

    for (const segment of segments) {
      if (segment === '.' || segment === '') {
        continue;
      }
      if (segment === '..') {
        throw new Error('Path traversal forbidden (".." segment detected)');
      }
      // Reject hidden/system dangerous files
      if (segment === '.env' || segment === '.git' || segment === 'proc' || segment === 'etc') {
        // Disallow host/secret mimicry paths
        throw new Error(`Access to restricted system segment forbidden: ${segment}`);
      }
      resolved.push(segment);
    }

    if (resolved.length === 0) {
      throw new Error('Path resolves to empty root');
    }

    return resolved.join('/');
  }

  /**
   * Verifies agent filesystem scope permissions.
   */
  private checkScope(operation: 'read' | 'write' | 'list', agentScope?: string) {
    if (!agentScope) return; // Unrestricted if not invoked by an agent (e.g. human user)

    if (agentScope === 'none') {
      throw new Error('Agent filesystem access denied: agent permissions scope is "none"');
    }

    if (agentScope === 'read_only' && operation === 'write') {
      throw new Error('Agent filesystem modification denied: agent permissions scope is "read_only"');
    }
  }

  private getWorkspaceStore(workspaceId: string): Map<string, VirtualFileRecord> {
    this.ensureWorkspaceInitialized(workspaceId);
    return this.storage.get(workspaceId)!;
  }

  public async createFile(
    workspaceId: string,
    filePath: string,
    content: string,
    agentScope?: string
  ): Promise<FsFileContent> {
    this.checkScope('write', agentScope);
    const cleanPath = this.sanitizePath(filePath);
    const store = this.getWorkspaceStore(workspaceId);

    if (store.has(cleanPath)) {
      throw new Error(`File already exists: ${cleanPath}`);
    }

    const now = new Date().toISOString();
    const sizeBytes = Buffer.byteLength(content, 'utf8');
    const record: VirtualFileRecord = {
      content,
      size_bytes: sizeBytes,
      updated_at: now
    };

    store.set(cleanPath, record);

    return {
      path: cleanPath,
      content,
      size_bytes: sizeBytes,
      updated_at: now
    };
  }

  public async readFile(
    workspaceId: string,
    filePath: string,
    agentScope?: string
  ): Promise<FsFileContent> {
    this.checkScope('read', agentScope);
    const cleanPath = this.sanitizePath(filePath);
    const store = this.getWorkspaceStore(workspaceId);

    const record = store.get(cleanPath);
    if (!record) {
      throw new Error(`File not found: ${cleanPath}`);
    }

    return {
      path: cleanPath,
      content: record.content,
      size_bytes: record.size_bytes,
      updated_at: record.updated_at
    };
  }

  public async writeFile(
    workspaceId: string,
    filePath: string,
    content: string,
    agentScope?: string
  ): Promise<FsFileContent> {
    this.checkScope('write', agentScope);
    const cleanPath = this.sanitizePath(filePath);
    const store = this.getWorkspaceStore(workspaceId);

    const now = new Date().toISOString();
    const sizeBytes = Buffer.byteLength(content, 'utf8');
    const record: VirtualFileRecord = {
      content,
      size_bytes: sizeBytes,
      updated_at: now
    };

    store.set(cleanPath, record);

    return {
      path: cleanPath,
      content,
      size_bytes: sizeBytes,
      updated_at: now
    };
  }

  public async listFiles(
    workspaceId: string,
    directoryPath?: string,
    agentScope?: string
  ): Promise<FsNodeMetadata[]> {
    this.checkScope('list', agentScope);
    const store = this.getWorkspaceStore(workspaceId);

    const prefix = directoryPath ? this.sanitizePath(directoryPath) + '/' : '';
    const results: FsNodeMetadata[] = [];
    const seenDirs = new Set<string>();

    for (const [path, record] of store.entries()) {
      if (prefix && !path.startsWith(prefix)) {
        continue;
      }

      const relative = prefix ? path.slice(prefix.length) : path;
      const parts = relative.split('/');

      if (parts.length === 1) {
        // Direct file
        results.push({
          path,
          name: parts[0],
          type: 'file',
          size_bytes: record.size_bytes,
          updated_at: record.updated_at
        });
      } else {
        // Subdirectory
        const dirName = parts[0];
        const dirPath = prefix ? `${prefix}${dirName}` : dirName;
        if (!seenDirs.has(dirPath)) {
          seenDirs.add(dirPath);
          results.push({
            path: dirPath,
            name: dirName,
            type: 'directory',
            size_bytes: 0,
            updated_at: record.updated_at
          });
        }
      }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async deleteFile(
    workspaceId: string,
    filePath: string,
    agentScope?: string
  ): Promise<boolean> {
    this.checkScope('write', agentScope);
    const cleanPath = this.sanitizePath(filePath);
    const store = this.getWorkspaceStore(workspaceId);

    if (!store.has(cleanPath)) {
      throw new Error(`File not found to delete: ${cleanPath}`);
    }

    store.delete(cleanPath);
    return true;
  }

  public async moveFile(
    workspaceId: string,
    sourcePath: string,
    targetPath: string,
    agentScope?: string
  ): Promise<boolean> {
    this.checkScope('write', agentScope);
    const cleanSrc = this.sanitizePath(sourcePath);
    const cleanTarget = this.sanitizePath(targetPath);
    const store = this.getWorkspaceStore(workspaceId);

    const srcRecord = store.get(cleanSrc);
    if (!srcRecord) {
      throw new Error(`Source file not found: ${cleanSrc}`);
    }

    if (store.has(cleanTarget)) {
      throw new Error(`Target file already exists: ${cleanTarget}`);
    }

    store.delete(cleanSrc);
    store.set(cleanTarget, {
      ...srcRecord,
      updated_at: new Date().toISOString()
    });

    return true;
  }
}

export const workspaceFilesystem = new WorkspaceVirtualFilesystem();
