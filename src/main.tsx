import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { logger } from './utils/logger.ts'

window.addEventListener('unhandledrejection', (e) => {
  logger.error('Unhandled promise rejection', { reason: String(e.reason) })
})

window.addEventListener('error', (e) => {
  logger.error('Uncaught error', { message: e.message, source: e.filename, line: e.lineno })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
