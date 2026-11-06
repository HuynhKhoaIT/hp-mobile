// Android App Links. APP_ANDROID_SHA256 nhận nhiều vân tay cách nhau dấu phẩy (khoá upload + khoá Play App Signing).
// Thiếu package / vân tay → 404 (không công bố file sai).
export function GET() {
  const packageName = process.env.APP_ANDROID_PACKAGE;
  const fingerprints = (process.env.APP_ANDROID_SHA256 ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!packageName || fingerprints.length === 0) return new Response(null, { status: 404 });
  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
      },
    ],
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
