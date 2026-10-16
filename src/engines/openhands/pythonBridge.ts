/**
 * OpenHands Python Agent Server Bridge
 * Provides typed HTTP/WebSocket communication with an upstream OpenHands agent server
 * if running externally, while allowing zero-failure local fallback.
 */

export interface PythonServerHealth {
  connected: boolean;
  serverUrl: string;
  version?: string;
  latencyMs?: number;
  error?: string;
}

export class OpenHandsPythonBridge {
  private serverUrl: string;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || process.env.OPENHANDS_SERVER_URL || 'http://127.0.0.1:3001';
  }

  public async checkHealth(): Promise<PythonServerHealth> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.serverUrl}/api/health`, {
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeout);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          connected: true,
          serverUrl: this.serverUrl,
          version: data.version || '0.28.0',
          latencyMs: Date.now() - start
        };
      }
      return {
        connected: false,
        serverUrl: this.serverUrl,
        error: 'OpenHands Python Agent Server is offline (Engaging native TypeScript SDK engine)'
      };
    } catch (err: any) {
      return {
        connected: false,
        serverUrl: this.serverUrl,
        error: err.message || 'Connection refused'
      };
    }
  }

  public async forwardTask(task: any): Promise<any | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${this.serverUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}
