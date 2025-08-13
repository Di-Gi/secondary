// [[PROJECT_NAME]]/desktop/src/commands.rs
// Purpose: [Enhanced Tauri commands with polyglot analysis capabilities. All models are now imported from the core crate.]
// Architecture: [This file acts as the bridge between the frontend and the `secondary-mind-core` library. It has been updated to remove redundant models and support Rust file analysis.]
// Dependencies: [secondary-mind-core (for all models and logic), Tauri, WalkDir.]
use secondary_mind_core::{
    components::{
        ai_synthesis_core::{AISynthesisCore, ContextBuilder},
        search_index_manager::{SearchIndexManager, SearchFilters},
        session_manager::{SessionManager, SessionConfig},
        file_system_watcher::FileSystemWatcher,
        codebase_cartographer::CodebaseCartographer,
        code_source_controller::{CodeSourceController, GitFileStatus},
        project_configuration_service::ProjectConfigurationService,
        home_directory_manager::HomeDirectoryManager,
        cache_manager::CacheManager,
        navigation_manager::NavigationManager,
        navigation_session_manager::{NavigationSessionManager, NavigationSessionConfig, NavigationSessionMetadata},
        navigation_cache::{NavigationCache, NavigationMetrics},
        symbol_relationship_tracker::{RelationshipAnalysis, SymbolRelationship, RelationshipType},
    },
    model::{project::Project, symbol::{Symbol, FileStructureAnalysis}, session::ProjectSession},
    ProjectConfig, RecentProjects, NavigationHistory, 
    NavSessionData as NavigationSessionData, // Use the new navigation session data
};
use crate::AppState;
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::State;
use tokio::fs;
use serde::{Serialize, Deserialize};

#[derive(serde::Serialize)]
pub struct AnalysisResult {
    pub symbols: Vec<Symbol>,
    pub git_status: Option<(String, String)>,
    pub project_path: String,
    pub project_config: ProjectConfig,
    pub analysis_time: String,
    pub file_count: usize,
    pub cache_hit_rate: f64,
}

#[derive(serde::Serialize)]
pub struct GitStatus {
    pub local_branch: String,
    pub remote_status: String,
}

#[derive(Serialize, Deserialize)]
pub struct ProjectNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_modified: chrono::DateTime<chrono::Utc>,
    pub tags: Vec<String>,
    pub is_favorited: bool,
}

#[derive(Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub filters: Option<SearchFilters>,
    pub max_results: Option<usize>,
}

#[derive(Serialize, Deserialize)]
pub struct AIRequest {
    pub query: String,
    pub context: Option<ContextBuilder>,
    pub response_type: String,
}

#[tauri::command]
pub async fn initialize_app() -> Result<(), String> {
    HomeDirectoryManager::new().map_err(|e| e.to_string())?;
    log::info!("Secondary Mind home directory initialized");
    Ok(())
}

#[tauri::command]
pub async fn load_recent_projects() -> Result<RecentProjects, String> {
    let config_service = ProjectConfigurationService::new().map_err(|e| e.to_string())?;
    config_service.load_recent_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn analyze_project(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<AnalysisResult, String> {
    let path = PathBuf::from(&project_path);
    let mut project = Project::new(&path).map_err(|e| e.to_string())?;
    
    // Use enhanced analysis engine or fallback to cartographer
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project.root, &cartographer);
    
    project.symbolic_map = symbols.clone();
    
    let git_status = if project.repository.is_some() {
        let controller = CodeSourceController::new(&path).map_err(|e| e.to_string())?;
        controller.check_git_status().ok()
    } else {
        None
    };
    
    let config_service = ProjectConfigurationService::new().map_err(|e| e.to_string())?;
    let project_config = config_service
        .save_project_config(&path, symbols.len(), git_status.clone())
        .map_err(|e| e.to_string())?;
    
    *state.current_project.lock().unwrap() = Some(project);
    
    Ok(AnalysisResult {
        symbols,
        git_status,
        project_path,
        project_config,
        analysis_time: format!("{:?}", std::time::SystemTime::now()),
        file_count: 0, // TODO: Count files
        cache_hit_rate: 0.0, // TODO: Get from cache manager
    })
}

// Helper function to scan project for symbols
fn scan_project_for_symbols(root: &std::path::Path, cartographer: &CodebaseCartographer) -> Vec<Symbol> {
    let mut symbols = Vec::new();
    let walker = walkdir::WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_excluded(e));

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            // The cartographer now handles the logic of which files to parse
            if let Ok(file_symbols) = cartographer.parse_file(path) {
                if !file_symbols.is_empty() {
                    symbols.extend(file_symbols);
                }
            }
        }
    }
    symbols
}

// Checks if a file or directory should be excluded from parsing.
fn is_excluded(entry: &walkdir::DirEntry) -> bool {
    let file_name = entry.file_name().to_str().unwrap_or("");
    if file_name.starts_with('.') {
        return true;
    }
    if entry.file_type().is_dir() {
        matches!(file_name, "node_modules" | "target" | "dist" | "build" | "out" | "vendor")
    } else {
        false
    }
}


// --- Other commands remain unchanged but are included for completeness ---

