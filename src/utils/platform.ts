// [[SECONDARY_MIND_DESKTOP]]/src/utils/platform.ts
// Purpose: Platform detection utilities for conditional rendering and behavior.
// Architecture: Simple utility functions for platform-specific logic.
// Dependencies: Safe Tauri API wrappers.

import { safePlatform } from './tauri';

let cachedPlatform: string | null = null;

/**
 * Get the current platform, with caching for performance
 */
export async function getPlatform(): Promise<string> {
  if (cachedPlatform === null) {
    cachedPlatform = await safePlatform();
  }
  return cachedPlatform;
}

/**
 * Check if running on macOS
 */
export async function isMacOS(): Promise<boolean> {
  const platformName = await getPlatform();
  return platformName === 'darwin';
}

/**
 * Check if running on Windows
 */
export async function isWindows(): Promise<boolean> {
  const platformName = await getPlatform();
  return platformName === 'win32';
}

/**
 * Check if running on Linux
 */
export async function isLinux(): Promise<boolean> {
  const platformName = await getPlatform();
  return platformName === 'linux';
}

// Integration: Simple platform detection with caching for performance.
// Notes: Uses Tauri's OS API to determine the current platform.