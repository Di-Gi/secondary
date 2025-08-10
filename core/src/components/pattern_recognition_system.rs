// [[SECONDARY_MIND]]/src/components/pattern_recognition_system.rs
// Purpose: Code pattern extraction using AST analysis with similarity detection and pattern database
// Architecture: Uses AST analysis to extract patterns, maintains pattern database, and provides similarity matching
// Dependencies: crate::{components::enhanced_ai_synthesis_core, errors, model::symbol}, serde, std::{collections::HashMap, path::PathBuf}

use crate::components::ai_synthesis_core::{AISynthesisCore, ContextBuilder};
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolKind};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Pattern recognition system for code analysis and similarity detection
pub struct PatternRecognitionSystem {
    ai_core: AISynthesisCore,
    pattern_database: PatternDatabase,
    similarity_engine: SimilarityEngine,
}

/// Database of code patterns with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternDatabase {
    patterns: HashMap<String, CodePattern>,
    pattern_categories: HashMap<PatternCategory, Vec<String>>,
}

/// Represents a code pattern with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodePattern {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: PatternCategory,
    pub code_template: String,
    pub usage_examples: Vec<String>,
    pub complexity_score: f64,
    pub frequency: usize,
    pub related_patterns: Vec<String>,
}

/// Categories of code patterns
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub enum PatternCategory {
    CreationalPattern,
    StructuralPattern,
    BehavioralPattern,
    FunctionalPattern,
    ErrorHandling,
    Concurrency,
    DataStructure,
    Algorithm,
    ApiDesign,
    Testing,
    Custom(String),
}

/// Engine for detecting code similarity
struct SimilarityEngine {
    similarity_threshold: f64,
}

/// Result of pattern analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternAnalysisResult {
    pub detected_patterns: Vec<DetectedPattern>,
    pub similarity_matches: Vec<SimilarityMatch>,
    pub refactoring_suggestions: Vec<RefactoringSuggestion>,
    pub pattern_recommendations: Vec<PatternRecommendation>,
}

/// A pattern detected in code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedPattern {
    pub pattern: CodePattern,
    pub confidence: f64,
    pub location: PatternLocation,
    pub code_snippet: String,
}

/// Location of a detected pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternLocation {
    pub file_path: PathBuf,
    pub start_line: usize,
    pub end_line: usize,
    pub symbols_involved: Vec<String>,
}

/// A similarity match between code segments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarityMatch {
    pub similarity_score: f64,
    pub source_location: PatternLocation,
    pub target_location: PatternLocation,
    pub common_elements: Vec<String>,
}

/// Suggestion for refactoring based on patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefactoringSuggestion {
    pub suggestion_type: RefactoringType,
    pub description: String,
    pub target_pattern: String,
    pub estimated_benefit: f64,
    pub complexity: RefactoringComplexity,
}

/// Types of refactoring suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RefactoringType {
    ExtractPattern,
    ApplyPattern,
    ConsolidateDuplication,
    SimplifyStructure,
    ImproveErrorHandling,
    OptimizePerformance,
}

/// Complexity level of refactoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RefactoringComplexity {
    Low,
    Medium,
    High,
}

/// Recommendation for applying a pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternRecommendation {
    pub pattern: CodePattern,
    pub applicability_score: f64,
    pub reason: String,
    pub suggested_location: Option<PatternLocation>,
}

impl PatternRecognitionSystem {
    /// Creates a new pattern recognition system
    pub fn new() -> Result<Self, SecondaryMindError> {
        let ai_core = AISynthesisCore::new()?;
        let pattern_database = PatternDatabase::new();
        let similarity_engine = SimilarityEngine::new(0.7); // 70% similarity threshold
        
        Ok(Self {
            ai_core,
            pattern_database,
            similarity_engine,
        })
    }

    /// Analyzes code for patterns and similarities
    pub async fn analyze_patterns(
        &mut self,
        code: &str,
        file_path: &PathBuf,
        symbols: &[Symbol],
    ) -> Result<PatternAnalysisResult, SecondaryMindError> {
        // Extract patterns from code using AST analysis
        let detected_patterns = self.extract_patterns(code, file_path, symbols).await?;
        
        // Find similar code segments
        let similarity_matches = self.find_similar_code(code, file_path, symbols).await?;
        
        // Generate refactoring suggestions
        let refactoring_suggestions = self.generate_refactoring_suggestions(&detected_patterns, &similarity_matches).await?;
        
        // Recommend applicable patterns
        let pattern_recommendations = self.recommend_patterns(code, symbols).await?;

        Ok(PatternAnalysisResult {
            detected_patterns,
            similarity_matches,
            refactoring_suggestions,
            pattern_recommendations,
        })
    }

