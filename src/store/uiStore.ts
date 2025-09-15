// Optimized UI-specific store slice
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface UIState {
  // Theme
  theme: 'light' | 'dark';

  // UI state
  activeTab: 'chat' | 'notes';
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  currentView: 'dashboard' | 'workspace' | 'demo';

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setActiveTab: (tab: 'chat' | 'notes') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setCurrentView: (view: 'dashboard' | 'workspace' | 'demo') => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    activeTab: 'chat',
    sidebarCollapsed: false,
    sidebarWidth: 350,
    currentView: 'demo',

    // Actions
    setTheme: (theme) => {
      set({ theme });
      localStorage.setItem('theme', theme);
      
      // Apply theme to document efficiently
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    },

    toggleTheme: () => {
      const { theme } = get();
      const newTheme = theme === 'light' ? 'dark' : 'light';
      get().setTheme(newTheme);
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    setCurrentView: (view) => set({ currentView: view }),
  }))
);

// Selectors for optimized subscriptions
export const useTheme = () => useUIStore((state) => state.theme);
export const useActiveTab = () => useUIStore((state) => state.activeTab);
export const useCurrentView = () => useUIStore((state) => state.currentView);
export const useSidebarState = () => useUIStore((state) => ({
  collapsed: state.sidebarCollapsed,
  width: state.sidebarWidth,
}));