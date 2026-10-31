// Khu làm việc đã chọn trên máy này (docs/design/home.md §4.1): khách chỉ lưu máy; người đã đăng nhập lưu profiles.site
// và máy giữ một bản để lần mở sau hiện đúng khu ngay (trước khi đọc xong hồ sơ). localStorage bọc try / catch: chế độ
// riêng tư / bị chặn → coi như chưa chọn.
const KEY = 'hp:home-site';

export function readStoredSite(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function storeSite(code: string): void {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    // Không lưu được: lần sau dùng khu mặc định.
  }
}
