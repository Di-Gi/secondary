// [[PROJECT_NAME]]/core/src/components/codebase_cartographer.rs
// Purpose: [Implements the "Codebase Cartographer" as a language dispatcher. It analyzes file types and delegates to the appropriate language-specific parser.]
// Architecture: [This component is now a lightweight dispatcher, fulfilling FR4. It encapsulates the logic for choosing a parser, making the system extensible to new languages.]
// Dependencies: [crate::errors, crate::model, crate::components::parsers, std::path.]
use crate::components::parsers::{rust_parser, ts_parser};
use crate::errors::SecondaryMindError;
use crate::model::symbol::Symbol;
use std::path::Path;

/// The Codebase Cartographer is responsible for parsing files and building the symbolic map.
/// It acts as a dispatcher, selecting the correct parser based on file extension.
pub struct CodebaseCartographer {}

impl CodebaseCartographer {
    pub fn new() -> Self {
        Self {}
    }

    /// Parses a single source file by dispatching to the correct language-specific parser.
    pub fn parse_file(&self, file_path: &Path) -> Result<Vec<Symbol>, SecondaryMindError> {
        let extension = file_path.extension().and_then(|s| s.to_str());

        match extension {
            Some("rs") => rust_parser::parse_rust_file(file_path),
            Some("ts" | "tsx" | "js" | "jsx") => ts_parser::parse_ts_file(file_path),
            _ => Ok(vec![]), // Ignore unsupported file types
        }
    }
}
// Integration: [This is a central component instantiated by consumers like the `desktop` crate's `analyze_project` command. It uses the `parsers` submodule.]
// Notes: [The logic is now much cleaner. Adding a new language is as simple as adding another match arm and a corresponding parser module.]
