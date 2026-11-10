'use client';

// Nhóm "sống" ở trình duyệt cho trang chi tiết: lấy bản server render (cache 300s) làm dữ liệu đầu cho keys.group(id) rồi
// đọc qua useGroup (@hp/core/react) — tham gia / rời / duyệt / huỷ đổi cache này optimistic (chỗ trống, hàng avatar,
// trạng thái) và useGroupRealtime làm mới khi có thay đổi. Chỉ gọi trong <ClientOnly> (TanStack đọc giờ hệ thống khi ghi
// cache — không chạy lúc prerender).
import { keys, type PublicGroup } from '@hp/core';
import { useGroup } from '@hp/core/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function useLiveGroup(initial: PublicGroup): PublicGroup {
  const qc = useQueryClient();
  // Gieo cache một lần (trước useGroup) để không gọi lại server ngay khi mở trang; dữ liệu đã có (vd từ lần xem trước) thắng.
  useState(() => {
    if (qc.getQueryData(keys.group(initial.id)) === undefined) qc.setQueryData(keys.group(initial.id), initial);
    return null;
  });
  return useGroup(initial.id).data ?? initial;
}
