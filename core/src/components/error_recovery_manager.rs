// [[SECONDARY_MIND_CORE]]/src/components/error_recovery_manager.rs
// Purpose: Error recovery manager with retry mechanisms and graceful degradation
// Architecture: Centralized error recovery with configurable strategies
// Dependencies: tokio, log, chrono

use crate::errors::{NavigationError, NavigationErrorContext, NavigationRecoveryStrategy, NavigationErrorSeverity};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use chrono::{DateTime, Utc};
use log::{error, warn, info, debug};

/// Configuration for error recovery behavior
#[derive(Debug, Clone)]
pub struct ErrorRecoveryConfig {
    pub max_retry_attempts: u32,
    pub base_backoff_ms: u64,
    pub max_backoff_ms: u64,
    pub enable_graceful_degradation: bool,
    pub log_all_errors: bool,
    pub track_error_patterns: bool,
}

impl Default for ErrorRecoveryConfig {
    fn default() -> Self {
        Self {
            max_retry_attempts: 3,
            base_backoff_ms: 1000,
            max_backoff_ms: 30000,
            enable_graceful_degradation: true,
            log_all_errors: true,
            track_error_patterns: true,
        }
    }
}

/// Statistics about error recovery operations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ErrorRecoveryStats {
    pub total_errors: u64,
    pub successful_recoveries: u64,
    pub failed_recoveries: u64,
    pub degraded_operations: u64,
    pub retry_attempts: u64,
    pub last_error_time: Option<DateTime<Utc>>,
}

impl Default for ErrorRecoveryStats {
    fn default() -> Self {
        Self {
            total_errors: 0,
            successful_recoveries: 0,
            failed_recoveries: 0,
            degraded_operations: 0,
            retry_attempts: 0,
            last_error_time: None,
        }
    }
}

/// Error pattern tracking for identifying recurring issues
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ErrorPattern {
    pub error_type: String,
    pub component: String,
    pub operation: String,
    pub count: u32,
    pub first_occurrence: DateTime<Utc>,
    pub last_occurrence: DateTime<Utc>,
    pub recovery_success_rate: f64,
}

/// Result of an error recovery attempt
#[derive(Debug, Clone)]
pub enum RecoveryResult<T> {
    /// Operation succeeded after recovery
    Success(T),
    /// Operation succeeded with degraded functionality
    Degraded(T, String),
    /// Recovery failed, operation cannot continue
    Failed(NavigationError),
    /// Manual intervention required
    ManualInterventionRequired(NavigationError, String),
}

/// Error recovery manager for navigation operations
pub struct ErrorRecoveryManager {
    config: ErrorRecoveryConfig,
    stats: Arc<Mutex<ErrorRecoveryStats>>,
    error_patterns: Arc<Mutex<HashMap<String, ErrorPattern>>>,
}

