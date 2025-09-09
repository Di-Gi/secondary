// [[PROJECT_NAME]]/src/components/SymbolExplorer.tsx
// Purpose: Interactive component for browsing codebase symbols with improved layout and density modes
// Architecture: Enhanced with three density modes, smart actions, and better information hierarchy
// Dependencies: React, Symbol type from api.ts, lucide-react for icons, UI components, dropdown menu
import { useState, useMemo, memo, useCallback } from 'react';
import { Symbol } from '../api';
import { useAppStore } from '../store/appStore';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CodeViewer } from './CodeViewer';
import { ProfileCreationDialog } from './ProfileCreationDialog';
import { VirtualizedSymbolList } from './VirtualizedSymbolList';
import { useDebounce, usePerformanceMonitor } from '../hooks/usePerformance';
import { 
  Search, 
  MoreHorizontal,
  Grid3X3,
  List,
  Rows3,
  FolderPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type DensityMode = 'compact' | 'comfortable' | 'detailed';

interface SymbolExplorerProps {
  symbols: Symbol[];
  onSymbolSelect?: (symbol: Symbol | null) => void;
}

export const SymbolExplorer = memo<SymbolExplorerProps>(({ symbols, onSymbolSelect }) => {
  const { } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [viewingSymbol, setViewingSymbol] = useState<Symbol | null>(null);
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable');

  // Performance monitoring
  usePerformanceMonitor('SymbolExplorer');

  // Debounced search for better performance
  const debouncedSetSearchTerm = useDebounce(setSearchTerm, 300);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm && !selectedKind) return symbols;
    
    return symbols.filter(symbol => {
      const matchesSearch = !searchTerm || symbol.identifier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKind = !selectedKind || symbol.kind === selectedKind;
      return matchesSearch && matchesKind;
    });
  }, [symbols, searchTerm, selectedKind]);

  const symbolKinds = useMemo(() => {
    const kinds = new Set(symbols.map(s => s.kind));
    return Array.from(kinds).sort();
  }, [symbols]);



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

  const handleSymbolAction = useCallback((symbol: Symbol, action: 'view' | 'context' | 'copy' | 'references') => {
    switch (action) {
      case 'view':
        setViewingSymbol(symbol);
        break;
      case 'context':
        setSelectedSymbol(symbol);
        onSymbolSelect?.(symbol);
        break;
      case 'copy':
        navigator.clipboard.writeText(symbol.location.path);
        break;
      case 'references':
        // TODO: Implement find references functionality
        console.log('Find references for:', symbol.identifier);
        break;
    }
  }, []);

  const handleSymbolSelect = useCallback((symbol: Symbol) => {
    // Toggle selection - if clicking the same symbol, deselect it
    if (selectedSymbol?.identifier === symbol.identifier) {
      setSelectedSymbol(null);
      onSymbolSelect?.(null);
    } else {
      setSelectedSymbol(symbol);
      onSymbolSelect?.(symbol);
    }
  }, [selectedSymbol, onSymbolSelect]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearchTerm(e.target.value);
  }, [debouncedSetSearchTerm]);

  // Removed renderSymbolItem function - now using VirtualizedSymbolList for better performance

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
            onChange={handleSearchChange}
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
      <div className="flex-1">
        {filteredSymbols.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No symbols found</p>
            {searchTerm && (
              <p className="text-xs">Try adjusting your search term</p>
            )}
          </div>
        ) : (
          <VirtualizedSymbolList
            symbols={filteredSymbols}
            selectedSymbolId={selectedSymbol?.identifier}
            onSymbolSelect={handleSymbolSelect}
            onSymbolAction={handleSymbolAction}
            height={400}
            itemHeight={densityMode === 'compact' ? 32 : densityMode === 'comfortable' ? 48 : 80}
          />
        )}
      </div>



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
});

SymbolExplorer.displayName = 'SymbolExplorer';
// Integration: [This component is a key part of the `ProjectWorkspace`. Its updates are crucial for visualizing the results of the new polyglot backend.]
// Notes: [New icons from `lucide-react` have been chosen to represent Rust constructs. The helper functions are now strongly typed with `Symbol['kind']` for better safety and intellisense.]