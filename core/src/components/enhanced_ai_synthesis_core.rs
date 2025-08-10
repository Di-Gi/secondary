// [[SECONDARY_MIND]]/src/components/enhanced_ai_synthesis_core.rs
// Purpose: Enhanced AI synthesis core with context-aware capabilities, response caching, and confidence scoring
// Architecture: Extends the base AISynthesisCore with advanced features for better developer assistance
// Dependencies: crate::{errors, model::{llm, symbol}}, reqwest, serde, std::{collections::HashMap, time::{SystemTime, Duration}}

use crate::components::ai_synthesis_core::AISynthesisCore;
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolLocation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{SystemTime, Duration};

/// Enhanced AI synthesis core with context awareness and caching
pub struct EnhancedAISynthesisCore {
    base_core: AISynthesisCore,
    response_cache: ResponseCache,
}

/// Builds context for AI queries including current file, selection, and related symbols
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextBuilder {
    pub current_file: Option<PathBuf>,
    pub current_file_content: Option<String>,
    pub selected_code: Option<String>,
    pub selection_range: Option<SelectionRange>,
    pub related_symbols: Vec<Symbol>,
    pub project_context: Option<String>,
}

/// Represents a code selection range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionRange {
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
}

/// AI response with confidence scoring and source attribution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub confidence_score: f64,
    pub sources: Vec<String>,
    pub response_type: ResponseType,
    pub timestamp: SystemTime,
}

/// Types of AI responses for different use cases
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResponseType {
    General,
    CodeSuggestion,
    Documentation,
    PatternAnalysis,
    Explanation,
}

/// Cache for storing AI responses to avoid redundant API calls
struct ResponseCache {
    cache: HashMap<String, CachedResponse>,
    max_size: usize,
    ttl: Duration,
}

#[derive(Debug, Clone)]
struct CachedResponse {
    response: AIResponse,
    created_at: SystemTime,
    access_count: u32,
}

impl EnhancedAISynthesisCore {
    /// Creates a new enhanced AI synthesis core
    pub fn new() -> Result<Self, SecondaryMindError> {
        let base_core = AISynthesisCore::new()?;
        let response_cache = ResponseCache::new(1000, Duration::from_secs(3600)); // 1 hour TTL
        
        Ok(Self {
            base_core,
            response_cache,
        })
    }

    /// Synthesizes AI response with enhanced context awareness
    pub async fn synthesize_with_context(
        &mut self,
        query: &str,
        context: &ContextBuilder,
    ) -> Result<AIResponse, SecondaryMindError> {
        // Generate cache key based on query and context
        let cache_key = self.generate_cache_key(query, context);
        
        // Check cache first
        if let Some(cached_response) = self.response_cache.get(&cache_key) {
            log::info!("Using cached AI response for query");
            return Ok(cached_response.response);
        }

        // Build enhanced context string
        let enhanced_context = self.build_enhanced_context(query, context)?;
        
        // Get response from base core
        let raw_response = self.base_core.synthesize_guidance(enhanced_context).await?;
        
        // Process and enhance the response
        let ai_response = self.process_response(raw_response, ResponseType::General)?;
        
        // Cache the response
        self.response_cache.put(cache_key, ai_response.clone());
        
        Ok(ai_response)
    }

    /// Builds enhanced context string from ContextBuilder
    fn build_enhanced_context(
        &self,
        query: &str,
        context: &ContextBuilder,
    ) -> Result<String, SecondaryMindError> {
        let mut context_parts = Vec::new();
        
        // Add system prompt
        context_parts.push("You are an expert software development assistant. Provide accurate, helpful, and contextually relevant responses.".to_string());
        
        // Add project context if available
        if let Some(project_context) = &context.project_context {
            context_parts.push(format!("Project Context:\n{}", project_context));
        }
        
        // Add current file context
        if let Some(current_file) = &context.current_file {
            context_parts.push(format!("Current File: {}", current_file.display()));
            
            if let Some(content) = &context.current_file_content {
                // Limit content size to avoid token limits
                let truncated_content = if content.len() > 8000 {
                    format!("{}...\n[Content truncated]", &content[..8000])
                } else {
                    content.clone()
                };
                context_parts.push(format!("File Content:\n```\n{}\n```", truncated_content));
            }
        }
        
        // Add selected code if available
        if let Some(selected_code) = &context.selected_code {
            context_parts.push(format!("Selected Code:\n```\n{}\n```", selected_code));
            
            if let Some(range) = &context.selection_range {
                context_parts.push(format!(
                    "Selection Range: Lines {}-{}, Columns {}-{}",
                    range.start_line, range.end_line, range.start_column, range.end_column
                ));
            }
        }
        
        // Add related symbols context
        if !context.related_symbols.is_empty() {
            let symbols_info: Vec<String> = context.related_symbols
                .iter()
                .take(10) // Limit to avoid token overflow
                .map(|symbol| {
                    format!(
                        "- {} ({}): {}:{}:{}",
                        symbol.identifier,
                        symbol.kind,
                        symbol.location.path.display(),
                        symbol.location.line,
                        symbol.location.column
                    )
                })
                .collect();
            
            context_parts.push(format!("Related Symbols:\n{}", symbols_info.join("\n")));
        }
        
        // Add the actual query
        context_parts.push(format!("Query: {}", query));
        
        Ok(context_parts.join("\n\n"))
    }

