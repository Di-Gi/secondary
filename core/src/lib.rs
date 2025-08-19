// [[SECONDARY_MIND_CORE]]/src/lib.rs
// Purpose: Declares the crate's library structure, making modules accessible to consumers.
// Architecture: The root of the core library crate, defining the public API.

pub mod components;
pub mod errors;
pub mod model;

// Re-export commonly used types for convenience
pub use components::{
    home_directory_manager::HomeDirectoryManager,
    project_configuration_service::{ProjectConfig, ProjectConfigurationService, ProjectSettings, RecentProjects},
    session_manager::{SessionManager, SessionConfig, SessionInfo, CleanupResult},
    navigation_session_manager::{NavigationSessionManager, NavigationSessionConfig, NavigationSessionMetadata},
    code_source_controller::{CodeSourceController, GitFileStatus, GitStatusCache},
};

// Re-export enhanced project config types
pub use components::project_config::*;
pub use model::session::{ProjectSession, OpenFile, Bookmark, ChatMessage, WorkspaceLayout};

// Re-export navigation types
pub use model::navigation::{
    NavigationHistory, NavigationEntry, NavigationLocation, NavigationSessionData,
    NavigationContext, NavigationState, LayoutConfiguration, Position, NavigationSymbol,
    NavigationTrigger, LocationMetadata, BreadcrumbSegment
};
pub use components::navigation_manager::NavigationManager;

// Re-export navigation session types
pub use model::navigation_session::{
    NavigationSessionData as NavSessionData, NavigationSession, NavigationLocation as NavLocation,
    NavigationHistory as NavHistory, NavigationEntry as NavEntry, NavigationContext as NavContext,
    NavigationState as NavState, LayoutConfiguration as NavLayoutConfig, Position as NavPosition,
    Symbol as NavSymbol, UIState, CacheState, MinimapSettings, FileTreeSettings,
    BreadcrumbSegment as NavBreadcrumb, NavigationPanel
};

// Re-export analysis types
pub use model::analysis::{
    FileStructureAnalysis, StructureNode, StructureNodeType, SymbolDensityMap, DensityRegion,
    FileMetadata, AnalysisSymbol, SymbolType, SymbolVisibility, RelationshipAnalysis,
    SymbolRelationship, RelationshipType, CodeLocation, SymbolUsageAnalysis, UsageHotspot,
    UsageType, CallHierarchyAnalysis, FunctionReference, InheritanceHierarchyAnalysis,
    ClassMemberAnalysis, ImplementationAnalysis
};

// Re-export file tree types
pub use model::file_tree::{
    EnhancedFileTree, FileTreeNode, FileNodeType, FileNodeMetadata, GitStatus,
    FileTreeOptions, FileSortOrder, FileTreeStatistics
};

// Re-export performance types
pub use model::performance::{
    NavigationMetrics, OperationMetrics, SystemResourceMetrics, CacheStatistics,
    PerformanceConfig, PerformanceAlert, AlertType, AlertSeverity, BenchmarkResult,
    PerformanceReport, PerformanceSummary, PerformanceGrade
};

// Re-export migration types
pub use model::migration::{
    SchemaVersion, MigrationConfig, MigrationInfo, MigrationResult, ValidationResults,
    ValidationError, DataTypeSchema, FieldDefinition, FieldDataType, FieldConstraint
};

// Re-export serialization types
pub use model::serialization::{
    SerializationFormat, SerializationConfig, SerializationMetadata, NavigationSerializer,
    SerializationResult, DeserializationResult
};
