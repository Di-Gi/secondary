// [[SECONDARY_MIND_CORE]]/src/model/analysis.rs
// Purpose: Data structures for file and symbol analysis operations
// Architecture: Models for analysis results, symbol relationships, and code structure data

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// File structure analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileStructureAnalysis {
    /// Hierarchical outline of file structure
    pub outline: Vec<StructureNode>,
    /// Symbol density mapping for visualization
    pub symbol_density: SymbolDensityMap,
    /// File metadata
    pub file_metadata: FileMetadata,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
    /// Analysis duration in milliseconds
    pub analysis_duration_ms: u64,
}

/// Hierarchical structure node representing code elements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructureNode {
    /// Node identifier
    pub id: String,
    /// Node name/label
    pub name: String,
    /// Type of structure node
    pub node_type: StructureNodeType,
    /// Starting line number (1-based)
    pub start_line: usize,
    /// Ending line number (1-based)
    pub end_line: usize,
    /// Child nodes
    pub children: Vec<StructureNode>,
    /// Associated symbol information
    pub symbol: Option<AnalysisSymbol>,
    /// Node-specific metadata
    pub metadata: StructureNodeMetadata,
}

/// Types of structure nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StructureNodeType {
    File,
    Module,
    Namespace,
    Class,
    Interface,
    Struct,
    Enum,
    Function,
    Method,
    Property,
    Field,
    Variable,
    Constant,
    Type,
    Import,
    Comment,
    Block,
}

/// Symbol density mapping for minimap visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolDensityMap {
    /// Density regions with symbol counts
    pub regions: Vec<DensityRegion>,
    /// Maximum density value for normalization
    pub max_density: f64,
    /// Total symbol count in file
    pub total_symbols: usize,
    /// Lines per region for density calculation
    pub lines_per_region: usize,
    /// Last update timestamp
    pub last_updated: DateTime<Utc>,
}

/// Density region for symbol visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DensityRegion {
    /// Starting line number (1-based)
    pub start_line: usize,
    /// Ending line number (1-based)
    pub end_line: usize,
    /// Symbol density (0.0 to 1.0)
    pub density: f64,
    /// Symbol counts by type
    pub symbol_counts: HashMap<String, usize>,
    /// Complexity score for this region
    pub complexity_score: f64,
}

/// File metadata for analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    /// File path relative to project root
    pub file_path: PathBuf,
    /// File size in bytes
    pub file_size: u64,
    /// Last modification time
    pub last_modified: DateTime<Utc>,
    /// File language/type
    pub language: String,
    /// Line count
    pub line_count: usize,
    /// Character count
    pub char_count: usize,
    /// Encoding information
    pub encoding: String,
}

/// Symbol information for analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSymbol {
    /// Symbol identifier
    pub id: String,
    /// Symbol name
    pub name: String,
    /// Symbol type
    pub symbol_type: SymbolType,
    /// Symbol visibility/access level
    pub visibility: SymbolVisibility,
    /// Symbol scope or namespace
    pub scope: Option<String>,
    /// Symbol signature (for functions/methods)
    pub signature: Option<String>,
    /// Documentation/comments
    pub documentation: Option<String>,
    /// Symbol attributes/annotations
    pub attributes: Vec<String>,
}

/// Types of symbols in code analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SymbolType {
    Function,
    Method,
    Class,
    Interface,
    Struct,
    Enum,
    Variable,
    Constant,
    Property,
    Field,
    Parameter,
    Type,
    Namespace,
    Module,
    Macro,
    Trait,
}

/// Symbol visibility levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SymbolVisibility {
    Public,
    Private,
    Protected,
    Internal,
    Package,
}

/// Metadata for structure nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructureNodeMetadata {
    /// Complexity score
    pub complexity: f64,
    /// Number of child elements
    pub child_count: usize,
    /// Depth in hierarchy
    pub depth: usize,
    /// Whether node is collapsed in UI
    pub collapsed: bool,
    /// Custom attributes
    pub attributes: HashMap<String, String>,
}