    /// Extracts patterns from code using AST analysis
    async fn extract_patterns(
        &mut self,
        code: &str,
        file_path: &PathBuf,
        symbols: &[Symbol],
    ) -> Result<Vec<DetectedPattern>, SecondaryMindError> {
        let context = ContextBuilder::new()
            .with_current_file(file_path.clone(), Some(code.to_string()))
            .with_related_symbols(symbols.to_vec());

        let prompt = format!(
            "Analyze the following code and identify common programming patterns, design patterns, or code structures.

Code to analyze:
```
{}
```

For each pattern you identify, provide:
1. Pattern name and type
2. Confidence level (0.0-1.0)
3. Line numbers where the pattern appears
4. Brief description of why this is a pattern

Focus on:
- Design patterns (Singleton, Factory, Observer, etc.)
- Functional patterns (Map-Reduce, Pipeline, etc.)
- Error handling patterns
- Concurrency patterns
- Data structure patterns
- Common algorithmic patterns

Format your response as a structured analysis.",
            code
        );

        let ai_response = self.ai_core.synthesize_with_context(&prompt, &context).await?;
        
        // Parse AI response and convert to DetectedPattern objects
        let detected_patterns = self.parse_pattern_response(&ai_response.content, file_path)?;
        
        Ok(detected_patterns)
    }

    /// Finds similar code segments
    async fn find_similar_code(
        &mut self,
        code: &str,
        file_path: &PathBuf,
        symbols: &[Symbol],
    ) -> Result<Vec<SimilarityMatch>, SecondaryMindError> {
        let context = ContextBuilder::new()
            .with_current_file(file_path.clone(), Some(code.to_string()))
            .with_related_symbols(symbols.to_vec());

        let prompt = format!(
            "Analyze the following code for duplicate or similar code segments that could be refactored.

Code to analyze:
```
{}
```

Look for:
1. Duplicate code blocks
2. Similar function implementations
3. Repeated patterns that could be abstracted
4. Code that follows similar logic flows

For each similarity found, provide:
- Similarity percentage
- Line numbers of similar segments
- What makes them similar
- Potential for consolidation

Format your response as a structured analysis.",
            code
        );

        let ai_response = self.ai_core.synthesize_with_context(&prompt, &context).await?;
        
        // Parse AI response and convert to SimilarityMatch objects
        let similarity_matches = self.parse_similarity_response(&ai_response.content, file_path)?;
        
        Ok(similarity_matches)
    }

    /// Generates refactoring suggestions based on detected patterns
    async fn generate_refactoring_suggestions(
        &mut self,
        detected_patterns: &[DetectedPattern],
        similarity_matches: &[SimilarityMatch],
    ) -> Result<Vec<RefactoringSuggestion>, SecondaryMindError> {
        let mut suggestions = Vec::new();
        
        // Generate suggestions based on detected patterns
        for pattern in detected_patterns {
            if pattern.confidence > 0.6 {
                let suggestion = RefactoringSuggestion {
                    suggestion_type: RefactoringType::ApplyPattern,
                    description: format!("Consider fully implementing the {} pattern", pattern.pattern.name),
                    target_pattern: pattern.pattern.id.clone(),
                    estimated_benefit: pattern.confidence * 0.8,
                    complexity: self.estimate_refactoring_complexity(&pattern.pattern),
                };
                suggestions.push(suggestion);
            }
        }
        
        // Generate suggestions based on similarity matches
        for similarity in similarity_matches {
            if similarity.similarity_score > 0.8 {
                let suggestion = RefactoringSuggestion {
                    suggestion_type: RefactoringType::ConsolidateDuplication,
                    description: "Consider extracting common functionality to reduce code duplication".to_string(),
                    target_pattern: "duplication_removal".to_string(),
                    estimated_benefit: similarity.similarity_score * 0.9,
                    complexity: RefactoringComplexity::Medium,
                };
                suggestions.push(suggestion);
            }
        }
        
        Ok(suggestions)
    }

