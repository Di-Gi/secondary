# Prompt Engine with Context Collection & Development Profiles

## User Problem
**Developers repeatedly gather the same sets of files when working on specific features or asking AI for help, losing time and context switching between different development workflows.**

Current workflow pain points:
- Manually selecting relevant files for each AI query
- Losing track of which files are relevant for specific features (auth, API, UI components)
- No way to quickly switch between different development contexts
- Context collection is reactive rather than proactive
- No reusable context patterns for similar development tasks

## User Journey
**Streamlined Context Management with Development Profiles**

### Primary Flow: Using Development Profiles
1. **Developer creates a profile** while working on authentication:
   - Selects 4 key files: `auth.service.ts`, `user.model.ts`, `auth.controller.ts`, `auth.test.ts`
   - Names it "Auth System" with tags: `auth`, `backend`
   - System automatically detects related files and suggests additions
2. **Developer saves the profile** for future use
3. **Later, when working on auth issues**:
   - Opens "Auth System" profile with one click
   - All relevant files are instantly loaded into context
   - AI queries automatically include this context
   - Can modify profile on-the-fly and save updates

### Secondary Flow: Smart Profile Suggestions
1. **System analyzes current file selection** patterns
2. **Suggests creating profiles** when developer repeatedly selects similar file sets
3. **Auto-generates profile names** based on file patterns and project structure
4. **Learns from usage** to improve future suggestions

## Success Criteria
- [ ] Developers can create, save, and load development profiles in <10 seconds
- [ ] Profiles reduce context gathering time by 80% for repeated workflows
- [ ] AI queries with profile context are 50% more relevant than manual selection
- [ ] Profile suggestions are accurate and useful (>70% acceptance rate)
- [ ] System works seamlessly with existing context collection
- [ ] No performance impact on existing symbol analysis
- [ ] Profiles sync across project sessions

## Core Features

### 1. Development Profiles
**Reusable file collections for specific development contexts**

#### Profile Structure
```typescript
interface DevelopmentProfile {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  files: ProfileFile[];
  created_at: string;
  last_used: string;
  usage_count: number;
  auto_include_related: boolean;
  project_path: string;
}

interface ProfileFile {
  path: string;
  reason: 'manual' | 'suggested' | 'related';
  relevance_score: number;
  last_modified: string;
}
```

#### Profile Types
- **Feature Profiles**: Files related to specific features (`auth`, `payments`, `user-management`)
- **Layer Profiles**: Files from specific architectural layers (`frontend`, `api`, `database`)
- **Workflow Profiles**: Files for specific development tasks (`testing`, `deployment`, `debugging`)
- **Component Profiles**: Related UI components and their dependencies

### 2. Enhanced Context Collection
**Extend existing context collection to work outside Symbol Explorer**

#### Context Collection Modes
- **Symbol-based**: Current implementation (click symbol → get context)
- **File-based**: Select files → get related context
- **Profile-based**: Load profile → get enhanced context
- **Query-based**: AI detects intent → suggests relevant context

#### Smart Context Enhancement
- **Dependency Analysis**: Automatically include imported/exported files
- **Test Coverage**: Include related test files
- **Configuration Files**: Include relevant config files
- **Documentation**: Include related README/docs
- **Recent Changes**: Prioritize recently modified files

### 3. Profile Management Interface
**Intuitive UI for creating and managing development profiles**

#### Profile Creation Workflow
1. **File Selection**: Multi-select files from project explorer
2. **Smart Suggestions**: System suggests related files
3. **Profile Naming**: Auto-suggest names based on file patterns
4. **Tag Assignment**: Auto-tag based on file types and locations
5. **Save & Organize**: Save to profile library with search/filter

#### Profile Usage Interface
- **Quick Access Bar**: Recently used profiles
- **Profile Browser**: Searchable library with tags and descriptions
- **Context Preview**: Show files and relationships before loading
- **One-click Loading**: Instant context activation

## Implementation Approach
**Complete implementation in single session with lightweight JSON storage**

### Core Components

#### Backend (Rust)
1. **JSON Profile Storage**
   - Store profiles as JSON files in app data directory
   - Simple file-based CRUD operations
   - No database overhead or migrations

2. **File Status Validation**
   - Check if profile files exist and are accessible
   - Detect moved/renamed files
   - Provide file status indicators to user

3. **Context Export System**
   - Generate formatted exports (XML, YAML, JSON)
   - Copy to clipboard functionality
   - Include file content and metadata

#### Frontend (React)
1. **Minimal Profile Interface**
   - Compact profile creation modal
   - Clean profile selector dropdown
   - Unobtrusive active profile indicator

2. **Export Functionality**
   - One-click export to clipboard
   - Format selection (XML/YAML/JSON)
   - Export preview before copying

3. **File Status Indicators**
   - Visual indicators for missing/moved files
   - Quick file resolution actions
   - Clean error states

## Technical Architecture

### JSON Storage Schema
```typescript
// Profile storage: {project_path}/.secondary-mind/profiles/{profile_id}.json
interface StoredProfile {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  files: string[]; // Just file paths - content fetched fresh
  created_at: string;
  last_used: string;
  usage_count: number;
}

// Export formats
interface ProfileExport {
  profile: {
    name: string;
    description?: string;
    tags: string[];
    exported_at: string;
  };
  files: {
    path: string;
    content: string;
    status: 'found' | 'missing' | 'error';
  }[];
}
```

