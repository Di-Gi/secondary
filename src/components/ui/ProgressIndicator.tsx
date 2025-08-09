// [[SECONDARY_MIND]]/src/components/ui/ProgressIndicator.tsx
// Purpose: Progress indicator components for long-running operations with cancellation support.
// Architecture: Reusable React components with different progress visualization styles.
// Dependencies: React, Lucide icons, Tailwind CSS.

import React from 'react';
import { X, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface ProgressIndicatorProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum progress value (default: 100) */
  max?: number;
  /** Progress indicator variant */
  variant?: 'linear' | 'circular' | 'minimal' | 'detailed';
  /** Size of the progress indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Current operation status */
  status?: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  /** Operation title */
  title?: string;
  /** Current operation description */
  description?: string;
  /** Estimated time remaining (in seconds) */
  estimatedTimeRemaining?: number;
  /** Enable cancellation */
  cancellable?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom color scheme */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  /** Animation speed */
  animationSpeed?: 'slow' | 'normal' | 'fast';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  variant = 'linear',
  size = 'md',
  status = 'running',
  title,
  description,
  estimatedTimeRemaining,
  cancellable = false,
  onCancel,
  showPercentage = true,
  color = 'blue',
  animationSpeed = 'normal',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  };

  const animationClasses = {
    slow: 'transition-all duration-1000 ease-out',
    normal: 'transition-all duration-500 ease-out',
    fast: 'transition-all duration-200 ease-out',
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (variant === 'circular') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex items-center space-x-3">
        <div className="relative">
          <svg
            className={`transform -rotate-90 ${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'}`}
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${colorClasses[color]} ${animationClasses[animationSpeed]}`}
              strokeLinecap="round"
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium">{Math.round(percentage)}%</span>
            </div>
          )}
        </div>
        {(title || description) && (
          <div className="flex-1 min-w-0">
            {title && <div className="text-sm font-medium truncate">{title}</div>}
            {description && <div className="text-xs text-gray-500 truncate">{description}</div>}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        {title && <span className="text-sm">{title}</span>}
        {showPercentage && <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {title && <span className="text-sm font-medium">{title}</span>}
          </div>
          <div className="flex items-center space-x-2">
            {estimatedTimeRemaining && status === 'running' && (
              <span className="text-xs text-gray-500">
                {formatTime(estimatedTimeRemaining)} remaining
              </span>
            )}
            {showPercentage && (
              <span className="text-xs font-medium">{Math.round(percentage)}%</span>
            )}
            {cancellable && onCancel && status === 'running' && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Cancel operation"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
          <div
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full ${animationClasses[animationSpeed]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {description && (
          <div className="text-xs text-gray-500">{description}</div>
        )}
      </div>
    );
  }

  // Default linear variant
  return (
    <div className="space-y-1">
      {(title || showPercentage) && (
        <div className="flex items-center justify-between">
          {title && <span className="text-sm font-medium">{title}</span>}
          {showPercentage && <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full ${animationClasses[animationSpeed]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {description && (
        <div className="text-xs text-gray-500">{description}</div>
      )}
    </div>
  );
};

// Specialized progress components for common use cases

export interface AnalysisProgressProps {
  filesProcessed: number;
  totalFiles: number;
  currentFile?: string;
  onCancel?: () => void;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  filesProcessed,
  totalFiles,
  currentFile,
  onCancel,
}) => {
  const percentage = totalFiles > 0 ? (filesProcessed / totalFiles) * 100 : 0;
  const estimatedTimeRemaining = totalFiles > filesProcessed && filesProcessed > 0
    ? ((totalFiles - filesProcessed) / filesProcessed) * 2 // Rough estimate
    : undefined;

  return (
    <ProgressIndicator
      value={percentage}
      variant="detailed"
      title="Analyzing Project"
      description={currentFile ? `Processing: ${currentFile}` : `${filesProcessed} of ${totalFiles} files processed`}
      estimatedTimeRemaining={estimatedTimeRemaining}
      cancellable={true}
      onCancel={onCancel}
      color="blue"
    />
  );
};

export interface SearchProgressProps {
  query: string;
  resultsFound: number;
  filesSearched: number;
  totalFiles: number;
  onCancel?: () => void;
}

export const SearchProgress: React.FC<SearchProgressProps> = ({
  query,
  resultsFound,
  filesSearched,
  totalFiles,
  onCancel,
}) => {
  const percentage = totalFiles > 0 ? (filesSearched / totalFiles) * 100 : 0;

  return (
    <ProgressIndicator
      value={percentage}
      variant="detailed"
      title={`Searching for "${query}"`}
      description={`${resultsFound} results found in ${filesSearched} of ${totalFiles} files`}
      cancellable={true}
      onCancel={onCancel}
      color="green"
    />
  );
};

export interface AIProcessingProgressProps {
  operation: string;
  stage?: string;
  onCancel?: () => void;
}

export const AIProcessingProgress: React.FC<AIProcessingProgressProps> = ({
  operation,
  stage,
  onCancel,
}) => {
  return (
    <ProgressIndicator
      value={50} // Indeterminate progress
      variant="minimal"
      title={`AI ${operation}`}
      description={stage}
      cancellable={true}
      onCancel={onCancel}
      color="yellow"
    />
  );
};