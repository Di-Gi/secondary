// Enhanced Session Manager Component
// Purpose: Manages navigation layouts, sessions, and workspace contexts with enhanced features
// Features: Session creation, naming, persistence, automatic backup

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import {
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  Clock,
  MapPin,
  Settings,
  Download,
  Upload,
  Star,
  StarOff,
  Share2,
  Filter,
  Search,
  MoreHorizontal,
  Copy,
  Archive,
  RefreshCw
} from 'lucide-react';
import { NavigationSession, LayoutConfiguration } from '../../types/navigation';
import { useAppStore } from '../../store/appStore';
// Simple toast implementation for development
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  info: (message: string) => console.info('ℹ️', message)
};

export interface SessionManagerProps {
  sessions?: NavigationSession[];
  activeSession?: NavigationSession;
  onSessionCreate?: (session: NavigationSession) => void;
  onSessionLoad?: (sessionId: string) => void;
  onSessionSave?: (session: NavigationSession) => void;
  onSessionDelete?: (sessionId: string) => void;
  className?: string;
}

interface SessionFormData {
  name: string;
  description: string;
  tags: string[];
}

interface SessionFilter {
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'name' | 'lastAccessed' | 'created' | 'locationCount';
  sortOrder: 'asc' | 'desc';
  showFavorites: boolean;
}

interface SessionSharingData {
  sessionId: string;
  shareUrl?: string;
  isShared: boolean;
  sharedWith: string[];
  shareSettings: {
    includeLocations: boolean;
    includeLayout: boolean;
    allowEditing: boolean;
    expiresAt?: Date;
  };
}

