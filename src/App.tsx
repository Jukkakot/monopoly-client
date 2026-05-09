import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './store/GameContext'
import SessionListScreen from './screens/SessionListScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SessionListScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/game/:sessionId" element={<GameScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </GameProvider>
  )
}
