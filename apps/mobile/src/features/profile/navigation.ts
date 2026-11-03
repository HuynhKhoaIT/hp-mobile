// Điều hướng tới hồ sơ công khai (avatar ở tin, chat). Feature khác được import profile (.claude/rules/mobile-features.md).
import { router } from 'expo-router';

export function openProfile(id: string) {
  router.push({ pathname: '/profile/[id]', params: { id } });
}

/** Huy hiệu xác minh của mình (tab Tôi, thông báo kết quả duyệt). */
export function openBadges() {
  router.push('/badges');
}
