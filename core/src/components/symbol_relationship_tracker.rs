// [[SECONDARY_MIND]]/core/src/components/symbol_relationship_tracker.rs
// Purpose: Tracks symbol relationships and dependencies for advanced navigation features
// Architecture: Core component that builds and maintains a dependency graph of symbols
// Dependencies: std collections, serde for serialization, symbol model

use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use crate::errors::SecondaryMindError;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Path, PathBuf};

/// Represents a reference to a symbol from another location
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SymbolReference {
    /// The symbol being referenced
    pub symbol_id: String,
    /// Location where the reference occurs
    pub location: SymbolLocation,
    /// Type of reference (call, import, inheritance, etc.)
    pub reference_type: ReferenceType,
    /// Context around the reference
    pub context: String,
}

/// Types of symbol references
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ReferenceType {
    /// Function or method call
    Call,
    /// Variable or field access
    Access,
    /// Type usage (variable declaration, parameter, etc.)
    TypeUsage,
    /// Import or use statement
    Import,
    /// Inheritance or trait implementation
    Inheritance,
    /// Definition location
    Definition,
    /// Generic or unknown reference
    Unknown,
}

/// Represents a dependency relationship between symbols
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolDependency {
    /// The symbol that depends on another
    pub dependent: String,
    /// The symbol being depended upon
    pub dependency: String,
    /// Type of dependency relationship
    pub dependency_type: DependencyType,
    /// Strength of the dependency (0.0 to 1.0)
    pub strength: f64,
}

/// Types of dependencies between symbols
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DependencyType {
    /// Direct function call
    Calls,
    /// Uses as a type
    UsesType,
    /// Inherits from or implements
    Inherits,
    /// Imports or includes
    Imports,
    /// Contains as a member
    Contains,
    /// Generic dependency
    Uses,
}

/// Result of a "find references" operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindReferencesResult {
    /// The symbol being searched for
    pub symbol: Symbol,
    /// All references found
    pub references: Vec<SymbolReference>,
    /// Total count of references
    pub total_count: usize,
    /// References grouped by file
    pub by_file: HashMap<PathBuf, Vec<SymbolReference>>,
    /// References grouped by type
    pub by_type: HashMap<ReferenceType, Vec<SymbolReference>>,
}

/// Result of a "go to definition" operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoToDefinitionResult {
    /// The original query location
    pub query_location: SymbolLocation,
    /// The definition location found
    pub definition: Option<SymbolLocation>,
    /// The symbol at the definition
    pub symbol: Option<Symbol>,
    /// Alternative definitions if multiple found
    pub alternatives: Vec<Symbol>,
}

/// Statistics about symbol usage patterns
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SymbolUsageStats {
    /// Total number of references
    pub reference_count: usize,
    /// Number of files that reference this symbol
    pub file_count: usize,
    /// Number of different types of references
    pub reference_types: HashSet<ReferenceType>,
    /// Most common reference type
    pub primary_usage: Option<ReferenceType>,
    /// Symbols that this symbol depends on
    pub dependencies: Vec<String>,
    /// Symbols that depend on this symbol
    pub dependents: Vec<String>,
    /// Last time this symbol was accessed
    pub last_accessed: Option<std::time::SystemTime>,
    /// Popularity score based on usage patterns
    pub popularity_score: f64,
}

/// Main component for tracking symbol relationships and dependencies
pub struct SymbolRelationshipTracker {
    /// Maps symbol identifiers to their definitions
    symbol_definitions: HashMap<String, Symbol>,
    /// Maps symbol identifiers to all their references
    symbol_references: HashMap<String, Vec<SymbolReference>>,
    /// Dependency graph: symbol -> symbols it depends on
    dependencies: HashMap<String, HashSet<String>>,
    /// Reverse dependency graph: symbol -> symbols that depend on it
    dependents: HashMap<String, HashSet<String>>,
    /// Maps file paths to symbols defined in them
    file_to_symbols: HashMap<PathBuf, HashSet<String>>,
    /// Maps locations to symbols at those locations
    location_to_symbol: HashMap<SymbolLocation, String>,
    /// Usage statistics for each symbol
    usage_stats: HashMap<String, SymbolUsageStats>,
    /// Dependency relationships with metadata
    dependency_relationships: Vec<SymbolDependency>,
}

