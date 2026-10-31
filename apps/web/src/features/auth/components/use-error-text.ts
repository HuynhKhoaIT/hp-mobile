'use client';

// Mã lỗi từ @hp/core / Zod (key errors.*) → câu thông báo; mã lạ → errors.unknown.
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

export function useErrorText() {
  const t = useTranslations('errors');
  return useCallback((code: string | null | undefined) => (code && t.has(code) ? t(code) : t('unknown')), [t]);
}
