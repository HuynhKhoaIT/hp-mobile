// generateMetadata của danh sách và chi tiết nhóm (.claude/rules/web-seo-public.md): title, description, canonical +
// hreflang (vi / en / zh / x-default), Open Graph. robots: có từ khoá hoặc lọc sâu (> 2 tham số) → noindex.
// Toàn site đang noindex ở layout gốc tới khi ra mắt (tuần 11) — trang không ghi đè thành index.
import type { PublicGroup } from '@hp/core';
import { APP_NAME, type GroupKind } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import { absoluteUrl, localeAlternates } from '@/i18n/alternates';
import { groupFeeText, groupPlaceText, groupTimeText } from './display';
import { GROUP_FEATURE_CONFIGS } from './features';
import { groupFilterCount, groupFilterQuery, parseGroupFilters } from './filters';

type RawParams = Record<string, string | string[] | undefined>;

const withQuery = (path: string, query: Record<string, string>) => {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
};

export async function groupListMetadata(kind: GroupKind, searchParams: Promise<RawParams>): Promise<Metadata> {
  const { path } = GROUP_FEATURE_CONFIGS[kind];
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const filters = parseGroupFilters(await searchParams, kind);
  const title = t(`web.group.${kind}.title`);
  const description = t(`web.group.${kind}.description`);
  // Canonical giữ loại con (trang có nội dung riêng), bỏ từ khoá / khoảng giờ / "hiện cả nhóm đủ".
  const canonicalPath = withQuery(path, groupFilterQuery({ sub: filters.sub }));

  return {
    title,
    description,
    alternates: localeAlternates(canonicalPath, locale),
    openGraph: { type: 'website', siteName: APP_NAME, title, description, url: absoluteUrl(canonicalPath, locale), locale },
    twitter: { card: 'summary' },
    ...(filters.query || groupFilterCount(filters) > 2 ? { robots: { index: false, follow: true } } : {}),
  };
}

/** "{tiêu đề} – {giờ} – {khu vực}" (layout thêm " | {APP_NAME}"). */
export async function groupMetadata(group: PublicGroup): Promise<Metadata> {
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const time = groupTimeText(group, locale);
  const title = [group.title, time, group.site_name].filter(Boolean).join(' – ');
  const body = group.description?.replace(/\s+/g, ' ').trim();
  const description = body
    ? body.length > 160
      ? `${body.slice(0, 157)}…`
      : body
    : [t(`group.sub_kind.${group.sub_kind}`), groupPlaceText(group, t), groupFeeText(group, t, locale)].join(' · ');
  const path = `/nhom/${group.slug ?? ''}`;

  return {
    title,
    description,
    alternates: localeAlternates(path, locale),
    openGraph: { type: 'article', siteName: APP_NAME, title, description, url: absoluteUrl(path, locale), locale },
    twitter: { card: 'summary' },
  };
}
