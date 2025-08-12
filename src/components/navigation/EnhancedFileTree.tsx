// Enhanced File Tree Component
// Purpose: Rich file browser with contextual information and preview capabilities
// Architecture: Virtual scrolling with lazy loading, git status indicators, and hover previews

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  FileTreeNode, 
  FileTreeSettings, 
  GitFileStatus,
  FilePreview 
} from '../../types/navigation';
import { api } from '../../api';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  Database,
  Settings,
  GitBranch,
  Circle,
  Dot,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  Hash,
  Package,
  BarChart3,
  Calendar,
  Search,
  X,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  Eye,
  FolderPlus,
  FilePlus,
  RefreshCw
} from 'lucide-react';

export interface EnhancedFileTreeProps {
  rootPath?: string;
  nodes?: FileTreeNode[];
  onNodeSelect?: (node: FileTreeNode) => void;
  onNodeExpand?: (node: FileTreeNode) => void;
  onNodePreview?: (node: FileTreeNode, preview: FilePreview) => void;
  onNodeAction?: (node: FileTreeNode, action: string) => void;
  settings?: Partial<FileTreeSettings>;
  className?: string;
  height?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Default settings for file tree
const DEFAULT_SETTINGS: FileTreeSettings = {
  showHiddenFiles: false,
  showGitStatus: true,
  showFileIcons: true,
  sortBy: 'name',
  sortOrder: 'asc',
  virtualScrolling: true,
  previewOnHover: true
};

// File type to icon mapping
const getFileIcon = (fileName: string, isDirectory: boolean, isExpanded: boolean = false) => {
  if (isDirectory) {
    return isExpanded ? FolderOpen : Folder;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'rs':
    case 'go':
    case 'java':
    case 'cpp':
    case 'c':
      return FileCode;
    case 'md':
    case 'txt':
    case 'doc':
    case 'docx':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'webm':
      return FileVideo;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'ogg':
      return FileAudio;
    case 'json':
    case 'sql':
    case 'db':
    case 'sqlite':
      return Database;
    case 'config':
    case 'conf':
    case 'ini':
    case 'toml':
    case 'yaml':
    case 'yml':
      return Settings;
    default:
      return File;
  }
};

// Git status to icon and color mapping
const getGitStatusIndicator = (status: GitFileStatus) => {
  switch (status) {
    case 'modified':
      return { icon: Circle, color: 'text-orange-500', label: 'Modified' };
    case 'added':
      return { icon: Plus, color: 'text-green-500', label: 'Added' };
    case 'deleted':
      return { icon: Minus, color: 'text-red-500', label: 'Deleted' };
    case 'untracked':
      return { icon: Dot, color: 'text-blue-500', label: 'Untracked' };
    case 'renamed':
      return { icon: GitBranch, color: 'text-purple-500', label: 'Renamed' };
    case 'unmerged':
      return { icon: AlertCircle, color: 'text-red-600', label: 'Conflict' };
    default:
      return null;
  }
};

// Sort nodes based on settings
const sortNodes = (nodes: FileTreeNode[], sortBy: FileTreeSettings['sortBy'], sortOrder: FileTreeSettings['sortOrder']) => {
  return [...nodes].sort((a, b) => {
    // Always put directories first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'type':
        comparison = a.metadata.fileType.localeCompare(b.metadata.fileType);
        break;
      case 'modified':
        comparison = new Date(a.metadata.lastModified).getTime() - new Date(b.metadata.lastModified).getTime();
        break;
      case 'size':
        comparison = a.metadata.size - b.metadata.size;
        break;
      default:
        comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

// Flatten tree for virtual scrolling
const flattenTree = (nodes: FileTreeNode[], level: number = 0): Array<FileTreeNode & { level: number }> => {
  const result: Array<FileTreeNode & { level: number }> = [];
  
  for (const node of nodes) {
    result.push({ ...node, level });
    
    if (node.isExpanded && node.children.length > 0) {
      result.push(...flattenTree(node.children, level + 1));
    }
  }
  
  return result;
};

// Search bar component
interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = "Search files..."
}) => {
  return (
    <div className="relative mb-2">
      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
        <Search className="h-3 w-3 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 right-0 pr-2 flex items-center"
        >
          <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
};

// Context menu component
interface ContextMenuProps {
  node: FileTreeNode;
  isVisible: boolean;
  position: { x: number; y: number };
  onAction: (action: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  node,
  isVisible,
  position,
  onAction,
  onClose
}) => {
  if (!isVisible) return null;

  const actions = [
    ...(node.type === 'file' ? [
      { id: 'open', label: 'Open', icon: Eye },
      { id: 'edit', label: 'Edit', icon: Edit },
      { id: 'copy-path', label: 'Copy Path', icon: Copy },
      { id: 'delete', label: 'Delete', icon: Trash2, dangerous: true }
    ] : [
      { id: 'expand', label: node.isExpanded ? 'Collapse' : 'Expand', icon: node.isExpanded ? ChevronDown : ChevronRight },
      { id: 'new-file', label: 'New File', icon: FilePlus },
      { id: 'new-folder', label: 'New Folder', icon: FolderPlus },
      { id: 'copy-path', label: 'Copy Path', icon: Copy },
      { id: 'refresh', label: 'Refresh', icon: RefreshCw },
      { id: 'delete', label: 'Delete', icon: Trash2, dangerous: true }
    ])
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
        style={{
          left: position.x,
          top: position.y
        }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              onAction(action.id);
              onClose();
            }}
            className={`
              w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors
              ${action.dangerous ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
            `}
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
};

// Preview tooltip component
interface PreviewTooltipProps {
  node: FileTreeNode;
  preview: FilePreview;
  isVisible: boolean;
  position: { x: number; y: number };
}

const PreviewTooltip: React.FC<PreviewTooltipProps> = ({
  node,
  preview,
  isVisible,
  position
}) => {
  if (!isVisible) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity < 0.3) return 'text-green-600';
    if (complexity < 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplexityLabel = (complexity: number) => {
    if (complexity < 0.3) return 'Low';
    if (complexity < 0.7) return 'Medium';
    return 'High';
  };

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        pointerEvents: 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
        <div className="w-4 h-4">
          {React.createElement(getFileIcon(node.name, node.type === 'directory'), {
            className: 'h-4 w-4 text-gray-600'
          })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {node.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {node.type === 'file' ? node.metadata.fileType : 'Directory'}
          </div>
        </div>
      </div>

      {/* Content Summary */}
      <div className="mb-2">
        <div className="text-xs text-gray-700 mb-1">
          {preview.contentSummary}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* File Size */}
        <div className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3 text-gray-400" />
          <span className="text-gray-600">
            {formatFileSize(preview.fileSize)}
          </span>
        </div>

        {/* Symbol Count */}
        {preview.symbolCount > 0 && (
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">
              {preview.symbolCount} symbols
            </span>
          </div>
        )}

        {/* Last Modified */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-gray-600">
            {formatDate(preview.lastModified)}
          </span>
        </div>

        {/* Complexity */}
        {node.type === 'file' && preview.complexity > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className={getComplexityColor(preview.complexity)}>
              {getComplexityLabel(preview.complexity)}
            </span>
          </div>
        )}
      </div>

      {/* Main Symbols */}
      {preview.mainSymbols.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-1">
            Main Symbols:
          </div>
          <div className="space-y-1">
            {preview.mainSymbols.slice(0, 3).map((symbol, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-600 truncate">
                  {symbol.identifier}
                </span>
                <span className="text-gray-400 text-xs">
                  ({symbol.kind})
                </span>
              </div>
            ))}
            {preview.mainSymbols.length > 3 && (
              <div className="text-xs text-gray-400">
                +{preview.mainSymbols.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {preview.dependencies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-1">
            Dependencies:
          </div>
          <div className="flex flex-wrap gap-1">
            {preview.dependencies.slice(0, 3).map((dep, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-xs text-gray-600 rounded"
              >
                <Package className="h-2 w-2" />
                {dep}
              </span>
            ))}
            {preview.dependencies.length > 3 && (
              <span className="text-xs text-gray-400">
                +{preview.dependencies.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// File tree node component
interface FileTreeNodeItemProps {
  node: FileTreeNode & { level: number };
  settings: FileTreeSettings;
  onToggleExpand: (node: FileTreeNode) => void;
  onSelect: (node: FileTreeNode) => void;
  onPreview: (node: FileTreeNode, preview: FilePreview) => void;
  onAction: (node: FileTreeNode, action: string) => void;
  style: React.CSSProperties;
  searchQuery?: string;
}

const FileTreeNodeItem: React.FC<FileTreeNodeItemProps> = ({
  node,
  settings,
  onToggleExpand,
  onSelect,
  onPreview,
  onAction,
  style,
  searchQuery = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const FileIcon = getFileIcon(node.name, node.type === 'directory', node.isExpanded);
  const gitStatus = settings.showGitStatus ? getGitStatusIndicator(node.metadata.gitStatus) : null;

  // Check if file was recently modified (within last 24 hours)
  const isRecentlyModified = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return node.metadata.lastModified > oneDayAgo;
  }, [node.metadata.lastModified]);

  // Highlight search matches
  const highlightedName = useMemo(() => {
    if (!searchQuery.trim()) return node.name;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = node.name.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [node.name, searchQuery]);

  // Load preview on hover
  useEffect(() => {
    if (isHovered && settings.previewOnHover && !preview && !previewLoading) {
      setPreviewLoading(true);
      
      // Load actual preview data from API
      const loadPreview = async () => {
        try {
          let previewData: FilePreview;
          
          if (node.type === 'file') {
            // For files, analyze content and get symbol information
            const fileAnalysis = await api.analyzeFileStructure(node.path);
            const symbolUsage = node.metadata.symbolCount > 0 ? 
              await api.analyzeSymbolUsage(node.path) : null;
            
            previewData = {
              symbolCount: node.metadata.symbolCount,
              mainSymbols: fileAnalysis?.outline?.slice(0, 5).map((item: any) => ({
                identifier: item.name,
                kind: item.type,
                location: {
                  path: node.path,
                  line: item.startLine,
                  column: 0
                }
              })) || [],
              fileSize: node.metadata.size,
              lastModified: node.metadata.lastModified,
              contentSummary: generateContentSummary(node, fileAnalysis),
              complexity: calculateComplexity(fileAnalysis),
              dependencies: extractDependencies(fileAnalysis),
              thumbnail: await generateThumbnail(node, fileAnalysis)
            };
          } else {
            // For directories, provide summary information
            const childStats = analyzeDirectoryContents(node);
            
            previewData = {
              symbolCount: childStats.totalSymbols,
              mainSymbols: [],
              fileSize: childStats.totalSize,
              lastModified: node.metadata.lastModified,
              contentSummary: `Directory with ${node.children.length} items (${childStats.fileCount} files, ${childStats.dirCount} directories)`,
              complexity: 0,
              dependencies: [],
              thumbnail: undefined
            };
          }
          
          setPreview(previewData);
          onPreview(node, previewData);
        } catch (error) {
          console.error('Failed to load preview for', node.path, error);
          // Fallback to basic preview
          const fallbackPreview: FilePreview = {
            symbolCount: node.metadata.symbolCount,
            mainSymbols: [],
            fileSize: node.metadata.size,
            lastModified: node.metadata.lastModified,
            contentSummary: node.type === 'file' ? 
              `${node.metadata.fileType} file` : 
              `Directory with ${node.children.length} items`,
            complexity: 0,
            dependencies: []
          };
          
          setPreview(fallbackPreview);
          onPreview(node, fallbackPreview);
        } finally {
          setPreviewLoading(false);
        }
      };
      
      loadPreview();
    }
  }, [isHovered, settings.previewOnHover, preview, previewLoading, node, onPreview]);

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      onToggleExpand(node);
    } else {
      onSelect(node);
    }
  }, [node, onToggleExpand, onSelect]);

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    setIsHovered(true);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isHovered) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  }, [isHovered]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  }, []);

  const handleContextMenuAction = useCallback((action: string) => {
    onAction(node, action);
  }, [node, onAction]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
  }, []);

  return (
    <>
      <div
        style={style}
        className={`
          flex items-center px-2 py-1 cursor-pointer hover:bg-gray-50 transition-colors
          ${node.isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
          ${isHovered ? 'bg-gray-50' : ''}
          ${isRecentlyModified ? 'bg-green-50 border-l-2 border-green-400' : ''}
        `}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
      {/* Indentation */}
      <div style={{ width: node.level * 16 }} />
      
      {/* Expand/Collapse Icon */}
      {node.type === 'directory' && (
        <div className="w-4 h-4 mr-1 flex items-center justify-center">
          {node.children.length > 0 && (
            node.isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )
          )}
        </div>
      )}
      
      {/* File/Directory Icon */}
      {settings.showFileIcons && (
        <div className="w-4 h-4 mr-2 flex items-center justify-center">
          <FileIcon className="h-3 w-3 text-gray-600" />
        </div>
      )}
      
      {/* Name */}
      <span className={`
        flex-1 text-sm truncate
        ${node.type === 'directory' ? 'font-medium text-gray-800' : 'text-gray-700'}
        ${node.isSelected ? 'text-blue-700' : ''}
        ${isRecentlyModified ? 'font-medium' : ''}
      `}>
        {highlightedName}
      </span>

      {/* Recent modification indicator */}
      {isRecentlyModified && (
        <div className="ml-1 w-2 h-2 bg-green-400 rounded-full" title="Recently modified" />
      )}
      
      {/* Git Status Indicator */}
      {gitStatus && (
        <div className="ml-2 flex items-center">
          <gitStatus.icon className={`h-3 w-3 ${gitStatus.color}`} title={gitStatus.label} />
        </div>
      )}
      
      {/* File Size (for files) */}
      {node.type === 'file' && (
        <span className="ml-2 text-xs text-gray-500">
          {formatFileSize(node.metadata.size)}
        </span>
      )}
      
        {/* Preview Loading Indicator */}
        {previewLoading && (
          <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Preview Tooltip */}
      {settings.previewOnHover && preview && isHovered && (
        <PreviewTooltip
          node={node}
          preview={preview}
          isVisible={true}
          position={tooltipPosition}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        node={node}
        isVisible={contextMenuVisible}
        position={contextMenuPosition}
        onAction={handleContextMenuAction}
        onClose={handleContextMenuClose}
      />
    </>
  );
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function EnhancedFileTree({
  rootPath = '',
  nodes = [],
  onNodeSelect,
  onNodeExpand,
  onNodePreview,
  onNodeAction,
  settings: userSettings = {},
  className = '',
  height = 300,
  searchQuery: externalSearchQuery = '',
  onSearchChange
}: EnhancedFileTreeProps) {
  const [treeNodes, setTreeNodes] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Merge user settings with defaults
  const settings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...userSettings
  }), [userSettings]);

  // Use external search query if provided, otherwise use internal
  const searchQuery = externalSearchQuery || internalSearchQuery;

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  }, [onSearchChange]);

  // Load initial tree data
  useEffect(() => {
    const loadTreeData = async () => {
      if (!rootPath) return;

      setLoading(true);
      setError(null);

      try {
        const result = await api.getEnhancedFileTree(rootPath, {
          showHidden: settings.showHiddenFiles,
          includeGitStatus: settings.showGitStatus
        });

        // Transform API result to FileTreeNode format
        const transformNode = (apiNode: any): FileTreeNode => ({
          id: apiNode.id || apiNode.path,
          name: apiNode.name,
          path: apiNode.path,
          type: apiNode.type,
          isExpanded: false,
          isSelected: false,
          children: apiNode.children ? apiNode.children.map(transformNode) : [],
          metadata: {
            size: apiNode.metadata?.size || 0,
            lastModified: new Date(apiNode.metadata?.lastModified || Date.now()),
            gitStatus: apiNode.metadata?.gitStatus || 'clean',
            symbolCount: apiNode.metadata?.symbolCount || 0,
            fileType: apiNode.metadata?.fileType || getFileExtension(apiNode.name),
            isHidden: apiNode.metadata?.isHidden || false,
            permissions: apiNode.metadata?.permissions || 'r--'
          }
        });

        const transformedNodes = result.nodes.map(transformNode);
        setTreeNodes(transformedNodes);
      } catch (err) {
        console.error('Failed to load file tree:', err);
        setError('Failed to load file tree');
      } finally {
        setLoading(false);
      }
    };

    loadTreeData();
  }, [rootPath, settings.showHiddenFiles, settings.showGitStatus]);

  // Handle node expansion
  const handleNodeExpand = useCallback((targetNode: FileTreeNode) => {
    const updateNodeExpansion = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        if (node.id === targetNode.id) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNodeExpansion(node.children) };
        }
        return node;
      });
    };

