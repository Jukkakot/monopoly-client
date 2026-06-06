# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173, HMR enabled)
npm run build      # Type-check + production build → dist/
npm run lint       # ESLint with flat config
npm run deploy     # Build + publish to GitHub Pages
```

No test runner is configured.

## Environment

Copy `.env.example` to `.env.local` and set `VITE_API_BASE` to the backend URL. Default fallback is `http://localhost:8080`; the deployed backend is at `https://monopoly-backend-bv41.onrender.com`.

## Architecture

React 19 + TypeScript SPA (Vite, HashRouter) for a Helsinki-themed multiplayer Monopoly game. All game state arrives from the backend; the client is purely reactive.

**Data flow:**
1. `GameContext` (src/store/GameContext.tsx) holds all state in a `useReducer`
2. An `EventSource` connected to `GET /sessions/{id}/events` streams versioned `ClientSessionSnapshot` events
3. Reconnection uses exponential backoff with `lastEventId` for resumption
4. All player actions are `POST /sessions/{id}/command` calls via `sendCmd()` in context
5. Components read state through the `useGame()` hook — no local game state anywhere else

**Screen flow:**
- `/` → `SessionListScreen` (join existing)
- `/lobby` → `LobbyScreen` (configure + create session)
- `/game/:sessionId` → `GameScreen` → `AppLayout` (board + sidebar)

**Key type boundaries:**
- `src/types/api.ts` — all backend-facing types (40+ interfaces); `SessionState` is the root
- `src/types/spots.ts` — static board definition (40 Helsinki spots), `indexToGridPos()` maps board index → CSS Grid 11×11

**ActionPanel** (src/components/actions/ActionPanel.tsx) is the most complex component: it is phase-driven, rendering different button groups based on `TurnState.phase` (roll, end-turn, decision, auction, debt, trade).

## Player identity display

Whenever a player's name is shown to identify them (column headers, labels, action messages, lists), always display it as:

**[token symbol] [name in player's tokenColorHex]**

Use the `PlayerName` component in `src/components/actions/ActionPanel.tsx` as the canonical implementation. Player names must never appear as plain unstyled text where the player's identity is the point. Token color comes from `seat.tokenColorHex`; token shape comes from `useTokenShapes(state)` (loads from localStorage via `loadTokenShapes`).

## Style conventions

- CSS Modules per component (`.module.css` co-located)
- Finnish UI labels throughout (phase names, button text)
- ESLint enforces `noUnusedLocals` / `noUnusedParameters` — TypeScript also has these in tsconfig.app.json
- **Never let components clip out of view.** Any absolutely/fixed-positioned element, overlay, or panel must be checked at all common screen sizes (mobile portrait, mobile landscape, desktop narrow). Use `overflow: hidden` only where intentional; always verify content remains accessible.

## Settings panel

All user-configurable settings belong in `src/components/menu/SoundSettings.tsx` (the ⚙️ panel opened via the overflow menu). Do not add toggles or settings to the overflow menu itself — put them in SoundSettings.

## Deployment

The Vite base path is `/monopoly-client/` for GitHub Pages. This is set in `vite.config.ts` — do not remove it.
