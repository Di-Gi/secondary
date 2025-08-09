#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
    use std::path::PathBuf;

    fn create_test_symbol() -> Symbol {
        Symbol {
            identifier: "test_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("test.rs"),
                line: 10,
                column: 5,
            },
        }
    }

    #[test]
    fn test_documentation_quality_scorer() {
        let scorer = DocumentationQualityScorer;
        let symbol = create_test_symbol();
        
        // Test high quality documentation
        let good_doc = "This function performs complex calculations.\n\nParameters:\n- x: input value\n\nReturns: calculated result\n\nExample:\n```rust\nlet result = test_function(42);\n```";
        let score = scorer.score_documentation(good_doc, &symbol);
        assert!(score > 0.8, "Good documentation should score highly");
        
        // Test poor quality documentation
        let poor_doc = "test";
        let poor_score = scorer.score_documentation(poor_doc, &symbol);
        assert!(poor_score < 0.3, "Poor documentation should score low");
    }

    #[test]
    fn test_documentation_suggestions() {
        let scorer = DocumentationQualityScorer;
        let symbol = create_test_symbol();
        
        // Test suggestions for minimal documentation
        let minimal_doc = "test";
        let suggestions = scorer.generate_suggestions(minimal_doc, &symbol);
        
        assert!(!suggestions.is_empty(), "Should generate suggestions for poor documentation");
        assert!(suggestions.iter().any(|s| matches!(s.suggestion_type, SuggestionType::MissingDescription)));
    }

    #[test]
    fn test_extract_code_examples() {
        let generator = DocumentationGenerator::new().unwrap();
        
        let content = "Here's an example:\n```rust\nlet x = 5;\n```\n\nAnd another:\n```rust\nlet y = 10;\n```";
        let examples = generator.extract_code_examples(content);
        
        assert_eq!(examples.len(), 2);
        assert_eq!(examples[0], "let x = 5;");
        assert_eq!(examples[1], "let y = 10;");
    }

    #[test]
    fn test_default_templates() {
        let templates = DocumentationGenerator::create_default_templates();
        
        assert!(templates.contains_key(&DocumentationFormat::Markdown));
        assert!(templates.contains_key(&DocumentationFormat::JSDoc));
        assert!(templates.contains_key(&DocumentationFormat::RustDoc));
    }

    #[test]
    fn test_build_documentation_prompt() {
        let generator = DocumentationGenerator::new().unwrap();
        let symbol = create_test_symbol();
        let template = &generator.templates[&DocumentationFormat::Markdown];
        
        let prompt = generator.build_documentation_prompt(&symbol, template);
        
        assert!(prompt.contains("test_function"));
        assert!(prompt.contains("Function"));
        assert!(prompt.contains("test.rs"));
    }
}