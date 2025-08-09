// [[SECONDARY_MIND_CORE]]/src/components/cache_manager.rs
// Purpose: Manages caching of analysis results with intelligent eviction and persistence
// Architecture: Handles file and project-level caching with LRU eviction strategy
// Dependencies: LRU cache, file system, serialization

use crate::components::enhanced_analysis_engine::{AnalysisResult, FileAnalysisResult};
use crate::model::symbol::Symbol;
use crate::errors::SecondaryMindError;
use std::path::{Path, PathBuf};

use std::time::SystemTime;
use std::fs;
use lru::LruCache;
use serde::{Serialize, Deserialize};
use anyhow::Result;
use std::num::NonZeroUsize;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedFileAnalysis {
    pub symbols: Vec<Symbol>,
    pub last_modified: SystemTime,
    pub content_hash: String,
    pub dependencies: Vec<PathBuf>,
    pub cached_at: SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedProjectAnalysis {
    pub symbols: Vec<Symbol>,
    pub project_path: PathBuf,
    pub analysis_time: SystemTime,
    pub file_count: usize,
    pub errors: Vec<String>,
    pub cached_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub max_file_cache_size: usize,
    pub max_project_cache_size: usize,
    pub cache_directory: PathBuf,
    pub enable_disk_persistence: bool,
    pub max_cache_age_hours: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("secondary-mind")
            .join("analysis-cache");

        Self {
            max_file_cache_size: 1000,
            max_project_cache_size: 10,
            cache_directory: cache_dir,
            enable_disk_persistence: true,
            max_cache_age_hours: 24,
        }
    }
}

pub struct CacheManager {
    file_cache: LruCache<PathBuf, CachedFileAnalysis>,
    project_cache: LruCache<PathBuf, CachedProjectAnalysis>,
    config: CacheConfig,
    cache_stats: CacheStats,
}

#[derive(Debug, Default)]
pub struct CacheStats {
    pub file_cache_hits: u64,
    pub file_cache_misses: u64,
    pub project_cache_hits: u64,
    pub project_cache_misses: u64,
    pub evictions: u64,
}

impl CacheManager {
    pub fn new() -> Result<Self> {
        Self::with_config(CacheConfig::default())
    }

    pub fn with_config(config: CacheConfig) -> Result<Self> {
        // Create cache directory if it doesn't exist
        if config.enable_disk_persistence {
            fs::create_dir_all(&config.cache_directory)
                .map_err(|e| SecondaryMindError::IoError { 
                    path: config.cache_directory.clone(), 
                    source: e 
                })?;
        }

        let file_cache_size = NonZeroUsize::new(config.max_file_cache_size)
            .unwrap_or(NonZeroUsize::new(1000).unwrap());
        let project_cache_size = NonZeroUsize::new(config.max_project_cache_size)
            .unwrap_or(NonZeroUsize::new(10).unwrap());

        let mut cache_manager = Self {
            file_cache: LruCache::new(file_cache_size),
            project_cache: LruCache::new(project_cache_size),
            config,
            cache_stats: CacheStats::default(),
        };

        // Load persisted cache if enabled
        if cache_manager.config.enable_disk_persistence {
            cache_manager.load_persisted_cache()?;
        }

        Ok(cache_manager)
    }

    /// Get cached file analysis
    pub fn get_file_analysis(&mut self, path: &Path) -> Option<CachedFileAnalysis> {
        let is_valid = if let Some(cached) = self.file_cache.peek(path) {
            self.is_cache_entry_valid(&cached.cached_at)
        } else {
            false
        };
        
        if is_valid {
            if let Some(cached) = self.file_cache.get(path) {
                self.cache_stats.file_cache_hits += 1;
                return Some(cached.clone());
            }
        } else if self.file_cache.contains(path) {
            // Remove expired entry
            self.file_cache.pop(path);
        }
        
        self.cache_stats.file_cache_misses += 1;
        None
    }

    /// Cache file analysis result
    pub fn cache_file_analysis(&mut self, path: &Path, result: &FileAnalysisResult) -> Result<()> {
        let cached_analysis = CachedFileAnalysis {
            symbols: result.symbols.clone(),
            last_modified: result.last_modified,
            content_hash: result.content_hash.clone(),
            dependencies: result.dependencies.clone(),
            cached_at: SystemTime::now(),
        };

        // Check if we need to evict an entry
        if self.file_cache.len() >= self.file_cache.cap().get() {
            self.cache_stats.evictions += 1;
        }

        self.file_cache.put(path.to_path_buf(), cached_analysis.clone());

        // Persist to disk if enabled
        if self.config.enable_disk_persistence {
            self.persist_file_cache_entry(path, &cached_analysis)?;
        }

        Ok(())
    }

