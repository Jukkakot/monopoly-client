import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ReactionButton.module.css'
import BottomSheet from '../common/BottomSheet'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { postChat, REACTION_EMOJIS } from '../../api/sessionApi'

/** A floating button on the game view that opens an emoji picker; the chosen reaction floats
 *  up from the sender's cash chip (see FloatingReactions) so everyone sees who reacted.
 *  Hidden for spectators (they have no player token to post with). */
export default function ReactionButton() {
  const { state } = useGame()
  const t = useT()
  const [open, setOpen] = useState(false)

  const canSend = !!(state.sessionId && state.myPlayerId &&
    state.snapshot && state.snapshot.status === 'IN_PROGRESS')
  if (!canSend) return null

  async function react(emoji: string) {
    setOpen(false)
    if (!state.sessionId || !state.myPlayerId) return
    const token = (() => {
      try { return sessionStorage.getItem(`monopoly_token_${state.sessionId}`) ?? '' } catch { return '' }
    })()
    if (!token) return
    await postChat(state.sessionId, state.myPlayerId, token, 'REACTION', emoji)
  }

  return (
    <>
      {createPortal(
        <button
          type="button"
          className={styles.fab}
          onClick={() => setOpen(true)}
          aria-label={t.reactionButtonLabel}
          title={t.reactionButtonLabel}
        >
          <span aria-hidden="true">😀</span>
        </button>,
        document.body,
      )}
      {open && (
        <BottomSheet onClose={() => setOpen(false)} ariaLabel={t.chatReactionsLabel}>
          <div className={styles.pickerTitle}>{t.reactionButtonLabel}</div>
          <div className={styles.grid}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={styles.emojiBtn}
                onClick={() => react(emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  )
}
