'use client';

// Form đăng / sửa yêu cầu gọi thợ (`/goi-tho/dang-yeu-cau`, `?id=` để sửa, `?trade=` chọn sẵn loại thợ) — các khối thẻ có tiêu đề
// vạch primary: "Loại thợ" (chip 5 loại + gợi ý) → "Tiêu đề & mô tả" → "Ảnh" (≤ 4, nén 1280 px WebP ở trình duyệt → upload thẳng
// bucket request-images) → "Địa chỉ" (riêng tư: chỉ thợ được chọn thấy) → "Ngân sách" (từ – đến, không bắt buộc) → "Cần làm khi
// nào" (chip mức khẩn) → nút "Đăng yêu cầu" / "Lưu thay đổi". Thứ tự và chữ khớp app (RequestForm).
// Kiểm bằng CreateServiceRequestInput (@hp/shared, safeParse) khi bấm gửi; sau lần gửi đầu lỗi cập nhật theo từng thay đổi — lỗi = key
// errors.*, hiện dưới đúng ô; lỗi server (rate_limited 5 / ngày, message_has_phone, banned…) → ô tương ứng / toast. Không dùng
// react-hook-form (web chưa có trong dependency; thêm thư viện cần hỏi trước). Ghi qua hook @hp/core/react (RLS + trigger quyết
// định). Sửa: chỉ khi còn mở và CHƯA có báo giá (trigger báo request_has_quotes). Cần đăng nhập (proxy.ts); noindex.
// Khác app (cố ý): chưa chọn vị trí trên bản đồ (chờ key Goong) → lat / lng gửi null; khu mặc định theo hồ sơ (server đặt).
import type { AppError } from '@hp/core';
import {
  useCreateServiceRequest,
  useRequestPrivate,
  useServiceRequest,
  useSession,
  useUpdateServiceRequest,
  useUploadRequestImage,
} from '@hp/core/react';
import {
  CreateServiceRequestInput,
  LOCALES,
  type Locale,
  newUuid,
  SERVICE_REQUEST_RULES,
  SERVICE_URGENCIES,
  type ServiceTrade,
  type ServiceUrgency,
} from '@hp/shared';
import { CircleCheck, ImagePlus, Trash2, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { SignInPrompt } from '@/components/shared/sign-in-prompt';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { prepareImage } from '@/features/listing/listing-image';
import { Link, useRouter } from '@/i18n/navigation';
import { requestImageUrl } from '@/lib/images';
import { GOI_THO_PATHS, TRADE_ICON, TRADES } from '../trades';
import { MoneyInput } from './money-input';

type Photo = { key: string; preview: string; status: 'uploading' | 'done' | 'error'; path?: string; revoke?: boolean };

type Values = {
  trade: ServiceTrade;
  title: string;
  description: string;
  addressText: string;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: ServiceUrgency;
  lang: Locale;
};
type FieldName = 'trade' | 'title' | 'description' | 'addressText' | 'budgetMin' | 'budgetMax' | 'urgency' | 'images';
type Errors = Partial<Record<FieldName, string>>;

const toLocale = (value: string): Locale => ((LOCALES as readonly string[]).includes(value) ? (value as Locale) : 'vi');
/** Ô chữ tự do: rỗng → null (Zod: null = không nhập). */
const orNull = (text: string) => (text.trim() === '' ? null : text);

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
          <span aria-hidden className="h-5 w-1 rounded-full bg-primary" />
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Lỗi theo từng ô từ kết quả Zod (mỗi ô giữ lỗi đầu tiên). */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const out: Errors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string') out[key as FieldName] ??= issue.message;
  }
  return out;
}

