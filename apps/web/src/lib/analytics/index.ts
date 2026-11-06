// Analytics web. PostHog chỉ tải (dynamic import) sau khi người dùng đồng ý cookie; chưa đồng ý / chưa có key → track() bỏ qua,
// không đặt cookie. Không autocapture, không session replay, props không chứa SĐT / họ tên / liên hệ.
import type { PostHog } from 'posthog-js';
import { publicEnv } from '@/lib/env';
import type { AnalyticsEvent } from './events';

export type { AnalyticsEvent } from './events';
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;
export type ConsentState = 'granted' | 'denied' | null;

const CONSENT_KEY = 'hp:cookie-consent';
const UTM_KEY = 'hp:utm';
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

let client: PostHog | null = null;
let loading: Promise<void> | null = null;

export const analyticsEnabled = () => !!publicEnv.posthogKey;

export function readConsent(): ConsentState {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function start() {
  if (client || loading || !publicEnv.posthogKey) return;
  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(publicEnv.posthogKey, {
        api_host: publicEnv.posthogHost,
        autocapture: false,
        capture_pageview: true,
        disable_session_recording: true,
        persistence: 'localStorage+cookie',
      });
      client = posthog;
    })
    .catch(() => {
      loading = null;
    });
}

/** Lưu lựa chọn. Từ chối sau khi đã đồng ý → ngừng gửi và xoá dữ liệu PostHog trên máy. */
export function writeConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Trình duyệt chặn lưu trữ: lựa chọn chỉ có hiệu lực trong lần mở này.
  }
  if (value === 'granted') {
    client?.opt_in_capturing();
    start();
  } else if (client) {
    client.opt_out_capturing();
    client.reset();
  }
}

/** Gọi một lần khi trang mở: đã đồng ý từ trước → bật lại. */
export function resumeAnalytics() {
  if (readConsent() === 'granted') start();
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  try {
    if (readConsent() !== 'granted') return;
    client?.capture(event, props);
  } catch {
    // Analytics không bao giờ làm hỏng thao tác của người dùng.
  }
}

/** Giữ utm_* của lượt vào trong phiên (sessionStorage, không gửi đi đâu) để gắn vào lead nếu khách gửi form ở trang khác. */
export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(UTM_PARAMS.flatMap((k) => (params.get(k) ? [[k, params.get(k) as string]] : [])));
    if (Object.keys(utm).length > 0) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    // Không có sessionStorage: lead không kèm utm.
  }
}

export function readUtm(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(UTM_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
