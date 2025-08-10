// [[SECONDARY_MIND]]/src/components/error_recovery_manager.rs
// Purpose: Error recovery manager with automatic recovery strategies and graceful degradation.
// Architecture: Centralized error recovery with component-specific strategies and fallback mechanisms.
// Dependencies: tokio, log, serde, chrono.

use crate::errors::{SecondaryMindError, ErrorContext, ErrorSeverity, RecoveryStrategy};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tokio::time::{sleep, Duration, Instant};
use serde::{Deserialize, Serialize};
use log::{error, warn, info, debug};
use chrono::{DateTime, Utc};

/// Error recovery manager that handles automatic recovery and graceful degradation
pub struct ErrorRecoveryManager {
    /// Component states for tracking degradation
    component_states: Arc<RwLock<HashMap<String, ComponentState>>>,
    /// Recovery attempt history
    recovery_history: Arc<RwLock<Vec<RecoveryAttempt>>>,
    /// Error event sender for UI notifications
    error_sender: mpsc::UnboundedSender<ErrorEvent>,
    /// Configuration for recovery behavior
    config: RecoveryConfig,
}

/// State of a component for tracking degradation and recovery
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentState {
    pub name: String,
    pub status: ComponentStatus,
    pub last_error: Option<ErrorContext>,
    pub degradation_level: DegradationLevel,
    pub recovery_attempts: u32,
    pub last_recovery_attempt: Option<DateTime<Utc>>,
    pub fallback_active: bool,
}

/// Component operational status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum ComponentStatus {
    /// Component is fully operational
    Healthy,
    /// Component is operational but with reduced functionality
    Degraded,
    /// Component is temporarily unavailable but recoverable
    Impaired,
    /// Component has failed and requires manual intervention
    Failed,
}

/// Level of functionality degradation
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum DegradationLevel {
    /// No degradation - full functionality
    None,
    /// Minor degradation - some features disabled
    Minor,
    /// Moderate degradation - significant features disabled
    Moderate,
    /// Severe degradation - minimal functionality only
    Severe,
    /// Complete degradation - component non-functional
    Complete,
}

/// Record of a recovery attempt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryAttempt {
    pub component: String,
    pub error: SecondaryMindError,
    pub strategy: RecoveryStrategy,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    pub duration_ms: u64,
    pub details: String,
}

/// Error event for UI notifications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEvent {
    pub context: ErrorContext,
    pub recovery_status: RecoveryStatus,
    pub user_action_required: bool,
}

/// Status of recovery operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryStatus {
    /// Recovery attempt in progress
    InProgress,
    /// Recovery successful
    Success,
    /// Recovery failed, will retry
    FailedRetrying,
    /// Recovery failed, manual intervention required
    FailedManual,
    /// Component degraded but operational
    Degraded,
}

/// Configuration for error recovery behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryConfig {
    /// Maximum recovery attempts per component per hour
    pub max_recovery_attempts_per_hour: u32,
    /// Minimum time between recovery attempts (seconds)
    pub min_recovery_interval_seconds: u64,
    /// Maximum time to wait for recovery (seconds)
    pub max_recovery_timeout_seconds: u64,
    /// Enable automatic degradation
    pub enable_auto_degradation: bool,
    /// Enable automatic recovery
    pub enable_auto_recovery: bool,
}

impl Default for RecoveryConfig {
    fn default() -> Self {
        Self {
            max_recovery_attempts_per_hour: 5,
            min_recovery_interval_seconds: 30,
            max_recovery_timeout_seconds: 300,
            enable_auto_degradation: true,
            enable_auto_recovery: true,
        }
    }
}

impl ErrorRecoveryManager {
    /// Create a new error recovery manager
    pub fn new(error_sender: mpsc::UnboundedSender<ErrorEvent>) -> Self {
        Self {
            component_states: Arc::new(RwLock::new(HashMap::new())),
            recovery_history: Arc::new(RwLock::new(Vec::new())),
            error_sender,
            config: RecoveryConfig::default(),
        }
    }

