// [[SECONDARY_MIND_DESKTOP]]/src/utils/tauri.ts
// Purpose: Safe Tauri API wrappers with development mode detection and fallbacks.
// Architecture: Provides type-safe wrappers around Tauri APIs that gracefully handle development mode.
// Dependencies: Tauri APIs (when available).

import { invoke as tauriInvoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import { platform as tauriPlatform } from '@tauri-apps/api/os';

/**
 * Robust development mode detection
 */
export function isDevelopmentMode(): boolean {
  try {
    // Primary check: Vite development mode
    if (import.meta.env?.DEV === true) {
      return true;
    }

    // Check for demo mode environment variable
    if (import.meta.env?.VITE_DEMO_MODE === 'true') {
      return true;
    }

    // Secondary check: explicit NODE_ENV
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // Check for Vite HMR (hot module replacement)
    if ((window as any).__vite_plugin_react_preamble_installed__) {
      return true;
    }

    // Check if running on development server port
    if (typeof window !== 'undefined' && window.location) {
      const port = window.location.port;
      if (port === '1420' || port === '3000' || port === '5173') {
        return true;
      }
    }

    // If we're in a browser without Tauri context, likely development/demo
    if (typeof window !== 'undefined' && !('__TAURI__' in window)) {
      return true;
    }

    // Default to production mode if all checks pass
    return false;
  } catch {
    // If we can't determine, err on the side of caution (development)
    return true;
  }
}

/**
 * Check if Tauri APIs are available
 */
export function isTauriAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      '__TAURI__' in window &&
      typeof (window as any).__TAURI_IPC__ === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Safe wrapper for Tauri invoke with development mode fallback
 */
export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: () => Promise<T> | T
): Promise<T> {
  if (isTauriAvailable()) {
    try {
      return await tauriInvoke<T>(command, args);
    } catch (error) {
      console.error(`Tauri command '${command}' failed:`, error);
      if (fallback) {
        console.log(`🔧 Using fallback for '${command}'`);
        return await fallback();
      }
      throw error;
    }
  } else {
    if (fallback) {
      console.log(`🔧 Development mode: Using fallback for '${command}'`);
      return await fallback();
    } else {
      console.warn(`🔧 Development mode: No fallback provided for '${command}'`);
      throw new Error(`Tauri command '${command}' not available in development mode`);
    }
  }
}

/**
 * Safe platform detection with fallback
 */
export async function safePlatform(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      return await tauriPlatform();
    } catch (error) {
      console.error('Failed to get platform from Tauri:', error);
    }
  }

  // Fallback to user agent detection
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'darwin';
  if (userAgent.includes('win')) return 'win32';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

/**
 * Safe window controls with development mode handling
 */
export const safeWindow = {
  async minimize(): Promise<void> {
    if (isTauriAvailable()) {
      try {
        await appWindow.minimize();
      } catch (error) {
        console.error('Failed to minimize window:', error);
      }
    } else {
      console.log('🔧 Development mode: Window minimize simulated');
    }
  },

  async maximize(): Promise<void> {
    if (isTauriAvailable()) {
      try {
        await appWindow.maximize();
      } catch (error) {
        console.error('Failed to maximize window:', error);
      }
    } else {
      console.log('🔧 Development mode: Window maximize simulated');
    }
  },

  async unmaximize(): Promise<void> {
    if (isTauriAvailable()) {
      try {
        await appWindow.unmaximize();
      } catch (error) {
        console.error('Failed to unmaximize window:', error);
      }
    } else {
      console.log('🔧 Development mode: Window unmaximize simulated');
    }
  },

  async close(): Promise<void> {
    if (isTauriAvailable()) {
      try {
        await appWindow.close();
      } catch (error) {
        console.error('Failed to close window:', error);
      }
    } else {
      console.log('🔧 Development mode: Window close simulated');
      // In development, we can't actually close the browser window due to security restrictions
      alert('🔧 Development mode: Close button clicked (would close in production)');
    }
  },

  async isMaximized(): Promise<boolean> {
    if (isTauriAvailable()) {
      try {
        return await appWindow.isMaximized();
      } catch (error) {
        console.error('Failed to check if maximized:', error);
        return false;
      }
    } else {
      // In development mode, simulate maximized state
      return false;
    }
  },

  onResized(callback: () => void): Promise<() => void> {
    if (isTauriAvailable()) {
      return appWindow.onResized(callback);
    } else {
      // Return a no-op unsubscribe function for development
      return Promise.resolve(() => {});
    }
  }
};

/**
 * Development mode status indicator
 */
export function getEnvironmentInfo() {
  return {
    isDev: isDevelopmentMode(),
    isTauri: isTauriAvailable(),
    platform: navigator.userAgent,
    mode: isDevelopmentMode() ? 'development' : 'production'
  };
}

// Integration: Safe Tauri API wrappers that provide fallbacks for development mode.
// Notes: All components should use these wrappers instead of direct Tauri API calls.