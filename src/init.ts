// [[SECONDARY_MIND_DESKTOP]]/src/init.ts
// Purpose: Frontend initialization handler that signals backend when React app is ready.
// Architecture: Simple event-based communication with the Tauri backend.
// Dependencies: Safe Tauri API wrappers.

import { safeInvoke } from './utils/tauri';

/**
 * Signals the backend that the frontend is fully initialized and ready.
 * This triggers the transition from splash screen to main application window.
 */
export async function signalFrontendReady(): Promise<void> {
  try {
    await safeInvoke('frontend_ready', undefined, () => {
      console.log('🔧 Development mode: Frontend ready signal simulated');
    });
    console.log('Frontend ready signal sent to backend');
  } catch (error) {
    console.error('Failed to signal frontend ready:', error);
    // Don't throw - this shouldn't break the app if it fails
  }
}

/**
 * Initialize the frontend startup sequence.
 * Call this after your main app components are mounted and ready.
 */
export async function initializeFrontend(): Promise<void> {
  // Wait a brief moment to ensure everything is rendered
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Signal that we're ready
  await signalFrontendReady();
}

// Integration: Simple, focused initialization that handles the splash -> main transition.
// Notes: Includes error handling and timing to ensure smooth user experience.