#[tauri::command]
pub async fn remove_project_from_recent(project_id: String) -> Result<(), String> {
    let config_service = ProjectConfigurationService::new().map_err(|e| e.to_string())?;
    config_service.remove_from_recent(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_git_status(
    state: State<'_, AppState>,
) -> Result<Option<GitStatus>, String> {
    let project_guard = state.current_project.lock().unwrap();
    if let Some(project) = project_guard.as_ref() {
        if project.repository.is_some() {
            let controller = CodeSourceController::new(&project.root).map_err(|e| e.to_string())?;
            let (local_branch, remote_status) = controller.check_git_status().map_err(|e| e.to_string())?;
            Ok(Some(GitStatus {
                local_branch,
                remote_status,
            }))
        } else {
            Ok(None)
        }
    } else {
        Err("No project currently loaded".to_string())
    }
}

#[tauri::command]
pub async fn synthesize_guidance(
    query: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let relevant_files = {
        let project_guard = state.current_project.lock().unwrap();
        let project = project_guard.as_ref().ok_or("No project currently loaded")?;
        
        let query_keywords: Vec<String> = query.split_whitespace().map(|s| s.to_lowercase()).collect();
        let mut files = HashSet::new();
        
        for symbol in &project.symbolic_map {
            for keyword in &query_keywords {
                if symbol.identifier.to_lowercase().contains(keyword) {
                    files.insert(symbol.location.path.clone());
                    break;
                }
            }
        }
        files
    };

    if relevant_files.is_empty() {
        return Ok("No relevant symbols found in the codebase for your query.".to_string());
    }
    
    let mut context = String::new();
    context.push_str("Based on the following code files, please answer the user's query.\n\n");
    context.push_str(&format!("User Query: {}\n\n---\n\n", query));
    
    for file_path in relevant_files {
        let content = fs::read_to_string(&file_path).await.map_err(|e| {
            format!("Failed to read file {}: {}", file_path.display(), e)
        })?;
        context.push_str(&format!("// File: {}\n{}\n\n", file_path.display(), content));
    }
    
    let ai_core = AISynthesisCore::new().map_err(|e| e.to_string())?;
    ai_core.synthesize_guidance(context).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_project_note(
    project_path: String,
    note: ProjectNote,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let home_manager = HomeDirectoryManager::new().map_err(|e| e.to_string())?;
    let notes_dir = home_manager.get_project_notes_dir(&path);
    
    tokio::fs::create_dir_all(&notes_dir).await.map_err(|e| {
        format!("Failed to create notes directory: {}", e)
    })?;
    
    let note_file = notes_dir.join(format!("{}.json", note.id));
    let note_json = serde_json::to_string_pretty(&note).map_err(|e| {
        format!("Failed to serialize note: {}", e)
    })?;
    
    tokio::fs::write(&note_file, note_json).await.map_err(|e| {
        format!("Failed to save note: {}", e)
    })?;
    
    Ok(())
}

#[tauri::command]
pub async fn load_project_notes(project_path: String) -> Result<Vec<ProjectNote>, String> {
    let path = PathBuf::from(&project_path);
    let home_manager = HomeDirectoryManager::new().map_err(|e| e.to_string())?;
    let notes_dir = home_manager.get_project_notes_dir(&path);
    
    if !notes_dir.exists() { return Ok(Vec::new()); }
    
    let mut notes: Vec<ProjectNote> = Vec::new();
    let mut entries = tokio::fs::read_dir(&notes_dir).await.map_err(|e| {
        format!("Failed to read notes directory: {}", e)
    })?;
    
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = tokio::fs::read_to_string(&path).await.map_err(|e| e.to_string())?;
            if let Ok(note) = serde_json::from_str(&content) {
                notes.push(note);
            }
        }
    }
    
    notes.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(notes)
}

#[tauri::command]
pub async fn delete_project_note(
    project_path: String,
    note_id: String,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let home_manager = HomeDirectoryManager::new().map_err(|e| e.to_string())?;
    let note_file = home_manager.get_project_notes_dir(&path).join(format!("{}.json", note_id));
    
    if note_file.exists() {
        tokio::fs::remove_file(&note_file).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// Enhanced search command using SearchIndexManager
#[tauri::command]
pub async fn search_symbols(
    request: SearchRequest,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let project_guard = state.current_project.lock().unwrap();
    let project = project_guard.as_ref().ok_or("No project currently loaded")?;
    
    let search_manager = SearchIndexManager::new();
    let results = search_manager
        .search_symbols(&request.query, &request.filters.unwrap_or_default());
    
    let serialized_results: Vec<serde_json::Value> = results
        .into_iter()
        .take(request.max_results.unwrap_or(50))
        .map(|result| serde_json::to_value(result).unwrap_or_default())
        .collect();
    
    Ok(serialized_results)
}

// Enhanced AI synthesis with context awareness
#[tauri::command]
pub async fn enhanced_ai_synthesis(
    request: AIRequest,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // Check if project exists without holding the lock
    {
        let project_guard = state.current_project.lock().unwrap();
        if project_guard.is_none() {
            return Err("No project currently loaded".to_string());
        }
    }
    
    let mut ai_core = AISynthesisCore::new().map_err(|e| e.to_string())?;
    let context = request.context.unwrap_or(ContextBuilder {
        current_file: None,
        current_file_content: None,
        selected_code: None,
        selection_range: None,
        related_symbols: Vec::new(),
        project_context: None,
    });
    
    let response = ai_core
        .synthesize_with_context(&request.query, &context)
        .await
        .map_err(|e| e.to_string())?;
    
    serde_json::to_value(response).map_err(|e| e.to_string())
}

// Session management commands
#[tauri::command]
pub async fn save_session(
    project_path: String,
    session_data: serde_json::Value,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let session_manager = SessionManager::new(
        PathBuf::from("./sessions"),
        SessionConfig::default()
    ).map_err(|e| e.to_string())?;
    
    let session: ProjectSession = serde_json::from_value(session_data)
        .map_err(|e| format!("Invalid session data: {}", e))?;
    
    session_manager
        .create_session(project_path.clone(), path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_session(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path);
    let session_manager = SessionManager::new(
        PathBuf::from("./sessions"),
        SessionConfig::default()
    ).map_err(|e| e.to_string())?;
    
    match session_manager.get_session(&project_path).await {
        Ok(Some(session)) => serde_json::to_value(session).map_err(|e| e.to_string()),
        Ok(None) => Ok(serde_json::Value::Null),
        Err(e) => Err(e.to_string()),
    }
}

// File watching command
#[tauri::command]
pub async fn start_file_watching(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let (_watcher, _receiver) = FileSystemWatcher::new().map_err(|e| e.to_string())?;
    
    // TODO: Store watcher in app state and handle events
    log::info!("File watching started for project: {}", project_path);
    Ok(())
}

// Navigation Backend Integration Commands

#[tauri::command]
pub async fn analyze_file_structure(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<FileStructureAnalysis, String> {
    let path = PathBuf::from(&file_path);
    
    // Validate file path exists and is within project bounds
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    if !path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }
    
    // Check if we have a current project loaded for security validation
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            // If no project is loaded, allow analysis but be more restrictive
            path.parent().unwrap_or(&path).to_path_buf()
        }
    };
    
    // Security check: ensure file is within project bounds
    let canonical_path = path.canonicalize().map_err(|e| {
        format!("Failed to resolve file path: {}", e)
    })?;
    
    let canonical_root = project_root.canonicalize().map_err(|e| {
        format!("Failed to resolve project root: {}", e)
    })?;
    
    if !canonical_path.starts_with(&canonical_root) {
        return Err("File path is outside project boundary".to_string());
    }
    
    // Create cartographer and perform analysis
    let cartographer = CodebaseCartographer::new();
    
    // Try to use cached result first from NavigationCache
    {
        let mut nav_cache = state.navigation_cache.lock().unwrap();
        if let Some(cached_analysis) = nav_cache.get_file_structure(&canonical_path) {
            log::debug!("Cache hit for file structure: {}", canonical_path.display());
            return Ok(cached_analysis);
        }
    }
    
    // Perform fresh analysis
    let structure_analysis = cartographer.analyze_file_structure(&canonical_path)
        .map_err(|e| e.to_string())?;
    
    // Cache the result in NavigationCache
    {
        let mut nav_cache = state.navigation_cache.lock().unwrap();
        if let Err(e) = nav_cache.cache_file_structure(&canonical_path, structure_analysis.clone()) {
            log::warn!("Failed to cache file structure analysis: {}", e);
        } else {
            log::debug!("Cached file structure analysis for: {}", canonical_path.display());
        }
    }
    
    Ok(structure_analysis)
}

// Navigation Backend Integration Commands - Symbol Relationship Analysis
// Using types from secondary_mind_core::components::symbol_relationship_tracker

// Enhanced File Tree Data Structures

#[derive(Serialize, Deserialize)]
pub struct FileTreeOptions {
    pub include_hidden: Option<bool>,
    pub include_git_ignored: Option<bool>,
    pub max_depth: Option<usize>,
    pub include_metadata: Option<bool>,
    pub git_status_filter: Option<Vec<GitFileStatus>>,
}

impl Default for FileTreeOptions {
    fn default() -> Self {
        Self {
            include_hidden: Some(false),
            include_git_ignored: Some(false),
            max_depth: None,
            include_metadata: Some(true),
            git_status_filter: None,
        }
    }
}

#[derive(Serialize)]
pub struct EnhancedFileTree {
    pub nodes: Vec<FileTreeNode>,
    pub total_files: usize,
    pub total_directories: usize,
    pub analysis_time: String,
}

#[derive(Serialize)]
pub struct FileTreeNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub node_type: FileNodeType,
    pub children: Option<Vec<FileTreeNode>>,
    pub metadata: FileNodeMetadata,
}

#[derive(Serialize)]
pub enum FileNodeType {
    File,
    Directory,
}

#[derive(Serialize)]
pub struct FileNodeMetadata {
    pub symbol_count: usize,
    pub file_size: u64,
    pub last_modified: chrono::DateTime<chrono::Utc>,
    pub git_status: Option<GitFileStatus>,
    pub main_symbols: Vec<Symbol>,
}



#[tauri::command]
pub async fn analyze_symbol_relationships(
    symbol_id: String,
    depth: Option<usize>,
    state: State<'_, AppState>,
) -> Result<RelationshipAnalysis, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Check cache first
    let analysis_depth = depth.unwrap_or(2);
    {
        let mut nav_cache = state.navigation_cache.lock().unwrap();
        if let Some(cached_analysis) = nav_cache.get_symbol_relationships(&symbol_id, analysis_depth) {
            log::debug!("Cache hit for symbol relationships: {}", symbol_id);
            return Ok(cached_analysis);
        }
    }
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find the center symbol
    let center_symbol = symbols.iter()
        .find(|s| relationship_tracker.generate_symbol_id(s) == symbol_id)
        .ok_or_else(|| format!("Symbol not found: {}", symbol_id))?
        .clone();
    
    // Analyze relationships with specified depth
    let relationships = analyze_symbol_relationships_with_depth(
        &relationship_tracker,
        &symbol_id,
        analysis_depth,
        &symbols
    )?;
    
    let result = RelationshipAnalysis {
        center_symbol,
        total_connections: relationships.len(),
        relationships,
        analysis_depth,
    };
    
    // Cache the result
    {
        let mut nav_cache = state.navigation_cache.lock().unwrap();
        nav_cache.cache_symbol_relationships(&symbol_id, analysis_depth, result.clone());
        log::debug!("Cached symbol relationships for: {}", symbol_id);
    }
    
    Ok(result)
}

