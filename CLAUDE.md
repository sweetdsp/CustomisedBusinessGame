# Five States Business Game

Browser board game (towns of 5 southern Indian states). Spec: the owner's Requirements Document.

## Stack
Vite + React + TypeScript on Vercel free tier. Later: Supabase free tier as referee (server-side rules).
Game rules go in pure TS modules (no UI imports) so they can run server-side.

## Layout
- src/shared/constants.ts  all game numbers (single source)
- src/shared/design.ts + design.css  colors, fonts, spacing, timings
- src/shared/types.ts, board.ts (42 tiles, grid layout), cards.ts (32 cards)
- src/game/  pure rules (engine.ts, rent.ts, build.ts, cards.ts, money.ts, dice.ts, types.ts) + useLocalGame.ts hook
- src/components/  Tile, Board, PlayerCard, PlacesList, CardReveal, Button, Banner, GameScreen, board.css, panels.css
- scripts/check-*.ts  sanity checks (npm run check)
- src/App.tsx, main.tsx  UI

## Run
npm install; npm run dev (local), npm run build, npm run check

## Rules for work
- Read only the spec sections named for the current stage. Never invent; ask one short question.
- One stage at a time, plan first, owner approves each stage. Keep replies short.
- Never repeat values; use constants.ts and design.ts.

## Handoff
- Done: Stages 1-6 (movement, buying, rent, taxes, buildings, mortgage, Fortune and Festival cards). Interim rules: cannot-pay pays all cash (until stage 8); declined place stays unowned (until stage 7 auctions); Get Out of Jail Free is only held (used in stage 8).
- Next: Stage 7 (auctions, trading and their timers). Read sections 13, 26, 30.
- Owner: connect repo to Vercel; temporary setup screen in App.tsx is replaced later.
