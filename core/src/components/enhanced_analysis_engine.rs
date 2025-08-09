// [[SECONDARY_MIND_CORE]]/src/components/enhanced_analysis_engine.rs
// Purpose: Enhanced analysis engine with caching and incremental analysis capabilities
// Architecture: Core component that orchestrates analysis with performance optimizations
// Dependencies: CacheManager, SearchIndexManager, FileSystemWatcher

use crate::components::cache_manager::CacheManager;
use crate::components::file_system_watcher::{FileSystemWatcher, FileEvent};
use crate::components::codebase_cartographer::CodebaseCartographer;
use crate::model::symbol::Symbol;
use crate::errors::SecondaryMindError;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::time::SystemTime;
use tokio::sync::mpsc;
use anyhow::Result;
use sha2::{Sha256, Digest};
use std::fs;
use walkdir;

#[derive(Debug, Clone)]
pub struct AnalysisResult {
    pub symbols: Vec<Symbol>,
    pub project_path: PathBuf,
    pub analysis_time: SystemTime,
    pub file_count: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct FileAnalysisResult {
    pub symbols: Vec<Symbol>,
    pub file_path: PathBuf,
    pub last_modified: SystemTime,
    pub content_hash: String,
    pub dependencies: Vec<PathBuf>,
}

pub struct EnhancedAnalysisEngine {
    cache_manager: CacheManager,
    cartographer: CodebaseCartographer,
    file_watcher: Option<FileSystemWatcher>,
    event_receiver: Option<mpsc::Receiver<FileEvent>>,
    watched_projects: HashMap<PathBuf, SystemTime>,
}

impl EnhancedAnalysisEngine {
    pub fn new() -> Result<Self> {
        let cache_manager = CacheManager::new()?;
        let cartographer = CodebaseCartographer::new();
        
        Ok(Self {
            cache_manager,
            cartographer,
            file_watcher: None,
            event_receiver: None,
            watched_projects: HashMap::new(),
        })
    }

    /// Initialize file watching for a project
    pub async fn initialize_file_watching(&mut self, project_path: &Path) -> Result<()> {
        let (file_watcher, event_receiver) = FileSystemWatcher::new()?;
        
        self.file_watcher = Some(file_watcher);
        self.event_receiver = Some(event_receiver);
        
        if let Some(ref mut watcher) = self.file_watcher {
            watcher.watch_project(project_path).await?;
            self.watched_projects.insert(project_path.to_path_buf(), SystemTime::now());
        }
        
        Ok(())
    }

    /// Perform incremental analysis of a project, using cache when possible
    pub async fn analyze_project_incremental(&mut self, project_path: &Path) -> Result<AnalysisResult> {
        let start_time = SystemTime::now();
        let mut errors = Vec::new();
        let mut file_count = 0;

        // Check if we have cached project analysis
        let all_symbols = if let Some(cached_result) = self.cache_manager.get_project_analysis(project_path) {
            // Check if any files have been modified since last analysis
            let modified_files = self.get_modified_files(project_path, &cached_result.analysis_time)?;
            
            if modified_files.is_empty() {
                log::info!("Using cached analysis for project: {:?}", project_path);
                return Ok(AnalysisResult {
                    symbols: cached_result.symbols,
                    project_path: cached_result.project_path,
                    analysis_time: cached_result.analysis_time,
                    file_count: cached_result.file_count,
                    errors: cached_result.errors,
                });
            }

            // Start with cached symbols and update only modified files
            let mut symbols = cached_result.symbols;
            
            for modified_file in modified_files {
                match self.analyze_file(&modified_file).await {
                    Ok(file_result) => {
                        // Remove old symbols for this file
                        symbols.retain(|s| s.location.path != modified_file);
                        // Add new symbols
                        symbols.extend(file_result.symbols);
                        file_count += 1;
                    }
                    Err(e) => {
                        errors.push(format!("Failed to analyze {}: {}", modified_file.display(), e));
                    }
                }
            }
            symbols
        } else {
            // Full analysis - no cache available
            log::info!("Performing full analysis for project: {:?}", project_path);
            
            // Use the existing scan pattern from desktop commands
            let symbols = self.scan_project_for_symbols(project_path);
            file_count = symbols.len();
            symbols
        };

        let result = AnalysisResult {
            symbols: all_symbols,
            project_path: project_path.to_path_buf(),
            analysis_time: start_time,
            file_count,
            errors,
        };

        // Cache the result
        self.cache_manager.cache_project_analysis(project_path, &result)?;

        Ok(result)
    }

