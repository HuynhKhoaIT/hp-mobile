// Screen type: List
// "Nhóm của tôi" (từ tab Tôi) — style Stitch "Nhóm của tôi (MyGroups)": header xanh (PageHero: quay lại trong mờ, tiêu đề +
// dòng phụ, nút cam "Tạo nhóm" → sheet chọn Tạo chuyến / Tạo kèo theo config) → tab `?tab=upcoming|past` (chuyến / kèo mình
// tạo, đã tham gia, đang chờ duyệt; nhóm đã qua mời đánh giá chủ nhóm). Khách → mời đăng nhập. Header xanh tràn lên vùng
// trạng thái → chữ thanh trạng thái sáng khi màn đang mở. Khác Stitch: xem đầu MyGroups.tsx.
import { useSession } from '@hp/core/react';
import { GROUP_KINDS } from '@hp/shared';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { GROUP_CONFIGS } from '@/features/configs';
import { CreateGroupSheet } from '@/features/group/components/CreateGroupSheet';
import { isMyGroupsTab, MyGroups } from '@/features/group/components/MyGroups';
import { backOrHome } from '@/features/group/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Button, PageHero, Screen, SkeletonGroupCard, useScheme } from '@/ui';

const CREATE_CONFIGS = GROUP_KINDS.map((kind) => GROUP_CONFIGS[kind]);

export default function MyGroupsScreen() {
  const { t } = useTranslation('group');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const session = useSession();
  const focused = useIsFocused();
  const scheme = useScheme();
  const [creating, setCreating] = useState(false);

  return (
    <Screen>
      <PageHero
        title={t('mine.title')}
        subtitle={t('mine.subtitle')}
        onBack={backOrHome}
        right={
          session.userId ? (
            <Button label={t('mine.create')} icon={Plus} variant="accent" size="sm" shape="pill" onPress={() => setCreating(true)} />
          ) : undefined
        }
      />
      <View className="flex-1 pt-3">
        {session.isLoading ? (
          <SkeletonGroupCard count={3} />
        ) : !session.userId ? (
          <SignInPrompt />
        ) : (
          <MyGroups key={tab ?? ''} initialTab={isMyGroupsTab(tab) ? tab : 'upcoming'} />
        )}
      </View>
      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} configs={CREATE_CONFIGS} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}
