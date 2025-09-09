// Optimized notes-specific store slice
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ProjectNote } from '../api';

interface NotesState {
  // Notes data
  projectNotes: ProjectNote[];
  selectedNoteId: string | null;
  
  // Loading states
  isNotesLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Search and filter
  searchTerm: string;
  showFavoritesOnly: boolean;
  sortBy: 'modified' | 'created' | 'title';
  
  // Actions
  setProjectNotes: (notes: ProjectNote[]) => void;
  setSelectedNoteId: (id: string | null) => void;
  setNotesLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setSearchTerm: (term: string) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setSortBy: (sort: 'modified' | 'created' | 'title') => void;
  updateNote: (noteId: string, updates: Partial<ProjectNote>) => void;
  addNote: (note: ProjectNote) => void;
  removeNote: (noteId: string) => void;
  clearNotes: () => void;
}

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projectNotes: [],
    selectedNoteId: null,
    isNotesLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    searchTerm: '',
    showFavoritesOnly: false,
    sortBy: 'modified',

    // Actions
    setProjectNotes: (notes) => set({ projectNotes: notes }),
    setSelectedNoteId: (id) => set({ selectedNoteId: id }),
    setNotesLoading: (loading) => set({ isNotesLoading: loading }),
    setSaving: (saving) => set({ isSaving: saving }),
    setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),
    setSortBy: (sort) => set({ sortBy: sort }),

    updateNote: (noteId, updates) => {
      const { projectNotes } = get();
      const updatedNotes = projectNotes.map(note =>
        note.id === noteId 
          ? { ...note, ...updates, last_modified: new Date().toISOString() }
          : note
      );
      set({ projectNotes: updatedNotes });
    },

    addNote: (note) => {
      const { projectNotes } = get();
      set({ projectNotes: [note, ...projectNotes] });
    },

    removeNote: (noteId) => {
      const { projectNotes, selectedNoteId } = get();
      const updatedNotes = projectNotes.filter(n => n.id !== noteId);
      set({ 
        projectNotes: updatedNotes,
        selectedNoteId: selectedNoteId === noteId ? null : selectedNoteId
      });
    },

    clearNotes: () => set({
      projectNotes: [],
      selectedNoteId: null,
      searchTerm: '',
      hasUnsavedChanges: false,
    }),
  }))
);

// Selectors for optimized subscriptions
export const useProjectNotes = () => useNotesStore((state) => state.projectNotes);
export const useSelectedNoteId = () => useNotesStore((state) => state.selectedNoteId);
export const useNotesLoading = () => useNotesStore((state) => state.isNotesLoading);
export const useNotesSaving = () => useNotesStore((state) => state.isSaving);
export const useNotesSearch = () => useNotesStore((state) => ({
  searchTerm: state.searchTerm,
  showFavoritesOnly: state.showFavoritesOnly,
  sortBy: state.sortBy,
}));