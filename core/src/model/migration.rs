// [[SECONDARY_MIND_CORE]]/src/model/migration.rs
// Purpose: Data migration support for schema changes and version compatibility
// Architecture: Models and utilities for handling data schema migrations and validation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::errors::navigation_error::NavigationError;

/// Data schema version information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaVersion {
    /// Major version number
    pub major: u32,
    /// Minor version number
    pub minor: u32,
    /// Patch version number
    pub patch: u32,
    /// Pre-release identifier
    pub pre_release: Option<String>,
    /// Build metadata
    pub build: Option<String>,
}

/// Migration configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationConfig {
    /// Current schema version
    pub current_version: SchemaVersion,
    /// Minimum supported version
    pub minimum_supported_version: SchemaVersion,
    /// Available migrations
    pub available_migrations: Vec<MigrationInfo>,
    /// Whether to create backups before migration
    pub create_backups: bool,
    /// Maximum backup retention days
    pub backup_retention_days: u32,
    /// Whether to validate data after migration
    pub validate_after_migration: bool,
}

/// Information about a specific migration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationInfo {
    /// Migration identifier
    pub id: String,
    /// Migration name
    pub name: String,
    /// Source version
    pub from_version: SchemaVersion,
    /// Target version
    pub to_version: SchemaVersion,
    /// Migration description
    pub description: String,
    /// Whether migration is reversible
    pub reversible: bool,
    /// Estimated migration time
    pub estimated_duration: String,
    /// Migration complexity
    pub complexity: MigrationComplexity,
    /// Required data types for migration
    pub required_data_types: Vec<String>,
}

/// Migration complexity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MigrationComplexity {
    Simple,
    Moderate,
    Complex,
    Critical,
}

/// Migration execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    /// Migration identifier
    pub migration_id: String,
    /// Whether migration was successful
    pub success: bool,
    /// Migration start time
    pub started_at: DateTime<Utc>,
    /// Migration completion time
    pub completed_at: Option<DateTime<Utc>>,
    /// Migration duration in milliseconds
    pub duration_ms: Option<u64>,
    /// Number of records migrated
    pub records_migrated: usize,
    /// Number of records failed
    pub records_failed: usize,
    /// Migration errors
    pub errors: Vec<MigrationError>,
    /// Migration warnings
    pub warnings: Vec<String>,
    /// Backup information
    pub backup_info: Option<BackupInfo>,
    /// Validation results
    pub validation_results: Option<ValidationResults>,
}

/// Migration error information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationError {
    /// Error code
    pub code: String,
    /// Error message
    pub message: String,
    /// Affected record identifier
    pub record_id: Option<String>,
    /// Error context
    pub context: HashMap<String, String>,
    /// Error timestamp
    pub timestamp: DateTime<Utc>,
    /// Whether error is recoverable
    pub recoverable: bool,
}

/// Backup information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    /// Backup identifier
    pub backup_id: String,
    /// Backup file path
    pub backup_path: String,
    /// Backup creation time
    pub created_at: DateTime<Utc>,
    /// Backup size in bytes
    pub size_bytes: u64,
    /// Backup checksum
    pub checksum: String,
    /// Backup compression used
    pub compression: Option<String>,
    /// Whether backup is encrypted
    pub encrypted: bool,
}

/// Data validation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResults {
    /// Whether validation passed
    pub passed: bool,
    /// Total records validated
    pub total_records: usize,
    /// Valid records count
    pub valid_records: usize,
    /// Invalid records count
    pub invalid_records: usize,
    /// Validation errors
    pub validation_errors: Vec<ValidationError>,
    /// Validation warnings
    pub validation_warnings: Vec<ValidationWarning>,
    /// Validation start time
    pub started_at: DateTime<Utc>,
    /// Validation completion time
    pub completed_at: DateTime<Utc>,
    /// Validation duration in milliseconds
    pub duration_ms: u64,
}

/// Validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    /// Error code
    pub code: String,
    /// Error message
    pub message: String,
    /// Field that failed validation
    pub field: String,
    /// Record identifier
    pub record_id: String,
    /// Expected value or format
    pub expected: Option<String>,
    /// Actual value found
    pub actual: Option<String>,
    /// Error severity
    pub severity: ValidationSeverity,
}

/// Validation warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    /// Warning code
    pub code: String,
    /// Warning message
    pub message: String,
    /// Field that triggered warning
    pub field: Option<String>,
    /// Record identifier
    pub record_id: Option<String>,
    /// Suggested action
    pub suggested_action: Option<String>,
}

/// Validation severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Data type schema definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataTypeSchema {
    /// Data type name
    pub type_name: String,
    /// Schema version
    pub version: SchemaVersion,
    /// Field definitions
    pub fields: Vec<FieldDefinition>,
    /// Required fields
    pub required_fields: Vec<String>,
    /// Optional fields
    pub optional_fields: Vec<String>,
    /// Field constraints
    pub constraints: Vec<FieldConstraint>,
    /// Schema metadata
    pub metadata: HashMap<String, String>,
}

