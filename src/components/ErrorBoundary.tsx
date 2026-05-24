import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logger } from '../utils/logger'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('React render error', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Jokin meni pieleen</h2>
          <p style={{ color: '#666' }}>Lataa sivu uudelleen jatkaaksesi.</p>
          <button onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', cursor: 'pointer' }}>
            Lataa uudelleen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
