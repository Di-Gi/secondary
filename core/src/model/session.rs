// [[SECONDARY_MIND_CORE]]/src/model/session.rs
// Purpose: Data structures for project session management and workspace state
// Architecture: Models for tracking user workspace state, open files, bookmarks, and layout

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// Represents a complete project session with all workspace state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSession {
    /// Unique identifier for the project
    pub project_id: String,
    /// Path to the project root directory
    pub project_path: PathBuf,
    /// List of currently open files with their state
    pub open_files: Vec<OpenFile>,
    /// User bookmarks within the project
    pub bookmarks: Vec<Bookmark>,
    /// Recent search queries
    pub search_history: Vec<String>,
    /// AI chat conversation history
    pub ai_chat_history: Vec<ChatMessage>,
    /// UI layout and panel states
    pub workspace_layout: WorkspaceLayout,
    /// When this session was last updated
    pub last_updated: DateTime<Utc>,
    /// Session creation timestamp
    pub created_at: DateTime<Utc>,
}

/// Represents an open file with its current state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenFile {
    /// Path to the file relative to project root
    pub path: PathBuf,
    /// Current cursor position in the file
    pub cursor_position: Position,
    /// Current scroll position (line number)
    pub scroll_position: u32,
    /// Current text selection, if any
    pub selection: Option<Range>,
    /// Whether this file is currently active/focused
    pub is_active: bool,
    /// When this file was last accessed
    pub last_accessed: DateTime<Utc>,
}

/// Represents a position in a text file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    /// Line number (0-based)
    pub line: u32,
    /// Column number (0-based)
    pub column: u32,
}

/// Represents a text selection range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Range {
    /// Start position of the selection
    pub start: Position,
    /// End position of the selection
    pub end: Position,
}

/// Represents a user bookmark
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    /// Unique identifier for the bookmark
    pub id: String,
    /// User-defined name for the bookmark
    pub name: String,
    /// File path relative to project root
    pub file_path: PathBuf,
    /// Position in the file
    pub position: Position,
    /// Optional description or notes
    pub description: Option<String>,
    /// Bookmark category/tag
    pub category: Option<String>,
    /// When the bookmark was created
    pub created_at: DateTime<Utc>,
}

/// Represents a chat message in AI conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// Unique message identifier
    pub id: String,
    /// Whether this is a user message or AI response
    pub role: MessageRole,
    /// The message content
    pub content: String,
    /// When the message was sent
    pub timestamp: DateTime<Utc>,
    /// Context that was provided with the message
    pub context: Option<MessageContext>,
}

/// Role of the message sender
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
}

/// Context information for a chat message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageContext {
    /// File that was active when message was sent
    pub active_file: Option<PathBuf>,
    /// Selected code snippet, if any
    pub selected_code: Option<String>,
    /// Related symbols that were in context
    pub related_symbols: Vec<String>,
}

/// Represents the UI workspace layout state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceLayout {
    /// Panel visibility states
    pub panels: HashMap<String, PanelState>,
    /// Splitter positions and orientations
    pub splitters: HashMap<String, SplitterState>,
    /// Window dimensions
    pub window_size: Option<WindowSize>,
    /// Active tab in each panel
    pub active_tabs: HashMap<String, String>,
}

/// State of a UI panel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelState {
    /// Whether the panel is visible
    pub visible: bool,
    /// Panel width/height in pixels
    pub size: u32,
    /// Whether the panel is collapsed
    pub collapsed: bool,
}

/// State of a splitter between panels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitterState {
    /// Position of the splitter (0.0 to 1.0)
    pub position: f64,
    /// Orientation of the splitter
    pub orientation: SplitterOrientation,
}

/// Splitter orientation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SplitterOrientation {
    Horizontal,
    Vertical,
}

/// Window size information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    /// Window width in pixels
    pub width: u32,
    /// Window height in pixels
    pub height: u32,
    /// Whether window is maximized
    pub maximized: bool,
}

impl ProjectSession {
    /// Create a new project session
    pub fn new(project_id: String, project_path: PathBuf) -> Self {
        let now = Utc::now();
        Self {
            project_id,
            project_path,
            open_files: Vec::new(),
            bookmarks: Vec::new(),
            search_history: Vec::new(),
            ai_chat_history: Vec::new(),
            workspace_layout: WorkspaceLayout::default(),
            last_updated: now,
            created_at: now,
        }
    }

    /// Update the last_updated timestamp
    pub fn touch(&mut self) {
        self.last_updated = Utc::now();
    }

    /// Add or update an open file
    pub fn update_open_file(&mut self, file: OpenFile) {
        // Remove existing entry for this file
        self.open_files.retain(|f| f.path != file.path);
        // Add the updated file
        self.open_files.push(file);
        self.touch();
    }

    /// Remove an open file
    pub fn close_file(&mut self, file_path: &PathBuf) {
        self.open_files.retain(|f| &f.path != file_path);
        self.touch();
    }

    /// Add a bookmark
    pub fn add_bookmark(&mut self, bookmark: Bookmark) {
        self.bookmarks.push(bookmark);
        self.touch();
    }

    /// Remove a bookmark by ID
    pub fn remove_bookmark(&mut self, bookmark_id: &str) {
        self.bookmarks.retain(|b| b.id != bookmark_id);
        self.touch();
    }

    /// Add a search query to history
    pub fn add_search_query(&mut self, query: String) {
        // Remove duplicate if it exists
        self.search_history.retain(|q| q != &query);
        // Add to front of history
        self.search_history.insert(0, query);
        // Keep only last 50 searches
        self.search_history.truncate(50);
        self.touch();
    }

    /// Add a chat message
    pub fn add_chat_message(&mut self, message: ChatMessage) {
        self.ai_chat_history.push(message);
        // Keep only last 1000 messages
        if self.ai_chat_history.len() > 1000 {
            self.ai_chat_history.remove(0);
        }
        self.touch();
    }
}

impl Default for WorkspaceLayout {
    fn default() -> Self {
        Self {
            panels: HashMap::new(),
            splitters: HashMap::new(),
            window_size: None,
            active_tabs: HashMap::new(),
        }
    }
}

impl OpenFile {
    /// Create a new open file entry
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            cursor_position: Position { line: 0, column: 0 },
            scroll_position: 0,
            selection: None,
            is_active: false,
            last_accessed: Utc::now(),
        }
    }

    /// Mark this file as accessed
    pub fn touch(&mut self) {
        self.last_accessed = Utc::now();
    }
}

impl Bookmark {
    /// Create a new bookmark
    pub fn new(
        id: String,
        name: String,
        file_path: PathBuf,
        position: Position,
    ) -> Self {
        Self {
            id,
            name,
            file_path,
            position,
            description: None,
            category: None,
            created_at: Utc::now(),
        }
    }
}

impl ChatMessage {
    /// Create a new user message
    pub fn user_message(id: String, content: String, context: Option<MessageContext>) -> Self {
        Self {
            id,
            role: MessageRole::User,
            content,
            timestamp: Utc::now(),
            context,
        }
    }

    /// Create a new assistant message
    pub fn assistant_message(id: String, content: String) -> Self {
        Self {
            id,
            role: MessageRole::Assistant,
            content,
            timestamp: Utc::now(),
            context: None,
        }
    }
}