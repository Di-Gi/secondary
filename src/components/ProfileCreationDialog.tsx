// Unified profile creation dialog that combines file selection with naming/description
import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../store/uiStore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  File, 
  Folder, 
  FolderOpen,
  Search,
  Plus,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface ProfileCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFiles?: string[];
  initialName?: string;
  initialDescription?: string;
}

export function ProfileCreationDialog({ 
  isOpen, 
  onClose, 
  initialFiles = [],
  initialName = '',
  initialDescription = ''
}: ProfileCreationDialogProps) {
  const { currentProject, createProfile } = useAppStore();
  const theme = useTheme();
  
  // Form state
  const [profileName, setProfileName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(initialFiles));
  const [manualFiles, setManualFiles] = useState(initialFiles.join('\n'));
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'manual'>('browse');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-generate profile name when files change
  useEffect(() => {
    if (selectedFiles.size > 0 && !profileName) {
      const files = Array.from(selectedFiles);
      setProfileName(generateProfileName(files));
      setTags(generateProfileTags(files).join(', '));
    }
  }, [selectedFiles, profileName]);

  // Sync manual files with selected files only when switching TO manual tab (one-time sync)
  const [hasInitializedManualTab, setHasInitializedManualTab] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'manual' && !hasInitializedManualTab && selectedFiles.size > 0) {
      setManualFiles(Array.from(selectedFiles).join('\n'));
      setHasInitializedManualTab(true);
    } else if (activeTab === 'browse') {
      setHasInitializedManualTab(false);
    }
  }, [activeTab, hasInitializedManualTab, selectedFiles.size]);

  // Generate file tree from project symbols
  useEffect(() => {
    if (isOpen && currentProject) {
      setIsLoading(true);
      
      // Extract unique file paths from symbols
      const filePaths = [...new Set(currentProject.symbols.map(symbol => symbol.location.path))];
      
      // Build file tree structure
      const tree = buildFileTree(filePaths);
      setFileTree(tree);
      setIsLoading(false);
    }
  }, [isOpen, currentProject]);

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const toggleDirectoryExpansion = (dirPath: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === dirPath && node.isDirectory) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateTree(fileTree));
  };

  const handleManualFilesChange = (value: string) => {
    setManualFiles(value);
    // Debounce the file selection update to prevent cursor jumping
    const files = value.split('\n').map(f => f.trim()).filter(Boolean);
    setSelectedFiles(new Set(files));
  };

  // Enhanced glob pattern matching
  const matchGlob = (pattern: string, path: string): boolean => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '___DOUBLESTAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLESTAR___/g, '.*')
      .replace(/\?/g, '[^/]')
      .replace(/\[([^\]]+)\]/g, '[$1]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  };

  // Resolve glob patterns to actual file paths
  const resolveGlobPatterns = (patterns: string[]): { resolved: string[], globMatches: { [pattern: string]: string[] } } => {
    if (!currentProject) return { resolved: [], globMatches: {} };
    
    // Get unique file paths from symbols (remove duplicates)
    const projectFiles = [...new Set(currentProject.symbols.map(symbol => {
      let path = symbol.location.path;
      // Normalize path
      path = path.startsWith('\\\\?\\') ? path.substring(4) : path;
      path = path.replace(/\\/g, '/');
      path = path.startsWith('/') ? path.substring(1) : path;
      return path;
    }))];

    const resolved = new Set<string>();
    const globMatches: { [pattern: string]: string[] } = {};

    patterns.forEach(pattern => {
      const trimmedPattern = pattern.trim();
      if (!trimmedPattern) return;
      
      const normalizedPattern = trimmedPattern.replace(/\\/g, '/').replace(/^\/+/, '');
      
      // Check if it's a glob pattern
      if (normalizedPattern.includes('*') || normalizedPattern.includes('?') || normalizedPattern.includes('[')) {
        const matches = [...new Set(projectFiles.filter(file => matchGlob(normalizedPattern, file)))];
        globMatches[pattern] = matches;
        matches.forEach(match => resolved.add(match));
      } else {
        // Direct file path
        if (projectFiles.includes(normalizedPattern)) {
          resolved.add(normalizedPattern);
        }
      }
    });

    return { resolved: Array.from(resolved), globMatches };
  };

  // Enhanced validation with glob pattern resolution
  const validateFilePaths = (paths: string[]): { 
    validation: { [path: string]: 'valid' | 'invalid' | 'glob' }, 
    globMatches: { [pattern: string]: string[] },
    totalResolvedCount: number 
  } => {
    const validation: { [path: string]: 'valid' | 'invalid' | 'glob' } = {};
    
    if (!currentProject) return { validation, globMatches: {}, totalResolvedCount: 0 };
    
    // Get unique file paths from symbols (remove duplicates)
    const projectFiles = new Set(currentProject.symbols.map(symbol => {
      let path = symbol.location.path;
      // Normalize path
      path = path.startsWith('\\\\?\\') ? path.substring(4) : path;
      path = path.replace(/\\/g, '/');
      path = path.startsWith('/') ? path.substring(1) : path;
      return path;
    }));

    const { resolved, globMatches } = resolveGlobPatterns(paths);

    paths.forEach(path => {
      const trimmedPath = path.trim();
      if (!trimmedPath) return;
      
      const normalizedPath = trimmedPath.replace(/\\/g, '/').replace(/^\/+/, '');
      
      if (normalizedPath.includes('*') || normalizedPath.includes('?') || normalizedPath.includes('[')) {
        const matches = globMatches[path] || [];
        validation[path] = matches.length > 0 ? 'glob' : 'invalid';
      } else if (projectFiles.has(normalizedPath)) {
        validation[path] = 'valid';
      } else {
        validation[path] = 'invalid';
      }
    });

    return { validation, globMatches, totalResolvedCount: resolved.length };
  };

  // Memoize validation to prevent unnecessary re-computations
  const validationResult = useMemo(() => {
    return validateFilePaths(manualFiles.split('\n'));
  }, [manualFiles, currentProject]);

  const { validation: currentValidation, globMatches, totalResolvedCount } = validationResult;

  const handleCreateProfile = async () => {
    if (!profileName.trim()) return;

    let inputPaths = activeTab === 'manual' 
      ? manualFiles.split('\n').map(f => f.trim()).filter(Boolean)
      : Array.from(selectedFiles);

    if (inputPaths.length === 0) return;

    // Resolve glob patterns to actual file paths
    const { resolved: finalFiles } = resolveGlobPatterns(inputPaths);

    if (finalFiles.length === 0) {
      console.warn('No files resolved from patterns:', inputPaths);
      return;
    }

    // Files are already normalized in resolveGlobPatterns

    setIsCreating(true);
    try {
      const profileTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      await createProfile(profileName, description || undefined, profileTags, finalFiles);
      
      // Reset form
      setProfileName('');
      setDescription('');
      setTags('');
      setSelectedFiles(new Set());
      setManualFiles('');
      onClose();
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isSelected = selectedFiles.has(node.path);
    const matchesSearch = !searchTerm || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.path.toLowerCase().includes(searchTerm.toLowerCase());

    // For directories, show if any children match search
    const hasMatchingChildren = node.isDirectory && node.children?.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (child.isDirectory && hasMatchingDescendants(child))
    );

    if (!matchesSearch && !hasMatchingChildren) return null;

    const selectedChildrenCount = node.isDirectory && node.children 
      ? node.children.filter(child => !child.isDirectory && selectedFiles.has(child.path)).length
      : 0;

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded-sm cursor-pointer transition-colors",
            isSelected && !node.isDirectory && (theme === 'dark' ? "bg-blue-900/20 border-l-2 border-blue-400" : "bg-blue-50 border-l-2 border-blue-500"),
            node.isDirectory && selectedChildrenCount > 0 && (theme === 'dark' ? "bg-blue-900/10" : "bg-blue-25")
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleDirectoryExpansion(node.path);
            } else {
              toggleFileSelection(node.path);
            }
          }}
        >
          {node.isDirectory ? (
            <>
              {node.isExpanded ? (
                <FolderOpen className={cn("h-4 w-4 flex-shrink-0", theme === 'dark' ? "text-blue-400" : "text-blue-600")} />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {node.name}
              </span>
              {selectedChildrenCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {selectedChildrenCount}
                </Badge>
              )}
            </>
          ) : (
            <>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleFileSelection(node.path)}
                className="h-4 w-4 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground flex-1 min-w-0 truncate" title={node.path}>
                {node.name}
              </span>
              {getFileExtension(node.name) && (
                <span className="text-xs text-muted-foreground font-mono">
                  {getFileExtension(node.name)}
                </span>
              )}
            </>
          )}
        </div>
        
        {node.isDirectory && node.isExpanded && node.children && (
          <div className="border-l border-border ml-4">
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const hasMatchingDescendants = (node: FileNode): boolean => {
    if (!node.children) return false;
    return node.children.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (child.isDirectory && hasMatchingDescendants(child))
    );
  };

  const getFileExtension = (filename: string): string => {
    const ext = filename.split('.').pop();
    return ext && ext !== filename ? ext : '';
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setManualFiles('');
  };

  const expandAllDirectories = () => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: node.isDirectory ? true : node.isExpanded,
        children: node.children ? updateTree(node.children) : node.children
      }));
    };
    setFileTree(updateTree(fileTree));
  };

  const collapseAllDirectories = () => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: false,
        children: node.children ? updateTree(node.children) : node.children
      }));
    };
    setFileTree(updateTree(fileTree));
  };

  // Calculate accurate file count
  const finalFileCount = useMemo(() => {
    if (activeTab === 'manual') {
      const inputPaths = manualFiles.split('\n').map(f => f.trim()).filter(Boolean);
      if (inputPaths.length === 0) return 0;
      
      // Check if any paths are glob patterns
      const hasGlobPatterns = inputPaths.some(path => 
        path.includes('*') || path.includes('?') || path.includes('[')
      );
      
      if (hasGlobPatterns) {
        return totalResolvedCount;
      } else {
        // Count valid direct paths
        return Object.values(currentValidation).filter(v => v === 'valid').length;
      }
    }
    return selectedFiles.size;
  }, [activeTab, manualFiles, totalResolvedCount, currentValidation, selectedFiles.size]);

  const canCreate = profileName.trim() && finalFileCount > 0;

  if (!currentProject) return null;

  return (
    <>
      <style>{`
        .custom-scrollbar {
          /* Firefox scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) hsl(var(--muted));
        }
        
        /* Webkit scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 6px;
          margin: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 6px;
          border: 2px solid hsl(var(--muted));
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: hsl(var(--muted-foreground) / 0.7);
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Development Profile</DialogTitle>
          <DialogDescription>
            Create a reusable collection of files with a name and description for specific development contexts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Profile Details */}
          <div className="w-80 flex-shrink-0 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Profile Name</label>
              <Input
                placeholder="e.g., Auth System, API Layer"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                placeholder="Brief description of this profile's purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tags</label>
              <Input
                placeholder="auth, backend, security"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated tags</p>
            </div>

            {/* File Count Summary */}
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Selected Files</span>
                <Badge variant="secondary">{finalFileCount}</Badge>
              </div>
              {finalFileCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {finalFileCount === 1 ? '1 file selected' : `${finalFileCount} files selected`}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - File Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'manual')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="browse" className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Browse Files
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse" className="flex-1 flex flex-col mt-4 min-h-0">
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedFiles.size > 0 && (
                        <Badge variant="secondary">
                          {selectedFiles.size} selected
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={expandAllDirectories}
                        className="h-6 text-xs"
                      >
                        Expand All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={collapseAllDirectories}
                        className="h-6 text-xs"
                      >
                        Collapse All
                      </Button>
                      {selectedFiles.size > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearSelection}
                          className="h-6 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div 
                  className="flex-1 border rounded-md overflow-y-auto min-h-[300px] max-h-96 custom-scrollbar"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-sm text-muted-foreground">Loading files...</div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-0.5">
                      {fileTree.map(node => renderFileNode(node))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="flex-1 flex flex-col mt-4 min-h-0">
                <div className="mb-3">
                  <label className="text-sm font-medium mb-2 block">File Paths</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter one file path per line. Paths will be validated against your project files.
                  </p>
                  <div className="text-xs text-muted-foreground/80 space-y-1">
                    <div>• Use relative paths from project root (e.g., <code className="bg-muted px-1 rounded">src/components/Button.tsx</code>)</div>
                    <div>• Glob patterns supported:</div>
                    <div className="ml-4 space-y-0.5">
                      <div>- <code className="bg-muted px-1 rounded">src/**/*.ts</code> (all TypeScript files in src/)</div>
                      <div>- <code className="bg-muted px-1 rounded">src/components/*.tsx</code> (React components)</div>
                      <div>- <code className="bg-muted px-1 rounded">**/*.test.js</code> (all test files)</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0 gap-3">
                  {/* Enhanced textarea with better height allocation */}
                  <div className="flex-1 relative min-h-0">
                    <Textarea
                      placeholder={`src/auth/auth.service.ts
src/models/user.model.ts
src/controllers/auth.controller.ts

Enter file paths here...`}
                      value={manualFiles}
                      onChange={(e) => handleManualFilesChange(e.target.value)}
                      onKeyDown={(e) => {
                        // Allow Tab key to insert tab character instead of changing focus
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const newValue = manualFiles.substring(0, start) + '\t' + manualFiles.substring(end);
                          
                          // Update state directly without going through handler to avoid cursor issues
                          setManualFiles(newValue);
                          const files = newValue.split('\n').map(f => f.trim()).filter(Boolean);
                          setSelectedFiles(new Set(files));
                          
                          // Restore cursor position
                          requestAnimationFrame(() => {
                            target.selectionStart = target.selectionEnd = start + 1;
                          });
                        }
                      }}
                      className="h-full resize-none font-mono text-sm leading-relaxed custom-scrollbar"
                      style={{ 
                        minHeight: '200px',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }}
                      spellCheck={false}
                    />
                  </div>
                  
                  {/* File validation feedback */}
                  {manualFiles.trim() && (
                    <div className="border rounded-md p-3 bg-muted/30 max-h-32 overflow-y-auto custom-scrollbar">
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium text-muted-foreground">Path Validation:</div>
                          <div className="flex items-center gap-3 text-xs">
                            {Object.values(currentValidation).filter(v => v === 'valid').length > 0 && (
                              <span className="text-green-600 dark:text-green-400">
                                ✓ {Object.values(currentValidation).filter(v => v === 'valid').length} direct
                              </span>
                            )}
                            {Object.values(currentValidation).filter(v => v === 'glob').length > 0 && (
                              <span className="text-blue-600 dark:text-blue-400">
                                🔍 {Object.values(currentValidation).filter(v => v === 'glob').length} patterns
                              </span>
                            )}
                            {Object.values(currentValidation).filter(v => v === 'invalid').length > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                ✗ {Object.values(currentValidation).filter(v => v === 'invalid').length} invalid
                              </span>
                            )}
                          </div>
                        </div>
                        {totalResolvedCount > 0 && (
                          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <strong>{totalResolvedCount} unique files</strong> will be included in the profile
                            {Object.values(globMatches).reduce((sum, matches) => sum + matches.length, 0) > totalResolvedCount && (
                              <span className="ml-1">(patterns may overlap)</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {manualFiles.split('\n').map((path, index) => {
                          const trimmedPath = path.trim();
                          if (!trimmedPath) return null;
                          
                          const status = currentValidation[path];
                          const statusColor = status === 'valid' 
                            ? 'text-green-600 dark:text-green-400' 
                            : status === 'glob'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-red-600 dark:text-red-400';
                          
                          const statusIcon = status === 'valid' 
                            ? '✓' 
                            : status === 'glob'
                            ? '🔍'
                            : '✗';
                          
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex items-start gap-2 text-xs">
                                <span className={`${statusColor} font-mono flex-shrink-0 mt-0.5`}>
                                  {statusIcon}
                                </span>
                                <span className="font-mono text-foreground/80 break-all flex-1">
                                  {trimmedPath}
                                </span>
                                {status === 'glob' && (
                                  <span className="text-blue-600 dark:text-blue-400 text-xs">
                                    ({globMatches[path]?.length || 0} files)
                                  </span>
                                )}
                                {status === 'invalid' && (
                                  <span className="text-red-600 dark:text-red-400 text-xs">
                                    (not found)
                                  </span>
                                )}
                              </div>
                              
                              {/* Show first few glob matches */}
                              {status === 'glob' && globMatches[path] && globMatches[path].length > 0 && (
                                <div className="ml-6 space-y-0.5">
                                  {globMatches[path].slice(0, 3).map((match, matchIndex) => (
                                    <div key={matchIndex} className="text-xs text-muted-foreground font-mono">
                                      → {match}
                                    </div>
                                  ))}
                                  {globMatches[path].length > 3 && (
                                    <div className="text-xs text-muted-foreground italic">
                                      ... and {globMatches[path].length - 3} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProfile}
            disabled={!canCreate || isCreating}
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Profile ({finalFileCount} files)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );

  // Helper functions
  function buildFileTree(filePaths: string[]): FileNode[] {
    const tree: { [key: string]: FileNode } = {};
    
    // Clean and normalize file paths
    const cleanPaths = filePaths.map(path => {
      // Remove Windows UNC prefix if present
      let cleaned = path.startsWith('\\\\?\\') ? path.substring(4) : path;
      // Convert backslashes to forward slashes
      cleaned = cleaned.replace(/\\/g, '/');
      // Remove leading slash if present
      cleaned = cleaned.startsWith('/') ? cleaned.substring(1) : cleaned;
      return cleaned;
    });
    
    cleanPaths.forEach(filePath => {
      const parts = filePath.split('/').filter(Boolean);
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[currentPath]) {
          tree[currentPath] = {
            path: currentPath,
            name: part,
            isDirectory: index < parts.length - 1,
            children: [],
            isExpanded: index === 0, // Expand root directories
          };
        }
        
        // Add to parent's children if not already there
        if (parentPath && tree[parentPath] && !tree[parentPath].children?.some(child => child.path === currentPath)) {
          tree[parentPath].children?.push(tree[currentPath]);
        }
      });
    });
    
    // Sort children by type (directories first) and then by name
    const sortChildren = (node: FileNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };
    
    // Return root level nodes, sorted
    const rootNodes = Object.values(tree).filter(node => !node.path.includes('/'));
    rootNodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    rootNodes.forEach(sortChildren);
    return rootNodes;
  }

  function generateProfileName(files: string[]): string {
    const commonPaths = files.map(f => f.split('/').slice(0, -1).join('/'));
    const uniquePaths = [...new Set(commonPaths)];
    
    if (uniquePaths.length === 1 && uniquePaths[0]) {
      const pathParts = uniquePaths[0].split('/').filter(Boolean);
      return pathParts[pathParts.length - 1] || 'New Profile';
    }
    
    // Look for common patterns
    if (files.some(f => f.includes('auth'))) return 'Auth System';
    if (files.some(f => f.includes('api'))) return 'API Layer';
    if (files.some(f => f.includes('component'))) return 'Components';
    if (files.some(f => f.includes('service'))) return 'Services';
    if (files.some(f => f.includes('model'))) return 'Models';
    if (files.some(f => f.includes('controller'))) return 'Controllers';
    if (files.some(f => f.includes('test'))) return 'Tests';
    
    return 'New Profile';
  }

  function generateProfileTags(files: string[]): string[] {
    const tags = new Set<string>();
    
    files.forEach(file => {
      const lowerFile = file.toLowerCase();
      
      if (lowerFile.includes('auth')) tags.add('auth');
      if (lowerFile.includes('api')) tags.add('api');
      if (lowerFile.includes('component')) tags.add('frontend');
      if (lowerFile.includes('service')) tags.add('backend');
      if (lowerFile.includes('model')) tags.add('data');
      if (lowerFile.includes('controller')) tags.add('backend');
      if (lowerFile.includes('test')) tags.add('testing');
      if (lowerFile.includes('config')) tags.add('config');
      if (lowerFile.endsWith('.ts') || lowerFile.endsWith('.tsx')) tags.add('typescript');
      if (lowerFile.endsWith('.js') || lowerFile.endsWith('.jsx')) tags.add('javascript');
      if (lowerFile.endsWith('.rs')) tags.add('rust');
      if (lowerFile.endsWith('.py')) tags.add('python');
    });
    
    return Array.from(tags);
  }
}