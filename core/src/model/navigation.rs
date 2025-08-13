// [[SECONDARY_MIND_CORE]]/src/model/navigation.rs
// Purpose: Data structures for navigation history and session management
// Architecture: Models for tracking navigation state, history, and user navigation patterns

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// Complete navigation history for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationHistory {
    /// List of navigation entries in chronological order
    pub entries: Vec<NavigationEntry>,
    /// Current position in the history (for back/forward navigation)
    pub current_index: i32,
    /// Maximum number of entries to keep in history
    pub max_entries: usize,
    /// When this history was last updated
    pub last_updated: DateTime<Utc>,
    /// Project path this history belongs to
    pub project_path: PathBuf,
}

/// Individual navigation entry representing a location in the codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationEntry {
    /// Unique identifier for this entry
    pub id: String,
    /// The location this entry represents
    pub location: NavigationLocation,
    /// When this entry was created
    pub timestamp: DateTime<Utc>,
    /// Navigation context at the time of entry
    pub context: NavigationContext,
    /// How this navigation was triggered
    pub trigger: NavigationTrigger,
}

/// Represents a specific location in the codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationLocation {
    /// Unique identifier for this location
    pub id: String,
    /// File path relative to project root
    pub file_path: PathBuf,
    /// Position within the file
    pub position: Position,
    /// Symbol at this location, if any
    pub symbol: Option<NavigationSymbol>,
    /// Additional location metadata
    pub metadata: LocationMetadata,
}

/// Position within a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
}

/// Symbol information for navigation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSymbol {
    /// Symbol identifier
    pub id: String,
    /// Symbol name
    pub name: String,
    /// Symbol type (function, class, variable, etc.)
    pub symbol_type: String,
    /// Symbol scope or namespace
    pub scope: Option<String>,
}

/// Metadata about a navigation location
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationMetadata {
    /// File size at time of navigation
    pub file_size: u64,
    /// File last modified time
    pub file_modified: DateTime<Utc>,
    /// Line content at the position
    pub line_content: String,
    /// Surrounding context lines
    pub context_lines: Vec<String>,
}

/// Context information for navigation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationContext {
    /// Project path
    pub project_path: PathBuf,
    /// Breadcrumb trail showing navigation path
    pub breadcrumbs: Vec<BreadcrumbSegment>,
    /// Related symbols that were visible/relevant
    pub related_symbols: Vec<NavigationSymbol>,
    /// Active session ID, if any
    pub session_id: Option<String>,
    /// User's current task or focus area
    pub focus_area: Option<String>,
}

/// Individual breadcrumb segment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreadcrumbSegment {
    /// Display name for this segment
    pub name: String,
    /// Location this segment represents
    pub location: NavigationLocation,
    /// Type of this segment (file, function, class, etc.)
    pub segment_type: String,
}

/// How a navigation was triggered
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NavigationTrigger {
    /// User clicked or selected
    UserClick,
    /// Keyboard navigation
    KeyboardShortcut,
    /// Search result selection
    SearchResult,
    /// Symbol reference following
    SymbolReference,
    /// Go to definition
    GoToDefinition,
    /// Find usages
    FindUsages,
    /// Breadcrumb navigation
    BreadcrumbClick,
    /// History navigation (back/forward)
    HistoryNavigation,
    /// External trigger (API, plugin, etc.)
    External,
}

/// Navigation session data for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSessionData {
    /// Unique session identifier
    pub id: String,
    /// User-defined session name
    pub name: String,
    /// Project path this session belongs to
    pub project_path: PathBuf,
    /// Current navigation state
    pub navigation_state: NavigationState,
    /// Layout configuration for navigation UI
    pub layout_configuration: LayoutConfiguration,
    /// Session metadata
    pub metadata: SessionMetadata,
}

/// Current navigation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationState {
    /// Currently active location
    pub current_location: Option<NavigationLocation>,
    /// Recently visited locations
    pub recent_locations: Vec<NavigationLocation>,
    /// Active navigation filters
    pub active_filters: Vec<NavigationFilter>,
    /// Current search query, if any
    pub current_search: Option<String>,
    /// Selected symbols or elements
    pub selected_items: Vec<String>,
}

/// Navigation UI layout configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfiguration {
    /// Panel visibility states
    pub panel_states: std::collections::HashMap<String, PanelConfiguration>,
    /// Minimap settings
    pub minimap_config: MinimapConfiguration,
    /// Relationship graph settings
    pub graph_config: GraphConfiguration,
    /// File tree settings
    pub tree_config: TreeConfiguration,
}

/// Configuration for a navigation panel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelConfiguration {
    /// Whether panel is visible
    pub visible: bool,
    /// Panel size (width or height)
    pub size: u32,
    /// Panel position/dock location
    pub position: String,
    /// Panel-specific settings
    pub settings: std::collections::HashMap<String, serde_json::Value>,
}

/// Minimap configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinimapConfiguration {
    /// Whether minimap is enabled
    pub enabled: bool,
    /// Zoom level
    pub zoom_level: f64,
    /// Show symbol density
    pub show_density: bool,
    /// Color scheme
    pub color_scheme: String,
}

/// Relationship graph configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphConfiguration {
    /// Layout algorithm
    pub layout_algorithm: String,
    /// Maximum depth to show
    pub max_depth: usize,
    /// Node size scaling
    pub node_size_scale: f64,
    /// Show relationship labels
    pub show_labels: bool,
}

/// File tree configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeConfiguration {
    /// Show hidden files
    pub show_hidden: bool,
    /// Show git status
    pub show_git_status: bool,
    /// Expand depth
    pub auto_expand_depth: usize,
    /// Sort order
    pub sort_order: String,
}

/// Navigation filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationFilter {
    /// Filter type
    pub filter_type: String,
    /// Filter value
    pub value: String,
    /// Whether filter is active
    pub active: bool,
}

/// Session metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    /// When session was created
    pub created_at: DateTime<Utc>,
    /// When session was last accessed
    pub last_accessed: DateTime<Utc>,
    /// Session description
    pub description: Option<String>,
    /// Session tags
    pub tags: Vec<String>,
    /// Whether session is favorited
    pub is_favorite: bool,
}

impl NavigationHistory {
    /// Create a new navigation history for a project
    pub fn new(project_path: PathBuf, max_entries: usize) -> Self {
        Self {
            entries: Vec::new(),
            current_index: -1,
            max_entries,
            last_updated: Utc::now(),
            project_path,
        }
    }

    /// Add a new navigation entry
    pub fn add_entry(&mut self, entry: NavigationEntry) {
        // Remove any entries after current index (when navigating back then adding new entry)
        if self.current_index >= 0 {
            let keep_until = (self.current_index + 1) as usize;
            self.entries.truncate(keep_until);
        }

        // Add the new entry
        self.entries.push(entry);
        self.current_index = (self.entries.len() as i32) - 1;

        // Enforce max entries limit
        if self.entries.len() > self.max_entries {
            let remove_count = self.entries.len() - self.max_entries;
            self.entries.drain(0..remove_count);
            self.current_index -= remove_count as i32;
        }

        self.last_updated = Utc::now();
    }

    /// Navigate back in history
    pub fn go_back(&mut self) -> Option<&NavigationEntry> {
        if self.current_index > 0 {
            self.current_index -= 1;
            self.last_updated = Utc::now();
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }

    /// Navigate forward in history
    pub fn go_forward(&mut self) -> Option<&NavigationEntry> {
        if self.current_index < (self.entries.len() as i32) - 1 {
            self.current_index += 1;
            self.last_updated = Utc::now();
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }

    /// Get current navigation entry
    pub fn current_entry(&self) -> Option<&NavigationEntry> {
        if self.current_index >= 0 && (self.current_index as usize) < self.entries.len() {
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }

    /// Clear all history entries
    pub fn clear(&mut self) {
        self.entries.clear();
        self.current_index = -1;
        self.last_updated = Utc::now();
    }

    /// Get recent entries (last N entries)
    pub fn recent_entries(&self, count: usize) -> Vec<&NavigationEntry> {
        let start = if self.entries.len() > count {
            self.entries.len() - count
        } else {
            0
        };
        self.entries[start..].iter().collect()
    }

    /// Clean up old entries beyond the limit
    pub fn cleanup(&mut self) {
        if self.entries.len() > self.max_entries {
            let remove_count = self.entries.len() - self.max_entries;
            self.entries.drain(0..remove_count);
            self.current_index = std::cmp::max(0, self.current_index - remove_count as i32);
            self.last_updated = Utc::now();
        }
    }
}

impl NavigationEntry {
    /// Create a new navigation entry
    pub fn new(
        location: NavigationLocation,
        context: NavigationContext,
        trigger: NavigationTrigger,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            location,
            timestamp: Utc::now(),
            context,
            trigger,
        }
    }
}

impl NavigationLocation {
    /// Create a new navigation location
    pub fn new(
        file_path: PathBuf,
        position: Position,
        symbol: Option<NavigationSymbol>,
        metadata: LocationMetadata,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            file_path,
            position,
            symbol,
            metadata,
        }
    }
}

impl NavigationSessionData {
    /// Create a new navigation session
    pub fn new(
        name: String,
        project_path: PathBuf,
        navigation_state: NavigationState,
        layout_configuration: LayoutConfiguration,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            project_path,
            navigation_state,
            layout_configuration,
            metadata: SessionMetadata {
                created_at: now,
                last_accessed: now,
                description: None,
                tags: Vec::new(),
                is_favorite: false,
            },
        }
    }

    /// Update last accessed time
    pub fn touch(&mut self) {
        self.metadata.last_accessed = Utc::now();
    }
}

impl Default for LayoutConfiguration {
    fn default() -> Self {
        Self {
            panel_states: std::collections::HashMap::new(),
            minimap_config: MinimapConfiguration::default(),
            graph_config: GraphConfiguration::default(),
            tree_config: TreeConfiguration::default(),
        }
    }
}

impl Default for MinimapConfiguration {
    fn default() -> Self {
        Self {
            enabled: true,
            zoom_level: 1.0,
            show_density: true,
            color_scheme: "default".to_string(),
        }
    }
}

impl Default for GraphConfiguration {
    fn default() -> Self {
        Self {
            layout_algorithm: "force_directed".to_string(),
            max_depth: 3,
            node_size_scale: 1.0,
            show_labels: true,
        }
    }
}

impl Default for TreeConfiguration {
    fn default() -> Self {
        Self {
            show_hidden: false,
            show_git_status: true,
            auto_expand_depth: 2,
            sort_order: "name".to_string(),
        }
    }
}

impl Default for NavigationState {
    fn default() -> Self {
        Self {
            current_location: None,
            recent_locations: Vec::new(),
            active_filters: Vec::new(),
            current_search: None,
            selected_items: Vec::new(),
        }
    }
}