// Helper function to build symbol relationships across the project
fn build_symbol_relationships(
    project_root: &std::path::Path,
    symbols: &[Symbol],
    tracker: &mut secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
) -> Result<(), String> {
    use walkdir::WalkDir;
    
    // Create a map of symbol names to their IDs for quick lookup
    let mut symbol_name_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for symbol in symbols {
        let symbol_id = tracker.generate_symbol_id(symbol);
        symbol_name_map.entry(symbol.identifier.clone()).or_default().push(symbol_id);
    }
    
    // Walk through all source files and analyze relationships
    let walker = WalkDir::new(project_root)
        .into_iter()
        .filter_entry(|e| !is_excluded(e));
    
    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(extension) = path.extension().and_then(|s| s.to_str()) {
                match extension {
                    "rs" | "ts" | "tsx" | "js" | "jsx" => {
                        analyze_file_relationships(path, symbols, tracker, &symbol_name_map)?;
                    }
                    _ => continue,
                }
            }
        }
    }
    
    Ok(())
}

// Analyze relationships within a single file
fn analyze_file_relationships(
    file_path: &std::path::Path,
    symbols: &[Symbol],
    tracker: &mut secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    symbol_name_map: &std::collections::HashMap<String, Vec<String>>,
) -> Result<(), String> {
    use secondary_mind_core::components::symbol_relationship_tracker::{SymbolReference, ReferenceType, DependencyType};
    
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;
    
    let lines: Vec<&str> = content.lines().collect();
    
    // Find symbols defined in this file
    let file_symbols: Vec<_> = symbols.iter()
        .filter(|s| s.location.path == file_path)
        .collect();
    
    // Analyze each line for symbol references
    for (line_idx, line) in lines.iter().enumerate() {
        let line_number = line_idx + 1;
        
        // Look for function calls, variable references, etc.
        for (symbol_name, symbol_ids) in symbol_name_map {
            if line.contains(symbol_name) {
                // Determine reference type based on context
                let reference_type = determine_reference_type(line, symbol_name);
                
                // Create references for each matching symbol ID
                for symbol_id in symbol_ids {
                    let reference = SymbolReference {
                        symbol_id: symbol_id.clone(),
                        location: secondary_mind_core::model::symbol::SymbolLocation {
                            path: file_path.to_path_buf(),
                            line: line_number,
                            column: line.find(symbol_name).unwrap_or(0) + 1,
                        },
                        reference_type: reference_type.clone(),
                        context: line.trim().to_string(),
                    };
                    
                    tracker.add_symbol_reference(reference)
                        .map_err(|e| format!("Failed to add reference: {}", e))?;
                }
                
                // Add dependencies between symbols in the same file
                for file_symbol in &file_symbols {
                    let file_symbol_id = tracker.generate_symbol_id(file_symbol);
                    for symbol_id in symbol_ids {
                        if file_symbol_id != *symbol_id {
                            let dep_type = match reference_type {
                                ReferenceType::Call => DependencyType::Calls,
                                ReferenceType::TypeUsage => DependencyType::UsesType,
                                ReferenceType::Inheritance => DependencyType::Inherits,
                                ReferenceType::Import => DependencyType::Imports,
                                _ => DependencyType::Uses,
                            };
                            
                            tracker.add_dependency(&file_symbol_id, symbol_id, dep_type)
                                .map_err(|e| format!("Failed to add dependency: {}", e))?;
                        }
                    }
                }
            }
        }
    }
    
    Ok(())
}

// Determine the type of reference based on context
fn determine_reference_type(line: &str, symbol_name: &str) -> secondary_mind_core::components::symbol_relationship_tracker::ReferenceType {
    use secondary_mind_core::components::symbol_relationship_tracker::ReferenceType;
    
    let line_trimmed = line.trim();
    
    // Function call patterns
    if line_trimmed.contains(&format!("{}(", symbol_name)) {
        return ReferenceType::Call;
    }
    
    // Import patterns
    if line_trimmed.starts_with("use ") || line_trimmed.starts_with("import ") {
        return ReferenceType::Import;
    }
    
    // Inheritance patterns
    if line_trimmed.contains("extends") || line_trimmed.contains("implements") || line_trimmed.contains("impl") {
        return ReferenceType::Inheritance;
    }
    
    // Type usage patterns
    if line_trimmed.contains(&format!(": {}", symbol_name)) || 
       line_trimmed.contains(&format!("<{}>", symbol_name)) ||
       line_trimmed.contains(&format!("-> {}", symbol_name)) {
        return ReferenceType::TypeUsage;
    }
    
    // Default to access/reference
    ReferenceType::Access
}

// Analyze relationships with configurable depth
fn analyze_symbol_relationships_with_depth(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    center_symbol_id: &str,
    depth: usize,
    all_symbols: &[Symbol],
) -> Result<Vec<SymbolRelationship>, String> {
    use std::collections::{HashSet, VecDeque};
    
    let mut relationships = Vec::new();
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    
    // Start with the center symbol
    queue.push_back((center_symbol_id.to_string(), 0));
    visited.insert(center_symbol_id.to_string());
    
    while let Some((current_symbol_id, current_depth)) = queue.pop_front() {
        if current_depth >= depth {
            continue;
        }
        
        // Get dependencies (symbols this symbol depends on)
        let dependencies = tracker.get_dependencies(&current_symbol_id);
        for dep_id in dependencies {
            if !visited.contains(&dep_id) {
                visited.insert(dep_id.clone());
                queue.push_back((dep_id.clone(), current_depth + 1));
                
                // Create relationship
                if let Some(relationship) = create_symbol_relationship(
                    tracker,
                    &current_symbol_id,
                    &dep_id,
                    all_symbols,
                    RelationshipType::Uses,
                )? {
                    relationships.push(relationship);
                }
            }
        }
        
        // Get dependents (symbols that depend on this symbol)
        let dependents = tracker.get_dependents(&current_symbol_id);
        for dependent_id in dependents {
            if !visited.contains(&dependent_id) {
                visited.insert(dependent_id.clone());
                queue.push_back((dependent_id.clone(), current_depth + 1));
                
                // Create relationship
                if let Some(relationship) = create_symbol_relationship(
                    tracker,
                    &dependent_id,
                    &current_symbol_id,
                    all_symbols,
                    RelationshipType::Uses,
                )? {
                    relationships.push(relationship);
                }
            }
        }
    }
    
    Ok(relationships)
}

// Create a SymbolRelationship from tracker data
fn create_symbol_relationship(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    source_id: &str,
    target_id: &str,
    all_symbols: &[Symbol],
    relationship_type: RelationshipType,
) -> Result<Option<SymbolRelationship>, String> {
    // Find source and target symbols
    let source_symbol = all_symbols.iter()
        .find(|s| tracker.generate_symbol_id(s) == source_id);
    let target_symbol = all_symbols.iter()
        .find(|s| tracker.generate_symbol_id(s) == target_id);
    
    if let (Some(source), Some(target)) = (source_symbol, target_symbol) {
        // Calculate relationship strength based on usage statistics
        let strength = if let Some(stats) = tracker.get_usage_stats(target_id) {
            (stats.reference_count as f64 / 10.0).min(1.0)
        } else {
            0.5 // Default strength
        };
        
        // Get reference locations
        let references = tracker.find_references(target_id);
        let locations = references.references.into_iter()
            .map(|r| r.location)
            .collect();
        
        Ok(Some(SymbolRelationship {
            relationship_type,
            source: source.clone(),
            target: target.clone(),
            strength,
            locations,
        }))
    } else {
        Ok(None)
    }
}

// Enhanced File Tree Command

