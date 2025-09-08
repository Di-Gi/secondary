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
    startup::StartupManager,
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
            commands::read_file_content,
            commands::collect_symbol_context,
            commands::create_development_profile,
            commands::load_development_profiles,
            commands::update_development_profile,
            commands::delete_development_profile,
            commands::use_development_profile,
            commands::check_profile_files_status,
            commands::export_profile_context,
            commands::frontend_ready
        ])
        .setup(|app| {
            // Initialize startup manager and show splash screen
            let startup_manager = StartupManager::new(app.handle());
            if let Err(e) = startup_manager.initialize() {
                log::error!("Failed to initialize startup sequence: {}", e);
            }

            #[cfg(debug_assertions)]
            {
                // In debug mode, still open devtools but on the main window when it becomes visible
                let app_handle = app.handle();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
                    if let Some(window) = app_handle.get_window("main") {
                        let _ = window.open_devtools();
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

// Integration: Entry point that now includes all the enhanced commands for persistent project management.
// Notes: The setup process will automatically initialize the .secondary directory structure on first run.