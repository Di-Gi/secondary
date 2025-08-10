// [[SECONDARY_MIND]]/src/components/error_handling_tests.rs
// Purpose: Tests for the enhanced error handling system
// Architecture: Unit and integration tests for error recovery and reporting

#[cfg(test)]
mod tests {
    use super::super::enhanced_error_system::EnhancedErrorSystem;
    use crate::errors::SecondaryMindError;
    use tempfile::TempDir;
    use tokio;

    #[tokio::test]
    async fn test_error_system_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        let health = error_system.get_system_health().await;
        
        assert!(health.is_healthy);
        assert_eq!(health.degraded_components.len(), 0);
    }

    #[tokio::test]
    async fn test_search_index_error_recovery() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        
        let error = SecondaryMindError::SearchIndexError {
            operation: "search".to_string(),
            reason: "Index corrupted".to_string(),
        };
        
        let result = error_system.handle_error(error, "search_index", "fuzzy_search").await;
        assert!(result.is_ok());
        
        let health = error_system.get_system_health().await;
        // Should be degraded but functional
        assert!(!health.degraded_components.is_empty());
    }

    #[tokio::test]
    async fn test_cache_error_recovery() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        
        let error = SecondaryMindError::CacheError {
            operation: "get".to_string(),
            key: "test_key".to_string(),
            reason: "Cache miss".to_string(),
        };
        
        let result = error_system.handle_error(error, "cache", "get_analysis").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_memory_limit_error_recovery() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        
        let error = SecondaryMindError::MemoryLimitExceeded {
            current: 1024,
            limit: 512,
            component: "analysis_engine".to_string(),
        };
        
        let result = error_system.handle_error(error, "memory", "project_analysis").await;
        assert!(result.is_ok());
        
        let health = error_system.get_system_health().await;
        // Should have degraded components due to memory limits
        assert!(!health.degraded_components.is_empty());
    }

    #[tokio::test]
    async fn test_error_reporting() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        
        let error = SecondaryMindError::AIError("API timeout".to_string());
        
        let _ = error_system.handle_error(error, "ai_synthesis", "generate_response").await;
        
        let recent_errors = error_system.get_recent_errors(10).await.unwrap();
        assert_eq!(recent_errors.len(), 1);
        assert_eq!(recent_errors[0].component, "ai_synthesis");
        assert_eq!(recent_errors[0].error_type, "AIError");
    }

    #[tokio::test]
    async fn test_system_reset() {
        let temp_dir = TempDir::new().unwrap();
        let reports_dir = temp_dir.path().to_path_buf();
        
        let error_system = EnhancedErrorSystem::new(reports_dir).await;
        
        // Generate some errors
        let error1 = SecondaryMindError::CacheError {
            operation: "set".to_string(),
            key: "key1".to_string(),
            reason: "Disk full".to_string(),
        };
        let error2 = SecondaryMindError::SearchIndexError {
            operation: "index".to_string(),
            reason: "Parsing failed".to_string(),
        };
        
        let _ = error_system.handle_error(error1, "cache", "store_analysis").await;
        let _ = error_system.handle_error(error2, "search_index", "build_index").await;
        
        // Verify errors exist
        let errors_before = error_system.get_recent_errors(10).await.unwrap();
        assert_eq!(errors_before.len(), 2);
        
        // Reset system
        error_system.reset_system().await.unwrap();
        
        // Verify errors are cleared
        let errors_after = error_system.get_recent_errors(10).await.unwrap();
        assert_eq!(errors_after.len(), 0);
        
        let health = error_system.get_system_health().await;
        assert!(health.is_healthy);
    }
}