#[tauri::command]
pub async fn get_enhanced_file_tree(
    directory_path: String,
    options: Option<FileTreeOptions>,
    state: State<'_, AppState>,
) -> Result<EnhancedFileTree, String> {
    let start_time = std::time::Instant::now();
    let path = PathBuf::from(&directory_path);
    
    // Validate directory path exists
    if !path.exists() {
        return Err(format!("Directory not found: {}", directory_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory_path));
    }
    
    // Security check: ensure directory is within project bounds if project is loaded
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            Some(project.root.clone())
        } else {
            None
        }
    };
    
    if let Some(root) = &project_root {
        let canonical_path = path.canonicalize().map_err(|e| {
            format!("Failed to resolve directory path: {}", e)
        })?;
        
        let canonical_root = root.canonicalize().map_err(|e| {
            format!("Failed to resolve project root: {}", e)
        })?;
        
        if !canonical_path.starts_with(&canonical_root) {
            return Err("Directory path is outside project boundary".to_string());
        }
    }
    
    let options = options.unwrap_or_default();
    
    // Initialize components
    let cartographer = CodebaseCartographer::new();
    let mut cache_manager = CacheManager::new().map_err(|e| e.to_string())?;
    
    // Initialize git controller if we're in a git repository
    let git_controller = if let Some(root) = &project_root {
        CodeSourceController::new(root).ok()
    } else {
        // Try to find git repository from the directory path
        find_git_repository(&path).and_then(|repo_root| {
            CodeSourceController::new(&repo_root).ok()
        })
    };
    
    // Build the file tree
    let mut total_files = 0;
    let mut total_directories = 0;
    
    let nodes = build_file_tree_nodes(
        &path,
        &options,
        &cartographer,
        &mut cache_manager,
        &git_controller,
        &mut total_files,
        &mut total_directories,
        0,
    )?;
    
    let analysis_time = format!("{:.2}ms", start_time.elapsed().as_millis());
    
    Ok(EnhancedFileTree {
        nodes,
        total_files,
        total_directories,
        analysis_time,
    })
}

