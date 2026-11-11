'use client';

// "Góp sân mới" (ns group.venue) — style Stitch "Đóng góp sân thể thao mới (ContributeVenueForm)", khớp màn venues/new của
// app (ContributeVenueForm.tsx): đầu dialog có ô icon dịch vụ ghép trận + tiêu đề + dòng phụ → các khối có tiêu đề vạch
// primary: "Môn chơi" (chip, chọn nhiều, mặc định môn đang tạo kèo) → "Tên & địa chỉ sân" → "Giá & liên hệ" (giá tham khảo
// mỗi giờ + SĐT của sân, công khai khi duyệt) → hộp "sau khi gửi" (chờ kiểm duyệt, khu theo hồ sơ, 5 sân / 24 giờ) → Huỷ +
// "Gửi duyệt" (accent như nút đăng kèo).
// Kiểm bằng ContributeVenueInput (@hp/shared) ngay ở trình duyệt để báo lỗi từng ô; ghi qua Server Action
// contributeVenueAction (Zod → đăng nhập → contributeVenue của @hp/core; RLS + trigger giới hạn 5 sân / ngày).
// Sân chờ moderator duyệt nên không chọn được ngay: xong → toast group.venue.submitted, đóng dialog, xoá form.
// Chưa có bản đồ (chờ key Goong) → lat / lng = null.
// Khác Stitch (cố ý): giữ dạng dialog trong form tạo kèo (web không có trang góp sân riêng); không "+50 điểm tín nhiệm" /
// huy hiệu thưởng, chọn xã / khu (server đặt theo hồ sơ), mốc công nghiệp, quy mô sân, khung giờ theo ca, tiện ích, ảnh sân,
// số Zalo, vai trò người gửi (bảng venues không có các cột đó), không hứa "duyệt trong 1–2 giờ"; chỉ 3 môn của danh mục.
import { flattenIssues } from '@hp/core';
import { ContributeVenueInput, GROUP_SUB_KINDS, type GroupSubKind } from '@hp/shared';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { Field } from '@/features/listing/components/listing-form/field';
import { BarHeading } from '@/features/listing/components/safety-tip';
import { contributeVenueAction } from '../actions';
import { GROUP_FEATURE_CONFIGS } from '../features';

type Values = { name: string; sports: GroupSubKind[]; address: string; price: string; phone: string };
type Errors = Record<string, string[]>;

const digits = (s: string) => s.replace(/\D/g, '');
const empty = (sport: GroupSubKind): Values => ({ name: '', sports: [sport], address: '', price: '', phone: '' });
const sportCfg = GROUP_FEATURE_CONFIGS.sport;

function toInput(v: Values): ContributeVenueInput {
  return {
    name: v.name.trim(),
    sports: v.sports.filter((s): s is (typeof GROUP_SUB_KINDS.sport)[number] => (GROUP_SUB_KINDS.sport as readonly string[]).includes(s)),
    address_text: v.address.trim() || null,
    lat: null,
    lng: null,
    price_ref: v.price ? Number(digits(v.price)) : null,
    phone: v.phone.trim() || null,
  };
}

/** Một khối của form: tiêu đề có vạch primary (+ dòng phụ) → nội dung trong khung viền (như FormBlock của group-form). */
function VenueBlock({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <BarHeading as="h3" id={id} tone="primary">
          {title}
        </BarHeading>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">{children}</div>
    </section>
  );
}