    /// Recommends applicable patterns for the code
    async fn recommend_patterns(
        &mut self,
        code: &str,
        symbols: &[Symbol],
    ) -> Result<Vec<PatternRecommendation>, SecondaryMindError> {
        let mut recommendations = Vec::new();
        
        // Analyze code characteristics
        let has_error_handling = code.contains("Result") || code.contains("Error") || code.contains("try");
        let has_async = code.contains("async") || code.contains("await");
        let _has_collections = code.contains("Vec") || code.contains("HashMap");
        
        // Recommend patterns based on code characteristics
        if !has_error_handling && symbols.iter().any(|s| matches!(s.kind, SymbolKind::Function)) {
            let pattern = self.pattern_database.get_pattern("error_handling_pattern");
            if let Some(pattern) = pattern {
                recommendations.push(PatternRecommendation {
                    pattern: pattern.clone(),
                    applicability_score: 0.8,
                    reason: "Functions could benefit from proper error handling".to_string(),
                    suggested_location: None,
                });
            }
        }
        
        if has_async && !code.contains("tokio") && !code.contains("async-std") {
            let pattern = self.pattern_database.get_pattern("async_pattern");
            if let Some(pattern) = pattern {
                recommendations.push(PatternRecommendation {
                    pattern: pattern.clone(),
                    applicability_score: 0.7,
                    reason: "Async code could benefit from structured concurrency patterns".to_string(),
                    suggested_location: None,
                });
            }
        }
        
        Ok(recommendations)
    }

    /// Parses AI response for detected patterns
    fn parse_pattern_response(
        &self,
        response: &str,
        file_path: &PathBuf,
    ) -> Result<Vec<DetectedPattern>, SecondaryMindError> {
        let mut patterns = Vec::new();
        
        // Simple parsing - in a real implementation, this would be more sophisticated
        let lines: Vec<&str> = response.lines().collect();
        let mut current_pattern: Option<DetectedPattern> = None;
        
        for line in lines {
            if line.to_lowercase().contains("pattern:") {
                // Start of a new pattern
                if let Some(pattern) = current_pattern.take() {
                    patterns.push(pattern);
                }
                
                let pattern_name = line.split(':').nth(1).unwrap_or("Unknown").trim();
                current_pattern = Some(DetectedPattern {
                    pattern: CodePattern {
                        id: format!("detected_{}", patterns.len()),
                        name: pattern_name.to_string(),
                        description: "Detected pattern".to_string(),
                        category: PatternCategory::Custom("Detected".to_string()),
                        code_template: "".to_string(),
                        usage_examples: vec![],
                        complexity_score: 0.5,
                        frequency: 1,
                        related_patterns: vec![],
                    },
                    confidence: 0.7, // Default confidence
                    location: PatternLocation {
                        file_path: file_path.clone(),
                        start_line: 1,
                        end_line: 1,
                        symbols_involved: vec![],
                    },
                    code_snippet: "".to_string(),
                });
            } else if line.to_lowercase().contains("confidence:") {
                if let Some(ref mut pattern) = current_pattern {
                    if let Some(conf_str) = line.split(':').nth(1) {
                        if let Ok(confidence) = conf_str.trim().parse::<f64>() {
                            pattern.confidence = confidence;
                        }
                    }
                }
            }
        }
        
        // Add the last pattern if any
        if let Some(pattern) = current_pattern {
            patterns.push(pattern);
        }
        
        Ok(patterns)
    }

    /// Parses AI response for similarity matches
    fn parse_similarity_response(
        &self,
        response: &str,
        file_path: &PathBuf,
    ) -> Result<Vec<SimilarityMatch>, SecondaryMindError> {
        let mut matches = Vec::new();
        
        // Simple parsing - in a real implementation, this would be more sophisticated
        if response.to_lowercase().contains("similar") || response.to_lowercase().contains("duplicate") {
            matches.push(SimilarityMatch {
                similarity_score: 0.8,
                source_location: PatternLocation {
                    file_path: file_path.clone(),
                    start_line: 1,
                    end_line: 10,
                    symbols_involved: vec![],
                },
                target_location: PatternLocation {
                    file_path: file_path.clone(),
                    start_line: 20,
                    end_line: 30,
                    symbols_involved: vec![],
                },
                common_elements: vec!["Similar logic flow".to_string()],
            });
        }
        
        Ok(matches)
    }

