// [[SECONDARY_MIND_CORE]]/src/errors/navigation_error.rs
// Purpose: Comprehensive error handling for navigation backend operations
// Architecture: Structured error definitions with recovery strategies and graceful degradation
// Dependencies: thiserror, serde, chrono, log

use thiserror::Error;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Comprehensive error types for navigation backend operations
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum NavigationError {
    // File System Errors
    #[error("File not found: {path}")]
    FileNotFound { path: PathBuf },
    
    #[error("Permission denied: {path}")]
    PermissionDenied { path: PathBuf },
    
    #[error("IO error for {path}: {source}")]
    IoError { path: PathBuf, source: String },
    
    #[error("Path is outside project boundary: {path}")]
    SecurityViolation { path: PathBuf },
    
    #[error("Invalid file path: {path}")]
    InvalidPath { path: String },
    
    #[error("Directory traversal error: {path}")]
    DirectoryTraversalError { path: PathBuf },
    
    // Analysis Errors
    #[error("Symbol analysis failed for {file}: {reason}")]
    SymbolAnalysisFailed { file: PathBuf, reason: String },
    
    #[error("File structure analysis failed for {file}: {reason}")]
    FileStructureAnalysisFailed { file: PathBuf, reason: String },
    
    #[error("Relationship analysis timeout for symbol: {symbol_id}")]
    RelationshipAnalysisTimeout { symbol_id: String },
    
    #[error("Unsupported file type: {extension} for file: {path}")]
    UnsupportedFileType { extension: String, path: PathBuf },
    
    #[error("AST parsing failed for {file}: {reason}")]
    AstParsingFailed { file: PathBuf, reason: String },
    
    #[error("Symbol not found: {symbol_id}")]
    SymbolNotFound { symbol_id: String },
    
    #[error("Circular dependency detected in symbols: {symbols:?}")]
    CircularDependency { symbols: Vec<String> },
    
    // Session Management Errors
    #[error("Session not found: {session_id}")]
    SessionNotFound { session_id: String },
    
    #[error("Session data corrupted for project: {project_path}")]
    SessionDataCorrupted { project_path: PathBuf },
    
    #[error("Concurrent session access conflict for: {session_id}")]
    ConcurrentAccessConflict { session_id: String },
    
    #[error("Session serialization failed: {reason}")]
    SessionSerializationFailed { reason: String },
    
    #[error("Session validation failed: {reason}")]
    SessionValidationFailed { reason: String },
    
    #[error("Session storage full: {current_size}MB exceeds limit {limit}MB")]
    SessionStorageFull { current_size: u64, limit: u64 },
    
    // Navigation History Errors
    #[error("Navigation history corrupted for project: {project_path}")]
    NavigationHistoryCorrupted { project_path: PathBuf },
    
    #[error("History entry not found: {entry_id}")]
    HistoryEntryNotFound { entry_id: String },
    
    #[error("History cleanup failed: {reason}")]
    HistoryCleanupFailed { reason: String },
    
    // Cache Errors
    #[error("Cache operation failed: {operation} for key: {key}")]
    CacheOperationFailed { operation: String, key: String },
    
    #[error("Cache corruption detected for: {cache_type}")]
    CacheCorruption { cache_type: String },
    
    #[error("Cache memory limit exceeded: {current}MB > {limit}MB")]
    CacheMemoryLimitExceeded { current: u64, limit: u64 },
    
    #[error("Cache invalidation failed for: {key}")]
    CacheInvalidationFailed { key: String },
    
    // Git Integration Errors
    #[error("Git repository not found at: {path}")]
    GitRepositoryNotFound { path: PathBuf },
    
    #[error("Git operation failed: {operation} - {reason}")]
    GitOperationFailed { operation: String, reason: String },
    
    #[error("Git status unavailable for: {path}")]
    GitStatusUnavailable { path: PathBuf },
    
    // Performance and Resource Errors
    #[error("Analysis timeout after {timeout}ms for operation: {operation}")]
    AnalysisTimeout { timeout: u64, operation: String },
    
    #[error("Memory limit exceeded: {current}MB > {limit}MB in component: {component}")]
    MemoryLimitExceeded { current: u64, limit: u64, component: String },
    
    #[error("Resource exhaustion: {resource} limit reached")]
    ResourceExhaustion { resource: String },
    
    #[error("Background task failed: {task_name} - {reason}")]
    BackgroundTaskFailed { task_name: String, reason: String },
    
    // Project Context Errors
    #[error("No project currently loaded")]
    NoProjectLoaded,
    
    #[error("Project initialization failed for: {path}")]
    ProjectInitializationFailed { path: PathBuf },
    
    #[error("Project configuration invalid: {reason}")]
    ProjectConfigurationInvalid { reason: String },
    
    // Data Validation Errors
    #[error("Invalid navigation data: {field} - {reason}")]
    InvalidNavigationData { field: String, reason: String },
    
    #[error("Data migration failed: {from_version} to {to_version} - {reason}")]
    DataMigrationFailed { from_version: String, to_version: String, reason: String },
    
    #[error("Schema validation failed: {reason}")]
    SchemaValidationFailed { reason: String },
    
    // Component Integration Errors
    #[error("Component unavailable: {component} - {reason}")]
    ComponentUnavailable { component: String, reason: String },
    
    #[error("Component initialization failed: {component} - {reason}")]
    ComponentInitializationFailed { component: String, reason: String },
    
    #[error("Service communication failed: {service} - {reason}")]
    ServiceCommunicationFailed { service: String, reason: String },
    
    // Recovery and Degradation
    #[error("Component degraded: {component} running in limited mode - {reason}")]
    ComponentDegraded { component: String, reason: String },
    
    #[error("Recovery failed for: {component} - {reason}")]
    RecoveryFailed { component: String, reason: String },
    
    #[error("Graceful degradation activated for: {feature} - {reason}")]
    GracefulDegradation { feature: String, reason: String },
}

