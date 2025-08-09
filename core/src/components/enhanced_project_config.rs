// [[SECONDARY_MIND_CORE]]/src/components/enhanced_project_config.rs
// Purpose: Enhanced project configuration system with analysis, search, AI, and UI settings
// Architecture: Extends existing project configuration with advanced settings and validation
// Dependencies: serde for JSON serialization, chrono for timestamps, validation system

use crate::components::home_directory_manager::HomeDirectoryManager;
use crate::errors::SecondaryMindError;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Enhanced project configuration with advanced settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedProjectConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub version: String,
    pub analysis: AnalysisConfig,
    pub search: SearchConfig,
    pub ai: AIConfig,
    pub ui: UIConfig,
    pub team: TeamConfig,
    pub metadata: ProjectMetadata,
}

/// Analysis configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisConfig {
    pub incremental_enabled: bool,
    pub cache_enabled: bool,
    pub cache_size_mb: u64,
    pub max_file_size_mb: u64,
    pub excluded_patterns: Vec<String>,
    pub included_extensions: Vec<String>,
    pub language_configs: HashMap<String, LanguageConfig>,
    pub auto_analyze_on_change: bool,
    pub analysis_timeout_seconds: u64,
    pub parallel_analysis: bool,
    pub max_parallel_files: usize,
}

/// Language-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageConfig {
    pub enabled: bool,
    pub parser_options: HashMap<String, serde_json::Value>,
    pub custom_patterns: Vec<String>,
    pub symbol_filters: Vec<String>,
}

/// Search configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchConfig {
    pub fuzzy_search_enabled: bool,
    pub fuzzy_threshold: f64,
    pub regex_search_enabled: bool,
    pub case_sensitive_default: bool,
    pub max_search_results: usize,
    pub search_history_size: usize,
    pub index_comments: bool,
    pub index_strings: bool,
    pub semantic_search_enabled: bool,
    pub search_scope_default: SearchScope,
}

/// Search scope options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchScope {
    CurrentFile,
    OpenFiles,
    ProjectFiles,
    AllFiles,
}

/// AI configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub enabled: bool,
    pub provider: String,
    pub model: String,
    pub context_window_size: usize,
    pub temperature: f64,
    pub max_tokens: usize,
    pub include_file_context: bool,
    pub include_symbol_context: bool,
    pub include_git_context: bool,
    pub custom_prompts: HashMap<String, String>,
    pub response_caching: bool,
    pub cache_ttl_hours: u64,
}

/// UI configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIConfig {
    pub theme: String,
    pub symbol_explorer_expanded: bool,
    pub search_panel_position: PanelPosition,
    pub ai_chat_position: PanelPosition,
    pub show_minimap: bool,
    pub show_breadcrumbs: bool,
    pub auto_save_layout: bool,
    pub keyboard_shortcuts: HashMap<String, String>,
    pub font_size: u32,
    pub line_height: f64,
}

/// Panel position options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PanelPosition {
    Left,
    Right,
    Bottom,
    Floating,
}

/// Team configuration for sharing settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamConfig {
    pub shared_settings_enabled: bool,
    pub team_id: Option<String>,
    pub shared_analysis_rules: Vec<String>,
    pub shared_search_filters: Vec<String>,
    pub shared_ai_prompts: HashMap<String, String>,
    pub enforce_coding_standards: bool,
    pub custom_rules: Vec<CustomRule>,
}

/// Custom analysis or validation rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub rule_type: RuleType,
    pub pattern: String,
    pub severity: RuleSeverity,
    pub enabled: bool,
}

/// Rule type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleType {
    NamingConvention,
    CodeStructure,
    Documentation,
    Performance,
    Security,
    Custom,
}

/// Rule severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Project metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub symbol_count: usize,
    pub file_count: usize,
    pub git_branch: Option<String>,
    pub git_status: Option<String>,
    pub build_system: Option<String>,
    pub dependencies: Vec<String>,
    pub tags: Vec<String>,
    pub notes_count: usize,
    pub last_analysis_duration_ms: Option<u64>,
    pub analysis_errors: Vec<String>,
}

