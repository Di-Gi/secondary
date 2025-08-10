// [[SECONDARY_MIND]]/src/components/code_suggestion_system.rs
// Purpose: Implements code suggestion system with AI-powered analysis and improvement recommendations
// Architecture: Analyzes code for improvement opportunities and generates contextual suggestions
// Dependencies: crate::{errors, model::symbol, components::enhanced_ai_synthesis_core}, serde, std::collections::HashMap

use crate::components::ai_synthesis_core::{AISynthesisCore, ContextBuilder, AIResponse};
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolLocation, SymbolKind};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Code suggestion system that analyzes code and provides improvement recommendations
pub struct CodeSuggestionSystem {
    ai_core: AISynthesisCore,
    quality_analyzer: CodeQualityAnalyzer,
}

/// Represents a code suggestion with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSuggestion {
    pub id: String,
    pub title: String,
    pub description: String,
    pub suggestion_type: SuggestionType,
    pub location: SymbolLocation,
    pub original_code: String,
    pub suggested_code: String,
    pub confidence: f64,
    pub impact: ImpactLevel,
    pub rationale: String,
    pub preview_available: bool,
}

/// Types of code suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SuggestionType {
    Performance,
    Readability,
    Security,
    BestPractice,
    ErrorHandling,
    Documentation,
    Refactoring,
    TypeSafety,
}

/// Impact level of applying a suggestion
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum ImpactLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Analyzes code quality and identifies improvement opportunities
struct CodeQualityAnalyzer {
    metrics: HashMap<String, QualityMetric>,
}

#[derive(Debug, Clone)]
struct QualityMetric {
    name: String,
    weight: f64,
    threshold: f64,
}

/// Represents a code quality issue found during analysis
#[derive(Debug, Clone)]
struct QualityIssue {
    pub issue_type: QualityIssueType,
    pub severity: IssueSeverity,
    pub description: String,
    pub code_snippet: String,
    pub location: CodeLocation,
    pub metric_score: f64,
}

/// Types of quality issues that can be detected
#[derive(Debug, Clone)]
enum QualityIssueType {
    Performance,
    Readability,
    Security,
    BestPractice,
    ErrorHandling,
    Documentation,
    TypeSafety,
}

/// Severity levels for quality issues
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
enum IssueSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Location of code within a file
#[derive(Debug, Clone)]
struct CodeLocation {
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
}

/// Result of applying a suggestion with undo capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestionApplication {
    pub suggestion_id: String,
    pub applied_at: std::time::SystemTime,
    pub original_content: String,
    pub modified_content: String,
    pub file_path: PathBuf,
    pub backup_created: bool,
}

impl CodeSuggestionSystem {
    /// Creates a new code suggestion system
    pub fn new() -> Result<Self, SecondaryMindError> {
        let ai_core = AISynthesisCore::new()?;
        let quality_analyzer = CodeQualityAnalyzer::new();
        
        Ok(Self {
            ai_core,
            quality_analyzer,
        })
    }

    /// Analyzes code and generates improvement suggestions
    pub async fn analyze_code_for_suggestions(
        &mut self,
        file_path: &PathBuf,
        content: &str,
        symbols: &[Symbol],
    ) -> Result<Vec<CodeSuggestion>, SecondaryMindError> {
        log::info!("Analyzing code for suggestions: {}", file_path.display());
        
        // Step 1: Analyze code quality metrics
        let quality_issues = self.quality_analyzer.analyze_code(content, symbols)?;
        
        // Step 2: Generate AI-powered suggestions for each issue
        let mut suggestions = Vec::new();
        
        for issue in quality_issues {
            if let Some(suggestion) = self.generate_ai_suggestion(file_path, content, &issue).await? {
                suggestions.push(suggestion);
            }
        }
        
        // Step 3: Rank suggestions by impact and confidence
        self.rank_suggestions(&mut suggestions);
        
        log::info!("Generated {} code suggestions for {}", suggestions.len(), file_path.display());
        Ok(suggestions)
    }