// Helper function to build file tree nodes recursively
fn build_file_tree_nodes(
    directory: &std::path::Path,
    options: &FileTreeOptions,
    cartographer: &CodebaseCartographer,
    cache_manager: &mut CacheManager,
    git_controller: &Option<CodeSourceController>,
    total_files: &mut usize,
    total_directories: &mut usize,
    current_depth: usize,
) -> Result<Vec<FileTreeNode>, String> {
    use std::fs;
    
    // Check depth limit
    if let Some(max_depth) = options.max_depth {
        if current_depth >= max_depth {
            return Ok(Vec::new());
        }
    }
    
    let mut nodes = Vec::new();
    
    let entries = fs::read_dir(directory).map_err(|e| {
        format!("Failed to read directory {}: {}", directory.display(), e)
    })?;
    
    for entry in entries {
        let entry = entry.map_err(|e| {
            format!("Failed to read directory entry: {}", e)
        })?;
        
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy().to_string();
        
        // Apply filtering options
        if should_exclude_entry(&entry_path, &name, options) {
            continue;
        }
        
        let metadata = entry.metadata().map_err(|e| {
            format!("Failed to read metadata for {}: {}", entry_path.display(), e)
        })?;
        
        let node_type = if metadata.is_dir() {
            *total_directories += 1;
            FileNodeType::Directory
        } else {
            *total_files += 1;
            FileNodeType::File
        };
        
        // Generate unique ID for the node
        let id = generate_file_node_id(&entry_path);
        
        // Build metadata
        let node_metadata = build_file_node_metadata(
            &entry_path,
            &metadata,
            cartographer,
            cache_manager,
            git_controller,
            options,
        )?;
        
        // Build children for directories
        let children = if metadata.is_dir() {
            Some(build_file_tree_nodes(
                &entry_path,
                options,
                cartographer,
                cache_manager,
                git_controller,
                total_files,
                total_directories,
                current_depth + 1,
            )?)
        } else {
            None
        };
        
        let node = FileTreeNode {
            id,
            name,
            path: entry_path.to_string_lossy().to_string(),
            node_type,
            children,
            metadata: node_metadata,
        };
        
        nodes.push(node);
    }
    
    // Sort nodes: directories first, then files, both alphabetically
    nodes.sort_by(|a, b| {
        match (&a.node_type, &b.node_type) {
            (FileNodeType::Directory, FileNodeType::File) => std::cmp::Ordering::Less,
            (FileNodeType::File, FileNodeType::Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(nodes)
}

// Helper function to determine if an entry should be excluded
fn should_exclude_entry(
    path: &std::path::Path,
    name: &str,
    options: &FileTreeOptions,
) -> bool {
    // Hidden files/directories
    if !options.include_hidden.unwrap_or(false) && name.starts_with('.') {
        return true;
    }
    
    // Common excluded directories
    if path.is_dir() {
        match name {
            "node_modules" | "target" | "dist" | "build" | "out" | "vendor" | ".git" => return true,
            _ => {}
        }
    }
    
    false
}

// Helper function to build file node metadata
fn build_file_node_metadata(
    path: &std::path::Path,
    metadata: &std::fs::Metadata,
    cartographer: &CodebaseCartographer,
    cache_manager: &mut CacheManager,
    git_controller: &Option<CodeSourceController>,
    options: &FileTreeOptions,
) -> Result<FileNodeMetadata, String> {
    let file_size = metadata.len();
    let last_modified = metadata.modified()
        .unwrap_or(std::time::SystemTime::now())
        .into();
    
    let mut symbol_count = 0;
    let mut main_symbols = Vec::new();
    
    // Analyze symbols for files (not directories)
    if path.is_file() && options.include_metadata.unwrap_or(true) {
        // Check if this is a source code file we can analyze
        if let Some(extension) = path.extension().and_then(|s| s.to_str()) {
            match extension {
                "rs" | "ts" | "tsx" | "js" | "jsx" => {
                    // Try to get cached analysis first
                    if let Some(cached_file) = cache_manager.get_file_analysis(path) {
                        let current_modified = metadata.modified().unwrap_or(std::time::SystemTime::now());
                        
                        if current_modified == cached_file.last_modified {
                            // Use cached data
                            symbol_count = cached_file.symbols.len();
                            main_symbols = cached_file.symbols.clone();
                        } else {
                            // File changed, re-analyze
                            if let Ok(symbols) = cartographer.parse_file(path) {
                                symbol_count = symbols.len();
                                main_symbols = symbols.clone();
                                
                                // Update cache
                                let file_analysis = secondary_mind_core::components::analysis_engine::FileAnalysisResult {
                                    symbols,
                                    file_path: path.to_path_buf(),
                                    last_modified: current_modified,
                                    content_hash: calculate_file_hash(path).unwrap_or_default(),
                                    dependencies: Vec::new(),
                                };
                                
                                let _ = cache_manager.cache_file_analysis(path, &file_analysis);
                            }
                        }
                    } else {
                        // No cache, analyze fresh
                        if let Ok(symbols) = cartographer.parse_file(path) {
                            symbol_count = symbols.len();
                            main_symbols = symbols.clone();
                            
                            // Cache the result
                            let file_analysis = secondary_mind_core::components::analysis_engine::FileAnalysisResult {
                                symbols,
                                file_path: path.to_path_buf(),
                                last_modified: metadata.modified().unwrap_or(std::time::SystemTime::now()),
                                content_hash: calculate_file_hash(path).unwrap_or_default(),
                                dependencies: Vec::new(),
                            };
                            
                            let _ = cache_manager.cache_file_analysis(path, &file_analysis);
                        }
                    }
                }
                _ => {} // Not a source code file
            }
        }
        
        // Limit main_symbols to avoid overwhelming the response
        main_symbols.truncate(5);
    }
    
    // Get git status
    let git_status = get_file_git_status_helper(path, git_controller);
    
    // Apply git status filter if specified
    if let Some(status_filter) = &options.git_status_filter {
        if let Some(status) = &git_status {
            if !status_filter.contains(status) {
                // This file doesn't match the git status filter, but we still include it
                // The frontend can decide how to handle filtering
            }
        }
    }
    
    Ok(FileNodeMetadata {
        symbol_count,
        file_size,
        last_modified,
        git_status,
        main_symbols,
    })
}

// Helper function to get git status for a file
fn get_file_git_status_helper(
    path: &std::path::Path,
    _git_controller: &Option<CodeSourceController>,
) -> Option<GitFileStatus> {
    // Use direct git2 implementation for now
    // The new Tauri commands provide the enhanced functionality
    if let Some(repo_root) = find_git_repository(path) {
        if let Ok(repo) = git2::Repository::open(&repo_root) {
            // Get relative path from repository root
            if let Ok(relative_path) = path.strip_prefix(&repo_root) {
                if let Ok(statuses) = repo.statuses(None) {
                    for entry in statuses.iter() {
                        if let Some(entry_path) = entry.path() {
                            if std::path::Path::new(entry_path) == relative_path {
                                return Some(git_status_from_flags(entry.status()));
                            }
                        }
                    }
                }
            }
            
            // If not found in status, assume it's clean (tracked and unmodified)
            return Some(GitFileStatus::Clean);
        }
    }
    None
}

// Helper function to convert git2 status flags to our GitFileStatus enum
fn git_status_from_flags(flags: git2::Status) -> GitFileStatus {
    if flags.contains(git2::Status::WT_NEW) || flags.contains(git2::Status::INDEX_NEW) {
        GitFileStatus::Added
    } else if flags.contains(git2::Status::WT_MODIFIED) || flags.contains(git2::Status::INDEX_MODIFIED) {
        GitFileStatus::Modified
    } else if flags.contains(git2::Status::WT_DELETED) || flags.contains(git2::Status::INDEX_DELETED) {
        GitFileStatus::Deleted
    } else if flags.contains(git2::Status::WT_RENAMED) || flags.contains(git2::Status::INDEX_RENAMED) {
        GitFileStatus::Renamed
    } else if flags.contains(git2::Status::IGNORED) {
        GitFileStatus::Ignored
    } else if flags.is_empty() {
        GitFileStatus::Clean
    } else {
        GitFileStatus::Untracked
    }
}

// Helper function to find git repository root
fn find_git_repository(path: &std::path::Path) -> Option<PathBuf> {
    let mut current = path;
    
    loop {
        let git_dir = current.join(".git");
        if git_dir.exists() {
            return Some(current.to_path_buf());
        }
        
        if let Some(parent) = current.parent() {
            current = parent;
        } else {
            break;
        }
    }
    
    None
}

// Helper function to generate unique ID for file nodes
fn generate_file_node_id(path: &std::path::Path) -> String {
    use sha2::{Sha256, Digest};
    
    let path_str = path.to_string_lossy();
    let mut hasher = Sha256::new();
    hasher.update(path_str.as_bytes());
    format!("{:x}", hasher.finalize())[..16].to_string()
}

// Helper function to calculate file hash
fn calculate_file_hash(path: &std::path::Path) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    
    let content = std::fs::read_to_string(path).map_err(|e| {
        format!("Failed to read file content: {}", e)
    })?;
    
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    Ok(format!("{:x}", hasher.finalize()))
}

// Navigation History Persistence Commands

#[tauri::command]
pub async fn save_navigation_history(
    project_path: String,
    history: NavigationHistory,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation manager
    let navigation_manager = NavigationManager::new()
        .map_err(|e| format!("Failed to create navigation manager: {}", e))?;
    
    // Save navigation history
    navigation_manager
        .save_navigation_history(&path, &history)
        .await
        .map_err(|e| format!("Failed to save navigation history: {}", e))?;
    
    log::info!("Saved navigation history for project: {} ({} entries)", 
               project_path, history.entries.len());
    Ok(())
}

#[tauri::command]
pub async fn load_navigation_history(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Option<NavigationHistory>, String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation manager
    let navigation_manager = NavigationManager::new()
        .map_err(|e| format!("Failed to create navigation manager: {}", e))?;
    
    // Load navigation history
    let history = navigation_manager
        .load_navigation_history(&path)
        .await
        .map_err(|e| format!("Failed to load navigation history: {}", e))?;
    
    if let Some(ref hist) = history {
        log::info!("Loaded navigation history for project: {} ({} entries)", 
                   project_path, hist.entries.len());
    } else {
        log::info!("No navigation history found for project: {}", project_path);
    }
    
    Ok(history)
}

#[tauri::command]
pub async fn save_navigation_session(
    project_path: String,
    session: NavigationSessionData,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation session manager
    let config = NavigationSessionConfig::default();
    let navigation_session_manager = NavigationSessionManager::new(config)
        .map_err(|e| format!("Failed to create navigation session manager: {}", e))?;
    
    // Save navigation session
    navigation_session_manager
        .save_navigation_session(project_path.clone(), session.clone())
        .await
        .map_err(|e| format!("Failed to save navigation session: {}", e))?;
    
    log::info!("Saved navigation session '{}' for project: {}", 
               session.name, project_path);
    Ok(())
}

#[tauri::command]
pub async fn load_navigation_session(
    project_path: String,
    session_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Option<NavigationSessionData>, String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation session manager
    let config = NavigationSessionConfig::default();
    let navigation_session_manager = NavigationSessionManager::new(config)
        .map_err(|e| format!("Failed to create navigation session manager: {}", e))?;
    
    // Load navigation session
    let session = navigation_session_manager
        .load_navigation_session(project_path.clone(), session_id)
        .await
        .map_err(|e| format!("Failed to load navigation session: {}", e))?;
    
    if let Some(ref sess) = session {
        log::info!("Loaded navigation session '{}' for project: {}", 
                   sess.name, project_path);
    } else {
        log::info!("No navigation session found for project: {}", project_path);
    }
    
    Ok(session)
}

#[tauri::command]
pub async fn load_all_navigation_sessions(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<NavigationSessionMetadata>, String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation session manager
    let config = NavigationSessionConfig::default();
    let navigation_session_manager = NavigationSessionManager::new(config)
        .map_err(|e| format!("Failed to create navigation session manager: {}", e))?;
    
    // Load all navigation sessions metadata
    let sessions = navigation_session_manager
        .load_all_navigation_sessions(project_path.clone())
        .await
        .map_err(|e| format!("Failed to load navigation sessions: {}", e))?;
    
    log::info!("Loaded {} navigation sessions for project: {}", 
               sessions.len(), project_path);
    Ok(sessions)
}

#[tauri::command]
pub async fn delete_navigation_session(
    project_path: String,
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation session manager
    let config = NavigationSessionConfig::default();
    let navigation_session_manager = NavigationSessionManager::new(config)
        .map_err(|e| format!("Failed to create navigation session manager: {}", e))?;
    
    // Delete navigation session
    navigation_session_manager
        .delete_navigation_session(project_path.clone(), session_id.clone())
        .await
        .map_err(|e| format!("Failed to delete navigation session: {}", e))?;
    
    log::info!("Deleted navigation session '{}' for project: {}", 
               session_id, project_path);
    Ok(())
}

#[tauri::command]
pub async fn cleanup_navigation_data(
    project_path: String,
    max_history_age_days: Option<u32>,
    max_sessions: Option<usize>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    
    // Validate project path
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Create navigation manager
    let navigation_manager = NavigationManager::new()
        .map_err(|e| format!("Failed to create navigation manager: {}", e))?;
    
    // Use default values if not provided
    let max_age = max_history_age_days.unwrap_or(30); // 30 days default
    let max_sessions_count = max_sessions.unwrap_or(50); // 50 sessions default
    
    // Clean up navigation data
    navigation_manager
        .cleanup_navigation_data(&path, max_age, max_sessions_count)
        .await
        .map_err(|e| format!("Failed to cleanup navigation data: {}", e))?;
    
    log::info!("Cleaned up navigation data for project: {} (max age: {} days, max sessions: {})", 
               project_path, max_age, max_sessions_count);
    Ok(())
}

// Symbol Usage Analysis Data Structures

#[derive(Serialize)]
pub struct SymbolUsageAnalysis {
    pub symbol: Symbol,
    pub reference_count: usize,
    pub call_count: usize,
    pub last_used: chrono::DateTime<chrono::Utc>,
    pub usage_frequency: f64,
    pub hotspots: Vec<UsageHotspot>,
    pub usage_by_file: std::collections::HashMap<String, usize>,
    pub usage_by_type: std::collections::HashMap<String, usize>,
    pub popularity_score: f64,
    pub coupling_metrics: CouplingMetrics,
}

#[derive(Serialize)]
pub struct UsageHotspot {
    pub file_path: String,
    pub position: Position,
    pub usage_type: UsageType,
    pub frequency: usize,
    pub context: String,
}

#[derive(Serialize)]
pub struct Position {
    pub line: usize,
    pub column: usize,
}

#[derive(Serialize)]
pub enum UsageType {
    Call,
    Reference,
    TypeUsage,
    Import,
    Inheritance,
    Definition,
}

#[derive(Serialize)]
pub struct CouplingMetrics {
    pub incoming_dependencies: usize,
    pub outgoing_dependencies: usize,
    pub coupling_score: f64,
    pub cohesion_score: f64,
}

// Symbol Usage Analysis Command

#[tauri::command]
pub async fn analyze_symbol_usage(
    symbol_id: String,
    state: State<'_, AppState>,
) -> Result<SymbolUsageAnalysis, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Note: For now, we'll skip caching for symbol usage analysis
    // This could be enhanced later with a dedicated cache for usage analysis results
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find the target symbol
    let target_symbol = symbols.iter()
        .find(|s| relationship_tracker.generate_symbol_id(s) == symbol_id)
        .ok_or_else(|| format!("Symbol not found: {}", symbol_id))?
        .clone();
    
    // Get usage statistics from the tracker
    let usage_stats = relationship_tracker.get_usage_stats(&symbol_id)
        .ok_or_else(|| format!("No usage statistics found for symbol: {}", symbol_id))?;
    
    // Get references for detailed analysis
    let find_refs_result = relationship_tracker.find_references(&symbol_id);
    
    // Calculate usage frequency based on references and time
    let usage_frequency = calculate_usage_frequency(&find_refs_result.references);
    
    // Identify usage hotspots
    let hotspots = identify_usage_hotspots(&find_refs_result.references);
    
    // Calculate usage by file
    let usage_by_file = calculate_usage_by_file(&find_refs_result.by_file);
    
    // Calculate usage by type
    let usage_by_type = calculate_usage_by_type(&find_refs_result.by_type);
    
    // Get relationship statistics for coupling metrics
    let relationship_stats = relationship_tracker.get_relationship_stats(&symbol_id);
    
    let coupling_metrics = CouplingMetrics {
        incoming_dependencies: relationship_stats.dependent_count,
        outgoing_dependencies: relationship_stats.dependency_count,
        coupling_score: relationship_stats.coupling_score,
        cohesion_score: relationship_stats.cohesion_score,
    };
    
    // Count call-specific references
    let call_count = find_refs_result.references.iter()
        .filter(|r| matches!(r.reference_type, secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Call))
        .count();
    
    // Create the analysis result
    let analysis = SymbolUsageAnalysis {
        symbol: target_symbol,
        reference_count: usage_stats.reference_count,
        call_count,
        last_used: chrono::Utc::now(), // Update to current time
        usage_frequency,
        hotspots,
        usage_by_file,
        usage_by_type,
        popularity_score: usage_stats.popularity_score,
        coupling_metrics,
    };
    
    // Note: Caching could be added here in the future for performance optimization
    
    Ok(analysis)
}

// Helper functions for symbol usage analysis

fn calculate_usage_frequency(references: &[secondary_mind_core::components::symbol_relationship_tracker::SymbolReference]) -> f64 {
    if references.is_empty() {
        return 0.0;
    }
    
    // Calculate frequency based on reference count and recency
    let base_frequency = (references.len() as f64).ln().max(0.0) / 10.0;
    
    // Factor in time-based usage patterns (simplified)
    let recent_usage_bonus = 0.1; // Could be calculated based on actual timestamps
    
    (base_frequency + recent_usage_bonus).min(1.0)
}

fn identify_usage_hotspots(references: &[secondary_mind_core::components::symbol_relationship_tracker::SymbolReference]) -> Vec<UsageHotspot> {
    use std::collections::HashMap;
    
    // Group references by file and location to identify hotspots
    let mut location_counts: HashMap<(String, usize), Vec<&secondary_mind_core::components::symbol_relationship_tracker::SymbolReference>> = HashMap::new();
    
    for reference in references {
        let key = (reference.location.path.to_string_lossy().to_string(), reference.location.line);
        location_counts.entry(key).or_insert_with(Vec::new).push(reference);
    }
    
    // Convert to hotspots, filtering for locations with multiple references
    let mut hotspots = Vec::new();
    for ((file_path, line), refs) in location_counts {
        if refs.len() > 1 { // Only consider locations with multiple references as hotspots
            if let Some(first_ref) = refs.first() {
                let usage_type = match first_ref.reference_type {
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Call => UsageType::Call,
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Access => UsageType::Reference,
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::TypeUsage => UsageType::TypeUsage,
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Import => UsageType::Import,
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Inheritance => UsageType::Inheritance,
                    secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Definition => UsageType::Definition,
                    _ => UsageType::Reference,
                };
                
                hotspots.push(UsageHotspot {
                    file_path,
                    position: Position {
                        line,
                        column: first_ref.location.column,
                    },
                    usage_type,
                    frequency: refs.len(),
                    context: first_ref.context.clone(),
                });
            }
        }
    }
    
    // Sort hotspots by frequency (highest first)
    hotspots.sort_by(|a, b| b.frequency.cmp(&a.frequency));
    
    // Limit to top 10 hotspots
    hotspots.truncate(10);
    
    hotspots
}

fn calculate_usage_by_file(by_file: &std::collections::HashMap<std::path::PathBuf, Vec<secondary_mind_core::components::symbol_relationship_tracker::SymbolReference>>) -> std::collections::HashMap<String, usize> {
    by_file.iter()
        .map(|(path, refs)| (path.to_string_lossy().to_string(), refs.len()))
        .collect()
}

fn calculate_usage_by_type(by_type: &std::collections::HashMap<secondary_mind_core::components::symbol_relationship_tracker::ReferenceType, Vec<secondary_mind_core::components::symbol_relationship_tracker::SymbolReference>>) -> std::collections::HashMap<String, usize> {
    by_type.iter()
        .map(|(ref_type, refs)| {
            let type_name = match ref_type {
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Call => "Call",
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Access => "Access",
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::TypeUsage => "TypeUsage",
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Import => "Import",
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Inheritance => "Inheritance",
                secondary_mind_core::components::symbol_relationship_tracker::ReferenceType::Definition => "Definition",
                _ => "Unknown",
            };
            (type_name.to_string(), refs.len())
        })
        .collect()
}

// Contextual Analysis Commands for Navigation Backend Integration

#[derive(Serialize)]
pub struct CallHierarchyAnalysis {
    pub function: Symbol,
    pub callers: Vec<FunctionReference>,
    pub callees: Vec<FunctionReference>,
    pub depth_analyzed: usize,
}

#[derive(Serialize)]
pub struct FunctionReference {
    pub identifier: String,
    pub kind: String,
    pub location: secondary_mind_core::model::symbol::SymbolLocation,
    pub call_count: usize,
    pub context: String,
}

#[derive(Serialize)]
pub struct FunctionCaller {
    pub identifier: String,
    pub kind: String,
    pub location: secondary_mind_core::model::symbol::SymbolLocation,
    pub call_count: usize,
    pub context: String,
}

#[derive(Serialize)]
pub struct InheritanceHierarchyAnalysis {
    pub class: Symbol,
    pub parents: Vec<InheritanceRelation>,
    pub children: Vec<InheritanceRelation>,
    pub depth: usize,
    pub breadth: usize,
}

#[derive(Serialize)]
pub struct InheritanceRelation {
    pub identifier: String,
    pub kind: String,
    pub location: secondary_mind_core::model::symbol::SymbolLocation,
    pub relationship: String, // "extends", "implements", etc.
}

#[derive(Serialize)]
pub struct ClassMember {
    pub identifier: String,
    pub kind: String,
    pub accessibility: String, // "public", "private", "protected"
    pub is_static: bool,
    pub location: secondary_mind_core::model::symbol::SymbolLocation,
    pub parameters: Option<Vec<String>>,
    pub return_type: Option<String>,
    pub member_type: Option<String>,
}

#[derive(Serialize)]
pub struct Implementation {
    pub identifier: String,
    pub kind: String,
    pub location: secondary_mind_core::model::symbol::SymbolLocation,
    pub implements_interface: String,
}

#[tauri::command]
pub async fn analyze_call_hierarchy(
    function_id: String,
    state: State<'_, AppState>,
) -> Result<CallHierarchyAnalysis, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find the function symbol
    let function_symbol = symbols.iter()
        .find(|s| relationship_tracker.generate_symbol_id(s) == function_id)
        .ok_or_else(|| format!("Function not found: {}", function_id))?
        .clone();
    
    // Analyze call hierarchy
    let callers = find_function_callers_internal(&relationship_tracker, &function_id, &symbols)?;
    let callees = find_function_callees_internal(&relationship_tracker, &function_id, &symbols)?;
    
    Ok(CallHierarchyAnalysis {
        function: function_symbol,
        callers,
        callees,
        depth_analyzed: 2, // Default depth
    })
}

#[tauri::command]
pub async fn find_function_callers(
    function_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<FunctionCaller>, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find callers
    let callers = find_function_callers_internal(&relationship_tracker, &function_id, &symbols)?;
    
    // Convert to FunctionCaller format
    let function_callers: Vec<FunctionCaller> = callers.into_iter()
        .map(|caller| FunctionCaller {
            identifier: caller.identifier,
            kind: caller.kind,
            location: caller.location,
            call_count: caller.call_count,
            context: caller.context,
        })
        .collect();
    
    Ok(function_callers)
}

#[tauri::command]
pub async fn analyze_inheritance_hierarchy(
    class_id: String,
    state: State<'_, AppState>,
) -> Result<InheritanceHierarchyAnalysis, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find the class symbol
    let class_symbol = symbols.iter()
        .find(|s| relationship_tracker.generate_symbol_id(s) == class_id)
        .ok_or_else(|| format!("Class not found: {}", class_id))?
        .clone();
    
    // Analyze inheritance hierarchy
    let parents = find_inheritance_parents(&relationship_tracker, &class_id, &symbols)?;
    let children = find_inheritance_children(&relationship_tracker, &class_id, &symbols)?;
    
    let depth = calculate_inheritance_depth(&parents, &children);
    let breadth = parents.len() + children.len();
    
    Ok(InheritanceHierarchyAnalysis {
        class: class_symbol,
        parents,
        children,
        depth,
        breadth,
    })
}

