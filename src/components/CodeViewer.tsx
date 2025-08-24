// Simple code viewer for displaying file contents with symbol highlighting
// Purpose: Display file content when user clicks "Go to Definition" from Symbol Explorer
// Architecture: Focused component that shows code with line numbers and highlights target symbol

import { useEffect, useState } from 'react';
import { api, Symbol } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LoadingSpinner } from './ui/loading-spinner';
import { X, FileText, MapPin } from 'lucide-react';

interface CodeViewerProps {
  symbol: Symbol;
  onClose: () => void;
}

export function CodeViewer({ symbol, onClose }: CodeViewerProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFileContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fileContent = await api.readFileContent(symbol.location.path);
        setContent(fileContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [symbol.location.path]);

  const getFileName = () => {
    return symbol.location.path.split('/').pop() || symbol.location.path;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading file content...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Failed to load file</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
          </div>
        </div>
      );
    }

    const lines = content.split('\n');
    const targetLine = symbol.location.line;

    return (
      <div className="bg-gray-50 rounded-md border">
        <div className="max-h-96 overflow-y-auto">
          <pre className="text-sm">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isTargetLine = lineNumber === targetLine;
              
              return (
                <div
                  key={lineNumber}
                  className={`flex ${
                    isTargetLine 
                      ? 'bg-yellow-100 border-l-4 border-yellow-400' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="inline-block w-12 text-right text-gray-400 text-xs py-1 px-2 select-none border-r">
                    {lineNumber}
                  </span>
                  <code className="flex-1 py-1 px-3 whitespace-pre-wrap break-all">
                    {line || ' '}
                  </code>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">{symbol.identifier}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <MapPin className="h-3 w-3" />
                <span>{getFileName()}</span>
                <span>•</span>
                <span>Line {symbol.location.line}</span>
                <span>•</span>
                <span className="capitalize">{symbol.kind.replace('TS', '').toLowerCase()}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}