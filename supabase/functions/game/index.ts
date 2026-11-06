// Supabase Edge Function: the referee. It imports the same pure rules the browser tests use (src/game, src/server).
// Deploy with: supabase functions deploy game   (see SETUP.md)
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handle } from '../../../src/server/handler.ts';
import { ConflictError, type Request, type Store, type Stored } from '../../../src/server/types.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tick-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function read(filter: { id?: string; code?: string }): Promise<Stored | null> {
  let q = db.from('games').select('id, row, game_secrets(secrets)');
  q = filter.id ? q.eq('id', filter.id) : q.eq('code', filter.code!);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const secrets = (data as any).game_secrets?.secrets ?? (data as any).game_secrets?.[0]?.secrets;
  return { row: (data as any).row, secrets };
}

const store: Store = {
  byId: (id) => read({ id }),
  byCode: (code) => read({ code }),
  async create(s) {
    const { error } = await db.from('games').insert({ id: s.row.id, code: s.row.code, status: s.row.status, row: s.row, version: 0 });
    if (error) throw new Error(error.message);
    const e2 = await db.from('game_secrets').insert({ id: s.row.id, secrets: s.secrets });
    if (e2.error) throw new Error(e2.error.message);
  },
  async save(s) {
    const old = s.row.version;
    const next = { ...s.row, version: old + 1 };
    // optimistic concurrency: only succeeds if nobody wrote since we read
    const { data, error } = await db.from('games')
      .update({ row: next, status: next.status, version: old + 1, updated_at: new Date().toISOString() })
      .eq('id', s.row.id).eq('version', old).select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new ConflictError();
    await db.from('game_secrets').update({ secrets: s.secrets }).eq('id', s.row.id);
    s.row.version = old + 1;
  },
};

const deps = () => ({ now: Date.now(), rng: Math.random, uuid: () => crypto.randomUUID() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json();
    if (body.op === 'tickAll') {
      // Called by the scheduled job so computers and timers keep running with every browser closed.
      if (req.headers.get('x-tick-key') !== Deno.env.get('TICK_KEY')) return new Response('forbidden', { status: 403, headers: CORS });
      const { data } = await db.from('games').select('id').eq('status', 'playing');
      for (const g of data ?? []) await handle(store, { op: 'tick', gameId: g.id } as Request, deps());
      return new Response(JSON.stringify({ ok: true, games: data?.length ?? 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    const res = await handle(store, body as Request, deps());
    return new Response(JSON.stringify(res), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
