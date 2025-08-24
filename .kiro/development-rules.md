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

### Problem Definition Phase
1. Clearly articulate the specific user problem being solved
2. Identify the minimal solution that delivers complete user value
3. Analyze existing codebase for similar patterns and reusable components
4. Map out the complete user workflow from start to finish
5. Define success criteria based on user value, not arbitrary metrics

### Implementation Phase
1. Build the core user workflow first (happy path)
2. Implement error handling and edge cases
3. Validate feature behavior from user perspective
4. Refactor for consistency with existing codebase patterns
5. Ensure feature integrates seamlessly with existing functionality

### Validation Phase
1. Verify the feature completely solves the identified user problem
2. Confirm no existing functionality is broken or degraded
3. Eliminate unnecessary complexity and over-engineering
4. Test all user workflows end-to-end
5. Validate that success criteria are met

### Completion Phase
1. Document implementation decisions and trade-offs made
2. Identify reusable patterns created or discovered
3. Note opportunities for future enhancement or optimization
4. Capture lessons learned for future development
5. Consider how this feature enables or constrains future development

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

### Arbitrary Constraints
- Time-based implementation deadlines that compromise quality
- Percentage-based success metrics that don't reflect user value
- Feature scope driven by arbitrary milestones rather than user needs
- Performance targets that exceed actual user requirements

### Premature Optimization
- Optimizing for theoretical performance problems
- Complex caching strategies before identifying actual bottlenecks
- Over-architecting for scale that may never be needed
- Choosing complex solutions for simple problems

## Success Criteria

### Functional Completeness
- Features work completely on first implementation
- No regressions in existing functionality
- All user workflows function end-to-end
- Error states and edge cases are handled appropriately

### User Value Delivery
- Features solve clearly defined user problems
- Interfaces are intuitive and require no explanation
- Interactions feel responsive and natural
- Users can accomplish their goals without friction

### Technical Excellence
- Code follows established patterns consistently
- Components are focused and reusable
- State management is appropriate to complexity
- Performance is suitable for intended use

### Design Quality
- Features integrate seamlessly with existing UI
- Visual hierarchy guides user attention appropriately
- Information architecture supports user mental models
- Accessibility standards are met

### Knowledge Capture
- Implementation decisions and trade-offs are documented
- Reusable patterns are identified and catalogued
- Future enhancement opportunities are noted
- Lessons learned inform subsequent development