// Optimized project-specific store slice
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AnalysisResult, GitStatus } from '../api';

interface ProjectState {
  // Project data
  currentProject: AnalysisResult | null;
  gitStatus: GitStatus | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentProject: (project: AnalysisResult | null) => void;
  setGitStatus: (status: GitStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    currentProject: null,
    gitStatus: null,
    isLoading: false,
    error: null,

    // Actions
    setCurrentProject: (project) => set({ currentProject: project }),
    setGitStatus: (status) => set({ gitStatus: status }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearProject: () => set({
      currentProject: null,
      gitStatus: null,
      error: null,
    }),
  }))
);

// Selectors for optimized subscriptions
export const useCurrentProject = () => useProjectStore((state) => state.currentProject);
export const useGitStatus = () => useProjectStore((state) => state.gitStatus);
export const useProjectLoading = () => useProjectStore((state) => state.isLoading);
export const useProjectError = () => useProjectStore((state) => state.error);