impl ErrorRecoveryManager {
    /// Create a new error recovery manager
    pub fn new(config: ErrorRecoveryConfig) -> Self {
        Self {
            config,
            stats: Arc::new(Mutex::new(ErrorRecoveryStats::default())),
            error_patterns: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Create with default configuration
    pub fn default() -> Self {
        Self::new(ErrorRecoveryConfig::default())
    }

    /// Execute an operation with automatic error recovery
    pub async fn execute_with_recovery<T, F, Fut>(
        &self,
        operation: F,
        component: &str,
        operation_name: &str,
    ) -> RecoveryResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, NavigationError>>,
    {
        let mut retry_count = 0;
        let mut last_error = None;

        loop {
            match operation().await {
                Ok(result) => {
                    if retry_count > 0 {
                        self.record_successful_recovery(component, operation_name, retry_count);
                        info!("Operation '{}' in '{}' succeeded after {} retries", operation_name, component, retry_count);
                    }
                    return RecoveryResult::Success(result);
                }
                Err(error) => {
                    last_error = Some(error.clone());
                    self.record_error(&error, component, operation_name);

                    let context = error.to_context(component, operation_name);
                    
                    // Log the error
                    if self.config.log_all_errors {
                        self.log_error(&context, retry_count);
                    }

                    // Check if we should attempt recovery
                    match self.should_attempt_recovery(&error, retry_count) {
                        Some(strategy) => {
                            match self.attempt_recovery(&error, &strategy, retry_count).await {
                                RecoveryAction::Retry => {
                                    retry_count += 1;
                                    continue;
                                }
                                RecoveryAction::Degrade(fallback_result) => {
                                    self.record_degraded_operation(component, operation_name);
                                    return RecoveryResult::Degraded(fallback_result, context.user_message);
                                }
                                RecoveryAction::Fail => {
                                    self.record_failed_recovery(component, operation_name);
                                    return RecoveryResult::Failed(error);
                                }
                                RecoveryAction::ManualIntervention(instructions) => {
                                    return RecoveryResult::ManualInterventionRequired(error, instructions);
                                }
                            }
                        }
                        None => {
                            self.record_failed_recovery(component, operation_name);
                            return RecoveryResult::Failed(error);
                        }
                    }
                }
            }
        }
    }

    /// Execute an operation with fallback value on error
    pub async fn execute_with_fallback<T, F, Fut>(
        &self,
        operation: F,
        fallback: T,
        component: &str,
        operation_name: &str,
    ) -> RecoveryResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, NavigationError>>,
        T: Clone,
    {
        match self.execute_with_recovery(operation, component, operation_name).await {
            RecoveryResult::Success(result) => RecoveryResult::Success(result),
            RecoveryResult::Degraded(result, message) => RecoveryResult::Degraded(result, message),
            RecoveryResult::Failed(error) => {
                if self.config.enable_graceful_degradation && error.can_continue() {
                    warn!("Using fallback value for '{}' in '{}' due to error: {}", operation_name, component, error.user_message());
                    RecoveryResult::Degraded(fallback, "Using fallback data due to error".to_string())
                } else {
                    RecoveryResult::Failed(error)
                }
            }
            RecoveryResult::ManualInterventionRequired(error, instructions) => {
                RecoveryResult::ManualInterventionRequired(error, instructions)
            }
        }
    }

    /// Check if recovery should be attempted for this error
    fn should_attempt_recovery(&self, error: &NavigationError, retry_count: u32) -> Option<NavigationRecoveryStrategy> {
        if retry_count >= self.config.max_retry_attempts {
            return None;
        }

        match error.severity() {
            NavigationErrorSeverity::Critical => None, // No recovery for critical errors
            _ => Some(error.recovery_strategy()),
        }
    }

    /// Attempt recovery based on the strategy
    async fn attempt_recovery<T>(
        &self,
        error: &NavigationError,
        strategy: &NavigationRecoveryStrategy,
        retry_count: u32,
    ) -> RecoveryAction<T> {
        match strategy {
            NavigationRecoveryStrategy::Retry { max_attempts, backoff_ms } => {
                if retry_count < *max_attempts {
                    let backoff = self.calculate_backoff(*backoff_ms, retry_count);
                    debug!("Retrying operation after {}ms (attempt {})", backoff, retry_count + 1);
                    sleep(Duration::from_millis(backoff)).await;
                    RecoveryAction::Retry
                } else {
                    RecoveryAction::Fail
                }
            }
            NavigationRecoveryStrategy::Fallback { fallback_type } => {
                info!("Using fallback strategy: {}", fallback_type);
                // Note: Actual fallback implementation would depend on the specific operation
                // This is a placeholder that indicates degraded functionality
                RecoveryAction::Fail // Would be replaced with actual fallback logic
            }
            NavigationRecoveryStrategy::Degrade { limited_functionality } => {
                warn!("Degrading functionality: {}", limited_functionality);
                // Note: Actual degradation would return a limited version of the result
                RecoveryAction::Fail // Would be replaced with actual degraded result
            }
            NavigationRecoveryStrategy::Reset { preserve_cache: _ } => {
                info!("Resetting component state");
                // Note: Actual reset logic would be implemented here
                RecoveryAction::Retry
            }
            NavigationRecoveryStrategy::Skip { continue_operation } => {
                if *continue_operation {
                    info!("Skipping failed operation and continuing");
                    RecoveryAction::Fail // Would return a "skipped" result in practice
                } else {
                    RecoveryAction::Fail
                }
            }
            NavigationRecoveryStrategy::Manual { instructions } => {
                RecoveryAction::ManualIntervention(instructions.clone())
            }
            NavigationRecoveryStrategy::None => RecoveryAction::Fail,
        }
    }

    /// Calculate exponential backoff with jitter
    fn calculate_backoff(&self, base_backoff_ms: u64, retry_count: u32) -> u64 {
        let exponential_backoff = base_backoff_ms * (2_u64.pow(retry_count));
        let capped_backoff = exponential_backoff.min(self.config.max_backoff_ms);
        
        // Add jitter to prevent thundering herd
        let jitter = (capped_backoff as f64 * 0.1 * rand::random::<f64>()) as u64;
        capped_backoff + jitter
    }

    /// Record error occurrence and update patterns
    fn record_error(&self, error: &NavigationError, component: &str, operation: &str) {
        let mut stats = self.stats.lock().unwrap();
        stats.total_errors += 1;
        stats.last_error_time = Some(Utc::now());

        if self.config.track_error_patterns {
            let mut patterns = self.error_patterns.lock().unwrap();
            let error_key = format!("{}:{}:{:?}", component, operation, std::mem::discriminant(error));
            
            let pattern = patterns.entry(error_key).or_insert_with(|| ErrorPattern {
                error_type: format!("{:?}", std::mem::discriminant(error)),
                component: component.to_string(),
                operation: operation.to_string(),
                count: 0,
                first_occurrence: Utc::now(),
                last_occurrence: Utc::now(),
                recovery_success_rate: 0.0,
            });
            
            pattern.count += 1;
            pattern.last_occurrence = Utc::now();
        }
    }

    /// Record successful recovery
    fn record_successful_recovery(&self, component: &str, operation: &str, retry_count: u32) {
        let mut stats = self.stats.lock().unwrap();
        stats.successful_recoveries += 1;
        stats.retry_attempts += retry_count as u64;

        if self.config.track_error_patterns {
            self.update_recovery_success_rate(component, operation, true);
        }
    }

    /// Record failed recovery
    fn record_failed_recovery(&self, component: &str, operation: &str) {
        let mut stats = self.stats.lock().unwrap();
        stats.failed_recoveries += 1;

        if self.config.track_error_patterns {
            self.update_recovery_success_rate(component, operation, false);
        }
    }

    /// Record degraded operation
    fn record_degraded_operation(&self, _component: &str, _operation: &str) {
        let mut stats = self.stats.lock().unwrap();
        stats.degraded_operations += 1;
    }

    /// Update recovery success rate for error patterns
    fn update_recovery_success_rate(&self, component: &str, operation: &str, success: bool) {
        let mut patterns = self.error_patterns.lock().unwrap();
        for pattern in patterns.values_mut() {
            if pattern.component == component && pattern.operation == operation {
                let total_attempts = if success { 
                    pattern.recovery_success_rate * pattern.count as f64 + 1.0 
                } else { 
                    pattern.recovery_success_rate * pattern.count as f64 
                };
                pattern.recovery_success_rate = total_attempts / pattern.count as f64;
            }
        }
    }

    /// Log error with appropriate level based on severity
    fn log_error(&self, context: &NavigationErrorContext, retry_count: u32) {
        let retry_info = if retry_count > 0 {
            format!(" (retry {})", retry_count)
        } else {
            String::new()
        };

        match context.severity {
            NavigationErrorSeverity::Critical => {
                error!("CRITICAL ERROR in {}.{}{}: {} - {}", 
                    context.component, context.operation, retry_info, 
                    context.user_message, context.technical_details);
            }
            NavigationErrorSeverity::High => {
                error!("HIGH SEVERITY in {}.{}{}: {}", 
                    context.component, context.operation, retry_info, context.user_message);
            }
            NavigationErrorSeverity::Medium => {
                warn!("MEDIUM SEVERITY in {}.{}{}: {}", 
                    context.component, context.operation, retry_info, context.user_message);
            }
            NavigationErrorSeverity::Low => {
                info!("LOW SEVERITY in {}.{}{}: {}", 
                    context.component, context.operation, retry_info, context.user_message);
            }
        }
    }

    /// Get current error recovery statistics
    pub fn get_stats(&self) -> ErrorRecoveryStats {
        self.stats.lock().unwrap().clone()
    }

    /// Get error patterns for analysis
    pub fn get_error_patterns(&self) -> HashMap<String, ErrorPattern> {
        self.error_patterns.lock().unwrap().clone()
    }

    /// Reset statistics and patterns
    pub fn reset_stats(&self) {
        let mut stats = self.stats.lock().unwrap();
        *stats = ErrorRecoveryStats::default();
        
        let mut patterns = self.error_patterns.lock().unwrap();
        patterns.clear();
    }
}

/// Internal enum for recovery actions
enum RecoveryAction<T> {
    Retry,
    Degrade(T),
    Fail,
    ManualIntervention(String),
}

// Add rand dependency for jitter calculation
use rand;

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;

    #[test]
    async fn test_successful_operation() {
        let manager = ErrorRecoveryManager::default();
        
        let result = manager.execute_with_recovery(
            || async { Ok::<i32, NavigationError>(42) },
            "test_component",
            "test_operation"
        ).await;
        
        match result {
            RecoveryResult::Success(value) => assert_eq!(value, 42),
            _ => panic!("Expected success"),
        }
    }

    #[test]
    async fn test_retry_mechanism() {
        let manager = ErrorRecoveryManager::default();
        let mut attempt_count = 0;
        
        let result = manager.execute_with_recovery(
            || {
                attempt_count += 1;
                async move {
                    if attempt_count < 3 {
                        Err(NavigationError::analysis_timeout(1000, "test".to_string()))
                    } else {
                        Ok(42)
                    }
                }
            },
            "test_component",
            "test_operation"
        ).await;
        
        match result {
            RecoveryResult::Success(value) => {
                assert_eq!(value, 42);
                assert_eq!(attempt_count, 3);
            }
            _ => panic!("Expected success after retries"),
        }
    }

    #[test]
    async fn test_fallback_mechanism() {
        let manager = ErrorRecoveryManager::default();
        
        let result = manager.execute_with_fallback(
            || async { Err::<i32, NavigationError>(NavigationError::file_not_found(std::path::PathBuf::from("test.txt"))) },
            99,
            "test_component",
            "test_operation"
        ).await;
        
        match result {
            RecoveryResult::Degraded(value, _) => assert_eq!(value, 99),
            _ => panic!("Expected degraded result with fallback value"),
        }
    }
}