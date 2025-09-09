// [[SECONDARY_MIND_DESKTOP]]/src/store/appStore.ts
// Purpose: Enhanced Zustand store with persistent project management and note handling capabilities.
// Architecture: Extended state management that integrates with the new persistence layer and project configurations.
// Dependencies: Enhanced API layer, new type definitions, existing Zustand patterns.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { api, AnalysisResult, GitStatus, RecentProjects, ProjectNote, DevelopmentProfile, isDevelopmentMode } from '../api';

interface AppState {
  // Current project state
  currentProject: AnalysisResult | null;
  gitStatus: GitStatus | null;
  
  // Recent projects
  recentProjects: RecentProjects | null;
  
  // Notes state
  projectNotes: ProjectNote[];
  isNotesLoading: boolean;
  
  // Profile state
  developmentProfiles: DevelopmentProfile[];
  activeProfile: DevelopmentProfile | null;
  isProfilesLoading: boolean;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  
  // Theme actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
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
  
  // Profile actions
  loadProfiles: (projectPath: string) => Promise<void>;
  createProfile: (name: string, description: string | undefined, tags: string[], files: string[]) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<DevelopmentProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  useProfile: (profileId: string) => Promise<void>;
  clearActiveProfile: () => void;
  exportProfile: (profileId: string, format: 'json' | 'yaml' | 'xml') => Promise<string>;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
  // Initial state
  currentProject: null,
  gitStatus: null,
  recentProjects: null,
  projectNotes: [],
  isNotesLoading: false,
  developmentProfiles: [],
  activeProfile: null,
  isProfilesLoading: false,
  isLoading: false,
  error: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

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

      // Load project notes and profiles
      await get().loadProjectNotes(projectPath);
      await get().loadProfiles(projectPath);
      
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
      developmentProfiles: [],
      activeProfile: null,
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

  // Load development profiles for current project
  loadProfiles: async (projectPath: string) => {
    set({ isProfilesLoading: true });
    try {
      const profiles = await api.loadDevelopmentProfiles(projectPath);
      set({ developmentProfiles: profiles, isProfilesLoading: false });
    } catch (error) {
      console.error('Failed to load profiles:', error);
      set({ developmentProfiles: [], isProfilesLoading: false });
    }
  },

  // Create a new development profile
  createProfile: async (name: string, description: string | undefined, tags: string[], files: string[]) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      const profile = await api.createDevelopmentProfile(name, description, tags, files, currentProject.project_path);
      
      set(state => ({
        developmentProfiles: [profile, ...state.developmentProfiles]
      }));
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  },

  // Update an existing profile
  updateProfile: async (profileId: string, updates: Partial<DevelopmentProfile>) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      const updatedProfile = await api.updateDevelopmentProfile(profileId, updates, currentProject.project_path);
      
      set(state => ({
        developmentProfiles: state.developmentProfiles.map(p => 
          p.id === profileId ? updatedProfile : p
        ),
        activeProfile: state.activeProfile?.id === profileId ? updatedProfile : state.activeProfile
      }));
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  // Delete a profile
  deleteProfile: async (profileId: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      await api.deleteDevelopmentProfile(profileId, currentProject.project_path);
      
      set(state => ({
        developmentProfiles: state.developmentProfiles.filter(p => p.id !== profileId),
        activeProfile: state.activeProfile?.id === profileId ? null : state.activeProfile
      }));
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  },

  // Use/activate a profile
  useProfile: async (profileId: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      const profile = await api.useDevelopmentProfile(profileId, currentProject.project_path);
      
      set(state => ({
        activeProfile: profile,
        developmentProfiles: state.developmentProfiles.map(p => 
          p.id === profileId ? profile : p
        )
      }));
    } catch (error) {
      console.error('Failed to use profile:', error);
      throw error;
    }
  },

  // Clear active profile
  clearActiveProfile: () => {
    set({ activeProfile: null });
  },

  // Export profile context
  exportProfile: async (profileId: string, format: 'json' | 'yaml' | 'xml' = 'json') => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      return await api.exportProfileContext(profileId, currentProject.project_path, format);
    } catch (error) {
      console.error('Failed to export profile:', error);
      throw error;
    }
  },

  // Toggle between light and dark theme
  toggleTheme: () => {
    const { theme } = get();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Set specific theme
  setTheme: (theme: 'light' | 'dark') => {
    set({ theme });
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
})))

// Integration: Enhanced store that provides complete project and note management functionality to React components.
// Notes: Automatically loads project notes when switching projects and maintains proper state synchronization.