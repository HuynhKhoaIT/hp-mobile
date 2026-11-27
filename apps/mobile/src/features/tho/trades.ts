// Icon của 5 loại thợ (mini-app Gọi thợ — mẫu thứ ba, không phải Listing / Group). Nhãn: `tho.trade.<code>`, gợi ý:
// `tho.trade_hint.<code>`. Khớp web (apps/web/src/features/goi-tho/trades.ts): điện nước Zap · vệ sinh Sparkles ·
// thợ hàn Flame · điện lạnh Snowflake · khác Wrench.
import { SERVICE_TRADES, type ServiceTrade } from '@hp/shared';
import { Flame, type LucideIcon, Snowflake, Sparkles, Wrench, Zap } from 'lucide-react-native';

export const TRADES = SERVICE_TRADES;

export const TRADE_ICON: Record<ServiceTrade, LucideIcon> = {
  electric_plumbing: Zap,
  cleaning: Sparkles,
  welding: Flame,
  hvac: Snowflake,
  other: Wrench,
};

export const isServiceTrade = (value: string | undefined): value is ServiceTrade =>
  !!value && (SERVICE_TRADES as readonly string[]).includes(value);
