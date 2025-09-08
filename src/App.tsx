// [[SECONDARY_MIND_DESKTOP]]/src/App.tsx
// Purpose: Main React application component with integrated profile management system.
// Architecture: Clean single-view application that shows either project dashboard or workspace with integrated profiles.
// Dependencies: Enhanced app store with profile management, UI components, error handling.

import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { Toaster } from './components/ui/sonner';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { Titlebar } from './components/ui/titlebar';
import { initializeFrontend } from './init';

function App() {
  const { currentProject, isLoading, error, initializeApp } = useAppStore();

  useEffect(() => {
    const initialize = async () => {
      await initializeApp();
      // Signal that frontend is ready after app initialization
      await initializeFrontend();
    };
    initialize();
  }, [initializeApp]);

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="xl" />
            <p className="mt-4 text-gray-600">Initializing Secondary Mind...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Titlebar />
      <div className="flex-1 overflow-hidden">
        {currentProject ? (
          <ProjectWorkspace />
        ) : (
          <ProjectDashboard />
        )}
      </div>
      <Toaster />
    </div>
  );
}

export default App;

// Integration: Clean root component with integrated profile management - no more demo split view.
// Notes: Profiles are now fully integrated into the main workspace interface for seamless development workflow.