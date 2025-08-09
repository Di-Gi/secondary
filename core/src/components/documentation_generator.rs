// [[SECONDARY_MIND]]/src/components/documentation_generator.rs
// Purpose: Automatic documentation generation from symbol analysis with template system and quality scoring
// Architecture: Uses AI synthesis core with symbol context to generate contextual documentation
// Dependencies: crate::{components::enhanced_ai_synthesis_core, errors, model::symbol}, serde, std::{collections::HashMap, path::PathBuf}

use crate::components::enhanced_ai_synthesis_core::{EnhancedAISynthesisCore, ContextBuilder};
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolKind};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;


/// Documentation generator with template system and quality scoring
pub struct DocumentationGenerator {
    ai_core: EnhancedAISynthesisCore,
    templates: HashMap<DocumentationFormat, DocumentationTemplate>,
    quality_scorer: DocumentationQualityScorer,
}

/// Different documentation formats supported
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub enum DocumentationFormat {
    Markdown,
    JSDoc,
    RustDoc,
    PlainText,
    HTML,
}

/// Template for generating documentation in specific formats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationTemplate {
    pub format: DocumentationFormat,
    pub header_template: String,
    pub description_template: String,
    pub parameters_template: String,
    pub returns_template: String,
    pub examples_template: String,
    pub footer_template: String,
}

/// Generated documentation with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedDocumentation {
    pub content: String,
    pub format: DocumentationFormat,
    pub quality_score: f64,
    pub suggestions: Vec<DocumentationSuggestion>,
    pub usage_examples: Vec<String>,
    pub related_symbols: Vec<String>,
}

/// Quality scorer for documentation
struct DocumentationQualityScorer;

