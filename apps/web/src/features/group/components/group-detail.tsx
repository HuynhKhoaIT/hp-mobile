// Chi tiết nhóm — thứ tự khớp app: badge + tiêu đề + giờ → hành động (Tham gia / quản lý) → thông tin (giờ, điểm đi / đến
// hoặc sân, chi phí, thông tin thêm) → thành viên → ghi chú → người tạo nhóm → lời nhắc an toàn.
// ≥ 1024px: 2 cột — thông tin trái; hành động, người tạo, lời nhắc dính bên phải. Điện thoại: một cột đúng thứ tự trên
// (khối `contents` + `order` như chi tiết tin, không lặp DOM).
// Trang công khai: không SĐT, không toạ độ (kể cả đã làm tròn — chưa có bản đồ), tên người tạo / thành viên đã rút gọn ở view.
// Ghép trận chọn sân trong danh mục: tên + địa chỉ sân (venue_name / venue_address của public_groups; không SĐT sân).
// Kèo khai đội có sẵn (attributes.players_have → groupLineup): dòng "Đội hình" (render ở server — thông tin công khai).
// Nhóm đủ người / đã tới giờ / đã xong / đã huỷ: banner trạng thái (200, vẫn xem được); JSON-LD Event giữ, huỷ → EventCancelled.
// Phần tương tác (thành viên "sống", nút theo vai trò) là client island trong <ClientOnly> — HTML server có bản cache.
import type { PublicGroup } from '@hp/core';
import { GROUP_ATTRIBUTE_FIELDS, groupDisplayStatus, groupLineup, formatDate, formatNumber } from '@hp/shared';
import { ChevronLeft, CircleDot, Clock, Info, MapPin, ShieldAlert, Users, Wallet } from 'lucide-react';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { JsonLd } from '@/components/shared/json-ld';
import { asLocale, type Translate } from '@/features/listing/display';
import { absoluteUrl } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import { profileAvatarUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { GROUP_STATUS_TONE, groupFeeText, groupStatusKey, groupTimeText, groupVenueText, toClientGroup } from '../display';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { groupJsonLd } from '../json-ld';
import { GroupActions } from './group-actions';
import { GroupMembers } from './group-members';

/** Thông tin thêm theo kind (GROUP_ATTRIBUTE_FIELDS): chỉ trường có giá trị; bool → Có / Không. */
type AttributeRow = { key: string; label: string; value: string };

function attributeRows(group: PublicGroup, t: Translate): AttributeRow[] {
  const attrs = (group.attributes && typeof group.attributes === 'object' && !Array.isArray(group.attributes)
    ? group.attributes
    : {}) as Record<string, unknown>;
  const fields: readonly (typeof GROUP_ATTRIBUTE_FIELDS)[keyof typeof GROUP_ATTRIBUTE_FIELDS][number][] = GROUP_ATTRIBUTE_FIELDS[group.kind];
  return fields.flatMap((field): AttributeRow[] => {
    const v = attrs[field.key];
    if (field.kind === 'bool' && typeof v === 'boolean') {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: t(`listing.attr_value.bool.${v ? 'yes' : 'no'}`) }];
    }
    if (field.kind === 'enum' && typeof v === 'string' && (field.options as readonly string[]).includes(v)) {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: t(`group.attr_value.${field.key}.${v}`) }];
    }
    if (field.kind === 'text' && typeof v === 'string' && v.trim()) {
      return [{ key: field.key, label: t(`group.attr.${field.key}`), value: v.trim() }];
    }
    return [];
  });
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="relative border-b border-border py-3 pl-8">
      <dt className="text-sm text-muted">
        <span className="absolute top-3.5 left-0 text-muted">{icon}</span>
        {label}
      </dt>
      <dd className="text-md font-medium text-fg">{children}</dd>
    </div>
  );
}

