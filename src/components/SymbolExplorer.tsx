// [[PROJECT_NAME]]/src/components/SymbolExplorer.tsx
// Purpose: [Interactive component for browsing codebase symbols, now with support for displaying Rust symbols.]
// Architecture: [Updated to recognize and render new `SymbolKind` variants for Rust, with distinct icons and colors to differentiate them from TypeScript/JavaScript symbols.]
// Dependencies: [React, Symbol type from api.ts, lucide-react for icons, UI components.]
import { useState, useMemo } from 'react';
import { Symbol } from '../api';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CodeViewer } from './CodeViewer';
import { ContextPanel } from './ContextPanel';
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
  Zap
} from 'lucide-react';

interface SymbolExplorerProps {
  symbols: Symbol[];
}

export function SymbolExplorer({ symbols }: SymbolExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [viewingSymbol, setViewingSymbol] = useState<Symbol | null>(null);

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
        return 'text-blue-600 bg-blue-50';
      case 'TSClass':
        return 'text-sky-600 bg-sky-50';
      case 'TSInterface':
        return 'text-indigo-600 bg-indigo-50';
      // Rust
      case 'Struct':
        return 'text-orange-600 bg-orange-50';
      case 'Enum':
        return 'text-amber-600 bg-amber-50';
      case 'Trait':
        return 'text-purple-600 bg-purple-50';
      case 'Function':
         return 'text-teal-600 bg-teal-50';
      case 'Impl':
         return 'text-slate-500 bg-slate-50';
      case 'Module':
        return 'text-lime-600 bg-lime-50';
      case 'Macro':
        return 'text-pink-600 bg-pink-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatKind = (kind: Symbol['kind']) => {
    if (kind.startsWith('TS')) {
        return `TS ${kind.substring(2)}`;
    }
    return kind;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedKind === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedKind(null)}
          >
            All ({symbols.length})
          </Badge>
          {symbolKinds.map(kind => (
            <Badge
              key={kind}
              variant={selectedKind === kind ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedKind(selectedKind === kind ? null : kind)}
            >
              {formatKind(kind as Symbol['kind'])} ({symbols.filter(s => s.kind === kind).length})
            </Badge>
          ))}
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredSymbols.map((symbol, index) => (
            <Card 
              key={`${symbol.location.path}-${symbol.identifier}-${symbol.location.line}-${index}`}
              className={`transition-all hover:shadow-md ${
                selectedSymbol === symbol ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded ${getSymbolColor(symbol.kind)}`}>
                    {getSymbolIcon(symbol.kind)}
                  </div>
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedSymbol(symbol)}
                  >
                    <div className="font-medium text-sm truncate">
                      {symbol.identifier}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {symbol.location.path.split('/').pop()}:{symbol.location.line}
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {formatKind(symbol.kind)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSymbol(symbol);
                      }}
                      className={`text-gray-500 hover:text-blue-600 p-1 h-auto ${
                        selectedSymbol === symbol ? 'text-blue-600 bg-blue-50' : ''
                      }`}
                      title="Show Context"
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSymbol(symbol);
                      }}
                      className="text-gray-500 hover:text-blue-600 p-1 h-auto"
                      title="Go to Definition"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredSymbols.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No symbols found</p>
              {searchTerm && (
                <p className="text-sm">Try adjusting your search term</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Panel */}
      {selectedSymbol && (
        <div className="border-t border-gray-200">
          <ContextPanel 
            symbol={selectedSymbol} 
            onFileClick={(filePath) => {
              // For now, we'll just log the file click
              // In a full implementation, this would open the file
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
    </div>
  );
}
// Integration: [This component is a key part of the `ProjectWorkspace`. Its updates are crucial for visualizing the results of the new polyglot backend.]
// Notes: [New icons from `lucide-react` have been chosen to represent Rust constructs. The helper functions are now strongly typed with `Symbol['kind']` for better safety and intellisense.]