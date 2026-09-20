#[test]
fn smoke_mjs_zero_failures() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("project root");
    let output = std::process::Command::new("node")
        .arg("tests/smoke.mjs")
        .current_dir(root)
        .output()
        .expect("spawn node tests/smoke.mjs");
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        output.status.success(),
        "smoke.mjs exit {} stdout={} stderr={}",
        output.status,
        stdout,
        stderr
    );
    assert!(
        stdout.contains("TOTAL_FAILURES:0"),
        "expected TOTAL_FAILURES:0 in stdout: {}",
        stdout
    );
}
