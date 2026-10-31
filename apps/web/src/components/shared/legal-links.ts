// Link pháp lý + năm bản quyền dùng chung: footer (≥ 640px) và trang "Tôi" (điện thoại, kiểu tab Tôi của app).
import { cacheLife } from 'next/cache';

export const LEGAL_LINKS = [
  { href: '/gioi-thieu', key: 'about' },
  { href: '/dieu-khoan', key: 'terms' },
  { href: '/chinh-sach-bao-mat', key: 'privacy' },
  { href: '/xoa-tai-khoan', key: 'delete_account' },
  { href: '/lien-he', key: 'contact' },
] as const;

export async function copyrightYear() {
  'use cache';
  // Năm thay đổi mỗi năm một lần: cache theo ngày, không làm trang thành dynamic.
  cacheLife('days');
  return new Date().getFullYear();
}
