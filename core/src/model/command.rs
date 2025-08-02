// [[SECONDARY_MIND]]/src/model/command.rs
// Purpose: Defines the structured representation of a user's command.
// Architecture: This model transforms a raw string command into a validated, typed structure that the CommandBus can work with. This is crucial for separating parsing from execution logic.
// Dependencies: regex, lazy_static, crate::errors.

use crate::errors::SecondaryMindError;
use lazy_static::lazy_static;
use regex::Regex;

#[derive(Debug, PartialEq, Eq)]
pub enum AppCommand {
    Guidance { query: String },
    // Future commands: Review { file_path: String }, etc.
    Unknown(String),
}

lazy_static! {
    static ref COMMAND_RE: Regex = Regex::new(r"\[(\w+):\s*(.*?)\]").unwrap();
}

impl AppCommand {
    pub fn parse(input: &str) -> Result<Self, SecondaryMindError> {
        if let Some(caps) = COMMAND_RE.captures(input.trim()) {
            let command_type = caps.get(1).map_or("", |m| m.as_str());
            let query = caps.get(2).map_or("", |m| m.as_str()).to_string();

            match command_type {
                "guidance" => Ok(AppCommand::Guidance { query }),
                _ => Ok(AppCommand::Unknown(format!("Command type '{}' not recognized.", command_type))),
            }
        } else {
            Err(SecondaryMindError::CommandParseError(
                "Invalid command format. Expected `[command: query]`".to_string(),
            ))
        }
    }
}
// Integration: The `CommandBus` will use `AppCommand::parse` to interpret user input strings.
// Notes: Using a regex with `lazy_static` is an efficient way to handle command parsing.