// [[SECONDARY_MIND_CORE]]/src/components/session_manager.rs
// Purpose: Manages project sessions with persistence and restoration capabilities
// Architecture: Component for handling session lifecycle, storage, and cleanup

use crate::errors::SecondaryMindError;
use crate::model::session::ProjectSession;
use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::sync::RwLock;

/// Configuration for session management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    /// Maximum number of sessions to keep
    pub max_sessions: usize,
    /// How long to keep inactive sessions (in days)
    pub session_retention_days: i64,
    /// How often to auto-save sessions (in seconds)
    pub auto_save_interval_seconds: u64,
    /// Whether to enable automatic session cleanup
    pub auto_cleanup_enabled: bool,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            max_sessions: 50,
            session_retention_days: 30,
            auto_save_interval_seconds: 30,
            auto_cleanup_enabled: true,
        }
    }
}

/// Manages project sessions with persistence and restoration
pub struct SessionManager {
    /// In-memory cache of active sessions
    sessions: RwLock<HashMap<String, ProjectSession>>,
    /// Directory where sessions are stored
    storage_dir: PathBuf,
    /// Configuration for session management
    config: SessionConfig,
}

impl SessionManager {
    /// Create a new session manager
    pub fn new(storage_dir: PathBuf, config: SessionConfig) -> Result<Self> {
        // Ensure storage directory exists
        if !storage_dir.exists() {
            fs::create_dir_all(&storage_dir)?;
        }

        Ok(Self {
            sessions: RwLock::new(HashMap::new()),
            storage_dir,
            config,
        })
    }

    /// Create a new session for a project
    pub async fn create_session(&self, project_id: String, project_path: PathBuf) -> Result<()> {
        let session = ProjectSession::new(project_id.clone(), project_path);
        
        // Add to in-memory cache
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(project_id.clone(), session.clone());
        }

        // Persist to disk
        self.save_session_to_disk(&session).await?;
        