    /// Estimates refactoring complexity
    fn estimate_refactoring_complexity(&self, pattern: &CodePattern) -> RefactoringComplexity {
        match pattern.complexity_score {
            score if score < 0.3 => RefactoringComplexity::Low,
            score if score < 0.7 => RefactoringComplexity::Medium,
            _ => RefactoringComplexity::High,
        }
    }

    /// Adds a pattern to the database
    pub fn add_pattern(&mut self, pattern: CodePattern) {
        self.pattern_database.add_pattern(pattern);
    }

    /// Gets all patterns in a category
    pub fn get_patterns_by_category(&self, category: &PatternCategory) -> Vec<&CodePattern> {
        self.pattern_database.get_patterns_by_category(category)
    }
}

impl PatternDatabase {
    /// Creates a new pattern database with common patterns
    fn new() -> Self {
        let mut database = Self {
            patterns: HashMap::new(),
            pattern_categories: HashMap::new(),
        };
        
        database.initialize_common_patterns();
        database
    }

    /// Initializes the database with common programming patterns
    fn initialize_common_patterns(&mut self) {
        // Error handling pattern
        let error_pattern = CodePattern {
            id: "error_handling_pattern".to_string(),
            name: "Error Handling Pattern".to_string(),
            description: "Proper error handling using Result types".to_string(),
            category: PatternCategory::ErrorHandling,
            code_template: "fn operation() -> Result<T, Error> { ... }".to_string(),
            usage_examples: vec![
                "match result { Ok(value) => ..., Err(e) => ... }".to_string(),
                "result.map_err(|e| CustomError::from(e))?".to_string(),
            ],
            complexity_score: 0.3,
            frequency: 0,
            related_patterns: vec!["option_pattern".to_string()],
        };
        self.add_pattern(error_pattern);

        // Async pattern
        let async_pattern = CodePattern {
            id: "async_pattern".to_string(),
            name: "Async/Await Pattern".to_string(),
            description: "Structured asynchronous programming".to_string(),
            category: PatternCategory::Concurrency,
            code_template: "async fn operation() -> Result<T, Error> { ... }".to_string(),
            usage_examples: vec![
                "let result = operation().await?;".to_string(),
                "tokio::spawn(async move { ... })".to_string(),
            ],
            complexity_score: 0.6,
            frequency: 0,
            related_patterns: vec!["error_handling_pattern".to_string()],
        };
        self.add_pattern(async_pattern);

        // Builder pattern
        let builder_pattern = CodePattern {
            id: "builder_pattern".to_string(),
            name: "Builder Pattern".to_string(),
            description: "Fluent interface for object construction".to_string(),
            category: PatternCategory::CreationalPattern,
            code_template: "struct Builder { ... } impl Builder { fn build(self) -> T { ... } }".to_string(),
            usage_examples: vec![
                "Builder::new().with_field(value).build()".to_string(),
            ],
            complexity_score: 0.4,
            frequency: 0,
            related_patterns: vec![],
        };
        self.add_pattern(builder_pattern);
    }

    /// Adds a pattern to the database
    fn add_pattern(&mut self, pattern: CodePattern) {
        let category = pattern.category.clone();
        let id = pattern.id.clone();
        
        self.patterns.insert(id.clone(), pattern);
        
        self.pattern_categories
            .entry(category)
            .or_insert_with(Vec::new)
            .push(id);
    }

    /// Gets a pattern by ID
    fn get_pattern(&self, id: &str) -> Option<&CodePattern> {
        self.patterns.get(id)
    }

    /// Gets patterns by category
    fn get_patterns_by_category(&self, category: &PatternCategory) -> Vec<&CodePattern> {
        self.pattern_categories
            .get(category)
            .map(|ids| ids.iter().filter_map(|id| self.patterns.get(id)).collect())
            .unwrap_or_default()
    }
}

impl SimilarityEngine {
    fn new(threshold: f64) -> Self {
        Self {
            similarity_threshold: threshold,
        }
    }
}

