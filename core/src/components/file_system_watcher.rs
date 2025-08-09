// [[SECONDARY_MIND_CORE]]/src/components/file_system_watcher.rs
// Purpose: Cross-platform file system watcher with debouncing and event processing
// Architecture: Uses notify crate for file watching with event debouncing and filtering
// Dependencies: notify, tokio, file system

use crate::errors::SecondaryMindError;
use notify::{RecommendedWatcher, Watcher, RecursiveMode, Event, EventKind};
use std::path::{Path, PathBuf};
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use anyhow::Result;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub enum FileEvent {
    Created(PathBuf),
    Modified(PathBuf),
    Deleted(PathBuf),
    Renamed(PathBuf, PathBuf), // (old_path, new_path)
}

#[derive(Debug, Clone)]
pub struct WatcherConfig {
    pub debounce_duration: Duration,
    pub ignored_extensions: HashSet<String>,
    pub ignored_directories: HashSet<String>,
    pub max_events_per_second: u32,
}

impl Default for WatcherConfig {
    fn default() -> Self {
        let mut ignored_extensions = HashSet::new();
        ignored_extensions.insert(".tmp".to_string());
        ignored_extensions.insert(".swp".to_string());
        ignored_extensions.insert(".log".to_string());
        ignored_extensions.insert(".lock".to_string());
        
        let mut ignored_directories = HashSet::new();
        ignored_directories.insert("node_modules".to_string());
        ignored_directories.insert(".git".to_string());
        ignored_directories.insert("target".to_string());
        ignored_directories.insert("dist".to_string());
        ignored_directories.insert("build".to_string());
        ignored_directories.insert(".next".to_string());
        
        Self {
            debounce_duration: Duration::from_millis(500),
            ignored_extensions,
            ignored_directories,
            max_events_per_second: 100,
        }
    }
}

struct DebouncedEvent {
    event: FileEvent,
    last_seen: Instant,
}

pub struct FileSystemWatcher {
    watcher: RecommendedWatcher,
    watched_paths: HashSet<PathBuf>,
    config: WatcherConfig,
    debounced_events: Arc<Mutex<HashMap<PathBuf, DebouncedEvent>>>,
    event_sender: mpsc::Sender<FileEvent>,
    _cleanup_handle: tokio::task::JoinHandle<()>,
}

impl FileSystemWatcher {
    pub fn new() -> Result<(Self, mpsc::Receiver<FileEvent>)> {
        Self::with_config(WatcherConfig::default())
    }