impl Default for AnalysisConfig {
    fn default() -> Self {
        Self {
            incremental_enabled: true,
            cache_enabled: true,
            cache_size_mb: 512,
            max_file_size_mb: 10,
            excluded_patterns: vec![
                "node_modules".to_string(),
                "target".to_string(),
                ".git".to_string(),
                "dist".to_string(),
                "build".to_string(),
                "*.min.js".to_string(),
                "*.bundle.js".to_string(),
            ],
            included_extensions: vec![
                "rs".to_string(),
                "js".to_string(),
                "ts".to_string(),
                "py".to_string(),
                "java".to_string(),
                "cpp".to_string(),
                "c".to_string(),
                "h".to_string(),
                "go".to_string(),
                "rb".to_string(),
                "php".to_string(),
                "cs".to_string(),
            ],
            language_configs: HashMap::new(),
            auto_analyze_on_change: true,
            analysis_timeout_seconds: 300,
            parallel_analysis: true,
            max_parallel_files: 8,
        }
    }
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            fuzzy_search_enabled: true,
            fuzzy_threshold: 0.6,
            regex_search_enabled: true,
            case_sensitive_default: false,
            max_search_results: 1000,
            search_history_size: 50,
            index_comments: true,
            index_strings: false,
            semantic_search_enabled: true,
            search_scope_default: SearchScope::ProjectFiles,
        }
    }
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            provider: "gemini".to_string(),
            model: "gemini-pro".to_string(),
            context_window_size: 8192,
            temperature: 0.7,
            max_tokens: 2048,
            include_file_context: true,
            include_symbol_context: true,
            include_git_context: false,
            custom_prompts: HashMap::new(),
            response_caching: true,
            cache_ttl_hours: 24,
        }
    }
}

impl Default for UIConfig {
    fn default() -> Self {
        let mut shortcuts = HashMap::new();
        shortcuts.insert("search_symbols".to_string(), "Ctrl+P".to_string());
        shortcuts.insert("goto_line".to_string(), "Ctrl+G".to_string());
        shortcuts.insert("find_references".to_string(), "F12".to_string());
        shortcuts.insert("goto_definition".to_string(), "Ctrl+F12".to_string());
        shortcuts.insert("toggle_ai_chat".to_string(), "Ctrl+Shift+A".to_string());
        
        Self {
            theme: "dark".to_string(),
            symbol_explorer_expanded: true,
            search_panel_position: PanelPosition::Left,
            ai_chat_position: PanelPosition::Right,
            show_minimap: true,
            show_breadcrumbs: true,
            auto_save_layout: true,
            keyboard_shortcuts: shortcuts,
            font_size: 14,
            line_height: 1.5,
        }
    }
}

impl Default for TeamConfig {
    fn default() -> Self {
        Self {
            shared_settings_enabled: false,
            team_id: None,
            shared_analysis_rules: Vec::new(),
            shared_search_filters: Vec::new(),
            shared_ai_prompts: HashMap::new(),
            enforce_coding_standards: false,
            custom_rules: Vec::new(),
        }
    }
}

impl Default for ProjectMetadata {
    fn default() -> Self {
        Self {
            symbol_count: 0,
            file_count: 0,
            git_branch: None,
            git_status: None,
            build_system: None,
            dependencies: Vec::new(),
            tags: Vec::new(),
            notes_count: 0,
            last_analysis_duration_ms: None,
            analysis_errors: Vec::new(),
        }
    }
}

impl Default for EnhancedProjectConfig {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            path: String::new(),
            created_at: Utc::now(),
            last_accessed: Utc::now(),
            version: "1.0.0".to_string(),
            analysis: AnalysisConfig::default(),
            search: SearchConfig::default(),
            ai: AIConfig::default(),
            ui: UIConfig::default(),
            team: TeamConfig::default(),
            metadata: ProjectMetadata::default(),
        }
    }
}
// Configuration validation result
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

