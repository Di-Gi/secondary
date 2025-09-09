// [[SECONDARY_MIND_DESKTOP]]/src/App.tsx
// Purpose: Main React application component with integrated profile management system.
// Architecture: Clean single-view application that shows either project dashboard or workspace with integrated profiles.
// Dependencies: Enhanced app store with profile management, UI components, error handling.

import { useEffect, memo } from 'react';
import { useAppStore } from './store/appStore';
import { useTheme } from './store/uiStore';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { Toaster } from './components/ui/sonner';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { Titlebar } from './components/ui/titlebar';

import { initializeFrontend } from './init';
import { usePerformanceMonitor } from './hooks/usePerformance';

const App = memo(() => {
  const { currentProject, isLoading, error, initializeApp } = useAppStore();
  const theme = useTheme();

  // Performance monitoring in development
  usePerformanceMonitor('App');

  useEffect(() => {
    const initialize = async () => {
      await initializeApp();
      // Signal that frontend is ready after app initialization
      await initializeFrontend();
    };
    initialize();
  }, [initializeApp]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-2">Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
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
      <div className="flex flex-col h-screen bg-background">
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="xl" />
            <p className="mt-4 text-muted-foreground">Initializing Secondary Mind...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
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
});

App.displayName = 'App';

export default App;

// Integration: Clean root component with integrated profile management - no more demo split view.
// Notes: Profiles are now fully integrated into the main workspace interface for seamless development workflow.