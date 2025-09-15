// [[SECONDARY_MIND_DESKTOP]]/src/startup.rs
// Purpose: Manages the splash window lifecycle and application startup sequence.
// Architecture: Simple state machine that handles splash -> main window transition.
// Dependencies: Tauri window management.

use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};
use std::time::Duration;

pub struct StartupManager {
    app_handle: AppHandle,
}

impl StartupManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    /// Initialize the startup sequence - create main window and show splash
    pub fn initialize(&self) -> tauri::Result<()> {
        // Create the main window with platform-specific settings
        self.create_main_window()?;

        // Show splash window
        if let Some(splash_window) = self.app_handle.get_window("splash") {
            splash_window.show()?;
            splash_window.set_focus()?;
        }

        Ok(())
    }

    /// Create the main window with platform-specific configurations
    fn create_main_window(&self) -> tauri::Result<()> {
        // Use conditional compilation to define the main window
        #[cfg(target_os = "macos")]
        {
            let _window = WindowBuilder::new(
                &self.app_handle,
                "main", // The window label
                WindowUrl::App("index.html".into()),
            )
            .title("Secondary Mind")
            .inner_size(1200.0, 900.0)
            .min_inner_size(800.0, 600.0)
            .center()
            .resizable(true)
            .fullscreen(false)
            .visible(false)
            .decorations(true)
            .transparent(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .build()
            .expect("Failed to create main window on macOS");
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _window = WindowBuilder::new(
                &self.app_handle,
                "main", // The window label
                WindowUrl::App("index.html".into()),
            )
            .title("Secondary Mind")
            .inner_size(1200.0, 900.0)
            .min_inner_size(800.0, 600.0)
            .center()
            .resizable(true)
            .fullscreen(false)
            .visible(false)
            .decorations(false)
            .transparent(false)
            .build()
            .expect("Failed to create main window on Windows/Linux");
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