#[tauri::command]
pub async fn get_class_members(
    class_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ClassMember>, String> {
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Scan project for symbols
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Find the class symbol
    let class_symbol = symbols.iter()
        .find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == class_id
        })
        .ok_or_else(|| format!("Class not found: {}", class_id))?;
    
    // Find all symbols in the same file that could be class members
    let class_file_symbols: Vec<&Symbol> = symbols.iter()
        .filter(|s| s.location.path == class_symbol.location.path)
        .collect();
    
    // Extract class members by analyzing the file content
    let members = extract_class_members(&class_symbol.location.path, &class_symbol.identifier, &class_file_symbols)?;
    
    Ok(members)
}

#[tauri::command]
pub async fn find_implementations(
    interface_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Implementation>, String> {
    use secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker;
    
    // Get current project for context
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        if let Some(project) = project_guard.as_ref() {
            project.root.clone()
        } else {
            return Err("No project currently loaded".to_string());
        }
    };
    
    // Create and populate relationship tracker
    let mut relationship_tracker = SymbolRelationshipTracker::new();
    
    // Scan project and build relationship graph
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project_root, &cartographer);
    
    // Add all symbols to the tracker
    for symbol in &symbols {
        relationship_tracker.add_symbol_definition(symbol.clone())
            .map_err(|e| format!("Failed to add symbol definition: {}", e))?;
    }
    
    // Build relationships by analyzing symbol usage across files
    build_symbol_relationships(&project_root, &symbols, &mut relationship_tracker)
        .map_err(|e| format!("Failed to build relationships: {}", e))?;
    
    // Find the interface symbol
    let interface_symbol = symbols.iter()
        .find(|s| relationship_tracker.generate_symbol_id(s) == interface_id)
        .ok_or_else(|| format!("Interface not found: {}", interface_id))?;
    
    // Find implementations
    let implementations = find_interface_implementations(&relationship_tracker, &interface_id, &interface_symbol.identifier, &symbols)?;
    
    Ok(implementations)
}

