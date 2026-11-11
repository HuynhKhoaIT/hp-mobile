// Điều hướng hồ sơ: hồ sơ công khai (avatar ở tin, chat, "Xem hồ sơ" ở tab Tôi), huy hiệu, thông báo + cài đặt thông báo, xoá tài khoản (tab Tôi).
// Feature khác được import profile (.claude/rules/mobile-features.md).
import { router } from 'expo-router';

export function openProfile(id: string) {
  router.push({ pathname: '/profile/[id]', params: { id } });
}

/** Huy hiệu xác minh của mình (tab Tôi, thông báo kết quả duyệt). */
export function openBadges() {
  router.push('/badges');
}

/** Danh sách thông báo (hàng "Thông báo" ở tab Tôi, chuông ở hero). */
export function openNotifications() {
  router.push('/notifications');
}

/** Cài đặt thông báo đẩy. */
export function openNotificationSettings() {
  router.push('/settings/notifications');
}

/** Xoá tài khoản (dòng "Xoá tài khoản" ở tab Tôi). */
export function openDeleteAccount() {
  router.push('/settings/delete-account');
}
