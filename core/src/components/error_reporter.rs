// [[SECONDARY_MIND]]/src/components/error_reporter.rs
// Purpose: Structured error reporting and logging system
// Architecture: Centralized error reporting with multiple output formats
// Dependencies: serde_json, chrono, log, tokio

use crate::errors::{ErrorContext, ErrorSeverity};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use tokio::fs;
use log::{error, warn, info};

/// Error report format for structured logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorReport {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub severity: ErrorSeverity,
    pub component: String,
    pub operation: String,
    pub error_type: String,
    pub error_message: String,
    pub user_message: String,
    pub technical_details: String,
    pub suggested_actions: Vec<String>,
    pub context: HashMap<String, String>,
    pub stack_trace: Option<String>,
    pub recovery_attempted: bool,
    pub recovery_successful: bool,
}

/// Error statistics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorStatistics {
    pub total_errors: u64,
    pub errors_by_severity: HashMap<ErrorSeverity, u64>,
    pub errors_by_component: HashMap<String, u64>,
    pub errors_by_type: HashMap<String, u64>,
    pub recovery_success_rate: f64,
    pub last_updated: DateTime<Utc>,
}

/// Error reporter for structured logging and monitoring
pub struct ErrorReporter {
    reports_dir: PathBuf,
    max_reports: usize,
    statistics: ErrorStatistics,
}

impl ErrorReporter {
    pub fn new(reports_dir: PathBuf) -> Self {
        Self {
            reports_dir,
            max_reports: 10000,
            statistics: ErrorStatistics {
                total_errors: 0,
                errors_by_severity: HashMap::new(),
                errors_by_component: HashMap::new(),
                errors_by_type: HashMap::new(),
                recovery_success_rate: 0.0,
                last_updated: Utc::now(),
            },
        }
    }

    /// Report an error with structured logging
    pub async fn report_error(&mut self, context: &ErrorContext, recovery_successful: bool) -> Result<String, std::io::Error> {
        let report_id = self.generate_report_id();
        
        let report = ErrorReport {
            id: report_id.clone(),
            timestamp: context.timestamp,
            severity: context.severity,
            component: context.component.clone(),
            operation: context.operation.clone(),
            error_type: self.get_error_type(&context.error),
            error_message: context.error.to_string(),
            user_message: context.user_message.clone(),
            technical_details: context.technical_details.clone(),
            suggested_actions: context.suggested_actions.clone(),
            context: self.extract_context_data(context),
            stack_trace: None, // Could be enhanced to capture stack traces
            recovery_attempted: true,
            recovery_successful,
        };

        // Update statistics
        self.update_statistics(&report);

        // Write report to file
        self.write_report(&report).await?;

        // Log to console based on severity
        self.log_to_console(&report);

        Ok(report_id)
    }

    /// Generate unique report ID
    fn generate_report_id(&self) -> String {
        format!("ERR_{}", Utc::now().format("%Y%m%d_%H%M%S_%3f"))
    }