// Helper functions for contextual analysis

fn find_function_callers_internal(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    function_id: &str,
    all_symbols: &[Symbol],
) -> Result<Vec<FunctionReference>, String> {
    let mut callers = Vec::new();
    
    // Get all references to this function
    let references_result = tracker.find_references(function_id);
    
    // Group references by calling function/location
    let mut caller_map: std::collections::HashMap<String, Vec<secondary_mind_core::components::symbol_relationship_tracker::SymbolReference>> = std::collections::HashMap::new();
    
    for reference in references_result.references {
        // Find the symbol that contains this reference (the caller)
        if let Some(caller_symbol) = find_symbol_containing_location(&reference.location, all_symbols) {
            let caller_id = format!("{}:{}:{}:{}", 
                caller_symbol.location.path.to_string_lossy(),
                caller_symbol.identifier,
                caller_symbol.kind.clone() as u8,
                caller_symbol.location.line
            );
            caller_map.entry(caller_id).or_default().push(reference);
        }
    }
    
    // Convert to FunctionReference format
    for (caller_id, refs) in caller_map {
        if let Some(caller_symbol) = all_symbols.iter().find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == caller_id
        }) {
            callers.push(FunctionReference {
                identifier: caller_symbol.identifier.clone(),
                kind: format!("{:?}", caller_symbol.kind),
                location: caller_symbol.location.clone(),
                call_count: refs.len(),
                context: refs.first().map(|r| r.context.clone()).unwrap_or_default(),
            });
        }
    }
    
    Ok(callers)
}

fn find_function_callees_internal(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    function_id: &str,
    all_symbols: &[Symbol],
) -> Result<Vec<FunctionReference>, String> {
    let mut callees = Vec::new();
    
    // Get dependencies (functions this function calls)
    let dependencies = tracker.get_dependencies(function_id);
    
    for dep_id in dependencies {
        if let Some(dep_symbol) = all_symbols.iter().find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == dep_id
        }) {
            // Count how many times this function calls the dependency
            let references_result = tracker.find_references(&dep_id);
            let call_count = references_result.references.iter()
                .filter(|r| r.location.path.to_string_lossy().contains(&function_id.split(':').next().unwrap_or("")))
                .count();
            
            callees.push(FunctionReference {
                identifier: dep_symbol.identifier.clone(),
                kind: format!("{:?}", dep_symbol.kind),
                location: dep_symbol.location.clone(),
                call_count,
                context: references_result.references.first()
                    .map(|r| r.context.clone())
                    .unwrap_or_default(),
            });
        }
    }
    
    Ok(callees)
}

fn find_inheritance_parents(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    class_id: &str,
    all_symbols: &[Symbol],
) -> Result<Vec<InheritanceRelation>, String> {
    let mut parents = Vec::new();
    
    // Get dependencies that represent inheritance relationships
    let dependencies = tracker.get_dependencies(class_id);
    
    for dep_id in dependencies {
        if let Some(parent_symbol) = all_symbols.iter().find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == dep_id
        }) {
            // Determine relationship type based on symbol kind and context
            let relationship = match parent_symbol.kind {
                secondary_mind_core::model::symbol::SymbolKind::TSInterface => "implements",
                secondary_mind_core::model::symbol::SymbolKind::TSClass => "extends",
                _ => "uses",
            };
            
            parents.push(InheritanceRelation {
                identifier: parent_symbol.identifier.clone(),
                kind: format!("{:?}", parent_symbol.kind),
                location: parent_symbol.location.clone(),
                relationship: relationship.to_string(),
            });
        }
    }
    
    Ok(parents)
}

fn find_inheritance_children(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    class_id: &str,
    all_symbols: &[Symbol],
) -> Result<Vec<InheritanceRelation>, String> {
    let mut children = Vec::new();
    
    // Get dependents (classes that inherit from this class)
    let dependents = tracker.get_dependents(class_id);
    
    for dependent_id in dependents {
        if let Some(child_symbol) = all_symbols.iter().find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == dependent_id
        }) {
            // Determine relationship type
            let relationship = match child_symbol.kind {
                secondary_mind_core::model::symbol::SymbolKind::TSClass => "extends",
                _ => "implements",
            };
            
            children.push(InheritanceRelation {
                identifier: child_symbol.identifier.clone(),
                kind: format!("{:?}", child_symbol.kind),
                location: child_symbol.location.clone(),
                relationship: relationship.to_string(),
            });
        }
    }
    
    Ok(children)
}

fn calculate_inheritance_depth(parents: &[InheritanceRelation], children: &[InheritanceRelation]) -> usize {
    // Simple depth calculation - could be enhanced with recursive analysis
    let parent_depth = if parents.is_empty() { 0 } else { 1 };
    let child_depth = if children.is_empty() { 0 } else { 1 };
    parent_depth + child_depth + 1
}

fn extract_class_members(
    file_path: &std::path::Path,
    class_name: &str,
    file_symbols: &[&Symbol],
) -> Result<Vec<ClassMember>, String> {
    let mut members = Vec::new();
    
    // Read file content to analyze class structure
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;
    
    let lines: Vec<&str> = content.lines().collect();
    
    // Find class definition line
    let class_start_line = lines.iter().position(|line| {
        line.contains("class") && line.contains(class_name)
    }).unwrap_or(0);
    
    // Extract members from symbols that are likely class members
    for symbol in file_symbols {
        // Check if symbol is likely a class member (within reasonable distance from class definition)
        let line_distance = (symbol.location.line as i32 - class_start_line as i32).abs();
        if line_distance < 100 && symbol.identifier != class_name {
            let accessibility = determine_accessibility(&lines, symbol.location.line);
            let is_static = determine_if_static(&lines, symbol.location.line);
            
            let member = ClassMember {
                identifier: symbol.identifier.clone(),
                kind: format!("{:?}", symbol.kind),
                accessibility,
                is_static,
                location: symbol.location.clone(),
                parameters: extract_parameters(&lines, symbol.location.line),
                return_type: extract_return_type(&lines, symbol.location.line),
                member_type: extract_member_type(&lines, symbol.location.line),
            };
            
            members.push(member);
        }
    }
    
    Ok(members)
}