/// Field definition in schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    /// Field name
    pub name: String,
    /// Field data type
    pub data_type: FieldDataType,
    /// Whether field is required
    pub required: bool,
    /// Default value
    pub default_value: Option<String>,
    /// Field description
    pub description: Option<String>,
    /// Field constraints
    pub constraints: Vec<FieldConstraint>,
    /// Whether field is deprecated
    pub deprecated: bool,
    /// Deprecation message
    pub deprecation_message: Option<String>,
}

/// Field data types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FieldDataType {
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Array(Box<FieldDataType>),
    Object(String), // Reference to another schema
    Optional(Box<FieldDataType>),
    Union(Vec<FieldDataType>),
}

/// Field constraints
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FieldConstraint {
    MinLength(usize),
    MaxLength(usize),
    MinValue(f64),
    MaxValue(f64),
    Pattern(String),
    Enum(Vec<String>),
    Unique,
    NotNull,
    Custom(String, String), // constraint name, validation rule
}

/// Migration plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationPlan {
    /// Plan identifier
    pub id: String,
    /// Source version
    pub from_version: SchemaVersion,
    /// Target version
    pub to_version: SchemaVersion,
    /// Ordered list of migrations to execute
    pub migrations: Vec<String>,
    /// Estimated total duration
    pub estimated_duration: String,
    /// Plan creation time
    pub created_at: DateTime<Utc>,
    /// Whether plan requires manual intervention
    pub requires_manual_intervention: bool,
    /// Manual intervention steps
    pub manual_steps: Vec<String>,
    /// Pre-migration checks
    pub pre_checks: Vec<String>,
    /// Post-migration checks
    pub post_checks: Vec<String>,
}

/// Migration status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStatus {
    /// Current migration state
    pub state: MigrationState,
    /// Current migration being executed
    pub current_migration: Option<String>,
    /// Progress percentage (0-100)
    pub progress_percent: u8,
    /// Records processed
    pub records_processed: usize,
    /// Total records to process
    pub total_records: usize,
    /// Migration start time
    pub started_at: Option<DateTime<Utc>>,
    /// Estimated completion time
    pub estimated_completion: Option<DateTime<Utc>>,
    /// Status message
    pub status_message: String,
    /// Last update time
    pub last_updated: DateTime<Utc>,
}

/// Migration states
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MigrationState {
    NotStarted,
    Planning,
    BackingUp,
    Migrating,
    Validating,
    Completed,
    Failed,
    RollingBack,
    RolledBack,
    Cancelled,
}

// Implementation methods
impl SchemaVersion {
    /// Create a new schema version
    pub fn new(major: u32, minor: u32, patch: u32) -> Self {
        Self {
            major,
            minor,
            patch,
            pre_release: None,
            build: None,
        }
    }

    /// Create version from string (e.g., "1.2.3")
    pub fn from_string(version_str: &str) -> Result<Self, String> {
        let parts: Vec<&str> = version_str.split('.').collect();
        if parts.len() < 3 {
            return Err("Version string must have at least major.minor.patch".to_string());
        }

        let major = parts[0].parse::<u32>()
            .map_err(|_| "Invalid major version number".to_string())?;
        let minor = parts[1].parse::<u32>()
            .map_err(|_| "Invalid minor version number".to_string())?;
        let patch = parts[2].parse::<u32>()
            .map_err(|_| "Invalid patch version number".to_string())?;

        Ok(Self::new(major, minor, patch))
    }

    /// Convert to string representation
    pub fn to_string(&self) -> String {
        let mut version = format!("{}.{}.{}", self.major, self.minor, self.patch);
        
        if let Some(pre_release) = &self.pre_release {
            version.push_str(&format!("-{}", pre_release));
        }
        
        if let Some(build) = &self.build {
            version.push_str(&format!("+{}", build));
        }
        
        version
    }

    /// Compare versions
    pub fn compare(&self, other: &SchemaVersion) -> std::cmp::Ordering {
        match self.major.cmp(&other.major) {
            std::cmp::Ordering::Equal => {
                match self.minor.cmp(&other.minor) {
                    std::cmp::Ordering::Equal => self.patch.cmp(&other.patch),
                    other => other,
                }
            }
            other => other,
        }
    }

    /// Check if this version is compatible with another
    pub fn is_compatible_with(&self, other: &SchemaVersion) -> bool {
        // Same major version is compatible
        self.major == other.major
    }

    /// Check if migration is needed
    pub fn needs_migration_to(&self, target: &SchemaVersion) -> bool {
        self.compare(target) != std::cmp::Ordering::Equal
    }
}

