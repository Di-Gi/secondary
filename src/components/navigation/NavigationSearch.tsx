// Navigation Search Component - Placeholder
// Purpose: Provides comprehensive search across navigation history, symbols, and file content
// Will be implemented in task 13.1

import React from 'react';
import { NavigationSearchQuery, SearchResult } from '../../types/navigation';

export interface NavigationSearchProps {
  query?: NavigationSearchQuery;
  results?: SearchResult[];
  onSearch?: (query: NavigationSearchQuery) => void;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function NavigationSearch({
  className = ''
}: NavigationSearchProps) {
  return (
    <div className={`navigation-search-placeholder ${className}`}>
      <div className="p-4 text-center text-muted-foreground">
        <div className="text-sm font-medium mb-2">Navigation Search</div>
        <div className="text-xs">Will be implemented in task 13.1</div>
      </div>
    </div>
  );
}

export default NavigationSearch;