### API Extensions
```rust
// New Tauri commands
#[tauri::command]
pub async fn create_development_profile(
    name: String,
    files: Vec<String>,
    tags: Vec<String>,
    project_path: String,
) -> Result<DevelopmentProfile, String>

#[tauri::command]
pub async fn load_development_profiles(
    project_path: String,
) -> Result<Vec<DevelopmentProfile>, String>

#[tauri::command]
pub async fn load_profile_context(
    profile_id: String,
) -> Result<ProfileContext, String>

#[tauri::command]
pub async fn suggest_profile_files(
    selected_files: Vec<String>,
    project_path: String,
) -> Result<Vec<SuggestedFile>, String>
```

### Frontend State Management
```typescript
// Extend existing app store
interface AppState {
  // ... existing state
  
  // Profile state
  developmentProfiles: DevelopmentProfile[];
  activeProfile: DevelopmentProfile | null;
  profileContext: ProfileContext | null;
  isProfileLoading: boolean;
  
  // Profile actions
  loadProfiles: () => Promise<void>;
  createProfile: (profile: CreateProfileRequest) => Promise<void>;
  loadProfile: (profileId: string) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<DevelopmentProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  suggestProfileFiles: (files: string[]) => Promise<SuggestedFile[]>;
}
```

## User Interface Design

### Profile Creation Flow
1. **File Selection Mode**
   - Multi-select files in project explorer
   - "Create Profile" button appears when 2+ files selected
   - Smart suggestions panel shows related files

2. **Profile Configuration Modal**
   - Name input with auto-suggestions
   - Description field (optional)
   - Tag input with auto-complete
   - File list with relevance indicators
   - "Auto-include related files" toggle

3. **Confirmation & Save**
   - Preview of final profile
   - Estimated context size
   - Save button with success feedback

### Profile Usage Interface
1. **Quick Access Bar** (top of interface)
   - Recently used profiles as chips
   - "+" button for quick profile creation
   - Active profile indicator

2. **Profile Library Panel** (sidebar)
   - Search bar with tag filtering
   - Profile cards with metadata
   - Usage statistics and last used date
   - Context preview on hover

3. **Context Status Indicator**
   - Shows active profile name
   - File count and context size
   - Quick actions (edit, duplicate, clear)

## Integration Points

### With Existing Features
1. **Symbol Explorer Integration**
   - "Add to Profile" option in symbol context menu
   - Create profile from symbol relationships
   - Profile-based symbol filtering

2. **AI Chat Enhancement**
   - Profile context auto-injection
   - Profile suggestions based on query intent
   - Context quality feedback loop

3. **Notes Interface Integration**
   - Link notes to specific profiles
   - Profile-specific note templates
   - Context-aware note suggestions

### With Project Management
1. **Project-specific Profiles**
   - Profiles scoped to individual projects
   - Profile templates for project types
   - Cross-project profile patterns

2. **Git Integration**
   - Branch-specific profile activation
   - Profile updates based on file changes
   - Merge conflict resolution for profiles

## Success Metrics

### Quantitative Metrics
- **Profile Creation Rate**: Profiles created per active user per week
- **Profile Usage Frequency**: Average profile loads per development session
- **Context Gathering Time**: Time saved vs manual file selection
- **AI Query Quality**: Response relevance with profile context vs without
- **Profile Retention**: Percentage of profiles used after 30 days

### Qualitative Metrics
- **User Satisfaction**: Survey feedback on profile usefulness
- **Workflow Integration**: How naturally profiles fit into development flow
- **Learning Curve**: Time to become proficient with profile system
- **Feature Discovery**: How easily users find and adopt profile features

## Future Enhancements

### Advanced Intelligence
- **ML-based Profile Suggestions**: Learn from codebase patterns
- **Cross-project Profile Patterns**: Identify common profile types
- **Predictive Context Loading**: Anticipate needed context based on current work

### Collaboration Features
- **Shared Profiles**: Team-wide profile libraries
- **Profile Templates**: Standardized profiles for common tasks
- **Profile Reviews**: Peer feedback on profile effectiveness

### Integration Expansions
- **IDE Integration**: Export profiles to other development tools
- **CI/CD Integration**: Use profiles for automated testing contexts
- **Documentation Generation**: Auto-generate docs from profile contexts

## Implementation Timeline

### Week 1: Foundation
- [ ] Database schema and migration system
- [ ] Core profile CRUD operations (backend)
- [ ] Basic profile creation UI (frontend)
- [ ] File selection and suggestion engine
- [ ] Profile storage and retrieval

### Week 2: Intelligence & Integration
- [ ] Enhanced context collection for profiles
- [ ] AI chat integration with profile context
- [ ] Smart profile suggestions
- [ ] Profile usage analytics
- [ ] Quick access interface

### Week 3: Polish & Advanced Features
- [ ] Profile management interface
- [ ] Keyboard shortcuts and workflow optimization
- [ ] Visual enhancements and UX polish
- [ ] Performance optimization
- [ ] Documentation and help system

## Definition of Done
- [ ] Users can create profiles from selected files in <10 seconds
- [ ] Profiles load complete context in <500ms
- [ ] AI queries with profile context show measurable quality improvement
- [ ] Profile suggestions are relevant and useful
- [ ] System handles 100+ profiles per project without performance issues
- [ ] All existing functionality remains unaffected
- [ ] Comprehensive error handling and edge case coverage
- [ ] User documentation and onboarding flow complete

This design follows the .kiro development rules by:
- **Solving specific user problems** with clear value propositions
- **Building complete workflows** rather than fragmented features
- **Leveraging existing architecture** and patterns
- **Maintaining simplicity** while adding powerful functionality
- **Focusing on user value** over technical complexity
- **Integrating seamlessly** with existing features

The implementation is designed to be completed in 3 weeks with clear milestones and measurable success criteria.