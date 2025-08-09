// [[SECONDARY_MIND]]/src/components/enhanced_error_system.rs
// Purpose: Integration module for the enhanced error handling system
// Architecture: Coordinates error recovery, reporting, and graceful degradation
// Dependencies: All error handling components

use crate::components::error_recovery_manager::{ErrorRecoveryManager, RecoveryHandlerType};
use crate::components::error_reporter::ErrorReporter;
use crate::errors::{SecondaryMindError, ErrorContext};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use log::info;

/// Enhanced error handling system that coordinates all error management components
pub struct EnhancedErrorSystem {
    recovery_manager: Arc<RwLock<ErrorRecoveryManager>>,
    error_reporter: Arc<RwLock<ErrorReporter>>,
}

impl EnhancedErrorSystem {
    /// Create a new enhanced error system
    pub async fn new(reports_dir: PathBuf) -> Self {
        let mut recovery_manager = ErrorRecoveryManager::new();
        
        // Register recovery handlers
        recovery_manager.register_handler(
            "search_index".to_string(),
            RecoveryHandlerType::SearchIndex,
        );
        recovery_manager.register_handler(
            "cache".to_string(),
            RecoveryHandlerType::Cache,
        );
        recovery_manager.register_handler(
            "file_watcher".to_string(),
            RecoveryHandlerType::FileWatcher,
        );
        recovery_manager.register_handler(
            "ai_synthesis".to_string(),
            RecoveryHandlerType::AISynthesis,
        );
        recovery_manager.register_handler(
            "memory".to_string(),
            RecoveryHandlerType::Memory,
        );
        recovery_manager.register_handler(
            "session".to_string(),
            RecoveryHandlerType::Session,
        );

        let error_reporter = ErrorReporter::new(reports_dir);

        info!("Enhanced error handling system initialized");

        Self {
            recovery_manager: Arc::new(RwLock::new(recovery_manager)),
            error_reporter: Arc::new(RwLock::new(error_reporter)),
        }
    }

    /// Handle an error with full recovery and reporting
    pub async fn handle_error(&self, error: SecondaryMindError, component: &str, operation: &str) -> Result<(), SecondaryMindError> {
        // Create error context
        let context = error.to_context(component, operation);
        
        // Attempt recovery
        let recovery_result = {
            let recovery_manager = self.recovery_manager.read().await;
            recovery_manager.handle_error(context.clone()).await
        };

        // Report the error
        let recovery_successful = matches!(
            recovery_result,
            crate::components::error_recovery_manager::RecoveryResult::Success |
            crate::components::error_recovery_manager::RecoveryResult::PartialSuccess { .. }
        );

        {
            let mut reporter = self.error_reporter.write().await;
            if let Err(report_error) = reporter.report_error(&context, recovery_successful).await {
                log::error!("Failed to report error: {}", report_error);
            }
        }

        // Return result based on recovery outcome
        match recovery_result {
            crate::components::error_recovery_manager::RecoveryResult::Success => Ok(()),
            crate::components::error_recovery_manager::RecoveryResult::PartialSuccess { degraded_features } => {
                info!("System running with degraded features: {:?}", degraded_features);
                Ok(())
            },
            crate::components::error_recovery_manager::RecoveryResult::Failed { reason } => {
                Err(SecondaryMindError::RecoveryFailed {
                    component: component.to_string(),
                    reason,
                })
            },
            crate::components::error_recovery_manager::RecoveryResult::RequiresManualIntervention { instructions } => {
                Err(SecondaryMindError::RecoveryFailed {
                    component: component.to_string(),
                    reason: format!("Manual intervention required: {}", instructions),
                })
            },
        }
    }

    /// Get system health status
    pub async fn get_system_health(&self) -> SystemHealthStatus {
        let recovery_manager = self.recovery_manager.read().await;
        let component_health = recovery_manager.get_component_health().await;
        let is_healthy = recovery_manager.is_system_healthy().await;
        let degraded_components = recovery_manager.get_degraded_components().await;
        
        let error_reporter = self.error_reporter.read().await;
        let statistics = error_reporter.get_statistics().clone();

        SystemHealthStatus {
            is_healthy,
            component_health,
            degraded_components,
            error_statistics: statistics,
        }
    }

    /// Get recent error reports
    pub async fn get_recent_errors(&self, limit: usize) -> Result<Vec<crate::components::error_reporter::ErrorReport>, std::io::Error> {
        let reporter = self.error_reporter.read().await;
        reporter.get_recent_reports(limit).await
    }

    /// Clear error history and reset system health
    pub async fn reset_system(&self) -> Result<(), std::io::Error> {
        {
            let recovery_manager = self.recovery_manager.read().await;
            recovery_manager.clear_error_history().await;
        }

        {
            let mut reporter = self.error_reporter.write().await;
            reporter.clear_reports().await?;
        }

        info!("Error handling system reset completed");
        Ok(())
    }
}

/// System health status information
#[derive(Debug, Clone)]
pub struct SystemHealthStatus {
    pub is_healthy: bool,
    pub component_health: std::collections::HashMap<String, crate::components::error_recovery_manager::ComponentHealth>,
    pub degraded_components: Vec<(String, String)>,
    pub error_statistics: crate::components::error_reporter::ErrorStatistics,
}

impl Default for EnhancedErrorSystem {
    fn default() -> Self {
        // This is a placeholder - in practice, you'd need to provide a reports directory
        // This should be called with `new()` instead
        panic!("EnhancedErrorSystem must be created with new() and a reports directory")
    }
}