// desktop/src/lib.rs

use std::sync::Mutex;
use secondary_mind_core::model::project::Project; // <-- CORRECTED: Removed 'crate::'

pub mod commands;
pub mod startup;

// Global application state managed by Tauri
pub struct AppState {
    pub current_project: Mutex<Option<Project>>,
}