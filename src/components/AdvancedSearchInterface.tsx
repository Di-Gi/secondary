import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Symbol } from '../api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { 
  Search, 
  Filter, 
  History, 
  X, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Code2,
  Regex,
  Sparkles,
  Clock
} from 'lucide-react';

export interface SearchResult {
  symbol: Symbol;
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'regex';
  relevanceScore: number;
  context: {
    surroundingCode?: string;
    fileContext: string;
    relatedSymbols: string[];
  };
}

export interface SearchFilters {
  symbolTypes: Symbol['kind'][];
  filePatterns: string[];
  searchScope: 'current-file' | 'current-project' | 'all-projects';
  includeTests: boolean;
  includeNodeModules: boolean;
}

interface AdvancedSearchInterfaceProps {
  symbols: Symbol[];
  onSearchResults?: (results: SearchResult[]) => void;
  onSymbolSelect?: (symbol: Symbol) => void;
  currentFilePath?: string;
}

export function AdvancedSearchInterface({
  symbols,
  onSearchResults,
  onSymbolSelect,
  currentFilePath
}: AdvancedSearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'symbol' | 'semantic' | 'regex'>('symbol');
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    symbolTypes: [],
    filePatterns: [],
    searchScope: 'current-project',
    includeTests: true,
    includeNodeModules: false
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Available symbol types for filtering
  const availableSymbolTypes = useMemo(() => {
    const types = new Set(symbols.map(s => s.kind));
    return Array.from(types).sort();
  }, [symbols]);

  // Generate search suggestions based on current query
  const generateSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const symbolSuggestions = symbols
      .filter(s => s.identifier.toLowerCase().includes(queryLower))
      .map(s => s.identifier)
      .slice(0, 5);

    const historySuggestions = searchHistory
      .filter(h => h.toLowerCase().includes(queryLower))
      .slice(0, 3);

    const allSuggestions = [...new Set([...symbolSuggestions, ...historySuggestions])];
    setSuggestions(allSuggestions.slice(0, 8));
  }, [symbols, searchHistory]);

  // Debounced suggestion generation
  useEffect(() => {
    const timer = setTimeout(() => {
      generateSuggestions(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, generateSuggestions]);

  // Fuzzy matching algorithm
  const fuzzyMatch = useCallback((text: string, pattern: string): number => {
    if (!pattern) return 1;
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Exact match gets highest score
    if (textLower.includes(patternLower)) {
      const index = textLower.indexOf(patternLower);
      return 1 - (index / textLower.length) * 0.1; // Slight penalty for later matches
    }
    
    // Fuzzy matching
    let patternIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIndex]) {
        score += 1 + consecutiveMatches * 0.5; // Bonus for consecutive matches
        consecutiveMatches++;
        patternIndex++;
      } else {
        consecutiveMatches = 0;
      }
    }
    
    return patternIndex === patternLower.length ? score / (textLower.length * patternLower.length) : 0;
  }, []);

  // Regex search
  const regexMatch = useCallback((text: string, pattern: string): boolean => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  }, []);

  // Semantic search (simplified - looks for related terms)
  const semanticMatch = useCallback((symbol: Symbol, query: string): number => {
    const queryLower = query.toLowerCase();
    const identifier = symbol.identifier.toLowerCase();
    const filePath = symbol.location.path.toLowerCase();
    
    // Direct match
    if (identifier.includes(queryLower)) {
      return 1;
    }
    
    // Related terms based on common patterns
    const relatedTerms: { [key: string]: string[] } = {
      'user': ['auth', 'login', 'account', 'profile'],
      'auth': ['user', 'login', 'token', 'session'],
      'data': ['model', 'entity', 'schema', 'store'],
      'api': ['service', 'endpoint', 'request', 'response'],
      'test': ['spec', 'mock', 'fixture', 'assert'],
    };
    
    for (const [term, related] of Object.entries(relatedTerms)) {
      if (queryLower.includes(term)) {
        for (const relatedTerm of related) {
          if (identifier.includes(relatedTerm) || filePath.includes(relatedTerm)) {
            return 0.7; // Lower score for semantic matches
          }
        }
      }
    }
    
    return 0;
  }, []);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      onSearchResults?.([]);
      return;
    }

    setIsSearching(true);
    
    // Add to search history
    if (!searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 searches
    }

    try {
      let filteredSymbols = symbols;

      // Apply filters
      if (filters.symbolTypes.length > 0) {
        filteredSymbols = filteredSymbols.filter(s => filters.symbolTypes.includes(s.kind));
      }

      if (filters.filePatterns.length > 0) {
        filteredSymbols = filteredSymbols.filter(s => 
          filters.filePatterns.some(pattern => 
            s.location.path.toLowerCase().includes(pattern.toLowerCase())
          )
        );
      }

      if (!filters.includeTests) {
        filteredSymbols = filteredSymbols.filter(s => 
          !s.location.path.toLowerCase().includes('test') &&
          !s.location.path.toLowerCase().includes('spec')
        );
      }

      if (!filters.includeNodeModules) {
        filteredSymbols = filteredSymbols.filter(s => 
          !s.location.path.includes('node_modules')
        );
      }

      if (filters.searchScope === 'current-file' && currentFilePath) {
        filteredSymbols = filteredSymbols.filter(s => s.location.path === currentFilePath);
      }

      // Perform search based on mode
      const results: SearchResult[] = [];

      for (const symbol of filteredSymbols) {
        let score = 0;
        let matchType: SearchResult['matchType'] = 'fuzzy';

        switch (searchMode) {
          case 'text':
          case 'symbol':
            score = fuzzyMatch(symbol.identifier, query);
            matchType = symbol.identifier.toLowerCase().includes(query.toLowerCase()) ? 'exact' : 'fuzzy';
            break;
          case 'regex':
            if (regexMatch(symbol.identifier, query)) {
              score = 0.9;
              matchType = 'regex';
            }
            break;
          case 'semantic':
            score = semanticMatch(symbol, query);
            matchType = 'semantic';
            break;
        }

        if (score > 0) {
          results.push({
            symbol,
            matchType,
            relevanceScore: score,
            context: {
              fileContext: symbol.location.path.split('/').pop() || '',
              relatedSymbols: [] // Could be enhanced with actual related symbols
            }
          });
        }
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      onSearchResults?.(results.slice(0, 100)); // Limit results
    } finally {
      setIsSearching(false);
    }
  }, [symbols, searchMode, filters, fuzzyMatch, regexMatch, semanticMatch, currentFilePath, searchHistory, onSearchResults]);

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
  }, []);

  // Handle search submission
  const handleSearchSubmit = useCallback((query?: string) => {
    const searchTerm = query || searchQuery;
    if (searchTerm.trim()) {
      performSearch(searchTerm);
      setShowSuggestions(false);
    }
  }, [searchQuery, performSearch]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  }, [performSearch]);

  // Handle filter changes
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleSymbolType = useCallback((type: Symbol['kind']) => {
    setFilters(prev => ({
      ...prev,
      symbolTypes: prev.symbolTypes.includes(type)
        ? prev.symbolTypes.filter(t => t !== type)
        : [...prev.symbolTypes, type]
    }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Input and Mode Selection */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={searchMode === 'symbol' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('symbol')}
            className="flex items-center gap-1"
          >
            <Code2 className="h-4 w-4" />
            Symbol
          </Button>
          <Button
            variant={searchMode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('text')}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            Text
          </Button>
          <Button
            variant={searchMode === 'regex' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('regex')}
            className="flex items-center gap-1"
          >
            <Regex className="h-4 w-4" />
            Regex
          </Button>
          <Button
            variant={searchMode === 'semantic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('semantic')}
            className="flex items-center gap-1"
          >
            <Sparkles className="h-4 w-4" />
            Semantic
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder={`Search ${searchMode}s... ${searchMode === 'regex' ? '(use regex patterns)' : '(fuzzy matching supported)'}`}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
            className="pl-10 pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-6 w-6 p-0"
            >
              <History className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-6 w-6 p-0"
            >
              <Filter className="h-3 w-3" />
            </Button>
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Search History */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                Recent Searches
              </div>
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2"
                  onClick={() => handleSuggestionSelect(query)}
                >
                  <Clock className="h-3 w-3 text-gray-400" />
                  {query}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Search Filters
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Scope */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search Scope</label>
              <div className="flex gap-2">
                {[
                  { value: 'current-file', label: 'Current File' },
                  { value: 'current-project', label: 'Current Project' },
                  { value: 'all-projects', label: 'All Projects' }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={filters.searchScope === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilters({ searchScope: option.value as SearchFilters['searchScope'] })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Symbol Types */}
            <div>
              <label className="text-sm font-medium mb-2 block">Symbol Types</label>
              <div className="flex flex-wrap gap-2">
                {availableSymbolTypes.map(type => (
                  <Badge
                    key={type}
                    variant={filters.symbolTypes.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSymbolType(type)}
                  >
                    {type.startsWith('TS') ? `TS ${type.substring(2)}` : type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Include Options */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-tests"
                  checked={filters.includeTests}
                  onChange={(e) => updateFilters({ includeTests: (e.target as HTMLInputElement).checked })}
                />
                <label htmlFor="include-tests" className="text-sm">
                  Include test files
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-node-modules"
                  checked={filters.includeNodeModules}
                  onChange={(e) => updateFilters({ includeNodeModules: (e.target as HTMLInputElement).checked })}
                />
                <label htmlFor="include-node-modules" className="text-sm">
                  Include node_modules
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Status */}
      {isSearching && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Searching...
          </div>
        </div>
      )}
    </div>
  );
}