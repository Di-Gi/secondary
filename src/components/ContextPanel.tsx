// [[SECONDARY_MIND_DESKTOP]]/src/components/ContextPanel.tsx
// Purpose: Displays contextual information about a selected symbol including relationships and dependencies.
// Architecture: React component that shows context collected by the backend context collector.
// Dependencies: React hooks, API types, UI components, file preview functionality.

import { useState, useEffect } from 'react';
import { Symbol, ContextPackage, FileContext, api } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading-spinner';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Eye, 
  ExternalLink,
  Users,
  Link,
  TestTube
} from 'lucide-react';

interface ContextPanelProps {
  symbol: Symbol;
  onFileClick?: (filePath: string) => void;
}

export function ContextPanel({ symbol, onFileClick }: ContextPanelProps) {
  const [context, setContext] = useState<ContextPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['used_by']));

  useEffect(() => {
    collectContext();
  }, [symbol.identifier]);

  const collectContext = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contextData = await api.collectSymbolContext(symbol.identifier);
      setContext(contextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to collect context');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleFileClick = (fileContext: FileContext) => {
    if (onFileClick) {
      onFileClick(fileContext.path);
    }
  };

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'used_by':
        return <Users className="h-4 w-4" />;
      case 'dependencies':
        return <Link className="h-4 w-4" />;
      case 'related_files':
        return <TestTube className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSectionTitle = (sectionId: string) => {
    switch (sectionId) {
      case 'used_by':
        return 'Used By';
      case 'dependencies':
        return 'Dependencies';
      case 'related_files':
        return 'Related Files';
      default:
        return sectionId;
    }
  };



  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <LoadingSpinner size="default" />
            <p className="text-sm text-muted-foreground mt-2">Collecting context...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={collectContext}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">No context available</p>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { id: 'used_by', items: context.used_by },
    { id: 'dependencies', items: context.dependencies },
    { id: 'related_files', items: context.related_files },
  ].filter(section => section.items.length > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Context for {symbol.identifier}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="border rounded-lg">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {getSectionIcon(section.id)}
                <span className="text-sm font-medium">
                  {getSectionTitle(section.id)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {section.items.length}
                </Badge>
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.has(section.id) && (
              <div className="border-t bg-muted/30">
                {section.items.map((item, index) => (
                  <FileContextItem
                    key={`${item.path}-${index}`}
                    fileContext={item}
                    onClick={() => handleFileClick(item)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        
        {sections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No context relationships found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FileContextItemProps {
  fileContext: FileContext;
  onClick: () => void;
}

function FileContextItem({ fileContext, onClick }: FileContextItemProps) {
  const [showPreview, setShowPreview] = useState(false);
  
  const fileName = fileContext.path.split('/').pop() || fileContext.path;
  const relativePath = fileContext.path.startsWith('/') 
    ? fileContext.path.substring(1) 
    : fileContext.path;

  return (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate" title={relativePath}>
              {fileName}
            </span>
            <Badge 
              variant="outline" 
              className={`text-xs ${getRelationshipColor(fileContext.relationship_type)}`}
            >
              {fileContext.relationship_type}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground truncate mb-2" title={relativePath}>
            {relativePath}
          </p>
          
          {fileContext.reference_lines.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-muted-foreground">References:</span>
              <div className="flex gap-1">
                {fileContext.reference_lines.slice(0, 3).map((line) => (
                  <Badge key={line} variant="outline" className="text-xs px-1 py-0">
                    L{line}
                  </Badge>
                ))}
                {fileContext.reference_lines.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{fileContext.reference_lines.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
              <span className="text-xs text-muted-foreground">
                {Math.round(fileContext.relevance * 100)}% relevant
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="h-6 w-6 p-0"
            title="Toggle preview"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClick}
            className="h-6 w-6 p-0"
            title="Open file"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {showPreview && fileContext.preview && (
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{fileContext.preview}</pre>
        </div>
      )}
    </div>
  );
}

function getRelationshipColor(relationshipType: FileContext['relationship_type']) {
  switch (relationshipType) {
    case 'Uses':
    case 'UsedBy':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    case 'Imports':
    case 'ImportedBy':
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    case 'Tests':
    case 'TestedBy':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
    case 'ConfiguredBy':
    case 'Configures':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700';
  }
}

// Integration: This component will be used in the Symbol Explorer to show context when a symbol is selected.
// Notes: Provides expandable sections for different types of relationships with file previews and navigation.