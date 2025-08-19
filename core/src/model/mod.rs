// [[SECONDARY_MIND]]/src/model/mod.rs
// Purpose: Declares the `model` module, which contains all passive data structures.
// Architecture: Central point for data structure module declarations.
// Dependencies: None.

pub mod project;
pub mod symbol;
pub mod command;
pub mod llm; // New model for LLM API data structures
pub mod session; // Session management models
pub mod navigation; // Navigation history and session models
pub mod navigation_session; // Navigation-specific session data structures
pub mod analysis; // File and symbol analysis data structures
pub mod file_tree; // Enhanced file tree with metadata and git integration
pub mod performance; // Performance monitoring and metrics data structures
pub mod migration; // Data migration and schema validation utilities
pub mod serialization; // Serialization utilities and error handling
