// [[SECONDARY_MIND]]/src/components/error_logger.rs
// Purpose: Structured error logging system with detailed error reporting and analytics.
// Architecture: Centralized logging with structured data, filtering, and export capabilities.
// Dependencies: log, serde, chrono, tokio.

use crate::errors::{SecondaryMindError, ErrorContext, ErrorSeverity};
use chrono::{DateTime, Utc, Duration, Timelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncWriteExt, BufWriter};
use log::{error, warn, info, debug};

/// Structured error logger with analytics and reporting capabilities
pub struct ErrorLogger {
    /// Error log entries
    log_entries: Arc<RwLock<Vec<ErrorLogEntry>>>,
    /// Error statistics
    statistics: Arc<RwLock<ErrorStatistics>>,
    /// Log file writer
    log_writer: Arc<RwLock<Option<BufWriter<File>>>>,
    /// Configuration
    config: LoggerConfig,
}

/// Individual error log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorLogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub context: ErrorContext,
    pub session_id: String,
    pub user_id: Option<String>,
    pub environment: Environment,
    pub stack_trace: Option<String>,
    pub additional_data: HashMap<String, serde_json::Value>,
}

/// Error statistics for analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorStatistics {
    pub total_errors: u64,
    pub errors_by_severity: HashMap<ErrorSeverity, u64>,
    pub errors_by_component: HashMap<String, u64>,
    pub errors_by_type: HashMap<String, u64>,
    pub error_trends: Vec<ErrorTrend>,
    pub recovery_success_rate: f64,
    pub most_common_errors: Vec<CommonError>,
}

/// Error trend data for time-based analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorTrend {
    pub timestamp: DateTime<Utc>,
    pub error_count: u64,
    pub severity_distribution: HashMap<ErrorSeverity, u64>,
}

/// Common error pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommonError {
    pub error_type: String,
    pub count: u64,
    pub percentage: f64,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub components_affected: Vec<String>,
}

/// Environment information for error context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub os: String,
    pub arch: String,
    pub app_version: String,
    pub rust_version: String,
    pub memory_usage_mb: u64,
    pub cpu_usage_percent: f64,
    pub disk_space_available_gb: u64,
}

/// Logger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggerConfig {
    /// Maximum number of log entries to keep in memory
    pub max_memory_entries: usize,
    /// Log file path
    pub log_file_path: Option<PathBuf>,
    /// Enable structured logging to file
    pub enable_file_logging: bool,
    /// Enable error analytics
    pub enable_analytics: bool,
    /// Minimum severity level to log
    pub min_severity: ErrorSeverity,
    /// Retention period for log entries (days)
    pub retention_days: u32,
    /// Enable sensitive data filtering
    pub filter_sensitive_data: bool,
}

impl Default for LoggerConfig {
    fn default() -> Self {
        Self {
            max_memory_entries: 1000,
            log_file_path: Some(PathBuf::from("secondary_mind_errors.log")),
            enable_file_logging: true,
            enable_analytics: true,
            min_severity: ErrorSeverity::Low,
            retention_days: 30,
            filter_sensitive_data: true,
        }
    }
}

impl ErrorLogger {
    /// Create a new error logger
    pub async fn new(config: LoggerConfig) -> Result<Self, SecondaryMindError> {
        let log_writer = if config.enable_file_logging && config.log_file_path.is_some() {
            let file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(config.log_file_path.as_ref().unwrap())
                .await
                .map_err(|e| SecondaryMindError::IoError {
                    path: config.log_file_path.as_ref().unwrap().clone(),
                    message: e.to_string(),
                })?;
            Some(BufWriter::new(file))
        } else {
            None
        };

        Ok(Self {
            log_entries: Arc::new(RwLock::new(Vec::new())),
            statistics: Arc::new(RwLock::new(ErrorStatistics::default())),
            log_writer: Arc::new(RwLock::new(log_writer)),
            config,
        })
    }

