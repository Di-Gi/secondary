// [[SECONDARY_MIND]]/src/components/code_source_controller.rs
// Purpose: Implements the "Code Source Controller" component from the design spec. Manages access to the project's source code and Git repository state.
// Architecture: This is the primary component for fulfilling requirements FR1, FR2, and FR3. It acts as the gateway to the filesystem and Git, abstracting these operations away from the rest of the application.
// Dependencies: crate::errors::SecondaryMindError, crate::model::project::Project, git2.

use crate::errors::SecondaryMindError;
use crate::model::project::Project;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum GitFileStatus {
    Untracked,
    Modified,
    Added,
    Deleted,
    Renamed,
    Copied,
    UpdatedButUnmerged,
    Ignored,
    Clean,
}

#[derive(Debug, Clone)]
pub struct GitStatusCache {
    pub statuses: HashMap<PathBuf, GitFileStatus>,
    pub last_updated: std::time::SystemTime,
    pub cache_duration: std::time::Duration,
}

/// Controller for managing the source code via filesystem and Git.
pub struct CodeSourceController {
    project: Project,
    git_status_cache: Option<GitStatusCache>,
}

impl CodeSourceController {
    /// Initializes the controller for a given project path.
    pub fn new(path: &Path) -> Result<Self, SecondaryMindError> {
        let project = Project::new(path)?;
        Ok(Self { 
            project,
            git_status_cache: None,
        })
    }

    /// Checks the Git status of the project, comparing local to remote.
    /// Fulfills requirement FR2.
    pub fn check_git_status(&self) -> Result<(String, String), SecondaryMindError> {
        let repo = self
            .project
            .repository
            .as_ref()
            .ok_or_else(|| SecondaryMindError::GitError("Not a git repository".to_string()))?;

        // 1. Get local branch name
        let head = repo.head().map_err(|e| SecondaryMindError::GitError(e.to_string()))?;
        let local_branch_name = head.shorthand().unwrap_or("HEAD (detached)").to_string();

        // 2. Find its upstream counterpart
        let local_commit = head.peel_to_commit().map_err(|e| SecondaryMindError::GitError(e.to_string()))?;
        let upstream_branch = repo.branch_upstream_name(head.name().unwrap_or_default())
            .map_err(|_| SecondaryMindError::GitError("Upstream branch not found".to_string()));
        
        if upstream_branch.is_err() {
            return Ok((local_branch_name, "No tracking remote branch configured.".to_string()));
        }

        let upstream_branch_name = upstream_branch.unwrap();
        let upstream_ref_buf = upstream_branch_name.as_str().unwrap().to_string();

        let upstream_commit = repo.find_reference(&upstream_ref_buf)
            .and_then(|r| r.peel_to_commit())
            .map_err(|e| SecondaryMindError::GitError(format!("Could not find commit for upstream ref {}: {}", upstream_ref_buf, e)))?;

        // 3. Compare the two commit OIDs
        let (ahead, behind) = repo.graph_ahead_behind(local_commit.id(), upstream_commit.id())
            .map_err(|e| SecondaryMindError::GitError(e.to_string()))?;

        let remote_status = if ahead > 0 && behind > 0 {
            format!("Diverged from {} ({} ahead, {} behind)", upstream_ref_buf, ahead, behind)
        } else if ahead > 0 {
            format!("Ahead of {} by {} commit(s)", upstream_ref_buf, ahead)
        } else if behind > 0 {
            format!("Behind {} by {} commit(s)", upstream_ref_buf, behind)
        } else {
            format!("Up-to-date with {}", upstream_ref_buf)
        };

        Ok((local_branch_name, remote_status))
    }

    /// Gets the git status for a specific file.
    /// Returns None if not in a git repository or if the file is not tracked.
    pub fn get_file_git_status(&mut self, file_path: &Path) -> Option<GitFileStatus> {
        // Check if we have a git repository
        let repo = self.project.repository.as_ref()?;
        
        // Check cache first
        if let Some(ref cache) = self.git_status_cache {
            if cache.last_updated.elapsed().unwrap_or(cache.cache_duration) < cache.cache_duration {
                if let Some(status) = cache.statuses.get(file_path) {
                    return Some(status.clone());
                }
            }
        }

        // Get relative path from repository root
        let repo_root = self.project.root.clone();
        let relative_path = file_path.strip_prefix(&repo_root).ok()?;

        // Get git status for the file
        match repo.status_file(relative_path) {
            Ok(flags) => Some(self.git_status_from_flags(flags)),
            Err(_) => {
                // File might not be tracked, check if it exists in the working directory
                if file_path.exists() {
                    Some(GitFileStatus::Untracked)
                } else {
                    None
                }
            }
        }
    }

