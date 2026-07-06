# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173, HMR enabled)
npm run build        # Type-check + production build → dist/ (run before every commit)
npm run lint         # ESLint with flat config
npm run deploy       # Build + publish to GitHub Pages
npm run test:rules   # Vitest game-rule tests — run against a live backend (VITE_API_BASE)
npm run test:ui      # Playwright E2E tests (starts dev server automatically)
```

## Environment

Copy `.env.example` to `.env.local` and set `VITE_API_BASE` to the backend URL. Default fallback is `http://localhost:8080`; the deployed backend is at `https://monopoly-backend-bv41.onrender.com`.

The backend lives in a sibling repo: `e:\Documents\ProcessingProjects\MonopolyBackend`.
Its `src/main/resources/openapi.yaml` is the authoritative API spec (also served live at
`<backend>/openapi.yaml`) — **check it before any change to the frontend↔backend
interface**, and keep `src/types/api.ts` in sync with it.

## Architecture

React 19 + TypeScript SPA (Vite, HashRouter) for a Helsinki-themed multiplayer Monopoly game. All game state arrives from the backend; the client is purely reactive — the backend is the authoritative rule enforcer.

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

## i18n — Finnish/English

All user-visible strings go through `src/i18n/`:
- `translations.ts` defines the `T` interface and the `fi`/`en` string tables
- Components call `useT()` from `LanguageContext.tsx`; never hardcode UI text inline
- Card texts live in `cards.ts`; language toggles via `useLangToggle()`
- When adding any new UI string, add it to the `T` interface and **both** language tables

## Player identity display

Whenever a player's name is shown to identify them (column headers, labels, action messages, lists), always display it as:

**[token symbol] [name in player's tokenColorHex]**

Use the `PlayerName` component in `src/components/actions/ActionPanel.tsx` as the canonical implementation. Player names must never appear as plain unstyled text where the player's identity is the point. Token color comes from `seat.tokenColorHex`; token shape comes from `useTokenShapes(state)` (loads from localStorage via `loadTokenShapes`).

## Style conventions

- CSS Modules per component (`.module.css` co-located)
- ESLint enforces `noUnusedLocals` / `noUnusedParameters` — TypeScript also has these in tsconfig.app.json
- Shared visual concepts (property chips, money chips, buttons) must reuse the canonical component — never re-implement inline
- **Never let components clip out of view.** Any absolutely/fixed-positioned element, overlay, or panel must be checked at all common screen sizes (mobile portrait, mobile landscape, desktop narrow). Use `overflow: hidden` only where intentional; always verify content remains accessible.

## Settings panel

All user-configurable settings belong in `src/components/menu/SoundSettings.tsx` (the ⚙️ panel opened via the overflow menu). Do not add toggles or settings to the overflow menu itself — put them in SoundSettings.

## Testing & debugging

- **Rule tests** (`e2e/rules/*.test.ts`, Vitest): integration tests for game rules — they create real sessions against whatever `VITE_API_BASE` points to. Shared helpers in `e2e/helpers/`, predefined game states in `e2e/scenarios/`. When verifying rule behaviour, hit the real (deployed) backend rather than only reading backend source.
- **UI tests** (`e2e/ui/`, Playwright): full browser E2E; `e2e/globalSetup.ts` waits for the backend.
- **Debug panel** (`src/debug/DebugPanel.tsx`, `useDebugMode.ts`): in-app tool for loading scenario states and inspecting snapshots during development.
- Visual checks: use Playwright MCP screenshots at mobile portrait, mobile landscape, and desktop narrow widths.
- **Known-flaky UI tests:** the Playwright `e2e/ui/` suite is chronically broken in the owner's environment and failures there are usually NOT caused by the change under review. Do not sink time into them during bug-hunting sessions unless explicitly asked. Rely on `npm run build`, unit tests (`vitest --project unit`), and the `e2e/rules/` suite (against a live backend) for validation.
- **Unit tests** (`src/**/*.test.ts`, vitest `unit` project): pure-logic tests with no backend/DOM. Fast — run `npx vitest run --project unit` on every client change.

## Project docs

- `docs/todo.md` — working backlog; remove items when completed
- Backend game-rule details (turn phases, commands, rejection codes): see `MonopolyBackend/README.md` and `MonopolyBackend/docs/openapi.yaml`

## Deployment

The Vite base path is `/monopoly-client/` for GitHub Pages. This is set in `vite.config.ts` — do not remove it.

GitHub Actions (`deploy.yml`) runs rule tests on every push to master; deploy is blocked if they fail. Playwright E2E failures warn but do not block.

## Autonomous bug-hunting workflow

Standing conventions for autonomous "find & fix bugs" sessions (persisted so a fresh cold start behaves right without the owner re-stating them):

- **Push each fix to BOTH the working branch AND `master`** (`git push origin HEAD:master`). Same rule in the sibling `monopoly-backend` repo.
- **Every fix gets a regression test** and `npm run build` + `npx vitest run --project unit` must pass before committing. When a change touches game rules, also run the `e2e/rules/` suite against a live backend.
- **Any new UI string goes through the i18n tables** (`src/i18n/translations.ts`, both `fi` and `en`) — hardcoded Finnish in components is a recurring bug class.
- Client deploys to GitHub Pages on push to `master`; backend fixes need a separate Render deploy to take effect.
