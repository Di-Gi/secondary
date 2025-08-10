// [[SECONDARY_MIND_DESKTOP]]/src/hooks/useSessionRestore.ts
// Purpose: React hooks for session restoration and state migration
// Architecture: Custom hooks that integrate with the session store for workspace restoration
// Dependencies: React, session store, app store

import { useEffect, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useAppStore } from '../store/appStore';

/**
 * Hook for restoring session state when a project is loaded
 */
export const useSessionRestore = () => {
  const initializeSession = useSessionStore(state => state.initializeSession);
  const currentProject = useAppStore(state => state.currentProject);
  const sessionError = useSessionStore(state => state.sessionError);
  const isSessionLoading = useSessionStore(state => state.isSessionLoading);

  const restoreProjectSession = useCallback(async (projectPath: string) => {
    if (!projectPath) return;

    // Generate project ID from path (simple hash)
    const projectId = btoa(projectPath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    
    try {
      await initializeSession(projectId, projectPath);
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }, [initializeSession]);

  // Auto-restore session when project changes
  useEffect(() => {
    if (currentProject?.project_path) {
      restoreProjectSession(currentProject.project_path);
    }
  }, [currentProject?.project_path, restoreProjectSession]);

  return {
    restoreProjectSession,
    sessionError,
    isSessionLoading,
  };
};

/**
 * Hook for managing session state migrations
 */
export const useSessionMigration = () => {
  const currentSession = useSessionStore(state => state.currentSession);
  const updateSession = useSessionStore(state => state.saveSession);

  const migrateSessionSchema = useCallback(async (session: any) => {
    // Check if migration is needed
    const currentVersion = session.schema_version || 1;
    const targetVersion = 2; // Current schema version

    if (currentVersion >= targetVersion) {
      return session; // No migration needed
    }

    let migratedSession = { ...session };

    // Migration from v1 to v2
    if (currentVersion < 2) {
      // Add new fields that were introduced in v2
      migratedSession = {
        ...migratedSession,
        schema_version: 2,
        workspace_layout: migratedSession.workspace_layout || {
          panels: {},
          splitters: {},
          active_tabs: {},
        },
        // Migrate old bookmark format if needed
        bookmarks: migratedSession.bookmarks?.map((bookmark: any) => ({
          ...bookmark,
          category: bookmark.category || null,
          description: bookmark.description || null,
        })) || [],
      };
    }

    return migratedSession;
  }, []);

  const checkAndMigrateCurrentSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      const migratedSession = await migrateSessionSchema(currentSession);
      
      if (migratedSession !== currentSession) {
        console.log('Migrating session schema...');
        await updateSession();
      }
    } catch (error) {
      console.error('Failed to migrate session:', error);
    }
  }, [currentSession, migrateSessionSchema, updateSession]);

  // Auto-migrate on session load
  useEffect(() => {
    checkAndMigrateCurrentSession();
  }, [checkAndMigrateCurrentSession]);

  return {
    migrateSessionSchema,
    checkAndMigrateCurrentSession,
  };
};

/**
 * Hook for managing workspace state restoration
 */
export const useWorkspaceRestore = () => {
  // Select actions, which are stable and won't cause re-renders.
  const { updatePanelState, updateSplitterState, openFile } = useSessionStore(state => ({
    updatePanelState: state.updatePanelState,
    updateSplitterState: state.updateSplitterState,
    openFile: state.openFile,
  }));

  // By using `getState()` inside `useCallback`, we avoid a dependency on `workspaceLayout`
  // which prevents the infinite loop. The callback will always get the freshest state when called.
  const restoreWorkspaceLayout = useCallback(() => {
    const { workspaceLayout } = useSessionStore.getState();

    Object.entries(workspaceLayout.panels).forEach(([panelId, panelState]) => {
      updatePanelState(panelId, panelState);
    });

    Object.entries(workspaceLayout.splitters).forEach(([splitterId, splitterState]) => {
      updateSplitterState(splitterId, splitterState);
    });
  }, [updatePanelState, updateSplitterState]); // Dependencies are now stable.

  const restoreOpenFiles = useCallback(() => {
    const { openFiles } = useSessionStore.getState();
    
    const sortedFiles = [...openFiles].sort((a, b) => 
      new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
    );

    sortedFiles.forEach(file => {
      openFile(file.path, file.cursor_position);
    });
  }, [openFile]); // Dependency is stable.

  const restoreWorkspace = useCallback(() => {
    restoreWorkspaceLayout();
    restoreOpenFiles();
  }, [restoreWorkspaceLayout, restoreOpenFiles]);

  return {
    restoreWorkspace,
    restoreWorkspaceLayout,
    restoreOpenFiles,
    // Subscribe to primitive counts, which is more efficient than the whole array.
    openFilesCount: useSessionStore(state => state.openFiles.length),
    bookmarksCount: useSessionStore(state => state.bookmarks.length),
  };
};


/**
 * Hook for handling session cleanup and optimization
 */
export const useSessionCleanup = () => {
  const { currentSession, chatHistory, searchHistory, clearChatHistory, clearSearchHistory, saveSession, addChatMessage, addSearchQuery } = useSessionStore(state => ({
    currentSession: state.currentSession,
    chatHistory: state.chatHistory,
    searchHistory: state.searchHistory,
    clearChatHistory: state.clearChatHistory,
    clearSearchHistory: state.clearSearchHistory,
    saveSession: state.saveSession,
    addChatMessage: state.addChatMessage,
    addSearchQuery: state.addSearchQuery
  }));

  const cleanupChatHistory = useCallback(async (maxMessages: number = 1000) => {
    if (chatHistory.length > maxMessages) {
      const messagesToKeep = chatHistory.slice(-maxMessages);
      clearChatHistory();
      
      messagesToKeep.forEach(message => {
        addChatMessage({
          role: message.role,
          content: message.content,
          context: message.context,
        });
      });
      
      await saveSession();
    }
  }, [chatHistory, clearChatHistory, saveSession, addChatMessage]);

  const cleanupSearchHistory = useCallback(async (maxSearches: number = 50) => {
    if (searchHistory.length > maxSearches) {
      const searchesToKeep = searchHistory.slice(0, maxSearches);
      clearSearchHistory();
      
      searchesToKeep.forEach(query => {
        addSearchQuery(query);
      });
      
      await saveSession();
    }
  }, [searchHistory, clearSearchHistory, saveSession, addSearchQuery]);

  const optimizeSession = useCallback(async () => {
    await cleanupChatHistory();
    await cleanupSearchHistory();
  }, [cleanupChatHistory, cleanupSearchHistory]);

  // Auto-cleanup when session gets too large
  useEffect(() => {
    if (currentSession && (chatHistory.length > 1500 || searchHistory.length > 100)) {
      optimizeSession();
    }
  }, [currentSession, chatHistory.length, searchHistory.length, optimizeSession]);

  return {
    cleanupChatHistory,
    cleanupSearchHistory,
    optimizeSession,
    chatHistorySize: chatHistory.length,
    searchHistorySize: searchHistory.length,
  };
};