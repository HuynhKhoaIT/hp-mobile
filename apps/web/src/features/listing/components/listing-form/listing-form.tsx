'use client';

// Form "Đăng nhanh" (đăng mới ở /dang-tin, sửa ở /toi/tin-cua-toi/[id]/sua) — một engine cho 4 tính năng Listing, khác biệt
// lấy từ config (features.ts) + ATTRIBUTE_FIELDS. Thứ tự bước và chữ khớp app (hợp đồng tuần 4):
//   0 chọn tính năng / danh mục (chỉ khi đăng mới chưa chọn) → 1 ảnh → 2 thông tin chính → 3 chi tiết.
// Ghi qua Server Action (features/listing/actions.ts); ảnh upload thẳng Storage từ trình duyệt (uploadListingImage):
//   không ảnh mới  → createListingAction(active | draft)  (sửa: updateListingAction)
//   có ảnh mới     → createListingAction(draft, images: []) → upload từng ảnh (tiến độ, ảnh lỗi bấm "Tải lại ảnh lỗi")
//                    → updateListingAction({ id, category, images, status }) — thoát giữa chừng thì tin nằm ở Nháp.
// Kết quả hiện theo status thật DB trả về (FormResult). Nội dung chữ tự lưu localStorage khi đăng mới (draft-store.ts).
import { type MyListing, removeListingImages, type SavedListingResult, type Site, flattenIssues, uploadListingImage } from '@hp/core';
import {
  CreateListingInput,
  featureOfCategory,
  type ListingCategory,
  type ListingFeature,
  type Locale,
  MAX_LISTING_IMAGES,
} from '@hp/shared';
import { ChevronLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useRouter } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { createListingAction, updateListingAction } from '../../actions';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import {
  buildContent,
  emptyValues,
  FORM_STEPS,
  type FormStep,
  type FormValues,
  stepOfField,
  valuesFromListing,
} from '../../form-values';
import { prepareListingImage } from '../../listing-image';
import { BasicsStep } from './basics-step';
import { DetailsStep } from './details-step';
import { clearDraft, parseDraft, readDraftRaw, subscribeDraft, writeDraft } from './draft-store';
import { FeaturePicker } from './feature-picker';
import { FormResult } from './form-result';
import { PhotoStep } from './photo-step';
import { type FormPhoto, photoPaths } from './photos';

type Props = {
  mode: 'create' | 'edit';
  userId: string;
  sites: Site[];
  /** Khu trong hồ sơ + ngôn ngữ trang (mặc định khi đăng mới). */
  defaults: { site: string | null; lang: Locale };
  /** ?feature= của /dang-tin. */
  initialFeature: ListingFeature | null;
  /** Tin đang sửa (mode edit). */
  listing: MyListing | null;
};

/**
 * publish = Đăng tin (active) · draft = Lưu nháp · save = Lưu thay đổi (giữ trạng thái hiện tại)
 * · resubmit = Gửi duyệt lại tin bị từ chối (gửi status active; DB luôn chuyển thành pending_review, lý do `resubmit`).
 */
type SubmitKind = 'publish' | 'draft' | 'save' | 'resubmit';

const singleCategory = (f: ListingFeature | null): ListingCategory | null => {
  const cats = f ? LISTING_FEATURE_CONFIGS[f].categories : [];
  return cats.length === 1 ? (cats[0] ?? null) : null;
};

const newKey = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random()).slice(2));

