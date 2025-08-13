// [[SECONDARY_MIND_CORE]]/src/components/navigation_cache.rs
// Purpose: Specialized caching for navigation analysis results with LRU eviction and performance monitoring
// Architecture: Multi-level caching with memory usage monitoring and automatic cleanup

use crate::errors::SecondaryMindError;
use crate::model::symbol::{FileStructureAnalysis, Symbol};
use crate::components::symbol_relationship_tracker::RelationshipAnalysis;
use crate::components::code_source_controller::GitFileStatus;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, Instant};
use std::collections::HashMap;
use lru::LruCache;
use serde::{Serialize, Deserialize};
use std::num::NonZeroUsize;

/// Configuration for NavigationCache
#[derive(Debug, Clone)]
pub struct NavigationCacheConfig {
    pub max_file_structures: usize,
    pub max_symbol_relationships: usize,
    pub max_file_trees: usize,
    pub max_symbol_usage: usize,
    pub max_memory_mb: usize,
    pub cache_ttl_seconds: u64,
    pub enable_metrics: bool,
}

impl Default for NavigationCacheConfig {
    fn default() -> Self {
        Self {
            max_file_structures: 500,
            max_symbol_relationships: 200,
            max_file_trees: 50,
            max_symbol_usage: 300,
            max_memory_mb: 256, // 256MB default
            cache_ttl_seconds: 3600, // 1 hour
            enable_metrics: true,
        }
    }
}

/// Cached file structure analysis with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedFileStructure {
    pub analysis: FileStructureAnalysis,
    pub file_modified: SystemTime,
    pub cached_at: SystemTime,
    pub access_count: u64,
    pub last_accessed: SystemTime,
}

/// Cached symbol relationship analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedRelationshipAnalysis {
    pub analysis: RelationshipAnalysis,
    pub cached_at: SystemTime,
    pub access_count: u64,
    pub last_accessed: SystemTime,
    pub analysis_depth: usize,
}

/// Cached file tree data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedFileTree {
    pub nodes: Vec<FileTreeNode>,
    pub total_files: usize,
    pub total_directories: usize,
    pub directory_modified: SystemTime,
    pub cached_at: SystemTime,
    pub access_count: u64,
    pub last_accessed: SystemTime,
}

/// Cached symbol usage analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedSymbolUsage {
    pub usage_data: SymbolUsageAnalysis,
    pub cached_at: SystemTime,
    pub access_count: u64,
    pub last_accessed: SystemTime,
}

