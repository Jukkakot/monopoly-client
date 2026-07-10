import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { GameProvider } from './store/GameContext'
import { LanguageProvider } from './i18n/LanguageContext'
import SessionListScreen from './screens/SessionListScreen'
import styles from './App.module.css'

// Route-split the heavier screens so the initial load (the session list) doesn't ship the
// whole game (board, action panel, effects). They load on navigation.
const LobbyScreen = lazy(() => import('./screens/LobbyScreen'))
const LobbyWaitingScreen = lazy(() => import('./screens/LobbyWaitingScreen'))
const GameScreen = lazy(() => import('./screens/GameScreen'))

function RouteFallback() {
  return <div className={styles.routeFallback} aria-busy="true" />
}

export default function App() {
  return (
    <LanguageProvider>
    <GameProvider>
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<SessionListScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/lobby-wait/:sessionId" element={<LobbyWaitingScreen />} />
            <Route path="/game/:sessionId" element={<GameScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </GameProvider>
    </LanguageProvider>
  )
}
