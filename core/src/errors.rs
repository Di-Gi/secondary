// [[SECONDARY_MIND]]/src/errors.rs
// Purpose: Enhanced error handling system with recovery strategies and structured logging.
// Architecture: Centralized error definitions with recovery mechanisms and graceful degradation.
// Dependencies: thiserror, serde, chrono, log.

pub mod navigation_error;

use thiserror::Error;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// Re-export navigation error types
pub use navigation_error::{
    NavigationError, NavigationErrorSeverity, NavigationRecoveryStrategy, NavigationErrorContext
};

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum SecondaryMindError {
    #[error("Git operation failed: {0}")]
    GitError(String),
    #[error("Failed to open repository at path: {0}")]
    RepoNotFound(PathBuf),
    #[error("AST Parsing failed for file {file_path}: {reason}")]
    AstParsingError { file_path: PathBuf, reason: String },
    #[error("Command parsing error: {0}")]
    CommandParseError(String),
    #[error("I/O error for path {path}: {message}")]
    IoError { path: PathBuf, message: String },
    
    #[error("Configuration Error: {0}")]
    ConfigError(String),
    
    #[error("AI Synthesis Error: {0}")]
    AIError(String),
    
    // Enhanced infrastructure errors with detailed context
    #[error("Search index error: {operation} failed - {reason}")]
    SearchIndexError { operation: String, reason: String },
    
    #[error("Cache operation failed: {operation} on {key} - {reason}")]
    CacheError { operation: String, key: String, reason: String },
    
    #[error("File watcher error: {event_type} for {path} - {reason}")]
    FileWatcherError { event_type: String, path: PathBuf, reason: String },
    
    #[error("Analysis timeout after {timeout}ms for {component}")]
    AnalysisTimeout { timeout: u64, component: String },
    
    #[error("Memory limit exceeded: {current}MB > {limit}MB in {component}")]
    MemoryLimitExceeded { current: u64, limit: u64, component: String },
    
    // Network and connectivity errors
    #[error("Network error: {operation} failed - {reason}")]
    NetworkError { operation: String, reason: String },
    
    #[error("API rate limit exceeded: {service} - retry after {retry_after}s")]
    RateLimitExceeded { service: String, retry_after: u64 },
    
    // Component-specific errors
    #[error("Symbol resolution failed: {symbol} in {file}")]
    SymbolResolutionError { symbol: String, file: PathBuf },
    
    #[error("Dependency analysis failed: circular dependency detected in {components:?}")]
    CircularDependencyError { components: Vec<String> },
    
    #[error("Plugin error: {plugin} - {reason}")]
    PluginError { plugin: String, reason: String },
    
    #[error("Session error: {operation} failed - {reason}")]
    SessionError { operation: String, reason: String },
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    // Recovery and degradation errors
    #[error("Component degraded: {component} running in limited mode - {reason}")]
    ComponentDegraded { component: String, reason: String },
    
    #[error("Recovery failed: {component} could not be restored - {reason}")]
    RecoveryFailed { component: String, reason: String },
}

/// Error severity levels for prioritizing error handling
#[derive(Debug, Clone, Copy, Hash, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum ErrorSeverity {
    /// Low severity - component can continue with degraded functionality
    Low,
    /// Medium severity - component functionality is impaired but recoverable
    Medium,
    /// High severity - component cannot function, requires immediate attention
    High,
    /// Critical severity - system-wide failure, requires emergency recovery
    Critical,
}

/// Recovery strategy for different error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryStrategy {
    /// Retry the operation with exponential backoff
    Retry { max_attempts: u32, backoff_ms: u64 },
    /// Fallback to alternative implementation
    Fallback { alternative: String },
    /// Degrade functionality but continue operation
    Degrade { limited_mode: String },
    /// Reset component to clean state
    Reset { preserve_data: bool },
    /// Manual intervention required
    Manual { instructions: String },
    /// No recovery possible
    None,
}

/// Structured error context for detailed error reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorContext {
    pub error: SecondaryMindError,
    pub severity: ErrorSeverity,
    pub recovery_strategy: RecoveryStrategy,
    pub timestamp: DateTime<Utc>,
    pub component: String,
    pub operation: String,
    pub user_message: String,
    pub technical_details: String,
    pub suggested_actions: Vec<String>,
    pub related_errors: Vec<String>,
}

