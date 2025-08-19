// [[SECONDARY_MIND_CORE]]/src/model/performance.rs
// Purpose: Data structures for performance monitoring, metrics, and caching
// Architecture: Models for tracking performance metrics, cache statistics, and system resources

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Navigation performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationMetrics {
    /// Average navigation response time in milliseconds
    pub navigation_response_time: u64,
    /// Current memory usage in bytes
    pub memory_usage: u64,
    /// Cache hit rate (0.0 to 1.0)
    pub cache_hit_rate: f64,
    /// Background processing time in milliseconds
    pub background_processing_time: u64,
    /// Number of active navigation sessions
    pub active_sessions: usize,
    /// Metrics collection timestamp
    pub collected_at: DateTime<Utc>,
    /// Detailed operation metrics
    pub operation_metrics: HashMap<String, OperationMetrics>,
    /// System resource usage
    pub system_resources: SystemResourceMetrics,
    /// Cache statistics
    pub cache_statistics: CacheStatistics,
}

/// Metrics for specific operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationMetrics {
    /// Operation name
    pub operation_name: String,
    /// Total number of executions
    pub execution_count: u64,
    /// Average execution time in milliseconds
    pub average_time_ms: f64,
    /// Minimum execution time in milliseconds
    pub min_time_ms: u64,
    /// Maximum execution time in milliseconds
    pub max_time_ms: u64,
    /// Success rate (0.0 to 1.0)
    pub success_rate: f64,
    /// Error count
    pub error_count: u64,
    /// Last execution timestamp
    pub last_execution: DateTime<Utc>,
    /// Performance trend
    pub trend: PerformanceTrend,
}

/// Performance trend indicators
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceTrend {
    Improving,
    Stable,
    Degrading,
    Unknown,
}

/// System resource usage metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResourceMetrics {
    /// CPU usage percentage (0.0 to 100.0)
    pub cpu_usage: f64,
    /// Memory usage in bytes
    pub memory_usage: u64,
    /// Available memory in bytes
    pub available_memory: u64,
    /// Disk usage in bytes
    pub disk_usage: u64,
    /// Available disk space in bytes
    pub available_disk: u64,
    /// Network I/O statistics
    pub network_io: NetworkIOMetrics,
    /// File system I/O statistics
    pub file_io: FileIOMetrics,
    /// Thread count
    pub thread_count: usize,
    /// Handle count (Windows) or file descriptor count (Unix)
    pub handle_count: usize,
}

/// Network I/O metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIOMetrics {
    /// Bytes sent
    pub bytes_sent: u64,
    /// Bytes received
    pub bytes_received: u64,
    /// Packets sent
    pub packets_sent: u64,
    /// Packets received
    pub packets_received: u64,
    /// Connection count
    pub connection_count: usize,
}

/// File system I/O metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileIOMetrics {
    /// Bytes read from disk
    pub bytes_read: u64,
    /// Bytes written to disk
    pub bytes_written: u64,
    /// Read operations count
    pub read_operations: u64,
    /// Write operations count
    pub write_operations: u64,
    /// Average read time in milliseconds
    pub average_read_time_ms: f64,
    /// Average write time in milliseconds
    pub average_write_time_ms: f64,
}

/// Cache performance statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStatistics {
    /// Total cache hits
    pub total_hits: u64,
    /// Total cache misses
    pub total_misses: u64,
    /// Cache hit rate (0.0 to 1.0)
    pub hit_rate: f64,
    /// Total memory used by cache in bytes
    pub memory_usage: u64,
    /// Number of cached items
    pub item_count: usize,
    /// Cache eviction count
    pub eviction_count: u64,
    /// Average item size in bytes
    pub average_item_size: u64,
    /// Cache statistics by type
    pub cache_by_type: HashMap<String, CacheTypeStatistics>,
    /// Last cleanup timestamp
    pub last_cleanup: DateTime<Utc>,
}

