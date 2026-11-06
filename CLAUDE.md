# Five States Business Game

Browser board game (towns of 5 southern Indian states). Spec: the owner's Requirements Document.

## Stack
Vite + React + TypeScript on Vercel free tier. Later: Supabase free tier as referee (server-side rules).
Game rules go in pure TS modules (no UI imports) so they can run server-side.

## Layout
- src/shared/constants.ts  all game numbers (single source)
- src/shared/design.ts + design.css  colors, fonts, spacing, timings
- src/shared/types.ts
- scripts/check-constants.ts  sanity check of the price table
- src/App.tsx, main.tsx  UI

## Run
npm install; npm run dev (local), npm run build, npm run check

## Rules for work
- Read only the spec sections named for the current stage. Never invent; ask one short question.
- One stage at a time, plan first, owner approves each stage. Keep replies short.
- Never repeat values; use constants.ts and design.ts.

## Handoff
- Done: Stage 1 (setup, constants, design file, placeholder home).
- Next: Stage 2 (board with 42 tiles, colors, main screen layout). Read sections 5, 19, 23, 20.
- Owner: connect repo to Vercel to deploy.
