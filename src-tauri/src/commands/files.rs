use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use crate::database::DbState;

#[tauri::command]
pub async fn save_export_file(app: AppHandle, name: String, bytes: Vec<u8>, kind: String) -> Result<bool, String> {
    if !["json", "png"].contains(&kind.as_str()) || bytes.len() > 50_000_000 || name.contains(['/', '\\']) { return Err("Invalid export".into()); }
    if kind == "json" {
        let value: serde_json::Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        if value["format"] != "arki-pos" || value["version"] != 2 { return Err("Invalid backup format".into()); }
    } else if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") { return Err("Invalid PNG image".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().add_filter("Arki export", &[kind.as_str()]).set_file_name(name).blocking_save_file() else { return Ok(false); };
        let path = selected.into_path().map_err(|e| e.to_string())?;
        if path.extension().and_then(|s| s.to_str()) != Some(kind.as_str()) { return Err(format!("Please choose a .{} file", kind)); }
        std::fs::write(path, bytes).map_err(|e| e.to_string())?;
        Ok(true)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pick_backup_file(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().add_filter("Arki backup", &["json"]).blocking_pick_file() else { return Ok(None); };
        let path = selected.into_path().map_err(|e| e.to_string())?;
        if std::fs::metadata(&path).map_err(|e| e.to_string())?.len() > 50_000_000 { return Err("Backup is too large".into()); }
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
        Ok(Some(serde_json::from_slice(&bytes).map_err(|e| e.to_string())?))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn daily_backup(app: AppHandle, state: State<DbState>) -> Result<bool, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join(format!("daily-{}.json", chrono::Local::now().format("%Y-%m-%d")));
    if path.exists() { return Ok(true); }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let data = serde_json::to_vec_pretty(&super::snapshot::snapshot(&conn)?).map_err(|e| e.to_string())?;
    std::fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn open_whatsapp(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://wa.me/") { return Err("Only WhatsApp links are allowed".into()); }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}
