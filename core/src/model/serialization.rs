// [[SECONDARY_MIND_CORE]]/src/model/serialization.rs
// Purpose: Serialization utilities and error handling for navigation data models
// Architecture: Centralized serialization/deserialization with comprehensive error handling

use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::path::Path;
use std::fs;
use chrono::{DateTime, Utc};
use crate::errors::navigation_error::NavigationError;
use crate::model::migration::{SchemaVersion, ValidationResults};

/// Serialization format options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SerializationFormat {
    Json,
    JsonPretty,
    Bincode,
    MessagePack,
}

/// Serialization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializationConfig {
    /// Default serialization format
    pub default_format: SerializationFormat,
    /// Whether to compress serialized data
    pub compress: bool,
    /// Whether to encrypt serialized data
    pub encrypt: bool,
    /// Maximum file size for serialization (bytes)
    pub max_file_size: u64,
    /// Whether to create backups before overwriting
    pub create_backups: bool,
    /// Schema validation settings
    pub validation: ValidationConfig,
}

/// Validation configuration for serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationConfig {
    /// Whether to validate data before serialization
    pub validate_before_serialize: bool,
    /// Whether to validate data after deserialization
    pub validate_after_deserialize: bool,
    /// Schema version to validate against
    pub schema_version: SchemaVersion,
    /// Whether to allow unknown fields
    pub allow_unknown_fields: bool,
    /// Whether to use strict type checking
    pub strict_types: bool,
}

/// Serialization metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializationMetadata {
    /// Format used for serialization
    pub format: SerializationFormat,
    /// Schema version
    pub schema_version: SchemaVersion,
    /// Serialization timestamp
    pub serialized_at: DateTime<Utc>,
    /// Data checksum
    pub checksum: String,
    /// Compression used
    pub compression: Option<String>,
    /// Encryption used
    pub encryption: Option<String>,
    /// Original data size
    pub original_size: u64,
    /// Compressed size
    pub compressed_size: Option<u64>,
}

/// Serialization result
#[derive(Debug, Clone)]
pub struct SerializationResult<T> {
    /// Serialized data
    pub data: T,
    /// Serialization metadata
    pub metadata: SerializationMetadata,
    /// Validation results
    pub validation: Option<ValidationResults>,
    /// Serialization duration in milliseconds
    pub duration_ms: u64,
}

/// Deserialization result
#[derive(Debug, Clone)]
pub struct DeserializationResult<T> {
    /// Deserialized data
    pub data: T,
    /// Original metadata
    pub metadata: SerializationMetadata,
    /// Validation results
    pub validation: Option<ValidationResults>,
    /// Deserialization duration in milliseconds
    pub duration_ms: u64,
    /// Whether migration was performed
    pub migrated: bool,
}

/// Navigation data serializer
pub struct NavigationSerializer {
    config: SerializationConfig,
}

impl NavigationSerializer {
    /// Create a new serializer with configuration
    pub fn new(config: SerializationConfig) -> Self {
        Self { config }
    }

    /// Create a serializer with default configuration
    pub fn default() -> Self {
        Self {
            config: SerializationConfig::default(),
        }
    }

