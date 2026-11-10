'use client';

// Form tạo nhóm (/tao-nhom/[kind]) — một engine cho ghép xe / ghép trận, khác biệt lấy từ config (features.ts) +
// GROUP_ATTRIBUTE_FIELDS. Thứ tự ô và chữ khớp app (ns group.form):
//   loại (chip) → điểm đi + điểm đến (+ chọn nhanh RIDE_PLACES, đặt toạ độ để lọc theo điểm đến) | sân (VenuePicker: danh
//   mục sân đã duyệt → venue_id + origin_text = tên sân; "Sân khác" tự nhập → venue_id = null; góp sân mới) → ngày + giờ
//   (input date / time gốc của trình duyệt, giờ máy người dùng) → số chỗ (1..maxSeatsFor) → chi phí / người → đội đã có
//   sẵn (chỉ cfg.hasLineup — ghép trận: attributes.players_have, LineupField) → tiêu đề
//   (ghép xe để trống: "điểm đi → điểm đến") → ghi chú → duyệt người tham gia → thông tin thêm.
// Kiểm bằng CreateGroupInput (@hp/shared) ngay ở trình duyệt để báo lỗi từng ô; ghi qua Server Action createGroupAction
// (cùng cách /dang-tin). Thành công → /nhom/{slug}. Lỗi DB (starts_too_soon, rate_limited, banned…) → errors.<code>.
import { flattenIssues } from '@hp/core';
import {
  CreateGroupInput,
  formatMoney,
  GROUP_ATTRIBUTE_FIELDS,
  GROUP_RULES,
  type GroupKind,
  type GroupSubKind,
  type Locale,
  maxSeatsFor,
  RIDE_PLACES,
  rideTitle,
  SKILL_LEVELS,
  type SkillLevel,
} from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState, useSyncExternalStore } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { ClientOnly } from '@/components/shared/client-only';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { ChoiceField, Field } from '@/features/listing/components/listing-form/field';
import { Link, useRouter } from '@/i18n/navigation';
import { createGroupAction } from '../actions';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { LineupField } from './lineup-field';
import { type PickedVenue, type VenueMode, VenuePicker } from './venue-picker';

type Values = {
  sub_kind: GroupSubKind;
  origin_text: string;
  destination_text: string;
  /** RIDE_PLACES.id đã chọn nhanh (đặt toạ độ điểm đến); gõ tay → null. */
  destination_place: string | null;
  /** Ghép trận: sân chọn trong danh mục (mode catalog) hoặc tự nhập vào origin_text (mode custom). */
  venue: PickedVenue | null;
  venue_mode: VenueMode;
  date: string;
  time: string;
  seats: string;
  fee: string;
  title: string;
  description: string;
  requires_approval: boolean;
  luggage_ok: boolean;
  stops_ok: boolean;
  vehicle_note: string;
  skill_level: SkillLevel | '';
  /** Đội đã có sẵn (tính cả chủ nhóm), chỉ khi cfg.hasLineup; null = chưa bật → không gửi khoá. */
  players_have: string | null;
};

type Errors = Record<string, string[]>;

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const digits = (s: string) => s.replace(/\D/g, '');

/** Ngày hôm nay / ngày xa nhất cho <input type="date"> — chỉ có ở trình duyệt (server: rỗng, không đặt min / max). */
const noSubscribe = () => () => undefined;
function useDateBounds(): { min: string; max: string } | null {
  const min = useSyncExternalStore(noSubscribe, () => localDate(new Date()), () => '');
  const max = useSyncExternalStore(noSubscribe, () => localDate(new Date(Date.now() + GROUP_RULES.maxDaysAhead * DAY_MS)), () => '');
  return min ? { min, max } : null;
}

function initialValues(kind: GroupKind, defaultOrigin: string): Values {
  return {
    sub_kind: GROUP_FEATURE_CONFIGS[kind].subKinds[0] ?? 'car_owner',
    origin_text: kind === 'ride' ? defaultOrigin : '',
    destination_text: '',
    destination_place: null,
    venue: null,
    venue_mode: 'catalog',
    date: '',
    time: '',
    seats: kind === 'ride' ? '3' : '4',
    fee: '0',
    title: '',
    description: '',
    requires_approval: true,
    luggage_ok: false,
    stops_ok: false,
    vehicle_note: '',
    skill_level: '',
    players_have: null,
  };
}