impl SymbolRelationshipTracker {
    /// Create a new symbol relationship tracker
    pub fn new() -> Self {
        Self {
            symbol_definitions: HashMap::new(),
            symbol_references: HashMap::new(),
            dependencies: HashMap::new(),
            dependents: HashMap::new(),
            file_to_symbols: HashMap::new(),
            location_to_symbol: HashMap::new(),
            usage_stats: HashMap::new(),
            dependency_relationships: Vec::new(),
        }
    }

    /// Add a symbol definition to the tracker
    pub fn add_symbol_definition(&mut self, symbol: Symbol) -> Result<(), SecondaryMindError> {
        let symbol_id = self.generate_symbol_id(&symbol);
        
        // Store the symbol definition
        self.symbol_definitions.insert(symbol_id.clone(), symbol.clone());
        
        // Map file to symbol
        self.file_to_symbols
            .entry(symbol.location.path.clone())
            .or_insert_with(HashSet::new)
            .insert(symbol_id.clone());
        
        // Map location to symbol
        self.location_to_symbol.insert(symbol.location.clone(), symbol_id.clone());
        
        // Initialize usage stats
        self.usage_stats
            .entry(symbol_id.clone())
            .or_insert_with(SymbolUsageStats::default);
        
        Ok(())
    }

    /// Add a reference to a symbol
    pub fn add_symbol_reference(&mut self, reference: SymbolReference) -> Result<(), SecondaryMindError> {
        let symbol_id = reference.symbol_id.clone();
        
        // Add to references list
        self.symbol_references
            .entry(symbol_id.clone())
            .or_insert_with(Vec::new)
            .push(reference.clone());
        
        // Update usage statistics
        if let Some(stats) = self.usage_stats.get_mut(&symbol_id) {
            stats.reference_count += 1;
            stats.reference_types.insert(reference.reference_type.clone());
            
            // Update file count
            let _file_path = &reference.location.path;
            let current_files: HashSet<PathBuf> = self.symbol_references
                .get(&symbol_id)
                .unwrap_or(&Vec::new())
                .iter()
                .map(|r| r.location.path.clone())
                .collect();
            stats.file_count = current_files.len();
        }
        
        // Update primary usage type and popularity score separately to avoid borrowing conflicts
        let primary_usage = self.calculate_primary_usage_type(&symbol_id);
        
        // Calculate popularity score with a cloned stats to avoid borrowing issues
        let popularity_score = if let Some(stats) = self.usage_stats.get(&symbol_id) {
            self.calculate_popularity_score(stats)
        } else {
            0.0
        };
        
        if let Some(stats) = self.usage_stats.get_mut(&symbol_id) {
            stats.primary_usage = primary_usage;
            stats.popularity_score = popularity_score;
        }
        
        Ok(())
    }

    /// Add a dependency relationship between symbols
    pub fn add_dependency(&mut self, dependent: &str, dependency: &str, dep_type: DependencyType) -> Result<(), SecondaryMindError> {
        // Add to forward dependency graph
        self.dependencies
            .entry(dependent.to_string())
            .or_insert_with(HashSet::new)
            .insert(dependency.to_string());
        
        // Add to reverse dependency graph
        self.dependents
            .entry(dependency.to_string())
            .or_insert_with(HashSet::new)
            .insert(dependent.to_string());
        
        // Create dependency relationship
        let relationship = SymbolDependency {
            dependent: dependent.to_string(),
            dependency: dependency.to_string(),
            dependency_type: dep_type,
            strength: 1.0, // Could be calculated based on usage frequency
        };
        
        self.dependency_relationships.push(relationship);
        
        // Update usage stats
        if let Some(stats) = self.usage_stats.get_mut(dependent) {
            if !stats.dependencies.contains(&dependency.to_string()) {
                stats.dependencies.push(dependency.to_string());
            }
        }
        
        if let Some(stats) = self.usage_stats.get_mut(dependency) {
            if !stats.dependents.contains(&dependent.to_string()) {
                stats.dependents.push(dependent.to_string());
            }
        }
        
        Ok(())
    }

