'use client';

// Chia sẻ một tin: Web Share API (điện thoại); không có → sao chép link web (shareUrl của @hp/core) + toast "Đã sao chép".
// Dùng ở trang chi tiết (ListingActions) và thẻ "Quản lý tin" của mini-app.
import { shareUrl } from '@hp/core';
import { APP_NAME } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useToast } from '@/components/shared/toast';
import { publicEnv } from '@/lib/env';

export function useShareListing() {
  const t = useTranslations();
  const toast = useToast();
  return useCallback(
    async ({ slug, title }: { slug: string; title: string }) => {
      const url = shareUrl({ type: 'listing', slug }, publicEnv.siteUrl);
      const text = t('listing.detail.share_text', { title, app: APP_NAME });
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (e) {
          // Người dùng huỷ chia sẻ: không làm gì.
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.show(t('listing.detail.link_copied'));
      } catch {
        toast.show(t('errors.unknown'), 'error');
      }
    },
    [t, toast],
  );
}
