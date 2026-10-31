// Hook riêng mobile của hồ sơ: đổi ngôn ngữ (i18next + MMKV ngay, profiles.locale khi đã đăng nhập), đăng xuất.
import { useMyProfile, useUpdateProfile } from '@hp/core/react';
import type { Locale } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { signOutApp } from '@/core/auth';
import { getLocale, setLocale } from '@/core/i18n';
import { toast } from '@/ui';

/** Đổi ngôn ngữ app; đã đăng nhập thì lưu cả profiles.locale (push / email theo ngôn ngữ này). Lỗi lưu không chặn đổi. */
export function useChangeLocale() {
  const { i18n } = useTranslation();
  const me = useMyProfile();
  const update = useUpdateProfile();
  const current: Locale = i18n.language === 'en' || i18n.language === 'zh' ? i18n.language : getLocale();
  return {
    current,
    change: (locale: Locale) => {
      void setLocale(locale);
      if (me.data && me.data.locale !== locale) update.mutate({ locale });
    },
  };
}

export function useSignOut() {
  const { t } = useTranslation('auth');
  return async () => {
    const res = await signOutApp();
    toast.show(res.error ? t('errors:unknown') : t('signed_out'), res.error ? 'danger' : 'info');
  };
}
