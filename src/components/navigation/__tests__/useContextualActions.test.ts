// useContextualActions Hook Tests
// Purpose: Test React hook for managing contextual actions
// Architecture: Tests hook behavior, action execution, and keyboard shortcuts

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useContextualActions } from '../hooks/useContextualActions';
import { ContextualAction, NavigationContext } from '../../../types/navigation';
import { Symbol } from '../../../api';

describe('useContextualActions', () => {
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up event listeners
    document.removeEventListener('keydown', vi.fn());
  });

  describe('Basic Functionality', () => {
    it('should initialize and return hook interface', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        selectedSymbols: [mockSymbol]
      }));

      // Should have the expected interface
      expect(result.current.actions).toBeDefined();
      expect(result.current.executeAction).toBeDefined();
      expect(result.current.registerAction).toBeDefined();
      expect(result.current.unregisterAction).toBeDefined();
      expect(result.current.isExecuting).toBeDefined();
      expect(result.current.executingActions).toBeDefined();
      expect(result.current.refreshActions).toBeDefined();
    });

    it('should handle custom actions', () => {
      const customActions = [mockAction];

      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        customActions
      }));

      expect(result.current.actions).toBeDefined();
      expect(Array.isArray(result.current.actions)).toBe(true);
    });

    it('should handle disabled keyboard shortcuts', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        enableKeyboardShortcuts: false
      }));

      expect(result.current.actions).toBeDefined();
    });
  });

  describe('Action Retrieval', () => {
    it('should return actions based on context', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        selectedSymbols: [mockSymbol]
      }));

      expect(Array.isArray(result.current.actions)).toBe(true);
    });

    it('should return empty array when no context provided', () => {
      const { result } = renderHook(() => useContextualActions({
        context: undefined
      }));

      expect(result.current.actions).toEqual([]);
    });

    it('should handle category filtering', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        categories: ['navigation']
      }));

      expect(Array.isArray(result.current.actions)).toBe(true);
    });

    it('should handle action limiting', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        maxActions: 3
      }));

      expect(Array.isArray(result.current.actions)).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should provide execution interface', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext
      }));

      expect(result.current.isExecuting('test-action')).toBe(false);
      expect(typeof result.current.executeAction).toBe('function');
      expect(result.current.executingActions).toBeInstanceOf(Set);
    });

    it('should handle action execution', async () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext,
        customActions: [mockAction]
      }));

      let actionResult;
      await act(async () => {
        actionResult = await result.current.executeAction('test-action');
      });

      expect(actionResult).toBeDefined();
      expect(typeof actionResult.success).toBe('boolean');
    });

    it('should return error when no context available', async () => {
      const { result } = renderHook(() => useContextualActions({
        context: undefined
      }));

      let actionResult;
      await act(async () => {
        actionResult = await result.current.executeAction('test-action');
      });

      expect(actionResult.success).toBe(false);
      expect(actionResult.message).toContain('No navigation context available');
    });
  });

  describe('Action Management', () => {
    it('should provide registration interface', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext
      }));

      expect(typeof result.current.registerAction).toBe('function');
      expect(typeof result.current.unregisterAction).toBe('function');
      expect(typeof result.current.refreshActions).toBe('function');
    });

    it('should handle action registration', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext
      }));

      const newAction = { ...mockAction, id: 'new-action' };
      
      act(() => {
        result.current.registerAction(newAction);
      });

      // Should not throw error
      expect(result.current.actions).toBeDefined();
    });

    it('should handle action unregistration', () => {
      const { result } = renderHook(() => useContextualActions({
        context: mockContext
      }));

      act(() => {
        result.current.unregisterAction('test-action');
      });

      // Should not throw error
      expect(result.current.actions).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    it('should handle keyboard shortcuts configuration', () => {
      const { result: enabledResult } = renderHook(() => useContextualActions({
        context: mockContext,
        enableKeyboardShortcuts: true
      }));

      const { result: disabledResult } = renderHook(() => useContextualActions({
        context: mockContext,
        enableKeyboardShortcuts: false
      }));

      expect(enabledResult.current.actions).toBeDefined();
      expect(disabledResult.current.actions).toBeDefined();
    });

    it('should handle context changes', () => {
      const { result, rerender } = renderHook(
        ({ context }) => useContextualActions({ context }),
        { initialProps: { context: mockContext } }
      );

      expect(result.current.actions).toBeDefined();

      const newContext = { ...mockContext, projectPath: '/new/project' };
      rerender({ context: newContext });

      expect(result.current.actions).toBeDefined();
    });

    it('should handle symbol changes', () => {
      const { result, rerender } = renderHook(
        ({ selectedSymbols }) => useContextualActions({ 
          context: mockContext, 
          selectedSymbols 
        }),
        { initialProps: { selectedSymbols: [mockSymbol] } }
      );

      expect(result.current.actions).toBeDefined();

      const newSymbol: Symbol = { ...mockSymbol, identifier: 'newFunction' };
      rerender({ selectedSymbols: [newSymbol] });

      expect(result.current.actions).toBeDefined();
    });
  });
});