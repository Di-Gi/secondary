// [[PROJECT_NAME]]/src/api.ts
// Purpose: [Enhanced API layer with expanded type definitions to support polyglot symbol analysis.]
// Architecture: [This file defines the contract between the frontend and the Tauri backend. The `Symbol` interface is updated to include Rust-specific kinds, aligning with the core Rust model.]
// Dependencies: [@tauri-apps/api/tauri for backend invocation.]
import { invoke } from '@tauri-apps/api/tauri';

// Enhanced type definitions to include Rust symbols and relationships
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
  relationships: SymbolRelationship[];
}

export interface SymbolRelationship {
  target: string;
  target_file: string;
  relationship_type: 
    | 'Imports'
    | 'ImportedBy'
    | 'Uses'
    | 'UsedBy'
    | 'Extends'
    | 'Implements'
    | 'TestedBy'
    | 'Tests'
    | 'ConfiguredBy'
    | 'Configures';
  metadata?: string;
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

export interface ContextPackage {
  primary_symbol: Symbol;
  used_by: FileContext[];
  dependencies: FileContext[];
  related_files: FileContext[];
  relevance_score: number;
}

export interface FileContext {
  path: string;
  preview: string;
  relationship_type: SymbolRelationship['relationship_type'];
  relevance: number;
  reference_lines: number[];
}

export interface DevelopmentProfile {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  files: string[];
  created_at: string;
  last_used: string;
  usage_count: number;
}

export interface ProfileExport {
  profile: {
    name: string;
    description?: string;
    tags: string[];
    exported_at: string;
  };
  files: {
    path: string;
    content: string;
    status: 'found' | 'missing' | 'error';
  }[];
}

export interface FileStatus {
  path: string;
  exists: boolean;
  last_modified?: string;
}

// Import our improved Tauri detection
import { isTauriAvailable } from './utils/tauri';

// Use our robust Tauri detection
const isTauri = isTauriAvailable;

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

const MOCK_PROFILES: DevelopmentProfile[] = [
  {
    id: 'mock-profile-1',
    name: 'Authentication System',
    description: 'Core authentication and user management components',
    tags: ['auth', 'security', 'frontend'],
    files: [
      'src/components/auth/LoginForm.tsx',
      'src/components/auth/SignupForm.tsx',
      'src/services/authService.ts',
      'src/hooks/useAuth.ts'
    ],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    last_used: new Date(Date.now() - 3600000).toISOString(),
    usage_count: 5
  },
  {
    id: 'mock-profile-2',
    name: 'Dashboard Components',
    description: 'Main dashboard and data visualization components',
    tags: ['dashboard', 'ui', 'charts'],
    files: [
      'src/components/Dashboard.tsx',
      'src/components/charts/LineChart.tsx',
      'src/components/charts/BarChart.tsx',
      'src/utils/chartHelpers.ts'
    ],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    last_used: new Date(Date.now() - 86400000).toISOString(),
    usage_count: 12
  }
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
            location: { path: '/src/services/user.ts', line: 15, column: 1 },
            relationships: []
          },
          {
            identifier: 'authenticateUser',
            kind: 'TSFunction',
            location: { path: '/src/auth/auth.ts', line: 23, column: 1 },
            relationships: []
          },
          {
            identifier: 'AppState',
            kind: 'Struct',
            location: { path: '/src/main.rs', line: 42, column: 1 },
            relationships: []
          },
           {
            identifier: 'run_analysis',
            kind: 'Function',
            location: { path: '/src/analysis.rs', line: 88, column: 1 },
            relationships: []
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

  async collectSymbolContext(symbolIdentifier: string): Promise<ContextPackage> {
    if (isTauri()) {
      try {
        return await invoke<ContextPackage>('collect_symbol_context', { symbolIdentifier });
      } catch (error) {
        console.error('Failed to collect symbol context:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock context');
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        primary_symbol: {
          identifier: symbolIdentifier,
          kind: 'TSClass',
          location: { path: '/src/services/user.ts', line: 15, column: 1 },
          relationships: []
        },
        used_by: [
          {
            path: '/src/controllers/auth.controller.ts',
            preview: '1: import { UserService } from "../services/user";\n15: const userService = new UserService();',
            relationship_type: 'Uses',
            relevance: 0.9,
            reference_lines: [1, 15]
          }
        ],
        dependencies: [
          {
            path: '/src/models/user.model.ts',
            preview: '1: export interface User {\n2:   id: string;\n3:   email: string;\n4: }',
            relationship_type: 'Imports',
            relevance: 0.8,
            reference_lines: []
          }
        ],
        related_files: [
          {
            path: '/src/services/user.test.ts',
            preview: '1: import { UserService } from "./user";\n5: describe("UserService", () => {',
            relationship_type: 'Tests',
            relevance: 0.7,
            reference_lines: [1, 5]
          }
        ],
        relevance_score: 1.0
      };
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

  // Profile Management API
  async createDevelopmentProfile(
    name: string,
    description: string | undefined,
    tags: string[],
    files: string[],
    projectPath: string
  ): Promise<DevelopmentProfile> {
    if (isTauri()) {
      try {
        return await invoke<DevelopmentProfile>('create_development_profile', {
          name,
          description,
          tags,
          files,
          projectPath,
        });
      } catch (error) {
        console.error('Failed to create profile:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Profile creation simulated');
      await new Promise(resolve => setTimeout(resolve, 300));
      const newProfile: DevelopmentProfile = {
        id: `profile_${Date.now()}`,
        name,
        description,
        tags,
        files,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: 0,
      };
      return newProfile;
    }
  },

  async loadDevelopmentProfiles(projectPath: string): Promise<DevelopmentProfile[]> {
    if (isTauri()) {
      try {
        return await invoke<DevelopmentProfile[]>('load_development_profiles', { projectPath });
      } catch (error) {
        console.error('Failed to load profiles:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Using mock profiles');
      await new Promise(resolve => setTimeout(resolve, 200));
      return MOCK_PROFILES;
    }
  },

  async updateDevelopmentProfile(
    profileId: string,
    updates: {
      name?: string;
      description?: string;
      tags?: string[];
      files?: string[];
    },
    projectPath: string
  ): Promise<DevelopmentProfile> {
    if (isTauri()) {
      try {
        return await invoke<DevelopmentProfile>('update_development_profile', {
          profileId,
          name: updates.name,
          description: updates.description,
          tags: updates.tags,
          files: updates.files,
          projectPath,
        });
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Profile update simulated');
      await new Promise(resolve => setTimeout(resolve, 200));
      const mockProfile = MOCK_PROFILES.find(p => p.id === profileId);
      if (!mockProfile) throw new Error('Profile not found');
      return { ...mockProfile, ...updates, last_used: new Date().toISOString() };
    }
  },

  async deleteDevelopmentProfile(profileId: string, projectPath: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('delete_development_profile', { profileId, projectPath });
      } catch (error) {
        console.error('Failed to delete profile:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Profile deletion simulated');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  },

  async useDevelopmentProfile(profileId: string, projectPath: string): Promise<DevelopmentProfile> {
    if (isTauri()) {
      try {
        return await invoke<DevelopmentProfile>('use_development_profile', { profileId, projectPath });
      } catch (error) {
        console.error('Failed to use profile:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Profile usage simulated');
      await new Promise(resolve => setTimeout(resolve, 200));
      const mockProfile = MOCK_PROFILES.find(p => p.id === profileId);
      if (!mockProfile) throw new Error('Profile not found');
      return { ...mockProfile, last_used: new Date().toISOString(), usage_count: mockProfile.usage_count + 1 };
    }
  },

  async checkProfileFilesStatus(files: string[], projectPath: string): Promise<FileStatus[]> {
    if (isTauri()) {
      try {
        return await invoke<FileStatus[]>('check_profile_files_status', { files, projectPath });
      } catch (error) {
        console.error('Failed to check file status:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: File status check simulated');
      await new Promise(resolve => setTimeout(resolve, 100));
      return files.map(file => ({
        path: file,
        exists: Math.random() > 0.1, // 90% exist
        last_modified: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      }));
    }
  },

  async exportProfileContext(
    profileId: string,
    projectPath: string,
    format: 'json' | 'yaml' | 'xml' = 'json'
  ): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('export_profile_context', { profileId, projectPath, format });
      } catch (error) {
        console.error('Failed to export profile:', error);
        throw error;
      }
    } else {
      console.log('🔧 Development mode: Profile export simulated');
      await new Promise(resolve => setTimeout(resolve, 300));
      const mockProfile = MOCK_PROFILES.find(p => p.id === profileId);
      if (!mockProfile) throw new Error('Profile not found');
      
      const mockExport = {
        profile: {
          name: mockProfile.name,
          description: mockProfile.description,
          tags: mockProfile.tags,
          exported_at: new Date().toISOString(),
        },
        files: mockProfile.files.map(file => ({
          path: file,
          content: `// Mock content for ${file}\nexport const mockData = 'example';`,
          status: 'found' as const,
        })),
      };
      
      switch (format) {
        case 'yaml':
          return `profile:
  name: "${mockExport.profile.name}"
  description: "${mockExport.profile.description || ''}"
  tags: [${mockExport.profile.tags.map(t => `"${t}"`).join(', ')}]
  exported_at: "${mockExport.profile.exported_at}"
files:
${mockExport.files.map(f => `  - path: "${f.path}"
    status: "${f.status}"
    content: |
      ${f.content.split('\n').join('\n      ')}`).join('\n')}`;
        case 'xml':
          return `<?xml version="1.0" encoding="UTF-8"?>
<profile_export>
  <profile>
    <name>${mockExport.profile.name}</name>
    <description>${mockExport.profile.description || ''}</description>
    <tags>${mockExport.profile.tags.map(t => `<tag>${t}</tag>`).join('')}</tags>
    <exported_at>${mockExport.profile.exported_at}</exported_at>
  </profile>
  <files>
${mockExport.files.map(f => `    <file>
      <path>${f.path}</path>
      <status>${f.status}</status>
      <content><![CDATA[${f.content}]]></content>
    </file>`).join('\n')}
  </files>
</profile_export>`;
        default:
          return JSON.stringify(mockExport, null, 2);
      }
    }
  },
};

// Utility to check current mode
export const isDevelopmentMode = () => !isTauri();
// Integration: [This file is imported by `appStore.ts` and various UI components. The updated `Symbol` interface ensures type safety when handling data from the polyglot backend.]
// Notes: [The `Symbol` kind is now a union of all possible kinds from the Rust backend, ensuring compile-time safety. The mock data has also been updated to reflect this.]