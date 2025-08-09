// [[SECONDARY_MIND]]/examples/pattern_recognition_example.rs
// Purpose: Example demonstrating the pattern recognition system capabilities
// Architecture: Shows how to use the pattern recognition system to analyze code patterns and similarities

use secondary_mind_core::components::pattern_recognition_system::{
    PatternRecognitionSystem, CodePattern, PatternCategory
};
use secondary_mind_core::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the pattern recognition system
    let mut pattern_system = PatternRecognitionSystem::new()?;
    
    println!("=== Pattern Recognition System Example ===\n");
    
    // Sample code to analyze
    let sample_code = r#"
pub struct DatabaseConnection {
    url: String,
    timeout: Duration,
}

impl DatabaseConnection {
    pub fn new() -> DatabaseConnectionBuilder {
        DatabaseConnectionBuilder::default()
    }
    
    pub async fn connect(&self) -> Result<Connection, DatabaseError> {
        match self.establish_connection().await {
            Ok(conn) => {
                log::info!("Connected to database");
                Ok(conn)
            }
            Err(e) => {
                log::error!("Failed to connect: {}", e);
                Err(DatabaseError::ConnectionFailed(e))
            }
        }
    }
    
    async fn establish_connection(&self) -> Result<Connection, std::io::Error> {
        // Connection logic here
        tokio::time::sleep(self.timeout).await;
        Ok(Connection::new())
    }
}

pub struct DatabaseConnectionBuilder {
    url: Option<String>,
    timeout: Option<Duration>,
}

impl Default for DatabaseConnectionBuilder {
    fn default() -> Self {
        Self {
            url: None,
            timeout: Some(Duration::from_secs(30)),
        }
    }
}

impl DatabaseConnectionBuilder {
    pub fn url(mut self, url: String) -> Self {
        self.url = Some(url);
        self
    }
    
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }
    
    pub fn build(self) -> Result<DatabaseConnection, BuildError> {
        let url = self.url.ok_or(BuildError::MissingUrl)?;
        let timeout = self.timeout.unwrap_or(Duration::from_secs(30));
        
        Ok(DatabaseConnection { url, timeout })
    }
}

// Similar function with duplicate error handling pattern
pub async fn query_database(conn: &DatabaseConnection, query: &str) -> Result<QueryResult, DatabaseError> {
    match conn.execute_query(query).await {
        Ok(result) => {
            log::info!("Query executed successfully");
            Ok(result)
        }
        Err(e) => {
            log::error!("Query failed: {}", e);
            Err(DatabaseError::QueryFailed(e))
        }
    }
}
"#;

    // Create sample symbols
    let symbols = vec![
        Symbol {
            identifier: "DatabaseConnection".to_string(),
            kind: SymbolKind::Struct,
            location: SymbolLocation {
                path: PathBuf::from("database.rs"),
                line: 1,
                column: 1,
            },
        },
        Symbol {
            identifier: "connect".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("database.rs"),
                line: 10,
                column: 5,
            },
        },
        Symbol {
            identifier: "DatabaseConnectionBuilder".to_string(),
            kind: SymbolKind::Struct,
            location: SymbolLocation {
                path: PathBuf::from("database.rs"),
                line: 25,
                column: 1,
            },
        },
    ];
    
    let file_path = PathBuf::from("database.rs");
    
    // Analyze patterns in the code
    println!("--- Analyzing Code Patterns ---");
    match pattern_system.analyze_patterns(sample_code, &file_path, &symbols).await {
        Ok(analysis_result) => {
            println!("✅ Pattern analysis completed!\n");
            
            // Display detected patterns
            if !analysis_result.detected_patterns.is_empty() {
                println!("🔍 Detected Patterns:");
                for (i, pattern) in analysis_result.detected_patterns.iter().enumerate() {
                    println!("  {}. {} (Confidence: {:.2})", 
                        i + 1, 
                        pattern.pattern.name, 
                        pattern.confidence
                    );
                    println!("     Description: {}", pattern.pattern.description);
                    println!("     Category: {:?}", pattern.pattern.category);
                    println!();
                }
            }
            
            // Display similarity matches
            if !analysis_result.similarity_matches.is_empty() {
                println!("🔄 Similarity Matches:");
                for (i, similarity) in analysis_result.similarity_matches.iter().enumerate() {
                    println!("  {}. Similarity Score: {:.2}", i + 1, similarity.similarity_score);
                    println!("     Common Elements: {}", similarity.common_elements.join(", "));
                    println!();
                }
            }
            
            // Display refactoring suggestions
            if !analysis_result.refactoring_suggestions.is_empty() {
                println!("💡 Refactoring Suggestions:");
                for (i, suggestion) in analysis_result.refactoring_suggestions.iter().enumerate() {
                    println!("  {}. {:?} (Benefit: {:.2}, Complexity: {:?})", 
                        i + 1, 
                        suggestion.suggestion_type,
                        suggestion.estimated_benefit,
                        suggestion.complexity
                    );
                    println!("     {}", suggestion.description);
                    println!();
                }
            }
            
            // Display pattern recommendations
            if !analysis_result.pattern_recommendations.is_empty() {
                println!("📋 Pattern Recommendations:");
                for (i, recommendation) in analysis_result.pattern_recommendations.iter().enumerate() {
                    println!("  {}. {} (Applicability: {:.2})", 
                        i + 1, 
                        recommendation.pattern.name,
                        recommendation.applicability_score
                    );
                    println!("     Reason: {}", recommendation.reason);
                    println!();
                }
            }
        }
        Err(e) => {
            println!("❌ Error analyzing patterns: {}", e);
        }
    }
    
    // Demonstrate pattern database functionality
    println!("--- Pattern Database ---");
    
    // Show patterns by category
    let error_patterns = pattern_system.get_patterns_by_category(&PatternCategory::ErrorHandling);
    println!("Error Handling Patterns: {}", error_patterns.len());
    for pattern in error_patterns {
        println!("  - {}: {}", pattern.name, pattern.description);
    }
    
    let concurrency_patterns = pattern_system.get_patterns_by_category(&PatternCategory::Concurrency);
    println!("\nConcurrency Patterns: {}", concurrency_patterns.len());
    for pattern in concurrency_patterns {
        println!("  - {}: {}", pattern.name, pattern.description);
    }
    
    // Add a custom pattern
    println!("\n--- Adding Custom Pattern ---");
    let custom_pattern = CodePattern {
        id: "logging_pattern".to_string(),
        name: "Structured Logging Pattern".to_string(),
        description: "Consistent logging with structured data".to_string(),
        category: PatternCategory::Custom("Observability".to_string()),
        code_template: r#"log::info!("Operation completed", 
    operation = "example", 
    duration_ms = duration.as_millis()
);"#.to_string(),
        usage_examples: vec![
            "log::error!(\"Failed to process\", error = %e, user_id = user.id);".to_string(),
            "log::debug!(\"Cache hit\", key = %cache_key, ttl = cache_ttl);".to_string(),
        ],
        complexity_score: 0.2,
        frequency: 0,
        related_patterns: vec!["error_handling_pattern".to_string()],
    };
    
    pattern_system.add_pattern(custom_pattern);
    println!("✅ Added custom logging pattern to database");
    
    // Show custom patterns
    let custom_patterns = pattern_system.get_patterns_by_category(&PatternCategory::Custom("Observability".to_string()));
    println!("Custom Observability Patterns: {}", custom_patterns.len());
    for pattern in custom_patterns {
        println!("  - {}: {}", pattern.name, pattern.description);
        println!("    Template: {}", pattern.code_template);
    }
    
    Ok(())
}