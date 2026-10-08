use rusqlite::{params_from_iter, types::{Value as SqlValue, ValueRef}, Connection};
use serde_json::{json, Map, Value};
use tauri::{Manager, State};
use crate::database::DbState;

pub const TABLES: &[&str] = &["business_settings", "customers", "items", "mazdoors", "sales", "sale_items", "sale_item_mazdoori_tasks", "payments", "customer_ledger", "mazdoori_entries", "expenses", "sync_queue"];
// Tables added after the first v2 backups; older backups may omit them.
const OPTIONAL_TABLES: &[&str] = &["expenses"];

pub fn rows(conn: &Connection, table: &str) -> Result<Vec<Value>, String> {
    if !TABLES.contains(&table) { return Err("Unsupported table".into()); }
    let mut stmt = conn.prepare(&format!("SELECT * FROM {} ORDER BY rowid", table)).map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut result = Vec::new();
    let mut query = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = query.next().map_err(|e| e.to_string())? {
        let mut object = Map::new();
        for (i, name) in names.iter().enumerate() {
            let value = match row.get_ref(i).map_err(|e| e.to_string())? {
                ValueRef::Null => Value::Null,
                ValueRef::Integer(n) => json!(n),
                ValueRef::Real(n) if n.is_finite() => json!(n),
                ValueRef::Text(s) => Value::String(String::from_utf8(s.to_vec()).map_err(|e| e.to_string())?),
                _ => return Err("Unsupported database value".into()),
            };
            object.insert(name.clone(), value);
        }
        result.push(Value::Object(object));
    }
    Ok(result)
}

pub fn snapshot(conn: &Connection) -> Result<Value, String> {
    let mut tables = Map::new();
    for table in TABLES { tables.insert(table.to_string(), Value::Array(rows(conn, table)?)); }
    Ok(json!({"format": "arki-pos", "version": 2, "exportedAt": chrono::Utc::now().to_rfc3339(), "tables": tables}))
}

#[tauri::command]
pub fn export_database(state: State<DbState>) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    snapshot(&conn)
}