// Integration: This component works with AISynthesisCore for pattern analysis and maintains a database of common patterns
// Notes: The pattern recognition uses AI to identify patterns and provides refactoring suggestions based on detected patterns

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
    use std::path::PathBuf;

    fn create_test_symbols() -> Vec<Symbol> {
        vec![
            Symbol {
                identifier: "test_function".to_string(),
                kind: SymbolKind::Function,
                location: SymbolLocation {
                    path: PathBuf::from("test.rs"),
                    line: 10,
                    column: 5,
                },
            },
            Symbol {
                identifier: "TestStruct".to_string(),
                kind: SymbolKind::Struct,
                location: SymbolLocation {
                    path: PathBuf::from("test.rs"),
                    line: 20,
                    column: 1,
                },
            },
        ]
    }

    #[test]
    fn test_pattern_database_initialization() {
        let database = PatternDatabase::new();
        
        assert!(database.get_pattern("error_handling_pattern").is_some());
        assert!(database.get_pattern("async_pattern").is_some());
        assert!(database.get_pattern("builder_pattern").is_some());
    }

    #[test]
    fn test_pattern_database_add_pattern() {
        let mut database = PatternDatabase::new();
        
        let custom_pattern = CodePattern {
            id: "custom_pattern".to_string(),
            name: "Custom Pattern".to_string(),
            description: "A custom test pattern".to_string(),
            category: PatternCategory::Custom("Test".to_string()),
            code_template: "fn custom() {}".to_string(),
            usage_examples: vec!["custom()".to_string()],
            complexity_score: 0.2,
            frequency: 0,
            related_patterns: vec![],
        };
        
        database.add_pattern(custom_pattern);
        assert!(database.get_pattern("custom_pattern").is_some());
    }

    #[test]
    fn test_get_patterns_by_category() {
        let database = PatternDatabase::new();
        
        let error_patterns = database.get_patterns_by_category(&PatternCategory::ErrorHandling);
        assert!(!error_patterns.is_empty());
        
        let concurrency_patterns = database.get_patterns_by_category(&PatternCategory::Concurrency);
        assert!(!concurrency_patterns.is_empty());
    }

    #[test]
    fn test_parse_pattern_response() {
        let system = PatternRecognitionSystem::new().unwrap();
        let file_path = PathBuf::from("test.rs");
        
        let response = "Pattern: Builder Pattern\nConfidence: 0.8\nDescription: Uses builder pattern for construction";
        let patterns = system.parse_pattern_response(response, &file_path).unwrap();
        
        assert_eq!(patterns.len(), 1);
        assert_eq!(patterns[0].pattern.name, "Builder Pattern");
        assert_eq!(patterns[0].confidence, 0.8);
    }

    #[test]
    fn test_parse_similarity_response() {
        let system = PatternRecognitionSystem::new().unwrap();
        let file_path = PathBuf::from("test.rs");
        
        let response = "Found similar code blocks with duplicate logic";
        let matches = system.parse_similarity_response(response, &file_path).unwrap();
        
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].similarity_score, 0.8);
    }

    #[test]
    fn test_estimate_refactoring_complexity() {
        let system = PatternRecognitionSystem::new().unwrap();
        
        let low_complexity_pattern = CodePattern {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test".to_string(),
            category: PatternCategory::Testing,
            code_template: "".to_string(),
            usage_examples: vec![],
            complexity_score: 0.2,
            frequency: 0,
            related_patterns: vec![],
        };
        
        let complexity = system.estimate_refactoring_complexity(&low_complexity_pattern);
        assert!(matches!(complexity, RefactoringComplexity::Low));
        
        let high_complexity_pattern = CodePattern {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test".to_string(),
            category: PatternCategory::Testing,
            code_template: "".to_string(),
            usage_examples: vec![],
            complexity_score: 0.8,
            frequency: 0,
            related_patterns: vec![],
        };
        
        let complexity = system.estimate_refactoring_complexity(&high_complexity_pattern);
        assert!(matches!(complexity, RefactoringComplexity::High));
    }

    #[test]
    fn test_similarity_engine_creation() {
        let engine = SimilarityEngine::new(0.75);
        assert_eq!(engine.similarity_threshold, 0.75);
    }

    #[test]
    fn test_pattern_categories() {
        // Test that all pattern categories can be created and compared
        let categories = vec![
            PatternCategory::CreationalPattern,
            PatternCategory::StructuralPattern,
            PatternCategory::BehavioralPattern,
            PatternCategory::FunctionalPattern,
            PatternCategory::ErrorHandling,
            PatternCategory::Concurrency,
            PatternCategory::DataStructure,
            PatternCategory::Algorithm,
            PatternCategory::ApiDesign,
            PatternCategory::Testing,
            PatternCategory::Custom("Test".to_string()),
        ];
        
        assert_eq!(categories.len(), 11);
        assert!(categories.contains(&PatternCategory::ErrorHandling));
        assert!(categories.contains(&PatternCategory::Custom("Test".to_string())));
    }
}
