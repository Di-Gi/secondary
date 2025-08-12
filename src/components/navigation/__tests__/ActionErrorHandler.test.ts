// Action Error Handler Tests
// Purpose: Tests for error handling, recovery strategies, and user feedback
// Architecture: Unit and integration tests for error management system

import { ActionErrorHandler, createActionError, actionErrorHandler } from '../actions/ActionErrorHandler';
import { ContextualAction, NavigationContext } from '../../../types/navigation';

// Mock action for testing
const mockAction: ContextualAction = {
  id: 'test-action',
  label: 'Test Action',
  description: 'Test action for error handling',
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

// Mock navigation context
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

describe('ActionErrorHandler', () => {
  let errorHandler: ActionErrorHandler;

  beforeEach(() => {
    errorHandler = new ActionErrorHandler();
  });

  describe('Error Categorization', () => {
    it('should categorize permission errors correctly', async () => {
      const error = new Error('Permission denied');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('permission');
      expect(result.data?.error.category).toBe('PERMISSION_DENIED');
    });

    it('should categorize file not found errors correctly', async () => {
      const error = new Error('File not found: /test/missing.ts');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('file could not be found');
      expect(result.data?.error.category).toBe('FILE_NOT_FOUND');
    });

    it('should categorize symbol not found errors correctly', async () => {
      const error = new Error('Symbol not found: TestClass');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('symbol could not be found');
      expect(result.data?.error.category).toBe('SYMBOL_NOT_FOUND');
    });

    it('should categorize network errors correctly', async () => {
      const error = new Error('Network connection failed');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('network error');
      expect(result.data?.error.category).toBe('NETWORK_ERROR');
    });

    it('should categorize timeout errors correctly', async () => {
      const error = new Error('Operation timed out');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('took too long');
      expect(result.data?.error.category).toBe('TIMEOUT');
    });

    it('should categorize cancelled errors correctly', async () => {
      const error = new Error('Operation was cancelled');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cancelled');
      expect(result.data?.error.category).toBe('CANCELLED');
    });

    it('should categorize unknown errors correctly', async () => {
      const error = new Error('Some unexpected error');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.data?.error.category).toBe('EXECUTION_FAILED');
    });
  });

  describe('Recovery Strategies', () => {
    it('should attempt recovery for recoverable errors', async () => {
      const error = new Error('Network connection failed');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.data?.canRetry).toBe(true);
      expect(result.data?.suggestedActions).toContain('Check your internet connection');
    });

    it('should not attempt recovery for non-recoverable errors', async () => {
      const error = new Error('Permission denied');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.data?.canRetry).toBe(false);
      expect(result.data?.suggestedActions).toContain('Check file permissions');
    });

    it('should provide appropriate suggestions for file not found errors', async () => {
      const error = new Error('File not found');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.data?.suggestedActions).toContain('Check if the file was moved or renamed');
      expect(result.data?.suggestedActions).toContain('Refresh the file tree');
    });

    it('should provide appropriate suggestions for symbol not found errors', async () => {
      const error = new Error('Symbol not found');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.data?.suggestedActions).toContain('Refresh symbol analysis');
      expect(result.data?.suggestedActions).toContain('Check if the symbol was renamed');
    });
  });

  describe('Error History', () => {
    it('should record errors in history', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error, mockAction, mockContext);

      const history = errorHandler.getErrorHistory(mockAction.id);
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test error');
      expect(history[0].action?.id).toBe(mockAction.id);
    });

    it('should limit error history per action', async () => {
      // Add more than 10 errors
      for (let i = 0; i < 15; i++) {
        const error = new Error(`Test error ${i}`);
        await errorHandler.handleError(error, mockAction, mockContext);
      }

      const history = errorHandler.getErrorHistory(mockAction.id);
      expect(history).toHaveLength(10);
      expect(history[0].message).toBe('Test error 5'); // Should keep last 10
      expect(history[9].message).toBe('Test error 14');
    });

    it('should provide error statistics', async () => {
      // Add various types of errors
      await errorHandler.handleError(new Error('Permission denied'), mockAction, mockContext);
      await errorHandler.handleError(new Error('File not found'), mockAction, mockContext);
      await errorHandler.handleError(new Error('Network error'), mockAction, mockContext);

      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory.PERMISSION_DENIED).toBe(1);
      expect(stats.errorsByCategory.FILE_NOT_FOUND).toBe(1);
      expect(stats.errorsByCategory.NETWORK_ERROR).toBe(1);
      expect(stats.mostProblematicActions[0].actionId).toBe(mockAction.id);
      expect(stats.mostProblematicActions[0].errorCount).toBe(3);
    });

    it('should clear error history', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error, mockAction, mockContext);

      expect(errorHandler.getErrorHistory(mockAction.id)).toHaveLength(1);

      errorHandler.clearErrorHistory(mockAction.id);
      expect(errorHandler.getErrorHistory(mockAction.id)).toHaveLength(0);
    });

    it('should clear all error history', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error, mockAction, mockContext);

      const anotherAction = { ...mockAction, id: 'another-action' };
      await errorHandler.handleError(error, anotherAction, mockContext);

      errorHandler.clearErrorHistory();
      expect(errorHandler.getErrorHistory(mockAction.id)).toHaveLength(0);
      expect(errorHandler.getErrorHistory(anotherAction.id)).toHaveLength(0);
    });
  });

  describe('Custom Recovery Strategies', () => {
    it('should allow registering custom recovery strategies', async () => {
      const customStrategy = {
        canRecover: () => true,
        recover: async () => ({ success: true, message: 'Custom recovery successful' }),
        description: 'Custom recovery strategy'
      };

      errorHandler.registerRecoveryStrategy('EXECUTION_FAILED', customStrategy);

      const error = new Error('Some execution error');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Custom recovery successful');
    });

    it('should handle recovery strategy failures gracefully', async () => {
      const failingStrategy = {
        canRecover: () => true,
        recover: async () => {
          throw new Error('Recovery failed');
        },
        description: 'Failing recovery strategy'
      };

      errorHandler.registerRecoveryStrategy('EXECUTION_FAILED', failingStrategy);

      const error = new Error('Some execution error');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('action failed to execute');
    });
  });

  describe('createActionError utility', () => {
    it('should create ActionError with correct properties', () => {
      const error = createActionError(
        'Test error message',
        'FILE_NOT_FOUND',
        true,
        mockContext,
        mockAction
      );

      expect(error.name).toBe('ActionError');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.category).toBe('FILE_NOT_FOUND');
      expect(error.recoverable).toBe(true);
      expect(error.context).toBe(mockContext);
      expect(error.action).toBe(mockAction);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create ActionError with default values', () => {
      const error = createActionError('Test error', 'UNKNOWN');

      expect(error.recoverable).toBe(true);
      expect(error.context).toBeUndefined();
      expect(error.action).toBeUndefined();
    });
  });

  describe('Global Error Handler', () => {
    it('should provide global error handler instance', () => {
      expect(actionErrorHandler).toBeInstanceOf(ActionErrorHandler);
    });

    it('should maintain state across calls', async () => {
      const error = new Error('Global test error');
      await actionErrorHandler.handleError(error, mockAction, mockContext);

      const history = actionErrorHandler.getErrorHistory(mockAction.id);
      expect(history).toHaveLength(1);
    });
  });

  describe('Error Message Generation', () => {
    it('should generate user-friendly messages', async () => {
      const testCases = [
        { error: 'Permission denied', expectedMessage: 'permission' },
        { error: 'File not found', expectedMessage: 'file could not be found' },
        { error: 'Symbol not found', expectedMessage: 'symbol could not be found' },
        { error: 'Network error', expectedMessage: 'network error' },
        { error: 'Timeout', expectedMessage: 'took too long' },
        { error: 'Cancelled', expectedMessage: 'cancelled' }
      ];

      for (const testCase of testCases) {
        const error = new Error(testCase.error);
        const result = await errorHandler.handleError(error, mockAction, mockContext);
        
        expect(result.message.toLowerCase()).toContain(testCase.expectedMessage);
      }
    });

    it('should include specific error details when available', async () => {
      const error = new Error('File not found: /specific/path/file.ts');
      const result = await errorHandler.handleError(error, mockAction, mockContext);

      expect(result.message).toContain('Details:');
      expect(result.message).toContain('/specific/path/file.ts');
    });
  });

  describe('Performance', () => {
    it('should handle error processing efficiently', async () => {
      const startTime = performance.now();
      
      // Process multiple errors
      const promises = Array.from({ length: 100 }, (_, i) => {
        const error = new Error(`Error ${i}`);
        return errorHandler.handleError(error, mockAction, mockContext);
      });

      await Promise.all(promises);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 100 errors in less than 100ms
      expect(processingTime).toBeLessThan(100);
    });

    it('should not leak memory with large error histories', async () => {
      // Add many errors to test memory management
      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Error ${i}`);
        await errorHandler.handleError(error, mockAction, mockContext);
      }

      const history = errorHandler.getErrorHistory(mockAction.id);
      expect(history).toHaveLength(10); // Should be limited to 10
    });
  });
});