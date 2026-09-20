import fs from 'fs';
import path from 'path';

const libPath = path.join(process.cwd(), 'src-tauri/src/lib.rs');
let src = fs.readFileSync(libPath, 'utf8');
let changed = false;

const writeFn = `#[tauri::command]
fn write_playback_evidence(path: String, content: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(p, content).map_err(|e| e.to_string())
}`;

if (/fn write_playback_evidence\(/.test(src)) {
  src = src.replace(
    /#\[tauri::command\]\s*\nfn write_playback_evidence\([\s\S]*?\n\}/,
    writeFn
  );
  changed = true;
} else if (!src.includes('fn write_playback_evidence(')) {
  const anchor = src.indexOf('#[tauri::command]');
  const insertAt = anchor >= 0 ? anchor : src.length;
  src = src.slice(0, insertAt) + writeFn + '\n\n' + src.slice(insertAt);
  changed = true;
}

const defaultConfigNeedle = 'docs/playback-test-config.json';
if (src.includes('fn resolve_playback_test_config') && !src.includes(defaultConfigNeedle)) {
  src = src.replace(
    /(\s*)let p = config_path\?;/,
    `$1if config_path.is_none() {
$1    let candidates = [
$1        "docs/playback-test-config.json".to_string(),
$1    ];
$1    for c in candidates {
$1        if std::path::Path::new(&c).is_file() {
$1            config_path = Some(c);
$1            break;
$1        }
$1    }
$1}
$1let p = config_path?;`
  );
  changed = true;
}

if (!src.includes('write_playback_evidence')) {
  const handlerNeedle = '.invoke_handler(tauri::generate_handler![';
  if (src.includes(handlerNeedle)) {
    src = src.replace(
      /invoke_handler\(tauri::generate_handler!\[([\s\S]*?)\]\)/,
      (m, inner) => {
        if (inner.includes('write_playback_evidence')) return m;
        const trimmed = inner.trimEnd();
        const sep = trimmed.endsWith(',') || !trimmed ? '' : ',';
        return `.invoke_handler(tauri::generate_handler![${trimmed}${sep}
            write_playback_evidence,
        ])`;
      }
    );
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(libPath, src);
}
console.log(JSON.stringify({ patched: changed, libPath: libPath.replace(/\\/g, '/') }));
