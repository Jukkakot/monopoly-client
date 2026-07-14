import type { GameEvent } from '../store/events'

type ChatPayload = NonNullable<GameEvent['chat']>

/** Resolves a chat message's display text. A bot line carries only a situation key (`botMsgKey`);
 *  the client owns the phrasing pool and picks one deterministically from `seed` (the CHAT event
 *  id) so every viewer sees the same line, localized. A human line — or a bot line whose key this
 *  client doesn't know yet — falls back to the stored content. */
export function resolveChatText(chat: ChatPayload, botChat: Record<string, string[]>, seed = 0): string {
  if (chat.botMsgKey) {
    const pool = botChat[chat.botMsgKey]
    if (pool && pool.length > 0) return pool[Math.abs(seed) % pool.length]
  }
  return chat.content
}
