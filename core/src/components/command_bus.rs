// [[SECONDARY_MIND]]/src/components/command_bus.rs
// Purpose: Implements the "Command & Control Bus". It now delegates to the AISynthesisCore for final response generation.
// Architecture: The bus is now a true orchestrator. It prepares the data and passes it to the specialist (the AI Core) for the final, computationally expensive step. This maintains good separation of concerns.
// Dependencies: crate::{errors, model}, tokio::fs. Now also depends on `ai_synthesis_core`.

use crate::errors::SecondaryMindError;
use crate::model::command::AppCommand;
use crate::model::project::Project;
use crate::components::ai_synthesis_core::AISynthesisCore;
use std::collections::HashSet;
use tokio::fs;

/// The Command & Control Bus.
pub struct CommandBus {
    project: Project,
    ai_core: AISynthesisCore,
}

impl CommandBus {
    pub fn new(project: Project) -> Result<Self, SecondaryMindError> {
        let ai_core = AISynthesisCore::new()?;
        Ok(Self { project, ai_core })
    }

    /// Parses and executes a command from a raw string input.
    pub async fn execute_command(&self, input: &str) -> Result<String, SecondaryMindError> {
        match AppCommand::parse(input)? {
            AppCommand::Guidance { query } => self.handle_guidance(&query).await,
            AppCommand::Unknown(reason) => Ok(format!("Warning: {}", reason)),
        }
    }
    
    async fn handle_guidance(&self, query: &str) -> Result<String, SecondaryMindError> {
        log::info!("Handling guidance query: '{}'", query);

        // Find relevant files... (logic is unchanged)
        let query_keywords: Vec<String> = query.split_whitespace().map(|s| s.to_lowercase()).collect();
        let mut relevant_files = HashSet::new();
        for symbol in &self.project.symbolic_map {
            for keyword in &query_keywords {
                if symbol.identifier.to_lowercase().contains(keyword) {
                    relevant_files.insert(symbol.location.path.clone());
                    break;
                }
            }
        }
        
        if relevant_files.is_empty() { return Ok("No relevant symbols found in the codebase for your query.".to_string()); }

        // Assemble the context bundle
        let mut context = String::new();
        context.push_str("Based on the following code files, please answer the user's query.\n\n");
        context.push_str(&format!("User Query: {}\n\n---\n\n", query));
        
        for file_path in relevant_files {
            let content = fs::read_to_string(&file_path).await.map_err(|e| {
                SecondaryMindError::IoError { path: file_path.clone(), source: e }
            })?;
            context.push_str(&format!("// File: {}\n{}\n\n", file_path.display(), content));
        }

        // Delegate to the AI Core for the final synthesis
        self.ai_core.synthesize_guidance(context).await
    }
}
// Integration: Instantiated by `main`, and in turn instantiates and uses the `AISynthesisCore`.
// Notes: The logic is much cleaner now. The bus's job is context assembly; the core's job is AI interaction.