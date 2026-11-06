// Shapes shared by the server logic, the Supabase function and the browser (section 35).
import type { EndMode, GameState } from '../game/types.ts';

export type Level = 'Easy' | 'Medium' | 'High';
export type SeatKind = 'host' | 'online' | 'computer'; // human on the host's PC, human joining online, or computer

export interface LobbySeat {
  kind: SeatKind;
  level?: Level; // computer seats
  name: string;
  token: string;
  taken: boolean; // online seats start open
}

export interface ChatMsg { seat: number; name: string; text: string; ts: number }

// The public record, one per game. Secrets never live here (the browser can read it).
export interface GameRow {
  id: string;
  code: string; // six letters and numbers
  status: 'lobby' | 'playing' | 'finished';
  seats: LobbySeat[];
  startingCash: number;
  endMode: EndMode;
  state: GameState | null;
  chat: ChatMsg[];
  dueAt: number; // when somebody should next call tick (computer move, auto action or timer end)
  updatedAt: number; // server clock when this was written
  version: number;
}

export interface Secrets {
  host: string;
  seats: Record<number, string>; // online seat secrets
  lastSeen: Record<string, number>; // 'host' or seat number -> server time of last ping
}

export interface Stored { row: GameRow; secrets: Secrets }

export interface Store {
  byId(id: string): Promise<Stored | null>;
  byCode(code: string): Promise<Stored | null>;
  create(s: Stored): Promise<void>;
  save(s: Stored): Promise<void>; // must throw ConflictError when the version moved
}
export class ConflictError extends Error {}

export type Request =
  | { op: 'create'; seats: { kind: SeatKind; level?: Level; name: string; token: string }[]; startingCash: number; endMode: EndMode }
  | { op: 'join'; code: string; name: string; token?: string }
  | { op: 'get'; gameId: string }
  | { op: 'ping'; gameId: string; secret: string }
  | { op: 'token'; gameId: string; secret: string; seat: number; token: string }
  | { op: 'remove'; gameId: string; secret: string; seat: number }
  | { op: 'start'; gameId: string; secret: string }
  | { op: 'act'; gameId: string; secret: string; seat: number; action: import('../game/actions.ts').Action }
  | { op: 'chat'; gameId: string; secret: string; seat: number; text: string }
  | { op: 'tick'; gameId: string };

export type Response =
  | { ok: true; row: GameRow; serverNow: number; seat?: number; secret?: string }
  | { ok: false; error: string };
