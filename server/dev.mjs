import { spawn } from 'node:child_process'

// npm run dev starts both components; the private key is loaded by cloud.mjs only.
const children = [
  spawn(process.execPath, ['server/cloud.mjs'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true }),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = code
}
for (const child of children) {
  child.on('error', () => stop(1))
  child.on('exit', code => stop(code || 0))
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop())
