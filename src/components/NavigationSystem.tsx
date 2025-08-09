import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Symbol } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  ArrowLeft, 
  ArrowRight, 
  Bookmark, 
  BookmarkPlus, 
  Star, 
  Clock, 
  Search,
  ChevronRight,
  Home,
  Folder,
  File,
  X,
  Tag,
  Filter
} from 'lucide-react';

export interface NavigationEntry {
  id: string;
  symbol?: Symbol;
  filePath: string;
  line: number;
  column: number;
  timestamp: number;
  title: string;
}

export interface Bookmark {
  id: string;
  title: string;
  description?: string;
  filePath: string;
  line: number;
  column: number;
  category: string;
  tags: string[];
  createdAt: number;
  isFavorite: boolean;
}

interface NavigationSystemProps {
  currentLocation?: NavigationEntry;
  onNavigate?: (entry: NavigationEntry) => void;
  onBookmarkCreate?: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  onBookmarkDelete?: (bookmarkId: string) => void;
  onBookmarkUpdate?: (bookmarkId: string, updates: Partial<Bookmark>) => void;
}

export function NavigationSystem({
  currentLocation,
  onNavigate,
  onBookmarkCreate,
  onBookmarkDelete,
  onBookmarkUpdate
}: NavigationSystemProps) {
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [recentFiles, setRecentFiles] = useState<NavigationEntry[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [newBookmark, setNewBookmark] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: [] as string[],
    isFavorite: false
  });

  // Load saved data from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('navigation-bookmarks');
    const savedHistory = localStorage.getItem('navigation-history');
    const savedRecentFiles = localStorage.getItem('recent-files');

    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      }
    }

    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setNavigationHistory(history);
        setCurrentIndex(history.length - 1);
      } catch (e) {
        console.error('Failed to load navigation history:', e);
      }
    }

    if (savedRecentFiles) {
      try {
        setRecentFiles(JSON.parse(savedRecentFiles));
      } catch (e) {
        console.error('Failed to load recent files:', e);
      }
    }
  }, []);

  // Save data to localStorage
  const saveToStorage = useCallback(() => {
    localStorage.setItem('navigation-bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('navigation-history', JSON.stringify(navigationHistory));
    localStorage.setItem('recent-files', JSON.stringify(recentFiles));
  }, [bookmarks, navigationHistory, recentFiles]);

  useEffect(() => {
    saveToStorage();
  }, [saveToStorage]);

  // Add to navigation history
  const addToHistory = useCallback((entry: NavigationEntry) => {
    setNavigationHistory(prev => {
      // Remove duplicate entries
      const filtered = prev.filter(item => 
        !(item.filePath === entry.filePath && item.line === entry.line && item.column === entry.column)
      );
      
      const newHistory = [...filtered, entry];
      
      // Keep only last 50 entries
      if (newHistory.length > 50) {
        newHistory.splice(0, newHistory.length - 50);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => prev + 1);

    // Add to recent files
    setRecentFiles(prev => {
      const fileEntry = {
        ...entry,
        id: `file-${entry.filePath}-${Date.now()}`
      };
      
      const filtered = prev.filter(item => item.filePath !== entry.filePath);
      const newRecent = [fileEntry, ...filtered];
      
      // Keep only last 20 files
      return newRecent.slice(0, 20);
    });
  }, []);

  // Navigation functions
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < navigationHistory.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const entry = navigationHistory[newIndex];
      onNavigate?.(entry);
    }
  }, [canGoBack, currentIndex, navigationHistory, onNavigate]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      const entry = navigationHistory[newIndex];
      onNavigate?.(entry);
    }
  }, [canGoForward, currentIndex, navigationHistory, onNavigate]);

  // Bookmark functions
  const createBookmark = useCallback(() => {
    if (!currentLocation) return;

    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      title: newBookmark.title || currentLocation.title,
      description: newBookmark.description,
      filePath: currentLocation.filePath,
      line: currentLocation.line,
      column: currentLocation.column,
      category: newBookmark.category,
      tags: newBookmark.tags,
      createdAt: Date.now(),
      isFavorite: newBookmark.isFavorite
    };

    setBookmarks(prev => [bookmark, ...prev]);
    onBookmarkCreate?.(bookmark);
    
    // Reset form
    setNewBookmark({
      title: '',
      description: '',
      category: 'general',
      tags: [],
      isFavorite: false
    });
    setIsCreatingBookmark(false);
  }, [currentLocation, newBookmark, onBookmarkCreate]);

  const deleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    onBookmarkDelete?.(bookmarkId);
  }, [onBookmarkDelete]);

  const toggleBookmarkFavorite = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === bookmarkId 
        ? { ...bookmark, isFavorite: !bookmark.isFavorite }
        : bookmark
    ));
    
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      onBookmarkUpdate?.(bookmarkId, { isFavorite: !bookmark.isFavorite });
    }
  }, [bookmarks, onBookmarkUpdate]);

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(bookmark => {
      const matchesSearch = !bookmarkSearch || 
        bookmark.title.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
        bookmark.description?.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(bookmarkSearch.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        selectedCategory === 'favorites' && bookmark.isFavorite ||
        bookmark.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [bookmarks, bookmarkSearch, selectedCategory]);

  // Get available categories
  const categories = useMemo(() => {
    const cats = new Set(bookmarks.map(b => b.category));
    return ['all', 'favorites', ...Array.from(cats)];
  }, [bookmarks]);

  // Breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    if (!currentLocation) return [];
    
    const pathParts = currentLocation.filePath.split('/');
    const breadcrumbs = [];
    
    for (let i = 0; i < pathParts.length; i++) {
      const path = pathParts.slice(0, i + 1).join('/');
      const isLast = i === pathParts.length - 1;
      
      breadcrumbs.push({
        name: pathParts[i] || 'Root',
        path,
        isFile: isLast,
        isLast
      });
    }
    
    return breadcrumbs;
  }, [currentLocation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'p':
            e.preventDefault();
            // Quick navigation (could open a command palette)
            break;
          case 'g':
            e.preventDefault();
            // Go to line (could open a dialog)
            break;
          case 'd':
            e.preventDefault();
            setIsCreatingBookmark(true);
            break;
          case '[':
            e.preventDefault();
            goBack();
            break;
          case ']':
            e.preventDefault();
            goForward();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward]);

  // Update current location in history
  useEffect(() => {
    if (currentLocation) {
      addToHistory(currentLocation);
    }
  }, [currentLocation, addToHistory]);

  return (
    <div className="space-y-4">
      {/* Navigation Controls */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={!canGoBack}
          title="Go Back (Ctrl+[)"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goForward}
          disabled={!canGoForward}
          title="Go Forward (Ctrl+])"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBookmarks(!showBookmarks)}
          title="Bookmarks"
        >
          <Bookmark className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreatingBookmark(true)}
          disabled={!currentLocation}
          title="Add Bookmark (Ctrl+D)"
        >
          <BookmarkPlus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRecentFiles(!showRecentFiles)}
          title="Recent Files"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 px-2">
          <Home className="h-4 w-4" />
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={`flex items-center gap-1 ${crumb.isLast ? 'font-medium text-gray-900' : 'hover:text-gray-900 cursor-pointer'}`}>
                {crumb.isFile ? <File className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                {crumb.name}
              </span>
            </React.Fragment>
          ))}
          {currentLocation && (
            <>
              <span className="text-gray-400">:</span>
              <span className="font-medium">
                {currentLocation.line}:{currentLocation.column}
              </span>
            </>
          )}
        </div>
      )}

      {/* Create Bookmark Dialog */}
      {isCreatingBookmark && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Create Bookmark
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingBookmark(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Bookmark title"
              value={newBookmark.title}
              onChange={(e) => setNewBookmark(prev => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder="Description (optional)"
              value={newBookmark.description}
              onChange={(e) => setNewBookmark(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                value={newBookmark.category}
                onChange={(e) => setNewBookmark(prev => ({ ...prev, category: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="general">General</option>
                <option value="important">Important</option>
                <option value="todo">TODO</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
              </select>
              <Button
                variant={newBookmark.isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => setNewBookmark(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
              >
                <Star className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreatingBookmark(false)}>
                Cancel
              </Button>
              <Button onClick={createBookmark}>
                Create Bookmark
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Bookmarks
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBookmarks(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search and Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bookmarks..."
                  value={bookmarkSearch}
                  onChange={(e) => setBookmarkSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {categories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All' : 
                     category === 'favorites' ? '★ Favorites' : 
                     category.charAt(0).toUpperCase() + category.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Bookmark List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredBookmarks.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No bookmarks found
                </div>
              ) : (
                filteredBookmarks.map(bookmark => (
                  <div
                    key={bookmark.id}
                    className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onNavigate?.({
                      id: `nav-${Date.now()}`,
                      filePath: bookmark.filePath,
                      line: bookmark.line,
                      column: bookmark.column,
                      timestamp: Date.now(),
                      title: bookmark.title
                    })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {bookmark.title}
                          </span>
                          {bookmark.isFavorite && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        {bookmark.description && (
                          <p className="text-xs text-gray-600 truncate">
                            {bookmark.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {bookmark.filePath.split('/').pop()}:{bookmark.line}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {bookmark.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmarkFavorite(bookmark.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Star className={`h-3 w-3 ${bookmark.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBookmark(bookmark.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Files Panel */}
      {showRecentFiles && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Recent Files
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecentFiles(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentFiles.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recent files
                </div>
              ) : (
                recentFiles.map(file => (
                  <div
                    key={file.id}
                    className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onNavigate?.(file)}
                  >
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {file.filePath.split('/').pop()}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {file.filePath}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(file.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}