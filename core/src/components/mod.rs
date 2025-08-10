// [[PROJECT_NAME]]/core/src/components/mod.rs
// Purpose: [Declares the `components` module, now including the new `parsers` submodule.]
// Architecture: [This file defines the module structure for the core business logic components.]
// Dependencies: [None.]
pub mod code_source_controller;
pub mod codebase_cartographer;
pub mod command_bus;
pub mod ai_synthesis_core;
pub mod home_directory_manager;
pub mod project_configuration_service;
pub mod project_config;
pub mod parsers; // New module for language-specific parsers

// Infrastructure components
pub mod analysis_engine;
pub mod cache_manager;
pub mod file_system_watcher;
pub mod search_index_manager;
pub mod symbol_relationship_tracker;
pub mod search_engine;
pub mod code_suggestion_system;
pub mod documentation_generator;
pub mod pattern_recognition_system;
pub mod session_manager;

// Error handling and recovery components
pub mod error_recovery_manager;
pub mod error_logger;
pub mod error_reporter;
pub mod error_system;

// Operation management
pub mod operation_manager;

#[cfg(test)]
pub mod error_handling_tests;

// Integration: [The `parsers` module is used by the `CodebaseCartographer`.]
// Notes: [This change reflects the refactoring of parsing logic out of the cartographer and into specialized modules.]
