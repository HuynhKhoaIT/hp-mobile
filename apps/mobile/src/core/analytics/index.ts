// Analytics: track(event, props). Chưa có PostHog key → không gửi đi đâu; khi tích hợp PostHog (tuần 6) chỉ cần
// setAnalyticsSink(...) một lần ở providers, nơi gọi track() không đổi. Props không chứa SĐT / họ tên đầy đủ.
import type { AnalyticsEvent } from './events';

export type { AnalyticsEvent } from './events';
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;
type Sink = (event: AnalyticsEvent, props: AnalyticsProps) => void;

let sink: Sink | null = null;

export function setAnalyticsSink(next: Sink | null) {
  sink = next;
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  try {
    sink?.(event, props);
  } catch {
    // Analytics không bao giờ làm hỏng thao tác của người dùng.
  }
}
