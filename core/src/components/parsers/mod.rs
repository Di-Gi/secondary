// [[PROJECT_NAME]]/core/src/components/parsers/mod.rs
// Purpose: [Declares the modules within the new `parsers` submodule.]
// Architecture: [This module encapsulates all language-specific parsing logic, promoting separation of concerns and extensibility.]
// Dependencies: [None.]
pub mod rust_parser;
pub mod ts_parser;

// Integration: [These modules are consumed by the `CodebaseCartographer` to parse files based on their extension.]
// Notes: [This structure makes it easy to add new language parsers in the future (e.g., `python_parser.rs`).]
