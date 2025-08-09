// [[SECONDARY_MIND_CORE]]/src/lib.rs
// Purpose: Declares the crate's library structure, making modules accessible to consumers.
// Architecture: The root of the core library crate, defining the public API.

pub mod components;
pub mod errors;
pub mod model;

// Re-export commonly used types for convenience
pub use components::{
    home_directory_manager::HomeDirectoryManager,
    project_configuration_service::{ProjectConfig, ProjectConfigurationService, ProjectSettings, RecentProjects},
    session_manager::{SessionManager, SessionConfig, SessionInfo, CleanupResult},
};

// Re-export enhanced project config types
pub use components::enhanced_project_config::*;
pub use model::session::{ProjectSession, OpenFile, Bookmark, ChatMessage, WorkspaceLayout};