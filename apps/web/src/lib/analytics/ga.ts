// Google Analytics 4 qua gtag.js (thẻ script, không thêm gói npm). Chỉ index.ts gọi file này, sau khi người dùng đồng ý cookie.
// Lượt xem trang khi chuyển route phía client do GA4 Enhanced Measurement ("Page changes based on browser history events",
// bật mặc định ở Data stream) tự ghi — không gửi page_view thủ công để tránh đếm đôi.
import type { AnalyticsProps } from './index';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

const disableFlag = (id: string) => `ga-disable-${id}`;

function setDisabled(id: string, disabled: boolean) {
  (window as unknown as Record<string, boolean>)[disableFlag(id)] = disabled;
}

export function startGa(id: string) {
  setDisabled(id, false);
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js chỉ xử lý đúng đối tượng `arguments` (không phải mảng) nên không đổi sang rest params.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.onerror = () => {
    loaded = false;
  };
  document.head.appendChild(script);
}

/** Từ chối sau khi đã đồng ý: chặn gửi tiếp và xoá cookie _ga* trên máy. */
export function stopGa(id: string) {
  setDisabled(id, true);
  try {
    const names = document.cookie
      .split(';')
      .map((c) => c.split('=')[0]?.trim() ?? '')
      .filter((n) => n === '_ga' || n.startsWith('_ga_'));
    // GA đặt cookie ở domain cấp cao nhất có thể (vd .tenapp.vn) → xoá ở mọi cấp của hostname hiện tại.
    const parts = window.location.hostname.split('.');
    const domains = [''].concat(parts.map((_, i) => `; domain=.${parts.slice(i).join('.')}`));
    for (const name of names) {
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
  } catch {
    // Không xoá được cookie: cờ ga-disable vẫn chặn gửi.
  }
}

export function trackGa(event: string, props: AnalyticsProps) {
  window.gtag?.('event', event, props);
}
