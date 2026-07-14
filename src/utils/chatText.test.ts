import { describe, it, expect } from 'vitest'
import { resolveChatText } from './chatText'

const botChat = { greeting: ['A', 'B', 'C'] }

describe('resolveChatText', () => {
  it('picks a bot line deterministically from the seed (same seed → same line)', () => {
    const chat = { kind: 'MESSAGE' as const, name: 'Bot', content: '', playerId: 'p1', botMsgKey: 'greeting' }
    expect(resolveChatText(chat, botChat, 7)).toBe(resolveChatText(chat, botChat, 7))
    expect(resolveChatText(chat, botChat, 0)).toBe('A')
    expect(resolveChatText(chat, botChat, 1)).toBe('B')
    expect(resolveChatText(chat, botChat, 5)).toBe('C') // 5 % 3 = 2
  })

  it('falls back to literal content for human messages (no key)', () => {
    const chat = { kind: 'MESSAGE' as const, name: 'Anna', content: 'moi kaikki', playerId: 'p1' }
    expect(resolveChatText(chat, botChat, 3)).toBe('moi kaikki')
  })

  it('falls back to content when the key is unknown to this client', () => {
    const chat = { kind: 'MESSAGE' as const, name: 'Bot', content: '', playerId: 'p1', botMsgKey: 'newSpotWeDontKnowYet' }
    expect(resolveChatText(chat, botChat, 3)).toBe('')
  })
})
