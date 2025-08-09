// [[SECONDARY_MIND]]/examples/documentation_generator_example.rs
// Purpose: Example demonstrating the documentation generator capabilities
// Architecture: Shows how to use the documentation generator with different formats and contexts

use secondary_mind_core::components::documentation_generator::{
    DocumentationGenerator, DocumentationFormat, DocumentationTemplate
};
use secondary_mind_core::components::enhanced_ai_synthesis_core::ContextBuilder;
use secondary_mind_core::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the documentation generator
    let mut doc_generator = DocumentationGenerator::new()?;
    
    // Create a sample symbol to document
    let symbol = Symbol {
        identifier: "calculate_fibonacci".to_string(),
        kind: SymbolKind::Function,
        location: SymbolLocation {
            path: PathBuf::from("src/math_utils.rs"),
            line: 15,
            column: 8,
        },
    };
    
    // Create context with file content
    let context = ContextBuilder::new()
        .with_current_file(
            PathBuf::from("src/math_utils.rs"),
            Some("pub fn calculate_fibonacci(n: u32) -> u64 {\n    if n <= 1 {\n        n as u64\n    } else {\n        calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)\n    }\n}".to_string())
        )
        .with_project_context("A mathematical utilities library for common algorithms".to_string());
    
    println!("=== Documentation Generator Example ===\n");
    
    // Generate documentation in different formats
    let formats = vec![
        DocumentationFormat::Markdown,
        DocumentationFormat::RustDoc,
        DocumentationFormat::JSDoc,
    ];
    
    for format in formats {
        println!("--- {:?} Format ---", format);
        
        match doc_generator.generate_documentation(&symbol, format.clone(), Some(context.clone())).await {
            Ok(documentation) => {
                println!("Generated Documentation:");
                println!("{}", documentation.content);
                println!("\nQuality Score: {:.2}", documentation.quality_score);
                
                if !documentation.usage_examples.is_empty() {
                    println!("\nUsage Examples:");
                    for (i, example) in documentation.usage_examples.iter().enumerate() {
                        println!("Example {}:\n{}", i + 1, example);
                    }
                }
                
                if !documentation.suggestions.is_empty() {
                    println!("\nImprovement Suggestions:");
                    for suggestion in &documentation.suggestions {
                        println!("- {:?}: {}", suggestion.severity, suggestion.message);
                    }
                }
                
                if !documentation.related_symbols.is_empty() {
                    println!("\nRelated Symbols: {}", documentation.related_symbols.join(", "));
                }
            }
            Err(e) => {
                println!("Error generating documentation: {}", e);
            }
        }
        
        println!("\n" + &"=".repeat(50) + "\n");
    }
    
    // Demonstrate custom template
    println!("--- Custom Template Example ---");
    
    let custom_template = DocumentationTemplate {
        format: DocumentationFormat::PlainText,
        header_template: "FUNCTION: {name}\n".to_string(),
        description_template: "DESCRIPTION: {description}\n".to_string(),
        parameters_template: "PARAMS: {parameters}\n".to_string(),
        returns_template: "RETURNS: {returns}\n".to_string(),
        examples_template: "USAGE:\n{examples}\n".to_string(),
        footer_template: "END\n".to_string(),
    };
    
    doc_generator.add_template(custom_template);
    
    match doc_generator.generate_documentation(&symbol, DocumentationFormat::PlainText, Some(context)).await {
        Ok(documentation) => {
            println!("Custom Template Documentation:");
            println!("{}", documentation.content);
        }
        Err(e) => {
            println!("Error with custom template: {}", e);
        }
    }
    
    // Show available formats
    println!("\nAvailable Documentation Formats:");
    for format in doc_generator.get_available_formats() {
        println!("- {:?}", format);
    }
    
    Ok(())
}