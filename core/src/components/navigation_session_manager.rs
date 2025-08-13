// [[SECONDARY_MIND_CORE]]/src/components/navigation_session_manager.rs
// Purpose: Manages navigation-specific sessions with persistence and organization by project
// Architecture: Extension of SessionManager for navigation-specific session data handling

use crate::errors::SecondaryMindError;
use crate::model::navigation_session::{NavigationSessionData, NavigationSession};
use crate::components::session_manager::{SessionManager, SessionConfig};
use crate::components::home_directory_manager::HomeDirectoryManager;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tokio::sync::RwLock;

/// Metadata for navigation sessions organized by project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSessionMetadata {
    /// Session ID
    pub id: String,
    /// Session name
    pub name: String,
    /// Project path this session belongs to
    pub project_path: String,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last access timestamp
    pub last_accessed: DateTime<Utc>,
    /// Session file size in bytes
    pub file_size: u64,
    /// Number of navigation locations in session
    pub location_count: usize,
}

/// Configuration for navigation session management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSessionConfig {
    /// Maximum number of sessions per project
    pub max_sessions_per_project: usize,
    /// How long to keep inactive sessions (in days)
    pub session_retention_days: i64,
    /// Whether to enable automatic session cleanup
    pub auto_cleanup_enabled: bool,
    /// Whether to enable session validation on load
    pub validate_on_load: bool,
}

impl Default for NavigationSessionConfig {
    fn default() -> Self {
        Self {
            max_sessions_per_project: 20,
            session_retention_days: 90,
            auto_cleanup_enabled: true,
            validate_on_load: true,
        }
    }
}

/// Manages navigation sessions with project-based organization
pub struct NavigationSessionManager {
    /// Base session manager for core functionality
    session_manager: SessionManager,
    /// In-memory cache of navigation sessions by project
    navigation_sessions: RwLock<HashMap<String, HashMap<String, NavigationSessionData>>>,
    /// Navigation-specific configuration
    config: NavigationSessionConfig,
    /// Storage directory for navigation sessions
    storage_dir: PathBuf,
}

impl NavigationSessionManager {
    /// Create a new navigation session manager
    pub fn new(config: NavigationSessionConfig) -> Result<Self> {
        let home_manager = HomeDirectoryManager::new()?;
        let storage_dir = home_manager.get_navigation_sessions_dir()?;
        
        // Ensure storage directory exists
        if !storage_dir.exists() {
            fs::create_dir_all(&storage_dir)?;
        }

        let session_config = SessionConfig {
            max_sessions: config.max_sessions_per_project * 10, // Allow more total sessions
            session_retention_days: config.session_retention_days,
            auto_save_interval_seconds: 30,
            auto_cleanup_enabled: config.auto_cleanup_enabled,
        };

        let session_manager = SessionManager::new(storage_dir.clone(), session_config)?;

        Ok(Self {
            session_manager,
            navigation_sessions: RwLock::new(HashMap::new()),
            config,
            storage_dir,
        })
    }

    /// Save a navigation session for a specific project
    pub async fn save_navigation_session(
        &self,
        project_path: String,
        session: NavigationSessionData,
    ) -> Result<()> {
        // Validate session data
        if self.config.validate_on_load {
            session.validate().map_err(|e| SecondaryMindError::ValidationError(e))?;
        }

        let project_key = self.normalize_project_path(&project_path);
        let session_id = session.id.clone();

        // Update in-memory cache
        {
            let mut sessions = self.navigation_sessions.write().await;
            let project_sessions = sessions.entry(project_key.clone()).or_insert_with(HashMap::new);
            project_sessions.insert(session_id.clone(), session.clone());
        }

        // Persist to disk
        self.save_session_to_disk(&project_key, &session).await?;

        // Cleanup old sessions if needed
        if self.config.auto_cleanup_enabled {
            self.cleanup_project_sessions(&project_key).await?;
        }

        Ok(())
    }

