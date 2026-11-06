# Acceptance checklist results (section 36)

Automated: `npm run check` (rules, auctions, trades, jail, debts, bankruptcy, computers, online referee), `npm run check:spec`
(compares the code with the Requirements Document), `npm run soak` (200 full computer games, rule checks after every move),
`npm run fuzz` (random and illegal requests). Browser: Playwright runs of local play, auction/trade windows, phone width and an
online game against a local stand-in for the server.

| # | Item | Result |
| --- | --- | --- |
| 1 | 42 tiles, section 23 order, correct colours | Pass (check:spec compares every tile) |
| 2 | Prices, rents, build costs match section 7 | Pass (check:spec compares all 30 places x 9 numbers) |
| 3 | Dice 1 to 16, never 0 and 0 | Pass (10,000 rolls, reroll rule tested) |
| 4 | Lap salary once per crossing, also on exact landing | Pass |
| 5 | One house per landing up to three, then one hotel later | Pass |
| 6 | Doubling with 3+ unmortgaged places, never on house or hotel rent | Pass |
| 7 | Auctions and trades: 10 second countdown, resolve correctly | Pass (browser showed the countdown falling) |
| 8 | Bankruptcy returns places to auction; last player wins | Pass |
| 9 | Timed game ends at the set time, highest net worth wins | Pass (ends after the current turn, as section 32 says) |
| 10 | Dropped player skipped, can return within three rounds, then a computer | Pass in tests; not yet seen on a live server |
| 11 | Room code works only until seats fill or the game starts | Pass |
| 12 | Easy, Medium, High behave as section 16 | Pass (behaviour tests and 200 simulated games) |
| 13 | Text chat for all players | Pass against the stand-in server; not yet on a live server |
| 14 | Design follows section 20 and the owner approves it | Owner review (changed several times at the owner's request) |
| 15 | No behaviour that is not in the document | See the list below |

## Not verified from here
- Online play on a real Supabase project (needs the owner's setup, see SETUP.md).
- The real town photos (they load from Wikipedia in the owner's browser; this build environment cannot reach them).
- Voice was removed; sounds were not listened to.

## Item 15: things the document did not say (builder decisions, please confirm or change)
- First bid tap of +100 gives the 100 starting bid; a bid lifts the countdown to at least 3 seconds, never above 10.
- Bankrupt places lose their mortgage but keep houses and hotels; held Get Out of Jail Free cards return to their deck.
- Cards that collect from every other player take only what they have (no debt window for the payers).
- Trade cash is set with +/- tap buttons; trades are refused during an auction, debt or purchase decision.
- Computer numbers (reserves, bid limits, trade acceptance, jail) are in constants.ts; a computer replacing a dropped player plays at Medium.
- Two extra tokens (elephant, palm); six tokens in all.
- A Go to Jail card ends the turn even on a double; if no place is free, the "nearest place" card does nothing (owner answers).
- The 10 second turn timer also runs in on-screen local play (it rolls for a slow player and ends the turn), but the three-timeouts-means-dropped rule applies to online play only.
- The board is the original ring of 42 tiles; each town tile shows a Wikipedia photograph; Vemulawada has no photo yet.
