// [[SECONDARY_MIND_DESKTOP]]/src/components/GitStatusDisplay.tsx
// Purpose: Component for displaying Git repository status information in a clean, informative way.
// Architecture: Simple display component that formats and presents Git status data with appropriate styling.
// Dependencies: GitStatus type, UI components for consistent styling.

// import React from 'react';
import { GitStatus } from '../api';
import { Badge } from './ui/badge';
import { GitBranch, GitCommit, AlertCircle, CheckCircle } from 'lucide-react';

interface GitStatusDisplayProps {
  gitStatus: GitStatus;
}

export function GitStatusDisplay({ gitStatus }: GitStatusDisplayProps) {
  const getStatusIcon = () => {
    if (gitStatus.remote_status.includes('Up-to-date')) {
      return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
    } else if (gitStatus.remote_status.includes('Ahead') || gitStatus.remote_status.includes('Behind')) {
      return <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
    } else {
      return <GitCommit className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (gitStatus.remote_status.includes('Up-to-date')) {
      return 'default';
    } else if (gitStatus.remote_status.includes('Ahead') || gitStatus.remote_status.includes('Behind')) {
      return 'secondary';
    } else {
      return 'outline';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{gitStatus.local_branch}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Badge variant={getStatusVariant()} className="text-xs">
          {gitStatus.remote_status}
        </Badge>
      </div>
    </div>
  );
}

// Integration: Used by ProjectWorkspace to display Git repository status in the project header.
// Notes: Provides visual indicators for different Git states with appropriate colors and icons.