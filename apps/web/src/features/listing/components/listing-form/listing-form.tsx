'use client';

// Form "Đăng nhanh" (đăng mới ở /dang-tin, sửa ở /toi/tin-cua-toi/[id]/sua; trong mini-app: /pass-do/dang-tin,
// /pass-do/quan-ly/[id]/sua — `scope`) — một engine cho 4 tính năng Listing, khác biệt
// lấy từ config (features.ts) + ATTRIBUTE_FIELDS. Thứ tự bước và chữ khớp app (hợp đồng tuần 4):
//   0 chọn tính năng / danh mục (chỉ khi đăng mới chưa chọn) → 1 ảnh → 2 thông tin chính → 3 chi tiết.
// Ghi qua Server Action (features/listing/actions.ts); ảnh upload thẳng Storage từ trình duyệt (uploadListingImage):
//   không ảnh mới  → createListingAction(active | draft)  (sửa: updateListingAction)
//   có ảnh mới     → createListingAction(draft, images: []) → upload từng ảnh (tiến độ, ảnh lỗi bấm "Tải lại ảnh lỗi")
//                    → updateListingAction({ id, category, images, status }) — thoát giữa chừng thì tin nằm ở Nháp.
// Kết quả hiện theo status thật DB trả về (FormResult). Nội dung chữ tự lưu localStorage khi đăng mới (draft-store.ts).
// Giao diện Stitch L2 (khớp app ListingForm): header xanh (HeaderDecor; tràn mép + bo đáy trên điện thoại, khối bo xl từ
// 640px) gồm nút quay lại trong mờ (lùi bước / huỷ), H1 "Đăng tin {tính năng}" + "Bước n/3 · danh mục", nút "Lưu nháp" pill
// trong mờ (tin mới / tin nháp), thanh tiến độ 3 vạch, bước 0–1 tin mới: dòng nhắc "miễn phí, ~1 phút". Nội dung từng bước là
// các thẻ FormSection; thông số chia theo config.form (splitAttributeFields của @hp/shared: bước 2 / bước 3 / ẩn). Thanh hành động: dưới 1024px dính
// đáy (trên bottom nav < 640px) giống thanh liên hệ ở chi tiết tin; từ 1024px nằm cuối form. Sửa tin đã đăng: "Lưu thay đổi"
// có ở mọi bước (giống app).
// Cố ý khác Stitch: giữ 3 bước "Đăng nhanh"; bỏ Xem trước, trả giá, Zalo, hậu tạ, nơi đang giữ đồ (không có dữ liệu thật).
import { keys, type MyListing, removeListingImages, type SavedListingResult, type Site, flattenIssues, uploadListingImage } from '@hp/core';
import {
  CreateListingInput,
  featureOfCategory,
  type ListingCategory,
  type ListingFeature,
  listingFormStepOf,
  type Locale,
  MAX_LISTING_IMAGES,
  splitAttributeFields,
} from '@hp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { HeaderDecor } from '@/components/shared/header-decor';
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
  valuesFromListing,
} from '../../form-values';
import { prepareListingImage } from '../../listing-image';
import { miniAppEditPath } from '../../mini-app-routes';
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
  /** profiles.phone (84…) — nhắc chủ tin số nào hiện qua "Hiện số"; null khi chưa có số. */
  phone: string | null;
  /** ?feature= của /dang-tin. */
  initialFeature: ListingFeature | null;
  /** ?category= của /dang-tin (đã kiểm thuộc initialFeature) — vào thẳng bước Ảnh. */
  initialCategory: ListingCategory | null;
  /** Tin đang sửa (mode edit). */
  listing: MyListing | null;
  /**
   * Đăng / sửa trong mini-app (vd /pass-do/dang-tin, /pass-do/quan-ly/[id]/sua): khoá tính năng (chỉ chọn danh mục của nó),
   * huỷ đăng mới → trang chủ mini-app, huỷ sửa → "Quản lý tin" của mini-app, màn kết quả → "Quản lý tin" / "Sửa tin" /
   * "Đăng tin khác" của mini-app thay vì /toi/tin-cua-toi, /dang-tin. Nháp localStorage riêng theo tính năng (draft-store.ts).
   * Không có → form chung của super app (/dang-tin, /toi/tin-cua-toi/[id]/sua).
   */
  scope?: ListingFormScope;
};

export type ListingFormScope = { feature: ListingFeature; homeHref: string; manageHref: string; postHref: string };

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

