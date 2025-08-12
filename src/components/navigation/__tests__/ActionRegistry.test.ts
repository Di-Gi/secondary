// ActionRegistry Tests
// Purpose: Test action registration, evaluation, and execution system
// Architecture: Tests core action management functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionRegistry, KeyboardShortcutManager } from '../actions/ActionRegistry';
import { ContextualAction, NavigationContext } from '../../../types/navigation';
import { Symbol } from '../../../api';

describe('ActionRegistry', () => {
  let registry: ActionRegistry;
  
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

  const mockAction: ContextualAction = {
    id: 'test-action',
    label: 'Test Action',
    description: 'A test action',
    icon: '🔧',
    category: 'navigation',
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction']
    },
    execute: vi.fn().mockResolvedValue({ success: true, message: 'Success' }),
    metadata: {
      priority: 10,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 100,
      requiresConfirmation: false,
      undoable: false
    }
  };

  beforeEach(() => {
    registry = new ActionRegistry();
  });

  describe('Action Registration', () => {
    it('should register a single action', () => {
      registry.registerAction(mockAction);
      
      expect(registry.hasAction('test-action')).toBe(true);
      expect(registry.getAction('test-action')).toEqual(mockAction);
      expect(registry.getActionsCount()).toBe(1);
    });

    it('should register multiple actions', () => {
      const actions = [
        mockAction,
        { ...mockAction, id: 'test-action-2', category: 'search' }
      ];

      registry.registerActions(actions);
      
      expect(registry.getActionsCount()).toBe(2);
      expect(registry.hasAction('test-action')).toBe(true);
      expect(registry.hasAction('test-action-2')).toBe(true);
    });

    it('should organize actions by category', () => {
      const searchAction = { ...mockAction, id: 'search-action', category: 'search' as const };
      
      registry.registerAction(mockAction);
      registry.registerAction(searchAction);
      
      const navigationActions = registry.getActionsByCategory('navigation');
      const searchActions = registry.getActionsByCategory('search');
      
      expect(navigationActions).toHaveLength(1);
      expect(searchActions).toHaveLength(1);
      expect(navigationActions[0].id).toBe('test-action');
      expect(searchActions[0].id).toBe('search-action');
    });

    it('should unregister actions', () => {
      registry.registerAction(mockAction);
      expect(registry.hasAction('test-action')).toBe(true);
      
      registry.unregisterAction('test-action');
      expect(registry.hasAction('test-action')).toBe(false);
      expect(registry.getActionsCount()).toBe(0);
    });

    it('should handle unregistering non-existent actions', () => {
      expect(() => registry.unregisterAction('non-existent')).not.toThrow();
    });

    it('should clear all actions', () => {
      registry.registerActions([mockAction, { ...mockAction, id: 'action-2' }]);
      expect(registry.getActionsCount()).toBe(2);
      
      registry.clear();
      expect(registry.getActionsCount()).toBe(0);
      expect(registry.getCategories()).toHaveLength(0);
    });
  });

  describe('Action Condition Evaluation', () => {
    it('should evaluate requiresSelection condition', () => {
      registry.registerAction(mockAction);
      
      // With selection
      const actionsWithSelection = registry.getContextualActions(mockContext, [mockSymbol]);
      expect(actionsWithSelection).toHaveLength(1);
      
      // Without selection
      const actionsWithoutSelection = registry.getContextualActions(mockContext, []);
      expect(actionsWithoutSelection).toHaveLength(0);
    });

    it('should evaluate requiresProject condition', () => {
      const projectAction: ContextualAction = {
        ...mockAction,
        id: 'project-action',
        condition: { requiresProject: true }
      };
      
      registry.registerAction(projectAction);
      
      // With project
      const actionsWithProject = registry.getContextualActions(mockContext);
      expect(actionsWithProject).toHaveLength(1);
      
      // Without project
      const contextWithoutProject = { ...mockContext, projectPath: '' };
      const actionsWithoutProject = registry.getContextualActions(contextWithoutProject);
      expect(actionsWithoutProject).toHaveLength(0);
    });

    it('should evaluate symbolTypes condition', () => {
      registry.registerAction(mockAction);
      
      // Matching symbol type
      const actionsWithMatchingSymbol = registry.getContextualActions(mockContext, [mockSymbol]);
      expect(actionsWithMatchingSymbol).toHaveLength(1);
      
      // Non-matching symbol type
      const classSymbol: Symbol = { ...mockSymbol, kind: 'TSClass' };
      const actionsWithNonMatchingSymbol = registry.getContextualActions(mockContext, [classSymbol]);
      expect(actionsWithNonMatchingSymbol).toHaveLength(0);
    });

    it('should evaluate fileTypes condition', () => {
      const fileAction: ContextualAction = {
        ...mockAction,
        id: 'file-action',
        condition: { fileTypes: ['ts', 'tsx'] }
      };
      
      registry.registerAction(fileAction);
      
      // Matching file type
      const actionsWithMatchingFile = registry.getContextualActions(mockContext);
      expect(actionsWithMatchingFile).toHaveLength(1);
      
      // Non-matching file type
      const contextWithJsFile = {
        ...mockContext,
        breadcrumbs: [{
          ...mockContext.breadcrumbs[0],
          path: '/test/file.js'
        }]
      };
      const actionsWithNonMatchingFile = registry.getContextualActions(contextWithJsFile);
      expect(actionsWithNonMatchingFile).toHaveLength(0);
    });

    it('should evaluate custom conditions', () => {
      const customAction: ContextualAction = {
        ...mockAction,
        id: 'custom-action',
        condition: {
          customCondition: (context) => context.breadcrumbs.length > 0
        }
      };
      
      registry.registerAction(customAction);
      
      // Custom condition passes
      const actionsWithBreadcrumbs = registry.getContextualActions(mockContext);
      expect(actionsWithBreadcrumbs).toHaveLength(1);
      
      // Custom condition fails
      const contextWithoutBreadcrumbs = { ...mockContext, breadcrumbs: [] };
      const actionsWithoutBreadcrumbs = registry.getContextualActions(contextWithoutBreadcrumbs);
      expect(actionsWithoutBreadcrumbs).toHaveLength(0);
    });

    it('should handle custom condition errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorAction: ContextualAction = {
        ...mockAction,
        id: 'error-action',
        condition: {
          customCondition: () => { throw new Error('Test error'); }
        }
      };
      
      registry.registerAction(errorAction);
      
      const actions = registry.getContextualActions(mockContext);
      expect(actions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Action Execution', () => {
    it('should execute registered actions', async () => {
      registry.registerAction(mockAction);
      
      const result = await registry.executeAction('test-action', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Success');
      expect(mockAction.execute).toHaveBeenCalledWith(mockContext, undefined);
    });

    it('should execute actions with parameters', async () => {
      registry.registerAction(mockAction);
      const params = { test: 'value' };
      
      await registry.executeAction('test-action', mockContext, params);
      
      expect(mockAction.execute).toHaveBeenCalledWith(mockContext, params);
    });

    it('should handle non-existent actions', async () => {
      const result = await registry.executeAction('non-existent', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle action execution errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorAction: ContextualAction = {
        ...mockAction,
        id: 'error-action',
        execute: vi.fn().mockRejectedValue(new Error('Execution error'))
      };
      
      registry.registerAction(errorAction);
      
      const result = await registry.executeAction('error-action', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Execution error');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    it('should return all actions', () => {
      const actions = [mockAction, { ...mockAction, id: 'action-2' }];
      registry.registerActions(actions);
      
      const allActions = registry.getAllActions();
      expect(allActions).toHaveLength(2);
      expect(allActions.map(a => a.id)).toEqual(['test-action', 'action-2']);
    });

    it('should return categories', () => {
      registry.registerAction(mockAction);
      registry.registerAction({ ...mockAction, id: 'search-action', category: 'search' });
      
      const categories = registry.getCategories();
      expect(categories).toContain('navigation');
      expect(categories).toContain('search');
    });
  });
});

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;

  const actionWithShortcut: ContextualAction = {
    id: 'shortcut-action',
    label: 'Shortcut Action',
    icon: '⌨️',
    category: 'navigation',
    shortcut: {
      key: 'F12',
      modifiers: ['ctrl'],
      description: 'Test shortcut'
    },
    condition: {},
    execute: vi.fn(),
    metadata: {
      priority: 10,
      isAsync: false,
      canBatch: false,
      estimatedDuration: 100,
      requiresConfirmation: false,
      undoable: false
    }
  };

  beforeEach(() => {
    manager = new KeyboardShortcutManager();
  });

  describe('Shortcut Registration', () => {
    it('should register shortcuts from actions', () => {
      manager.registerShortcuts([actionWithShortcut]);
      
      // Create mock keyboard event
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        ctrlKey: true
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toEqual(actionWithShortcut);
    });

    it('should handle actions without shortcuts', () => {
      const actionWithoutShortcut = { ...actionWithShortcut, shortcut: undefined };
      
      expect(() => manager.registerShortcuts([actionWithoutShortcut])).not.toThrow();
    });

    it('should clear shortcuts', () => {
      manager.registerShortcuts([actionWithShortcut]);
      manager.clear();
      
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        ctrlKey: true
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toBeUndefined();
    });
  });

  describe('Shortcut Matching', () => {
    beforeEach(() => {
      manager.registerShortcuts([actionWithShortcut]);
    });

    it('should match exact key combinations', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        ctrlKey: true
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toEqual(actionWithShortcut);
    });

    it('should not match partial key combinations', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'F12'
        // Missing ctrlKey
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toBeUndefined();
    });

    it('should not match with extra modifiers', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        ctrlKey: true,
        shiftKey: true // Extra modifier
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toBeUndefined();
    });

    it('should handle multiple modifiers', () => {
      const multiModifierAction = {
        ...actionWithShortcut,
        id: 'multi-modifier',
        shortcut: {
          key: 'r',
          modifiers: ['ctrl', 'shift'] as const,
          description: 'Multi modifier'
        }
      };
      
      manager.registerShortcuts([multiModifierAction]);
      
      const event = new KeyboardEvent('keydown', {
        key: 'r',
        ctrlKey: true,
        shiftKey: true
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toEqual(multiModifierAction);
    });

    it('should be case insensitive for keys', () => {
      const lowerCaseAction = {
        ...actionWithShortcut,
        shortcut: {
          key: 'a',
          modifiers: ['ctrl'] as const,
          description: 'Lower case'
        }
      };
      
      manager.registerShortcuts([lowerCaseAction]);
      
      const event = new KeyboardEvent('keydown', {
        key: 'A', // Upper case
        ctrlKey: true
      });
      
      const foundAction = manager.findActionByKeyboardEvent(event);
      expect(foundAction).toEqual(lowerCaseAction);
    });
  });
});