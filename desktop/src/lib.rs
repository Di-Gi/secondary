// desktop/src/lib.rs

use std::sync::Mutex;
use secondary_mind_core::model::project::Project; // <-- CORRECTED: Removed 'crate::'
use secondary_mind_core::components::navigation_cache::NavigationCache;
use secondary_mind_core::components::error_recovery_manager::ErrorRecoveryManager;

pub mod commands;

// Global application state managed by Tauri
pub struct AppState {
    pub current_project: Mutex<Option<Project>>,
    pub navigation_cache: Mutex<NavigationCache>,
    pub error_recovery_manager: ErrorRecoveryManager,
}