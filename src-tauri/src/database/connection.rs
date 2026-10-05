use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

use super::migrations::run_migrations;

#[derive(Clone)]
pub struct DbState(pub Arc<Mutex<Connection>>);

impl DbState {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let db_path = get_database_path(app_handle)?;
        log::info!("Connecting to SQLite database at: {:?}", db_path);

        let mut conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open SQLite database: {}", e))?;

        // Enable WAL mode for high concurrency & performance
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA synchronous = NORMAL;
             PRAGMA temp_store = MEMORY;
             PRAGMA busy_timeout = 5000;"
        ).map_err(|e| format!("Failed to configure SQLite PRAGMAs: {}", e))?;

        // Run migrations
        run_migrations(&mut conn)
            .map_err(|e| format!("Failed to run SQLite migrations: {}", e))?;

        Ok(DbState(Arc::new(Mutex::new(conn))))
    }
}

fn get_database_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }
        Ok(app_dir.join("arki_pos.db"))
    } else {
        // Fallback for development
        let local_dir = PathBuf::from("./.data");
        if !local_dir.exists() {
            let _ = fs::create_dir_all(&local_dir);
        }
        Ok(local_dir.join("arki_pos.db"))
    }
}