    /// Gets git status for multiple files efficiently.
    /// Returns a HashMap with file paths as keys and their git status as values.
    pub fn get_files_git_status(&mut self, file_paths: &[PathBuf]) -> HashMap<PathBuf, GitFileStatus> {
        let mut result = HashMap::new();
        
        // Check if we have a git repository
        let repo = match self.project.repository.as_ref() {
            Some(repo) => repo,
            None => return result, // Return empty map for non-git projects
        };

        // Check if we need to refresh the cache
        let should_refresh_cache = self.git_status_cache.as_ref()
            .map(|cache| cache.last_updated.elapsed().unwrap_or(cache.cache_duration) >= cache.cache_duration)
            .unwrap_or(true);

        if should_refresh_cache {
            self.refresh_git_status_cache();
        }

        // Get status for each requested file
        for file_path in file_paths {
            if let Some(status) = self.get_file_git_status(file_path) {
                result.insert(file_path.clone(), status);
            }
        }

        result
    }

    /// Refreshes the git status cache for better performance.
    pub fn refresh_git_status_cache(&mut self) {
        let repo = match self.project.repository.as_ref() {
            Some(repo) => repo,
            None => return,
        };

        let mut statuses = HashMap::new();
        
        // Get all file statuses from git
        if let Ok(git_statuses) = repo.statuses(None) {
            let repo_root = &self.project.root;
            
            for entry in git_statuses.iter() {
                if let Some(path_str) = entry.path() {
                    let file_path = repo_root.join(path_str);
                    let status = self.git_status_from_flags(entry.status());
                    statuses.insert(file_path, status);
                }
            }
        }

        self.git_status_cache = Some(GitStatusCache {
            statuses,
            last_updated: std::time::SystemTime::now(),
            cache_duration: std::time::Duration::from_secs(30), // Cache for 30 seconds
        });
    }

    /// Checks if the project is a git repository.
    pub fn is_git_repository(&self) -> bool {
        self.project.repository.is_some()
    }

    /// Gets the repository root path.
    pub fn get_repository_root(&self) -> Option<&PathBuf> {
        if self.project.repository.is_some() {
            Some(&self.project.root)
        } else {
            None
        }
    }

    /// Converts git2 status flags to our GitFileStatus enum.
    fn git_status_from_flags(&self, flags: git2::Status) -> GitFileStatus {
        if flags.contains(git2::Status::WT_NEW) || flags.contains(git2::Status::INDEX_NEW) {
            GitFileStatus::Added
        } else if flags.contains(git2::Status::WT_MODIFIED) || flags.contains(git2::Status::INDEX_MODIFIED) {
            GitFileStatus::Modified
        } else if flags.contains(git2::Status::WT_DELETED) || flags.contains(git2::Status::INDEX_DELETED) {
            GitFileStatus::Deleted
        } else if flags.contains(git2::Status::WT_RENAMED) || flags.contains(git2::Status::INDEX_RENAMED) {
            GitFileStatus::Renamed
        } else if flags.contains(git2::Status::WT_TYPECHANGE) || flags.contains(git2::Status::INDEX_TYPECHANGE) {
            GitFileStatus::Modified
        } else if flags.contains(git2::Status::IGNORED) {
            GitFileStatus::Ignored
        } else if flags.is_empty() {
            GitFileStatus::Clean
        } else {
            GitFileStatus::Untracked
        }
    }

    /// Invalidates the git status cache, forcing a refresh on next access.
    pub fn invalidate_git_status_cache(&mut self) {
        self.git_status_cache = None;
    }
}
// Integration: Instantiated in `main.rs` to provide Git status information upon startup. This will be the source for other components needing file content.
// Notes: The logic here is intentionally detailed to robustly fulfill FR2. It gracefully handles detached HEAD states and missing upstreams. This component strictly reads data, adhering to safety principles.k 
