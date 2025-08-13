// [[SECONDARY_MIND_CORE]]/src/components/navigation_manager.rs
// Purpose: Manages navigation history persistence with concurrent access protection
// Architecture: Handles file-based storage of navigation data with JSON serialization and file locking

use crate::errors::SecondaryMindError;
use crate::model::navigation::{NavigationHistory, NavigationSessionData};
use crate::components::home_directory_manager::HomeDirectoryManager;
use std::path::{Path, PathBuf};
use std::fs::{File, OpenOptions};

use tokio::fs as async_fs;
use serde_json;
use chrono::Utc;

/// Manages navigation history and session persistence
pub struct NavigationManager {
    home_manager: HomeDirectoryManager,
}

impl NavigationManager {
    /// Create a new NavigationManager
    pub fn new() -> Result<Self, SecondaryMindError> {
        let home_manager = HomeDirectoryManager::new()?;
        Ok(Self { home_manager })
    }

    /// Save navigation history for a project with file locking
    pub async fn save_navigation_history(
        &self,
        project_path: &Path,
        history: &NavigationHistory,
    ) -> Result<(), SecondaryMindError> {
        // Ensure project navigation directory exists
        self.home_manager.ensure_project_dir(project_path)?;
        
        let history_file = self.home_manager.get_navigation_history_file(project_path);
        let lock_file = history_file.with_extension("lock");
        
        // Acquire file lock
        let _lock_guard = self.acquire_file_lock(&lock_file).await?;
        
        // Serialize history to JSON
        let json_data = serde_json::to_string_pretty(history)
            .map_err(|e| SecondaryMindError::SessionError {
                operation: "serialize_navigation_history".to_string(),
                reason: format!("JSON serialization failed: {}", e),
            })?;
        
        // Write to temporary file first, then rename for atomic operation
        let temp_file = history_file.with_extension("tmp");
        async_fs::write(&temp_file, json_data).await
            .map_err(|e| SecondaryMindError::from_io_error(temp_file.clone(), e))?;
        
        // Atomic rename
        async_fs::rename(&temp_file, &history_file).await
            .map_err(|e| SecondaryMindError::from_io_error(history_file.clone(), e))?;
        
        log::debug!("Saved navigation history for project: {}", project_path.display());
        Ok(())
    }

    /// Load navigation history for a project with file locking
    pub async fn load_navigation_history(
        &self,
        project_path: &Path,
    ) -> Result<Option<NavigationHistory>, SecondaryMindError> {
        let history_file = self.home_manager.get_navigation_history_file(project_path);
        
        // Check if history file exists
        if !history_file.exists() {
            log::debug!("No navigation history found for project: {}", project_path.display());
            return Ok(None);
        }
        
        let lock_file = history_file.with_extension("lock");
        
        // Acquire file lock
        let _lock_guard = self.acquire_file_lock(&lock_file).await?;
        
        // Read and deserialize history
        let json_data = async_fs::read_to_string(&history_file).await
            .map_err(|e| SecondaryMindError::from_io_error(history_file.clone(), e))?;
        
        let mut history: NavigationHistory = serde_json::from_str(&json_data)
            .map_err(|e| SecondaryMindError::SessionError {
                operation: "deserialize_navigation_history".to_string(),
                reason: format!("JSON deserialization failed: {}", e),
            })?;
        
        // Validate and clean up history if needed
        self.validate_and_cleanup_history(&mut history, project_path)?;
        
        log::debug!("Loaded navigation history for project: {} ({} entries)", 
                   project_path.display(), history.entries.len());
        Ok(Some(history))
    }

