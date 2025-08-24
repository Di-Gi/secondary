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
            commands::read_file_content
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