// Screen type: Detail
// Universal / App Link `https://tenapp.vn/nhom/{slug}` → chi tiết nhóm (cùng nội dung với group/[id], như tin/[slug]).
// Resolve theo slug qua get_group_by_slug (short_id ở cuối slug); không còn / sai link → "Nhóm không còn".
// Có id rồi thì đọc tiếp theo keys.group(id) (useGroup) để tham gia / rời / duyệt cập nhật lạc quan như group/[id];
// trong lúc đó vẫn hiện dữ liệu theo slug (không chớp skeleton).
import { useGroup, useGroupBySlug } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GROUP_CONFIGS } from '@/features/configs';
import { GroupDetailState } from '@/features/group/components/GroupDetail';
import { GroupHeaderActions } from '@/features/group/components/GroupHeaderActions';
import { backOrHome } from '@/features/group/navigation';
import { Header, Screen } from '@/ui';

export default function GroupBySlugScreen() {
  const { t } = useTranslation('group');
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const bySlug = useGroupBySlug(slug);
  const byId = useGroup(bySlug.data?.id);
  const query = byId.data ? byId : bySlug;
  const group = query.data;

  return (
    <Screen>
      {/* Mở từ link khi app chưa chạy → không có màn trước: nút quay lại về trang chủ. */}
      <Header
        title={group ? t(GROUP_CONFIGS[group.kind].labels.detailTitle) : ''}
        back
        onBack={backOrHome}
        right={group ? <GroupHeaderActions group={group} /> : undefined}
      />
      <GroupDetailState query={query} configs={GROUP_CONFIGS} />
    </Screen>
  );
}
