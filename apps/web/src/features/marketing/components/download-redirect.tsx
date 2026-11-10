'use client';
// /tai-app là trang tĩnh nên nhận diện thiết bị ở trình duyệt: iOS → App Store, Android → Google Play, còn lại ở lại xem QR.
// Chưa có link kho → ở lại trang (trang hiện thông báo sắp lên kho).
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export function DownloadRedirect({ ios, android }: { ios: string; android: string }) {
  useEffect(() => {
    const ua = navigator.userAgent;
    const target = /iPhone|iPad|iPod/i.test(ua) ? ios : /Android/i.test(ua) ? android : '';
    if (target) window.location.replace(target);
    else track('qr_view', { page: 'tai_app' });
  }, [ios, android]);
  return null;
}
