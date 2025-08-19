// [[SECONDARY_MIND_CORE]]/src/model/file_tree.rs
// Purpose: Data structures for enhanced file tree with metadata and git integration
// Architecture: Models for file tree nodes, metadata, and git status information

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use crate::model::analysis::AnalysisSymbol;

/// Enhanced file tree with metadata and git status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedFileTree {
    /// Root nodes of the file tree
    pub nodes: Vec<FileTreeNode>,
    /// Total number of files in tree
    pub total_files: usize,
    /// Total number of directories in tree
    pub total_directories: usize,
    /// Time taken to analyze the tree
    pub analysis_time: String,
    /// Tree generation timestamp
    pub generated_at: DateTime<Utc>,
    /// Tree options used for generation
    pub options: FileTreeOptions,
}

/// Individual file tree node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeNode {
    /// Unique node identifier
    pub id: String,
    /// Node name (file/directory name)
    pub name: String,
    /// Full path from project root
    pub path: PathBuf,
    /// Type of file tree node
    pub node_type: FileNodeType,
    /// Child nodes (for directories)
    pub children: Option<Vec<FileTreeNode>>,
    /// Node metadata
    pub metadata: FileNodeMetadata,
    /// Node state information
    pub state: FileNodeState,
}

/// Types of file tree nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileNodeType {
    File,
    Directory,
    SymbolicLink,
    Unknown,
}

/// Metadata for file tree nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNodeMetadata {
    /// Number of symbols in file (0 for directories)
    pub symbol_count: usize,
    /// File size in bytes
    pub file_size: u64,
    /// Last modification timestamp
    pub last_modified: DateTime<Utc>,
    /// Git status information
    pub git_status: Option<GitFileStatus>,
    /// Main symbols in file (top-level functions, classes, etc.)
    pub main_symbols: Vec<AnalysisSymbol>,
    /// File language/type
    pub language: Option<String>,
    /// File encoding
    pub encoding: Option<String>,
    /// Whether file is binary
    pub is_binary: bool,
    /// Custom attributes
    pub attributes: HashMap<String, String>,
}

/// Git status information for files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    /// Git status type
    pub status: GitStatus,
    /// Whether file is staged
    pub staged: bool,
    /// Whether file is in working directory
    pub in_working_dir: bool,
    /// Number of additions
    pub additions: Option<usize>,
    /// Number of deletions
    pub deletions: Option<usize>,
    /// Last commit hash for this file
    pub last_commit: Option<String>,
    /// Last commit timestamp
    pub last_commit_time: Option<DateTime<Utc>>,
    /// Branch information
    pub branch: Option<String>,
}

/// Git status types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GitStatus {
    Unmodified,
    Modified,
    Added,
    Deleted,
    Renamed,
    Copied,
    Unmerged,
    Untracked,
    Ignored,
    Conflicted,
}

/// State information for file tree nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNodeState {
    /// Whether node is expanded (for directories)
    pub expanded: bool,
    /// Whether node is selected
    pub selected: bool,
    /// Whether node is visible (after filtering)
    pub visible: bool,
    /// Whether node is loading
    pub loading: bool,
    /// Error message if node failed to load
    pub error: Option<String>,
    /// Last access timestamp
    pub last_accessed: Option<DateTime<Utc>>,
}

/// Options for file tree generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeOptions {
    /// Whether to show hidden files
    pub show_hidden_files: bool,
    /// Whether to show git status
    pub show_git_status: bool,
    /// Maximum depth to traverse
    pub max_depth: Option<usize>,
    /// File type filters (extensions to include)
    pub file_filters: Vec<String>,
    /// Directory filters (directories to exclude)
    pub directory_filters: Vec<String>,
    /// Whether to include symbol analysis
    pub include_symbols: bool,
    /// Whether to follow symbolic links
    pub follow_symlinks: bool,
    /// Sort order for nodes
    pub sort_order: FileSortOrder,
    /// Whether to group directories first
    pub directories_first: bool,
}

/// Sort order options for file tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileSortOrder {
    Name,
    Size,
    Modified,
    Type,
    GitStatus,
    SymbolCount,
}

/// File tree filter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeFilter {
    /// Filter name
    pub name: String,
    /// Filter type
    pub filter_type: FileFilterType,
    /// Filter value/pattern
    pub pattern: String,
    /// Whether filter is active
    pub active: bool,
    /// Whether filter is inclusive or exclusive
    pub inclusive: bool,
}

/// Types of file tree filters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileFilterType {
    Extension,
    Name,
    Path,
    Size,
    Modified,
    GitStatus,
    Language,
    SymbolCount,
}

