// Action System Integration Tests
// Purpose: End-to-end tests for the complete action customization and feedback system
// Architecture: Integration tests covering the full workflow

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QuickActionToolbar } from '../QuickActionToolbar';
import { ActionCustomizationDialog } from '../ActionCustomizationDialog';
import { ActionProgressIndicator } from '../ActionProgressIndicator';
import { ContextualAction, NavigationContext, ActionResult } from '../../../types/navigation';
import { actionRegistry } from '../actions/ActionRegistry';
import { actionErrorHandler } from '../actions/ActionErrorHandler';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn().mockReturnValue('loading-id'),
    dismiss: vi.fn(),
    info: vi.fn()
  }
}));

// Mock UI components
vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>
}));

// Sample test data
const mockContext: NavigationContext = {
  projectPath: '/test/project',
  breadcrumbs: [
    {
      id: 'file',
      name: 'test.ts',
      path: '/test/project/test.ts',
      type: 'file',
      isActive: true,
      isClickable: true,
      metadata: {
        fullPath: '/test/project/test.ts',
        tooltip: 'test.ts'
      },
      actions: []
    }
  ],
  relatedSymbols: []
};

const createTestAction = (id: string, shouldFail: boolean = false): ContextualAction => ({
  id,
  label: `Test Action ${id}`,
  description: `Description for ${id}`,
  icon: '🔧',
  category: 'navigation',
  condition: {
    requiresSelection: false,
    requiresProject: false
  },
  execute: async () => {
    if (shouldFail) {
      throw new Error(`Action ${id} failed`);
    }
    return { success: true, message: `Action ${id} completed` };
  },
  metadata: {
    priority: 1,
    isAsync: false,
    canBatch: false,
    estimatedDuration: 1000,
    requiresConfirmation: false,
    undoable: false
  }
});

