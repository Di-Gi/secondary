import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Symbol, SearchRequest } from '../api';
import { useAppStore } from '../store/appStore';
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
    Component,
    TerminalSquare,
    ChevronDown,
    ChevronRight,
    Filter,
    X,
    History,
    Code2,
    Regex,
    Sparkles,
    Clock
} from 'lucide-react';

interface SymbolInterfaceProps {
    symbols: Symbol[];
    onSymbolSelect?: (symbol: Symbol) => void;
    onSymbolNavigate?: (symbol: Symbol) => void;
    currentFilePath?: string;
}

interface GroupedSymbols {
    [filePath: string]: Symbol[];
}

interface SymbolTypeFilter {
    type: Symbol['kind'];
    enabled: boolean;
    count: number;
}

type SearchMode = 'fuzzy' | 'exact' | 'regex' | 'semantic';

export function SymbolInterface({
    symbols,
    onSymbolSelect,
    onSymbolNavigate
}: SymbolInterfaceProps) {
    const { searchSymbols, searchResults, isSearching, searchHistory, addToSearchHistory } = useAppStore();

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('fuzzy');
    const [useEnhancedSearch, setUseEnhancedSearch] = useState(false);

    // UI state
    const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [symbolTypeFilters, setSymbolTypeFilters] = useState<SymbolTypeFilter[]>([]);


    // Refs
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

    // Enhanced search handler
    const handleEnhancedSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;

        const enabledTypes = symbolTypeFilters.filter(f => f.enabled).map(f => f.type);

        const searchRequest: SearchRequest = {
            query,
            filters: {
                symbol_types: enabledTypes,
                file_patterns: [],
                scope: { type: 'Global' },
                max_results: 100
            },
            max_results: 100
        };

        try {
            await searchSymbols(searchRequest);
            addToSearchHistory(query);
        } catch (error) {
            console.error('Enhanced search failed:', error);
        }
    }, [searchSymbols, symbolTypeFilters, addToSearchHistory]);

    // Filter and group symbols (local or enhanced search results)
    const { filteredSymbols, groupedSymbols } = useMemo(() => {
        const symbolsToProcess = useEnhancedSearch && searchResults.length > 0
            ? searchResults.map(result => result.symbol)
            : symbols;

        const enabledTypes = new Set(
            symbolTypeFilters.filter(f => f.enabled).map(f => f.type)
        );

        let filtered = symbolsToProcess.filter(symbol => {
            const matchesType = enabledTypes.size === 0 || enabledTypes.has(symbol.kind);
            if (!searchTerm) return matchesType;

            if (useEnhancedSearch) return matchesType; // Enhanced search already filtered

            // Apply different search modes
            switch (searchMode) {
                case 'exact':
                    return matchesType && symbol.identifier.toLowerCase().includes(searchTerm.toLowerCase());
                case 'regex':
                    try {
                        const regex = new RegExp(searchTerm, 'i');
                        return matchesType && regex.test(symbol.identifier);
                    } catch {
                        return false;
                    }
                case 'semantic':
                    // For now, semantic is same as fuzzy - could be enhanced later
                    return matchesType && fuzzyMatch(symbol.identifier, searchTerm) > 0;
                case 'fuzzy':
                default:
                    return matchesType && fuzzyMatch(symbol.identifier, searchTerm) > 0;
            }
        });

        // Sort by relevance
        if (searchTerm) {
            filtered = filtered
                .map(symbol => ({
                    ...symbol,
                    searchScore: useEnhancedSearch
                        ? (searchResults.find(r => r.symbol.identifier === symbol.identifier)?.relevance_score || 0)
                        : fuzzyMatch(symbol.identifier, searchTerm)
                }))
                .sort((a, b) => b.searchScore - a.searchScore);
        }

        const grouped: GroupedSymbols = {};
        filtered.forEach(symbol => {
            const filePath = symbol.location.path;
            if (!grouped[filePath]) {
                grouped[filePath] = [];
            }
            grouped[filePath].push(symbol);
        });

        return { filteredSymbols: filtered, groupedSymbols: grouped };
    }, [symbols, searchTerm, symbolTypeFilters, fuzzyMatch, useEnhancedSearch, searchResults, searchMode]);

    // Handle search
    const handleSearch = useCallback(async (query: string) => {
        setSearchTerm(query);

        if (useEnhancedSearch && query.trim()) {
            await handleEnhancedSearch(query);
        }
    }, [useEnhancedSearch, handleEnhancedSearch]);

    // Get symbol icon
    const getSymbolIcon = (kind: Symbol['kind']) => {
        switch (kind) {
            case 'TSFunction':
            case 'Function':
                return <SquareFunction className="h-4 w-4 text-blue-500" />;
            case 'TSClass':
            case 'Struct':
                return <Box className="h-4 w-4 text-green-500" />;
            case 'TSInterface':
            case 'Trait':
                return <Shapes className="h-4 w-4 text-purple-500" />;
            case 'Enum':
                return <Library className="h-4 w-4 text-orange-500" />;
            case 'Module':
                return <Component className="h-4 w-4 text-indigo-500" />;
            case 'Impl':
                return <Code className="h-4 w-4 text-red-500" />;
            case 'Macro':
                return <TerminalSquare className="h-4 w-4 text-yellow-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    // Toggle file collapse
    const toggleFileCollapse = (filePath: string) => {
        setCollapsedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(filePath)) {
                newSet.delete(filePath);
            } else {
                newSet.add(filePath);
            }
            return newSet;
        });
    };

    // Handle symbol click
    const handleSymbolClick = (symbol: Symbol) => {
        setSelectedSymbol(symbol);
        onSymbolSelect?.(symbol);
    };

    // Handle symbol double click
    const handleSymbolDoubleClick = (symbol: Symbol) => {
        onSymbolNavigate?.(symbol);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200 space-y-3">
                {/* Main Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search symbols..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 pr-10"
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearch('')}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* Search Mode Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {[
                        { mode: 'fuzzy' as SearchMode, icon: Search, label: 'Fuzzy' },
                        { mode: 'exact' as SearchMode, icon: Code2, label: 'Exact' },
                        { mode: 'regex' as SearchMode, icon: Regex, label: 'Regex' },
                        { mode: 'semantic' as SearchMode, icon: Sparkles, label: 'Smart' }
                    ].map(({ mode, icon: Icon, label }) => (
                        <Button
                            key={mode}
                            variant={searchMode === mode ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSearchMode(mode)}
                            className="flex-1 h-8 text-xs"
                        >
                            <Icon className="h-3 w-3 mr-1" />
                            {label}
                        </Button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="text-xs"
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            Filters
                            {symbolTypeFilters.filter(f => !f.enabled).length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                                    {symbolTypeFilters.filter(f => !f.enabled).length}
                                </Badge>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-xs"
                        >
                            <History className="h-3 w-3 mr-1" />
                            History
                        </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-1 text-xs">
                            <input
                                type="checkbox"
                                checked={useEnhancedSearch}
                                onChange={(e) => setUseEnhancedSearch(e.target.checked)}
                                className="h-3 w-3"
                            />
                            <span>Enhanced</span>
                        </label>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="mt-2">
                        <CardContent className="p-3">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Symbol Types</span>
                                    <div className="space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSymbolTypeFilters(prev => prev.map(f => ({ ...f, enabled: true })))}
                                            className="text-xs h-6"
                                        >
                                            All
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSymbolTypeFilters(prev => prev.map(f => ({ ...f, enabled: false })))}
                                            className="text-xs h-6"
                                        >
                                            None
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    {symbolTypeFilters.map(filter => (
                                        <label key={filter.type} className="flex items-center space-x-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={filter.enabled}
                                                onChange={(e) => {
                                                    setSymbolTypeFilters(prev => prev.map(f =>
                                                        f.type === filter.type ? { ...f, enabled: e.target.checked } : f
                                                    ));
                                                }}
                                                className="h-3 w-3"
                                            />
                                            <span className="flex-1">{filter.type}</span>
                                            <Badge variant="secondary" className="h-4 text-xs">
                                                {filter.count}
                                            </Badge>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Search History */}
                {showHistory && searchHistory.length > 0 && (
                    <Card className="mt-2">
                        <CardContent className="p-3">
                            <div className="space-y-1">
                                <span className="text-sm font-medium">Recent Searches</span>
                                {searchHistory.slice(0, 5).map((query, index) => (
                                    <Button
                                        key={index}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSearch(query)}
                                        className="w-full justify-start text-xs h-6"
                                    >
                                        <Clock className="h-3 w-3 mr-2" />
                                        {query}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results Summary */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                        {filteredSymbols.length} of {symbols.length} symbols
                        {searchTerm && ` matching "${searchTerm}"`}
                    </span>
                    {isSearching && <span>Searching...</span>}
                </div>
            </div>

            {/* Symbol List */}
            <div ref={symbolListRef} className="flex-1 overflow-y-auto">
                {Object.entries(groupedSymbols).length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        {searchTerm ? 'No symbols match your search' : 'No symbols found'}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {Object.entries(groupedSymbols).map(([filePath, fileSymbols]) => (
                            <div key={filePath}>
                                {/* File Header */}
                                <div
                                    className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                                    onClick={() => toggleFileCollapse(filePath)}
                                >
                                    {collapsedFiles.has(filePath) ? (
                                        <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                                    )}
                                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                        {filePath.split('/').pop()}
                                    </span>
                                    <Badge variant="secondary" className="ml-auto h-5 text-xs">
                                        {fileSymbols.length}
                                    </Badge>
                                </div>

                                {/* Symbols */}
                                {!collapsedFiles.has(filePath) && (
                                    <div>
                                        {fileSymbols.map((symbol, index) => (
                                            <div
                                                key={`${symbol.location.path}-${symbol.identifier}-${index}`}
                                                className={`flex items-center px-6 py-2 cursor-pointer hover:bg-blue-50 ${selectedSymbol?.identifier === symbol.identifier ? 'bg-blue-100' : ''
                                                    }`}
                                                onClick={() => handleSymbolClick(symbol)}
                                                onDoubleClick={() => handleSymbolDoubleClick(symbol)}
                                            >
                                                {getSymbolIcon(symbol.kind)}
                                                <span className="ml-3 text-sm font-mono text-gray-800">
                                                    {symbol.identifier}
                                                </span>
                                                <Badge variant="outline" className="ml-auto h-5 text-xs">
                                                    {symbol.kind}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}