impl MigrationConfig {
    /// Create default migration configuration
    pub fn default() -> Self {
        Self {
            current_version: SchemaVersion::new(1, 0, 0),
            minimum_supported_version: SchemaVersion::new(1, 0, 0),
            available_migrations: Vec::new(),
            create_backups: true,
            backup_retention_days: 30,
            validate_after_migration: true,
        }
    }

    /// Add a migration to the configuration
    pub fn add_migration(&mut self, migration: MigrationInfo) {
        self.available_migrations.push(migration);
    }

    /// Find migration path from source to target version
    pub fn find_migration_path(&self, from: &SchemaVersion, to: &SchemaVersion) -> Option<Vec<String>> {
        // Simple implementation - in practice, this would use graph algorithms
        // to find the optimal migration path
        let mut path = Vec::new();
        let mut current = from.clone();

        while current.compare(to) != std::cmp::Ordering::Equal {
            let next_migration = self.available_migrations.iter()
                .find(|m| m.from_version.compare(&current) == std::cmp::Ordering::Equal)?;
            
            path.push(next_migration.id.clone());
            current = next_migration.to_version.clone();
        }

        Some(path)
    }

    /// Validate migration configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.current_version.compare(&self.minimum_supported_version) == std::cmp::Ordering::Less {
            return Err("Current version cannot be less than minimum supported version".to_string());
        }

        if self.backup_retention_days == 0 {
            return Err("Backup retention days must be greater than zero".to_string());
        }

        // Validate migration chain consistency
        for migration in &self.available_migrations {
            if migration.from_version.compare(&migration.to_version) != std::cmp::Ordering::Less {
                return Err(format!("Migration '{}' has invalid version progression", migration.id));
            }
        }

        Ok(())
    }
}

impl MigrationResult {
    /// Create a new migration result
    pub fn new(migration_id: String) -> Self {
        Self {
            migration_id,
            success: false,
            started_at: Utc::now(),
            completed_at: None,
            duration_ms: None,
            records_migrated: 0,
            records_failed: 0,
            errors: Vec::new(),
            warnings: Vec::new(),
            backup_info: None,
            validation_results: None,
        }
    }

    /// Mark migration as completed
    pub fn complete(&mut self, success: bool) {
        self.success = success;
        self.completed_at = Some(Utc::now());
        
        if let Some(completed) = self.completed_at {
            self.duration_ms = Some((completed - self.started_at).num_milliseconds() as u64);
        }
    }

    /// Add an error to the result
    pub fn add_error(&mut self, error: MigrationError) {
        self.errors.push(error);
    }

    /// Add a warning to the result
    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }

    /// Check if migration has critical errors
    pub fn has_critical_errors(&self) -> bool {
        self.errors.iter().any(|e| !e.recoverable)
    }

    /// Get success rate
    pub fn success_rate(&self) -> f64 {
        let total = self.records_migrated + self.records_failed;
        if total == 0 {
            return 1.0;
        }
        self.records_migrated as f64 / total as f64
    }
}

impl ValidationResults {
    /// Create new validation results
    pub fn new() -> Self {
        let now = Utc::now();
        Self {
            passed: false,
            total_records: 0,
            valid_records: 0,
            invalid_records: 0,
            validation_errors: Vec::new(),
            validation_warnings: Vec::new(),
            started_at: now,
            completed_at: now,
            duration_ms: 0,
        }
    }

    /// Complete validation
    pub fn complete(&mut self) {
        self.completed_at = Utc::now();
        self.duration_ms = (self.completed_at - self.started_at).num_milliseconds() as u64;
        self.passed = self.validation_errors.is_empty();
    }

    /// Add validation error
    pub fn add_error(&mut self, error: ValidationError) {
        self.validation_errors.push(error);
        self.invalid_records += 1;
    }

    /// Add validation warning
    pub fn add_warning(&mut self, warning: ValidationWarning) {
        self.validation_warnings.push(warning);
    }

    /// Get validation success rate
    pub fn success_rate(&self) -> f64 {
        if self.total_records == 0 {
            return 1.0;
        }
        self.valid_records as f64 / self.total_records as f64
    }

    /// Check if validation has critical errors
    pub fn has_critical_errors(&self) -> bool {
        self.validation_errors.iter()
            .any(|e| matches!(e.severity, ValidationSeverity::Critical))
    }
}