/// Symbol relationship analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipAnalysis {
    /// Central symbol being analyzed
    pub center_symbol: AnalysisSymbol,
    /// Discovered relationships
    pub relationships: Vec<SymbolRelationship>,
    /// Analysis depth used
    pub analysis_depth: usize,
    /// Total number of connections found
    pub total_connections: usize,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
    /// Analysis duration in milliseconds
    pub analysis_duration_ms: u64,
}

/// Relationship between symbols
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolRelationship {
    /// Type of relationship
    pub relationship_type: RelationshipType,
    /// Source symbol
    pub source: AnalysisSymbol,
    /// Target symbol
    pub target: AnalysisSymbol,
    /// Relationship strength (0.0 to 1.0)
    pub strength: f64,
    /// Locations where relationship occurs
    pub locations: Vec<CodeLocation>,
    /// Relationship metadata
    pub metadata: RelationshipMetadata,
}

/// Types of symbol relationships
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RelationshipType {
    /// Function/method calls
    Calls,
    /// Variable/symbol references
    References,
    /// Class inheritance
    Inherits,
    /// Interface implementation
    Implements,
    /// Module/namespace usage
    Uses,
    /// Symbol definition
    Defines,
    /// Type dependency
    DependsOn,
    /// Composition relationship
    Contains,
    /// Association relationship
    Associates,
}

/// Code location for relationships
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeLocation {
    /// File path
    pub file_path: PathBuf,
    /// Position in file
    pub position: Position,
    /// Line content at location
    pub line_content: String,
    /// Context lines around location
    pub context: Vec<String>,
}

/// Position within a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
    /// Character offset from file start
    pub offset: usize,
}

/// Metadata for symbol relationships
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipMetadata {
    /// Frequency of relationship occurrence
    pub frequency: usize,
    /// Confidence score (0.0 to 1.0)
    pub confidence: f64,
    /// Whether relationship is direct or indirect
    pub is_direct: bool,
    /// Additional context information
    pub context: HashMap<String, String>,
}

/// Symbol usage analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolUsageAnalysis {
    /// Symbol being analyzed
    pub symbol: AnalysisSymbol,
    /// Total reference count
    pub reference_count: usize,
    /// Total call count (for functions/methods)
    pub call_count: usize,
    /// Last usage timestamp
    pub last_used: DateTime<Utc>,
    /// Usage frequency score
    pub usage_frequency: f64,
    /// Usage hotspots
    pub hotspots: Vec<UsageHotspot>,
    /// Usage patterns
    pub patterns: Vec<UsagePattern>,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Usage hotspot information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageHotspot {
    /// File path where usage occurs
    pub file_path: PathBuf,
    /// Position of usage
    pub position: Position,
    /// Type of usage
    pub usage_type: UsageType,
    /// Usage frequency at this location
    pub frequency: usize,
    /// Context information
    pub context: String,
}

/// Types of symbol usage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UsageType {
    Read,
    Write,
    Call,
    Reference,
    Definition,
    Declaration,
    Import,
    Export,
}

/// Usage pattern information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsagePattern {
    /// Pattern description
    pub description: String,
    /// Pattern frequency
    pub frequency: usize,
    /// Files where pattern occurs
    pub files: Vec<PathBuf>,
    /// Pattern confidence score
    pub confidence: f64,
}

/// Call hierarchy analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallHierarchyAnalysis {
    /// Function being analyzed
    pub function: AnalysisSymbol,
    /// Functions that call this function
    pub callers: Vec<FunctionReference>,
    /// Functions called by this function
    pub callees: Vec<FunctionReference>,
    /// Analysis depth
    pub depth_analyzed: usize,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Function reference in call hierarchy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionReference {
    /// Referenced function
    pub function: AnalysisSymbol,
    /// Call locations
    pub call_sites: Vec<CodeLocation>,
    /// Call frequency
    pub call_frequency: usize,
    /// Reference type
    pub reference_type: CallReferenceType,
}

