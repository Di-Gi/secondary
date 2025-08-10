// [[SECONDARY_MIND_DESKTOP]]/src/store/sessionStore.ts
// Purpose: Zustand store extension for session state tracking and workspace management
// Architecture: Extends the existing app store with session persistence and restoration capabilities
// Dependencies: Zustand, session API, existing app store patterns

import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../api';

// Session-related types (matching Rust backend)
export interface ProjectSession {
  project_id: string;
  project_path: string;
  open_files: OpenFile[];
  bookmarks: Bookmark[];
  search_history: string[];
  ai_chat_history: ChatMessage[];
  workspace_layout: WorkspaceLayout;
  last_updated: string;
  created_at: string;
}

export interface OpenFile {
  path: string;
  cursor_position: Position;
  scroll_position: number;
  selection?: Range;
  is_active: boolean;
  last_accessed: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Bookmark {
  id: string;
  name: string;
  file_path: string;
  position: Position;
  description?: string;
  category?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'User' | 'Assistant';
  content: string;
  timestamp: string;
  context?: MessageContext;
}

export interface MessageContext {
  active_file?: string;
  selected_code?: string;
  related_symbols: string[];
}

export interface WorkspaceLayout {
  panels: Record<string, PanelState>;
  splitters: Record<string, SplitterState>;
  window_size?: WindowSize;
  active_tabs: Record<string, string>;
}

export interface PanelState {
  visible: boolean;
  size: number;
  collapsed: boolean;
}

export interface SplitterState {
  position: number;
  orientation: 'Horizontal' | 'Vertical';
}

export interface WindowSize {
  width: number;
  height: number;
  maximized: boolean;
}

export interface SessionInfo {
  project_id: string;
  project_path: string;
  last_updated: string;
  created_at: string;
  open_files_count: number;
  bookmarks_count: number;
}

// Session store state interface
interface SessionState {
  // Current session
  currentSession: ProjectSession | null;
  availableSessions: SessionInfo[];
  
  // Workspace state
  openFiles: OpenFile[];
  bookmarks: Bookmark[];
  searchHistory: string[];
  chatHistory: ChatMessage[];
  workspaceLayout: WorkspaceLayout;
  
  // UI state
  isSessionLoading: boolean;
  sessionError: string | null;
  
  // Auto-save state
  hasUnsavedChanges: boolean;
  lastAutoSave: string | null;
  
  // Actions
  initializeSession: (projectId: string, projectPath: string) => Promise<void>;
  loadSession: (projectId: string, projectPath: string) => Promise<void>;
  saveSession: () => Promise<void>;
  deleteSession: (projectId: string) => Promise<void>;
  listSessions: () => Promise<void>;
  
  // File management
  openFile: (filePath: string, position?: Position) => void;
  closeFile: (filePath: string) => void;
  updateFilePosition: (filePath: string, position: Position, scrollPosition?: number) => void;
  setActiveFile: (filePath: string) => void;
  updateFileSelection: (filePath: string, selection?: Range) => void;
  
  // Bookmark management
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'created_at'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => void;
  
  // Search history
  addSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;
  
  // Chat history
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;
  
  // Layout management
  updatePanelState: (panelId: string, state: Partial<PanelState>) => void;
  updateSplitterState: (splitterId: string, state: Partial<SplitterState>) => void;
  updateWindowSize: (size: WindowSize) => void;
  setActiveTab: (panelId: string, tabId: string) => void;
  
