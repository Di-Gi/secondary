// QuickActionToolbar Component Tests
// Purpose: Test contextual action framework functionality
// Architecture: Tests action evaluation, execution, and keyboard shortcuts

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuickActionToolbar } from '../QuickActionToolbar';
import { ContextualAction, NavigationContext } from '../../../types/navigation';
import { Symbol } from '../../../api';
import { actionRegistry } from '../actions/ActionRegistry';

// Mock UI components
vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid="action-button"
      {...props}
    >
      {children}
    </button>
  )
}));



// Mock the hook
vi.mock('../hooks/useContextualActions', () => ({
  useContextualActions: vi.fn()
}));

import { useContextualActions } from '../hooks/useContextualActions';

describe('QuickActionToolbar', () => {
  const mockExecuteAction = vi.fn();
  const mockIsExecuting = vi.fn();
  const mockOnActionExecute = vi.fn();
  const mockOnActionCustomize = vi.fn();

  const mockSymbol: Symbol = {
    identifier: 'testFunction',
    kind: 'TSFunction',
    location: {
      path: '/test/file.ts',
      line: 10,
      column: 5
    }
  };

  const mockContext: NavigationContext = {
    projectPath: '/test/project',
    breadcrumbs: [
      {
        id: 'project',
        name: 'Test Project',
        path: '/test/project',
        type: 'project',
        isActive: false,
        isClickable: true,
        metadata: {
          fullPath: '/test/project',
          tooltip: 'Test Project'
        },
        actions: []
      },
      {
        id: 'file',
        name: 'file.ts',
        path: '/test/file.ts',
        type: 'file',
        isActive: true,
        isClickable: true,
        metadata: {
          fullPath: '/test/file.ts',
          tooltip: 'file.ts'
        },
        actions: []
      }
    ],
    relatedSymbols: [mockSymbol]
  };

  const mockActions: ContextualAction[] = [
    {
      id: 'test-action-1',
      label: 'Test Action 1',
      description: 'First test action',
      icon: '🔧',
      category: 'navigation',
      condition: {
        requiresSelection: true,
        symbolTypes: ['TSFunction']
      },
      execute: async () => ({ success: true, message: 'Action 1 executed' }),
      metadata: {
        priority: 10,
        isAsync: true,
        canBatch: false,
        estimatedDuration: 100,
        requiresConfirmation: false,
        undoable: false
      }
    },
    {
      id: 'test-action-2',
      label: 'Test Action 2',
      description: 'Second test action',
      icon: '🔍',
      category: 'search',
      shortcut: {
        key: 'F12',
        modifiers: ['ctrl'],
        description: 'Test Action 2'
      },
      condition: {
        requiresProject: true
      },
      execute: async () => ({ success: true, message: 'Action 2 executed' }),
      metadata: {
        priority: 8,
        isAsync: true,
        canBatch: false,
        estimatedDuration: 200,
        requiresConfirmation: false,
        undoable: false
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    actionRegistry.clear();
    
    // Setup default mock implementation
    (useContextualActions as any).mockReturnValue({
      actions: mockActions,
      executeAction: mockExecuteAction,
      isExecuting: mockIsExecuting,
      executingActions: new Set()
    });

    mockIsExecuting.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render action buttons when actions are available', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          onActionExecute={mockOnActionExecute}
        />
      );

      expect(screen.getByText('Test Action 1')).toBeInTheDocument();
      expect(screen.getByText('Test Action 2')).toBeInTheDocument();
    });

    it('should show empty state when no actions are available', () => {
      (useContextualActions as any).mockReturnValue({
        actions: [],
        executeAction: mockExecuteAction,
        isExecuting: mockIsExecuting,
        executingActions: new Set()
      });

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      expect(screen.getByText('No actions available')).toBeInTheDocument();
    });

    it('should group actions by category when showCategories is true', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          showCategories={true}
        />
      );

      // Should render separators between categories (using div with border class)
      const separators = document.querySelectorAll('.bg-border');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should not group actions when showCategories is false', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          showCategories={false}
        />
      );

      // Should not render separators
      const separators = document.querySelectorAll('.bg-border');
      expect(separators.length).toBe(0);
    });

    it('should limit visible actions based on maxVisibleActions', () => {
      const manyActions = Array.from({ length: 10 }, (_, i) => ({
        ...mockActions[0],
        id: `action-${i}`,
        label: `Action ${i}`
      }));

      (useContextualActions as any).mockReturnValue({
        actions: manyActions,
        executeAction: mockExecuteAction,
        isExecuting: mockIsExecuting,
        executingActions: new Set()
      });

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          maxVisibleActions={3}
        />
      );

      // Should show first 3 actions plus overflow indicator
      expect(screen.getByText('Action 0')).toBeInTheDocument();
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('+7')).toBeInTheDocument(); // Overflow indicator
    });
  });

  describe('Action Execution', () => {
    it('should execute action when button is clicked', async () => {
      mockExecuteAction.mockResolvedValue({ success: true, message: 'Success' });

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          onActionExecute={mockOnActionExecute}
        />
      );

      const actionButton = screen.getByText('Test Action 1');
      fireEvent.click(actionButton);

      await waitFor(() => {
        expect(mockExecuteAction).toHaveBeenCalledWith('test-action-1');
      });
    });

    it('should call custom onActionExecute callback', async () => {
      mockExecuteAction.mockResolvedValue({ success: true, message: 'Success' });

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          onActionExecute={mockOnActionExecute}
        />
      );

      const actionButton = screen.getByText('Test Action 1');
      fireEvent.click(actionButton);

      await waitFor(() => {
        expect(mockOnActionExecute).toHaveBeenCalledWith(mockActions[0]);
      });
    });

    it('should show loading state when action is executing', () => {
      mockIsExecuting.mockImplementation((actionId: string) => actionId === 'test-action-1');

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      const actionButton = screen.getByText('Test Action 1').closest('button');
      expect(actionButton).toBeDisabled();
      expect(screen.getByText('⟳')).toBeInTheDocument(); // Loading spinner
    });

    it('should handle action execution errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecuteAction.mockRejectedValue(new Error('Execution failed'));

      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      const actionButton = screen.getByText('Test Action 1');
      fireEvent.click(actionButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action execution failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Customization', () => {
    it('should show customization button when onActionCustomize is provided', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          onActionCustomize={mockOnActionCustomize}
        />
      );

      const customizeButton = screen.getByText('⚙️');
      expect(customizeButton).toBeInTheDocument();
    });

    it('should call onActionCustomize when customization button is clicked', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          onActionCustomize={mockOnActionCustomize}
          availableActions={mockActions}
        />
      );

      const customizeButton = screen.getByText('⚙️');
      fireEvent.click(customizeButton);

      expect(mockOnActionCustomize).toHaveBeenCalledWith(mockActions);
    });

    it('should not show customization button when onActionCustomize is not provided', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      expect(screen.queryByText('⚙️')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should have title attributes with action descriptions', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
        />
      );

      // Check that buttons have title attributes for tooltips
      const button1 = screen.getByText('Test Action 1').closest('button');
      const button2 = screen.getByText('Test Action 2').closest('button');
      
      expect(button1).toHaveAttribute('title', 'First test action');
      expect(button2).toHaveAttribute('title', 'Second test action • Shortcut: Ctrl+F12');
    });
  });

  describe('Integration with useContextualActions hook', () => {
    it('should pass correct parameters to useContextualActions hook', () => {
      render(
        <QuickActionToolbar
          currentContext={mockContext}
          selectedSymbols={[mockSymbol]}
          maxVisibleActions={5}
          availableActions={mockActions}
        />
      );

      expect(useContextualActions).toHaveBeenCalledWith({
        context: mockContext,
        selectedSymbols: [mockSymbol],
        enableKeyboardShortcuts: true,
        maxActions: 15, // maxVisibleActions * 3
        customActions: mockActions
      });
    });

    it('should handle empty context gracefully', () => {
      render(
        <QuickActionToolbar
          currentContext={undefined}
          selectedSymbols={[]}
        />
      );

      expect(useContextualActions).toHaveBeenCalledWith({
        context: undefined,
        selectedSymbols: [],
        enableKeyboardShortcuts: true,
        maxActions: 24, // default maxVisibleActions (8) * 3
        customActions: []
      });
    });
  });
});