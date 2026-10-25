/**
 * AI HEAVEN - Native Android Mobile Bridge Service
 * Integrates Capacitor plugins for Android status bar, keyboard handling,
 * hardware back-button navigation, and real-time network connectivity.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export interface MobileConnectivityState {
  connected: boolean;
  connectionType: string;
}

class MobileNativeService {
  private isInitialized = false;
  private backButtonHandlers: Array<() => boolean> = [];
  private connectivityListeners: Array<(state: MobileConnectivityState) => void> = [];

  public async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // 1. Configure Android Status Bar to match dark glass theme #080B10
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      await StatusBar.setBackgroundColor({ color: '#080B10' }).catch(() => {});
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    } catch {
      // Safe fallback
    }

    try {
      // 2. Configure Android Soft Keyboard behavior
      await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
      await Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    } catch {
      // Safe fallback
    }

    try {
      // 3. Android Hardware Back Button Handler
      CapApp.addListener('backButton', ({ canGoBack }) => {
        // Execute registered handlers from top of stack (modals, drawers, nested views)
        for (let i = this.backButtonHandlers.length - 1; i >= 0; i--) {
          const handled = this.backButtonHandlers[i]();
          if (handled) return;
        }

        // If history can go back, go back; otherwise prompt or exit
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    } catch {
      // Safe fallback
    }

    try {
      // 4. Real-time Network Monitoring
      Network.addListener('networkStatusChange', (status) => {
        const state: MobileConnectivityState = {
          connected: status.connected,
          connectionType: status.connectionType
        };
        this.connectivityListeners.forEach((fn) => fn(state));
      });
    } catch {
      // Safe fallback
    }
  }

  /**
   * Registers a back-button interceptor (e.g. For open modals or slide-over menus).
   * Returns an unregister function.
   */
  public registerBackHandler(handler: () => boolean): () => void {
    this.backButtonHandlers.push(handler);
    return () => {
      this.backButtonHandlers = this.backButtonHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Subscribes to native connectivity updates.
   */
  public onConnectivityChange(callback: (state: MobileConnectivityState) => void): () => void {
    this.connectivityListeners.push(callback);
    return () => {
      this.connectivityListeners = this.connectivityListeners.filter((fn) => fn !== callback);
    };
  }

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public getPlatform(): string {
    return Capacitor.getPlatform();
  }

  public async getNetworkStatus(): Promise<MobileConnectivityState> {
    try {
      const status = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType
      };
    } catch {
      return {
        connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionType: 'web'
      };
    }
  }
}

export const mobileNativeService = new MobileNativeService();
