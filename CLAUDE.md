# Business Game

Browser board game of popular towns. Spec: the owner's Requirements Document.

## Stack
Vite + React + TypeScript on Vercel free tier. Online: Supabase free tier (edge function = referee, Realtime = live updates).
Game rules are pure TS (no UI imports) so the same code runs in the browser tests and on the server.

## Layout
- src/shared/  constants.ts (all game numbers), design.ts + design.css (look), board.ts, cards.ts, sound.ts
- src/game/  engine, rent, build, cards, auction, trade, endgame, networth, ai, actions (one entry: applyAction), controller, useLocalGame
- src/server/  handler.ts (online referee), types.ts
- src/online/  api.ts (browser to server), useOnlineGame.ts
- supabase/  functions/game (Deno wrapper), migrations/ ; SETUP.md = owner's online setup steps
- src/components/  screens and parts (GameScreen, SetupScreen, OnlineRoom, panels, Effects, css)
- scripts/check-*.ts  tests (npm run check); scripts/mock-server.ts = local fake server for browser tests

## Run
npm install; npm run dev; npm run build; npm run check

## Rules for work
- Read only the spec sections named for the current stage. Never invent; ask one short question.
- Fix only what the owner reports. Never repeat values; use constants.ts and design.ts.

## Handoff
- Done: Stages 1-12. Results and decisions are in ACCEPTANCE.md. Extra tests: npm run check:spec (needs SPEC_PATH), soak, fuzz.
- Not verified from the sandbox: online play on a live Supabase project (SETUP.md) and the real town photos.
- Next: owner feedback only. Fix only what the owner reports.
