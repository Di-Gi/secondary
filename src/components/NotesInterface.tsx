// [[SECONDARY_MIND_DESKTOP]]/src/components/NotesInterface.tsx
// Purpose: Enhanced notes interface with persistent storage integration and project-specific note management.
// Architecture: Updated to use the persistent storage system for automatic note saving and loading per project.
// Dependencies: Enhanced app store with note persistence, existing UI components, improved state management.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ProjectNote } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LoadingSpinner } from './ui/loading-spinner';
import { 
  Search, 
  Plus, 
  FileText, 
  Hash, 
  Calendar, 
  Clock, 
  Star, 
  Archive, 
  MoreHorizontal,
  Save,
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

    // Apply view filter
    switch (activeView) {
      case 'favorites':
        filtered = filtered.filter(note => note.is_favorited);
        break;
      case 'recent':
        filtered = filtered.slice().sort((a, b) => 
          new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
        ).slice(0, 10);
        break;
      default:
        break;
    }

    // Sort by last modified (most recent first)
    return filtered.sort((a, b) => 
      new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
    );
  }, [projectNotes, searchTerm, activeView]);

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
      }, 1000); // Save after 1 second of inactivity
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
      <div className="flex h-full items-center justify-center text-gray-500">
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
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="space-y-1 mb-4">
              <button
                onClick={() => setActiveView('all')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                  activeView === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
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
                  activeView === 'favorites' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
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
                  activeView === 'recent' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Clock className="h-4 w-4" />
                Recent
              </button>
            </div>

            <Separator className="my-4" />

            {/* Project Info */}
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Current Project
              </h3>
              <div className="text-sm">
                <div className="font-medium text-gray-900 truncate" title={currentProject.project_config.name}>
                  {currentProject.project_config.name}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {projectNotes.length} notes
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Note List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {activeView === 'all' && 'All Notes'}
              {activeView === 'favorites' && 'Favorites'}
              {activeView === 'recent' && 'Recent Notes'}
            </h3>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleCreateNote}
              disabled={isCreatingNote}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Note List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors group',
                    selectedNoteId === note.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900 truncate pr-2">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {note.is_favorited && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(note.id);
                          }}
                          className="hover:bg-gray-200 p-1 rounded"
                        >
                          <Star className={cn(
                            "h-3 w-3",
                            note.is_favorited ? "text-yellow-500 fill-current" : "text-gray-400"
                          )} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="hover:bg-gray-200 p-1 rounded"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {note.content || 'No content'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDate(note.last_modified)}
                    </span>
                    
                    {note.tags.length > 0 && (
                      <div className="flex gap-1">
                        {note.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            +{note.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Input
                  ref={titleRef}
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote('title', e.target.value)}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Note title..."
                />
                
                <div className="flex items-center gap-2">
                  {(isSaving || hasUnsavedChanges) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 bg-orange-400 rounded-full"></span>
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
                          : 'text-gray-400'
                      )} 
                    />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Created {formatDate(selectedNote.created_at)}</span>
                <span>•</span>
                <span>Modified {formatDate(selectedNote.last_modified)}</span>
                <span>•</span>
                <span>{selectedNote.content.length} characters</span>
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
          <div className="flex-1 flex items-center justify-center text-gray-500">
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