    /// Get cached project analysis
    pub fn get_project_analysis(&mut self, project_path: &Path) -> Option<CachedProjectAnalysis> {
        let is_valid = if let Some(cached) = self.project_cache.peek(project_path) {
            self.is_cache_entry_valid(&cached.cached_at)
        } else {
            false
        };
        
        if is_valid {
            if let Some(cached) = self.project_cache.get(project_path) {
                self.cache_stats.project_cache_hits += 1;
                return Some(cached.clone());
            }
        } else if self.project_cache.contains(project_path) {
            // Remove expired entry
            self.project_cache.pop(project_path);
        }
        
        self.cache_stats.project_cache_misses += 1;
        None
    }

    /// Cache project analysis result
    pub fn cache_project_analysis(&mut self, project_path: &Path, result: &AnalysisResult) -> Result<()> {
        let cached_analysis = CachedProjectAnalysis {
            symbols: result.symbols.clone(),
            project_path: result.project_path.clone(),
            analysis_time: result.analysis_time,
            file_count: result.file_count,
            errors: result.errors.clone(),
            cached_at: SystemTime::now(),
        };

        // Check if we need to evict an entry
        if self.project_cache.len() >= self.project_cache.cap().get() {
            self.cache_stats.evictions += 1;
        }

        self.project_cache.put(project_path.to_path_buf(), cached_analysis.clone());

        // Persist to disk if enabled
        if self.config.enable_disk_persistence {
            self.persist_project_cache_entry(project_path, &cached_analysis)?;
        }

        Ok(())
    }

    /// Invalidate cache entry for a specific file
    pub fn invalidate_file(&mut self, path: &Path) {
        self.file_cache.pop(path);
        
        // Remove from disk cache if enabled
        if self.config.enable_disk_persistence {
            let cache_file = self.get_file_cache_path(path);
            let _ = fs::remove_file(cache_file); // Ignore errors
        }
    }

    /// Invalidate all project caches that contain the specified file
    pub fn invalidate_projects_containing_file(&mut self, file_path: &Path) {
        let mut projects_to_invalidate = Vec::new();
        
        // Find projects that might contain this file
        for (project_path, _) in self.project_cache.iter() {
            if file_path.starts_with(project_path) {
                projects_to_invalidate.push(project_path.clone());
            }
        }
        
        // Invalidate found projects
        for project_path in projects_to_invalidate {
            self.project_cache.pop(&project_path);
            
            if self.config.enable_disk_persistence {
                let cache_file = self.get_project_cache_path(&project_path);
                let _ = fs::remove_file(cache_file); // Ignore errors
            }
        }
    }

