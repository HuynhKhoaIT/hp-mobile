// Engine form tạo nhóm dùng chung ride / sport — khác nhau chỉ ở config.form và GROUP_ATTRIBUTE_FIELDS[kind] (@hp/shared).
// React Hook Form + resolver chạy chính CreateGroupInput (Zod của @hp/shared) trên giá trị đã chuyển sang payload
// (ngày giờ → ISO, ghép xe để trống tiêu đề → rideTitle) — lỗi = key errors.*, hiện dưới đúng ô. Server kiểm lại
// (trigger: starts_too_soon / starts_too_far, rate_limited, banned) → lỗi về đúng ô hoặc toast.
// Bản đang soạn tự lưu cục bộ (useDraft, app-only `offlineDrafts`), xoá khi tạo xong / người dùng bỏ — kể cả sân đã chọn.
// Kèo (place 'venue'): chọn sân trong danh mục → `venue` (bản chụp để hiện thẻ sân, gửi venue_id) + origin_text = tên sân;
// tự gõ → venue null. Đổi môn mà sân không có môn đó → bỏ sân đã chọn (server cũng báo invalid_venue).
// Đội có sẵn (config.form.lineup): attributes.players_have (tính cả chủ nhóm) — không nằm trong GROUP_ATTRIBUTE_FIELDS
// nên cleanAttributes giữ riêng; tắt công tắc → bỏ khoá (undefined, JSON nháp cũng bỏ).
import { toNestErrors } from '@hookform/resolvers';
import type { AppError, SavedGroup, Venue } from '@hp/core';
import { useCreateGroup } from '@hp/core/react';
import {
  CreateGroupInput,
  type CreateGroupValues,
  GROUP_ATTRIBUTE_FIELDS,
  GROUP_RULES,
  type Locale,
  maxSeatsFor,
  rideTitle,
  type SkillLevel,
} from '@hp/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { type FieldError, type FieldPath, type FieldPathValue, type Resolver, useForm, useFormState, useWatch } from 'react-hook-form';
import { useDraft } from '@/core/offline';
import { useErrorText } from '@/lib/errors';
import { toast } from '@/ui';
import type { GroupFeatureConfig } from '../types';

export type GroupFormValues = {
  sub_kind: string;
  title: string;
  description: string;
  starts_at: Date | null;
  seats_total: number;
  fee_per_person: number | null;
  origin_text: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_text: string;
  destination_lat: number | null;
  destination_lng: number | null;
  attributes: {
    luggage_ok?: boolean;
    stops_ok?: boolean;
    vehicle_note?: string;
    skill_level?: SkillLevel;
    /** Kèo: đội đã có bao nhiêu người, tính cả chủ nhóm (undefined = không khai). */
    players_have?: number;
  };
  requires_approval: boolean;
  /** Sân đã chọn trong danh mục (kèo) — null: tự gõ tên sân / ghép xe. */
  venue: GroupVenue | null;
};
export type GroupFormField = FieldPath<GroupFormValues>;

/** Bản chụp sân đã chọn (search_venues có thể trả null cho địa chỉ / giá dù type ghi string / number). */
export type GroupVenue = Pick<Venue, 'id' | 'name' | 'sports'> & { address_text: string | null; price_ref: number | null };

/** Bản nháp cục bộ: Date không qua được JSON → lưu ISO. */
type DraftSnapshot = Omit<GroupFormValues, 'starts_at'> & { starts_at: string | null };

const isAppError = (e: unknown): e is AppError => !!e && typeof e === 'object' && 'code' in e && typeof e.code === 'string';

/** Lỗi trigger không kèm fieldErrors → ô tương ứng. */
const FIELD_OF_CODE: Partial<Record<string, GroupFormField>> = {
  starts_too_soon: 'starts_at',
  starts_too_far: 'starts_at',
  invalid_venue: 'venue',
};

/** Đường dẫn lỗi của payload (Zod / fieldErrors server) → ô của form. */
const fieldOfPath = (path: string): string => (path === 'venue_id' ? 'venue' : path);

function blankValues(config: GroupFeatureConfig, origin: string): GroupFormValues {
  return {
    sub_kind: config.subKinds[0] ?? '',
    title: '',
    description: '',
    starts_at: null,
    seats_total: Math.min(config.form.defaultSeats, maxSeatsFor(config.kind, config.subKinds[0] ?? '')),
    fee_per_person: null,
    // Kèo: chưa có sân mặc định (chọn trong danh mục hoặc tự gõ); ghép xe: cổng khu.
    origin_text: config.form.place === 'route' ? origin : '',
    origin_lat: null,
    origin_lng: null,
    destination_text: '',
    destination_lat: null,
    destination_lng: null,
    attributes: {},
    requires_approval: config.form.defaultRequiresApproval,
    venue: null,
  };
}