    /// Processes raw AI response and adds metadata
    fn process_response(
        &self,
        raw_response: String,
        response_type: ResponseType,
    ) -> Result<AIResponse, SecondaryMindError> {
        // Calculate confidence score based on response characteristics
        let confidence_score = self.calculate_confidence_score(&raw_response);
        
        // Extract source references (simplified implementation)
        let sources = self.extract_sources(&raw_response);
        
        Ok(AIResponse {
            content: raw_response,
            confidence_score,
            sources,
            response_type,
            timestamp: SystemTime::now(),
        })
    }

    /// Calculates confidence score based on response characteristics
    fn calculate_confidence_score(&self, response: &str) -> f64 {
        let mut score: f64 = 0.5; // Base score
        
        // Increase confidence for longer, more detailed responses
        if response.len() > 200 {
            score += 0.1;
        }
        if response.len() > 500 {
            score += 0.1;
        }
        
        // Increase confidence for responses with code examples
        if response.contains("```") {
            score += 0.15;
        }
        
        // Increase confidence for structured responses
        if response.contains("1.") || response.contains("- ") {
            score += 0.1;
        }
        
        // Decrease confidence for uncertain language
        if response.to_lowercase().contains("i'm not sure") || 
           response.to_lowercase().contains("might be") ||
           response.to_lowercase().contains("possibly") {
            score -= 0.2;
        }
        
        // Clamp between 0.0 and 1.0
        score.max(0.0).min(1.0)
    }

    /// Extracts source references from response (simplified implementation)
    fn extract_sources(&self, response: &str) -> Vec<String> {
        let mut sources = Vec::new();
        
        // Look for file references
        if response.contains(".rs") || response.contains(".ts") || response.contains(".js") {
            sources.push("Code files referenced".to_string());
        }
        
        // Look for documentation references
        if response.to_lowercase().contains("documentation") {
            sources.push("Documentation".to_string());
        }
        
        sources
    }

    /// Generates cache key for query and context
    fn generate_cache_key(&self, query: &str, context: &ContextBuilder) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        query.hash(&mut hasher);
        
        // Include relevant context in hash
        if let Some(file) = &context.current_file {
            file.hash(&mut hasher);
        }
        if let Some(selection) = &context.selected_code {
            selection.hash(&mut hasher);
        }
        
        format!("ai_cache_{:x}", hasher.finish())
    }
}

impl ContextBuilder {
    /// Creates a new empty context builder
    pub fn new() -> Self {
        Self {
            current_file: None,
            current_file_content: None,
            selected_code: None,
            selection_range: None,
            related_symbols: Vec::new(),
            project_context: None,
        }
    }

    /// Sets the current file context
    pub fn with_current_file(mut self, file_path: PathBuf, content: Option<String>) -> Self {
        self.current_file = Some(file_path);
        self.current_file_content = content;
        self
    }

    /// Sets the selected code context
    pub fn with_selection(mut self, code: String, range: Option<SelectionRange>) -> Self {
        self.selected_code = Some(code);
        self.selection_range = range;
        self
    }

    /// Adds related symbols to the context
    pub fn with_related_symbols(mut self, symbols: Vec<Symbol>) -> Self {
        self.related_symbols = symbols;
        self
    }

    /// Sets project-level context
    pub fn with_project_context(mut self, context: String) -> Self {
        self.project_context = Some(context);
        self
    }
}

impl ResponseCache {
    fn new(max_size: usize, ttl: Duration) -> Self {
        Self {
            cache: HashMap::new(),
            max_size,
            ttl,
        }
    }

    fn get(&mut self, key: &str) -> Option<CachedResponse> {
        // Check if entry exists and is not expired
        if let Some(entry) = self.cache.get(key) {
            if entry.created_at.elapsed().unwrap_or(Duration::MAX) < self.ttl {
                let mut updated_entry = entry.clone();
                updated_entry.access_count += 1;
                self.cache.insert(key.to_string(), updated_entry.clone());
                return Some(updated_entry);
            } else {
                // Remove expired entry
                self.cache.remove(key);
            }
        }
        None
    }

    fn put(&mut self, key: String, response: AIResponse) {
        // Clean up expired entries
        self.cleanup_expired();
        
        // If at capacity, remove least recently used entry
        if self.cache.len() >= self.max_size {
            self.evict_lru();
        }

        let cached_response = CachedResponse {
            response,
            created_at: SystemTime::now(),
            access_count: 1,
        };

        self.cache.insert(key, cached_response);
    }

    fn cleanup_expired(&mut self) {
        let _now = SystemTime::now();
        self.cache.retain(|_, entry| {
            entry.created_at.elapsed().unwrap_or(Duration::MAX) < self.ttl
        });
    }

    fn evict_lru(&mut self) {
        if let Some(lru_key) = self.cache
            .iter()
            .min_by_key(|(_, entry)| entry.access_count)
            .map(|(key, _)| key.clone())
        {
            self.cache.remove(&lru_key);
        }
    }
}

// Integration: This component extends the base AISynthesisCore with enhanced context awareness
// Notes: The caching system helps reduce API costs and improves response times for similar queries