impl DataTypeSchema {
    /// Create a new data type schema
    pub fn new(type_name: String, version: SchemaVersion) -> Self {
        Self {
            type_name,
            version,
            fields: Vec::new(),
            required_fields: Vec::new(),
            optional_fields: Vec::new(),
            constraints: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    /// Add a field to the schema
    pub fn add_field(&mut self, field: FieldDefinition) {
        if field.required {
            self.required_fields.push(field.name.clone());
        } else {
            self.optional_fields.push(field.name.clone());
        }
        self.fields.push(field);
    }

    /// Validate data against this schema
    pub fn validate_data(&self, data: &serde_json::Value) -> ValidationResults {
        let mut results = ValidationResults::new();
        results.total_records = 1;

        // Validate required fields
        for required_field in &self.required_fields {
            if !data.get(required_field).is_some() {
                results.add_error(ValidationError {
                    code: "MISSING_REQUIRED_FIELD".to_string(),
                    message: format!("Required field '{}' is missing", required_field),
                    field: required_field.clone(),
                    record_id: "unknown".to_string(),
                    expected: Some("non-null value".to_string()),
                    actual: Some("null".to_string()),
                    severity: ValidationSeverity::Error,
                });
            }
        }

        // Validate field constraints
        for field in &self.fields {
            if let Some(field_value) = data.get(&field.name) {
                self.validate_field_constraints(&field, field_value, &mut results);
            }
        }

        if results.validation_errors.is_empty() {
            results.valid_records = 1;
        }

        results.complete();
        results
    }

    fn validate_field_constraints(&self, field: &FieldDefinition, value: &serde_json::Value, results: &mut ValidationResults) {
        for constraint in &field.constraints {
            match constraint {
                FieldConstraint::NotNull => {
                    if value.is_null() {
                        results.add_error(ValidationError {
                            code: "NULL_VALUE".to_string(),
                            message: format!("Field '{}' cannot be null", field.name),
                            field: field.name.clone(),
                            record_id: "unknown".to_string(),
                            expected: Some("non-null value".to_string()),
                            actual: Some("null".to_string()),
                            severity: ValidationSeverity::Error,
                        });
                    }
                }
                FieldConstraint::MinLength(min_len) => {
                    if let Some(str_value) = value.as_str() {
                        if str_value.len() < *min_len {
                            results.add_error(ValidationError {
                                code: "MIN_LENGTH_VIOLATION".to_string(),
                                message: format!("Field '{}' is too short", field.name),
                                field: field.name.clone(),
                                record_id: "unknown".to_string(),
                                expected: Some(format!("minimum {} characters", min_len)),
                                actual: Some(format!("{} characters", str_value.len())),
                                severity: ValidationSeverity::Error,
                            });
                        }
                    }
                }
                FieldConstraint::MaxLength(max_len) => {
                    if let Some(str_value) = value.as_str() {
                        if str_value.len() > *max_len {
                            results.add_error(ValidationError {
                                code: "MAX_LENGTH_VIOLATION".to_string(),
                                message: format!("Field '{}' is too long", field.name),
                                field: field.name.clone(),
                                record_id: "unknown".to_string(),
                                expected: Some(format!("maximum {} characters", max_len)),
                                actual: Some(format!("{} characters", str_value.len())),
                                severity: ValidationSeverity::Error,
                            });
                        }
                    }
                }
                // Add more constraint validations as needed
                _ => {}
            }
        }
    }
}

/// Utility functions for data migration
pub mod migration_utils {
    use super::*;

    /// Create a backup of data before migration
    pub fn create_backup(data: &serde_json::Value, backup_path: &str) -> Result<BackupInfo, NavigationError> {
        let backup_id = uuid::Uuid::new_v4().to_string();
        let serialized = serde_json::to_string_pretty(data)
            .map_err(|e| NavigationError::SessionSerializationFailed { 
                reason: format!("Failed to serialize backup data: {}", e) 
            })?;

        // In a real implementation, this would write to file system
        // For now, we'll just create the backup info
        Ok(BackupInfo {
            backup_id,
            backup_path: backup_path.to_string(),
            created_at: Utc::now(),
            size_bytes: serialized.len() as u64,
            checksum: format!("{:x}", md5::compute(serialized.as_bytes())),
            compression: None,
            encrypted: false,
        })
    }

    /// Restore data from backup
    pub fn restore_from_backup(backup_info: &BackupInfo) -> Result<serde_json::Value, NavigationError> {
        // In a real implementation, this would read from the backup file
        // For now, we'll return an empty object
        Ok(serde_json::json!({}))
    }

    /// Validate migration compatibility
    pub fn validate_migration_compatibility(
        from_version: &SchemaVersion,
        to_version: &SchemaVersion,
        available_migrations: &[MigrationInfo],
    ) -> Result<bool, String> {
        if from_version.compare(to_version) == std::cmp::Ordering::Equal {
            return Ok(true);
        }

        // Check if there's a direct migration path
        let has_direct_path = available_migrations.iter()
            .any(|m| m.from_version.compare(from_version) == std::cmp::Ordering::Equal &&
                     m.to_version.compare(to_version) == std::cmp::Ordering::Equal);

        if has_direct_path {
            return Ok(true);
        }

        // Check for indirect migration path (simplified)
        // In practice, this would use graph algorithms
        Ok(false)
    }
}