pub mod commands;
pub mod database;

use commands::*;
use database::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize SQLite database and manage state in Tauri
            let db_state = DbState::new(app.handle())
                .expect("Failed to initialize SQLite database");
            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            get_customers,
            create_customer,
            create_sale,
            get_sync_queue,
            update_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
