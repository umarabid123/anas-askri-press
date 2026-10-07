pub mod commands;
pub mod database;

use commands::*;
use database::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
            get_customer_by_id,
            create_customer,
            update_customer,
            delete_customer,
            get_customer_ledger,
            receive_payment,
            create_sale,
            update_sale,
            get_sync_queue,
            update_sync_status,
            get_mazdoors,
            create_mazdoor,
            update_mazdoor,
            delete_mazdoor,
            get_mazdoori_entries,
            create_mazdoori_entry,
            delete_mazdoori_entry,
            pay_mazdoor,
            get_sales,
            cancel_sale,
            get_expenses,
            create_expense,
            delete_expense,
            get_business_settings,
            update_business_settings,
            export_database,
            restore_database,
            save_export_file,
            pick_backup_file,
            daily_backup,
            open_whatsapp,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
