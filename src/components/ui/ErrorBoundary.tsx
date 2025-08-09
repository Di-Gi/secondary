// [[SECONDARY_MIND]]/src/components/ui/ErrorBoundary.tsx
// Purpose: Error boundary components with recovery options and diagnostic information.
// Architecture: React error boundaries with fallback UI and recovery mechanisms.
// Dependencies: React, Lucide icons, Tailwind CSS.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import { useToast } from './ToastNotification';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'component' | 'feature';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report error to error tracking service
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys && resetOnPropsChange) {
      if (resetKeys && resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send the error to a logging service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    // Simulate error reporting
    console.log('Error reported:', errorReport);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    });
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(
        (prevState) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          showDetails: false,
          retryCount: prevState.retryCount + 1,
        })
      );
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorDetails = `
Error: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      // Would use toast notification here
      console.log('Error details copied to clipboard');
    });
  };

  render() {
    const { hasError, error, errorInfo, showDetails, retryCount } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3, level = 'component' } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          showDetails={showDetails}
          retryCount={retryCount}
          maxRetries={maxRetries}
          enableRetry={enableRetry}
          level={level}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onToggleDetails={this.toggleDetails}
          onCopyDetails={this.copyErrorDetails}
          onReset={this.resetErrorBoundary}
        />
      );
    }

    return children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
  maxRetries: number;
  enableRetry: boolean;
  level: string;
  onRetry: () => void;
  onReload: () => void;
  onToggleDetails: () => void;
  onCopyDetails: () => void;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  showDetails,
  retryCount,
  maxRetries,
  enableRetry,
  level,
  onRetry,
  onReload,
  onToggleDetails,
  onCopyDetails,
  onReset,
}) => {
  const getErrorTitle = () => {
    switch (level) {
      case 'page':
        return 'Page Error';
      case 'feature':
        return 'Feature Error';
      default:
        return 'Component Error';
    }
  };

  const getErrorMessage = () => {
    if (error.message.includes('ChunkLoadError')) {
      return 'Failed to load application resources. This might be due to a network issue or an application update.';
    }
    if (error.message.includes('Network')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    return 'An unexpected error occurred. The application encountered a problem and needs to recover.';
  };

  const getSuggestions = () => {
    const suggestions = [];
    
    if (error.message.includes('ChunkLoadError')) {
      suggestions.push('Refresh the page to load the latest version');
      suggestions.push('Clear your browser cache');
      suggestions.push('Check your internet connection');
    } else if (error.message.includes('Network')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
      suggestions.push('Contact support if the problem persists');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache and cookies');
      suggestions.push('Try using a different browser');
      suggestions.push('Contact support with the error details');
    }
    
    return suggestions;
  };

  return (
    <div className="min-h-[200px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{getErrorTitle()}</h3>
              <p className="text-sm text-gray-600">Something went wrong</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-3">{getErrorMessage()}</p>
            
            <div className="text-xs text-gray-500 mb-3">
              <strong>Error:</strong> {error.message}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Suggested actions:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-gray-400">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {enableRetry && retryCount < maxRetries && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </button>
            )}
            
            <button
              onClick={onReload}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </button>
            
            <button
              onClick={onToggleDetails}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Bug className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
              {showDetails ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          </div>

          {showDetails && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Error Details</h4>
                <button
                  onClick={onCopyDetails}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3 text-xs font-mono text-gray-800 max-h-40 overflow-y-auto">
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                <p>If this error persists, please copy these details and contact support.</p>
              </div>
            </div>
          )}

          {retryCount >= maxRetries && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Maximum retry attempts reached. Please reload the page or contact support.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Specialized error boundaries for different parts of the application

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" maxRetries={2}>
    {children}
  </ErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{ children: ReactNode; feature: string }> = ({ 
  children, 
  feature 
}) => (
  <ErrorBoundary 
    level="feature" 
    maxRetries={3}
    onError={(error, errorInfo) => {
      console.error(`Error in ${feature} feature:`, error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; component?: string }> = ({ 
  children, 
  component 
}) => (
  <ErrorBoundary 
    level="component" 
    maxRetries={1}
    isolate={true}
    onError={(error, errorInfo) => {
      if (component) {
        console.error(`Error in ${component} component:`, error, errorInfo);
      }
    }}
  >
    {children}
  </ErrorBoundary>
);

// Hook for programmatic error boundary reset
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};