    /// Analyze a single file and return symbols with metadata
    pub async fn analyze_file(&mut self, file_path: &Path) -> Result<FileAnalysisResult> {
        // Check cache first
        if let Some(cached_file) = self.cache_manager.get_file_analysis(file_path) {
            let is_unchanged = {
                let metadata = fs::metadata(file_path)
                    .map_err(|e| SecondaryMindError::IoError { 
                        path: file_path.to_path_buf(), 
                        source: e 
                    })?;
                
                let current_modified = metadata.modified().unwrap_or(SystemTime::now());
                
                // Quick check: if modification time hasn't changed, file is unchanged
                if current_modified == cached_file.last_modified {
                    true
                } else {
                    // If modification time changed, check content hash
                    let content = fs::read_to_string(file_path)
                        .map_err(|e| SecondaryMindError::IoError { 
                            path: file_path.to_path_buf(), 
                            source: e 
                        })?;
                    
                    let current_hash = self.calculate_content_hash(&content);
                    current_hash == cached_file.content_hash
                }
            };
            
            if is_unchanged {
                log::debug!("Using cached analysis for file: {:?}", file_path);
                return Ok(FileAnalysisResult {
                    symbols: cached_file.symbols,
                    file_path: file_path.to_path_buf(),
                    last_modified: cached_file.last_modified,
                    content_hash: cached_file.content_hash,
                    dependencies: cached_file.dependencies,
                });
            }
        }

        // Perform fresh analysis
        log::debug!("Analyzing file: {:?}", file_path);
        
        let content = fs::read_to_string(file_path)
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                source: e 
            })?;

