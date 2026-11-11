// Danh sách chọn nơi làm việc ở bước 3 onboarding (style Stitch "Chọn nơi làm việc"): mỗi khu một Card chọn được (viền 2
// primary khi chọn) — ô icon nhà máy (chọn: nền primary icon on-primary; chưa: nền surface-2 icon primary) · tên khu ·
// vòng chọn (chọn: tròn primary có dấu tích; chưa: vòng viền). Bấm khu đang chọn → bỏ chọn (như trước). Dữ liệu chỉ có
// mã + tên khu (sites) → không có dòng phụ / số nhân viên như bản thiết kế. Đủ 3 trạng thái: khung chờ, lỗi, có dữ liệu.
import type { Site } from '@hp/core';
import { Check, Factory } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, Col, ErrorState, Icon, Skeleton, Text } from '@/ui';

export function SiteChoice({
  sites,
  loading,
  errorCode,
  onRetry,
  value,
  onChange,
}: {
  sites: Site[];
  loading: boolean;
  errorCode?: string | null;
  onRetry: () => void;
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  if (loading) {
    return (
      <Col gap={3}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </Col>
    );
  }
  if (errorCode) return <ErrorState code={errorCode} onRetry={onRetry} />;
  return (
    <Col gap={3}>
      {sites.map((s) => {
        const selected = value === s.code;
        return (
          <Card
            key={s.code}
            selected={selected}
            accessibilityLabel={s.name}
            onPress={() => onChange(selected ? null : s.code)}
            className="flex-row items-center gap-3"
          >
            <View className={`size-10 items-center justify-center rounded-md ${selected ? 'bg-primary' : 'bg-surface-2'}`}>
              <Icon icon={Factory} tone={selected ? 'onPrimary' : 'primary'} />
            </View>
            <Text weight="semibold" tone={selected ? 'primary' : 'default'} className="flex-1">
              {s.name}
            </Text>
            <View
              className={`size-6 items-center justify-center rounded-full ${selected ? 'bg-primary' : 'border-2 border-border'}`}
            >
              {selected ? <Icon icon={Check} tone="onPrimary" size={16} strong /> : null}
            </View>
          </Card>
        );
      })}
    </Col>
  );
}