/// Error severity levels for navigation operations
#[derive(Debug, Clone, Copy, Hash, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum NavigationErrorSeverity {
    /// Low severity - operation can continue with degraded functionality
    Low,
    /// Medium severity - operation is impaired but recoverable
    Medium,
    /// High severity - operation cannot complete, requires immediate attention
    High,
    /// Critical severity - system-wide navigation failure
    Critical,
}

/// Recovery strategies for navigation errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NavigationRecoveryStrategy {
    /// Retry the operation with exponential backoff
    Retry { max_attempts: u32, backoff_ms: u64 },
    /// Fallback to cached or simplified data
    Fallback { fallback_type: String },
    /// Degrade functionality but continue operation
    Degrade { limited_functionality: String },
    /// Reset component to clean state
    Reset { preserve_cache: bool },
    /// Skip the operation and continue
    Skip { continue_operation: bool },
    /// Manual intervention required
    Manual { instructions: String },
    /// No recovery possible
    None,
}

/// Structured error context for navigation operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationErrorContext {
    pub error: NavigationError,
    pub severity: NavigationErrorSeverity,
    pub recovery_strategy: NavigationRecoveryStrategy,
    pub timestamp: DateTime<Utc>,
    pub component: String,
    pub operation: String,
    pub user_message: String,
    pub technical_details: String,
    pub suggested_actions: Vec<String>,
    pub related_errors: Vec<String>,
    pub retry_count: u32,
    pub can_continue: bool,
}

