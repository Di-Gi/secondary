// [[SECONDARY_MIND]]/core/src/components/search_index_manager.rs
// Purpose: Provides fast symbol and text search capabilities with fuzzy matching and relevance scoring
// Architecture: Core component that manages search indices for symbols and text content
// Dependencies: std collections, serde for serialization, regex for pattern matching

use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use crate::errors::SecondaryMindError;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use regex::Regex;

/// Configuration for search operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFilters {
    /// Filter by specific symbol types
    pub symbol_types: Vec<SymbolKind>,
    /// Filter by file path patterns (glob-like)
    pub file_patterns: Vec<String>,
    /// Search scope limitation
    pub scope: SearchScope,
    /// Maximum number of results to return
    pub max_results: Option<usize>,
}

/// Defines the scope of search operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SearchScope {
    /// Search across entire project
    Global,
    /// Search within specific directory
    Directory(PathBuf),
    /// Search within specific files
    Files(Vec<PathBuf>),
}

/// Represents a search result with relevance scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// The matching symbol
    pub symbol: Symbol,
    /// Relevance score (0.0 to 1.0, higher is more relevant)
    pub relevance_score: f64,
    /// Type of match found
    pub match_type: MatchType,
    /// Additional context about the match
    pub context: SearchContext,
}

/// Types of matches that can be found
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MatchType {
    /// Exact string match
    Exact,
    /// Fuzzy match using trigrams
    Fuzzy,
    /// Semantic match based on symbol relationships
    Semantic,
    /// Regular expression match
    Regex,
}

/// Additional context information for search results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchContext {
    /// Surrounding code context
    pub surrounding_code: Option<String>,
    /// File-level context information
    pub file_context: String,
    /// Related symbols that influenced the match
    pub related_symbols: Vec<String>,
}

/// Trigram-based index for fast fuzzy searching
#[derive(Debug, Clone)]
struct TrigramIndex {
    /// Maps trigrams to sets of symbol indices
    trigram_to_symbols: HashMap<String, HashSet<usize>>,
    /// Maps symbol indices to their trigram sets
    symbol_trigrams: HashMap<usize, HashSet<String>>,
}

impl TrigramIndex {
    fn new() -> Self {
        Self {
            trigram_to_symbols: HashMap::new(),
            symbol_trigrams: HashMap::new(),
        }
    }

    /// Generate trigrams from a string
    fn generate_trigrams(text: &str) -> HashSet<String> {
        let normalized = text.to_lowercase();
        let _chars: Vec<char> = normalized.chars().collect();
        let mut trigrams = HashSet::new();
        
        // Add padding for better matching
        let padded = format!("  {}  ", normalized);
        let padded_chars: Vec<char> = padded.chars().collect();
        
        for i in 0..padded_chars.len().saturating_sub(2) {
            let trigram: String = padded_chars[i..i+3].iter().collect();
            trigrams.insert(trigram);
        }
        
        trigrams
    }

    /// Add a symbol to the trigram index
    fn add_symbol(&mut self, symbol_index: usize, identifier: &str) {
        let trigrams = Self::generate_trigrams(identifier);
        
        for trigram in &trigrams {
            self.trigram_to_symbols
                .entry(trigram.clone())
                .or_insert_with(HashSet::new)
                .insert(symbol_index);
        }
        
        self.symbol_trigrams.insert(symbol_index, trigrams);
    }

    /// Remove a symbol from the trigram index
    fn remove_symbol(&mut self, symbol_index: usize) {
        if let Some(trigrams) = self.symbol_trigrams.remove(&symbol_index) {
            for trigram in trigrams {
                if let Some(symbol_set) = self.trigram_to_symbols.get_mut(&trigram) {
                    symbol_set.remove(&symbol_index);
                    if symbol_set.is_empty() {
                        self.trigram_to_symbols.remove(&trigram);
                    }
                }
            }
        }
    }