/// File tree search configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeSearch {
    /// Search query
    pub query: String,
    /// Search type
    pub search_type: FileSearchType,
    /// Case sensitive search
    pub case_sensitive: bool,
    /// Use regex patterns
    pub use_regex: bool,
    /// Search in file contents
    pub search_contents: bool,
    /// Maximum results to return
    pub max_results: usize,
}

/// Types of file tree search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileSearchType {
    FileName,
    FilePath,
    FileContent,
    SymbolName,
    GitStatus,
}

/// File tree statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeStatistics {
    /// Total files
    pub total_files: usize,
    /// Total directories
    pub total_directories: usize,
    /// Total size in bytes
    pub total_size: u64,
    /// Files by language
    pub files_by_language: HashMap<String, usize>,
    /// Files by git status
    pub files_by_git_status: HashMap<GitStatus, usize>,
    /// Symbol count distribution
    pub symbol_distribution: HashMap<String, usize>,
    /// Last update timestamp
    pub last_updated: DateTime<Utc>,
}

/// File tree update event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeUpdateEvent {
    /// Event type
    pub event_type: FileTreeEventType,
    /// Affected file path
    pub file_path: PathBuf,
    /// Event timestamp
    pub timestamp: DateTime<Utc>,
    /// Additional event data
    pub data: HashMap<String, String>,
}

/// Types of file tree update events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileTreeEventType {
    FileAdded,
    FileModified,
    FileDeleted,
    FileRenamed,
    DirectoryAdded,
    DirectoryDeleted,
    GitStatusChanged,
    SymbolsUpdated,
}

// Implementation methods
impl EnhancedFileTree {
    /// Create a new enhanced file tree
    pub fn new(options: FileTreeOptions) -> Self {
        Self {
            nodes: Vec::new(),
            total_files: 0,
            total_directories: 0,
            analysis_time: "0ms".to_string(),
            generated_at: Utc::now(),
            options,
        }
    }

    /// Add a node to the tree
    pub fn add_node(&mut self, node: FileTreeNode) {
        match node.node_type {
            FileNodeType::File => self.total_files += 1,
            FileNodeType::Directory => self.total_directories += 1,
            _ => {}
        }
        self.nodes.push(node);
    }

    /// Find a node by path
    pub fn find_node(&self, path: &PathBuf) -> Option<&FileTreeNode> {
        self.find_node_recursive(&self.nodes, path)
    }

    fn find_node_recursive<'a>(&self, nodes: &'a [FileTreeNode], path: &PathBuf) -> Option<&'a FileTreeNode> {
        for node in nodes {
            if node.path == *path {
                return Some(node);
            }
            if let Some(children) = &node.children {
                if let Some(found) = self.find_node_recursive(children, path) {
                    return Some(found);
                }
            }
        }
        None
    }

    /// Get tree statistics
    pub fn get_statistics(&self) -> FileTreeStatistics {
        let mut stats = FileTreeStatistics {
            total_files: self.total_files,
            total_directories: self.total_directories,
            total_size: 0,
            files_by_language: HashMap::new(),
            files_by_git_status: HashMap::new(),
            symbol_distribution: HashMap::new(),
            last_updated: Utc::now(),
        };

        self.collect_statistics_recursive(&self.nodes, &mut stats);
        stats
    }

    fn collect_statistics_recursive(&self, nodes: &[FileTreeNode], stats: &mut FileTreeStatistics) {
        for node in nodes {
            stats.total_size += node.metadata.file_size;

            if let Some(language) = &node.metadata.language {
                *stats.files_by_language.entry(language.clone()).or_insert(0) += 1;
            }

            if let Some(git_status) = &node.metadata.git_status {
                *stats.files_by_git_status.entry(git_status.status.clone()).or_insert(0) += 1;
            }

            let symbol_range = match node.metadata.symbol_count {
                0 => "0",
                1..=5 => "1-5",
                6..=20 => "6-20",
                21..=50 => "21-50",
                _ => "50+",
            };
            *stats.symbol_distribution.entry(symbol_range.to_string()).or_insert(0) += 1;

            if let Some(children) = &node.children {
                self.collect_statistics_recursive(children, stats);
            }
        }
    }

    /// Validate the file tree structure
    pub fn validate(&self) -> Result<(), String> {
        if self.nodes.is_empty() {
            return Err("File tree must contain at least one node".to_string());
        }

        for node in &self.nodes {
            node.validate()?;
        }

        Ok(())
    }
}

