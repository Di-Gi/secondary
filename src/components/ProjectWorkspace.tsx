// [[SECONDARY_MIND_DESKTOP]]/src/components/ProjectWorkspace.tsx
// Purpose: Main workspace interface with integrated profile management, symbol explorer, and AI chat.
// Architecture: Layout component that orchestrates profiles, symbol explorer, AI chat, and project information display.
// Dependencies: React hooks, app store, profile components, UI components, workspace sub-components.

import { useState, useEffect, memo, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useUIStore, useActiveTab, useSidebarState } from '../store/uiStore';
// Removed unused import - using appStore directly
import { Button } from './ui/button';
import { SymbolExplorer } from './SymbolExplorer';
import { AIChatInterface } from './AIChatInterface';
import { NotesInterface } from './NotesInterface';
import { GitStatusDisplay } from './GitStatusDisplay';
import { SettingsDialog } from './SettingsDialog';
import { usePerformanceMonitor, useThrottle } from '../hooks/usePerformance';

import { ArrowLeft, FolderOpen, Code, Bot, BookMarked, ChevronLeft, ChevronRight, Maximize2, Minimize2, Settings } from 'lucide-react';

type SidebarSize = 'collapsed' | 'narrow' | 'normal' | 'wide';

export const ProjectWorkspace = memo(() => {
  const { currentProject, gitStatus, clearProject } = useAppStore();
  const activeTab = useActiveTab();
  const { collapsed: sidebarCollapsed, width: sidebarWidth } = useSidebarState();
  const { setActiveTab, setSidebarCollapsed, setSidebarWidth } = useUIStore();
  
  // Performance monitoring
  usePerformanceMonitor('ProjectWorkspace');
  const [sidebarSize, setSidebarSize] = useState<SidebarSize>('normal');
  const [isResizing, setIsResizing] = useState(false);
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Throttled resize handler for better performance
  const throttledResize = useThrottle((newWidth: number) => {
    setSidebarWidth(newWidth);
    setCustomWidth(newWidth);
  }, 16); // ~60fps

  if (!currentProject) {
    return null;
  }

  const getSidebarWidth = useCallback(() => {
    if (customWidth) return customWidth;
    if (sidebarCollapsed) return 48;

    switch (sidebarSize) {
      case 'collapsed': return 48;
      case 'narrow': return 240;
      case 'normal': return sidebarWidth || 350;
      case 'wide': return 480;
      default: return sidebarWidth || 350;
    }
  }, [customWidth, sidebarCollapsed, sidebarSize, sidebarWidth]);

  const toggleCollapse = useCallback(() => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    setSidebarSize(newCollapsed ? 'collapsed' : 'normal');
    setCustomWidth(null);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const cycleSizeUp = useCallback(() => {
    const sizes: SidebarSize[] = ['narrow', 'normal', 'wide'];
    const currentIndex = sizes.indexOf(sidebarSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setSidebarSize(sizes[nextIndex]);
    setCustomWidth(null);
  }, [sidebarSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = Math.max(240, Math.min(600, e.clientX));
      throttledResize(newWidth);

      // Auto-adjust size based on width
      if (newWidth < 280) setSidebarSize('narrow');
      else if (newWidth < 400) setSidebarSize('normal');
      else setSidebarSize('wide');
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, throttledResize]);

  return (
    <div className="flex h-full bg-background">
      {/* Adaptive Sidebar for Symbol Explorer */}
      <aside
        className={`bg-background border-r border-border flex flex-col transition-all duration-200 relative ${isResizing ? 'select-none' : ''
          }`}
        style={{ width: getSidebarWidth() }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-border min-h-[48px]">
          {sidebarSize !== 'collapsed' && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm truncate text-foreground" title={currentProject.project_path}>
                  {currentProject.project_path.split('/').pop() || 'Unknown Project'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {currentProject.symbols.length} symbols
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearProject}
              className="h-7 px-2"
              title="Close Project"
            >
              <ArrowLeft className="h-3 w-3" />
              {sidebarSize !== 'collapsed' && <span className="ml-1 text-xs">Close</span>}
            </Button>

            {sidebarSize !== 'collapsed' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cycleSizeUp}
                  className="h-7 w-7 p-0"
                  title="Cycle size"
                >
                  {sidebarSize === 'wide' ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="h-7 w-7 p-0"
                  title="Settings"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-7 w-7 p-0"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>



        {/* Git Status */}
        {sidebarSize !== 'collapsed' && gitStatus && (
          <div className="px-3 py-2 border-b border-border">
            <GitStatusDisplay gitStatus={gitStatus} />
          </div>
        )}

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {sidebarCollapsed ? (
            <div className="p-2 space-y-2 text-center">
              <div className="text-xs text-muted-foreground">
                {currentProject.symbols.length}
              </div>
            </div>
          ) : (
            <SymbolExplorer symbols={currentProject.symbols} />
          )}
        </div>

        {/* Resize Handle */}
        {!sidebarCollapsed && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">
              {currentProject.project_path.split('/').pop() || 'Project'}
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat'
              ? 'border-primary text-primary bg-primary/10'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Bot className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes'
              ? 'border-primary text-primary bg-primary/10'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <BookMarked className="h-4 w-4" />
            Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 bg-muted/30">
          {activeTab === 'chat' && <AIChatInterface />}
          {activeTab === 'notes' && <NotesInterface />}
        </div>
      </main>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </div>
  );
});

ProjectWorkspace.displayName = 'ProjectWorkspace';