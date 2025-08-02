// [[SECONDARY_MIND_DESKTOP]]/src/store/appStore.ts
// Purpose: Enhanced Zustand store with persistent project management and note handling capabilities.
// Architecture: Extended state management that integrates with the new persistence layer and project configurations.
// Dependencies: Enhanced API layer, new type definitions, existing Zustand patterns.

import { create } from 'zustand';
import { api, AnalysisResult, GitStatus, RecentProjects, ProjectNote, isDevelopmentMode } from '../api';

interface AppState {
  // Current project state
  currentProject: AnalysisResult | null;
  gitStatus: GitStatus | null;
  
  // Recent projects
  recentProjects: RecentProjects | null;
  
  // Notes state
  projectNotes: ProjectNote[];
  isNotesLoading: boolean;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeApp: () => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  loadProject: (projectPath: string) => Promise<void>;
  removeProjectFromRecent: (projectId: string) => Promise<void>;
  refreshGitStatus: () => Promise<void>;
  synthesizeGuidance: (query: string) => Promise<string>;
  clearProject: () => void;
  
  // Note actions
  loadProjectNotes: (projectPath: string) => Promise<void>;
  saveNote: (note: ProjectNote) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<ProjectNote>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentProject: null,
  gitStatus: null,
  recentProjects: null,
  projectNotes: [],
  isNotesLoading: false,
  isLoading: false,
  error: null,

  // Initialize app and load recent projects
  initializeApp: async () => {
    try {
      await api.initializeApp();
      await get().loadRecentProjects();
      
      if (isDevelopmentMode()) {
        console.log('🔧 Running in development mode - Tauri backend not available');
      }
    } catch (error) {
      set({ error: `Failed to initialize app: ${error}` });
    }
  },

  // Load recent projects from persistent storage
  loadRecentProjects: async () => {
    try {
      const recentProjects = await api.loadRecentProjects();
      set({ recentProjects });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      set({ recentProjects: { projects: [], last_updated: new Date().toISOString() } });
    }
  },

  // Load and analyze a project
  loadProject: async (projectPath: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const analysisResult = await api.analyzeProject(projectPath);
      const gitStatus = await api.getProjectGitStatus();
      
      set({
        currentProject: analysisResult,
        gitStatus,
        isLoading: false,
        error: null,
      });

      // Load project notes
      await get().loadProjectNotes(projectPath);
      
      // Refresh recent projects to update last accessed time
      await get().loadRecentProjects();
    } catch (error) {
      set({
        error: `Failed to load project: ${error}`,
        isLoading: false,
      });
    }
  },

  // Remove project from recent projects list
  removeProjectFromRecent: async (projectId: string) => {
    try {
      await api.removeProjectFromRecent(projectId);
      await get().loadRecentProjects(); // Refresh the list
    } catch (error) {
      console.error('Failed to remove project from recent:', error);
    }
  },

  // Refresh Git status for current project
  refreshGitStatus: async () => {
    try {
      const gitStatus = await api.getProjectGitStatus();
      set({ gitStatus });
    } catch (error) {
      console.error('Failed to refresh git status:', error);
    }
  },

  // Get AI guidance for current project
  synthesizeGuidance: async (query: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }
    
    return await api.synthesizeGuidance(query);
  },

  // Clear current project
  clearProject: () => {
    set({
      currentProject: null,
      gitStatus: null,
      projectNotes: [],
      error: null,
    });
  },

  // Load notes for the current project
  loadProjectNotes: async (projectPath: string) => {
    set({ isNotesLoading: true });
    try {
      const notes = await api.loadProjectNotes(projectPath);
      set({ projectNotes: notes, isNotesLoading: false });
    } catch (error) {
      console.error('Failed to load project notes:', error);
      set({ projectNotes: [], isNotesLoading: false });
    }
  },

  // Save a note (create or update)
  saveNote: async (note: ProjectNote) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      // Update the note with current timestamp
      const updatedNote = {
        ...note,
        last_modified: new Date().toISOString(),
      };

      await api.saveProjectNote(currentProject.project_path, updatedNote);
      
      // Update local state
      set(state => ({
        projectNotes: state.projectNotes.some(n => n.id === note.id)
          ? state.projectNotes.map(n => n.id === note.id ? updatedNote : n)
          : [updatedNote, ...state.projectNotes]
      }));
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  },

  // Delete a note
  deleteNote: async (noteId: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      await api.deleteProjectNote(currentProject.project_path, noteId);
      
      // Update local state
      set(state => ({
        projectNotes: state.projectNotes.filter(n => n.id !== noteId)
      }));
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  },

  // Update note locally (for immediate UI feedback)
  updateNote: (noteId: string, updates: Partial<ProjectNote>) => {
    set(state => ({
      projectNotes: state.projectNotes.map(note =>
        note.id === noteId 
          ? { ...note, ...updates, last_modified: new Date().toISOString() }
          : note
      )
    }));
  },
}));

// Integration: Enhanced store that provides complete project and note management functionality to React components.
// Notes: Automatically loads project notes when switching projects and maintains proper state synchronization.