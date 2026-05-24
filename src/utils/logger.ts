import { Axiom } from '@axiomhq/js'

const token = import.meta.env.VITE_AXIOM_TOKEN as string | undefined
const dataset = import.meta.env.VITE_AXIOM_DATASET as string | undefined

let _axiom: Axiom | null = null
function getAxiom(): Axiom | null {
  if (!token || !dataset) return null
  if (!_axiom) _axiom = new Axiom({ token })
  return _axiom
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    getAxiom()?.flush().catch(() => {})
  })
}

type Fields = Record<string, unknown>

function send(level: string, message: string, fields?: Fields) {
  const ax = getAxiom()
  if (!ax) return
  ax.ingest(dataset!, [{ _time: new Date().toISOString(), level, message, env: import.meta.env.MODE, ...fields }])
  if (level === 'error') ax.flush().catch(() => {})
}

export const logger = {
  error(message: string, fields?: Fields) { console.error('[app]', message, fields); send('error', message, fields) },
  warn(message: string, fields?: Fields)  { console.warn('[app]', message, fields);  send('warn',  message, fields) },
  info(message: string, fields?: Fields)  { send('info',  message, fields) },
}