/** Mặc định khi bật "Đội đã có sẵn người": chỉ có chủ nhóm. */
export const DEFAULT_PLAYERS_HAVE = 1;

/** Chỉ giữ thuộc tính của kind (+ players_have khi bật đội hình), bỏ ô trống (Zod strict chặn khoá lạ). */
function cleanAttributes(config: GroupFeatureConfig, attrs: GroupFormValues['attributes']): Record<string, unknown> {
  const known = new Set<string>(GROUP_ATTRIBUTE_FIELDS[config.kind].map((f) => f.key));
  if (config.form.lineup) known.add('players_have');
  return Object.fromEntries(
    Object.entries(attrs).filter(([k, v]) => known.has(k) && v !== undefined && v !== null && !(typeof v === 'string' && !v.trim())),
  );
}

/** Giá trị form → input của createGroup (cũng là thứ resolver đưa qua CreateGroupInput). */
export function toGroupInput(config: GroupFeatureConfig, v: GroupFormValues, lang: Locale) {
  const route = config.form.place === 'route';
  const origin = v.origin_text.trim();
  const destination = route ? v.destination_text.trim() : '';
  const title = v.title.trim() || (route && origin && destination ? rideTitle(origin, destination) : '');
  return {
    kind: config.kind,
    sub_kind: v.sub_kind,
    title,
    description: v.description.trim() || null,
    starts_at: v.starts_at ? v.starts_at.toISOString() : '',
    seats_total: v.seats_total,
    fee_per_person: v.fee_per_person ?? 0,
    origin_text: origin,
    origin_lat: v.origin_lat,
    origin_lng: v.origin_lng,
    destination_text: route ? destination || null : null,
    destination_lat: route ? v.destination_lat : null,
    destination_lng: route ? v.destination_lng : null,
    attributes: cleanAttributes(config, v.attributes),
    requires_approval: v.requires_approval,
    venue_id: route ? null : (v.venue?.id ?? null),
    lang,
  };
}

/** Resolver: CreateGroupInput của @hp/shared trên payload; lỗi giữ nguyên mã (key errors.*), ô giờ trống → required. */
function groupResolver(config: GroupFeatureConfig, lang: Locale): Resolver<GroupFormValues, unknown, CreateGroupValues> {
  return (values, _context, options) => {
    const parsed = CreateGroupInput.safeParse(toGroupInput(config, values, lang));
    if (parsed.success) return { values: parsed.data, errors: {} };
    const flat: Record<string, FieldError> = {};
    for (const issue of parsed.error.issues) {
      const path = fieldOfPath(issue.path.map(String).join('.'));
      if (!flat[path]) flat[path] = { type: 'validate', message: issue.message };
    }
    if (!values.starts_at) flat.starts_at = { type: 'required', message: 'required' };
    return { values: {}, errors: toNestErrors(flat, options) };
  };
}

export type UseGroupFormArgs = {
  config: GroupFeatureConfig;
  /** Điểm đi mặc định ("Cổng <khu>" theo profile.site); rỗng khi chưa chọn khu. */
  defaultOrigin: string;
  lang: Locale;
};

