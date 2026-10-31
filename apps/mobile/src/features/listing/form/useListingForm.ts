// Engine form "Đăng nhanh" (đăng + sửa tin) dùng chung 4 tính năng Listing — khác nhau chỉ ở config.form và
// ATTRIBUTE_FIELDS[category] của @hp/shared. React Hook Form + zodResolver(CreateListingInput) (lỗi = key errors.*).
//
// Luồng lưu (khớp web, hợp đồng @hp/core listings-write):
//   - không có ảnh mới: createListing({ …, status }) (sửa: updateListing)
//   - có ảnh mới: createListing({ …, status: 'draft', images: [] }) → nén + upload từng ảnh (path cần listing id)
//     → updateListing({ id, category, …, images, status }). Ảnh lỗi giữ lại để thử lại; tin còn ở Nháp.
// `status` trả về là kết quả thật sau kiểm duyệt của DB: active / pending_review / rejected / draft.
// Bản đang soạn tự lưu cục bộ (useDraft, app-only `offlineDrafts`) cho tin mới.
import { zodResolver } from '@hookform/resolvers/zod';
import { type AppError, type MyListing, removeListingImages, type SavedListingResult } from '@hp/core';
import { useCreateListing, useSupabase, useUpdateListing, useUploadListingImage } from '@hp/core/react';
import { ATTRIBUTE_FIELDS, CreateListingInput, type ListingCategory, type Locale, MAX_LISTING_IMAGES } from '@hp/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { type FieldPath, type FieldPathValue, useForm, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { track } from '@/core/analytics';
import { useDraft } from '@/core/offline';
import { type PickedImage, pickImages, prepareListingImage } from '@/core/upload';
import { useErrorText } from '@/lib/errors';
import { listingImageUrl } from '@/lib/images';
import { type ImagePickerItemStatus, toast } from '@/ui';
import { backOrHome, openMyListings } from '../navigation';
import type { ListingFeatureConfig, ListingFormConfig } from '../types';

export type ListingFormValues = CreateListingInput;
type ListingFormOutput = ReturnType<typeof CreateListingInput.parse>;
export type ListingFormField = FieldPath<ListingFormValues>;

export type FormPhoto = {
  key: string;
  /** Hiển thị: file trên máy (ảnh mới) hoặc URL Storage (ảnh đã upload). */
  uri: string;
  /** Path trong bucket listing-images khi đã upload; null = chưa upload. */
  path: string | null;
  local: PickedImage | null;
  status: ImagePickerItemStatus;
};

export type ListingFormMode = { kind: 'new'; category: ListingCategory } | { kind: 'edit'; listing: MyListing };
export type SubmitTarget = 'publish' | 'draft';
export type FormPhase = 'editing' | 'saving' | 'uploading' | 'upload_error' | 'done';
export type FormStep = 1 | 2 | 3;
export const FORM_STEPS = 3;

/** Bản đang soạn lưu cục bộ (khoá theo category). */
type DraftSnapshot = { values: ListingFormValues; photos: FormPhoto[]; listingId: string | null };

const DEFAULT_FORM: ListingFormConfig = { photos: 'optional', price: true, defaultPriceType: 'fixed' };

/** Trường thuộc bước nào — lỗi từ server / Zod nhảy về đúng bước. */
const STEP_OF: Record<string, FormStep> = { images: 1, title: 2, description: 2, price: 2, price_type: 2 };
const stepOf = (path: string): FormStep => STEP_OF[path.split('.')[0] ?? ''] ?? 3;

let photoSeq = 0;
const newKey = () => `p${Date.now()}-${photoSeq++}`;

function blankValues(category: ListingCategory, form: ListingFormConfig, site: string | null, lang: Locale): ListingFormValues {
  return {
    category,
    title: '',
    description: '',
    price_type: form.defaultPriceType,
    price: null,
    attributes: {},
    site,
    address_text: '',
    lang,
  };
}