    /// Find all references to a symbol
    pub fn find_references(&self, symbol_identifier: &str) -> FindReferencesResult {
        let references = self.symbol_references
            .get(symbol_identifier)
            .cloned()
            .unwrap_or_default();
        
        let symbol = self.symbol_definitions
            .get(symbol_identifier)
            .cloned()
            .unwrap_or_else(|| self.create_placeholder_symbol(symbol_identifier));
        
        // Group references by file
        let mut by_file: HashMap<PathBuf, Vec<SymbolReference>> = HashMap::new();
        for reference in &references {
            by_file
                .entry(reference.location.path.clone())
                .or_insert_with(Vec::new)
                .push(reference.clone());
        }
        
        // Group references by type
        let mut by_type: HashMap<ReferenceType, Vec<SymbolReference>> = HashMap::new();
        for reference in &references {
            by_type
                .entry(reference.reference_type.clone())
                .or_insert_with(Vec::new)
                .push(reference.clone());
        }
        
        FindReferencesResult {
            symbol,
            total_count: references.len(),
            references,
            by_file,
            by_type,
        }
    }

    /// Find the definition of a symbol at a given location
    pub fn go_to_definition(&self, location: &SymbolLocation) -> GoToDefinitionResult {
        // Try to find symbol at the exact location
        if let Some(symbol_id) = self.location_to_symbol.get(location) {
            if let Some(symbol) = self.symbol_definitions.get(symbol_id) {
                return GoToDefinitionResult {
                    query_location: location.clone(),
                    definition: Some(symbol.location.clone()),
                    symbol: Some(symbol.clone()),
                    alternatives: Vec::new(),
                };
            }
        }
        
        // Try to find symbol by searching nearby locations in the same file
        let nearby_symbols = self.find_symbols_near_location(location);
        
        if let Some(symbol) = nearby_symbols.first() {
            GoToDefinitionResult {
                query_location: location.clone(),
                definition: Some(symbol.location.clone()),
                symbol: Some(symbol.clone()),
                alternatives: nearby_symbols[1..].to_vec(),
            }
        } else {
            GoToDefinitionResult {
                query_location: location.clone(),
                definition: None,
                symbol: None,
                alternatives: Vec::new(),
            }
        }
    }

    /// Get all symbols that depend on the given symbol
    pub fn get_dependents(&self, symbol_identifier: &str) -> Vec<String> {
        self.dependents
            .get(symbol_identifier)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect()
    }

    /// Get all symbols that the given symbol depends on
    pub fn get_dependencies(&self, symbol_identifier: &str) -> Vec<String> {
        self.dependencies
            .get(symbol_identifier)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect()
    }

    /// Get usage statistics for a symbol
    pub fn get_usage_stats(&self, symbol_identifier: &str) -> Option<&SymbolUsageStats> {
        self.usage_stats.get(symbol_identifier)
    }

    /// Update the last accessed time for a symbol
    pub fn update_access_time(&mut self, symbol_identifier: &str) {
        if let Some(stats) = self.usage_stats.get_mut(symbol_identifier) {
            stats.last_accessed = Some(std::time::SystemTime::now());
        }
    }

