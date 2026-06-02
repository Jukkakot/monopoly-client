const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'

export default async function setup() {
  console.log(`\n⏳ Waiting for backend at ${BASE}...`)
  const start = Date.now()
  while (Date.now() - start < 120_000) {
    try {
      const r = await fetch(`${BASE}/health`)
      if (r.ok) {
        console.log(`✅ Backend ready in ${((Date.now() - start) / 1000).toFixed(1)}s\n`)
        return
      }
    } catch { /* still waking */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Backend did not respond within 120s — aborting tests')
}