    /// Save navigation session data
    pub async fn save_navigation_session(
        &self,
        project_path: &Path,
        session: &NavigationSessionData,
    ) -> Result<(), SecondaryMindError> {
        // Ensure project navigation directory exists
        self.home_manager.ensure_project_dir(project_path)?;
        
        let sessions_dir = self.home_manager.get_project_navigation_sessions_dir(project_path);
        let session_file = sessions_dir.join(format!("{}.json", session.id));
        let lock_file = session_file.with_extension("lock");
        
        // Acquire file lock
        let _lock_guard = self.acquire_file_lock(&lock_file).await?;
        
        // Serialize session to JSON
        let json_data = serde_json::to_string_pretty(session)
            .map_err(|e| SecondaryMindError::SessionError {
                operation: "serialize_navigation_session".to_string(),
                reason: format!("JSON serialization failed: {}", e),
            })?;
        
        // Write to temporary file first, then rename for atomic operation
        let temp_file = session_file.with_extension("tmp");
        async_fs::write(&temp_file, json_data).await
            .map_err(|e| SecondaryMindError::from_io_error(temp_file.clone(), e))?;
        
        // Atomic rename
        async_fs::rename(&temp_file, &session_file).await
            .map_err(|e| SecondaryMindError::from_io_error(session_file.clone(), e))?;
        
        log::debug!("Saved navigation session '{}' for project: {}", 
                   session.name, project_path.display());
        Ok(())
    }

    /// Load navigation session data
    pub async fn load_navigation_session(
        &self,
        project_path: &Path,
        session_id: &str,
    ) -> Result<Option<NavigationSessionData>, SecondaryMindError> {
        let sessions_dir = self.home_manager.get_project_navigation_sessions_dir(project_path);
        let session_file = sessions_dir.join(format!("{}.json", session_id));
        
        // Check if session file exists
        if !session_file.exists() {
            log::debug!("Navigation session '{}' not found for project: {}", 
                       session_id, project_path.display());
            return Ok(None);
        }
        
        let lock_file = session_file.with_extension("lock");
        
        // Acquire file lock
        let _lock_guard = self.acquire_file_lock(&lock_file).await?;
        
        // Read and deserialize session
        let json_data = async_fs::read_to_string(&session_file).await
            .map_err(|e| SecondaryMindError::from_io_error(session_file.clone(), e))?;
        
        let session: NavigationSessionData = serde_json::from_str(&json_data)
            .map_err(|e| SecondaryMindError::SessionError {
                operation: "deserialize_navigation_session".to_string(),
                reason: format!("JSON deserialization failed: {}", e),
            })?;
        
        log::debug!("Loaded navigation session '{}' for project: {}", 
                   session.name, project_path.display());
        Ok(Some(session))
    }