    /// Get symbols defined in a specific file
    pub fn get_symbols_in_file(&self, file_path: &Path) -> Vec<Symbol> {
        if let Some(symbol_ids) = self.file_to_symbols.get(file_path) {
            symbol_ids
                .iter()
                .filter_map(|id| self.symbol_definitions.get(id))
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Find symbols with similar names (for suggestions)
    pub fn find_similar_symbols(&self, partial_name: &str) -> Vec<Symbol> {
        let partial_lower = partial_name.to_lowercase();
        
        self.symbol_definitions
            .values()
            .filter(|symbol| {
                let symbol_lower = symbol.identifier.to_lowercase();
                symbol_lower.contains(&partial_lower) || 
                self.calculate_similarity(&symbol_lower, &partial_lower) > 0.6
            })
            .cloned()
            .collect()
    }

    /// Get dependency graph as adjacency list
    pub fn get_dependency_graph(&self) -> &HashMap<String, HashSet<String>> {
        &self.dependencies
    }

    /// Perform topological sort of dependencies
    pub fn topological_sort(&self) -> Result<Vec<String>, SecondaryMindError> {
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        let mut result = Vec::new();
        let mut queue = VecDeque::new();
        
        // Initialize in-degree count
        for symbol_id in self.symbol_definitions.keys() {
            in_degree.insert(symbol_id.clone(), 0);
        }
        
        // Calculate in-degrees
        for dependents in self.dependencies.values() {
            for dependent in dependents {
                *in_degree.entry(dependent.clone()).or_insert(0) += 1;
            }
        }
        
        // Find symbols with no dependencies
        for (symbol_id, &degree) in &in_degree {
            if degree == 0 {
                queue.push_back(symbol_id.clone());
            }
        }
        
        // Process queue
        while let Some(symbol_id) = queue.pop_front() {
            result.push(symbol_id.clone());
            
            if let Some(dependencies) = self.dependencies.get(&symbol_id) {
                for dependency in dependencies {
                    if let Some(degree) = in_degree.get_mut(dependency) {
                        *degree -= 1;
                        if *degree == 0 {
                            queue.push_back(dependency.clone());
                        }
                    }
                }
            }
        }
        
        // Check for cycles
        if result.len() != self.symbol_definitions.len() {
            return Err(SecondaryMindError::SearchIndexError {
                operation: "topological_sort".to_string(),
                reason: "Circular dependency detected in symbol graph".to_string()
            });
        }
        
        Ok(result)
    }

    /// Clear all relationship data
    pub fn clear(&mut self) {
        self.symbol_definitions.clear();
        self.symbol_references.clear();
        self.dependencies.clear();
        self.dependents.clear();
        self.file_to_symbols.clear();
        self.location_to_symbol.clear();
        self.usage_stats.clear();
        self.dependency_relationships.clear();
    }

    /// Remove all data for a specific file
    pub fn remove_file(&mut self, file_path: &Path) -> Result<(), SecondaryMindError> {
        // Get symbols in the file
        let symbol_ids: Vec<String> = self.file_to_symbols
            .get(file_path)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect();
        
        // Remove symbols and their relationships
        for symbol_id in symbol_ids {
            self.remove_symbol(&symbol_id)?;
        }
        
        // Remove file mapping
        self.file_to_symbols.remove(file_path);
        
        Ok(())
    }

    /// Remove a specific symbol and its relationships
    fn remove_symbol(&mut self, symbol_id: &str) -> Result<(), SecondaryMindError> {
        // Remove from definitions
        self.symbol_definitions.remove(symbol_id);
        
        // Remove references
        self.symbol_references.remove(symbol_id);
        
        // Remove from dependency graphs
        self.dependencies.remove(symbol_id);
        self.dependents.remove(symbol_id);
        
        // Remove from other symbols' dependency lists
        for dependents in self.dependencies.values_mut() {
            dependents.remove(symbol_id);
        }
        for dependencies in self.dependents.values_mut() {
            dependencies.remove(symbol_id);
        }
        
        // Remove usage stats
        self.usage_stats.remove(symbol_id);
        
        // Remove from location mapping
        self.location_to_symbol.retain(|_, id| id != symbol_id);
        
        // Remove from file mappings
        for symbols in self.file_to_symbols.values_mut() {
            symbols.remove(symbol_id);
        }
        
        // Remove dependency relationships
        self.dependency_relationships.retain(|dep| {
            dep.dependent != symbol_id && dep.dependency != symbol_id
        });
        
        Ok(())
    }

    /// Generate a unique identifier for a symbol
    pub fn generate_symbol_id(&self, symbol: &Symbol) -> String {
        format!("{}:{}:{}:{}", 
            symbol.location.path.to_string_lossy(),
            symbol.identifier,
            symbol.kind.clone() as u8,
            symbol.location.line
        )
    }

    /// Find symbols near a given location (for go-to-definition)
    fn find_symbols_near_location(&self, location: &SymbolLocation) -> Vec<Symbol> {
        let mut nearby_symbols = Vec::new();
        
        // Look for symbols in the same file within a reasonable line range
        for (symbol_location, symbol_id) in &self.location_to_symbol {
            if symbol_location.path == location.path {
                let line_diff = (symbol_location.line as i32 - location.line as i32).abs();
                if line_diff <= 5 { // Within 5 lines
                    if let Some(symbol) = self.symbol_definitions.get(symbol_id) {
                        nearby_symbols.push(symbol.clone());
                    }
                }
            }
        }
        
        // Sort by proximity to the query location
        nearby_symbols.sort_by_key(|symbol| {
            (symbol.location.line as i32 - location.line as i32).abs()
        });
        
        nearby_symbols
    }

    /// Calculate the primary usage type for a symbol
    fn calculate_primary_usage_type(&self, symbol_id: &str) -> Option<ReferenceType> {
        if let Some(references) = self.symbol_references.get(symbol_id) {
            let mut type_counts: HashMap<ReferenceType, usize> = HashMap::new();
            
            for reference in references {
                *type_counts.entry(reference.reference_type.clone()).or_insert(0) += 1;
            }
            
            type_counts
                .into_iter()
                .max_by_key(|(_, count)| *count)
                .map(|(ref_type, _)| ref_type)
        } else {
            None
        }
    }

    /// Calculate popularity score based on usage statistics
    fn calculate_popularity_score(&self, stats: &SymbolUsageStats) -> f64 {
        let reference_score = (stats.reference_count as f64).ln().max(0.0) / 10.0;
        let file_score = (stats.file_count as f64) / 20.0;
        let type_diversity = stats.reference_types.len() as f64 / 6.0; // Max 6 reference types
        
        (reference_score + file_score + type_diversity).min(1.0)
    }

    /// Calculate string similarity using simple algorithm
    fn calculate_similarity(&self, s1: &str, s2: &str) -> f64 {
        let len1 = s1.len();
        let len2 = s2.len();
        
        if len1 == 0 && len2 == 0 {
            return 1.0;
        }
        
        if len1 == 0 || len2 == 0 {
            return 0.0;
        }
        
        let max_len = len1.max(len2);
        let distance = self.levenshtein_distance(s1, s2);
        
        1.0 - (distance as f64 / max_len as f64)
    }

    /// Calculate Levenshtein distance between two strings
    fn levenshtein_distance(&self, s1: &str, s2: &str) -> usize {
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        let len1 = chars1.len();
        let len2 = chars2.len();
        
        let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];
        
        for i in 0..=len1 {
            matrix[i][0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }
        
        for i in 1..=len1 {
            for j in 1..=len2 {
                let cost = if chars1[i - 1] == chars2[j - 1] { 0 } else { 1 };
                matrix[i][j] = (matrix[i - 1][j] + 1)
                    .min(matrix[i][j - 1] + 1)
                    .min(matrix[i - 1][j - 1] + cost);
            }
        }
        
        matrix[len1][len2]
    }

    /// Create a placeholder symbol for unknown identifiers
    fn create_placeholder_symbol(&self, identifier: &str) -> Symbol {
        Symbol {
            identifier: identifier.to_string(),
            kind: SymbolKind::Unknown,
            location: SymbolLocation {
                path: PathBuf::from("unknown"),
                line: 0,
                column: 0,
            },
        }
    }

    /// Get statistics about the relationship tracker
    pub fn get_tracker_stats(&self) -> RelationshipTrackerStats {
        RelationshipTrackerStats {
            total_symbols: self.symbol_definitions.len(),
            total_references: self.symbol_references.values().map(|refs| refs.len()).sum(),
            total_dependencies: self.dependency_relationships.len(),
            files_tracked: self.file_to_symbols.len(),
            avg_references_per_symbol: if self.symbol_definitions.is_empty() {
                0.0
            } else {
                self.symbol_references.values().map(|refs| refs.len()).sum::<usize>() as f64 
                    / self.symbol_definitions.len() as f64
            },
        }
    }
}

/// Statistics about the relationship tracker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipTrackerStats {
    pub total_symbols: usize,
    pub total_references: usize,
    pub total_dependencies: usize,
    pub files_tracked: usize,
    pub avg_references_per_symbol: f64,
}

impl PartialEq for SymbolLocation {
    fn eq(&self, other: &Self) -> bool {
        self.path == other.path && self.line == other.line && self.column == other.column
    }
}

impl Eq for SymbolLocation {}

impl std::hash::Hash for SymbolLocation {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.path.hash(state);
        self.line.hash(state);
        self.column.hash(state);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn create_test_symbol(name: &str, kind: SymbolKind, file: &str, line: usize) -> Symbol {
        Symbol {
            identifier: name.to_string(),
            kind,
            location: SymbolLocation {
                path: PathBuf::from(file),
                line,
                column: 1,
            },
        }
    }

