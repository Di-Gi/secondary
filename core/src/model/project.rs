// [[SECONDARY_MIND]]/src/model/project.rs
// Purpose: Defines the top-level data structure for a project being analyzed.
// Architecture: Core data model. It has been updated to hold the `symbolic_map` as specified in the implementation plan.
// Dependencies: crate::model::symbol::Symbol, git2, std::path.

use crate::model::symbol::Symbol;
use git2::Repository;
use std::path::{Path, PathBuf};

/// Represents the entire project being analyzed.
pub struct Project {
    /// The absolute path to the root of the project directory.
    pub root: PathBuf,
    /// An active handle to the project's Git repository.
    pub repository: Option<Repository>,
    /// The result of the Codebase Cartographer's analysis: a map of all symbols.
    pub symbolic_map: Vec<Symbol>,
}

impl Project {
    /// Creates a new Project instance.
    pub fn new(path: &Path) -> Result<Self, crate::errors::SecondaryMindError> {
        let absolute_path = path.canonicalize().map_err(|e| {
            crate::errors::SecondaryMindError::from_io_error(path.to_path_buf(), e)
        })?;
        let repository = Repository::open(&absolute_path).ok();

        Ok(Project {
            root: absolute_path,
            repository,
            symbolic_map: Vec::new(), // Starts empty, populated by main.
        })
    }
}
// Integration: The `Project` struct is now the central container for almost all state. It is created in `main` and passed to the `CommandBus`.
// Notes: Holding the symbolic map here makes the Project struct a true "secondary mind" of the codebase state.
