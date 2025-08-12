// [[SECONDARY_MIND_DESKTOP]]/src/store/appStore.ts
// Purpose: Enhanced Zustand store with persistent project management and note handling capabilities.
// Architecture: Extended state management that integrates with the new persistence layer and project configurations.
// Dependencies: Enhanced API layer, new type definitions, existing Zustand patterns.

import { create } from 'zustand';
import { api, AnalysisResult, GitStatus, RecentProjects, ProjectNote, SearchRequest, SearchResult, AIRequest, AIResponse, isDevelopmentMode } from '../api';
import { 
  NavigationLocation, 
  NavigationSession, 
  NavigationHistory, 
  NavigationContext,
  PerformanceMetrics,
  NavigationHistoryEntry,
  HistorySession,
  HistoryGroupingStrategy
} from '../types/navigation';
import { navigationEventHelpers } from '../lib/navigationEventBus';
import {
  groupEntriesIntoSessions,
  createEnhancedHistoryEntry,
  analyzeNavigationHistory,
  cleanupHistory,
  optimizeHistory,
  HistoryInsights
} from '../lib/navigationHistoryUtils';

interface AppState {
  // Current project state
  currentProject: AnalysisResult | null;
  gitStatus: GitStatus | null;
  
  // Recent projects
  recentProjects: RecentProjects | null;
  
  // Notes state
  projectNotes: ProjectNote[];
  isNotesLoading: boolean;
  
  // Search state
  searchResults: SearchResult[];
  isSearching: boolean;
  searchHistory: string[];
  
  // AI state
  aiResponses: AIResponse[];
  isAIProcessing: boolean;
  
  // Session state
  currentSession: any;
  isSessionLoading: boolean;
  
  // Enhanced Navigation state
  currentLocation: NavigationLocation | null;
  navigationHistory: NavigationHistory | null;
  navigationSessions: NavigationSession[];
  activeNavigationSession: NavigationSession | null;
  navigationContext: NavigationContext | null;
  navigationMetrics: PerformanceMetrics | null;
  
  // Enhanced History state
  historyInsights: HistoryInsights | null;
  historyGroupingStrategy: HistoryGroupingStrategy;
  isHistoryAnalyzing: boolean;
  
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
  
  // Enhanced search actions
  searchSymbols: (request: SearchRequest) => Promise<SearchResult[]>;
  clearSearchResults: () => void;
  addToSearchHistory: (query: string) => void;
  
  // Enhanced AI actions
  enhancedAISynthesis: (request: AIRequest) => Promise<AIResponse>;
  clearAIResponses: () => void;
  
  // Session actions
  saveSession: (sessionData: any) => Promise<void>;
  loadSession: () => Promise<void>;
  
  // Enhanced Navigation actions
  setCurrentLocation: (location: NavigationLocation) => void;
  addToNavigationHistory: (location: NavigationLocation) => void;
  loadNavigationHistory: () => Promise<void>;
  saveNavigationHistory: () => Promise<void>;
  clearNavigationHistory: () => void;
  navigateBack: () => NavigationLocation | null;
  navigateForward: () => NavigationLocation | null;
  
  // Enhanced History actions
  addEnhancedHistoryEntry: (location: NavigationLocation, action?: string, trigger?: string, duration?: number) => void;
  groupHistoryIntoSessions: () => void;
  analyzeHistory: () => Promise<void>;
  setHistoryGroupingStrategy: (strategy: HistoryGroupingStrategy) => void;
  optimizeNavigationHistory: () => void;
  getHistoryInsights: () => HistoryInsights | null;
  createNavigationSession: (name: string, description?: string) => NavigationSession;
  saveNavigationSession: (session: NavigationSession) => Promise<void>;
  loadNavigationSession: (sessionId?: string) => Promise<void>;
  loadAllNavigationSessions: () => Promise<void>;
  setActiveNavigationSession: (session: NavigationSession) => void;
  deleteNavigationSession: (sessionId: string) => Promise<void>;
  updateNavigationContext: (context: Partial<NavigationContext>) => void;
  getNavigationMetrics: () => Promise<void>;
  updateNavigationMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  
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
  searchResults: [],
  isSearching: false,
  searchHistory: [],
  aiResponses: [],
  isAIProcessing: false,
  currentSession: null,
  isSessionLoading: false,
  
  // Enhanced Navigation initial state
  currentLocation: null,
  navigationHistory: null,
  navigationSessions: [],
  activeNavigationSession: null,
  navigationContext: null,
  navigationMetrics: null,
  
  // Enhanced History initial state
  historyInsights: null,
  historyGroupingStrategy: 'time-based',
  isHistoryAnalyzing: false,
  
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