    /// Extract error type from SecondaryMindError
    fn get_error_type(&self, error: &crate::errors::SecondaryMindError) -> String {
        match error {
            crate::errors::SecondaryMindError::GitError(_) => "GitError".to_string(),
            crate::errors::SecondaryMindError::RepoNotFound(_) => "RepoNotFound".to_string(),
            crate::errors::SecondaryMindError::AstParsingError { .. } => "AstParsingError".to_string(),
            crate::errors::SecondaryMindError::CommandParseError(_) => "CommandParseError".to_string(),
            crate::errors::SecondaryMindError::IoError { .. } => "IoError".to_string(),
            crate::errors::SecondaryMindError::ConfigError(_) => "ConfigError".to_string(),
            crate::errors::SecondaryMindError::AIError(_) => "AIError".to_string(),
            crate::errors::SecondaryMindError::SearchIndexError { .. } => "SearchIndexError".to_string(),
            crate::errors::SecondaryMindError::CacheError { .. } => "CacheError".to_string(),
            crate::errors::SecondaryMindError::FileWatcherError { .. } => "FileWatcherError".to_string(),
            crate::errors::SecondaryMindError::AnalysisTimeout { .. } => "AnalysisTimeout".to_string(),
            crate::errors::SecondaryMindError::MemoryLimitExceeded { .. } => "MemoryLimitExceeded".to_string(),
            crate::errors::SecondaryMindError::NetworkError { .. } => "NetworkError".to_string(),
            crate::errors::SecondaryMindError::RateLimitExceeded { .. } => "RateLimitExceeded".to_string(),
            crate::errors::SecondaryMindError::SymbolResolutionError { .. } => "SymbolResolutionError".to_string(),
            crate::errors::SecondaryMindError::CircularDependencyError { .. } => "CircularDependencyError".to_string(),
            crate::errors::SecondaryMindError::PluginError { .. } => "PluginError".to_string(),
            crate::errors::SecondaryMindError::SessionError { .. } => "SessionError".to_string(),
            crate::errors::SecondaryMindError::ComponentDegraded { .. } => "ComponentDegraded".to_string(),
            crate::errors::SecondaryMindError::RecoveryFailed { .. } => "RecoveryFailed".to_string(),
        }
    }

    /// Extract additional context data from error context
    fn extract_context_data(&self, context: &ErrorContext) -> HashMap<String, String> {
        let mut data = HashMap::new();
        
        // Add basic context
        data.insert("severity".to_string(), format!("{:?}", context.severity));
        data.insert("recovery_strategy".to_string(), format!("{:?}", context.recovery_strategy));
        
        // Add error-specific context
        match &context.error {
            crate::errors::SecondaryMindError::IoError { path, .. } => {
                data.insert("file_path".to_string(), path.display().to_string());
            },
            crate::errors::SecondaryMindError::AstParsingError { file_path, .. } => {
                data.insert("file_path".to_string(), file_path.display().to_string());
            },
            crate::errors::SecondaryMindError::MemoryLimitExceeded { current, limit, component } => {
                data.insert("memory_current".to_string(), current.to_string());
                data.insert("memory_limit".to_string(), limit.to_string());
                data.insert("memory_component".to_string(), component.clone());
            },
            crate::errors::SecondaryMindError::AnalysisTimeout { timeout, component } => {
                data.insert("timeout_ms".to_string(), timeout.to_string());
                data.insert("timeout_component".to_string(), component.clone());
            },
            crate::errors::SecondaryMindError::RateLimitExceeded { service, retry_after } => {
                data.insert("rate_limit_service".to_string(), service.clone());
                data.insert("retry_after_seconds".to_string(), retry_after.to_string());
            },
            _ => {}
        }
        
        data
    }

    /// Update error statistics
    fn update_statistics(&mut self, report: &ErrorReport) {
        self.statistics.total_errors += 1;
        
        // Update severity counts
        *self.statistics.errors_by_severity.entry(report.severity).or_insert(0) += 1;
        
        // Update component counts
        *self.statistics.errors_by_component.entry(report.component.clone()).or_insert(0) += 1;
        
        // Update error type counts
        *self.statistics.errors_by_type.entry(report.error_type.clone()).or_insert(0) += 1;
        
        // Update recovery success rate (simple moving average)
        let current_rate = self.statistics.recovery_success_rate;
        let total = self.statistics.total_errors as f64;
        let success_weight = if report.recovery_successful { 1.0 } else { 0.0 };
        
        self.statistics.recovery_success_rate = 
            (current_rate * (total - 1.0) + success_weight) / total;
        
        self.statistics.last_updated = Utc::now();
    }

