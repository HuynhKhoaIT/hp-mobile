'use client';

// Xoá tài khoản (/toi/cai-dat, Nghị định 13/2023) — style Stitch "Xoá tài khoản (DeleteAccount)", khớp màn
// settings/delete-account của app (DeleteAccount.tsx): tiêu đề vạch primary + dòng phụ "Bảo mật & quyền riêng tư" → hộp
// cảnh báo danger (ẩn ngay, xoá vĩnh viễn sau 30 ngày, không hoàn tác) → "Điều gì sẽ xảy ra": MỘT thẻ 4 dòng ngăn vạch (ô
// icon + tiêu đề + nhãn thời điểm có chữ + mô tả) theo đúng việc RPC delete_my_account + cron purge-files làm → hộp warning
// "Ẩn ngay, xoá hẳn sau 30 ngày" → "Xác nhận xoá": gõ từ xác nhận (common.account.delete_confirm_word, "XOA") → nút "Xoá tài
// khoản" (chỉ bật khi gõ đúng) → ConfirmDialog nút ghi rõ "Xoá vĩnh viễn tài khoản" → useDeleteAccount (RPC
// delete_my_account: ẩn mọi nội dung ngay, xoá hẳn sau 30 ngày) → đăng xuất → về trang chủ (tải lại cả trang để xoá cache
// theo phiên) và hiện toast "Tài khoản đã được xoá". Toast qua sessionStorage vì trang tải lại (ACCOUNT_DELETED_FLAG,
// AccountDeletedToast đọc một lần; bọc try / catch).
// Khác Stitch (cố ý): giữ là một khối trong /toi/cai-dat (không thêm trang riêng; header xanh / nút "Giữ tài khoản" của màn
// app không cần); không "đăng nhập lại trong 30 ngày để huỷ lệnh xoá" (backend không có khôi phục), không khảo sát lý do rời
// đi (không có bảng lưu), không ô nhập SĐT (thay bằng gõ từ xác nhận; tài khoản Google không có SĐT) và ô tick "tôi đã hiểu"
// (đã có gõ từ + bước xác nhận cuối), không nút "Trợ giúp" (trang pháp lý còn đang soạn), không mô tả dữ liệu không có thật.
import { signOut } from '@hp/core';
import { useDeleteAccount } from '@hp/core/react';
import type { Locale } from '@hp/shared';
import { BadgeCheck, Clock, type LucideIcon, MessageCircle, Store, Trash2, TriangleAlert, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { BarHeading } from '@/features/listing/components/safety-tip';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const ACCOUNT_DELETED_FLAG = 'hp:account-deleted';

const CARD = 'rounded-lg border border-border bg-surface shadow-card';

/** Một dòng "Điều gì sẽ xảy ra" — chữ khớp app (common.account.delete_item_*). */
type Impact = { key: 'profile' | 'listings' | 'groups' | 'messages'; Icon: LucideIcon; tag: 'now' | '30d' | 'anonymous' };

const IMPACTS: readonly Impact[] = [
  { key: 'profile', Icon: BadgeCheck, tag: '30d' },
  { key: 'listings', Icon: Store, tag: '30d' },
  { key: 'groups', Icon: Users, tag: 'now' },
  { key: 'messages', Icon: MessageCircle, tag: 'anonymous' },
];

const TAG_TONE: Record<Impact['tag'], BadgeTone> = { now: 'warning', '30d': 'danger', anonymous: 'neutral' };

/** Hộp nhắc có viền (giống Notice bordered của app): ô icon size-10 + tiêu đề đậm + chữ muted. */
function NoticeBox({ tone, Icon, title, text }: { tone: 'danger' | 'warning'; Icon: LucideIcon; title: string; text: string }) {
  return (
    <aside
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        tone === 'danger' ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md',
          tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning',
        )}
      >
        <Icon strokeWidth={1.75} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-md font-semibold text-fg">{title}</p>
        <p className="text-md text-muted">{text}</p>
      </div>
    </aside>
  );
}

