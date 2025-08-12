// Navigation History Search and Restoration Component
// Purpose: Advanced search functionality for navigation history with session restoration
// Architecture: React component with search filters, results display, and restoration capabilities

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  NavigationHistory, 
  NavigationHistoryEntry, 
  HistorySession,
  NavigationLocation,
  NavigationSearchQuery,
  SearchFilter,
  SearchScope,
  SearchOptions,
  SearchResult,
  SearchResultType
} from '../../types/navigation';
import { useAppStore } from '../../store/appStore';
import { analyzeNavigationHistory } from '../../lib/navigationHistoryUtils';

interface NavigationHistorySearchProps {
  history: NavigationHistory;
  onLocationSelect?: (location: NavigationLocation) => void;
  onSessionRestore?: (session: HistorySession) => void;
  onSearchResults?: (results: SearchResult[]) => void;
  className?: string;
}

interface SearchState {
  query: string;
  filters: SearchFilter[];
  scope: SearchScope;
  options: SearchOptions;
  results: SearchResult[];
  isSearching: boolean;
  selectedResult: SearchResult | null;
}

export const NavigationHistorySearch: React.FC<NavigationHistorySearchProps> = ({
  history,
  onLocationSelect,
  onSessionRestore,
  onSearchResults,
  className = ''
}) => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: [],
    scope: {
      type: 'global',
      recursive: true
    },
    options: {
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      fuzzy: true,
      maxResults: 50,
      sortBy: 'relevance',
      includeContent: true
    },
    results: [],
    isSearching: false,
    selectedResult: null
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Perform search when query or filters change
  useEffect(() => {
    if (searchState.query.trim()) {
      performSearch();
    } else {
      setSearchState(prev => ({ ...prev, results: [] }));
    }
  }, [searchState.query, searchState.filters, searchState.scope, searchState.options]);

  // Notify parent of search results
  useEffect(() => {
    onSearchResults?.(searchState.results);
  }, [searchState.results, onSearchResults]);

  const performSearch = useCallback(async () => {
    if (!searchState.query.trim()) return;

    setSearchState(prev => ({ ...prev, isSearching: true }));

    try {
      const results = await searchNavigationHistory({
        text: searchState.query,
        filters: searchState.filters,
        scope: searchState.scope,
        options: searchState.options
      }, history);

      setSearchState(prev => ({
        ...prev,
        results,
        isSearching: false
      }));

      // Add to search history
      if (!searchHistory.includes(searchState.query)) {
        setSearchHistory(prev => [searchState.query, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchState(prev => ({
        ...prev,
        results: [],
        isSearching: false
      }));
    }
  }, [searchState.query, searchState.filters, searchState.scope, searchState.options, history, searchHistory]);

  const handleQueryChange = useCallback((query: string) => {
    setSearchState(prev => ({ ...prev, query }));
  }, []);

  const handleFilterAdd = useCallback((filter: SearchFilter) => {
    setSearchState(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }));
  }, []);

  const handleFilterRemove = useCallback((index: number) => {
    setSearchState(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  }, []);

  const handleScopeChange = useCallback((scope: SearchScope) => {
    setSearchState(prev => ({ ...prev, scope }));
  }, []);

  const handleOptionsChange = useCallback((options: Partial<SearchOptions>) => {
    setSearchState(prev => ({
      ...prev,
      options: { ...prev.options, ...options }
    }));
  }, []);

  const handleResultSelect = useCallback((result: SearchResult) => {
    setSearchState(prev => ({ ...prev, selectedResult: result }));

    if (result.type === 'location' && result.item) {
      onLocationSelect?.(result.item as NavigationLocation);
    } else if (result.type === 'session' && result.item) {
      onSessionRestore?.(result.item as HistorySession);
    }
  }, [onLocationSelect, onSessionRestore]);

  const handleSessionRestore = useCallback((session: HistorySession) => {
    onSessionRestore?.(session);
  }, [onSessionRestore]);

  const clearSearch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      query: '',
      results: [],
      selectedResult: null
    }));
  }, []);

  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      location: [],
      symbol: [],
      file: [],
      directory: [],
      session: [],
      bookmark: [],
      history: []
    };

    searchState.results.forEach(result => {
      groups[result.type].push(result);
    });

    return groups;
  }, [searchState.results]);

  return (
    <div className={`navigation-history-search ${className}`}>
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search navigation history..."
            value={searchState.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            disabled={searchState.isSearching}
          />
          
          <div className="search-actions">
            {searchState.query && (
              <button
                className="clear-search-btn"
                onClick={clearSearch}
                title="Clear search"
              >
                ×
              </button>
            )}
            
            <button
              className={`advanced-filters-btn ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Advanced filters"
            >
              ⚙️
            </button>
          </div>
        </div>

        {searchState.isSearching && (
          <div className="search-loading">
            Searching...
          </div>
        )}

        {searchState.results.length > 0 && (
          <div className="search-stats">
            {searchState.results.length} results found
          </div>
        )}
      </div>

      {showAdvancedFilters && (
        <SearchFilters
          filters={searchState.filters}
          scope={searchState.scope}
          options={searchState.options}
          onFilterAdd={handleFilterAdd}
          onFilterRemove={handleFilterRemove}
          onScopeChange={handleScopeChange}
          onOptionsChange={handleOptionsChange}
        />
      )}

      {searchHistory.length > 0 && !searchState.query && (
        <div className="search-history">
          <h4>Recent Searches</h4>
          <div className="search-history-items">
            {searchHistory.map((query, index) => (
              <button
                key={index}
                className="search-history-item"
                onClick={() => handleQueryChange(query)}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="search-results">
        {Object.entries(groupedResults).map(([type, results]) => {
          if (results.length === 0) return null;

          return (
            <SearchResultGroup
              key={type}
              type={type as SearchResultType}
              results={results}
              selectedResult={searchState.selectedResult}
              onResultSelect={handleResultSelect}
              onSessionRestore={handleSessionRestore}
            />
          );
        })}

        {searchState.query && searchState.results.length === 0 && !searchState.isSearching && (
          <div className="no-results">
            <p>No results found for "{searchState.query}"</p>
            <div className="search-suggestions">
              <p>Try:</p>
              <ul>
                <li>Using different keywords</li>
                <li>Checking your spelling</li>
                <li>Using broader search terms</li>
                <li>Enabling fuzzy search</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Search Filters Component
interface SearchFiltersProps {
  filters: SearchFilter[];
  scope: SearchScope;
  options: SearchOptions;
  onFilterAdd: (filter: SearchFilter) => void;
  onFilterRemove: (index: number) => void;
  onScopeChange: (scope: SearchScope) => void;
  onOptionsChange: (options: Partial<SearchOptions>) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  scope,
  options,
  onFilterAdd,
  onFilterRemove,
  onScopeChange,
  onOptionsChange
}) => {
  return (
    <div className="search-filters">
      <div className="filter-section">
        <h4>Scope</h4>
        <select
          value={scope.type}
          onChange={(e) => onScopeChange({ ...scope, type: e.target.value as any })}
        >
          <option value="global">All History</option>
          <option value="project">Current Project</option>
          <option value="session">Current Session</option>
          <option value="history">Navigation History</option>
        </select>
      </div>

      <div className="filter-section">
        <h4>Options</h4>
        <div className="filter-options">
          <label>
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(e) => onOptionsChange({ caseSensitive: e.target.checked })}
            />
            Case sensitive
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(e) => onOptionsChange({ wholeWord: e.target.checked })}
            />
            Whole word
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={options.regex}
              onChange={(e) => onOptionsChange({ regex: e.target.checked })}
            />
            Regular expression
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={options.fuzzy}
              onChange={(e) => onOptionsChange({ fuzzy: e.target.checked })}
            />
            Fuzzy search
          </label>
        </div>
      </div>

      <div className="filter-section">
        <h4>Sort by</h4>
        <select
          value={options.sortBy}
          onChange={(e) => onOptionsChange({ sortBy: e.target.value as any })}
        >
          <option value="relevance">Relevance</option>
          <option value="name">Name</option>
          <option value="modified">Last Modified</option>
          <option value="usage">Usage Count</option>
        </select>
      </div>

      <div className="filter-section">
        <h4>Active Filters</h4>
        <div className="active-filters">
          {filters.map((filter, index) => (
            <div key={index} className="filter-tag">
              <span>{filter.type}: {String(filter.value)}</span>
              <button onClick={() => onFilterRemove(index)}>×</button>
            </div>
          ))}
          {filters.length === 0 && (
            <p className="no-filters">No active filters</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Search Result Group Component
interface SearchResultGroupProps {
  type: SearchResultType;
  results: SearchResult[];
  selectedResult: SearchResult | null;
  onResultSelect: (result: SearchResult) => void;
  onSessionRestore: (session: HistorySession) => void;
}

const SearchResultGroup: React.FC<SearchResultGroupProps> = ({
  type,
  results,
  selectedResult,
  onResultSelect,
  onSessionRestore
}) => {
  const getGroupTitle = (type: SearchResultType): string => {
    const titles: Record<SearchResultType, string> = {
      location: 'Locations',
      symbol: 'Symbols',
      file: 'Files',
      directory: 'Directories',
      session: 'Sessions',
      bookmark: 'Bookmarks',
      history: 'History'
    };
    return titles[type];
  };

  const getGroupIcon = (type: SearchResultType): string => {
    const icons: Record<SearchResultType, string> = {
      location: '📍',
      symbol: '🔤',
      file: '📄',
      directory: '📁',
      session: '💾',
      bookmark: '⭐',
      history: '🕒'
    };
    return icons[type];
  };

  return (
    <div className="search-result-group">
      <div className="group-header">
        <span className="group-icon">{getGroupIcon(type)}</span>
        <h4 className="group-title">{getGroupTitle(type)}</h4>
        <span className="group-count">{results.length}</span>
      </div>

      <div className="group-results">
        {results.map((result, index) => (
          <SearchResultItem
            key={`${result.id}-${index}`}
            result={result}
            isSelected={selectedResult?.id === result.id}
            onSelect={() => onResultSelect(result)}
            onSessionRestore={onSessionRestore}
          />
        ))}
      </div>
    </div>
  );
};

// Search Result Item Component
interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onSessionRestore: (session: HistorySession) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  isSelected,
  onSelect,
  onSessionRestore
}) => {
  const handleSessionRestore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.type === 'session' && result.item) {
      onSessionRestore(result.item as HistorySession);
    }
  }, [result, onSessionRestore]);

  const renderResultContent = () => {
    switch (result.type) {
      case 'location':
        const location = result.item as NavigationLocation;
        return (
          <div className="result-location">
            <div className="result-title">{getFileName(location.filePath)}</div>
            <div className="result-subtitle">
              Line {location.position.line}, Column {location.position.column}
              {location.symbol && ` • ${location.symbol.identifier}`}
            </div>
            <div className="result-path">{location.filePath}</div>
          </div>
        );

      case 'session':
        const session = result.item as HistorySession;
        return (
          <div className="result-session">
            <div className="result-title">{session.name}</div>
            <div className="result-subtitle">
              {session.entries.length} locations • {formatSessionDuration(session)}
            </div>
            <div className="result-actions">
              <button
                className="restore-session-btn"
                onClick={handleSessionRestore}
                title="Restore session"
              >
                Restore
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="result-generic">
            <div className="result-title">{result.context.snippet}</div>
            <div className="result-subtitle">{result.context.filePath}</div>
          </div>
        );
    }
  };

  return (
    <div
      className={`search-result-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="result-content">
        {renderResultContent()}
      </div>
      
      <div className="result-meta">
        <div className="result-score">
          {Math.round(result.relevanceScore * 100)}%
        </div>
        
        {result.matchHighlights.length > 0 && (
          <div className="result-highlights">
            {result.matchHighlights.length} matches
          </div>
        )}
      </div>
    </div>
  );
};

// Search Implementation
async function searchNavigationHistory(
  query: NavigationSearchQuery,
  history: NavigationHistory
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Search in navigation entries
  for (const entry of history.entries) {
    const locationResult = searchInLocation(query, entry.location);
    if (locationResult) {
      results.push(locationResult);
    }
  }

  // Search in sessions
  for (const session of history.sessions) {
    const sessionResult = searchInSession(query, session);
    if (sessionResult) {
      results.push(sessionResult);
    }
  }

  // Sort results by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit results
  return results.slice(0, query.options.maxResults);
}

function searchInLocation(
  query: NavigationSearchQuery,
  location: NavigationLocation
): SearchResult | null {
  let relevanceScore = 0;
  const matchHighlights: any[] = [];

  // Search in file path
  if (matchesQuery(location.filePath, query)) {
    relevanceScore += 0.8;
    matchHighlights.push({
      start: 0,
      end: location.filePath.length,
      text: location.filePath
    });
  }

  // Search in symbol
  if (location.symbol && matchesQuery(location.symbol.identifier, query)) {
    relevanceScore += 1.0;
    matchHighlights.push({
      start: 0,
      end: location.symbol.identifier.length,
      text: location.symbol.identifier
    });
  }

  // Search in metadata tags
  for (const tag of location.metadata.tags) {
    if (matchesQuery(tag, query)) {
      relevanceScore += 0.3;
    }
  }

  if (relevanceScore === 0) return null;

  return {
    id: location.id,
    type: 'location',
    item: location,
    relevanceScore: Math.min(relevanceScore, 1),
    matchHighlights,
    context: {
      snippet: getFileName(location.filePath),
      filePath: location.filePath,
      matchType: 'partial'
    }
  };
}

function searchInSession(
  query: NavigationSearchQuery,
  session: HistorySession
): SearchResult | null {
  let relevanceScore = 0;
  const matchHighlights: any[] = [];

  // Search in session name
  if (matchesQuery(session.name, query)) {
    relevanceScore += 1.0;
    matchHighlights.push({
      start: 0,
      end: session.name.length,
      text: session.name
    });
  }

  // Search in session description
  if (session.description && matchesQuery(session.description, query)) {
    relevanceScore += 0.6;
  }

  if (relevanceScore === 0) return null;

  return {
    id: session.id,
    type: 'session',
    item: session,
    relevanceScore: Math.min(relevanceScore, 1),
    matchHighlights,
    context: {
      snippet: session.name,
      matchType: 'partial'
    }
  };
}

function matchesQuery(text: string, query: NavigationSearchQuery): boolean {
  const searchText = query.options.caseSensitive ? text : text.toLowerCase();
  const searchQuery = query.options.caseSensitive ? query.text : query.text.toLowerCase();

  if (query.options.regex) {
    try {
      const regex = new RegExp(searchQuery, query.options.caseSensitive ? 'g' : 'gi');
      return regex.test(searchText);
    } catch {
      return false;
    }
  }

  if (query.options.wholeWord) {
    const regex = new RegExp(`\\b${escapeRegExp(searchQuery)}\\b`, query.options.caseSensitive ? 'g' : 'gi');
    return regex.test(searchText);
  }

  if (query.options.fuzzy) {
    return fuzzyMatch(searchText, searchQuery);
  }

  return searchText.includes(searchQuery);
}

function fuzzyMatch(text: string, query: string): boolean {
  if (query.length === 0) return true;
  if (text.length === 0) return false;

  let queryIndex = 0;
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === query.length;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Utility Functions
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function formatSessionDuration(session: HistorySession): string {
  if (!session.endTime) return 'Active';
  
  const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
  const minutes = Math.round(duration / 60000);
  
  if (minutes < 60) {
    return `${minutes}min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}

export default NavigationHistorySearch;