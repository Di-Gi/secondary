// [[SECONDARY_MIND]]/src/model/llm.rs
// Purpose: Defines data structures for serializing and deserializing LLM API requests and responses.
// Architecture: These structs are designed to match the Google Gemini API's JSON schema. Using `serde` allows for automatic conversion to and from JSON.
// Dependencies: serde.

use serde::{Deserialize, Serialize};

// --- Request & Response Structures ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeminiRequest {
    pub contents: Vec<Content>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Content {
    pub parts: Vec<Part>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Part {
    pub text: String,
}

// --- Response Structures ---

#[derive(Deserialize, Debug)]
pub struct GeminiResponse {
    pub candidates: Vec<Candidate>,
}

#[derive(Deserialize, Debug)]
pub struct Candidate {
    pub content: Content,
}


impl GeminiResponse {
    /// Extracts the complete text from the first candidate in the response.
    pub fn extract_text(&self) -> Option<String> {
        self.candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .map(|p| p.text.clone())
    }
}
// Integration: These structs are used by `AISynthesisCore` to communicate with the Gemini API endpoint.
// Notes: These structs represent the contract between our application and the external AI service.