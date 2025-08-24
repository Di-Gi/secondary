# Feature: Go to Definition from Symbol Explorer

## User Problem
Users can see symbols in the Symbol Explorer but can't easily navigate to where they're defined in the code. They have to manually search for files and scroll to find the symbol definition.

## User Journey
1. User sees a symbol in the Symbol Explorer (e.g., "UserService" class)
2. User clicks on the symbol or a "Go to Definition" button
3. System opens the file and scrolls to the exact line where the symbol is defined
4. User can immediately see the symbol's implementation

## Success Criteria
- [ ] User can click any symbol to navigate to its definition
- [ ] File opens in a code viewer/editor within the app
- [ ] Cursor/highlight shows exactly where the symbol is defined
- [ ] Works for all symbol types (functions, classes, etc.)
- [ ] Graceful error handling if file can't be opened

## Implementation Approach
**Leverage existing patterns:**
- Use existing Symbol interface (already has location data)
- Add simple code viewer component (similar to existing UI patterns)
- Integrate with existing ProjectWorkspace layout

**New components needed:**
- CodeViewer component (simple, focused)
- File opening logic in app store

**Architecture fit:**
- Extends existing symbol exploration workflow
- Uses established Tauri file reading commands
- Follows existing component composition patterns

**Estimated complexity:** Medium

## Technical Constraints
- Maximum files to modify: 4 (SymbolExplorer, new CodeViewer, appStore, API)
- No new dependencies (use existing syntax highlighting if needed)
- Must work with existing Tauri file system commands
- Performance: Files should open quickly (<500ms)

## Definition of Done
- [x] Click any symbol in SymbolExplorer opens code viewer
- [x] Code viewer shows file content with symbol highlighted
- [x] Error handling for missing/unreadable files
- [x] Consistent with existing UI design
- [x] No impact on existing symbol browsing functionality
- [x] User can easily close code viewer and return to symbol list