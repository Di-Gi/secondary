// [[SECONDARY_MIND_DESKTOP]]/src/components/ProjectWorkspace.tsx
// Purpose: Main workspace interface displayed when a project is loaded, containing symbol explorer and AI chat.
// Architecture: Layout component that orchestrates the symbol explorer, AI chat, and project information display.
// Dependencies: React hooks, app store, UI components, workspace sub-components.

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { SymbolExplorer } from './SymbolExplorer';
import { AIChatInterface } from './AIChatInterface';
import { NotesInterface } from './NotesInterface';
import { GitStatusDisplay } from './GitStatusDisplay';
import { ArrowLeft, FolderOpen, Code, Bot, BookMarked, ChevronLeft, ChevronRight, Maximize2, Minimize2, Settings } from 'lucide-react';

type SidebarSize = 'collapsed' | 'narrow' | 'normal' | 'wide';

export function ProjectWorkspace() {
  const { currentProject, clearProject, gitStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [sidebarSize, setSidebarSize] = useState<SidebarSize>('normal');
  const [isResizing, setIsResizing] = useState(false);
  const [customWidth, setCustomWidth] = useState<number | null>(null);

  if (!currentProject) {
    return null;
  }

  const getSidebarWidth = () => {
    if (customWidth) return customWidth;
    
    switch (sidebarSize) {
      case 'collapsed': return 48;
      case 'narrow': return 240;
      case 'normal': return 350;
      case 'wide': return 480;
      default: return 350;
    }
  };

  const toggleCollapse = () => {
    setSidebarSize(prev => prev === 'collapsed' ? 'normal' : 'collapsed');
    setCustomWidth(null);
  };

  const cycleSizeUp = () => {
    const sizes: SidebarSize[] = ['narrow', 'normal', 'wide'];
    const currentIndex = sizes.indexOf(sidebarSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setSidebarSize(sizes[nextIndex]);
    setCustomWidth(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = Math.max(240, Math.min(600, e.clientX));
      setCustomWidth(newWidth);
      
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
  }, [isResizing]);

  return (
    <div className="flex h-screen bg-white">
      {/* Adaptive Sidebar for Symbol Explorer */}
      <aside 
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 relative ${
          isResizing ? 'select-none' : ''
        }`}
        style={{ width: getSidebarWidth() }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[48px]">
          {sidebarSize !== 'collapsed' && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-semibold text-sm truncate" title={currentProject.project_path}>
                  {currentProject.project_path.split('/').pop() || 'Unknown Project'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
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
              className="h-7 px-2 text-gray-600 hover:text-gray-900"
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
              title={sidebarSize === 'collapsed' ? 'Expand' : 'Collapse'}
            >
              {sidebarSize === 'collapsed' ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Git Status */}
        {sidebarSize !== 'collapsed' && gitStatus && (
          <div className="px-3 py-2 border-b border-gray-200">
            <GitStatusDisplay gitStatus={gitStatus} />
          </div>
        )}

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {sidebarSize === 'collapsed' ? (
            <div className="p-2 space-y-2 text-center">
              <div className="text-xs text-gray-500">
                {currentProject.symbols.length}
              </div>
            </div>
          ) : (
            <SymbolExplorer symbols={currentProject.symbols} />
          )}
        </div>

        {/* Resize Handle */}
        {sidebarSize !== 'collapsed' && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bot className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BookMarked className="h-4 w-4" />
            Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-gray-50">
          {activeTab === 'chat' && <AIChatInterface />}
          {activeTab === 'notes' && <NotesInterface />}
        </div>
      </main>
    </div>
  );
}