/// Types of function references
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallReferenceType {
    DirectCall,
    IndirectCall,
    FunctionPointer,
    Callback,
    Override,
    Implementation,
}

/// Function caller information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCaller {
    /// Calling function
    pub caller: AnalysisSymbol,
    /// Call location
    pub call_site: CodeLocation,
    /// Call context
    pub context: String,
    /// Call type
    pub call_type: CallReferenceType,
}

/// Inheritance hierarchy analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InheritanceHierarchyAnalysis {
    /// Class being analyzed
    pub class: AnalysisSymbol,
    /// Parent classes
    pub parents: Vec<ClassReference>,
    /// Child classes
    pub children: Vec<ClassReference>,
    /// Implemented interfaces
    pub interfaces: Vec<InterfaceReference>,
    /// Analysis depth
    pub depth_analyzed: usize,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Class reference in inheritance hierarchy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassReference {
    /// Referenced class
    pub class: AnalysisSymbol,
    /// Inheritance type
    pub inheritance_type: InheritanceType,
    /// Access level
    pub access_level: SymbolVisibility,
}

/// Types of inheritance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InheritanceType {
    Extends,
    Implements,
    Mixin,
    Trait,
}

/// Interface reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceReference {
    /// Referenced interface
    pub interface: AnalysisSymbol,
    /// Implementation completeness
    pub implementation_complete: bool,
    /// Missing methods
    pub missing_methods: Vec<String>,
}

/// Class member analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassMemberAnalysis {
    /// Class being analyzed
    pub class: AnalysisSymbol,
    /// Class methods
    pub methods: Vec<MethodInfo>,
    /// Class properties/fields
    pub properties: Vec<PropertyInfo>,
    /// Static members
    pub static_members: Vec<AnalysisSymbol>,
    /// Constructor information
    pub constructors: Vec<MethodInfo>,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Method information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MethodInfo {
    /// Method symbol
    pub method: AnalysisSymbol,
    /// Method parameters
    pub parameters: Vec<ParameterInfo>,
    /// Return type
    pub return_type: Option<String>,
    /// Whether method is abstract
    pub is_abstract: bool,
    /// Whether method is virtual
    pub is_virtual: bool,
    /// Whether method is static
    pub is_static: bool,
}

/// Property information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyInfo {
    /// Property symbol
    pub property: AnalysisSymbol,
    /// Property type
    pub property_type: String,
    /// Whether property has getter
    pub has_getter: bool,
    /// Whether property has setter
    pub has_setter: bool,
    /// Whether property is static
    pub is_static: bool,
    /// Default value if any
    pub default_value: Option<String>,
}

/// Parameter information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterInfo {
    /// Parameter name
    pub name: String,
    /// Parameter type
    pub parameter_type: String,
    /// Whether parameter is optional
    pub is_optional: bool,
    /// Default value if any
    pub default_value: Option<String>,
}

/// Implementation analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationAnalysis {
    /// Interface being analyzed
    pub interface: AnalysisSymbol,
    /// Implementing classes
    pub implementations: Vec<ImplementationInfo>,
    /// Analysis timestamp
    pub analyzed_at: DateTime<Utc>,
}

/// Implementation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationInfo {
    /// Implementing class
    pub implementing_class: AnalysisSymbol,
    /// Implemented methods
    pub implemented_methods: Vec<AnalysisSymbol>,
    /// Missing methods
    pub missing_methods: Vec<String>,
    /// Implementation completeness percentage
    pub completeness: f64,
}

// Validation implementations
impl FileStructureAnalysis {
    /// Validate the analysis data
    pub fn validate(&self) -> Result<(), String> {
        if self.outline.is_empty() {
            return Err("File structure analysis must contain at least one outline node".to_string());
        }
        
        if self.symbol_density.regions.is_empty() {
            return Err("Symbol density map must contain at least one region".to_string());
        }
        
        if self.analysis_duration_ms == 0 {
            return Err("Analysis duration must be greater than zero".to_string());
        }
        
        // Validate outline nodes
        for node in &self.outline {
            node.validate()?;
        }
        
        // Validate density regions
        self.symbol_density.validate()?;
        
        Ok(())
    }
}

