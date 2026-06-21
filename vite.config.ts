import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import pkg from './package.json'

/** Dev-only plugin: receives POST /__debug/save-scenario and writes to src/debug/scenarios/. */
function debugScenarioPlugin(): Plugin {
  return {
    name: 'debug-scenario-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__debug/save-scenario', (req, res, next) => {
        if (req.method !== 'POST') { next(); return }
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const { name, state } = JSON.parse(body) as { name: string; state: unknown }
            const safeName = name.replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase().slice(0, 80)
            const dir = path.join(process.cwd(), 'src/debug/scenarios')
            fs.mkdirSync(dir, { recursive: true })
            const filename = `${safeName}.json`
            fs.writeFileSync(path.join(dir, filename), JSON.stringify(state, null, 2), 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, file: filename }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), debugScenarioPlugin()],
  base: '/monopoly-client/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' })
    ),
  },
})
