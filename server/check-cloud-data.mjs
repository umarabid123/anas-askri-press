import { createClient } from '@supabase/supabase-js';
for(const file of ['.env','.env.local']) {try {process.loadEnvFile(file)}catch(e){if(e.code!=='ENOENT')throw e}}
const cloud=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(25000)})}});
const {data,error}=await cloud.rpc('export_shop_records'); if(error)throw Error(error.message);
const affected=[]; const reasons={}; const count=key=>reasons[key]=(reasons[key]||0)+1;
for(const sale of data.tables.sales){const items=data.tables.sale_items.filter(i=>i.sale_id===sale.id); const sum=key=>items.reduce((s,i)=>s+Number(i[key]),0); const differs=(a,b)=>Math.abs(Number(a)-Number(b))>0.02;
 if(Number(sale.total)<=0)count('nonPositiveTotal');
 if(differs(sale.total, sum('amount')-Number(sale.discount))) { count('lineTotalMismatch'); affected.push({invoice: sale.invoice_number,date:String(sale.created_at).slice(0,10),items:items.length,linkedPayments:data.tables.payments.filter(p=>p.sale_id===sale.id).length,linkedLedger:data.tables.customer_ledger.filter(l=>l.sale_id===sale.id).length}); }
 if(differs(sale.total_mazdoori,sum('mazdoori')))count('laborTotalMismatch');
 if(differs(sale.total-Number(sale.paid_amount),sale.remaining_credit))count('remainingCreditMismatch');
 if(Number(sale.paid_amount)>Number(sale.total))count('paymentAboveTotal');
 if(differs(sale.subtotal,items.reduce((s,i)=>s+Math.round(Number(i.quantity)*Number(i.rate)*100)/100,0)) && differs(sale.subtotal,sum('amount')-sum('mazdoori')))count('subtotalMismatch');
}
console.log(JSON.stringify({invoiceValidationIssues:reasons,affectedBills:affected,temporaryQaCustomers:data.tables.customers.filter(c=>c.name.startsWith('QA Auto Sync')).length}));
