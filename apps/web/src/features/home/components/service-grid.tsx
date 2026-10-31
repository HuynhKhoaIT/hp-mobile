// Lưới dịch vụ (docs/design/home.md §4.3, §10): thẻ surface nổi đè lên dải xanh 48px (-mt-12), 4 × 2 trên điện thoại,
// 8 cột từ 768px. Ô: khung icon 56 bo lg nền dịch vụ nhạt + icon 28 + nhãn 1–2 dòng (không cắt chữ, khung nhãn min-h-10).
// Nhãn góc "Sắp có" (ô mờ, vẫn bấm được → trang "Sắp có") / "Mới". Hiện lần lượt khi tải (stagger 30ms, trượt 8px;
// giảm chuyển động → chỉ mờ dần 150ms). Server Component: link thật, chạy khi tắt JS.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { HOME_TILE_VIEWS } from '../services';

/** Độ trễ xuất hiện từng ô (motion.stagger 30ms × 8) — class đầy đủ để Tailwind quét được. */
const STAGGER = ['delay-0', 'delay-30', 'delay-60', 'delay-90', 'delay-120', 'delay-150', 'delay-180', 'delay-210'] as const;

export async function ServiceGrid() {
  const t = await getTranslations();
  return (
    <nav aria-label={t('web.home.services_title')} className="relative rounded-xl bg-surface p-4 shadow-card">
      <ul className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-8">
        {HOME_TILE_VIEWS.map((tile, i) => {
          const label = t(tile.labelKey);
          const badge = tile.soon ? t('common.home.badge.soon') : tile.isNew ? t('common.home.badge.new') : null;
          return (
            <li
              key={tile.id}
              className={cn(
                'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300',
                'motion-reduce:slide-in-from-bottom-0 motion-reduce:delay-0 motion-reduce:duration-150',
                STAGGER[i],
              )}
            >
              <Link
                href={tile.href}
                aria-disabled={tile.soon || undefined}
                aria-label={badge ? `${label} (${badge})` : undefined}
                className={cn(
                  'group flex h-full flex-col items-center gap-2 rounded-lg px-0.5 py-1 outline-none transition duration-200',
                  'hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 motion-reduce:active:scale-100',
                )}
              >
                <span
                  className={cn(
                    'relative flex size-14 shrink-0 items-center justify-center rounded-lg transition-transform duration-200',
                    'group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0',
                    tile.soft,
                  )}
                >
                  <tile.Icon aria-hidden strokeWidth={1.75} className={cn('size-7', tile.fg, tile.soon && 'opacity-60')} />
                  {badge ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-2 ring-surface',
                        tile.soon ? 'bg-surface-2 text-muted' : 'bg-accent text-on-accent',
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'flex min-h-10 items-start justify-center text-center text-sm leading-tight font-medium text-fg',
                    tile.soon && 'opacity-60',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
