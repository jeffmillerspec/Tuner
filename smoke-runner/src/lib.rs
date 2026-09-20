#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use std::process::Command;

    fn workspace_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("workspace root")
            .to_path_buf()
    }

    #[test]
    fn smoke_mjs_reports_zero_failures() {
        let root = workspace_root();
        let output = Command::new("node")
            .arg("tests/smoke.mjs")
            .current_dir(&root)
            .output()
            .expect("failed to spawn node smoke.mjs");
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(output.status.success(), "smoke.mjs failed: {stdout}");
        assert!(stdout.contains("TOTAL_FAILURES:0"), "missing TOTAL_FAILURES:0 in: {stdout}");
    }
}
