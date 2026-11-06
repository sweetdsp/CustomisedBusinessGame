import { PROPERTIES, CONSTANTS } from '../src/shared/constants.ts';

const errs: string[] = [];
const eq = (c: boolean, m: string) => { if (!c) errs.push(m); };

eq(PROPERTIES.length === 30, 'need 30 properties');
for (const s of ['TN', 'KL', 'KA', 'AP', 'TG']) {
  const ps = PROPERTIES.filter((p) => p.state === s);
  eq(ps.length === 6, `${s} needs 6`);
  eq(ps[5].price === 8000, `${s} top place must be 8000`);
}
for (const p of PROPERTIES) {
  eq(p.mortgage === p.price / 2, `${p.name} mortgage`);
  eq(p.hotel === p.house * 2, `${p.name} hotel = 2x house`);
  eq(p.baseRent * 2 < p.rent1, `${p.name} doubled base rent below one-house rent`);
}
eq(CONSTANTS.TILE_COUNT === 42, 'tile count');
console.log(errs.length ? errs.join('\n') : 'constants OK');
process.exit(errs.length ? 1 : 0);
