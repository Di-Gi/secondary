// [[PROJECT_NAME]]/src/api.ts
// Purpose: [Enhanced API layer with expanded type definitions to support polyglot symbol analysis.]
// Architecture: [This file defines the contract between the frontend and the Tauri backend. The `Symbol` interface is updated to include Rust-specific kinds, aligning with the core Rust model.]
// Dependencies: [@tauri-apps/api/tauri for backend invocation.]
import { invoke } from '@tauri-apps/api/tauri';
import {
  FileStructureAnalysis,
  RelationshipAnalysis,
  EnhancedFileTree,
  NavigationHistoryData,
  NavigationSessionData,
  SymbolUsageAnalysis,
  CallHierarchyAnalysis,
  FunctionReference,
  InheritanceHierarchyAnalysis,
  ClassMember,
  Implementation,
  NavigationMetrics,
  GitFileStatus,
  NavigationError,
  NavigationErrorType,
  NavigationErrorSeverity,
  NavigationRecoveryStrategy
} from './types/navigation';

// Enhanced type definitions to include Rust symbols
export interface Symbol {
  identifier: string;
  kind:
  // TypeScript / JavaScript
  | 'TSFunction'
  | 'TSClass'
  | 'TSInterface'
  // Rust
  | 'Struct'
  | 'Enum'
  | 'Trait'
  | 'Function'
  | 'Impl'
  | 'Module'
  | 'Macro'
  // Generic
  | 'Unknown';
  location: {
    path: string;
    line: number;
    column: number;
  };
}

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  created_at: string;
  last_accessed: string;
  symbol_count: number;
  git_branch?: string;
  git_status?: string;
  notes_count: number;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  auto_analyze: boolean;
  analysis_cache_enabled: boolean;
  excluded_patterns: string[];
  custom_tags: string[];
}

export interface RecentProjects {
  projects: ProjectConfig[];
  last_updated: string;
}

export interface AnalysisResult {
  symbols: Symbol[];
  git_status?: [string, string];
  project_path: string;
  project_config: ProjectConfig;
  analysis_time: string;
  file_count: number;
  cache_hit_rate: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  max_results?: number;
}

export interface SearchFilters {
  symbol_types: string[];
  file_patterns: string[];
  scope: SearchScope;
  max_results?: number;
}

export interface SearchScope {
  type: 'Global' | 'Directory' | 'Files';
  path?: string;
  files?: string[];
}

export interface SearchResult {
  symbol: Symbol;
  relevance_score: number;
  match_type: string;
  context: any;
}

export interface AIRequest {
  query: string;
  context?: any;
  response_type: string;
}

export interface AIResponse {
  content: string;
  confidence_score: number;
  sources: string[];
  response_type: string;
  timestamp: string;
}

export interface GitStatus {
  local_branch: string;
  remote_status: string;
}

export interface ProjectNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  last_modified: string;
  tags: string[];
  is_favorited: boolean;
}

// Check if we're running in Tauri environment
const isTauri = () => {
  try {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  } catch {
    return false;
  }
};

// Check if we're in development mode
export const isDevelopmentMode = () => {
  return !isTauri() || process.env.NODE_ENV === 'development';
};

