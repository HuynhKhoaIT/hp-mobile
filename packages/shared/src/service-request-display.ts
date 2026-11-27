// Quy tắc Gọi thợ dùng chung app, web (mini-app `goiTho`): luật, trạng thái hiển thị, vai trò người xem → hành động.
// Trả mô tả dữ liệu, không trả chữ: client tự dịch. Không import file nào (kể cả type) để chạy được trong node --test
// và Deno — tham số nhận string thay vì ServiceRequestStatus / ServiceQuoteStatus của enums.ts (cùng cách group-display.ts).

/** Luật yêu cầu / báo giá — khớp bảng service_requests + service_quotes, trigger trg_service_requests_guard và RPC
 * submit_quote_tx (migration 20261128090000_service_requests). */
export const SERVICE_REQUEST_RULES = {
  titleMin: 5,
  titleMax: 120,
  descriptionMax: 2000,
  addressMax: 200,
  noteMax: 500,
  maxImages: 4,
  /** Giá báo / ngân sách: 1.000 – 1.000.000.000 ₫ (CHECK service_quotes.price, service_requests.budget_*). */
  priceMin: 1_000,
  priceMax: 1_000_000_000,
  /** Yêu cầu mở hết hạn sau số ngày này (cột expires_at, cron expire_service_requests). */
  expireDays: 7,
  ratingCommentMax: 500,
  /** Ảnh yêu cầu: bucket request-images, cạnh dài 1280px WebP ≤ 2 MB như ảnh tin đăng. */
  imageLongEdgePx: 1280,
  imageMaxBytes: 2 * 1024 * 1024,
} as const;

/** Trạng thái hiển thị: DB status + đã quá hạn nhưng cron chưa kịp chuyển. */
export type ServiceRequestDisplayStatus = 'open' | 'assigned' | 'completed' | 'cancelled' | 'expired';

type StatusSource = { status: string; expires_at: string };

export function serviceRequestDisplayStatus(r: StatusSource, now: Date = new Date()): ServiceRequestDisplayStatus {
  if (r.status === 'assigned' || r.status === 'completed' || r.status === 'cancelled' || r.status === 'expired') return r.status;
  return Date.parse(r.expires_at) <= now.getTime() ? 'expired' : 'open';
}

/**
 * Vai trò người xem với một yêu cầu. `myQuoteStatus` = trạng thái báo giá của người xem (null = chưa báo giá).
 * accepted = thợ được chọn; declined = bị từ chối (chủ chọn người khác / huỷ / hết hạn); withdrawn = đã rút.
 */
export type ServiceRequestViewerRole = 'guest' | 'customer' | 'none' | 'quoted' | 'accepted' | 'declined' | 'withdrawn';

export function serviceRequestViewerRole(
  r: { customer_id: string },
  userId: string | null | undefined,
  myQuoteStatus: string | null | undefined,
): ServiceRequestViewerRole {
  if (!userId) return 'guest';
  if (r.customer_id === userId) return 'customer';
  if (myQuoteStatus === 'accepted') return 'accepted';
  if (myQuoteStatus === 'submitted') return 'quoted';
  if (myQuoteStatus === 'declined') return 'declined';
  if (myQuoteStatus === 'withdrawn') return 'withdrawn';
  return 'none';
}

/** Hành động có thể hiện ở chi tiết yêu cầu (ẩn nút ở client; server + RLS vẫn kiểm). */
export type ServiceRequestAction =
  | 'login'
  | 'quote'
  | 'edit_quote'
  | 'withdraw_quote'
  | 'accept_quote'
  | 'chat'
  | 'edit'
  | 'cancel'
  | 'complete'
  | 'rate'
  | 'report';

/**
 * Hành động theo (vai trò, trạng thái hiển thị). `quotesCount` = số báo giá chưa rút: chủ chỉ sửa được yêu cầu khi
 * chưa có báo giá (trigger báo request_has_quotes). `rated` = người xem đã chấm rồi → bỏ nút 'rate'.
 */
export function serviceRequestActions(
  role: ServiceRequestViewerRole,
  status: ServiceRequestDisplayStatus,
  opts: { quotesCount?: number; rated?: boolean } = {},
): ServiceRequestAction[] {
  const open = status === 'open';
  const out: ServiceRequestAction[] = [];
  switch (role) {
    case 'guest':
      if (open) out.push('login');
      out.push('report');
      break;
    case 'customer':
      if (open && (opts.quotesCount ?? 0) === 0) out.push('edit');
      if (open && (opts.quotesCount ?? 0) > 0) out.push('accept_quote');
      if (open || status === 'assigned') out.push('cancel');
      if (status === 'assigned') out.push('complete', 'chat');
      if (status === 'completed' && !opts.rated) out.push('rate');
      break;
    case 'none':
    case 'withdrawn':
      if (open) out.push('quote');
      out.push('report');
      break;
    case 'quoted':
      if (open) out.push('edit_quote', 'withdraw_quote', 'chat');
      out.push('report');
      break;
    case 'accepted':
      if (status === 'assigned' || status === 'completed') out.push('chat');
      if (status === 'completed' && !opts.rated) out.push('rate');
      out.push('report');
      break;
    case 'declined':
      out.push('report');
      break;
  }
  return out;
}

/** Trạng thái báo giá hiển thị cho thợ ("Đang chờ", "Được chọn"…). Khớp enum service_quote_status. */
export type ServiceQuoteDisplayStatus = 'submitted' | 'accepted' | 'declined' | 'withdrawn';

export function serviceQuoteDisplayStatus(status: string): ServiceQuoteDisplayStatus {
  return status === 'accepted' || status === 'declined' || status === 'withdrawn' ? status : 'submitted';
}

/** Ngân sách mong muốn → dạng hiển thị. Thiếu cả hai → 'none'; chỉ một đầu → 'from' / 'upto'; bằng nhau → 'exact'. */
export type ServiceBudget =
  | { kind: 'none' }
  | { kind: 'exact'; amount: number }
  | { kind: 'from'; min: number }
  | { kind: 'upto'; max: number }
  | { kind: 'range'; min: number; max: number };

export function serviceBudget(min: number | null | undefined, max: number | null | undefined): ServiceBudget {
  const lo = typeof min === 'number' && min > 0 ? min : null;
  const hi = typeof max === 'number' && max > 0 ? max : null;
  if (lo !== null && hi !== null) return lo === hi ? { kind: 'exact', amount: lo } : { kind: 'range', min: lo, max: hi };
  if (lo !== null) return { kind: 'from', min: lo };
  if (hi !== null) return { kind: 'upto', max: hi };
  return { kind: 'none' };
}

/** Báo giá rẻ nhất trong các báo giá còn hiệu lực (để gắn nhãn "Giá tốt nhất"); không có → null. */
export function lowestQuoteId(quotes: readonly { id: string; price: number; status: string }[]): string | null {
  let best: { id: string; price: number } | null = null;
  for (const q of quotes) {
    if (q.status !== 'submitted' && q.status !== 'accepted') continue;
    if (best === null || q.price < best.price) best = { id: q.id, price: q.price };
  }
  return best?.id ?? null;
}

/** Đường dẫn ảnh yêu cầu trong bucket request-images: `{customerId}/{requestId}/{n}.webp` (trigger guard kiểm thư mục chủ). */
export function requestImagePath(customerId: string, requestId: string, index: number): string {
  return `${customerId}/${requestId}/${index}.webp`;
}