/** Giá trị form → input của CreateGroupInput (giờ: ngày + giờ theo máy người dùng → ISO UTC). */
function buildInput(kind: GroupKind, v: Values, lang: Locale) {
  const place = RIDE_PLACES.find((p) => p.id === v.destination_place);
  const startsAt = v.date && v.time ? new Date(`${v.date}T${v.time}`) : null;
  // Ghép trận chọn sân trong danh mục → nơi chơi = tên sân; tự nhập → chữ người dùng gõ, không venue_id.
  const venue = kind === 'sport' && v.venue_mode === 'catalog' ? v.venue : null;
  const origin = venue ? venue.name : kind === 'sport' && v.venue_mode === 'catalog' ? '' : v.origin_text.trim();
  const destination = v.destination_text.trim();
  const attributes: Record<string, unknown> =
    kind === 'ride'
      ? {
          ...(v.luggage_ok ? { luggage_ok: true } : {}),
          ...(v.stops_ok ? { stops_ok: true } : {}),
          ...(v.vehicle_note.trim() ? { vehicle_note: v.vehicle_note.trim() } : {}),
        }
      : {
          ...(v.skill_level ? { skill_level: v.skill_level } : {}),
          ...(GROUP_FEATURE_CONFIGS[kind].hasLineup && v.players_have !== null
            ? { players_have: Number(digits(v.players_have)) }
            : {}),
        };
  return {
    kind,
    sub_kind: v.sub_kind,
    title: v.title.trim() || (kind === 'ride' && origin && destination ? rideTitle(origin, destination) : ''),
    description: v.description.trim() || null,
    starts_at: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : '',
    seats_total: v.seats ? Number(digits(v.seats)) : 0,
    fee_per_person: v.fee ? Number(digits(v.fee)) : 0,
    origin_text: origin,
    destination_text: kind === 'ride' ? destination || null : null,
    destination_lat: kind === 'ride' && place ? place.lat : null,
    destination_lng: kind === 'ride' && place ? place.lng : null,
    venue_id: venue?.id ?? null,
    attributes,
    requires_approval: v.requires_approval,
    lang,
  };
}

