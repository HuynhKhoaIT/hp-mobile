// Screen type: List
// Danh sách nhóm theo kind (ride | sport) — một màn cho Ghép xe và Ghép trận, khác nhau chỉ ở config.ts (quy tắc vàng; style
// Stitch: header xanh + ô tìm, chip khoảng ngày / loại con, mẹo an toàn, thẻ chuyến dạng timeline). Nút Tạo nổi → form (khách
// đăng nhập trước). Kind sai → về trang chủ. Header xanh tràn lên vùng trạng thái → chữ thanh trạng thái sáng khi màn đang mở.
import { Redirect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GROUP_CONFIGS, isGroupKind } from '@/features/configs';
import { GroupBrowser } from '@/features/group/components/GroupBrowser';
import { useCreateGroupAction } from '@/features/group/hooks';
import { backOrHome } from '@/features/group/navigation';
import { Fab, Screen, useScheme } from '@/ui';

export default function GroupListScreen() {
  const { t } = useTranslation('group');
  const focused = useIsFocused();
  const scheme = useScheme();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const create = useCreateGroupAction(isGroupKind(kind) ? kind : 'ride');
  if (!isGroupKind(kind)) return <Redirect href="/" />;
  const config = GROUP_CONFIGS[kind];

  return (
    <Screen>
      {/* key: đổi kind → state bộ lọc mới. */}
      <GroupBrowser key={kind} config={config} onBack={backOrHome} />
      <Fab label={t(config.labels.create)} icon={Plus} onPress={create} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}
