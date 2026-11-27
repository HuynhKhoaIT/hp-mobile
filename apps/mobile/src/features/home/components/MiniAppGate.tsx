// Cổng bật / tắt mini-app (admin cấu hình ở /admin/catalog — bảng mini_apps, hook useMiniApps của @hp/core): mini-app đang bật →
// hiện nội dung; đang tắt → màn "Chưa mở" (ẩn hẳn, chặn cả khi vào bằng link / deep link). Lần đầu chưa có cấu hình (chưa có cache
// MMKV) → chờ ngắn thay vì chớp màn "Chưa mở"; lỗi mạng → useMiniApps dùng mặc định fail-open (6 mini-app hiện có bật).
import { useMiniApps } from '@hp/core/react';
import type { MiniAppCode } from '@hp/shared';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, Header, Screen } from '@/ui';

export function MiniAppGate({ code, children }: { code: MiniAppCode; children: ReactNode }) {
  const miniApps = useMiniApps();
  if (miniApps.isLoading) return null;
  if (miniApps.isEnabled(code)) return <>{children}</>;
  return <MiniAppUnavailable />;
}

function MiniAppUnavailable() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Header />
      <EmptyState
        title={t('mini_app_off.title')}
        description={t('mini_app_off.body')}
        action={{ label: t('mini_app_off.cta'), onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
