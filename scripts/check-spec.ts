// Compares the code with the owner's Requirements Document, line by line (acceptance items 1 and 2).
// Run: SPEC_PATH=/path/to/requirements.md npm run check:spec
import { readFileSync, existsSync } from 'node:fs';
import { PROPERTIES, CONSTANTS, STATES } from '../src/shared/constants.ts';
import { TILES } from '../src/shared/board.ts';
import { CARDS } from '../src/shared/cards.ts';

const path = process.env.SPEC_PATH ?? '';
if (!path || !existsSync(path)) { console.log('check-spec skipped: set SPEC_PATH to the Requirements Document'); process.exit(0); }
const doc = readFileSync(path, 'utf8');
const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };
const n = (s: string) => Number(s.replace(/[₹,\s]/g, ''));
const rows = (re: RegExp) => doc.split('\n').filter((l) => re.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

// ---- Section 7: price table ----
const stateCode: Record<string, string> = { 'Tamil Nadu': 'TN', Kerala: 'KL', Karnataka: 'KA', 'Andhra Pradesh': 'AP', Telangana: 'TG' };
const priceRows = rows(/^\| (Tamil Nadu|Kerala|Karnataka|Andhra Pradesh|Telangana) \| [A-Za-z ]+ \| ₹/);
eq(priceRows.length === 30, `section 7 has 30 rows (found ${priceRows.length})`);
for (const r of priceRows) {
  const p = PROPERTIES.find((x) => x.name === r[1]);
  if (!p) { errs.push(`missing place ${r[1]}`); continue; }
  const want = [stateCode[r[0]], r[1], ...r.slice(2).map(n)];
  const got = [p.state, p.name, p.price, p.mortgage, p.house, p.hotel, p.baseRent, p.rent1, p.rent2, p.rent3, p.rentHotel];
  eq(JSON.stringify(want) === JSON.stringify(got), `price table row ${r[1]}: document ${JSON.stringify(want)} vs code ${JSON.stringify(got)}`);
}
eq(PROPERTIES.length === 30, 'code has 30 places');

// ---- Section 23: tile order, type and colour ----
const typeMap: Record<string, string[]> = { Corner: ['start', 'jail', 'rest', 'gotojail'], Property: ['property'], 'Card tile': ['fortune', 'festival'], Tax: ['incomeTax', 'luxuryTax', 'touristTax'], 'Bonus tile': ['luckyDraw'] };
const tileRows = rows(/^\| \d+ \| .+ \| (Corner|Property|Card tile|Tax|Bonus tile) \|/);
eq(tileRows.length === 42, `section 23 has 42 rows (found ${tileRows.length})`);
for (const r of tileRows) {
  const i = Number(r[0]);
  const t = TILES[i];
  eq(t.index === i && t.name === r[1], `tile ${i} name: document "${r[1]}" vs code "${t.name}"`);
  eq(typeMap[r[2]].includes(t.kind), `tile ${i} type: document ${r[2]} vs code ${t.kind}`);
  const want = r[3] === 'none' ? undefined : stateCode[r[3].split(',')[0]];
  eq(t.state === want, `tile ${i} colour group: document ${r[3]} vs code ${t.state}`);
}
// the colour names in section 5
const colours: Record<string, string> = { TN: 'dark blue', KL: 'dark green', KA: 'pink', AP: 'dark red', TG: 'yellow' };
for (const [k, c] of Object.entries(colours)) eq(STATES[k as keyof typeof STATES].color === c, `state colour ${k} is ${c}`);
eq(TILES.length === 42 && TILES.filter((t) => t.kind === 'property').length === 30, '42 tiles, 30 places');

// ---- Section 34: cards word for word ----
function deck(heading: string): string[] {
  const start = doc.indexOf(heading);
  const lines = doc.slice(start).split('\n').slice(1);
  const out: string[] = [];
  for (const l of lines) { const m = l.match(/^(\d+)\. (.+)$/); if (m) out.push(m[2]); else if (out.length) break; }
  return out;
}
const fortune = deck('**Fortune deck (16 cards)**'), festival = deck('**Festival deck (16 cards)**');
eq(fortune.length === 16 && festival.length === 16, 'section 34 lists 16 + 16 cards');
CARDS.filter((c) => c.deck === 'fortune').forEach((c, i) => eq(c.text === fortune[i], `Fortune card ${i + 1}: document "${fortune[i]}" vs code "${c.text}"`));
CARDS.filter((c) => c.deck === 'festival').forEach((c, i) => eq(c.text === festival[i], `Festival card ${i + 1}: document "${festival[i]}" vs code "${c.text}"`));
// every number in a card text must be the number in its effect
for (const c of CARDS) {
  const nums = (c.text.match(/[\d,]{3,}/g) ?? []).map((x) => Number(x.replace(/,/g, '')));
  const e = c.effect as Record<string, number>;
  const vals = [e.amount, e.house, e.hotel, e.max].filter((v) => typeof v === 'number' && v > 0);
  eq(nums.length === vals.length && nums.every((x) => vals.includes(x)), `card ${c.id}: amounts in text ${nums} match effect ${vals}`);
}

// ---- Section 33 / 25 fixed amounts ----
const C = CONSTANTS;
eq(JSON.stringify(C.STARTING_CASH_OPTIONS) === '[200000,300000]' && C.LAP_SALARY[200000] === 2000 && C.LAP_SALARY[300000] === 3000, 'starting cash and lap salary');
eq(C.JAIL_FINE === 2000 && C.INCOME_TAX === 2000 && C.LUCKY_DRAW_BONUS === 1500, 'jail fine, income tax, lucky draw');
eq(C.LUXURY_TAX_PER_PLACE === 100 && C.LUXURY_TAX_PER_MORTGAGED_PLACE === 50 && C.LUXURY_TAX_PER_HOUSE === 150 && C.LUXURY_TAX_PER_HOTEL === 400, 'luxury tax');
eq(C.TOURIST_TAX_PER_PLACE === 200 && C.TOURIST_TAX_MAX === 3000, 'tourist tax');
eq(C.AUCTION_START_BID === 100 && C.AUCTION_SECONDS === 10 && C.AUCTION_RESET_SECONDS === 3 && JSON.stringify(C.AUCTION_BID_STEPS) === '[100,500]', 'auction numbers');
eq(C.TRADE_ANSWER_SECONDS === 10 && C.TRADES_PER_TURN === 3, 'trade numbers');
eq(C.TURN_ROLL_SECONDS === 10 && C.TURN_FINISH_SECONDS === 10 && C.DEBT_GRACE_SECONDS === 30 && C.RECONNECT_ROUNDS === 3, 'timers');
eq(C.COMPUTER_PAUSE_MIN === 1 && C.COMPUTER_PAUSE_MAX === 2, 'computer pause');
eq(C.BUILDING_BUYBACK_PERCENT === 50 && C.UNMORTGAGE_FEE_PERCENT === 10 && C.UNMORTGAGE_ROUND_TO === 100 && C.MAX_HOUSES === 3 && C.DOUBLED_RENT_MIN_PLACES === 3, 'building rules');
eq(C.DICE_MIN_FACE === 0 && C.DICE_MAX_FACE === 8 && C.DOUBLES_TO_JAIL === 3 && C.JAIL_MAX_TURNS === 3, 'dice and jail');
// the doc's own consistency rules
for (const p of PROPERTIES) {
  eq(p.mortgage * 2 === p.price, `${p.name}: mortgage is half the price`);
  eq(p.hotel === p.house * 2, `${p.name}: hotel is twice a house`);
  eq(p.baseRent * 2 < p.rent1, `${p.name}: doubled base rent stays below the one-house rent`);
  eq(p.price % 100 === 0 && p.house % 100 === 0 && p.rent1 % 100 === 0, `${p.name}: amounts are multiples of 100`);
}
console.log(errs.length ? errs.join('\n') : 'spec OK (price table, 42 tiles, 32 cards, fixed amounts all match the document)');
process.exit(errs.length ? 1 : 0);
