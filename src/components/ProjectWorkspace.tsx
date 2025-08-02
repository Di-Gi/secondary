// [[SECONDARY_MIND_DESKTOP]]/src/components/ProjectWorkspace.tsx
// Purpose: Main workspace interface displayed when a project is loaded, containing symbol explorer and AI chat.
// Architecture: Layout component that orchestrates the symbol explorer, AI chat, and project information display.
// Dependencies: React hooks, app store, UI components, workspace sub-components.

import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { SymbolExplorer } from './SymbolExplorer';
import { AIChatInterface } from './AIChatInterface';
import { NotesInterface } from './NotesInterface'; // Import the new component
import { GitStatusDisplay } from './GitStatusDisplay';
import { ArrowLeft, FolderOpen, Code, Bot, BookMarked } from 'lucide-react';

export function ProjectWorkspace() {
  const { currentProject, clearProject, gitStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat'); // Default to AI Chat

  if (!currentProject) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar for Symbol Explorer */}
      <aside className="w-[350px] border-r border-gray-200 flex flex-col">
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
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <span className="font-semibold text-sm truncate" title={currentProject.project_path}>
                {currentProject.project_path.split('/').pop() || 'Unknown Project'}
              </span>
            </div>
            {gitStatus && <GitStatusDisplay gitStatus={gitStatus} />}
            <div className="flex items-center gap-2 pt-2">
              <Code className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {currentProject.symbols.length} symbols found
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SymbolExplorer symbols={currentProject.symbols} />
        </div>
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