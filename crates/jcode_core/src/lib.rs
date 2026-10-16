//! jcode_core: High-performance coding agent engine
//! Attribution: 1jehuang/jcode (MIT License)

pub mod session;
pub mod patch;
pub mod terminal;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JCodeConfig {
    pub model: String,
    pub temperature: f32,
    pub max_tokens: usize,
    pub fast_path_enabled: bool,
}

impl Default for JCodeConfig {
    fn default() -> Self {
        Self {
            model: "claude-3-5-sonnet".to_string(),
            temperature: 0.1,
            max_tokens: 4096,
            fast_path_enabled: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PatchResult {
    pub file_path: String,
    pub hunks_applied: usize,
    pub success: bool,
    pub diff: String,
}

pub fn generate_checksum(content: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}
