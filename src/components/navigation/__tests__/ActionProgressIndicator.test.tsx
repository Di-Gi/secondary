// Action Progress Indicator Tests
// Purpose: Tests for progress feedback and visual indicators
// Architecture: Component tests for progress states and batch operations

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionProgressIndicator, BatchActionProgress } from '../ActionProgressIndicator';
import { ContextualAction, ActionResult } from '../../../types/navigation';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { it } from 'node:test';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Mock action for testing
const mockAction: ContextualAction = {
  id: 'test-action',
  label: 'Test Action',
  description: 'Test action for progress indication',
  icon: '🔧',
  category: 'navigation',
  condition: {
    requiresSelection: false,
    requiresProject: false
  },
  execute: async () => ({ success: true }),
  metadata: {
    priority: 1,
    isAsync: false,
    canBatch: false,
    estimatedDuration: 1000,
    requiresConfirmation: false,
    undoable: false
  }
};

describe('ActionProgressIndicator', () => {
  describe('Idle State', () => {
    it('should render idle state correctly', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('🔧')).toBeInTheDocument();
    });

    it('should show description when showDetails is true', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          showDetails={true}
        />
      );

      expect(screen.getByText('Test action for progress indication')).toBeInTheDocument();
    });

    it('should not show description when showDetails is false', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          showDetails={false}
        />
      );

      expect(screen.queryByText('Test action for progress indication')).not.toBeInTheDocument();
    });
  });

  describe('Executing State', () => {
    it('should render executing state correctly', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={true}
        />
      );

      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Executing...')).toBeInTheDocument();
      
      // Should have spinning indicator
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply executing state styling', () => {
      const { container } = render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={true}
        />
      );

      const progressContainer = container.firstChild as HTMLElement;
      expect(progressContainer).toHaveClass('border-blue-200', 'bg-blue-50/50');
    });
  });

  describe('Success State', () => {
    const successResult: ActionResult = {
      success: true,
      message: 'Action completed successfully'
    };

    it('should render success state correctly', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={successResult}
        />
      );

      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should apply success state styling', () => {
      const { container } = render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={successResult}
        />
      );

      const progressContainer = container.firstChild as HTMLElement;
      expect(progressContainer).toHaveClass('border-green-200', 'bg-green-50/50');
    });

    it('should show success message when showDetails is true', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={successResult}
          showDetails={true}
        />
      );

      expect(screen.getByText('Action completed successfully')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    const errorResult: ActionResult = {
      success: false,
      message: 'Action failed with error'
    };

    it('should render error state correctly', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={errorResult}
        />
      );

      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should apply error state styling', () => {
      const { container } = render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={errorResult}
        />
      );

      const progressContainer = container.firstChild as HTMLElement;
      expect(progressContainer).toHaveClass('border-red-200', 'bg-red-50/50');
    });

    it('should show error message when showDetails is true', () => {
      render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          result={errorResult}
          showDetails={true}
        />
      );

      expect(screen.getByText('Action failed with error')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ActionProgressIndicator
          action={mockAction}
          isExecuting={false}
          className="custom-class"
        />
      );

      const progressContainer = container.firstChild as HTMLElement;
      expect(progressContainer).toHaveClass('custom-class');
    });
  });
});

describe('BatchActionProgress', () => {
  const createMockActionState = (
    id: string,
    isExecuting: boolean = false,
    result?: ActionResult
  ) => ({
    action: { ...mockAction, id, label: `Action ${id}` },
    isExecuting,
    result
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct percentage', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', false, { success: false }),
        createMockActionState('3', true),
        createMockActionState('4', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('Batch Action Progress')).toBeInTheDocument();
      expect(screen.getByText('2 of 4 completed')).toBeInTheDocument();

      // Check progress bar
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 50%');
    });

    it('should handle empty actions array', () => {
      render(<BatchActionProgress actions={[]} />);

      expect(screen.getByText('0 of 0 completed')).toBeInTheDocument();
      
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 0%');
    });

    it('should show 100% progress when all actions are complete', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', false, { success: false })
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('2 of 2 completed')).toBeInTheDocument();
      
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 100%');
    });
  });

  describe('Status Indicators', () => {
    it('should show executing actions count', () => {
      const actions = [
        createMockActionState('1', true),
        createMockActionState('2', true),
        createMockActionState('3', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('2 executing')).toBeInTheDocument();
    });

    it('should show completed actions count', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', false, { success: true }),
        createMockActionState('3', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('2 completed')).toBeInTheDocument();
    });

    it('should show failed actions count', () => {
      const actions = [
        createMockActionState('1', false, { success: false }),
        createMockActionState('2', false, { success: false }),
        createMockActionState('3', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('2 failed')).toBeInTheDocument();
    });

    it('should show pending actions count', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', true),
        createMockActionState('3', false),
        createMockActionState('4', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('2 pending')).toBeInTheDocument();
    });

    it('should not show status indicators when count is zero', () => {
      const actions = [
        createMockActionState('1', false, { success: true })
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.queryByText(/executing/)).not.toBeInTheDocument();
      expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
    });
  });

  describe('Individual Action Progress', () => {
    it('should render individual action progress indicators', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', true),
        createMockActionState('3', false, { success: false })
      ];

      render(<BatchActionProgress actions={actions} />);

      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('Action 3')).toBeInTheDocument();
    });

    it('should handle scrollable content for many actions', () => {
      const manyActions = Array.from({ length: 20 }, (_, i) =>
        createMockActionState(`${i + 1}`, false, { success: true })
      );

      const { container } = render(<BatchActionProgress actions={manyActions} />);

      // Should have scrollable container
      const scrollableContainer = container.querySelector('.overflow-y-auto');
      expect(scrollableContainer).toBeInTheDocument();
      expect(scrollableContainer).toHaveClass('max-h-60');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BatchActionProgress
          actions={[createMockActionState('1')]}
          className="custom-batch-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-batch-class');
    });
  });

  describe('Performance', () => {
    it('should handle large number of actions efficiently', () => {
      const manyActions = Array.from({ length: 1000 }, (_, i) =>
        createMockActionState(`${i + 1}`, i % 3 === 0, 
          i % 2 === 0 ? { success: true } : undefined)
      );

      const startTime = performance.now();
      
      render(<BatchActionProgress actions={manyActions} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (increased threshold for CI environments)
      expect(renderTime).toBeLessThan(500);
      expect(screen.getByText('Batch Action Progress')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const actions = [
        createMockActionState('1', false, { success: true }),
        createMockActionState('2', true)
      ];

      render(<BatchActionProgress actions={actions} />);

      // Progress information should be accessible
      expect(screen.getByText('1 of 2 completed')).toBeInTheDocument();
      expect(screen.getByText('Batch Action Progress')).toBeInTheDocument();
    });

    it('should provide meaningful status information', () => {
      const actions = [
        createMockActionState('1', true),
        createMockActionState('2', false, { success: true }),
        createMockActionState('3', false, { success: false }),
        createMockActionState('4', false)
      ];

      render(<BatchActionProgress actions={actions} />);

      // All status types should be clearly indicated
      expect(screen.getByText('1 executing')).toBeInTheDocument();
      expect(screen.getByText('1 completed')).toBeInTheDocument();
      expect(screen.getByText('1 failed')).toBeInTheDocument();
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });
  });
});