    fn create_test_reference(symbol_id: &str, file: &str, line: usize, ref_type: ReferenceType) -> SymbolReference {
        SymbolReference {
            symbol_id: symbol_id.to_string(),
            location: SymbolLocation {
                path: PathBuf::from(file),
                line,
                column: 1,
            },
            reference_type: ref_type,
            context: "test context".to_string(),
        }
    }

    #[test]
    fn test_add_symbol_definition() {
        let mut tracker = SymbolRelationshipTracker::new();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs", 10);
        
        tracker.add_symbol_definition(symbol.clone()).unwrap();
        
        assert_eq!(tracker.symbol_definitions.len(), 1);
        assert_eq!(tracker.file_to_symbols.len(), 1);
        assert_eq!(tracker.usage_stats.len(), 1);
    }

    #[test]
    fn test_add_symbol_reference() {
        let mut tracker = SymbolRelationshipTracker::new();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs", 10);
        let symbol_id = tracker.generate_symbol_id(&symbol);
        
        tracker.add_symbol_definition(symbol).unwrap();
        
        let reference = create_test_reference(&symbol_id, "src/other.rs", 20, ReferenceType::Call);
        tracker.add_symbol_reference(reference).unwrap();
        
        assert_eq!(tracker.symbol_references.len(), 1);
        let stats = tracker.get_usage_stats(&symbol_id).unwrap();
        assert_eq!(stats.reference_count, 1);
        assert!(stats.reference_types.contains(&ReferenceType::Call));
    }