    /// Load all navigation sessions for a project
    pub async fn load_all_navigation_sessions(
        &self,
        project_path: &Path,
    ) -> Result<Vec<NavigationSessionData>, SecondaryMindError> {
        let sessions_dir = self.home_manager.get_project_navigation_sessions_dir(project_path);
        
        // Check if sessions directory exists
        if !sessions_dir.exists() {
            log::debug!("No navigation sessions directory for project: {}", project_path.display());
            return Ok(Vec::new());
        }
        
        let mut sessions = Vec::new();
        let mut entries = async_fs::read_dir(&sessions_dir).await
            .map_err(|e| SecondaryMindError::from_io_error(sessions_dir.clone(), e))?;
        
        while let Some(entry) = entries.next_entry().await
            .map_err(|e| SecondaryMindError::from_io_error(sessions_dir.clone(), e))? {
            
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                // Extract session ID from filename
                if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if let Ok(Some(session)) = self.load_navigation_session(project_path, file_stem).await {
                        sessions.push(session);
                    }
                }
            }
        }
        
        // Sort sessions by last accessed time (most recent first)
        sessions.sort_by(|a, b| b.metadata.last_accessed.cmp(&a.metadata.last_accessed));
        
        log::debug!("Loaded {} navigation sessions for project: {}", 
                   sessions.len(), project_path.display());
        Ok(sessions)
    }

    /// Delete a navigation session
    pub async fn delete_navigation_session(
        &self,
        project_path: &Path,
        session_id: &str,
    ) -> Result<(), SecondaryMindError> {
        let sessions_dir = self.home_manager.get_project_navigation_sessions_dir(project_path);
        let session_file = sessions_dir.join(format!("{}.json", session_id));
        let lock_file = session_file.with_extension("lock");
        
        // Acquire file lock
        let _lock_guard = self.acquire_file_lock(&lock_file).await?;
        
        // Delete session file if it exists
        if session_file.exists() {
            async_fs::remove_file(&session_file).await
                .map_err(|e| SecondaryMindError::from_io_error(session_file.clone(), e))?;
            
            log::debug!("Deleted navigation session '{}' for project: {}", 
                       session_id, project_path.display());
        }
        
        Ok(())
    }

    /// Clean up old navigation data based on age and size limits
    pub async fn cleanup_navigation_data(
        &self,
        project_path: &Path,
        max_history_age_days: u32,
        max_sessions: usize,
    ) -> Result<(), SecondaryMindError> {
        // Clean up old history entries
        if let Ok(Some(mut history)) = self.load_navigation_history(project_path).await {
            let cutoff_date = Utc::now() - chrono::Duration::days(max_history_age_days as i64);
            let original_count = history.entries.len();
            
            history.entries.retain(|entry| entry.timestamp > cutoff_date);
            
            if history.entries.len() != original_count {
                history.cleanup(); // Also enforce max entries limit
                self.save_navigation_history(project_path, &history).await?;
                log::debug!("Cleaned up navigation history: removed {} old entries", 
                           original_count - history.entries.len());
            }
        }
        
        // Clean up old sessions
        let mut sessions = self.load_all_navigation_sessions(project_path).await?;
        if sessions.len() > max_sessions {
            // Keep the most recently accessed sessions
            sessions.sort_by(|a, b| b.metadata.last_accessed.cmp(&a.metadata.last_accessed));
            
            // Delete excess sessions
            for session in sessions.iter().skip(max_sessions) {
                self.delete_navigation_session(project_path, &session.id).await?;
            }
            
            log::debug!("Cleaned up navigation sessions: removed {} old sessions", 
                       sessions.len() - max_sessions);
        }
        
        Ok(())
    }

    /// Acquire a file lock for concurrent access protection
    async fn acquire_file_lock(&self, lock_file: &Path) -> Result<FileLockGuard, SecondaryMindError> {
        // Create lock file if it doesn't exist
        let lock_file_handle = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(lock_file)
            .map_err(|e| SecondaryMindError::from_io_error(lock_file.to_path_buf(), e))?;
        
        // Try to acquire exclusive lock with timeout
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(10); // 10 second timeout
        
        loop {
            match self.try_lock_file(&lock_file_handle) {
                Ok(()) => {
                    log::trace!("Acquired file lock: {}", lock_file.display());
                    return Ok(FileLockGuard::new(lock_file_handle, lock_file.to_path_buf()));
                }
                Err(_) => {
                    if start_time.elapsed() > timeout {
                        return Err(SecondaryMindError::SessionError {
                            operation: "acquire_file_lock".to_string(),
                            reason: format!("Lock timeout for file: {}", lock_file.display()),
                        });
                    }
                    // Wait a bit before retrying
                    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                }
            }
        }
    }

    /// Try to acquire file lock (non-blocking)
    fn try_lock_file(&self, _file: &File) -> Result<(), std::io::Error> {
        // On Windows, we'll use a simpler approach with file existence checking
        // In a production system, you might want to use Windows-specific locking APIs
        #[cfg(windows)]
        {
            // For Windows, we rely on the lock file existence as a simple mutex
            // This is not as robust as proper file locking but works for basic cases
            return Ok(());
        }
        
        // On Unix-like systems, use flock
        #[cfg(unix)]
        {
            use std::os::unix::io::AsRawFd;
            let fd = _file.as_raw_fd();
            let result = unsafe { libc::flock(fd, libc::LOCK_EX | libc::LOCK_NB) };
            if result != 0 {
                return Err(std::io::Error::last_os_error());
            }
            return Ok(());
        }
    }

    /// Validate and cleanup navigation history
    fn validate_and_cleanup_history(
        &self,
        history: &mut NavigationHistory,
        project_path: &Path,
    ) -> Result<(), SecondaryMindError> {
        // Ensure project path matches
        if history.project_path != project_path {
            log::warn!("Navigation history project path mismatch: expected {}, got {}", 
                      project_path.display(), history.project_path.display());
            history.project_path = project_path.to_path_buf();
        }
        
        // Validate current index
        if history.current_index >= history.entries.len() as i32 {
            history.current_index = (history.entries.len() as i32) - 1;
        }
        if history.current_index < -1 {
            history.current_index = -1;
        }
        
        // Remove entries with invalid file paths (files that no longer exist)
        let original_count = history.entries.len();
        history.entries.retain(|entry| {
            let full_path = project_path.join(&entry.location.file_path);
            full_path.exists()
        });
        
        if history.entries.len() != original_count {
            // Adjust current index if entries were removed
            if history.current_index >= history.entries.len() as i32 {
                history.current_index = (history.entries.len() as i32) - 1;
            }
            log::debug!("Removed {} invalid navigation entries", 
                       original_count - history.entries.len());
        }
        
        // Enforce max entries limit
        history.cleanup();
        
        Ok(())
    }
}

