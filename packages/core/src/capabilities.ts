// Tính năng chỉ có trên app (apps/mobile/CLAUDE.md mục 4.11). Web đọc danh sách này để hiện thẻ mời tải app.
// Thêm tính năng app-only mới → khai báo ở đây trước khi code ở mobile.
export const appOnly = ['push', 'reminders', 'lostFoundInstantMatch', 'liveLocation', 'offlineDrafts'] as const;

export type AppOnlyFeature = (typeof appOnly)[number];

export function isAppOnly(feature: string): feature is AppOnlyFeature {
  return (appOnly as readonly string[]).includes(feature);
}
