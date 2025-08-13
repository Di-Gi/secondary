// [[PROJECT_NAME]]/core/src/components/codebase_cartographer.rs
// Purpose: [Implements the "Codebase Cartographer" as a language dispatcher. It analyzes file types and delegates to the appropriate language-specific parser.]
// Architecture: [This component is now a lightweight dispatcher, fulfilling FR4. It encapsulates the logic for choosing a parser, making the system extensible to new languages.]
// Dependencies: [crate::errors, crate::model, crate::components::parsers, std::path.]
use crate::components::parsers::{rust_parser, ts_parser};
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, FileStructureAnalysis, StructureNode, SymbolDensityMap, DensityRegion, FileMetadata};
use std::path::Path;
use std::collections::HashMap;
use std::fs;

/// The Codebase Cartographer is responsible for parsing files and building the symbolic map.
/// It acts as a dispatcher, selecting the correct parser based on file extension.
pub struct CodebaseCartographer {}

impl CodebaseCartographer {
    pub fn new() -> Self {
        Self {}
    }

    /// Parses a single source file by dispatching to the correct language-specific parser.
    pub fn parse_file(&self, file_path: &Path) -> Result<Vec<Symbol>, SecondaryMindError> {
        let extension = file_path.extension().and_then(|s| s.to_str());

        match extension {
            Some("rs") => rust_parser::parse_rust_file(file_path),
            Some("ts" | "tsx" | "js" | "jsx") => ts_parser::parse_ts_file(file_path),
            _ => Ok(vec![]), // Ignore unsupported file types
        }
    }

