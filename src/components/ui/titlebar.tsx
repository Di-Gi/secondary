// [[SECONDARY_MIND_DESKTOP]]/src/components/ui/titlebar.tsx
// Purpose: Custom titlebar component with platform-specific styling and window controls.
// Architecture: React component that provides native-like window controls and drag region.
// Dependencies: Safe Tauri API wrappers, platform detection.

import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { isMacOS } from '../../utils/platform';
import { safeWindow, isDevelopmentMode, isTauriAvailable } from '../../utils/tauri';

interface TitlebarProps {
  title?: string;
}

export function Titlebar({ title = "Secondary Mind" }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check platform and window state
    const initializeTitlebar = async () => {
      try {
        // Don't render titlebar if we're in web development mode (no Tauri context)
        const isDevMode = isDevelopmentMode();
        const hasTauri = isTauriAvailable();

        if (isDevMode && !hasTauri) {
          setShouldRender(false);
          return;
        }

        const macOS = await isMacOS();
        setShouldRender(!macOS);

        if (!macOS) {
          const maximized = await safeWindow.isMaximized();
          setIsMaximized(maximized);
        }
      } catch (error) {
        console.error('Failed to initialize titlebar:', error);
        // On error, only hide titlebar if we're definitely in web development mode
        setShouldRender(isTauriAvailable());
      }
    };

    initializeTitlebar();

    // Listen for window resize events
    const setupResizeListener = async () => {
      try {
        const unlisten = await safeWindow.onResized(() => {
          safeWindow.isMaximized().then(setIsMaximized).catch(console.error);
        });
        return unlisten;
      } catch (error) {
        console.error('Failed to setup resize listener:', error);
        return () => {}; // No-op cleanup function
      }
    };

    let cleanupFn: (() => void) | null = null;
    setupResizeListener().then(fn => {
      cleanupFn = fn;
    });

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, []);

  const handleMinimize = () => {
    safeWindow.minimize();
  };

  const handleMaximize = () => {
    if (isMaximized) {
      safeWindow.unmaximize();
    } else {
      safeWindow.maximize();
    }
  };

  const handleClose = () => {
    safeWindow.close();
  };

  // Don't render titlebar on macOS (uses native overlay) or in web development mode
  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className="flex items-center justify-between h-8 bg-gradient-to-r from-background to-muted/50 border-b border-border select-none"
      data-tauri-drag-region
    >
      {/* Left side - App title */}
      <div className="flex items-center px-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>

      {/* Right side - Window controls */}
      <div className="flex">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-8 hover:bg-muted transition-colors duration-150"
          aria-label="Minimize"
        >
          <Minus size={14} className="text-muted-foreground" />
        </button>
        
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-8 hover:bg-muted transition-colors duration-150"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={12} className="text-muted-foreground" />
        </button>
        
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-8 hover:bg-destructive hover:text-destructive-foreground transition-colors duration-150"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Integration: Platform-aware titlebar that only renders on Windows/Linux.
// Notes: Uses data-tauri-drag-region for window dragging, includes proper window controls.