impl NavigationError {
    /// Get the severity level for this error type
    pub fn severity(&self) -> NavigationErrorSeverity {
        match self {
            // File System Errors
            NavigationError::FileNotFound { .. } => NavigationErrorSeverity::Medium,
            NavigationError::PermissionDenied { .. } => NavigationErrorSeverity::High,
            NavigationError::IoError { .. } => NavigationErrorSeverity::Medium,
            NavigationError::SecurityViolation { .. } => NavigationErrorSeverity::Critical,
            NavigationError::InvalidPath { .. } => NavigationErrorSeverity::Medium,
            NavigationError::DirectoryTraversalError { .. } => NavigationErrorSeverity::High,
            
            // Analysis Errors
            NavigationError::SymbolAnalysisFailed { .. } => NavigationErrorSeverity::Low,
            NavigationError::FileStructureAnalysisFailed { .. } => NavigationErrorSeverity::Low,
            NavigationError::RelationshipAnalysisTimeout { .. } => NavigationErrorSeverity::Medium,
            NavigationError::UnsupportedFileType { .. } => NavigationErrorSeverity::Low,
            NavigationError::AstParsingFailed { .. } => NavigationErrorSeverity::Low,
            NavigationError::SymbolNotFound { .. } => NavigationErrorSeverity::Low,
            NavigationError::CircularDependency { .. } => NavigationErrorSeverity::Medium,
            
            // Session Management Errors
            NavigationError::SessionNotFound { .. } => NavigationErrorSeverity::Medium,
            NavigationError::SessionDataCorrupted { .. } => NavigationErrorSeverity::High,
            NavigationError::ConcurrentAccessConflict { .. } => NavigationErrorSeverity::Medium,
            NavigationError::SessionSerializationFailed { .. } => NavigationErrorSeverity::Medium,
            NavigationError::SessionValidationFailed { .. } => NavigationErrorSeverity::Medium,
            NavigationError::SessionStorageFull { .. } => NavigationErrorSeverity::High,
            
            // Navigation History Errors
            NavigationError::NavigationHistoryCorrupted { .. } => NavigationErrorSeverity::Medium,
            NavigationError::HistoryEntryNotFound { .. } => NavigationErrorSeverity::Low,
            NavigationError::HistoryCleanupFailed { .. } => NavigationErrorSeverity::Low,
            
            // Cache Errors
            NavigationError::CacheOperationFailed { .. } => NavigationErrorSeverity::Low,
            NavigationError::CacheCorruption { .. } => NavigationErrorSeverity::Medium,
            NavigationError::CacheMemoryLimitExceeded { .. } => NavigationErrorSeverity::High,
            NavigationError::CacheInvalidationFailed { .. } => NavigationErrorSeverity::Low,
            
            // Git Integration Errors
            NavigationError::GitRepositoryNotFound { .. } => NavigationErrorSeverity::Medium,
            NavigationError::GitOperationFailed { .. } => NavigationErrorSeverity::Medium,
            NavigationError::GitStatusUnavailable { .. } => NavigationErrorSeverity::Low,
            
            // Performance and Resource Errors
            NavigationError::AnalysisTimeout { .. } => NavigationErrorSeverity::Medium,
            NavigationError::MemoryLimitExceeded { .. } => NavigationErrorSeverity::High,
            NavigationError::ResourceExhaustion { .. } => NavigationErrorSeverity::High,
            NavigationError::BackgroundTaskFailed { .. } => NavigationErrorSeverity::Medium,
            
            // Project Context Errors
            NavigationError::NoProjectLoaded => NavigationErrorSeverity::High,
            NavigationError::ProjectInitializationFailed { .. } => NavigationErrorSeverity::High,
            NavigationError::ProjectConfigurationInvalid { .. } => NavigationErrorSeverity::High,
            
            // Data Validation Errors
            NavigationError::InvalidNavigationData { .. } => NavigationErrorSeverity::Medium,
            NavigationError::DataMigrationFailed { .. } => NavigationErrorSeverity::High,
            NavigationError::SchemaValidationFailed { .. } => NavigationErrorSeverity::Medium,
            
            // Component Integration Errors
            NavigationError::ComponentUnavailable { .. } => NavigationErrorSeverity::High,
            NavigationError::ComponentInitializationFailed { .. } => NavigationErrorSeverity::High,
            NavigationError::ServiceCommunicationFailed { .. } => NavigationErrorSeverity::Medium,
            
            // Recovery and Degradation
            NavigationError::ComponentDegraded { .. } => NavigationErrorSeverity::Low,
            NavigationError::RecoveryFailed { .. } => NavigationErrorSeverity::High,
            NavigationError::GracefulDegradation { .. } => NavigationErrorSeverity::Low,
        }
    }

