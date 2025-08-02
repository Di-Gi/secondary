// [[SECONDARY_MIND]]/src/lib.rs
// Purpose: Declares the crate's library structure, making modules accessible to the main binary and other potential consumers.
// Architecture: This file acts as the root of the library crate, defining the public API and internal module hierarchy.
// Dependencies: None directly, but it references all sub-modules.

pub mod components;
pub mod errors;
pub mod model;

// Integration: Exposes the core modules (components, errors, model) for use by `main.rs` and potentially other parts of the system like a test suite.
// Notes: As the system grows, this file will be the central point for organizing the library's structure.