        Ok(())
    }

    /// Get a session by project ID
    pub async fn get_session(&self, project_id: &str) -> Result<Option<ProjectSession>> {
        // First check in-memory cache
        {
            let sessions = self.sessions.read().await;
            if let Some(session) = sessions.get(project_id) {
                return Ok(Some(session.clone()));
            }
        }

        // Try to load from disk
        if let Some(session) = self.load_session_from_disk(project_id).await? {
            // Add to cache
            {
                let mut sessions = self.sessions.write().await;
                sessions.insert(project_id.to_string(), session.clone());
            }
            return Ok(Some(session));
        }

        Ok(None)
    }

    /// Update an existing session
    pub async fn update_session(&self, session: ProjectSession) -> Result<()> {
        let project_id = session.project_id.clone();
        
        // Update in-memory cache
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(project_id, session.clone());
        }

        // Persist to disk
        self.save_session_to_disk(&session).await?;
        
        Ok(())
    }

    /// Delete a session
    pub async fn delete_session(&self, project_id: &str) -> Result<()> {
        // Remove from memory
        {
            let mut sessions = self.sessions.write().await;
            sessions.remove(project_id);
        }

        // Remove from disk
        let session_file = self.get_session_file_path(project_id);
        if session_file.exists() {
            fs::remove_file(session_file)?;
        }

        Ok(())
    }

    /// List all available sessions
    pub async fn list_sessions(&self) -> Result<Vec<SessionInfo>> {
        let mut session_infos = Vec::new();

        // Read all session files from disk
        let entries = fs::read_dir(&self.storage_dir)?;
        
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(project_id) = path.file_stem().and_then(|s| s.to_str()) {
                    if let Some(session) = self.load_session_from_disk(project_id).await? {
                        session_infos.push(SessionInfo {
                            project_id: session.project_id,
                            project_path: session.project_path,
                            last_updated: session.last_updated,
                            created_at: session.created_at,
                            open_files_count: session.open_files.len(),
                            bookmarks_count: session.bookmarks.len(),
                        });
                    }
                }
            }
        }

        // Sort by last updated (most recent first)
        session_infos.sort_by(|a, b| b.last_updated.cmp(&a.last_updated));
        
        Ok(session_infos)
    }

    /// Restore a session and return the workspace state
    pub async fn restore_session(&self, project_id: &str) -> Result<Option<ProjectSession>> {
        if let Some(mut session) = self.get_session(project_id).await? {
            // Update last accessed time
            session.touch();
            self.update_session(session.clone()).await?;
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// Clean up old and stale sessions
    pub async fn cleanup_sessions(&self) -> Result<CleanupResult> {
        let mut result = CleanupResult {
            removed_count: 0,
            errors: Vec::new(),
        };

        let sessions = self.list_sessions().await?;
        let cutoff_date = Utc::now() - Duration::days(self.config.session_retention_days);
        
        // Remove sessions older than retention period
        for session_info in &sessions {
            if session_info.last_updated < cutoff_date {
                match self.delete_session(&session_info.project_id).await {
                    Ok(_) => result.removed_count += 1,
                    Err(e) => result.errors.push(format!(
                        "Failed to remove session {}: {}", 
                        session_info.project_id, 
                        e
                    )),
                }
            }
        }

        // If we still have too many sessions, remove the oldest ones
        let remaining_sessions: Vec<_> = sessions
            .into_iter()
            .filter(|s| s.last_updated >= cutoff_date)
            .collect();

        if remaining_sessions.len() > self.config.max_sessions {
            let excess_count = remaining_sessions.len() - self.config.max_sessions;
            let sessions_to_remove = &remaining_sessions[self.config.max_sessions..];
            
            for session_info in sessions_to_remove {
                match self.delete_session(&session_info.project_id).await {
                    Ok(_) => result.removed_count += 1,
                    Err(e) => result.errors.push(format!(
                        "Failed to remove excess session {}: {}", 
                        session_info.project_id, 
                        e
                    )),
                }
            }
        }

        Ok(result)
    }

    /// Save a session to disk
    async fn save_session_to_disk(&self, session: &ProjectSession) -> Result<()> {
        let session_file = self.get_session_file_path(&session.project_id);
        let session_json = serde_json::to_string_pretty(session)?;
        
        // Write to a temporary file first, then rename for atomic operation
        let temp_file = session_file.with_extension("tmp");
        fs::write(&temp_file, session_json)?;
        fs::rename(temp_file, session_file)?;
        
        Ok(())
    }

    /// Load a session from disk
    async fn load_session_from_disk(&self, project_id: &str) -> Result<Option<ProjectSession>> {
        let session_file = self.get_session_file_path(project_id);
        
        if !session_file.exists() {
            return Ok(None);
        }

        match fs::read_to_string(&session_file) {
            Ok(content) => {
                match serde_json::from_str::<ProjectSession>(&content) {
                    Ok(session) => Ok(Some(session)),
                    Err(e) => {
                        log::warn!("Failed to parse session file {}: {}", session_file.display(), e);
                        // Move corrupted file to backup
                        let backup_file = session_file.with_extension("corrupted");
                        let _ = fs::rename(&session_file, backup_file);
                        Ok(None)
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to read session file {}: {}", session_file.display(), e);
                Ok(None)
            }
        }
    }

    /// Get the file path for a session
    fn get_session_file_path(&self, project_id: &str) -> PathBuf {
        self.storage_dir.join(format!("{}.json", project_id))
    }

    /// Get session storage directory
    pub fn get_storage_dir(&self) -> &Path {
        &self.storage_dir
    }

    /// Get current configuration
    pub fn get_config(&self) -> &SessionConfig {
        &self.config
    }

    /// Update configuration
    pub fn update_config(&mut self, config: SessionConfig) {
        self.config = config;
    }
}

/// Information about a session for listing purposes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub project_id: String,
    pub project_path: PathBuf,
    pub last_updated: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub open_files_count: usize,
    pub bookmarks_count: usize,
}

/// Result of session cleanup operation
#[derive(Debug)]
pub struct CleanupResult {
    pub removed_count: usize,
    pub errors: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_session_creation_and_retrieval() {
        let temp_dir = TempDir::new().unwrap();
        let config = SessionConfig::default();
        let manager = SessionManager::new(temp_dir.path().to_path_buf(), config).unwrap();

        let project_id = "test-project".to_string();
        let project_path = PathBuf::from("/test/path");

        // Create session
        manager.create_session(project_id.clone(), project_path.clone()).await.unwrap();

        // Retrieve session
        let session = manager.get_session(&project_id).await.unwrap();
        assert!(session.is_some());
        
        let session = session.unwrap();
        assert_eq!(session.project_id, project_id);
        assert_eq!(session.project_path, project_path);
    }

    #[tokio::test]
    async fn test_session_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let config = SessionConfig::default();
        
        let project_id = "test-project".to_string();
        let project_path = PathBuf::from("/test/path");

        // Create session in first manager instance
        {
            let manager = SessionManager::new(temp_dir.path().to_path_buf(), config.clone()).unwrap();
            manager.create_session(project_id.clone(), project_path.clone()).await.unwrap();
        }

        // Create new manager instance and verify session persists
        {
            let manager = SessionManager::new(temp_dir.path().to_path_buf(), config).unwrap();
            let session = manager.get_session(&project_id).await.unwrap();
            assert!(session.is_some());
            
            let session = session.unwrap();
            assert_eq!(session.project_id, project_id);
            assert_eq!(session.project_path, project_path);
        }
    }

    #[tokio::test]
    async fn test_session_cleanup() {
        let temp_dir = TempDir::new().unwrap();
        let mut config = SessionConfig::default();
        config.session_retention_days = 0; // Immediate cleanup
        
        let manager = SessionManager::new(temp_dir.path().to_path_buf(), config).unwrap();

        // Create a session
        let project_id = "test-project".to_string();
        let project_path = PathBuf::from("/test/path");
        manager.create_session(project_id.clone(), project_path).await.unwrap();

        // Wait a bit to ensure timestamp difference
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        // Run cleanup
        let result = manager.cleanup_sessions().await.unwrap();
        assert_eq!(result.removed_count, 1);

        // Verify session is gone
        let session = manager.get_session(&project_id).await.unwrap();
        assert!(session.is_none());
    }
}