    /// Performs detailed file structure analysis for navigation features
    pub fn analyze_file_structure(&self, file_path: &Path) -> Result<FileStructureAnalysis, SecondaryMindError> {
        // Get basic symbols first
        let symbols = self.parse_file(file_path)?;
        
        // Get file metadata
        let metadata = fs::metadata(file_path)
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                message: e.to_string() 
            })?;
        
        let file_size = metadata.len();
        let last_modified = metadata.modified()
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                message: e.to_string() 
            })?
            .into();
        
        let extension = file_path.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown");
        
        let language = match extension {
            "rs" => "rust",
            "ts" | "tsx" => "typescript",
            "js" | "jsx" => "javascript",
            _ => "unknown",
        }.to_string();

        let file_metadata = FileMetadata {
            file_size,
            last_modified,
            language,
            encoding: "utf-8".to_string(), // Assume UTF-8 for now
        };

        // Build hierarchical structure
        let outline = self.build_hierarchical_structure(&symbols)?;
        
        // Calculate symbol density
        let symbol_density = self.calculate_symbol_density(file_path, &symbols)?;

        Ok(FileStructureAnalysis {
            outline,
            symbol_density,
            file_metadata,
        })
    }

    /// Builds a hierarchical structure from flat symbols list
    fn build_hierarchical_structure(&self, symbols: &[Symbol]) -> Result<Vec<StructureNode>, SecondaryMindError> {
        let mut root_nodes = Vec::new();
        let mut symbol_map: HashMap<usize, Vec<&Symbol>> = HashMap::new();
        
        // Group symbols by line number for hierarchy building
        for symbol in symbols {
            symbol_map.entry(symbol.location.line).or_default().push(symbol);
        }
        
        // Sort symbols by line number
        let mut sorted_symbols: Vec<_> = symbols.iter().collect();
        sorted_symbols.sort_by_key(|s| s.location.line);
        
        // Build structure nodes - simplified approach for now
        for symbol in sorted_symbols {
            let node = StructureNode {
                name: symbol.identifier.clone(),
                node_type: format!("{:?}", symbol.kind),
                start_line: symbol.location.line,
                end_line: symbol.location.line + 1, // Simplified - would need AST for accurate end lines
                children: Vec::new(), // Simplified - would need proper nesting logic
                symbol: Some(symbol.clone()),
            };
            root_nodes.push(node);
        }
        
        Ok(root_nodes)
    }

    /// Calculates symbol density across file regions
    fn calculate_symbol_density(&self, file_path: &Path, symbols: &[Symbol]) -> Result<SymbolDensityMap, SecondaryMindError> {
        // Read file to get line count
        let content = fs::read_to_string(file_path)
            .map_err(|e| SecondaryMindError::IoError { 
                path: file_path.to_path_buf(), 
                message: e.to_string() 
            })?;
        
        let total_lines = content.lines().count();
        let region_size = 50; // Lines per region
        let mut regions = Vec::new();
        let mut max_density: f64 = 0.0;
        
        // Create density regions
        for start_line in (1..=total_lines).step_by(region_size) {
            let end_line = (start_line + region_size - 1).min(total_lines);
            
            // Count symbols in this region
            let symbols_in_region: Vec<_> = symbols.iter()
                .filter(|s| s.location.line >= start_line && s.location.line <= end_line)
                .collect();
            
            let symbol_count = symbols_in_region.len();
            let density = symbol_count as f64 / region_size as f64;
            max_density = max_density.max(density);
            
            // Count symbol types in region
            let mut symbol_types = HashMap::new();
            for symbol in &symbols_in_region {
                let type_name = format!("{:?}", symbol.kind);
                *symbol_types.entry(type_name).or_insert(0) += 1;
            }
            
            regions.push(DensityRegion {
                start_line,
                end_line,
                symbol_count,
                density,
                symbol_types,
            });
        }
        
        Ok(SymbolDensityMap {
            regions,
            max_density,
            total_symbols: symbols.len(),
            last_updated: chrono::Utc::now(),
        })
    }
}
// Integration: [This is a central component instantiated by consumers like the `desktop` crate's `analyze_project` command. It uses the `parsers` submodule.]
// Notes: [The logic is now much cleaner. Adding a new language is as simple as adding another match arm and a corresponding parser module.]

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::NamedTempFile;

    #[test]
    fn test_analyze_file_structure_rust() {
        let cartographer = CodebaseCartographer::new();
        
        // Create a temporary Rust file
        let temp_file = NamedTempFile::with_suffix(".rs").unwrap();
        let test_content = r#"
use std::collections::HashMap;

pub struct TestStruct {
    pub name: String,
    pub value: i32,
}

impl TestStruct {
    pub fn new(name: String, value: i32) -> Self {
        Self { name, value }
    }
    
    pub fn get_name(&self) -> &str {
        &self.name
    }
}

pub fn test_function() -> String {
    "Hello, world!".to_string()
}

pub enum TestEnum {
    Variant1,
    Variant2(String),
}
"#;
        
        fs::write(temp_file.path(), test_content).unwrap();
        
        // Test file structure analysis
        let result = cartographer.analyze_file_structure(temp_file.path());
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        
        // Check that we have some symbols in the outline
        assert!(!analysis.outline.is_empty());
        
        // Check that we have symbol density data
        assert!(!analysis.symbol_density.regions.is_empty());
        assert!(analysis.symbol_density.total_symbols > 0);
        
        // Check file metadata
        assert_eq!(analysis.file_metadata.language, "rust");
        assert!(analysis.file_metadata.file_size > 0);
        
        println!("Analysis successful! Found {} symbols", analysis.symbol_density.total_symbols);
        println!("Outline has {} top-level nodes", analysis.outline.len());
    }

    #[test]
    fn test_analyze_file_structure_typescript() {
        let cartographer = CodebaseCartographer::new();
        
        // Create a temporary TypeScript file
        let temp_file = NamedTempFile::with_suffix(".ts").unwrap();
        let test_content = r#"
interface TestInterface {
    name: string;
    value: number;
}

class TestClass implements TestInterface {
    constructor(public name: string, public value: number) {}
    
    getName(): string {
        return this.name;
    }
}

function testFunction(): string {
    return "Hello, TypeScript!";
}

export { TestClass, TestInterface, testFunction };
"#;
        
        fs::write(temp_file.path(), test_content).unwrap();
        
        // Test file structure analysis
        let result = cartographer.analyze_file_structure(temp_file.path());
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        
        // Check that we have some symbols in the outline
        assert!(!analysis.outline.is_empty());
        
        // Check that we have symbol density data
        assert!(!analysis.symbol_density.regions.is_empty());
        assert!(analysis.symbol_density.total_symbols > 0);
        
        // Check file metadata
        assert_eq!(analysis.file_metadata.language, "typescript");
        assert!(analysis.file_metadata.file_size > 0);
        
        println!("TypeScript analysis successful! Found {} symbols", analysis.symbol_density.total_symbols);
    }

    #[test]
    fn test_analyze_file_structure_unsupported() {
        let cartographer = CodebaseCartographer::new();
        
        // Create a temporary file with unsupported extension
        let temp_file = NamedTempFile::with_suffix(".txt").unwrap();
        fs::write(temp_file.path(), "Some text content").unwrap();
        
        // Test file structure analysis
        let result = cartographer.analyze_file_structure(temp_file.path());
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        
        // Should have empty outline for unsupported files
        assert!(analysis.outline.is_empty());
        assert_eq!(analysis.symbol_density.total_symbols, 0);
        assert_eq!(analysis.file_metadata.language, "unknown");
    }
}
