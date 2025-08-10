// [[SECONDARY_MIND]]/src/components/operation_manager.rs
// Purpose: Operation manager for tracking and cancelling long-running operations.
// Architecture: Centralized operation tracking with cancellation tokens and progress reporting.
// Dependencies: tokio, serde, chrono.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc, oneshot};
use tokio::time::{Instant, Duration};
use tokio_util::sync::CancellationToken;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use log::{info, warn, debug};

/// Operation manager for tracking and controlling long-running operations
pub struct OperationManager {
    /// Active operations
    operations: Arc<RwLock<HashMap<String, OperationInfo>>>,
    /// Progress event sender
    progress_sender: mpsc::UnboundedSender<ProgressEvent>,
    /// Operation completion sender
    completion_sender: mpsc::UnboundedSender<CompletionEvent>,
}

/// Information about an active operation
#[derive(Debug, Clone)]
pub struct OperationInfo {
    pub id: String,
    pub operation_type: OperationType,
    pub status: OperationStatus,
    pub progress: OperationProgress,
    pub cancellation_token: CancellationToken,
    pub start_time: Instant,
    pub last_update: Instant,
    pub metadata: OperationMetadata,
}

/// Type of operation being performed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    ProjectAnalysis,
    FileAnalysis,
    Search,
    AIQuery,
    CacheOperation,
    IndexRebuild,
    FileWatch,
    Custom(String),
}

/// Current status of an operation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OperationStatus {
    Starting,
    Running,
    Paused,
    Completing,
    Completed,
    Cancelled,
    Failed,
}

/// Progress information for an operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationProgress {
    pub current: u64,
    pub total: u64,
    pub stage: Option<String>,
    pub estimated_time_remaining: Option<Duration>,
    pub throughput: Option<f64>, // items per second
}

/// Metadata about an operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationMetadata {
    pub title: String,
    pub description: Option<String>,
    pub component: String,
    pub user_initiated: bool,
    pub priority: OperationPriority,
    pub tags: Vec<String>,
}

/// Priority level for operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum OperationPriority {
    Low,
    Normal,
    High,
    Critical,
}

/// Progress event for UI updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub operation_id: String,
    pub progress: OperationProgress,
    pub status: OperationStatus,
    pub timestamp: DateTime<Utc>,
}

/// Operation completion event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionEvent {
    pub operation_id: String,
    pub status: OperationStatus,
    pub duration: Duration,
    pub result: CompletionResult,
    pub timestamp: DateTime<Utc>,
}

/// Result of operation completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompletionResult {
    Success { message: Option<String> },
    Cancelled { reason: Option<String> },
    Failed { error: String, recoverable: bool },
}

/// Handle for controlling an operation
pub struct OperationHandle {
    pub id: String,
    cancellation_token: CancellationToken,
    progress_sender: mpsc::UnboundedSender<ProgressEvent>,
    completion_sender: mpsc::UnboundedSender<CompletionEvent>,
    start_time: Instant,
}

impl OperationManager {
    /// Create a new operation manager
    pub fn new(
        progress_sender: mpsc::UnboundedSender<ProgressEvent>,
        completion_sender: mpsc::UnboundedSender<CompletionEvent>,
    ) -> Self {
        Self {
            operations: Arc::new(RwLock::new(HashMap::new())),
            progress_sender,
            completion_sender,
        }
    }