/// Configuration validation error
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub suggested_fix: Option<String>,
}

/// Configuration validation warning
#[derive(Debug, Clone)]
pub struct ValidationWarning {
    pub field: String,
    pub message: String,
    pub suggestion: Option<String>,
}

/// Configuration template for common project types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub project_type: ProjectType,
    pub config: EnhancedProjectConfig,
}

/// Project type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectType {
    RustLibrary,
    RustBinary,
    NodeJsApp,
    ReactApp,
    PythonApp,
    JavaApp,
    CppApp,
    GoApp,
    Generic,
}

/// Enhanced project configuration service
pub struct EnhancedProjectConfigService {
    home_manager: HomeDirectoryManager,
    templates: Vec<ConfigTemplate>,
    config_cache: HashMap<String, EnhancedProjectConfig>,
}

impl EnhancedProjectConfigService {
    /// Creates a new enhanced project configuration service
    pub fn new() -> Result<Self, SecondaryMindError> {
        let home_manager = HomeDirectoryManager::new()?;
        let templates = Self::load_default_templates();
        
        Ok(Self {
            home_manager,
            templates,
            config_cache: HashMap::new(),
        })
    }
    
    /// Creates or updates an enhanced project configuration
    pub fn save_enhanced_config(&mut self, project_path: &Path, config: EnhancedProjectConfig) -> Result<(), SecondaryMindError> {
        // Validate configuration before saving
        let validation = self.validate_config(&config)?;
        if !validation.is_valid {
            return Err(SecondaryMindError::ConfigError(format!(
                "Configuration validation failed: {:?}", 
                validation.errors
            )));
        }
        
        // Ensure project directory exists
        self.home_manager.ensure_project_dir(project_path)?;
        
        let project_dir = self.home_manager.get_project_dir(project_path);
        let config_path = project_dir.join("enhanced_config.json");
        
        // Save configuration
        let config_json = serde_json::to_string_pretty(&config).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to serialize enhanced config: {}", e))
        })?;
        
        fs::write(&config_path, config_json).map_err(|e| {
            SecondaryMindError::IoError { path: config_path.clone(), source: e }
        })?;
        
        // Update cache
        self.config_cache.insert(config.id.clone(), config);
        
        Ok(())
    }
    
    /// Loads an enhanced project configuration
    pub fn load_enhanced_config(&mut self, project_path: &Path) -> Result<Option<EnhancedProjectConfig>, SecondaryMindError> {
        let project_id = HomeDirectoryManager::generate_project_id(project_path);
        
        // Check cache first
        if let Some(config) = self.config_cache.get(&project_id) {
            return Ok(Some(config.clone()));
        }
        
        let project_dir = self.home_manager.get_project_dir(project_path);
        let config_path = project_dir.join("enhanced_config.json");
        
        if !config_path.exists() {
            return Ok(None);
        }
        
        let content = fs::read_to_string(&config_path).map_err(|e| {
            SecondaryMindError::IoError { path: config_path, source: e }
        })?;
        
        let mut config: EnhancedProjectConfig = serde_json::from_str(&content).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to parse enhanced config: {}", e))
        })?;
        
        // Perform migration if needed
        config = self.migrate_config(config)?;
        
        // Cache the configuration
        self.config_cache.insert(project_id, config.clone());
        
        Ok(Some(config))
    }
    
    /// Creates a new project configuration from a template
    pub fn create_from_template(&self, project_path: &Path, template_id: &str) -> Result<EnhancedProjectConfig, SecondaryMindError> {
        let template = self.templates.iter()
            .find(|t| t.id == template_id)
            .ok_or_else(|| SecondaryMindError::ConfigError(format!("Template not found: {}", template_id)))?;
        
        let project_id = HomeDirectoryManager::generate_project_id(project_path);
        let project_name = project_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown Project")
            .to_string();
        
        let mut config = template.config.clone();
        config.id = project_id;
        config.name = project_name;
        config.path = project_path.to_string_lossy().to_string();
        config.created_at = Utc::now();
        config.last_accessed = Utc::now();
        
        // Detect build system and adjust configuration
        self.detect_and_configure_build_system(&mut config, project_path)?;
        
        Ok(config)
    }
    
    /// Validates a configuration
    pub fn validate_config(&self, config: &EnhancedProjectConfig) -> Result<ValidationResult, SecondaryMindError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        // Validate basic fields
        if config.id.is_empty() {
            errors.push(ValidationError {
                field: "id".to_string(),
                message: "Project ID cannot be empty".to_string(),
                suggested_fix: Some("Generate a unique project ID".to_string()),
            });
        }
        
        if config.name.is_empty() {
            errors.push(ValidationError {
                field: "name".to_string(),
                message: "Project name cannot be empty".to_string(),
                suggested_fix: Some("Set a descriptive project name".to_string()),
            });
        }
        
        // Validate analysis configuration
        if config.analysis.cache_size_mb == 0 {
            warnings.push(ValidationWarning {
                field: "analysis.cache_size_mb".to_string(),
                message: "Cache size is set to 0, which may impact performance".to_string(),
                suggestion: Some("Consider setting cache size to at least 64MB".to_string()),
            });
        }
        
        if config.analysis.cache_size_mb > 2048 {
            warnings.push(ValidationWarning {
                field: "analysis.cache_size_mb".to_string(),
                message: "Cache size is very large, which may consume excessive memory".to_string(),
                suggestion: Some("Consider reducing cache size to under 1GB".to_string()),
            });
        }
        
        if config.analysis.max_file_size_mb > 100 {
            warnings.push(ValidationWarning {
                field: "analysis.max_file_size_mb".to_string(),
                message: "Maximum file size is very large, which may impact performance".to_string(),
                suggestion: Some("Consider reducing max file size to under 50MB".to_string()),
            });
        }
        
        // Validate search configuration
        if config.search.fuzzy_threshold < 0.0 || config.search.fuzzy_threshold > 1.0 {
            errors.push(ValidationError {
                field: "search.fuzzy_threshold".to_string(),
                message: "Fuzzy threshold must be between 0.0 and 1.0".to_string(),
                suggested_fix: Some("Set fuzzy threshold to a value between 0.0 and 1.0".to_string()),
            });
        }
        
        if config.search.max_search_results == 0 {
            errors.push(ValidationError {
                field: "search.max_search_results".to_string(),
                message: "Maximum search results cannot be 0".to_string(),
                suggested_fix: Some("Set max search results to at least 10".to_string()),
            });
        }
        
        // Validate AI configuration
        if config.ai.enabled {
            if config.ai.provider.is_empty() {
                errors.push(ValidationError {
                    field: "ai.provider".to_string(),
                    message: "AI provider cannot be empty when AI is enabled".to_string(),
                    suggested_fix: Some("Set AI provider to a valid value (e.g., 'gemini')".to_string()),
                });
            }
            
            if config.ai.model.is_empty() {
                errors.push(ValidationError {
                    field: "ai.model".to_string(),
                    message: "AI model cannot be empty when AI is enabled".to_string(),
                    suggested_fix: Some("Set AI model to a valid value (e.g., 'gemini-pro')".to_string()),
                });
            }
            
            if config.ai.temperature < 0.0 || config.ai.temperature > 2.0 {
                warnings.push(ValidationWarning {
                    field: "ai.temperature".to_string(),
                    message: "AI temperature should typically be between 0.0 and 2.0".to_string(),
                    suggestion: Some("Consider setting temperature between 0.1 and 1.0".to_string()),
                });
            }
        }
        
        // Validate UI configuration
        if config.ui.font_size < 8 || config.ui.font_size > 72 {
            warnings.push(ValidationWarning {
                field: "ui.font_size".to_string(),
                message: "Font size should typically be between 8 and 72".to_string(),
                suggestion: Some("Consider setting font size between 10 and 24".to_string()),
            });
        }
        
        if config.ui.line_height < 1.0 || config.ui.line_height > 3.0 {
            warnings.push(ValidationWarning {
                field: "ui.line_height".to_string(),
                message: "Line height should typically be between 1.0 and 3.0".to_string(),
                suggestion: Some("Consider setting line height between 1.2 and 2.0".to_string()),
            });
        }
        
        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }
    
    /// Migrates configuration to the latest version
    pub fn migrate_config(&self, mut config: EnhancedProjectConfig) -> Result<EnhancedProjectConfig, SecondaryMindError> {
        let current_version = "1.0.0";
        
        if config.version != current_version {
            // Perform version-specific migrations
            match config.version.as_str() {
                "0.9.0" => {
                    // Migration from 0.9.0 to 1.0.0
                    // Add any new fields with default values
                    if config.analysis.language_configs.is_empty() {
                        config.analysis.language_configs = HashMap::new();
                    }
                    
                    // Update version
                    config.version = current_version.to_string();
                }
                _ => {
                    // Unknown version, reset to defaults but preserve basic info
                    let id = config.id.clone();
                    let name = config.name.clone();
                    let path = config.path.clone();
                    let created_at = config.created_at;
                    
                    config = EnhancedProjectConfig::default();
                    config.id = id;
                    config.name = name;
                    config.path = path;
                    config.created_at = created_at;
                    config.last_accessed = Utc::now();
                    config.version = current_version.to_string();
                }
            }
        }
        
        Ok(config)
    }
    
    /// Exports configuration for team sharing
    pub fn export_config(&self, config: &EnhancedProjectConfig, include_personal_settings: bool) -> Result<String, SecondaryMindError> {
        let mut export_config = config.clone();
        
        if !include_personal_settings {
            // Remove personal UI preferences
            export_config.ui = UIConfig::default();
            
            // Remove personal AI settings
            export_config.ai.custom_prompts.clear();
            
            // Keep only shared team settings
            export_config.team.shared_settings_enabled = true;
        }
        
        serde_json::to_string_pretty(&export_config).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to export config: {}", e))
        })
    }
    
    /// Imports configuration from team sharing
    pub fn import_config(&self, config_json: &str, merge_with_existing: bool, existing_config: Option<&EnhancedProjectConfig>) -> Result<EnhancedProjectConfig, SecondaryMindError> {
        let imported_config: EnhancedProjectConfig = serde_json::from_str(config_json).map_err(|e| {
            SecondaryMindError::ConfigError(format!("Failed to parse imported config: {}", e))
        })?;
        
        if merge_with_existing {
            if let Some(existing) = existing_config {
                let mut merged_config = existing.clone();
                
                // Merge analysis settings
                merged_config.analysis.excluded_patterns = imported_config.analysis.excluded_patterns;
                merged_config.analysis.included_extensions = imported_config.analysis.included_extensions;
                merged_config.analysis.language_configs = imported_config.analysis.language_configs;
                
                // Merge search settings
                merged_config.search = imported_config.search;
                
                // Merge team settings
                merged_config.team = imported_config.team;
                
                // Keep existing personal settings (UI, personal AI prompts)
                merged_config.last_accessed = Utc::now();
                
                Ok(merged_config)
            } else {
                Ok(imported_config)
            }
        } else {
            Ok(imported_config)
        }
    }
    
    /// Gets available configuration templates
    pub fn get_templates(&self) -> &[ConfigTemplate] {
        &self.templates
    }
    
    /// Detects build system and configures accordingly
    fn detect_and_configure_build_system(&self, config: &mut EnhancedProjectConfig, project_path: &Path) -> Result<(), SecondaryMindError> {
        // Check for Cargo.toml (Rust)
        if project_path.join("Cargo.toml").exists() {
            config.metadata.build_system = Some("cargo".to_string());
            config.analysis.excluded_patterns.push("target".to_string());
            
            // Add Rust-specific language config
            let mut rust_config = LanguageConfig {
                enabled: true,
                parser_options: HashMap::new(),
                custom_patterns: vec!["*.rs".to_string()],
                symbol_filters: Vec::new(),
            };
            rust_config.parser_options.insert("include_tests".to_string(), serde_json::Value::Bool(true));
            config.analysis.language_configs.insert("rust".to_string(), rust_config);
        }
        
        // Check for package.json (Node.js)
        if project_path.join("package.json").exists() {
            config.metadata.build_system = Some("npm".to_string());
            config.analysis.excluded_patterns.push("node_modules".to_string());
            config.analysis.excluded_patterns.push("dist".to_string());
            
            // Add JavaScript/TypeScript language config
            let js_config = LanguageConfig {
                enabled: true,
                parser_options: HashMap::new(),
                custom_patterns: vec!["*.js".to_string(), "*.ts".to_string(), "*.jsx".to_string(), "*.tsx".to_string()],
                symbol_filters: Vec::new(),
            };
            config.analysis.language_configs.insert("javascript".to_string(), js_config);
        }
        
        // Check for pom.xml (Maven) or build.gradle (Gradle)
        if project_path.join("pom.xml").exists() {
            config.metadata.build_system = Some("maven".to_string());
            config.analysis.excluded_patterns.push("target".to_string());
        } else if project_path.join("build.gradle").exists() || project_path.join("build.gradle.kts").exists() {
            config.metadata.build_system = Some("gradle".to_string());
            config.analysis.excluded_patterns.push("build".to_string());
        }
        
        // Check for go.mod (Go)
        if project_path.join("go.mod").exists() {
            config.metadata.build_system = Some("go".to_string());
            
            let go_config = LanguageConfig {
                enabled: true,
                parser_options: HashMap::new(),
                custom_patterns: vec!["*.go".to_string()],
                symbol_filters: Vec::new(),
            };
            config.analysis.language_configs.insert("go".to_string(), go_config);
        }
        
        // Check for CMakeLists.txt (CMake)
        if project_path.join("CMakeLists.txt").exists() {
            config.metadata.build_system = Some("cmake".to_string());
            config.analysis.excluded_patterns.push("build".to_string());
            config.analysis.excluded_patterns.push("cmake-build-*".to_string());
        }
        
        Ok(())
    }

     /// Loads default configuration templates
     fn load_default_templates() -> Vec<ConfigTemplate> {
        vec![
            // Rust Library Template
            ConfigTemplate {
                id: "rust-library".to_string(),
                name: "Rust Library".to_string(),
                description: "Configuration optimized for Rust library projects".to_string(),
                project_type: ProjectType::RustLibrary,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec!["rs".to_string()],
                        excluded_patterns: vec![
                            "target".to_string(),
                            "Cargo.lock".to_string(),
                        ],
                        parallel_analysis: true,
                        max_parallel_files: 8,
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        semantic_search_enabled: true,
                        index_comments: true,
                        ..SearchConfig::default()
                    },
                    ai: AIConfig {
                        include_symbol_context: true,
                        include_file_context: true,
                        ..AIConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // React App Template
            ConfigTemplate {
                id: "react-app".to_string(),
                name: "React Application".to_string(),
                description: "Configuration optimized for React applications".to_string(),
                project_type: ProjectType::ReactApp,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec![
                            "js".to_string(),
                            "jsx".to_string(),
                            "ts".to_string(),
                            "tsx".to_string(),
                            "css".to_string(),
                            "scss".to_string(),
                        ],
                        excluded_patterns: vec![
                            "node_modules".to_string(),
                            "build".to_string(),
                            "dist".to_string(),
                            "*.min.js".to_string(),
                            "*.bundle.js".to_string(),
                        ],
                        max_file_size_mb: 5, // Smaller for web assets
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        index_strings: true, // Useful for JSX strings
                        max_search_results: 500,
                        ..SearchConfig::default()
                    },
                    ui: UIConfig {
                        show_minimap: false, // Less useful for web development
                        ..UIConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // Python App Template
            ConfigTemplate {
                id: "python-app".to_string(),
                name: "Python Application".to_string(),
                description: "Configuration optimized for Python applications".to_string(),
                project_type: ProjectType::PythonApp,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec![
                            "py".to_string(),
                            "pyx".to_string(),
                            "pyi".to_string(),
                        ],
                        excluded_patterns: vec![
                            "__pycache__".to_string(),
                            "*.pyc".to_string(),
                            ".venv".to_string(),
                            "venv".to_string(),
                            "env".to_string(),
                            "dist".to_string(),
                            "build".to_string(),
                            "*.egg-info".to_string(),
                        ],
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        semantic_search_enabled: true,
                        index_comments: true,
                        ..SearchConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // Java App Template
            ConfigTemplate {
                id: "java-app".to_string(),
                name: "Java Application".to_string(),
                description: "Configuration optimized for Java applications".to_string(),
                project_type: ProjectType::JavaApp,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec![
                            "java".to_string(),
                            "kt".to_string(), // Kotlin support
                            "scala".to_string(),
                        ],
                        excluded_patterns: vec![
                            "target".to_string(),
                            "build".to_string(),
                            "*.class".to_string(),
                            "*.jar".to_string(),
                            ".gradle".to_string(),
                        ],
                        max_file_size_mb: 20, // Java files can be larger
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        semantic_search_enabled: true,
                        max_search_results: 2000, // Java projects can be large
                        ..SearchConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // C++ App Template
            ConfigTemplate {
                id: "cpp-app".to_string(),
                name: "C++ Application".to_string(),
                description: "Configuration optimized for C++ applications".to_string(),
                project_type: ProjectType::CppApp,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec![
                            "cpp".to_string(),
                            "cxx".to_string(),
                            "cc".to_string(),
                            "c".to_string(),
                            "h".to_string(),
                            "hpp".to_string(),
                            "hxx".to_string(),
                        ],
                        excluded_patterns: vec![
                            "build".to_string(),
                            "cmake-build-*".to_string(),
                            "*.o".to_string(),
                            "*.obj".to_string(),
                            "*.exe".to_string(),
                            "*.dll".to_string(),
                            "*.so".to_string(),
                        ],
                        max_file_size_mb: 15,
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        regex_search_enabled: true, // Useful for C++ macros
                        index_comments: true,
                        ..SearchConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // Go App Template
            ConfigTemplate {
                id: "go-app".to_string(),
                name: "Go Application".to_string(),
                description: "Configuration optimized for Go applications".to_string(),
                project_type: ProjectType::GoApp,
                config: EnhancedProjectConfig {
                    analysis: AnalysisConfig {
                        included_extensions: vec!["go".to_string()],
                        excluded_patterns: vec![
                            "vendor".to_string(),
                            "*.exe".to_string(),
                        ],
                        parallel_analysis: true,
                        ..AnalysisConfig::default()
                    },
                    search: SearchConfig {
                        fuzzy_search_enabled: true,
                        semantic_search_enabled: true,
                        ..SearchConfig::default()
                    },
                    ..EnhancedProjectConfig::default()
                },
            },
            
            // Generic Template
            ConfigTemplate {
                id: "generic".to_string(),
                name: "Generic Project".to_string(),
                description: "Basic configuration suitable for any project type".to_string(),
                project_type: ProjectType::Generic,
                config: EnhancedProjectConfig::default(),
            },
        ]
    }
}    
   
    
// Integration: Used by enhanced analysis engine and Tauri commands for advanced project configuration management.
// Notes: Provides comprehensive project configuration with validation, templates, and team sharing capabilities.