  // Utility actions
  markUnsavedChanges: () => void;
  clearUnsavedChanges: () => void;
  resetSession: () => void;
}

// Default workspace layout
const defaultWorkspaceLayout: WorkspaceLayout = {
  panels: {
    'file-explorer': { visible: true, size: 250, collapsed: false },
    'symbol-explorer': { visible: true, size: 300, collapsed: false },
    'search-panel': { visible: false, size: 300, collapsed: false },
    'ai-chat': { visible: true, size: 400, collapsed: false },
    'bookmarks': { visible: false, size: 250, collapsed: false },
  },
  splitters: {
    'main-horizontal': { position: 0.25, orientation: 'Vertical' },
    'right-vertical': { position: 0.7, orientation: 'Horizontal' },
  },
  window_size: undefined,
  active_tabs: {
    'left-panel': 'file-explorer',
    'right-panel': 'ai-chat',
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      availableSessions: [],
      openFiles: [],
      bookmarks: [],
      searchHistory: [],
      chatHistory: [],
      workspaceLayout: defaultWorkspaceLayout,
      isSessionLoading: false,
      sessionError: null,
      hasUnsavedChanges: false,
      lastAutoSave: null,

      // Initialize or create a new session
      initializeSession: async (projectId: string, projectPath: string) => {
        set({ isSessionLoading: true, sessionError: null });
        
        try {
          const existingSession = await api.loadSession(projectPath);
          
          if (existingSession) {
            // Load existing session data into the store
            set({
              currentSession: existingSession,
              openFiles: existingSession.open_files || [],
              bookmarks: existingSession.bookmarks || [],
              searchHistory: existingSession.search_history || [],
              chatHistory: existingSession.ai_chat_history || [],
              workspaceLayout: existingSession.workspace_layout || defaultWorkspaceLayout,
              isSessionLoading: false,
              hasUnsavedChanges: false,
            });
          } else {
            // Create a new session if one doesn't exist
            const newSession: ProjectSession = {
              project_id: projectId,
              project_path: projectPath,
              open_files: [],
              bookmarks: [],
              search_history: [],
              ai_chat_history: [],
              workspace_layout: defaultWorkspaceLayout,
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
            
            await api.saveSession(projectPath, newSession);
            
            set({
              currentSession: newSession,
              openFiles: [],
              bookmarks: [],
              searchHistory: [],
              chatHistory: [],
              workspaceLayout: defaultWorkspaceLayout,
              isSessionLoading: false,
              hasUnsavedChanges: false,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set({
            sessionError: `Failed to initialize session: ${errorMessage}`,
            isSessionLoading: false,
          });
        }
      },

      // Load an existing session
      loadSession: async (projectId: string, projectPath: string) => {
        set({ isSessionLoading: true, sessionError: null });
        
        try {
          const session = await api.loadSession(projectPath);
          
          if (session) {
            set({
              currentSession: session,
              openFiles: session.open_files || [],
              bookmarks: session.bookmarks || [],
              searchHistory: session.search_history || [],
              chatHistory: session.ai_chat_history || [],
              workspaceLayout: session.workspace_layout || defaultWorkspaceLayout,
              isSessionLoading: false,
              hasUnsavedChanges: false,
            });
          } else {
            // If no session, initialize a new one
            await get().initializeSession(projectId, projectPath);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set({
            sessionError: `Failed to load session: ${errorMessage}`,
            isSessionLoading: false,
          });
        }
      },

      // Save current session
      saveSession: async () => {
        const state = get();
        if (!state.currentSession) {
          return;
        }

        try {
          const updatedSession: ProjectSession = {
            ...state.currentSession,
            open_files: state.openFiles,
            bookmarks: state.bookmarks,
            search_history: state.searchHistory,
            ai_chat_history: state.chatHistory,
            workspace_layout: state.workspaceLayout,
            last_updated: new Date().toISOString(),
          };

          await api.saveSession(state.currentSession.project_path, updatedSession);
          
          set({
            currentSession: updatedSession,
            hasUnsavedChanges: false,
            lastAutoSave: new Date().toISOString(),
            sessionError: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set({ sessionError: `Failed to save session: ${errorMessage}` });
        }
      },

      // Delete a session
      deleteSession: async (projectId: string) => {
        try {
          await api.deleteSession(projectId);
          
          const state = get();
          if (state.currentSession?.project_id === projectId) {
            get().resetSession();
          }
          await get().listSessions();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set({ sessionError: `Failed to delete session: ${errorMessage}` });
        }
      },

      // List all available sessions
      listSessions: async () => {
        try {
          const sessions = await api.listSessions();
          set({ availableSessions: sessions });
        } catch (error) {
          console.error('Failed to list sessions:', error);
        }
      },

      // Other actions remain the same...

      // File management actions
      openFile: (filePath: string, position?: Position) => {
        const state = get();
        const existingFileIndex = state.openFiles.findIndex(f => f.path === filePath);
        
        const newFile: OpenFile = {
          path: filePath,
          cursor_position: position || { line: 0, column: 0 },
          scroll_position: 0,
          is_active: true,
          last_accessed: new Date().toISOString(),
        };

        let updatedFiles: OpenFile[];
        if (existingFileIndex >= 0) {
          updatedFiles = state.openFiles.map((file, index) => 
            index === existingFileIndex 
              ? { ...newFile, scroll_position: file.scroll_position }
              : { ...file, is_active: false }
          );
        } else {
          updatedFiles = [
            ...state.openFiles.map(f => ({ ...f, is_active: false })),
            newFile
          ];
        }

        set({ openFiles: updatedFiles, hasUnsavedChanges: true });
      },

      closeFile: (filePath: string) => {
        const state = get();
        const updatedFiles = state.openFiles.filter(f => f.path !== filePath);
        
        if (updatedFiles.length > 0 && !updatedFiles.some(f => f.is_active)) {
          updatedFiles[updatedFiles.length - 1].is_active = true;
        }

        set({ openFiles: updatedFiles, hasUnsavedChanges: true });
      },

      updateFilePosition: (filePath: string, position: Position, scrollPosition?: number) => {
        set(state => ({ 
          openFiles: state.openFiles.map(file =>
            file.path === filePath
              ? {
                  ...file,
                  cursor_position: position,
                  scroll_position: scrollPosition ?? file.scroll_position,
                  last_accessed: new Date().toISOString(),
                }
              : file
          ),
          hasUnsavedChanges: true 
        }));
      },

      setActiveFile: (filePath: string) => {
        set(state => ({
          openFiles: state.openFiles.map(file => ({
            ...file,
            is_active: file.path === filePath,
            last_accessed: file.path === filePath ? new Date().toISOString() : file.last_accessed,
          })),
          hasUnsavedChanges: true
        }));
      },

      updateFileSelection: (filePath: string, selection?: Range) => {
        set(state => ({
          openFiles: state.openFiles.map(file =>
            file.path === filePath ? { ...file, selection } : file
          ),
          hasUnsavedChanges: true
        }));
      },

      addBookmark: (bookmark: Omit<Bookmark, 'id' | 'created_at'>) => {
        const newBookmark: Bookmark = {
          ...bookmark,
          id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
        };
        set(state => ({ bookmarks: [...state.bookmarks, newBookmark], hasUnsavedChanges: true }));
      },

      removeBookmark: (bookmarkId: string) => {
        set(state => ({ bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId), hasUnsavedChanges: true }));
      },

      updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => {
        set(state => ({
          bookmarks: state.bookmarks.map(b => b.id === bookmarkId ? { ...b, ...updates } : b),
          hasUnsavedChanges: true
        }));
      },

      addSearchQuery: (query: string) => {
        set(state => ({
          searchHistory: [query, ...state.searchHistory.filter(q => q !== query)].slice(0, 50),
          hasUnsavedChanges: true
        }));
      },

      clearSearchHistory: () => {
        set({ searchHistory: [], hasUnsavedChanges: true });
      },

      addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        set(state => ({
          chatHistory: [...state.chatHistory, newMessage].slice(-1000),
          hasUnsavedChanges: true
        }));
      },

      clearChatHistory: () => {
        set({ chatHistory: [], hasUnsavedChanges: true });
      },

      updatePanelState: (panelId: string, state: Partial<PanelState>) => {
        set(currentState => ({
          workspaceLayout: { ...currentState.workspaceLayout, panels: { ...currentState.workspaceLayout.panels, [panelId]: { ...currentState.workspaceLayout.panels[panelId], ...state } } },
          hasUnsavedChanges: true
        }));
      },

      updateSplitterState: (splitterId: string, state: Partial<SplitterState>) => {
        set(currentState => ({
          workspaceLayout: { ...currentState.workspaceLayout, splitters: { ...currentState.workspaceLayout.splitters, [splitterId]: { ...currentState.workspaceLayout.splitters[splitterId], ...state } } },
          hasUnsavedChanges: true
        }));
      },

      updateWindowSize: (size: WindowSize) => {
        set(state => ({
          workspaceLayout: { ...state.workspaceLayout, window_size: size },
          hasUnsavedChanges: true
        }));
      },

      setActiveTab: (panelId: string, tabId: string) => {
        set(state => ({
          workspaceLayout: { ...state.workspaceLayout, active_tabs: { ...state.workspaceLayout.active_tabs, [panelId]: tabId } },
          hasUnsavedChanges: true
        }));
      },

      markUnsavedChanges: () => set({ hasUnsavedChanges: true }),
      clearUnsavedChanges: () => set({ hasUnsavedChanges: false }),

      resetSession: () => {
        set({
          currentSession: null,
          openFiles: [],
          bookmarks: [],
          searchHistory: [],
          chatHistory: [],
          workspaceLayout: defaultWorkspaceLayout,
          hasUnsavedChanges: false,
          lastAutoSave: null,
          sessionError: null,
        });
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workspaceLayout: state.workspaceLayout,
        searchHistory: state.searchHistory.slice(0, 10),
      }),
    }
  )
);

// Auto-save hook for session data
export const useAutoSave = () => {
  const saveSession = useSessionStore(state => state.saveSession);
  const hasUnsavedChanges = useSessionStore(state => state.hasUnsavedChanges);
  const currentSession = useSessionStore(state => state.currentSession);

  React.useEffect(() => {
    if (!currentSession || !hasUnsavedChanges) {
      return;
    }
    const interval = setInterval(() => {
      saveSession();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveSession, hasUnsavedChanges, currentSession]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && currentSession) {
        saveSession();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveSession, hasUnsavedChanges, currentSession]);
};