/// Statistics for specific cache types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheTypeStatistics {
    /// Cache type name
    pub cache_type: String,
    /// Number of items in this cache
    pub item_count: usize,
    /// Memory usage for this cache type
    pub memory_usage: u64,
    /// Hit rate for this cache type
    pub hit_rate: f64,
    /// Average access time in milliseconds
    pub average_access_time_ms: f64,
    /// Last access timestamp
    pub last_access: DateTime<Utc>,
}

/// Performance monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Whether performance monitoring is enabled
    pub enabled: bool,
    /// Metrics collection interval in seconds
    pub collection_interval_seconds: u64,
    /// Maximum number of metric samples to keep
    pub max_samples: usize,
    /// Performance alert thresholds
    pub alert_thresholds: PerformanceThresholds,
    /// Operations to monitor
    pub monitored_operations: Vec<String>,
    /// Whether to collect detailed system metrics
    pub collect_system_metrics: bool,
    /// Whether to collect cache metrics
    pub collect_cache_metrics: bool,
}

/// Performance alert thresholds
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceThresholds {
    /// Maximum acceptable response time in milliseconds
    pub max_response_time_ms: u64,
    /// Maximum acceptable memory usage in bytes
    pub max_memory_usage_bytes: u64,
    /// Minimum acceptable cache hit rate (0.0 to 1.0)
    pub min_cache_hit_rate: f64,
    /// Maximum acceptable CPU usage percentage
    pub max_cpu_usage_percent: f64,
    /// Maximum acceptable error rate (0.0 to 1.0)
    pub max_error_rate: f64,
}

/// Performance alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceAlert {
    /// Alert identifier
    pub id: String,
    /// Alert type
    pub alert_type: AlertType,
    /// Alert severity
    pub severity: AlertSeverity,
    /// Alert message
    pub message: String,
    /// Metric that triggered the alert
    pub metric_name: String,
    /// Current metric value
    pub current_value: f64,
    /// Threshold value that was exceeded
    pub threshold_value: f64,
    /// Alert timestamp
    pub timestamp: DateTime<Utc>,
    /// Whether alert is acknowledged
    pub acknowledged: bool,
    /// Suggested actions
    pub suggested_actions: Vec<String>,
}

/// Types of performance alerts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertType {
    ResponseTimeHigh,
    MemoryUsageHigh,
    CacheHitRateLow,
    CpuUsageHigh,
    ErrorRateHigh,
    DiskSpaceLow,
    ThreadCountHigh,
    CustomThreshold,
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Performance benchmark result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    /// Benchmark name
    pub name: String,
    /// Benchmark description
    pub description: String,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
    /// Memory usage during benchmark
    pub memory_usage_bytes: u64,
    /// Operations per second
    pub operations_per_second: f64,
    /// Benchmark timestamp
    pub timestamp: DateTime<Utc>,
    /// Benchmark parameters
    pub parameters: HashMap<String, String>,
    /// Comparison with baseline
    pub baseline_comparison: Option<BaselineComparison>,
}

/// Comparison with performance baseline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineComparison {
    /// Baseline execution time
    pub baseline_time_ms: u64,
    /// Performance improvement/degradation percentage
    pub performance_change_percent: f64,
    /// Whether performance improved
    pub improved: bool,
    /// Baseline timestamp
    pub baseline_timestamp: DateTime<Utc>,
}

/// Performance optimization suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationSuggestion {
    /// Suggestion identifier
    pub id: String,
    /// Suggestion title
    pub title: String,
    /// Detailed description
    pub description: String,
    /// Affected component
    pub component: String,
    /// Expected performance improvement
    pub expected_improvement: String,
    /// Implementation difficulty
    pub difficulty: OptimizationDifficulty,
    /// Priority level
    pub priority: OptimizationPriority,
    /// Suggestion timestamp
    pub created_at: DateTime<Utc>,
    /// Whether suggestion is implemented
    pub implemented: bool,
}

/// Optimization difficulty levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationDifficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

/// Optimization priority levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationPriority {
    Low,
    Medium,
    High,
    Critical,
}

