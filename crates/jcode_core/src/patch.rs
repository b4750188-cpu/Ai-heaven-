//! jcode fast AST/diff patch engine

use crate::PatchResult;

pub struct PatchEngine;

impl PatchEngine {
    pub fn apply_patch(original: &str, target_chunk: &str, replacement: &str) -> Option<(String, usize)> {
        if !original.contains(target_chunk) {
            return None;
        }
        let updated = original.replacen(target_chunk, replacement, 1);
        Some((updated, 1))
    }

    pub fn dry_run_patch(original: &str, target_chunk: &str) -> bool {
        original.contains(target_chunk)
    }
}
