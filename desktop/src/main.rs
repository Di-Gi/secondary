// [[SECONDARY_MIND_DESKTOP]]/src/main.rs
// Purpose: Enhanced main entry point with initialization of persistent storage systems.
// Architecture: Updated to include the new persistent storage initialization commands.
// Dependencies: Enhanced command set, existing app state and Tauri setup.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use secondary_mind_desktop::{
    commands,
    AppState,
};
use std::sync::Mutex;
use tauri::Manager;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    env_logger::init();

    tauri::Builder::default()
        .manage(AppState {
            current_project: Mutex::new(None),
            navigation_cache: Mutex::new(secondary_mind_core::components::navigation_cache::NavigationCache::new()),
            error_recovery_manager: secondary_mind_core::components::error_recovery_manager::ErrorRecoveryManager::default(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::initialize_app,
            commands::load_recent_projects,
            commands::analyze_project,
            commands::remove_project_from_recent,
            commands::get_project_git_status,
            commands::synthesize_guidance,
            commands::save_project_note,
            commands::load_project_notes,
            commands::delete_project_note,
            commands::search_symbols,
            commands::enhanced_ai_synthesis,
            commands::save_session,
            commands::load_session,
            commands::start_file_watching,
            commands::analyze_file_structure,
            commands::analyze_symbol_relationships,
            commands::analyze_symbol_usage,
            commands::get_enhanced_file_tree,
            commands::save_navigation_history,
            commands::load_navigation_history,
            commands::save_navigation_session,
            commands::load_navigation_session,
            commands::load_all_navigation_sessions,
            commands::delete_navigation_session,
            commands::cleanup_navigation_data,
            commands::analyze_call_hierarchy,
            commands::find_function_callers,
            commands::analyze_inheritance_hierarchy,
            commands::get_class_members,
            commands::find_implementations,
            commands::get_navigation_metrics,
            commands::get_file_git_status,
            commands::get_files_git_status,
            commands::is_git_repository,
            commands::get_git_repository_root,
            commands::get_error_recovery_stats,
            commands::get_error_patterns,
            commands::reset_error_stats,
            commands::test_error_recovery,
            commands::configure_error_logging
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

// Integration: Entry point that now includes all the enhanced commands for persistent project management.
// Notes: The setup process will automatically initialize the .secondary directory structure on first run.