/// Performance report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceReport {
    /// Report identifier
    pub id: String,
    /// Report title
    pub title: String,
    /// Report generation timestamp
    pub generated_at: DateTime<Utc>,
    /// Report time period
    pub time_period: TimePeriod,
    /// Overall performance summary
    pub summary: PerformanceSummary,
    /// Detailed metrics
    pub metrics: NavigationMetrics,
    /// Performance alerts during period
    pub alerts: Vec<PerformanceAlert>,
    /// Optimization suggestions
    pub suggestions: Vec<OptimizationSuggestion>,
    /// Benchmark results
    pub benchmarks: Vec<BenchmarkResult>,
}

/// Time period for performance reports
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimePeriod {
    /// Period start time
    pub start: DateTime<Utc>,
    /// Period end time
    pub end: DateTime<Utc>,
    /// Period description
    pub description: String,
}

/// Performance summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    /// Overall performance score (0.0 to 100.0)
    pub overall_score: f64,
    /// Performance grade
    pub grade: PerformanceGrade,
    /// Key performance indicators
    pub key_metrics: HashMap<String, f64>,
    /// Performance trends
    pub trends: HashMap<String, PerformanceTrend>,
    /// Top performance issues
    pub top_issues: Vec<String>,
    /// Performance improvements
    pub improvements: Vec<String>,
}

/// Performance grade levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceGrade {
    Excellent,
    Good,
    Fair,
    Poor,
    Critical,
}

// Implementation methods
impl NavigationMetrics {
    /// Create new navigation metrics
    pub fn new() -> Self {
        Self {
            navigation_response_time: 0,
            memory_usage: 0,
            cache_hit_rate: 0.0,
            background_processing_time: 0,
            active_sessions: 0,
            collected_at: Utc::now(),
            operation_metrics: HashMap::new(),
            system_resources: SystemResourceMetrics::default(),
            cache_statistics: CacheStatistics::default(),
        }
    }

    /// Add operation metrics
    pub fn add_operation_metrics(&mut self, operation: String, metrics: OperationMetrics) {
        self.operation_metrics.insert(operation, metrics);
    }

    /// Get operation metrics
    pub fn get_operation_metrics(&self, operation: &str) -> Option<&OperationMetrics> {
        self.operation_metrics.get(operation)
    }

    /// Calculate overall performance score
    pub fn calculate_performance_score(&self) -> f64 {
        let mut score: f64 = 100.0;

        // Penalize high response times
        if self.navigation_response_time > 1000 {
            score -= 20.0;
        } else if self.navigation_response_time > 500 {
            score -= 10.0;
        }

        // Penalize low cache hit rates
        if self.cache_hit_rate < 0.5 {
            score -= 20.0;
        } else if self.cache_hit_rate < 0.8 {
            score -= 10.0;
        }

        // Penalize high memory usage (assuming 1GB as baseline)
        let memory_gb = self.memory_usage as f64 / (1024.0 * 1024.0 * 1024.0);
        if memory_gb > 2.0 {
            score -= 15.0;
        } else if memory_gb > 1.0 {
            score -= 5.0;
        }

        // Penalize high CPU usage
        if self.system_resources.cpu_usage > 80.0 {
            score -= 15.0;
        } else if self.system_resources.cpu_usage > 50.0 {
            score -= 5.0;
        }

        score.max(0.0).min(100.0)
    }

    /// Validate metrics data
    pub fn validate(&self) -> Result<(), String> {
        if self.cache_hit_rate < 0.0 || self.cache_hit_rate > 1.0 {
            return Err("Cache hit rate must be between 0.0 and 1.0".to_string());
        }

        if self.system_resources.cpu_usage < 0.0 || self.system_resources.cpu_usage > 100.0 {
            return Err("CPU usage must be between 0.0 and 100.0".to_string());
        }

        for (name, metrics) in &self.operation_metrics {
            if metrics.success_rate < 0.0 || metrics.success_rate > 1.0 {
                return Err(format!("Success rate for operation '{}' must be between 0.0 and 1.0", name));
            }
        }

        Ok(())
    }
}

