type AxiomClient = import('@axiomhq/js').Axiom

const token = import.meta.env.VITE_AXIOM_TOKEN as string | undefined
const dataset = import.meta.env.VITE_AXIOM_DATASET as string | undefined

// Load the (heavy) Axiom SDK lazily on the first log, so it never sits in the initial
// bundle / critical path. Resolves to null when telemetry isn't configured (e.g. dev).
let _axiom: Promise<AxiomClient | null> | null = null
function getAxiom(): Promise<AxiomClient | null> {
  if (!token || !dataset) return Promise.resolve(null)
  if (!_axiom) {
    _axiom = import('@axiomhq/js')
      .then(({ Axiom }) => new Axiom({ token }))
      .catch(() => null)
  }
  return _axiom
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Only flush if Axiom was already loaded — don't pull in the SDK on unload.
    if (_axiom) _axiom.then(ax => ax?.flush().catch(() => {})).catch(() => {})
  })
}

type Fields = Record<string, unknown>

function send(level: string, message: string, fields?: Fields) {
  if (!token || !dataset) return
  getAxiom().then(ax => {
    if (!ax) return
    ax.ingest(dataset, [{ _time: new Date().toISOString(), level, message, env: import.meta.env.MODE, ...fields }])
    if (level === 'error') ax.flush().catch(() => {})
  }).catch(() => {})
}

export const logger = {
  error(message: string, fields?: Fields) { console.error('[app]', message, fields); send('error', message, fields) },
  warn(message: string, fields?: Fields)  { console.warn('[app]', message, fields);  send('warn',  message, fields) },
  info(message: string, fields?: Fields)  { send('info',  message, fields) },
}
