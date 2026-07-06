import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './OverflowMenu.module.css'
import SoundSettings from './SoundSettings'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import Icon from '../common/Icon'
import { type BotSpeed, saveAnimationSpeed, applyAnimationSpeedToCss } from '../../utils/animationSettings'
import { applySessionSettings } from '../../api/sessionApi'

export default function OverflowMenu() {
  const { state, sendCmd } = useGame()
  const t = useT()
  const navigate = useNavigate()
  const { snapshot, myPlayerId } = state

  const [open, setOpen] = useState(false)
  const [showSound, setShowSound] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function copyInviteLink() {
    if (!snapshot) return
    const url = `${window.location.origin}${window.location.pathname}#/game/${snapshot.sessionId}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
    setOpen(false)
  }

  const sid = snapshot?.sessionId ?? ''
  const isHost = !!myPlayerId && snapshot?.hostPlayerId === myPlayerId

  return (
    <div className={styles.root}>
      <button className={styles.trigger} onClick={() => setOpen(v => !v)} title={t.moreActionsTitle}>
        <Icon name="menu" size={20} />
      </button>

      {showSound && (
        <div className={styles.soundOverlay} onClick={() => setShowSound(false)}>
          <div onClick={e => e.stopPropagation()}>
            <SoundSettings
              onClose={() => setShowSound(false)}
              isSpectator={!myPlayerId}
              onBotSpeedChange={(speed: BotSpeed) => {
                if (state.sessionId) {
                  applySessionSettings(state.sessionId, { botSpeed: speed })
                  saveAnimationSpeed(speed)
                  applyAnimationSpeedToCss(speed)
                }
              }}
            />
          </div>
        </div>
      )}

      {showHelp && (
        <div className={styles.soundOverlay} onClick={() => setShowHelp(false)}>
          <div className={styles.helpModal} onClick={e => e.stopPropagation()}>
            <div className={styles.buildModalHeader}>
              <span>{t.keyboardShortcutsBtn}</span>
              <button className={styles.closeBtn} onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className={styles.helpTable}>
              <div className={styles.helpRow}><kbd>{t.kbdSpace}</kbd><span>{t.kbdRollOrEnd}</span></div>
              <div className={styles.helpRow}><kbd>Esc</kbd><span>{t.kbdCloseModal}</span></div>
              <div className={styles.helpRow}><kbd>M</kbd><span>{t.kbdMute}</span></div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            <div className={styles.menuTitle}>{t.moreActionsTitle}</div>

            {snapshot && (
              <button className={styles.menuItem} onClick={copyInviteLink}>
                {linkCopied ? t.linkCopied : t.copyInviteLink}
              </button>
            )}
            <button className={styles.menuItem} onClick={() => { setOpen(false); setShowSound(true) }}>
              {t.soundSettingsBtn}
            </button>
            {/* keyboard shortcuts button hidden — shortcuts reduced to spacebar only
            <button className={`${styles.menuItem} ${styles.desktopOnly}`} onClick={() => { setOpen(false); setShowHelp(true) }}>
              {t.keyboardShortcutsBtn}
            </button> */}
            {snapshot && (
              <>
                <div className={styles.divider} />
                <button className={`${styles.menuItem} ${styles.danger}`}
                  onClick={() => {
                    setOpen(false)
                    if (myPlayerId && snapshot.status === 'IN_PROGRESS') {
                      sendCmd({ type: 'LeaveGame', sessionId: sid, actorPlayerId: myPlayerId })
                    }
                    navigate('/')
                  }}>
                  {t.leaveGameBtn}
                </button>
              </>
            )}
            {snapshot && myPlayerId && snapshot.status === 'IN_PROGRESS' && (
              isHost ? (
                <button className={`${styles.menuItem} ${styles.danger}`}
                  onClick={() => {
                    setOpen(false)
                    if (confirm(t.endGameConfirmMsg))
                      sendCmd({ type: 'AbortGame', sessionId: sid, actorPlayerId: myPlayerId })
                  }}>
                  {t.endGameForAllBtn}
                </button>
              ) : (
                <button className={`${styles.menuItem} ${styles.danger} ${styles.menuItemDisabled}`}
                  disabled title={t.onlyHostCanEndGame}>
                  {t.endGameForAllBtn}
                  <span className={styles.hostOnlyNote}>{t.onlyHostCanEndGame}</span>
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