        let content_hash = self.calculate_content_hash(&content);
        let last_modified = fs::metadata(file_path)
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                source: e 
            })?
            .modified()
            .unwrap_or(SystemTime::now());

        // Use existing cartographer to parse the file
        let symbols = self.cartographer.parse_file(file_path)?;

        let result = FileAnalysisResult {
            symbols: symbols.clone(),
            file_path: file_path.to_path_buf(),
            last_modified,
            content_hash: content_hash.clone(),
            dependencies: self.extract_dependencies(&symbols),
        };

        // Cache the result
        self.cache_manager.cache_file_analysis(file_path, &result)?;

        Ok(result)
    }

    /// Update analysis for a specific file (called by file watcher)
    pub async fn update_file_analysis(&mut self, file_path: &Path) -> Result<Vec<Symbol>> {
        log::info!("Updating analysis for modified file: {:?}", file_path);
        
        let file_result = self.analyze_file(file_path).await?;
        
        // Invalidate any project caches that include this file
        self.cache_manager.invalidate_projects_containing_file(file_path);
        
        Ok(file_result.symbols)
    }

    /// Get cached analysis result for a project
    pub fn get_cached_analysis(&mut self, project_path: &Path) -> Option<AnalysisResult> {
        if let Some(cached) = self.cache_manager.get_project_analysis(project_path) {
            Some(AnalysisResult {
                symbols: cached.symbols,
                project_path: cached.project_path,
                analysis_time: cached.analysis_time,
                file_count: cached.file_count,
                errors: cached.errors,
            })
        } else {
            None
        }
    }

    /// Process file system events from the watcher
    pub async fn process_file_events(&mut self) -> Result<Vec<(PathBuf, Vec<Symbol>)>> {
        let mut updated_files = Vec::new();
        let mut events_to_process = Vec::new();
        
        // Collect events first to avoid borrowing issues
        if let Some(ref mut receiver) = self.event_receiver {
            while let Ok(event) = receiver.try_recv() {
                events_to_process.push(event);
            }
        }
        
        // Process collected events
        for event in events_to_process {
            match event {
                FileEvent::Modified(path) | FileEvent::Created(path) => {
                    match self.update_file_analysis(&path).await {
                        Ok(symbols) => {
                            updated_files.push((path, symbols));
                        }
                        Err(e) => {
                            log::warn!("Failed to update analysis for {}: {}", path.display(), e);
                        }
                    }
                }
                FileEvent::Deleted(path) => {
                    self.cache_manager.invalidate_file(&path);
                    updated_files.push((path, Vec::new()));
                }
                FileEvent::Renamed(old_path, new_path) => {
                    self.cache_manager.invalidate_file(&old_path);
                    match self.update_file_analysis(&new_path).await {
                        Ok(symbols) => {
                            updated_files.push((new_path, symbols));
                        }
                        Err(e) => {
                            log::warn!("Failed to analyze renamed file {}: {}", new_path.display(), e);
                        }
                    }
                }
            }
        }
        
        Ok(updated_files)
    }

    // Helper methods

    fn get_modified_files(&self, project_path: &Path, since: &SystemTime) -> Result<Vec<PathBuf>> {
        let mut modified_files = Vec::new();
        
        for entry in walkdir::WalkDir::new(project_path) {
            let entry = entry.map_err(|e| SecondaryMindError::IoError { 
                path: project_path.to_path_buf(), 
                source: std::io::Error::new(std::io::ErrorKind::Other, e) 
            })?;
            
            if entry.file_type().is_file() {
                let path = entry.path();
                if let Ok(metadata) = fs::metadata(path) {
                    if let Ok(modified_time) = metadata.modified() {
                        if modified_time > *since {
                            modified_files.push(path.to_path_buf());
                        }
                    }
                }
            }
        }
        
        Ok(modified_files)
    }



    fn calculate_content_hash(&self, content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn scan_project_for_symbols(&self, root: &Path) -> Vec<Symbol> {
        let mut symbols = Vec::new();
        let walker = walkdir::WalkDir::new(root)
            .into_iter()
            .filter_entry(|e| !self.is_excluded(e));

        for entry in walker.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                // The cartographer handles the logic of which files to parse
                if let Ok(file_symbols) = self.cartographer.parse_file(path) {
                    if !file_symbols.is_empty() {
                        symbols.extend(file_symbols);
                    }
                }
            }
        }
        symbols
    }

    fn is_excluded(&self, entry: &walkdir::DirEntry) -> bool {
        let file_name = entry.file_name().to_str().unwrap_or("");
        if file_name.starts_with('.') {
            return true;
        }
        if entry.file_type().is_dir() {
            matches!(file_name, "node_modules" | "target" | "dist" | "build" | "out" | "vendor")
        } else {
            false
        }
    }

    fn extract_dependencies(&self, symbols: &[Symbol]) -> Vec<PathBuf> {
        // Extract file dependencies from symbols (imports, includes, etc.)
        // This is a simplified implementation - could be enhanced per language
        symbols.iter()
            .filter_map(|symbol| {
                // Look for import-like symbols that reference other files
                let kind_str = format!("{:?}", symbol.kind).to_lowercase();
                if kind_str.contains("import") || kind_str.contains("include") {
                    // Try to resolve the import to a file path
                    // This would need language-specific logic
                    None // Placeholder
                } else {
                    None
                }
            })
            .collect()
    }
}

impl Default for EnhancedAnalysisEngine {
    fn default() -> Self {
        Self::new().expect("Failed to create EnhancedAnalysisEngine")
    }
}