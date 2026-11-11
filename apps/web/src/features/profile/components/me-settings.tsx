// "Cài đặt & hỗ trợ" của trang "Tôi" (khách và người đã đăng nhập), style Stitch: tiêu đề vạch xanh, MỘT card các dòng
// (ô icon 32 nền surface-2 + nhãn + chevron / điều khiển) ngăn bởi đường kẻ:
//   [đã đăng nhập] Tin đã lưu · Thông báo · Cài đặt (xoá tài khoản ở /toi/cai-dat)   Ngôn ngữ · Giao diện
//   [đã đăng nhập] Đăng xuất (ô icon + chữ danger)
// rồi card link pháp lý, dòng miễn trừ + bản quyền. Trên điện thoại đây là nơi duy nhất có các mục này (footer ẩn < 640px).
// Khung tĩnh (prerender); các dòng chỉ dành cho người đã đăng nhập đọc phiên theo request → trong <Suspense fallback={null}>.
// "Nhóm của tôi" đã ở lối tắt phía trên nên không lặp ở đây.
import { APP_NAME } from '@hp/shared';
import {
  Bell,
  ChevronRight,
  FileText,
  Heart,
  Info,
  Languages,
  Lock,
  type LucideIcon,
  Mail,
  Settings,
  SunMoon,
  UserX,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';
import { copyrightYear, LEGAL_LINKS } from '@/components/shared/legal-links';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { getCurrentUserId } from '@/features/auth/queries';
import { SignOutRow } from '@/features/auth/components/sign-out-button';
import { Link } from '@/i18n/navigation';

const LEGAL_ICON: Record<(typeof LEGAL_LINKS)[number]['key'], LucideIcon> = {
  about: Info,
  terms: FileText,
  privacy: Lock,
  delete_account: UserX,
  contact: Mail,
};

const CARD = 'flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-card';

function RowIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary">
      <Icon strokeWidth={1.75} className="size-5" />
    </span>
  );
}

function LinkRow({ href, Icon, label }: { href: string; Icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <RowIcon Icon={Icon} />
      <span className="flex-1 text-md font-medium text-fg">{label}</span>
      <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-muted" />
    </Link>
  );
}

function ControlRow({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
      <RowIcon Icon={Icon} />
      <span className="flex-1 text-md font-medium text-fg">{label}</span>
      {children}
    </div>
  );
}

/** Ngôn ngữ + giao diện (các dòng, không khung). */
async function PreferenceRows() {
  const t = await getTranslations();
  return (
    <>
      <ControlRow Icon={Languages} label={t('common.settings.language')}>
        <LocaleSwitcher />
      </ControlRow>
      <ControlRow Icon={SunMoon} label={t('web.me.theme')}>
        <ThemeToggle />
      </ControlRow>
    </>
  );
}

/** Ngôn ngữ + giao diện trong một card — dùng ở /toi/cai-dat. */
export async function PreferencesCard() {
  return (
    <div className={CARD}>
      <PreferenceRows />
    </div>
  );
}

async function AccountRows() {
  if (!(await getCurrentUserId())) return null;
  const t = await getTranslations();
  return (
    <>
      <LinkRow href="/toi/da-luu" Icon={Heart} label={t('listing.saved.title')} />
      <LinkRow href="/thong-bao" Icon={Bell} label={t('common.notifications.title')} />
      <LinkRow href="/toi/cai-dat" Icon={Settings} label={t('web.me.settings')} />
    </>
  );
}

async function SignOut() {
  if (!(await getCurrentUserId())) return null;
  return <SignOutRow />;
}

export async function MeSettings() {
  const t = await getTranslations();
  return (
    <section aria-labelledby="me-settings" className="flex flex-col gap-3">
      <h2 id="me-settings" className="flex items-center gap-2 text-lg font-bold text-fg">
        <span aria-hidden className="h-4 w-1.5 shrink-0 rounded-full bg-primary" />
        {t('common.profile.settings_section')}
      </h2>
      <div className={CARD}>
        <Suspense fallback={null}>
          <AccountRows />
        </Suspense>
        <PreferenceRows />
        <Suspense fallback={null}>
          <SignOut />
        </Suspense>
      </div>
      <nav aria-label={t('web.me.about')} className={CARD}>
        {LEGAL_LINKS.map(({ href, key }) => (
          <LinkRow key={key} href={href} Icon={LEGAL_ICON[key]} label={t(`web.legal.${key}`)} />
        ))}
      </nav>
      <div className="flex flex-col gap-1 pt-2 text-center text-sm text-muted">
        <p>{t('common.disclaimer')}</p>
        <p>{t('web.footer.rights', { year: await copyrightYear(), appName: APP_NAME })}</p>
      </div>
    </section>
  );
}
