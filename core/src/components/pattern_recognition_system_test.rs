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
