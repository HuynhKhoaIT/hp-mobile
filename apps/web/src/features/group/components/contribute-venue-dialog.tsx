'use client';

// "Góp sân mới" (ns group.venue): tên · môn chơi (chip, chọn nhiều, mặc định môn đang tạo kèo) · địa chỉ · giá tham khảo
// mỗi giờ · SĐT của sân. Kiểm bằng ContributeVenueInput (@hp/shared) ngay ở trình duyệt để báo lỗi từng ô; ghi qua Server
// Action contributeVenueAction (Zod → đăng nhập → contributeVenue của @hp/core; RLS + trigger giới hạn 5 sân / ngày).
// Sân chờ moderator duyệt nên không chọn được ngay: xong → toast group.venue.submitted, đóng dialog, xoá form.
// Chưa có bản đồ (chờ key Goong) → lat / lng = null.
import { flattenIssues } from '@hp/core';
import { ContributeVenueInput, GROUP_SUB_KINDS, type GroupSubKind } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { ChoiceField, Field } from '@/features/listing/components/listing-form/field';
import { contributeVenueAction } from '../actions';

type Values = { name: string; sports: GroupSubKind[]; address: string; price: string; phone: string };
type Errors = Record<string, string[]>;

const digits = (s: string) => s.replace(/\D/g, '');
const empty = (sport: GroupSubKind): Values => ({ name: '', sports: [sport], address: '', price: '', phone: '' });

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
  const [values, setValues] = useState<Values>(() => empty(defaultSport));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const err = (key: string) => errors[key]?.[0] ?? null;

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
      <DialogContent closeLabel={t('common.actions.close')} className="max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('group.venue.contribute_title')}</DialogTitle>
          <DialogDescription>{t('group.venue.contribute_hint')}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            // Form nằm trong form tạo kèo ở cây React (portal) → chặn sự kiện submit nổi lên form cha.
            e.stopPropagation();
            void submit();
          }}
        >
          <Field label={t('group.venue.name_label')} error={err('name')}>
            {(control) => (
              <Input
                {...control}
                value={values.name}
                maxLength={120}
                autoComplete="off"
                disabled={busy}
                onChange={(e) => change({ name: e.target.value }, 'name')}
              />
            )}
          </Field>
          <ChoiceField label={t('group.venue.sports_label')} error={err('sports')}>
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
          </ChoiceField>
          <Field label={t('group.venue.address_label')} error={err('address_text')} optional>
            {(control) => (
              <Input
                {...control}
                value={values.address}
                maxLength={200}
                autoComplete="off"
                disabled={busy}
                onChange={(e) => change({ address: e.target.value }, 'address_text')}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('group.venue.price_label')} error={err('price_ref')} optional>
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
            <Field label={t('group.venue.phone_label')} error={err('phone')} optional>
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
          </div>
          {formError ? (
            <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
              {errorText(formError)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
              {t('group.venue.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
