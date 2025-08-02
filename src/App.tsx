// [[SECONDARY_MIND_DESKTOP]]/src/App.tsx
// Purpose: Enhanced main React application component with persistent project management initialization.
// Architecture: Updated to initialize the persistent storage system and handle app-level state properly.
// Dependencies: Enhanced app store with persistence, existing UI components, improved error handling.

import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { Toaster } from './components/ui/sonner';
import { LoadingSpinner } from './components/ui/loading-spinner';

function App() {
  const { currentProject, isLoading, error, initializeApp } = useAppStore();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
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
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600">Initializing Secondary Mind...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      {currentProject ? (
        <ProjectWorkspace />
      ) : (
        <ProjectDashboard />
      )}
      <Toaster />
    </div>
  );
}

export default App;

// Integration: Enhanced root component that properly initializes the persistent storage system and provides improved loading states.
// Notes: Includes proper error boundaries and loading states for a polished user experience with the enhanced persistence features.