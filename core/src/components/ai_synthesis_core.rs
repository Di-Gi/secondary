// [[SECONDARY_MIND]]/src/components/ai_synthesis_core.rs
// Purpose: Implements the "AI Synthesis Core". Connects to an external LLM, sends the context, and returns the response.
// Architecture: This component encapsulates all external network communication for AI. It handles API keys, request/response formats, and network errors. Fulfills FR6.
// Dependencies: crate::{errors, model::llm}, reqwest, std::env.

use crate::errors::SecondaryMindError;
use crate::model::llm::{Content, GeminiRequest, GeminiResponse, Part};
use reqwest::Client;
use std::env;

const GEMINI_API_URL_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=";

pub struct AISynthesisCore {
    client: Client,
    api_key: String,
}

impl AISynthesisCore {
    /// Creates a new AI Synthesis Core.
    /// Fails if the GEMINI_API_KEY environment variable is not set.
    pub fn new() -> Result<Self, SecondaryMindError> {
        let api_key = env::var("GEMINI_API_KEY").map_err(|_| {
            SecondaryMindError::ConfigError(
                "GEMINI_API_KEY environment variable not set.".to_string(),
            )
        })?;

        Ok(Self {
            client: Client::new(),
            api_key,
        })
    }

    /// Takes a full context string and gets guidance from the LLM.
    pub async fn synthesize_guidance(&self, context: String) -> Result<String, SecondaryMindError> {
        log::info!("Sending context to LLM ({} bytes)...", context.len());

        let request_body = GeminiRequest {
            contents: vec![Content {
                parts: vec![Part { text: context }],
            }],
        };
        
        let url = format!("{}{}", GEMINI_API_URL_BASE, self.api_key);

        let response = self
            .client
            .post(url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| SecondaryMindError::AIError(format!("Network request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_else(|_| "Could not retrieve error body".to_string());
            return Err(SecondaryMindError::AIError(format!(
                "API request failed with status {}: {}",
                status,
                error_body
            )));
        }

        let gemini_response = response.json::<GeminiResponse>().await.map_err(|e| {
            SecondaryMindError::AIError(format!("Failed to parse JSON response: {}", e))
        })?;

        gemini_response
            .extract_text()
            .ok_or_else(|| SecondaryMindError::AIError("No text content in AI response".to_string()))
    }
}
// Integration: This component is a dependency of the `CommandBus`.
// Notes: The use of `env::var` for the API key is a standard and secure practice. Error handling is critical here, covering network failures, API errors (e.g., bad key), and malformed responses.