    /// Load a navigation session for a specific project
    pub async fn load_navigation_session(
        &self,
        project_path: String,
        session_id: Option<String>,
    ) -> Result<Option<NavigationSessionData>> {
        let project_key = self.normalize_project_path(&project_path);

        // If no session_id provided, load the most recent session
        let target_session_id = if let Some(id) = session_id {
            id
        } else {
            match self.get_most_recent_session_id(&project_key).await? {
                Some(id) => id,
                None => return Ok(None),
            }
        };

        // Check in-memory cache first
        {
            let sessions = self.navigation_sessions.read().await;
            if let Some(project_sessions) = sessions.get(&project_key) {
                if let Some(session) = project_sessions.get(&target_session_id) {
                    return Ok(Some(session.clone()));
                }
            }
        }

        // Try to load from disk
        if let Some(mut session) = self.load_session_from_disk(&project_key, &target_session_id).await? {
            // Validate if configured
            if self.config.validate_on_load {
                session.validate().map_err(|e| SecondaryMindError::ValidationError(e))?;
            }

            // Update last accessed time
            session.touch();

            // Add to cache
            {
                let mut sessions = self.navigation_sessions.write().await;
                let project_sessions = sessions.entry(project_key).or_insert_with(HashMap::new);
                project_sessions.insert(target_session_id, session.clone());
            }

            return Ok(Some(session));
        }

        Ok(None)
    }

    /// Load all navigation sessions for a specific project
    pub async fn load_all_navigation_sessions(
        &self,
        project_path: String,
    ) -> Result<Vec<NavigationSessionMetadata>> {
        let project_key = self.normalize_project_path(&project_path);
        let project_dir = self.get_project_sessions_dir(&project_key);

        if !project_dir.exists() {
            return Ok(Vec::new());
        }

        let mut sessions = Vec::new();
        let entries = fs::read_dir(&project_dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(session_id) = path.file_stem().and_then(|s| s.to_str()) {
                    if let Some(metadata) = self.get_session_metadata(&project_key, session_id).await? {
                        sessions.push(metadata);
                    }
                }
            }
        }

        // Sort by last accessed (most recent first)
        sessions.sort_by(|a, b| b.last_accessed.cmp(&a.last_accessed));

