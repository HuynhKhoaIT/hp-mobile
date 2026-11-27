// Screen type: List
// Trang chủ mini-app Gọi thợ — tab "Việc quanh bạn": header gradient (tên + ô tìm nổi) → hàng chip loại thợ (Tất cả · Điện nước ·
// Vệ sinh · Thợ hàn · Thợ điện lạnh · Khác) → danh sách yêu cầu đang mở cuộn vô hạn (cursor); khách xem được, đăng yêu cầu /
// báo giá thì đăng nhập (nút Đăng việc ở thanh tab, requireAuth). Đầu danh sách (chưa lọc): gợi ý cho thợ.
import { Hammer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { RequestCard } from '@/features/tho/components/RequestCard';
import { RequestFeed } from '@/features/tho/components/RequestFeed';
import { ThoTabHeader } from '@/features/tho/components/ThoTabHeader';
import { ALL, useNewRequestAction, useRequestBrowser } from '@/features/tho/hooks';
import { openServiceRequest } from '@/features/tho/navigation';
import { isServiceTrade, TRADES } from '@/features/tho/trades';
import { FilterBar, type FilterOption, Notice, Screen, SearchBar } from '@/ui';

export default function ThoHomeScreen() {
  const { t } = useTranslation('tho');
  const browser = useRequestBrowser();
  const newRequest = useNewRequestAction();

  const options: FilterOption<string>[] = [
    { value: ALL, label: t('list.filter_all') },
    ...TRADES.map((code) => ({ value: code, label: t(`trade.${code}`) })),
  ];

  return (
    <Screen tab statusBar="app">
      <ThoTabHeader subtitle={t('subtitle')}>
        <SearchBar
          variant="elevated"
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
          placeholder={t('list.search_placeholder')}
        />
      </ThoTabHeader>
      <View className="pb-1 pt-3">
        <FilterBar
          bleed
          options={options}
          value={browser.trade}
          onChange={(value) => browser.setTrade(isServiceTrade(value) ? value : ALL)}
        />
      </View>
      <RequestFeed
        items={browser.items}
        keyOf={(r) => r.id}
        renderItem={(r) => <RequestCard request={r} onPress={() => openServiceRequest(r.id)} />}
        isLoading={browser.isLoading}
        isError={browser.isError}
        errorCode={browser.error?.code}
        isRefetching={browser.isRefetching}
        hasNextPage={browser.hasNextPage}
        isFetchingNextPage={browser.isFetchingNextPage}
        isFetchNextPageError={browser.isFetchNextPageError}
        fetchNextPage={() => void browser.fetchNextPage()}
        refetch={() => void browser.refetch()}
        empty={{
          icon: Hammer,
          title: t('list.empty_title'),
          description: t('list.empty_body'),
          action: { label: t('list.empty_cta'), onPress: () => newRequest(isServiceTrade(browser.trade) ? browser.trade : undefined) },
        }}
        header={browser.isFiltered ? null : <Notice variant="bordered" text={t('home.pro_hint')} />}
      />
    </Screen>
  );
}