    #[test]
    fn test_find_references() {
        let mut tracker = SymbolRelationshipTracker::new();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs", 10);
        let symbol_id = tracker.generate_symbol_id(&symbol);
        
        tracker.add_symbol_definition(symbol).unwrap();
        
        // Add multiple references
        let ref1 = create_test_reference(&symbol_id, "src/other.rs", 20, ReferenceType::Call);
        let ref2 = create_test_reference(&symbol_id, "src/another.rs", 30, ReferenceType::Call);
        
        tracker.add_symbol_reference(ref1).unwrap();
        tracker.add_symbol_reference(ref2).unwrap();
        
        let result = tracker.find_references(&symbol_id);
        assert_eq!(result.total_count, 2);
        assert_eq!(result.by_file.len(), 2);
        assert_eq!(result.by_type.len(), 1);
    }

    #[test]
    fn test_add_dependency() {
        let mut tracker = SymbolRelationshipTracker::new();
        
        tracker.add_dependency("symbolA", "symbolB", DependencyType::Calls).unwrap();
        
        let deps = tracker.get_dependencies("symbolA");
        assert_eq!(deps.len(), 1);
        assert!(deps.contains(&"symbolB".to_string()));
        
        let dependents = tracker.get_dependents("symbolB");
        assert_eq!(dependents.len(), 1);
        assert!(dependents.contains(&"symbolA".to_string()));
    }

