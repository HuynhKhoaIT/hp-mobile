'use client';

// Banner (chỉ admin): danh sách theo vị trí (trang chủ app / web, danh sách web) — tiêu đề, ngôn ngữ, khung giờ, thứ tự,
// bật / tắt; tạo / sửa (chữ, link nội bộ `/…` hoặc https, tông màu, khung giờ). Ảnh banner chưa hỗ trợ trên web
// (cần upload bucket `banners` — docs/plan/web.md 3l). Không xoá: tắt banner.
import { type AdminBanner, BANNER_PLACEMENTS, BANNER_TONES } from '@hp/core';
import { formatDate, LOCALES } from '@hp/shared';
import { Megaphone, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asLocale } from '@/features/listing/display';
import { useAdminAction } from '../../lib/use-admin-action';
import { saveBannerAction, setBannerActiveAction } from '../actions';

/** ISO → giá trị ô datetime-local theo giờ máy người xem. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function liveState(b: AdminBanner, now: number): 'live' | 'scheduled' | 'ended' | 'off' {
  if (!b.is_active) return 'off';
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return 'scheduled';
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return 'ended';
  return 'live';
}

export function BannersPanel({ banners, now }: { banners: AdminBanner[]; now: number }) {
  const t = useTranslations('admin.marketing');
  const tLocale = useTranslations('common.locale');
  const locale = asLocale(useLocale());
  const { pending, run } = useAdminAction();
  const [editing, setEditing] = useState<AdminBanner | 'new' | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-md text-muted">{t('hint')}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus strokeWidth={1.75} aria-hidden />
          {t('add')}
        </Button>
      </div>
      {banners.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState icon={Megaphone} title={t('empty_title')} description={t('empty_body')} />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {banners.map((b) => {
            const state = liveState(b, now);
            return (
              <li key={b.id} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{t(`placement.${b.placement}`)}</Badge>
                    <Badge>{b.locale ? tLocale(b.locale) : t('all_locales')}</Badge>
                    <StatusBadge kind="toggle" status={state === 'live' ? 'on' : 'off'} label={t(`state.${state}`)} />
                  </span>
                  <span className="truncate font-medium text-fg">{b.title}</span>
                  {b.subtitle ? <span className="truncate text-sm text-muted">{b.subtitle}</span> : null}
                  <span className="text-sm text-muted">
                    {t('window', {
                      from: b.starts_at ? formatDate(b.starts_at, locale, 'datetime') : t('no_start'),
                      to: b.ends_at ? formatDate(b.ends_at, locale, 'datetime') : t('no_end'),
                    })}
                    {' · '}
                    {t('sort', { sort: b.sort })}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                    {t('edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant={b.is_active ? 'destructive' : 'outline'}
                    disabled={pending}
                    onClick={() =>
                      run(() => setBannerActiveAction({ id: b.id, active: !b.is_active }), {
                        success: b.is_active ? t('toast.disabled', { title: b.title }) : t('toast.enabled', { title: b.title }),
                      })
                    }
                  >
                    {b.is_active ? t('disable') : t('enable')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? <BannerForm key={editing === 'new' ? 'new' : editing.id} banner={editing === 'new' ? null : editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
    </div>
  );
}

function BannerForm({ banner, onDone }: { banner: AdminBanner | null; onDone: () => void }) {
  const t = useTranslations('admin.marketing');
  const tLocale = useTranslations('common.locale');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const { pending, run } = useAdminAction();
  const [active, setActive] = useState(banner?.is_active ?? true);

  return (
    <DialogContent className="sm:max-w-xl" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const str = (k: string) => String(f.get(k) ?? '').trim();
          const when = (k: string) => (str(k) ? new Date(str(k)).toISOString() : null);
          run(
            () =>
              saveBannerAction({
                ...(banner ? { id: banner.id } : {}),
                placement: str('placement'),
                locale: str('locale') || null,
                title: str('title'),
                subtitle: str('subtitle') || null,
                ctaLabel: str('cta') || null,
                linkUrl: str('link') || null,
                tone: str('tone'),
                startsAt: when('starts'),
                endsAt: when('ends'),
                isActive: active,
                sort: Number(str('sort') || 0),
              }),
            { success: banner ? t('toast.saved') : t('toast.created'), onDone },
          );
        }}
      >
        <DialogHeader>
          <DialogTitle>{banner ? t('form.edit_title', { title: banner.title }) : t('form.new_title')}</DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-placement`}>{t('form.placement')}</Label>
            <select id={`${id}-placement`} name="placement" defaultValue={banner?.placement ?? 'web_home'} className={SELECT_CLASS}>
              {BANNER_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {t(`placement.${p}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-locale`}>{t('form.locale')}</Label>
            <select id={`${id}-locale`} name="locale" defaultValue={banner?.locale ?? ''} className={SELECT_CLASS}>
              <option value="">{t('all_locales')}</option>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {tLocale(l)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-title`}>{t('form.title')}</Label>
          <Input id={`${id}-title`} name="title" required maxLength={80} defaultValue={banner?.title ?? ''} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-subtitle`}>{t('form.subtitle')}</Label>
          <Input id={`${id}-subtitle`} name="subtitle" maxLength={160} defaultValue={banner?.subtitle ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-cta`}>{t('form.cta')}</Label>
            <Input id={`${id}-cta`} name="cta" maxLength={30} defaultValue={banner?.cta_label ?? ''} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-link`}>{t('form.link')}</Label>
            <Input id={`${id}-link`} name="link" maxLength={300} placeholder="/tro" pattern="(/\S*|https://\S+)" defaultValue={banner?.link_url ?? ''} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-tone`}>{t('form.tone')}</Label>
            <select id={`${id}-tone`} name="tone" defaultValue={banner?.tone ?? 'primary'} className={SELECT_CLASS}>
              {BANNER_TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {t(`tone.${tone}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-starts`}>{t('form.starts')}</Label>
            <Input id={`${id}-starts`} name="starts" type="datetime-local" defaultValue={toLocalInput(banner?.starts_at ?? null)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-ends`}>{t('form.ends')}</Label>
            <Input id={`${id}-ends`} name="ends" type="datetime-local" defaultValue={toLocalInput(banner?.ends_at ?? null)} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex w-32 flex-col gap-2">
            <Label htmlFor={`${id}-sort`}>{t('form.sort')}</Label>
            <Input id={`${id}-sort`} name="sort" type="number" step={1} defaultValue={banner?.sort ?? 0} />
          </div>
          <label className="flex min-h-12 items-center gap-3">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
            {t('form.active')}
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {banner ? t('form.save') : t('form.create')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