impl OperationMetrics {
    /// Create new operation metrics
    pub fn new(operation_name: String) -> Self {
        Self {
            operation_name,
            execution_count: 0,
            average_time_ms: 0.0,
            min_time_ms: u64::MAX,
            max_time_ms: 0,
            success_rate: 1.0,
            error_count: 0,
            last_execution: Utc::now(),
            trend: PerformanceTrend::Unknown,
        }
    }

    /// Record a successful execution
    pub fn record_execution(&mut self, execution_time_ms: u64) {
        self.execution_count += 1;
        self.min_time_ms = self.min_time_ms.min(execution_time_ms);
        self.max_time_ms = self.max_time_ms.max(execution_time_ms);
        
        // Update average time
        let total_time = self.average_time_ms * (self.execution_count - 1) as f64;
        self.average_time_ms = (total_time + execution_time_ms as f64) / self.execution_count as f64;
        
        self.last_execution = Utc::now();
        self.update_success_rate();
    }

    /// Record a failed execution
    pub fn record_error(&mut self) {
        self.execution_count += 1;
        self.error_count += 1;
        self.last_execution = Utc::now();
        self.update_success_rate();
    }

    fn update_success_rate(&mut self) {
        if self.execution_count > 0 {
            let success_count = self.execution_count - self.error_count;
            self.success_rate = success_count as f64 / self.execution_count as f64;
        }
    }
}

impl Default for SystemResourceMetrics {
    fn default() -> Self {
        Self {
            cpu_usage: 0.0,
            memory_usage: 0,
            available_memory: 0,
            disk_usage: 0,
            available_disk: 0,
            network_io: NetworkIOMetrics::default(),
            file_io: FileIOMetrics::default(),
            thread_count: 0,
            handle_count: 0,
        }
    }
}

impl Default for NetworkIOMetrics {
    fn default() -> Self {
        Self {
            bytes_sent: 0,
            bytes_received: 0,
            packets_sent: 0,
            packets_received: 0,
            connection_count: 0,
        }
    }
}

impl Default for FileIOMetrics {
    fn default() -> Self {
        Self {
            bytes_read: 0,
            bytes_written: 0,
            read_operations: 0,
            write_operations: 0,
            average_read_time_ms: 0.0,
            average_write_time_ms: 0.0,
        }
    }
}

impl Default for CacheStatistics {
    fn default() -> Self {
        Self {
            total_hits: 0,
            total_misses: 0,
            hit_rate: 0.0,
            memory_usage: 0,
            item_count: 0,
            eviction_count: 0,
            average_item_size: 0,
            cache_by_type: HashMap::new(),
            last_cleanup: Utc::now(),
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            collection_interval_seconds: 60,
            max_samples: 1000,
            alert_thresholds: PerformanceThresholds::default(),
            monitored_operations: vec![
                "analyze_file_structure".to_string(),
                "analyze_symbol_relationships".to_string(),
                "get_enhanced_file_tree".to_string(),
                "save_navigation_history".to_string(),
                "load_navigation_history".to_string(),
            ],
            collect_system_metrics: true,
            collect_cache_metrics: true,
        }
    }
}

impl Default for PerformanceThresholds {
    fn default() -> Self {
        Self {
            max_response_time_ms: 5000,
            max_memory_usage_bytes: 2 * 1024 * 1024 * 1024, // 2GB
            min_cache_hit_rate: 0.8,
            max_cpu_usage_percent: 80.0,
            max_error_rate: 0.05,
        }
    }
}

impl PerformanceAlert {
    /// Create a new performance alert
    pub fn new(
        alert_type: AlertType,
        severity: AlertSeverity,
        message: String,
        metric_name: String,
        current_value: f64,
        threshold_value: f64,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            alert_type,
            severity,
            message,
            metric_name,
            current_value,
            threshold_value,
            timestamp: Utc::now(),
            acknowledged: false,
            suggested_actions: Vec::new(),
        }
    }

    /// Acknowledge the alert
    pub fn acknowledge(&mut self) {
        self.acknowledged = true;
    }

    /// Add a suggested action
    pub fn add_suggested_action(&mut self, action: String) {
        self.suggested_actions.push(action);
    }
}