    /// Serialize data to bytes
    pub fn serialize<T>(&self, data: &T) -> Result<SerializationResult<Vec<u8>>, NavigationError>
    where
        T: Serialize + Clone,
    {
        let start_time = std::time::Instant::now();

        // Validate before serialization if configured
        let validation = if self.config.validation.validate_before_serialize {
            Some(self.validate_data(data)?)
        } else {
            None
        };

        // Check validation results
        if let Some(ref validation_results) = validation {
            if validation_results.has_critical_errors() {
                return Err(NavigationError::SchemaValidationFailed {
                    reason: "Critical validation errors found before serialization".to_string(),
                });
            }
        }

        // Serialize based on format
        let serialized_data = match self.config.default_format {
            SerializationFormat::Json => {
                serde_json::to_vec(data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("JSON serialization failed: {}", e),
                    })?
            }
            SerializationFormat::JsonPretty => {
                serde_json::to_vec_pretty(data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("JSON pretty serialization failed: {}", e),
                    })?
            }
            SerializationFormat::Bincode => {
                bincode::serialize(data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("Bincode serialization failed: {}", e),
                    })?
            }
            SerializationFormat::MessagePack => {
                rmp_serde::to_vec(data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("MessagePack serialization failed: {}", e),
                    })?
            }
        };

        let original_size = serialized_data.len() as u64;
        let mut final_data = serialized_data;
        let mut compressed_size = None;

        // Apply compression if configured
        if self.config.compress {
            final_data = self.compress_data(&final_data)?;
            compressed_size = Some(final_data.len() as u64);
        }

        // Apply encryption if configured
        if self.config.encrypt {
            final_data = self.encrypt_data(&final_data)?;
        }

        // Check size limits
        if final_data.len() as u64 > self.config.max_file_size {
            return Err(NavigationError::SessionSerializationFailed {
                reason: format!(
                    "Serialized data size ({} bytes) exceeds maximum allowed size ({} bytes)",
                    final_data.len(),
                    self.config.max_file_size
                ),
            });
        }

        // Calculate checksum
        let checksum = self.calculate_checksum(&final_data);

        // Create metadata
        let metadata = SerializationMetadata {
            format: self.config.default_format.clone(),
            schema_version: self.config.validation.schema_version.clone(),
            serialized_at: Utc::now(),
            checksum,
            compression: if self.config.compress { Some("gzip".to_string()) } else { None },
            encryption: if self.config.encrypt { Some("aes256".to_string()) } else { None },
            original_size,
            compressed_size,
        };

        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(SerializationResult {
            data: final_data,
            metadata,
            validation,
            duration_ms,
        })
    }

    /// Deserialize data from bytes
    pub fn deserialize<T>(&self, data: &[u8], metadata: SerializationMetadata) -> Result<DeserializationResult<T>, NavigationError>
    where
        T: DeserializeOwned,
    {
        let start_time = std::time::Instant::now();

        // Verify checksum
        let calculated_checksum = self.calculate_checksum(data);
        if calculated_checksum != metadata.checksum {
            return Err(NavigationError::SessionDataCorrupted {
                project_path: std::path::PathBuf::from("unknown"),
            });
        }

        let mut processed_data = data.to_vec();

        // Decrypt if needed
        if metadata.encryption.is_some() {
            processed_data = self.decrypt_data(&processed_data)?;
        }

        // Decompress if needed
        if metadata.compression.is_some() {
            processed_data = self.decompress_data(&processed_data)?;
        }

        // Deserialize based on format
        let deserialized_data: T = match metadata.format {
            SerializationFormat::Json | SerializationFormat::JsonPretty => {
                serde_json::from_slice(&processed_data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("JSON deserialization failed: {}", e),
                    })?
            }
            SerializationFormat::Bincode => {
                bincode::deserialize(&processed_data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("Bincode deserialization failed: {}", e),
                    })?
            }
            SerializationFormat::MessagePack => {
                rmp_serde::from_slice(&processed_data)
                    .map_err(|e| NavigationError::SessionSerializationFailed {
                        reason: format!("MessagePack deserialization failed: {}", e),
                    })?
            }
        };

        // Validate after deserialization if configured
        let validation = if self.config.validation.validate_after_deserialize {
            Some(self.validate_deserialized_data(&deserialized_data)?)
        } else {
            None
        };

        // Check validation results
        if let Some(ref validation_results) = validation {
            if validation_results.has_critical_errors() {
                return Err(NavigationError::SchemaValidationFailed {
                    reason: "Critical validation errors found after deserialization".to_string(),
                });
            }
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(DeserializationResult {
            data: deserialized_data,
            metadata,
            validation,
            duration_ms,
            migrated: false, // TODO: Implement migration detection
        })
    }

    /// Serialize data to file
    pub fn serialize_to_file<T>(&self, data: &T, file_path: &Path) -> Result<SerializationMetadata, NavigationError>
    where
        T: Serialize + Clone,
    {
        // Create backup if configured
        if self.config.create_backups && file_path.exists() {
            self.create_backup(file_path)?;
        }

        let result = self.serialize(data)?;

        // Write to file
        fs::write(file_path, &result.data)
            .map_err(|e| NavigationError::IoError {
                path: file_path.to_path_buf(),
                message: format!("Failed to write serialized data: {}", e),
            })?;

        // Write metadata file
        let metadata_path = file_path.with_extension("meta");
        let metadata_json = serde_json::to_string_pretty(&result.metadata)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to serialize metadata: {}", e),
            })?;

        fs::write(&metadata_path, metadata_json)
            .map_err(|e| NavigationError::IoError {
                path: metadata_path,
                message: format!("Failed to write metadata: {}", e),
            })?;

        Ok(result.metadata)
    }

    /// Deserialize data from file
    pub fn deserialize_from_file<T>(&self, file_path: &Path) -> Result<DeserializationResult<T>, NavigationError>
    where
        T: DeserializeOwned,
    {
        // Read data file
        let data = fs::read(file_path)
            .map_err(|e| NavigationError::IoError {
                path: file_path.to_path_buf(),
                message: format!("Failed to read data file: {}", e),
            })?;

        // Read metadata file
        let metadata_path = file_path.with_extension("meta");
        let metadata_json = fs::read_to_string(&metadata_path)
            .map_err(|e| NavigationError::IoError {
                path: metadata_path,
                message: format!("Failed to read metadata file: {}", e),
            })?;

        let metadata: SerializationMetadata = serde_json::from_str(&metadata_json)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to deserialize metadata: {}", e),
            })?;

        self.deserialize(&data, metadata)
    }

    /// Validate data before serialization
    fn validate_data<T>(&self, _data: &T) -> Result<ValidationResults, NavigationError>
    where
        T: Serialize,
    {
        // TODO: Implement actual validation logic
        // This would validate against schema definitions
        let mut results = ValidationResults::new();
        results.total_records = 1;
        results.valid_records = 1;
        results.complete();
        Ok(results)
    }

    /// Validate data after deserialization
    fn validate_deserialized_data<T>(&self, _data: &T) -> Result<ValidationResults, NavigationError> {
        // TODO: Implement actual validation logic
        let mut results = ValidationResults::new();
        results.total_records = 1;
        results.valid_records = 1;
        results.complete();
        Ok(results)
    }

    /// Compress data using gzip
    fn compress_data(&self, data: &[u8]) -> Result<Vec<u8>, NavigationError> {
        use std::io::Write;
        use flate2::Compression;
        use flate2::write::GzEncoder;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Compression failed: {}", e),
            })?;

        encoder.finish()
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Compression finalization failed: {}", e),
            })
    }

    /// Decompress data using gzip
    fn decompress_data(&self, data: &[u8]) -> Result<Vec<u8>, NavigationError> {
        use std::io::Read;
        use flate2::read::GzDecoder;

        let mut decoder = GzDecoder::new(data);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Decompression failed: {}", e),
            })?;

        Ok(decompressed)
    }

    /// Encrypt data (placeholder implementation)
    fn encrypt_data(&self, data: &[u8]) -> Result<Vec<u8>, NavigationError> {
        // TODO: Implement actual encryption
        // For now, just return the data as-is
        Ok(data.to_vec())
    }

    /// Decrypt data (placeholder implementation)
    fn decrypt_data(&self, data: &[u8]) -> Result<Vec<u8>, NavigationError> {
        // TODO: Implement actual decryption
        // For now, just return the data as-is
        Ok(data.to_vec())
    }

    /// Calculate checksum for data integrity
    fn calculate_checksum(&self, data: &[u8]) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    /// Create backup of existing file
    fn create_backup(&self, file_path: &Path) -> Result<(), NavigationError> {
        if !file_path.exists() {
            return Ok(());
        }

        let backup_path = file_path.with_extension(format!(
            "{}.backup.{}",
            file_path.extension().and_then(|s| s.to_str()).unwrap_or(""),
            Utc::now().format("%Y%m%d_%H%M%S")
        ));

        fs::copy(file_path, &backup_path)
            .map_err(|e| NavigationError::IoError {
                path: backup_path,
                message: format!("Failed to create backup: {}", e),
            })?;

        Ok(())
    }
}