export function GroupForm({
  kind,
  defaultOrigin,
  site,
  lang,
}: {
  kind: GroupKind;
  defaultOrigin: string;
  /** Khu trong hồ sơ (lọc danh mục sân); null = chưa chọn khu. */
  site: string | null;
  lang: Locale;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const cfg = GROUP_FEATURE_CONFIGS[kind];
  const bounds = useDateBounds();
  const approvalId = useId();
  const [values, setValues] = useState<Values>(() => initialValues(kind, defaultOrigin));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const maxSeats = maxSeatsFor(kind, values.sub_kind);
  const fee = Number(digits(values.fee));

  const change = (patch: Partial<Values>, clear: string[] = []) => {
    setValues((v) => ({ ...v, ...patch }));
    if (clear.length > 0) {
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !clear.includes(k))));
    }
  };
  const err = (key: string) => errors[key]?.[0] ?? null;

  const submit = async () => {
    const input = buildInput(kind, values, lang);
    const parsed = CreateGroupInput.safeParse(input);
    const fieldErrors: Errors = parsed.success ? {} : flattenIssues(parsed.error.issues);
    if (!values.date || !values.time) fieldErrors.starts_at = ['required'];
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setFormError('form_invalid');
      return;
    }
    setBusy(true);
    setFormError(null);
    const res = await createGroupAction(input);
    if (!res.ok) {
      setBusy(false);
      setFormError(res.code);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      return;
    }
    toast.show(t(`group.form.success_title_${kind}`));
    router.push(res.data.slug ? `/nhom/${res.data.slug}` : `/nhom/id/${res.data.id}`);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h1 className="text-2xl font-semibold text-fg">{t(`group.form.title_${kind}`)}</h1>

      <div className="flex flex-col gap-5 rounded-lg bg-surface p-4 shadow-card sm:p-6">
        <ChoiceField label={t(`group.form.sub_kind_label_${kind}`)} error={err('sub_kind')}>
          {cfg.subKinds.map((s) => (
            <ChoiceChip
              key={s}
              selected={values.sub_kind === s}
              disabled={busy}
              onClick={() => {
                const max = maxSeatsFor(kind, s);
                const seats = Number(digits(values.seats));
                // Sân đã chọn không có môn mới → bỏ chọn (trigger cũng báo invalid_venue).
                const dropVenue = !!values.venue && !(values.venue.sports as readonly string[]).includes(s);
                change(
                  { sub_kind: s, ...(seats > max ? { seats: String(max) } : {}), ...(dropVenue ? { venue: null } : {}) },
                  ['sub_kind', 'seats_total', 'venue_id'],
                );
              }}
            >
              {t(`group.sub_kind.${s}`)}
            </ChoiceChip>
          ))}
        </ChoiceField>

        {cfg.hasDestination ? (
          <>
            <Field label={t('group.form.origin_label')} hint={t('group.form.origin_hint')} error={err('origin_text')}>
              {(control) => (
                <Input
                  {...control}
                  value={values.origin_text}
                  maxLength={GROUP_RULES.placeMax}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(e) => change({ origin_text: e.target.value }, ['origin_text', 'title'])}
                />
              )}
            </Field>
            <Field label={t('group.form.destination_label')} error={err('destination_text')}>
              {(control) => (
                <Input
                  {...control}
                  value={values.destination_text}
                  maxLength={GROUP_RULES.placeMax}
                  placeholder={t('group.form.destination_placeholder')}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(e) =>
                    change({ destination_text: e.target.value, destination_place: null }, ['destination_text', 'title'])
                  }
                />
              )}
            </Field>
            <ChoiceField label={t('group.form.places_quick')} optional>
              {RIDE_PLACES.map((p) => (
                <ChoiceChip
                  key={p.id}
                  selected={values.destination_place === p.id}
                  disabled={busy}
                  onClick={() => change({ destination_text: p.name, destination_place: p.id }, ['destination_text', 'title'])}
                >
                  {p.name}
                </ChoiceChip>
              ))}
            </ChoiceField>
          </>
        ) : (
          <ClientOnly fallback={<VenuePickerSkeleton />}>
            <VenuePicker
              sport={values.sub_kind}
              site={site}
              locale={lang}
              mode={values.venue_mode}
              venue={values.venue}
              customText={values.origin_text}
              error={err('origin_text') ?? err('venue_id')}
              disabled={busy}
              onPick={(venue) => change({ venue }, ['origin_text', 'venue_id'])}
              onModeChange={(venue_mode) => change({ venue_mode }, ['origin_text', 'venue_id'])}
              onCustomTextChange={(origin_text) => change({ origin_text }, ['origin_text', 'venue_id'])}
            />
          </ClientOnly>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-md font-medium text-fg">{t(`group.form.starts_at_label_${kind}`)}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('group.form.date_label')}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={values.date}
                  min={bounds?.min}
                  max={bounds?.max}
                  disabled={busy}
                  aria-invalid={err('starts_at') ? true : undefined}
                  onChange={(e) => change({ date: e.target.value }, ['starts_at'])}
                />
              )}
            </Field>
            <Field label={t('group.form.time_label')}>
              {(control) => (
                <Input
                  {...control}
                  type="time"
                  value={values.time}
                  disabled={busy}
                  aria-invalid={err('starts_at') ? true : undefined}
                  onChange={(e) => change({ time: e.target.value }, ['starts_at'])}
                />
              )}
            </Field>
          </div>
          {err('starts_at') ? (
            <p className="text-sm text-danger">{errorText(err('starts_at'))}</p>
          ) : (
            <p className="text-sm text-muted">{t('web.group.starts_hint')}</p>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t(`group.form.seats_label_${kind}`)}
            hint={`${values.sub_kind === 'motorbike' ? t('group.form.seats_hint_motorbike') : t('group.form.seats_hint')} ${t('web.group.seats_max', { max: maxSeats })}`}
            error={err('seats_total')}
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                min={1}
                max={maxSeats}
                step={1}
                value={values.seats}
                disabled={busy}
                onChange={(e) => change({ seats: digits(e.target.value) }, ['seats_total'])}
              />
            )}
          </Field>
          <Field
            label={t('group.form.fee_label')}
            hint={fee > 0 ? formatMoney(fee, lang) : t(`group.form.fee_hint_${kind}`)}
            error={err('fee_per_person')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                autoComplete="off"
                value={values.fee}
                disabled={busy}
                onChange={(e) => change({ fee: digits(e.target.value) }, ['fee_per_person'])}
              />
            )}
          </Field>
        </div>

        {cfg.hasLineup ? (
          <LineupField
            value={values.players_have}
            seats={Number(digits(values.seats))}
            error={err('attributes.players_have')}
            disabled={busy}
            onChange={(players_have) => change({ players_have }, ['attributes.players_have'])}
          />
        ) : null}

        <Field
          label={t('group.form.title_label')}
          hint={kind === 'ride' ? t('group.form.title_hint_auto') : undefined}
          error={err('title')}
          optional={kind === 'ride'}
        >
          {(control) => (
            <Input
              {...control}
              value={values.title}
              maxLength={GROUP_RULES.titleMax}
              autoComplete="off"
              disabled={busy}
              placeholder={
                kind === 'ride' && values.origin_text.trim() && values.destination_text.trim()
                  ? rideTitle(values.origin_text.trim(), values.destination_text.trim())
                  : undefined
              }
              onChange={(e) => change({ title: e.target.value }, ['title'])}
            />
          )}
        </Field>

        <Field
          label={t('group.form.description_label')}
          hint={t(`group.form.description_hint_${kind}`)}
          error={err('description')}
          optional
        >
          {(control) => (
            <Textarea
              {...control}
              value={values.description}
              maxLength={GROUP_RULES.descriptionMax}
              rows={4}
              disabled={busy}
              onChange={(e) => change({ description: e.target.value }, ['description'])}
            />
          )}
        </Field>

        <div className="flex items-start gap-3">
          <Checkbox
            id={approvalId}
            className="mt-0.5"
            checked={values.requires_approval}
            disabled={busy}
            aria-describedby={`${approvalId}-hint`}
            onCheckedChange={(v) => change({ requires_approval: v === true })}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={approvalId} className="text-md font-medium text-fg">
              {t('group.form.approval_label')}
            </label>
            <p id={`${approvalId}-hint`} className="text-sm text-muted">
              {t('group.form.approval_hint')}
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="group-details-heading" className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-card sm:p-6">
        <h2 id="group-details-heading" className="flex flex-wrap items-baseline gap-2 text-lg font-semibold text-fg">
          {t('group.form.details_title')}
          <span className="text-sm font-normal text-muted">{t('group.form.optional')}</span>
        </h2>
        {GROUP_ATTRIBUTE_FIELDS[kind].map((field) => (
          <AttributeInput key={field.key} field={field} values={values} disabled={busy} error={err(`attributes.${field.key}`)} onChange={change} />
        ))}
      </section>

      {formError ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
          {formError === 'form_invalid' ? t('web.group.form_invalid') : errorText(formError)}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" size="lg">
          <Link href={cfg.path}>{t('common.actions.cancel')}</Link>
        </Button>
        <Button type="submit" size="lg" variant="accent" disabled={busy} aria-busy={busy || undefined}>
          {busy ? t('group.form.submitting') : t(`group.form.submit_${kind}`)}
        </Button>
      </div>
    </form>
  );
}