#[tauri::command]
pub fn restore_database(backup: Value, app: tauri::AppHandle, state: State<DbState>) -> Result<bool, String> {
    if backup["format"] != "arki-pos" || backup["version"] != 2 || backup.to_string().len() > 50_000_000 { return Err("Unsupported or oversized backup".into()); }
    let tables = backup["tables"].as_object().ok_or("Missing backup tables")?;
    if tables.keys().any(|k| !TABLES.contains(&k.as_str())) || TABLES.iter().any(|t| match tables.get(*t) { Some(v) => !v.is_array(), None => !OPTIONAL_TABLES.contains(t) }) { return Err("Incomplete backup".into()); }
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    // Keep a recoverable copy before replacing local data. Path is chosen by the application.
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let recovery = directory.join(format!("before-restore-{}.json", chrono::Utc::now().timestamp_millis()));
    std::fs::write(recovery, serde_json::to_vec_pretty(&snapshot(&conn)?).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for table in TABLES.iter().rev() { tx.execute(&format!("DELETE FROM {}", table), []).map_err(|e| e.to_string())?; }
    for table in TABLES {
        if *table == "sync_queue" { continue; }
        let mut stmt = tx.prepare(&format!("PRAGMA table_info({})", table)).map_err(|e| e.to_string())?;
        let columns: Vec<String> = stmt.query_map([], |r| r.get(1)).map_err(|e| e.to_string())?.collect::<rusqlite::Result<_>>().map_err(|e| e.to_string())?;
        drop(stmt);
        let Some(records) = tables.get(*table).and_then(Value::as_array) else { continue };
        for value in records {
            let row = value.as_object().ok_or("Invalid record")?;
            if row.get("id").and_then(Value::as_str).is_none_or(|s| s.is_empty()) || row.keys().any(|key| !columns.contains(key)) { return Err("Invalid backup fields".into()); }
            let mut fields = Vec::new(); let mut values = Vec::new();
            for (key, value) in row {
                fields.push(key.clone());
                values.push(match value {
                    Value::Null => SqlValue::Null,
                    Value::Bool(b) => SqlValue::Integer(i64::from(*b)),
                    Value::Number(n) => match n.as_i64() { Some(i) => SqlValue::Integer(i), None => SqlValue::Real(n.as_f64().filter(|n| n.is_finite()).ok_or("Invalid amount")?) },
                    Value::String(s) => SqlValue::Text(s.clone()),
                    _ => return Err("Invalid backup value".into()),
                });
            }
            let sql = format!("INSERT INTO {} ({}) VALUES ({})", table, fields.join(","), vec!["?"; fields.len()].join(","));
            tx.execute(&sql, params_from_iter(values)).map_err(|e| format!("Invalid {} backup: {}", table, e))?;
        }
    }
    let invalid: i64 = tx.query_row("SELECT COUNT(*) FROM sales s WHERE total <= 0 OR paid_amount < 0 OR paid_amount > total OR ABS(total-paid_amount-remaining_credit) > 0.02 OR ABS(total-(SELECT COALESCE(SUM(amount),0) FROM sale_items WHERE sale_id=s.id)+discount) > 0.02", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let invalid_items: i64 = tx.query_row("SELECT COUNT(*) FROM sale_items WHERE quantity<=0 OR rate<0 OR mazdoori<0 OR (ABS(quantity*rate-amount)>0.02 AND ABS(quantity*rate+mazdoori-amount)>0.02)", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let defaults: i64 = tx.query_row("SELECT COUNT(*) FROM business_settings WHERE id='default' AND next_invoice_number>0 AND length(invoice_prefix)>0", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let invalid_expenses: i64 = tx.query_row("SELECT COUNT(*) FROM expenses WHERE amount<=0 OR length(category)=0 OR payment_method NOT IN ('cash','bank')", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if invalid > 0 || invalid_items > 0 || invalid_expenses > 0 || defaults != 1 { return Err("Backup financial validation failed; original data retained".into()); }
    // Discard old acknowledgements and requeue the restored snapshot; cloud upload stays paused in the UI.
    tx.execute("DELETE FROM sync_queue", []).map_err(|e| e.to_string())?;
    for table in TABLES.iter().filter(|t| **t != "sync_queue") {
        tx.execute_batch(&format!("INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,status) SELECT lower(hex(randomblob(16))),'{table}',id,'UPDATE','{{}}','pending' FROM {table};")).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

pub fn install_sync_triggers(conn: &mut Connection) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    let initialized: i64 = tx.query_row("SELECT COUNT(*) FROM schema_migrations WHERE version=2", [], |r| r.get(0))?;
    for table in TABLES.iter().filter(|t| **t != "sync_queue") {
        let mut info = tx.prepare(&format!("PRAGMA table_info({table})"))?;
        let columns: Vec<String> = info.query_map([], |r| r.get(1))?.collect::<rusqlite::Result<_>>()?;
        drop(info);
        let updates = columns.iter().filter(|c| c.as_str() != "sync_status" && c.as_str() != "updated_at").cloned().collect::<Vec<_>>().join(",");
        tx.execute_batch(&format!("DROP TRIGGER IF EXISTS sync_{table}_UPDATE;"))?;
        for (event, operation, record) in [("INSERT", "INSERT", "NEW"), ("UPDATE", "UPDATE", "NEW"), ("DELETE", "DELETE", "OLD")] {
            let event_clause = if event == "UPDATE" { format!("UPDATE OF {updates}") } else { event.to_string() };
            tx.execute_batch(&format!("CREATE TRIGGER IF NOT EXISTS sync_{table}_{event} AFTER {event_clause} ON {table} BEGIN INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,status) VALUES(lower(hex(randomblob(16))),'{table}',{record}.id,'{operation}','{{}}','pending'); END;"))?;
        }
        if initialized == 0 {
            tx.execute_batch(&format!("INSERT INTO sync_queue(id,entity_type,entity_id,operation,payload,status) SELECT lower(hex(randomblob(16))),'{table}',id,'UPDATE','{{}}','pending' FROM {table};"))?;
        }
    }
    tx.execute("INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(2,'complete_sync_queue',datetime('now'))", [])?;
    tx.commit()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn complete_snapshot_and_trigger_acknowledgement() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        crate::database::migrations::run_migrations(&mut conn).unwrap();
        install_sync_triggers(&mut conn).unwrap();
        conn.execute("DELETE FROM sync_queue", []).unwrap();
        conn.execute("INSERT INTO customers(id,name,mobile) VALUES('customer','Test Customer','03000000000')", []).unwrap();
        let pending: i64 = conn.query_row("SELECT count(*) FROM sync_queue WHERE entity_type='customers'", [], |r| r.get(0)).unwrap();
        assert_eq!(pending, 1);
        conn.execute("UPDATE customers SET sync_status='synced' WHERE id='customer'", []).unwrap();
        let after_ack: i64 = conn.query_row("SELECT count(*) FROM sync_queue", [], |r| r.get(0)).unwrap();
        assert_eq!(after_ack, pending);
        conn.execute("UPDATE customers SET name='Renamed Customer' WHERE id='customer'", []).unwrap();
        let after_edit: i64 = conn.query_row("SELECT count(*) FROM sync_queue", [], |r| r.get(0)).unwrap();
        assert_eq!(after_edit, pending + 1);
        let exported = snapshot(&conn).unwrap();
        assert_eq!(exported["tables"].as_object().unwrap().len(), TABLES.len());
        assert_eq!(exported["tables"]["customers"][0]["name"], "Renamed Customer");
    }
}