    /// Clean up stale cache entries
    pub fn cleanup_stale_entries(&mut self) {
        let now = SystemTime::now();
        let max_age = std::time::Duration::from_secs(self.config.max_cache_age_hours * 3600);
        
        // Clean file cache
        let mut files_to_remove = Vec::new();
        for (path, cached) in self.file_cache.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > max_age {
                    files_to_remove.push(path.clone());
                }
            }
        }
        
        for path in files_to_remove {
            self.file_cache.pop(&path);
        }
        
        // Clean project cache
        let mut projects_to_remove = Vec::new();
        for (path, cached) in self.project_cache.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > max_age {
                    projects_to_remove.push(path.clone());
                }
            }
        }
        
        for path in projects_to_remove {
            self.project_cache.pop(&path);
        }
    }

    /// Get cache statistics
    pub fn get_stats(&self) -> &CacheStats {
        &self.cache_stats
    }

    /// Clear all caches
    pub fn clear_all(&mut self) -> Result<()> {
        self.file_cache.clear();
        self.project_cache.clear();
        
        if self.config.enable_disk_persistence {
            // Remove all cache files
            if self.config.cache_directory.exists() {
                fs::remove_dir_all(&self.config.cache_directory)
                    .map_err(|e| SecondaryMindError::IoError { 
                        path: self.config.cache_directory.clone(), 
                        source: e 
                    })?;
                fs::create_dir_all(&self.config.cache_directory)
                    .map_err(|e| SecondaryMindError::IoError { 
                        path: self.config.cache_directory.clone(), 
                        source: e 
                    })?;
            }
        }
        
        Ok(())
    }

    // Private helper methods

    fn is_cache_entry_valid(&self, cached_at: &SystemTime) -> bool {
        if let Ok(age) = SystemTime::now().duration_since(*cached_at) {
            age.as_secs() < (self.config.max_cache_age_hours * 3600)
        } else {
            false
        }
    }

    fn get_file_cache_path(&self, file_path: &Path) -> PathBuf {
        let hash = self.path_to_hash(file_path);
        self.config.cache_directory.join("files").join(format!("{}.cache", hash))
    }

    fn get_project_cache_path(&self, project_path: &Path) -> PathBuf {
        let hash = self.path_to_hash(project_path);
        self.config.cache_directory.join("projects").join(format!("{}.cache", hash))
    }

    fn path_to_hash(&self, path: &Path) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(path.to_string_lossy().as_bytes());
        format!("{:x}", hasher.finalize())[..16].to_string()
    }

    fn persist_file_cache_entry(&self, path: &Path, cached: &CachedFileAnalysis) -> Result<()> {
        let cache_file = self.get_file_cache_path(path);
        
        // Create directory if it doesn't exist
        if let Some(parent) = cache_file.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| SecondaryMindError::IoError { 
                    path: parent.to_path_buf(), 
                    source: e 
                })?;
        }
        
        let serialized = bincode::serialize(cached)
            .map_err(|e| SecondaryMindError::ConfigError(format!("Serialization failed: {}", e)))?;
        
        fs::write(&cache_file, serialized)
            .map_err(|e| SecondaryMindError::IoError { 
                path: cache_file, 
                source: e 
            })?;
        
        Ok(())
    }

    fn persist_project_cache_entry(&self, path: &Path, cached: &CachedProjectAnalysis) -> Result<()> {
        let cache_file = self.get_project_cache_path(path);
        
        // Create directory if it doesn't exist
        if let Some(parent) = cache_file.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| SecondaryMindError::IoError { 
                    path: parent.to_path_buf(), 
                    source: e 
                })?;
        }
        
        let serialized = bincode::serialize(cached)
            .map_err(|e| SecondaryMindError::ConfigError(format!("Serialization failed: {}", e)))?;
        
        fs::write(&cache_file, serialized)
            .map_err(|e| SecondaryMindError::IoError { 
                path: cache_file, 
                source: e 
            })?;
        
        Ok(())
    }

    fn load_persisted_cache(&mut self) -> Result<()> {
        // Load file cache entries
        let files_dir = self.config.cache_directory.join("files");
        if files_dir.exists() {
            for entry in fs::read_dir(&files_dir)
                .map_err(|e| SecondaryMindError::IoError { 
                    path: files_dir.clone(), 
                    source: e 
                })? {
                let entry = entry.map_err(|e| SecondaryMindError::IoError { 
                    path: files_dir.clone(), 
                    source: e 
                })?;
                
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.ends_with(".cache") {
                        if let Ok(data) = fs::read(entry.path()) {
                            if let Ok(_cached) = bincode::deserialize::<CachedFileAnalysis>(&data) {
                                // We can't easily reconstruct the original path from hash,
                                // so we'll skip loading persisted file cache for now
                                // This could be improved by storing path mapping
                            }
                        }
                    }
                }
            }
        }
        
        // Load project cache entries
        let projects_dir = self.config.cache_directory.join("projects");
        if projects_dir.exists() {
            for entry in fs::read_dir(&projects_dir)
                .map_err(|e| SecondaryMindError::IoError { 
                    path: projects_dir.clone(), 
                    source: e 
                })? {
                let entry = entry.map_err(|e| SecondaryMindError::IoError { 
                    path: projects_dir.clone(), 
                    source: e 
                })?;
                
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.ends_with(".cache") {
                        if let Ok(data) = fs::read(entry.path()) {
                            if let Ok(cached) = bincode::deserialize::<CachedProjectAnalysis>(&data) {
                                // Use the project path stored in the cached data
                                self.project_cache.put(cached.project_path.clone(), cached);
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
}

impl Default for CacheManager {
    fn default() -> Self {
        Self::new().expect("Failed to create CacheManager")
    }
}