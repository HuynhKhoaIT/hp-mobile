// SignInPrompt — khối mời đăng nhập dùng chung (style Stitch "Khối mời đăng nhập dùng chung (SignInPrompt)"), khớp
// SignInPrompt của app (apps/mobile/src/features/profile/components/SignInPrompt.tsx): khách (hoặc phiên hết hạn) ở khối cần
// tài khoản — hộp thư, thông báo, huy hiệu… Một thẻ: ô khoá nền primary + chấm cam → "Đăng nhập để tiếp tục" + dòng phụ
// primary (một tài khoản cho app và web) → mô tả (mặc định auth.dialog.description, nơi gọi truyền lời theo ngữ cảnh) →
// hộp 3 lợi ích có thật → nút cam "Tiếp tục bằng số điện thoại" (LoginDialog: đăng nhập tại chỗ, xong ở lại đúng trang;
// `intent` để làm tiếp hành động) → hộp cam kết riêng tư. Không hook ngoài useTranslations: dùng được ở server lẫn client.
// Khác Stitch (cố ý): khối nằm trong trang, không phải bottom sheet có nút đóng / nền mờ; không ô nhập số + mã vùng +84 tại
// chỗ và không "Xác thực OTP 30s" (LoginFlow trong dialog đã có bước số điện thoại + Google); không nút Zalo (không có đăng
// nhập Zalo); không gradient / chấm nháy trên ô khoá; lợi ích "Tích xanh công nhân Hòa Phát, Doosan, PTSC", "Zalo" không có
// thật → 3 lợi ích đúng; không link Điều khoản / Quy chế trong hộp riêng tư (bước số điện thoại của LoginFlow đã có
// AuthLegal); nút cam chữ đậm 600 (trắng trên cam cần đậm), bóng shadow-card thay bóng cam.
import { BadgeCheck, LockKeyhole, type LucideIcon, MessageCircle, MessageSquareText, ShieldCheck, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoginDialog } from './login-dialog';
import type { LoginIntent } from './login-intent';

const BENEFITS: readonly { key: 'chat' | 'post' | 'badge'; Icon: LucideIcon; box: string }[] = [
  { key: 'chat', Icon: MessageCircle, box: 'bg-primary-light text-primary' },
  { key: 'post', Icon: SquarePen, box: 'bg-service-pass-soft text-service-pass' },
  { key: 'badge', Icon: BadgeCheck, box: 'bg-service-lost-found-soft text-service-lost-found' },
];

export function SignInPrompt({ description, intent, className }: { description?: string; intent?: LoginIntent; className?: string }) {
  const t = useTranslations('auth');
  return (
    <section
      aria-labelledby="sign-in-prompt-title"
      className={cn('mx-auto flex w-full max-w-lg flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:p-6', className)}
    >
      <div className="flex items-center gap-3">
        <div aria-hidden className="relative shrink-0">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-on-primary shadow-card">
            <LockKeyhole strokeWidth={1.75} className="size-6" />
          </span>
          <span className="absolute -right-1 -bottom-1 size-4 rounded-full border-2 border-surface bg-accent" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="sign-in-prompt-title" className="text-xl font-bold text-fg">
            {t('dialog.title')}
          </h2>
          <p className="text-sm font-semibold text-primary">{t('prompt.kicker')}</p>
        </div>
      </div>

      <p className="text-md text-muted">{description ?? t('dialog.description')}</p>

      <ul className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-3">
        {BENEFITS.map(({ key, Icon, box }) => (
          <li key={key} className="flex items-start gap-3">
            <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', box)}>
              <Icon strokeWidth={1.75} className="size-4.5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-md font-semibold text-fg">{t(`prompt.benefit_${key}`)}</span>
              <span className="text-sm text-muted">{t(`prompt.benefit_${key}_hint`)}</span>
            </span>
          </li>
        ))}
      </ul>

      <LoginDialog
        intent={intent}
        trigger={
          <Button type="button" variant="accent" size="lg" className="w-full font-semibold whitespace-normal">
            <MessageSquareText strokeWidth={1.75} aria-hidden />
            {t('prompt.cta')}
          </Button>
        }
      />

      <p className="flex items-start gap-2 rounded-md bg-primary-light p-3 text-sm text-fg">
        <ShieldCheck aria-hidden strokeWidth={1.75} className="mt-0.5 size-4.5 shrink-0 text-primary" />
        <span>{t('prompt.privacy')}</span>
      </p>
    </section>
  );
}
