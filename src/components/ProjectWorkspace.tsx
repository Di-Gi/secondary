// [[SECONDARY_MIND_DESKTOP]]/src/components/ProjectWorkspace.tsx
// Purpose: Main workspace interface displayed when a project is loaded, containing symbol explorer and AI chat.
// Architecture: Layout component that orchestrates the symbol explorer, AI chat, and project information display.
// Dependencies: React hooks, app store, UI components, workspace sub-components.

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { SymbolExplorer } from './SymbolExplorer';
import { AIChatInterface } from './AIChatInterface';
import { NotesInterface } from './NotesInterface';
import { NavigationInterface } from './navigation/NavigationInterface';
import { NavigationLocation } from '../types/navigation';
import { SessionManager } from './SessionManager';
import { GitStatusDisplay } from './GitStatusDisplay';
import { ArrowLeft, FolderOpen, Code, Bot, BookMarked, Navigation } from 'lucide-react';
import { Symbol } from '../api'; // Import Symbol type

export function ProjectWorkspace() {
  const { currentProject, clearProject, gitStatus, loadSession } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'navigation'>('chat');

  // Enhanced navigation state
  const [currentLocation, setCurrentLocation] = useState<NavigationLocation | undefined>();

  // Load session when component mounts
  useEffect(() => {
    if (currentProject) {
      loadSession();
    }
  }, [currentProject, loadSession]);

  if (!currentProject) {
    return null;
  }

  // Handler for symbol selection (for highlighting/preview)
  const handleSymbolSelect = (symbol: Symbol) => {
    console.log('Symbol selected:', symbol);
    // This could be used for showing symbol details in a preview panel
  };

  // Handler to update the current location when a symbol is selected for navigation
  const handleNavigateToSymbol = (symbol: Symbol) => {
    const newLocation: NavigationLocation = {
      id: `nav-${symbol.identifier}-${symbol.location.line}-${Date.now()}`,
      filePath: symbol.location.path,
      position: {
        line: symbol.location.line,
        column: symbol.location.column
      },
      symbol: symbol,
      context: {
        projectPath: currentProject.project_path,
        breadcrumbs: [],
        relatedSymbols: []
      },
      timestamp: new Date(),
      metadata: {
        title: symbol.identifier,
        description: `${symbol.kind} in ${symbol.location.path}`,
        tags: [symbol.kind.toLowerCase()],
        visitCount: 1,
        lastAccessed: new Date(),
        isBookmarked: false,
        isFavorite: false
      }
    };
    setCurrentLocation(newLocation);
    console.log("Navigating to:", newLocation);
  };

  // Handler for navigation location changes
  const handleLocationChange = (location: NavigationLocation) => {
    setCurrentLocation(location);
    console.log("Navigated to:", location);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Enhanced Sidebar */}
      <aside className="w-[400px] border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearProject}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close Project
            </Button>
            <SessionManager>
              <div className="text-xs text-gray-500">Session</div>
            </SessionManager>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="font-semibold text-sm truncate" title={currentProject.project_path}>
                {currentProject.project_path.split(/[/\\]/).pop() || 'Unknown Project'}
              </span>
            </div>
            {gitStatus && <GitStatusDisplay gitStatus={gitStatus} />}
            <div className="flex items-center gap-2 pt-2">
              <Code className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {currentProject.symbols.length} symbols found
                {currentProject.cache_hit_rate > 0 && (
                  <span className="ml-2 text-xs text-green-600">
                    ({Math.round(currentProject.cache_hit_rate * 100)}% cached)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Unified Symbol Interface */}
        <div className="flex-1 overflow-hidden">
          <SymbolExplorer 
            symbols={currentProject.symbols}
            onSymbolSelect={handleSymbolSelect}
            onSymbolNavigate={handleNavigateToSymbol}
            currentFilePath={currentLocation?.filePath}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Enhanced Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Bot className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <BookMarked className="h-4 w-4" />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('navigation')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'navigation'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Navigation className="h-4 w-4" />
            Navigation
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-gray-50">
          {activeTab === 'chat' && <AIChatInterface />}
          {activeTab === 'notes' && <NotesInterface />}
          {activeTab === 'navigation' && (
            <NavigationInterface
              currentLocation={currentLocation}
              onLocationChange={handleLocationChange}
              onSymbolSelect={handleSymbolSelect}
              className="h-full p-4"
            />
          )}
        </div>
      </main>
    </div>
  );
}