    /// Generates AI-powered suggestion for a specific quality issue
    async fn generate_ai_suggestion(
        &mut self,
        file_path: &PathBuf,
        content: &str,
        issue: &QualityIssue,
    ) -> Result<Option<CodeSuggestion>, SecondaryMindError> {
        // Build context for AI query
        let selection_range = crate::components::ai_synthesis_core::SelectionRange {
            start_line: issue.location.start_line,
            start_column: issue.location.start_column,
            end_line: issue.location.end_line,
            end_column: issue.location.end_column,
        };
        
        let context = ContextBuilder::new()
            .with_current_file(file_path.clone(), Some(content.to_string()))
            .with_selection(issue.code_snippet.clone(), Some(selection_range))
            .with_project_context(format!(
                "Code quality issue detected: {} (severity: {:?})",
                issue.description, issue.severity
            ));

        // Create AI query for code improvement
        let query = format!(
            "Analyze this code and provide a specific improvement suggestion:\n\n\
            Issue: {}\n\
            Code: ```\n{}\n```\n\n\
            Please provide:\n\
            1. A clear title for the improvement\n\
            2. A detailed explanation of why this change is beneficial\n\
            3. The improved code snippet\n\
            4. Any potential risks or considerations",
            issue.description, issue.code_snippet
        );

        // Get AI response
        let ai_response = self.ai_core.synthesize_with_context(&query, &context).await?;
        
        // Parse AI response into structured suggestion
        self.parse_ai_response_to_suggestion(file_path, &issue, ai_response)
    }

    /// Parses AI response into a structured code suggestion
    fn parse_ai_response_to_suggestion(
        &self,
        file_path: &PathBuf,
        issue: &QualityIssue,
        ai_response: AIResponse,
    ) -> Result<Option<CodeSuggestion>, SecondaryMindError> {
        let content = &ai_response.content;
        
        // Extract title (look for patterns like "Title:" or first line)
        let title = self.extract_title_from_response(content)
            .unwrap_or_else(|| format!("Improve {}", issue.issue_type.to_string()));

        // Extract suggested code (look for code blocks)
        let suggested_code = self.extract_code_from_response(content)
            .unwrap_or_else(|| issue.code_snippet.clone());

        // Extract rationale
        let rationale = self.extract_rationale_from_response(content)
            .unwrap_or_else(|| "AI-generated improvement suggestion".to_string());

        // Map quality issue type to suggestion type
        let suggestion_type = match issue.issue_type {
            QualityIssueType::Performance => SuggestionType::Performance,
            QualityIssueType::Readability => SuggestionType::Readability,
            QualityIssueType::Security => SuggestionType::Security,
            QualityIssueType::BestPractice => SuggestionType::BestPractice,
            QualityIssueType::ErrorHandling => SuggestionType::ErrorHandling,
            QualityIssueType::Documentation => SuggestionType::Documentation,
            QualityIssueType::TypeSafety => SuggestionType::TypeSafety,
        };

        // Map severity to impact level
        let impact = match issue.severity {
            IssueSeverity::Low => ImpactLevel::Low,
            IssueSeverity::Medium => ImpactLevel::Medium,
            IssueSeverity::High => ImpactLevel::High,
            IssueSeverity::Critical => ImpactLevel::Critical,
        };

        let suggestion = CodeSuggestion {
            id: format!("suggestion_{}_{}", 
                       std::time::SystemTime::now()
                           .duration_since(std::time::UNIX_EPOCH)
                           .unwrap_or_default()
                           .as_millis(),
                       issue.location.start_line),
            title,
            description: issue.description.clone(),
            suggestion_type,
            location: SymbolLocation {
                path: file_path.clone(),
                line: issue.location.start_line,
                column: issue.location.start_column,
            },
            original_code: issue.code_snippet.clone(),
            suggested_code,
            confidence: ai_response.confidence_score,
            impact,
            rationale,
            preview_available: true,
        };

        Ok(Some(suggestion))
    }

