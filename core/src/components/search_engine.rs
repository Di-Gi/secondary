// [[SECONDARY_MIND]]/core/src/components/advanced_search.rs
// Purpose: Provides advanced search capabilities including semantic search, ranking, and search history
// Architecture: Core component that extends basic search with advanced features
// Dependencies: search_index_manager, symbol_relationship_tracker, regex, serde

use crate::components::search_index_manager::{SearchIndexManager, SearchFilters, MatchType, SearchContext};
use crate::components::symbol_relationship_tracker::SymbolRelationshipTracker;
use crate::model::symbol::{Symbol, SymbolKind};
use crate::errors::SecondaryMindError;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use regex::Regex;
use std::time::SystemTime;

/// Configuration for advanced search operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchConfig {
    /// Maximum number of results to return
    pub max_results: usize,
    /// Enable semantic search
    pub enable_semantic_search: bool,
    /// Enable context-based ranking
    pub enable_context_ranking: bool,
    /// Maximum search history entries to keep
    pub max_history_entries: usize,
    /// Minimum similarity threshold for semantic search
    pub semantic_similarity_threshold: f64,
    /// Weight for different ranking factors
    pub ranking_weights: RankingWeights,
}

/// Weights for different ranking factors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingWeights {
    /// Weight for exact matches
    pub exact_match: f64,
    /// Weight for fuzzy match quality
    pub fuzzy_match: f64,
    /// Weight for symbol usage frequency
    pub usage_frequency: f64,
    /// Weight for symbol importance (based on type)
    pub symbol_importance: f64,
    /// Weight for recency of access
    pub recency: f64,
    /// Weight for semantic similarity
    pub semantic_similarity: f64,
}

/// Represents a search query with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    /// The search query string
    pub query: String,
    /// Type of search to perform
    pub search_type: SearchType,
    /// Search filters to apply
    pub filters: SearchFilters,
    /// Context for the search (current file, selection, etc.)
    pub context: Option<SearchQueryContext>,
    /// Timestamp when the query was created
    pub timestamp: SystemTime,
}

/// Types of advanced search
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SearchType {
    /// Basic fuzzy search
    Fuzzy,
    /// Exact string matching
    Exact,
    /// Regular expression search
    Regex,
    /// Semantic search using symbol relationships
    Semantic,
    /// Combined search using multiple strategies
    Combined,
}

/// Context information for a search query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQueryContext {
    /// Current file being viewed
    pub current_file: Option<PathBuf>,
    /// Currently selected text
    pub selected_text: Option<String>,
    /// Symbols in the current context
    pub context_symbols: Vec<String>,
    /// User's recent activity
    pub recent_symbols: Vec<String>,
}

/// Enhanced search result with advanced ranking and context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedSearchResult {
    /// Base search result
    pub base_result: crate::components::search_index_manager::SearchResult,
    /// Advanced ranking score (0.0 to 1.0)
    pub advanced_score: f64,
    /// Breakdown of ranking factors
    pub ranking_factors: RankingFactors,
    /// Semantic similarity information
    pub semantic_info: Option<SemanticInfo>,
    /// Context relevance information
    pub context_relevance: f64,
}

/// Breakdown of ranking factors for transparency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingFactors {
    /// Score from exact/fuzzy matching
    pub match_score: f64,
    /// Score from usage frequency
    pub usage_score: f64,
    /// Score from symbol importance
    pub importance_score: f64,
    /// Score from recency of access
    pub recency_score: f64,
    /// Score from semantic similarity
    pub semantic_score: f64,
    /// Score from context relevance
    pub context_score: f64,
}

/// Semantic similarity information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticInfo {
    /// Related symbols that influenced the match
    pub related_symbols: Vec<String>,
    /// Semantic similarity score
    pub similarity_score: f64,
    /// Explanation of why this result is semantically relevant
    pub explanation: String,
}

/// Search history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHistoryEntry {
    /// The search query
    pub query: SearchQuery,
    /// Number of results found
    pub result_count: usize,
    /// Whether the search was successful
    pub was_successful: bool,
    /// Selected result (if any)
    pub selected_result: Option<String>,
}