function valuesOf(listing: MyListing): ListingFormValues {
  const raw = listing.attributes && typeof listing.attributes === 'object' && !Array.isArray(listing.attributes) ? listing.attributes : {};
  // Chỉ giữ trường còn trong ATTRIBUTE_FIELDS (dữ liệu cũ có trường lạ → Zod strict sẽ chặn mà người dùng không sửa được).
  const known = new Set(ATTRIBUTE_FIELDS[listing.category].map((f) => f.key));
  const attributes = Object.fromEntries(Object.entries(raw).filter(([k]) => known.has(k)));
  return {
    category: listing.category,
    title: listing.title,
    description: listing.description ?? '',
    price_type: listing.price_type === 'negotiable' || listing.price_type === 'free' ? listing.price_type : 'fixed',
    price: listing.price,
    attributes,
    site: listing.site,
    address_text: listing.address_text ?? '',
    lang: listing.lang === 'en' || listing.lang === 'zh' ? listing.lang : 'vi',
  };
}

const isAppError = (e: unknown): e is AppError => !!e && typeof e === 'object' && 'code' in e && typeof e.code === 'string';

/** Giá trị đã qua Zod → payload ghi DB: bỏ thuộc tính trống, form không có ô giá → giá theo config. */
function toPayload(v: ListingFormOutput, form: ListingFormConfig) {
  const attributes = Object.fromEntries(
    Object.entries(v.attributes).filter(([, x]) => x !== undefined && x !== null && x !== '' && !(typeof x === 'number' && Number.isNaN(x))),
  );
  const price_type = form.price ? v.price_type : form.defaultPriceType;
  return {
    category: v.category,
    title: v.title,
    description: v.description?.trim() ? v.description.trim() : null,
    price_type,
    price: form.price && price_type === 'fixed' ? v.price : null,
    attributes,
    site: v.site,
    address_text: v.address_text?.trim() ? v.address_text.trim() : null,
    lang: v.lang,
  };
}

export type UseListingFormArgs = {
  mode: ListingFormMode;
  config: ListingFeatureConfig;
  userId: string;
  /** Khu mặc định của tin mới (profile.site). */
  defaultSite: string | null;
  lang: Locale;
};

