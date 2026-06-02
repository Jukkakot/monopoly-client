# monopoly-client

Helsinki-teemainen moninpeli-Monopoly — React/TypeScript SPA. Kaikki pelitila tulee backendiltä; asiakasohjelma on puhtaasti reaktiivinen.

**Live:** https://jukkakot.github.io/monopoly-client/  
**Backend:** https://monopoly-backend-bv41.onrender.com

---

## Pikastartti

```bash
# 1. Asenna riippuvuudet
npm install

# 2. Kopioi ympäristömuuttujat ja aseta backend-URL
cp .env.example .env.local
# muokkaa VITE_API_BASE tarvittaessa

# 3. Käynnistä kehityspalvelin
npm run dev   # → http://localhost:5173
```

---

## Komennot

| Komento | Kuvaus |
|---|---|
| `npm run dev` | Vite-kehityspalvelin (HMR, localhost:5173) |
| `npm run build` | TypeScript-tarkistus + tuotantobuild → `dist/` |
| `npm run lint` | ESLint |
| `npm run deploy` | Build + julkaisu GitHub Pagesiin |
| `npm run test:rules` | Vitest-sääntötestit (integraatio vs. live-backend) |
| `npm run test:ui` | Playwright E2E -testit |

---

## Ympäristömuuttujat

| Muuttuja | Oletus | Kuvaus |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8080` | Backend-URL |
| `VITE_AXIOM_TOKEN` | — | Axiom-lokkaus (valinnainen) |
| `VITE_AXIOM_DATASET` | — | Axiom-dataset (valinnainen) |

---

## Arkkitehtuuri

React 19 + TypeScript SPA (Vite, HashRouter).

### Tietovirta

```
EventSource  GET /sessions/{id}/events
     │
     ▼
GameContext  (useReducer, src/store/GameContext.tsx)
     │
     ├── useGame()  ─────────────────── komponentit lukevat tilan
     │
     └── sendCmd()  POST /sessions/{id}/command
```

1. `GameContext` pitää kaiken tilan `useReducer`-koukkuna.
2. `EventSource` yhdistää `GET /sessions/{id}/events`-SSE-virtaan ja vastaanottaa versioituja `ClientSessionSnapshot`-tapahtumia.
3. Katkennut yhteys reconnektoituu eksponentiaalisella peruutuksella `lastEventId`:llä.
4. Kaikki pelaajan toiminnot ovat `POST /sessions/{id}/command` -kutsuja `sendCmd()`-kautta.
5. Komponentit lukevat tilan `useGame()`-koukin kautta — ei paikallista pelitilaa muualla.

### Näyttövirta

```
/          →  SessionListScreen    (liity olemassa olevaan)
/lobby     →  LobbyScreen          (konfiguroi + luo sessio)
/game/:id  →  GameScreen → AppLayout (lauta + sivupalkki)
```

### Avaintiedostot

| Tiedosto | Kuvaus |
|---|---|
| `src/store/GameContext.tsx` | Kaikki pelitila, SSE-yhteys, `sendCmd` |
| `src/types/api.ts` | Kaikki backend-tyypitykset (40+ rajapintaa) |
| `src/types/spots.ts` | Staattinen laudan määrittely (40 Helsinki-ruutua) |
| `src/components/actions/ActionPanel.tsx` | Vaihepohjainen toimintopaneeli |

### ActionPanel-vaiheet

`ActionPanel` renderöi eri painikeryhmiä `TurnState.phase`-arvon mukaan:

| Vaihe | Toiminto |
|---|---|
| `WAITING_FOR_ROLL` | Nopanheitto / vankilapakoilu |
| `WAITING_FOR_DECISION` | Osta tai hylkää kiinteistö |
| `WAITING_FOR_AUCTION` | Huutokauppatarjous tai ohitus |
| `RESOLVING_DEBT` | Velanmaksu, panttaus, myynti tai konkurssi |
| `WAITING_FOR_END_TURN` | Rakenna, panttaa, kauppaa, lopeta vuoro |

---

## Testaus

### Sääntötestit (Vitest, integraatio)

```bash
npm run test:rules          # aja kertaalleen
npm run test:rules:watch    # watch-tila
npm run test:rules:ui       # Vitest UI
```

Testit sijaitsevat `e2e/rules/`-hakemistossa ja ajavat komentoja live-backendiä (tai `VITE_API_BASE`:lla määritettyä backendiä) vasten. Skenaariot ovat `e2e/scenarios/`.

### UI-testit (Playwright, E2E)

```bash
npm run test:ui              # headless
npm run test:ui:headed       # selain näkyvissä
npm run test:ui:debug        # Playwright UI
```

Playwright käynnistää kehityspalvelimen automaattisesti ja odottaa backendin heräämistä (`e2e/globalSetup.ts`).

---

## CI/CD

GitHub Actions (`deploy.yml`) ajaa jokaisella `master`-pushilla:

1. **test-rules** — Vitest-sääntötestit; estää deployn jos failaa
2. **test-ui** — Playwright E2E; `continue-on-error: true` (ei estä deployta)
3. **deploy** — build + GitHub Pages (riippuu vain `test-rules`:sta)

---

## Deployment

Sovellus julkaistaan GitHub Pagesiin hakemistoon `/monopoly-client/` (asetettu `vite.config.ts`:ssä).

```bash
npm run deploy   # build + gh-pages -julkaisu
```