export function DeleteAccount() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  const toast = useToast();
  const remove = useDeleteAccount();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  // Xoá xong → đang đăng xuất / chuyển trang: giữ dialog khoá nút cho tới khi rời trang.
  const [leaving, setLeaving] = useState(false);
  const busy = remove.isPending || leaving;
  const word = t('common.account.delete_confirm_word');
  const confirmed = typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();

  const confirm = () =>
    remove.mutate(undefined, {
      onSuccess: async () => {
        setLeaving(true);
        await signOut(createBrowserClient());
        try {
          window.sessionStorage.setItem(ACCOUNT_DELETED_FLAG, '1');
        } catch {
          // Không ghi được: bỏ qua toast, vẫn về trang chủ.
        }
        window.location.assign(withLocale('/', locale));
      },
      onError: (e) => {
        setOpen(false);
        toast.show(errorText(e.code), 'error');
      },
    });

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <BarHeading id={`${id}-title`} tone="primary">
          {t('common.account.delete_title')}
        </BarHeading>
        <p className="text-sm text-muted">{t('common.account.delete_subtitle')}</p>
      </div>

      <NoticeBox
        tone="danger"
        Icon={TriangleAlert}
        title={t('common.account.delete_warning_title')}
        text={t('common.account.delete_warning_body')}
      />

      <div className="flex flex-col gap-2">
        <BarHeading as="h3" id={`${id}-what`} tone="primary">
          {t('common.account.delete_what_title')}
        </BarHeading>
        <ul aria-labelledby={`${id}-what`} className={cn(CARD, 'divide-y divide-border')}>
          {IMPACTS.map(({ key, Icon, tag }) => (
            <li key={key} className="flex items-start gap-3 p-4">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                <Icon strokeWidth={1.75} className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <p className="text-md font-semibold text-fg">{t(`common.account.delete_item_${key}_title`)}</p>
                <Badge tone={TAG_TONE[tag]}>{t(`common.account.delete_tag_${tag}`)}</Badge>
                <p className="text-md text-muted">{t(`common.account.delete_item_${key}_body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <NoticeBox
        tone="warning"
        Icon={Clock}
        title={t('common.account.delete_grace_title')}
        text={t('common.account.delete_grace_body')}
      />

      <div className="flex flex-col gap-2">
        <BarHeading as="h3" id={`${id}-confirm`} tone="primary">
          {t('common.account.delete_confirm_title')}
        </BarHeading>
        <form
          aria-labelledby={`${id}-confirm`}
          className={cn(CARD, 'flex flex-col gap-4 p-4 sm:p-6')}
          onSubmit={(e) => {
            e.preventDefault();
            if (confirmed && !busy) setOpen(true);
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-word`} className="text-md font-medium text-fg">
              {t('common.account.delete_confirm_label')}
            </label>
            <Input
              id={`${id}-word`}
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={busy}
              className="sm:max-w-xs"
            />
          </div>
          <Button type="submit" variant="destructive" className="self-start" disabled={!confirmed || busy}>
            <Trash2 aria-hidden strokeWidth={1.75} />
            {t('common.account.delete_title')}
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={t('common.account.delete_sheet_title')}
        description={t('common.account.delete_body')}
        confirmLabel={t('common.account.delete_action')}
        destructive
        pending={busy}
        onConfirm={confirm}
      />
    </section>
  );
}

/** Đặt ở trang chủ: sau khi xoá tài khoản và tải lại, hiện toast một lần. */
export function AccountDeletedToast() {
  const t = useTranslations('common.account');
  const toast = useToast();
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ACCOUNT_DELETED_FLAG) !== '1') return;
      window.sessionStorage.removeItem(ACCOUNT_DELETED_FLAG);
    } catch {
      return;
    }
    toast.show(t('deleted'));
  }, [t, toast]);
  return null;
}