/// Saved search configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSearch {
    /// Unique identifier for the saved search
    pub id: String,
    /// Human-readable name for the search
    pub name: String,
    /// The search query
    pub query: SearchQuery,
    /// Description of what this search is for
    pub description: Option<String>,
    /// Tags for categorization
    pub tags: Vec<String>,
    /// When this search was created
    pub created_at: SystemTime,
    /// When this search was last used
    pub last_used: Option<SystemTime>,
    /// How many times this search has been used
    pub usage_count: usize,
}

/// Main component for advanced search capabilities
pub struct SearchEngine {
    /// Basic search index manager
    search_index: SearchIndexManager,
    /// Symbol relationship tracker for semantic search
    relationship_tracker: SymbolRelationshipTracker,
    /// Search configuration
    config: SearchConfig,
    /// Search history
    search_history: VecDeque<SearchHistoryEntry>,
    /// Saved searches
    saved_searches: HashMap<String, SavedSearch>,
    /// File content cache for text search
    file_content_cache: HashMap<PathBuf, String>,
    /// Precompiled regex patterns cache
    regex_cache: HashMap<String, Regex>,
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            max_results: 100,
            enable_semantic_search: true,
            enable_context_ranking: true,
            max_history_entries: 1000,
            semantic_similarity_threshold: 0.3,
            ranking_weights: RankingWeights::default(),
        }
    }
}

impl Default for RankingWeights {
    fn default() -> Self {
        Self {
            exact_match: 1.0,
            fuzzy_match: 0.8,
            usage_frequency: 0.6,
            symbol_importance: 0.4,
            recency: 0.3,
            semantic_similarity: 0.7,
        }
    }
}

impl SearchEngine {
    /// Create a new advanced search engine
    pub fn new(config: SearchConfig) -> Self {
        Self {
            search_index: SearchIndexManager::new(),
            relationship_tracker: SymbolRelationshipTracker::new(),
            config,
            search_history: VecDeque::new(),
            saved_searches: HashMap::new(),
            file_content_cache: HashMap::new(),
            regex_cache: HashMap::new(),
        }
    }

    /// Create with default configuration
    pub fn with_default_config() -> Self {
        Self::new(SearchConfig::default())
    }

    /// Update the search index with new symbols
    pub fn update_index(&mut self, symbols: &[Symbol]) -> Result<(), SecondaryMindError> {
        self.search_index.index_symbols(symbols)?;
        
        // Also update the relationship tracker
        for symbol in symbols {
            self.relationship_tracker.add_symbol_definition(symbol.clone())?;
        }
        
        Ok(())
    }

    /// Perform an advanced search with multiple strategies
    pub fn search(&mut self, query: SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let _start_time = SystemTime::now();
        
        let results = match query.search_type {
            SearchType::Fuzzy => self.fuzzy_search(&query)?,
            SearchType::Exact => self.exact_search(&query)?,
            SearchType::Regex => self.regex_search(&query)?,
            SearchType::Semantic => self.semantic_search(&query)?,
            SearchType::Combined => self.combined_search(&query)?,
        };
        
        // Add to search history
        let history_entry = SearchHistoryEntry {
            query: query.clone(),
            result_count: results.len(),
            was_successful: !results.is_empty(),
            selected_result: None,
        };
        
        self.add_to_history(history_entry);
        
        Ok(results)
    }

    /// Perform fuzzy search with advanced ranking
    fn fuzzy_search(&self, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let basic_results = self.search_index.search_symbols(&query.query, &query.filters);
        self.enhance_results(basic_results, query)
    }

    /// Perform exact search with advanced ranking
    fn exact_search(&self, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let basic_results = self.search_index.search_exact(&query.query, &query.filters);
        self.enhance_results(basic_results, query)
    }

