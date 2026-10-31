// Nạp file dịch dùng chung (packages/shared/i18n) cho next-intl.
// File dùng cú pháp i18next ({{x}}, key_one / key_other) để app đọc trực tiếp; web chuyển sang ICU của next-intl
// ({x}, {count, plural, one {…} other {…}}) một lần khi module được nạp.
// Namespace `admin` chỉ nạp trong khu /admin (không gửi xuống trang công khai).
import type { Locale } from '@hp/shared';
import enAuth from '@hp/shared/i18n/en/auth.json';
import enChat from '@hp/shared/i18n/en/chat.json';
import enCommon from '@hp/shared/i18n/en/common.json';
import enErrors from '@hp/shared/i18n/en/errors.json';
import enGroup from '@hp/shared/i18n/en/group.json';
import enListing from '@hp/shared/i18n/en/listing.json';
import enWeb from '@hp/shared/i18n/en/web.json';
import viAuth from '@hp/shared/i18n/vi/auth.json';
import viChat from '@hp/shared/i18n/vi/chat.json';
import viCommon from '@hp/shared/i18n/vi/common.json';
import viErrors from '@hp/shared/i18n/vi/errors.json';
import viGroup from '@hp/shared/i18n/vi/group.json';
import viListing from '@hp/shared/i18n/vi/listing.json';
import viWeb from '@hp/shared/i18n/vi/web.json';
import zhAuth from '@hp/shared/i18n/zh/auth.json';
import zhChat from '@hp/shared/i18n/zh/chat.json';
import zhCommon from '@hp/shared/i18n/zh/common.json';
import zhErrors from '@hp/shared/i18n/zh/errors.json';
import zhGroup from '@hp/shared/i18n/zh/group.json';
import zhListing from '@hp/shared/i18n/zh/listing.json';
import zhWeb from '@hp/shared/i18n/zh/web.json';

type Tree = { [key: string]: string | Tree };

const PLURAL = /^(.+)_(zero|one|two|few|many|other)$/;

/** `{{name}}` → `{name}` */
export function toIcuString(value: string): string {
  return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, '{$1}');
}

/** Đổi một cây i18next sang ICU: placeholder + gộp các key số nhiều `x_one`, `x_other` thành `x`. */
export function toIcu(tree: Tree): Tree {
  const out: Tree = {};
  const plurals: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value !== 'string') {
      out[key] = toIcu(value);
      continue;
    }
    const match = PLURAL.exec(key);
    if (match?.[1] && match[2]) {
      (plurals[match[1]] ??= {})[match[2]] = toIcuString(value).replace(/\{count\}/g, '#');
      continue;
    }
    out[key] = toIcuString(value);
  }
  for (const [base, forms] of Object.entries(plurals)) {
    const cases = Object.entries(forms)
      .map(([form, text]) => `${form} {${text}}`)
      .join(' ');
    out[base] = `{count, plural, ${cases}}`;
  }
  return out;
}

const raw = {
  vi: { common: viCommon, errors: viErrors, listing: viListing, group: viGroup, chat: viChat, auth: viAuth, web: viWeb },
  en: { common: enCommon, errors: enErrors, listing: enListing, group: enGroup, chat: enChat, auth: enAuth, web: enWeb },
  zh: { common: zhCommon, errors: zhErrors, listing: zhListing, group: zhGroup, chat: zhChat, auth: zhAuth, web: zhWeb },
} satisfies Record<Locale, Record<string, Tree>>;

export const messages = Object.fromEntries(
  Object.entries(raw).map(([locale, namespaces]) => [
    locale,
    Object.fromEntries(Object.entries(namespaces).map(([ns, tree]) => [ns, toIcu(tree as Tree)])),
  ]),
) as Record<Locale, Record<keyof (typeof raw)['vi'], Tree>>;
