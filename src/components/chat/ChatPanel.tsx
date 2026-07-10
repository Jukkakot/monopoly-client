import { memo, useEffect, useMemo, useRef, useState } from 'react'
import styles from './ChatPanel.module.css'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { postChat, REACTION_EMOJIS, MAX_CHAT_LEN } from '../../api/sessionApi'
import { TokenSvg } from '../board/TokenSvg'
import { useTokenShapes } from '../../utils/tokenShapes'
import { resolveChatText } from '../../utils/chatText'
import type { GameEvent } from '../../store/events'

/** Chat + emoji reactions. Messages ride the same SSE event log as game events
 *  (filtered to `e.chat`); sending posts to the backend, which broadcasts to everyone. */
export default memo(function ChatPanel() {
  const { state } = useGame()
  const t = useT()
  const snap = state.snapshot
  const tokenShapes = useTokenShapes(snap)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const messages = useMemo<GameEvent[]>(() => state.events.filter(e => e.chat), [state.events])

  // A bot line is localized live into the viewer's language; a human line is verbatim.
  const messageText = (chat: NonNullable<GameEvent['chat']>) => resolveChatText(chat, t.botChat)

  const seatColor = useMemo(() => {
    const map = new Map((snap?.seats ?? []).map(s => [s.playerId, s.tokenColorHex]))
    return (id: string) => map.get(id) ?? '#888'
  }, [snap?.seats])

  // Am I a seated player (can I send)? Spectators can read but not post.
  const canSend = !!(state.sessionId && state.myPlayerId)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  async function send(kind: 'MESSAGE' | 'REACTION', content: string) {
    if (!state.sessionId || !state.myPlayerId) return
    const token = (() => {
      try { return sessionStorage.getItem(`monopoly_token_${state.sessionId}`) ?? '' } catch { return '' }
    })()
    if (!token) return
    await postChat(state.sessionId, state.myPlayerId, token, kind, content)
  }

  async function onSubmit() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    await send('MESSAGE', trimmed.slice(0, MAX_CHAT_LEN))
    setSending(false)
  }

  return (
    <div className={styles.wrapper} data-testid="chat-panel">
      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 && <div className={styles.empty}>{t.chatEmpty}</div>}
        {messages.map(e => {
          const chat = e.chat!
          const mine = chat.playerId === state.myPlayerId
          const color = seatColor(chat.playerId)
          const shape = tokenShapes.get(chat.playerId) ?? 'circle'
          if (chat.kind === 'REACTION') {
            return (
              <div key={e.id} className={`${styles.reactionLine} ${mine ? styles.reactionLineMine : ''}`}>
                <TokenSvg size={13} color={color} shape={shape} style={{ verticalAlign: 'middle' }} />
                <span className={styles.reactionName} style={{ color }}>{chat.name}</span>
                <span className={styles.reactionEmoji}>{chat.content}</span>
              </div>
            )
          }
          return (
            <div key={e.id} className={`${styles.msg} ${mine ? styles.msgMine : ''}`}>
              <div className={styles.msgMeta}>
                <TokenSvg size={13} color={color} shape={shape} style={{ verticalAlign: 'middle' }} />
                <span className={styles.msgName} style={{ color }}>{chat.name}</span>
              </div>
              <div className={styles.bubble}>{messageText(chat)}</div>
            </div>
          )
        })}
      </div>

      {canSend ? (
        <>
          <div className={styles.reactionBar} aria-label={t.chatReactionsLabel}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={styles.reactionBtn}
                onClick={() => send('REACTION', emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="text"
              value={text}
              maxLength={MAX_CHAT_LEN}
              placeholder={t.chatInputPlaceholder}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
              aria-label={t.chatInputPlaceholder}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={onSubmit}
              disabled={!text.trim() || sending}
            >
              {t.chatSend}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.spectatorHint}>{t.chatSpectatorHint}</div>
      )}
    </div>
  )
})