impl FileTreeNode {
    /// Create a new file tree node
    pub fn new(
        name: String,
        path: PathBuf,
        node_type: FileNodeType,
        metadata: FileNodeMetadata,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path,
            node_type,
            children: None,
            metadata,
            state: FileNodeState::default(),
        }
    }

    /// Add a child node
    pub fn add_child(&mut self, child: FileTreeNode) {
        if self.children.is_none() {
            self.children = Some(Vec::new());
        }
        if let Some(children) = &mut self.children {
            children.push(child);
        }
    }

    /// Get child count
    pub fn child_count(&self) -> usize {
        self.children.as_ref().map_or(0, |children| children.len())
    }

    /// Check if node is a directory
    pub fn is_directory(&self) -> bool {
        matches!(self.node_type, FileNodeType::Directory)
    }

    /// Check if node is a file
    pub fn is_file(&self) -> bool {
        matches!(self.node_type, FileNodeType::File)
    }

    /// Validate the node
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("File tree node name cannot be empty".to_string());
        }

        if self.path.as_os_str().is_empty() {
            return Err("File tree node path cannot be empty".to_string());
        }

        // Validate children if present
        if let Some(children) = &self.children {
            for child in children {
                child.validate()?;
            }
        }

        // Validate metadata
        self.metadata.validate()?;

        Ok(())
    }
}

impl FileNodeMetadata {
    /// Create new file node metadata
    pub fn new() -> Self {
        Self {
            symbol_count: 0,
            file_size: 0,
            last_modified: Utc::now(),
            git_status: None,
            main_symbols: Vec::new(),
            language: None,
            encoding: None,
            is_binary: false,
            attributes: HashMap::new(),
        }
    }

    /// Validate the metadata
    pub fn validate(&self) -> Result<(), String> {
        if let Some(git_status) = &self.git_status {
            git_status.validate()?;
        }

        Ok(())
    }
}

impl GitFileStatus {
    /// Create new git file status
    pub fn new(status: GitStatus) -> Self {
        Self {
            status,
            staged: false,
            in_working_dir: true,
            additions: None,
            deletions: None,
            last_commit: None,
            last_commit_time: None,
            branch: None,
        }
    }

    /// Validate the git status
    pub fn validate(&self) -> Result<(), String> {
        if let Some(additions) = self.additions {
            if additions > 10000 {
                return Err("Additions count seems unreasonably high".to_string());
            }
        }

        if let Some(deletions) = self.deletions {
            if deletions > 10000 {
                return Err("Deletions count seems unreasonably high".to_string());
            }
        }

        Ok(())
    }
}

impl Default for FileTreeOptions {
    fn default() -> Self {
        Self {
            show_hidden_files: false,
            show_git_status: true,
            max_depth: Some(10),
            file_filters: Vec::new(),
            directory_filters: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                "target".to_string(),
                "dist".to_string(),
                "build".to_string(),
            ],
            include_symbols: true,
            follow_symlinks: false,
            sort_order: FileSortOrder::Name,
            directories_first: true,
        }
    }
}

impl Default for FileNodeState {
    fn default() -> Self {
        Self {
            expanded: false,
            selected: false,
            visible: true,
            loading: false,
            error: None,
            last_accessed: None,
        }
    }
}

impl Default for FileNodeMetadata {
    fn default() -> Self {
        Self::new()
    }
}

// Serialization helpers for complex enums
impl GitStatus {
    /// Convert to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            GitStatus::Unmodified => "unmodified",
            GitStatus::Modified => "modified",
            GitStatus::Added => "added",
            GitStatus::Deleted => "deleted",
            GitStatus::Renamed => "renamed",
            GitStatus::Copied => "copied",
            GitStatus::Unmerged => "unmerged",
            GitStatus::Untracked => "untracked",
            GitStatus::Ignored => "ignored",
            GitStatus::Conflicted => "conflicted",
        }
    }

    /// Create from string representation
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "unmodified" => Ok(GitStatus::Unmodified),
            "modified" => Ok(GitStatus::Modified),
            "added" => Ok(GitStatus::Added),
            "deleted" => Ok(GitStatus::Deleted),
            "renamed" => Ok(GitStatus::Renamed),
            "copied" => Ok(GitStatus::Copied),
            "unmerged" => Ok(GitStatus::Unmerged),
            "untracked" => Ok(GitStatus::Untracked),
            "ignored" => Ok(GitStatus::Ignored),
            "conflicted" => Ok(GitStatus::Conflicted),
            _ => Err(format!("Unknown git status: {}", s)),
        }
    }
}