    /// Handle an error with automatic recovery
    pub async fn handle_error(&self, mut context: ErrorContext) -> Result<RecoveryStatus, SecondaryMindError> {
        let component = context.component.clone();
        
        // Update component state
        self.update_component_state(&component, &context).await;
        
        // Check if recovery should be attempted
        if !self.should_attempt_recovery(&component, &context).await {
            return self.handle_degradation(&component, &context).await;
        }

        // Attempt recovery based on strategy
        let recovery_status = match &context.recovery_strategy {
            RecoveryStrategy::Retry { max_attempts, backoff_ms } => {
                self.attempt_retry_recovery(&component, &context, *max_attempts, *backoff_ms).await
            },
            RecoveryStrategy::Fallback { alternative } => {
                self.attempt_fallback_recovery(&component, &context, alternative).await
            },
            RecoveryStrategy::Degrade { limited_mode } => {
                self.attempt_degradation_recovery(&component, &context, limited_mode).await
            },
            RecoveryStrategy::Reset { preserve_data } => {
                self.attempt_reset_recovery(&component, &context, *preserve_data).await
            },
            RecoveryStrategy::Manual { instructions } => {
                self.handle_manual_recovery(&component, &context, instructions).await
            },
            RecoveryStrategy::None => {
                self.handle_no_recovery(&component, &context).await
            },
        };

        // Record recovery attempt
        self.record_recovery_attempt(&component, &context, &recovery_status).await;

        // Send error event to UI
        let error_event = ErrorEvent {
            context,
            recovery_status: recovery_status.clone(),
            user_action_required: matches!(recovery_status, RecoveryStatus::FailedManual),
        };
        
        if let Err(e) = self.error_sender.send(error_event) {
            warn!("Failed to send error event to UI: {}", e);
        }

        Ok(recovery_status)
    }

    /// Check if recovery should be attempted for a component
    async fn should_attempt_recovery(&self, component: &str, context: &ErrorContext) -> bool {
        if !self.config.enable_auto_recovery {
            return false;
        }

        let states = self.component_states.read().await;
        if let Some(state) = states.get(component) {
            // Check recovery attempt limits
            if state.recovery_attempts >= self.config.max_recovery_attempts_per_hour {
                return false;
            }

            // Check minimum interval between attempts
            if let Some(last_attempt) = state.last_recovery_attempt {
                let elapsed = Utc::now().signed_duration_since(last_attempt);
                if elapsed.num_seconds() < self.config.min_recovery_interval_seconds as i64 {
                    return false;
                }
            }

            // Don't attempt recovery for already failed components
            if state.status == ComponentStatus::Failed {
                return false;
            }
        }

        // Don't attempt recovery for low severity errors that can be degraded
        if context.severity == ErrorSeverity::Low && self.config.enable_auto_degradation {
            return false;
        }

        true
    }

