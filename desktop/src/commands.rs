// [[PROJECT_NAME]]/desktop/src/commands.rs
// Purpose: [Enhanced Tauri commands with polyglot analysis capabilities. All models are now imported from the core crate.]
// Architecture: [This file acts as the bridge between the frontend and the `secondary-mind-core` library. It has been updated to remove redundant models and support Rust file analysis.]
// Dependencies: [secondary-mind-core (for all models and logic), Tauri, WalkDir.]
use secondary_mind_core::{
    components::{
        ai_synthesis_core::AISynthesisCore,
        codebase_cartographer::CodebaseCartographer,
        code_source_controller::CodeSourceController,
        project_configuration_service::ProjectConfigurationService,
        home_directory_manager::HomeDirectoryManager,
        context_collector::ContextCollector,
    },
    model::{project::Project, symbol::Symbol}, // Direct import from core
    ProjectConfig, RecentProjects, ContextPackage,
};
use crate::AppState;
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::State;
use tokio::fs;
use serde::{Serialize, Deserialize};

#[derive(serde::Serialize)]
pub struct AnalysisResult {
    pub symbols: Vec<Symbol>, // Now uses Symbol from core
    pub git_status: Option<(String, String)>,
    pub project_path: String,
    pub project_config: ProjectConfig,
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

#[tauri::command]
pub async fn collect_symbol_context(
    symbol_identifier: String,
    state: State<'_, AppState>,
) -> Result<ContextPackage, String> {
    let (symbols, project_root) = {
        let project_guard = state.current_project.lock().unwrap();
        let project = project_guard.as_ref().ok_or("No project currently loaded")?;
        (project.symbolic_map.clone(), project.root.clone())
    };
    
    let mut context_collector = ContextCollector::new(symbols);
    
    context_collector
        .collect_context(&symbol_identifier, &project_root)
        .map_err(|e| format!("Failed to collect context: {}", e))
}

#[tauri::command]
pub async fn read_file_content(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let project_root = {
        let project_guard = state.current_project.lock().unwrap();
        let project = project_guard.as_ref().ok_or("No project currently loaded")?;
        project.root.clone()
    };
    
    // Resolve relative path against project root
    let full_path = if std::path::Path::new(&file_path).is_absolute() {
        PathBuf::from(&file_path)
    } else {
        project_root.join(&file_path)
    };
    
    // Security check: ensure file is within project directory
    if !full_path.starts_with(&project_root) {
        return Err("File access denied: outside project directory".to_string());
    }
    
    tokio::fs::read_to_string(&full_path).await.map_err(|e| {
        format!("Failed to read file {}: {}", full_path.display(), e)
    })
}
// Integration: [Imports `Symbol` directly from `secondary-mind-core`, eliminating the redundant local model. The `scan_project_for_symbols` helper now correctly uses the refactored `CodebaseCartographer`.]
// Notes: [The local `desktop/src/model` directory can now be safely deleted as it is no longer used.]