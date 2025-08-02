// [[SECONDARY_MIND_CORE]]/src/components/home_directory_manager.rs
// Purpose: Manages the .secondary directory in user's home, ensuring proper initialization and structure.
// Architecture: Singleton-style manager that handles directory creation, validation, and path resolution.
// Dependencies: std::path, std::fs, dirs crate for cross-platform home directory detection.

use crate::errors::SecondaryMindError;
use std::fs;
use std::path::{Path, PathBuf};

/// Manages the Secondary Mind home directory structure
pub struct HomeDirectoryManager {
    secondary_dir: PathBuf,
}

impl HomeDirectoryManager {
    /// Creates a new HomeDirectoryManager and ensures the .secondary directory exists
    pub fn new() -> Result<Self, SecondaryMindError> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| SecondaryMindError::ConfigError("Could not determine home directory".to_string()))?;
        
        let secondary_dir = home_dir.join(".secondary");
        
        // Create the main .secondary directory if it doesn't exist
        if !secondary_dir.exists() {
            fs::create_dir_all(&secondary_dir).map_err(|e| {
                SecondaryMindError::IoError {
                    path: secondary_dir.clone(),
                    source: e,
                }
            })?;
            log::info!("Created .secondary directory at: {}", secondary_dir.display());
        }
        
        // Create subdirectories
        let subdirs = ["projects", "notes", "cache", "config"];
        for subdir in &subdirs {
            let path = secondary_dir.join(subdir);
            if !path.exists() {
                fs::create_dir_all(&path).map_err(|e| {
                    SecondaryMindError::IoError {
                        path: path.clone(),
                        source: e,
                    }
                })?;
                log::debug!("Created subdirectory: {}", path.display());
            }
        }
        
        Ok(Self { secondary_dir })
    }
    
    /// Gets the path to the main .secondary directory
    pub fn get_secondary_dir(&self) -> &Path {
        &self.secondary_dir
    }
    
    /// Gets the path to the projects directory
    pub fn get_projects_dir(&self) -> PathBuf {
        self.secondary_dir.join("projects")
    }
    
    /// Gets the path to the notes directory
    pub fn get_notes_dir(&self) -> PathBuf {
        self.secondary_dir.join("notes")
    }
    
    /// Gets the path to the cache directory
    pub fn get_cache_dir(&self) -> PathBuf {
        self.secondary_dir.join("cache")
    }
    
    /// Gets the path to the config directory
    pub fn get_config_dir(&self) -> PathBuf {
        self.secondary_dir.join("config")
    }
    
    /// Generates a unique project ID from a project path
    pub fn generate_project_id(project_path: &Path) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        project_path.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
    
    /// Gets the project-specific directory for a given project path
    pub fn get_project_dir(&self, project_path: &Path) -> PathBuf {
        let project_id = Self::generate_project_id(project_path);
        self.get_projects_dir().join(project_id)
    }
    
    /// Gets the notes directory for a specific project
    pub fn get_project_notes_dir(&self, project_path: &Path) -> PathBuf {
        let project_id = Self::generate_project_id(project_path);
        self.get_notes_dir().join(project_id)
    }
    
    /// Ensures a project-specific directory exists
    pub fn ensure_project_dir(&self, project_path: &Path) -> Result<PathBuf, SecondaryMindError> {
        let project_dir = self.get_project_dir(project_path);
        let notes_dir = self.get_project_notes_dir(project_path);
        
        // Create project directory
        if !project_dir.exists() {
            fs::create_dir_all(&project_dir).map_err(|e| {
                SecondaryMindError::IoError {
                    path: project_dir.clone(),
                    source: e,
                }
            })?;
        }
        
        // Create notes directory
        if !notes_dir.exists() {
            fs::create_dir_all(&notes_dir).map_err(|e| {
                SecondaryMindError::IoError {
                    path: notes_dir.clone(),
                    source: e,
                }
            })?;
        }
        
        Ok(project_dir)
    }
}

// Integration: Used by ProjectConfigurationService and other components that need access to the .secondary directory structure.
// Notes: Uses dirs crate for cross-platform home directory detection and creates all necessary subdirectories on initialization.