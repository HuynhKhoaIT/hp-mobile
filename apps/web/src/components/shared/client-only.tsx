'use client';

// Chỉ render `children` ở trình duyệt; server (SSR / prerender) render `fallback` (skeleton đúng hình). Dùng cho khối mà dữ
// liệu chỉ có ở trình duyệt (chat, thông báo qua @hp/core/react, phiên cookie): khung tĩnh prerender không chạy hook dữ liệu
// và không lệch hydrate (giờ tương đối, trạng thái phiên). Lần render đầu ở trình duyệt khớp server (fallback) rồi đổi ngay.
import { type ReactNode, useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return isClient ? children : fallback;
}
