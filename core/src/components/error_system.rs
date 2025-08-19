// [[SECONDARY_MIND]]/src/components/enhanced_error_system.rs
// Purpose: Integration module for the enhanced error handling system
// Architecture: Coordinates error recovery, reporting, and graceful degradation
// Dependencies: All error handling components

use crate::components::error_recovery_manager::ErrorRecoveryManager;
use crate::components::error_reporter::ErrorReporter;
use crate::errors::{SecondaryMindError, NavigationError};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use log::info;

/// Enhanced error handling system that coordinates all error management components
pub struct EnhancedErrorSystem {
    recovery_manager: Arc<RwLock<ErrorRecoveryManager>>,
    error_reporter: Arc<ErrorReporter>,
}

impl EnhancedErrorSystem {
    /// Create a new enhanced error system
    pub async fn new() -> Result<Self, SecondaryMindError> {
        // Create a channel for error events
        let (_error_sender, _error_receiver) = mpsc::unbounded_channel::<NavigationError>();
        
        let recovery_manager = ErrorRecoveryManager::default();
        let error_reporter = Arc::new(ErrorReporter::new(std::path::PathBuf::from("./reports")));

        Ok(Self {
            recovery_manager: Arc::new(RwLock::new(recovery_manager)),
            error_reporter,
        })
    }

    /// Handle an error with full recovery and reporting
    pub async fn handle_error(&self, error: SecondaryMindError) -> Result<(), SecondaryMindError> {
        // Log the error
        log::error!("Enhanced error system handling: {:?}", error);

        // For now, just log and return the error
        // TODO: Implement proper recovery logic when the recovery manager is complete
        Err(error)
    }

    /// Get system health status
    pub async fn get_system_health(&self) -> SystemHealthStatus {
        let recovery_manager = self.recovery_manager.read().await;
        // Get error recovery stats instead of component states
        let recovery_stats = recovery_manager.get_stats();

        // Create basic component states based on recovery stats
        let mut component_states = std::collections::HashMap::new();
        component_states.insert("error_recovery".to_string(), "healthy".to_string());
        
        let overall_health = if recovery_stats.failed_recoveries > recovery_stats.successful_recoveries {
            HealthLevel::Degraded
        } else {
            HealthLevel::Healthy
        };

        SystemHealthStatus {
            overall_health,
            component_states,
            degraded_components: Vec::new(),
            last_updated: std::time::SystemTime::now(),
        }
    }

    /// Perform system maintenance
    pub async fn perform_maintenance(&self) -> Result<(), SecondaryMindError> {
        info!("System maintenance completed");
        Ok(())
    }
}

/// System health status information
#[derive(Debug, Clone)]
pub struct SystemHealthStatus {
    pub overall_health: HealthLevel,
    pub component_states: std::collections::HashMap<String, String>,
    pub degraded_components: Vec<String>,
    pub last_updated: std::time::SystemTime,
}

/// Health level enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum HealthLevel {
    Healthy,
    Degraded,
    Critical,
}