        Ok(sessions)
    }

    /// Delete a navigation session
    pub async fn delete_navigation_session(
        &self,
        project_path: String,
        session_id: String,
    ) -> Result<()> {
        let project_key = self.normalize_project_path(&project_path);

        // Remove from memory
        {
            let mut sessions = self.navigation_sessions.write().await;
            if let Some(project_sessions) = sessions.get_mut(&project_key) {
                project_sessions.remove(&session_id);
                
                // Remove project entry if no sessions left
                if project_sessions.is_empty() {
                    sessions.remove(&project_key);
                }
            }
        }

        // Remove from disk
        let session_file = self.get_session_file_path(&project_key, &session_id);
        if session_file.exists() {
            fs::remove_file(session_file)?;
        }

        Ok(())
    }

    /// Get metadata for a specific session
    async fn get_session_metadata(
        &self,
        project_key: &str,
        session_id: &str,
    ) -> Result<Option<NavigationSessionMetadata>> {
        let session_file = self.get_session_file_path(project_key, session_id);

        if !session_file.exists() {
            return Ok(None);
        }

        let file_metadata = fs::metadata(&session_file)?;
        let file_size = file_metadata.len();

        // Try to load session to get metadata
        if let Some(session) = self.load_session_from_disk(project_key, session_id).await? {
            let location_count = session.navigation_state.history.entries.len();

            Ok(Some(NavigationSessionMetadata {
                id: session.id,
                name: session.name,
                project_path: project_key.to_string(),
                created_at: session.created_at,
                last_accessed: session.last_accessed,
                file_size,
                location_count,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get the most recent session ID for a project
    async fn get_most_recent_session_id(&self, project_key: &str) -> Result<Option<String>> {
        let sessions = self.load_all_navigation_sessions(project_key.to_string()).await?;
        Ok(sessions.first().map(|s| s.id.clone()))
    }

    /// Clean up old sessions for a project
    async fn cleanup_project_sessions(&self, project_key: &str) -> Result<()> {
        let sessions = self.load_all_navigation_sessions(project_key.to_string()).await?;
        
        if sessions.len() <= self.config.max_sessions_per_project {
            return Ok(());
        }

        // Remove excess sessions (oldest first)
        let excess_count = sessions.len() - self.config.max_sessions_per_project;
        let sessions_to_remove = &sessions[self.config.max_sessions_per_project..];

        for session_metadata in sessions_to_remove {
            let _ = self.delete_navigation_session(
                project_key.to_string(),
                session_metadata.id.clone(),
            ).await;
        }

        Ok(())
    }

    /// Save a session to disk
    async fn save_session_to_disk(
        &self,
        project_key: &str,
        session: &NavigationSessionData,
    ) -> Result<()> {
        let session_file = self.get_session_file_path(project_key, &session.id);
        
        // Ensure project directory exists
        if let Some(parent) = session_file.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        let session_json = serde_json::to_string_pretty(session)?;

        // Write to temporary file first, then rename for atomic operation
        let temp_file = session_file.with_extension("tmp");
        fs::write(&temp_file, session_json)?;
        fs::rename(temp_file, session_file)?;

        Ok(())
    }

    /// Load a session from disk
    async fn load_session_from_disk(
        &self,
        project_key: &str,
        session_id: &str,
    ) -> Result<Option<NavigationSessionData>> {
        let session_file = self.get_session_file_path(project_key, session_id);

        if !session_file.exists() {
            return Ok(None);
        }

        match fs::read_to_string(&session_file) {
            Ok(content) => {
                match serde_json::from_str::<NavigationSessionData>(&content) {
                    Ok(session) => Ok(Some(session)),
                    Err(e) => {
                        log::warn!("Failed to parse navigation session file {}: {}", session_file.display(), e);
                        // Move corrupted file to backup
                        let backup_file = session_file.with_extension("corrupted");
                        let _ = fs::rename(&session_file, backup_file);
                        Ok(None)
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to read navigation session file {}: {}", session_file.display(), e);
                Ok(None)
            }
        }
    }

    /// Get the file path for a session
    fn get_session_file_path(&self, project_key: &str, session_id: &str) -> PathBuf {
        self.get_project_sessions_dir(project_key)
            .join(format!("{}.json", session_id))
    }

    /// Get the directory for a project's sessions
    fn get_project_sessions_dir(&self, project_key: &str) -> PathBuf {
        self.storage_dir.join("navigation").join(project_key)
    }

    /// Normalize project path for consistent storage
    fn normalize_project_path(&self, project_path: &str) -> String {
        // Convert path to a safe directory name
        project_path
            .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_")
            .trim_matches('_')
            .to_string()
    }

    /// Get current configuration
    pub fn get_config(&self) -> &NavigationSessionConfig {
        &self.config
    }

    /// Update configuration
    pub fn update_config(&mut self, config: NavigationSessionConfig) {
        self.config = config;
    }

    /// Get storage directory
    pub fn get_storage_dir(&self) -> &Path {
        &self.storage_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_navigation_session_creation_and_retrieval() {
        let config = NavigationSessionConfig::default();
        let manager = NavigationSessionManager::new(config).unwrap();

        let project_path = "/test/project".to_string();
        let session = NavigationSessionData::new(
            "test-session".to_string(),
            "Test Session".to_string(),
        );

        // Save session
        manager.save_navigation_session(project_path.clone(), session.clone()).await.unwrap();

        // Retrieve session
        let loaded_session = manager.load_navigation_session(
            project_path,
            Some("test-session".to_string()),
        ).await.unwrap();

        assert!(loaded_session.is_some());
        let loaded_session = loaded_session.unwrap();
        assert_eq!(loaded_session.id, "test-session");
        assert_eq!(loaded_session.name, "Test Session");
    }

    #[tokio::test]
    async fn test_load_all_sessions() {
        let config = NavigationSessionConfig::default();
        let manager = NavigationSessionManager::new(config).unwrap();

        let project_path = "/test/project".to_string();

        // Create multiple sessions
        for i in 0..3 {
            let session = NavigationSessionData::new(
                format!("session-{}", i),
                format!("Session {}", i),
            );
            manager.save_navigation_session(project_path.clone(), session).await.unwrap();
        }

        // Load all sessions
        let sessions = manager.load_all_navigation_sessions(project_path).await.unwrap();
        assert_eq!(sessions.len(), 3);
    }

    #[tokio::test]
    async fn test_session_deletion() {
        let config = NavigationSessionConfig::default();
        let manager = NavigationSessionManager::new(config).unwrap();

        let project_path = "/test/project".to_string();
        let session = NavigationSessionData::new(
            "test-session".to_string(),
            "Test Session".to_string(),
        );

        // Save session
        manager.save_navigation_session(project_path.clone(), session).await.unwrap();

        // Verify it exists
        let loaded_session = manager.load_navigation_session(
            project_path.clone(),
            Some("test-session".to_string()),
        ).await.unwrap();
        assert!(loaded_session.is_some());

        // Delete session
        manager.delete_navigation_session(
            project_path.clone(),
            "test-session".to_string(),
        ).await.unwrap();

        // Verify it's gone
        let loaded_session = manager.load_navigation_session(
            project_path,
            Some("test-session".to_string()),
        ).await.unwrap();
        assert!(loaded_session.is_none());
    }
}