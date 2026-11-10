// Khuôn chung mọi Edge Function (.claude/rules/be-edge-functions.md): CORS, xác thực theo loại kích hoạt, client
// service role khi cần, log có request_id, lỗi thống nhất { code: 'errors.<code>', message }.
//
//   export const myFn = handler({ auth: 'webhook' }, async ({ req, admin, log }) => { ...; return { ok: true }; });
//   Deno.serve(myFn);            // index.ts — tách để test import handler mà không mở cổng
//
// auth: 'user' (JWT bắt buộc → user + db theo RLS), 'webhook' (header x-webhook-secret = WEBHOOK_SECRET),
// 'cron' (header x-cron-secret = CRON_SECRET). Sentry: nối khi có SENTRY_DSN (tuần 12).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.118.0';

export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

export type Logger = (event: string, fields?: Record<string, unknown>) => void;

export type HandlerContext = {
  req: Request;
  requestId: string;
  log: Logger;
  /** Service role — bỏ qua RLS. Chỉ dùng khi thật cần (ghi kèm lý do ở chỗ gọi). */
  admin: SupabaseClient;
  /** auth 'user': người gọi + client theo JWT (tôn trọng RLS). */
  user: User | null;
  db: SupabaseClient | null;
};

type AuthMode = 'user' | 'webhook' | 'cron';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const env = (name: string) => Deno.env.get(name) ?? '';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** So sánh secret không lộ thời gian. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function handler(
  opts: { auth: AuthMode },
  fn: (ctx: HandlerContext) => Promise<unknown>,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    const requestId = crypto.randomUUID();
    // Log JSON một dòng; KHÔNG ghi SĐT, OTP, token, nội dung tin nhắn.
    const log: Logger = (event, fields = {}) => console.log(JSON.stringify({ request_id: requestId, event, ...fields }));
    try {
      if (req.method !== 'POST') throw new AppError('invalid_input', 405);
      const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      let user: User | null = null;
      let db: SupabaseClient | null = null;

      if (opts.auth === 'webhook' && !safeEqual(req.headers.get('x-webhook-secret') ?? '', env('WEBHOOK_SECRET'))) {
        throw new AppError('forbidden', 401);
      }
      if (opts.auth === 'cron' && !safeEqual(req.headers.get('x-cron-secret') ?? '', env('CRON_SECRET'))) {
        throw new AppError('forbidden', 401);
      }
      if (opts.auth === 'user') {
        const authorization = req.headers.get('Authorization') ?? '';
        db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await db.auth.getUser();
        if (error || !data.user) throw new AppError('auth_required', 401);
        user = data.user;
      }

      const result = await fn({ req, requestId, log, admin, user, db });
      return json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof AppError) {
        log('app_error', { code: e.code, status: e.status });
        return json({ code: `errors.${e.code}`, message: e.code }, e.status);
      }
      if (e instanceof SyntaxError || (e as { name?: string })?.name === 'ZodError') {
        return json({ code: 'errors.invalid_input', message: 'invalid_input' }, 400);
      }
      log('unhandled_error', { message: (e as Error)?.message?.slice(0, 200) });
      return json({ code: 'errors.unknown', message: 'unknown' }, 500);
    }
  };
}
