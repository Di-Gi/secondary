// [[SECONDARY_MIND_DESKTOP]]/src/components/SessionManager.tsx
// Purpose: React component for managing project sessions and workspace state
// Architecture: Integrates session store with UI for session management features
// Dependencies: React, session store, session hooks

import React, { useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useSessionRestore, useWorkspaceRestore, useSessionCleanup } from '../hooks/useSessionRestore';
import { useAutoSave } from '../store/sessionStore';
import { useAppStore } from '../store/appStore';

interface SessionManagerProps {
  children: React.ReactNode;
}

/**
 * Session manager component that handles automatic session management
 * This component should wrap the main application to provide session functionality
 */
export const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
  const { sessionError, isSessionLoading } = useSessionRestore();
  const { restoreWorkspace } = useWorkspaceRestore();
  const { optimizeSession } = useSessionCleanup();
  
  // Enable auto-save functionality
  useAutoSave();

  const currentSession = useSessionStore(state => state.currentSession);
  const hasUnsavedChanges = useSessionStore(state => state.hasUnsavedChanges);

  // Restore workspace when session is loaded
  useEffect(() => {
    if (currentSession && !isSessionLoading) {
      restoreWorkspace();
    }
  }, [currentSession, isSessionLoading, restoreWorkspace]);

  // Periodic session optimization
  useEffect(() => {
    const interval = setInterval(() => {
      optimizeSession();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [optimizeSession]);

  // Show session error if any
  if (sessionError) {
    console.error('Session error:', sessionError);
  }

  return (
    <div className="session-manager">
      {children}
      
      {/* Session status indicator */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm">
          Unsaved changes
        </div>
      )}
      
      {isSessionLoading && (
        <div className="fixed bottom-4 left-4 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded text-sm">
          Loading session...
        </div>
      )}
    </div>
  );
};

/**
 * Session info component for displaying current session details
 */
export const SessionInfo: React.FC = () => {
  const currentSession = useSessionStore(state => state.currentSession);
  const openFiles = useSessionStore(state => state.openFiles);
  const bookmarks = useSessionStore(state => state.bookmarks);
  const chatHistory = useSessionStore(state => state.chatHistory);

  if (!currentSession) {
    return (
      <div className="p-4 text-gray-500">
        No active session
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold text-lg">Session Info</h3>
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Project:</span> {currentSession.project_path}
        </div>
        <div>
          <span className="font-medium">Open Files:</span> {openFiles.length}
        </div>
        <div>
          <span className="font-medium">Bookmarks:</span> {bookmarks.length}
        </div>
        <div>
          <span className="font-medium">Chat Messages:</span> {chatHistory.length}
        </div>
        <div>
          <span className="font-medium">Last Updated:</span>{' '}
          {new Date(currentSession.last_updated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

/**
 * Session list component for managing multiple sessions
 */
export const SessionList: React.FC = () => {
  const availableSessions = useSessionStore(state => state.availableSessions);
  const currentSession = useSessionStore(state => state.currentSession);
  const loadSession = useSessionStore(state => state.loadSession);
  const deleteSession = useSessionStore(state => state.deleteSession);
  const listSessions = useSessionStore(state => state.listSessions);

  useEffect(() => {
    listSessions();
  }, [listSessions]);

  const handleLoadSession = async (projectId: string) => {
    const { currentProject } = useAppStore.getState();
    if (!currentProject) {
      console.error('No current project available');
      return;
    }
    
    try {
      await loadSession(projectId, currentProject.project_path);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(projectId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-4">Available Sessions</h3>
      
      {availableSessions.length === 0 ? (
        <div className="text-gray-500 text-sm">No sessions available</div>
      ) : (
        <div className="space-y-2">
          {availableSessions.map(session => (
            <div
              key={session.project_id}
              className={`p-3 border rounded-lg ${
                currentSession?.project_id === session.project_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate">
                    {session.project_path.split('/').pop() || session.project_path}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {session.project_path}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {session.open_files_count} files, {session.bookmarks_count} bookmarks
                  </div>
                  <div className="text-xs text-gray-400">
                    Updated: {new Date(session.last_updated).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-2">
                  {currentSession?.project_id !== session.project_id && (
                    <button
                      onClick={() => handleLoadSession(session.project_id)}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Load
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSession(session.project_id)}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Open files panel component
 */
export const OpenFilesPanel: React.FC = () => {
  const openFiles = useSessionStore(state => state.openFiles);
  const closeFile = useSessionStore(state => state.closeFile);
  const setActiveFile = useSessionStore(state => state.setActiveFile);

  return (
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-4">Open Files</h3>
      
      {openFiles.length === 0 ? (
        <div className="text-gray-500 text-sm">No files open</div>
      ) : (
        <div className="space-y-1">
          {openFiles.map(file => (
            <div
              key={file.path}
              className={`flex items-center justify-between p-2 rounded text-sm ${
                file.is_active ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => setActiveFile(file.path)}
                className="flex-1 text-left truncate"
                title={file.path}
              >
                {file.path.split('/').pop() || file.path}
              </button>
              
              <button
                onClick={() => closeFile(file.path)}
                className="ml-2 text-gray-400 hover:text-red-500"
                title="Close file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Bookmarks panel component
 */
export const BookmarksPanel: React.FC = () => {
  const bookmarks = useSessionStore(state => state.bookmarks);
  const removeBookmark = useSessionStore(state => state.removeBookmark);
  const openFile = useSessionStore(state => state.openFile);

  const handleBookmarkClick = (bookmark: any) => {
    openFile(bookmark.file_path, bookmark.position);
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-4">Bookmarks</h3>
      
      {bookmarks.length === 0 ? (
        <div className="text-gray-500 text-sm">No bookmarks</div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map(bookmark => (
            <div
              key={bookmark.id}
              className="p-2 border rounded hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <button
                  onClick={() => handleBookmarkClick(bookmark)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-sm">{bookmark.name}</div>
                  <div className="text-xs text-gray-500">
                    {bookmark.file_path}:{bookmark.position.line + 1}
                  </div>
                  {bookmark.description && (
                    <div className="text-xs text-gray-400 mt-1">
                      {bookmark.description}
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => removeBookmark(bookmark.id)}
                  className="ml-2 text-gray-400 hover:text-red-500"
                  title="Remove bookmark"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};