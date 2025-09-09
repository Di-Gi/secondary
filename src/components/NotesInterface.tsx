// [[SECONDARY_MIND_DESKTOP]]/src/components/NotesInterface.tsx
// Purpose: Streamlined two-pane notes interface with improved layout and reduced clutter
// Architecture: Simplified layout with better information hierarchy and inline filtering
// Dependencies: Enhanced app store with note persistence, existing UI components, improved state management.

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ProjectNote } from '../api';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading-spinner';
import {
  Search,
  Plus,
  FileText,
  Star,
  Trash2,
  FolderOpen,
  Loader2,
  SortDesc
} from 'lucide-react';
import { cn } from '../lib/utils';

const createNewNote = (title: string = "Untitled Note"): ProjectNote => ({
  id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
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
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'title'>('modified');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<number>();

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
      setSelectedNoteId(projectNotes[0].id);
    }
  }, [projectNotes, selectedNoteId]);

  // Filtered and sorted notes
  const filteredNotes = useMemo(() => {
    let filtered = projectNotes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(note => note.is_favorited);
    }

    // Sort notes
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'modified':
        default:
          return new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime();
      }
    });
  }, [projectNotes, searchTerm, showFavoritesOnly, sortBy]);

  const selectedNote = useMemo(() =>
    projectNotes.find(note => note.id === selectedNoteId),
    [projectNotes, selectedNoteId]
  );

  // Auto-save functionality
  const autoSave = useMemo(() => {
    return (note: ProjectNote) => {
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
      }, 1000);
    };
  }, [saveNote]);

  // Handlers
  const handleCreateNote = async () => {
    setIsCreatingNote(true);
    try {
      const newNote = createNewNote();
      await saveNote(newNote);
      setSelectedNoteId(newNote.id);
      setTimeout(() => titleRef.current?.select(), 100);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleUpdateNote = (field: keyof ProjectNote, value: any) => {
    if (!selectedNote) return;

    const updatedNote = { ...selectedNote, [field]: value };
    updateNote(selectedNote.id, { [field]: value });
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
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">No Project Selected</h3>
          <p className="text-sm">Select a project to access its notes</p>
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
    <div className="flex h-full bg-muted/30">
      {/* Note List Sidebar */}
      <div className="w-80 bg-background border-r border-border flex flex-col">
        {/* Header with Search and Controls */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Notes</h2>
            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={isCreatingNote}
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="h-7"
              >
                <Star className="h-3 w-3 mr-1" />
                Favorites
              </Button>
              <Badge variant="secondary" className="text-xs">
                {filteredNotes.length}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const sorts: typeof sortBy[] = ['modified', 'created', 'title'];
                const currentIndex = sorts.indexOf(sortBy);
                setSortBy(sorts[(currentIndex + 1) % sorts.length]);
              }}
              className="h-7"
              title={`Sort by ${sortBy}`}
            >
              <SortDesc className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Note List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-all group border',
                    selectedNoteId === note.id
                      ? 'bg-primary/10 border-primary/20 shadow-sm'
                      : 'hover:bg-muted/50 border-transparent hover:border-border'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-foreground truncate pr-2 flex-1">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(note.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Star className={cn(
                          "h-3 w-3",
                          note.is_favorited ? "text-yellow-500 fill-current" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {note.content || 'No content'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.last_modified)}
                    </span>

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
      <div className="flex-1 flex flex-col bg-background">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <Input
                  ref={titleRef}
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote('title', e.target.value)}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 flex-1"
                  placeholder="Note title..."
                />

                <div className="flex items-center gap-2 ml-4">
                  {(isSaving || hasUnsavedChanges) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 bg-orange-400 dark:bg-orange-500 rounded-full"></span>
                          <span>Unsaved</span>
                        </>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleFavorite(selectedNote.id)}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        selectedNote.is_favorited
                          ? 'text-yellow-500 fill-current'
                          : 'text-muted-foreground'
                      )}
                    />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Modified {formatDate(selectedNote.last_modified)}
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 p-6">
              <Textarea
                ref={contentRef}
                value={selectedNote.content}
                onChange={(e) => handleUpdateNote('content', e.target.value)}
                placeholder="Start writing..."
                className="w-full h-full resize-none border-none shadow-none p-0 text-base leading-relaxed focus-visible:ring-0"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">Select a note to begin</h3>
              <p className="text-sm">Choose a note from the list or create a new one</p>
              <Button
                className="mt-4"
                onClick={handleCreateNote}
                disabled={isCreatingNote}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Integration: Enhanced notes interface that integrates with the persistent storage system for automatic note management per project.
// Notes: Provides auto-save functionality, project-specific note isolation, and seamless integration with the enhanced app store.