export async function GroupDetail({ group, now }: { group: PublicGroup; now: number }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const cfg = GROUP_FEATURE_CONFIGS[group.kind];
  const status = groupDisplayStatus(group, new Date(now));
  const subKindName = t(`group.sub_kind.${group.sub_kind}`);
  const jsonLd = groupJsonLd(group, cfg.jsonLd, { url: absoluteUrl(`/nhom/${group.slug ?? ''}`, locale), subKindName });
  const attributes = attributeRows(group, t);
  const lineup = groupLineup(group.kind, group.attributes, group.seats_total, group.seats_taken);
  const clientGroup = toClientGroup(group);
  const iconClass = 'size-5';
  const hostAvatar = profileAvatarUrl(group.host_avatar_url);
  const hostName = group.host_name ?? '';
  const statusNote =
    status === 'cancelled'
      ? t('group.detail.cancelled_note')
      : status === 'started'
        ? t('group.detail.started_note')
        : status !== 'open'
          ? t(`group.status.${status}`)
          : null;

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <nav>
        <Link
          href={cfg.path}
          className="inline-flex min-h-11 items-center gap-1 rounded-md text-md font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft strokeWidth={1.75} className="size-5" aria-hidden />
          {t('group.detail.back_to_list')}
        </Link>
      </nav>

      {statusNote ? (
        <div
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-md p-4 text-md text-fg',
            status === 'cancelled' ? 'bg-danger/10' : 'bg-surface-2',
          )}
        >
          <Info strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <p className="font-semibold">{statusNote}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Cột trái. Điện thoại: `contents` để các khối con xếp theo order xen với cột phải. */}
        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
          <header className="order-1 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('flex size-10 items-center justify-center rounded-md', cfg.tone.soft)}>
                <cfg.Icon aria-hidden strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
              </span>
              <Badge>{subKindName}</Badge>
              <Badge tone={GROUP_STATUS_TONE[status]}>{t(`group.status.${groupStatusKey(group, status)}`)}</Badge>
              {group.lang !== locale ? (
                <Badge tone="primary" lang={group.lang}>
                  {t(`common.locale.${group.lang}`)}
                </Badge>
              ) : null}
            </div>
            <h1 lang={group.lang} className="text-2xl font-semibold text-fg">
              {group.title}
            </h1>
            <p className="flex items-center gap-2 text-lg font-semibold text-fg">
              <Clock strokeWidth={1.75} aria-hidden className="size-5 shrink-0 text-muted" />
              <time dateTime={group.starts_at}>{groupTimeText(group, locale)}</time>
            </p>
          </header>

          <section aria-labelledby="info-heading" className="order-3 flex flex-col gap-1">
            <h2 id="info-heading" className="sr-only">
              {t(`group.detail.title_${group.kind}`)}
            </h2>
            <dl className="flex flex-col">
              {cfg.hasDestination ? (
                <>
                  <InfoRow icon={<CircleDot aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.from')}>
                    {group.origin_text}
                  </InfoRow>
                  {group.destination_text ? (
                    <InfoRow icon={<MapPin aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.to')}>
                      {group.destination_text}
                    </InfoRow>
                  ) : null}
                </>
              ) : (
                <InfoRow icon={<MapPin aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.venue')}>
                  {groupVenueText(group)}
                  {group.venue_id && group.venue_address?.trim() ? (
                    <span className="block text-sm font-normal text-muted">{group.venue_address}</span>
                  ) : null}
                </InfoRow>
              )}
              {lineup ? (
                <InfoRow icon={<Users aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.lineup')}>
                  {lineup.need > 0
                    ? t('group.detail.lineup_value', { have: lineup.have, total: lineup.total, count: lineup.need })
                    : t('group.detail.lineup_full', { total: lineup.total })}
                </InfoRow>
              ) : null}
              <InfoRow icon={<Wallet aria-hidden strokeWidth={1.75} className={iconClass} />} label={t('group.detail.fee')}>
                {groupFeeText(group, t, locale)}
              </InfoRow>
            </dl>
            {group.site_name ? <p className="pt-2 text-sm text-muted">{group.site_name}</p> : null}
          </section>

          {attributes.length > 0 ? (
            <section aria-labelledby="attributes-heading" className="order-4 flex flex-col gap-2">
              <h2 id="attributes-heading" className="text-lg font-semibold text-fg">
                {t('group.detail.attributes')}
              </h2>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                {attributes.map((a) => (
                  <div key={a.key} className="flex justify-between gap-4 border-b border-border py-3">
                    <dt className="text-md text-muted">{a.label}</dt>
                    <dd lang={a.key === 'vehicle_note' ? group.lang : undefined} className="text-right text-md font-medium text-fg">
                      {a.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className="order-5">
            <GroupMembers group={clientGroup} />
          </div>

          <section aria-labelledby="description-heading" className="order-6 flex flex-col gap-2">
            <h2 id="description-heading" className="text-lg font-semibold text-fg">
              {t('group.detail.description')}
            </h2>
            {group.description?.trim() ? (
              <p lang={group.lang} className="text-md whitespace-pre-line text-fg">
                {group.description}
              </p>
            ) : (
              <p className="text-md text-muted">{t('group.detail.no_description')}</p>
            )}
          </section>
        </div>

        {/* Cột phải (desktop, dính khi cuộn). */}
        <div className="contents lg:sticky lg:top-20 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <div className="order-2">
            <GroupActions group={clientGroup} />
          </div>

          <section aria-labelledby="host-heading" className="order-7 flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
            <h2 id="host-heading" className="text-sm font-medium text-muted">
              {t('group.detail.host')}
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-primary-light">
                {hostAvatar ? (
                  <Image src={hostAvatar} alt="" fill unoptimized sizes="48px" className="object-cover" />
                ) : (
                  <span aria-hidden className="flex size-full items-center justify-center text-lg font-semibold text-primary">
                    {hostName.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-md font-semibold text-fg">{hostName}</p>
                <p className="text-sm text-muted">
                  {t('listing.detail.member_since', { date: formatDate(group.host_since, locale) })}
                </p>
                <p className="text-sm text-muted">
                  {group.host_rating_count > 0
                    ? t('listing.detail.rating', {
                        avg: formatNumber(Math.round(group.host_rating_avg * 10) / 10, locale),
                        count: group.host_rating_count,
                      })
                    : t('listing.detail.no_rating')}
                </p>
              </div>
            </div>
            {group.host_badges.some((b) => t.has(`listing.owner_badge.${b}`)) ? (
              <ul className="flex flex-wrap gap-1">
                {group.host_badges
                  .filter((b) => t.has(`listing.owner_badge.${b}`))
                  .map((b) => (
                    <li key={b}>
                      <Badge tone="success">{t(`listing.owner_badge.${b}`)}</Badge>
                    </li>
                  ))}
              </ul>
            ) : null}
          </section>

          <p role="note" className="order-8 flex items-start gap-3 rounded-md bg-warning/15 p-3 text-md text-fg">
            <ShieldAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
            {t('group.detail.safety_tip')}
          </p>
        </div>
      </div>
    </article>
  );
}
