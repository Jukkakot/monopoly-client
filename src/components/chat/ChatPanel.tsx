import { memo, useEffect, useMemo, useRef, useState } from 'react'
import styles from './ChatPanel.module.css'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { postChat, REACTION_EMOJIS, MAX_CHAT_LEN } from '../../api/sessionApi'
import { TokenSvg } from '../board/TokenSvg'
import { useTokenShapes } from '../../utils/tokenShapes'
import { resolveChatText } from '../../utils/chatText'
import BottomSheet from '../common/BottomSheet'
import type { GameEvent } from '../../store/events'

/** Short HH:MM stamp in the viewer's locale — shows when a line was actually sent. */
function formatTime(ts: number): string {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

/** Chat + emoji reactions. Messages ride the same SSE event log as game events
 *  (filtered to `e.chat`); sending posts to the backend, which broadcasts to everyone. */
export default memo(function ChatPanel() {
  const { state } = useGame()
  const t = useT()
  const snap = state.snapshot
  const tokenShapes = useTokenShapes(snap)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // The message id an emoji reaction is being attached to (WhatsApp-style), if the picker is open.
  const [reactTargetId, setReactTargetId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const chatEvents = useMemo<GameEvent[]>(() => state.chatEvents.filter(e => e.chat), [state.chatEvents])

  // Reactions attached to a specific message (replyToId) are shown under that bubble, not as their
  // own line. Map messageId → its attached reaction events, in arrival order.
  const attached = useMemo(() => {
    const m = new Map<number, GameEvent[]>()
    for (const e of chatEvents) {
      const r = e.chat!
      if (r.kind === 'REACTION' && r.replyToId != null) {
        const arr = m.get(r.replyToId) ?? []
        arr.push(e)
        m.set(r.replyToId, arr)
      }
    }
    return m
  }, [chatEvents])

  // A bot line is localized live into the viewer's language; a human line is verbatim.
  const messageText = (chat: NonNullable<GameEvent['chat']>, seed: number) => resolveChatText(chat, t.botChat, seed)

  const nameOf = useMemo(() => {
    const map = new Map((snap?.players ?? []).map(p => [p.playerId, p.name]))
    return (id: string) => map.get(id)
  }, [snap?.players])

  const seatColor = useMemo(() => {
    const map = new Map((snap?.seats ?? []).map(s => [s.playerId, s.tokenColorHex]))
    return (id: string) => map.get(id) ?? '#888'
  }, [snap?.seats])

  // Am I a seated player (can I send)? Spectators can read but not post.
  const canSend = !!(state.sessionId && state.myPlayerId)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatEvents.length])

  async function send(kind: 'MESSAGE' | 'REACTION', content: string, replyToId?: number) {
    if (!state.sessionId || !state.myPlayerId) return
    const token = (() => {
      try { return sessionStorage.getItem(`monopoly_token_${state.sessionId}`) ?? '' } catch { return '' }
    })()
    if (!token) return
    await postChat(state.sessionId, state.myPlayerId, token, kind, content, replyToId)
  }

  async function onSubmit() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    await send('MESSAGE', trimmed.slice(0, MAX_CHAT_LEN))
    setSending(false)
  }

  /** The @mention prefix on a directed bot line — the target's name in their token colour. */
  function Mention({ targetId }: { targetId: string }) {
    const name = nameOf(targetId)
    if (!name) return null
    return <span className={styles.mention} style={{ color: seatColor(targetId) }}>@{name} </span>
  }

  /** Small emoji chips under a message for the reactions attached to it (aggregated by emoji). */
  function AttachedReactions({ messageId }: { messageId: number }) {
    const reacts = attached.get(messageId)
    if (!reacts || reacts.length === 0) return null
    const byEmoji = new Map<string, number>()
    for (const r of reacts) byEmoji.set(r.chat!.content, (byEmoji.get(r.chat!.content) ?? 0) + 1)
    return (
      <div className={styles.reactChips}>
        {[...byEmoji.entries()].map(([emoji, count]) => (
          <span key={emoji} className={styles.reactChip}>
            {emoji}{count > 1 && <span className={styles.reactCount}>{count}</span>}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.wrapper} data-testid="chat-panel">
      <div className={styles.messages} ref={listRef}>
        {chatEvents.length === 0 && <div className={styles.empty}>{t.chatEmpty}</div>}
        {chatEvents.map(e => {
          const chat = e.chat!
          const mine = chat.playerId === state.myPlayerId
          const color = seatColor(chat.playerId)
          const shape = tokenShapes.get(chat.playerId) ?? 'circle'
          if (chat.kind === 'REACTION') {
            // Reactions attached to a message are rendered under that bubble, not on their own line.
            if (chat.replyToId != null) return null
            return (
              <div key={e.id} className={`${styles.reactionLine} ${mine ? styles.reactionLineMine : ''}`}>
                <TokenSvg size={13} color={color} shape={shape} style={{ verticalAlign: 'middle' }} />
                <span className={styles.reactionName} style={{ color }}>{chat.name}</span>
                <span className={styles.reactionEmoji}>{chat.content}</span>
                <span className={styles.time}>{formatTime(e.timestamp)}</span>
              </div>
            )
          }
          return (
            <div key={e.id} className={`${styles.msg} ${mine ? styles.msgMine : ''}`}>
              <div className={styles.msgMeta}>
                <TokenSvg size={13} color={color} shape={shape} style={{ verticalAlign: 'middle' }} />
                <span className={styles.msgName} style={{ color }}>{chat.name}</span>
                <span className={styles.time}>{formatTime(e.timestamp)}</span>
              </div>
              <div className={styles.bubbleRow}>
                {canSend && (
                  <button
                    type="button"
                    className={styles.msgReactBtn}
                    onClick={() => setReactTargetId(e.id)}
                    aria-label={t.chatReactToMessage}
                    title={t.chatReactToMessage}
                  >😀</button>
                )}
                <div className={styles.bubble}>
                  {chat.targetPlayerId && <Mention targetId={chat.targetPlayerId} />}
                  {messageText(chat, e.id)}
                </div>
              </div>
              <AttachedReactions messageId={e.id} />
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

      {/* Emoji picker for reacting to a specific message. */}
      {reactTargetId != null && (
        <BottomSheet onClose={() => setReactTargetId(null)} ariaLabel={t.chatReactToMessage}>
          <div className={styles.pickerTitle}>{t.chatReactToMessage}</div>
          <div className={styles.pickerGrid}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={styles.pickerBtn}
                onClick={() => { const id = reactTargetId; setReactTargetId(null); send('REACTION', emoji, id) }}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  )
})
