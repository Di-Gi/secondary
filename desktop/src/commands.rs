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
use crate::{AppState, startup::StartupManager};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
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

#[derive(Serialize, Deserialize, Clone)]
pub struct DevelopmentProfile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub files: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_used: chrono::DateTime<chrono::Utc>,
    pub usage_count: u32,
}

#[derive(Serialize, Deserialize)]
pub struct ProfileExport {
    pub profile: ProfileMetadata,
    pub files: Vec<ProfileFileContent>,
}

#[derive(Serialize, Deserialize)]
pub struct ProfileMetadata {
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub exported_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct ProfileFileContent {
    pub path: String,
    pub content: String,
    pub status: String, // "found", "missing", "error"
}

#[derive(Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub exists: bool,
    pub last_modified: Option<chrono::DateTime<chrono::Utc>>,
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

// Helper function to clean Windows path prefixes and make paths relative
fn clean_file_path(path: &Path, project_root: &Path) -> String {
    // First, try to make the path relative to the project root
    if let Ok(relative_path) = path.strip_prefix(project_root) {
        // Convert to forward slashes for consistency
        relative_path.to_string_lossy().replace('\\', "/")
    } else {
        // If we can't make it relative, clean the absolute path
        let path_str = path.to_string_lossy();
        
        // Remove Windows UNC prefix if present
        let cleaned = if path_str.starts_with(r"\\?\") {
            &path_str[4..]
        } else {
            &path_str
        };
        
        // Convert backslashes to forward slashes
        cleaned.replace('\\', "/")
    }
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
            if let Ok(mut file_symbols) = cartographer.parse_file(path) {
                if !file_symbols.is_empty() {
                    // Clean the file paths in symbols to be relative to project root
                    for symbol in &mut file_symbols {
                        symbol.location.path = PathBuf::from(clean_file_path(path, root));
                    }
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

// Profile Management Commands

#[tauri::command]
pub async fn create_development_profile(
    name: String,
    description: Option<String>,
    tags: Vec<String>,
    files: Vec<String>,
    project_path: String,
) -> Result<DevelopmentProfile, String> {
    let project_root = PathBuf::from(&project_path);
    let profiles_dir = project_root.join(".secondary-mind").join("profiles");
    
    tokio::fs::create_dir_all(&profiles_dir).await.map_err(|e| {
        format!("Failed to create profiles directory: {}", e)
    })?;
    
    let profile = DevelopmentProfile {
        id: format!("profile_{}", chrono::Utc::now().timestamp_millis()),
        name,
        description,
        tags,
        files,
        created_at: chrono::Utc::now(),
        last_used: chrono::Utc::now(),
        usage_count: 0,
    };
    
    let profile_file = profiles_dir.join(format!("{}.json", profile.id));
    let profile_json = serde_json::to_string_pretty(&profile).map_err(|e| {
        format!("Failed to serialize profile: {}", e)
    })?;
    
    tokio::fs::write(&profile_file, profile_json).await.map_err(|e| {
        format!("Failed to save profile: {}", e)
    })?;
    
    Ok(profile)
}

#[tauri::command]
pub async fn load_development_profiles(project_path: String) -> Result<Vec<DevelopmentProfile>, String> {
    let project_root = PathBuf::from(&project_path);
    let profiles_dir = project_root.join(".secondary-mind").join("profiles");
    
    if !profiles_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut profiles = Vec::new();
    let mut entries = tokio::fs::read_dir(&profiles_dir).await.map_err(|e| {
        format!("Failed to read profiles directory: {}", e)
    })?;
    
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = tokio::fs::read_to_string(&path).await.map_err(|e| e.to_string())?;
            if let Ok(profile) = serde_json::from_str::<DevelopmentProfile>(&content) {
                profiles.push(profile);
            }
        }
    }
    
    // Sort by last used, then by name
    profiles.sort_by(|a, b| {
        b.last_used.cmp(&a.last_used).then_with(|| a.name.cmp(&b.name))
    });
    
    Ok(profiles)
}

#[tauri::command]
pub async fn update_development_profile(
    profile_id: String,
    name: Option<String>,
    description: Option<String>,
    tags: Option<Vec<String>>,
    files: Option<Vec<String>>,
    project_path: String,
) -> Result<DevelopmentProfile, String> {
    let project_root = PathBuf::from(&project_path);
    let profile_file = project_root.join(".secondary-mind").join("profiles").join(format!("{}.json", profile_id));
    
    if !profile_file.exists() {
        return Err("Profile not found".to_string());
    }
    
    let content = tokio::fs::read_to_string(&profile_file).await.map_err(|e| e.to_string())?;
    let mut profile: DevelopmentProfile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // Update fields if provided
    if let Some(name) = name { profile.name = name; }
    if let Some(description) = description { profile.description = Some(description); }
    if let Some(tags) = tags { profile.tags = tags; }
    if let Some(files) = files { profile.files = files; }
    
    profile.last_used = chrono::Utc::now();
    
    let profile_json = serde_json::to_string_pretty(&profile).map_err(|e| {
        format!("Failed to serialize profile: {}", e)
    })?;
    
    tokio::fs::write(&profile_file, profile_json).await.map_err(|e| {
        format!("Failed to save profile: {}", e)
    })?;
    
    Ok(profile)
}

#[tauri::command]
pub async fn delete_development_profile(
    profile_id: String,
    project_path: String,
) -> Result<(), String> {
    let project_root = PathBuf::from(&project_path);
    let profile_file = project_root.join(".secondary-mind").join("profiles").join(format!("{}.json", profile_id));
    
    if profile_file.exists() {
        tokio::fs::remove_file(&profile_file).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn use_development_profile(
    profile_id: String,
    project_path: String,
) -> Result<DevelopmentProfile, String> {
    let project_root = PathBuf::from(&project_path);
    let profile_file = project_root.join(".secondary-mind").join("profiles").join(format!("{}.json", profile_id));
    
    if !profile_file.exists() {
        return Err("Profile not found".to_string());
    }
    
    let content = tokio::fs::read_to_string(&profile_file).await.map_err(|e| e.to_string())?;
    let mut profile: DevelopmentProfile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    // Update usage statistics
    profile.last_used = chrono::Utc::now();
    profile.usage_count += 1;
    
    let profile_json = serde_json::to_string_pretty(&profile).map_err(|e| {
        format!("Failed to serialize profile: {}", e)
    })?;
    
    tokio::fs::write(&profile_file, profile_json).await.map_err(|e| {
        format!("Failed to save profile: {}", e)
    })?;
    
    Ok(profile)
}

#[tauri::command]
pub async fn check_profile_files_status(
    files: Vec<String>,
    project_path: String,
) -> Result<Vec<FileStatus>, String> {
    let project_root = PathBuf::from(&project_path);
    let mut statuses = Vec::new();
    
    for file_path in files {
        // Clean the file path and make it relative to project root
        let cleaned_path = clean_file_path(&PathBuf::from(&file_path), &project_root);
        let full_path = project_root.join(&cleaned_path);
        
        let exists = full_path.exists();
        let last_modified = if exists {
            tokio::fs::metadata(&full_path).await
                .ok()
                .and_then(|meta| meta.modified().ok())
                .map(|time| chrono::DateTime::from(time))
        } else {
            None
        };
        
        statuses.push(FileStatus {
            path: cleaned_path,
            exists,
            last_modified,
        });
    }
    
    Ok(statuses)
}

#[tauri::command]
pub async fn export_profile_context(
    profile_id: String,
    project_path: String,
    format: String, // "json", "yaml", "xml"
) -> Result<String, String> {
    let project_root = PathBuf::from(&project_path);
    let profile_file = project_root.join(".secondary-mind").join("profiles").join(format!("{}.json", profile_id));
    
    if !profile_file.exists() {
        return Err("Profile not found".to_string());
    }
    
    let content = tokio::fs::read_to_string(&profile_file).await.map_err(|e| e.to_string())?;
    let profile: DevelopmentProfile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let mut file_contents = Vec::new();
    
    for file_path in &profile.files {
        // Clean the file path and make it relative to project root
        let cleaned_path = clean_file_path(&PathBuf::from(file_path), &project_root);
        let full_path = project_root.join(&cleaned_path);
        
        let (content, status) = if full_path.exists() && full_path.starts_with(&project_root) {
            match tokio::fs::read_to_string(&full_path).await {
                Ok(content) => (content, "found"),
                Err(_) => (String::new(), "error"),
            }
        } else {
            (String::new(), "missing")
        };
        
        file_contents.push(ProfileFileContent {
            path: cleaned_path,
            content,
            status: status.to_string(),
        });
    }
    
    let export = ProfileExport {
        profile: ProfileMetadata {
            name: profile.name,
            description: profile.description,
            tags: profile.tags,
            exported_at: chrono::Utc::now(),
        },
        files: file_contents,
    };
    
    match format.as_str() {
        "yaml" => {
            serde_yaml::to_string(&export).map_err(|e| format!("Failed to serialize to YAML: {}", e))
        },
        "xml" => {
            // Simple XML generation since we don't want to add heavy dependencies
            let mut xml = String::new();
            xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            xml.push_str("<profile_export>\n");
            xml.push_str(&format!("  <profile>\n"));
            xml.push_str(&format!("    <name>{}</name>\n", escape_xml(&export.profile.name)));
            if let Some(desc) = &export.profile.description {
                xml.push_str(&format!("    <description>{}</description>\n", escape_xml(desc)));
            }
            xml.push_str("    <tags>\n");
            for tag in &export.profile.tags {
                xml.push_str(&format!("      <tag>{}</tag>\n", escape_xml(tag)));
            }
            xml.push_str("    </tags>\n");
            xml.push_str(&format!("    <exported_at>{}</exported_at>\n", export.profile.exported_at.to_rfc3339()));
            xml.push_str("  </profile>\n");
            xml.push_str("  <files>\n");
            for file in &export.files {
                xml.push_str("    <file>\n");
                xml.push_str(&format!("      <path>{}</path>\n", escape_xml(&file.path)));
                xml.push_str(&format!("      <status>{}</status>\n", escape_xml(&file.status)));
                xml.push_str(&format!("      <content><![CDATA[{}]]></content>\n", file.content));
                xml.push_str("    </file>\n");
            }
            xml.push_str("  </files>\n");
            xml.push_str("</profile_export>\n");
            Ok(xml)
        },
        _ => {
            serde_json::to_string_pretty(&export).map_err(|e| format!("Failed to serialize to JSON: {}", e))
        }
    }
}

#[tauri::command]
pub async fn frontend_ready(app_handle: tauri::AppHandle) -> Result<(), String> {
    let startup_manager = StartupManager::new(app_handle);
    startup_manager.on_frontend_ready().map_err(|e| e.to_string())?;
    Ok(())
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

// Integration: [Imports `Symbol` directly from `secondary-mind-core`, eliminating the redundant local model. The `scan_project_for_symbols` helper now correctly uses the refactored `CodebaseCartographer`.]
// Notes: [The local `desktop/src/model` directory can now be safely deleted as it is no longer used.]