export function ListingForm({ mode, userId, sites, defaults, initialFeature, listing }: Props) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();

  const startFeature = listing ? featureOfCategory(listing.category) : initialFeature;
  const startCategory = listing?.category ?? singleCategory(initialFeature);
  const [feature, setFeature] = useState<ListingFeature | null>(startFeature);
  const [category, setCategory] = useState<ListingCategory | null>(startCategory);
  const [step, setStep] = useState<0 | FormStep>(startCategory ? 1 : 0);
  const [values, setValues] = useState<FormValues>(() => (listing ? valuesFromListing(listing) : emptyValues(defaults)));
  const [photos, setPhotos] = useState<FormPhoto[]>(
    () => listing?.images.map((path) => ({ key: path, kind: 'existing' as const, path })) ?? [],
  );
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [listingId, setListingId] = useState<string | null>(listing?.id ?? null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState<SubmitKind | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [retryKind, setRetryKind] = useState<SubmitKind | null>(null);
  const [result, setResult] = useState<SavedListingResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const photosRef = useRef(photos);

  // Nháp localStorage (chỉ đăng mới): đọc qua useSyncExternalStore để server render và hydrate giống nhau.
  const storedRaw = useSyncExternalStore(subscribeDraft, readDraftRaw, () => null);
  const stored = mode === 'create' && !dirty && !result ? parseDraft(storedRaw) : null;

  const disabled = busy !== null;
  const isDraftListing = mode === 'edit' && listing?.status === 'draft';
  const isRejectedListing = mode === 'edit' && listing?.status === 'rejected';
  /** Nút chính ở bước cuối. */
  const primaryKind: SubmitKind =
    mode === 'create' || isDraftListing ? 'publish' : isRejectedListing ? 'resubmit' : 'save';

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Thu hồi object URL xem trước khi rời form.
  useEffect(
    () => () => {
      for (const p of photosRef.current) if (p.kind === 'new') URL.revokeObjectURL(p.preview);
    },
    [],
  );

  // Đổi bước → đưa focus về tiêu đề bước (trình đọc màn hình đọc bước mới).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, result]);

  // Cảnh báo khi đóng tab / tải lại lúc còn nội dung chưa lưu.
  useEffect(() => {
    if (!dirty || result) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, result]);

  // Tự lưu phần chữ khi đăng mới.
  useEffect(() => {
    if (mode !== 'create' || !dirty || result || !feature || !category) return;
    writeDraft({ feature, category, values });
  }, [mode, dirty, result, feature, category, values]);

  const change = (patch: Partial<FormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setDirty(true);
    // Sửa ô nào thì bỏ lỗi của ô đó.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) {
        if (k === 'attributes') for (const key of Object.keys(next)) if (key.startsWith('attributes.')) delete next[key];
        delete next[k];
      }
      return next;
    });
  };

  const chooseFeature = (f: ListingFeature) => {
    if (f === feature) return;
    setFeature(f);
    setCategory(singleCategory(f));
    setValues((v) => ({ ...v, attributes: {} }));
    setDirty(true);
  };

  const chooseCategory = (c: ListingCategory) => {
    if (c === category) return;
    setCategory(c);
    setValues((v) => ({ ...v, attributes: {} }));
    setDirty(true);
  };

  const restoreDraft = () => {
    if (!stored) return;
    setFeature(stored.feature);
    setCategory(stored.category);
    setValues(stored.values);
    setStep(1);
    setDirty(true);
  };

  // ── Ảnh ─────────────────────────────────────────────────────────────────────────
  const addPhotos = async (files: File[]) => {
    setPhotoError(null);
    const room = MAX_LISTING_IMAGES - photos.length;
    if (files.length > room) setPhotoError('too_many_images');
    setPreparing(true);
    const added: FormPhoto[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      const prepared = await prepareListingImage(file);
      if (prepared.error) {
        setPhotoError(prepared.error);
        continue;
      }
      const { blob, contentType } = prepared.data;
      added.push({ key: newKey(), kind: 'new', blob, contentType, preview: URL.createObjectURL(blob), path: null, failed: false });
    }
    setPreparing(false);
    if (added.length > 0) {
      setPhotos((prev) => [...prev, ...added].slice(0, MAX_LISTING_IMAGES));
      setDirty(true);
    }
  };

  const removePhoto = (key: string) => {
    const photo = photos.find((p) => p.key === key);
    if (!photo) return;
    if (photo.kind === 'new') URL.revokeObjectURL(photo.preview);
    // Ảnh đã nằm trên Storage (của tin cũ, hoặc upload ở lần thử trước) → dọn sau khi lưu thành công.
    if (photo.path) setRemovedPaths((r) => [...r, photo.path as string]);
    setPhotos((prev) => prev.filter((p) => p.key !== key));
    setDirty(true);
  };

  const makeCover = (key: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.key === key);
      return photo ? [photo, ...prev.filter((p) => p.key !== key)] : prev;
    });
    setDirty(true);
  };

  // ── Kiểm tra + gửi ──────────────────────────────────────────────────────────────
  /** Kiểm toàn bộ bằng Zod của @hp/shared (cùng schema server dùng). Trả lỗi theo path. */
  const validate = (c: ListingCategory): Record<string, string[]> => {
    const parsed = CreateListingInput.safeParse({ category: c, status: 'active', ...buildContent(c, values), images: [] });
    return parsed.success ? {} : flattenIssues(parsed.error.issues);
  };

  const showErrors = (errs: Record<string, string[]>) => {
    setErrors(errs);
    const steps = Object.keys(errs).map(stepOfField);
    if (steps.length > 0) setStep(Math.min(...steps) as FormStep);
  };

  const goNext = () => {
    if (step === 0) {
      if (category) setStep(1);
      return;
    }
    if (!category) return;
    const errs = validate(category);
    const blocking = Object.keys(errs).filter((k) => stepOfField(k) <= step);
    if (blocking.length > 0) {
      setErrors(Object.fromEntries(blocking.map((k) => [k, errs[k] ?? []])));
      return;
    }
    if (step < 3) setStep((step + 1) as FormStep);
  };

  const goBack = () => {
    if (step === 1) {
      if (mode === 'create' && !listingId) setStep(0);
      return;
    }
    if (step > 1) setStep((step - 1) as FormStep);
  };

  const finish = (data: SavedListingResult) => {
    if (removedPaths.length > 0) void removeListingImages(createBrowserClient(), removedPaths);
    setRemovedPaths([]);
    clearDraft();
    setDirty(false);
    setBusy(null);
    setProgress(null);
    setResult(data);
  };

  const failWith = (code: string, fieldErrors?: Record<string, string[]>) => {
    setBusy(null);
    setProgress(null);
    setFormError(code);
    if (fieldErrors && Object.keys(fieldErrors).length > 0) showErrors(fieldErrors);
  };

  const submit = async (kind: SubmitKind) => {
    if (!category) return;
    const errs = validate(category);
    if (Object.keys(errs).length > 0) return showErrors(errs);

    setBusy(kind);
    setFormError(null);
    setRetryKind(null);
    const content = buildContent(category, values);
    let id = listingId;
    let current = photos;
    const needsUpload = current.some((p) => p.kind === 'new' && !p.path);

    // 1. Tin mới: tạo luôn (không ảnh mới) hoặc tạo nháp để có id cho path ảnh.
    if (!id) {
      const res = await createListingAction({
        category,
        status: kind === 'draft' || needsUpload ? 'draft' : 'active',
        ...content,
        images: [],
      });
      if (!res.ok) return failWith(res.code, res.fieldErrors);
      if (!needsUpload) return finish(res.data);
      id = res.data.id;
      setListingId(id);
    }

    // 2. Upload ảnh mới theo thứ tự; ảnh lỗi đánh dấu, dừng và cho "Tải lại ảnh lỗi".
    const pending = current.filter((p) => p.kind === 'new' && !p.path);
    const client = createBrowserClient();
    for (const [i, photo] of pending.entries()) {
      if (photo.kind !== 'new') continue;
      setProgress({ current: i + 1, total: pending.length });
      const up = await uploadListingImage(client, {
        userId,
        listingId: id,
        index: current.findIndex((p) => p.key === photo.key),
        body: photo.blob,
        contentType: photo.contentType,
      });
      current = current.map((p) =>
        p.key === photo.key && p.kind === 'new' ? { ...p, path: up.data ?? null, failed: up.error !== null } : p,
      );
      setPhotos(current);
      if (up.error) {
        setRetryKind(kind);
        return failWith(up.error.code);
      }
    }
    setProgress(null);

    // 3. Ghi ảnh + nội dung (+ trạng thái).
    const images = photoPaths(current) ?? [];
    const status =
      mode === 'create'
        ? kind === 'draft'
          ? 'draft'
          : 'active'
        : kind === 'publish' || kind === 'resubmit'
          ? 'active'
          : kind === 'draft'
            ? 'draft'
            : undefined;
    const res = await updateListingAction({ id, category, ...content, images, ...(status ? { status } : {}) });
    if (!res.ok) return failWith(res.code, res.fieldErrors);
    finish(res.data);
  };

  const reset = () => {
    if (mode === 'edit') return router.push('/dang-tin');
    for (const p of photos) if (p.kind === 'new') URL.revokeObjectURL(p.preview);
    setFeature(null);
    setCategory(null);
    setValues(emptyValues(defaults));
    setPhotos([]);
    setRemovedPaths([]);
    setListingId(null);
    setErrors({});
    setFormError(null);
    setPhotoError(null);
    setRetryKind(null);
    setResult(null);
    setDirty(false);
    setStep(0);
  };

  const leave = () => {
    if (mode === 'create') clearDraft();
    setDirty(false);
    setDiscardOpen(false);
    router.push(mode === 'edit' ? '/toi/tin-cua-toi' : '/tin');
  };

  const title = mode === 'edit' ? t('listing.form.title_edit') : t('listing.form.title_new');

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-fg outline-none">
          {title}
        </h1>
        <FormResult result={result} mode={mode} onPostAnother={reset} />
      </div>
    );
  }

  const busyText =
    progress !== null
      ? t('listing.form.uploading', progress)
      : busy === 'publish' || busy === 'resubmit'
        ? t('listing.form.submitting')
        : busy
          ? t('listing.form.saving')
          : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-fg outline-none">
            {title}
          </h1>
          {step > 0 ? (
            <p className="text-sm text-muted">
              {t('listing.form.step', { current: step, total: FORM_STEPS.length })}
              {feature && category ? ` · ${t(`common.category.${category}`)}` : null}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => (dirty ? setDiscardOpen(true) : leave())}
        >
          <X strokeWidth={1.75} aria-hidden />
          {t('common.actions.cancel')}
        </Button>
      </div>

      {step > 0 ? (
        <ol aria-hidden className="grid grid-cols-3 gap-2">
          {FORM_STEPS.map((s) => (
            <li key={s} className={s <= step ? 'h-1 rounded-full bg-primary' : 'h-1 rounded-full bg-border'} />
          ))}
        </ol>
      ) : null}

      {stored ? (
        <div role="region" aria-label={t('web.post.restore_body')} className="flex flex-col gap-3 rounded-md bg-primary-light p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-md text-fg">{t('web.post.restore_body')}</p>
          <div className="flex gap-2">
            <Button type="button" onClick={restoreDraft}>
              {t('listing.form.keep_editing')}
            </Button>
            <Button type="button" variant="outline" onClick={clearDraft}>
              {t('listing.form.discard_confirm')}
            </Button>
          </div>
        </div>
      ) : null}

      <form
        noValidate
        className="flex flex-col gap-6 rounded-lg bg-surface p-4 shadow-card sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 3) void submit(primaryKind);
          else goNext();
        }}
      >
        {step === 0 ? (
          <FeaturePicker feature={feature} category={category} onFeature={chooseFeature} onCategory={chooseCategory} />
        ) : null}
        {step === 1 ? (
          <PhotoStep
            photos={photos}
            preparing={preparing}
            error={photoError}
            showRequiredHint={feature === 'pass' || feature === 'room'}
            disabled={disabled}
            onAdd={(files) => void addPhotos(files)}
            onRemove={removePhoto}
            onCover={makeCover}
          />
        ) : null}
        {step === 2 && feature ? (
          <BasicsStep feature={feature} values={values} errors={errors} disabled={disabled} onChange={change} />
        ) : null}
        {step === 3 && category ? (
          <DetailsStep category={category} values={values} sites={sites} errors={errors} disabled={disabled} onChange={change} />
        ) : null}

        <p role="status" aria-live="polite" className={busyText ? 'text-md font-medium text-primary' : 'sr-only'}>
          {busyText}
        </p>
        {formError ? (
          <div role="alert" className="flex flex-col gap-2 rounded-md bg-danger/10 p-3 text-md text-danger sm:flex-row sm:items-center">
            <p className="flex-1">{errorText(formError)}</p>
            {retryKind ? (
              <Button type="button" variant="outline" disabled={disabled} onClick={() => void submit(retryKind)}>
                {t('listing.form.upload_retry')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          {step > 1 || (step === 1 && mode === 'create' && !listingId) ? (
            <Button type="button" variant="ghost" disabled={disabled} onClick={goBack}>
              <ChevronLeft strokeWidth={1.75} aria-hidden />
              {t('listing.form.back')}
            </Button>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
            {step > 0 && (mode === 'create' || isDraftListing) ? (
              <Button type="button" variant="outline" disabled={disabled} onClick={() => void submit('draft')}>
                {t('listing.form.save_draft')}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="submit" size="lg" disabled={disabled || (step === 0 && !category)}>
                {t('listing.form.next')}
              </Button>
            ) : (
              <Button type="submit" size="lg" variant={primaryKind === 'publish' ? 'accent' : 'default'} disabled={disabled}>
                {primaryKind === 'publish'
                  ? t('listing.form.submit')
                  : primaryKind === 'resubmit'
                    ? t('listing.manage.resubmit')
                    : t('listing.form.save')}
              </Button>
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={t('listing.form.discard_title')}
        description={t('listing.form.discard_body')}
        confirmLabel={t('listing.form.discard_confirm')}
        cancelLabel={t('listing.form.keep_editing')}
        destructive
        onConfirm={leave}
      />
    </div>
  );
}
