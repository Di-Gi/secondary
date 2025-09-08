// [[SECONDARY_MIND_DESKTOP]]/src/startup.rs
// Purpose: Manages the splash window lifecycle and application startup sequence.
// Architecture: Simple state machine that handles splash -> main window transition.
// Dependencies: Tauri window management.

use tauri::{AppHandle, Manager};
use std::time::Duration;

pub struct StartupManager {
    app_handle: AppHandle,
}

impl StartupManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// Initialize the startup sequence - show splash, hide main window
    pub fn initialize(&self) -> tauri::Result<()> {
        // Ensure main window is hidden initially
        if let Some(main_window) = self.app_handle.get_window("main") {
            main_window.hide()?;
        }

        // Show splash window
        if let Some(splash_window) = self.app_handle.get_window("splash") {
            splash_window.show()?;
            splash_window.set_focus()?;
        }

        Ok(())
    }

    /// Handle the frontend ready signal - transition from splash to main
    pub fn on_frontend_ready(&self) -> tauri::Result<()> {
        let app_handle = self.app_handle.clone();
        
        // Small delay for smooth transition
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(500)).await;
            
            // Show main window
            if let Some(main_window) = app_handle.get_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
            
            // Close splash window
            if let Some(splash_window) = app_handle.get_window("splash") {
                let _ = splash_window.close();
            }
        });

        Ok(())
    }

    /// Force close splash window (fallback)
    pub fn close_splash(&self) -> tauri::Result<()> {
        if let Some(splash_window) = self.app_handle.get_window("splash") {
            splash_window.close()?;
        }
        Ok(())
    }
}

// Integration: Manages the complete startup flow from splash to main application.
// Notes: Uses async timing for smooth transitions, handles window focus properly.