export function ListingForm({ mode, userId, sites, defaults, phone, initialFeature, initialCategory, listing, scope }: Props) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();

  const startFeature = listing ? featureOfCategory(listing.category) : (scope?.feature ?? initialFeature);
  const startCategory = listing?.category ?? initialCategory ?? singleCategory(startFeature);
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
  // Mini-app: nháp riêng của tính năng (hoặc nháp chung cùng tính năng) — nháp tin trọ không hiện / không bị ghi đè ở Chợ Pass.
  const draftScope = scope?.feature;
  const storedRaw = useSyncExternalStore(subscribeDraft, () => readDraftRaw(draftScope), () => null);
  const parsedDraft = mode === 'create' && !dirty && !result ? parseDraft(storedRaw) : null;
  const stored = parsedDraft && (!scope || parsedDraft.feature === scope.feature) ? parsedDraft : null;
  const queryClient = useQueryClient();

  const disabled = busy !== null;
  const isDraftListing = mode === 'edit' && listing?.status === 'draft';
  const isRejectedListing = mode === 'edit' && listing?.status === 'rejected';
  /** Nút chính ở bước cuối. */
  const primaryKind: SubmitKind =
    mode === 'create' || isDraftListing ? 'publish' : isRejectedListing ? 'resubmit' : 'save';
  const cfg = feature ? LISTING_FEATURE_CONFIGS[feature] : null;
  const fields = category ? splitAttributeFields(category, cfg?.form) : { primary: [], details: [] };
  const primaryKeys = new Set(fields.primary.map((f) => f.key));

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
    writeDraft({ feature, category, values }, draftScope);
  }, [mode, dirty, result, feature, category, values, draftScope]);

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
    const steps = Object.keys(errs).map((k) => listingFormStepOf(k, primaryKeys));
    if (steps.length > 0) setStep(Math.min(...steps) as FormStep);
  };

  const goNext = () => {
    if (step === 0) {
      if (category) setStep(1);
      return;
    }
    if (!category) return;
    const errs = validate(category);
    const blocking = Object.keys(errs).filter((k) => listingFormStepOf(k, primaryKeys) <= step);
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
    if (mode === 'create') clearDraft(draftScope);
    setDirty(false);
    setBusy(null);
    setProgress(null);
    setResult(data);
    // "Quản lý tin" (mini-app) / khối xem trước "Tin của tôi" đọc ở trình duyệt (staleTime 60s) → làm mới ngay.
    void queryClient.invalidateQueries({ queryKey: keys.myListings() });
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
    if (mode === 'edit') return router.push(scope?.postHref ?? '/dang-tin');
    for (const p of photos) if (p.kind === 'new') URL.revokeObjectURL(p.preview);
    setFeature(scope?.feature ?? null);
    setCategory(singleCategory(scope?.feature ?? null));
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
    if (mode === 'create') clearDraft(draftScope);
    setDirty(false);
    setDiscardOpen(false);
    router.push(mode === 'edit' ? (scope?.manageHref ?? '/toi/tin-cua-toi') : (scope?.homeHref ?? '/tin'));
  };

  const title =
    mode === 'edit'
      ? t('listing.form.title_edit')
      : feature
        ? t('listing.form.hero_title', { feature: t(`common.feature.${feature}`) })
        : t('listing.form.title_new');

  if (result) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 sm:px-0 sm:pt-0">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-fg outline-none">
          {title}
        </h1>
        <FormResult
          result={result}
          mode={mode}
          onPostAnother={reset}
          manageHref={scope?.manageHref}
          editHref={scope ? miniAppEditPath(scope.manageHref, result.id) : undefined}
        />
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

  /** Nút quay lại ở header: lùi một bước; không lùi được nữa → huỷ (hỏi lại nếu đang soạn dở). */
  const canStepBack = step > 1 || (step === 1 && mode === 'create' && !listingId);
  const onHeroBack = () => {
    if (canStepBack) return goBack();
    if (dirty) setDiscardOpen(true);
    else leave();
  };
  const canDraft = step > 0 && (mode === 'create' || isDraftListing);
  const primaryLabel =
    primaryKind === 'publish'
      ? t('listing.form.submit')
      : primaryKind === 'resubmit'
        ? t('listing.manage.resubmit')
        : t('listing.form.save');

  return (
    <div className="flex flex-col gap-4 max-lg:pb-24">
      <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
        <HeaderDecor />
        <div className="relative flex flex-col gap-3 px-4 pt-3 pb-5 sm:p-6">
          <div className="flex min-h-12 items-center gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={onHeroBack}
              aria-label={canStepBack ? t('listing.form.back') : t('common.actions.cancel')}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-on-primary/20 bg-on-primary/15 outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/50 disabled:opacity-50"
            >
              <ChevronLeft aria-hidden strokeWidth={1.75} className="size-6" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none sm:text-2xl">
                {title}
              </h1>
              {step > 0 ? (
                <p className="text-sm text-on-primary/90">
                  {t('listing.form.step', { current: step, total: FORM_STEPS.length })}
                  {category ? ` · ${t(`common.category.${category}`)}` : null}
                </p>
              ) : null}
            </div>
            {canDraft ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => void submit('draft')}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-on-primary/30 bg-on-primary/15 px-4 text-sm font-semibold outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/50 disabled:opacity-50"
              >
                {t('listing.form.save_draft')}
              </button>
            ) : null}
          </div>
          {step > 0 ? (
            <ol aria-hidden className="grid grid-cols-3 gap-1.5">
              {FORM_STEPS.map((s) => (
                <li key={s} className={s <= step ? 'h-1.5 rounded-full bg-on-primary' : 'h-1.5 rounded-full bg-on-primary/30'} />
              ))}
            </ol>
          ) : null}
          {step <= 1 && mode === 'create' ? (
            <p className="flex items-center gap-2 rounded-md border border-on-primary/15 bg-on-primary/10 px-3 py-2 text-sm">
              <Timer aria-hidden strokeWidth={1.75} className="size-5 shrink-0" />
              {t('listing.form.hero_hint')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-0">
        {stored ? (
          <div
            role="region"
            aria-label={t('web.post.restore_body')}
            className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary-light p-4 sm:flex-row sm:items-center"
          >
            <p className="flex-1 text-md text-fg">{t('web.post.restore_body')}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={restoreDraft}>
                {t('listing.form.keep_editing')}
              </Button>
              <Button type="button" variant="outline" onClick={() => clearDraft(draftScope)}>
                {t('listing.form.discard_confirm')}
              </Button>
            </div>
          </div>
        ) : null}

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 3) void submit(primaryKind);
            else goNext();
          }}
        >
          {step === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-4 shadow-card sm:p-6">
              <FeaturePicker
                feature={feature}
                category={category}
                onFeature={chooseFeature}
                onCategory={chooseCategory}
                locked={!!scope}
              />
            </div>
          ) : null}
          {step === 1 ? (
            <PhotoStep
              photos={photos}
              preparing={preparing}
              error={photoError}
              showRequiredHint={feature === 'pass' || feature === 'room'}
              tipKey={cfg?.form?.photosTipKey}
              privacyNotice={cfg?.form?.privacyNotice}
              disabled={disabled}
              onAdd={(files) => void addPhotos(files)}
              onRemove={removePhoto}
              onCover={makeCover}
            />
          ) : null}
          {step === 2 && feature ? (
            <BasicsStep
              feature={feature}
              fields={fields.primary}
              display={cfg?.form}
              values={values}
              errors={errors}
              disabled={disabled}
              onChange={change}
            />
          ) : null}
          {step === 3 && category ? (
            <DetailsStep
              fields={fields.details}
              values={values}
              sites={sites}
              phone={phone}
              errors={errors}
              disabled={disabled}
              onChange={change}
            />
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

          {/* Dưới 1024px: thanh dính đáy (trên bottom nav < 640px) như thanh liên hệ ở chi tiết tin; từ 1024px: cuối form. */}
          <div className="z-30 flex items-center gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-above-nav max-lg:border-t max-lg:border-border max-lg:bg-surface/95 max-lg:px-4 max-lg:py-3 max-lg:shadow-bar max-lg:backdrop-blur-md sm:max-lg:bottom-0 sm:max-lg:pb-safe lg:border-t lg:border-border lg:pt-4">
            {canStepBack ? (
              <Button type="button" variant="ghost" disabled={disabled} onClick={goBack} className="max-lg:hidden">
                <ChevronLeft strokeWidth={1.75} aria-hidden />
                {t('listing.form.back')}
              </Button>
            ) : null}
            <div className="flex flex-1 gap-2 lg:ml-auto lg:flex-none">
              {step < 3 ? (
                <>
                  {primaryKind !== 'publish' && step > 0 ? (
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      disabled={disabled}
                      className="flex-1 lg:flex-none"
                      onClick={() => void submit(primaryKind)}
                    >
                      {primaryLabel}
                    </Button>
                  ) : null}
                  <Button type="submit" size="lg" disabled={disabled || (step === 0 && !category)} className="flex-1 lg:flex-none">
                    {t('listing.form.next')}
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  variant={primaryKind === 'publish' ? 'accent' : 'default'}
                  disabled={disabled}
                  className="flex-1 lg:flex-none"
                >
                  {primaryKind === 'publish' ? <Send strokeWidth={1.75} aria-hidden /> : null}
                  {primaryLabel}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

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
