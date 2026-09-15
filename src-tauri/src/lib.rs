use tauri::Manager;
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app|{
      if let Some(w)=app.get_webview_window("main"){
        if let Ok(Some(m))=w.current_monitor(){
          let s=m.size();
          let _=w.set_max_size(Some(tauri::PhysicalSize::new(((s.width as f64)*0.5) as u32,((s.height as f64)*0.5) as u32)));
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("fail");
}
