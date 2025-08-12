// Default Contextual Actions
// Purpose: Provides built-in navigation and analysis actions
// Architecture: Defines standard actions that work with existing Symbol types and navigation patterns

import { ContextualAction, NavigationContext, ActionResult } from '../../../types/navigation';
import { api } from '../../../api';

// Navigation Actions
export const navigationActions: ContextualAction[] = [
  {
    id: 'go-to-definition',
    label: 'Go to Definition',
    description: 'Navigate to the definition of the selected symbol',
    icon: '🎯',
    category: 'navigation',
    shortcut: {
      key: 'F12',
      modifiers: [],
      description: 'Go to Definition'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'TSClass', 'TSInterface', 'Function', 'Struct', 'Enum', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      // In a real implementation, this would use language server protocol
      // For now, we'll simulate navigation to the symbol's location
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No symbol selected' };
      }

      return {
        success: true,
        message: `Navigating to definition of ${selectedSymbol.identifier}`,
        navigationTarget: {
          id: `def-${selectedSymbol.identifier}`,
          filePath: selectedSymbol.location.path,
          position: {
            line: selectedSymbol.location.line,
            column: selectedSymbol.location.column
          },
          symbol: selectedSymbol,
          context,
          timestamp: new Date(),
          metadata: {
            title: `Definition: ${selectedSymbol.identifier}`,
            description: `${selectedSymbol.kind} definition`,
            tags: ['definition', 'navigation'],
            timeSpent: 0,
            visitCount: 1,
            lastAccessed: new Date(),
            isBookmarked: false,
            isFavorite: false
          }
        }
      };
    },
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
    id: 'find-references',
    label: 'Find References',
    description: 'Find all references to the selected symbol',
    icon: '🔍',
    category: 'search',
    shortcut: {
      key: 'F12',
      modifiers: ['shift'],
      description: 'Find References'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'TSClass', 'TSInterface', 'Function', 'Struct', 'Enum', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No symbol selected' };
      }

      try {
        // Use existing search API to find references
        const searchResults = await api.searchSymbols({
          query: selectedSymbol.identifier,
          filters: {
            symbol_types: [selectedSymbol.kind],
            file_patterns: [],
            scope: { type: 'Global' }
          }
        });

        return {
          success: true,
          message: `Found ${searchResults.length} references to ${selectedSymbol.identifier}`,
          data: { references: searchResults }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to find references: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 9,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 500,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'go-back',
    label: 'Go Back',
    description: 'Navigate to the previous location',
    icon: '⬅️',
    category: 'navigation',
    shortcut: {
      key: 'ArrowLeft',
      modifiers: ['alt'],
      description: 'Go Back'
    },
    condition: {
      customCondition: (context: NavigationContext) => {
        // Check if there's navigation history available
        return context.breadcrumbs.length > 1;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      // Simulate going back in navigation history
      return {
        success: true,
        message: 'Navigated back',
        data: { action: 'back' }
      };
    },
    metadata: {
      priority: 8,
      isAsync: false,
      canBatch: false,
      estimatedDuration: 50,
      requiresConfirmation: false,
      undoable: true
    }
  },

  {
    id: 'go-forward',
    label: 'Go Forward',
    description: 'Navigate to the next location',
    icon: '➡️',
    category: 'navigation',
    shortcut: {
      key: 'ArrowRight',
      modifiers: ['alt'],
      description: 'Go Forward'
    },
    condition: {
      customCondition: (context: NavigationContext) => {
        // In a real implementation, this would check forward history
        return true;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      return {
        success: true,
        message: 'Navigated forward',
        data: { action: 'forward' }
      };
    },
    metadata: {
      priority: 7,
      isAsync: false,
      canBatch: false,
      estimatedDuration: 50,
      requiresConfirmation: false,
      undoable: true
    }
  }
];

// Analysis Actions
export const analysisActions: ContextualAction[] = [
  {
    id: 'analyze-symbol-relationships',
    label: 'Show Relationships',
    description: 'Analyze and display symbol relationships',
    icon: '🕸️',
    category: 'analysis',
    shortcut: {
      key: 'r',
      modifiers: ['ctrl', 'shift'],
      description: 'Show Symbol Relationships'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'TSClass', 'TSInterface', 'Function', 'Struct', 'Enum', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No symbol selected' };
      }

      try {
        const relationships = await api.analyzeSymbolRelationships(selectedSymbol.identifier);
        return {
          success: true,
          message: `Analyzed relationships for ${selectedSymbol.identifier}`,
          data: { relationships }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to analyze relationships: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 6,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 800,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'analyze-symbol-usage',
    label: 'Usage Analysis',
    description: 'Analyze how the symbol is used throughout the codebase',
    icon: '📊',
    category: 'analysis',
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'TSClass', 'TSInterface', 'Function', 'Struct', 'Enum', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No symbol selected' };
      }

      try {
        const usage = await api.analyzeSymbolUsage(selectedSymbol.identifier);
        return {
          success: true,
          message: `Usage analysis complete for ${selectedSymbol.identifier}`,
          data: { usage }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to analyze usage: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 5,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 600,
      requiresConfirmation: false,
      undoable: false
    }
  }
];

// Bookmark Actions
export const bookmarkActions: ContextualAction[] = [
  {
    id: 'bookmark-location',
    label: 'Bookmark',
    description: 'Bookmark the current location',
    icon: '🔖',
    category: 'bookmark',
    shortcut: {
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Bookmark Location'
    },
    condition: {
      requiresProject: true
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      // In a real implementation, this would save to bookmarks
      const currentFile = context.breadcrumbs.find(b => b.type === 'file');
      const locationName = currentFile ? currentFile.name : 'Unknown Location';

      return {
        success: true,
        message: `Bookmarked ${locationName}`,
        data: { bookmarked: true, location: locationName }
      };
    },
    metadata: {
      priority: 4,
      isAsync: false,
      canBatch: false,
      estimatedDuration: 100,
      requiresConfirmation: false,
      undoable: true
    }
  },

  {
    id: 'remove-bookmark',
    label: 'Remove Bookmark',
    description: 'Remove bookmark from the current location',
    icon: '🚫',
    category: 'bookmark',
    condition: {
      requiresProject: true,
      customCondition: (context: NavigationContext) => {
        // In a real implementation, check if current location is bookmarked
        return true;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const currentFile = context.breadcrumbs.find(b => b.type === 'file');
      const locationName = currentFile ? currentFile.name : 'Unknown Location';

      return {
        success: true,
        message: `Removed bookmark from ${locationName}`,
        data: { bookmarked: false, location: locationName }
      };
    },
    metadata: {
      priority: 3,
      isAsync: false,
      canBatch: false,
      estimatedDuration: 100,
      requiresConfirmation: false,
      undoable: true
    }
  }
];

// Session Actions
export const sessionActions: ContextualAction[] = [
  {
    id: 'save-session',
    label: 'Save Session',
    description: 'Save the current navigation session',
    icon: '💾',
    category: 'session',
    shortcut: {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Save Navigation Session'
    },
    condition: {
      requiresProject: true
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      try {
        // Use existing session API
        await api.saveNavigationSession(context.projectPath, {
          name: `Session ${new Date().toLocaleString()}`,
          context,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: 'Navigation session saved'
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 2,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 300,
      requiresConfirmation: false,
      undoable: false
    }
  }
];

// AI Actions
export const aiActions: ContextualAction[] = [
  {
    id: 'ai-explain-symbol',
    label: 'AI Explain',
    description: 'Get AI explanation of the selected symbol',
    icon: '🤖',
    category: 'ai',
    shortcut: {
      key: 'e',
      modifiers: ['ctrl', 'shift'],
      description: 'AI Explain Symbol'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'TSClass', 'TSInterface', 'Function', 'Struct', 'Enum', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No symbol selected' };
      }

      try {
        const explanation = await api.synthesizeGuidance(
          `Explain the purpose and usage of ${selectedSymbol.kind} ${selectedSymbol.identifier}`
        );

        return {
          success: true,
          message: `AI explanation generated for ${selectedSymbol.identifier}`,
          data: { explanation }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get AI explanation: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 1,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 2000,
      requiresConfirmation: false,
      undoable: false
    }
  }
];

// Function-specific Actions
export const functionActions: ContextualAction[] = [
  {
    id: 'show-call-hierarchy',
    label: 'Show Call Hierarchy',
    description: 'Display the call hierarchy for the selected function',
    icon: '🌳',
    category: 'analysis',
    shortcut: {
      key: 'h',
      modifiers: ['ctrl', 'shift'],
      description: 'Show Call Hierarchy'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'Function']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No function selected' };
      }

      try {
        // Simulate call hierarchy analysis
        const callHierarchy = await api.analyzeCallHierarchy(selectedSymbol.identifier);
        return {
          success: true,
          message: `Call hierarchy generated for ${selectedSymbol.identifier}`,
          data: { callHierarchy }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to generate call hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 8,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 1000,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'find-function-callers',
    label: 'Find Callers',
    description: 'Find all functions that call this function',
    icon: '📞',
    category: 'search',
    shortcut: {
      key: 'c',
      modifiers: ['ctrl', 'shift'],
      description: 'Find Function Callers'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'Function']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No function selected' };
      }

      try {
        const callers = await api.findFunctionCallers(selectedSymbol.identifier);
        return {
          success: true,
          message: `Found ${callers.length} callers for ${selectedSymbol.identifier}`,
          data: { callers }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to find callers: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 7,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 800,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'analyze-function-complexity',
    label: 'Analyze Complexity',
    description: 'Analyze the complexity metrics of the selected function',
    icon: '📈',
    category: 'analysis',
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'Function']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No function selected' };
      }

      try {
        const complexity = await api.analyzeFunctionComplexity(selectedSymbol.identifier);
        return {
          success: true,
          message: `Complexity analysis complete for ${selectedSymbol.identifier}`,
          data: { complexity }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to analyze complexity: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 6,
      isAsync: true,
      canBatch: true,
      estimatedDuration: 500,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'extract-function',
    label: 'Extract Function',
    description: 'Extract selected code into a new function',
    icon: '✂️',
    category: 'refactor',
    shortcut: {
      key: 'm',
      modifiers: ['ctrl', 'shift'],
      description: 'Extract Function'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSFunction', 'Function'],
      customCondition: (context: NavigationContext) => {
        // Check if there's selected text/code to extract
        return context.fileContent !== undefined;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      try {
        const extractResult = await api.extractFunction(context.projectPath, {
          filePath: context.breadcrumbs.find(b => b.type === 'file')?.path || '',
          selectedCode: context.fileContent || ''
        });

        return {
          success: true,
          message: 'Function extracted successfully',
          data: { extractResult }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to extract function: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 5,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 1500,
      requiresConfirmation: true,
      undoable: true
    }
  }
];

// Class-specific Actions
export const classActions: ContextualAction[] = [
  {
    id: 'show-inheritance-hierarchy',
    label: 'Show Inheritance',
    description: 'Display the inheritance hierarchy for the selected class',
    icon: '🏗️',
    category: 'analysis',
    shortcut: {
      key: 'i',
      modifiers: ['ctrl', 'shift'],
      description: 'Show Inheritance Hierarchy'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSClass', 'TSInterface', 'Struct', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No class selected' };
      }

      try {
        const inheritance = await api.analyzeInheritanceHierarchy(selectedSymbol.identifier);
        return {
          success: true,
          message: `Inheritance hierarchy generated for ${selectedSymbol.identifier}`,
          data: { inheritance }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to generate inheritance hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 9,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 1200,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'view-class-members',
    label: 'View Members',
    description: 'Show all members (methods, properties) of the selected class',
    icon: '📋',
    category: 'analysis',
    shortcut: {
      key: 'm',
      modifiers: ['ctrl', 'alt'],
      description: 'View Class Members'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSClass', 'TSInterface', 'Struct', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No class selected' };
      }

      try {
        const members = await api.getClassMembers(selectedSymbol.identifier);
        return {
          success: true,
          message: `Found ${members.length} members in ${selectedSymbol.identifier}`,
          data: { members }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get class members: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 8,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 600,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'find-implementations',
    label: 'Find Implementations',
    description: 'Find all implementations of the selected interface or abstract class',
    icon: '🔍',
    category: 'search',
    shortcut: {
      key: 'F12',
      modifiers: ['ctrl'],
      description: 'Find Implementations'
    },
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSInterface', 'TSClass', 'Trait'],
      customCondition: (context: NavigationContext) => {
        const symbol = context.relatedSymbols[0];
        // Check if it's an interface or abstract class
        return symbol && (symbol.kind === 'TSInterface' || symbol.kind === 'Trait');
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No interface or trait selected' };
      }

      try {
        const implementations = await api.findImplementations(selectedSymbol.identifier);
        return {
          success: true,
          message: `Found ${implementations.length} implementations of ${selectedSymbol.identifier}`,
          data: { implementations }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to find implementations: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 7,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 1000,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'generate-class-diagram',
    label: 'Generate Diagram',
    description: 'Generate a UML class diagram for the selected class and its relationships',
    icon: '📊',
    category: 'analysis',
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSClass', 'TSInterface', 'Struct', 'Trait']
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No class selected' };
      }

      try {
        const diagram = await api.generateClassDiagram(selectedSymbol.identifier);
        return {
          success: true,
          message: `Class diagram generated for ${selectedSymbol.identifier}`,
          data: { diagram }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to generate class diagram: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 6,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 2000,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'refactor-extract-interface',
    label: 'Extract Interface',
    description: 'Extract an interface from the selected class',
    icon: '🔧',
    category: 'refactor',
    condition: {
      requiresSelection: true,
      symbolTypes: ['TSClass', 'Struct'],
      customCondition: (context: NavigationContext) => {
        // Only show for concrete classes, not interfaces
        const symbol = context.relatedSymbols[0];
        return symbol && symbol.kind !== 'TSInterface';
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbol = context.relatedSymbols[0];
      if (!selectedSymbol) {
        return { success: false, message: 'No class selected' };
      }

      try {
        const interfaceResult = await api.extractInterface(selectedSymbol.identifier);
        return {
          success: true,
          message: `Interface extracted from ${selectedSymbol.identifier}`,
          data: { interfaceResult }
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to extract interface: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 5,
      isAsync: true,
      canBatch: false,
      estimatedDuration: 1800,
      requiresConfirmation: true,
      undoable: true
    }
  }
];

// Batch Actions for Multiple Selections
export const batchActions: ContextualAction[] = [
  {
    id: 'batch-analyze-complexity',
    label: 'Analyze All Complexity',
    description: 'Analyze complexity metrics for all selected symbols',
    icon: '📊',
    category: 'analysis',
    condition: {
      requiresSelection: true,
      customCondition: (context: NavigationContext) => {
        return context.relatedSymbols.length > 1;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbols = context.relatedSymbols;
      if (selectedSymbols.length <= 1) {
        return { success: false, message: 'Multiple symbols must be selected' };
      }

      try {
        const complexityResults = await Promise.all(
          selectedSymbols.map(symbol => 
            api.analyzeFunctionComplexity(symbol.identifier).catch(error => ({
              symbol: symbol.identifier,
              error: error.message
            }))
          )
        );

        const successful = complexityResults.filter(result => !('error' in result));
        const failed = complexityResults.filter(result => 'error' in result);

        return {
          success: true,
          message: `Complexity analysis complete: ${successful.length} successful, ${failed.length} failed`,
          data: { successful, failed }
        };
      } catch (error) {
        return {
          success: false,
          message: `Batch complexity analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 4,
      isAsync: true,
      canBatch: true,
      estimatedDuration: 3000,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'batch-find-references',
    label: 'Find All References',
    description: 'Find references for all selected symbols',
    icon: '🔍',
    category: 'search',
    condition: {
      requiresSelection: true,
      customCondition: (context: NavigationContext) => {
        return context.relatedSymbols.length > 1;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbols = context.relatedSymbols;
      if (selectedSymbols.length <= 1) {
        return { success: false, message: 'Multiple symbols must be selected' };
      }

      try {
        const referenceResults = await Promise.all(
          selectedSymbols.map(async symbol => {
            try {
              const references = await api.searchSymbols({
                query: symbol.identifier,
                filters: {
                  symbol_types: [symbol.kind],
                  file_patterns: [],
                  scope: { type: 'Global' }
                }
              });
              return { symbol: symbol.identifier, references };
            } catch (error) {
              return { symbol: symbol.identifier, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          })
        );

        const successful = referenceResults.filter(result => !('error' in result));
        const failed = referenceResults.filter(result => 'error' in result);
        const totalReferences = successful.reduce((sum, result) => sum + (result as any).references.length, 0);

        return {
          success: true,
          message: `Found ${totalReferences} total references across ${successful.length} symbols`,
          data: { results: referenceResults, totalReferences }
        };
      } catch (error) {
        return {
          success: false,
          message: `Batch reference search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 6,
      isAsync: true,
      canBatch: true,
      estimatedDuration: 2500,
      requiresConfirmation: false,
      undoable: false
    }
  },

  {
    id: 'batch-bookmark-symbols',
    label: 'Bookmark All',
    description: 'Bookmark all selected symbols',
    icon: '🔖',
    category: 'bookmark',
    condition: {
      requiresSelection: true,
      requiresProject: true,
      customCondition: (context: NavigationContext) => {
        return context.relatedSymbols.length > 1;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbols = context.relatedSymbols;
      if (selectedSymbols.length <= 1) {
        return { success: false, message: 'Multiple symbols must be selected' };
      }

      try {
        const bookmarkResults = await Promise.all(
          selectedSymbols.map(async symbol => {
            try {
              // Simulate bookmark creation
              await new Promise(resolve => setTimeout(resolve, 100));
              return { symbol: symbol.identifier, bookmarked: true };
            } catch (error) {
              return { symbol: symbol.identifier, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          })
        );

        const successful = bookmarkResults.filter(result => !('error' in result));
        const failed = bookmarkResults.filter(result => 'error' in result);

        return {
          success: true,
          message: `Bookmarked ${successful.length} symbols${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
          data: { bookmarked: successful, failed }
        };
      } catch (error) {
        return {
          success: false,
          message: `Batch bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 3,
      isAsync: true,
      canBatch: true,
      estimatedDuration: 1000,
      requiresConfirmation: false,
      undoable: true
    }
  },

  {
    id: 'batch-ai-explain',
    label: 'AI Explain All',
    description: 'Get AI explanations for all selected symbols',
    icon: '🤖',
    category: 'ai',
    condition: {
      requiresSelection: true,
      customCondition: (context: NavigationContext) => {
        return context.relatedSymbols.length > 1 && context.relatedSymbols.length <= 5; // Limit to prevent overwhelming AI
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbols = context.relatedSymbols;
      if (selectedSymbols.length <= 1) {
        return { success: false, message: 'Multiple symbols must be selected' };
      }
      if (selectedSymbols.length > 5) {
        return { success: false, message: 'Too many symbols selected. Please select 5 or fewer symbols.' };
      }

      try {
        const explanationResults = await Promise.all(
          selectedSymbols.map(async symbol => {
            try {
              const explanation = await api.synthesizeGuidance(
                `Explain the purpose and usage of ${symbol.kind} ${symbol.identifier}`
              );
              return { symbol: symbol.identifier, explanation };
            } catch (error) {
              return { symbol: symbol.identifier, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          })
        );

        const successful = explanationResults.filter(result => !('error' in result));
        const failed = explanationResults.filter(result => 'error' in result);

        return {
          success: true,
          message: `AI explanations generated for ${successful.length} symbols${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
          data: { explanations: successful, failed }
        };
      } catch (error) {
        return {
          success: false,
          message: `Batch AI explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 2,
      isAsync: true,
      canBatch: true,
      estimatedDuration: 8000,
      requiresConfirmation: true,
      undoable: false
    }
  },

  {
    id: 'batch-export-symbols',
    label: 'Export Symbol Data',
    description: 'Export detailed information about all selected symbols',
    icon: '📤',
    category: 'analysis',
    condition: {
      requiresSelection: true,
      customCondition: (context: NavigationContext) => {
        return context.relatedSymbols.length > 1;
      }
    },
    execute: async (context: NavigationContext): Promise<ActionResult> => {
      const selectedSymbols = context.relatedSymbols;
      if (selectedSymbols.length <= 1) {
        return { success: false, message: 'Multiple symbols must be selected' };
      }

      try {
        const exportData = {
          exportDate: new Date().toISOString(),
          projectPath: context.projectPath,
          symbolCount: selectedSymbols.length,
          symbols: selectedSymbols.map(symbol => ({
            identifier: symbol.identifier,
            kind: symbol.kind,
            location: symbol.location,
            // Add more symbol details as needed
          }))
        };

        // In a real implementation, this would save to file or clipboard
        const exportJson = JSON.stringify(exportData, null, 2);

        return {
          success: true,
          message: `Exported data for ${selectedSymbols.length} symbols`,
          data: { exportData: exportJson, symbolCount: selectedSymbols.length }
        };
      } catch (error) {
        return {
          success: false,
          message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
    metadata: {
      priority: 1,
      isAsync: false,
      canBatch: true,
      estimatedDuration: 500,
      requiresConfirmation: false,
      undoable: false
    }
  }
];

// Combine all default actions
export const defaultActions: ContextualAction[] = [
  ...navigationActions,
  ...analysisActions,
  ...bookmarkActions,
  ...sessionActions,
  ...aiActions,
  ...functionActions,
  ...classActions,
  ...batchActions
];