import fs from 'fs';
import path from 'path';

const libPath = path.join(process.cwd(), 'src-tauri/src/lib.rs');
let src = fs.readFileSync(libPath, 'utf8');

const helper = `
fn resolve_playback_test_config() -> Option<serde_json::Value> {
    use std::env;
    let args: Vec<String> = env::args().collect();
    let mut config_path: Option<String> = None;
    let mut i = 1usize;
    while i < args.len() {
        if args[i] == "--playback-test-config" && i + 1 < args.len() {
            config_path = Some(args[i + 1].clone());
            i += 2;
        } else if args[i] == "--playback-test" {
            i += 1;
        } else {
            i += 1;
        }
    }
    if config_path.is_none() && env::var("TUNER_PLAYBACK_TEST").ok().as_deref() == Some("1") {
        config_path = env::var("TUNER_PLAYBACK_TEST_CONFIG").ok();
    }
    let p = config_path?;
    let text = std::fs::read_to_string(&p).ok()?;
    serde_json::from_str(&text).ok()
}
`;

if (!src.includes('fn resolve_playback_test_config')) {
  const anchor = src.indexOf('#[tauri::command]');
  if (anchor >= 0) {
    src = src.slice(0, anchor) + helper + '\n' + src.slice(anchor);
  } else {
    src = helper + '\n' + src;
  }
}

src = src.replace(
  /#\[tauri::command\]\s*\nfn get_playback_test_config\([^)]*\)[^{]*\{[^}]*\}/s,
  `#[tauri::command]
fn get_playback_test_config(
    state: tauri::State<'_, std::sync::Mutex<PlaybackTestState>>,
) -> Option<serde_json::Value> {
    if let Ok(guard) = state.lock() {
        if let Some(ref cfg) = guard.config {
            return Some(cfg.clone());
        }
    }
    resolve_playback_test_config()
}`
);

if (!src.includes('resolve_playback_test_config()')) {
  src = src.replace(
    /fn get_playback_test_config\([\s\S]*?\n\}/,
    `fn get_playback_test_config(
    state: tauri::State<'_, std::sync::Mutex<PlaybackTestState>>,
) -> Option<serde_json::Value> {
    if let Ok(guard) = state.lock() {
        if let Some(ref cfg) = guard.config {
            return Some(cfg.clone());
        }
    }
    resolve_playback_test_config()
}`
  );
}

const setupNeedle = '.setup(|app| {';
if (src.includes(setupNeedle) && !src.includes('resolve_playback_test_config()')) {
  src = src.replace(
    setupNeedle,
    `${setupNeedle}
            if let Some(cfg) = resolve_playback_test_config() {
                if let Some(state) = app.try_state::<std::sync::Mutex<PlaybackTestState>>() {
                    if let Ok(mut guard) = state.lock() {
                        guard.config = Some(cfg);
                    }
                }
            }`
  );
}

fs.writeFileSync(libPath, src);
console.log(JSON.stringify({ patched: true, libPath: libPath.replace(/\\/g, '/') }));
