// Universal Links iOS (.claude/rules/web-routing-rsc.md). Thiếu Team ID / bundle id → 404 (không công bố file sai).
const PATHS = ['/tin/*', '/nhom/*', '/en/tin/*', '/en/nhom/*', '/zh/tin/*', '/zh/nhom/*'];

export function GET() {
  const team = process.env.APP_IOS_TEAM_ID;
  const bundle = process.env.APP_IOS_BUNDLE_ID;
  if (!team || !bundle) return new Response(null, { status: 404 });
  return Response.json(
    { applinks: { details: [{ appIDs: [`${team}.${bundle}`], components: PATHS.map((path) => ({ '/': path })) }] } },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
