// Mã lỗi (key errors.* từ @hp/core / Zod) → câu thông báo theo ngôn ngữ; mã lạ → errors.unknown.
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useErrorText() {
  const { t, i18n } = useTranslation();
  return useCallback(
    (code: string | null | undefined) => (code && i18n.exists(`errors:${code}`) ? t(`errors:${code}`) : t('errors:unknown')),
    [t, i18n],
  );
}
