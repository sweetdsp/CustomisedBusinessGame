# Five States Business Game

Browser board game (towns of 5 southern Indian states). Spec: the owner's Requirements Document.

## Stack
Vite + React + TypeScript on Vercel free tier. Later: Supabase free tier as referee (server-side rules).
Game rules go in pure TS modules (no UI imports) so they can run server-side.

## Layout
- src/shared/constants.ts  all game numbers (single source)
- src/shared/design.ts + design.css  colors, fonts, spacing, timings
- src/shared/types.ts, board.ts (42 tiles, grid layout)
- src/game/  pure rules (engine.ts, rent.ts, dice.ts, types.ts) + useLocalGame.ts hook
- src/components/  Tile, Board, PlayerCard, Button, Banner, GameScreen, board.css, panels.css
- scripts/check-*.ts  sanity checks (npm run check)
- src/App.tsx, main.tsx  UI

## Run
npm install; npm run dev (local), npm run build, npm run check

## Rules for work
- Read only the spec sections named for the current stage. Never invent; ask one short question.
- One stage at a time, plan first, owner approves each stage. Keep replies short.
- Never repeat values; use constants.ts and design.ts.

## Handoff
- Done: Stages 1-4 (movement, buying, rent with doubling, taxes, Lucky Draw, Go to Jail). Interim rules: cannot-pay pays all cash (until stage 8); declined place stays unowned (until stage 7 auctions).
- Next: Stage 5 (houses, hotel, mortgage, unmortgage, selling). Read sections 10, 27.
- Owner: connect repo to Vercel; temporary setup screen in App.tsx is replaced later.