      // Load project notes and session
      await Promise.all([
        get().loadProjectNotes(projectPath),
        get().loadSession(),
      ]);
      
      // Start file watching for real-time updates
      try {
        await api.startFileWatching(projectPath);
      } catch (error) {
        console.warn('File watching not available:', error);
      }
      
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

  // Enhanced search functionality
  searchSymbols: async (request: SearchRequest) => {
    const startTime = Date.now();
    set({ isSearching: true });
    try {
      const results = await api.searchSymbols(request);
      const searchTime = Date.now() - startTime;
      
      set({ searchResults: results, isSearching: false });
      get().addToSearchHistory(request.query);

      // Emit search performed event
      navigationEventHelpers.emitSearchPerformed(request.query, results, 'AppStore', searchTime);
      
      return results;
    } catch (error) {
      set({ isSearching: false, error: `Search failed: ${error}` });
      throw error;
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] });
  },

  addToSearchHistory: (query: string) => {
    set(state => ({
      searchHistory: [query, ...state.searchHistory.filter(q => q !== query)].slice(0, 10)
    }));
  },

  // Enhanced AI synthesis
  enhancedAISynthesis: async (request: AIRequest) => {
    set({ isAIProcessing: true });
    try {
      const response = await api.enhancedAISynthesis(request);
      set(state => ({
        aiResponses: [response, ...state.aiResponses].slice(0, 20),
        isAIProcessing: false
      }));
      return response;
    } catch (error) {
      set({ isAIProcessing: false, error: `AI synthesis failed: ${error}` });
      throw error;
    }
  },

  clearAIResponses: () => {
    set({ aiResponses: [] });
  },

  // Session management
  saveSession: async (sessionData: any) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      await api.saveSession(currentProject.project_path, sessionData);
      set({ currentSession: sessionData });
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  },

  loadSession: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isSessionLoading: true });
    try {
      const session = await api.loadSession(currentProject.project_path);
      set({ currentSession: session, isSessionLoading: false });
    } catch (error) {
      console.error('Failed to load session:', error);
      set({ isSessionLoading: false });
    }
  },

  // ============================================================================
  // Enhanced Navigation Actions
  // ============================================================================

  // Set current navigation location
  setCurrentLocation: (location: NavigationLocation) => {
    const previousLocation = get().currentLocation;
    set({ currentLocation: location });
    get().addToNavigationHistory(location);
    
    // Update navigation context
    get().updateNavigationContext({
      breadcrumbs: [], // Will be populated by breadcrumb component
      relatedSymbols: location.symbol ? [location.symbol] : []
    });

    // Emit location changed event
    navigationEventHelpers.emitLocationChanged(location, 'AppStore', previousLocation);
  },

  // Add location to navigation history (legacy method for compatibility)
  addToNavigationHistory: (location: NavigationLocation) => {
    get().addEnhancedHistoryEntry(location, 'navigate', 'click', 0);
  },

  // Add enhanced history entry with full metadata
  addEnhancedHistoryEntry: (location: NavigationLocation, action: string = 'navigate', trigger: string = 'click', duration: number = 0) => {
    set(state => {
      const currentHistory = state.navigationHistory || {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: state.historyGroupingStrategy
      };

      // Don't add duplicate consecutive entries
      const lastEntry = currentHistory.entries[currentHistory.entries.length - 1];
      if (lastEntry && 
          lastEntry.location.filePath === location.filePath &&
          lastEntry.location.position.line === location.position.line &&
          lastEntry.location.position.column === location.position.column) {
        return state;
      }

      // Create enhanced history entry with proper metadata
      const newEntry = createEnhancedHistoryEntry(
        location,
        action as any,
        trigger as any,
        state.activeNavigationSession?.id || 'default',
        duration
      );

      const updatedEntries = [...currentHistory.entries, newEntry];
      
      // Optimize history to remove duplicates and limit size
      const optimizedHistory = optimizeHistory({
        ...currentHistory,
        entries: updatedEntries,
        currentIndex: updatedEntries.length - 1
      }, currentHistory.maxEntries);

      return {
        navigationHistory: optimizedHistory
      };
    });
    
    // Auto-group sessions and analyze history
    get().groupHistoryIntoSessions();
    
    // Auto-save history periodically
    get().saveNavigationHistory();
  },

  // Clear navigation history
  clearNavigationHistory: () => {
    set({
      navigationHistory: {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      }
    });
  },

  // Navigate back in history
  navigateBack: () => {
    const { navigationHistory } = get();
    if (!navigationHistory || navigationHistory.currentIndex <= 0) {
      return null;
    }

    const newIndex = navigationHistory.currentIndex - 1;
    const targetLocation = navigationHistory.entries[newIndex].location;

    set({
      navigationHistory: {
        ...navigationHistory,
        currentIndex: newIndex
      },
      currentLocation: targetLocation
    });

    return targetLocation;
  },

  // Navigate forward in history
  navigateForward: () => {
    const { navigationHistory } = get();
    if (!navigationHistory || navigationHistory.currentIndex >= navigationHistory.entries.length - 1) {
      return null;
    }

    const newIndex = navigationHistory.currentIndex + 1;
    const targetLocation = navigationHistory.entries[newIndex].location;

    set({
      navigationHistory: {
        ...navigationHistory,
        currentIndex: newIndex
      },
      currentLocation: targetLocation
    });

    return targetLocation;
  },

  // Load navigation history from storage
  loadNavigationHistory: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const history = await api.loadNavigationHistory(currentProject.project_path);
      if (history) {
        set({ navigationHistory: history });
      }
    } catch (error) {
      console.error('Failed to load navigation history:', error);
    }
  },

  // Save navigation history to storage
  saveNavigationHistory: async () => {
    const { currentProject, navigationHistory } = get();
    if (!currentProject || !navigationHistory) return;

    try {
      await api.saveNavigationHistory(currentProject.project_path, navigationHistory);
    } catch (error) {
      console.error('Failed to save navigation history:', error);
    }
  },

  // Create a new navigation session
  createNavigationSession: (name: string, description?: string) => {
    const { currentProject } = get();
    
    const session: NavigationSession = {
      id: `session-${Date.now()}`,
      name,
      description,
      locations: [],
      layout: {
        panelSizes: new Map([
          ['minimap', 200],
          ['fileTree', 250],
          ['relationshipGraph', 300]
        ]),
        visiblePanels: ['minimap', 'fileTree', 'breadcrumbs'],
        minimapSettings: {
          zoomLevel: 1,
          showSymbolTypes: true,
          showComplexity: false,
          autoUpdate: true,
          renderQuality: 'medium',
          maxFileSize: 1024 * 1024
        },
        treeSettings: {
          showHiddenFiles: false,
          showGitStatus: true,
          showFileIcons: true,
          sortBy: 'name',
          sortOrder: 'asc',
          virtualScrolling: true,
          previewOnHover: true
        },
        graphSettings: {
          defaultLayout: 'force-directed',
          nodeSize: 20,
          edgeWidth: 2,
          animationSpeed: 1000,
          showLabels: true,
          clusterNodes: false,
          maxNodes: 100
        },
        breadcrumbSettings: {
          maxSegments: 8,
          showFileExtensions: true,
          showSymbolTypes: true,
          truncationStrategy: 'intelligent',
          showTooltips: true
        }
      },
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {
        projectPath: currentProject?.project_path || '',
        totalTimeSpent: 0,
        locationCount: 0,
        tags: [],
        isShared: false,
        version: 1
      }
    };

    set(state => ({
      navigationSessions: [...state.navigationSessions, session]
    }));

    return session;
  },

  // Save navigation session
  saveNavigationSession: async (session: NavigationSession) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await api.saveNavigationSession(currentProject.project_path, session);
      
      set(state => ({
        navigationSessions: state.navigationSessions.map(s => 
          s.id === session.id ? session : s
        )
      }));

      // Emit session saved event
      navigationEventHelpers.emitSessionSaved(session, 'AppStore');
    } catch (error) {
      console.error('Failed to save navigation session:', error);
      throw error;
    }
  },

  // Load navigation session
  loadNavigationSession: async (sessionId?: string) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const session = await api.loadNavigationSession(currentProject.project_path, sessionId);
      if (session) {
        set({ activeNavigationSession: session });
        
        // Restore session locations to history if needed
        if (session.locations.length > 0) {
          const lastLocation = session.locations[session.locations.length - 1];
          get().setCurrentLocation(lastLocation);
        }

        // Emit session loaded event
        navigationEventHelpers.emitSessionLoaded(session, 'AppStore');
      }
    } catch (error) {
      console.error('Failed to load navigation session:', error);
    }
  },

  // Load all navigation sessions for current project
  loadAllNavigationSessions: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      const sessions = await api.loadAllNavigationSessions(currentProject.project_path);
      if (sessions) {
        set({ navigationSessions: sessions });
      }
    } catch (error) {
      console.error('Failed to load navigation sessions:', error);
      set({ navigationSessions: [] });
    }
  },

  // Set active navigation session
  setActiveNavigationSession: (session: NavigationSession) => {
    set({ activeNavigationSession: session });
    
    // Update session's last accessed time
    const updatedSession = {
      ...session,
      lastAccessed: new Date()
    };
    
    get().saveNavigationSession(updatedSession);
  },

  // Delete navigation session
  deleteNavigationSession: async (sessionId: string) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await api.deleteNavigationSession(currentProject.project_path, sessionId);
      
      set(state => ({
        navigationSessions: state.navigationSessions.filter(s => s.id !== sessionId),
        activeNavigationSession: state.activeNavigationSession?.id === sessionId 
          ? null 
          : state.activeNavigationSession
      }));
    } catch (error) {
      console.error('Failed to delete navigation session:', error);
      throw error;
    }
  },

  // Update navigation context
  updateNavigationContext: (context: Partial<NavigationContext>) => {
    set(state => ({
      navigationContext: state.navigationContext 
        ? { ...state.navigationContext, ...context }
        : {
            projectPath: state.currentProject?.project_path || '',
            breadcrumbs: [],
            relatedSymbols: [],
            ...context
          } as NavigationContext
    }));
  },

  // Get navigation performance metrics
  getNavigationMetrics: async () => {
    try {
      const metrics = await api.getNavigationMetrics();
      if (metrics) {
        set({ navigationMetrics: metrics });
      }
    } catch (error) {
      console.error('Failed to get navigation metrics:', error);
    }
  },

  // Update navigation performance metrics
  updateNavigationMetrics: (metrics: Partial<PerformanceMetrics>) => {
    set(state => ({
      navigationMetrics: state.navigationMetrics 
        ? { ...state.navigationMetrics, ...metrics }
        : {
            navigationResponseTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0,
            backgroundProcessingTime: 0,
            renderTime: 0,
            searchTime: 0,
            symbolAnalysisTime: 0,
            ...metrics
          } as PerformanceMetrics
    }));
  },

  // ============================================================================
  // Enhanced History Management Actions
  // ============================================================================

  // Group history entries into logical sessions
  groupHistoryIntoSessions: () => {
    set(state => {
      if (!state.navigationHistory || state.navigationHistory.entries.length === 0) {
        return state;
      }

      try {
        const sessions = groupEntriesIntoSessions(state.navigationHistory.entries);
        
        return {
          navigationHistory: {
            ...state.navigationHistory,
            sessions
          }
        };
      } catch (error) {
        console.error('Failed to group history into sessions:', error);
        return state;
      }
    });
  },

  // Analyze navigation history to generate insights
  analyzeHistory: async () => {
    const { navigationHistory } = get();
    if (!navigationHistory || navigationHistory.entries.length === 0) {
      set({ historyInsights: null });
      return;
    }

    set({ isHistoryAnalyzing: true });

    try {
      // Run analysis in a timeout to avoid blocking UI
      const insights = await new Promise<HistoryInsights>((resolve) => {
        setTimeout(() => {
          const result = analyzeNavigationHistory(navigationHistory);
          resolve(result);
        }, 0);
      });

      set({ 
        historyInsights: insights,
        isHistoryAnalyzing: false 
      });

      // Emit performance warning if needed
      if (insights.totalNavigations > 1000) {
        navigationEventHelpers.emitPerformanceWarning(
          'Large navigation history detected. Consider optimizing.',
          'AppStore',
          { totalNavigations: insights.totalNavigations }
        );
      }
    } catch (error) {
      console.error('Failed to analyze navigation history:', error);
      set({ 
        historyInsights: null,
        isHistoryAnalyzing: false 
      });
    }
  },

  // Set history grouping strategy
  setHistoryGroupingStrategy: (strategy: HistoryGroupingStrategy) => {
    set(state => ({
      historyGroupingStrategy: strategy,
      navigationHistory: state.navigationHistory ? {
        ...state.navigationHistory,
        groupingStrategy: strategy
      } : null
    }));

    // Re-group sessions with new strategy
    get().groupHistoryIntoSessions();
  },

  // Optimize navigation history by removing duplicates and limiting size
  optimizeNavigationHistory: () => {
    set(state => {
      if (!state.navigationHistory) return state;

      try {
        const cleanedHistory = cleanupHistory(state.navigationHistory);
        const optimizedHistory = optimizeHistory(cleanedHistory, cleanedHistory.maxEntries);

        return {
          navigationHistory: optimizedHistory
        };
      } catch (error) {
        console.error('Failed to optimize navigation history:', error);
        return state;
      }
    });

    // Re-analyze after optimization
    get().analyzeHistory();
  },

  // Get current history insights
  getHistoryInsights: () => {
    return get().historyInsights;
  },
}));

// Integration: Enhanced store that provides complete project and note management functionality to React components.
// Notes: Automatically loads project notes when switching projects and maintains proper state synchronization.