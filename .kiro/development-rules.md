# Secondary Mind Development Rules

## Core Principles

### 1. User-Centric Development
- Every feature must solve a specific user problem
- Test features from the user's perspective
- Prioritize usability over technical complexity
- If a feature doesn't improve the user experience, don't build it

### 2. Simplicity First
- Choose the simplest solution that works
- Avoid abstractions unless absolutely necessary
- Prefer explicit code over clever code
- Maximum 3 levels of component nesting

### 3. Complete Features Only
- Implement entire user workflows, not fragments
- No "TODO" comments or placeholder implementations
- Features must be fully functional before merging
- Include error handling and edge cases

### 4. Codebase Coherence
- Maintain consistency with existing patterns
- Refactor existing code to match new patterns if needed
- Consider impact on entire application, not just the feature
- Use existing components and utilities before creating new ones

## Implementation Rules

### File Organization
- Maximum 200 lines per component file
- Split large components into smaller, focused ones
- Group related functionality in the same directory
- Use descriptive file names that indicate purpose

### Component Design
- Single responsibility per component
- Props should be simple and well-typed
- Avoid complex state management in UI components
- Use composition over inheritance

### State Management
- Keep state as close to usage as possible
- Use Zustand store only for global application state
- Avoid unnecessary re-renders
- Prefer derived state over stored state

### API Integration
- Handle loading and error states consistently
- Provide meaningful error messages to users
- Use optimistic updates where appropriate
- Cache data appropriately to avoid unnecessary requests

### Testing Approach
- Test user workflows, not implementation details
- Focus on integration tests over unit tests
- Ensure tests actually validate user value
- Mock external dependencies consistently

## Development Process

### Before Starting
1. Clearly define the user problem being solved
2. Identify the minimal viable solution
3. Check existing codebase for similar patterns
4. Plan the complete user workflow

### During Implementation
1. Implement the happy path first
2. Add error handling and edge cases
3. Test the feature as a user would
4. Refactor for consistency with existing code

### Before Completion
1. Verify the feature solves the original problem
2. Ensure no regressions in existing functionality
3. Check for over-engineering and simplify if needed
4. Document any new patterns or conventions

## Anti-Patterns to Avoid

### Over-Engineering
- Complex type hierarchies for simple data
- Premature abstractions
- Feature flags for simple functionality
- Multiple layers of indirection

### Fragmented Implementation
- Partial features that don't work end-to-end
- Components that require future implementation to be useful
- Breaking existing functionality while adding new features

### Technical Debt
- Inconsistent patterns across the codebase
- Unused imports or dead code
- Complex state management for simple features
- Poor error handling or user feedback

## Success Metrics

### Code Quality
- Features work completely on first implementation
- No regressions in existing functionality
- Consistent patterns across the codebase
- Clear, readable code that other developers can understand

### User Experience
- Features solve real user problems
- Intuitive interfaces that don't require documentation
- Fast, responsive interactions
- Helpful error messages and feedback

### Maintainability
- Easy to modify or extend features
- Clear separation of concerns
- Minimal coupling between components
- Self-documenting code structure