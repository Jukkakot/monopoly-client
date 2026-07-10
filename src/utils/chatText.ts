import type { GameEvent } from '../store/events'

type ChatPayload = NonNullable<GameEvent['chat']>

/** Resolves a chat message's display text: a bot line is localized from its (key, variant) via
 *  the current language's botChat table (clamped modulo the pool length); a human line — or a
 *  bot line whose key this client doesn't know — falls back to the stored content verbatim. */
export function resolveChatText(chat: ChatPayload, botChat: Record<string, string[]>): string {
  if (chat.botMsgKey) {
    const pool = botChat[chat.botMsgKey]
    if (pool && pool.length > 0) return pool[(chat.botVariant ?? 0) % pool.length]
  }
  return chat.content
}