/// File tree node for caching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub node_type: FileNodeType,
    pub children: Option<Vec<FileTreeNode>>,
    pub metadata: FileNodeMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileNodeType {
    File,
    Directory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNodeMetadata {
    pub symbol_count: usize,
    pub file_size: u64,
    pub last_modified: chrono::DateTime<chrono::Utc>,
    pub git_status: Option<GitFileStatus>,
    pub main_symbols: Vec<Symbol>,
}



/// Symbol usage analysis data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolUsageAnalysis {
    pub symbol: Symbol,
    pub reference_count: usize,
    pub call_count: usize,
    pub last_used: chrono::DateTime<chrono::Utc>,
    pub usage_frequency: f64,
    pub hotspots: Vec<UsageHotspot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageHotspot {
    pub file_path: String,
    pub position: crate::model::navigation::Position,
    pub usage_type: UsageType,
    pub frequency: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UsageType {
    Call,
    Reference,
    Definition,
    TypeUsage,
    Import,
}

/// Performance metrics for navigation operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationMetrics {
    pub cache_hit_rate: f64,
    pub memory_usage_mb: f64,
    pub total_cache_entries: usize,
    pub cache_evictions: u64,
    pub average_response_time_ms: f64,
    pub background_processing_time_ms: f64,
    pub active_operations: usize,
    pub last_cleanup: SystemTime,
    pub file_structure_hits: u64,
    pub file_structure_misses: u64,
    pub relationship_hits: u64,
    pub relationship_misses: u64,
    pub file_tree_hits: u64,
    pub file_tree_misses: u64,
    pub symbol_usage_hits: u64,
    pub symbol_usage_misses: u64,
}

/// Specialized cache for navigation analysis results
pub struct NavigationCache {
    // LRU caches for different data types
    file_structures: LruCache<PathBuf, CachedFileStructure>,
    symbol_relationships: LruCache<String, CachedRelationshipAnalysis>,
    file_trees: LruCache<PathBuf, CachedFileTree>,
    symbol_usage: LruCache<String, CachedSymbolUsage>,
    
    // Configuration and metrics
    config: NavigationCacheConfig,
    metrics: NavigationMetrics,
    
    // File modification tracking for invalidation
    file_mod_times: HashMap<PathBuf, SystemTime>,
    
    // Performance tracking
    operation_times: Vec<(Instant, u64)>, // (start_time, duration_ms)
}

impl NavigationCache {
    /// Create a new NavigationCache with default configuration
    pub fn new() -> Self {
        Self::with_config(NavigationCacheConfig::default())
    }
    
    /// Create a new NavigationCache with custom configuration
    pub fn with_config(config: NavigationCacheConfig) -> Self {
        let file_structures = LruCache::new(
            NonZeroUsize::new(config.max_file_structures).unwrap_or(NonZeroUsize::new(500).unwrap())
        );
        let symbol_relationships = LruCache::new(
            NonZeroUsize::new(config.max_symbol_relationships).unwrap_or(NonZeroUsize::new(200).unwrap())
        );
        let file_trees = LruCache::new(
            NonZeroUsize::new(config.max_file_trees).unwrap_or(NonZeroUsize::new(50).unwrap())
        );
        let symbol_usage = LruCache::new(
            NonZeroUsize::new(config.max_symbol_usage).unwrap_or(NonZeroUsize::new(300).unwrap())
        );
        
        Self {
            file_structures,
            symbol_relationships,
            file_trees,
            symbol_usage,
            config,
            metrics: NavigationMetrics::default(),
            file_mod_times: HashMap::new(),
            operation_times: Vec::new(),
        }
    }
    
    /// Get cached file structure analysis
    pub fn get_file_structure(&mut self, file_path: &Path) -> Option<FileStructureAnalysis> {
        let start_time = Instant::now();
        
        // Check if file has been modified since cache
        if let Some(cached) = self.file_structures.peek(file_path) {
            if self.is_file_structure_valid(file_path, cached) {
                // Get the cached data and update access info
                if let Some(cached) = self.file_structures.get_mut(file_path) {
                    cached.access_count += 1;
                    cached.last_accessed = SystemTime::now();
                    self.metrics.file_structure_hits += 1;
                    
                    let result = cached.analysis.clone();
                    let duration = start_time.elapsed().as_millis() as u64;
                    self.record_operation_time(start_time, duration);
                    
                    return Some(result);
                }
            } else {
                // File modified, remove stale entry
                self.file_structures.pop(file_path);
                self.file_mod_times.remove(file_path);
            }
        }
        
        self.metrics.file_structure_misses += 1;
        let duration = start_time.elapsed().as_millis() as u64;
        self.record_operation_time(start_time, duration);
        None
    }
    
    /// Cache file structure analysis
    pub fn cache_file_structure(
        &mut self, 
        file_path: &Path, 
        analysis: FileStructureAnalysis
    ) -> Result<(), SecondaryMindError> {
        // Get file modification time
        let file_modified = std::fs::metadata(file_path)
            .map_err(|e| SecondaryMindError::from_io_error(file_path.to_path_buf(), e))?
            .modified()
            .unwrap_or(SystemTime::now());
        
        let cached = CachedFileStructure {
            analysis,
            file_modified,
            cached_at: SystemTime::now(),
            access_count: 0,
            last_accessed: SystemTime::now(),
        };
        
        // Check if eviction will occur
        if self.file_structures.len() >= self.file_structures.cap().get() {
            self.metrics.cache_evictions += 1;
        }
        
        self.file_structures.put(file_path.to_path_buf(), cached);
        self.file_mod_times.insert(file_path.to_path_buf(), file_modified);
        
        self.update_memory_metrics();
        Ok(())
    }
    
    /// Get cached symbol relationship analysis
    pub fn get_symbol_relationships(&mut self, symbol_id: &str, depth: usize) -> Option<RelationshipAnalysis> {
        let start_time = Instant::now();
        let cache_key = format!("{}:{}", symbol_id, depth);
        
        if let Some(cached) = self.symbol_relationships.peek(&cache_key) {
            if self.is_cache_entry_valid(cached.cached_at) {
                if let Some(cached) = self.symbol_relationships.get_mut(&cache_key) {
                    cached.access_count += 1;
                    cached.last_accessed = SystemTime::now();
                    self.metrics.relationship_hits += 1;
                    
                    let result = cached.analysis.clone();
                    let duration = start_time.elapsed().as_millis() as u64;
                    self.record_operation_time(start_time, duration);
                    
                    return Some(result);
                }
            } else {
                // Expired entry, remove it
                self.symbol_relationships.pop(&cache_key);
            }
        }
        
        self.metrics.relationship_misses += 1;
        let duration = start_time.elapsed().as_millis() as u64;
        self.record_operation_time(start_time, duration);
        None
    }
    
    /// Cache symbol relationship analysis
    pub fn cache_symbol_relationships(
        &mut self,
        symbol_id: &str,
        depth: usize,
        analysis: RelationshipAnalysis,
    ) {
        let cache_key = format!("{}:{}", symbol_id, depth);
        let cached = CachedRelationshipAnalysis {
            analysis,
            cached_at: SystemTime::now(),
            access_count: 0,
            last_accessed: SystemTime::now(),
            analysis_depth: depth,
        };
        
        if self.symbol_relationships.len() >= self.symbol_relationships.cap().get() {
            self.metrics.cache_evictions += 1;
        }
        
        self.symbol_relationships.put(cache_key, cached);
        self.update_memory_metrics();
    }
    
    /// Get cached file tree
    pub fn get_file_tree(&mut self, directory_path: &Path) -> Option<Vec<FileTreeNode>> {
        let start_time = Instant::now();
        
        if let Some(cached) = self.file_trees.peek(directory_path) {
            if self.is_directory_tree_valid(directory_path, cached) {
                if let Some(cached) = self.file_trees.get_mut(directory_path) {
                    cached.access_count += 1;
                    cached.last_accessed = SystemTime::now();
                    self.metrics.file_tree_hits += 1;
                    
                    let result = cached.nodes.clone();
                    let duration = start_time.elapsed().as_millis() as u64;
                    self.record_operation_time(start_time, duration);
                    
                    return Some(result);
                }
            } else {
                // Directory modified, remove stale entry
                self.file_trees.pop(directory_path);
            }
        }
        
        self.metrics.file_tree_misses += 1;
        let duration = start_time.elapsed().as_millis() as u64;
        self.record_operation_time(start_time, duration);
        None
    }
    
    /// Cache file tree data
    pub fn cache_file_tree(
        &mut self,
        directory_path: &Path,
        nodes: Vec<FileTreeNode>,
        total_files: usize,
        total_directories: usize,
    ) -> Result<(), SecondaryMindError> {
        // Get directory modification time
        let directory_modified = std::fs::metadata(directory_path)
            .map_err(|e| SecondaryMindError::from_io_error(directory_path.to_path_buf(), e))?
            .modified()
            .unwrap_or(SystemTime::now());
        
        let cached = CachedFileTree {
            nodes,
            total_files,
            total_directories,
            directory_modified,
            cached_at: SystemTime::now(),
            access_count: 0,
            last_accessed: SystemTime::now(),
        };
        
        if self.file_trees.len() >= self.file_trees.cap().get() {
            self.metrics.cache_evictions += 1;
        }
        
        self.file_trees.put(directory_path.to_path_buf(), cached);
        self.update_memory_metrics();
        Ok(())
    }
    
    /// Get cached symbol usage analysis
    pub fn get_symbol_usage(&mut self, symbol_id: &str) -> Option<SymbolUsageAnalysis> {
        let start_time = Instant::now();
        
        if let Some(cached) = self.symbol_usage.peek(symbol_id) {
            if self.is_cache_entry_valid(cached.cached_at) {
                if let Some(cached) = self.symbol_usage.get_mut(symbol_id) {
                    cached.access_count += 1;
                    cached.last_accessed = SystemTime::now();
                    self.metrics.symbol_usage_hits += 1;
                    
                    let result = cached.usage_data.clone();
                    let duration = start_time.elapsed().as_millis() as u64;
                    self.record_operation_time(start_time, duration);
                    
                    return Some(result);
                }
            } else {
                // Expired entry, remove it
                self.symbol_usage.pop(symbol_id);
            }
        }
        
        self.metrics.symbol_usage_misses += 1;
        let duration = start_time.elapsed().as_millis() as u64;
        self.record_operation_time(start_time, duration);
        None
    }
    
    /// Cache symbol usage analysis
    pub fn cache_symbol_usage(&mut self, symbol_id: &str, usage_data: SymbolUsageAnalysis) {
        let cached = CachedSymbolUsage {
            usage_data,
            cached_at: SystemTime::now(),
            access_count: 0,
            last_accessed: SystemTime::now(),
        };
        
        if self.symbol_usage.len() >= self.symbol_usage.cap().get() {
            self.metrics.cache_evictions += 1;
        }
        
        self.symbol_usage.put(symbol_id.to_string(), cached);
        self.update_memory_metrics();
    }
    
    /// Invalidate cache entries for a specific file
    pub fn invalidate_file(&mut self, file_path: &Path) {
        // Remove file structure cache
        self.file_structures.pop(file_path);
        self.file_mod_times.remove(file_path);
        
        // Remove file tree cache for parent directory
        if let Some(parent) = file_path.parent() {
            self.file_trees.pop(parent);
        }
        
        // Note: Symbol relationships and usage might also be affected,
        // but we don't have direct file->symbol mapping here.
        // In a production system, you might want to maintain reverse indexes.
    }
    
    /// Invalidate all cache entries
    pub fn invalidate_all(&mut self) {
        self.file_structures.clear();
        self.symbol_relationships.clear();
        self.file_trees.clear();
        self.symbol_usage.clear();
        self.file_mod_times.clear();
        self.update_memory_metrics();
    }
    
    /// Perform automatic cleanup of expired entries
    pub fn cleanup_expired_entries(&mut self) {
        let now = SystemTime::now();
        let ttl = std::time::Duration::from_secs(self.config.cache_ttl_seconds);
        
        // Clean file structures
        let mut files_to_remove = Vec::new();
        for (path, cached) in self.file_structures.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > ttl {
                    files_to_remove.push(path.clone());
                }
            }
        }
        for path in files_to_remove {
            self.file_structures.pop(&path);
            self.file_mod_times.remove(&path);
        }
        
        // Clean symbol relationships
        let mut relationships_to_remove = Vec::new();
        for (key, cached) in self.symbol_relationships.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > ttl {
                    relationships_to_remove.push(key.clone());
                }
            }
        }
        for key in relationships_to_remove {
            self.symbol_relationships.pop(&key);
        }
        
        // Clean file trees
        let mut trees_to_remove = Vec::new();
        for (path, cached) in self.file_trees.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > ttl {
                    trees_to_remove.push(path.clone());
                }
            }
        }
        for path in trees_to_remove {
            self.file_trees.pop(&path);
        }
        
        // Clean symbol usage
        let mut usage_to_remove = Vec::new();
        for (key, cached) in self.symbol_usage.iter() {
            if let Ok(age) = now.duration_since(cached.cached_at) {
                if age > ttl {
                    usage_to_remove.push(key.clone());
                }
            }
        }
        for key in usage_to_remove {
            self.symbol_usage.pop(&key);
        }
        
        self.metrics.last_cleanup = now;
        self.update_memory_metrics();
    }
    
    /// Get current performance metrics
    pub fn get_metrics(&mut self) -> NavigationMetrics {
        self.update_cache_hit_rates();
        self.update_memory_metrics();
        self.update_response_time_metrics();
        self.metrics.clone()
    }
    
    /// Check if memory usage exceeds configured limit and perform cleanup if needed
    pub fn check_memory_usage(&mut self) -> bool {
        let current_mb = self.estimate_memory_usage_mb();
        if current_mb > self.config.max_memory_mb as f64 {
            self.perform_memory_cleanup();
            true
        } else {
            false
        }
    }
    
    // Private helper methods
    
    fn is_file_structure_valid(&self, file_path: &Path, cached: &CachedFileStructure) -> bool {
        // Check if file has been modified since cache
        if let Ok(metadata) = std::fs::metadata(file_path) {
            if let Ok(current_modified) = metadata.modified() {
                return current_modified == cached.file_modified && 
                       self.is_cache_entry_valid(cached.cached_at);
            }
        }
        false
    }
    
    fn is_directory_tree_valid(&self, directory_path: &Path, cached: &CachedFileTree) -> bool {
        // Check if directory has been modified since cache
        if let Ok(metadata) = std::fs::metadata(directory_path) {
            if let Ok(current_modified) = metadata.modified() {
                return current_modified == cached.directory_modified && 
                       self.is_cache_entry_valid(cached.cached_at);
            }
        }
        false
    }
    
    fn is_cache_entry_valid(&self, cached_at: SystemTime) -> bool {
        if let Ok(age) = SystemTime::now().duration_since(cached_at) {
            age.as_secs() < self.config.cache_ttl_seconds
        } else {
            false
        }
    }
    
    fn update_cache_hit_rates(&mut self) {
        let total_file_requests = self.metrics.file_structure_hits + self.metrics.file_structure_misses;
        let total_relationship_requests = self.metrics.relationship_hits + self.metrics.relationship_misses;
        let total_tree_requests = self.metrics.file_tree_hits + self.metrics.file_tree_misses;
        let total_usage_requests = self.metrics.symbol_usage_hits + self.metrics.symbol_usage_misses;
        
        let total_requests = total_file_requests + total_relationship_requests + 
                           total_tree_requests + total_usage_requests;
        let total_hits = self.metrics.file_structure_hits + self.metrics.relationship_hits + 
                        self.metrics.file_tree_hits + self.metrics.symbol_usage_hits;
        
        if total_requests > 0 {
            self.metrics.cache_hit_rate = (total_hits as f64) / (total_requests as f64);
        }
    }
    
    fn update_memory_metrics(&mut self) {
        self.metrics.memory_usage_mb = self.estimate_memory_usage_mb();
        self.metrics.total_cache_entries = self.file_structures.len() + 
                                          self.symbol_relationships.len() + 
                                          self.file_trees.len() + 
                                          self.symbol_usage.len();
    }
    
    fn update_response_time_metrics(&mut self) {
        if !self.operation_times.is_empty() {
            let total_time: u64 = self.operation_times.iter().map(|(_, duration)| *duration).sum();
            self.metrics.average_response_time_ms = (total_time as f64) / (self.operation_times.len() as f64);
            
            // Keep only recent operations (last 1000)
            if self.operation_times.len() > 1000 {
                self.operation_times.drain(0..self.operation_times.len() - 1000);
            }
        }
    }
    
    fn record_operation_time(&mut self, start_time: Instant, duration_ms: u64) {
        if self.config.enable_metrics {
            self.operation_times.push((start_time, duration_ms));
        }
    }
    
    fn estimate_memory_usage_mb(&self) -> f64 {
        // Rough estimation of memory usage
        // In a production system, you might want more accurate measurements
        let file_structure_size = self.file_structures.len() * 1024; // ~1KB per entry estimate
        let relationship_size = self.symbol_relationships.len() * 2048; // ~2KB per entry estimate
        let file_tree_size = self.file_trees.len() * 4096; // ~4KB per entry estimate
        let symbol_usage_size = self.symbol_usage.len() * 512; // ~512B per entry estimate
        
        let total_bytes = file_structure_size + relationship_size + file_tree_size + symbol_usage_size;
        (total_bytes as f64) / (1024.0 * 1024.0) // Convert to MB
    }
    
    fn perform_memory_cleanup(&mut self) {
        // Remove least recently used entries until memory usage is acceptable
        let target_mb = (self.config.max_memory_mb as f64) * 0.8; // Target 80% of max
        
        while self.estimate_memory_usage_mb() > target_mb {
            // Remove LRU entries from largest caches first
            let file_tree_size = self.file_trees.len();
            let relationship_size = self.symbol_relationships.len();
            let file_structure_size = self.file_structures.len();
            let symbol_usage_size = self.symbol_usage.len();
            
            if file_tree_size > 0 && file_tree_size >= relationship_size && 
               file_tree_size >= file_structure_size && file_tree_size >= symbol_usage_size {
                self.file_trees.pop_lru();
                self.metrics.cache_evictions += 1;
            } else if relationship_size > 0 && relationship_size >= file_structure_size && 
                     relationship_size >= symbol_usage_size {
                self.symbol_relationships.pop_lru();
                self.metrics.cache_evictions += 1;
            } else if file_structure_size > 0 && file_structure_size >= symbol_usage_size {
                if let Some((path, _)) = self.file_structures.pop_lru() {
                    self.file_mod_times.remove(&path);
                }
                self.metrics.cache_evictions += 1;
            } else if symbol_usage_size > 0 {
                self.symbol_usage.pop_lru();
                self.metrics.cache_evictions += 1;
            } else {
                break; // No more entries to remove
            }
        }
    }
}

impl Default for NavigationMetrics {
    fn default() -> Self {
        Self {
            cache_hit_rate: 0.0,
            memory_usage_mb: 0.0,
            total_cache_entries: 0,
            cache_evictions: 0,
            average_response_time_ms: 0.0,
            background_processing_time_ms: 0.0,
            active_operations: 0,
            last_cleanup: SystemTime::now(),
            file_structure_hits: 0,
            file_structure_misses: 0,
            relationship_hits: 0,
            relationship_misses: 0,
            file_tree_hits: 0,
            file_tree_misses: 0,
            symbol_usage_hits: 0,
            symbol_usage_misses: 0,
        }
    }
}

impl Default for NavigationCache {
    fn default() -> Self {
        Self::new()
    }
}