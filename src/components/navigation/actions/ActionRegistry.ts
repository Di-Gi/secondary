// Action Registry - Contextual Action Management System
// Purpose: Manages registration, evaluation, and execution of contextual actions
// Architecture: Centralized registry with plugin-like action system

import { ContextualAction, NavigationContext, ActionResult } from '../../../types/navigation';
import { Symbol } from '../../../api';

export class ActionRegistry {
  private actions = new Map<string, ContextualAction>();
  private categories = new Map<string, ContextualAction[]>();

  // Register a new action
  registerAction(action: ContextualAction): void {
    this.actions.set(action.id, action);
    
    // Add to category
    if (!this.categories.has(action.category)) {
      this.categories.set(action.category, []);
    }
    this.categories.get(action.category)!.push(action);
  }

  // Register multiple actions
  registerActions(actions: ContextualAction[]): void {
    actions.forEach(action => this.registerAction(action));
  }

  // Unregister an action
  unregisterAction(actionId: string): void {
    const action = this.actions.get(actionId);
    if (action) {
      this.actions.delete(actionId);
      
      // Remove from category
      const categoryActions = this.categories.get(action.category);
      if (categoryActions) {
        const index = categoryActions.findIndex(a => a.id === actionId);
        if (index >= 0) {
          categoryActions.splice(index, 1);
        }
      }
    }
  }

  // Get all registered actions
  getAllActions(): ContextualAction[] {
    return Array.from(this.actions.values());
  }

  // Get actions by category
  getActionsByCategory(category: string): ContextualAction[] {
    return this.categories.get(category) || [];
  }

  // Get actions that match the current context
  getContextualActions(context: NavigationContext, selectedSymbols: Symbol[] = []): ContextualAction[] {
    return this.getAllActions().filter(action => {
      return this.evaluateCondition(action, context, selectedSymbols);
    });
  }

  // Execute an action
  async executeAction(
    actionId: string, 
    context: NavigationContext, 
    params?: any
  ): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      return {
        success: false,
        message: `Action ${actionId} not found`
      };
    }

    try {
      return await action.execute(context, params);
    } catch (error) {
      console.error(`Action ${actionId} execution failed:`, error);
      return {
        success: false,
        message: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Evaluate action condition
  private evaluateCondition(
    action: ContextualAction,
    context: NavigationContext,
    selectedSymbols: Symbol[]
  ): boolean {
    const { condition } = action;

    // Check if selection is required
    if (condition.requiresSelection && selectedSymbols.length === 0) {
      return false;
    }

    // Check if project is required
    if (condition.requiresProject && !context.projectPath) {
      return false;
    }

    // Check symbol types
    if (condition.symbolTypes && condition.symbolTypes.length > 0) {
      const hasMatchingSymbol = selectedSymbols.some(symbol => 
        condition.symbolTypes!.includes(symbol.kind)
      );
      if (!hasMatchingSymbol) return false;
    }

    // Check file types
    if (condition.fileTypes && condition.fileTypes.length > 0) {
      const currentFilePath = context.breadcrumbs.find(b => b.type === 'file')?.path;
      if (!currentFilePath) return false;
      
      const fileExtension = currentFilePath.split('.').pop()?.toLowerCase();
      const hasMatchingFileType = condition.fileTypes.some(type => 
        type.toLowerCase() === fileExtension || 
        currentFilePath.toLowerCase().includes(type.toLowerCase())
      );
      if (!hasMatchingFileType) return false;
    }

    // Check context types
    if (condition.contextTypes && condition.contextTypes.length > 0) {
      const currentContextTypes = context.breadcrumbs.map(b => b.type);
      const hasMatchingContext = condition.contextTypes.some(type => 
        currentContextTypes.includes(type as any)
      );
      if (!hasMatchingContext) return false;
    }

    // Check custom condition
    if (condition.customCondition) {
      try {
        return condition.customCondition(context);
      } catch (error) {
        console.error('Custom condition evaluation failed:', error);
        return false;
      }
    }

    return true;
  }

  // Clear all actions
  clear(): void {
    this.actions.clear();
    this.categories.clear();
  }

  // Get action by ID
  getAction(actionId: string): ContextualAction | undefined {
    return this.actions.get(actionId);
  }

  // Check if action exists
  hasAction(actionId: string): boolean {
    return this.actions.has(actionId);
  }

  // Get actions count
  getActionsCount(): number {
    return this.actions.size;
  }

  // Get categories
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }
}

// Global action registry instance
export const actionRegistry = new ActionRegistry();

// Keyboard shortcut utilities
export class KeyboardShortcutManager {
  private shortcuts = new Map<string, ContextualAction>();

  // Register shortcuts from actions
  registerShortcuts(actions: ContextualAction[]): void {
    actions.forEach(action => {
      if (action.shortcut) {
        const shortcutKey = this.getShortcutKey(action.shortcut);
        this.shortcuts.set(shortcutKey, action);
      }
    });
  }

  // Get shortcut key string
  private getShortcutKey(shortcut: { key: string; modifiers: string[] }): string {
    const modifiers = [...shortcut.modifiers].sort();
    return `${modifiers.join('+')}+${shortcut.key.toLowerCase()}`;
  }

  // Find action by keyboard event
  findActionByKeyboardEvent(event: KeyboardEvent): ContextualAction | undefined {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');

    const shortcutKey = this.getShortcutKey({
      key: event.key.toLowerCase(),
      modifiers
    });

    return this.shortcuts.get(shortcutKey);
  }

  // Clear shortcuts
  clear(): void {
    this.shortcuts.clear();
  }
}

// Global keyboard shortcut manager
export const keyboardShortcutManager = new KeyboardShortcutManager();