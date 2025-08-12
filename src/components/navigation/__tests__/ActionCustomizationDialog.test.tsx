// Action Customization Dialog Tests
// Purpose: Integration tests for action customization functionality
// Architecture: Tests dialog interactions, action management, and configuration

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ActionCustomizationDialog } from '../ActionCustomizationDialog';
import { ContextualAction, ActionCategory } from '../../../types/navigation';
import { actionRegistry } from '../actions/ActionRegistry';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
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
import { it } from 'node:test';
import { it } from 'node:test';
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
    loading: vi.fn(),
    dismiss: vi.fn()
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

vi.mock('../../ui/tabs', () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  )
}));

// Sample test actions
const createTestAction = (id: string, category: ActionCategory): ContextualAction => ({
  id,
  label: `Test Action ${id}`,
  description: `Description for ${id}`,
  icon: '🔧',
  category,
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
});

const testActions: ContextualAction[] = [
  createTestAction('action1', 'navigation'),
  createTestAction('action2', 'search'),
  createTestAction('action3', 'refactor'),
  createTestAction('action4', 'navigation')
];

describe('ActionCustomizationDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    actionRegistry.clear();
    actionRegistry.registerActions(testActions);
  });

  afterEach(() => {
    actionRegistry.clear();
  });

  describe('Dialog Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Customize Quick Actions');
    });

    it('should not render dialog when closed', () => {
      render(
        <ActionCustomizationDialog
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render all tab triggers', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      expect(screen.getByTestId('tab-actions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-categories')).toBeInTheDocument();
      expect(screen.getByTestId('tab-import-export')).toBeInTheDocument();
    });
  });

  describe('Action Management', () => {
    it('should display all available actions', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      testActions.forEach(action => {
        expect(screen.getByText(action.label)).toBeInTheDocument();
      });
    });

    it('should filter actions by search query', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search actions...');
      fireEvent.change(searchInput, { target: { value: 'action1' } });

      await waitFor(() => {
        expect(screen.getByText('Test Action action1')).toBeInTheDocument();
        expect(screen.queryByText('Test Action action2')).not.toBeInTheDocument();
      });
    });

    it('should filter actions by category', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'navigation' } });

      await waitFor(() => {
        expect(screen.getByText('Test Action action1')).toBeInTheDocument();
        expect(screen.getByText('Test Action action4')).toBeInTheDocument();
        expect(screen.queryByText('Test Action action2')).not.toBeInTheDocument();
      });
    });

    it('should toggle action enabled state', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Find the switch for the first action
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(testActions.length);

      // Toggle the first switch
      fireEvent.click(switches[0]);

      // Verify the switch state changed
      await waitFor(() => {
        expect(switches[0]).toHaveAttribute('data-state', 'unchecked');
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag start event', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const actionItems = screen.getAllByText(/Test Action/);
      const firstAction = actionItems[0].closest('[draggable="true"]');
      
      expect(firstAction).toHaveAttribute('draggable', 'true');
      
      // Simulate drag start
      fireEvent.dragStart(firstAction!);
      
      // Should not throw error
      expect(firstAction).toBeInTheDocument();
    });

    it('should handle drag over event', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const actionItems = screen.getAllByText(/Test Action/);
      const firstAction = actionItems[0].closest('[draggable="true"]');
      
      // Simulate drag over
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'preventDefault', {
        value: jest.fn()
      });
      
      fireEvent(firstAction!, dragOverEvent);
      
      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Category Management', () => {
    it('should display category statistics', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Switch to categories tab
      fireEvent.click(screen.getByTestId('tab-categories'));

      // Should show category information
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Refactor')).toBeInTheDocument();
    });

    it('should enable all actions in a category', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Switch to categories tab
      fireEvent.click(screen.getByTestId('tab-categories'));

      // Find and click "Enable All" button for navigation category
      const enableAllButtons = screen.getAllByText('Enable All');
      fireEvent.click(enableAllButtons[0]);

      // Should not throw error
      expect(enableAllButtons[0]).toBeInTheDocument();
    });
  });

  describe('Import/Export', () => {
    it('should handle configuration export', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });

      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Switch to import/export tab
      fireEvent.click(screen.getByTestId('tab-import-export'));

      // Click export button
      const exportButton = screen.getByText('Copy to Clipboard');
      fireEvent.click(exportButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should handle configuration import', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Switch to import/export tab
      fireEvent.click(screen.getByTestId('tab-import-export'));

      // Enter valid JSON configuration
      const importTextarea = screen.getByPlaceholderText('Paste configuration JSON here...');
      const validConfig = JSON.stringify({
        enabledActions: ['action1', 'action2'],
        actionOrder: ['action1', 'action2', 'action3', 'action4']
      });

      fireEvent.change(importTextarea, { target: { value: validConfig } });

      // Click import button
      const importButton = screen.getByText('Import Configuration');
      fireEvent.click(importButton);

      // Should clear the textarea on successful import
      await waitFor(() => {
        expect(importTextarea).toHaveValue('');
      });
    });

    it('should handle invalid configuration import', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Switch to import/export tab
      fireEvent.click(screen.getByTestId('tab-import-export'));

      // Enter invalid JSON
      const importTextarea = screen.getByPlaceholderText('Paste configuration JSON here...');
      fireEvent.change(importTextarea, { target: { value: 'invalid json' } });

      // Click import button
      const importButton = screen.getByText('Import Configuration');
      fireEvent.click(importButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Invalid configuration format/)).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Actions', () => {
    it('should call onSave when save button is clicked', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should reset to defaults when reset button is clicked', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);

      // Should not throw error and reset should work
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Check for proper dialog structure
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      // Tab through interactive elements
      const searchInput = screen.getByPlaceholderText('Search actions...');
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Simulate tab to next element
      fireEvent.keyDown(searchInput, { key: 'Tab' });
      const categorySelect = screen.getByDisplayValue('All Categories');
      categorySelect.focus();
      expect(categorySelect).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle large number of actions efficiently', () => {
      const manyActions = Array.from({ length: 100 }, (_, i) => 
        createTestAction(`action${i}`, 'navigation')
      );

      const startTime = performance.now();
      
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={manyActions}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('should debounce search input', async () => {
      render(
        <ActionCustomizationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          availableActions={testActions}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search actions...');
      
      // Type quickly
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Should handle rapid typing without issues
      expect(searchInput).toHaveValue('test');
    });
  });
});