// "Nhóm của tôi" (style Stitch "Nhóm của tôi (MyGroups)"): hàng chip tab đặc tràn mép (Sắp tới: đang mở / đủ người / đang
// diễn ra, sớm nhất trước · Đã qua: đã xong / đã huỷ, mới nhất trước — giống chip "Tin của tôi") → đầu danh sách: tab Sắp tới
// có mẹo an toàn (Notice bordered warning) → tiêu đề có vạch cam (Đã qua: kèm dòng nhắc chấm điểm chủ nhóm) → GroupCard có
// badge vai trò theo tone (Bạn tạo primary / Đã tham gia success / Chờ duyệt warning — khớp web). Đã qua + thành viên đã được
// nhận + nhóm đã xong + chưa chấm → nút "Đánh giá" dưới thẻ (mở GroupRateSheet); đã chấm → sao + "Bạn đã chấm N/5".
// Skeleton đúng hình thẻ · rỗng có CTA tìm chuyến / tìm kèo · lỗi có Thử lại · kéo làm mới · cuộn vô hạn (cursor).
// Khác Stitch (cố ý): không ô tìm trong nhóm của tôi và không số trên chip (listMyGroups không lọc theo chữ, không trả tổng);
// không tab "Nhóm tôi quản lý" (view my_groups không lọc theo vai trò — badge "Bạn tạo" thay thế) và "Gợi ý tham gia" / khối
// "Gợi ý quanh vị trí bạn làm việc" (chưa có RPC gợi ý); không ảnh bìa nhóm, "248 thành viên", "15 bài mới", "42 chuyến/ngày",
// "vừa trao đổi ca" (nhóm không có ảnh / bài đăng / thống kê đó — thẻ dùng GroupCard chung); không nút "Vào nhóm" (cả thẻ đã mở
// nhóm; chat nhóm ở chi tiết); không banner "Mở nhóm" cho trưởng ca (nhóm luôn công khai, không có không gian riêng — nút
// "Tạo nhóm" ở header là hành động chính duy nhất).
import type { MyGroup, MyGroupsTab } from '@hp/core';
import { useMyGroups } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { Users } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import {
  type BadgeTone,
  Button,
  Col,
  EmptyState,
  ErrorState,
  FilterBar,
  GroupCard,
  Notice,
  Row,
  SectionHeader,
  SkeletonGroupCard,
  StaggerItem,
  StarRating,
  Text,
  useTheme,
} from '@/ui';
import { openGroup, openGroupList } from '../navigation';
import { GroupRateSheet } from './GroupRateSheet';

export const MY_GROUP_TABS: readonly MyGroupsTab[] = ['upcoming', 'past'];

export const isMyGroupsTab = (v: string | undefined): v is MyGroupsTab => !!v && (MY_GROUP_TABS as readonly string[]).includes(v);

/** Tone badge vai trò — khớp ROLE_TONE của web (my-group-item.tsx). */
const ROLE_TONE: Record<'host' | 'accepted' | 'requested', BadgeTone> = { host: 'primary', accepted: 'success', requested: 'warning' };

/** Chiều cao ước lượng một dòng (thẻ + nút) — đổi "còn 5 item" thành ngưỡng onEndReached. */
const ROW_HEIGHT = 260;
const PREFETCH_ITEMS = 5;

/** Thành viên đã được nhận của nhóm đã xong, chưa chấm → mời đánh giá. */
const canRateRow = (g: MyGroup) => g.my_role === 'accepted' && g.status === 'completed' && g.my_rating == null;

export function MyGroups({ initialTab = 'upcoming' }: { initialTab?: MyGroupsTab }) {
  const { t } = useTranslation('group');
  const { space } = useTheme();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<MyGroupsTab>(initialTab);
  const list = useMyGroups(tab);
  const [rating, setRating] = useState<MyGroup | null>(null);

  const tabs = MY_GROUP_TABS.map((value) => ({ value, label: t(`mine.tab_${value}`) }));

  let content: ReactNode;
  if (list.isLoading) content = <SkeletonGroupCard count={3} />;
  else if (list.isError && list.items.length === 0) content = <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />;
  else if (list.items.length === 0) {
    content = (
      <View>
        <EmptyState
          icon={Users}
          title={t(tab === 'upcoming' ? 'mine.empty_upcoming_title' : 'mine.empty_past_title')}
          description={t(tab === 'upcoming' ? 'mine.empty_upcoming_body' : 'mine.empty_past_body')}
          action={{ label: t('mine.find_ride'), onPress: () => openGroupList('ride') }}
        />
        <Button variant="ghost" label={t('mine.find_sport')} onPress={() => openGroupList('sport')} className="self-center" />
      </View>
    );
  } else {
    const loadMore = () => {
      if (list.hasNextPage && !list.isFetchingNextPage && !list.isFetchNextPageError) void list.fetchNextPage();
    };
    const header = (
      <Col gap={3} className="pb-3">
        {tab === 'upcoming' ? (
          <Notice variant="bordered" tone="warning" title={t('listing:tip.title')} text={t('detail.safety_tip')} />
        ) : null}
        <SectionHeader
          title={t(tab === 'upcoming' ? 'mine.section_upcoming' : 'mine.section_past')}
          subtitle={tab === 'past' ? t('mine.section_past_hint') : undefined}
          bar="accent"
          size="md"
        />
      </Col>
    );
    content = (
      <FlashList
        data={list.items}
        ListHeaderComponent={header}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StaggerItem index={index} className="pb-3">
            <MyGroupRow group={item} onRate={() => setRating(item)} />
          </StaggerItem>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={Math.max(0.5, (PREFETCH_ITEMS * ROW_HEIGHT) / height)}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View className="pb-3">
              <SkeletonGroupCard />
            </View>
          ) : list.isFetchNextPageError ? (
            <View className="items-center py-4">
              <Button variant="outline" size="sm" label={t('list.load_more')} onPress={() => void list.fetchNextPage()} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: space[2], paddingBottom: space[8] }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <>
      <View className="pb-2">
        <FilterBar options={tabs} value={tab} onChange={setTab} appearance="solid" bleed />
      </View>
      <View className="flex-1">{content}</View>
      <GroupRateSheet group={rating} onClose={() => setRating(null)} />
    </>
  );
}

function MyGroupRow({ group, onRate }: { group: MyGroup; onRate: () => void }) {
  const { t } = useTranslation('group');
  const role = group.my_role === 'host' || group.my_role === 'accepted' || group.my_role === 'requested' ? group.my_role : null;
  const scoreLabel = group.my_rating != null ? t('rate.your_score', { score: group.my_rating }) : null;

  return (
    <View className="gap-2">
      <GroupCard
        group={group}
        roleLabel={role ? t(`mine.role_${role}`) : undefined}
        roleTone={role ? ROLE_TONE[role] : undefined}
        onPress={() => openGroup(group.id)}
      />
      {/* Nút / điểm đặt ngoài thẻ: thẻ bấm được đọc thành một nút, nút lồng bên trong không tới được bằng trình đọc. */}
      {canRateRow(group) ? (
        <Button size="sm" variant="outline" label={t('rate.cta')} accessibilityHint={t('rate.title')} onPress={onRate} />
      ) : scoreLabel ? (
        <Row gap={2} className="px-1">
          <StarRating value={group.my_rating ?? 0} size="sm" accessibilityLabel={scoreLabel} />
          <Text variant="caption" tone="muted">
            {scoreLabel}
          </Text>
        </Row>
      ) : null}
    </View>
  );
}
