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
    #[serde(rename = "workerName", alias = "mazdoorName")]
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
// DTOs for new commands
// ----------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerLedgerEntryDto {
    pub id: String,
    #[serde(rename = "customerId")]
    pub customer_id: String,
    pub date: String,
    pub description: String,
    pub debit: f64,
    pub credit: f64,
    pub balance: f64,
    #[serde(rename = "saleId")]
    pub sale_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceivePaymentDto {
    #[serde(rename = "customerId", default)]
    pub customer_id: Option<String>,
    #[serde(rename = "saleId", default)]
    pub sale_id: Option<String>,
    pub amount: f64,
    #[serde(rename = "paymentMethod")]
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MazdoorDto {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    #[serde(rename = "totalWork", default)]
    pub total_work: f64,
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
pub struct PayMazdoorDto {
    #[serde(rename = "mazdoorId")]
    pub mazdoor_id: String,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleRecordDto {
    pub items: Vec<SaleItemDto>,
    pub id: String,
    #[serde(rename = "invoiceNumber")]
    pub invoice_number: String,
    #[serde(rename = "customerId")]
    pub customer_id: Option<String>,
    #[serde(rename = "customerName")]
    pub customer_name: Option<String>,
    #[serde(rename = "customerMobile")]
    pub customer_mobile: Option<String>,
    pub subtotal: f64,
    pub discount: f64,
    #[serde(rename = "totalMazdoori")]
    pub total_mazdoori: f64,
    pub total: f64,
    #[serde(rename = "paidAmount")]
    pub paid_amount: f64,
    #[serde(rename = "remainingCredit")]
    pub remaining_credit: f64,
    #[serde(rename = "paymentMethod")]
    pub payment_method: String,
    pub notes: Option<String>,
    #[serde(rename = "cancelledAt")]
    pub cancelled_at: Option<String>,
    #[serde(rename = "cancelReason")]
    pub cancel_reason: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseDto {
    pub id: String,
    #[serde(rename = "expenseDate")]
    pub expense_date: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: f64,
    #[serde(rename = "paymentMethod", default = "default_payment_method")]
    pub payment_method: String,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
    #[serde(rename = "syncStatus", default = "default_sync_status")]
    pub sync_status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BusinessSettingsDto {
    pub id: String,
    #[serde(rename = "businessName")]
    pub business_name: String,
    pub subtitle: String,
    pub phone: String,
    pub address: String,
    #[serde(rename = "logoPath")]
    pub logo_path: Option<String>,
    #[serde(rename = "invoicePrefix")]
    pub invoice_prefix: String,
    #[serde(rename = "nextInvoiceNumber")]
    pub next_invoice_number: i64,
    #[serde(rename = "receiptPaperSize")]
    pub receipt_paper_size: String,
    #[serde(rename = "footerText")]
    pub footer_text: String,
    #[serde(rename = "showLogo")]
    pub show_logo: bool,
    #[serde(rename = "defaultPrinter")]
    pub default_printer: Option<String>,
    pub currency: String,
    #[serde(rename = "currencySymbol")]
    pub currency_symbol: String,
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
    if customer.name.trim().len()<2 || customer.mobile.trim().len()<10 || customer.total_purchase != 0.0 || customer.total_paid != 0.0 || customer.balance != 0.0 { return Err("Invalid customer profile".into()); }
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
    let number = create_sale_in_transaction(sale, &tx)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(number)
}

fn create_sale_in_transaction(mut sale: CreateSaleDto, tx: &rusqlite::Transaction<'_>) -> Result<String, String> {

    if sale.items.is_empty() || !sale.discount.is_finite() || sale.discount < 0.0 || !sale.paid_amount.is_finite() || sale.paid_amount < 0.0 || !["cash", "bank"].contains(&sale.payment_method.as_str()) { return Err("Invalid bill or payment".into()); }
    let mut goods = 0.0; let mut labor = 0.0; let mut gross = 0.0;
    for item in &mut sale.items {
        if item.item_name.trim().is_empty() || !item.quantity.is_finite() || item.quantity <= 0.0 || !item.rate.is_finite() || item.rate < 0.0 || !item.mazdoori.is_finite() || item.mazdoori < 0.0 { return Err("Enter valid item descriptions, quantities and amounts".into()); }
        let task_total: f64 = item.mazdoori_tasks.iter().map(|t| t.amount).sum();
        if item.mazdoori_tasks.iter().any(|t| t.title.trim().is_empty() || !t.amount.is_finite() || t.amount <= 0.0) || (!item.mazdoori_tasks.is_empty() && (task_total-item.mazdoori).abs()>0.01) { return Err("Invalid labor breakdown".into()); }
        item.item_name = item.item_name.trim().to_string();
        item.amount = ((item.quantity*item.rate)*100.0).round()/100.0;
        goods += item.amount; labor += item.mazdoori; gross += item.amount;
    }
    sale.subtotal = (goods*100.0).round()/100.0; sale.total_mazdoori = (labor*100.0).round()/100.0;
    sale.total = ((gross-sale.discount)*100.0).round()/100.0;
    sale.paid_amount = (sale.paid_amount*100.0).round()/100.0;
    if !sale.total.is_finite() || sale.total > 9_999_999_999.99 || sale.total <= 0.0 || sale.paid_amount > sale.total { return Err("Payment cannot exceed a positive bill total".into()); }
    sale.remaining_credit = ((sale.total-sale.paid_amount)*100.0).round()/100.0;
    if sale.remaining_credit > 0.0 && sale.customer_id.as_ref().is_none_or(|id| id.is_empty()) { return Err("Select a customer for a credit bill".into()); }
    let sale_id = Uuid::new_v4().to_string();

    let invoice_number = match sale.invoice_number {
        Some(ref inv) if !inv.trim().is_empty() => inv.trim().to_string(),
        _ => {
            let (prefix, mut sequence): (String, i64) = tx.query_row("SELECT invoice_prefix,next_invoice_number FROM business_settings WHERE id='default'", [], |r| Ok((r.get(0)?,r.get(1)?))).map_err(|e| e.to_string())?;
            if sequence<1 || prefix.trim().is_empty() { return Err("Invalid invoice settings".into()); }
            let mut number = format!("{}-{:04}",prefix,sequence);
            loop {
                let count: i64 = tx.query_row("SELECT COUNT(*) FROM sales WHERE invoice_number=?1",params![number],|r|r.get(0)).map_err(|e|e.to_string())?;
                if count==0 { break; }
                sequence = sequence.checked_add(1).ok_or("Invoice sequence overflow")?;
                number = format!("{}-{:04}",prefix,sequence);
            }
            tx.execute("UPDATE business_settings SET next_invoice_number=?1 WHERE id='default'",params![sequence.checked_add(1).ok_or("Invoice sequence overflow")?]).map_err(|e|e.to_string())?;
            number
        }
    };

    // 1. Insert into sales
    tx.execute(
        "INSERT INTO sales (id, invoice_number, customer_id, customer_name, customer_mobile, subtotal, discount, total_mazdoori, total, paid_amount, remaining_credit, payment_method, notes, created_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
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
        let item_id = Uuid::new_v4().to_string();
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

        // 3. Insert Mazdoori Tasks for item & auto-post to worker ledger
        for task in &item.mazdoori_tasks {
            let task_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO sale_item_mazdoori_tasks (id, sale_item_id, title, amount, worker_name)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![task_id, item_id, task.title, task.amount, task.worker_name],
            ).map_err(|e| e.to_string())?;

            if let Some(ref w_name) = task.worker_name {
                let trimmed_worker = w_name.trim();
                if !trimmed_worker.is_empty() && task.amount > 0.0 {
                    // Find or create worker
                    let worker_id: String = {
                        let existing: Option<String> = tx.query_row(
                            "SELECT id FROM mazdoors WHERE name = ?1 COLLATE NOCASE",
                            params![trimmed_worker],
                            |r| r.get(0),
                        ).optional().map_err(|e| e.to_string())?;

                        match existing {
                            Some(id) => id,
                            None => {
                                let new_w_id = Uuid::new_v4().to_string();
                                tx.execute(
                                    "INSERT INTO mazdoors (id, name, total_work, total_paid, balance, sync_status)
                                     VALUES (?1, ?2, 0.0, 0.0, 0.0, 'pending')",
                                    params![new_w_id, trimmed_worker],
                                ).map_err(|e| e.to_string())?;
                                new_w_id
                            }
                        }
                    };

                    let current_w_balance: f64 = tx.query_row(
                        "SELECT balance FROM mazdoors WHERE id = ?1",
                        params![worker_id],
                        |r| r.get(0),
                    ).map_err(|e| e.to_string())?;

                    let new_w_balance = current_w_balance + task.amount;

                    tx.execute(
                        "UPDATE mazdoors
                         SET total_work = total_work + ?1,
                             balance = ?2,
                             updated_at = datetime('now'),
                             sync_status = 'pending'
                         WHERE id = ?3",
                        params![task.amount, new_w_balance, worker_id],
                    ).map_err(|e| e.to_string())?;

                    let entry_id = Uuid::new_v4().to_string();
                    let work_detail = format!("{} (Invoice #{})", task.title, invoice_number);
                    tx.execute(
                        "INSERT INTO mazdoori_entries (id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, sync_status)
                         VALUES (?1, ?2, ?3, date('now','localtime'), ?4, ?5, 0.0, ?6, ?7, 'pending')",
                        params![
                            entry_id,
                            worker_id,
                            trimmed_worker,
                            work_detail,
                            task.amount,
                            new_w_balance,
                            format!("Auto-posted from sale {}", invoice_number),
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
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
                "INSERT INTO customer_ledger (id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?3, ?4, ?5, ?6, ?7, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
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

    Ok(invoice_number)
}

#[tauri::command]
pub fn get_sync_queue(limit: Option<i32>, state: State<DbState>) -> Result<Vec<SyncQueueItemDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(-1);
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
    if !["pending", "syncing", "synced", "failed"].contains(&status.as_str()) { return Err("Invalid synchronization status".into()); }
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
    if status == "synced" {
        let entity: Option<(String, String)> = conn.query_row("SELECT entity_type,entity_id FROM sync_queue WHERE id=?1", params![queue_id], |r| Ok((r.get(0)?, r.get(1)?))).optional().map_err(|e| e.to_string())?;
        if let Some((kind, id)) = entity {
            let table = match kind.as_str() {
                "customer" | "customers" => Some("customers"), "sale" | "sales" => Some("sales"),
                "mazdoor" | "mazdoors" => Some("mazdoors"), "payment" | "payments" => Some("payments"),
                "customer_ledger" => Some("customer_ledger"), "mazdoori_entry" | "mazdoori_entries" => Some("mazdoori_entries"), "expense" | "expenses" => Some("expenses"), _ => None,
            };
            if let Some(table) = table {
                let pending: i64 = conn.query_row("SELECT COUNT(*) FROM sync_queue WHERE entity_id=?1 AND status <> 'synced'", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
                if pending == 0 { conn.execute(&format!("UPDATE {table} SET sync_status='synced' WHERE id=?1"), params![id]).map_err(|e| e.to_string())?; }
            }
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn get_customer_by_id(customer_id: String, state: State<DbState>) -> Result<Option<CustomerDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, mobile, address, total_purchase, total_paid, balance, created_at, updated_at, sync_status
             FROM customers WHERE id = ?1"
        )
        .map_err(|e| e.to_string())?;

    let customer = stmt
        .query_row(params![customer_id], |row| {
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
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(customer)
}

#[tauri::command]
pub fn update_customer(customer: CustomerDto, state: State<DbState>) -> Result<CustomerDto, String> {
    if customer.name.trim().len()<2 || customer.mobile.trim().len()<10 { return Err("Invalid customer profile".into()); }
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE customers
         SET name = ?1,
             mobile = ?2,
             address = ?3,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?4",
        params![customer.name, customer.mobile, customer.address, customer.id],
    ).map_err(|e| e.to_string())?;

    let queue_id = Uuid::new_v4().to_string();
    let payload = serde_json::to_string(&customer).unwrap_or_default();
    tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'customer', ?2, 'UPDATE', ?3, 'pending')",
        params![queue_id, customer.id, payload],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(customer)
}

#[tauri::command]
pub fn delete_customer(customer_id: String, state: State<DbState>) -> Result<bool, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let count: i64 = tx.query_row(
        "SELECT (SELECT COUNT(*) FROM sales WHERE customer_id = ?1) + (SELECT COUNT(*) FROM payments WHERE customer_id = ?1) + (SELECT COUNT(*) FROM customer_ledger WHERE customer_id = ?1)",
        params![customer_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if count > 0 {
        return Err("Cannot delete customer with existing sales. Records are kept for financial audit.".to_string());
    }

    tx.execute("DELETE FROM customers WHERE id = ?1", params![customer_id]).map_err(|e| e.to_string())?;

    let queue_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'customer', ?2, 'DELETE', '{}', 'pending')",
        params![queue_id, customer_id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_customer_ledger(customer_id: String, state: State<DbState>) -> Result<Vec<CustomerLedgerEntryDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status
             FROM customer_ledger
             WHERE customer_id = ?1
             ORDER BY date ASC, created_at ASC"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![customer_id], |row| {
            Ok(CustomerLedgerEntryDto {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                date: row.get(2)?,
                description: row.get(3)?,
                debit: row.get(4)?,
                credit: row.get(5)?,
                balance: row.get(6)?,
                sale_id: row.get(7)?,
                created_at: row.get(8)?,
                sync_status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for r in rows {
        entries.push(r.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

#[tauri::command]
pub fn receive_payment(mut payment: ReceivePaymentDto, state: State<DbState>) -> Result<String, String> {
    payment.amount = (payment.amount * 100.0).round() / 100.0;
    if !payment.amount.is_finite() || payment.amount <= 0.0 {
        return Err("Payment amount must be greater than zero".to_string());
    }

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if !["cash", "bank"].contains(&payment.payment_method.as_str()) {
        return Err("Choose cash or bank".into());
    }

    let mut sale_invoice_num = String::new();
    let mut sale_customer_id: Option<String> = None;

    // 1. If payment is for a specific bill, update the sale record
    if let Some(ref s_id) = payment.sale_id {
        if !s_id.trim().is_empty() {
            let (inv_num, cust_id, paid_amt, remaining_credit): (String, Option<String>, f64, f64) = tx.query_row(
                "SELECT invoice_number, customer_id, paid_amount, remaining_credit FROM sales WHERE id = ?1",
                params![s_id.trim()],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            ).optional().map_err(|e| e.to_string())?.ok_or_else(|| "Bill not found".to_string())?;

            if payment.amount > remaining_credit + 0.01 {
                return Err(format!(
                    "Payment amount (Rs {}) cannot exceed bill remaining credit (Rs {})",
                    payment.amount, remaining_credit
                ));
            }

            let new_sale_paid = ((paid_amt + payment.amount) * 100.0).round() / 100.0;
            let new_sale_credit = ((remaining_credit - payment.amount).max(0.0) * 100.0).round() / 100.0;

            tx.execute(
                "UPDATE sales
                 SET paid_amount = ?1,
                     remaining_credit = ?2,
                     updated_at = datetime('now'),
                     sync_status = 'pending'
                 WHERE id = ?3",
                params![new_sale_paid, new_sale_credit, s_id.trim()],
            ).map_err(|e| e.to_string())?;

            let q_sale = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
                 VALUES (?1, 'sale', ?2, 'UPDATE', '{}', 'pending')",
                params![q_sale, s_id.trim()],
            ).map_err(|e| e.to_string())?;

            sale_invoice_num = inv_num;
            sale_customer_id = cust_id;
        }
    }

    // 2. Determine target customer
    let target_customer_id: Option<String> = payment.customer_id
        .filter(|id| !id.trim().is_empty())
        .or(sale_customer_id);

    let mut new_balance = 0.0;
    if let Some(ref c_id) = target_customer_id {
        let cust_bal: Option<f64> = tx.query_row(
            "SELECT balance FROM customers WHERE id = ?1",
            params![c_id],
            |row| row.get(0),
        ).optional().map_err(|e| e.to_string())?;

        if let Some(current_balance) = cust_bal {
            // Only cap at total balance if general payment (not bill-specific)
            if payment.sale_id.as_ref().map_or(true, |s| s.trim().is_empty()) && payment.amount > current_balance + 0.01 {
                return Err("Payment cannot exceed outstanding balance".into());
            }

            new_balance = ((current_balance - payment.amount) * 100.0).round() / 100.0;

            tx.execute(
                "UPDATE customers
                 SET total_paid = total_paid + ?1,
                     balance = ?2,
                     updated_at = datetime('now'),
                     sync_status = 'pending'
                 WHERE id = ?3",
                params![payment.amount, new_balance, c_id],
            ).map_err(|e| e.to_string())?;

            let ledger_id = Uuid::new_v4().to_string();
            let desc = match &payment.notes {
                Some(n) if !n.trim().is_empty() => {
                    format!("Payment Received ({}) - {}", payment.payment_method.to_uppercase(), n)
                }
                _ => {
                    if !sale_invoice_num.is_empty() {
                        format!("Payment for Bill #{} ({})", sale_invoice_num, payment.payment_method.to_uppercase())
                    } else {
                        format!("Payment Received ({})", payment.payment_method.to_uppercase())
                    }
                }
            };

            tx.execute(
                "INSERT INTO customer_ledger (id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?3, 0.0, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
                params![
                    ledger_id,
                    c_id,
                    desc,
                    payment.amount,
                    new_balance,
                    payment.sale_id.as_deref().filter(|s| !s.trim().is_empty()),
                ],
            ).map_err(|e| e.to_string())?;

            let q_cust = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
                 VALUES (?1, 'customer', ?2, 'UPDATE', '{}', 'pending')",
                params![q_cust, c_id],
            ).map_err(|e| e.to_string())?;
        }
    } else if payment.sale_id.as_ref().map_or(true, |s| s.trim().is_empty()) {
        return Err("Customer not found".to_string());
    }

    // 3. Record payment
    let payment_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO payments (id, customer_id, sale_id, amount, payment_method, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
        params![
            payment_id,
            target_customer_id,
            payment.sale_id.as_deref().filter(|s| !s.trim().is_empty()),
            payment.amount,
            payment.payment_method,
            payment.notes,
        ],
    ).map_err(|e| e.to_string())?;

    let q_payment = Uuid::new_v4().to_string();
    let p_payload = serde_json::json!({
        "id": payment_id,
        "customer_id": target_customer_id,
        "sale_id": payment.sale_id.as_deref().filter(|s| !s.trim().is_empty()),
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "notes": payment.notes,
    }).to_string();

    tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'payment', ?2, 'INSERT', ?3, 'pending')",
        params![q_payment, payment_id, p_payload],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(payment_id)
}

#[tauri::command]
pub fn get_mazdoors(state: State<DbState>) -> Result<Vec<MazdoorDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, phone, total_work, total_paid, balance, created_at, updated_at, sync_status
             FROM mazdoors ORDER BY name ASC"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(MazdoorDto {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                total_work: row.get(3)?,
                total_paid: row.get(4)?,
                balance: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                sync_status: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut workers = Vec::new();
    for r in rows {
        workers.push(r.map_err(|e| e.to_string())?);
    }
    Ok(workers)
}

#[tauri::command]
pub fn create_mazdoor(mazdoor: MazdoorDto, state: State<DbState>) -> Result<MazdoorDto, String> {
    if mazdoor.name.trim().len()<2 || mazdoor.total_work != 0.0 || mazdoor.total_paid != 0.0 || mazdoor.balance != 0.0 { return Err("Invalid worker profile".into()); }
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let id = if mazdoor.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        mazdoor.id
    };

    tx.execute(
        "INSERT INTO mazdoors (id, name, phone, total_work, total_paid, balance, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
        params![
            id,
            mazdoor.name,
            mazdoor.phone,
            mazdoor.total_work,
            mazdoor.total_paid,
            mazdoor.balance,
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(MazdoorDto {
        id,
        name: mazdoor.name,
        phone: mazdoor.phone,
        total_work: mazdoor.total_work,
        total_paid: mazdoor.total_paid,
        balance: mazdoor.balance,
        created_at: None,
        updated_at: None,
        sync_status: "pending".to_string(),
    })
}

#[tauri::command]
pub fn update_mazdoor(mazdoor: MazdoorDto, state: State<DbState>) -> Result<MazdoorDto, String> {
    if mazdoor.name.trim().len()<2 { return Err("Invalid worker name".into()); }
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE mazdoors
         SET name = ?1,
             phone = ?2,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?3",
        params![mazdoor.name, mazdoor.phone, mazdoor.id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(mazdoor)
}

#[tauri::command]
pub fn delete_mazdoor(mazdoor_id: String, state: State<DbState>) -> Result<bool, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM mazdoori_entries WHERE mazdoor_id = ?1",
        params![mazdoor_id],
        |row| row.get(0),
    ).unwrap_or(0);

    if count > 0 {
        return Err("Cannot delete worker with recorded labor history.".to_string());
    }

    tx.execute("DELETE FROM mazdoors WHERE id = ?1", params![mazdoor_id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_mazdoori_entries(
    mazdoor_id: Option<String>,
    state: State<DbState>,
) -> Result<Vec<MazdooriEntryDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let mut entries = Vec::new();
    if let Some(ref m_id) = mazdoor_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, created_at, sync_status
                 FROM mazdoori_entries
                 WHERE mazdoor_id = ?1
                 ORDER BY created_at DESC"
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![m_id], |row| {
            Ok(MazdooriEntryDto {
                id: row.get(0)?,
                mazdoor_id: row.get(1)?,
                mazdoor_name: row.get(2)?,
                work_date: row.get(3)?,
                work_detail: row.get(4)?,
                amount: row.get(5)?,
                paid_amount: row.get(6)?,
                balance: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
                sync_status: row.get(10)?,
            })
        }).map_err(|e| e.to_string())?;

        for r in rows {
            entries.push(r.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, created_at, sync_status
                 FROM mazdoori_entries
                 ORDER BY created_at DESC"
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(MazdooriEntryDto {
                id: row.get(0)?,
                mazdoor_id: row.get(1)?,
                mazdoor_name: row.get(2)?,
                work_date: row.get(3)?,
                work_detail: row.get(4)?,
                amount: row.get(5)?,
                paid_amount: row.get(6)?,
                balance: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
                sync_status: row.get(10)?,
            })
        }).map_err(|e| e.to_string())?;

        for r in rows {
            entries.push(r.map_err(|e| e.to_string())?);
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn create_mazdoori_entry(
    mut entry: MazdooriEntryDto,
    state: State<DbState>,
) -> Result<MazdooriEntryDto, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    entry.amount = (entry.amount*100.0).round()/100.0; entry.paid_amount = (entry.paid_amount*100.0).round()/100.0;
    if chrono::NaiveDate::parse_from_str(&entry.work_date, "%Y-%m-%d").is_err() { return Err("Invalid work date".into()); }
    if !entry.amount.is_finite() || entry.amount <= 0.0 || !entry.paid_amount.is_finite() || entry.paid_amount < 0.0 || entry.paid_amount > entry.amount || entry.work_detail.trim().is_empty() { return Err("Invalid work entry or advance".into()); }
    let id = if entry.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        entry.id
    };

    let cur_balance: f64 = tx.query_row(
        "SELECT balance FROM mazdoors WHERE id = ?1",
        params![entry.mazdoor_id],
        |r| r.get(0),
    ).map_err(|_| "Worker not found".to_string())?;

    let net_change = entry.amount - entry.paid_amount;
    let new_balance = cur_balance + net_change;

    tx.execute(
        "UPDATE mazdoors
         SET total_work = total_work + ?1,
             total_paid = total_paid + ?2,
             balance = ?3,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?4",
        params![entry.amount, entry.paid_amount, new_balance, entry.mazdoor_id],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO mazdoori_entries (id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending')",
        params![
            id,
            entry.mazdoor_id,
            entry.mazdoor_name,
            entry.work_date,
            entry.work_detail,
            entry.amount,
            entry.paid_amount,
            new_balance,
            entry.notes,
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(MazdooriEntryDto {
        id,
        balance: new_balance,
        ..entry
    })
}

#[tauri::command]
pub fn delete_mazdoori_entry(entry_id: String, state: State<DbState>) -> Result<bool, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let (worker_id, name, detail, amount, paid, notes): (String,String,String,f64,f64,Option<String>) = tx.query_row("SELECT mazdoor_id,mazdoor_name,work_detail,amount,paid_amount,notes FROM mazdoori_entries WHERE id=?1", params![entry_id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?))).map_err(|e| e.to_string())?;
    let reference = format!("Void:{}", entry_id);
    let voided: i64 = tx.query_row("SELECT COUNT(*) FROM mazdoori_entries WHERE notes=?1", params![reference], |r| r.get(0)).map_err(|e| e.to_string())?;
    if voided>0 || notes.as_ref().is_some_and(|n| n.starts_with("Void:") || n.starts_with("Auto-posted")) { return Err("Invoice-linked or already voided entries cannot be voided".into()); }
    tx.execute("UPDATE mazdoors SET total_work=total_work-?1,total_paid=total_paid-?2,balance=balance-?1+?2,updated_at=datetime('now'),sync_status='pending' WHERE id=?3", params![amount,paid,worker_id]).map_err(|e| e.to_string())?;
    let balance: f64 = tx.query_row("SELECT balance FROM mazdoors WHERE id=?1", params![worker_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO mazdoori_entries(id,mazdoor_id,mazdoor_name,work_date,work_detail,amount,paid_amount,balance,notes) VALUES(?1,?2,?3,date('now','localtime'),?4,?5,?6,?7,?8)", params![Uuid::new_v4().to_string(),worker_id,name,format!("Voided: {}",detail),-amount,-paid,balance,reference]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn pay_mazdoor(mut payment: PayMazdoorDto, state: State<DbState>) -> Result<bool, String> {
    if payment.amount <= 0.0 {
        return Err("Payout amount must be greater than zero".to_string());
    }

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (worker_name, cur_balance): (String, f64) = tx.query_row(
        "SELECT name, balance FROM mazdoors WHERE id = ?1",
        params![payment.mazdoor_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Worker not found".to_string())?;

    let new_balance = cur_balance - payment.amount;

    tx.execute(
        "UPDATE mazdoors
         SET total_paid = total_paid + ?1,
             balance = ?2,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?3",
        params![payment.amount, new_balance, payment.mazdoor_id],
    ).map_err(|e| e.to_string())?;

    let entry_id = Uuid::new_v4().to_string();
    let note_text = payment.notes.unwrap_or_else(|| "Payout to worker".to_string());
    tx.execute(
        "INSERT INTO mazdoori_entries (id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, sync_status)
         VALUES (?1, ?2, ?3, date('now','localtime'), 'Payment Received / Payout', 0.0, ?4, ?5, ?6, 'pending')",
        params![
            entry_id,
            payment.mazdoor_id,
            worker_name,
            payment.amount,
            new_balance,
            note_text,
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_sales(limit: Option<i32>, state: State<DbState>) -> Result<Vec<SaleRecordDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(-1);

    let mut stmt = conn
        .prepare(
            "SELECT id, invoice_number, customer_id, customer_name, customer_mobile, subtotal, discount, total_mazdoori, total, paid_amount, remaining_credit, payment_method, notes, created_at, sync_status, cancelled_at, cancel_reason
             FROM sales
             ORDER BY created_at DESC
             LIMIT ?1"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![limit_val], |row| {
        Ok(SaleRecordDto {
            items: Vec::new(),
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            customer_id: row.get(2)?,
            customer_name: row.get(3)?,
            customer_mobile: row.get(4)?,
            subtotal: row.get(5)?,
            discount: row.get(6)?,
            total_mazdoori: row.get(7)?,
            total: row.get(8)?,
            paid_amount: row.get(9)?,
            remaining_credit: row.get(10)?,
            payment_method: row.get(11)?,
            notes: row.get(12)?,
            created_at: row.get(13)?,
            sync_status: row.get(14)?,
            cancelled_at: row.get(15)?,
            cancel_reason: row.get(16)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut sales = Vec::new();
    for r in rows {
        sales.push(r.map_err(|e| e.to_string())?);
    }
    for sale in &mut sales {
        let mut stmt = conn.prepare("SELECT id,item_id,item_name,quantity,rate,mazdoori,amount FROM sale_items WHERE sale_id=?1 ORDER BY rowid").map_err(|e| e.to_string())?;
        sale.items = stmt.query_map(params![sale.id], |r| Ok(SaleItemDto { id: Some(r.get(0)?), item_id: r.get(1)?, item_name: r.get(2)?, quantity: r.get(3)?, rate: r.get(4)?, mazdoori: r.get(5)?, amount: r.get(6)?, mazdoori_tasks: Vec::new() })).map_err(|e| e.to_string())?.collect::<rusqlite::Result<_>>().map_err(|e| e.to_string())?;
        for item in &mut sale.items {
            let mut tasks = conn.prepare("SELECT id,title,amount,worker_name FROM sale_item_mazdoori_tasks WHERE sale_item_id=?1 ORDER BY rowid").map_err(|e| e.to_string())?;
            item.mazdoori_tasks = tasks.query_map(params![item.id], |r| Ok(ItemMazdooriTaskDto { id: Some(r.get(0)?), title: r.get(1)?, amount: r.get(2)?, worker_name: r.get(3)? })).map_err(|e| e.to_string())?.collect::<rusqlite::Result<_>>().map_err(|e| e.to_string())?;
        }
    }
    Ok(sales)
}

#[tauri::command]
pub fn get_business_settings(state: State<DbState>) -> Result<BusinessSettingsDto, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "INSERT OR IGNORE INTO business_settings (id, business_name, subtitle, phone, address, invoice_prefix, next_invoice_number)
         VALUES ('default', 'ANAS ARKI PRESS & LASER CUTTING', 'PRECISION | QUALITY | YOUR VISION OUR WORK', '0300-7973059', 'Dhuddi wala Lower Canal Near Askari Bandk Main Jaranwala Road', 'ARKI', 1001)",
        [],
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, business_name, subtitle, phone, address, logo_path, invoice_prefix, next_invoice_number, receipt_paper_size, footer_text, show_logo, default_printer, currency, currency_symbol
             FROM business_settings
             WHERE id = 'default'"
        )
        .map_err(|e| e.to_string())?;

    let settings = stmt.query_row([], |row| {
        let show_logo_int: i32 = row.get(10)?;
        Ok(BusinessSettingsDto {
            id: row.get(0)?,
            business_name: row.get(1)?,
            subtitle: row.get(2)?,
            phone: row.get(3)?,
            address: row.get(4)?,
            logo_path: row.get(5)?,
            invoice_prefix: row.get(6)?,
            next_invoice_number: row.get(7)?,
            receipt_paper_size: row.get(8)?,
            footer_text: row.get(9)?,
            show_logo: show_logo_int != 0,
            default_printer: row.get(11)?,
            currency: row.get(12)?,
            currency_symbol: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub fn update_business_settings(
    settings: BusinessSettingsDto,
    state: State<DbState>,
) -> Result<BusinessSettingsDto, String> {
    if settings.business_name.trim().is_empty() || settings.invoice_prefix.trim().is_empty() || settings.next_invoice_number < 1 || !["A4", "80mm", "58mm"].contains(&settings.receipt_paper_size.as_str()) { return Err("Invalid invoice settings".into()); }
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE business_settings
         SET business_name = ?1,
             subtitle = ?2,
             phone = ?3,
             address = ?4,
             logo_path = ?5,
             invoice_prefix = ?6,
             next_invoice_number = ?7,
             receipt_paper_size = ?8,
             footer_text = ?9,
             show_logo = ?10,
             default_printer = ?11,
             currency = ?12,
             currency_symbol = ?13,
             updated_at = datetime('now')
         WHERE id = 'default'",
        params![
            settings.business_name,
            settings.subtitle,
            settings.phone,
            settings.address,
            settings.logo_path,
            settings.invoice_prefix,
            settings.next_invoice_number,
            settings.receipt_paper_size,
            settings.footer_text,
            if settings.show_logo { 1 } else { 0 },
            settings.default_printer,
            settings.currency,
            settings.currency_symbol,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(settings)
}



// Cancel keeps the invoice for history and posts reversals: the customer's
// purchase, at-sale payment (refunded) and credit come off, and labour
// auto-posted to workers is voided.
#[tauri::command]
pub fn cancel_sale(sale_id: String, reason: Option<String>, state: State<DbState>) -> Result<bool, String> {
    let reason = reason.map(|r| r.trim().to_string()).filter(|r| !r.is_empty());
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    cancel_sale_in_transaction(&sale_id, reason, &tx)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn update_sale(sale_id: String, sale: CreateSaleDto, state: State<DbState>) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let number = update_sale_in_transaction(&sale_id, sale, &tx)?;
    tx.commit().map_err(|e|e.to_string())?;
    Ok(number)
}

fn update_sale_in_transaction(sale_id: &str, mut sale: CreateSaleDto, tx: &rusqlite::Transaction<'_>) -> Result<String, String> {
    let cancelled: Option<String> = tx.query_row("SELECT cancelled_at FROM sales WHERE id=?1", params![sale_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if cancelled.is_some() { return Err("A cancelled bill cannot be edited. Start a new bill.".into()); }
    let (old_number, old_customer_id, old_total, old_paid, old_credit): (String, Option<String>, f64, f64, f64) = tx.query_row(
        "SELECT invoice_number, customer_id, total, paid_amount, remaining_credit FROM sales WHERE id = ?1",
        params![sale_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
    ).optional().map_err(|e| e.to_string())?.ok_or("Bill not found")?;

    if old_customer_id.as_deref().filter(|id| !id.is_empty()) != sale.customer_id.as_deref().filter(|id| !id.is_empty()) { return Err("The customer cannot be changed on a saved bill.".into()); }
    let receipt_note = format!("Payment for invoice {}", old_number);
    let initial_receipt: Option<String> = tx.query_row("SELECT id FROM payments WHERE sale_id=?1 AND (notes=?2 OR id=?3) LIMIT 1", params![sale_id, receipt_note, format!("receipt-{}", sale_id)], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
    let later_paid: f64 = tx.query_row("SELECT COALESCE(SUM(amount),0) FROM payments WHERE sale_id=?1 AND id<>?2", params![sale_id, initial_receipt.as_deref().unwrap_or("")], |r| r.get(0)).map_err(|e| e.to_string())?;
    if sale.paid_amount < later_paid { return Err("Later payments are already recorded for this bill. Payment Received cannot be less than those payments.".into()); }
    let corrected_initial_paid = ((sale.paid_amount - later_paid) * 100.0).round() / 100.0;
    let original_ledger: Option<(i64, f64)> = tx.query_row("SELECT rowid,credit FROM customer_ledger WHERE sale_id=?1 AND description=?2 LIMIT 1", params![sale_id, format!("Invoice #{}", old_number)], |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e| e.to_string())?;
    if old_customer_id.as_deref().is_some_and(|id| !id.is_empty()) && original_ledger.is_none() { return Err("This bill is missing its customer ledger entry. Restore the record before editing.".into()); }

    if sale.items.is_empty() || !sale.discount.is_finite() || sale.discount < 0.0 || !sale.paid_amount.is_finite() || sale.paid_amount < 0.0 || !["cash", "bank"].contains(&sale.payment_method.as_str()) {
        return Err("Invalid bill or payment".into());
    }

    let mut goods = 0.0;
    let mut labor = 0.0;
    let mut gross = 0.0;
    for item in &mut sale.items {
        if item.item_name.trim().is_empty() || !item.quantity.is_finite() || item.quantity <= 0.0 || !item.rate.is_finite() || item.rate < 0.0 || !item.mazdoori.is_finite() || item.mazdoori < 0.0 {
            return Err("Enter valid item descriptions, quantities and amounts".into());
        }
        let task_total: f64 = item.mazdoori_tasks.iter().map(|t| t.amount).sum();
        if item.mazdoori_tasks.iter().any(|t| t.title.trim().is_empty() || !t.amount.is_finite() || t.amount <= 0.0) || (!item.mazdoori_tasks.is_empty() && (task_total - item.mazdoori).abs() > 0.01) {
            return Err("Invalid labor breakdown".into());
        }
        item.item_name = item.item_name.trim().to_string();
        item.amount = ((item.quantity * item.rate) * 100.0).round() / 100.0;
        goods += item.amount;
        labor += item.mazdoori;
        gross += item.amount;
    }

    sale.subtotal = (goods * 100.0).round() / 100.0;
    sale.total_mazdoori = (labor * 100.0).round() / 100.0;
    sale.total = ((gross - sale.discount) * 100.0).round() / 100.0;
    sale.paid_amount = (sale.paid_amount * 100.0).round() / 100.0;
    if !sale.total.is_finite() || sale.total > 9_999_999_999.99 || sale.total <= 0.0 || sale.paid_amount > sale.total {
        return Err("Payment cannot exceed a positive bill total".into());
    }
    sale.remaining_credit = ((sale.total - sale.paid_amount) * 100.0).round() / 100.0;
    if sale.remaining_credit > 0.0 && sale.customer_id.as_ref().is_none_or(|id| id.is_empty()) {
        return Err("Select a customer for a credit bill".into());
    }

    // 1. Update sales table directly in place (retaining invoice_number and clearing cancelled status)
    tx.execute(
        "UPDATE sales
         SET customer_id = ?1,
             customer_name = ?2,
             customer_mobile = ?3,
             subtotal = ?4,
             discount = ?5,
             total_mazdoori = ?6,
             total = ?7,
             paid_amount = ?8,
             remaining_credit = ?9,
             payment_method = ?10,
             notes = ?11,
             cancelled_at = NULL,
             cancel_reason = NULL,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?12",
        params![
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
            sale_id,
        ],
    ).map_err(|e| e.to_string())?;

    // 2. Remove old items & tasks for this sale
    tx.execute(
        "DELETE FROM sale_item_mazdoori_tasks WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?1)",
        params![sale_id],
    ).map_err(|e| e.to_string())?;
    tx.execute(
        "DELETE FROM sale_items WHERE sale_id = ?1",
        params![sale_id],
    ).map_err(|e| e.to_string())?;

    // 3. Reverse old worker mazdoori from this sale
    let mut old_worker_entries: Vec<(String, f64)> = Vec::new();
    {
        let mut stmt = tx.prepare("SELECT mazdoor_id, amount FROM mazdoori_entries WHERE notes = ?1 OR notes = ?2").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(
            params![format!("Auto-posted from sale {}", sale_id), format!("Auto-posted from sale {}", old_number)],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).map_err(|e| e.to_string())?;
        for r in rows {
            if let Ok(entry) = r {
                old_worker_entries.push(entry);
            }
        }
    }
    for (w_id, amt) in old_worker_entries {
        tx.execute(
            "UPDATE mazdoors SET total_work = ROUND(total_work - ?1, 2), balance = ROUND(balance - ?1, 2), updated_at = datetime('now') WHERE id = ?2",
            params![amt, w_id],
        ).map_err(|e| e.to_string())?;
    }
    tx.execute(
        "DELETE FROM mazdoori_entries WHERE notes = ?1 OR notes = ?2",
        params![format!("Auto-posted from sale {}", sale_id), format!("Auto-posted from sale {}", old_number)],
    ).map_err(|e| e.to_string())?;

    // 4. Insert updated sale items, tasks, and worker ledger
    for item in &sale.items {
        let item_id = Uuid::new_v4().to_string();
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

        for task in &item.mazdoori_tasks {
            let task_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO sale_item_mazdoori_tasks (id, sale_item_id, title, amount, worker_name)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![task_id, item_id, task.title, task.amount, task.worker_name],
            ).map_err(|e| e.to_string())?;

            if let Some(ref w_name) = task.worker_name {
                let trimmed_worker = w_name.trim();
                if !trimmed_worker.is_empty() && task.amount > 0.0 {
                    let worker_id: String = {
                        let existing: Option<String> = tx.query_row(
                            "SELECT id FROM mazdoors WHERE name = ?1 COLLATE NOCASE",
                            params![trimmed_worker],
                            |r| r.get(0),
                        ).optional().map_err(|e| e.to_string())?;

                        match existing {
                            Some(id) => id,
                            None => {
                                let new_w_id = Uuid::new_v4().to_string();
                                tx.execute(
                                    "INSERT INTO mazdoors (id, name, total_work, total_paid, balance, sync_status)
                                     VALUES (?1, ?2, 0.0, 0.0, 0.0, 'pending')",
                                    params![new_w_id, trimmed_worker],
                                ).map_err(|e| e.to_string())?;
                                new_w_id
                            }
                        }
                    };

                    let current_w_balance: f64 = tx.query_row(
                        "SELECT balance FROM mazdoors WHERE id = ?1",
                        params![worker_id],
                        |r| r.get(0),
                    ).map_err(|e| e.to_string())?;

                    let new_w_balance = current_w_balance + task.amount;

                    tx.execute(
                        "UPDATE mazdoors
                         SET total_work = total_work + ?1,
                             balance = ?2,
                             updated_at = datetime('now'),
                             sync_status = 'pending'
                         WHERE id = ?3",
                        params![task.amount, new_w_balance, worker_id],
                    ).map_err(|e| e.to_string())?;

                    let entry_id = Uuid::new_v4().to_string();
                    let work_detail = format!("{} (Invoice #{})", task.title, old_number);
                    tx.execute(
                        "INSERT INTO mazdoori_entries (id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, sync_status)
                         VALUES (?1, ?2, ?3, date('now','localtime'), ?4, ?5, 0.0, ?6, ?7, 'pending')",
                        params![
                            entry_id,
                            worker_id,
                            trimmed_worker,
                            work_detail,
                            task.amount,
                            new_w_balance,
                            format!("Auto-posted from sale {}", old_number),
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    // 5. Update Payment
    let has_payment = initial_receipt.is_some();

    if corrected_initial_paid > 0.0 {
        if has_payment {
            tx.execute(
                "UPDATE payments
                 SET amount = ?1,
                     customer_id = ?2,
                     payment_method = ?3,
                     notes = ?4,
                     sync_status = 'pending'
                 WHERE id = ?5",
                params![
                    corrected_initial_paid,
                    sale.customer_id,
                    sale.payment_method,
                    format!("Payment for invoice {}", old_number),
                    initial_receipt,
                ],
            ).map_err(|e| e.to_string())?;
        } else {
            let payment_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO payments (id, customer_id, sale_id, amount, payment_method, notes, payment_date, sync_status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, (SELECT created_at FROM sales WHERE id=?3), 'pending')",
                params![
                    payment_id,
                    sale.customer_id,
                    sale_id,
                    corrected_initial_paid,
                    sale.payment_method,
                    format!("Payment for invoice {}", old_number),
                ],
            ).map_err(|e| e.to_string())?;
        }
    } else if has_payment {
        tx.execute("DELETE FROM payments WHERE id = ?1", params![initial_receipt]).map_err(|e| e.to_string())?;
    }

    // 6. Customer Totals & Ledger
    let old_cid = old_customer_id.as_deref().filter(|id| !id.is_empty());
    let new_cid = sale.customer_id.as_deref().filter(|id| !id.is_empty());

    if old_cid != new_cid {
        if let Some(old_c) = old_cid {
            tx.execute(
                "UPDATE customers
                 SET total_purchase = ROUND(total_purchase - ?1, 2),
                     total_paid = ROUND(total_paid - ?2, 2),
                     balance = ROUND(balance - ?3, 2),
                     updated_at = datetime('now'),
                     sync_status = 'pending'
                 WHERE id = ?4",
                params![old_total, old_paid, old_credit, old_c],
            ).map_err(|e| e.to_string())?;
            tx.execute("DELETE FROM customer_ledger WHERE sale_id = ?1", params![sale_id]).map_err(|e| e.to_string())?;
        }
        if let Some(new_c) = new_cid {
            tx.execute(
                "UPDATE customers
                 SET total_purchase = ROUND(total_purchase + ?1, 2),
                     total_paid = ROUND(total_paid + ?2, 2),
                     balance = ROUND(balance + ?3, 2),
                     updated_at = datetime('now'),
                     sync_status = 'pending'
                 WHERE id = ?4",
                params![sale.total, sale.paid_amount, sale.remaining_credit, new_c],
            ).map_err(|e| e.to_string())?;
            let new_bal: f64 = tx.query_row("SELECT balance FROM customers WHERE id = ?1", params![new_c], |r| r.get(0)).unwrap_or(0.0);
            let ledger_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO customer_ledger (id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?3, ?4, ?5, ?6, ?7, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
                params![ledger_id, new_c, format!("Invoice #{}", old_number), sale.total, sale.paid_amount, new_bal, sale_id],
            ).map_err(|e| e.to_string())?;
        }
    } else if let Some(cust_id) = new_cid {
        let delta_purchase = sale.total - old_total;
        let delta_paid = sale.paid_amount - old_paid;
        let delta_credit = sale.remaining_credit - old_credit;

        tx.execute(
            "UPDATE customers
             SET total_purchase = ROUND(total_purchase + ?1, 2),
                 total_paid = ROUND(total_paid + ?2, 2),
                 balance = ROUND(balance + ?3, 2),
                 updated_at = datetime('now'),
                 sync_status = 'pending'
             WHERE id = ?4",
            params![delta_purchase, delta_paid, delta_credit, cust_id],
        ).map_err(|e| e.to_string())?;

        let current_bal: f64 = tx.query_row("SELECT balance FROM customers WHERE id = ?1", params![cust_id], |r| r.get(0)).unwrap_or(0.0);
        let has_ledger: bool = tx.query_row(
            "SELECT COUNT(*) FROM customer_ledger WHERE sale_id = ?1",
            params![sale_id],
            |r| r.get::<_, i64>(0),
        ).map(|c| c > 0).unwrap_or(false);

        if has_ledger {
            let (ledger_rowid, original_credit) = original_ledger.ok_or("Missing invoice ledger")?;
            let delta = sale.total - old_total - (corrected_initial_paid - original_credit);
            tx.execute("UPDATE customer_ledger SET balance=ROUND(balance+?1,2),sync_status='pending' WHERE customer_id=?2 AND rowid>=?3", params![delta,cust_id,ledger_rowid]).map_err(|e| e.to_string())?;
            tx.execute(
                "UPDATE customer_ledger
                 SET debit = ?1,
                     credit = ?2,
                     description = ?3,
                     sync_status = 'pending'
                 WHERE rowid = ?4",
                params![sale.total, corrected_initial_paid, format!("Invoice #{}", old_number), ledger_rowid],
            ).map_err(|e| e.to_string())?;
        } else {
            let ledger_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO customer_ledger (id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?3, ?4, ?5, ?6, ?7, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
                params![ledger_id, cust_id, format!("Invoice #{}", old_number), sale.total, sale.paid_amount, current_bal, sale_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(old_number)
}

fn cancel_sale_in_transaction(sale_id: &str, reason: Option<String>, tx: &rusqlite::Transaction<'_>) -> Result<bool, String> {

    let (invoice_number, customer_id, total, paid, credit, cancelled_at): (String, Option<String>, f64, f64, f64, Option<String>) = tx.query_row(
        "SELECT invoice_number, customer_id, total, paid_amount, remaining_credit, cancelled_at FROM sales WHERE id = ?1",
        params![sale_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
    ).optional().map_err(|e| e.to_string())?.ok_or("Invoice not found")?;
    if cancelled_at.is_some() { return Err("Invoice is already cancelled".into()); }

    tx.execute(
        "UPDATE sales
         SET cancelled_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
             cancel_reason = ?1,
             updated_at = datetime('now'),
             sync_status = 'pending'
         WHERE id = ?2",
        params![reason, sale_id],
    ).map_err(|e| e.to_string())?;

    // Mirror of the invoice's ledger row: the bill comes off, the amount paid at sale is refunded
    if let Some(cust_id) = customer_id.filter(|id| !id.is_empty()) {
        tx.execute(
            "UPDATE customers
             SET total_purchase = ROUND(total_purchase - ?1, 2),
                 total_paid = ROUND(total_paid - ?2, 2),
                 balance = ROUND(balance - ?3, 2),
                 updated_at = datetime('now'),
                 sync_status = 'pending'
             WHERE id = ?4",
            params![total, paid, credit, cust_id],
        ).map_err(|e| e.to_string())?;
        let balance: f64 = tx.query_row("SELECT balance FROM customers WHERE id = ?1", params![cust_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        let description = match &reason {
            Some(r) => format!("Invoice #{} cancelled - {}", invoice_number, r),
            None => format!("Invoice #{} cancelled", invoice_number),
        };
        tx.execute(
            "INSERT INTO customer_ledger (id, customer_id, date, description, debit, credit, balance, sale_id, created_at, sync_status)
             VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?3, ?4, ?5, ?6, ?7, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), 'pending')",
            params![Uuid::new_v4().to_string(), cust_id, description, paid, total, balance, sale_id],
        ).map_err(|e| e.to_string())?;
    }

    let mut entries: Vec<(String, String, String, String, f64)> = Vec::new();
    {
        let mut stmt = tx.prepare("SELECT id, mazdoor_id, mazdoor_name, work_detail, amount FROM mazdoori_entries WHERE notes = ?1 OR notes = ?2 ORDER BY rowid").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(
            params![format!("Auto-posted from sale {}", sale_id), format!("Auto-posted from sale {}", invoice_number)],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        ).map_err(|e| e.to_string())?;
        for row in rows { entries.push(row.map_err(|e| e.to_string())?); }
    }
    for (entry_id, worker_id, worker_name, detail, amount) in entries {
        let reference = format!("Void:{}", entry_id);
        let voided: i64 = tx.query_row("SELECT COUNT(*) FROM mazdoori_entries WHERE notes = ?1", params![reference], |r| r.get(0)).map_err(|e| e.to_string())?;
        if voided > 0 { continue; }
        tx.execute(
            "UPDATE mazdoors SET total_work = ROUND(total_work - ?1, 2), balance = ROUND(balance - ?1, 2), updated_at = datetime('now'), sync_status = 'pending' WHERE id = ?2",
            params![amount, worker_id],
        ).map_err(|e| e.to_string())?;
        let balance: f64 = tx.query_row("SELECT balance FROM mazdoors WHERE id = ?1", params![worker_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO mazdoori_entries (id, mazdoor_id, mazdoor_name, work_date, work_detail, amount, paid_amount, balance, notes, sync_status)
             VALUES (?1, ?2, ?3, date('now','localtime'), ?4, ?5, 0.0, ?6, ?7, 'pending')",
            params![Uuid::new_v4().to_string(), worker_id, worker_name, format!("Voided: {} (invoice cancelled)", detail), -amount, balance, reference],
        ).map_err(|e| e.to_string())?;
    }

    Ok(true)
}

#[cfg(test)]
mod invoice_edit_tests {
    use super::*;

    fn setup() -> rusqlite::Connection {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        crate::database::migrations::run_migrations(&mut conn).unwrap();
        crate::commands::snapshot::install_sync_triggers(&mut conn).unwrap();
        conn.execute("INSERT INTO customers (id,name,mobile) VALUES ('qa','QA Customer','03000000000')", []).unwrap();
        conn
    }

    fn bill(rate: f64) -> CreateSaleDto {
        serde_json::from_value(serde_json::json!({
            "customerId":"qa","customerName":"QA Customer","customerMobile":"03000000000",
            "items":[{"itemName":"Cutting","quantity":2,"rate":rate,"mazdoori":50,"amount":0,
                "mazdooriTasks":[{"title":"Cutting labour","amount":50,"workerName":"Rashid"}]}],
            "subtotal":0,"total":0,"totalMazdoori":0,"discount":0,"paidAmount":100,
            "remainingCredit":0,"paymentMethod":"cash"
        })).unwrap()
    }

    fn save_original(conn: &mut rusqlite::Connection) -> String {
        let tx = conn.transaction().unwrap();
        let number = create_sale_in_transaction(bill(100.0), &tx).unwrap();
        tx.commit().unwrap();
        conn.query_row("SELECT id FROM sales WHERE invoice_number=?1",params![number],|r|r.get(0)).unwrap()
    }

    #[test]
    fn edit_updates_bill_in_place_and_recalculates_dues() {
        let mut conn = setup();
        let id = save_original(&mut conn);
        conn.execute("UPDATE sales SET created_at='2025-01-02T09:00:00Z' WHERE id=?1", params![id]).unwrap();
        conn.execute("UPDATE payments SET payment_date='2025-01-02T09:01:00Z' WHERE sale_id=?1", params![id]).unwrap();
        let tx = conn.transaction().unwrap();
        let number = update_sale_in_transaction(&id, bill(150.0), &tx).unwrap();
        tx.commit().unwrap();
        let (total, date, cancelled): (f64, String, Option<String>) = conn.query_row(
            "SELECT total, created_at, cancelled_at FROM sales WHERE id=?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();
        assert_eq!(total, 300.0);
        assert_eq!(date, "2025-01-02T09:00:00Z");
        assert!(cancelled.is_none());
        assert_eq!(number, "ARKI-1001");
        let (purchase, paid, balance): (f64, f64, f64) = conn.query_row(
            "SELECT total_purchase, total_paid, balance FROM customers WHERE id='qa'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();
        assert_eq!((purchase, paid, balance), (300.0, 100.0, 200.0));
        let worker_balance: f64 = conn.query_row(
            "SELECT balance FROM mazdoors WHERE name='Rashid'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(worker_balance, 50.0);
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM sales", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn correcting_initial_payment_to_zero_updates_dues_and_receipt() {
        let mut conn = setup();
        let id = save_original(&mut conn);
        let mut correction = bill(100.0);
        correction.paid_amount = 0.0;
        let tx = conn.transaction().unwrap();
        update_sale_in_transaction(&id, correction, &tx).unwrap();
        tx.commit().unwrap();
        let receipt_count: i64 = conn.query_row("SELECT COUNT(*) FROM payments WHERE sale_id=?1", params![id], |r| r.get(0)).unwrap();
        assert_eq!(receipt_count, 0);
        let (paid, balance): (f64, f64) = conn.query_row("SELECT total_paid,balance FROM customers WHERE id='qa'", [], |r| Ok((r.get(0)?,r.get(1)?))).unwrap();
        assert_eq!((paid,balance),(0.0,200.0));
        let (credit, ledger_balance): (f64, f64) = conn.query_row("SELECT credit,balance FROM customer_ledger WHERE sale_id=?1", params![id], |r| Ok((r.get(0)?,r.get(1)?))).unwrap();
        assert_eq!((credit,ledger_balance),(0.0,200.0));
    }
}

#[tauri::command]
pub fn get_expenses(state: State<DbState>) -> Result<Vec<ExpenseDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, expense_date, category, description, amount, payment_method, created_at, sync_status
         FROM expenses
         ORDER BY expense_date DESC, created_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(ExpenseDto {
        id: r.get(0)?,
        expense_date: r.get(1)?,
        category: r.get(2)?,
        description: r.get(3)?,
        amount: r.get(4)?,
        payment_method: r.get(5)?,
        created_at: r.get(6)?,
        sync_status: r.get(7)?,
    })).map_err(|e| e.to_string())?;
    let mut expenses = Vec::new();
    for row in rows { expenses.push(row.map_err(|e| e.to_string())?); }
    Ok(expenses)
}

#[tauri::command]
pub fn create_expense(mut expense: ExpenseDto, state: State<DbState>) -> Result<ExpenseDto, String> {
    expense.amount = (expense.amount * 100.0).round() / 100.0;
    expense.category = expense.category.trim().to_string();
    expense.description = expense.description.map(|d| d.trim().to_string()).filter(|d| !d.is_empty());
    let valid_date = expense.expense_date.len() == 10 && expense.expense_date.bytes().enumerate().all(|(i, b)| if i == 4 || i == 7 { b == b'-' } else { b.is_ascii_digit() });
    if expense.id.trim().is_empty() || !expense.amount.is_finite() || expense.amount <= 0.0 || expense.category.is_empty() || !valid_date || !["cash", "bank"].contains(&expense.payment_method.as_str()) {
        return Err("Enter a valid expense date, category, amount and payment method".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO expenses (id, expense_date, category, description, amount, payment_method, created_at, updated_at, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), datetime('now'), 'pending')",
        params![expense.id, expense.expense_date, expense.category, expense.description, expense.amount, expense.payment_method],
    ).map_err(|e| e.to_string())?;
    expense.created_at = conn.query_row("SELECT created_at FROM expenses WHERE id = ?1", params![expense.id], |r| r.get(0)).map_err(|e| e.to_string())?;
    expense.sync_status = "pending".to_string();
    Ok(expense)
}

#[tauri::command]
pub fn delete_expense(expense_id: String, state: State<DbState>) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let deleted = conn.execute("DELETE FROM expenses WHERE id = ?1", params![expense_id]).map_err(|e| e.to_string())?;
    if deleted == 0 { return Err("Expense not found".into()); }
    Ok(true)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemDto {
    pub id: String,
    pub name: String,
    #[serde(rename = "urduName")]
    pub urdu_name: Option<String>,
    pub category: Option<String>,
    #[serde(rename = "defaultRate", default)]
    pub default_rate: f64,
    #[serde(rename = "isActive", default = "default_item_active")]
    pub is_active: bool,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
}

fn default_item_active() -> bool {
    true
}

#[tauri::command]
pub fn get_items(state: State<DbState>) -> Result<Vec<ItemDto>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Remove any previously seeded static items so only user-created dynamic items remain
    let _ = conn.execute(
        "DELETE FROM items WHERE id IN ('chadar', 'dabi', 'chowkhat', 'laser-grill', 'cnc-panel', 'steel-gate')",
        [],
    );

    let mut stmt = conn.prepare(
        "SELECT id, name, urdu_name, category, default_rate, is_active, created_at, updated_at
         FROM items
         ORDER BY name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |r| {
        let active_int: i64 = r.get(5)?;
        Ok(ItemDto {
            id: r.get(0)?,
            name: r.get(1)?,
            urdu_name: r.get(2)?,
            category: r.get(3)?,
            default_rate: r.get(4)?,
            is_active: active_int != 0,
            created_at: r.get(6)?,
            updated_at: r.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
pub fn create_item(mut item: ItemDto, state: State<DbState>) -> Result<ItemDto, String> {
    if item.name.trim().is_empty() {
        return Err("Item name is required".into());
    }
    if item.id.trim().is_empty() {
        item.id = Uuid::new_v4().to_string();
    }
    item.name = item.name.trim().to_string();
    item.urdu_name = item.urdu_name.map(|u| u.trim().to_string()).filter(|u| !u.is_empty());
    item.category = item.category.map(|c| c.trim().to_string()).filter(|c| !c.is_empty());
    item.default_rate = (item.default_rate * 100.0).round() / 100.0;

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO items (id, name, urdu_name, category, default_rate, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
        params![item.id, item.name, item.urdu_name, item.category, item.default_rate, if item.is_active { 1 } else { 0 }],
    ).map_err(|e| e.to_string())?;

    let (created_at, updated_at): (String, String) = tx.query_row(
        "SELECT created_at, updated_at FROM items WHERE id = ?1",
        params![item.id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|e| e.to_string())?;

    item.created_at = Some(created_at);
    item.updated_at = Some(updated_at);

    let queue_id = Uuid::new_v4().to_string();
    let payload = serde_json::to_string(&item).unwrap_or_default();
    let _ = tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'items', ?2, 'INSERT', ?3, 'pending')",
        params![queue_id, item.id, payload],
    );

    tx.commit().map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub fn update_item(mut item: ItemDto, state: State<DbState>) -> Result<ItemDto, String> {
    if item.name.trim().is_empty() {
        return Err("Item name is required".into());
    }
    item.name = item.name.trim().to_string();
    item.urdu_name = item.urdu_name.map(|u| u.trim().to_string()).filter(|u| !u.is_empty());
    item.category = item.category.map(|c| c.trim().to_string()).filter(|c| !c.is_empty());
    item.default_rate = (item.default_rate * 100.0).round() / 100.0;

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let updated = tx.execute(
        "UPDATE items
         SET name = ?1, urdu_name = ?2, category = ?3, default_rate = ?4, is_active = ?5, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?6",
        params![item.name, item.urdu_name, item.category, item.default_rate, if item.is_active { 1 } else { 0 }, item.id],
    ).map_err(|e| e.to_string())?;

    if updated == 0 {
        return Err("Item not found".into());
    }

    let updated_at: String = tx.query_row(
        "SELECT updated_at FROM items WHERE id = ?1",
        params![item.id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    item.updated_at = Some(updated_at);

    let queue_id = Uuid::new_v4().to_string();
    let payload = serde_json::to_string(&item).unwrap_or_default();
    let _ = tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'items', ?2, 'UPDATE', ?3, 'pending')",
        params![queue_id, item.id, payload],
    );

    tx.commit().map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub fn delete_item(item_id: String, state: State<DbState>) -> Result<bool, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let deleted = tx.execute("DELETE FROM items WHERE id = ?1", params![item_id]).map_err(|e| e.to_string())?;
    if deleted == 0 {
        return Err("Item not found".into());
    }

    let queue_id = Uuid::new_v4().to_string();
    let _ = tx.execute(
        "INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status)
         VALUES (?1, 'items', ?2, 'DELETE', '{}', 'pending')",
        params![queue_id, item_id],
    );

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