/** Khung chọn sân khi chưa chạy ở trình duyệt (danh mục đọc bằng @hp/core/react). */
function VenuePickerSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-11 w-40" />
    </div>
  );
}

type AttributeField = (typeof GROUP_ATTRIBUTE_FIELDS)[GroupKind][number];

function AttributeInput({
  field,
  values,
  disabled,
  error,
  onChange,
}: {
  field: AttributeField;
  values: Values;
  disabled: boolean;
  error: string | null;
  onChange: (patch: Partial<Values>, clear?: string[]) => void;
}) {
  const t = useTranslations();
  const checkboxId = useId();
  const label = t(`group.attr.${field.key}`);

  if (field.key === 'luggage_ok' || field.key === 'stops_ok') {
    const key = field.key;
    return (
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id={checkboxId}
          checked={values[key]}
          disabled={disabled}
          onCheckedChange={(v) => onChange(key === 'luggage_ok' ? { luggage_ok: v === true } : { stops_ok: v === true })}
        />
        <label htmlFor={checkboxId} className="text-md text-fg">
          {label}
        </label>
      </div>
    );
  }
  if (field.key === 'vehicle_note') {
    return (
      <Field label={label} error={error} optional>
        {(control) => (
          <Input
            {...control}
            value={values.vehicle_note}
            maxLength={60}
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => onChange({ vehicle_note: e.target.value }, ['attributes.vehicle_note'])}
          />
        )}
      </Field>
    );
  }
  return (
    <ChoiceField label={label} error={error} optional>
      {SKILL_LEVELS.map((o) => (
        <ChoiceChip
          key={o}
          selected={values.skill_level === o}
          disabled={disabled}
          onClick={() => onChange({ skill_level: values.skill_level === o ? '' : o })}
        >
          {t(`group.attr_value.skill_level.${o}`)}
        </ChoiceChip>
      ))}
    </ChoiceField>
  );
}
