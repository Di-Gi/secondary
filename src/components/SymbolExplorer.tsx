// [[PROJECT_NAME]]/src/components/SymbolExplorer.tsx
// Purpose: Interactive component for browsing codebase symbols with improved layout and density modes
// Architecture: Enhanced with three density modes, smart actions, and better information hierarchy
// Dependencies: React, Symbol type from api.ts, lucide-react for icons, UI components, dropdown menu
import { useState, useMemo } from 'react';
import { Symbol } from '../api';
import { useAppStore } from '../store/appStore';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CodeViewer } from './CodeViewer';
import { ContextPanel } from './ContextPanel';
import { ProfileCreationDialog } from './ProfileCreationDialog';
import { 
  Search, 
  FileText, 
  SquareFunction, 
  Box, 
  Code, 
  Shapes, 
  Library, 
  Spline, 
  Component, 
  FunctionSquare, 
  TerminalSquare,
  Eye,
  Zap,
  MoreHorizontal,
  Grid3X3,
  List,
  Rows3,
  Copy,
  ExternalLink,
  FolderPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type DensityMode = 'compact' | 'comfortable' | 'detailed';

interface SymbolExplorerProps {
  symbols: Symbol[];
}

export function SymbolExplorer({ symbols }: SymbolExplorerProps) {
  const { } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [viewingSymbol, setViewingSymbol] = useState<Symbol | null>(null);
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable');
  const [showContextInline, setShowContextInline] = useState(false);

  const filteredSymbols = useMemo(() => {
    return symbols.filter(symbol => {
      const matchesSearch = symbol.identifier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKind = !selectedKind || symbol.kind === selectedKind;
      return matchesSearch && matchesKind;
    });
  }, [symbols, searchTerm, selectedKind]);

  const symbolKinds = useMemo(() => {
    const kinds = new Set(symbols.map(s => s.kind));
    return Array.from(kinds).sort();
  }, [symbols]);

  const getSymbolIcon = (kind: Symbol['kind']) => {
    switch (kind) {
      // TS/JS
      case 'TSFunction':
        return <SquareFunction className="h-4 w-4" />;
      case 'TSClass':
        return <Box className="h-4 w-4" />;
      case 'TSInterface':
        return <Code className="h-4 w-4" />;
      // Rust
      case 'Struct':
        return <Component className="h-4 w-4" />;
      case 'Enum':
        return <Spline className="h-4 w-4" />;
      case 'Trait':
        return <Shapes className="h-4 w-4" />;
      case 'Function':
        return <FunctionSquare className="h-4 w-4" />;
      case 'Impl':
         return <FunctionSquare className="h-4 w-4 opacity-70" />;
      case 'Module':
        return <Library className="h-4 w-4" />;
      case 'Macro':
        return <TerminalSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSymbolColor = (kind: Symbol['kind']) => {
    switch (kind) {
      // TS/JS
      case 'TSFunction':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'TSClass':
        return 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20';
      case 'TSInterface':
        return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20';
      // Rust
      case 'Struct':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      case 'Enum':
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'Trait':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      case 'Function':
         return 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/20';
      case 'Impl':
         return 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/20';
      case 'Module':
        return 'text-lime-600 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20';
      case 'Macro':
        return 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatKind = (kind: Symbol['kind']) => {
    if (kind.startsWith('TS')) {
        return `TS ${kind.substring(2)}`;
    }
    return kind;
  };

  const getDensityIcon = (mode: DensityMode) => {
    switch (mode) {
      case 'compact': return <Rows3 className="h-4 w-4" />;
      case 'comfortable': return <List className="h-4 w-4" />;
      case 'detailed': return <Grid3X3 className="h-4 w-4" />;
    }
  };

  const handleSymbolAction = (symbol: Symbol, action: 'view' | 'context' | 'copy' | 'references') => {
    switch (action) {
      case 'view':
        setViewingSymbol(symbol);
        break;
      case 'context':
        setSelectedSymbol(symbol);
        setShowContextInline(true);
        break;
      case 'copy':
        navigator.clipboard.writeText(symbol.location.path);
        break;
      case 'references':
        // TODO: Implement find references functionality
        console.log('Find references for:', symbol.identifier);
        break;
    }
  };

  const renderSymbolItem = (symbol: Symbol, index: number) => {
    const isSelected = selectedSymbol === symbol;
    const fileName = symbol.location.path.split('/').pop();
    
    switch (densityMode) {
      case 'compact':
        return (
          <div
            key={`${symbol.location.path}-${symbol.identifier}-${symbol.location.line}-${index}`}
            className={`group flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer border-l-2 transition-all ${
              isSelected ? 'border-l-primary bg-primary/10' : 'border-l-transparent'
            }`}
            onClick={() => setSelectedSymbol(symbol)}
          >
            <div className={`p-0.5 rounded ${getSymbolColor(symbol.kind)}`}>
              {getSymbolIcon(symbol.kind)}
            </div>
            <span className="font-medium text-sm truncate flex-1">
              {symbol.identifier}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {fileName}:{symbol.location.line}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'view')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Definition
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'context')}>
                    <Zap className="h-4 w-4 mr-2" />
                    Show Context
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'references')}>
                    <Search className="h-4 w-4 mr-2" />
                    Find References
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'copy')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Path
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );

      case 'comfortable':
        return (
          <div
            key={`${symbol.location.path}-${symbol.identifier}-${symbol.location.line}-${index}`}
            className={`group flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-l-2 transition-all ${
              isSelected ? 'border-l-primary bg-primary/10' : 'border-l-transparent'
            }`}
            onClick={() => setSelectedSymbol(symbol)}
          >
            <div className={`p-1 rounded ${getSymbolColor(symbol.kind)}`}>
              {getSymbolIcon(symbol.kind)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {symbol.identifier}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {fileName}:{symbol.location.line}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatKind(symbol.kind)}
            </Badge>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'view')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Definition
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'context')}>
                    <Zap className="h-4 w-4 mr-2" />
                    Show Context
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'references')}>
                    <Search className="h-4 w-4 mr-2" />
                    Find References
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'copy')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Path
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );

      case 'detailed':
        return (
          <div
            key={`${symbol.location.path}-${symbol.identifier}-${symbol.location.line}-${index}`}
            className={`group p-3 hover:bg-muted/50 cursor-pointer border-l-2 transition-all border rounded-lg mx-2 mb-2 ${
              isSelected ? 'border-l-primary bg-primary/10 border-primary/20' : 'border-l-transparent border-border'
            }`}
            onClick={() => setSelectedSymbol(symbol)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1 rounded ${getSymbolColor(symbol.kind)}`}>
                {getSymbolIcon(symbol.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate mb-1">
                  {symbol.identifier}
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">
                  {symbol.location.path.split('/').pop()}:{symbol.location.line}
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {formatKind(symbol.kind)}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSymbolAction(symbol, 'context');
                      }}
                      className="h-6 w-6 p-0"
                      title="Show Context"
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSymbolAction(symbol, 'view');
                      }}
                      className="h-6 w-6 p-0"
                      title="View Definition"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'references')}>
                          <Search className="h-4 w-4 mr-2" />
                          Find References
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'copy')}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Path
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSymbolAction(symbol, 'view')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Editor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Controls */}
      <div className="p-3 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Symbols</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileDialogOpen(true)}
              className="h-7 px-2"
              title="Create profile from files"
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              <span className="text-xs">Profile</span>
            </Button>
            {(['compact', 'comfortable', 'detailed'] as DensityMode[]).map((mode) => (
              <Button
                key={mode}
                variant={densityMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setDensityMode(mode)}
                className="h-7 w-7 p-0"
                title={`${mode} view`}
              >
                {getDensityIcon(mode)}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
        
        {/* Compact Filter Pills */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={selectedKind === null ? "default" : "outline"}
            className="cursor-pointer text-xs h-6"
            onClick={() => setSelectedKind(null)}
          >
            All ({symbols.length})
          </Badge>
          {symbolKinds.slice(0, 3).map(kind => (
            <Badge
              key={kind}
              variant={selectedKind === kind ? "default" : "outline"}
              className="cursor-pointer text-xs h-6"
              onClick={() => setSelectedKind(selectedKind === kind ? null : kind)}
            >
              {formatKind(kind as Symbol['kind'])} ({symbols.filter(s => s.kind === kind).length})
            </Badge>
          ))}
          {symbolKinds.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {symbolKinds.slice(3).map(kind => (
                  <DropdownMenuItem
                    key={kind}
                    onClick={() => setSelectedKind(selectedKind === kind ? null : kind)}
                  >
                    {formatKind(kind as Symbol['kind'])} ({symbols.filter(s => s.kind === kind).length})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-auto">
        {filteredSymbols.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No symbols found</p>
            {searchTerm && (
              <p className="text-xs">Try adjusting your search term</p>
            )}
          </div>
        ) : (
          <div className={densityMode === 'detailed' ? 'p-2' : ''}>
            {filteredSymbols.map((symbol, index) => renderSymbolItem(symbol, index))}
          </div>
        )}
      </div>

      {/* Inline Context (only when enabled and symbol selected) */}
      {showContextInline && selectedSymbol && (
        <div className="border-t border-border max-h-48 overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Context for {selectedSymbol.identifier}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContextInline(false)}
                className="h-5 w-5 p-0"
              >
                ×
              </Button>
            </div>
            <ContextPanel 
              symbol={selectedSymbol} 
              onFileClick={(filePath) => {
                console.log('File clicked:', filePath);
              }}
            />
          </div>
        </div>
      )}

      {/* Context Panel (traditional bottom panel when not inline) */}
      {selectedSymbol && !showContextInline && (
        <div className="border-t border-border">
          <ContextPanel 
            symbol={selectedSymbol} 
            onFileClick={(filePath) => {
              console.log('File clicked:', filePath);
            }}
          />
        </div>
      )}

      {/* Code Viewer Modal */}
      {viewingSymbol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto">
            <CodeViewer
              symbol={viewingSymbol}
              onClose={() => setViewingSymbol(null)}
            />
          </div>
        </div>
      )}

      {/* Profile Creation Dialog */}
      <ProfileCreationDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
      />
    </div>
  );


}
// Integration: [This component is a key part of the `ProjectWorkspace`. Its updates are crucial for visualizing the results of the new polyglot backend.]
// Notes: [New icons from `lucide-react` have been chosen to represent Rust constructs. The helper functions are now strongly typed with `Symbol['kind']` for better safety and intellisense.]