export function RequestForm({ requestId, trade }: { requestId?: string; trade?: ServiceTrade }) {
  const t = useTranslations('tho');
  const locale = asLocale(useLocale());
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const session = useSession();
  const editing = !!requestId;
  const existing = useServiceRequest(requestId);
  const privateInfo = useRequestPrivate(requestId, editing);
  const create = useCreateServiceRequest();
  const update = useUpdateServiceRequest();
  const upload = useUploadRequestImage();
  const draftId = useRef(newUuid()).current;
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [created, setCreated] = useState<{ id: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Values>({
    trade: trade ?? 'electric_plumbing',
    title: '',
    description: '',
    addressText: '',
    budgetMin: null,
    budgetMax: null,
    urgency: 'flexible',
    lang: locale,
  });
  const ids = { title: useId(), description: useId(), address: useId(), min: useId(), max: useId() };

  /** Gộp dữ liệu form → input Zod (ô rỗng → null; ảnh = path đã upload). */
  const toInput = (v: Values, images: string[]) => ({
    trade: v.trade,
    title: v.title,
    description: orNull(v.description),
    images,
    addressText: orNull(v.addressText),
    budgetMin: v.budgetMin,
    budgetMax: v.budgetMax,
    urgency: v.urgency,
    lang: v.lang,
  });
  const donePaths = (list: Photo[]) => list.filter((p) => p.status === 'done' && p.path).map((p) => p.path as string);

  const change = (patch: Partial<Values>, list: Photo[] = photos) => {
    const next = { ...values, ...patch };
    setValues(next);
    // Sau lần gửi đầu: kiểm lại theo từng thay đổi để lỗi tự biến mất khi sửa đúng.
    if (submitted) {
      const parsed = CreateServiceRequestInput.safeParse(toInput(next, donePaths(list)));
      setErrors(parsed.success ? {} : fieldErrors(parsed.error.issues));
    }
  };

  // Sửa: điền sẵn một lần khi yêu cầu + địa chỉ riêng đã tải.
  const prefilled = useRef(false);
  useEffect(() => {
    const r = existing.data;
    if (!editing || prefilled.current || !r || privateInfo.isLoading) return;
    prefilled.current = true;
    setValues({
      trade: r.trade,
      title: r.title,
      description: r.description ?? '',
      addressText: privateInfo.data?.address_text ?? '',
      budgetMin: r.budget_min,
      budgetMax: r.budget_max,
      urgency: r.urgency,
      lang: toLocale(r.lang),
    });
    setPhotos(r.images.map((path) => ({ key: path, preview: requestImageUrl(path, 'thumb'), status: 'done' as const, path })));
  }, [editing, existing.data, privateInfo.data, privateInfo.isLoading]);

  // Thu hồi object URL của ảnh xem trước khi rời form.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      for (const p of photosRef.current) if (p.revoke) URL.revokeObjectURL(p.preview);
    },
    [],
  );

  const patchPhoto = (key: string, patch: Partial<Photo>) => setPhotos((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const uploadOne = async (key: string, file: File, index: number) => {
    const userId = session.userId;
    if (!userId) return;
    const prepared = await prepareImage(file, { longEdgePx: SERVICE_REQUEST_RULES.imageLongEdgePx, maxBytes: SERVICE_REQUEST_RULES.imageMaxBytes });
    if (prepared.error) {
      patchPhoto(key, { status: 'error' });
      toast.show(errorText(prepared.error), 'error');
      return;
    }
    try {
      const path = await upload.mutateAsync({ userId, requestId: draftId, index, body: prepared.data.blob, contentType: prepared.data.contentType });
      patchPhoto(key, { status: 'done', path });
    } catch (e) {
      patchPhoto(key, { status: 'error' });
      toast.show(errorText((e as AppError).code), 'error');
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = SERVICE_REQUEST_RULES.maxImages - photos.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (picked.length === 0) return;
    const items = picked.map((file, i) => ({
      photo: { key: `${draftId}-${Date.now()}-${i}`, preview: URL.createObjectURL(file), status: 'uploading' as const, revoke: true },
      file,
    }));
    setPhotos((list) => [...list, ...items.map((x) => x.photo)]);
    const base = photos.length;
    items.forEach((item, i) => void uploadOne(item.photo.key, item.file, base + i));
  };

  const busy = photos.some((p) => p.status === 'uploading');
  const hasQuotes = editing && (existing.data?.quotes_count ?? 0) > 0;
  const saving = create.isPending || update.isPending;
  const err = (name: FieldName) => (errors[name] ? errorText(errors[name]) : null);

  const onServerError = (e: AppError) => {
    const next: Errors = {};
    for (const [path, codes] of Object.entries(e.fieldErrors ?? {})) next[path as FieldName] = codes[0] ?? 'invalid_input';
    if (e.code === 'message_has_phone' || e.code === 'message_profanity') next.title = e.code;
    setErrors(next);
    toast.show(errorText(e.code), 'error');
  };

  const submit = () => {
    if (saving || busy) return;
    setSubmitted(true);
    const images = donePaths(photos);
    const parsed = CreateServiceRequestInput.safeParse(toInput(values, images));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    const v = parsed.data;
    if (editing && requestId) {
      update.mutate(
        {
          id: requestId,
          title: v.title,
          description: v.description,
          images,
          addressText: v.addressText,
          budgetMin: v.budgetMin,
          budgetMax: v.budgetMax,
          urgency: v.urgency,
        },
        {
          onSuccess: () => {
            toast.show(t('form.save'));
            router.push(GOI_THO_PATHS.request(requestId));
          },
          onError: onServerError,
        },
      );
      return;
    }
    create.mutate({ ...v, images }, { onSuccess: (r) => setCreated({ id: r.id }), onError: onServerError });
  };

  if (!session.isLoading && !session.userId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <SignInPrompt />
      </div>
    );
  }

  if (created) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-12 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheck strokeWidth={1.75} className="size-9" />
        </span>
        <h1 className="text-2xl font-bold text-fg">{t('form.success_title')}</h1>
        <p className="text-md text-muted">{t('form.success_body')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={GOI_THO_PATHS.request(created.id)}>{t('form.success_cta')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={GOI_THO_PATHS.home}>{t('tabs.home')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (editing) {
    if (existing.isLoading || privateInfo.isLoading) {
      return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      );
    }
    if (existing.error) {
      return existing.error.code === 'not_found' ? (
        <EmptyState
          title={t('list.empty_title')}
          action={
            <Button asChild>
              <Link href={GOI_THO_PATHS.home}>{t('list.title')}</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState code={existing.error.code} onRetry={() => void existing.refetch()} />
      );
    }
  }

  return (
    <form
      noValidate
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:py-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h1 className="text-2xl font-bold text-fg">{t(editing ? 'form.title_edit' : 'form.title_new')}</h1>
      {hasQuotes ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-md text-fg">
          <TriangleAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          {t('form.edit_locked')}
        </p>
      ) : null}

      <Block title={t('form.trade')}>
        <div role="group" aria-label={t('form.trade')} className="flex flex-wrap gap-2">
          {TRADES.map((code) => {
            const Icon = TRADE_ICON[code];
            return (
              <ChoiceChip key={code} selected={values.trade === code} disabled={editing} onClick={() => change({ trade: code })}>
                <Icon strokeWidth={1.75} className="size-4" aria-hidden />
                {t(`trade.${code}`)}
              </ChoiceChip>
            );
          })}
        </div>
        <p className="text-sm text-muted">{t(`trade_hint.${values.trade}`)}</p>
      </Block>

      <Block title={t('form.title')}>
        <Field id={ids.title} label={t('form.title')} error={err('title')}>
          <Input
            id={ids.title}
            value={values.title}
            maxLength={SERVICE_REQUEST_RULES.titleMax}
            placeholder={t('form.title_placeholder')}
            disabled={hasQuotes}
            aria-invalid={!!errors.title || undefined}
            onChange={(e) => change({ title: e.target.value })}
          />
        </Field>
        <Field id={ids.description} label={t('form.description')} error={err('description')}>
          <Textarea
            id={ids.description}
            value={values.description}
            rows={4}
            maxLength={SERVICE_REQUEST_RULES.descriptionMax}
            placeholder={t('form.description_placeholder')}
            disabled={hasQuotes}
            aria-invalid={!!errors.description || undefined}
            onChange={(e) => change({ description: e.target.value })}
          />
        </Field>
      </Block>

      <Block title={t('form.photos')} subtitle={t('form.photos_hint', { max: SERVICE_REQUEST_RULES.maxImages })}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <li key={p.key} className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2">
              <Image src={p.preview} alt="" fill unoptimized sizes="160px" className={p.status === 'uploading' ? 'object-cover opacity-50' : 'object-cover'} />
              {p.status === 'error' ? (
                <span className="absolute inset-x-1 top-1 rounded-sm bg-danger px-1.5 py-0.5 text-xs font-semibold text-on-primary">{errorText('upload_failed')}</span>
              ) : null}
              <button
                type="button"
                aria-label={t('actions.cancel')}
                disabled={saving}
                onClick={() => {
                  if (p.revoke) URL.revokeObjectURL(p.preview);
                  setPhotos((list) => list.filter((x) => x.key !== p.key));
                }}
                className="absolute right-1 bottom-1 inline-flex size-9 items-center justify-center rounded-full bg-surface/90 text-fg shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Trash2 strokeWidth={1.75} className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {photos.length < SERVICE_REQUEST_RULES.maxImages && !hasQuotes ? (
            <li>
              <button
                type="button"
                disabled={saving}
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface-2 text-sm text-muted outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ImagePlus strokeWidth={1.75} className="size-6" aria-hidden />
                {photos.length}/{SERVICE_REQUEST_RULES.maxImages}
              </button>
            </li>
          ) : null}
        </ul>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {errors.images ? (
          <p role="alert" className="text-sm text-danger">
            {errorText(errors.images)}
          </p>
        ) : null}
      </Block>

      <Block title={t('form.address')}>
        <Field id={ids.address} label={t('form.address')} error={err('addressText')} hint={t('form.address_private')}>
          <Input
            id={ids.address}
            value={values.addressText}
            maxLength={SERVICE_REQUEST_RULES.addressMax}
            placeholder={t('form.address_placeholder')}
            aria-invalid={!!errors.addressText || undefined}
            onChange={(e) => change({ addressText: e.target.value })}
          />
        </Field>
      </Block>

      <Block title={t('form.budget')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={ids.min} label={t('form.budget_min')} error={err('budgetMin')}>
            <MoneyInput id={ids.min} value={values.budgetMin} onChange={(n) => change({ budgetMin: n })} disabled={hasQuotes} aria-invalid={!!errors.budgetMin || undefined} />
          </Field>
          <Field id={ids.max} label={t('form.budget_max')} error={err('budgetMax')}>
            <MoneyInput id={ids.max} value={values.budgetMax} onChange={(n) => change({ budgetMax: n })} disabled={hasQuotes} aria-invalid={!!errors.budgetMax || undefined} />
          </Field>
        </div>
      </Block>

      <Block title={t('form.urgency')}>
        <div role="group" aria-label={t('form.urgency')} className="flex flex-wrap gap-2">
          {SERVICE_URGENCIES.map((u) => (
            <ChoiceChip key={u} selected={values.urgency === u} disabled={hasQuotes} onClick={() => change({ urgency: u })}>
              {t(`urgency.${u}`)}
            </ChoiceChip>
          ))}
        </div>
      </Block>

      <div className="sticky bottom-16 z-10 -mx-4 border-t border-border bg-surface/95 px-4 py-3 shadow-bar sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button type="submit" size="lg" className="w-full bg-accent text-on-accent hover:bg-accent/90" disabled={busy || hasQuotes || saving} aria-busy={saving || undefined}>
          {t(editing ? 'form.save' : 'form.submit')}
        </Button>
      </div>
    </form>
  );
}
