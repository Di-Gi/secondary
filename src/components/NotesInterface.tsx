// [[SECONDARY_MIND_DESKTOP]]/src/components/NotesInterface.tsx
// Purpose: Enhanced notes interface with persistent storage integration and project-specific note management.
// Architecture: Updated to use the persistent storage system for automatic note saving and loading per project.
// Dependencies: Enhanced app store with note persistence, existing UI components, improved state management.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { ProjectNote } from '../api';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
// import { Separator } from './ui/separator';
import { LoadingSpinner } from './ui/loading-spinner';
import { 
  Search, 
  Plus, 
  FileText, 
  Clock, 
  Star, 
  Trash2,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const createNewNote = (title: string = "Untitled Note"): ProjectNote => ({
  id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  title,
  content: "",
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
  tags: [],
  is_favorited: false,
});

export function NotesInterface() {
  const { 
    currentProject, 
    projectNotes, 
    isNotesLoading, 
    saveNote, 
    deleteNote, 
    updateNote,
    loadProjectNotes 
  } = useAppStore();
  
  // Local state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'all' | 'favorites' | 'recent'>('all');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load notes when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectNotes(currentProject.project_path);
      setSelectedNoteId(null);
      setHasUnsavedChanges(false);
    }
  }, [currentProject, loadProjectNotes]);

  // Auto-select first note when notes load
  useEffect(() => {
    if (projectNotes.length > 0 && !selectedNoteId) {
      // Find the most recently modified note to select by default
      const mostRecentNote = [...projectNotes].sort((a, b) => 
        new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
      )[0];
      setSelectedNoteId(mostRecentNote.id);
    }
  }, [projectNotes, selectedNoteId]);

  // Filtered and sorted notes
  const filteredNotes = useMemo(() => {
    let filtered = projectNotes;

    // Apply search filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(lowercasedTerm) ||
        note.content.toLowerCase().includes(lowercasedTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
      );
    }

    // Apply view filter
    switch (activeView) {
      case 'favorites':
        filtered = filtered.filter(note => note.is_favorited);
        break;
      case 'recent':
        // The main list is already sorted by last_modified, so we just slice
        break;
    }

    // Sort by last modified (most recent first) for all views
    return filtered.sort((a, b) => 
      new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
    );
  }, [projectNotes, searchTerm, activeView]);

  const selectedNote = useMemo(() => 
    projectNotes.find(note => note.id === selectedNoteId), 
    [projectNotes, selectedNoteId]
  );

  // Auto-save functionality
  const autoSave = useCallback((note: ProjectNote) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setHasUnsavedChanges(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await saveNote(note);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to auto-save note:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1500); // Save after 1.5 seconds of inactivity
  }, [saveNote]);

  // Handlers
  const handleCreateNote = async () => {
    setIsCreatingNote(true);
    try {
      const newNote = createNewNote();
      await saveNote(newNote);
      setSelectedNoteId(newNote.id);
      // Wait for the re-render so titleRef is attached to the new note's input
      setTimeout(() => titleRef.current?.select(), 100);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleUpdateNote = (field: keyof ProjectNote, value: any) => {
    if (!selectedNote) return;
    
    const updatedNote = { ...selectedNote, [field]: value, last_modified: new Date().toISOString() };
    updateNote(selectedNote.id, { [field]: value, last_modified: updatedNote.last_modified });
    autoSave(updatedNote);
  };

  const handleToggleFavorite = async (noteId: string) => {
    const note = projectNotes.find(n => n.id === noteId);
    if (!note) return;
    
    try {
      const updatedNote = { ...note, is_favorited: !note.is_favorited };
      await saveNote(updatedNote);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    // A simple confirmation dialog
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;
    
    try {
      await deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null); // Deselect if the current note is deleted
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 bg-gray-50">
        <div className="text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No Project Loaded</h3>
          <p className="text-sm text-gray-600">Please open a project to view or create notes.</p>
        </div>
      </div>
    );
  }

  if (isNotesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Navigation */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Notes</h2>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={handleCreateNote}
              disabled={isCreatingNote}
              aria-label="Create new note"
            >
              {isCreatingNote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <button
              onClick={() => setActiveView('all')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                activeView === 'all' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <FileText className="h-4 w-4" />
              All Notes
              <Badge variant="secondary" className="ml-auto">
                {projectNotes.length}
              </Badge>
            </button>
            
            <button
              onClick={() => setActiveView('favorites')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                activeView === 'favorites' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Star className="h-4 w-4" />
              Favorites
              <Badge variant="secondary" className="ml-auto">
                {projectNotes.filter(n => n.is_favorited).length}
              </Badge>
            </button>
            
            <button
              onClick={() => setActiveView('recent')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                activeView === 'recent' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Clock className="h-4 w-4" />
              Recent
            </button>
          </div>
        </nav>
      </aside>

      {/* Note List */}
      <div className="w-80 bg-gray-100/50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 mt-10">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No notes found</p>
              {searchTerm && <p className="text-xs mt-1">Try adjusting your search.</p>}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedNoteId(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNoteId(note.id);
                    }
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                    selectedNoteId === note.id 
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
                      : 'hover:bg-white/50 dark:hover:bg-gray-700/50 border border-transparent'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate pr-2">
                      {note.title || "Untitled Note"}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(note.id);
                          }}
                          aria-label="Toggle favorite"
                          className="hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded"
                        >
                          <Star className={cn(
                            "h-4 w-4",
                            note.is_favorited ? "text-yellow-500 fill-current" : "text-gray-400 dark:text-gray-500"
                          )} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          aria-label="Delete note"
                          className="hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {note.content || 'No additional content'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatDate(note.last_modified)}</span>
                    {note.is_favorited && (
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <Input
                  ref={titleRef}
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote('title', e.target.value)}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                  placeholder="Note Title"
                />
                
                <div className="flex items-center gap-3">
                  {(isSaving || hasUnsavedChanges) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></>
                      ) : (
                        <><span className="h-2 w-2 bg-orange-400 rounded-full animate-pulse"></span><span>Unsaved</span></>
                      )}
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleFavorite(selectedNote.id)}
                    aria-label="Toggle favorite"
                  >
                    <Star 
                      className={cn('h-5 w-5', selectedNote.is_favorited 
                          ? 'text-yellow-500 fill-current' 
                          : 'text-gray-400 dark:text-gray-500'
                      )} 
                    />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Created: {new Date(selectedNote.created_at).toLocaleString()}</span>
                <span>Modified: {formatDate(selectedNote.last_modified)}</span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <Textarea
                ref={contentRef}
                value={selectedNote.content}
                onChange={(e) => handleUpdateNote('content', e.target.value)}
                placeholder="Start writing your note here..."
                className="w-full h-full resize-none border-none shadow-none p-0 text-base leading-relaxed focus-visible:ring-0 bg-transparent"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">Select a note</h3>
              <p className="text-sm">Choose a note from the list to view or edit it.</p>
              <Button 
                className="mt-4" 
                onClick={handleCreateNote}
                disabled={isCreatingNote}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}