    setTreeNodes(updateNodeExpansion(treeNodes));
    onNodeExpand?.(targetNode);
  }, [treeNodes, onNodeExpand]);

  // Handle node selection
  const handleNodeSelect = useCallback((targetNode: FileTreeNode) => {
    const updateNodeSelection = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        const isSelected = node.id === targetNode.id;
        const updatedNode = { ...node, isSelected };
        
        if (node.children.length > 0) {
          updatedNode.children = updateNodeSelection(node.children);
        }
        
        return updatedNode;
      });
    };

    setTreeNodes(updateNodeSelection(treeNodes));
    onNodeSelect?.(targetNode);
  }, [treeNodes, onNodeSelect]);

  // Handle preview
  const handleNodePreview = useCallback((node: FileTreeNode, preview: FilePreview) => {
    onNodePreview?.(node, preview);
  }, [onNodePreview]);

  // Handle node actions
  const handleNodeAction = useCallback((node: FileTreeNode, action: string) => {
    onNodeAction?.(node, action);
  }, [onNodeAction]);

  // Sort and flatten nodes for virtual scrolling
  const flattenedNodes = useMemo(() => {
    const sortedNodes = sortNodes(treeNodes, settings.sortBy, settings.sortOrder);
    return flattenTree(sortedNodes);
  }, [treeNodes, settings.sortBy, settings.sortOrder]);

  // Filter hidden files and apply search
  const visibleNodes = useMemo(() => {
    let filtered = flattenedNodes;

    // Filter hidden files
    if (!settings.showHiddenFiles) {
      filtered = filtered.filter(node => !node.metadata.isHidden && !node.name.startsWith('.'));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(query) ||
        node.path.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [flattenedNodes, settings.showHiddenFiles, searchQuery]);

  // Row renderer for virtual scrolling
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = visibleNodes[index];
    if (!node) return null;

    return (
      <FileTreeNodeItem
        key={node.id}
        node={node}
        settings={settings}
        onToggleExpand={handleNodeExpand}
        onSelect={handleNodeSelect}
        onPreview={handleNodePreview}
        onAction={handleNodeAction}
        style={style}
        searchQuery={searchQuery}
      />
    );
  }, [visibleNodes, settings, handleNodeExpand, handleNodeSelect, handleNodePreview, handleNodeAction, searchQuery]);

  if (loading) {
    return (
      <div className={`enhanced-file-tree ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading file tree...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`enhanced-file-tree ${className}`}>
        <div className="flex items-center justify-center p-4 text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (visibleNodes.length === 0) {
    return (
      <div className={`enhanced-file-tree ${className}`}>
        <div className="flex items-center justify-center p-4 text-gray-500">
          <Folder className="h-4 w-4 mr-2" />
          <span className="text-sm">No files found</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`enhanced-file-tree ${className}`}>
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        placeholder="Search files and folders..."
      />

      {/* File Tree */}
      {settings.virtualScrolling ? (
        <List
          height={height - 40} // Account for search bar height
          itemCount={visibleNodes.length}
          itemSize={28}
          width="100%"
        >
          {Row}
        </List>
      ) : (
        <div className="overflow-auto" style={{ height: height - 40 }}>
          {visibleNodes.map((node, index) => (
            <FileTreeNodeItem
              key={node.id}
              node={node}
              settings={settings}
              onToggleExpand={handleNodeExpand}
              onSelect={handleNodeSelect}
              onPreview={handleNodePreview}
              onAction={handleNodeAction}
              style={{ height: 28 }}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery.trim() && (
        <div className="mt-2 px-2 py-1 text-xs text-gray-500 border-t">
          {visibleNodes.length} result{visibleNodes.length !== 1 ? 's' : ''} for "{searchQuery}"
        </div>
      )}
    </div>
  );
}

// Utility function to get file extension
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

// Generate content summary based on file analysis
const generateContentSummary = (node: FileTreeNode, analysis: any): string => {
  if (!analysis || !analysis.outline) {
    return `${node.metadata.fileType} file`;
  }

  const outline = analysis.outline;
  const symbolTypes = new Map<string, number>();
  
  const countSymbols = (items: any[]) => {
    for (const item of items) {
      const count = symbolTypes.get(item.type) || 0;
      symbolTypes.set(item.type, count + 1);
      if (item.children) {
        countSymbols(item.children);
      }
    }
  };
  
  countSymbols(outline);
  
  const summaryParts: string[] = [];
  for (const [type, count] of symbolTypes.entries()) {
    if (count > 0) {
      summaryParts.push(`${count} ${type}${count > 1 ? 's' : ''}`);
    }
  }
  
  return summaryParts.length > 0 ? 
    summaryParts.join(', ') : 
    `${node.metadata.fileType} file`;
};

// Calculate complexity score based on file analysis
const calculateComplexity = (analysis: any): number => {
  if (!analysis || !analysis.outline) {
    return 0;
  }
  
  let complexity = 0;
  const calculateNodeComplexity = (items: any[]) => {
    for (const item of items) {
      // Base complexity for each symbol
      complexity += 0.1;
      
      // Additional complexity for nested structures
      if (item.children && item.children.length > 0) {
        complexity += item.children.length * 0.05;
        calculateNodeComplexity(item.children);
      }
      
      // Additional complexity based on symbol type
      switch (item.type) {
        case 'class':
        case 'interface':
          complexity += 0.2;
          break;
        case 'method':
        case 'function':
          complexity += 0.15;
          break;
        case 'property':
        case 'variable':
          complexity += 0.05;
          break;
      }
    }
  };
  
  calculateNodeComplexity(analysis.outline);
  return Math.min(1, complexity); // Cap at 1.0
};

// Extract dependencies from file analysis
const extractDependencies = (analysis: any): string[] => {
  if (!analysis || !analysis.outline) {
    return [];
  }
  
  const dependencies: string[] = [];
  
  // Look for import statements in the outline
  for (const item of analysis.outline) {
    if (item.type === 'imports' || item.name === 'imports') {
      // Extract import information (this would be more sophisticated in real implementation)
      dependencies.push('react', 'typescript', 'lodash'); // Mock dependencies
      break;
    }
  }
  
  return dependencies.slice(0, 5); // Limit to 5 dependencies
};

// Generate thumbnail for file preview
const generateThumbnail = async (node: FileTreeNode, analysis: any): Promise<string | undefined> => {
  // For now, return undefined - in a real implementation, this would generate
  // a visual thumbnail of the file content or structure
  return undefined;
};

// Analyze directory contents for summary
const analyzeDirectoryContents = (node: FileTreeNode): {
  totalSymbols: number;
  totalSize: number;
  fileCount: number;
  dirCount: number;
} => {
  let totalSymbols = 0;
  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;
  
  const analyzeNode = (currentNode: FileTreeNode) => {
    if (currentNode.type === 'file') {
      fileCount++;
      totalSymbols += currentNode.metadata.symbolCount;
      totalSize += currentNode.metadata.size;
    } else {
      dirCount++;
    }
    
    for (const child of currentNode.children) {
      analyzeNode(child);
    }
  };
  
  for (const child of node.children) {
    analyzeNode(child);
  }
  
  return { totalSymbols, totalSize, fileCount, dirCount };
};

export default EnhancedFileTree;