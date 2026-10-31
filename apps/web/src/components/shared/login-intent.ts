// Hành động khách định làm trước khi đăng nhập (Lưu tin, Hiện số…) — .claude/rules/web-routing-rsc.md "Khách và đăng nhập".
// LoginDialog ghi intent vào sessionStorage khi mở; sau đăng nhập trang tải lại, component tương ứng gọi takeLoginIntent()
// lúc mount: khớp action + target thì chạy lại đúng hành động rồi xoá. sessionStorage giữ được qua chuyển trang trong cùng tab
// (kể cả vòng Google OAuth → /auth/callback → next). Bọc try / catch: chế độ riêng tư / bị chặn → bỏ qua, không lỗi.
export type LoginIntent = { action: 'save' | 'reveal'; target: string };

const KEY = 'hp:login-intent';
/** Intent cũ hơn mức này coi như bỏ (người dùng đóng dialog rồi quay lại sau). */
const MAX_AGE_MS = 15 * 60 * 1000;

export function rememberLoginIntent(intent: LoginIntent): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    // Không lưu được: sau đăng nhập người dùng bấm lại.
  }
}

/** Lấy (và xoá) intent nếu khớp action + target. */
export function takeLoginIntent(action: LoginIntent['action'], target: string): boolean {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as Partial<LoginIntent & { at: number }>;
    if (v.action !== action || v.target !== target) return false;
    window.sessionStorage.removeItem(KEY);
    return typeof v.at === 'number' && Date.now() - v.at < MAX_AGE_MS;
  } catch {
    return false;
  }
}