/// Suggestions for improving documentation quality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationSuggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
    pub severity: SeverityLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SuggestionType {
    MissingDescription,
    MissingParameters,
    MissingReturnType,
    MissingExamples,
    IncompleteDescription,
    GrammarIssue,
    FormattingIssue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SeverityLevel {
    Low,
    Medium,
    High,
}

impl DocumentationGenerator {
    /// Creates a new documentation generator
    pub fn new() -> Result<Self, SecondaryMindError> {
        let ai_core = EnhancedAISynthesisCore::new()?;
        let templates = Self::create_default_templates();
        let quality_scorer = DocumentationQualityScorer;
        
        Ok(Self {
            ai_core,
            templates,
            quality_scorer,
        })
    }

    /// Generates documentation for a symbol with context awareness
    pub async fn generate_documentation(
        &mut self,
        symbol: &Symbol,
        format: DocumentationFormat,
        context: Option<ContextBuilder>,
    ) -> Result<GeneratedDocumentation, SecondaryMindError> {
        // Build context for AI generation
        let mut doc_context = context.unwrap_or_else(ContextBuilder::new);
        doc_context = doc_context.with_related_symbols(vec![symbol.clone()]);
        
        // Get template for the requested format
        let template = self.templates.get(&format)
            .ok_or_else(|| SecondaryMindError::ConfigError(
                format!("No template found for format: {:?}", format)
            ))?.clone();

        // Generate documentation content using AI
        let documentation_content = self.generate_with_template(symbol, &template, &doc_context).await?;
        
        // Generate usage examples
        let usage_examples = self.generate_usage_examples(symbol, &doc_context).await?;
        
        // Score documentation quality
        let quality_score = self.quality_scorer.score_documentation(&documentation_content, symbol);
        
        // Generate improvement suggestions
        let suggestions = self.quality_scorer.generate_suggestions(&documentation_content, symbol);
        
        // Find related symbols
        let related_symbols = self.find_related_symbols(symbol, &doc_context);

        Ok(GeneratedDocumentation {
            content: documentation_content,
            format,
            quality_score,
            suggestions,
            usage_examples,
            related_symbols,
        })
    }

    /// Generates documentation using a specific template
    async fn generate_with_template(
        &mut self,
        symbol: &Symbol,
        template: &DocumentationTemplate,
        context: &ContextBuilder,
    ) -> Result<String, SecondaryMindError> {
        let prompt = self.build_documentation_prompt(symbol, template);
        
        let ai_response = self.ai_core.synthesize_with_context(&prompt, context).await?;
        
        Ok(ai_response.content)
    }

    /// Builds AI prompt for documentation generation
    fn build_documentation_prompt(&self, symbol: &Symbol, template: &DocumentationTemplate) -> String {
        format!(
            "Generate comprehensive documentation for the following symbol using the specified template format.

Symbol Information:
- Name: {}
- Type: {}
- Location: {}:{}:{}

Template Format: {:?}

Requirements:
1. Provide a clear, concise description of what this symbol does
2. Include parameter descriptions if applicable
3. Describe return values if applicable
4. Add usage examples that demonstrate practical use
5. Follow the template format conventions
6. Use professional, clear language
7. Include any important notes about behavior or constraints

Please generate well-structured documentation that would be helpful for other developers.",
            symbol.identifier,
            symbol.kind,
            symbol.location.path.display(),
            symbol.location.line,
            symbol.location.column,
            template.format
        )
    }

    /// Generates usage examples for a symbol
    async fn generate_usage_examples(
        &mut self,
        symbol: &Symbol,
        context: &ContextBuilder,
    ) -> Result<Vec<String>, SecondaryMindError> {
        let prompt = format!(
            "Generate 2-3 practical usage examples for the symbol '{}' of type '{}'. 
            
            Examples should:
            1. Show realistic use cases
            2. Include proper imports/setup if needed
            3. Demonstrate different scenarios or parameters
            4. Be syntactically correct
            5. Include brief comments explaining the example
            
            Format each example as a separate code block.",
            symbol.identifier,
            symbol.kind
        );

        let ai_response = self.ai_core.synthesize_with_context(&prompt, context).await?;
        
        // Extract code blocks from the response
        let examples = self.extract_code_examples(&ai_response.content);
        
        Ok(examples)
    }

    /// Extracts code examples from AI response
    fn extract_code_examples(&self, content: &str) -> Vec<String> {
        let mut examples = Vec::new();
        let mut in_code_block = false;
        let mut current_example = String::new();
        
        for line in content.lines() {
            if line.starts_with("```") {
                if in_code_block {
                    // End of code block
                    if !current_example.trim().is_empty() {
                        examples.push(current_example.trim().to_string());
                    }
                    current_example.clear();
                    in_code_block = false;
                } else {
                    // Start of code block
                    in_code_block = true;
                }
            } else if in_code_block {
                current_example.push_str(line);
                current_example.push('\n');
            }
        }
        
        // Handle case where code block doesn't end properly
        if in_code_block && !current_example.trim().is_empty() {
            examples.push(current_example.trim().to_string());
        }
        
        examples
    }

    /// Finds symbols related to the given symbol
    fn find_related_symbols(&self, symbol: &Symbol, context: &ContextBuilder) -> Vec<String> {
        let mut related = Vec::new();
        
        // Add symbols from the same file
        for related_symbol in &context.related_symbols {
            if related_symbol.location.path == symbol.location.path && 
               related_symbol.identifier != symbol.identifier {
                related.push(related_symbol.identifier.clone());
            }
        }
        
        // Limit to avoid overwhelming output
        related.truncate(5);
        related
    }

    /// Creates default documentation templates
    fn create_default_templates() -> HashMap<DocumentationFormat, DocumentationTemplate> {
        let mut templates = HashMap::new();
        
        // Markdown template
        templates.insert(DocumentationFormat::Markdown, DocumentationTemplate {
            format: DocumentationFormat::Markdown,
            header_template: "# {name}\n\n".to_string(),
            description_template: "{description}\n\n".to_string(),
            parameters_template: "## Parameters\n\n{parameters}\n\n".to_string(),
            returns_template: "## Returns\n\n{returns}\n\n".to_string(),
            examples_template: "## Examples\n\n{examples}\n\n".to_string(),
            footer_template: "---\n\n".to_string(),
        });
        
        // JSDoc template
        templates.insert(DocumentationFormat::JSDoc, DocumentationTemplate {
            format: DocumentationFormat::JSDoc,
            header_template: "/**\n * {description}\n".to_string(),
            description_template: " * \n".to_string(),
            parameters_template: " * {parameters}\n".to_string(),
            returns_template: " * {returns}\n".to_string(),
            examples_template: " * @example\n * {examples}\n".to_string(),
            footer_template: " */\n".to_string(),
        });
        
        // RustDoc template
        templates.insert(DocumentationFormat::RustDoc, DocumentationTemplate {
            format: DocumentationFormat::RustDoc,
            header_template: "/// {description}\n".to_string(),
            description_template: "///\n".to_string(),
            parameters_template: "/// # Arguments\n/// {parameters}\n".to_string(),
            returns_template: "/// # Returns\n/// {returns}\n".to_string(),
            examples_template: "/// # Examples\n/// ```\n/// {examples}\n/// ```\n".to_string(),
            footer_template: "".to_string(),
        });
        
        templates
    }

    /// Adds a custom template
    pub fn add_template(&mut self, template: DocumentationTemplate) {
        self.templates.insert(template.format.clone(), template);
    }

    /// Gets available documentation formats
    pub fn get_available_formats(&self) -> Vec<DocumentationFormat> {
        self.templates.keys().cloned().collect()
    }
}

impl DocumentationQualityScorer {
    /// Scores documentation quality on a scale of 0.0 to 1.0
    fn score_documentation(&self, content: &str, symbol: &Symbol) -> f64 {
        let mut score = 0.0;
        let mut max_score = 0.0;
        
        // Check for description presence (weight: 0.3)
        max_score += 0.3;
        if content.len() > 50 && !content.trim().is_empty() {
            score += 0.3;
        } else if content.len() > 20 {
            score += 0.15;
        }
        
        // Check for examples (weight: 0.25)
        max_score += 0.25;
        if content.contains("```") || content.contains("example") {
            score += 0.25;
        }
        
        // Check for parameter documentation (weight: 0.2)
        max_score += 0.2;
        if matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            if content.to_lowercase().contains("parameter") || 
               content.to_lowercase().contains("argument") ||
               content.contains("@param") {
                score += 0.2;
            }
        } else {
            score += 0.2; // Not applicable for non-functions
        }
        
        // Check for return documentation (weight: 0.15)
        max_score += 0.15;
        if matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            if content.to_lowercase().contains("return") || content.contains("@returns") {
                score += 0.15;
            }
        } else {
            score += 0.15; // Not applicable for non-functions
        }
        
        // Check for proper formatting (weight: 0.1)
        max_score += 0.1;
        if content.contains('\n') && (content.contains("*") || content.contains("#")) {
            score += 0.1;
        }
        
        // Normalize score
        if max_score > 0.0 {
            score / max_score
        } else {
            0.0
        }
    }

    /// Generates suggestions for improving documentation
    fn generate_suggestions(&self, content: &str, symbol: &Symbol) -> Vec<DocumentationSuggestion> {
        let mut suggestions = Vec::new();
        
        // Check for missing description
        if content.len() < 20 {
            suggestions.push(DocumentationSuggestion {
                suggestion_type: SuggestionType::MissingDescription,
                message: "Add a more detailed description of what this symbol does".to_string(),
                severity: SeverityLevel::High,
            });
        }
        
        // Check for missing examples
        if !content.contains("```") && !content.to_lowercase().contains("example") {
            suggestions.push(DocumentationSuggestion {
                suggestion_type: SuggestionType::MissingExamples,
                message: "Consider adding usage examples to help other developers".to_string(),
                severity: SeverityLevel::Medium,
            });
        }
        
        // Check for missing parameter documentation (functions only)
        if matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            if !content.to_lowercase().contains("parameter") && 
               !content.to_lowercase().contains("argument") &&
               !content.contains("@param") {
                suggestions.push(DocumentationSuggestion {
                    suggestion_type: SuggestionType::MissingParameters,
                    message: "Document function parameters and their types".to_string(),
                    severity: SeverityLevel::Medium,
                });
            }
        }
        
        // Check for missing return documentation (functions only)
        if matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            if !content.to_lowercase().contains("return") && !content.contains("@returns") {
                suggestions.push(DocumentationSuggestion {
                    suggestion_type: SuggestionType::MissingReturnType,
                    message: "Document the return value and its type".to_string(),
                    severity: SeverityLevel::Medium,
                });
            }
        }
        
        suggestions
    }
}

// Integration: This component works with EnhancedAISynthesisCore to generate contextual documentation
// Notes: The template system allows for different documentation formats, and quality scoring helps improve documentation

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