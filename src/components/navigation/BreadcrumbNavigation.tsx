// Breadcrumb Navigation Component - Placeholder
// Purpose: Shows hierarchical context from project to current symbol
// Will be implemented in task 4.1

// import React from 'react'; // Will be used when component is implemented
import { BreadcrumbSegment } from '../../types/navigation';

export interface BreadcrumbNavigationProps {
  segments?: BreadcrumbSegment[];
  onSegmentClick?: (segment: BreadcrumbSegment) => void;
  maxSegments?: number;
  className?: string;
}

export function BreadcrumbNavigation({
  className = ''
}: BreadcrumbNavigationProps) {
  return (
    <div className={`breadcrumb-navigation-placeholder ${className}`}>
      <div className="p-4 text-center text-muted-foreground">
        <div className="text-sm font-medium mb-2">Breadcrumb Navigation</div>
        <div className="text-xs">Will be implemented in task 4.1</div>
      </div>
    </div>
  );
}

export default BreadcrumbNavigation;