    /// Write error report to file
    async fn write_report(&self, report: &ErrorReport) -> Result<(), std::io::Error> {
        // Ensure reports directory exists
        fs::create_dir_all(&self.reports_dir).await?;
        
        // Write individual report
        let report_file = self.reports_dir.join(format!("{}.json", report.id));
        let report_json = serde_json::to_string_pretty(report)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        
        fs::write(report_file, report_json).await?;
        
        // Write updated statistics
        let stats_file = self.reports_dir.join("statistics.json");
        let stats_json = serde_json::to_string_pretty(&self.statistics)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        
        fs::write(stats_file, stats_json).await?;
        
        // Cleanup old reports if needed
        self.cleanup_old_reports().await?;
        
        Ok(())
    }

    /// Log error to console with appropriate level
    fn log_to_console(&self, report: &ErrorReport) {
        let log_message = format!(
            "[{}] {} in {}: {} | Recovery: {}",
            report.id,
            report.error_type,
            report.component,
            report.error_message,
            if report.recovery_successful { "SUCCESS" } else { "FAILED" }
        );

        match report.severity {
            ErrorSeverity::Critical => error!("{}", log_message),
            ErrorSeverity::High => error!("{}", log_message),
            ErrorSeverity::Medium => warn!("{}", log_message),
            ErrorSeverity::Low => info!("{}", log_message),
        }
    }

    /// Cleanup old error reports
    async fn cleanup_old_reports(&self) -> Result<(), std::io::Error> {
        let mut entries = fs::read_dir(&self.reports_dir).await?;
        let mut report_files = Vec::new();
        
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") && 
               path.file_name().map_or(false, |name| name.to_string_lossy().starts_with("ERR_")) {
                if let Ok(metadata) = entry.metadata().await {
                    if let Ok(created) = metadata.created() {
                        report_files.push((path, created));
                    }
                }
            }
        }
        
        // Sort by creation time (oldest first)
        report_files.sort_by_key(|(_, created)| *created);
        
        // Remove excess files
        if report_files.len() > self.max_reports {
            let to_remove = report_files.len() - self.max_reports;
            for (path, _) in report_files.iter().take(to_remove) {
                if let Err(e) = fs::remove_file(path).await {
                    warn!("Failed to remove old error report {}: {}", path.display(), e);
                }
            }
        }
        
        Ok(())
    }

    /// Get error statistics
    pub fn get_statistics(&self) -> &ErrorStatistics {
        &self.statistics
    }

    /// Get recent error reports
    pub async fn get_recent_reports(&self, limit: usize) -> Result<Vec<ErrorReport>, std::io::Error> {
        let mut entries = fs::read_dir(&self.reports_dir).await?;
        let mut report_files = Vec::new();
        
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") && 
               path.file_name().map_or(false, |name| name.to_string_lossy().starts_with("ERR_")) {
                if let Ok(metadata) = entry.metadata().await {
                    if let Ok(created) = metadata.created() {
                        report_files.push((path, created));
                    }
                }
            }
        }
        
        // Sort by creation time (newest first)
        report_files.sort_by_key(|(_, created)| std::cmp::Reverse(*created));
        
        let mut reports = Vec::new();
        for (path, _) in report_files.iter().take(limit) {
            if let Ok(content) = fs::read_to_string(path).await {
                if let Ok(report) = serde_json::from_str::<ErrorReport>(&content) {
                    reports.push(report);
                }
            }
        }
        
        Ok(reports)
    }

    /// Clear all error reports and statistics
    pub async fn clear_reports(&mut self) -> Result<(), std::io::Error> {
        // Remove all report files
        let mut entries = fs::read_dir(&self.reports_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.is_file() {
                fs::remove_file(path).await?;
            }
        }
        
        // Reset statistics
        self.statistics = ErrorStatistics {
            total_errors: 0,
            errors_by_severity: HashMap::new(),
            errors_by_component: HashMap::new(),
            errors_by_type: HashMap::new(),
            recovery_success_rate: 0.0,
            last_updated: Utc::now(),
        };
        
        Ok(())
    }
}