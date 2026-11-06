# Online play setup (free tier, one time, about 15 minutes)

The game works on one screen with no setup. Online play needs a free Supabase project as the referee.

1. Create a free project at supabase.com. Note the **Project URL**, the **anon key**, and the **project ref**.
2. SQL editor: paste and run `supabase/migrations/0001_init.sql`.
3. Install the Supabase CLI, then in this folder: `supabase login`, `supabase link --project-ref YOUR-REF`.
4. Set the tick key and deploy the referee:
   - `supabase secrets set TICK_KEY=choose-any-long-random-text`
   - `supabase functions deploy game --no-verify-jwt`
5. Optional, recommended: run `0002_tick_schedule.sql.example` (after filling in its placeholders) so computers and timers keep moving when all browsers are closed.
6. In Vercel (Project > Settings > Environment Variables) add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.

Free tier note: a project can pause after a week of no use; open the Supabase dashboard to wake it.
Known limit: anyone can read all game records (needed for live updates), including card order. There is no password by design (section 17).