impl StructureNode {
    /// Validate the structure node
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Structure node name cannot be empty".to_string());
        }
        
        if self.start_line == 0 {
            return Err("Structure node start line must be greater than zero".to_string());
        }
        
        if self.end_line < self.start_line {
            return Err("Structure node end line must be greater than or equal to start line".to_string());
        }
        
        // Validate child nodes
        for child in &self.children {
            child.validate()?;
        }
        
        Ok(())
    }
}

impl SymbolDensityMap {
    /// Validate the density map
    pub fn validate(&self) -> Result<(), String> {
        if self.regions.is_empty() {
            return Err("Density map must contain at least one region".to_string());
        }
        
        if self.max_density < 0.0 {
            return Err("Maximum density cannot be negative".to_string());
        }
        
        if self.lines_per_region == 0 {
            return Err("Lines per region must be greater than zero".to_string());
        }
        
        // Validate regions
        for region in &self.regions {
            region.validate()?;
        }
        
        Ok(())
    }
}

impl DensityRegion {
    /// Validate the density region
    pub fn validate(&self) -> Result<(), String> {
        if self.start_line == 0 {
            return Err("Density region start line must be greater than zero".to_string());
        }
        
        if self.end_line < self.start_line {
            return Err("Density region end line must be greater than or equal to start line".to_string());
        }
        
        if self.density < 0.0 || self.density > 1.0 {
            return Err("Density must be between 0.0 and 1.0".to_string());
        }
        
        if self.complexity_score < 0.0 {
            return Err("Complexity score cannot be negative".to_string());
        }
        
        Ok(())
    }
}

impl RelationshipAnalysis {
    /// Validate the relationship analysis
    pub fn validate(&self) -> Result<(), String> {
        if self.center_symbol.name.is_empty() {
            return Err("Center symbol name cannot be empty".to_string());
        }
        
        if self.analysis_depth == 0 {
            return Err("Analysis depth must be greater than zero".to_string());
        }
        
        if self.analysis_duration_ms == 0 {
            return Err("Analysis duration must be greater than zero".to_string());
        }
        
        // Validate relationships
        for relationship in &self.relationships {
            relationship.validate()?;
        }
        
        Ok(())
    }
}

impl SymbolRelationship {
    /// Validate the symbol relationship
    pub fn validate(&self) -> Result<(), String> {
        if self.source.name.is_empty() {
            return Err("Source symbol name cannot be empty".to_string());
        }
        
        if self.target.name.is_empty() {
            return Err("Target symbol name cannot be empty".to_string());
        }
        
        if self.strength < 0.0 || self.strength > 1.0 {
            return Err("Relationship strength must be between 0.0 and 1.0".to_string());
        }
        
        if self.locations.is_empty() {
            return Err("Relationship must have at least one location".to_string());
        }
        
        Ok(())
    }
}

impl Default for FileStructureAnalysis {
    fn default() -> Self {
        Self {
            outline: Vec::new(),
            symbol_density: SymbolDensityMap::default(),
            file_metadata: FileMetadata::default(),
            analyzed_at: Utc::now(),
            analysis_duration_ms: 0,
        }
    }
}

impl Default for SymbolDensityMap {
    fn default() -> Self {
        Self {
            regions: Vec::new(),
            max_density: 0.0,
            total_symbols: 0,
            lines_per_region: 10,
            last_updated: Utc::now(),
        }
    }
}

impl Default for FileMetadata {
    fn default() -> Self {
        Self {
            file_path: PathBuf::new(),
            file_size: 0,
            last_modified: Utc::now(),
            language: "unknown".to_string(),
            line_count: 0,
            char_count: 0,
            encoding: "utf-8".to_string(),
        }
    }
}