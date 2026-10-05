use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::database::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerDto {
    pub id: String,
    pub name: String,
    pub mobile: String,
    pub address: Option<String>,
    #[serde(rename = "totalPurchase", default)]
    pub total_purchase: f64,
    #[serde(rename = "totalPaid", default)]
    pub total_paid: f64,
    #[serde(default)]
    pub balance: f64,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
    #[serde(rename = "syncStatus", default = "default_sync_status")]
    pub sync_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemMazdooriTaskDto {
    pub id: Option<String>,
    pub title: String,
    pub amount: f64,
    #[serde(rename = "workerName")]
    pub worker_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemDto {
    pub id: Option<String>,
    #[serde(rename = "itemId")]
    pub item_id: Option<String>,
    #[serde(rename = "itemName")]
    pub item_name: String,
    pub quantity: f64,
    pub rate: f64,
    #[serde(default)]
    pub mazdoori: f64,
    #[serde(rename = "mazdooriTasks", default)]
    pub mazdoori_tasks: Vec<ItemMazdooriTaskDto>,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleDto {
    pub id: Option<String>,
    #[serde(rename = "invoiceNumber")]
    pub invoice_number: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<String>,
    #[serde(rename = "customerName")]
    pub customer_name: Option<String>,
    #[serde(rename = "customerMobile")]
    pub customer_mobile: Option<String>,
    pub items: Vec<SaleItemDto>,
    pub subtotal: f64,
    #[serde(default)]
    pub discount: f64,
    #[serde(rename = "totalMazdoori", default)]
    pub total_mazdoori: f64,
    pub total: f64,
    #[serde(rename = "paidAmount", default)]
    pub paid_amount: f64,
    #[serde(rename = "remainingCredit", default)]
    pub remaining_credit: f64,
    #[serde(rename = "paymentMethod", default = "default_payment_method")]
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MazdooriEntryDto {
    pub id: String,
    #[serde(rename = "mazdoorId")]
    pub mazdoor_id: String,
    #[serde(rename = "mazdoorName")]
    pub mazdoor_name: String,
    #[serde(rename = "workDate")]
    pub work_date: String,
    #[serde(rename = "workDetail")]
    pub work_detail: String,
    pub amount: f64,
    #[serde(rename = "paidAmount", default)]
    pub paid_amount: f64,
    #[serde(default)]
    pub balance: f64,
    pub notes: Option<String>,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
    #[serde(rename = "syncStatus", default = "default_sync_status")]
    pub sync_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncQueueItemDto {
    pub id: String,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    #[serde(rename = "entityId")]
    pub entity_id: String,
    pub operation: String,
    pub payload: String,
    pub status: String,
    #[serde(rename = "retryCount")]
    pub retry_count: i32,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

fn default_sync_status() -> String {
    "pending".to_string()
}

fn default_payment_method() -> String {
    "cash".to_string()
}

// ----------------------------------------------------------------------------
// TAURI COMMANDS
// ----------------------------------------------------------------------------

#[tauri::command]
pub fn init_database(state: State<DbState>) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM schema_migrations")
        .map_err(|e| e.to_string())?;
    let count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command]
pub fn get_customers(state: State<DbState>) -> Result<Vec<CustomerDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, mobile, address, total_purchase, total_paid, balance, created_at, updated_at, sync_status
             FROM customers ORDER BY updated_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CustomerDto {
                id: row.get(0)?,
                name: row.get(1)?,
                mobile: row.get(2)?,
                address: row.get(3)?,
                total_purchase: row.get(4)?,
                total_paid: row.get(5)?,
                balance: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                sync_status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut customers = Vec::new();
    for r in rows {
        customers.push(r.map_err(|e| e.to_string())?);
    }
    Ok(customers)
}

#[tauri::command]
pub fn create_customer(customer: CustomerDto, state: State<DbState>) -> Result<CustomerDto, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let id = if customer.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        customer.id
    };

    tx.execute(
        "INSERT INTO customers (id, name, mobile, address, total_purchase, total_paid, balance, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')",
        params![
            id,
            customer.name,
            customer.mobile,
            customer.address,
            customer.total_purchase,
            customer.total_paid,
            customer.balance,
        ],
    ).map_err(|e| e.to_string())?;

    // Add to sync queue
    let queue_id = Uuid::new_v4().to_string();
    let payload = serde_json::to_string(&CustomerDto {
        id: id.clone(),
        name: customer.name.clone(),
        mobile: customer.mobile.clone(),
        address: customer.address.clone(),
        total_purchase: customer.total_purchase,
        total_paid: customer.total_paid,
        balance: customer.balance,
        created_at: None,
        updated_at: None,
        sync_status: "pending".to_string(),
    }).unwrap_or_default();

    tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'customer', ?2, 'INSERT', ?3, 'pending')",
        params![queue_id, id, payload],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(CustomerDto {
        id,
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        total_purchase: customer.total_purchase,
        total_paid: customer.total_paid,
        balance: customer.balance,
        created_at: None,
        updated_at: None,
        sync_status: "pending".to_string(),
    })
}

#[tauri::command]
pub fn create_sale(sale: CreateSaleDto, state: State<DbState>) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let sale_id = sale.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    // Generate invoice number if not provided
    let invoice_number = match sale.invoice_number {
        Some(ref inv) if !inv.is_empty() => inv.clone(),
        _ => {
            let mut prefix_stmt = tx.prepare("SELECT invoice_prefix, next_invoice_number FROM business_settings WHERE id = 'default'")
                .map_err(|e| e.to_string())?;
            let (prefix, next_num): (String, i64) = prefix_stmt.query_row([], |row| {
                Ok((row.get(0)?, row.get(1)?))
            }).unwrap_or(("ARKI".to_string(), 1001));

            tx.execute(
                "UPDATE business_settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 'default'",
                [],
            ).map_err(|e| e.to_string())?;

            format!("{}-{}", prefix, next_num)
        }
    };

    // 1. Insert into sales
    tx.execute(
        "INSERT INTO sales (id, invoice_number, customer_id, customer_name, customer_mobile, subtotal, discount, total_mazdoori, total, paid_amount, remaining_credit, payment_method, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'pending')",
        params![
            sale_id,
            invoice_number,
            sale.customer_id,
            sale.customer_name,
            sale.customer_mobile,
            sale.subtotal,
            sale.discount,
            sale.total_mazdoori,
            sale.total,
            sale.paid_amount,
            sale.remaining_credit,
            sale.payment_method,
            sale.notes,
        ],
    ).map_err(|e| e.to_string())?;

    // 2. Insert Sale Items
    for item in &sale.items {
        let item_id = item.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
        tx.execute(
            "INSERT INTO sale_items (id, sale_id, item_id, item_name, quantity, rate, mazdoori, amount)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                item_id,
                sale_id,
                item.item_id,
                item.item_name,
                item.quantity,
                item.rate,
                item.mazdoori,
                item.amount,
            ],
        ).map_err(|e| e.to_string())?;

        // 3. Insert Mazdoori Tasks for item if any
        for task in &item.mazdoori_tasks {
            let task_id = task.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
            tx.execute(
                "INSERT INTO sale_item_mazdoori_tasks (id, sale_item_id, title, amount, worker_name)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![task_id, item_id, task.title, task.amount, task.worker_name],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 4. Record Payment if paid_amount > 0
    if sale.paid_amount > 0.0 {
        let payment_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO payments (id, customer_id, sale_id, amount, payment_method, notes, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
            params![
                payment_id,
                sale.customer_id,
                sale_id,
                sale.paid_amount,
                sale.payment_method,
                format!("Payment for invoice {}", invoice_number),
            ],
        ).map_err(|e| e.to_string())?;
    }

    // 5. Update Customer Totals & Ledger if customer linked
    if let Some(ref cust_id) = sale.customer_id {
        if !cust_id.is_empty() {
            // Add Ledger Entry
            let ledger_id = Uuid::new_v4().to_string();
            let new_balance = {
                let current_bal: f64 = tx.query_row(
                    "SELECT balance FROM customers WHERE id = ?1",
                    params![cust_id],
                    |row| row.get(0),
                ).optional().map_err(|e| e.to_string())?.unwrap_or(0.0);
                current_bal + sale.remaining_credit
            };

            tx.execute(
                "INSERT INTO customer_ledger (id, customer_id, description, debit, credit, balance, sale_id, sync_status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending')",
                params![
                    ledger_id,
                    cust_id,
                    format!("Invoice #{}", invoice_number),
                    sale.total,
                    sale.paid_amount,
                    new_balance,
                    sale_id,
                ],
            ).map_err(|e| e.to_string())?;

            // Update customer record
            tx.execute(
                "UPDATE customers
                 SET total_purchase = total_purchase + ?1,
                     total_paid = total_paid + ?2,
                     balance = balance + ?3,
                     updated_at = datetime('now'),
                     sync_status = 'pending'
                 WHERE id = ?4",
                params![sale.total, sale.paid_amount, sale.remaining_credit, cust_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 6. Enqueue to sync_queue
    let queue_id = Uuid::new_v4().to_string();
    let payload = serde_json::to_string(&sale).unwrap_or_default();
    tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'sale', ?2, 'INSERT', ?3, 'pending')",
        params![queue_id, sale_id, payload],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(invoice_number)
}

#[tauri::command]
pub fn get_sync_queue(limit: Option<i32>, state: State<DbState>) -> Result<Vec<SyncQueueItemDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(50);
    let mut stmt = conn
        .prepare(
            "SELECT id, entity_type, entity_id, operation, payload, status, retry_count, last_error, created_at, updated_at
             FROM sync_queue
             WHERE status IN ('pending', 'failed')
             ORDER BY created_at ASC
             LIMIT ?1"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit_val], |row| {
            Ok(SyncQueueItemDto {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                operation: row.get(3)?,
                payload: row.get(4)?,
                status: row.get(5)?,
                retry_count: row.get(6)?,
                last_error: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in rows {
        items.push(r.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
pub fn update_sync_status(
    queue_id: String,
    status: String,
    last_error: Option<String>,
    state: State<DbState>,
) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE sync_queue
         SET status = ?1,
             last_error = ?2,
             retry_count = retry_count + CASE WHEN ?1 = 'failed' THEN 1 ELSE 0 END,
             updated_at = datetime('now')
         WHERE id = ?3",
        params![status, last_error, queue_id],
    ).map_err(|e| e.to_string())?;
    Ok(true)
}
