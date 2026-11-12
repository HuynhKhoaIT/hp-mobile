'use client';

// Trang "Bộ lọc & tìm kiếm" của mini-app (/pass-do/bo-loc — Stitch filter). Một form GET tới trang chủ mini-app (/pass-do?…):
// tắt JS vẫn lọc được (lựa chọn là radio / checkbox gốc của trình duyệt, kiểu viên thuốc qua `has-checked:`).
// Khối: Tìm (ô từ khoá + "Tìm gần đây" — chỉ trình duyệt, localStorage, tối đa 8, xoá từng mục / xoá hết) → Danh mục (Tất cả
// + 10 danh mục, chọn 1) + "Loại đồ cụ thể" (giá trị enum của trường loại đồ của danh mục đang chọn — categoryTypeField;
// không JS: hiện theo ?category= lúc mở trang) → Vị trí (khu, ?site=) + Khoảng cách tới khu (Toàn bộ / < N km, ?distance=)
// → Khoảng giá (ô tối thiểu / tối đa ?price_min= / ?price_max= + khoảng đặt sẵn ?price= + "Cho tặng" ?free=1) → Tình trạng
// (?condition=; ẩn khi danh mục không có trường tình trạng) → Sắp xếp (?sort=) → thanh "Áp dụng" dính đáy (trên thanh điều
// hướng dưới của điện thoại) kèm số bộ lọc đang chọn.
// Có JS: kiểm giá (tối thiểu ≤ tối đa — báo lỗi tại ô, không gửi), chọn khoảng đặt sẵn thì xoá ô nhập và ngược lại; "Cho
// tặng" loại trừ giá (bật Cho tặng → xoá ô giá + khoảng giá; nhập giá / chọn khoảng → tắt Cho tặng — tin cho tặng không có
// giá, gộp hai thứ luôn ra rỗng; tắt JS thì parseListFilters cho Cho tặng thắng); ô giá chỉ nhận số, tối đa PRICE_INPUT_MAX;
// bấm một mục "Tìm gần đây" → điền ô tìm và gửi luôn; gửi thì bỏ tham số rỗng (URL gọn) + ghi "Tìm gần đây" rồi điều hướng
// mềm. Thuộc tính đang lọc không có ô ở đây (vd chip nhanh "Xe máy" khi chưa chọn danh mục) giữ qua input ẩn — nhưng đổi danh
// mục (kể cả "Tất cả danh mục") thì bỏ mọi "loại đồ" (categoryTypeField của mọi danh mục) + thuộc tính không thuộc danh mục
// mới, để không gửi bộ lọc vô hình.
// Khác Stitch (cố ý): không "Thợ cơ khí" gợi ý, "Tự định vị" (web không đọc vị trí máy), công tắc xác thực thẻ / video test /
// hẹn cổng không cọc / bán gấp, sắp xếp "Gần tôi nhất" / "Xem nhiều nhất", khối "Tin phù hợp hàng đầu" và số kết quả trên
// nút Áp dụng — chưa có dữ liệu / RPC.
import { ATTRIBUTE_FIELDS, CONDITIONS, type ListingCategory, type ListingFeature, LISTING_SORTS } from '@hp/shared';
import { Gift, History, LayoutGrid, type LucideIcon, MapPin, Search, ShieldCheck, SlidersHorizontal, Wallet, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, type ReactNode, type Ref, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import {
  activeFilterCount,
  attributesFor,
  categoryTypeField,
  filterOptionsOf,
  type ListFilterState,
  PRICE_INPUT_MAX,
  parsePriceInput,
} from '../../filters';
import { rememberSearch, useRecentSearches } from '../../recent-searches';

const CHIP =
  'relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-md font-medium text-fg transition-colors select-none hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-light has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50';
const CARD = 'flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card';
const LEGEND = 'mb-2 text-sm font-semibold text-muted';

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={CARD}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="flex items-center gap-2 text-lg font-bold text-fg">
          <Icon aria-hidden strokeWidth={1.75} className="size-5 text-primary" />
          {title}
        </h2>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

type Choice = { value: string; label: string };

/** Nhóm radio dạng viên thuốc. `value` + `onChange` → điều khiển; không có → defaultChecked theo `initial`. */
function RadioChips({
  name,
  legend,
  choices,
  initial,
  value,
  onChange,
  className,
}: {
  name: string;
  legend: string;
  choices: Choice[];
  initial?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset>
      <legend className={LEGEND}>{legend}</legend>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {choices.map((c) => (
          <label key={c.value || 'any'} className={CHIP}>
            <input
              type="radio"
              name={name}
              value={c.value}
              className="sr-only"
              {...(onChange
                ? { checked: value === c.value, onChange: () => onChange(c.value) }
                : { defaultChecked: (initial ?? '') === c.value })}
            />
            <span className="text-center">{c.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Số ô đang có giá trị (bỏ ô rỗng và sắp xếp mặc định) — chữ cạnh nút Áp dụng. */
function countFilled(form: HTMLFormElement): number {
  let n = 0;
  for (const [key, value] of new FormData(form)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    if (key === 'sort' && value === 'newest') continue;
    n += 1;
  }
  return n;
}

/** Chỉ chữ số, bỏ số 0 đầu, chặn ở PRICE_INPUT_MAX (giá trị lớn nhất parsePriceInput nhận). */
function priceDigits(v: string): string {
  const digits = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits && Number(digits) > PRICE_INPUT_MAX ? String(PRICE_INPUT_MAX) : digits;
}

export function MiniAppFilterForm({
  feature,
  initial,
  sites,
  action,
}: {
  feature: ListingFeature;
  initial: ListFilterState;
  sites: { code: string; name: string }[];
  /** Đường dẫn trang chủ mini-app đã có tiền tố ngôn ngữ (form GET khi tắt JS). */
  action: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const options = filterOptionsOf(cfg);
  const recent = useRecentSearches(feature);
  const qRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const [category, setCategory] = useState<ListingCategory | ''>(initial.category ?? '');
  const [priceRange, setPriceRange] = useState(initial.priceRange ?? '');
  const [priceMin, setPriceMin] = useState(initial.priceMin ? String(initial.priceMin) : '');
  const [priceMax, setPriceMax] = useState(initial.priceMax ? String(initial.priceMax) : '');
  const [priceError, setPriceError] = useState(false);
  const [freeOnly, setFreeOnly] = useState(initial.freeOnly);
  const [count, setCount] = useState(activeFilterCount(initial) + (initial.sort !== 'newest' ? 1 : 0));

  const typeField = category ? categoryTypeField(category) : null;
  const hasCondition = category ? ATTRIBUTE_FIELDS[category].some((f) => f.key === 'condition') : true;
  // Thuộc tính đang lọc không có ô ở form này → giữ qua input ẩn. Đổi danh mục → bỏ mọi "loại đồ" + thuộc tính không còn
  // thuộc danh mục mới (không gửi bộ lọc vô hình).
  const categoryChanged = category !== (initial.category ?? '');
  const typeKeys = new Set(cfg.categories.map((c) => categoryTypeField(c)?.key).filter(Boolean));
  const baseAttributes = categoryChanged ? attributesFor(initial.attributes, category ? [category] : cfg.categories) : initial.attributes;
  const keptAttributes = Object.entries(baseAttributes).filter(
    ([key]) => key !== 'condition' && key !== typeField?.key && !(categoryChanged && typeKeys.has(key)),
  );
  const clearPrice = () => {
    setPriceMin('');
    setPriceMax('');
    setPriceRange('');
    setPriceError(false);
  };

  const recount = (form: HTMLFormElement) => {
    // Sau khi React cập nhật DOM (đổi danh mục thay hàng "loại đồ").
    window.setTimeout(() => setCount(countFilled(form)), 0);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const min = parsePriceInput(priceMin);
    const max = parsePriceInput(priceMax);
    if (min !== null && max !== null && min > max) {
      setPriceError(true);
      minRef.current?.focus();
      return;
    }
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget)) {
      if (typeof value !== 'string') continue;
      const v = value.trim();
      if (!v || (key === 'sort' && v === 'newest')) continue;
      params.set(key, v);
    }
    const q = params.get('q');
    if (q) rememberSearch(feature, q);
    const qs = params.toString();
    router.push(qs ? `${cfg.path}?${qs}` : cfg.path);
  };

  const pickRecent = (query: string) => {
    if (!qRef.current) return;
    qRef.current.value = query;
    qRef.current.form?.requestSubmit();
  };

  return (
    <form action={action} onSubmit={onSubmit} onChange={(e) => recount(e.currentTarget)} className="flex flex-col gap-4" noValidate>
      {keptAttributes.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={typeof value === 'boolean' ? (value ? '1' : '0') : value} />
      ))}

      <section aria-label={t('listing.list.search_placeholder', { feature: t(`common.feature.${feature}`) })} className={CARD}>
        <div className="flex gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">{t('listing.list.search_placeholder', { feature: t(`common.feature.${feature}`) })}</span>
            <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <Input
              ref={qRef}
              name="q"
              type="search"
              defaultValue={initial.query}
              placeholder={t('listing.list.search_placeholder', { feature: t(`common.feature.${feature}`) })}
              maxLength={100}
              className="rounded-full pl-11"
            />
          </label>
          <Button type="submit" variant="accent" size="lg" className="rounded-full font-semibold">
            {t('listing.list.search_submit')}
          </Button>
        </div>
        {recent.list.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
                <History aria-hidden strokeWidth={1.75} className="size-4" />
                {t('listing.mini_app.filter.recent')}
              </p>
              <Button type="button" variant="link" size="sm" onClick={recent.clear}>
                {t('listing.mini_app.filter.recent_clear')}
              </Button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {recent.list.map((query) => (
                <li key={query} className="flex items-center rounded-full bg-primary-light text-primary">
                  <button
                    type="button"
                    onClick={() => pickRecent(query)}
                    className="min-h-11 max-w-60 truncate rounded-l-full pr-1 pl-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {query}
                  </button>
                  <button
                    type="button"
                    onClick={() => recent.remove(query)}
                    aria-label={t('listing.mini_app.filter.recent_remove_a11y', { query })}
                    className="flex size-11 items-center justify-center rounded-r-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <X aria-hidden strokeWidth={1.75} className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <Section icon={LayoutGrid} title={t('listing.mini_app.filter.category_title')}>
        <RadioChips
          name="category"
          legend={t('listing.mini_app.filter.category_big')}
          value={category}
          onChange={(v) => setCategory(v as ListingCategory | '')}
          choices={[
            { value: '', label: t('listing.mini_app.filter.category_all') },
            ...cfg.categories.map((c) => ({ value: c, label: t(`common.category.${c}`) })),
          ]}
        />
        {typeField ? (
          <RadioChips
            // Đổi danh mục → hàng loại đồ mới (bỏ lựa chọn cũ).
            key={typeField.key}
            name={typeField.key}
            legend={t('listing.mini_app.filter.category_sub')}
            initial={typeof initial.attributes[typeField.key] === 'string' ? (initial.attributes[typeField.key] as string) : ''}
            choices={[
              { value: '', label: t('listing.list.filter_all') },
              ...typeField.options.map((o) => ({ value: o, label: t(`listing.attr_value.${typeField.key}.${o}`) })),
            ]}
          />
        ) : null}
      </Section>

      <Section icon={MapPin} title={t('listing.mini_app.filter.location_title')} hint={t('listing.mini_app.filter.location_hint')}>
        {sites.length > 0 ? (
          <RadioChips
            name="site"
            legend={t('listing.list.site_filter')}
            initial={initial.site ?? ''}
            className="grid grid-cols-2"
            choices={[{ value: '', label: t('listing.mini_app.filter.location_all') }, ...sites.map((s) => ({ value: s.code, label: s.name }))]}
          />
        ) : null}
        {(options.distanceKm ?? []).length > 0 ? (
          <RadioChips
            name="distance"
            legend={t('listing.mini_app.filter.radius_title')}
            initial={initial.distanceKm === null ? '' : String(initial.distanceKm)}
            choices={[
              { value: '', label: t('listing.mini_app.filter.radius_any') },
              ...(options.distanceKm ?? []).map((km) => ({ value: String(km), label: t('listing.mini_app.filter.radius_km', { km }) })),
            ]}
          />
        ) : null}
      </Section>

      <Section icon={Wallet} title={t('listing.mini_app.filter.price_title')}>
        {options.customPrice ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <PriceInput
                ref={minRef}
                name="price_min"
                label={t('listing.mini_app.filter.price_min')}
                value={priceMin}
                invalid={priceError}
                errorId={errorId}
                onChange={(v) => {
                  setPriceMin(v);
                  setPriceError(false);
                  if (v) {
                    setPriceRange('');
                    setFreeOnly(false);
                  }
                }}
              />
              <span aria-hidden className="pb-3 text-muted">
                –
              </span>
              <PriceInput
                name="price_max"
                label={t('listing.mini_app.filter.price_max')}
                value={priceMax}
                invalid={priceError}
                errorId={errorId}
                onChange={(v) => {
                  setPriceMax(v);
                  setPriceError(false);
                  if (v) {
                    setPriceRange('');
                    setFreeOnly(false);
                  }
                }}
              />
            </div>
            {priceError ? (
              <p id={errorId} role="alert" className="text-sm font-medium text-danger">
                {t('listing.mini_app.filter.price_invalid')}
              </p>
            ) : null}
          </div>
        ) : null}
        {(options.priceRanges ?? []).length > 0 ? (
          <RadioChips
            name="price"
            legend={t('listing.price_range.label')}
            value={priceRange}
            onChange={(v) => {
              setPriceRange(v);
              if (v) {
                setPriceMin('');
                setPriceMax('');
                setPriceError(false);
                setFreeOnly(false);
              }
            }}
            choices={[
              { value: '', label: t('listing.price_range.any') },
              ...(options.priceRanges ?? []).map((r) => ({ value: r.key, label: t(`listing.price_range.${r.key}`) })),
            ]}
          />
        ) : null}
        {options.freeOnly ? (
          <label className={cn(CHIP, 'self-start')}>
            <input
              type="checkbox"
              name="free"
              value="1"
              checked={freeOnly}
              onChange={(e) => {
                const on = e.currentTarget.checked;
                setFreeOnly(on);
                if (on) clearPrice();
              }}
              className="sr-only"
            />
            <Gift aria-hidden strokeWidth={1.75} className="size-5 text-success" />
            {t('listing.list.quick_free')}
          </label>
        ) : null}
      </Section>

      {hasCondition ? (
        <Section icon={ShieldCheck} title={t('listing.mini_app.filter.condition_title')}>
          <RadioChips
            name="condition"
            legend={t('listing.attr.condition')}
            initial={typeof initial.attributes.condition === 'string' ? initial.attributes.condition : ''}
            choices={[
              { value: '', label: t('listing.mini_app.filter.condition_any') },
              ...CONDITIONS.map((c) => ({ value: c, label: t(`listing.attr_value.condition.${c}`) })),
            ]}
          />
        </Section>
      ) : null}

      {options.sortable ? (
        <Section icon={SlidersHorizontal} title={t('listing.mini_app.filter.sort_title')}>
          <fieldset>
            <legend className="sr-only">{t('listing.sort.label')}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LISTING_SORTS.map((s) => (
                <label
                  key={s}
                  className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 text-md font-medium text-fg transition-colors hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-light has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  {t(`listing.sort.${s}`)}
                  <input type="radio" name="sort" value={s} defaultChecked={initial.sort === s} className="size-5 shrink-0 accent-primary" />
                </label>
              ))}
            </div>
          </fieldset>
        </Section>
      ) : null}

      <div className="sticky z-30 max-sm:bottom-above-nav sm:bottom-4 flex items-center gap-3 rounded-lg border border-border bg-surface/95 p-3 shadow-bar backdrop-blur-md">
        <p role="status" className="min-w-0 flex-1 text-sm font-semibold text-fg">
          {count > 0 ? t('listing.mini_app.filter.active_count', { count }) : null}
        </p>
        <Button type="submit" variant="accent" size="lg" className="font-semibold">
          <SlidersHorizontal aria-hidden strokeWidth={2} />
          {t('listing.mini_app.filter.apply')}
        </Button>
      </div>
    </form>
  );
}

function PriceInput({
  ref,
  name,
  label,
  value,
  invalid,
  errorId,
  onChange,
}: {
  ref?: Ref<HTMLInputElement>;
  name: string;
  label: string;
  value: string;
  invalid: boolean;
  errorId: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <Input
        ref={ref}
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(priceDigits(e.currentTarget.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
      />
    </div>
  );
}