    pub fn with_config(config: WatcherConfig) -> Result<(Self, mpsc::Receiver<FileEvent>)> {
        let (event_sender, event_receiver) = mpsc::channel(1000);
        let debounced_events = Arc::new(Mutex::new(HashMap::new()));
        
        // Clone for the watcher callback
        let sender_clone = event_sender.clone();
        let debounced_events_clone = debounced_events.clone();
        let config_clone = config.clone();
        
        let watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            match res {
                Ok(event) => {
                    if let Some(file_event) = Self::convert_notify_event(event, &config_clone) {
                        Self::handle_debounced_event(
                            file_event,
                            &debounced_events_clone,
                            &sender_clone,
                            &config_clone,
                        );
                    }
                }
                Err(e) => {
                    log::error!("File watcher error: {:?}", e);
                }
            }
        }).map_err(|e| SecondaryMindError::FileWatcherError(format!("Failed to create watcher: {}", e)))?;

        // Start cleanup task for debounced events
        let cleanup_events = debounced_events.clone();
        let cleanup_sender = event_sender.clone();
        let cleanup_config = config.clone();
        let cleanup_handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(cleanup_config.debounce_duration / 2);
            loop {
                interval.tick().await;
                Self::process_debounced_events(&cleanup_events, &cleanup_sender, &cleanup_config).await;
            }
        });

        let file_watcher = Self {
            watcher,
            watched_paths: HashSet::new(),
            config,
            debounced_events,
            event_sender,
            _cleanup_handle: cleanup_handle,
        };

        Ok((file_watcher, event_receiver))
    }

    pub async fn watch_project(&mut self, project_path: &Path) -> Result<()> {
        if self.watched_paths.contains(project_path) {
            log::debug!("Project already being watched: {:?}", project_path);
            return Ok(());
        }

        log::info!("Starting to watch project: {:?}", project_path);
        
        self.watcher
            .watch(project_path, RecursiveMode::Recursive)
            .map_err(|e| SecondaryMindError::FileWatcherError(
                format!("Failed to watch path {}: {}", project_path.display(), e)
            ))?;

        self.watched_paths.insert(project_path.to_path_buf());
        Ok(())
    }

    pub async fn unwatch_project(&mut self, project_path: &Path) -> Result<()> {
        if !self.watched_paths.contains(project_path) {
            log::debug!("Project not being watched: {:?}", project_path);
            return Ok(());
        }

        log::info!("Stopping watch for project: {:?}", project_path);
        
        self.watcher
            .unwatch(project_path)
            .map_err(|e| SecondaryMindError::FileWatcherError(
                format!("Failed to unwatch path {}: {}", project_path.display(), e)
            ))?;

        self.watched_paths.remove(project_path);
        Ok(())
    }

    pub fn get_watched_paths(&self) -> &HashSet<PathBuf> {
        &self.watched_paths
    }

    // Private helper methods

    fn convert_notify_event(event: Event, config: &WatcherConfig) -> Option<FileEvent> {
        // Filter out events for ignored files and directories
        for path in &event.paths {
            if Self::should_ignore_path(path, config) {
                return None;
            }
        }

        match event.kind {
            EventKind::Create(_) => {
                if let Some(path) = event.paths.first() {
                    Some(FileEvent::Created(path.clone()))
                } else {
                    None
                }
            }
            EventKind::Modify(_) => {
                if let Some(path) = event.paths.first() {
                    Some(FileEvent::Modified(path.clone()))
                } else {
                    None
                }
            }
            EventKind::Remove(_) => {
                if let Some(path) = event.paths.first() {
                    Some(FileEvent::Deleted(path.clone()))
                } else {
                    None
                }
            }
            EventKind::Other => {
                // Handle rename events (which might come as "Other" on some platforms)
                if event.paths.len() == 2 {
                    Some(FileEvent::Renamed(
                        event.paths[0].clone(),
                        event.paths[1].clone(),
                    ))
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    fn should_ignore_path(path: &Path, config: &WatcherConfig) -> bool {
        // Check file extension
        if let Some(extension) = path.extension() {
            if let Some(ext_str) = extension.to_str() {
                let ext_with_dot = format!(".{}", ext_str);
                if config.ignored_extensions.contains(&ext_with_dot) {
                    return true;
                }
            }
        }

        // Check directory names in the path
        for component in path.components() {
            if let Some(dir_name) = component.as_os_str().to_str() {
                if config.ignored_directories.contains(dir_name) {
                    return true;
                }
            }
        }

        // Ignore hidden files and directories (starting with .)
        if let Some(file_name) = path.file_name() {
            if let Some(name_str) = file_name.to_str() {
                if name_str.starts_with('.') && name_str != ".." && name_str != "." {
                    // Allow some specific dotfiles that might be relevant
                    let allowed_dotfiles = [".gitignore", ".env", ".editorconfig"];
                    if !allowed_dotfiles.contains(&name_str) {
                        return true;
                    }
                }
            }
        }

        false
    }

    fn handle_debounced_event(
        event: FileEvent,
        debounced_events: &Arc<Mutex<HashMap<PathBuf, DebouncedEvent>>>,
        _sender: &mpsc::Sender<FileEvent>,
        config: &WatcherConfig,
    ) {
        let path = match &event {
            FileEvent::Created(p) | FileEvent::Modified(p) | FileEvent::Deleted(p) => p.clone(),
            FileEvent::Renamed(_, new_path) => new_path.clone(),
        };

        let now = Instant::now();
        
        if let Ok(mut events) = debounced_events.lock() {
            // Check if we should debounce this event
            if let Some(existing) = events.get(&path) {
                let time_since_last = now.duration_since(existing.last_seen);
                if time_since_last < config.debounce_duration {
                    // Update the existing event with the new timestamp
                    events.insert(path, DebouncedEvent {
                        event,
                        last_seen: now,
                    });
                    return;
                }
            }

            // Add or update the debounced event
            events.insert(path, DebouncedEvent {
                event,
                last_seen: now,
            });
        }
    }

    async fn process_debounced_events(
        debounced_events: &Arc<Mutex<HashMap<PathBuf, DebouncedEvent>>>,
        sender: &mpsc::Sender<FileEvent>,
        config: &WatcherConfig,
    ) {
        let now = Instant::now();
        let mut events_to_send = Vec::new();
        let mut paths_to_remove = Vec::new();

        // Collect events that are ready to be sent
        if let Ok(mut events) = debounced_events.lock() {
            for (path, debounced_event) in events.iter() {
                let time_since_last = now.duration_since(debounced_event.last_seen);
                if time_since_last >= config.debounce_duration {
                    events_to_send.push(debounced_event.event.clone());
                    paths_to_remove.push(path.clone());
                }
            }

            // Remove processed events
            for path in &paths_to_remove {
                events.remove(path);
            }
        }

        // Send events (limit to prevent overwhelming)
        let max_events = config.max_events_per_second as usize;
        for event in events_to_send.into_iter().take(max_events) {
            if let Err(e) = sender.try_send(event) {
                log::warn!("Failed to send file event: {:?}", e);
                break; // Stop sending if channel is full
            }
        }
    }
}

impl Drop for FileSystemWatcher {
    fn drop(&mut self) {
        // Unwatch all paths
        for path in self.watched_paths.clone() {
            let _ = self.watcher.unwatch(&path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_file_watcher_creation() {
        let result = FileSystemWatcher::new();
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_watch_project() {
        let temp_dir = TempDir::new().unwrap();
        let (mut watcher, _receiver) = FileSystemWatcher::new().unwrap();
        
        let result = watcher.watch_project(temp_dir.path()).await;
        assert!(result.is_ok());
        assert!(watcher.watched_paths.contains(temp_dir.path()));
    }

    #[tokio::test]
    async fn test_unwatch_project() {
        let temp_dir = TempDir::new().unwrap();
        let (mut watcher, _receiver) = FileSystemWatcher::new().unwrap();
        
        watcher.watch_project(temp_dir.path()).await.unwrap();
        let result = watcher.unwatch_project(temp_dir.path()).await;
        
        assert!(result.is_ok());
        assert!(!watcher.watched_paths.contains(temp_dir.path()));
    }

    #[test]
    fn test_should_ignore_path() {
        let config = WatcherConfig::default();
        
        // Should ignore node_modules
        assert!(FileSystemWatcher::should_ignore_path(
            Path::new("/project/node_modules/package/file.js"),
            &config
        ));
        
        // Should ignore .git
        assert!(FileSystemWatcher::should_ignore_path(
            Path::new("/project/.git/config"),
            &config
        ));
        
        // Should ignore .tmp files
        assert!(FileSystemWatcher::should_ignore_path(
            Path::new("/project/file.tmp"),
            &config
        ));
        
        // Should not ignore regular files
        assert!(!FileSystemWatcher::should_ignore_path(
            Path::new("/project/src/main.rs"),
            &config
        ));
        
        // Should not ignore .gitignore
        assert!(!FileSystemWatcher::should_ignore_path(
            Path::new("/project/.gitignore"),
            &config
        ));
    }
}