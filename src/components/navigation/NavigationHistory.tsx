// Navigation History Component - Placeholder
// Purpose: Context-aware history with session grouping and visual previews
// Will be implemented in task 6.1

// import React from 'react'; // Will be used when component is implemented
import { NavigationHistory as NavigationHistoryType, NavigationLocation } from '../../types/navigation';

export interface NavigationHistoryProps {
  history?: NavigationHistoryType;
  onLocationSelect?: (location: NavigationLocation) => void;
  onSessionRestore?: (sessionId: string) => void;
  className?: string;
}

export function NavigationHistory({
  className = ''
}: NavigationHistoryProps) {
  return (
    <div className={`navigation-history-placeholder ${className}`}>
      <div className="p-4 text-center text-muted-foreground">
        <div className="text-sm font-medium mb-2">Navigation History</div>
        <div className="text-xs">Will be implemented in task 6.1</div>
      </div>
    </div>
  );
}

export default NavigationHistory;