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
    context_collector::{ContextCollector, ContextPackage, FileContext},
};