impl SecondaryMindError {
    /// Get the severity level for this error type
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            SecondaryMindError::GitError(_) => ErrorSeverity::Medium,
            SecondaryMindError::RepoNotFound(_) => ErrorSeverity::Medium,
            SecondaryMindError::AstParsingError { .. } => ErrorSeverity::Low,
            SecondaryMindError::CommandParseError(_) => ErrorSeverity::Low,
            SecondaryMindError::IoError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::ConfigError(_) => ErrorSeverity::High,
            SecondaryMindError::AIError(_) => ErrorSeverity::Medium,
            SecondaryMindError::SearchIndexError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::CacheError { .. } => ErrorSeverity::Low,
            SecondaryMindError::FileWatcherError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::AnalysisTimeout { .. } => ErrorSeverity::Medium,
            SecondaryMindError::MemoryLimitExceeded { .. } => ErrorSeverity::High,
            SecondaryMindError::NetworkError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::RateLimitExceeded { .. } => ErrorSeverity::Low,
            SecondaryMindError::SymbolResolutionError { .. } => ErrorSeverity::Low,
            SecondaryMindError::CircularDependencyError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::PluginError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::SessionError { .. } => ErrorSeverity::Medium,
            SecondaryMindError::ComponentDegraded { .. } => ErrorSeverity::Low,
            SecondaryMindError::RecoveryFailed { .. } => ErrorSeverity::High,
            SecondaryMindError::ValidationError(_) => ErrorSeverity::Medium,
        }
    }

    /// Get the recommended recovery strategy for this error type
    pub fn recovery_strategy(&self) -> RecoveryStrategy {
        match self {
            SecondaryMindError::GitError(_) => RecoveryStrategy::Retry { max_attempts: 3, backoff_ms: 1000 },
            SecondaryMindError::RepoNotFound(_) => RecoveryStrategy::Manual { 
                instructions: "Verify the repository path exists and is accessible".to_string() 
            },
            SecondaryMindError::AstParsingError { .. } => RecoveryStrategy::Degrade { 
                limited_mode: "Skip file and continue with partial analysis".to_string() 
            },
            SecondaryMindError::CommandParseError(_) => RecoveryStrategy::Fallback { 
                alternative: "Use default command interpretation".to_string() 
            },
            SecondaryMindError::IoError { .. } => RecoveryStrategy::Retry { max_attempts: 2, backoff_ms: 500 },
            SecondaryMindError::ConfigError(_) => RecoveryStrategy::Reset { preserve_data: true },
            SecondaryMindError::AIError(_) => RecoveryStrategy::Fallback { 
                alternative: "Use cached responses or offline mode".to_string() 
            },
            SecondaryMindError::SearchIndexError { .. } => RecoveryStrategy::Reset { preserve_data: false },
            SecondaryMindError::CacheError { .. } => RecoveryStrategy::Degrade { 
                limited_mode: "Disable caching and use direct analysis".to_string() 
            },
            SecondaryMindError::FileWatcherError { .. } => RecoveryStrategy::Fallback { 
                alternative: "Use manual refresh mode".to_string() 
            },
            SecondaryMindError::AnalysisTimeout { .. } => RecoveryStrategy::Degrade { 
                limited_mode: "Use partial analysis results".to_string() 
            },
            SecondaryMindError::MemoryLimitExceeded { .. } => RecoveryStrategy::Reset { preserve_data: false },
            SecondaryMindError::NetworkError { .. } => RecoveryStrategy::Retry { max_attempts: 3, backoff_ms: 2000 },
            SecondaryMindError::RateLimitExceeded { retry_after, .. } => RecoveryStrategy::Retry { 
                max_attempts: 1, 
                backoff_ms: *retry_after * 1000 
            },
            SecondaryMindError::SymbolResolutionError { .. } => RecoveryStrategy::Degrade { 
                limited_mode: "Continue without symbol resolution".to_string() 
            },
            SecondaryMindError::CircularDependencyError { .. } => RecoveryStrategy::Fallback { 
                alternative: "Use simplified dependency analysis".to_string() 
            },
            SecondaryMindError::PluginError { .. } => RecoveryStrategy::Degrade { 
                limited_mode: "Disable plugin and use built-in functionality".to_string() 
            },
            SecondaryMindError::SessionError { .. } => RecoveryStrategy::Reset { preserve_data: true },
            SecondaryMindError::ComponentDegraded { .. } => RecoveryStrategy::None,
            SecondaryMindError::RecoveryFailed { .. } => RecoveryStrategy::Manual { 
                instructions: "Manual intervention required - check logs for details".to_string() 
            },
            SecondaryMindError::ValidationError(_) => RecoveryStrategy::Manual { 
                instructions: "Fix validation errors and retry".to_string() 
            },
        }
    }

    /// Get user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            SecondaryMindError::GitError(_) => "Git operation failed. Please check your repository status.".to_string(),
            SecondaryMindError::RepoNotFound(path) => format!("Repository not found at {}. Please verify the path.", path.display()),
            SecondaryMindError::AstParsingError { file_path, .. } => format!("Unable to parse {}. The file may contain syntax errors.", file_path.display()),
            SecondaryMindError::CommandParseError(_) => "Command format not recognized. Please check the syntax.".to_string(),
            SecondaryMindError::IoError { path, .. } => format!("File access error for {}. Check permissions and availability.", path.display()),
            SecondaryMindError::ConfigError(_) => "Configuration error detected. Settings may need to be reset.".to_string(),
            SecondaryMindError::AIError(_) => "AI service temporarily unavailable. Some features may be limited.".to_string(),
            SecondaryMindError::SearchIndexError { .. } => "Search functionality temporarily impaired. Rebuilding index...".to_string(),
            SecondaryMindError::CacheError { .. } => "Cache system error. Performance may be reduced temporarily.".to_string(),
            SecondaryMindError::FileWatcherError { .. } => "File monitoring disabled. Changes won't be detected automatically.".to_string(),
            SecondaryMindError::AnalysisTimeout { .. } => "Analysis taking longer than expected. Using partial results.".to_string(),
            SecondaryMindError::MemoryLimitExceeded { .. } => "Memory usage too high. Reducing analysis scope.".to_string(),
            SecondaryMindError::NetworkError { .. } => "Network connectivity issue. Some features may be unavailable.".to_string(),
            SecondaryMindError::RateLimitExceeded { service, retry_after } => format!("{} rate limit reached. Please wait {} seconds.", service, retry_after),
            SecondaryMindError::SymbolResolutionError { symbol, .. } => format!("Cannot resolve symbol '{}'. Navigation may be limited.", symbol),
            SecondaryMindError::CircularDependencyError { .. } => "Circular dependency detected. Dependency analysis may be incomplete.".to_string(),
            SecondaryMindError::PluginError { plugin, .. } => format!("Plugin '{}' encountered an error. Functionality may be limited.", plugin),
            SecondaryMindError::SessionError { .. } => "Session management error. Some settings may not be preserved.".to_string(),
            SecondaryMindError::ComponentDegraded { component, .. } => format!("{} is running in limited mode.", component),
            SecondaryMindError::RecoveryFailed { component, .. } => format!("{} could not be restored. Manual intervention may be required.", component),
            SecondaryMindError::ValidationError(msg) => format!("Validation failed: {}", msg),
        }
    }

    /// Get suggested actions for the user
    pub fn suggested_actions(&self) -> Vec<String> {
        match self {
            SecondaryMindError::GitError(_) => vec![
                "Check git repository status".to_string(),
                "Verify git credentials".to_string(),
                "Try refreshing the project".to_string(),
            ],
            SecondaryMindError::RepoNotFound(_) => vec![
                "Verify the repository path exists".to_string(),
                "Check file permissions".to_string(),
                "Try opening a different project".to_string(),
            ],
            SecondaryMindError::AstParsingError { .. } => vec![
                "Check file for syntax errors".to_string(),
                "Verify file encoding is UTF-8".to_string(),
                "Skip this file and continue".to_string(),
            ],
            SecondaryMindError::ConfigError(_) => vec![
                "Reset configuration to defaults".to_string(),
                "Check configuration file syntax".to_string(),
                "Backup and recreate configuration".to_string(),
            ],
            SecondaryMindError::AIError(_) => vec![
                "Check internet connection".to_string(),
                "Verify API credentials".to_string(),
                "Try again later".to_string(),
            ],
            SecondaryMindError::MemoryLimitExceeded { .. } => vec![
                "Close other applications".to_string(),
                "Reduce project scope".to_string(),
                "Increase memory limits in settings".to_string(),
            ],
            _ => vec!["Try refreshing the application".to_string()],
        }
    }

    /// Convert to structured error context
    pub fn to_context(&self, component: &str, operation: &str) -> ErrorContext {
        ErrorContext {
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
        }
    }
}

impl SecondaryMindError {
    /// Create an IoError from std::io::Error
    pub fn from_io_error(path: PathBuf, source: std::io::Error) -> Self {
        SecondaryMindError::IoError {
            path,
            message: source.to_string(),
        }
    }
}
