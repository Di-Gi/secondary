// [[SECONDARY_MIND_DESKTOP]]/src/utils/pathUtils.ts
// Purpose: Path normalization and cleaning utilities for consistent file path display
// Architecture: Simple utility functions for cleaning Windows UNC paths and normalizing separators
// Dependencies: None

/**
 * Clean and normalize file paths for display
 * Removes Windows UNC prefix (\\?\) and normalizes path separators
 */
export function cleanPath(path: string): string {
  if (!path) return path;
  
  let cleaned = path;
  
  // Remove Windows UNC prefix if present
  if (cleaned.startsWith('\\\\?\\')) {
    cleaned = cleaned.substring(4);
  }
  
  // Convert backslashes to forward slashes for consistency
  cleaned = cleaned.replace(/\\/g, '/');
  
  // Remove leading slash if present (for relative paths)
  if (cleaned.startsWith('/')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Extract filename from a path
 */
export function getFileName(path: string): string {
  const cleanedPath = cleanPath(path);
  return cleanedPath.split('/').pop() || cleanedPath;
}

/**
 * Get relative path for display (same as cleanPath but more semantic)
 */
export function getRelativePath(path: string): string {
  return cleanPath(path);
}