    /// Perform regex search across files
    fn regex_search(&self, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        // Try to get cached regex or compile new one
        let regex = if let Some(cached_regex) = self.regex_cache.get(&query.query) {
            cached_regex.clone()
        } else {
            Regex::new(&query.query)
                .map_err(|e| SecondaryMindError::SearchIndexError {
                    operation: "regex_compile".to_string(),
                    reason: format!("Invalid regex: {}", e)
                })?
        };
        
        let mut results = Vec::new();
        
        // Search in symbol names
        let symbol_results = self.search_index.search_regex(&query.query, &query.filters)?;
        results.extend(self.enhance_results(symbol_results, query)?);
        
        // Search in file contents if enabled
        if query.filters.scope != crate::components::search_index_manager::SearchScope::Global {
            let file_results = self.search_in_file_contents(&regex, query)?;
            results.extend(file_results);
        }
        
        // Sort by advanced score
        results.sort_by(|a, b| b.advanced_score.partial_cmp(&a.advanced_score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Apply result limit
        if results.len() > self.config.max_results {
            results.truncate(self.config.max_results);
        }
        
        Ok(results)
    }

    /// Perform semantic search using symbol relationships
    fn semantic_search(&self, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        if !self.config.enable_semantic_search {
            return self.fuzzy_search(query);
        }
        
        let mut results = Vec::new();
        
        // First, find direct matches
        let direct_results = self.search_index.search_symbols(&query.query, &query.filters);
        
        // For each direct match, find semantically related symbols
        for direct_result in direct_results {
            let enhanced = self.enhance_single_result(direct_result.clone(), query)?;
            results.push(enhanced);
            
            // Find related symbols
            let related_symbols = self.find_semantically_related(&direct_result.symbol.identifier, query);
            for related in related_symbols {
                if results.len() >= self.config.max_results {
                    break;
                }
                results.push(related);
            }
        }
        
        // Also search for symbols that might be semantically related to the query
        let semantic_matches = self.find_semantic_matches(&query.query, query)?;
        results.extend(semantic_matches);
        
        // Sort by advanced score
        results.sort_by(|a, b| b.advanced_score.partial_cmp(&a.advanced_score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Remove duplicates and apply limit
        results.dedup_by(|a, b| a.base_result.symbol.identifier == b.base_result.symbol.identifier);
        if results.len() > self.config.max_results {
            results.truncate(self.config.max_results);
        }
        
        Ok(results)
    }

    /// Perform combined search using multiple strategies
    fn combined_search(&self, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let mut all_results = Vec::new();
        
        // Collect results from different search types
        let fuzzy_results = self.fuzzy_search(query)?;
        let exact_results = self.exact_search(query)?;
        
        all_results.extend(fuzzy_results);
        all_results.extend(exact_results);
        
        // Add semantic results if enabled
        if self.config.enable_semantic_search {
            let semantic_results = self.semantic_search(query)?;
            all_results.extend(semantic_results);
        }
        
        // Remove duplicates based on symbol identifier
        all_results.dedup_by(|a, b| a.base_result.symbol.identifier == b.base_result.symbol.identifier);
        
        // Re-rank all results
        for result in &mut all_results {
            result.advanced_score = self.calculate_advanced_score(&result.base_result, query, &result.ranking_factors);
        }
        
        // Sort by advanced score
        all_results.sort_by(|a, b| b.advanced_score.partial_cmp(&a.advanced_score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Apply result limit
        if all_results.len() > self.config.max_results {
            all_results.truncate(self.config.max_results);
        }
        
        Ok(all_results)
    }

    /// Search in file contents using regex
    fn search_in_file_contents(&self, _regex: &Regex, _query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let results = Vec::new();
        
        // This is a simplified implementation - in practice, you'd want to
        // search through actual file contents and create appropriate symbols
        // for the matches found
        
        Ok(results)
    }

    /// Find semantically related symbols
    fn find_semantically_related(&self, symbol_id: &str, query: &SearchQuery) -> Vec<EnhancedSearchResult> {
        let mut results = Vec::new();
        
        // Find symbols that depend on this symbol
        let dependents = self.relationship_tracker.get_dependents(symbol_id);
        for dependent in dependents {
            if let Some(symbol) = self.get_symbol_by_id(&dependent) {
                let search_result = crate::components::search_index_manager::SearchResult {
                    symbol: symbol.clone(),
                    relevance_score: 0.6, // Lower score for related symbols
                    match_type: MatchType::Semantic,
                    context: SearchContext {
                        surrounding_code: None,
                        file_context: symbol.location.path.to_string_lossy().to_string(),
                        related_symbols: vec![symbol_id.to_string()],
                    },
                };
                
                if let Ok(enhanced) = self.enhance_single_result(search_result, query) {
                    results.push(enhanced);
                }
            }
        }
        
        // Find symbols this symbol depends on
        let dependencies = self.relationship_tracker.get_dependencies(symbol_id);
        for dependency in dependencies {
            if let Some(symbol) = self.get_symbol_by_id(&dependency) {
                let search_result = crate::components::search_index_manager::SearchResult {
                    symbol: symbol.clone(),
                    relevance_score: 0.5, // Even lower score for dependencies
                    match_type: MatchType::Semantic,
                    context: SearchContext {
                        surrounding_code: None,
                        file_context: symbol.location.path.to_string_lossy().to_string(),
                        related_symbols: vec![symbol_id.to_string()],
                    },
                };
                
                if let Ok(enhanced) = self.enhance_single_result(search_result, query) {
                    results.push(enhanced);
                }
            }
        }
        
        results
    }

    /// Find semantic matches for a query
    fn find_semantic_matches(&self, query_text: &str, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let mut results = Vec::new();
        
        // Use fuzzy matching to find similar symbol names
        let similar_symbols = self.search_index.search_symbols(query_text, &query.filters);
        
        for similar in similar_symbols {
            if similar.relevance_score >= self.config.semantic_similarity_threshold {
                let enhanced = self.enhance_single_result(similar, query)?;
                results.push(enhanced);
            }
        }
        
        Ok(results)
    }

    /// Enhance basic search results with advanced ranking
    fn enhance_results(&self, basic_results: Vec<crate::components::search_index_manager::SearchResult>, query: &SearchQuery) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        let mut enhanced_results = Vec::new();
        
        for result in basic_results {
            let enhanced = self.enhance_single_result(result, query)?;
            enhanced_results.push(enhanced);
        }
        
        // Sort by advanced score
        enhanced_results.sort_by(|a, b| b.advanced_score.partial_cmp(&a.advanced_score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(enhanced_results)
    }

    /// Enhance a single search result with advanced ranking
    fn enhance_single_result(&self, result: crate::components::search_index_manager::SearchResult, query: &SearchQuery) -> Result<EnhancedSearchResult, SecondaryMindError> {
        let ranking_factors = self.calculate_ranking_factors(&result, query);
        let advanced_score = self.calculate_advanced_score(&result, query, &ranking_factors);
        let semantic_info = self.calculate_semantic_info(&result, query);
        let context_relevance = self.calculate_context_relevance(&result, query);
        
        Ok(EnhancedSearchResult {
            base_result: result,
            advanced_score,
            ranking_factors,
            semantic_info,
            context_relevance,
        })
    }

    /// Calculate ranking factors for a search result
    fn calculate_ranking_factors(&self, result: &crate::components::search_index_manager::SearchResult, query: &SearchQuery) -> RankingFactors {
        let match_score = result.relevance_score;
        
        let usage_score = if let Some(stats) = self.relationship_tracker.get_usage_stats(&result.symbol.identifier) {
            (stats.reference_count as f64).ln().max(0.0) / 10.0
        } else {
            0.0
        };
        
        let importance_score = self.calculate_symbol_importance(&result.symbol);
        
        let recency_score = if let Some(stats) = self.relationship_tracker.get_usage_stats(&result.symbol.identifier) {
            if let Some(last_accessed) = stats.last_accessed {
                let elapsed = SystemTime::now().duration_since(last_accessed).unwrap_or_default();
                let days = elapsed.as_secs() as f64 / (24.0 * 3600.0);
                (1.0 / (1.0 + days)).max(0.0)
            } else {
                0.0
            }
        } else {
            0.0
        };
        
        let semantic_score = match result.match_type {
            MatchType::Semantic => 0.8,
            MatchType::Exact => 1.0,
            MatchType::Fuzzy => 0.6,
            MatchType::Regex => 0.7,
        };
        
        let context_score = self.calculate_context_relevance(result, query);
        
        RankingFactors {
            match_score,
            usage_score,
            importance_score,
            recency_score,
            semantic_score,
            context_score,
        }
    }

    /// Calculate advanced score using ranking factors and weights
    fn calculate_advanced_score(&self, _result: &crate::components::search_index_manager::SearchResult, _query: &SearchQuery, factors: &RankingFactors) -> f64 {
        let weights = &self.config.ranking_weights;
        
        let weighted_score = 
            factors.match_score * weights.fuzzy_match +
            factors.usage_score * weights.usage_frequency +
            factors.importance_score * weights.symbol_importance +
            factors.recency_score * weights.recency +
            factors.semantic_score * weights.semantic_similarity +
            factors.context_score * 0.2; // Fixed weight for context
        
        // Normalize to 0.0-1.0 range
        weighted_score.min(1.0).max(0.0)
    }

    /// Calculate symbol importance based on its type and characteristics
    fn calculate_symbol_importance(&self, symbol: &Symbol) -> f64 {
        match symbol.kind {
            SymbolKind::TSClass | SymbolKind::Struct => 0.9,
            SymbolKind::TSInterface | SymbolKind::Trait => 0.8,
            SymbolKind::TSFunction | SymbolKind::Function => 0.7,
            SymbolKind::Enum => 0.6,
            SymbolKind::Module => 0.8,
            SymbolKind::Impl => 0.5,
            SymbolKind::Macro => 0.4,
            SymbolKind::Unknown => 0.1,
        }
    }

    /// Calculate semantic information for a result
    fn calculate_semantic_info(&self, result: &crate::components::search_index_manager::SearchResult, _query: &SearchQuery) -> Option<SemanticInfo> {
        if result.match_type == MatchType::Semantic {
            Some(SemanticInfo {
                related_symbols: result.context.related_symbols.clone(),
                similarity_score: result.relevance_score,
                explanation: "Found through symbol relationship analysis".to_string(),
            })
        } else {
            None
        }
    }

    /// Calculate context relevance for a result
    fn calculate_context_relevance(&self, result: &crate::components::search_index_manager::SearchResult, query: &SearchQuery) -> f64 {
        if !self.config.enable_context_ranking {
            return 0.5;
        }
        
        let mut relevance: f64 = 0.0;
        
        if let Some(context) = &query.context {
            // Boost if symbol is in the current file
            if let Some(current_file) = &context.current_file {
                if result.symbol.location.path == *current_file {
                    relevance += 0.3;
                }
            }
            
            // Boost if symbol is in recent activity
            if context.recent_symbols.contains(&result.symbol.identifier) {
                relevance += 0.2;
            }
            
            // Boost if symbol is related to context symbols
            for context_symbol in &context.context_symbols {
                let dependencies = self.relationship_tracker.get_dependencies(context_symbol);
                let dependents = self.relationship_tracker.get_dependents(context_symbol);
                
                if dependencies.contains(&result.symbol.identifier) || 
                   dependents.contains(&result.symbol.identifier) {
                    relevance += 0.1;
                }
            }
        }
        
        relevance.min(1.0)
    }

    /// Get a symbol by its identifier
    fn get_symbol_by_id(&self, _symbol_id: &str) -> Option<Symbol> {
        // This would need to be implemented to look up symbols by ID
        // For now, return None as a placeholder
        None
    }

    /// Add a search to history
    fn add_to_history(&mut self, entry: SearchHistoryEntry) {
        self.search_history.push_back(entry);
        
        // Maintain history size limit
        while self.search_history.len() > self.config.max_history_entries {
            self.search_history.pop_front();
        }
    }

    /// Get search history
    pub fn get_search_history(&self) -> &VecDeque<SearchHistoryEntry> {
        &self.search_history
    }

    /// Save a search for later use
    pub fn save_search(&mut self, saved_search: SavedSearch) {
        self.saved_searches.insert(saved_search.id.clone(), saved_search);
    }

    /// Get saved searches
    pub fn get_saved_searches(&self) -> &HashMap<String, SavedSearch> {
        &self.saved_searches
    }

    /// Execute a saved search
    pub fn execute_saved_search(&mut self, search_id: &str) -> Result<Vec<EnhancedSearchResult>, SecondaryMindError> {
        // Clone the query to avoid borrowing issues
        let query = if let Some(saved_search) = self.saved_searches.get(search_id) {
            saved_search.query.clone()
        } else {
            return Err(SecondaryMindError::SearchIndexError {
                operation: "load_saved_search".to_string(),
                reason: format!("Saved search not found: {}", search_id)
            });
        };
        
        // Update usage stats
        if let Some(saved_search) = self.saved_searches.get_mut(search_id) {
            saved_search.last_used = Some(SystemTime::now());
            saved_search.usage_count += 1;
        }
        
        self.search(query)
    }

    /// Clear search history
    pub fn clear_history(&mut self) {
        self.search_history.clear();
    }

    /// Update configuration
    pub fn update_config(&mut self, config: SearchConfig) {
        self.config = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> &SearchConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::symbol::SymbolLocation;
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

    fn create_test_query(query: &str, search_type: SearchType) -> SearchQuery {
        SearchQuery {
            query: query.to_string(),
            search_type,
            filters: SearchFilters::default(),
            context: None,
            timestamp: SystemTime::now(),
        }
    }

    #[test]
    fn test_search_engine_creation() {
        let engine = SearchEngine::with_default_config();
        assert_eq!(engine.config.max_results, 100);
        assert!(engine.config.enable_semantic_search);
    }

    #[test]
    fn test_fuzzy_search() {
        let mut engine = SearchEngine::with_default_config();
        let symbols = vec![
            create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs"),
            create_test_symbol("myOtherFunction", SymbolKind::Function, "src/lib.rs"),
        ];
        
        engine.update_index(&symbols).unwrap();
        
        let query = create_test_query("myFunc", SearchType::Fuzzy);
        let results = engine.search(query).unwrap();
        
        assert!(!results.is_empty());
        assert!(results[0].advanced_score > 0.0);
    }

    #[test]
    fn test_exact_search() {
        let mut engine = SearchEngine::with_default_config();
        let symbols = vec![
            create_test_symbol("exactMatch", SymbolKind::Function, "src/main.rs"),
        ];
        
        engine.update_index(&symbols).unwrap();
        
        let query = create_test_query("exactMatch", SearchType::Exact);
        let results = engine.search(query).unwrap();
        
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].base_result.symbol.identifier, "exactMatch");
    }

    #[test]
    fn test_search_history() {
        let mut engine = SearchEngine::with_default_config();
        let symbols = vec![
            create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs"),
        ];
        
        engine.update_index(&symbols).unwrap();
        
        let query = create_test_query("test", SearchType::Fuzzy);
        let _results = engine.search(query).unwrap();
        
        assert_eq!(engine.get_search_history().len(), 1);
        assert_eq!(engine.get_search_history()[0].query.query, "test");
    }

    #[test]
    fn test_saved_search() {
        let mut engine = SearchEngine::with_default_config();
        
        let saved_search = SavedSearch {
            id: "test-search".to_string(),
            name: "Test Search".to_string(),
            query: create_test_query("test", SearchType::Fuzzy),
            description: Some("A test search".to_string()),
            tags: vec!["test".to_string()],
            created_at: SystemTime::now(),
            last_used: None,
            usage_count: 0,
        };
        
        engine.save_search(saved_search);
        
        assert_eq!(engine.get_saved_searches().len(), 1);
        assert!(engine.get_saved_searches().contains_key("test-search"));
    }

    #[test]
    fn test_ranking_factors() {
        let engine = SearchEngine::with_default_config();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs");
        
        let result = SearchResult {
            symbol,
            relevance_score: 0.8,
            match_type: MatchType::Exact,
            context: SearchContext {
                surrounding_code: None,
                file_context: "src/main.rs".to_string(),
                related_symbols: Vec::new(),
            },
        };
        
        let query = create_test_query("testFunction", SearchType::Exact);
        let factors = engine.calculate_ranking_factors(&result, &query);
        
        assert_eq!(factors.match_score, 0.8);
        assert!(factors.importance_score > 0.0);
    }

    #[test]
    fn test_symbol_importance_calculation() {
        let engine = SearchEngine::with_default_config();
        
        let class_symbol = create_test_symbol("MyClass", SymbolKind::TSClass, "src/main.ts");
        let function_symbol = create_test_symbol("myFunction", SymbolKind::Function, "src/main.rs");
        
        let class_importance = engine.calculate_symbol_importance(&class_symbol);
        let function_importance = engine.calculate_symbol_importance(&function_symbol);
        
        assert!(class_importance > function_importance);
        assert_eq!(class_importance, 0.9);
        assert_eq!(function_importance, 0.7);
    }
}
