// High-performance virtualized symbol list component
import React, { useMemo, useCallback, memo } from 'react';
import { FixedSizeList } from 'react-window';
import { Symbol } from '../api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  SquareFunction,
  Box,
  Code,
  Component,
  Spline,
  Shapes,
  FunctionSquare,
  Library,
  TerminalSquare,
  FileText,
  MoreHorizontal,
  Eye,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface VirtualizedSymbolListProps {
  symbols: Symbol[];
  selectedSymbolId?: string;
  onSymbolSelect: (symbol: Symbol) => void;
  onSymbolAction: (symbol: Symbol, action: 'view' | 'context' | 'copy' | 'references') => void;
  height: number;
  itemHeight: number;
}

interface SymbolItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    symbols: Symbol[];
    selectedSymbolId?: string;
    onSymbolSelect: (symbol: Symbol) => void;
    onSymbolAction: (symbol: Symbol, action: 'view' | 'context' | 'copy' | 'references') => void;
  };
}

// Memoized symbol item component
const SymbolItem = memo<SymbolItemProps>(({ index, style, data }) => {
  const { symbols, selectedSymbolId, onSymbolSelect, onSymbolAction } = data;
  const symbol = symbols[index];
  
  if (!symbol) return null;

  const isSelected = selectedSymbolId === symbol.identifier;
  const fileName = symbol.location.path.split('/').pop();

  const getSymbolIcon = useCallback((kind: Symbol['kind']) => {
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
  }, []);

  const getSymbolColor = useCallback((kind: Symbol['kind']) => {
    switch (kind) {
      case 'TSFunction': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'TSClass': return 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20';
      case 'TSInterface': return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20';
      case 'Struct': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
      case 'Enum': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'Trait': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      case 'Function': return 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/20';
      case 'Impl': return 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/20';
      case 'Module': return 'text-lime-600 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20';
      case 'Macro': return 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20';
      default: return 'text-muted-foreground bg-muted';
    }
  }, []);

  const formatKind = useCallback((kind: Symbol['kind']) => {
    if (kind.startsWith('TS')) {
      return `TS ${kind.substring(2)}`;
    }
    return kind;
  }, []);

  const handleClick = useCallback(() => {
    onSymbolSelect(symbol);
  }, [symbol, onSymbolSelect]);

  const handleAction = useCallback((action: 'view' | 'context' | 'copy' | 'references') => {
    onSymbolAction(symbol, action);
  }, [symbol, onSymbolAction]);

  return (
    <div
      style={style}
      className={`group flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-l-2 transition-all ${
        isSelected ? 'border-l-primary bg-primary/10' : 'border-l-transparent'
      }`}
      onClick={handleClick}
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
            <DropdownMenuItem onClick={() => handleAction('view')}>
              <Eye className="h-4 w-4 mr-2" />
              View Definition
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('context')}>
              <Zap className="h-4 w-4 mr-2" />
              Show Context
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('references')}>
              <FileText className="h-4 w-4 mr-2" />
              Find References
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('copy')}>
              <FileText className="h-4 w-4 mr-2" />
              Copy Path
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

SymbolItem.displayName = 'SymbolItem';

// Main virtualized list component
export const VirtualizedSymbolList = memo<VirtualizedSymbolListProps>(({
  symbols,
  selectedSymbolId,
  onSymbolSelect,
  onSymbolAction,
  height,
  itemHeight,
}) => {
  const itemData = useMemo(() => ({
    symbols,
    selectedSymbolId,
    onSymbolSelect,
    onSymbolAction,
  }), [symbols, selectedSymbolId, onSymbolSelect, onSymbolAction]);

  if (symbols.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No symbols found</p>
        </div>
      </div>
    );
  }

  return (
    <FixedSizeList
      height={height}
      width="100%"
      itemCount={symbols.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={5}
    >
      {SymbolItem}
    </FixedSizeList>
  );
});

VirtualizedSymbolList.displayName = 'VirtualizedSymbolList';