// Universal Links iOS (.claude/rules/web-routing-rsc.md). Thiếu Team ID / bundle id → 404 (không công bố file sai).
// Đường dẫn app mở: /tin/*, /nhom/* + cả cây mini-app (MINI_APP_BASES — vd /pass-do, /pass-do/*: trang chủ, bộ lọc, đã lưu,
// chat, quản lý, đăng tin của Chợ Pass Đồ), mỗi đường dẫn kèm bản /en, /zh. Android không khai báo đường dẫn ở đây
// (assetlinks.json chỉ xác nhận tên miền) — đường dẫn nằm ở intent filter của app.
import { MINI_APP_BASES } from '@/features/listing/mini-app-routes';

const BASE_PATHS = ['/tin/*', '/nhom/*', ...MINI_APP_BASES.flatMap((base) => [base, `${base}/*`])];
const PATHS = ['', '/en', '/zh'].flatMap((prefix) => BASE_PATHS.map((path) => `${prefix}${path}`));

export function GET() {
  const team = process.env.APP_IOS_TEAM_ID;
  const bundle = process.env.APP_IOS_BUNDLE_ID;
  if (!team || !bundle) return new Response(null, { status: 404 });
  return Response.json(
    { applinks: { details: [{ appIDs: [`${team}.${bundle}`], components: PATHS.map((path) => ({ '/': path })) }] } },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
