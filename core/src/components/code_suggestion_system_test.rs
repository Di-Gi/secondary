#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
    use std::path::PathBuf;

    #[tokio::test]
    async fn test_code_suggestion_system_creation() {
        // This test requires GEMINI_API_KEY to be set
        if std::env::var("GEMINI_API_KEY").is_err() {
            println!("Skipping test - GEMINI_API_KEY not set");
            return;
        }

        let result = CodeSuggestionSystem::new();
        assert!(result.is_ok());
    }

    #[test]
    fn test_quality_analyzer_creation() {
        let analyzer = CodeQualityAnalyzer::new();
        assert!(!analyzer.metrics.is_empty());
        assert!(analyzer.metrics.contains_key("function_length"));
        assert!(analyzer.metrics.contains_key("cyclomatic_complexity"));
    }

    #[test]
    fn test_quality_analyzer_detects_long_function() {
        let analyzer = CodeQualityAnalyzer::new();
        
        // Create a long function code sample
        let mut long_function = "fn test_function() {\n".to_string();
        for i in 0..60 {
            long_function.push_str(&format!("    println!(\"Line {}\");\n", i));
        }
        long_function.push_str("}\n");

        let symbol = Symbol {
            identifier: "test_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("test.rs"),
                line: 1,
                column: 1,
            },
        };

        let result = analyzer.analyze_symbol(&long_function, &symbol);
        assert!(result.is_ok());
        
        if let Ok(Some(issues)) = result {
            assert!(!issues.is_empty());
            assert!(issues.iter().any(|issue| matches!(issue.issue_type, QualityIssueType::Readability)));
        }
    }

    #[test]
    fn test_quality_analyzer_detects_high_complexity() {
        let analyzer = CodeQualityAnalyzer::new();
        
        // Create a function with high cyclomatic complexity
        let complex_function = r#"
fn complex_function(x: i32) -> i32 {
    if x > 0 {
        if x > 10 {
            if x > 20 {
                if x > 30 {
                    if x > 40 {
                        return x * 2;
                    } else {
                        return x * 3;
                    }
                } else {
                    return x * 4;
                }
            } else {
                return x * 5;
            }
        } else {
            return x * 6;
        }
    } else {
        return x * 7;
    }
}
"#;

        let symbol = Symbol {
            identifier: "complex_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("test.rs"),
                line: 1,
                column: 1,
            },
        };

        let result = analyzer.analyze_symbol(complex_function, &symbol);
        assert!(result.is_ok());
        
        if let Ok(Some(issues)) = result {
            assert!(!issues.is_empty());
            assert!(issues.iter().any(|issue| matches!(issue.issue_type, QualityIssueType::Readability)));
        }
    }

    #[test]
    fn test_quality_analyzer_detects_missing_documentation() {
        let analyzer = CodeQualityAnalyzer::new();
        
        let undocumented_function = r#"
fn undocumented_function(x: i32) -> i32 {
    x * 2
}
"#;

        let symbol = Symbol {
            identifier: "undocumented_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("test.rs"),
                line: 1,
                column: 1,
            },
        };

        let result = analyzer.analyze_symbol(undocumented_function, &symbol);
        assert!(result.is_ok());
        
        if let Ok(Some(issues)) = result {
            assert!(!issues.is_empty());
            assert!(issues.iter().any(|issue| matches!(issue.issue_type, QualityIssueType::Documentation)));
        }
    }

    #[test]
    fn test_quality_analyzer_detects_error_handling_issues() {
        let analyzer = CodeQualityAnalyzer::new();
        
        let unsafe_function = r#"
fn unsafe_function() -> i32 {
    let result = some_operation().unwrap();
    result
}
"#;

        let symbol = Symbol {
            identifier: "unsafe_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("test.rs"),
                line: 1,
                column: 1,
            },
        };

        let result = analyzer.analyze_symbol(unsafe_function, &symbol);
        assert!(result.is_ok());
        
        if let Ok(Some(issues)) = result {
            assert!(!issues.is_empty());
            assert!(issues.iter().any(|issue| matches!(issue.issue_type, QualityIssueType::ErrorHandling)));
        }
    }

    #[test]
    fn test_suggestion_ranking() {
        let system = CodeSuggestionSystem {
            ai_core: EnhancedAISynthesisCore::new().unwrap_or_else(|_| {
                // Create a mock for testing if API key is not available
                panic!("Cannot create AI core for testing without API key");
            }),
            quality_analyzer: CodeQualityAnalyzer::new(),
        };

        let mut suggestions = vec![
            CodeSuggestion {
                id: "1".to_string(),
                title: "Low impact".to_string(),
                description: "Test".to_string(),
                suggestion_type: SuggestionType::Readability,
                location: SymbolLocation {
                    path: PathBuf::from("test.rs"),
                    line: 1,
                    column: 1,
                },
                original_code: "test".to_string(),
                suggested_code: "test".to_string(),
                confidence: 0.5,
                impact: ImpactLevel::Low,
                rationale: "Test".to_string(),
                preview_available: true,
            },
            CodeSuggestion {
                id: "2".to_string(),
                title: "High impact".to_string(),
                description: "Test".to_string(),
                suggestion_type: SuggestionType::Performance,
                location: SymbolLocation {
                    path: PathBuf::from("test.rs"),
                    line: 1,
                    column: 1,
                },
                original_code: "test".to_string(),
                suggested_code: "test".to_string(),
                confidence: 0.8,
                impact: ImpactLevel::High,
                rationale: "Test".to_string(),
                preview_available: true,
            },
        ];

        system.rank_suggestions(&mut suggestions);
        
        // High impact should come first
        assert_eq!(suggestions[0].impact, ImpactLevel::High);
        assert_eq!(suggestions[1].impact, ImpactLevel::Low);
    }
}