    /// Attempt retry-based recovery
    async fn attempt_retry_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
        max_attempts: u32,
        backoff_ms: u64,
    ) -> RecoveryStatus {
        info!("Attempting retry recovery for {} (max_attempts: {}, backoff: {}ms)", component, max_attempts, backoff_ms);

        for attempt in 1..=max_attempts {
            debug!("Retry attempt {} for {}", attempt, component);
            
            // Wait with exponential backoff
            let delay = backoff_ms * (2_u64.pow(attempt - 1));
            sleep(Duration::from_millis(delay)).await;

            // Simulate recovery attempt (in real implementation, this would call the actual recovery function)
            if self.simulate_recovery_attempt(component, context).await {
                info!("Retry recovery successful for {} after {} attempts", component, attempt);
                self.set_component_status(component, ComponentStatus::Healthy, DegradationLevel::None).await;
                return RecoveryStatus::Success;
            }
        }

        warn!("Retry recovery failed for {} after {} attempts", component, max_attempts);
        RecoveryStatus::FailedRetrying
    }

    /// Attempt fallback recovery
    async fn attempt_fallback_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
        alternative: &str,
    ) -> RecoveryStatus {
        info!("Attempting fallback recovery for {} using alternative: {}", component, alternative);

        // Simulate fallback activation
        if self.activate_fallback(component, alternative).await {
            info!("Fallback recovery successful for {}", component);
            self.set_component_status(component, ComponentStatus::Degraded, DegradationLevel::Minor).await;
            return RecoveryStatus::Degraded;
        }

        warn!("Fallback recovery failed for {}", component);
        RecoveryStatus::FailedRetrying
    }

    /// Attempt degradation recovery
    async fn attempt_degradation_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
        limited_mode: &str,
    ) -> RecoveryStatus {
        info!("Attempting degradation recovery for {} with limited mode: {}", component, limited_mode);

        let degradation_level = self.determine_degradation_level(context.severity);
        self.set_component_status(component, ComponentStatus::Degraded, degradation_level).await;

        info!("Component {} degraded to {:?} level", component, degradation_level);
        RecoveryStatus::Degraded
    }

    /// Attempt reset recovery
    async fn attempt_reset_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
        preserve_data: bool,
    ) -> RecoveryStatus {
        info!("Attempting reset recovery for {} (preserve_data: {})", component, preserve_data);

        // Simulate component reset
        if self.reset_component(component, preserve_data).await {
            info!("Reset recovery successful for {}", component);
            self.set_component_status(component, ComponentStatus::Healthy, DegradationLevel::None).await;
            return RecoveryStatus::Success;
        }

        warn!("Reset recovery failed for {}", component);
        RecoveryStatus::FailedManual
    }

    /// Handle manual recovery requirement
    async fn handle_manual_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
        instructions: &str,
    ) -> RecoveryStatus {
        warn!("Manual recovery required for {}: {}", component, instructions);
        self.set_component_status(component, ComponentStatus::Failed, DegradationLevel::Complete).await;
        RecoveryStatus::FailedManual
    }

    /// Handle no recovery option
    async fn handle_no_recovery(
        &self,
        component: &str,
        context: &ErrorContext,
    ) -> RecoveryStatus {
        warn!("No recovery available for {}", component);
        let degradation_level = self.determine_degradation_level(context.severity);
        self.set_component_status(component, ComponentStatus::Impaired, degradation_level).await;
        RecoveryStatus::Degraded
    }

    /// Handle degradation when recovery is not attempted
    async fn handle_degradation(
        &self,
        component: &str,
        context: &ErrorContext,
    ) -> Result<RecoveryStatus, SecondaryMindError> {
        if self.config.enable_auto_degradation {
            let degradation_level = self.determine_degradation_level(context.severity);
            self.set_component_status(component, ComponentStatus::Degraded, degradation_level).await;
            info!("Component {} automatically degraded to {:?} level", component, degradation_level);
            Ok(RecoveryStatus::Degraded)
        } else {
            self.set_component_status(component, ComponentStatus::Failed, DegradationLevel::Complete).await;
            Ok(RecoveryStatus::FailedManual)
        }
    }

    /// Update component state with error information
    async fn update_component_state(&self, component: &str, context: &ErrorContext) {
        let mut states = self.component_states.write().await;
        let state = states.entry(component.to_string()).or_insert_with(|| ComponentState {
            name: component.to_string(),
            status: ComponentStatus::Healthy,
            last_error: None,
            degradation_level: DegradationLevel::None,
            recovery_attempts: 0,
            last_recovery_attempt: None,
            fallback_active: false,
        });

        state.last_error = Some(context.clone());
        state.recovery_attempts += 1;
        state.last_recovery_attempt = Some(Utc::now());
    }

    /// Set component status and degradation level
    async fn set_component_status(&self, component: &str, status: ComponentStatus, degradation: DegradationLevel) {
        let mut states = self.component_states.write().await;
        if let Some(state) = states.get_mut(component) {
            state.status = status;
            state.degradation_level = degradation;
        }
    }

    /// Determine degradation level based on error severity
    fn determine_degradation_level(&self, severity: ErrorSeverity) -> DegradationLevel {
        match severity {
            ErrorSeverity::Low => DegradationLevel::Minor,
            ErrorSeverity::Medium => DegradationLevel::Moderate,
            ErrorSeverity::High => DegradationLevel::Severe,
            ErrorSeverity::Critical => DegradationLevel::Complete,
        }
    }

    /// Record a recovery attempt
    async fn record_recovery_attempt(&self, component: &str, context: &ErrorContext, status: &RecoveryStatus) {
        let mut history = self.recovery_history.write().await;
        let attempt = RecoveryAttempt {
            component: component.to_string(),
            error: context.error.clone(),
            strategy: context.recovery_strategy.clone(),
            timestamp: Utc::now(),
            success: matches!(status, RecoveryStatus::Success),
            duration_ms: 0, // Would be calculated in real implementation
            details: format!("Recovery status: {:?}", status),
        };
        history.push(attempt);

        // Keep only recent history (last 100 attempts)
        if history.len() > 100 {
            let excess = history.len() - 100;
            history.drain(0..excess);
        }
    }

    /// Get current component states
    pub async fn get_component_states(&self) -> HashMap<String, ComponentState> {
        self.component_states.read().await.clone()
    }

    /// Get recovery history
    pub async fn get_recovery_history(&self) -> Vec<RecoveryAttempt> {
        self.recovery_history.read().await.clone()
    }

    /// Simulate recovery attempt (placeholder for actual recovery logic)
    async fn simulate_recovery_attempt(&self, _component: &str, _context: &ErrorContext) -> bool {
        // In real implementation, this would call the actual recovery function
        // For now, simulate 70% success rate
        use rand::Rng;
        let mut rng = rand::thread_rng();
        rng.gen_bool(0.7)
    }

    /// Activate fallback mechanism (placeholder)
    async fn activate_fallback(&self, component: &str, _alternative: &str) -> bool {
        // In real implementation, this would activate the fallback mechanism
        let mut states = self.component_states.write().await;
        if let Some(state) = states.get_mut(component) {
            state.fallback_active = true;
        }
        true
    }

    /// Reset component (placeholder)
    async fn reset_component(&self, _component: &str, _preserve_data: bool) -> bool {
        // In real implementation, this would reset the component
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[tokio::test]
    async fn test_error_recovery_manager_creation() {
        let (sender, _receiver) = mpsc::unbounded_channel();
        let manager = ErrorRecoveryManager::new(sender);
        
        let states = manager.get_component_states().await;
        assert!(states.is_empty());
    }

    #[tokio::test]
    async fn test_component_state_update() {
        let (sender, _receiver) = mpsc::unbounded_channel();
        let manager = ErrorRecoveryManager::new(sender);
        
        let error = SecondaryMindError::CacheError {
            operation: "read".to_string(),
            key: "test".to_string(),
            reason: "timeout".to_string(),
        };
        let context = error.to_context("cache", "read_operation");
        
        manager.update_component_state("cache", &context).await;
        
        let states = manager.get_component_states().await;
        assert!(states.contains_key("cache"));
        assert_eq!(states["cache"].recovery_attempts, 1);
    }

    #[tokio::test]
    async fn test_degradation_level_determination() {
        let (sender, _receiver) = mpsc::unbounded_channel();
        let manager = ErrorRecoveryManager::new(sender);
        
        assert_eq!(manager.determine_degradation_level(ErrorSeverity::Low), DegradationLevel::Minor);
        assert_eq!(manager.determine_degradation_level(ErrorSeverity::Medium), DegradationLevel::Moderate);
        assert_eq!(manager.determine_degradation_level(ErrorSeverity::High), DegradationLevel::Severe);
        assert_eq!(manager.determine_degradation_level(ErrorSeverity::Critical), DegradationLevel::Complete);
    }
}
