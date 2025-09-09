// [[SECONDARY_MIND_DESKTOP]]/src/components/ui/titlebar.tsx
// Purpose: Custom titlebar component with platform-specific styling and window controls.
// Architecture: React component that provides native-like window controls and drag region.
// Dependencies: Tauri window API, platform detection.

import { useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { isMacOS } from '../../utils/platform';

interface TitlebarProps {
  title?: string;
}

export function Titlebar({ title = "Secondary Mind" }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check platform and window state
    const initializeTitlebar = async () => {
      const macOS = await isMacOS();
      setShouldRender(!macOS);
      
      if (!macOS) {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      }
    };

    initializeTitlebar();

    // Listen for window resize events
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };

  const handleClose = () => {
    appWindow.close();
  };

  // Don't render titlebar on macOS (uses native overlay)
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