    /// Start a new operation and return a handle for controlling it
    pub async fn start_operation(
        &self,
        operation_type: OperationType,
        metadata: OperationMetadata,
    ) -> OperationHandle {
        let id = self.generate_operation_id(&operation_type).await;
        let cancellation_token = CancellationToken::new();
        let start_time = Instant::now();

        let operation_info = OperationInfo {
            id: id.clone(),
            operation_type,
            status: OperationStatus::Starting,
            progress: OperationProgress {
                current: 0,
                total: 100,
                stage: None,
                estimated_time_remaining: None,
                throughput: None,
            },
            cancellation_token: cancellation_token.clone(),
            start_time,
            last_update: start_time,
            metadata,
        };

        // Register operation
        let title = operation_info.metadata.title.clone();
        {
            let mut operations = self.operations.write().await;
            operations.insert(id.clone(), operation_info);
        }

        info!("Started operation: {} ({})", id, title);

        OperationHandle {
            id,
            cancellation_token,
            progress_sender: self.progress_sender.clone(),
            completion_sender: self.completion_sender.clone(),
            start_time,
        }
    }

    /// Update operation progress
    pub async fn update_progress(
        &self,
        operation_id: &str,
        progress: OperationProgress,
        status: Option<OperationStatus>,
    ) -> Result<(), String> {
        let mut operations = self.operations.write().await;
        
        if let Some(operation) = operations.get_mut(operation_id) {
            operation.progress = progress.clone();
            operation.last_update = Instant::now();
            
            if let Some(new_status) = status {
                operation.status = new_status.clone();
            }

            // Send progress event
            let event = ProgressEvent {
                operation_id: operation_id.to_string(),
                progress,
                status: operation.status.clone(),
                timestamp: Utc::now(),
            };

            if let Err(e) = self.progress_sender.send(event) {
                warn!("Failed to send progress event: {}", e);
            }

            Ok(())
        } else {
            Err(format!("Operation {} not found", operation_id))
        }
    }

    /// Complete an operation
    pub async fn complete_operation(
        &self,
        operation_id: &str,
        result: CompletionResult,
    ) -> Result<(), String> {
        let operation_info = {
            let mut operations = self.operations.write().await;
            operations.remove(operation_id)
        };

        if let Some(operation) = operation_info {
            let duration = operation.start_time.elapsed();
            let status = match &result {
                CompletionResult::Success { .. } => OperationStatus::Completed,
                CompletionResult::Cancelled { .. } => OperationStatus::Cancelled,
                CompletionResult::Failed { .. } => OperationStatus::Failed,
            };

            let event = CompletionEvent {
                operation_id: operation_id.to_string(),
                status,
                duration,
                result,
                timestamp: Utc::now(),
            };

            if let Err(e) = self.completion_sender.send(event) {
                warn!("Failed to send completion event: {}", e);
            }

            info!("Completed operation: {} in {:?}", operation_id, duration);
            Ok(())
        } else {
            Err(format!("Operation {} not found", operation_id))
        }
    }

    /// Cancel an operation
    pub async fn cancel_operation(&self, operation_id: &str) -> Result<(), String> {
        let operations = self.operations.read().await;
        
        if let Some(operation) = operations.get(operation_id) {
            operation.cancellation_token.cancel();
            info!("Cancelled operation: {}", operation_id);
            Ok(())
        } else {
            Err(format!("Operation {} not found", operation_id))
        }
    }

    /// Cancel all operations
    pub async fn cancel_all_operations(&self) -> u32 {
        let operations = self.operations.read().await;
        let mut cancelled_count = 0;

        for operation in operations.values() {
            operation.cancellation_token.cancel();
            cancelled_count += 1;
        }

        if cancelled_count > 0 {
            info!("Cancelled {} operations", cancelled_count);
        }

        cancelled_count
    }

    /// Get all active operations
    pub async fn get_active_operations(&self) -> Vec<OperationInfo> {
        let operations = self.operations.read().await;
        operations.values().cloned().collect()
    }

    /// Get operation by ID
    pub async fn get_operation(&self, operation_id: &str) -> Option<OperationInfo> {
        let operations = self.operations.read().await;
        operations.get(operation_id).cloned()
    }