impl Default for SerializationConfig {
    fn default() -> Self {
        Self {
            default_format: SerializationFormat::JsonPretty,
            compress: false,
            encrypt: false,
            max_file_size: 100 * 1024 * 1024, // 100MB
            create_backups: true,
            validation: ValidationConfig::default(),
        }
    }
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            validate_before_serialize: true,
            validate_after_deserialize: true,
            schema_version: SchemaVersion::new(1, 0, 0),
            allow_unknown_fields: false,
            strict_types: true,
        }
    }
}

/// Utility functions for common serialization tasks
pub mod serialization_utils {
    use super::*;

    /// Serialize navigation history to JSON
    pub fn serialize_navigation_history(
        history: &crate::model::navigation::NavigationHistory,
    ) -> Result<String, NavigationError> {
        serde_json::to_string_pretty(history)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to serialize navigation history: {}", e),
            })
    }

    /// Deserialize navigation history from JSON
    pub fn deserialize_navigation_history(
        json: &str,
    ) -> Result<crate::model::navigation::NavigationHistory, NavigationError> {
        serde_json::from_str(json)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to deserialize navigation history: {}", e),
            })
    }

    /// Serialize navigation session data to JSON
    pub fn serialize_navigation_session(
        session: &crate::model::navigation::NavigationSessionData,
    ) -> Result<String, NavigationError> {
        serde_json::to_string_pretty(session)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to serialize navigation session: {}", e),
            })
    }

    /// Deserialize navigation session data from JSON
    pub fn deserialize_navigation_session(
        json: &str,
    ) -> Result<crate::model::navigation::NavigationSessionData, NavigationError> {
        serde_json::from_str(json)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to deserialize navigation session: {}", e),
            })
    }

    /// Validate JSON structure
    pub fn validate_json_structure(json: &str) -> Result<(), NavigationError> {
        serde_json::from_str::<serde_json::Value>(json)
            .map_err(|e| NavigationError::SchemaValidationFailed {
                reason: format!("Invalid JSON structure: {}", e),
            })?;
        Ok(())
    }

    /// Pretty print JSON with proper formatting
    pub fn pretty_print_json(json: &str) -> Result<String, NavigationError> {
        let value: serde_json::Value = serde_json::from_str(json)
            .map_err(|e| NavigationError::SchemaValidationFailed {
                reason: format!("Invalid JSON for pretty printing: {}", e),
            })?;

        serde_json::to_string_pretty(&value)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to pretty print JSON: {}", e),
            })
    }

    /// Minify JSON by removing whitespace
    pub fn minify_json(json: &str) -> Result<String, NavigationError> {
        let value: serde_json::Value = serde_json::from_str(json)
            .map_err(|e| NavigationError::SchemaValidationFailed {
                reason: format!("Invalid JSON for minification: {}", e),
            })?;

        serde_json::to_string(&value)
            .map_err(|e| NavigationError::SessionSerializationFailed {
                reason: format!("Failed to minify JSON: {}", e),
            })
    }
}

// Add required dependencies to Cargo.toml
#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::navigation::NavigationHistory;
    use std::path::PathBuf;

    #[test]
    fn test_serialization_config_default() {
        let config = SerializationConfig::default();
        assert!(matches!(config.default_format, SerializationFormat::JsonPretty));
        assert!(!config.compress);
        assert!(!config.encrypt);
        assert!(config.create_backups);
    }

    #[test]
    fn test_navigation_history_serialization() {
        let history = NavigationHistory::new(PathBuf::from("/test/project"), 100);
        let serializer = NavigationSerializer::default();
        
        let result = serializer.serialize(&history);
        assert!(result.is_ok());
        
        let serialized = result.unwrap();
        assert!(serialized.data.len() > 0);
        assert!(!serialized.metadata.checksum.is_empty());
    }

    #[test]
    fn test_checksum_calculation() {
        let serializer = NavigationSerializer::default();
        let data = b"test data";
        let checksum1 = serializer.calculate_checksum(data);
        let checksum2 = serializer.calculate_checksum(data);
        
        assert_eq!(checksum1, checksum2);
        assert!(!checksum1.is_empty());
    }
}