    /// Log an error with full context
    pub async fn log_error(
        &self,
        context: ErrorContext,
        session_id: String,
        user_id: Option<String>,
        additional_data: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<String, SecondaryMindError> {
        // Check if error meets minimum severity threshold
        if context.severity < self.config.min_severity {
            return Ok(String::new());
        }

        // Generate unique error ID
        let error_id = self.generate_error_id(&context).await;

        // Collect environment information
        let environment = self.collect_environment_info().await;

        // Create log entry
        let log_entry = ErrorLogEntry {
            id: error_id.clone(),
            timestamp: Utc::now(),
            context: self.filter_sensitive_data(context).await,
            session_id,
            user_id,
            environment,
            stack_trace: self.capture_stack_trace(),
            additional_data: additional_data.unwrap_or_default(),
        };

        // Add to memory log
        self.add_log_entry(log_entry.clone()).await;

        // Write to file if enabled
        if self.config.enable_file_logging {
            self.write_to_file(&log_entry).await?;
        }

        // Update statistics if enabled
        if self.config.enable_analytics {
            self.update_statistics(&log_entry).await;
        }

        // Log to standard logger
        self.log_to_standard_logger(&log_entry);

        Ok(error_id)
    }

    /// Generate unique error ID
    async fn generate_error_id(&self, context: &ErrorContext) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        context.error.to_string().hash(&mut hasher);
        context.component.hash(&mut hasher);
        context.timestamp.timestamp().hash(&mut hasher);
        
        format!("ERR_{:016x}", hasher.finish())
    }

    /// Add log entry to memory storage
    async fn add_log_entry(&self, entry: ErrorLogEntry) {
        let mut entries = self.log_entries.write().await;
        entries.push(entry);

        // Maintain memory limit
        if entries.len() > self.config.max_memory_entries {
            let excess = entries.len() - self.config.max_memory_entries;
            entries.drain(0..excess);
        }
    }

    /// Write log entry to file
    async fn write_to_file(&self, entry: &ErrorLogEntry) -> Result<(), SecondaryMindError> {
        let mut writer_guard = self.log_writer.write().await;
        if let Some(writer) = writer_guard.as_mut() {
            let json_line = serde_json::to_string(entry)
                .map_err(|e| SecondaryMindError::ConfigError(format!("JSON serialization failed: {}", e)))?;
            
            writer.write_all(json_line.as_bytes()).await
                .map_err(|e| SecondaryMindError::IoError {
                    path: self.config.log_file_path.as_ref().unwrap().clone(),
                    message: e.to_string(),
                })?;
            
            writer.write_all(b"\n").await
                .map_err(|e| SecondaryMindError::IoError {
                    path: self.config.log_file_path.as_ref().unwrap().clone(),
                    message: e.to_string(),
                })?;
            
            writer.flush().await
                .map_err(|e| SecondaryMindError::IoError {
                    path: self.config.log_file_path.as_ref().unwrap().clone(),
                    message: e.to_string(),
                })?;
        }
        Ok(())
    }

    /// Update error statistics
    async fn update_statistics(&self, entry: &ErrorLogEntry) {
        let mut stats = self.statistics.write().await;
        
        // Update total count
        stats.total_errors += 1;

        // Update severity counts
        *stats.errors_by_severity.entry(entry.context.severity).or_insert(0) += 1;

        // Update component counts
        *stats.errors_by_component.entry(entry.context.component.clone()).or_insert(0) += 1;

        // Update error type counts
        let error_type = format!("{:?}", entry.context.error).split('(').next().unwrap_or("Unknown").to_string();
        *stats.errors_by_type.entry(error_type.clone()).or_insert(0) += 1;

        // Update trends (hourly buckets)
        let hour_bucket = entry.timestamp.with_minute(0).unwrap().with_second(0).unwrap().with_nanosecond(0).unwrap();
        if let Some(trend) = stats.error_trends.iter_mut().find(|t| t.timestamp == hour_bucket) {
            trend.error_count += 1;
            *trend.severity_distribution.entry(entry.context.severity).or_insert(0) += 1;
        } else {
            let mut severity_dist = HashMap::new();
            severity_dist.insert(entry.context.severity, 1);
            stats.error_trends.push(ErrorTrend {
                timestamp: hour_bucket,
                error_count: 1,
                severity_distribution: severity_dist,
            });
        }

        // Keep only recent trends (last 24 hours)
        let cutoff = Utc::now() - Duration::hours(24);
        stats.error_trends.retain(|trend| trend.timestamp > cutoff);

        // Update common errors
        self.update_common_errors(&mut stats, entry, &error_type).await;
    }