    /// Find symbols that match the query using trigram similarity
    fn search(&self, query: &str) -> Vec<(usize, f64)> {
        let query_trigrams = Self::generate_trigrams(query);
        let mut symbol_scores: HashMap<usize, f64> = HashMap::new();
        
        // Find all symbols that share trigrams with the query
        for trigram in &query_trigrams {
            if let Some(symbol_indices) = self.trigram_to_symbols.get(trigram) {
                for &symbol_index in symbol_indices {
                    *symbol_scores.entry(symbol_index).or_insert(0.0) += 1.0;
                }
            }
        }
        
        // Calculate similarity scores using Jaccard similarity
        let mut results: Vec<(usize, f64)> = symbol_scores
            .into_iter()
            .filter_map(|(symbol_index, shared_count)| {
                if let Some(symbol_trigrams) = self.symbol_trigrams.get(&symbol_index) {
                    let union_size = query_trigrams.len() + symbol_trigrams.len() - shared_count as usize;
                    let similarity = shared_count / union_size as f64;
                    
                    // Only return results with reasonable similarity
                    if similarity > 0.1 {
                        Some((symbol_index, similarity))
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect();
        
        // Sort by similarity score (descending)
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results
    }
}

/// Main search index manager that provides fast symbol and text search
pub struct SearchIndexManager {
    /// All indexed symbols
    symbols: Vec<Symbol>,
    /// Trigram index for fuzzy symbol search
    trigram_index: TrigramIndex,
    /// Maps file paths to symbol indices for file-based filtering
    file_to_symbols: HashMap<PathBuf, Vec<usize>>,
    /// Maps symbol kinds to symbol indices for type filtering
    kind_to_symbols: HashMap<SymbolKind, Vec<usize>>,
    /// Text content index for full-text search
    text_index: HashMap<PathBuf, String>,
    /// Symbol usage statistics for relevance scoring
    usage_stats: HashMap<String, UsageStats>,
}

/// Statistics about symbol usage for relevance scoring
#[derive(Debug, Clone, Default)]
struct UsageStats {
    /// Number of references to this symbol
    reference_count: usize,
    /// Number of times this symbol has been searched
    search_count: usize,
    /// Last time this symbol was accessed
    last_accessed: Option<std::time::SystemTime>,
}

impl Default for SearchFilters {
    fn default() -> Self {
        Self {
            symbol_types: Vec::new(),
            file_patterns: Vec::new(),
            scope: SearchScope::Global,
            max_results: Some(100),
        }
    }
}

impl SearchIndexManager {
    /// Create a new search index manager
    pub fn new() -> Self {
        Self {
            symbols: Vec::new(),
            trigram_index: TrigramIndex::new(),
            file_to_symbols: HashMap::new(),
            kind_to_symbols: HashMap::new(),
            text_index: HashMap::new(),
            usage_stats: HashMap::new(),
        }
    }

    /// Index a collection of symbols for searching
    pub fn index_symbols(&mut self, symbols: &[Symbol]) -> Result<(), SecondaryMindError> {
        // Clear existing indices
        self.clear_index();
        
        // Add all symbols to the index
        for symbol in symbols {
            self.add_symbol(symbol.clone())?;
        }
        
        Ok(())
    }

    /// Add a single symbol to the index
    pub fn add_symbol(&mut self, symbol: Symbol) -> Result<(), SecondaryMindError> {
        let symbol_index = self.symbols.len();
        
        // Add to trigram index
        self.trigram_index.add_symbol(symbol_index, &symbol.identifier);
        
        // Add to file mapping
        self.file_to_symbols
            .entry(symbol.location.path.clone())
            .or_insert_with(Vec::new)
            .push(symbol_index);
        
        // Add to kind mapping
        self.kind_to_symbols
            .entry(symbol.kind.clone())
            .or_insert_with(Vec::new)
            .push(symbol_index);
        
        // Initialize usage stats
        self.usage_stats
            .entry(symbol.identifier.clone())
            .or_insert_with(UsageStats::default);
        
        // Store the symbol
        self.symbols.push(symbol);
        
        Ok(())
    }

    /// Remove symbols from a specific file
    pub fn remove_file_symbols(&mut self, file_path: &Path) -> Result<(), SecondaryMindError> {
        if let Some(symbol_indices) = self.file_to_symbols.remove(file_path) {
            // Remove from trigram index
            for &symbol_index in &symbol_indices {
                self.trigram_index.remove_symbol(symbol_index);
            }
            
            // Mark symbols as removed (we don't actually remove from Vec to maintain indices)
            for &symbol_index in &symbol_indices {
                if symbol_index < self.symbols.len() {
                    // We could mark as removed or rebuild the entire index
                    // For simplicity, we'll rebuild when needed
                }
            }
            
            // Remove from kind mappings
            for kind_symbols in self.kind_to_symbols.values_mut() {
                kind_symbols.retain(|&idx| !symbol_indices.contains(&idx));
            }
        }
        
        Ok(())
    }

    /// Search for symbols using fuzzy matching
    pub fn search_symbols(&self, query: &str, filters: &SearchFilters) -> Vec<SearchResult> {
        if query.is_empty() {
            return Vec::new();
        }
        
        // Get fuzzy matches from trigram index
        let trigram_matches = self.trigram_index.search(query);
        
        let mut results = Vec::new();
        
        for (symbol_index, trigram_score) in trigram_matches {
            if symbol_index >= self.symbols.len() {
                continue;
            }
            
            let symbol = &self.symbols[symbol_index];
            
            // Apply filters
            if !self.passes_filters(symbol, filters) {
                continue;
            }
            
            // Calculate final relevance score
            let relevance_score = self.calculate_relevance_score(
                symbol,
                query,
                trigram_score,
            );
            
            // Create search result
            let result = SearchResult {
                symbol: symbol.clone(),
                relevance_score,
                match_type: self.determine_match_type(query, &symbol.identifier),
                context: self.build_search_context(symbol),
            };
            
            results.push(result);
        }
        
        // Sort by relevance score (descending)
        results.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Apply result limit
        if let Some(max_results) = filters.max_results {
            results.truncate(max_results);
        }
        
        results
    }

    /// Search for exact symbol matches
    pub fn search_exact(&self, query: &str, filters: &SearchFilters) -> Vec<SearchResult> {
        let mut results = Vec::new();
        
        for (_index, symbol) in self.symbols.iter().enumerate() {
            if symbol.identifier == query && self.passes_filters(symbol, filters) {
                let result = SearchResult {
                    symbol: symbol.clone(),
                    relevance_score: 1.0, // Exact matches get perfect score
                    match_type: MatchType::Exact,
                    context: self.build_search_context(symbol),
                };
                results.push(result);
            }
        }
        
        results
    }

    /// Search using regular expressions
    pub fn search_regex(&self, pattern: &str, filters: &SearchFilters) -> Result<Vec<SearchResult>, SecondaryMindError> {
        let regex = Regex::new(pattern)
            .map_err(|e| SecondaryMindError::SearchIndexError {
                operation: "regex_compile".to_string(),
                reason: format!("Invalid regex pattern: {}", e)
            })?;
        
        let mut results = Vec::new();
        
        for symbol in &self.symbols {
            if regex.is_match(&symbol.identifier) && self.passes_filters(symbol, filters) {
                let result = SearchResult {
                    symbol: symbol.clone(),
                    relevance_score: 0.8, // High score for regex matches
                    match_type: MatchType::Regex,
                    context: self.build_search_context(symbol),
                };
                results.push(result);
            }
        }
        
        // Sort by symbol name for consistent ordering
        results.sort_by(|a, b| a.symbol.identifier.cmp(&b.symbol.identifier));
        
        if let Some(max_results) = filters.max_results {
            results.truncate(max_results);
        }
        
        Ok(results)
    }

    /// Get all symbols of a specific kind
    pub fn get_symbols_by_kind(&self, kind: &SymbolKind) -> Vec<&Symbol> {
        if let Some(indices) = self.kind_to_symbols.get(kind) {
            indices.iter()
                .filter_map(|&index| self.symbols.get(index))
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Get all symbols in a specific file
    pub fn get_symbols_in_file(&self, file_path: &Path) -> Vec<&Symbol> {
        if let Some(indices) = self.file_to_symbols.get(file_path) {
            indices.iter()
                .filter_map(|&index| self.symbols.get(index))
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Update usage statistics for a symbol
    pub fn update_usage_stats(&mut self, symbol_name: &str) {
        if let Some(stats) = self.usage_stats.get_mut(symbol_name) {
            stats.search_count += 1;
            stats.last_accessed = Some(std::time::SystemTime::now());
        }
    }

    /// Clear all indices
    fn clear_index(&mut self) {
        self.symbols.clear();
        self.trigram_index = TrigramIndex::new();
        self.file_to_symbols.clear();
        self.kind_to_symbols.clear();
        self.usage_stats.clear();
    }

    /// Check if a symbol passes the given filters
    fn passes_filters(&self, symbol: &Symbol, filters: &SearchFilters) -> bool {
        // Check symbol type filter
        if !filters.symbol_types.is_empty() && !filters.symbol_types.contains(&symbol.kind) {
            return false;
        }
        
        // Check file pattern filter
        if !filters.file_patterns.is_empty() {
            let file_path_str = symbol.location.path.to_string_lossy();
            let matches_pattern = filters.file_patterns.iter().any(|pattern| {
                // Simple glob-like matching (could be enhanced with proper glob library)
                if pattern.contains('*') {
                    let pattern_parts: Vec<&str> = pattern.split('*').collect();
                    if pattern_parts.len() == 2 {
                        file_path_str.starts_with(pattern_parts[0]) && 
                        file_path_str.ends_with(pattern_parts[1])
                    } else {
                        file_path_str.contains(pattern)
                    }
                } else {
                    file_path_str.contains(pattern)
                }
            });
            
            if !matches_pattern {
                return false;
            }
        }
        
        // Check scope filter
        match &filters.scope {
            SearchScope::Global => true,
            SearchScope::Directory(dir) => {
                symbol.location.path.starts_with(dir)
            },
            SearchScope::Files(files) => {
                files.contains(&symbol.location.path)
            },
        }
    }

    /// Calculate relevance score for a symbol match
    fn calculate_relevance_score(&self, symbol: &Symbol, query: &str, trigram_score: f64) -> f64 {
        let mut score = trigram_score;
        
        // Boost exact matches
        if symbol.identifier == query {
            score = 1.0;
        } else if symbol.identifier.to_lowercase() == query.to_lowercase() {
            score = 0.95;
        } else if symbol.identifier.starts_with(query) {
            score = (score + 0.3).min(1.0);
        }
        
        // Apply usage statistics boost
        if let Some(stats) = self.usage_stats.get(&symbol.identifier) {
            let usage_boost = (stats.search_count as f64 * 0.01).min(0.2);
            score = (score + usage_boost).min(1.0);
        }
        
        // Boost based on symbol kind importance
        let kind_boost = match symbol.kind {
            SymbolKind::Function | SymbolKind::TSFunction => 0.1,
            SymbolKind::TSClass | SymbolKind::Struct => 0.15,
            SymbolKind::TSInterface | SymbolKind::Trait => 0.12,
            _ => 0.05,
        };
        
        (score + kind_boost).min(1.0)
    }

    /// Determine the type of match found
    fn determine_match_type(&self, query: &str, identifier: &str) -> MatchType {
        if identifier == query {
            MatchType::Exact
        } else {
            MatchType::Fuzzy
        }
    }

    /// Build search context for a symbol
    fn build_search_context(&self, symbol: &Symbol) -> SearchContext {
        SearchContext {
            surrounding_code: None, // Could be populated with file content
            file_context: symbol.location.path.to_string_lossy().to_string(),
            related_symbols: Vec::new(), // Could be populated with related symbols
        }
    }

    /// Get statistics about the search index
    pub fn get_index_stats(&self) -> IndexStats {
        let mut kind_counts = HashMap::new();
        for symbol in &self.symbols {
            *kind_counts.entry(symbol.kind.clone()).or_insert(0) += 1;
        }
        
        IndexStats {
            total_symbols: self.symbols.len(),
            total_files: self.file_to_symbols.len(),
            symbols_by_kind: kind_counts,
            trigram_count: self.trigram_index.trigram_to_symbols.len(),
        }
    }
}

/// Statistics about the search index
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub total_symbols: usize,
    pub total_files: usize,
    pub symbols_by_kind: HashMap<SymbolKind, usize>,
    pub trigram_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_test_symbol(name: &str, kind: SymbolKind, file: &str) -> Symbol {
        Symbol {
            identifier: name.to_string(),
            kind,
            location: SymbolLocation {
                path: PathBuf::from(file),
                line: 1,
                column: 1,
            },
        }
    }

    #[test]
    fn test_trigram_generation() {
        let trigrams = TrigramIndex::generate_trigrams("hello");
        assert!(trigrams.contains("  h"));
        assert!(trigrams.contains(" he"));
        assert!(trigrams.contains("hel"));
        assert!(trigrams.contains("ell"));
        assert!(trigrams.contains("llo"));
        assert!(trigrams.contains("lo "));
        assert!(trigrams.contains("o  "));
    }

    #[test]
    fn test_symbol_indexing() {
        let mut manager = SearchIndexManager::new();
        let symbols = vec![
            create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("MyStruct", SymbolKind::Struct, "src/lib.rs"),
        ];
        
        manager.index_symbols(&symbols).unwrap();
        assert_eq!(manager.symbols.len(), 2);
        assert_eq!(manager.file_to_symbols.len(), 2);
    }

    #[test]
    fn test_exact_search() {
        let mut manager = SearchIndexManager::new();
        let symbols = vec![
            create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("MyStruct", SymbolKind::Struct, "src/lib.rs"),
        ];
        
        manager.index_symbols(&symbols).unwrap();
        
        let results = manager.search_exact("myFunction", &SearchFilters::default());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].symbol.identifier, "myFunction");
        assert_eq!(results[0].relevance_score, 1.0);
    }

    #[test]
    fn test_fuzzy_search() {
        let mut manager = SearchIndexManager::new();
        let symbols = vec![
            create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("myOtherFunction", SymbolKind::Function, "src/lib.rs"),
            create_test_symbol("SomeStruct", SymbolKind::Struct, "src/types.rs"),
        ];
        
        manager.index_symbols(&symbols).unwrap();
        
        let results = manager.search_symbols("myFunc", &SearchFilters::default());
        assert!(!results.is_empty());
        
        // Should find both functions with "my" prefix
        let function_results: Vec<_> = results.iter()
            .filter(|r| r.symbol.identifier.starts_with("my"))
            .collect();
        assert_eq!(function_results.len(), 2);
    }

    #[test]
    fn test_symbol_kind_filter() {
        let mut manager = SearchIndexManager::new();
        let symbols = vec![
            create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("MyStruct", SymbolKind::Struct, "src/lib.rs"),
        ];
        
        manager.index_symbols(&symbols).unwrap();
        
        let filters = SearchFilters {
            symbol_types: vec![SymbolKind::Function],
            ..Default::default()
        };
        
        let results = manager.search_symbols("my", &filters);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].symbol.kind, SymbolKind::Function);
    }

    #[test]
    fn test_regex_search() {
        let mut manager = SearchIndexManager::new();
        let symbols = vec![
            create_test_symbol("getValue", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("setValue", SymbolKind::Function, "src/lib.rs"),
            create_test_symbol("MyStruct", SymbolKind::Struct, "src/types.rs"),
        ];
        
        manager.index_symbols(&symbols).unwrap();
        
        let results = manager.search_regex(r".*Value", &SearchFilters::default()).unwrap();
        assert_eq!(results.len(), 2);
        
        let names: Vec<_> = results.iter().map(|r| &r.symbol.identifier).collect();
        assert!(names.contains(&&"getValue".to_string()));
        assert!(names.contains(&&"setValue".to_string()));
    }
}