export function useListingForm({ mode, config, userId, defaultSite, lang }: UseListingFormArgs) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const client = useSupabase();
  const create = useCreateListing();
  const update = useUpdateListing();
  const upload = useUploadListingImage();
  const formConfig = config.form ?? DEFAULT_FORM;
  const category = mode.kind === 'new' ? mode.category : mode.listing.category;

  const draft = useDraft<DraftSnapshot>(mode.kind === 'new' ? `listing-new:${category}` : null);
  const restoredDraft = draft.initial && draft.initial.values.category === category ? draft.initial : null;

  const [initialPhotos] = useState<FormPhoto[]>(() => {
    if (mode.kind === 'edit') {
      return mode.listing.images.map((path) => ({ key: newKey(), uri: listingImageUrl(path), path, local: null, status: 'done' }));
    }
    return (restoredDraft?.photos ?? []).map((p): FormPhoto => ({ ...p, status: p.path ? 'done' : 'idle' }));
  });
  const [initialValues] = useState<ListingFormValues>(() =>
    mode.kind === 'edit' ? valuesOf(mode.listing) : (restoredDraft?.values ?? blankValues(category, formConfig, defaultSite, lang)),
  );

  const form = useForm<ListingFormValues, unknown, ListingFormOutput>({
    resolver: zodResolver(CreateListingInput),
    defaultValues: initialValues,
    mode: 'onTouched',
  });
  const { isDirty } = useFormState({ control: form.control });
  const values = useWatch({ control: form.control });

  const [step, setStep] = useState<FormStep>(1);
  const [photos, setPhotos] = useState<FormPhoto[]>(initialPhotos);
  const [listingId, setListingId] = useState<string | null>(mode.kind === 'edit' ? mode.listing.id : (restoredDraft?.listingId ?? null));
  const [phase, setPhase] = useState<FormPhase>('editing');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<SavedListingResult | null>(null);
  const [restored, setRestored] = useState(!!restoredDraft && mode.kind === 'new');
  const lastTarget = useRef<SubmitTarget>('publish');
  /** Path upload trong phiên này (dọn Storage nếu cuối cùng không dùng). */
  const uploadedPaths = useRef(new Set<string>());
  /** Đã lưu xong / người dùng đồng ý bỏ → được rời màn không hỏi lại. */
  const allowLeave = useRef(false);

  const busy = phase === 'saving' || phase === 'uploading';
  const photosChanged = photos.map((p) => p.key).join() !== initialPhotos.map((p) => p.key).join();
  const dirty = phase !== 'done' && (isDirty || photosChanged);

  // Tự lưu bản đang soạn (tin mới), debounce 500ms trong useDraft. Chưa nhập gì → không tạo bản nháp rác.
  const { save: saveDraft } = draft;
  useEffect(() => {
    if (mode.kind !== 'new' || phase === 'done' || (!isDirty && photos.length === 0 && !restored)) return;
    saveDraft({ values: { ...initialValues, ...values } as ListingFormValues, photos, listingId });
  }, [mode.kind, phase, isDirty, photos, values, listingId, initialValues, restored, saveDraft]);

  // ── Ảnh ─────────────────────────────────────────────────────────────────────
  const addPhotos = async () => {
    const picked = await pickImages(MAX_LISTING_IMAGES - photos.length);
    if (picked.length === 0) return;
    setPhotos((prev) =>
      [...prev, ...picked.map((local): FormPhoto => ({ key: newKey(), uri: local.uri, path: null, local, status: 'idle' }))].slice(
        0,
        MAX_LISTING_IMAGES,
      ),
    );
  };
  const removePhoto = (key: string) => setPhotos((prev) => prev.filter((p) => p.key !== key));
  const makeCover = (key: string) =>
    setPhotos((prev) => {
      const hit = prev.find((p) => p.key === key);
      return hit ? [hit, ...prev.filter((p) => p.key !== key)] : prev;
    });
  const patchPhoto = (key: string, patch: Partial<FormPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  /** Nén + upload lần lượt các ảnh chưa có path (mạng yếu: từng ảnh một). Trả danh sách path theo thứ tự, hoặc null nếu có ảnh lỗi. */
  const uploadAll = async (id: string): Promise<string[] | null> => {
    const snapshot = photos;
    const pending = snapshot.filter((p) => !p.path);
    let done = 0;
    let failed = false;
    const paths: string[] = [];
    setProgress({ current: pending.length ? 1 : 0, total: pending.length });
    if (pending.length) setPhase('uploading');
    for (const [index, photo] of snapshot.entries()) {
      if (photo.path) {
        paths.push(photo.path);
        continue;
      }
      setProgress({ current: done + 1, total: pending.length });
      patchPhoto(photo.key, { status: 'uploading' });
      const prepared = photo.local ? await prepareListingImage(photo.local) : ({ error: 'file_type' } as const);
      if ('error' in prepared) {
        patchPhoto(photo.key, { status: 'error' });
        failed = true;
      } else {
        try {
          const path = await upload.mutateAsync({ userId, listingId: id, index, ...prepared.data });
          uploadedPaths.current.add(path);
          patchPhoto(photo.key, { status: 'done', path, uri: photo.uri });
          paths.push(path);
        } catch {
          patchPhoto(photo.key, { status: 'error' });
          failed = true;
        }
      }
      done += 1;
    }
    return failed ? null : paths;
  };

  /** Ảnh cũ bị bỏ / ảnh upload rồi nhưng bị xoá → dọn Storage sau khi lưu xong (lỗi bỏ qua được). */
  const cleanupImages = (finalPaths: string[]) => {
    const keep = new Set(finalPaths);
    const original = mode.kind === 'edit' ? mode.listing.images : [];
    const orphan = [...new Set([...original, ...uploadedPaths.current])].filter((p) => !keep.has(p));
    if (orphan.length) void removeListingImages(client, orphan);
  };

  // ── Lưu ─────────────────────────────────────────────────────────────────────
  const finish = (saved: SavedListingResult, target: SubmitTarget, photoCount: number) => {
    allowLeave.current = true;
    draft.clear();
    setPhase('done');
    const wasDraft = mode.kind === 'new' || mode.listing.status === 'draft';
    if (saved.status === 'draft') {
      toast.show(t('form.draft_saved'), 'success');
      return openMyListings('draft', { replace: true });
    }
    // Sửa tin mà trạng thái không đổi (vd sửa giá tin đang hiện) → báo đã lưu và quay lại.
    // Gửi duyệt lại tin bị từ chối luôn hiện màn kết quả (chờ duyệt, hoặc bị từ chối lại).
    if (!wasDraft && mode.kind === 'edit' && mode.listing.status !== 'rejected' && saved.status === mode.listing.status) {
      toast.show(t('form.saved'), 'success');
      return backOrHome();
    }
    if (target === 'publish' && wasDraft) {
      track('create_listing', { category, status: saved.status, photos: photoCount });
    }
    if (saved.status === 'active' || saved.status === 'pending_review') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setResult(saved);
  };

  const fail = (e: unknown) => {
    const error: AppError = isAppError(e) ? e : { code: 'unknown', message: 'unknown' };
    setPhase('editing');
    const fields = Object.entries(error.fieldErrors ?? {});
    for (const [path, codes] of fields) {
      form.setError(path as ListingFormField, { type: 'server', message: codes[0] ?? 'invalid_input' });
    }
    if (fields[0]) setStep(stepOf(fields[0][0]));
    toast.show(errorText(error.code), 'danger');
  };

  const persist = async (out: ListingFormOutput, target: SubmitTarget) => {
    lastTarget.current = target;
    setPhase('saving');
    const payload = toPayload(out, formConfig);
    const status = target === 'draft' ? 'draft' : 'active';
    // Sửa tin đang hiện / chờ duyệt / đã đóng: không gửi status (giữ nguyên); tin nháp chọn đăng hay giữ nháp;
    // tin bị từ chối: lưu = gửi duyệt lại (status active → DB đặt pending_review, lý do `resubmit`).
    const statusPatch =
      mode.kind === 'edit' && mode.listing.status === 'rejected'
        ? { status: 'active' as const }
        : mode.kind === 'edit' && mode.listing.status !== 'draft'
          ? {}
          : { status };
    try {
      let id = listingId;
      const needsUpload = photos.some((p) => !p.path);
      if (!id && !needsUpload) {
        const saved = await create.mutateAsync({ ...payload, images: [], status });
        return finish(saved, target, 0);
      }
      if (!id) {
        const created = await create.mutateAsync({ ...payload, images: [], status: 'draft' });
        id = created.id;
        setListingId(id);
      }
      const paths = await uploadAll(id);
      if (!paths) {
        setPhase('upload_error');
        toast.show(errorText('upload_failed'), 'danger');
        return;
      }
      setPhase('saving');
      const saved = await update.mutateAsync({ id, ...payload, images: paths, ...statusPatch });
      cleanupImages(paths);
      finish(saved, target, paths.length);
    } catch (e) {
      fail(e);
    }
  };

  const submit = (target: SubmitTarget) => {
    if (busy) return;
    void form.handleSubmit(
      (out) => persist(out, target),
      (errors) => {
        const first = Object.keys(errors)[0];
        if (first) setStep(stepOf(first));
      },
    )();
  };

  /** Thử lại sau khi có ảnh lỗi: chỉ upload ảnh chưa có path rồi lưu tiếp như lần bấm trước. */
  const retryUpload = () => submit(lastTarget.current);

  const retryPhoto = (key: string) => {
    patchPhoto(key, { status: 'idle' });
    if (phase === 'upload_error') submit(lastTarget.current);
  };

  // ── Bước ────────────────────────────────────────────────────────────────────
  const next = async () => {
    if (step === 1) return setStep(2);
    if (step === 2) {
      const ok = await form.trigger(['title', 'price', 'price_type', 'description']);
      if (ok) setStep(3);
    }
  };
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as FormStep) : s));

  const startOver = () => {
    draft.clear();
    form.reset(blankValues(category, formConfig, defaultSite, lang));
    setPhotos([]);
    setListingId(null);
    setRestored(false);
    setStep(1);
  };

  const discard = () => {
    allowLeave.current = true;
    if (mode.kind === 'new') draft.clear();
  };

  /** Đặt giá trị một trường (đánh dấu dirty + kiểm lại nếu đã chạm). */
  const setField = <P extends ListingFormField>(path: P, value: FieldPathValue<ListingFormValues, P>) =>
    form.setValue(path, value, { shouldDirty: true, shouldValidate: form.getFieldState(path).isTouched });

  return {
    form,
    category,
    formConfig,
    step,
    setStep,
    next: () => void next(),
    back,
    photos,
    addPhotos: () => void addPhotos(),
    removePhoto,
    makeCover,
    retryPhoto,
    retryUpload,
    submit,
    phase,
    busy,
    progress,
    result,
    restored,
    startOver,
    dirty,
    discard,
    allowLeave,
    setField,
    isEdit: mode.kind === 'edit',
    editingStatus: mode.kind === 'edit' ? mode.listing.status : null,
  };
}

export type ListingFormState = ReturnType<typeof useListingForm>;
