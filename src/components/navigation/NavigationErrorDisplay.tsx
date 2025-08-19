// Enhanced Navigation Interface - Error Display Component
// Purpose: Displays navigation errors with recovery options and user guidance
// Architecture: Reusable component for consistent error presentation across navigation features

import React from 'react';
import { AlertTriangle, RefreshCw, X, Info } from 'lucide-react';
import { NavigationError, NavigationErrorSeverity } from '../../types/navigation';

interface NavigationErrorDisplayProps {
  error: NavigationError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onRecovery?: () => void;
  canRetry?: boolean;
  isRecovering?: boolean;
  className?: string;
}

export const NavigationErrorDisplay: React.FC<NavigationErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  onRecovery,
  canRetry = false,
  isRecovering = false,
  className = ''
}) => {
  const getSeverityStyles = (severity: NavigationErrorSeverity) => {
    switch (severity) {
      case 'Low':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
        };
      case 'Medium':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: 'text-orange-600',
          button: 'bg-orange-100 hover:bg-orange-200 text-orange-800'
        };
      case 'High':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-100 hover:bg-red-200 text-red-800'
        };
      case 'Critical':
        return {
          container: 'bg-red-100 border-red-300 text-red-900',
          icon: 'text-red-700',
          button: 'bg-red-200 hover:bg-red-300 text-red-900'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-800',
          icon: 'text-gray-600',
          button: 'bg-gray-100 hover:bg-gray-200 text-gray-800'
        };
    }
  };

  const styles = getSeverityStyles(error.severity);

  const getRecoveryActionText = () => {
    switch (error.recovery_strategy.type) {
      case 'Retry': return 'Retry Operation';
      case 'Fallback': return 'Use Fallback';
      case 'Degrade': return 'Continue with Limited Features';
      case 'Reset': return 'Reset Component';
      case 'Skip': return 'Skip and Continue';
      case 'Manual': return 'View Instructions';
      default: return 'Recover';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${styles.container} ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className={`h-5 w-5 mt-0.5 ${styles.icon}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Navigation Error ({error.severity})
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`p-1 rounded-md ${styles.button} transition-colors`}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="mt-1 text-sm">
            {error.user_message}
          </p>
          
          {error.suggested_actions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Suggested actions:</p>
              <ul className="text-xs space-y-1">
                {error.suggested_actions.map((action, index) => (
                  <li key={index} className="flex items-center space-x-1">
                    <Info className="h-3 w-3" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 flex items-center space-x-2">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                disabled={isRecovering}
                className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${styles.button} transition-colors disabled:opacity-50`}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRecovering ? 'animate-spin' : ''}`} />
                {isRecovering ? 'Retrying...' : 'Retry'}
              </button>
            )}
            
            {error.recovery_strategy.type !== 'None' && onRecovery && (
              <button
                onClick={onRecovery}
                disabled={isRecovering}
                className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${styles.button} transition-colors disabled:opacity-50`}
              >
                {getRecoveryActionText()}
              </button>
            )}
            
            {error.can_continue && (
              <span className="text-xs opacity-75">
                You can continue using other features
              </span>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                Technical Details
              </summary>
              <pre className="mt-1 text-xs bg-black bg-opacity-10 p-2 rounded overflow-auto">
                {error.technical_details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationErrorDisplay;