// [[SECONDARY_MIND_CORE]]/src/model/navigation_session.rs
// Purpose: Data structures for navigation session management
// Architecture: Models for tracking navigation state, layout configuration, and session metadata

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// Navigation-specific session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSessionData {
    /// Unique session identifier
    pub id: String,
    /// User-defined session name
    pub name: String,
    /// Layout configuration for navigation panels
    pub layout_configuration: LayoutConfiguration,
    /// Current navigation state
    pub navigation_state: NavigationState,
    /// Session creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last access timestamp
    pub last_accessed: DateTime<Utc>,
}

/// Layout configuration for navigation interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfiguration {
    /// Panel sizes (panel_id -> size in pixels)
    pub panel_sizes: HashMap<String, u32>,
    /// List of visible panel IDs
    pub visible_panels: Vec<String>,
    /// Minimap-specific settings
    pub minimap_settings: MinimapSettings,
    /// File tree settings
    pub tree_settings: FileTreeSettings,
}

/// Current navigation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationState {
    /// Current navigation location
    pub current_location: NavigationLocation,
    /// Navigation history
    pub history: NavigationHistory,
    /// Active navigation session reference
    pub active_session: Option<String>,
    /// UI state
    pub ui: UIState,
    /// Cache state information
    pub cache: CacheState,
}

/// Represents a navigation location
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationLocation {
    /// Unique location identifier
    pub id: String,
    /// File path relative to project root
    pub file_path: PathBuf,
    /// Position within the file
    pub position: Position,
    /// Associated symbol, if any
    pub symbol: Option<Symbol>,
    /// Navigation context
    pub context: NavigationContext,
    /// Location timestamp
    pub timestamp: DateTime<Utc>,
}

/// Navigation history management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationHistory {
    /// List of navigation entries
    pub entries: Vec<NavigationEntry>,
    /// List of navigation sessions
    pub sessions: Vec<NavigationSession>,
    /// Current position in history
    pub current_index: i32,
    /// Maximum number of entries to keep
    pub max_entries: usize,
}

/// Single navigation history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationEntry {
    /// Unique entry identifier
    pub id: String,
    /// Navigation location
    pub location: NavigationLocation,
    /// Entry timestamp
    pub timestamp: DateTime<Utc>,
    /// Navigation context
    pub context: NavigationContext,
}

/// Navigation session reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSession {
    /// Session identifier
    pub id: String,
    /// Session name
    pub name: String,
    /// Session locations
    pub locations: Vec<NavigationLocation>,
    /// Layout configuration
    pub layout: LayoutConfiguration,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last access timestamp
    pub last_accessed: DateTime<Utc>,
}

/// Navigation context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationContext {
    /// Project path
    pub project_path: String,
    /// Breadcrumb segments
    pub breadcrumbs: Vec<BreadcrumbSegment>,
    /// Related symbols
    pub related_symbols: Vec<Symbol>,
    /// Session ID if applicable
    pub session_id: Option<String>,
}

/// Breadcrumb segment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreadcrumbSegment {
    /// Segment label
    pub label: String,
    /// Target location
    pub location: NavigationLocation,
    /// Segment type
    pub segment_type: BreadcrumbType,
}

/// Types of breadcrumb segments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BreadcrumbType {
    File,
    Function,
    Class,
    Module,
    Directory,
}

/// Position within a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    /// Line number (0-based)
    pub line: usize,
    /// Column number (0-based)
    pub column: usize,
}

/// Symbol information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    /// Symbol identifier
    pub id: String,
    /// Symbol name
    pub name: String,
    /// Symbol type
    pub symbol_type: SymbolType,
    /// File path
    pub file_path: PathBuf,
    /// Position in file
    pub position: Position,
    /// Symbol scope/namespace
    pub scope: Option<String>,
}

/// Types of symbols
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SymbolType {
    Function,
    Class,
    Interface,
    Variable,
    Constant,
    Module,
    Namespace,
    Type,
    Enum,
    Struct,
}

/// UI state for navigation interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIState {
    /// Whether minimap is visible
    pub minimap_visible: bool,
    /// Whether relationship graph is visible
    pub relationship_graph_visible: bool,
    /// Whether breadcrumb is expanded
    pub breadcrumb_expanded: bool,
    /// Active navigation panel
    pub active_panel: NavigationPanel,
}

/// Navigation panel types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NavigationPanel {
    FileTree,
    Minimap,
    RelationshipGraph,
    History,
    Bookmarks,
}

/// Cache state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheState {
    /// Last cache update timestamp
    pub last_updated: DateTime<Utc>,
    /// Cached file count
    pub cached_files: usize,
    /// Cache hit rate
    pub hit_rate: f64,
    /// Memory usage in bytes
    pub memory_usage: u64,
}

/// Minimap-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinimapSettings {
    /// Whether to show symbol density
    pub show_symbol_density: bool,
    /// Density calculation method
    pub density_method: DensityMethod,
    /// Color scheme for density visualization
    pub color_scheme: String,
    /// Zoom level
    pub zoom_level: f64,
}

/// Methods for calculating symbol density
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DensityMethod {
    LineCount,
    SymbolCount,
    Complexity,
}

/// File tree settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeSettings {
    /// Whether to show hidden files
    pub show_hidden_files: bool,
    /// Whether to show git status
    pub show_git_status: bool,
    /// Maximum depth to display
    pub max_depth: Option<usize>,
    /// File type filters
    pub file_filters: Vec<String>,
}

impl NavigationSessionData {
    /// Create a new navigation session
    pub fn new(id: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            layout_configuration: LayoutConfiguration::default(),
            navigation_state: NavigationState::default(),
            created_at: now,
            last_accessed: now,
        }
    }

    /// Update the last accessed timestamp
    pub fn touch(&mut self) {
        self.last_accessed = Utc::now();
    }

    /// Validate session data integrity
    pub fn validate(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("Session ID cannot be empty".to_string());
        }
        if self.name.is_empty() {
            return Err("Session name cannot be empty".to_string());
        }
        if self.created_at > self.last_accessed {
            return Err("Created timestamp cannot be after last accessed".to_string());
        }
        Ok(())
    }
}

impl Default for LayoutConfiguration {
    fn default() -> Self {
        let mut panel_sizes = HashMap::new();
        panel_sizes.insert("file_tree".to_string(), 300);
        panel_sizes.insert("minimap".to_string(), 200);
        panel_sizes.insert("relationship_graph".to_string(), 400);

        Self {
            panel_sizes,
            visible_panels: vec![
                "file_tree".to_string(),
                "minimap".to_string(),
            ],
            minimap_settings: MinimapSettings::default(),
            tree_settings: FileTreeSettings::default(),
        }
    }
}

impl Default for NavigationState {
    fn default() -> Self {
        Self {
            current_location: NavigationLocation::default(),
            history: NavigationHistory::default(),
            active_session: None,
            ui: UIState::default(),
            cache: CacheState::default(),
        }
    }
}

impl Default for NavigationLocation {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            file_path: PathBuf::new(),
            position: Position { line: 0, column: 0 },
            symbol: None,
            context: NavigationContext::default(),
            timestamp: Utc::now(),
        }
    }
}

impl Default for NavigationHistory {
    fn default() -> Self {
        Self {
            entries: Vec::new(),
            sessions: Vec::new(),
            current_index: -1,
            max_entries: 1000,
        }
    }
}

impl Default for NavigationContext {
    fn default() -> Self {
        Self {
            project_path: String::new(),
            breadcrumbs: Vec::new(),
            related_symbols: Vec::new(),
            session_id: None,
        }
    }
}

impl Default for UIState {
    fn default() -> Self {
        Self {
            minimap_visible: true,
            relationship_graph_visible: false,
            breadcrumb_expanded: false,
            active_panel: NavigationPanel::FileTree,
        }
    }
}

impl Default for CacheState {
    fn default() -> Self {
        Self {
            last_updated: Utc::now(),
            cached_files: 0,
            hit_rate: 0.0,
            memory_usage: 0,
        }
    }
}

impl Default for MinimapSettings {
    fn default() -> Self {
        Self {
            show_symbol_density: true,
            density_method: DensityMethod::SymbolCount,
            color_scheme: "default".to_string(),
            zoom_level: 1.0,
        }
    }
}

impl Default for FileTreeSettings {
    fn default() -> Self {
        Self {
            show_hidden_files: false,
            show_git_status: true,
            max_depth: Some(10),
            file_filters: Vec::new(),
        }
    }
}

impl NavigationHistory {
    /// Add a new navigation entry
    pub fn add_entry(&mut self, entry: NavigationEntry) {
        // Remove any entries after current position (when navigating back then forward)
        if self.current_index >= 0 {
            let current_pos = self.current_index as usize;
            if current_pos + 1 < self.entries.len() {
                self.entries.truncate(current_pos + 1);
            }
        }

        // Add new entry
        self.entries.push(entry);
        self.current_index = (self.entries.len() as i32) - 1;

        // Maintain max entries limit
        if self.entries.len() > self.max_entries {
            let excess = self.entries.len() - self.max_entries;
            self.entries.drain(0..excess);
            self.current_index -= excess as i32;
        }
    }

    /// Navigate back in history
    pub fn go_back(&mut self) -> Option<&NavigationEntry> {
        if self.current_index > 0 {
            self.current_index -= 1;
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }

    /// Navigate forward in history
    pub fn go_forward(&mut self) -> Option<&NavigationEntry> {
        if self.current_index >= 0 && (self.current_index as usize) < self.entries.len() - 1 {
            self.current_index += 1;
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }

    /// Get current entry
    pub fn current(&self) -> Option<&NavigationEntry> {
        if self.current_index >= 0 {
            self.entries.get(self.current_index as usize)
        } else {
            None
        }
    }
}