    /// Clean up stale operations (operations that haven't updated in a while)
    pub async fn cleanup_stale_operations(&self, max_age: Duration) -> u32 {
        let mut operations = self.operations.write().await;
        let cutoff = Instant::now() - max_age;
        let initial_count = operations.len();

        operations.retain(|_, operation| {
            if operation.last_update < cutoff && operation.status == OperationStatus::Running {
                warn!("Cleaning up stale operation: {}", operation.id);
                operation.cancellation_token.cancel();
                false
            } else {
                true
            }
        });

        let cleaned_count = initial_count - operations.len();
        if cleaned_count > 0 {
            info!("Cleaned up {} stale operations", cleaned_count);
        }

        cleaned_count as u32
    }

    /// Generate unique operation ID
    async fn generate_operation_id(&self, operation_type: &OperationType) -> String {
        let type_prefix = match operation_type {
            OperationType::ProjectAnalysis => "PA",
            OperationType::FileAnalysis => "FA",
            OperationType::Search => "SR",
            OperationType::AIQuery => "AI",
            OperationType::CacheOperation => "CA",
            OperationType::IndexRebuild => "IR",
            OperationType::FileWatch => "FW",
            OperationType::Custom(name) => &name[..2.min(name.len())],
        };

        format!("{}_{}", type_prefix, Utc::now().timestamp_millis())
    }
}

impl OperationHandle {
    /// Update progress for this operation
    pub async fn update_progress(
        &self,
        current: u64,
        total: u64,
        stage: Option<String>,
    ) -> Result<(), String> {
        let elapsed = self.start_time.elapsed();
        let throughput = if elapsed.as_secs() > 0 {
            Some(current as f64 / elapsed.as_secs_f64())
        } else {
            None
        };

        let estimated_time_remaining = if current > 0 && throughput.is_some() {
            let remaining_items = total.saturating_sub(current);
            let seconds_remaining = remaining_items as f64 / throughput.unwrap();
            Some(Duration::from_secs_f64(seconds_remaining))
        } else {
            None
        };

        let progress = OperationProgress {
            current,
            total,
            stage,
            estimated_time_remaining,
            throughput,
        };

        let event = ProgressEvent {
            operation_id: self.id.clone(),
            progress,
            status: OperationStatus::Running,
            timestamp: Utc::now(),
        };

        self.progress_sender.send(event)
            .map_err(|e| format!("Failed to send progress update: {}", e))
    }

    /// Mark operation as completed successfully
    pub async fn complete_success(&self, message: Option<String>) -> Result<(), String> {
        let duration = self.start_time.elapsed();
        let event = CompletionEvent {
            operation_id: self.id.clone(),
            status: OperationStatus::Completed,
            duration,
            result: CompletionResult::Success { message },
            timestamp: Utc::now(),
        };

        self.completion_sender.send(event)
            .map_err(|e| format!("Failed to send completion event: {}", e))
    }

    /// Mark operation as failed
    pub async fn complete_failure(&self, error: String, recoverable: bool) -> Result<(), String> {
        let duration = self.start_time.elapsed();
        let event = CompletionEvent {
            operation_id: self.id.clone(),
            status: OperationStatus::Failed,
            duration,
            result: CompletionResult::Failed { error, recoverable },
            timestamp: Utc::now(),
        };

        self.completion_sender.send(event)
            .map_err(|e| format!("Failed to send completion event: {}", e))
    }

    /// Cancel this operation
    pub fn cancel(&self, reason: Option<String>) {
        self.cancellation_token.cancel();
        
        let duration = self.start_time.elapsed();
        let event = CompletionEvent {
            operation_id: self.id.clone(),
            status: OperationStatus::Cancelled,
            duration,
            result: CompletionResult::Cancelled { reason },
            timestamp: Utc::now(),
        };

        if let Err(e) = self.completion_sender.send(event) {
            warn!("Failed to send cancellation event: {}", e);
        }
    }

    /// Check if operation is cancelled
    pub fn is_cancelled(&self) -> bool {
        self.cancellation_token.is_cancelled()
    }

