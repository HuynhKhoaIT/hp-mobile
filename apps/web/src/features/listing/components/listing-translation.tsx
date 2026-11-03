'use client';

// Nút "Dịch" trên /tin/[slug] khi ngôn ngữ tin khác ngôn ngữ trang (.claude/rules/web-i18n.md). HTML server luôn là bản
// GỐC (SEO, tắt JS vẫn đọc được); bản dịch chỉ thay chữ ở trình duyệt:
// - TranslationProvider bọc trang chi tiết; TranslatableText render tiêu đề / mô tả: bản gốc, hoặc bản dịch khi đang bật.
// - TranslateBar: khách → LoginDialog (Edge Function translate-content cần đăng nhập; intent "translate" → tự dịch sau khi
//   đăng nhập). Đã đăng nhập → useTranslateListing(listingId).mutate(locale) (cache theo tin + ngôn ngữ, mở lại không gọi lại).
//   Đang dịch → "Đang dịch…" (aria-busy). Xong → "Bản dịch tự động" + "Xem bản gốc" (bật / tắt không gọi lại API).
// - Lỗi: translate_unavailable (chưa cấu hình API dịch — đúng hiện trạng local) → thay nút bằng dòng thông báo, không thử lại;
//   translate_failed / rate_limited / mạng → toast errors.* và vẫn bấm lại được.
import type { TranslatedContent } from '@hp/core';
import { useTranslateListing } from '@hp/core/react';
import type { Locale } from '@hp/shared';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { asLocale } from '../display';

type TranslationState = {
  listingId: string;
  /** Bản dịch đang hiện (null = đang hiện bản gốc). */
  shown: TranslatedContent | null;
  setShown: (value: TranslatedContent | null) => void;
};

const TranslationContext = createContext<TranslationState | null>(null);

export function TranslationProvider({ listingId, children }: { listingId: string; children: ReactNode }) {
  const [shown, setShown] = useState<TranslatedContent | null>(null);
  const value = useMemo(() => ({ listingId, shown, setShown }), [listingId, shown]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/** Tiêu đề / mô tả: bản gốc (giống HTML server) hoặc bản dịch khi người dùng bật. Ngoài Provider → luôn bản gốc. */
export function TranslatableText({
  as: Tag,
  field,
  original,
  lang,
  className,
}: {
  as: 'h1' | 'p';
  field: 'title' | 'description';
  original: string;
  /** Ngôn ngữ bản gốc (listing.lang). */
  lang: string;
  className?: string;
}) {
  const shown = useContext(TranslationContext)?.shown;
  const translated = shown ? shown[field] : null;
  return (
    <Tag lang={translated ? shown?.lang : lang} className={className}>
      {translated || original}
    </Tag>
  );
}

export function TranslateBar() {
  const ctx = useContext(TranslationContext);
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const userId = useSessionUser();
  const toast = useToast();
  const errorText = useErrorText();
  const listingId = ctx?.listingId ?? '';
  // Hook lưu bản dịch vào cache TanStack theo (tin, ngôn ngữ): bấm lại sau "Xem bản gốc" không gọi lại Edge Function.
  const translate = useTranslateListing(listingId);
  const [unavailable, setUnavailable] = useState(false);

  const run = (lang: Locale) =>
    translate.mutate(lang, {
      onSuccess: (data) => ctx?.setShown(data),
      onError: (e) => {
        if (e.code === 'translate_unavailable') setUnavailable(true);
        else toast.show(errorText(e.code), 'error');
      },
    });

  // Vừa đăng nhập từ nút này → dịch luôn (chạy sau commit).
  const resume = useEffectEvent(() => run(locale));
  useEffect(() => {
    if (!userId || !listingId || !takeLoginIntent('translate', listingId)) return;
    const id = setTimeout(resume, 0);
    return () => clearTimeout(id);
  }, [userId, listingId]);

  if (!ctx) return null;

  if (unavailable) {
    return <p className="text-sm text-muted">{t('errors.translate_unavailable')}</p>;
  }

  if (ctx.shown) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Languages aria-hidden strokeWidth={1.75} className="size-5" />
        <span>{t('listing.translate.translated_note')}</span>
        <Button type="button" variant="link" size="sm" onClick={() => ctx.setShown(null)}>
          {t('listing.translate.show_original')}
        </Button>
      </div>
    );
  }

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="self-start"
      disabled={userId === undefined || translate.isPending}
      aria-busy={translate.isPending || undefined}
      onClick={userId ? () => run(locale) : undefined}
    >
      <Languages aria-hidden strokeWidth={1.75} />
      {translate.isPending ? t('listing.translate.translating') : t('listing.translate.action')}
    </Button>
  );

  return userId === null ? <LoginDialog trigger={button} intent={{ action: 'translate', target: listingId }} /> : button;
}