export function ContributeVenueDialog({
  open,
  onOpenChange,
  defaultSport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSport: GroupSubKind;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const toast = useToast();
  const id = useId();
  const [values, setValues] = useState<Values>(() => empty(defaultSport));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const err = (key: string) => errors[key]?.[0] ?? null;
  const sportsError = err('sports');

  const change = (patch: Partial<Values>, clear: string) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== clear)));
  };

  // Mở lại → form mới với môn đang tạo kèo (đổi state theo prop khi render, không cần effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(empty(defaultSport));
      setErrors({});
      setFormError(null);
    }
  }

  const submit = async () => {
    const input = toInput(values);
    const parsed = ContributeVenueInput.safeParse(input);
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error.issues));
      setFormError(null);
      return;
    }
    setBusy(true);
    setFormError(null);
    const res = await contributeVenueAction(input);
    setBusy(false);
    if (!res.ok) {
      if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) setErrors(res.fieldErrors);
      else setFormError(res.code);
      return;
    }
    toast.show(t('group.venue.submitted'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent closeLabel={t('common.actions.close')} className="sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3">
          <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-md ${sportCfg.tone.soft}`}>
            <sportCfg.Icon strokeWidth={1.75} className={`size-6 ${sportCfg.tone.fg}`} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle>{t('group.venue.contribute_title')}</DialogTitle>
            <DialogDescription>{t('group.venue.contribute_subtitle')}</DialogDescription>
          </div>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            // Form nằm trong form tạo kèo ở cây React (portal) → chặn sự kiện submit nổi lên form cha.
            e.stopPropagation();
            void submit();
          }}
        >
          <VenueBlock id={`${id}-sports`} title={t('group.venue.sports_label')} note={t('group.venue.sports_hint')}>
            <div role="group" aria-labelledby={`${id}-sports`} aria-describedby={sportsError ? `${id}-sports-error` : undefined} className="flex flex-wrap gap-2">
              {GROUP_SUB_KINDS.sport.map((s) => {
                const selected = values.sports.includes(s);
                return (
                  <ChoiceChip
                    key={s}
                    selected={selected}
                    disabled={busy}
                    onClick={() =>
                      change({ sports: selected ? values.sports.filter((x) => x !== s) : [...values.sports, s] }, 'sports')
                    }
                  >
                    {t(`group.sub_kind.${s}`)}
                  </ChoiceChip>
                );
              })}
            </div>
            {sportsError ? (
              <p id={`${id}-sports-error`} className="text-sm text-danger">
                {errorText(sportsError)}
              </p>
            ) : null}
          </VenueBlock>

          <VenueBlock id={`${id}-place`} title={t('group.venue.section_place')}>
            <Field label={t('group.venue.name_label')} error={err('name')}>
              {(control) => (
                <Input
                  {...control}
                  value={values.name}
                  maxLength={120}
                  autoComplete="off"
                  placeholder={t('group.form.venue_placeholder')}
                  disabled={busy}
                  onChange={(e) => change({ name: e.target.value }, 'name')}
                />
              )}
            </Field>
            <Field label={t('group.venue.address_label')} error={err('address_text')} optional>
              {(control) => (
                <Textarea
                  {...control}
                  value={values.address}
                  maxLength={200}
                  rows={2}
                  className="min-h-20"
                  autoComplete="off"
                  placeholder={t('group.venue.address_placeholder')}
                  disabled={busy}
                  onChange={(e) => change({ address: e.target.value }, 'address_text')}
                />
              )}
            </Field>
          </VenueBlock>

          <VenueBlock id={`${id}-contact`} title={t('group.venue.section_contact')} note={t('group.form.optional')}>
            <Field label={t('group.venue.price_label')} error={err('price_ref')}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.price}
                  disabled={busy}
                  onChange={(e) => change({ price: digits(e.target.value) }, 'price_ref')}
                />
              )}
            </Field>
            <Field label={t('group.venue.phone_label')} hint={t('group.venue.phone_hint')} error={err('phone')}>
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={values.phone}
                  maxLength={16}
                  disabled={busy}
                  onChange={(e) => change({ phone: e.target.value }, 'phone')}
                />
              )}
            </Field>
          </VenueBlock>

          <aside role="note" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary-light p-4">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Info strokeWidth={1.75} className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-md font-semibold text-fg">{t('group.venue.contribute_hint')}</p>
              <p className="text-md text-muted">{t('group.venue.review_body')}</p>
            </div>
          </aside>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
              {errorText(formError)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" variant="accent" disabled={busy} aria-busy={busy || undefined}>
              {t('group.venue.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
