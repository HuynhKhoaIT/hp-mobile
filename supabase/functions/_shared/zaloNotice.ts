// Logic thuần cho zalo-notify (tin báo tự động khi khách chốt báo giá): đọc input webhook, chọn mẫu (tuỳ chỉnh của admin hoặc bản
// mặc định) và thay biến. Không import gì để test chạy được bằng Node lẫn Deno. Bản mặc định khớp i18n `admin.zalo.template.*`
// (vi) ở packages/shared; cách thay biến khớp `renderZaloTemplate` ở @hp/shared — đổi một bên thì đổi bên kia.

export const ZALO_NOTICE_KINDS = ['accepted_customer', 'accepted_pro'] as const;
export type ZaloNoticeKind = (typeof ZALO_NOTICE_KINDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tên ứng dụng trong tin (khớp APP_NAME ở @hp/shared). */
export const ZALO_APP_NAME = 'Người Dung Quất';

export const ZALO_NOTICE_DEFAULTS: Record<ZaloNoticeKind, string> = {
  accepted_customer:
    'Chào {{name}}, bạn đã chọn thợ cho yêu cầu "{{title}}" trên {{app}}. Thợ sẽ liên hệ với bạn qua tin nhắn trong ứng dụng. Cần hỗ trợ bạn cứ nhắn lại tin này nhé.',
  accepted_pro:
    'Chào {{name}}, báo giá của bạn cho yêu cầu "{{title}}" đã được chọn trên {{app}}. Bạn mở ứng dụng để nhắn tin với khách và hẹn giờ nhé.',
};

const VARS = ['name', 'app', 'title'] as const;

/** Thay {{name}}, {{app}}, {{title}}; biến lạ giữ nguyên, biến thiếu giá trị → chuỗi rỗng. */
export function renderNotice(template: string, vars: Partial<Record<(typeof VARS)[number], string>>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, key: string) =>
    (VARS as readonly string[]).includes(key) ? (vars[key as (typeof VARS)[number]] ?? '') : whole,
  );
}

/** Body webhook { request_id } → id; sai dạng → null. */
export function parseNotifyRequestId(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const id = (body as Record<string, unknown>).request_id;
  return typeof id === 'string' && UUID.test(id) ? id : null;
}

type Person = { id: string; name: string };
export type NoticeTargets = {
  sender: string;
  title: string;
  customer: Person;
  pro: Person;
  templates: Partial<Record<ZaloNoticeKind, string>>;
};

/** jsonb của zalo_accept_targets → NoticeTargets (thiếu / sai kiểu → null, không đoán). */
export function parseNoticeTargets(v: unknown): NoticeTargets | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const person = (p: unknown): Person | null => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const r = p as Record<string, unknown>;
    return typeof r.id === 'string' && UUID.test(r.id) ? { id: r.id, name: typeof r.name === 'string' ? r.name : '' } : null;
  };
  const customer = person(o.customer);
  const pro = person(o.pro);
  if (!customer || !pro || typeof o.sender !== 'string' || !UUID.test(o.sender) || typeof o.title !== 'string') return null;
  const templates: Partial<Record<ZaloNoticeKind, string>> = {};
  const raw = o.templates && typeof o.templates === 'object' && !Array.isArray(o.templates) ? (o.templates as Record<string, unknown>) : {};
  for (const k of ZALO_NOTICE_KINDS) if (typeof raw[k] === 'string' && (raw[k] as string).trim()) templates[k] = raw[k] as string;
  return { sender: o.sender, title: o.title, customer, pro, templates };
}

/** Hai tin cần gửi (khách trước, thợ sau) đã thay biến; tên trống → "bạn". */
export function buildNotices(t: NoticeTargets): { kind: ZaloNoticeKind; targetId: string; content: string }[] {
  const make = (kind: ZaloNoticeKind, p: Person) => ({
    kind,
    targetId: p.id,
    content: renderNotice(t.templates[kind] ?? ZALO_NOTICE_DEFAULTS[kind], {
      name: p.name || 'bạn',
      app: ZALO_APP_NAME,
      title: t.title,
    }).trim(),
  });
  return [make('accepted_customer', t.customer), make('accepted_pro', t.pro)];
}
