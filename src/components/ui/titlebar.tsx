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
      className="flex items-center justify-between h-8 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 select-none"
      data-tauri-drag-region
    >
      {/* Left side - App title */}
      <div className="flex items-center px-3">
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>

      {/* Right side - Window controls */}
      <div className="flex">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-8 hover:bg-gray-200 transition-colors duration-150"
          aria-label="Minimize"
        >
          <Minus size={14} className="text-gray-600" />
        </button>
        
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-8 hover:bg-gray-200 transition-colors duration-150"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={12} className="text-gray-600" />
        </button>
        
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-8 hover:bg-red-500 hover:text-white transition-colors duration-150"
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