// Development mode fallback utility
const withDevelopmentFallback = async <T>(
  tauriOperation: () => Promise<T>,
  mockData: T,
  operationName: string,
  delay: number = 300
): Promise<T> => {
  if (isTauri()) {
    try {
      return await tauriOperation();
    } catch (error) {
      if (isDevelopmentMode()) {
        console.warn(`🔧 Development mode: ${operationName} failed, using mock data:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return mockData;
      } else {
        throw handleNavigationError(error, operationName);
      }
    }
  } else {
    console.log(`🔧 Development mode: Using mock ${operationName}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return mockData;
  }
};

// Mock data for development mode (enhanced with project configs)
const MOCK_RECENT_PROJECTS: RecentProjects = {
  projects: [
    {
      id: 'mock1',
      name: 'E-commerce Platform',
      path: '/Users/dev/projects/ecommerce',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      last_accessed: new Date(Date.now() - 3600000).toISOString(),
      symbol_count: 245,
      git_branch: 'feature/checkout-flow',
      git_status: 'Ahead of origin/main by 3 commits',
      notes_count: 12,
      settings: {
        auto_analyze: true,
        analysis_cache_enabled: true,
        excluded_patterns: ['node_modules', 'dist'],
        custom_tags: ['frontend', 'react'],
      },
    },
    {
      id: 'mock2',
      name: 'API Gateway',
      path: '/Users/dev/projects/api-gateway',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      last_accessed: new Date(Date.now() - 86400000 * 2).toISOString(),
      symbol_count: 89,
      git_branch: 'main',
      git_status: 'Up-to-date with origin/main',
      notes_count: 5,
      settings: {
        auto_analyze: true,
        analysis_cache_enabled: true,
        excluded_patterns: ['target', '.git'],
        custom_tags: ['backend', 'rust'],
      },
    },
  ],
  last_updated: new Date().toISOString(),
};

const MOCK_PROJECT_NOTES: ProjectNote[] = [
  {
    id: 'note1',
    title: 'Architecture Overview',
    content: '# System Architecture\n\nThis project uses a microservices approach...',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    last_modified: new Date(Date.now() - 3600000).toISOString(),
    tags: ['architecture', 'overview'],
    is_favorited: true,
  },
];

// Error handling utility
const handleNavigationError = (error: any, operation: string): NavigationError => {
  // If it's already a structured NavigationError from backend
  if (error && typeof error === 'object' && error.error) {
    return {
      code: error.error,
      message: error.user_message || error.message || 'Navigation operation failed',
      details: error.technical_details,
      timestamp: new Date(error.timestamp || Date.now()),
      source: error.component || 'frontend',
      recoverable: error.can_continue || false,
      severity: error.severity || 'Medium',
      recovery_strategy: error.recovery_strategy || { type: 'None' },
      user_message: error.user_message || error.message || 'Navigation operation failed',
      technical_details: error.technical_details || String(error),
      suggested_actions: error.suggested_actions || ['Try again later'],
      can_continue: error.can_continue || false
    };
  }

  // Handle string errors or unknown errors
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';

  // Map common error patterns to NavigationErrorType
  let errorType: NavigationErrorType = 'UNKNOWN_ERROR';
  if (errorMessage.includes('not found')) errorType = 'FILE_NOT_FOUND';
  else if (errorMessage.includes('permission')) errorType = 'PERMISSION_DENIED';
  else if (errorMessage.includes('timeout')) errorType = 'ANALYSIS_TIMEOUT';
  else if (errorMessage.includes('memory')) errorType = 'MEMORY_LIMIT_EXCEEDED';

  return {
    code: errorType,
    message: errorMessage,
    details: error,
    timestamp: new Date(),
    source: 'frontend',
    recoverable: true,
    severity: 'Medium' as NavigationErrorSeverity,
    recovery_strategy: { type: 'Retry', max_attempts: 3, backoff_ms: 1000 },
    user_message: `Failed to ${operation}: ${errorMessage}`,
    technical_details: String(error),
    suggested_actions: ['Try again', 'Check your connection', 'Restart the application'],
    can_continue: true
  };
};

// Enhanced API functions
export const api = {
  async initializeApp(): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('initialize_app');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: App initialization simulated');
    }
  },

  async loadRecentProjects(): Promise<RecentProjects> {
    if (isTauri()) {
      try {
        return await invoke<RecentProjects>('load_recent_projects');
      } catch (error) {
        console.error('Failed to load recent projects:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock recent projects');
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_RECENT_PROJECTS;
    }
  },

  async analyzeProject(projectPath: string): Promise<AnalysisResult> {
    if (isTauri()) {
      try {
        return await invoke<AnalysisResult>('analyze_project', { projectPath });
      } catch (error) {
        console.error('Tauri command failed:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock analysis result');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        symbols: [
          { identifier: 'UserService', kind: 'TSClass', location: { path: '/src/services/user.ts', line: 15, column: 1 } },
          { identifier: 'authenticateUser', kind: 'TSFunction', location: { path: '/src/auth/auth.ts', line: 23, column: 1 } },
          { identifier: 'AppState', kind: 'Struct', location: { path: '/src/main.rs', line: 42, column: 1 } },
          { identifier: 'run_analysis', kind: 'Function', location: { path: '/src/analysis.rs', line: 88, column: 1 } },
        ],
        git_status: ['main', 'Up-to-date with origin/main'],
        project_path: projectPath,
        project_config: MOCK_RECENT_PROJECTS.projects[0],
        analysis_time: '1.42s',
        file_count: 178,
        cache_hit_rate: 0.85,
      };
    }
  },
  async removeProjectFromRecent(projectId: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('remove_project_from_recent', { projectId });
      } catch (error) {
        console.error('Failed to remove project from recent:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Project removal simulated');
    }
  },

  async getProjectGitStatus(): Promise<GitStatus | null> {
    if (isTauri()) {
      try {
        return await invoke<GitStatus | null>('get_project_git_status');
      } catch (error) {
        console.error('Tauri command failed:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock git status');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { local_branch: 'main', remote_status: 'Up-to-date with origin/main' };
    }
  },

  async synthesizeGuidance(query: string): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('synthesize_guidance', { query });
      } catch (error) {
        console.error('Tauri command failed:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock AI response');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return `Mock AI Response: Based on your query "${query}", I found relevant code patterns in your authentication service.`;
    }
  },

  async saveProjectNote(projectPath: string, note: ProjectNote): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('save_project_note', { projectPath, note });
      } catch (error) {
        console.error('Failed to save note:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Note save simulated');
    }
  },

  async loadProjectNotes(projectPath: string): Promise<ProjectNote[]> {
    if (isTauri()) {
      try {
        return await invoke<ProjectNote[]>('load_project_notes', { projectPath });
      } catch (error) {
        console.error('Failed to load notes:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock notes');
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_PROJECT_NOTES;
    }
  },

  async deleteProjectNote(projectPath: string, noteId: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('delete_project_note', { projectPath, noteId });
      } catch (error) {
        console.error('Failed to delete note:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Note deletion simulated');
    }
  },

  // Session management API functions
  async saveSession(projectPath: string, sessionData: any): Promise<void> {
    if (isTauri()) {
      try {
        // Corrected to use the existing backend command for both create and update
        await invoke('save_session', { projectPath, sessionData });
      } catch (error) {
        console.error('Failed to save session:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Session save/create simulated');
    }
  },

  async loadSession(projectPath: string): Promise<any> {
    if (isTauri()) {
      try {
        // Corrected to use the backend's `load_session` command
        return await invoke('load_session', { projectPath });
      } catch (error) {
        // The error "command not found" is a valid result here if the command doesn't exist
        if (typeof error === 'string' && error.includes('not found')) {
          console.warn(`Command 'load_session' not found, treating as no session.`);
          return null;
        }
        console.error('Failed to load session:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock session (null)');
      await new Promise(resolve => setTimeout(resolve, 200));
      return null;
    }
  },

  // These commands are not implemented in the provided backend.
  // They are stubbed here to prevent crashes and log warnings.
  async deleteSession(_projectId: string): Promise<void> {
    console.warn(`[API] The 'delete_session' command is not implemented in the backend.`);
    if (!isTauri()) {
      console.log('🔧 Development mode: Session deletion simulated');
    }
  },

  async listSessions(): Promise<any[]> {
    console.warn(`[API] The 'list_sessions' command is not implemented in the backend.`);
    if (!isTauri()) {
      console.log('🔧 Development mode: Using mock session list (empty)');
      return [];
    }
    return [];
  },

  // Enhanced search functionality
  async searchSymbols(request: SearchRequest): Promise<SearchResult[]> {
    if (isTauri()) {
      try {
        return await invoke<SearchResult[]>('search_symbols', { request });
      } catch (error) {
        console.error('Failed to search symbols:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock search results');
      await new Promise(resolve => setTimeout(resolve, 300));
      return [{ symbol: { identifier: 'UserService', kind: 'TSClass', location: { path: '/src/services/user.ts', line: 15, column: 1 } }, relevance_score: 0.95, match_type: 'exact', context: { snippet: 'class UserService {' } }];
    }
  },

  // Enhanced AI synthesis
  async enhancedAISynthesis(request: AIRequest): Promise<AIResponse> {
    if (isTauri()) {
      try {
        return await invoke<AIResponse>('enhanced_ai_synthesis', { request });
      } catch (error) {
        console.error('Failed to get AI synthesis:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock AI response');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { content: `Enhanced AI Response: Based on your query "${request.query}", I found relevant patterns with high confidence.`, confidence_score: 0.87, sources: ['/src/services/user.ts', '/src/auth/auth.ts'], response_type: request.response_type, timestamp: new Date().toISOString() };
    }
  },

  // File watching
  async startFileWatching(projectPath: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('start_file_watching', { projectPath });
      } catch (error) {
        console.error('Failed to start file watching:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: File watching simulated');
    }
  },

  // ============================================================================
  // Enhanced Navigation API Functions
  // ============================================================================

  // Symbol relationship analysis
  async analyzeSymbolRelationships(symbolId: string, depth: number = 2): Promise<RelationshipAnalysis> {
    if (isTauri()) {
      try {
        return await invoke<RelationshipAnalysis>('analyze_symbol_relationships', { symbolId, depth });
      } catch (error) {
        console.error('Failed to analyze symbol relationships:', error);
        throw handleNavigationError(error, 'analyzeSymbolRelationships');
      }
    } else {
      console.log('🔧 Development mode: Using mock symbol relationships');
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        center_symbol: { identifier: symbolId, kind: 'TSFunction', location: { path: '/src/test.ts', line: 10, column: 1 } },
        relationships: [
          {
            relationship_type: 'calls',
            source: { identifier: symbolId, kind: 'TSFunction', location: { path: '/src/test.ts', line: 10, column: 1 } },
            target: { identifier: 'helperFunction', kind: 'TSFunction', location: { path: '/src/helper.ts', line: 5, column: 1 } },
            strength: 0.8,
            locations: []
          },
          {
            relationship_type: 'references',
            source: { identifier: symbolId, kind: 'TSFunction', location: { path: '/src/test.ts', line: 10, column: 1 } },
            target: { identifier: 'UserInterface', kind: 'TSInterface', location: { path: '/src/types.ts', line: 15, column: 1 } },
            strength: 0.6,
            locations: []
          }
        ],
        analysis_depth: depth,
        total_connections: 2
      };
    }
  },

  // File structure analysis for minimap
  async analyzeFileStructure(filePath: string): Promise<FileStructureAnalysis> {
    if (isTauri()) {
      try {
        return await invoke<FileStructureAnalysis>('analyze_file_structure', { filePath });
      } catch (error) {
        console.error('Failed to analyze file structure:', error);
        throw this.handleNavigationError(error, 'analyzeFileStructure');
      }
    } else {
      console.log('🔧 Development mode: Using mock file structure');
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        outline: [
          { name: 'imports', node_type: 'section', start_line: 1, end_line: 5, children: [] },
          {
            name: 'UserService', node_type: 'class', start_line: 7, end_line: 45, children: [
              { name: 'constructor', node_type: 'method', start_line: 8, end_line: 12, children: [] },
              { name: 'authenticate', node_type: 'method', start_line: 14, end_line: 25, children: [] }
            ]
          }
        ],
        symbol_density: {
          regions: [{ start_line: 1, end_line: 50, density: 0.3, symbol_types: { 'class': 1, 'method': 2 } }],
          max_density: 0.3,
          total_symbols: 3,
          last_updated: new Date().toISOString()
        },
        file_metadata: {
          file_size: 1024,
          last_modified: new Date().toISOString(),
          symbol_count: 3,
          main_symbols: []
        }
      };
    }
  },

  // Navigation history management
  async saveNavigationHistory(projectPath: string, history: NavigationHistoryData): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('save_navigation_history', { projectPath, history });
      } catch (error) {
        console.error('Failed to save navigation history:', error);
        throw handleNavigationError(error, 'saveNavigationHistory');
      }
    } else {
      console.log('🔧 Development mode: Navigation history save simulated');
    }
  },

  async loadNavigationHistory(projectPath: string): Promise<NavigationHistoryData | null> {
    if (isTauri()) {
      try {
        return await invoke<NavigationHistoryData | null>('load_navigation_history', { projectPath });
      } catch (error) {
        console.error('Failed to load navigation history:', error);
        // For history loading, we can gracefully degrade to null
        return null;
      }
    } else {
      console.log('🔧 Development mode: Using mock navigation history');
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        entries: [],
        sessions: [],
        current_index: -1,
        max_entries: 100
      };
    }
  },

  // File tree with enhanced metadata
  async getEnhancedFileTree(directoryPath: string, options?: any): Promise<EnhancedFileTree> {
    if (isTauri()) {
      try {
        return await invoke<EnhancedFileTree>('get_enhanced_file_tree', { directoryPath, options });
      } catch (error) {
        console.error('Failed to get enhanced file tree:', error);
        throw handleNavigationError(error, 'getEnhancedFileTree');
      }
    } else {
      console.log('🔧 Development mode: Using mock enhanced file tree');
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        nodes: [
          {
            id: 'src',
            name: 'src',
            path: '/src',
            node_type: 'directory',
            children: [
              {
                id: 'src/components',
                name: 'components',
                path: '/src/components',
                node_type: 'directory',
                metadata: {
                  symbol_count: 25,
                  file_size: 0,
                  last_modified: new Date().toISOString(),
                  main_symbols: []
                }
              }
            ],
            metadata: {
              symbol_count: 25,
              file_size: 0,
              last_modified: new Date().toISOString(),
              main_symbols: []
            }
          }
        ],
        total_files: 15,
        total_directories: 3,
        analysis_time: '0.2s'
      };
    }
  },

  // Symbol usage analysis
  async analyzeSymbolUsage(symbolId: string): Promise<SymbolUsageAnalysis> {
    if (isTauri()) {
      try {
        return await invoke<SymbolUsageAnalysis>('analyze_symbol_usage', { symbolId });
      } catch (error) {
        console.error('Failed to analyze symbol usage:', error);
        throw handleNavigationError(error, 'analyzeSymbolUsage');
      }
    } else {
      console.log('🔧 Development mode: Using mock symbol usage');
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        symbol: { identifier: symbolId, kind: 'TSFunction', location: { path: '/src/test.ts', line: 10, column: 1 } },
        reference_count: 12,
        call_count: 8,
        last_used: new Date().toISOString(),
        usage_frequency: 0.75,
        hotspots: [
          { file_path: '/src/auth.ts', position: { line: 23, column: 10 }, usage_type: 'call', frequency: 5 },
          { file_path: '/src/user.ts', position: { line: 45, column: 5 }, usage_type: 'reference', frequency: 3 }
        ]
      };
    }
  },

  // Navigation session management (enhanced)
  async saveNavigationSession(projectPath: string, session: NavigationSessionData): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('save_navigation_session', { projectPath, session });
      } catch (error) {
        console.error('Failed to save navigation session:', error);
        throw handleNavigationError(error, 'saveNavigationSession');
      }
    } else {
      console.log('🔧 Development mode: Navigation session save simulated');
    }
  },

  async loadNavigationSession(projectPath: string, sessionId?: string): Promise<NavigationSessionData | null> {
    if (isTauri()) {
      try {
        return await invoke<NavigationSessionData | null>('load_navigation_session', { projectPath, sessionId });
      } catch (error) {
        console.error('Failed to load navigation session:', error);
        // Gracefully degrade for session loading
        return null;
      }
    } else {
      console.log('🔧 Development mode: Using mock navigation session');
      await new Promise(resolve => setTimeout(resolve, 200));
      return null;
    }
  },

  async loadAllNavigationSessions(projectPath: string): Promise<NavigationSessionData[]> {
    if (isTauri()) {
      try {
        return await invoke<NavigationSessionData[]>('load_all_navigation_sessions', { projectPath });
      } catch (error) {
        console.error('Failed to load all navigation sessions:', error);
        // Gracefully degrade to empty array
        return [];
      }
    } else {
      console.log('🔧 Development mode: Using mock navigation sessions list');
      await new Promise(resolve => setTimeout(resolve, 200));
      return [];
    }
  },

  async deleteNavigationSession(projectPath: string, sessionId: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('delete_navigation_session', { projectPath, sessionId });
      } catch (error) {
        console.error('Failed to delete navigation session:', error);
        throw handleNavigationError(error, 'deleteNavigationSession');
      }
    } else {
      console.log('🔧 Development mode: Navigation session deletion simulated');
    }
  },

  // Performance monitoring
  async getNavigationMetrics(): Promise<NavigationMetrics | null> {
    if (isTauri()) {
      try {
        return await invoke<NavigationMetrics>('get_navigation_metrics');
      } catch (error) {
        console.error('Failed to get navigation metrics:', error);
        // Gracefully degrade for metrics
        return null;
      }
    } else {
      console.log('🔧 Development mode: Using mock navigation metrics');
      return {
        navigation_response_time: 45,
        memory_usage: 128,
        cache_hit_rate: 0.85,
        background_processing_time: 120,
        active_sessions: 1
      };
    }
  },

  // Git integration for navigation
  async getFileGitStatus(filePath: string): Promise<GitFileStatus | null> {
    if (isTauri()) {
      try {
        return await invoke<GitFileStatus | null>('get_file_git_status', { filePath });
      } catch (error) {
        console.error('Failed to get file git status:', error);
        // Gracefully degrade for git status
        return null;
      }
    } else {
      console.log('🔧 Development mode: Using mock file git status');
      return {
        status: 'modified',
        branch: 'main',
        last_commit: new Date(Date.now() - 86400000).toISOString()
      };
    }
  },

  // Navigation data cleanup
  async cleanupNavigationData(projectPath: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('cleanup_navigation_data', { projectPath });
      } catch (error) {
        console.error('Failed to cleanup navigation data:', error);
        throw handleNavigationError(error, 'cleanupNavigationData');
      }
    } else {
      console.log('🔧 Development mode: Navigation data cleanup simulated');
    }
  },

  // ============================================================================
  // Context-Specific Action API Functions
  // ============================================================================

  // Function-specific actions
  async analyzeCallHierarchy(functionId: string): Promise<CallHierarchyAnalysis> {
    if (isTauri()) {
      try {
        return await invoke<CallHierarchyAnalysis>('analyze_call_hierarchy', { functionId });
      } catch (error) {
        console.error('Failed to analyze call hierarchy:', error);
        throw handleNavigationError(error, 'analyzeCallHierarchy');
      }
    } else {
      console.log('🔧 Development mode: Using mock call hierarchy');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        function: { identifier: functionId, kind: 'TSFunction', location: { path: '/src/test.ts', line: 10, column: 1 } },
        callers: [
          { identifier: 'mainFunction', kind: 'TSFunction', location: { filePath: '/src/main.ts', position: { line: 15, column: 5 } }, call_count: 3 },
          { identifier: 'helperFunction', kind: 'TSFunction', location: { filePath: '/src/helper.ts', position: { line: 8, column: 2 } }, call_count: 1 }
        ],
        callees: [
          { identifier: 'utilityFunction', kind: 'TSFunction', location: { filePath: '/src/utils.ts', position: { line: 20, column: 1 } }, call_count: 2 },
          { identifier: 'validateInput', kind: 'TSFunction', location: { filePath: '/src/validation.ts', position: { line: 12, column: 1 } }, call_count: 1 }
        ],
        depth_analyzed: 2
      };
    }
  },

  async findFunctionCallers(functionId: string): Promise<FunctionReference[]> {
    if (isTauri()) {
      try {
        return await invoke<FunctionReference[]>('find_function_callers', { functionId });
      } catch (error) {
        console.error('Failed to find function callers:', error);
        throw handleNavigationError(error, 'findFunctionCallers');
      }
    } else {
      console.log('🔧 Development mode: Using mock function callers');
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        {
          identifier: 'mainController',
          kind: 'TSFunction',
          location: { filePath: '/src/controllers/main.ts', position: { line: 25, column: 10 } },
          call_count: 3
        },
        {
          identifier: 'authMiddleware',
          kind: 'TSFunction',
          location: { filePath: '/src/middleware/auth.ts', position: { line: 15, column: 5 } },
          call_count: 1
        }
      ];
    }
  },

  async analyzeFunctionComplexity(functionId: string): Promise<any> {
    if (isTauri()) {
      try {
        return await invoke('analyze_function_complexity', { functionId });
      } catch (error) {
        console.error('Failed to analyze function complexity:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock function complexity');
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        function: { identifier: functionId, kind: 'TSFunction' },
        cyclomaticComplexity: 8,
        cognitiveComplexity: 12,
        linesOfCode: 45,
        parameters: 3,
        returnPaths: 4,
        nestedDepth: 3,
        complexity: 'medium',
        suggestions: [
          'Consider breaking down into smaller functions',
          'Reduce nested conditionals'
        ]
      };
    }
  },

  async extractFunction(projectPath: string, params: { filePath: string; selectedCode: string }): Promise<any> {
    if (isTauri()) {
      try {
        return await invoke('extract_function', { projectPath, params });
      } catch (error) {
        console.error('Failed to extract function:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock function extraction');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: true,
        newFunctionName: 'extractedFunction',
        newFunctionLocation: { path: params.filePath, line: 100, column: 1 },
        modifiedFiles: [params.filePath],
        preview: 'function extractedFunction() {\n  // Extracted code here\n}'
      };
    }
  },

  // Class-specific actions
  async analyzeInheritanceHierarchy(classId: string): Promise<InheritanceHierarchyAnalysis> {
    if (isTauri()) {
      try {
        return await invoke<InheritanceHierarchyAnalysis>('analyze_inheritance_hierarchy', { classId });
      } catch (error) {
        console.error('Failed to analyze inheritance hierarchy:', error);
        throw handleNavigationError(error, 'analyzeInheritanceHierarchy');
      }
    } else {
      console.log('🔧 Development mode: Using mock inheritance hierarchy');
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        class: { identifier: classId, kind: 'TSClass', location: { path: '/src/test.ts', line: 10, column: 1 } },
        parents: [
          { identifier: 'BaseClass', kind: 'TSClass', relationship: 'extends', location: { filePath: '/src/base.ts', position: { line: 5, column: 1 } } },
          { identifier: 'IUserInterface', kind: 'TSInterface', relationship: 'implements', location: { filePath: '/src/interfaces.ts', position: { line: 15, column: 1 } } }
        ],
        children: [
          { identifier: 'AdminUser', kind: 'TSClass', relationship: 'extends', location: { filePath: '/src/admin.ts', position: { line: 8, column: 1 } } },
          { identifier: 'GuestUser', kind: 'TSClass', relationship: 'extends', location: { filePath: '/src/guest.ts', position: { line: 12, column: 1 } } }
        ],
        depth: 3,
        breadth: 5
      };
    }
  },

  async getClassMembers(classId: string): Promise<ClassMember[]> {
    if (isTauri()) {
      try {
        return await invoke<ClassMember[]>('get_class_members', { classId });
      } catch (error) {
        console.error('Failed to get class members:', error);
        throw handleNavigationError(error, 'getClassMembers');
      }
    } else {
      console.log('🔧 Development mode: Using mock class members');
      await new Promise(resolve => setTimeout(resolve, 600));
      return [
        {
          identifier: 'constructor',
          kind: 'TSFunction',
          accessibility: 'public',
          is_static: false,
          parameters: ['name: string', 'email: string']
        },
        {
          identifier: 'getName',
          kind: 'TSFunction',
          accessibility: 'public',
          is_static: false,
          return_type: 'string'
        },
        {
          identifier: 'setEmail',
          kind: 'TSFunction',
          accessibility: 'public',
          is_static: false,
          parameters: ['email: string']
        },
        {
          identifier: 'id',
          kind: 'Property',
          accessibility: 'private',
          is_static: false,
          type: 'string'
        }
      ];
    }
  },

  async findImplementations(interfaceId: string): Promise<Implementation[]> {
    if (isTauri()) {
      try {
        return await invoke<Implementation[]>('find_implementations', { interfaceId });
      } catch (error) {
        console.error('Failed to find implementations:', error);
        throw handleNavigationError(error, 'findImplementations');
      }
    } else {
      console.log('🔧 Development mode: Using mock implementations');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          identifier: 'UserService',
          kind: 'TSClass',
          location: { filePath: '/src/services/user.ts', position: { line: 10, column: 1 } },
          implements_interface: interfaceId
        },
        {
          identifier: 'AdminService',
          kind: 'TSClass',
          location: { filePath: '/src/services/admin.ts', position: { line: 15, column: 1 } },
          implements_interface: interfaceId
        }
      ];
    }
  },

  async generateClassDiagram(classId: string): Promise<any> {
    if (isTauri()) {
      try {
        return await invoke('generate_class_diagram', { classId });
      } catch (error) {
        console.error('Failed to generate class diagram:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock class diagram');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        diagramType: 'UML',
        format: 'mermaid',
        content: `classDiagram
          class ${classId} {
            +String name
            +String email
            +getName() String
            +setEmail(email: String)
          }
          BaseClass <|-- ${classId}
          ${classId} ..|> IUserInterface`,
        relatedClasses: ['BaseClass', 'IUserInterface'],
        generatedAt: new Date().toISOString()
      };
    }
  },

  async extractInterface(classId: string): Promise<any> {
    if (isTauri()) {
      try {
        return await invoke('extract_interface', { classId });
      } catch (error) {
        console.error('Failed to extract interface:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock interface extraction');
      await new Promise(resolve => setTimeout(resolve, 1800));
      return {
        success: true,
        interfaceName: `I${classId}`,
        interfaceContent: `interface I${classId} {
  getName(): string;
  setEmail(email: string): void;
}`,
        extractedMethods: ['getName', 'setEmail'],
        modifiedFiles: [`/src/interfaces/I${classId}.ts`]
      };
    }
  },
};

// Utility to check current mode
