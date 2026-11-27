// Icon của 5 loại thợ (mini-app Gọi thợ — mẫu thứ ba, không phải Listing / Group). Nhãn: `tho.trade.<code>`, gợi ý:
// `tho.trade_hint.<code>`. Khớp app (apps/mobile/src/features/tho/trades.ts): điện nước Zap · vệ sinh Sparkles · thợ hàn Flame ·
// điện lạnh Snowflake · khác Wrench.
import { SERVICE_TRADES, type ServiceTrade } from '@hp/shared';
import { Flame, type LucideIcon, Snowflake, Sparkles, Wrench, Zap } from 'lucide-react';

export const TRADES = SERVICE_TRADES;

export const TRADE_ICON: Record<ServiceTrade, LucideIcon> = {
  electric_plumbing: Zap,
  cleaning: Sparkles,
  welding: Flame,
  hvac: Snowflake,
  other: Wrench,
};

export const isServiceTrade = (value: string | null | undefined): value is ServiceTrade =>
  !!value && (SERVICE_TRADES as readonly string[]).includes(value);

/** Đường dẫn web cố định của mini-app Gọi thợ (không đổi khi chưa hỏi — SEO, link chia sẻ, deep link app). */
export const GOI_THO_PATHS = {
  home: '/goi-tho',
  mine: '/goi-tho/cua-toi',
  post: '/goi-tho/dang-yeu-cau',
  chat: '/goi-tho/tin-nhan',
  request: (id: string) => `/goi-tho/yeu-cau/${id}`,
  thread: (id: string) => `/goi-tho/tin-nhan/${id}`,
} as const;
