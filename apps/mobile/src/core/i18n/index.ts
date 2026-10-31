// i18next: vi mặc định, en, zh. Chữ lấy từ @hp/shared/i18n (dùng chung web). Ngôn ngữ đã chọn lưu MMKV;
// lần đầu theo máy (expo-localization). Onboarding / Cài đặt gọi setLocale rồi ghi profiles.locale qua @hp/core
// (tuần 2, khi có đăng nhập). Chọn zh: chữ Hán dùng font hệ thống cho tới khi thêm Noto Sans SC.
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@hp/shared';
import viAuth from '@hp/shared/i18n/vi/auth.json';
import viChat from '@hp/shared/i18n/vi/chat.json';
import viCommon from '@hp/shared/i18n/vi/common.json';
import viErrors from '@hp/shared/i18n/vi/errors.json';
import viGroup from '@hp/shared/i18n/vi/group.json';
import viListing from '@hp/shared/i18n/vi/listing.json';
import viPush from '@hp/shared/i18n/vi/push.json';
import enAuth from '@hp/shared/i18n/en/auth.json';
import enChat from '@hp/shared/i18n/en/chat.json';
import enCommon from '@hp/shared/i18n/en/common.json';
import enErrors from '@hp/shared/i18n/en/errors.json';
import enGroup from '@hp/shared/i18n/en/group.json';
import enListing from '@hp/shared/i18n/en/listing.json';
import enPush from '@hp/shared/i18n/en/push.json';
import zhAuth from '@hp/shared/i18n/zh/auth.json';
import zhChat from '@hp/shared/i18n/zh/chat.json';
import zhCommon from '@hp/shared/i18n/zh/common.json';
import zhErrors from '@hp/shared/i18n/zh/errors.json';
import zhGroup from '@hp/shared/i18n/zh/group.json';
import zhListing from '@hp/shared/i18n/zh/listing.json';
import zhPush from '@hp/shared/i18n/zh/push.json';
import { storage } from '../storage';

const i18n = createInstance();

/** Namespace app dùng (web / admin chỉ ở web). */
export const NAMESPACES = ['common', 'errors', 'listing', 'group', 'chat', 'auth', 'push'] as const;

export const resources = {
  vi: { common: viCommon, errors: viErrors, listing: viListing, group: viGroup, chat: viChat, auth: viAuth, push: viPush },
  en: { common: enCommon, errors: enErrors, listing: enListing, group: enGroup, chat: enChat, auth: enAuth, push: enPush },
  zh: { common: zhCommon, errors: zhErrors, listing: zhListing, group: zhGroup, chat: zhChat, auth: zhAuth, push: zhPush },
} as const;

const LOCALE_KEY = 'locale';

const isLocale = (v: string | null | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

function initialLocale(): Locale {
  const saved = storage.getString(LOCALE_KEY);
  if (isLocale(saved)) return saved;
  const device = getLocales()[0]?.languageCode;
  return isLocale(device) ? device : DEFAULT_LOCALE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function getLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale): Promise<void> {
  storage.set(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export { i18n };