    /// Ranks suggestions by impact and confidence
    fn rank_suggestions(&self, suggestions: &mut Vec<CodeSuggestion>) {
        suggestions.sort_by(|a, b| {
            // Primary sort by impact (higher impact first)
            let impact_cmp = b.impact.cmp(&a.impact);
            if impact_cmp != std::cmp::Ordering::Equal {
                return impact_cmp;
            }
            
            // Secondary sort by confidence (higher confidence first)
            b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    /// Applies a suggestion to the code with preview and undo capabilities
    pub async fn apply_suggestion(
        &self,
        suggestion: &CodeSuggestion,
        create_backup: bool,
    ) -> Result<SuggestionApplication, SecondaryMindError> {
        log::info!("Applying suggestion: {}", suggestion.id);
        
        // Read current file content
        let current_content = std::fs::read_to_string(&suggestion.location.path)
            .map_err(|e| SecondaryMindError::IoError {
                path: suggestion.location.path.clone(),
                message: e.to_string(),
            })?;

        // Create backup if requested
        if create_backup {
            let backup_path = format!("{}.backup", suggestion.location.path.display());
            std::fs::write(&backup_path, &current_content)
                .map_err(|e| SecondaryMindError::IoError {
                    path: PathBuf::from(backup_path),
                    message: e.to_string(),
                })?;
        }

        // Apply the suggestion (replace original code with suggested code)
        let modified_content = self.apply_code_replacement(
            &current_content,
            &suggestion.original_code,
            &suggestion.suggested_code,
            suggestion.location.line,
        )?;

        // Write modified content back to file
        std::fs::write(&suggestion.location.path, &modified_content)
            .map_err(|e| SecondaryMindError::IoError {
                path: suggestion.location.path.clone(),
                message: e.to_string(),
            })?;

        let application = SuggestionApplication {
            suggestion_id: suggestion.id.clone(),
            applied_at: std::time::SystemTime::now(),
            original_content: current_content,
            modified_content,
            file_path: suggestion.location.path.clone(),
            backup_created: create_backup,
        };

        log::info!("Successfully applied suggestion: {}", suggestion.id);
        Ok(application)
    }

    /// Undoes a previously applied suggestion
    pub async fn undo_suggestion(
        &self,
        application: &SuggestionApplication,
    ) -> Result<(), SecondaryMindError> {
        log::info!("Undoing suggestion: {}", application.suggestion_id);
        
        // Restore original content
        std::fs::write(&application.file_path, &application.original_content)
            .map_err(|e| SecondaryMindError::IoError {
                path: application.file_path.clone(),
                message: e.to_string(),
            })?;

        log::info!("Successfully undid suggestion: {}", application.suggestion_id);
        Ok(())
    }

    /// Generates a preview of what the code would look like after applying the suggestion
    pub fn preview_suggestion(&self, suggestion: &CodeSuggestion) -> Result<String, SecondaryMindError> {
        // Read current file content
        let current_content = std::fs::read_to_string(&suggestion.location.path)
            .map_err(|e| SecondaryMindError::IoError {
                path: suggestion.location.path.clone(),
                message: e.to_string(),
            })?;

        // Apply the replacement and return the result
        self.apply_code_replacement(
            &current_content,
            &suggestion.original_code,
            &suggestion.suggested_code,
            suggestion.location.line,
        )
    }

    /// Applies code replacement at a specific location
    fn apply_code_replacement(
        &self,
        content: &str,
        original_code: &str,
        suggested_code: &str,
        target_line: usize,
    ) -> Result<String, SecondaryMindError> {
        let lines: Vec<&str> = content.lines().collect();
        
        // Find the exact location of the original code
        let original_lines: Vec<&str> = original_code.lines().collect();
        
        // Simple replacement strategy: find the original code and replace it
        if let Some(start_idx) = self.find_code_location(&lines, &original_lines, target_line) {
            let mut result_lines = Vec::new();
            
            // Add lines before the replacement
            result_lines.extend_from_slice(&lines[..start_idx]);
            
            // Add the suggested code
            result_lines.extend(suggested_code.lines());
            
            // Add lines after the replacement
            let end_idx = start_idx + original_lines.len();
            if end_idx < lines.len() {
                result_lines.extend_from_slice(&lines[end_idx..]);
            }
            
            Ok(result_lines.join("\n"))
        } else {
            Err(SecondaryMindError::AIError(
                "Could not locate original code for replacement".to_string()
            ))
        }
    }

    /// Finds the location of code to replace
    fn find_code_location(
        &self,
        lines: &[&str],
        original_lines: &[&str],
        hint_line: usize,
    ) -> Option<usize> {
        // Start searching around the hint line
        let start_search = hint_line.saturating_sub(5);
        let end_search = (hint_line + 5).min(lines.len());
        
        for i in start_search..end_search {
            if i + original_lines.len() <= lines.len() {
                let mut matches = true;
                for (j, original_line) in original_lines.iter().enumerate() {
                    if lines[i + j].trim() != original_line.trim() {
                        matches = false;
                        break;
                    }
                }
                if matches {
                    return Some(i);
                }
            }
        }
        
        None
    }

    /// Extracts title from AI response
    fn extract_title_from_response(&self, content: &str) -> Option<String> {
        // Look for patterns like "Title:", "1.", or use first line
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("Title:") {
                return Some(trimmed.strip_prefix("Title:").unwrap().trim().to_string());
            }
            if trimmed.starts_with("1.") {
                return Some(trimmed.strip_prefix("1.").unwrap().trim().to_string());
            }
            if !trimmed.is_empty() && trimmed.len() < 100 {
                return Some(trimmed.to_string());
            }
        }
        None
    }

    /// Extracts code from AI response (looks for code blocks)
    fn extract_code_from_response(&self, content: &str) -> Option<String> {
        let mut in_code_block = false;
        let mut code_lines = Vec::new();
        
        for line in content.lines() {
            if line.trim().starts_with("```") {
                if in_code_block {
                    // End of code block
                    break;
                } else {
                    // Start of code block
                    in_code_block = true;
                    continue;
                }
            }
            
            if in_code_block {
                code_lines.push(line);
            }
        }
        
        if !code_lines.is_empty() {
            Some(code_lines.join("\n"))
        } else {
            None
        }
    }

    /// Extracts rationale from AI response
    fn extract_rationale_from_response(&self, content: &str) -> Option<String> {
        // Look for explanation sections
        let mut rationale_lines = Vec::new();
        let mut collecting = false;
        
        for line in content.lines() {
            let trimmed = line.trim().to_lowercase();
            
            if trimmed.contains("explanation") || 
               trimmed.contains("rationale") || 
               trimmed.contains("why") ||
               trimmed.contains("benefit") {
                collecting = true;
                continue;
            }
            
            if collecting && !line.trim().is_empty() {
                rationale_lines.push(line.trim());
            }
            
            // Stop collecting if we hit a code block or new section
            if line.trim().starts_with("```") || 
               (line.trim().starts_with("#") && collecting) {
                break;
            }
        }
        
        if !rationale_lines.is_empty() {
            Some(rationale_lines.join(" "))
        } else {
            // Fallback: use first paragraph
            content.lines()
                .take_while(|line| !line.trim().is_empty())
                .map(|line| line.trim())
                .collect::<Vec<_>>()
                .join(" ")
                .into()
        }
    }
}

impl CodeQualityAnalyzer {
    /// Creates a new code quality analyzer with default metrics
    fn new() -> Self {
        let mut metrics = HashMap::new();
        
        // Define quality metrics with weights and thresholds
        metrics.insert("function_length".to_string(), QualityMetric {
            name: "Function Length".to_string(),
            weight: 0.8,
            threshold: 50.0, // lines
        });
        
        metrics.insert("cyclomatic_complexity".to_string(), QualityMetric {
            name: "Cyclomatic Complexity".to_string(),
            weight: 0.9,
            threshold: 10.0,
        });
        
        metrics.insert("nesting_depth".to_string(), QualityMetric {
            name: "Nesting Depth".to_string(),
            weight: 0.7,
            threshold: 4.0,
        });
        
        metrics.insert("documentation_coverage".to_string(), QualityMetric {
            name: "Documentation Coverage".to_string(),
            weight: 0.6,
            threshold: 0.8, // 80%
        });
        
        metrics.insert("error_handling".to_string(), QualityMetric {
            name: "Error Handling".to_string(),
            weight: 0.8,
            threshold: 0.9, // 90%
        });

        Self { metrics }
    }

    /// Analyzes code and returns quality issues
    fn analyze_code(&self, content: &str, symbols: &[Symbol]) -> Result<Vec<QualityIssue>, SecondaryMindError> {
        let mut issues = Vec::new();
        
        // Analyze each symbol for quality issues
        for symbol in symbols {
            if let Some(symbol_issues) = self.analyze_symbol(content, symbol)? {
                issues.extend(symbol_issues);
            }
        }
        
        // Analyze overall file quality
        issues.extend(self.analyze_file_quality(content)?);
        
        // Sort issues by severity and metric score
        issues.sort_by(|a, b| {
            let severity_cmp = b.severity.cmp(&a.severity);
            if severity_cmp != std::cmp::Ordering::Equal {
                return severity_cmp;
            }
            b.metric_score.partial_cmp(&a.metric_score).unwrap_or(std::cmp::Ordering::Equal)
        });
        
        Ok(issues)
    }

    /// Analyzes a specific symbol for quality issues
    fn analyze_symbol(&self, content: &str, symbol: &Symbol) -> Result<Option<Vec<QualityIssue>>, SecondaryMindError> {
        let mut issues = Vec::new();
        
        // Extract the symbol's code
        let symbol_code = self.extract_symbol_code(content, symbol)?;
        if symbol_code.is_empty() {
            return Ok(None);
        }

        // Check function length
        if matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            if let Some(issue) = self.check_function_length(&symbol_code, symbol)? {
                issues.push(issue);
            }
        }

        // Check cyclomatic complexity
        if let Some(issue) = self.check_cyclomatic_complexity(&symbol_code, symbol)? {
            issues.push(issue);
        }

        // Check nesting depth
        if let Some(issue) = self.check_nesting_depth(&symbol_code, symbol)? {
            issues.push(issue);
        }

        // Check documentation
        if let Some(issue) = self.check_documentation(&symbol_code, symbol)? {
            issues.push(issue);
        }

        // Check error handling
        if let Some(issue) = self.check_error_handling(&symbol_code, symbol)? {
            issues.push(issue);
        }

        Ok(if issues.is_empty() { None } else { Some(issues) })
    }

    /// Analyzes overall file quality
    fn analyze_file_quality(&self, content: &str) -> Result<Vec<QualityIssue>, SecondaryMindError> {
        let mut issues = Vec::new();
        
        // Check for TODO/FIXME comments
        if let Some(issue) = self.check_todo_comments(content)? {
            issues.push(issue);
        }
        
        // Check for magic numbers
        if let Some(issue) = self.check_magic_numbers(content)? {
            issues.push(issue);
        }
        
        // Check for long lines
        if let Some(issue) = self.check_long_lines(content)? {
            issues.push(issue);
        }

        Ok(issues)
    }

    /// Extracts code for a specific symbol
    fn extract_symbol_code(&self, content: &str, symbol: &Symbol) -> Result<String, SecondaryMindError> {
        let lines: Vec<&str> = content.lines().collect();
        
        if symbol.location.line == 0 || symbol.location.line > lines.len() {
            return Ok(String::new());
        }
        
        let start_line = symbol.location.line - 1; // Convert to 0-based indexing
        
        // Find the end of the symbol (simple heuristic)
        let mut end_line = start_line;
        let mut brace_count = 0;
        let mut found_opening_brace = false;
        
        for (i, line) in lines.iter().enumerate().skip(start_line) {
            for ch in line.chars() {
                match ch {
                    '{' => {
                        brace_count += 1;
                        found_opening_brace = true;
                    }
                    '}' => {
                        brace_count -= 1;
                        if found_opening_brace && brace_count == 0 {
                            end_line = i;
                            break;
                        }
                    }
                    _ => {}
                }
            }
            if found_opening_brace && brace_count == 0 {
                break;
            }
            // Fallback: limit to reasonable size
            if i - start_line > 100 {
                end_line = i;
                break;
            }
        }
        
        if end_line >= start_line {
            Ok(lines[start_line..=end_line].join("\n"))
        } else {
            Ok(lines[start_line].to_string())
        }
    }

    /// Checks if function is too long
    fn check_function_length(&self, code: &str, symbol: &Symbol) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let line_count = code.lines().count();
        let threshold = self.metrics.get("function_length").unwrap().threshold as usize;
        
        if line_count > threshold {
            let severity = if line_count > threshold * 2 {
                IssueSeverity::High
            } else if line_count > threshold + 20 {
                IssueSeverity::Medium
            } else {
                IssueSeverity::Low
            };
            
            let issue = QualityIssue {
                issue_type: QualityIssueType::Readability,
                severity,
                description: format!(
                    "Function '{}' is too long ({} lines). Consider breaking it into smaller functions.",
                    symbol.identifier, line_count
                ),
                code_snippet: code.to_string(),
                location: CodeLocation {
                    start_line: symbol.location.line,
                    start_column: symbol.location.column,
                    end_line: symbol.location.line + line_count,
                    end_column: 0,
                },
                metric_score: line_count as f64 / threshold as f64,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Checks cyclomatic complexity
    fn check_cyclomatic_complexity(&self, code: &str, symbol: &Symbol) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let complexity = self.calculate_cyclomatic_complexity(code);
        let threshold = self.metrics.get("cyclomatic_complexity").unwrap().threshold;
        
        if complexity > threshold {
            let severity = if complexity > threshold * 2.0 {
                IssueSeverity::High
            } else if complexity > threshold * 1.5 {
                IssueSeverity::Medium
            } else {
                IssueSeverity::Low
            };
            
            let issue = QualityIssue {
                issue_type: QualityIssueType::Readability,
                severity,
                description: format!(
                    "Function '{}' has high cyclomatic complexity ({:.1}). Consider simplifying the logic.",
                    symbol.identifier, complexity
                ),
                code_snippet: code.to_string(),
                location: CodeLocation {
                    start_line: symbol.location.line,
                    start_column: symbol.location.column,
                    end_line: symbol.location.line + code.lines().count(),
                    end_column: 0,
                },
                metric_score: complexity / threshold,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Calculates cyclomatic complexity (simplified)
    fn calculate_cyclomatic_complexity(&self, code: &str) -> f64 {
        let mut complexity = 1.0; // Base complexity
        
        // Count decision points
        for line in code.lines() {
            let line_lower = line.to_lowercase();
            
            // Control flow keywords
            if line_lower.contains("if ") { complexity += 1.0; }
            if line_lower.contains("else if") { complexity += 1.0; }
            if line_lower.contains("while ") { complexity += 1.0; }
            if line_lower.contains("for ") { complexity += 1.0; }
            if line_lower.contains("match ") { complexity += 1.0; }
            if line_lower.contains("case ") { complexity += 1.0; }
            if line_lower.contains("catch ") { complexity += 1.0; }
            if line_lower.contains("&&") { complexity += 1.0; }
            if line_lower.contains("||") { complexity += 1.0; }
            if line_lower.contains("?") { complexity += 1.0; }
        }
        
        complexity
    }

    /// Checks nesting depth
    fn check_nesting_depth(&self, code: &str, symbol: &Symbol) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let max_depth = self.calculate_max_nesting_depth(code);
        let threshold = self.metrics.get("nesting_depth").unwrap().threshold as usize;
        
        if max_depth > threshold {
            let severity = if max_depth > threshold + 3 {
                IssueSeverity::High
            } else if max_depth > threshold + 1 {
                IssueSeverity::Medium
            } else {
                IssueSeverity::Low
            };
            
            let issue = QualityIssue {
                issue_type: QualityIssueType::Readability,
                severity,
                description: format!(
                    "Function '{}' has deep nesting (depth: {}). Consider extracting nested logic into separate functions.",
                    symbol.identifier, max_depth
                ),
                code_snippet: code.to_string(),
                location: CodeLocation {
                    start_line: symbol.location.line,
                    start_column: symbol.location.column,
                    end_line: symbol.location.line + code.lines().count(),
                    end_column: 0,
                },
                metric_score: max_depth as f64 / threshold as f64,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Calculates maximum nesting depth
    fn calculate_max_nesting_depth(&self, code: &str) -> usize {
        let mut current_depth: usize = 0;
        let mut max_depth: usize = 0;
        
        for line in code.lines() {
            let trimmed = line.trim();
            
            // Count opening braces
            for ch in trimmed.chars() {
                match ch {
                    '{' => {
                        current_depth += 1;
                        max_depth = max_depth.max(current_depth);
                    }
                    '}' => {
                        current_depth = current_depth.saturating_sub(1);
                    }
                    _ => {}
                }
            }
        }
        
        max_depth
    }

    /// Checks documentation coverage
    fn check_documentation(&self, code: &str, symbol: &Symbol) -> Result<Option<QualityIssue>, SecondaryMindError> {
        // Check if function has documentation comment
        let has_doc_comment = code.lines()
            .take(5) // Check first few lines
            .any(|line| {
                let trimmed = line.trim();
                trimmed.starts_with("///") || 
                trimmed.starts_with("/**") || 
                trimmed.starts_with("//!")
            });
        
        if !has_doc_comment && matches!(symbol.kind, SymbolKind::Function | SymbolKind::TSFunction) {
            let issue = QualityIssue {
                issue_type: QualityIssueType::Documentation,
                severity: IssueSeverity::Low,
                description: format!(
                    "Function '{}' lacks documentation. Consider adding a doc comment explaining its purpose and parameters.",
                    symbol.identifier
                ),
                code_snippet: code.lines().take(10).collect::<Vec<_>>().join("\n"),
                location: CodeLocation {
                    start_line: symbol.location.line,
                    start_column: symbol.location.column,
                    end_line: symbol.location.line + 1,
                    end_column: 0,
                },
                metric_score: 1.0,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Checks error handling patterns
    fn check_error_handling(&self, code: &str, symbol: &Symbol) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let code_lower = code.to_lowercase();
        
        // Check for potential error-prone patterns
        let has_unwrap = code_lower.contains(".unwrap()");
        let _has_expect = code_lower.contains(".expect(");
        let has_panic = code_lower.contains("panic!");
        let has_proper_error_handling = code_lower.contains("result<") || 
                                       code_lower.contains("option<") ||
                                       code_lower.contains("try") ||
                                       code_lower.contains("catch");
        
        if (has_unwrap || has_panic) && !has_proper_error_handling {
            let severity = if has_panic {
                IssueSeverity::High
            } else if has_unwrap {
                IssueSeverity::Medium
            } else {
                IssueSeverity::Low
            };
            
            let issue = QualityIssue {
                issue_type: QualityIssueType::ErrorHandling,
                severity,
                description: format!(
                    "Function '{}' uses unsafe error handling patterns. Consider using proper error handling with Result types.",
                    symbol.identifier
                ),
                code_snippet: code.to_string(),
                location: CodeLocation {
                    start_line: symbol.location.line,
                    start_column: symbol.location.column,
                    end_line: symbol.location.line + code.lines().count(),
                    end_column: 0,
                },
                metric_score: if has_panic { 3.0 } else { 2.0 },
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Checks for TODO/FIXME comments
    fn check_todo_comments(&self, content: &str) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let mut todo_lines = Vec::new();
        
        for (line_num, line) in content.lines().enumerate() {
            let line_lower = line.to_lowercase();
            if line_lower.contains("todo") || line_lower.contains("fixme") || line_lower.contains("hack") {
                todo_lines.push((line_num + 1, line.trim()));
            }
        }
        
        if !todo_lines.is_empty() {
            let first_todo = &todo_lines[0];
            let issue = QualityIssue {
                issue_type: QualityIssueType::BestPractice,
                severity: IssueSeverity::Low,
                description: format!(
                    "Found {} TODO/FIXME comment(s). Consider addressing these items or creating proper issues.",
                    todo_lines.len()
                ),
                code_snippet: first_todo.1.to_string(),
                location: CodeLocation {
                    start_line: first_todo.0,
                    start_column: 0,
                    end_line: first_todo.0,
                    end_column: first_todo.1.len(),
                },
                metric_score: todo_lines.len() as f64,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Checks for magic numbers
    fn check_magic_numbers(&self, content: &str) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let mut magic_numbers = Vec::new();
        
        for (line_num, line) in content.lines().enumerate() {
            // Simple regex-like pattern matching for numbers
            let words: Vec<&str> = line.split_whitespace().collect();
            for word in words {
                // Check if word contains a number that's not 0, 1, or in a string
                if let Ok(num) = word.parse::<i32>() {
                    if num > 1 && num < 1000 && !line.contains("\"") && !line.contains("'") {
                        magic_numbers.push((line_num + 1, num, line.trim()));
                    }
                }
            }
        }
        
        if !magic_numbers.is_empty() {
            let first_magic = &magic_numbers[0];
            let issue = QualityIssue {
                issue_type: QualityIssueType::BestPractice,
                severity: IssueSeverity::Low,
                description: format!(
                    "Found {} potential magic number(s). Consider extracting them as named constants.",
                    magic_numbers.len()
                ),
                code_snippet: first_magic.2.to_string(),
                location: CodeLocation {
                    start_line: first_magic.0,
                    start_column: 0,
                    end_line: first_magic.0,
                    end_column: first_magic.2.len(),
                },
                metric_score: magic_numbers.len() as f64,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }

    /// Checks for long lines
    fn check_long_lines(&self, content: &str) -> Result<Option<QualityIssue>, SecondaryMindError> {
        let max_line_length = 120;
        let mut long_lines = Vec::new();
        
        for (line_num, line) in content.lines().enumerate() {
            if line.len() > max_line_length {
                long_lines.push((line_num + 1, line.len(), line));
            }
        }
        
        if !long_lines.is_empty() {
            let first_long = &long_lines[0];
            let issue = QualityIssue {
                issue_type: QualityIssueType::Readability,
                severity: IssueSeverity::Low,
                description: format!(
                    "Found {} long line(s) (>{} characters). Consider breaking them for better readability.",
                    long_lines.len(), max_line_length
                ),
                code_snippet: first_long.2.to_string(),
                location: CodeLocation {
                    start_line: first_long.0,
                    start_column: 0,
                    end_line: first_long.0,
                    end_column: first_long.1,
                },
                metric_score: first_long.1 as f64 / max_line_length as f64,
            };
            
            return Ok(Some(issue));
        }
        
        Ok(None)
    }
}

impl std::fmt::Display for QualityIssueType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QualityIssueType::Performance => write!(f, "Performance"),
            QualityIssueType::Readability => write!(f, "Readability"),
            QualityIssueType::Security => write!(f, "Security"),
            QualityIssueType::BestPractice => write!(f, "Best Practice"),
            QualityIssueType::ErrorHandling => write!(f, "Error Handling"),
            QualityIssueType::Documentation => write!(f, "Documentation"),
            QualityIssueType::TypeSafety => write!(f, "Type Safety"),
        }
    }
}

// Integration: This component integrates with the AISynthesisCore for AI-powered suggestions
// and provides structured code analysis with ranking and application capabilities
// Notes: The quality analyzer uses heuristic-based analysis combined with AI suggestions for comprehensive code improvement recommendations

#[cfg(test)]
include!("code_suggestion_system_test.rs");