describe('Action System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionRegistry.clear();
    actionErrorHandler.clearErrorHistory();
  });

  afterEach(() => {
    actionRegistry.clear();
  });

  describe('Complete Action Workflow', () => {
    it('should handle successful action execution with feedback', async () => {
      const testActions = [
        createTestAction('success-action', false)
      ];
      
      actionRegistry.registerActions(testActions);

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          showProgressFeedback={true}
          enableErrorHandling={true}
        />
      );

      // Find and click the action button
      const actionButton = screen.getByText('Test Action success-action');
      expect(actionButton).toBeInTheDocument();

      fireEvent.click(actionButton);

      // Should show loading state
      await waitFor(() => {
        expect(actionButton.querySelector('.animate-spin')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(actionButton.querySelector('.animate-spin')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Should show success indicator
      expect(actionButton.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('should handle failed action execution with error feedback', async () => {
      const testActions = [
        createTestAction('fail-action', true)
      ];
      
      actionRegistry.registerActions(testActions);

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          showProgressFeedback={true}
          enableErrorHandling={true}
        />
      );

      // Find and click the action button
      const actionButton = screen.getByText('Test Action fail-action');
      fireEvent.click(actionButton);

      // Wait for completion
      await waitFor(() => {
        expect(actionButton.querySelector('.animate-spin')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Should show error indicator
      expect(actionButton.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('should integrate customization dialog with toolbar', async () => {
      const testActions = [
        createTestAction('action1'),
        createTestAction('action2')
      ];
      
      actionRegistry.registerActions(testActions);

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          showProgressFeedback={true}
          enableErrorHandling={true}
        />
      );

      // Find and click the customization button
      const customizeButton = screen.getByTitle('Customize actions');
      fireEvent.click(customizeButton);

      // Should open customization dialog
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Customize Quick Actions')).toBeInTheDocument();
      });

      // Should show available actions
      expect(screen.getByText('Test Action action1')).toBeInTheDocument();
      expect(screen.getByText('Test Action action2')).toBeInTheDocument();
    });
  });

  describe('Progress Indicator Integration', () => {
    it('should show correct progress states', () => {
      const action = createTestAction('progress-test');
      
      // Test idle state
      const { rerender } = render(
        <ActionProgressIndicator
          action={action}
          isExecuting={false}
        />
      );

      expect(screen.getByText('Ready')).toBeInTheDocument();

      // Test executing state
      rerender(
        <ActionProgressIndicator
          action={action}
          isExecuting={true}
        />
      );

      expect(screen.getByText('Executing...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Test success state
      const successResult: ActionResult = { success: true, message: 'Completed' };
      rerender(
        <ActionProgressIndicator
          action={action}
          isExecuting={false}
          result={successResult}
        />
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();

      // Test error state
      const errorResult: ActionResult = { success: false, message: 'Failed' };
      rerender(
        <ActionProgressIndicator
          action={action}
          isExecuting={false}
          result={errorResult}
        />
      );

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and categorize errors correctly', async () => {
      const action = createTestAction('error-test');
      
      // Test file not found error
      const fileError = new Error('File not found: /missing/file.ts');
      const result = await actionErrorHandler.handleError(fileError, action, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('file could not be found');
      expect(result.data?.error.category).toBe('FILE_NOT_FOUND');
      expect(result.data?.suggestedActions).toContain('Check if the file was moved or renamed');

      // Test permission error
      const permissionError = new Error('Permission denied');
      const permissionResult = await actionErrorHandler.handleError(permissionError, action, mockContext);

      expect(permissionResult.success).toBe(false);
      expect(permissionResult.message).toContain('permission');
      expect(permissionResult.data?.error.category).toBe('PERMISSION_DENIED');
      expect(permissionResult.data?.canRetry).toBe(false);
    });

    it('should maintain error history', async () => {
      const action = createTestAction('history-test');
      
      // Generate multiple errors
      for (let i = 0; i < 5; i++) {
        const error = new Error(`Error ${i}`);
        await actionErrorHandler.handleError(error, action, mockContext);
      }

      const history = actionErrorHandler.getErrorHistory(action.id);
      expect(history).toHaveLength(5);

      const stats = actionErrorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(5);
      expect(stats.mostProblematicActions[0].actionId).toBe(action.id);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle many actions efficiently', () => {
      const manyActions = Array.from({ length: 50 }, (_, i) => 
        createTestAction(`action${i}`)
      );
      
      actionRegistry.registerActions(manyActions);

      const startTime = performance.now();
      
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          maxVisibleActions={10}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render efficiently even with many actions
      expect(renderTime).toBeLessThan(200);
      
      // Should show limited number of actions
      const actionButtons = screen.getAllByText(/Test Action/);
      expect(actionButtons.length).toBeLessThanOrEqual(10);
    });

    it('should handle concurrent action executions', async () => {
      const testActions = [
        createTestAction('concurrent1'),
        createTestAction('concurrent2'),
        createTestAction('concurrent3')
      ];
      
      actionRegistry.registerActions(testActions);

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          showProgressFeedback={true}
        />
      );

      // Click multiple actions simultaneously
      const buttons = screen.getAllByText(/Test Action concurrent/);
      buttons.forEach(button => fireEvent.click(button));

      // All should show loading state
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button.querySelector('.animate-spin')).toBeInTheDocument();
        });
      });

      // Wait for all to complete
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button.querySelector('.animate-spin')).not.toBeInTheDocument();
        });
      }, { timeout: 3000 });

      // All should show success
      buttons.forEach(button => {
        expect(button.querySelector('.text-green-500')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide proper ARIA labels and keyboard support', () => {
      const testActions = [createTestAction('accessible-action')];
      actionRegistry.registerActions(testActions);

      render(
        <QuickActionToolbar
          currentContext={mockContext}
        />
      );

      const actionButton = screen.getByText('Test Action accessible-action');
      
      // Should have proper button role
      expect(actionButton.closest('button')).toBeInTheDocument();
      
      // Should have title attribute for tooltip
      expect(actionButton.closest('button')).toHaveAttribute('title');
      
      // Should be keyboard accessible
      const button = actionButton.closest('button')!;
      button.focus();
      expect(button).toHaveFocus();
      
      // Should respond to keyboard events
      fireEvent.keyDown(button, { key: 'Enter' });
      // Action should be triggered (loading state should appear)
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should provide meaningful progress feedback for screen readers', () => {
      const action = createTestAction('screen-reader-test');
      
      render(
        <ActionProgressIndicator
          action={action}
          isExecuting={true}
          showDetails={true}
        />
      );

      // Should have descriptive text
      expect(screen.getByText('Executing...')).toBeInTheDocument();
      expect(screen.getByText('Description for screen-reader-test')).toBeInTheDocument();
      
      // Progress indicator should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Configuration Persistence', () => {
    it('should export and import action configurations', () => {
      const testActions = [
        createTestAction('config1'),
        createTestAction('config2')
      ];
      
      actionRegistry.registerActions(testActions);

      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          availableActions={testActions}
        />
      );

      // Switch to import/export tab
      fireEvent.click(screen.getByTestId('tab-import-export'));

      // Should show export/import interface
      expect(screen.getByText('Export Configuration')).toBeInTheDocument();
      expect(screen.getByText('Import Configuration')).toBeInTheDocument();
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
      expect(screen.getByText('Import Configuration')).toBeInTheDocument();
    });
  });
});