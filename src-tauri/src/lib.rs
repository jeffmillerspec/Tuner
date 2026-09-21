use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Duration;

fn listen_for_oauth_redirect(port: u16, timeout_ms: u64) -> Result<String, String> {
  let listener = TcpListener::bind(("127.0.0.1", port))
    .map_err(|e| format!("Could not listen on 127.0.0.1:{port}: {e}. Close other Tuner windows and try again."))?;
  listener
    .set_nonblocking(true)
    .map_err(|e| format!("socket error: {e}"))?;

  let deadline = std::time::Instant::now() + Duration::from_millis(timeout_ms.max(5_000));
  let (mut stream, _) = loop {
    if std::time::Instant::now() > deadline {
      return Err("Timed out waiting for Spotify login. Use “Finish login” with the redirect URL, or try Connect again.".into());
    }
    match listener.accept() {
      Ok(conn) => break conn,
      Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
        std::thread::sleep(Duration::from_millis(40));
      }
      Err(e) => return Err(format!("accept failed: {e}")),
    }
  };

  let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
  let mut buf = [0u8; 8192];
  let n = stream.read(&mut buf).map_err(|e| format!("read failed: {e}"))?;
  let req = String::from_utf8_lossy(&buf[..n]);
  let first = req.lines().next().unwrap_or("");
  let path = first
    .strip_prefix("GET ")
    .and_then(|s| s.split_whitespace().next())
    .unwrap_or("");

  let html = if path.contains("code=") {
    "<!doctype html><html><body style=\"font-family:system-ui;background:#02090e;color:#dbf2f2;padding:2rem\">\
     <h1>Tuner connected</h1><p>You can close this window and return to Tuner.</p></body></html>"
  } else {
    "<!doctype html><html><body style=\"font-family:system-ui;background:#02090e;color:#ffb4bf;padding:2rem\">\
     <h1>Login incomplete</h1><p>No authorization code received. Return to Tuner and try again.</p></body></html>"
  };
  let resp = format!(
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
    html.len(),
    html
  );
  let _ = stream.write_all(resp.as_bytes());

  if !path.contains('?') {
    return Err("Spotify redirect did not include query parameters.".into());
  }
  Ok(format!("http://127.0.0.1:{port}{path}"))
}

/// Runs on a worker thread so the UI / IPC loop never blocks while waiting for Spotify.
#[tauri::command]
async fn await_oauth_redirect(port: u16, timeout_ms: u64) -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(move || listen_for_oauth_redirect(port, timeout_ms))
    .await
    .map_err(|e| format!("OAuth listener failed: {e}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![await_oauth_redirect])
    .run(tauri::generate_context!())
    .expect("error running Tuner");
}
