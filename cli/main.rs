// cli/main.rs

use anyhow::{Context, Result};
use secondary_mind_core::components::command_bus::CommandBus;
use secondary_mind_core::model::project::Project;
use secondary_mind_core::model::symbol::Symbol;
use std::env;
use std::path::{Path, PathBuf};
use rustyline::error::ReadlineError;
use rustyline::DefaultEditor;
use walkdir::WalkDir;
use secondary_mind_core::components::codebase_cartographer::CodebaseCartographer;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok(); // Load .env file if present
    env_logger::init();
    log::info!("Booting Secondary Mind Engine...");

    let project_path = get_project_path()?;
    log::info!("Target project path: {}", project_path.display());

    let mut project = Project::new(&project_path)?;
    
    println!("Analyzing codebase and building symbolic map...");
    let cartographer = CodebaseCartographer::new();
    let symbols = scan_project_for_symbols(&project.root, &cartographer);
    println!("-> Analysis complete. Found {} symbols.", symbols.len());
    project.symbolic_map = symbols;

    let command_bus = CommandBus::new(project).context("Failed to initialize Command Bus. Is your GEMINI_API_KEY set in .env?")?;
    
    println!("\nWelcome to Secondary Mind. Enter commands, e.g., [guidance: refactor auth service]");
    let mut rl = DefaultEditor::new()?;
    loop {
        let readline = rl.readline(">> ");
        match readline {
            Ok(line) => {
                if line.trim().is_empty() { continue; }
                let _ = rl.add_history_entry(line.as_str());
                println!("Secondary Mind is thinking...");
                match command_bus.execute_command(&line).await {
                    Ok(response) => println!("\n---\n{}\n---", response),
                    Err(e) => eprintln!("\nError: {}\n", e),
                }
            }
            Err(ReadlineError::Interrupted | ReadlineError::Eof) => break,
            Err(err) => { eprintln!("REPL Error: {:?}", err); break; }
        }
    }
    Ok(())
}

// Helper functions
fn get_project_path() -> Result<PathBuf> {
    let args: Vec<String> = env::args().collect();
    let path_str = args.get(1).map_or(".", |s| s.as_str());
    Ok(Path::new(path_str).canonicalize()?)
}

fn scan_project_for_symbols(root: &Path, cartographer: &CodebaseCartographer) -> Vec<Symbol> {
    let mut symbols = Vec::new();
    let walker = WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_hidden(e));

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && (path.extension() == Some("ts".as_ref()) || path.extension() == Some("js".as_ref())) {
            if let Ok(file_symbols) = cartographer.parse_file(path) {
                symbols.extend(file_symbols);
            } else {
                log::warn!("Could not parse file: {}", path.display());
            }
        }
    }
    symbols
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    entry.file_name().to_str().map_or(false, |s| s.starts_with('.') || s == "node_modules")
}