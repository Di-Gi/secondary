// [[PROJECT_NAME]]/core/src/model/symbol.rs
// Purpose: [Defines the unified data model for a code symbol, now expanded to support both TypeScript and Rust constructs.]
// Architecture: [This is a central data model for the application. The `SymbolKind` enum is the key to the polyglot engine, allowing the system to represent different language constructs in a unified way.]
// Dependencies: [serde for serialization, std::path for file paths.]
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Represents the kind of symbol discovered in the code.
#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub enum SymbolKind {
    // TypeScript/JavaScript specific
    TSFunction,
    TSClass,
    TSInterface,
    // Rust specific
    Struct,
    Enum,
    Trait,
    Function,
    Impl,
    Module,
    Macro,
    // Generic/Other
    Unknown,
}

/// A representation of a single named entity within the codebase.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    /// The name of the symbol, e.g., "myFunction" or "MyStruct".
    pub identifier: String,
    /// The type of symbol.
    pub kind: SymbolKind,
    /// The location of the symbol definition.
    pub location: SymbolLocation,
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
            SymbolKind::TSFunction => write!(f, "TS Function"),
            SymbolKind::TSClass => write!(f, "TS Class"),
            SymbolKind::TSInterface => write!(f, "TS Interface"),
            SymbolKind::Struct => write!(f, "Struct"),
            SymbolKind::Enum => write!(f, "Enum"),
            SymbolKind::Trait => write!(f, "Trait"),
            SymbolKind::Function => write!(f, "Function"),
            SymbolKind::Impl => write!(f, "Impl"),
            SymbolKind::Module => write!(f, "Module"),
            SymbolKind::Macro => write!(f, "Macro"),
            SymbolKind::Unknown => write!(f, "Unknown"),
        }
    }
}

// Integration: [This model is created by the parsers in `CodebaseCartographer` and consumed by the `desktop` application and frontend UI.]
// Notes: [Adding `Serialize` and `Deserialize` is crucial for passing this data across the Tauri bridge to the frontend.]