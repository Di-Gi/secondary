// [[SECONDARY_MIND_CORE]]/src/components/context_collector.rs
// Purpose: Collects contextual information about symbols including relationships, dependencies, and related files.
// Architecture: Analyzes symbol relationships and builds context packages for enhanced user understanding and AI assistance.
// Dependencies: Symbol model, file system utilities, regex for pattern matching.

use crate::model::symbol::{Symbol, RelationshipType};
use crate::errors::SecondaryMindError;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Context package containing all relevant information about a symbol.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextPackage {
    /// The primary symbol this context is about.
    pub primary_symbol: Symbol,
    /// Files that use/import this symbol.
    pub used_by: Vec<FileContext>,
    /// Files/symbols this symbol depends on.
    pub dependencies: Vec<FileContext>,
    /// Related files (tests, configs, types).
    pub related_files: Vec<FileContext>,
    /// Relevance score for this context package.
    pub relevance_score: f32,
}

/// Information about a file in the context.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContext {
    /// Path to the file.
    pub path: PathBuf,
    /// Brief content preview (first few lines or relevant sections).
    pub preview: String,
    /// Type of relationship to the primary symbol.
    pub relationship_type: RelationshipType,
    /// Relevance score for this file.
    pub relevance: f32,
    /// Line numbers where the symbol is referenced.
    pub reference_lines: Vec<usize>,
}

/// Collects contextual information about symbols and their relationships.
pub struct ContextCollector {
    /// Map of all symbols by identifier for quick lookup.
    symbol_map: HashMap<String, Symbol>,
    /// Map of file paths to their content for analysis.
    file_content_cache: HashMap<PathBuf, String>,
    /// Regex patterns for finding symbol references.
    reference_patterns: HashMap<String, Regex>,
}

impl ContextCollector {
    /// Creates a new context collector with the given symbols.
    pub fn new(symbols: Vec<Symbol>) -> Self {
        let mut symbol_map = HashMap::new();
        let mut reference_patterns = HashMap::new();
        
        for symbol in symbols {
            // Create regex pattern for finding references to this symbol
            let pattern = format!(r"\b{}\b", regex::escape(&symbol.identifier));
            if let Ok(regex) = Regex::new(&pattern) {
                reference_patterns.insert(symbol.identifier.clone(), regex);
            }
            symbol_map.insert(symbol.identifier.clone(), symbol);
        }
        
        Self {
            symbol_map,
            file_content_cache: HashMap::new(),
            reference_patterns,
        }
    }
    
