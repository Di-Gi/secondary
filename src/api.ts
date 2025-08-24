// [[PROJECT_NAME]]/src/api.ts
// Purpose: [Enhanced API layer with expanded type definitions to support polyglot symbol analysis.]
// Architecture: [This file defines the contract between the frontend and the Tauri backend. The `Symbol` interface is updated to include Rust-specific kinds, aligning with the core Rust model.]
// Dependencies: [@tauri-apps/api/tauri for backend invocation.]
import { invoke } from '@tauri-apps/api/tauri';

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
      // UPDATED MOCK with Rust symbols
      return {
        symbols: [
          {
            identifier: 'UserService',
            kind: 'TSClass',
            location: { path: '/src/services/user.ts', line: 15, column: 1 }
          },
          {
            identifier: 'authenticateUser',
            kind: 'TSFunction',
            location: { path: '/src/auth/auth.ts', line: 23, column: 1 }
          },
          {
            identifier: 'AppState',
            kind: 'Struct',
            location: { path: '/src/main.rs', line: 42, column: 1 }
          },
           {
            identifier: 'run_analysis',
            kind: 'Function',
            location: { path: '/src/analysis.rs', line: 88, column: 1 }
          },
        ],
        git_status: ['main', 'Up-to-date with origin/main'],
        project_path: projectPath,
        project_config: MOCK_RECENT_PROJECTS.projects[0],
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
      return {
        local_branch: 'main',
        remote_status: 'Up-to-date with origin/main'
      };
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

  async readFileContent(filePath: string): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('read_file_content', { filePath });
      } catch (error) {
        console.error('Failed to read file:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock file content');
      await new Promise(resolve => setTimeout(resolve, 300));
      return `// Mock file content for: ${filePath}
export class UserService {
  constructor() {
    // Mock implementation
  }
  
  async authenticateUser(credentials: any) {
    // Authentication logic here
    return { success: true };
  }
}`;
    }
  },
};

// Utility to check current mode
export const isDevelopmentMode = () => !isTauri();
// Integration: [This file is imported by `appStore.ts` and various UI components. The updated `Symbol` interface ensures type safety when handling data from the polyglot backend.]
// Notes: [The `Symbol` kind is now a union of all possible kinds from the Rust backend, ensuring compile-time safety. The mock data has also been updated to reflect this.]