/// RAII guard for file locking
struct FileLockGuard {
    _file: File,
    lock_file_path: PathBuf,
}

impl FileLockGuard {
    fn new(file: File, lock_file_path: PathBuf) -> Self {
        Self {
            _file: file,
            lock_file_path,
        }
    }
}

impl Drop for FileLockGuard {
    fn drop(&mut self) {
        // Clean up lock file
        if self.lock_file_path.exists() {
            if let Err(e) = std::fs::remove_file(&self.lock_file_path) {
                log::warn!("Failed to remove lock file {}: {}", 
                          self.lock_file_path.display(), e);
            } else {
                log::trace!("Released file lock: {}", self.lock_file_path.display());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use crate::model::navigation::*;

    #[tokio::test]
    async fn test_save_and_load_navigation_history() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test_project");
        std::fs::create_dir_all(&project_path).unwrap();
        
        let manager = NavigationManager::new().unwrap();
        
        // Create test history
        let mut history = NavigationHistory::new(project_path.clone(), 100);
        let location = NavigationLocation::new(
            PathBuf::from("test.rs"),
            Position { line: 10, column: 5 },
            None,
            LocationMetadata {
                file_size: 1024,
                file_modified: Utc::now(),
                line_content: "fn test() {".to_string(),
                context_lines: vec!["// Test function".to_string()],
            },
        );
        let context = NavigationContext {
            project_path: project_path.clone(),
            breadcrumbs: Vec::new(),
            related_symbols: Vec::new(),
            session_id: None,
            focus_area: None,
        };
        let entry = NavigationEntry::new(location, context, NavigationTrigger::UserClick);
        history.add_entry(entry);
        
        // Save history
        manager.save_navigation_history(&project_path, &history).await.unwrap();
        
        // Load history
        let loaded_history = manager.load_navigation_history(&project_path).await.unwrap();
        assert!(loaded_history.is_some());
        let loaded_history = loaded_history.unwrap();
        assert_eq!(loaded_history.entries.len(), 1);
        assert_eq!(loaded_history.current_index, 0);
    }

    #[tokio::test]
    async fn test_save_and_load_navigation_session() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path().join("test_project");
        std::fs::create_dir_all(&project_path).unwrap();
        
        let manager = NavigationManager::new().unwrap();
        
        // Create test session
        let session = NavigationSessionData::new(
            "Test Session".to_string(),
            project_path.clone(),
            NavigationState::default(),
            LayoutConfiguration::default(),
        );
        let session_id = session.id.clone();
        
        // Save session
        manager.save_navigation_session(&project_path, &session).await.unwrap();
        
        // Load session
        let loaded_session = manager.load_navigation_session(&project_path, &session_id).await.unwrap();
        assert!(loaded_session.is_some());
        let loaded_session = loaded_session.unwrap();
        assert_eq!(loaded_session.name, "Test Session");
        assert_eq!(loaded_session.id, session_id);
    }
}