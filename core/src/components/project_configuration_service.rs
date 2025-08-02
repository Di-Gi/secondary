// [[SECONDARY_MIND_CORE]]/src/components/project_configuration_service.rs
// Purpose: Manages project configurations, metadata, and recent projects tracking.
// Architecture: Service that handles project config CRUD operations and maintains recent projects list.
// Dependencies: serde for JSON serialization, chrono for timestamps, home directory manager.

use crate::components::home_directory_manager::HomeDirectoryManager;
use crate::errors::SecondaryMindError;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub symbol_count: usize,
    pub git_branch: Option<String>,
    pub git_status: Option<String>,
    pub notes_count: usize,
    pub settings: ProjectSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub auto_analyze: bool,
    pub analysis_cache_enabled: bool,
    pub excluded_patterns: Vec<String>,
    pub custom_tags: Vec<String>,
}

impl Default for ProjectSettings {
    fn default() -> Self {
        Self {
            auto_analyze: true,
            analysis_cache_enabled: true,
            excluded_patterns: vec![
                "node_modules".to_string(),
                "target".to_string(),
                ".git".to_string(),
                "dist".to_string(),
                "build".to_string(),
            ],
            custom_tags: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProjects {
    pub projects: Vec<ProjectConfig>,
    pub last_updated: DateTime<Utc>,
}

impl Default for RecentProjects {
    fn default() -> Self {
        Self {
            projects: Vec::new(),
            last_updated: Utc::now(),
        }
    }
}

/// Service for managing project configurations and recent projects
pub struct ProjectConfigurationService {
    home_manager: HomeDirectoryManager,
    recent_projects_path: PathBuf,
}

impl ProjectConfigurationService {
    /// Creates a new ProjectConfigurationService
    pub fn new() -> Result<Self, SecondaryMindError> {
        let home_manager = HomeDirectoryManager::new()?;
        let recent_projects_path = home_manager.get_config_dir().join("recent_projects.json");
        
        Ok(Self {
            home_manager,
            recent_projects_path,
        })
    }
    
    /// Creates or updates a project configuration
    pub fn save_project_config(&self, project_path: &Path, symbol_count: usize, git_info: Option<(String, String)>) -> Result<ProjectConfig, SecondaryMindError> {
        let project_id = HomeDirectoryManager::generate_project_id(project_path);
        let project_name = project_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Project")
            .to_string();
        
        // Ensure project directory exists
        self.home_manager.ensure_project_dir(project_path)?;
        
        // Count existing notes
        let notes_dir = self.home_manager.get_project_notes_dir(project_path);
        let notes_count = if notes_dir.exists() {
            fs::read_dir(&notes_dir)
                .map_err(|e| SecondaryMindError::IoError { path: notes_dir.clone(), source: e })?
                .filter_map(|entry| entry.ok())
                .filter(|entry| {
                    entry.path().extension()
                        .and_then(|ext| ext.to_str())
                        .map(|ext| ext == "json")
                        .unwrap_or(false)
                })
                .count()
        } else {
            0
        };
        
        let now = Utc::now();
        let (git_branch, git_status) = git_info.unzip();
        
        // Load existing config or create new one
        let project_dir = self.home_manager.get_project_dir(project_path);
        let config_path = project_dir.join("config.json");
        
        let mut config = if config_path.exists() {
            let content = fs::read_to_string(&config_path).map_err(|e| {
                SecondaryMindError::IoError { path: config_path.clone(), source: e }
            })?;
            
            // Clone values before moving into closure
            let git_branch_clone = git_branch.clone();
            let git_status_clone = git_status.clone();
            let project_id_clone = project_id.clone();
            let project_name_clone = project_name.clone();
            
            serde_json::from_str::<ProjectConfig>(&content).unwrap_or_else(|_| {
                // If parsing fails, create a new config but preserve the creation time
                ProjectConfig {
                    id: project_id_clone,
                    name: project_name_clone,
                    path: project_path.to_string_lossy().to_string(),
                    created_at: now,
                    last_accessed: now,
                    symbol_count,
                    git_branch: git_branch_clone,
                    git_status: git_status_clone,
                    notes_count,
                    settings: ProjectSettings::default(),
                }
            })
        } else {
            ProjectConfig {
                id: project_id.clone(),
                name: project_name.clone(),
                path: project_path.to_string_lossy().to_string(),
                created_at: now,
                last_accessed: now,
                symbol_count,
                git_branch: git_branch.clone(),
                git_status: git_status.clone(),
                notes_count,
                settings: ProjectSettings::default(),
            }
        };
        
        // Update mutable fields
        config.last_accessed = now;
        config.symbol_count = symbol_count;
        config.git_branch = git_branch;
        config.git_status = git_status;
        config.notes_count = notes_count;
        
        // Save project config
        let config_json = serde_json::to_string_pretty(&config).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to serialize project config: {}", e))
        })?;
        
        fs::write(&config_path, config_json).map_err(|e| {
            SecondaryMindError::IoError { path: config_path, source: e }
        })?;
        
        // Update recent projects
        self.update_recent_projects(&config)?;
        
        Ok(config)
    }
    
    /// Loads recent projects from storage
    pub fn load_recent_projects(&self) -> Result<RecentProjects, SecondaryMindError> {
        if !self.recent_projects_path.exists() {
            return Ok(RecentProjects::default());
        }
        
        let content = fs::read_to_string(&self.recent_projects_path).map_err(|e| {
            SecondaryMindError::IoError { path: self.recent_projects_path.clone(), source: e }
        })?;
        
        serde_json::from_str(&content).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to parse recent projects: {}", e))
        })
    }
    
    /// Updates the recent projects list with a new or updated project
    fn update_recent_projects(&self, project_config: &ProjectConfig) -> Result<(), SecondaryMindError> {
        let mut recent = self.load_recent_projects()?;
        
        // Remove existing entry for this project
        recent.projects.retain(|p| p.id != project_config.id);
        
        // Add updated project at the beginning
        recent.projects.insert(0, project_config.clone());
        
        // Keep only the 20 most recent projects
        recent.projects.truncate(20);
        recent.last_updated = Utc::now();
        
        // Save updated recent projects
        let json = serde_json::to_string_pretty(&recent).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to serialize recent projects: {}", e))
        })?;
        
        fs::write(&self.recent_projects_path, json).map_err(|e| {
            SecondaryMindError::IoError { path: self.recent_projects_path.clone(), source: e }
        })?;
        
        Ok(())
    }
    
    /// Loads a specific project configuration
    pub fn load_project_config(&self, project_path: &Path) -> Result<Option<ProjectConfig>, SecondaryMindError> {
        let project_dir = self.home_manager.get_project_dir(project_path);
        let config_path = project_dir.join("config.json");
        
        if !config_path.exists() {
            return Ok(None);
        }
        
        let content = fs::read_to_string(&config_path).map_err(|e| {
            SecondaryMindError::IoError { path: config_path, source: e }
        })?;
        
        let config = serde_json::from_str(&content).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to parse project config: {}", e))
        })?;
        
        Ok(Some(config))
    }
    
    /// Removes a project from recent projects (but keeps its data)
    pub fn remove_from_recent(&self, project_id: &str) -> Result<(), SecondaryMindError> {
        let mut recent = self.load_recent_projects()?;
        recent.projects.retain(|p| p.id != project_id);
        recent.last_updated = Utc::now();
        
        let json = serde_json::to_string_pretty(&recent).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to serialize recent projects: {}", e))
        })?;
        
        fs::write(&self.recent_projects_path, json).map_err(|e| {
            SecondaryMindError::IoError { path: self.recent_projects_path.clone(), source: e }
        })?;
        
        Ok(())
    }
    
    /// Gets the home directory manager
    pub fn get_home_manager(&self) -> &HomeDirectoryManager {
        &self.home_manager
    }
}

// Integration: Used by Tauri commands to manage project configurations and recent projects data.
// Notes: Provides complete project lifecycle management with persistent storage and recent projects tracking.