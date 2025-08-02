// [[SECONDARY_MIND]]/src/errors.rs
// Purpose: Defines custom error types for the application.
// Architecture: Centralized error definitions. Added `AIError` for LLM integration failures.
// Dependencies: thiserror.

use thiserror::Error;
use std::path::PathBuf;

#[derive(Error, Debug)]
pub enum SecondaryMindError {
    #[error("Git operation failed: {0}")]
    GitError(String),
    #[error("Failed to open repository at path: {0}")]
    RepoNotFound(PathBuf),
    #[error("AST Parsing failed for file {file_path}: {reason}")]
    AstParsingError { file_path: PathBuf, reason: String },
    #[error("Command parsing error: {0}")]
    CommandParseError(String),
    #[error("I/O error for path {path}: {source}")]
    IoError { path: PathBuf, source: std::io::Error },
    
    #[error("Configuration Error: {0}")]
    ConfigError(String),
    
    #[error("AI Synthesis Error: {0}")]
    AIError(String),
}