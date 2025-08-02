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
pub mod parsers; // New module for language-specific parsers

// Integration: [The `parsers` module is used by the `CodebaseCartographer`.]
// Notes: [This change reflects the refactoring of parsing logic out of the cartographer and into specialized modules.]