    /// Update common error patterns
    async fn update_common_errors(&self, stats: &mut ErrorStatistics, entry: &ErrorLogEntry, error_type: &str) {
        if let Some(common_error) = stats.most_common_errors.iter_mut().find(|e| e.error_type == *error_type) {
            common_error.count += 1;
            common_error.last_seen = entry.timestamp;
            common_error.percentage = (common_error.count as f64 / stats.total_errors as f64) * 100.0;
            
            if !common_error.components_affected.contains(&entry.context.component) {
                common_error.components_affected.push(entry.context.component.clone());
            }
        } else {
            stats.most_common_errors.push(CommonError {
                error_type: error_type.to_string(),
                count: 1,
                percentage: (1.0 / stats.total_errors as f64) * 100.0,
                first_seen: entry.timestamp,
                last_seen: entry.timestamp,
                components_affected: vec![entry.context.component.clone()],
            });
        }

        // Sort by count and keep top 10
        stats.most_common_errors.sort_by(|a, b| b.count.cmp(&a.count));
        stats.most_common_errors.truncate(10);
    }

    /// Filter sensitive data from error context
    async fn filter_sensitive_data(&self, mut context: ErrorContext) -> ErrorContext {
        if !self.config.filter_sensitive_data {
            return context;
        }

        // Filter sensitive patterns from technical details
        context.technical_details = self.filter_sensitive_patterns(&context.technical_details);
        
        // Filter user message if it contains sensitive data
        context.user_message = self.filter_sensitive_patterns(&context.user_message);

        context
    }

    /// Filter sensitive patterns from text
    fn filter_sensitive_patterns(&self, text: &str) -> String {
        let sensitive_patterns = [
            (r"password[=:]\s*\S+", "password=***"),
            (r"token[=:]\s*\S+", "token=***"),
            (r"key[=:]\s*\S+", "key=***"),
            (r"secret[=:]\s*\S+", "secret=***"),
            (r"api_key[=:]\s*\S+", "api_key=***"),
            (r"/home/[^/\s]+", "/home/***"),
            (r"C:\\Users\\[^\\s]+", "C:\\Users\\***"),
        ];

        let mut filtered = text.to_string();
        for (pattern, replacement) in &sensitive_patterns {
            if let Ok(regex) = regex::Regex::new(pattern) {
                filtered = regex.replace_all(&filtered, *replacement).to_string();
            }
        }
        filtered
    }

    /// Collect environment information
    async fn collect_environment_info(&self) -> Environment {
        Environment {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            rust_version: "1.70.0".to_string(), // Would be detected at runtime
            memory_usage_mb: self.get_memory_usage().await,
            cpu_usage_percent: self.get_cpu_usage().await,
            disk_space_available_gb: self.get_disk_space().await,
        }
    }

    /// Get current memory usage (placeholder)
    async fn get_memory_usage(&self) -> u64 {
        // In real implementation, would use system APIs
        0
    }

    /// Get current CPU usage (placeholder)
    async fn get_cpu_usage(&self) -> f64 {
        // In real implementation, would use system APIs
        0.0
    }

    /// Get available disk space (placeholder)
    async fn get_disk_space(&self) -> u64 {
        // In real implementation, would use system APIs
        0
    }

    /// Capture stack trace (placeholder)
    fn capture_stack_trace(&self) -> Option<String> {
        // In real implementation, would capture actual stack trace
        None
    }

    /// Log to standard logger
    fn log_to_standard_logger(&self, entry: &ErrorLogEntry) {
        match entry.context.severity {
            ErrorSeverity::Low => debug!("[{}] {}: {}", entry.context.component, entry.context.operation, entry.context.user_message),
            ErrorSeverity::Medium => info!("[{}] {}: {}", entry.context.component, entry.context.operation, entry.context.user_message),
            ErrorSeverity::High => warn!("[{}] {}: {}", entry.context.component, entry.context.operation, entry.context.user_message),
            ErrorSeverity::Critical => error!("[{}] {}: {}", entry.context.component, entry.context.operation, entry.context.user_message),
        }
    }

    /// Get error statistics
    pub async fn get_statistics(&self) -> ErrorStatistics {
        self.statistics.read().await.clone()
    }

