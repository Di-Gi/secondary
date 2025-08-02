// [[SECONDARY_MIND_DESKTOP]]/src-tauri/src/model/symbol.rs
// Purpose: Updated symbol model with Serde serialization for Tauri communication.
// Architecture: Enhanced version of the original symbol model with serialization support for frontend communication.
// Dependencies: serde for serialization, std::path for path handling.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Represents the kind of symbol discovered in the code.
#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize)]
pub enum SymbolKind {
    FunctionDeclaration,
    ClassDeclaration,
    InterfaceDeclaration,
    // Future kinds: Variable, Import, Export, etc.
}

/// A representation of a single named entity within the codebase.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    /// The name of the symbol, e.g., "myFunction" or "MyClass".
    pub identifier: String,
    /// The type of symbol.
    pub kind: SymbolKind,
    /// The location of the symbol definition.
    pub location: SymbolLocation,
    // Future fields: exports, dependencies, doc_comments, etc.
}

/// Defines the precise location of a symbol's definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolLocation {
    /// The absolute path to the file containing the symbol.
    pub path: PathBuf,
    /// The starting line number of the symbol definition.
    pub line: usize,
    /// The starting column number of the symbol definition.
    pub column: usize,
}

impl std::fmt::Display for SymbolKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SymbolKind::FunctionDeclaration => write!(f, "Function"),
            SymbolKind::ClassDeclaration => write!(f, "Class"),
            SymbolKind::InterfaceDeclaration => write!(f, "Interface"),
        }
    }
}

// Integration: Used by Tauri commands to serialize symbol data for frontend consumption.
// Notes: Enhanced with Serde traits for seamless JSON serialization across the Tauri bridge.