export function useGroupForm({ config, defaultOrigin, lang }: UseGroupFormArgs) {
  const errorText = useErrorText();
  const create = useCreateGroup();
  const draft = useDraft<DraftSnapshot>(`group-new:${config.kind}`);
  const restoredDraft = draft.initial && (config.subKinds as readonly string[]).includes(draft.initial.sub_kind) ? draft.initial : null;

  const [initialValues] = useState<GroupFormValues>(() =>
    restoredDraft
      ? { ...restoredDraft, venue: restoredDraft.venue ?? null, starts_at: restoredDraft.starts_at ? new Date(restoredDraft.starts_at) : null }
      : blankValues(config, defaultOrigin),
  );
  const form = useForm<GroupFormValues, unknown, CreateGroupValues>({
    resolver: groupResolver(config, lang),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const { isDirty } = useFormState({ control: form.control });
  const values = useWatch({ control: form.control });

  /**
   * Mốc giờ chọn được: sớm nhất 15 phút, muộn nhất 60 ngày tính từ lúc mở form. Để form mở lâu thì Zod (lúc gửi, theo
   * giờ hiện tại) và trigger vẫn kiểm lại → starts_too_soon hiện dưới ô giờ.
   */
  const [bounds] = useState(() => {
    const now = Date.now();
    return { min: new Date(now + GROUP_RULES.minLeadMinutes * 60_000), max: new Date(now + GROUP_RULES.maxDaysAhead * 86_400_000) };
  });
  const [result, setResult] = useState<SavedGroup | null>(null);
  const [restored, setRestored] = useState(!!restoredDraft);
  /** Đã tạo xong / người dùng đồng ý bỏ → được rời màn không hỏi lại. */
  const allowLeave = useRef(false);
  const busy = create.isPending;
  const dirty = !result && isDirty;

  // Tự lưu bản đang soạn (debounce 500ms trong useDraft). Chưa nhập gì → không tạo bản nháp rác.
  const { save: saveDraft } = draft;
  useEffect(() => {
    if (result || (!isDirty && !restored)) return;
    const v = { ...initialValues, ...values } as GroupFormValues;
    saveDraft({ ...v, starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null });
  }, [result, isDirty, restored, values, initialValues, saveDraft]);

  const fail = (e: unknown) => {
    const error: AppError = isAppError(e) ? e : { code: 'unknown', message: 'unknown' };
    const fields = Object.entries(error.fieldErrors ?? {});
    for (const [path, codes] of fields) {
      form.setError(fieldOfPath(path) as GroupFormField, { type: 'server', message: codes[0] ?? 'invalid_input' });
    }
    const field = FIELD_OF_CODE[error.code];
    if (field) form.setError(field, { type: 'server', message: error.code });
    toast.show(errorText(error.code), 'danger');
  };

  const submit = () => {
    if (busy) return;
    void form.handleSubmit(async (out) => {
      try {
        const saved = await create.mutateAsync(out);
        allowLeave.current = true;
        draft.clear();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setResult(saved);
      } catch (e) {
        fail(e);
      }
    })();
  };

  /** Đặt giá trị một trường (đánh dấu dirty + kiểm lại nếu đã chạm). */
  const setField = <P extends GroupFormField>(path: P, value: FieldPathValue<GroupFormValues, P>) =>
    form.setValue(path, value, { shouldDirty: true, shouldValidate: form.getFieldState(path).isTouched || form.formState.isSubmitted });

  /** Bỏ sân đã chọn (đổi sân / chuyển sang tự gõ): xoá tên sân + toạ độ đi kèm. */
  const clearVenue = () => {
    setField('venue', null);
    setField('origin_text', '');
    setField('origin_lat', null);
    setField('origin_lng', null);
  };

  /** Chọn sân trong danh mục → venue_id + tên sân làm địa điểm (+ toạ độ sân để lọc khoảng cách). */
  const pickVenue = (v: Venue) => {
    setField('venue', { id: v.id, name: v.name, sports: v.sports, address_text: v.address_text ?? null, price_ref: v.price_ref ?? null });
    setField('origin_text', v.name);
    setField('origin_lat', v.lat ?? null);
    setField('origin_lng', v.lng ?? null);
    form.clearErrors(['venue', 'origin_text']);
  };

  /** Đổi loại con: kẹp số chỗ theo loại (xe máy chở tối đa 2); sân đã chọn không có môn mới → bỏ sân. */
  const setSubKind = (subKind: string) => {
    setField('sub_kind', subKind);
    const max = maxSeatsFor(config.kind, subKind);
    if (form.getValues('seats_total') > max) setField('seats_total', max);
    const venue = form.getValues('venue');
    if (venue && !venue.sports.includes(subKind)) clearVenue();
  };

  /** Chọn nhanh điểm đến (RIDE_PLACES) → tên + toạ độ; gõ tay → bỏ toạ độ (không lọc bán kính được). */
  const pickDestination = (place: { name: string; lat: number; lng: number } | null, text?: string) => {
    setField('destination_text', place ? place.name : (text ?? ''));
    setField('destination_lat', place ? place.lat : null);
    setField('destination_lng', place ? place.lng : null);
  };

  /** Đội đã có sẵn người: số (tính cả chủ nhóm) hoặc undefined = tắt công tắc → bỏ khoá khỏi attributes. */
  const setPlayersHave = (n: number | undefined) => {
    setField('attributes.players_have', n);
    if (n === undefined) form.clearErrors('attributes.players_have');
  };

  const startOver = () => {
    draft.clear();
    form.reset(blankValues(config, defaultOrigin));
    setRestored(false);
  };

  const discard = () => {
    allowLeave.current = true;
    draft.clear();
  };


  return {
    form,
    submit,
    busy,
    result,
    restored,
    startOver,
    dirty,
    discard,
    allowLeave,
    setField,
    setSubKind,
    pickDestination,
    setPlayersHave,
    pickVenue,
    clearVenue,
    bounds,
    maxSeats: maxSeatsFor(config.kind, values.sub_kind ?? ''),
  };
}

export type GroupFormState = ReturnType<typeof useGroupForm>;
