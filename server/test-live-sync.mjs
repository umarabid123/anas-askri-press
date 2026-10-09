import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const root = process.cwd()
const cache = new Map()
const networkListeners = new Map(); let simulatedFailure = false; let uploads = 0;
async function request(route, body = {}) {
 const response = await fetch('http://127.0.0.1:5175/api/cloud/' + route, { method:'POST', headers: {'Content-Type':'application/json', Origin:'http://127.0.0.1:5173'}, body:JSON.stringify(body), signal:AbortSignal.timeout(25000) });
 const data = await response.json(); if(!response.ok) throw new Error(data.error || 'Cloud request failed'); return data;
}
const mocks = { 'services/supabase.ts': { isSupabaseConfigured: () => true, syncCloudChanges: async changes => { if(simulatedFailure) throw new Error('QA simulated connection interruption'); await request('sync', { changes }); uploads++; } } };
function source(file) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file).exports
  const relative = path.relative(path.join(root, 'src'), file).replaceAll('\\', '/')
  if (mocks[relative]) return mocks[relative]
  const module = { exports: {} }; cache.set(file, module)
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const localRequire = spec => {
    if (spec.startsWith('@/') || spec.startsWith('.')) {
      let resolved = spec.startsWith('@/') ? path.join(root, 'src', spec.slice(2)) : path.resolve(path.dirname(file), spec)
      if (!resolved.endsWith('.ts')) resolved = fs.existsSync(resolved + '.ts') ? resolved + '.ts' : path.join(resolved, 'index.ts')
      return source(resolved)
    }
    return require(spec)
  }
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}
const memory = new Map()
globalThis.window = {
  addEventListener(name, callback) { if (!networkListeners.has(name)) networkListeners.set(name, new Set()); networkListeners.get(name).add(callback) },
  removeEventListener(name, callback) { networkListeners.get(name)?.delete(callback) },
}
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() }
const db = source(path.join(root, 'src/services/sqlite.service.ts'))

const { createClient } = require('@supabase/supabase-js');
for (const filename of ['.env','.env.local']) { try { process.loadEnvFile(filename) } catch(error) { if(error.code !== 'ENOENT') throw error } }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const options = { auth:{persistSession:false,autoRefreshToken:false}, global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})} };
const cloud = createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const { syncService } = source(path.join(root,'src/services/sync.service.ts'));
const result = { testedAt:new Date().toISOString() }; let customerId;
async function row() { const {data,error} = await cloud.from('customers').select('id,name,mobile').eq('id',customerId); if(error) throw error; return data }
async function waitFor(condition) { for(let i=0;i<150;i++) { if(await condition()) return; await new Promise(resolve=>setTimeout(resolve,100)) } throw new Error(syncService.getError() || 'Timed out waiting for automatic upload') }
function network(online) { navigator.onLine=online; for(const cb of networkListeners.get(online?'online':'offline')||[]) cb() }
try {
 await request('check'); result.connection=true;
 navigator.onLine=false;
 const customer=await db.createCustomer({name:'QA Auto Sync Temporary',mobile:'03000000000'}); customerId=customer.id;
 syncService.start(); await new Promise(resolve=>setTimeout(resolve,100));
 assert.equal(uploads,0); assert.equal((await row()).length,0); assert.ok((await db.getSyncQueue()).length>0); result.offlineSavedLocally=true;
 syncService.cleanup(); syncService.start(); assert.equal((await db.getCustomers())[0].id,customerId); result.offlineRestartPreserved=true;
 network(true); await waitFor(async()=>!(await db.getSyncQueue()).length); assert.equal((await row())[0].name,customer.name); result.reconnectUploadedAutomatically=true;
 network(false); await db.updateCustomer({...await db.getCustomerById(customerId),name:'QA Auto Sync Updated'});
 simulatedFailure=true; network(true); await waitFor(async()=>(await db.getSyncQueue()).some(r=>r.status==='failed')); assert.equal((await row())[0].name,customer.name); result.failedUploadRetainedQueue=true;
 simulatedFailure=false; network(false); network(true); await waitFor(async()=>!(await db.getSyncQueue()).length); assert.equal((await row())[0].name,'QA Auto Sync Updated'); result.retryUploadedAutomatically=true;
 const snapshot=await db.exportDatabase(); const savedRow=snapshot.tables.customers.find(r=>r.id===customerId);
 await request('sync',{changes:[{table:'customers',operation:'UPSERT',row:savedRow}]}); assert.equal((await row()).length,1); result.repeatedUploadNoDuplicates=true;
 await assert.rejects(()=>request('sync',{changes:[{table:'customers',operation:'UPSERT',row:{...savedRow,name:'QA Should Roll Back'}},{table:'invalid_qa_table',operation:'UPSERT',row:{id:customerId}}]})); assert.equal((await row())[0].name,'QA Auto Sync Updated'); result.invalidBatchRolledBack=true;
 const anon=createClient(url,process.env.VITE_SUPABASE_ANON_KEY,options); const denied=await anon.rpc('sync_shop_records',{changes:[]}); assert.ok(denied.error); result.browserAnonWriteDenied=true;
 await db.deleteCustomer(customerId); await waitFor(async()=>!(await db.getSyncQueue()).length); assert.equal((await row()).length,0); result.testRecordRemoved=true;
} catch(error) { result.passed=false; result.error=error.message; process.exitCode=1; } finally {
 syncService.cleanup();
 if(customerId && (await row()).length) { await request('sync',{changes:[{table:'customers',operation:'DELETE',row:{id:customerId}}]}); assert.equal((await row()).length,0); }
}
fs.mkdirSync(path.join(root,'artifacts/qa'),{recursive:true}); fs.writeFileSync(path.join(root,'artifacts/qa/live-cloud-sync-result.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
