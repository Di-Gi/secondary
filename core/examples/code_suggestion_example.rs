// Example demonstrating the Code Suggestion System
// This example shows how to use the CodeSuggestionSystem to analyze code and generate suggestions

use secondary_mind_core::components::code_suggestion_system::CodeSuggestionSystem;
use secondary_mind_core::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    env_logger::init();

    // Check if API key is available
    if std::env::var("GEMINI_API_KEY").is_err() {
        println!("GEMINI_API_KEY environment variable not set. Skipping AI-powered suggestions.");
        return Ok(());
    }

    // Create the code suggestion system
    let mut suggestion_system = CodeSuggestionSystem::new()?;

    // Example code with quality issues
    let sample_code = r#"
fn process_data(data: Vec<i32>) -> i32 {
    let mut result = 0;
    for i in 0..data.len() {
        if data[i] > 0 {
            if data[i] > 10 {
                if data[i] > 20 {
                    if data[i] > 30 {
                        if data[i] > 40 {
                            result += data[i] * 2;
                        } else {
                            result += data[i] * 3;
                        }
                    } else {
                        result += data[i] * 4;
                    }
                } else {
                    result += data[i] * 5;
                }
            } else {
                result += data[i] * 6;
            }
        } else {
            result += data[i] * 7;
        }
    }
    result
}

fn another_function() {
    let value = some_operation().unwrap();
    println!("Value: {}", value);
}
"#;

    // Create symbols for the functions
    let symbols = vec![
        Symbol {
            identifier: "process_data".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("example.rs"),
                line: 2,
                column: 1,
            },
        },
        Symbol {
            identifier: "another_function".to_string(),
            kind: SymbolKind::Function,
            location: SymbolLocation {
                path: PathBuf::from("example.rs"),
                line: 25,
                column: 1,
            },
        },
    ];

    // Analyze the code for suggestions
    println!("Analyzing code for improvement suggestions...");
    let suggestions = suggestion_system
        .analyze_code_for_suggestions(&PathBuf::from("example.rs"), sample_code, &symbols)
        .await?;

    // Display the suggestions
    println!("\nFound {} suggestions:", suggestions.len());
    for (i, suggestion) in suggestions.iter().enumerate() {
        println!("\n--- Suggestion {} ---", i + 1);
        println!("Title: {}", suggestion.title);
        println!("Type: {:?}", suggestion.suggestion_type);
        println!("Impact: {:?}", suggestion.impact);
        println!("Confidence: {:.2}", suggestion.confidence);
        println!("Description: {}", suggestion.description);
        println!("Location: {}:{}", suggestion.location.line, suggestion.location.column);
        println!("Rationale: {}", suggestion.rationale);
        
        if suggestion.suggested_code != suggestion.original_code {
            println!("\nOriginal code:");
            println!("{}", suggestion.original_code);
            println!("\nSuggested code:");
            println!("{}", suggestion.suggested_code);
        }
    }

    // Demonstrate preview functionality
    if !suggestions.is_empty() {
        println!("\n--- Preview Example ---");
        let first_suggestion = &suggestions[0];
        match suggestion_system.preview_suggestion(first_suggestion) {
            Ok(preview) => {
                println!("Preview of applying first suggestion:");
                println!("{}", preview);
            }
            Err(e) => {
                println!("Could not generate preview: {}", e);
            }
        }
    }

    println!("\nCode suggestion analysis complete!");
    Ok(())
}
"#