    /// Get recent log entries
    pub async fn get_recent_entries(&self, limit: usize) -> Vec<ErrorLogEntry> {
        let entries = self.log_entries.read().await;
        entries.iter().rev().take(limit).cloned().collect()
    }

    /// Search log entries by criteria
    pub async fn search_entries(&self, criteria: SearchCriteria) -> Vec<ErrorLogEntry> {
        let entries = self.log_entries.read().await;
        entries.iter()
            .filter(|entry| self.matches_criteria(entry, &criteria))
            .cloned()
            .collect()
    }

    /// Check if entry matches search criteria
    fn matches_criteria(&self, entry: &ErrorLogEntry, criteria: &SearchCriteria) -> bool {
        if let Some(component) = &criteria.component {
            if entry.context.component != *component {
                return false;
            }
        }

        if let Some(severity) = criteria.min_severity {
            if entry.context.severity < severity {
                return false;
            }
        }

        if let Some(start_time) = criteria.start_time {
            if entry.timestamp < start_time {
                return false;
            }
        }

        if let Some(end_time) = criteria.end_time {
            if entry.timestamp > end_time {
                return false;
            }
        }

        if let Some(error_type) = &criteria.error_type {
            let error_debug = format!("{:?}", entry.context.error);
            let entry_type = error_debug.split('(').next().unwrap_or("Unknown");
            if entry_type != *error_type {
                return false;
            }
        }

        true
    }

    /// Clean up old log entries
    pub async fn cleanup_old_entries(&self) -> Result<u64, SecondaryMindError> {
        let cutoff = Utc::now() - Duration::days(self.config.retention_days as i64);
        let mut entries = self.log_entries.write().await;
        let initial_count = entries.len();
        
        entries.retain(|entry| entry.timestamp > cutoff);
        
        let removed_count = initial_count - entries.len();
        info!("Cleaned up {} old log entries", removed_count);
        
        Ok(removed_count as u64)
    }
}

/// Search criteria for log entries
#[derive(Debug, Clone)]
pub struct SearchCriteria {
    pub component: Option<String>,
    pub min_severity: Option<ErrorSeverity>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub error_type: Option<String>,
}

impl Default for ErrorStatistics {
    fn default() -> Self {
        Self {
            total_errors: 0,
            errors_by_severity: HashMap::new(),
            errors_by_component: HashMap::new(),
            errors_by_type: HashMap::new(),
            error_trends: Vec::new(),
            recovery_success_rate: 0.0,
            most_common_errors: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_error_logger_creation() {
        let config = LoggerConfig {
            enable_file_logging: false,
            ..Default::default()
        };
        
        let logger = ErrorLogger::new(config).await.unwrap();
        let stats = logger.get_statistics().await;
        assert_eq!(stats.total_errors, 0);
    }

    #[tokio::test]
    async fn test_error_logging() {
        let temp_dir = tempdir().unwrap();
        let log_path = temp_dir.path().join("test.log");
        
        let config = LoggerConfig {
            log_file_path: Some(log_path),
            enable_file_logging: true,
            ..Default::default()
        };
        
        let logger = ErrorLogger::new(config).await.unwrap();
        
        let error = SecondaryMindError::CacheError {
            operation: "read".to_string(),
            key: "test".to_string(),
            reason: "timeout".to_string(),
        };
        let context = error.to_context("cache", "read_operation");
        
        let error_id = logger.log_error(context, "session123".to_string(), None, None).await.unwrap();
        assert!(!error_id.is_empty());
        
        let stats = logger.get_statistics().await;
        assert_eq!(stats.total_errors, 1);
    }

    #[tokio::test]
    async fn test_sensitive_data_filtering() {
        let config = LoggerConfig {
            enable_file_logging: false,
            filter_sensitive_data: true,
            ..Default::default()
        };
        
        let logger = ErrorLogger::new(config).await.unwrap();
        
        let filtered = logger.filter_sensitive_patterns("password=secret123 and token=abc456");
        assert!(filtered.contains("password=***"));
        assert!(filtered.contains("token=***"));
        assert!(!filtered.contains("secret123"));
        assert!(!filtered.contains("abc456"));
    }
}