fn find_interface_implementations(
    tracker: &secondary_mind_core::components::symbol_relationship_tracker::SymbolRelationshipTracker,
    interface_id: &str,
    interface_name: &str,
    all_symbols: &[Symbol],
) -> Result<Vec<Implementation>, String> {
    let mut implementations = Vec::new();
    
    // Get dependents (classes that implement this interface)
    let dependents = tracker.get_dependents(interface_id);
    
    for dependent_id in dependents {
        if let Some(impl_symbol) = all_symbols.iter().find(|s| {
            let symbol_id = format!("{}:{}:{}:{}", 
                s.location.path.to_string_lossy(),
                s.identifier,
                s.kind.clone() as u8,
                s.location.line
            );
            symbol_id == dependent_id
        }) {
            implementations.push(Implementation {
                identifier: impl_symbol.identifier.clone(),
                kind: format!("{:?}", impl_symbol.kind),
                location: impl_symbol.location.clone(),
                implements_interface: interface_name.to_string(),
            });
        }
    }
    
    Ok(implementations)
}

fn find_symbol_containing_location<'a>(
    location: &secondary_mind_core::model::symbol::SymbolLocation,
    all_symbols: &'a [Symbol],
) -> Option<&'a Symbol> {
    // Find the symbol that contains this location (same file, closest preceding line)
    all_symbols.iter()
        .filter(|s| s.location.path == location.path && s.location.line <= location.line)
        .max_by_key(|s| s.location.line)
}

fn determine_accessibility(lines: &[&str], line_number: usize) -> String {
    if line_number > 0 && line_number <= lines.len() {
        let line = lines[line_number - 1];
        if line.contains("private") {
            "private".to_string()
        } else if line.contains("protected") {
            "protected".to_string()
        } else {
            "public".to_string()
        }
    } else {
        "public".to_string()
    }
}

fn determine_if_static(lines: &[&str], line_number: usize) -> bool {
    if line_number > 0 && line_number <= lines.len() {
        let line = lines[line_number - 1];
        line.contains("static")
    } else {
        false
    }
}

fn extract_parameters(lines: &[&str], line_number: usize) -> Option<Vec<String>> {
    if line_number > 0 && line_number <= lines.len() {
        let line = lines[line_number - 1];
        if let Some(start) = line.find('(') {
            if let Some(end) = line.find(')') {
                let params_str = &line[start + 1..end];
                if params_str.trim().is_empty() {
                    return Some(Vec::new());
                }
                let params: Vec<String> = params_str
                    .split(',')
                    .map(|p| p.trim().to_string())
                    .filter(|p| !p.is_empty())
                    .collect();
                return Some(params);
            }
        }
    }
    None
}

fn extract_return_type(lines: &[&str], line_number: usize) -> Option<String> {
    if line_number > 0 && line_number <= lines.len() {
        let line = lines[line_number - 1];
        // Look for TypeScript/JavaScript return type annotations
        if let Some(colon_pos) = line.rfind(':') {
            if let Some(brace_pos) = line.find('{') {
                if colon_pos < brace_pos {
                    let return_type = line[colon_pos + 1..brace_pos].trim();
                    return Some(return_type.to_string());
                }
            }
        }
    }
    None
}

fn extract_member_type(lines: &[&str], line_number: usize) -> Option<String> {
    if line_number > 0 && line_number <= lines.len() {
        let line = lines[line_number - 1];
        // Look for TypeScript property type annotations
        if let Some(colon_pos) = line.find(':') {
            if !line.contains('(') { // Not a function
                let type_part = line[colon_pos + 1..].trim();
                if let Some(semicolon_pos) = type_part.find(';') {
                    return Some(type_part[..semicolon_pos].trim().to_string());
                } else {
                    return Some(type_part.to_string());
                }
            }
        }
    }
    None
}

// Integration: Enhanced commands that leverage all the new core functionality including search, AI synthesis, and session management.
// Notes: These commands provide the bridge between the enhanced core capabilities and the frontend UI components.
// Performance Monitoring and Caching Backend Commands

/// Get navigation performance metrics and cache statistics
#[tauri::command]
pub async fn get_navigation_metrics(
    state: State<'_, AppState>,
) -> Result<NavigationMetrics, String> {
    let mut cache = state.navigation_cache.lock().unwrap();
    
    // Update metrics and perform cleanup if needed
    cache.cleanup_expired_entries();
    cache.check_memory_usage();
    
    let metrics = cache.get_metrics();
    
    log::debug!("Navigation metrics: cache_hit_rate={:.2}%, memory_usage={:.1}MB, total_entries={}", 
               metrics.cache_hit_rate * 100.0, 
               metrics.memory_usage_mb, 
               metrics.total_cache_entries);
    
    Ok(metrics)
}

// Git Integration Backend Commands

/// Get git status for a specific file
#[tauri::command]
pub async fn get_file_git_status(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<Option<GitFileStatus>, String> {
    let path = PathBuf::from(&file_path);
    
    // Try to find git repository root
    let repo_root = find_git_repository(&path);
    
    if repo_root.is_none() {
        // Not in a git repository, return None gracefully
        return Ok(None);
    }
    
    let repo_root = repo_root.unwrap();
    
    // Create or get CodeSourceController for this repository
    let mut controller = CodeSourceController::new(&repo_root)
        .map_err(|e| format!("Failed to create git controller: {}", e))?;
    
    // Get git status for the specific file
    let git_status = controller.get_file_git_status(&path);
    
    log::debug!("Git status for {}: {:?}", file_path, git_status);
    
    Ok(git_status)
}

/// Get git status for multiple files efficiently
#[tauri::command]
pub async fn get_files_git_status(
    file_paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, GitFileStatus>, String> {
    let mut result = std::collections::HashMap::new();
    
    if file_paths.is_empty() {
        return Ok(result);
    }
    
    // Convert to PathBuf and group by repository root
    let paths: Vec<PathBuf> = file_paths.iter().map(|p| PathBuf::from(p)).collect();
    let mut repos_to_files: std::collections::HashMap<PathBuf, Vec<PathBuf>> = std::collections::HashMap::new();
    
    // Group files by their git repository root
    for path in paths {
        if let Some(repo_root) = find_git_repository(&path) {
            repos_to_files.entry(repo_root).or_insert_with(Vec::new).push(path);
        }
        // Files not in git repositories are ignored (graceful fallback)
    }
    
    // Process each repository
    for (repo_root, repo_files) in repos_to_files {
        match CodeSourceController::new(&repo_root) {
            Ok(mut controller) => {
                let statuses = controller.get_files_git_status(&repo_files);
                
                // Convert PathBuf keys back to String keys for the result
                for (path, status) in statuses {
                    if let Some(path_str) = path.to_str() {
                        result.insert(path_str.to_string(), status);
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to create git controller for {}: {}", repo_root.display(), e);
                // Continue processing other repositories
            }
        }
    }
    
    log::debug!("Git status for {} files: {} results", file_paths.len(), result.len());
    
    Ok(result)
}

/// Check if a directory is a git repository
#[tauri::command]
pub async fn is_git_repository(
    directory_path: String,
) -> Result<bool, String> {
    let path = PathBuf::from(&directory_path);
    let is_git = find_git_repository(&path).is_some();
    
    log::debug!("Is git repository check for {}: {}", directory_path, is_git);
    
    Ok(is_git)
}

/// Get git repository root for a given path
#[tauri::command]
pub async fn get_git_repository_root(
    file_path: String,
) -> Result<Option<String>, String> {
    let path = PathBuf::from(&file_path);
    let repo_root = find_git_repository(&path);
    
    let result = repo_root.and_then(|p| p.to_str().map(|s| s.to_string()));
    
    log::debug!("Git repository root for {}: {:?}", file_path, result);
    
    Ok(result)
}