    /// Get the recommended recovery strategy for this error type
    pub fn recovery_strategy(&self) -> NavigationRecoveryStrategy {
        match self {
            // File System Errors
            NavigationError::FileNotFound { .. } => NavigationRecoveryStrategy::Skip { continue_operation: true },
            NavigationError::PermissionDenied { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Check file permissions and try again".to_string() 
            },
            NavigationError::IoError { .. } => NavigationRecoveryStrategy::Retry { max_attempts: 3, backoff_ms: 1000 },
            NavigationError::SecurityViolation { .. } => NavigationRecoveryStrategy::None,
            NavigationError::InvalidPath { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Provide a valid file path".to_string() 
            },
            NavigationError::DirectoryTraversalError { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Use project root directory".to_string() 
            },
            
            // Analysis Errors
            NavigationError::SymbolAnalysisFailed { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Skip symbol analysis for this file".to_string() 
            },
            NavigationError::FileStructureAnalysisFailed { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Use basic file information".to_string() 
            },
            NavigationError::RelationshipAnalysisTimeout { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Use cached relationship data".to_string() 
            },
            NavigationError::UnsupportedFileType { .. } => NavigationRecoveryStrategy::Skip { continue_operation: true },
            NavigationError::AstParsingFailed { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Use text-based analysis".to_string() 
            },
            NavigationError::SymbolNotFound { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Use file-level navigation".to_string() 
            },
            NavigationError::CircularDependency { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Break circular references and continue".to_string() 
            },
            
            // Session Management Errors
            NavigationError::SessionNotFound { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Create new session".to_string() 
            },
            NavigationError::SessionDataCorrupted { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            NavigationError::ConcurrentAccessConflict { .. } => NavigationRecoveryStrategy::Retry { 
                max_attempts: 5, backoff_ms: 200 
            },
            NavigationError::SessionSerializationFailed { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Use in-memory session only".to_string() 
            },
            NavigationError::SessionValidationFailed { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: true },
            NavigationError::SessionStorageFull { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Clean up old sessions or increase storage limit".to_string() 
            },
            
            // Navigation History Errors
            NavigationError::NavigationHistoryCorrupted { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            NavigationError::HistoryEntryNotFound { .. } => NavigationRecoveryStrategy::Skip { continue_operation: true },
            NavigationError::HistoryCleanupFailed { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Continue without cleanup".to_string() 
            },
            
            // Cache Errors
            NavigationError::CacheOperationFailed { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Disable caching temporarily".to_string() 
            },
            NavigationError::CacheCorruption { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            NavigationError::CacheMemoryLimitExceeded { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            NavigationError::CacheInvalidationFailed { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Continue with stale cache".to_string() 
            },
            
            // Git Integration Errors
            NavigationError::GitRepositoryNotFound { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Continue without git integration".to_string() 
            },
            NavigationError::GitOperationFailed { .. } => NavigationRecoveryStrategy::Retry { max_attempts: 2, backoff_ms: 1000 },
            NavigationError::GitStatusUnavailable { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Continue without git status".to_string() 
            },
            
            // Performance and Resource Errors
            NavigationError::AnalysisTimeout { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Use partial analysis results".to_string() 
            },
            NavigationError::MemoryLimitExceeded { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            NavigationError::ResourceExhaustion { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Reduce analysis scope".to_string() 
            },
            NavigationError::BackgroundTaskFailed { .. } => NavigationRecoveryStrategy::Retry { 
                max_attempts: 3, backoff_ms: 2000 
            },
            
            // Project Context Errors
            NavigationError::NoProjectLoaded => NavigationRecoveryStrategy::Manual { 
                instructions: "Load a project first".to_string() 
            },
            NavigationError::ProjectInitializationFailed { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Check project path and permissions".to_string() 
            },
            NavigationError::ProjectConfigurationInvalid { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: true },
            
            // Data Validation Errors
            NavigationError::InvalidNavigationData { .. } => NavigationRecoveryStrategy::Fallback { 
                fallback_type: "Use default navigation data".to_string() 
            },
            NavigationError::DataMigrationFailed { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Manual data migration required".to_string() 
            },
            NavigationError::SchemaValidationFailed { .. } => NavigationRecoveryStrategy::Reset { preserve_cache: false },
            
            // Component Integration Errors
            NavigationError::ComponentUnavailable { .. } => NavigationRecoveryStrategy::Degrade { 
                limited_functionality: "Use alternative component".to_string() 
            },
            NavigationError::ComponentInitializationFailed { .. } => NavigationRecoveryStrategy::Retry { 
                max_attempts: 2, backoff_ms: 1000 
            },
            NavigationError::ServiceCommunicationFailed { .. } => NavigationRecoveryStrategy::Retry { 
                max_attempts: 3, backoff_ms: 1500 
            },
            
            // Recovery and Degradation
            NavigationError::ComponentDegraded { .. } => NavigationRecoveryStrategy::None,
            NavigationError::RecoveryFailed { .. } => NavigationRecoveryStrategy::Manual { 
                instructions: "Manual intervention required".to_string() 
            },
            NavigationError::GracefulDegradation { .. } => NavigationRecoveryStrategy::None,
        }
    }

    /// Get user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            NavigationError::FileNotFound { path } => format!("File not found: {}", path.display()),
            NavigationError::PermissionDenied { path } => format!("Access denied to: {}", path.display()),
            NavigationError::IoError { path, .. } => format!("Cannot access file: {}", path.display()),
            NavigationError::SecurityViolation { .. } => "Security violation: file access outside project boundary".to_string(),
            NavigationError::InvalidPath { .. } => "Invalid file path provided".to_string(),
            NavigationError::DirectoryTraversalError { .. } => "Directory access error".to_string(),
            
            NavigationError::SymbolAnalysisFailed { file, .. } => format!("Cannot analyze symbols in: {}", file.display()),
            NavigationError::FileStructureAnalysisFailed { file, .. } => format!("Cannot analyze structure of: {}", file.display()),
            NavigationError::RelationshipAnalysisTimeout { .. } => "Symbol relationship analysis is taking too long".to_string(),
            NavigationError::UnsupportedFileType { extension, .. } => format!("File type '{}' is not supported", extension),
            NavigationError::AstParsingFailed { file, .. } => format!("Cannot parse file: {}", file.display()),
            NavigationError::SymbolNotFound { symbol_id } => format!("Symbol '{}' not found", symbol_id),
            NavigationError::CircularDependency { .. } => "Circular dependency detected in code structure".to_string(),
            
            NavigationError::SessionNotFound { session_id } => format!("Session '{}' not found", session_id),
            NavigationError::SessionDataCorrupted { .. } => "Session data is corrupted".to_string(),
            NavigationError::ConcurrentAccessConflict { .. } => "Session is being accessed by another process".to_string(),
            NavigationError::SessionSerializationFailed { .. } => "Cannot save session data".to_string(),
            NavigationError::SessionValidationFailed { .. } => "Session data validation failed".to_string(),
            NavigationError::SessionStorageFull { .. } => "Session storage is full".to_string(),
            
            NavigationError::NavigationHistoryCorrupted { .. } => "Navigation history is corrupted".to_string(),
            NavigationError::HistoryEntryNotFound { .. } => "History entry not found".to_string(),
            NavigationError::HistoryCleanupFailed { .. } => "Cannot clean up navigation history".to_string(),
            
            NavigationError::CacheOperationFailed { .. } => "Cache operation failed".to_string(),
            NavigationError::CacheCorruption { .. } => "Cache data is corrupted".to_string(),
            NavigationError::CacheMemoryLimitExceeded { .. } => "Cache memory limit exceeded".to_string(),
            NavigationError::CacheInvalidationFailed { .. } => "Cannot refresh cache".to_string(),
            
            NavigationError::GitRepositoryNotFound { .. } => "Git repository not found".to_string(),
            NavigationError::GitOperationFailed { operation, .. } => format!("Git {} operation failed", operation),
            NavigationError::GitStatusUnavailable { .. } => "Git status information unavailable".to_string(),
            
            NavigationError::AnalysisTimeout { operation, .. } => format!("{} is taking too long", operation),
            NavigationError::MemoryLimitExceeded { component, .. } => format!("{} is using too much memory", component),
            NavigationError::ResourceExhaustion { resource } => format!("{} limit reached", resource),
            NavigationError::BackgroundTaskFailed { task_name, .. } => format!("Background task '{}' failed", task_name),
            
            NavigationError::NoProjectLoaded => "No project is currently loaded".to_string(),
            NavigationError::ProjectInitializationFailed { .. } => "Cannot initialize project".to_string(),
            NavigationError::ProjectConfigurationInvalid { .. } => "Project configuration is invalid".to_string(),
            
            NavigationError::InvalidNavigationData { field, .. } => format!("Invalid navigation data: {}", field),
            NavigationError::DataMigrationFailed { .. } => "Data migration failed".to_string(),
            NavigationError::SchemaValidationFailed { .. } => "Data schema validation failed".to_string(),
            
            NavigationError::ComponentUnavailable { component, .. } => format!("{} is currently unavailable", component),
            NavigationError::ComponentInitializationFailed { component, .. } => format!("Cannot initialize {}", component),
            NavigationError::ServiceCommunicationFailed { service, .. } => format!("Cannot communicate with {}", service),
            
            NavigationError::ComponentDegraded { component, .. } => format!("{} is running in limited mode", component),
            NavigationError::RecoveryFailed { component, .. } => format!("Cannot recover {}", component),
            NavigationError::GracefulDegradation { feature, .. } => format!("{} is temporarily limited", feature),
        }
    }

    /// Get suggested actions for the user
    pub fn suggested_actions(&self) -> Vec<String> {
        match self {
            NavigationError::FileNotFound { .. } => vec![
                "Check if the file exists".to_string(),
                "Refresh the project".to_string(),
                "Try a different file".to_string(),
            ],
            NavigationError::PermissionDenied { .. } => vec![
                "Check file permissions".to_string(),
                "Run as administrator if needed".to_string(),
                "Verify file is not locked".to_string(),
            ],
            NavigationError::IoError { .. } => vec![
                "Check file permissions".to_string(),
                "Verify disk space".to_string(),
                "Try again later".to_string(),
            ],
            NavigationError::SecurityViolation { .. } => vec![
                "Use files within the project directory".to_string(),
                "Check project boundaries".to_string(),
            ],
            NavigationError::NoProjectLoaded => vec![
                "Open a project first".to_string(),
                "Check project path".to_string(),
            ],
            NavigationError::SessionStorageFull { .. } => vec![
                "Delete old sessions".to_string(),
                "Increase storage limit".to_string(),
                "Clean up session data".to_string(),
            ],
            NavigationError::MemoryLimitExceeded { .. } => vec![
                "Close other applications".to_string(),
                "Reduce analysis scope".to_string(),
                "Restart the application".to_string(),
            ],
            _ => vec![
                "Try refreshing the view".to_string(),
                "Restart the application if problem persists".to_string(),
            ],
        }
    }

    /// Convert to structured error context
    pub fn to_context(&self, component: &str, operation: &str) -> NavigationErrorContext {
        NavigationErrorContext {
            error: self.clone(),
            severity: self.severity(),
            recovery_strategy: self.recovery_strategy(),
            timestamp: Utc::now(),
            component: component.to_string(),
            operation: operation.to_string(),
            user_message: self.user_message(),
            technical_details: format!("{:?}", self),
            suggested_actions: self.suggested_actions(),
            related_errors: Vec::new(),
            retry_count: 0,
            can_continue: matches!(self.severity(), NavigationErrorSeverity::Low | NavigationErrorSeverity::Medium),
        }
    }

    /// Check if the error allows continuation of operation
    pub fn can_continue(&self) -> bool {
        matches!(self.severity(), NavigationErrorSeverity::Low | NavigationErrorSeverity::Medium)
    }

    /// Check if the error supports retry
    pub fn supports_retry(&self) -> bool {
        matches!(self.recovery_strategy(), NavigationRecoveryStrategy::Retry { .. })
    }
}

/// Helper functions for creating common navigation errors
impl NavigationError {
    pub fn file_not_found(path: PathBuf) -> Self {
        NavigationError::FileNotFound { path }
    }

    pub fn permission_denied(path: PathBuf) -> Self {
        NavigationError::PermissionDenied { path }
    }

    pub fn from_io_error(path: PathBuf, source: std::io::Error) -> Self {
        NavigationError::IoError {
            path,
            source: source.to_string(),
        }
    }

    pub fn security_violation(path: PathBuf) -> Self {
        NavigationError::SecurityViolation { path }
    }

    pub fn symbol_not_found(symbol_id: String) -> Self {
        NavigationError::SymbolNotFound { symbol_id }
    }

    pub fn session_not_found(session_id: String) -> Self {
        NavigationError::SessionNotFound { session_id }
    }

    pub fn no_project_loaded() -> Self {
        NavigationError::NoProjectLoaded
    }

    pub fn analysis_timeout(timeout: u64, operation: String) -> Self {
        NavigationError::AnalysisTimeout { timeout, operation }
    }

    pub fn component_unavailable(component: String, reason: String) -> Self {
        NavigationError::ComponentUnavailable { component, reason }
    }
}