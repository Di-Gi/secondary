// [[SECONDARY_MIND]]/src/components/code_source_controller.rs
// Purpose: Implements the "Code Source Controller" component from the design spec. Manages access to the project's source code and Git repository state.
// Architecture: This is the primary component for fulfilling requirements FR1, FR2, and FR3. It acts as the gateway to the filesystem and Git, abstracting these operations away from the rest of the application.
// Dependencies: crate::errors::SecondaryMindError, crate::model::project::Project, git2.

use crate::errors::SecondaryMindError;
use crate::model::project::Project;
// REMOVED: unused import
use std::path::Path;

/// Controller for managing the source code via filesystem and Git.
pub struct CodeSourceController {
    project: Project,
}

impl CodeSourceController {
    /// Initializes the controller for a given project path.
    pub fn new(path: &Path) -> Result<Self, SecondaryMindError> {
        let project = Project::new(path)?;
        Ok(Self { project })
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
}
// Integration: Instantiated in `main.rs` to provide Git status information upon startup. This will be the source for other components needing file content.
// Notes: The logic here is intentionally detailed to robustly fulfill FR2. It gracefully handles detached HEAD states and missing upstreams. This component strictly reads data, adhering to safety principles.k 