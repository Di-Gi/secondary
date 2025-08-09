import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Symbol } from '../api';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
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
  ChevronDown,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';

interface EnhancedSymbolExplorerProps {
  symbols: Symbol[];
  onSymbolSelect?: (symbol: Symbol) => void;
  onSymbolNavigate?: (symbol: Symbol) => void;
}

interface GroupedSymbols {
  [filePath: string]: Symbol[];
}

interface SymbolTypeFilter {
  type: Symbol['kind'];
  enabled: boolean;
  count: number;
}

export function EnhancedSymbolExplorer({ 
  symbols, 
  onSymbolSelect, 
  onSymbolNavigate 
}: EnhancedSymbolExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [symbolTypeFilters, setSymbolTypeFilters] = useState<SymbolTypeFilter[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const symbolListRef = useRef<HTMLDivElement>(null);

  // Initialize symbol type filters
  useEffect(() => {
    const symbolTypes = new Map<Symbol['kind'], number>();
    symbols.forEach(symbol => {
      symbolTypes.set(symbol.kind, (symbolTypes.get(symbol.kind) || 0) + 1);
    });

    const filters: SymbolTypeFilter[] = Array.from(symbolTypes.entries())
      .map(([type, count]) => ({ type, enabled: true, count }))
      .sort((a, b) => a.type.localeCompare(b.type));

    setSymbolTypeFilters(filters);
  }, [symbols]);

  // Fuzzy matching function
  const fuzzyMatch = useCallback((text: string, pattern: string): number => {
    if (!pattern) return 1;
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Exact match gets highest score
    if (textLower.includes(patternLower)) {
      return 1 - (textLower.indexOf(patternLower) / textLower.length);
    }
    
    // Fuzzy matching
    let patternIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIndex]) {
        score += 1 + consecutiveMatches;
        consecutiveMatches++;
        patternIndex++;
      } else {
        consecutiveMatches = 0;
      }
    }
    
    return patternIndex === patternLower.length ? score / (textLower.length * patternLower.length) : 0;
  }, []);

  // Filter and group symbols
  const { filteredSymbols, groupedSymbols } = useMemo(() => {
    const enabledTypes = new Set(
      symbolTypeFilters.filter(f => f.enabled).map(f => f.type)
    );

    const filtered = symbols
      .filter(symbol => {
        const matchesType = enabledTypes.size === 0 || enabledTypes.has(symbol.kind);
        const matchesSearch = fuzzyMatch(symbol.identifier, searchTerm) > 0;
        return matchesType && matchesSearch;
      })
      .map(symbol => ({
        ...symbol,
        searchScore: fuzzyMatch(symbol.identifier, searchTerm)
      }))
      .sort((a, b) => b.searchScore - a.searchScore);

    const grouped: GroupedSymbols = {};
    filtered.forEach(symbol => {
      const filePath = symbol.location.path;
      if (!grouped[filePath]) {
        grouped[filePath] = [];
      }
      grouped[filePath].push(symbol);
    });

    return { filteredSymbols: filtered, groupedSymbols: grouped };
  }, [symbols, searchTerm, symbolTypeFilters, fuzzyMatch]);

  // Get flattened list for keyboard navigation
  const flatSymbolList = useMemo(() => {
    const flat: Symbol[] = [];
    Object.entries(groupedSymbols).forEach(([filePath, fileSymbols]) => {
      if (!collapsedFiles.has(filePath)) {
        flat.push(...fileSymbols);
      }
    });
    return flat;
  }, [groupedSymbols, collapsedFiles]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!symbolListRef.current?.contains(document.activeElement) && 
          !searchInputRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, flatSymbolList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatSymbolList.length) {
            const symbol = flatSymbolList[focusedIndex];
            handleSymbolClick(symbol);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          setSelectedSymbol(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flatSymbolList, focusedIndex]);

  const handleSymbolClick = useCallback((symbol: Symbol) => {
    setSelectedSymbol(symbol);
    onSymbolSelect?.(symbol);
    
    // Double-click or Enter to navigate
    if (onSymbolNavigate) {
      onSymbolNavigate(symbol);
    }
  }, [onSymbolSelect, onSymbolNavigate]);

  const toggleFileCollapse = useCallback((filePath: string) => {
    setCollapsedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  }, []);

  const toggleSymbolTypeFilter = useCallback((type: Symbol['kind']) => {
    setSymbolTypeFilters(prev => 
      prev.map(filter => 
        filter.type === type 
          ? { ...filter, enabled: !filter.enabled }
          : filter
      )
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSymbolTypeFilters(prev => prev.map(filter => ({ ...filter, enabled: true })));
  }, []);

  const getSymbolIcon = (kind: Symbol['kind']) => {
    switch (kind) {
      case 'TSFunction': return <SquareFunction className="h-4 w-4" />;
      case 'TSClass': return <Box className="h-4 w-4" />;
      case 'TSInterface': return <Code className="h-4 w-4" />;
      case 'Struct': return <Component className="h-4 w-4" />;
      case 'Enum': return <Spline className="h-4 w-4" />;
      case 'Trait': return <Shapes className="h-4 w-4" />;
      case 'Function': return <FunctionSquare className="h-4 w-4" />;
      case 'Impl': return <FunctionSquare className="h-4 w-4 opacity-70" />;
      case 'Module': return <Library className="h-4 w-4" />;
      case 'Macro': return <TerminalSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSymbolColor = (kind: Symbol['kind']) => {
    switch (kind) {
      case 'TSFunction': return 'text-blue-600 bg-blue-50';
      case 'TSClass': return 'text-sky-600 bg-sky-50';
      case 'TSInterface': return 'text-indigo-600 bg-indigo-50';
      case 'Struct': return 'text-orange-600 bg-orange-50';
      case 'Enum': return 'text-amber-600 bg-amber-50';
      case 'Trait': return 'text-purple-600 bg-purple-50';
      case 'Function': return 'text-teal-600 bg-teal-50';
      case 'Impl': return 'text-slate-500 bg-slate-50';
      case 'Module': return 'text-lime-600 bg-lime-50';
      case 'Macro': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatKind = (kind: Symbol['kind']) => {
    if (kind.startsWith('TS')) {
      return `TS ${kind.substring(2)}`;
    }
    return kind;
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Controls */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search symbols... (fuzzy matching supported)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {symbolTypeFilters.filter(f => !f.enabled).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {symbolTypeFilters.filter(f => !f.enabled).length}
              </Badge>
            )}
          </Button>
          
          {symbolTypeFilters.some(f => !f.enabled) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          
          <div className="text-sm text-gray-500 ml-auto">
            {filteredSymbols.length} of {symbols.length} symbols
          </div>
        </div>

        {/* Symbol Type Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            {symbolTypeFilters.map(filter => (
              <Badge
                key={filter.type}
                variant={filter.enabled ? "default" : "outline"}
                className="cursor-pointer flex items-center gap-1"
                onClick={() => toggleSymbolTypeFilter(filter.type)}
              >
                <div className={`p-0.5 rounded ${getSymbolColor(filter.type)}`}>
                  {getSymbolIcon(filter.type)}
                </div>
                {formatKind(filter.type)} ({filter.count})
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Symbol List */}
      <div 
        ref={symbolListRef}
        className="flex-1 overflow-auto"
        tabIndex={0}
      >
        {Object.keys(groupedSymbols).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No symbols found</p>
            {searchTerm && (
              <p className="text-sm">Try adjusting your search term or filters</p>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {Object.entries(groupedSymbols).map(([filePath, fileSymbols]) => {
              const isCollapsed = collapsedFiles.has(filePath);
              const fileName = getFileName(filePath);
              
              return (
                <div key={filePath} className="space-y-1">
                  {/* File Header */}
                  <div
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => toggleFileCollapse(filePath)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm truncate" title={filePath}>
                      {fileName}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {fileSymbols.length}
                    </Badge>
                  </div>

                  {/* File Symbols */}
                  {!isCollapsed && (
                    <div className="ml-6 space-y-1">
                      {fileSymbols.map((symbol, index) => {
                        const globalIndex = flatSymbolList.indexOf(symbol);
                        const isFocused = globalIndex === focusedIndex;
                        const isSelected = selectedSymbol === symbol;
                        
                        return (
                          <Card
                            key={`${symbol.location.path}-${symbol.identifier}-${symbol.location.line}-${index}`}
                            className={`cursor-pointer transition-all hover:shadow-sm ${
                              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                            } ${
                              isFocused ? 'bg-gray-100' : ''
                            }`}
                            onClick={() => handleSymbolClick(symbol)}
                            title={`${symbol.identifier} (${formatKind(symbol.kind)}) - Line ${symbol.location.line}`}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${getSymbolColor(symbol.kind)}`}>
                                  {getSymbolIcon(symbol.kind)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {symbol.identifier}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Line {symbol.location.line}:{symbol.location.column}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {formatKind(symbol.kind)}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Symbol Details */}
      {selectedSymbol && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${getSymbolColor(selectedSymbol.kind)}`}>
                {getSymbolIcon(selectedSymbol.kind)}
              </div>
              <span className="font-medium text-sm">{selectedSymbol.identifier}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Type: {formatKind(selectedSymbol.kind)}</div>
              <div>File: {getFileName(selectedSymbol.location.path)}</div>
              <div>Position: Line {selectedSymbol.location.line}, Column {selectedSymbol.location.column}</div>
              <div className="truncate" title={selectedSymbol.location.path}>
                Path: {selectedSymbol.location.path}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}