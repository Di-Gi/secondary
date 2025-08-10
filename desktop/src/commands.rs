// [[PROJECT_NAME]]/desktop/src/commands.rs
// Purpose: [Enhanced Tauri commands with polyglot analysis capabilities. All models are now imported from the core crate.]
// Architecture: [This file acts as the bridge between the frontend and the `secondary-mind-core` library. It has been updated to remove redundant models and support Rust file analysis.]
// Dependencies: [secondary-mind-core (for all models and logic), Tauri, WalkDir.]
use secondary_mind_core::{
    components::{
        analysis_engine::AnalysisEngine,
        ai_synthesis_core::{AISynthesisCore, ContextBuilder},
        search_index_manager::{SearchIndexManager, SearchFilters},
        session_manager::{SessionManager, SessionConfig},
        file_system_watcher::FileSystemWatcher,
        codebase_cartographer::CodebaseCartographer,
        code_source_controller::CodeSourceController,
        project_configuration_service::ProjectConfigurationService,
        home_directory_manager::HomeDirectoryManager,
    },
    model::{project::Project, symbol::Symbol, session::ProjectSession},
    ProjectConfig, RecentProjects,
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

// Integration: Enhanced commands that leverage all the new core functionality including search, AI synthesis, and session management.
// Notes: These commands provide the bridge between the enhanced core capabilities and the frontend UI components.