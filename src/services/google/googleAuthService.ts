/**
 * AI HEAVEN - Google Authentication & Identity Service
 * Client-side Google Identity Services (GIS) OAuth 2.0 integration.
 * Secure token management, user profile verification, and session state.
 */

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

export interface GoogleSessionState {
  isConnected: boolean;
  profile: GoogleUserProfile | null;
  accessToken: string | null;
  expiresAt: number | null;
  scopes: string[];
  isDriveAuthorized: boolean;
  lastConnectedAt?: string;
}

const STORAGE_KEY = 'aiheaven_google_session';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const EMAIL_SCOPE = 'email';
const PROFILE_SCOPE = 'profile';

class GoogleAuthService {
  private session: GoogleSessionState;
  private listeners: Array<(session: GoogleSessionState) => void> = [];

  constructor() {
    this.session = this.loadStoredSession();
  }

  private loadStoredSession(): GoogleSessionState {
    if (typeof window === 'undefined') {
      return {
        isConnected: false,
        profile: null,
        accessToken: null,
        expiresAt: null,
        scopes: [],
        isDriveAuthorized: false
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check token expiry
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          return {
            ...parsed,
            isConnected: false,
            accessToken: null
          };
        }
        return parsed;
      }
    } catch {
      // Fallback
    }

    // Default development state
    return {
      isConnected: false,
      profile: null,
      accessToken: null,
      expiresAt: null,
      scopes: [],
      isDriveAuthorized: false
    };
  }

  private saveSession(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
      } catch {
        // storage quota exceeded or unavailable
      }
    }
    this.notifyListeners();
  }

  public subscribe(callback: (session: GoogleSessionState) => void): () => void {
    this.listeners.push(callback);
    callback(this.session);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.session);
    }
  }

  public getSession(): GoogleSessionState {
    return { ...this.session };
  }

  public getClientId(): string {
    return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.getClientId() && this.getClientId().trim().length > 0);
  }

  /**
   * Connect Google Account.
   * If real VITE_GOOGLE_CLIENT_ID is present, initializes standard Google Identity Services tokenClient.
   * If in local prototype mode without client ID, allows manual developer connection with honest labeling.
   */
  public async connect(withDriveScope: boolean = true): Promise<GoogleSessionState> {
    const scopes = [EMAIL_SCOPE, PROFILE_SCOPE];
    if (withDriveScope) {
      scopes.push(DRIVE_SCOPE);
    }

    const clientId = this.getClientId();

    if (!clientId) {
      throw new Error(
        'Google OAuth Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables to connect your Google account.'
      );
    }

    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      throw new Error(
        'Google Identity Services client library is not loaded. Ensure accounts.google.com/gsi/client is accessible in your network.'
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scopes.join(' '),
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
              return;
            }

            const accessToken = tokenResponse.access_token;
            const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3600;
            const expiresAt = Date.now() + expiresIn * 1000;

            // Fetch User profile from Google userinfo API
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (!userRes.ok) {
                throw new Error(`Google UserInfo API returned HTTP ${userRes.status}`);
              }
              const profile: GoogleUserProfile = await userRes.json();

              this.session = {
                isConnected: true,
                profile,
                accessToken,
                expiresAt,
                scopes,
                isDriveAuthorized: withDriveScope,
                lastConnectedAt: new Date().toISOString()
              };
              this.saveSession();
              resolve(this.session);
            } catch (err: any) {
              reject(new Error(`Failed to retrieve verified Google profile: ${err.message}`));
            }
          }
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  public disconnect(): void {
    if (this.session.accessToken && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        (window as any).google.accounts.oauth2.revoke(this.session.accessToken, () => {});
      } catch {
        // Silent catch
      }
    }

    this.session = {
      isConnected: false,
      profile: null,
      accessToken: null,
      expiresAt: null,
      scopes: [],
      isDriveAuthorized: false
    };
    this.saveSession();
  }
}

export const googleAuthService = new GoogleAuthService();