    /// Get cancellation token for async operations
    pub fn cancellation_token(&self) -> CancellationToken {
        self.cancellation_token.clone()
    }
}

impl Default for OperationProgress {
    fn default() -> Self {
        Self {
            current: 0,
            total: 100,
            stage: None,
            estimated_time_remaining: None,
            throughput: None,
        }
    }
}

impl OperationProgress {
    /// Calculate percentage completion
    pub fn percentage(&self) -> f64 {
        if self.total == 0 {
            0.0
        } else {
            (self.current as f64 / self.total as f64) * 100.0
        }
    }

    /// Check if operation is complete
    pub fn is_complete(&self) -> bool {
        self.current >= self.total
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[tokio::test]
    async fn test_operation_manager_creation() {
        let (progress_sender, _progress_receiver) = mpsc::unbounded_channel();
        let (completion_sender, _completion_receiver) = mpsc::unbounded_channel();
        
        let manager = OperationManager::new(progress_sender, completion_sender);
        let operations = manager.get_active_operations().await;
        assert!(operations.is_empty());
    }

    #[tokio::test]
    async fn test_operation_lifecycle() {
        let (progress_sender, mut progress_receiver) = mpsc::unbounded_channel();
        let (completion_sender, mut completion_receiver) = mpsc::unbounded_channel();
        
        let manager = OperationManager::new(progress_sender, completion_sender);
        
        let metadata = OperationMetadata {
            title: "Test Operation".to_string(),
            description: Some("Testing operation lifecycle".to_string()),
            component: "test".to_string(),
            user_initiated: true,
            priority: OperationPriority::Normal,
            tags: vec!["test".to_string()],
        };
        
        let handle = manager.start_operation(OperationType::Custom("test".to_string()), metadata).await;
        
        // Update progress
        handle.update_progress(50, 100, Some("Halfway done".to_string())).await.unwrap();
        
        // Check progress event
        let progress_event = progress_receiver.recv().await.unwrap();
        assert_eq!(progress_event.operation_id, handle.id);
        assert_eq!(progress_event.progress.current, 50);
        
        // Complete operation
        handle.complete_success(Some("Test completed".to_string())).await.unwrap();
        
        // Check completion event
        let completion_event = completion_receiver.recv().await.unwrap();
        assert_eq!(completion_event.operation_id, handle.id);
        assert_eq!(completion_event.status, OperationStatus::Completed);
    }

    #[tokio::test]
    async fn test_operation_cancellation() {
        let (progress_sender, _progress_receiver) = mpsc::unbounded_channel();
        let (completion_sender, mut completion_receiver) = mpsc::unbounded_channel();
        
        let manager = OperationManager::new(progress_sender, completion_sender);
        
        let metadata = OperationMetadata {
            title: "Cancellable Operation".to_string(),
            description: None,
            component: "test".to_string(),
            user_initiated: true,
            priority: OperationPriority::Normal,
            tags: vec![],
        };
        
        let handle = manager.start_operation(OperationType::Custom("cancel_test".to_string()), metadata).await;
        
        // Cancel operation
        handle.cancel(Some("User requested cancellation".to_string()));
        
        // Check cancellation
        assert!(handle.is_cancelled());
        
        // Check completion event
        let completion_event = completion_receiver.recv().await.unwrap();
        assert_eq!(completion_event.status, OperationStatus::Cancelled);
    }

    #[test]
    fn test_operation_progress_calculations() {
        let progress = OperationProgress {
            current: 25,
            total: 100,
            stage: None,
            estimated_time_remaining: None,
            throughput: None,
        };
        
        assert_eq!(progress.percentage(), 25.0);
        assert!(!progress.is_complete());
        
        let complete_progress = OperationProgress {
            current: 100,
            total: 100,
            stage: None,
            estimated_time_remaining: None,
            throughput: None,
        };
        
        assert!(complete_progress.is_complete());
    }
}
