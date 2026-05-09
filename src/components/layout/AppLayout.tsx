import styles from './AppLayout.module.css'
import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  board: ReactNode
  players: ReactNode
  actions: ReactNode
}

export default function AppLayout({ header, board, players, actions }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.boardCol}>
        {board}
      </div>
      <div className={styles.sideCol}>
        {header}
        <div className={styles.players}>{players}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  )
}
