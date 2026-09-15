use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let max_w = ((size.width as f64) * 0.5) as u32;
                    let max_h = ((size.height as f64) * 0.5) as u32;
                    let _ = window.set_max_size(Some(tauri::PhysicalSize::new(max_w.max(480), max_h.max(360))));
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