export function SessionManager({
  sessions = [],
  activeSession,
  onSessionCreate,
  onSessionLoad,
  onSessionSave,
  onSessionDelete,
  className = ''
}: SessionManagerProps) {
  const {
    navigationSessions,
    activeNavigationSession,
    createNavigationSession,
    saveNavigationSession,
    loadNavigationSession,
    loadAllNavigationSessions,
    setActiveNavigationSession,
    deleteNavigationSession,
    currentProject
  } = useAppStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<NavigationSession | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [filter, setFilter] = useState<SessionFilter>({
    searchQuery: '',
    selectedTags: [],
    sortBy: 'lastAccessed',
    sortOrder: 'desc',
    showFavorites: false
  });
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sharingSession, setSharingSession] = useState<NavigationSession | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Use store sessions if not provided via props
  const effectiveSessions = sessions.length > 0 ? sessions : navigationSessions;
  const effectiveActiveSession = activeSession || activeNavigationSession;

  // Load sessions on mount
  useEffect(() => {
    if (currentProject) {
      loadAllNavigationSessions();
    }
  }, [currentProject, loadAllNavigationSessions]);

  // Auto-save active session periodically
  useEffect(() => {
    if (!autoSaveEnabled || !effectiveActiveSession) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        await saveNavigationSession(effectiveActiveSession);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [effectiveActiveSession, autoSaveEnabled, saveNavigationSession]);

  const handleCreateSession = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('Session name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newSession = createNavigationSession(formData.name, formData.description);

      // Add tags to session metadata
      newSession.metadata.tags = formData.tags;

      await saveNavigationSession(newSession);

      // Call external handler if provided
      onSessionCreate?.(newSession);

      toast.success(`Session "${formData.name}" created successfully`);

      // Reset form and close dialog
      setFormData({ name: '', description: '', tags: [] });
      setTagInput('');
      setIsCreateDialogOpen(false);

      // Reload sessions to get updated list
      await loadAllNavigationSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [formData, createNavigationSession, saveNavigationSession, onSessionCreate, loadAllNavigationSessions]);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      await loadNavigationSession(sessionId);
      onSessionLoad?.(sessionId);
      toast.success('Session loaded successfully');
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [loadNavigationSession, onSessionLoad]);

  const handleSaveSession = useCallback(async (session: NavigationSession) => {
    setIsLoading(true);
    try {
      await saveNavigationSession(session);
      onSessionSave?.(session);
      toast.success('Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
      toast.error('Failed to save session');
    } finally {
      setIsLoading(false);
    }
  }, [saveNavigationSession, onSessionSave]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteNavigationSession(sessionId);
      onSessionDelete?.(sessionId);
      toast.success('Session deleted successfully');
      await loadAllNavigationSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    } finally {
      setIsLoading(false);
    }
  }, [deleteNavigationSession, onSessionDelete, loadAllNavigationSessions]);

  const handleEditSession = useCallback((session: NavigationSession) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      description: session.description || '',
      tags: session.metadata.tags || []
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdateSession = useCallback(async () => {
    if (!editingSession || !formData.name.trim()) {
      toast.error('Session name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updatedSession: NavigationSession = {
        ...editingSession,
        name: formData.name,
        description: formData.description,
        metadata: {
          ...editingSession.metadata,
          tags: formData.tags
        }
      };

      await saveNavigationSession(updatedSession);
      toast.success('Session updated successfully');

      setFormData({ name: '', description: '', tags: [] });
      setEditingSession(null);
      setIsEditDialogOpen(false);

      await loadAllNavigationSessions();
    } catch (error) {
      console.error('Failed to update session:', error);
      toast.error('Failed to update session');
    } finally {
      setIsLoading(false);
    }
  }, [editingSession, formData, saveNavigationSession, loadAllNavigationSessions]);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const handleShareSession = useCallback(async (session: NavigationSession) => {
    setSharingSession(session);
    setIsShareDialogOpen(true);
  }, []);

  const handleExportSession = useCallback(async (session: NavigationSession) => {
    try {
      const { createSessionBackup } = await import('../../lib/sessionRestoration');
      const backup = createSessionBackup(session);

      // Create download link
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-${session.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Session exported successfully');
    } catch (error) {
      console.error('Failed to export session:', error);
      toast.error('Failed to export session');
    }
  }, []);

  const handleImportSession = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const { restoreSessionFromBackup } = await import('../../lib/sessionRestoration');
        const restoredSession = restoreSessionFromBackup(text);

        if (restoredSession) {
          // Generate new ID to avoid conflicts
          restoredSession.id = `imported-${Date.now()}`;
          restoredSession.name = `${restoredSession.name} (Imported)`;

          await saveNavigationSession(restoredSession);
          await loadAllNavigationSessions();
          toast.success('Session imported successfully');
        } else {
          toast.error('Failed to import session - invalid file format');
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to import session:', error);
      toast.error('Failed to import session');
    }
  }, [saveNavigationSession, loadAllNavigationSessions]);

  const handleToggleFavorite = useCallback(async (session: NavigationSession) => {
    try {
      const isFavorite = session.metadata.tags?.includes('favorite');
      const updatedTags = isFavorite
        ? session.metadata.tags.filter(tag => tag !== 'favorite')
        : [...(session.metadata.tags || []), 'favorite'];

      const updatedSession = {
        ...session,
        metadata: {
          ...session.metadata,
          tags: updatedTags
        }
      };

      await saveNavigationSession(updatedSession);
      await loadAllNavigationSessions();
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorite status');
    }
  }, [saveNavigationSession, loadAllNavigationSessions]);

  const handleDuplicateSession = useCallback(async (session: NavigationSession) => {
    try {
      const duplicatedSession = {
        ...session,
        id: `duplicate-${Date.now()}`,
        name: `${session.name} (Copy)`,
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          ...session.metadata,
          tags: [...(session.metadata.tags || []), 'duplicate']
        }
      };

      await saveNavigationSession(duplicatedSession);
      await loadAllNavigationSessions();
      toast.success('Session duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate session:', error);
      toast.error('Failed to duplicate session');
    }
  }, [saveNavigationSession, loadAllNavigationSessions]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filter and sort sessions
  const filteredAndSortedSessions = React.useMemo(() => {
    let filtered = effectiveSessions.filter(session => {
      // Search query filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesName = session.name.toLowerCase().includes(query);
        const matchesDescription = session.description?.toLowerCase().includes(query);
        const matchesTags = session.metadata.tags?.some(tag =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Tag filter
      if (filter.selectedTags.length > 0) {
        const sessionTags = session.metadata.tags || [];
        const hasSelectedTags = filter.selectedTags.every(tag =>
          sessionTags.includes(tag)
        );
        if (!hasSelectedTags) {
          return false;
        }
      }

      // Favorites filter
      if (filter.showFavorites) {
        // For now, we'll consider sessions with 'favorite' tag as favorites
        const isFavorite = session.metadata.tags?.includes('favorite');
        if (!isFavorite) {
          return false;
        }
      }

      return true;
    });

    // Sort sessions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filter.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastAccessed':
          comparison = a.lastAccessed.getTime() - b.lastAccessed.getTime();
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'locationCount':
          comparison = a.locations.length - b.locations.length;
          break;
      }

      return filter.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [effectiveSessions, filter]);

  // Get all unique tags from sessions
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    effectiveSessions.forEach(session => {
      session.metadata.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [effectiveSessions]);

  const SessionForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="session-name">Session Name</Label>
        <Input
          id="session-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter session name..."
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-description">Description (Optional)</Label>
        <Textarea
          id="session-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this session is for..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTag}
            disabled={isLoading || !tagInput.trim()}
          >
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                  disabled={isLoading}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setFormData({ name: '', description: '', tags: [] });
            setEditingSession(null);
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateSession : handleCreateSession}
          disabled={isLoading || !formData.name.trim()}
        >
          {isLoading ? 'Saving...' : (isEdit ? 'Update Session' : 'Create Session')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`session-manager ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Session Manager</CardTitle>
              <CardDescription>
                Manage navigation sessions and workspace layouts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className={autoSaveEnabled ? 'text-green-600' : 'text-muted-foreground'}
              >
                <Save className="h-4 w-4 mr-1" />
                Auto-save {autoSaveEnabled ? 'On' : 'Off'}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Session</DialogTitle>
                  </DialogHeader>
                  <SessionForm />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {effectiveActiveSession && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Active Session</div>
                  <div className="text-sm text-muted-foreground">
                    {effectiveActiveSession.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveSession(effectiveActiveSession)}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSession(effectiveActiveSession)}
                    disabled={isLoading}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={filter.searchQuery}
                  onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportSession}
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </div>

            {isFilterExpanded && (
              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Sort by:</Label>
                    <select
                      value={filter.sortBy}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        sortBy: e.target.value as SessionFilter['sortBy']
                      }))}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="lastAccessed">Last Accessed</option>
                      <option value="name">Name</option>
                      <option value="created">Created</option>
                      <option value="locationCount">Locations</option>
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter(prev => ({
                      ...prev,
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                    }))}
                  >
                    {filter.sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-favorites"
                      checked={filter.showFavorites}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        showFavorites: e.target.checked
                      }))}
                    />
                    <Label htmlFor="show-favorites" className="text-xs">Favorites only</Label>
                  </div>
                </div>

                {allTags.length > 0 && (
                  <div>
                    <Label className="text-xs mb-2 block">Filter by tags:</Label>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={filter.selectedTags.includes(tag) ? "default" : "outline"}
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            setFilter(prev => ({
                              ...prev,
                              selectedTags: prev.selectedTags.includes(tag)
                                ? prev.selectedTags.filter(t => t !== tag)
                                : [...prev.selectedTags, tag]
                            }));
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredAndSortedSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">
                    {effectiveSessions.length === 0 ? 'No sessions found' : 'No sessions match your filters'}
                  </div>
                  <div className="text-xs">
                    {effectiveSessions.length === 0
                      ? 'Create your first session to get started'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </div>
                </div>
              ) : (
                filteredAndSortedSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${effectiveActiveSession?.id === session.id ? 'ring-2 ring-primary' : ''
                      }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {session.name}
                            </h4>
                            {effectiveActiveSession?.id === session.id && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                            {session.metadata.tags?.includes('favorite') && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            )}
                          </div>

                          {session.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {session.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.locations.length} locations
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(session.lastAccessed)}
                            </div>
                          </div>

                          {session.metadata.tags && session.metadata.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.metadata.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {session.metadata.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{session.metadata.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(session);
                            }}
                            disabled={isLoading}
                          >
                            {session.metadata.tags?.includes('favorite') ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadSession(session.id);
                            }}
                            disabled={isLoading || effectiveActiveSession?.id === session.id}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Toggle dropdown menu
                              }}
                              disabled={isLoading}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {/* Dropdown menu would go here */}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Session Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <SessionForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SessionManager;