// Context-Specific Actions Tests
// Purpose: Test function-specific, class-specific, and batch actions
// Architecture: Comprehensive test coverage for all context-specific action types

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { actionRegistry } from '../actions/ActionRegistry';
import { functionActions, classActions, batchActions } from '../actions/DefaultActions';
import { NavigationContext, ActionResult } from '../../../types/navigation';
import { Symbol } from '../../../api';
import * as api from '../../../api';

// Mock the API
vi.mock('../../../api', () => ({
  api: {
    analyzeCallHierarchy: vi.fn(),
    findFunctionCallers: vi.fn(),
    analyzeFunctionComplexity: vi.fn(),
    extractFunction: vi.fn(),
    analyzeInheritanceHierarchy: vi.fn(),
    getClassMembers: vi.fn(),
    findImplementations: vi.fn(),
    generateClassDiagram: vi.fn(),
    extractInterface: vi.fn(),
    searchSymbols: vi.fn(),
    synthesizeGuidance: vi.fn(),
  }
}));

describe('Context-Specific Actions', () => {
  let mockContext: NavigationContext;
  let mockFunctionSymbol: Symbol;
  let mockClassSymbol: Symbol;
  let mockInterfaceSymbol: Symbol;

  beforeEach(() => {
    // Clear registry and register actions
    actionRegistry.clear();
    actionRegistry.registerActions([...functionActions, ...classActions, ...batchActions]);

    // Setup mock symbols
    mockFunctionSymbol = {
      identifier: 'testFunction',
      kind: 'TSFunction',
      location: { path: '/src/test.ts', line: 10, column: 1 }
    };

    mockClassSymbol = {
      identifier: 'TestClass',
      kind: 'TSClass',
      location: { path: '/src/TestClass.ts', line: 5, column: 1 }
    };

    mockInterfaceSymbol = {
      identifier: 'ITestInterface',
      kind: 'TSInterface',
      location: { path: '/src/interfaces.ts', line: 15, column: 1 }
    };

    // Setup mock context
    mockContext = {
      projectPath: '/test/project',
      breadcrumbs: [
        { id: '1', name: 'test.ts', path: '/src/test.ts', type: 'file', isActive: true, isClickable: true, metadata: { fullPath: '/src/test.ts', tooltip: 'test.ts' }, actions: [] }
      ],
      relatedSymbols: [mockFunctionSymbol],
      fileContent: 'function testFunction() { return true; }'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Function-Specific Actions', () => {
    describe('show-call-hierarchy', () => {
      it('should be available for function symbols', () => {
        const actions = actionRegistry.getContextualActions(mockContext, [mockFunctionSymbol]);
        const callHierarchyAction = actions.find(a => a.id === 'show-call-hierarchy');
        
        expect(callHierarchyAction).toBeDefined();
        expect(callHierarchyAction?.label).toBe('Show Call Hierarchy');
      });

      it('should not be available for non-function symbols', () => {
        const contextWithClass = { ...mockContext, relatedSymbols: [mockClassSymbol] };
        const actions = actionRegistry.getContextualActions(contextWithClass, [mockClassSymbol]);
        const callHierarchyAction = actions.find(a => a.id === 'show-call-hierarchy');
        
        expect(callHierarchyAction).toBeUndefined();
      });

      it('should execute call hierarchy analysis', async () => {
        const mockHierarchy = {
          function: mockFunctionSymbol,
          callers: [{ identifier: 'caller1', kind: 'TSFunction', callCount: 2 }],
          callees: [{ identifier: 'callee1', kind: 'TSFunction', callCount: 1 }]
        };

        vi.mocked(api.api.analyzeCallHierarchy).mockResolvedValue(mockHierarchy);

        const result = await actionRegistry.executeAction('show-call-hierarchy', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Call hierarchy generated for testFunction');
        expect(result.data).toEqual({ callHierarchy: mockHierarchy });
        expect(api.api.analyzeCallHierarchy).toHaveBeenCalledWith('testFunction');
      });

      it('should handle call hierarchy analysis errors', async () => {
        vi.mocked(api.api.analyzeCallHierarchy).mockRejectedValue(new Error('Analysis failed'));

        const result = await actionRegistry.executeAction('show-call-hierarchy', mockContext);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to generate call hierarchy');
      });
    });

    describe('find-function-callers', () => {
      it('should execute caller search', async () => {
        const mockCallers = [
          { identifier: 'caller1', kind: 'TSFunction', location: { path: '/src/caller.ts', line: 5, column: 1 }, callCount: 2 }
        ];

        vi.mocked(api.api.findFunctionCallers).mockResolvedValue(mockCallers);

        const result = await actionRegistry.executeAction('find-function-callers', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Found 1 callers for testFunction');
        expect(result.data).toEqual({ callers: mockCallers });
      });
    });

    describe('analyze-function-complexity', () => {
      it('should analyze function complexity', async () => {
        const mockComplexity = {
          function: mockFunctionSymbol,
          cyclomaticComplexity: 5,
          cognitiveComplexity: 8,
          linesOfCode: 25,
          complexity: 'low'
        };

        vi.mocked(api.api.analyzeFunctionComplexity).mockResolvedValue(mockComplexity);

        const result = await actionRegistry.executeAction('analyze-function-complexity', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Complexity analysis complete for testFunction');
        expect(result.data).toEqual({ complexity: mockComplexity });
      });

      it('should support batch execution', () => {
        const action = actionRegistry.getAction('analyze-function-complexity');
        expect(action?.metadata.canBatch).toBe(true);
      });
    });

    describe('extract-function', () => {
      it('should require file content for extraction', () => {
        const contextWithoutContent = { ...mockContext, fileContent: undefined };
        const actions = actionRegistry.getContextualActions(contextWithoutContent, [mockFunctionSymbol]);
        const extractAction = actions.find(a => a.id === 'extract-function');
        
        expect(extractAction).toBeUndefined();
      });

      it('should execute function extraction', async () => {
        const mockExtractResult = {
          success: true,
          newFunctionName: 'extractedFunction',
          newFunctionLocation: { path: '/src/test.ts', line: 50, column: 1 }
        };

        vi.mocked(api.api.extractFunction).mockResolvedValue(mockExtractResult);

        const result = await actionRegistry.executeAction('extract-function', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Function extracted successfully');
        expect(api.api.extractFunction).toHaveBeenCalledWith('/test/project', {
          filePath: '/src/test.ts',
          selectedCode: 'function testFunction() { return true; }'
        });
      });

      it('should require confirmation', () => {
        const action = actionRegistry.getAction('extract-function');
        expect(action?.metadata.requiresConfirmation).toBe(true);
        expect(action?.metadata.undoable).toBe(true);
      });
    });
  });

  describe('Class-Specific Actions', () => {
    beforeEach(() => {
      mockContext.relatedSymbols = [mockClassSymbol];
    });

    describe('show-inheritance-hierarchy', () => {
      it('should be available for class symbols', () => {
        const actions = actionRegistry.getContextualActions(mockContext, [mockClassSymbol]);
        const inheritanceAction = actions.find(a => a.id === 'show-inheritance-hierarchy');
        
        expect(inheritanceAction).toBeDefined();
        expect(inheritanceAction?.label).toBe('Show Inheritance');
      });

      it('should execute inheritance analysis', async () => {
        const mockInheritance = {
          class: mockClassSymbol,
          parents: [{ identifier: 'BaseClass', kind: 'TSClass', relationship: 'extends' }],
          children: [{ identifier: 'ChildClass', kind: 'TSClass', relationship: 'extends' }]
        };

        vi.mocked(api.api.analyzeInheritanceHierarchy).mockResolvedValue(mockInheritance);

        const result = await actionRegistry.executeAction('show-inheritance-hierarchy', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Inheritance hierarchy generated for TestClass');
        expect(result.data).toEqual({ inheritance: mockInheritance });
      });
    });

    describe('view-class-members', () => {
      it('should get class members', async () => {
        const mockMembers = [
          { identifier: 'method1', kind: 'TSFunction', accessibility: 'public' },
          { identifier: 'property1', kind: 'Property', accessibility: 'private' }
        ];

        vi.mocked(api.api.getClassMembers).mockResolvedValue(mockMembers);

        const result = await actionRegistry.executeAction('view-class-members', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Found 2 members in TestClass');
        expect(result.data).toEqual({ members: mockMembers });
      });
    });

    describe('find-implementations', () => {
      beforeEach(() => {
        mockContext.relatedSymbols = [mockInterfaceSymbol];
      });

      it('should be available for interfaces and traits', () => {
        const actions = actionRegistry.getContextualActions(mockContext, [mockInterfaceSymbol]);
        const implementationsAction = actions.find(a => a.id === 'find-implementations');
        
        expect(implementationsAction).toBeDefined();
      });

      it('should not be available for concrete classes', () => {
        const contextWithClass = { ...mockContext, relatedSymbols: [mockClassSymbol] };
        const actions = actionRegistry.getContextualActions(contextWithClass, [mockClassSymbol]);
        const implementationsAction = actions.find(a => a.id === 'find-implementations');
        
        expect(implementationsAction).toBeUndefined();
      });

      it('should find implementations', async () => {
        const mockImplementations = [
          { identifier: 'Implementation1', kind: 'TSClass', implementsInterface: 'ITestInterface' }
        ];

        vi.mocked(api.api.findImplementations).mockResolvedValue(mockImplementations);

        const result = await actionRegistry.executeAction('find-implementations', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Found 1 implementations of ITestInterface');
        expect(result.data).toEqual({ implementations: mockImplementations });
      });
    });

    describe('generate-class-diagram', () => {
      it('should generate class diagram', async () => {
        const mockDiagram = {
          diagramType: 'UML',
          format: 'mermaid',
          content: 'classDiagram\n  class TestClass',
          relatedClasses: ['BaseClass']
        };

        vi.mocked(api.api.generateClassDiagram).mockResolvedValue(mockDiagram);

        const result = await actionRegistry.executeAction('generate-class-diagram', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Class diagram generated for TestClass');
        expect(result.data).toEqual({ diagram: mockDiagram });
      });
    });

    describe('refactor-extract-interface', () => {
      it('should not be available for interfaces', () => {
        const contextWithInterface = { ...mockContext, relatedSymbols: [mockInterfaceSymbol] };
        const actions = actionRegistry.getContextualActions(contextWithInterface, [mockInterfaceSymbol]);
        const extractAction = actions.find(a => a.id === 'refactor-extract-interface');
        
        expect(extractAction).toBeUndefined();
      });

      it('should extract interface from class', async () => {
        const mockInterfaceResult = {
          success: true,
          interfaceName: 'ITestClass',
          interfaceContent: 'interface ITestClass { }',
          extractedMethods: ['method1']
        };

        vi.mocked(api.api.extractInterface).mockResolvedValue(mockInterfaceResult);

        const result = await actionRegistry.executeAction('refactor-extract-interface', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Interface extracted from TestClass');
        expect(result.data).toEqual({ interfaceResult: mockInterfaceResult });
      });

      it('should require confirmation and be undoable', () => {
        const action = actionRegistry.getAction('refactor-extract-interface');
        expect(action?.metadata.requiresConfirmation).toBe(true);
        expect(action?.metadata.undoable).toBe(true);
      });
    });
  });

  describe('Batch Actions', () => {
    beforeEach(() => {
      // Setup multiple symbols for batch operations
      mockContext.relatedSymbols = [mockFunctionSymbol, mockClassSymbol];
    });

    describe('batch-analyze-complexity', () => {
      it('should require multiple symbols', () => {
        const singleSymbolContext = { ...mockContext, relatedSymbols: [mockFunctionSymbol] };
        const actions = actionRegistry.getContextualActions(singleSymbolContext, [mockFunctionSymbol]);
        const batchAction = actions.find(a => a.id === 'batch-analyze-complexity');
        
        expect(batchAction).toBeUndefined();
      });

      it('should be available for multiple symbols', () => {
        const actions = actionRegistry.getContextualActions(mockContext, mockContext.relatedSymbols);
        const batchAction = actions.find(a => a.id === 'batch-analyze-complexity');
        
        expect(batchAction).toBeDefined();
      });

      it('should analyze complexity for all symbols', async () => {
        const mockComplexity1 = { function: mockFunctionSymbol, cyclomaticComplexity: 3 };
        const mockComplexity2 = { function: mockClassSymbol, cyclomaticComplexity: 5 };

        vi.mocked(api.api.analyzeFunctionComplexity)
          .mockResolvedValueOnce(mockComplexity1)
          .mockResolvedValueOnce(mockComplexity2);

        const result = await actionRegistry.executeAction('batch-analyze-complexity', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('2 successful, 0 failed');
        expect(api.api.analyzeFunctionComplexity).toHaveBeenCalledTimes(2);
      });

      it('should handle partial failures', async () => {
        vi.mocked(api.api.analyzeFunctionComplexity)
          .mockResolvedValueOnce({ function: mockFunctionSymbol, cyclomaticComplexity: 3 })
          .mockRejectedValueOnce(new Error('Analysis failed'));

        const result = await actionRegistry.executeAction('batch-analyze-complexity', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('1 successful, 1 failed');
        expect(result.data.successful).toHaveLength(1);
        expect(result.data.failed).toHaveLength(1);
      });

      it('should support batch execution', () => {
        const action = actionRegistry.getAction('batch-analyze-complexity');
        expect(action?.metadata.canBatch).toBe(true);
      });
    });

    describe('batch-find-references', () => {
      it('should find references for all symbols', async () => {
        const mockReferences1 = [{ symbol: mockFunctionSymbol, relevance_score: 0.9 }];
        const mockReferences2 = [{ symbol: mockClassSymbol, relevance_score: 0.8 }];

        vi.mocked(api.api.searchSymbols)
          .mockResolvedValueOnce(mockReferences1)
          .mockResolvedValueOnce(mockReferences2);

        const result = await actionRegistry.executeAction('batch-find-references', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Found 2 total references across 2 symbols');
        expect(api.api.searchSymbols).toHaveBeenCalledTimes(2);
      });
    });

    describe('batch-bookmark-symbols', () => {
      it('should require project context', () => {
        const contextWithoutProject = { ...mockContext, projectPath: '' };
        const actions = actionRegistry.getContextualActions(contextWithoutProject, mockContext.relatedSymbols);
        const bookmarkAction = actions.find(a => a.id === 'batch-bookmark-symbols');
        
        expect(bookmarkAction).toBeUndefined();
      });

      it('should bookmark all symbols', async () => {
        const result = await actionRegistry.executeAction('batch-bookmark-symbols', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Bookmarked 2 symbols');
        expect(result.data.bookmarked).toHaveLength(2);
      });

      it('should be undoable', () => {
        const action = actionRegistry.getAction('batch-bookmark-symbols');
        expect(action?.metadata.undoable).toBe(true);
      });
    });

    describe('batch-ai-explain', () => {
      it('should limit to 5 symbols', () => {
        const manySymbols = Array(6).fill(null).map((_, i) => ({
          identifier: `symbol${i}`,
          kind: 'TSFunction' as const,
          location: { path: '/src/test.ts', line: i, column: 1 }
        }));
        const contextWithManySymbols = { ...mockContext, relatedSymbols: manySymbols };
        
        const actions = actionRegistry.getContextualActions(contextWithManySymbols, manySymbols);
        const aiAction = actions.find(a => a.id === 'batch-ai-explain');
        
        expect(aiAction).toBeUndefined();
      });

      it('should get AI explanations for all symbols', async () => {
        vi.mocked(api.api.synthesizeGuidance)
          .mockResolvedValueOnce('Explanation for testFunction')
          .mockResolvedValueOnce('Explanation for TestClass');

        const result = await actionRegistry.executeAction('batch-ai-explain', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('AI explanations generated for 2 symbols');
        expect(api.api.synthesizeGuidance).toHaveBeenCalledTimes(2);
      });

      it('should require confirmation', () => {
        const action = actionRegistry.getAction('batch-ai-explain');
        expect(action?.metadata.requiresConfirmation).toBe(true);
      });
    });

    describe('batch-export-symbols', () => {
      it('should export symbol data', async () => {
        const result = await actionRegistry.executeAction('batch-export-symbols', mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Exported data for 2 symbols');
        expect(result.data.symbolCount).toBe(2);
        expect(result.data.exportData).toContain('testFunction');
        expect(result.data.exportData).toContain('TestClass');
      });

      it('should not be async', () => {
        const action = actionRegistry.getAction('batch-export-symbols');
        expect(action?.metadata.isAsync).toBe(false);
      });
    });
  });

  describe('Action Metadata', () => {
    it('should have correct priorities for function actions', () => {
      const callHierarchyAction = actionRegistry.getAction('show-call-hierarchy');
      const findCallersAction = actionRegistry.getAction('find-function-callers');
      const complexityAction = actionRegistry.getAction('analyze-function-complexity');

      expect(callHierarchyAction?.metadata.priority).toBe(8);
      expect(findCallersAction?.metadata.priority).toBe(7);
      expect(complexityAction?.metadata.priority).toBe(6);
    });

    it('should have correct priorities for class actions', () => {
      const inheritanceAction = actionRegistry.getAction('show-inheritance-hierarchy');
      const membersAction = actionRegistry.getAction('view-class-members');
      const implementationsAction = actionRegistry.getAction('find-implementations');

      expect(inheritanceAction?.metadata.priority).toBe(9);
      expect(membersAction?.metadata.priority).toBe(8);
      expect(implementationsAction?.metadata.priority).toBe(7);
    });

    it('should have appropriate estimated durations', () => {
      const quickAction = actionRegistry.getAction('analyze-function-complexity');
      const slowAction = actionRegistry.getAction('generate-class-diagram');
      const batchAction = actionRegistry.getAction('batch-ai-explain');

      expect(quickAction?.metadata.estimatedDuration).toBe(500);
      expect(slowAction?.metadata.estimatedDuration).toBe(2000);
      expect(batchAction?.metadata.estimatedDuration).toBe(8000);
    });

    it('should mark refactoring actions as requiring confirmation', () => {
      const extractFunctionAction = actionRegistry.getAction('extract-function');
      const extractInterfaceAction = actionRegistry.getAction('refactor-extract-interface');

      expect(extractFunctionAction?.metadata.requiresConfirmation).toBe(true);
      expect(extractInterfaceAction?.metadata.requiresConfirmation).toBe(true);
    });

    it('should mark appropriate actions as undoable', () => {
      const extractFunctionAction = actionRegistry.getAction('extract-function');
      const bookmarkAction = actionRegistry.getAction('batch-bookmark-symbols');
      const analysisAction = actionRegistry.getAction('analyze-function-complexity');

      expect(extractFunctionAction?.metadata.undoable).toBe(true);
      expect(bookmarkAction?.metadata.undoable).toBe(true);
      expect(analysisAction?.metadata.undoable).toBe(false);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should have unique keyboard shortcuts', () => {
      const actions = actionRegistry.getAllActions().filter(a => a.shortcut);
      const shortcuts = actions.map(a => `${a.shortcut!.modifiers.join('+')}+${a.shortcut!.key}`);
      const uniqueShortcuts = new Set(shortcuts);

      expect(shortcuts.length).toBe(uniqueShortcuts.size);
    });

    it('should have descriptive shortcut descriptions', () => {
      const actionsWithShortcuts = actionRegistry.getAllActions().filter(a => a.shortcut);
      
      actionsWithShortcuts.forEach(action => {
        expect(action.shortcut!.description).toBeTruthy();
        expect(action.shortcut!.description.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing symbols gracefully', async () => {
      const contextWithoutSymbols = { ...mockContext, relatedSymbols: [] };
      
      const result = await actionRegistry.executeAction('show-call-hierarchy', contextWithoutSymbols);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No function selected');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.api.analyzeCallHierarchy).mockRejectedValue(new Error('Network error'));

      const result = await actionRegistry.executeAction('show-call-hierarchy', mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to generate call hierarchy');
    });

    it('should handle batch operation failures', async () => {
      vi.mocked(api.api.analyzeFunctionComplexity).mockRejectedValue(new Error('Analysis failed'));

      // Use context with multiple symbols for batch operation
      const batchContext = { ...mockContext, relatedSymbols: [mockFunctionSymbol, mockClassSymbol] };
      
      const result = await actionRegistry.executeAction('batch-analyze-complexity', batchContext);

      expect(result.success).toBe(true); // Batch operations should succeed even with partial failures
      expect(result.data.failed).toHaveLength(2);
      expect(result.data.successful).toHaveLength(0);
      expect(result.message).toContain('0 successful, 2 failed');
    });
  });
});