    /// Collects comprehensive context for a given symbol.
    pub fn collect_context(&mut self, symbol_identifier: &str, project_root: &Path) -> Result<ContextPackage, SecondaryMindError> {
        let symbol = self.symbol_map.get(symbol_identifier)
            .ok_or_else(|| SecondaryMindError::ConfigError(format!("Symbol '{}' not found", symbol_identifier)))?
            .clone();
        
        let mut used_by = Vec::new();
        let mut dependencies = Vec::new();
        let mut related_files = Vec::new();
        
        // Analyze existing relationships from the symbol
        for relationship in &symbol.relationships {
            match relationship.relationship_type {
                RelationshipType::UsedBy => {
                    if let Ok(file_context) = self.create_file_context(&relationship.target_file, &symbol.identifier, RelationshipType::UsedBy, project_root) {
                        used_by.push(file_context);
                    }
                }
                RelationshipType::Imports | RelationshipType::Uses => {
                    if let Ok(file_context) = self.create_file_context(&relationship.target_file, &symbol.identifier, relationship.relationship_type.clone(), project_root) {
                        dependencies.push(file_context);
                    }
                }
                RelationshipType::Tests | RelationshipType::TestedBy => {
                    if let Ok(file_context) = self.create_file_context(&relationship.target_file, &symbol.identifier, relationship.relationship_type.clone(), project_root) {
                        related_files.push(file_context);
                    }
                }
                _ => {}
            }
        }
        
        // Discover additional relationships by scanning files
        self.discover_additional_relationships(&symbol, project_root, &mut used_by, &mut dependencies, &mut related_files)?;
        
        // Calculate relevance scores
        self.calculate_relevance_scores(&mut used_by);
        self.calculate_relevance_scores(&mut dependencies);
        self.calculate_relevance_scores(&mut related_files);
        
        // Sort by relevance
        used_by.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap_or(std::cmp::Ordering::Equal));
        dependencies.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap_or(std::cmp::Ordering::Equal));
        related_files.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(ContextPackage {
            primary_symbol: symbol,
            used_by,
            dependencies,
            related_files,
            relevance_score: 1.0, // Base relevance for the primary symbol
        })
    }
    
    /// Creates a file context by analyzing the file content.
    fn create_file_context(
        &mut self, 
        file_path: &Path, 
        symbol_identifier: &str, 
        relationship_type: RelationshipType,
        project_root: &Path
    ) -> Result<FileContext, SecondaryMindError> {
        let content = self.get_file_content(file_path)?;
        let reference_lines = self.find_reference_lines(&content, symbol_identifier);
        let preview = self.create_content_preview(&content, &reference_lines);
        
        Ok(FileContext {
            path: file_path.to_path_buf(),
            preview,
            relationship_type,
            relevance: 0.5, // Will be calculated later
            reference_lines,
        })
    }
    
    /// Gets file content, using cache if available.
    fn get_file_content(&mut self, file_path: &Path) -> Result<String, SecondaryMindError> {
        if let Some(content) = self.file_content_cache.get(file_path) {
            return Ok(content.clone());
        }
        
        let content = fs::read_to_string(file_path)
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                source: e 
            })?;
        
        self.file_content_cache.insert(file_path.to_path_buf(), content.clone());
        Ok(content)
    }
    
    /// Finds line numbers where the symbol is referenced.
    fn find_reference_lines(&self, content: &str, symbol_identifier: &str) -> Vec<usize> {
        let mut lines = Vec::new();
        
        if let Some(regex) = self.reference_patterns.get(symbol_identifier) {
            for (line_num, line) in content.lines().enumerate() {
                if regex.is_match(line) {
                    lines.push(line_num + 1); // 1-based line numbers
                }
            }
        }
        
        lines
    }
    
    /// Creates a content preview focusing on relevant lines.
    fn create_content_preview(&self, content: &str, reference_lines: &[usize]) -> String {
        let lines: Vec<&str> = content.lines().collect();
        let mut preview_lines = Vec::new();
        
        if reference_lines.is_empty() {
            // If no specific references, show first few lines
            preview_lines.extend(lines.iter().take(5).map(|s| s.to_string()));
        } else {
            // Show context around reference lines
            let mut included_lines = HashSet::new();
            
            for &line_num in reference_lines.iter().take(3) { // Limit to first 3 references
                let start = (line_num.saturating_sub(2)).max(1);
                let end = (line_num + 2).min(lines.len());
                
                for i in start..=end {
                    included_lines.insert(i);
                }
            }
            
            let mut sorted_lines: Vec<_> = included_lines.into_iter().collect();
            sorted_lines.sort();
            
            for line_num in sorted_lines.iter().take(10) { // Limit preview size
                if let Some(line) = lines.get(line_num - 1) {
                    preview_lines.push(format!("{}: {}", line_num, line));
                }
            }
        }
        
        preview_lines.join("\n")
    }
    
    /// Discovers additional relationships by scanning project files.
    fn discover_additional_relationships(
        &mut self,
        symbol: &Symbol,
        _project_root: &Path,
        used_by: &mut Vec<FileContext>,
        _dependencies: &mut Vec<FileContext>,
        related_files: &mut Vec<FileContext>,
    ) -> Result<(), SecondaryMindError> {
        // Look for test files
        self.find_test_files(symbol, _project_root, related_files)?;
        
        // Look for configuration files
        self.find_config_files(symbol, _project_root, related_files)?;
        
        // Scan for additional usage patterns
        self.scan_for_usage_patterns(symbol, _project_root, used_by)?;
        
        Ok(())
    }
    
    /// Finds test files related to the symbol.
    fn find_test_files(
        &mut self,
        symbol: &Symbol,
        project_root: &Path,
        related_files: &mut Vec<FileContext>,
    ) -> Result<(), SecondaryMindError> {
        let symbol_file_stem = symbol.location.path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        
        // Common test file patterns
        let test_patterns = vec![
            format!("{}.test.ts", symbol_file_stem),
            format!("{}.test.js", symbol_file_stem),
            format!("{}.spec.ts", symbol_file_stem),
            format!("{}.spec.js", symbol_file_stem),
            format!("test_{}.rs", symbol_file_stem),
        ];
        
        for pattern in test_patterns {
            let test_path = symbol.location.path.parent()
                .unwrap_or(project_root)
                .join(&pattern);
            
            if test_path.exists() {
                if let Ok(file_context) = self.create_file_context(&test_path, &symbol.identifier, RelationshipType::Tests, project_root) {
                    related_files.push(file_context);
                }
            }
        }
        
        Ok(())
    }
    
    /// Finds configuration files that might affect the symbol.
    fn find_config_files(
        &mut self,
        symbol: &Symbol,
        project_root: &Path,
        related_files: &mut Vec<FileContext>,
    ) -> Result<(), SecondaryMindError> {
        // Common config file names
        let config_files = vec![
            "package.json",
            "tsconfig.json",
            "Cargo.toml",
            ".env",
            "config.json",
            "config.ts",
            "config.js",
        ];
        
        for config_file in config_files {
            let config_path = project_root.join(config_file);
            if config_path.exists() {
                // Check if the config file mentions the symbol or related terms
                if let Ok(content) = self.get_file_content(&config_path) {
                    let file_stem = symbol.location.path.file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    if content.contains(&symbol.identifier) || 
                       content.contains(&file_stem) {
                        if let Ok(file_context) = self.create_file_context(&config_path, &symbol.identifier, RelationshipType::ConfiguredBy, project_root) {
                            related_files.push(file_context);
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Scans for additional usage patterns in the project.
    fn scan_for_usage_patterns(
        &mut self,
        symbol: &Symbol,
        project_root: &Path,
        used_by: &mut Vec<FileContext>,
    ) -> Result<(), SecondaryMindError> {
        // This is a simplified implementation - in a full version, we'd walk the entire project
        // For now, we'll just check a few common directories
        let search_dirs = vec!["src", "lib", "app", "components"];
        
        for dir_name in search_dirs {
            let search_path = project_root.join(dir_name);
            if search_path.exists() && search_path.is_dir() {
                self.scan_directory_for_usage(&search_path, symbol, used_by)?;
            }
        }
        
        Ok(())
    }
    
    /// Scans a directory for files that use the symbol.
    fn scan_directory_for_usage(
        &mut self,
        dir_path: &Path,
        symbol: &Symbol,
        used_by: &mut Vec<FileContext>,
    ) -> Result<(), SecondaryMindError> {
        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                
                if path.is_file() && self.is_source_file(&path) && path != symbol.location.path {
                    if let Ok(content) = self.get_file_content(&path) {
                        if let Some(regex) = self.reference_patterns.get(&symbol.identifier) {
                            if regex.is_match(&content) {
                                if let Ok(file_context) = self.create_file_context(&path, &symbol.identifier, RelationshipType::Uses, dir_path) {
                                    used_by.push(file_context);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Checks if a file is a source code file we should analyze.
    fn is_source_file(&self, path: &Path) -> bool {
        if let Some(extension) = path.extension().and_then(|s| s.to_str()) {
            matches!(extension, "ts" | "tsx" | "js" | "jsx" | "rs")
        } else {
            false
        }
    }
    
    /// Calculates relevance scores for file contexts.
    fn calculate_relevance_scores(&self, file_contexts: &mut [FileContext]) {
        for context in file_contexts {
            let mut score = 0.5; // Base score
            
            // Boost score based on number of references
            score += (context.reference_lines.len() as f32) * 0.1;
            
            // Boost score for test files
            if matches!(context.relationship_type, RelationshipType::Tests | RelationshipType::TestedBy) {
                score += 0.2;
            }
            
            // Boost score for direct dependencies
            if matches!(context.relationship_type, RelationshipType::Imports | RelationshipType::Uses) {
                score += 0.3;
            }
            
            // Cap the score at 1.0
            context.relevance = score.min(1.0);
        }
    }
}

// Integration: This component will be used by the desktop application to collect context for symbols.
// Notes: The implementation focuses on practical relationship discovery while maintaining performance.