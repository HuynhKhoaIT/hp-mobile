// Xoá tài khoản (tab Tôi → Cài đặt → Xoá tài khoản; Nghị định 13/2023) — style Stitch "Xoá tài khoản (DeleteAccount)",
// khớp khối xoá tài khoản ở /toi/cai-dat của web (delete-account.tsx):
//   header xanh (DeleteAccountHero = PageHero: quay lại trong mờ, tiêu đề + dòng phụ "Bảo mật & quyền riêng tư") → hộp cảnh
//   báo danger (ẩn ngay, xoá vĩnh viễn sau 30 ngày, không hoàn tác) → "Điều gì sẽ xảy ra": MỘT thẻ 4 dòng ngăn vạch (ô icon
//   + tiêu đề + nhãn thời điểm có chữ + mô tả) theo đúng việc RPC delete_my_account + cron purge-files làm: hồ sơ & huy hiệu,
//   tin & ảnh (ẩn ngay, xoá sau 30 ngày), nhóm (nhóm mình tạo còn mở bị huỷ, rời nhóm đã tham gia / đang chờ — ngay), tin
//   nhắn (giữ ẩn danh) → hộp warning "Ẩn ngay, xoá hẳn sau 30 ngày" (đăng xuất, hết thông báo) → thẻ "Xác nhận xoá": gõ từ
//   xác nhận (common.account.delete_confirm_word, vd "XOA") → nút đỏ "Xoá tài khoản" (chỉ bật khi gõ đúng) + "Giữ tài khoản".
// Bấm "Xoá tài khoản" → ConfirmSheet (BottomSheet) nút ghi rõ "Xoá vĩnh viễn tài khoản" → useDeleteAccountFlow (RPC
// delete_my_account → đăng xuất: gỡ push token, xoá cache → toast "Tài khoản đã được xoá"). Lỗi → toast errors.<code>.
// Khác Stitch (cố ý): không "Thời gian ân hạn — đăng nhập lại để huỷ lệnh xoá" (backend không có khôi phục: deleted_at chỉ
// RPC đặt, không có RPC huỷ xoá), không khảo sát lý do rời đi (không có bảng lưu phản hồi), không ô nhập SĐT xác nhận (thay
// bằng gõ từ xác nhận đã có; tài khoản Google không có SĐT) và ô tick "tôi đã hiểu" (đã có gõ từ + bước xác nhận cuối), không
// nút "Trợ giúp" (trang pháp lý xoá tài khoản còn đang soạn), không mô tả "tích xanh công nhân nhà máy KKT / danh bạ xóm
// trọ / lịch sử ca kíp" (không có dữ liệu đó — chỉ liệt kê dữ liệu thật).
import { BadgeCheck, Clock, type LucideIcon, MessageCircle, Store, TriangleAlert, Users } from 'lucide-react-native';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Badge, type BadgeTone, Button, Card, ConfirmSheet, Divider, Icon, Input, Notice, PageHero, SectionHeader, Skeleton, Text, useScheme } from '@/ui';
import { backOrHome } from '@/features/listing/navigation';
import type { useDeleteAccountFlow } from '../hooks';

type DeleteFlow = ReturnType<typeof useDeleteAccountFlow>;

/** Một dòng "Điều gì sẽ xảy ra" — chữ khớp web (common.account.delete_item_*). */
type Impact = { key: 'profile' | 'listings' | 'groups' | 'messages'; icon: LucideIcon; tag: 'now' | '30d' | 'anonymous' };

const IMPACTS: readonly Impact[] = [
  { key: 'profile', icon: BadgeCheck, tag: '30d' },
  { key: 'listings', icon: Store, tag: '30d' },
  { key: 'groups', icon: Users, tag: 'now' },
  { key: 'messages', icon: MessageCircle, tag: 'anonymous' },
];

const TAG_TONE: Record<Impact['tag'], BadgeTone> = { now: 'warning', '30d': 'danger', anonymous: 'neutral' };

/** Header xanh (dùng cả khi đang tải phiên). Header tràn lên vùng trạng thái → chữ thanh trạng thái sáng khi màn đang mở. */
export function DeleteAccountHero() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <>
      <PageHero title={t('account.delete_title')} subtitle={t('account.delete_subtitle')} onBack={backOrHome} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </>
  );
}

/** Khung giữ chỗ khi đang khôi phục phiên — đúng hình hộp cảnh báo + thẻ 4 dòng + thẻ xác nhận. */
export function DeleteAccountSkeleton() {
  return (
    <View className="gap-5 pt-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </View>
  );
}

export function DeleteAccount({ flow, onDeleted }: { flow: DeleteFlow; onDeleted: () => void }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const matches = typed.trim().toUpperCase() === flow.confirmWord.toUpperCase();

  const closeConfirm = () => {
    if (!flow.isPending) setConfirmOpen(false);
  };

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8 pt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Notice
          variant="bordered"
          tone="danger"
          icon={TriangleAlert}
          title={t('account.delete_warning_title')}
          text={t('account.delete_warning_body')}
        />

        <View className="gap-2">
          <SectionHeader title={t('account.delete_what_title')} bar="primary" size="md" />
          <Card padded={false}>
            {IMPACTS.map((item, i) => (
              <Fragment key={item.key}>
                {i > 0 ? <Divider /> : null}
                <View className="flex-row items-start gap-3 p-4">
                  <View className="size-10 items-center justify-center rounded-md bg-primary-light">
                    <Icon icon={item.icon} tone="primary" />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text variant="label" weight="semibold">
                      {t(`account.delete_item_${item.key}_title`)}
                    </Text>
                    <Badge label={t(`account.delete_tag_${item.tag}`)} tone={TAG_TONE[item.tag]} />
                    <Text tone="muted">{t(`account.delete_item_${item.key}_body`)}</Text>
                  </View>
                </View>
              </Fragment>
            ))}
          </Card>
        </View>

        <Notice variant="bordered" tone="warning" icon={Clock} title={t('account.delete_grace_title')} text={t('account.delete_grace_body')} />

        <View className="gap-2">
          <SectionHeader title={t('account.delete_confirm_title')} bar="primary" size="md" />
          <Card className="gap-4">
            <Input
              label={t('account.delete_confirm_label')}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              editable={!flow.isPending}
            />
            <View className="gap-2">
              <Button
                label={t('account.delete_title')}
                variant="danger"
                fullWidth
                disabled={!matches || flow.isPending}
                onPress={() => setConfirmOpen(true)}
              />
              <Button label={t('account.delete_keep')} variant="outline" fullWidth disabled={flow.isPending} onPress={backOrHome} />
            </View>
          </Card>
        </View>
      </ScrollView>

      <ConfirmSheet
        open={confirmOpen}
        onClose={closeConfirm}
        title={t('account.delete_sheet_title')}
        body={t('account.delete_body')}
        confirmLabel={t('account.delete_action')}
        loading={flow.isPending}
        onConfirm={() =>
          flow.run(() => {
            setTyped('');
            setConfirmOpen(false);
            onDeleted();
          })
        }
      />
    </>
  );
}