    #[test]
    fn test_go_to_definition() {
        let mut tracker = SymbolRelationshipTracker::new();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs", 10);
        
        tracker.add_symbol_definition(symbol.clone()).unwrap();
        
        let result = tracker.go_to_definition(&symbol.location);
        assert!(result.definition.is_some());
        assert!(result.symbol.is_some());
        assert_eq!(result.symbol.unwrap().identifier, "testFunction");
    }

    #[test]
    fn test_topological_sort() {
        let mut tracker = SymbolRelationshipTracker::new();
        
        // Create symbols
        let symbol_a = create_test_symbol("A", SymbolKind::Function, "src/a.rs", 1);
        let symbol_b = create_test_symbol("B", SymbolKind::Function, "src/b.rs", 1);
        let symbol_c = create_test_symbol("C", SymbolKind::Function, "src/c.rs", 1);
        
        let symbol_id_a = tracker.generate_symbol_id(&symbol_a);
        let symbol_id_b = tracker.generate_symbol_id(&symbol_b);
        let symbol_id_c = tracker.generate_symbol_id(&symbol_c);
        
        tracker.add_symbol_definition(symbol_a).unwrap();
        tracker.add_symbol_definition(symbol_b).unwrap();
        tracker.add_symbol_definition(symbol_c).unwrap();
        
        // Add dependencies: A -> B -> C
        tracker.add_dependency(&symbol_id_a, &symbol_id_b, DependencyType::Calls).unwrap();
        tracker.add_dependency(&symbol_id_b, &symbol_id_c, DependencyType::Calls).unwrap();
        
        let sorted = tracker.topological_sort().unwrap();
        assert_eq!(sorted.len(), 3);
        
        // A should come before B, and B should come before C (dependency order)
        let a_pos = sorted.iter().position(|s| s.contains("A")).unwrap();
        let b_pos = sorted.iter().position(|s| s.contains("B")).unwrap();
        let c_pos = sorted.iter().position(|s| s.contains("C")).unwrap();
        
        assert!(a_pos < b_pos);
        assert!(b_pos < c_pos);
    }

    #[test]
    fn test_similarity_calculation() {
        let tracker = SymbolRelationshipTracker::new();
        
        assert_eq!(tracker.calculate_similarity("hello", "hello"), 1.0);
        assert_eq!(tracker.calculate_similarity("", ""), 1.0);
        assert_eq!(tracker.calculate_similarity("hello", ""), 0.0);
        
        let similarity = tracker.calculate_similarity("hello", "hallo");
        assert!(similarity > 0.5 && similarity < 1.0);
    }

    #[test]
    fn test_remove_file() {
        let mut tracker = SymbolRelationshipTracker::new();
        let symbol = create_test_symbol("testFunction", SymbolKind::Function, "src/main.rs", 10);
        
        tracker.add_symbol_definition(symbol).unwrap();
        assert_eq!(tracker.symbol_definitions.len(), 1);
        
        tracker.remove_file(&PathBuf::from("src/main.rs")).unwrap();
        assert_eq!(tracker.symbol_definitions.len(), 0);
        assert_eq!(tracker.file_to_symbols.len(), 0);
    }
}
