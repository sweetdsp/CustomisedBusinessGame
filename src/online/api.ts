// Browser side of online play: send requests to the referee, listen for live updates.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameRow, Request, Response } from '../server/types.ts';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const onlineConfigured = !!(URL_ && KEY);

let client: SupabaseClient | null = null;
const supa = () => (client ??= createClient(URL_!, KEY!, { auth: { persistSession: false } }));

export async function call(req: Request): Promise<Response> {
  if (!onlineConfigured) return { ok: false, error: 'Online play is not set up yet (see SETUP.md)' };
  try {
    const res = await fetch(`${URL_}/functions/v1/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY!, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(req),
    });
    return (await res.json()) as Response;
  } catch {
    return { ok: false, error: 'Cannot reach the game server. Check your internet.' };
  }
}

// Live updates for one game (the referee writes, everyone sees it at once).
export function subscribe(gameId: string, onRow: (row: GameRow) => void): () => void {
  if (!onlineConfigured) return () => {};
  const ch = supa().channel(`game-${gameId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (p) => {
      const r = (p.new as { row?: GameRow }).row;
      if (r) onRow(r);
    })
    .subscribe();
  return () => { void supa().removeChannel(ch); };
}

// What this browser remembers so a closed tab can rejoin.
export interface Session { gameId: string; secret: string; role: 'host' | 'player'; seat?: number }
const KEY_ = 'fsbg-session';
export const loadSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY_) ?? 'null'); } catch { return null; } };
export const saveSession = (s: Session | null) => { try { if (s) localStorage.setItem(KEY_, JSON.stringify(s)); else localStorage.removeItem(KEY_); } catch { /* private mode */ } };
