// AppPromoCard — thẻ mời tải app cho tính năng chỉ có trên app (capabilities.appOnly của @hp/core: push, reminders…),
// đặt đúng ngữ cảnh (vd sau khi tham gia nhóm: "Tải app để được nhắc trước giờ đi"). Không popup, không chặn tính năng
// cốt lõi (apps/web/CLAUDE.md §7). Feature không thuộc appOnly → không render gì (tính năng đó có trên web).
// Nút store chỉ hiện khi có link trong env (NEXT_PUBLIC_APP_STORE_URL / NEXT_PUBLIC_PLAY_STORE_URL); chưa có mã QR
// (chưa có thư viện QR — trang /tai-app tuần 11). Không hook ngoài useTranslations: dùng được ở server lẫn client.
import { isAppOnly } from '@hp/core';
import { BellRing } from 'lucide-react';
import { useTranslations } from 'next-intl';

const STORE_LINKS = [
  { key: 'get_app_ios', href: process.env.NEXT_PUBLIC_APP_STORE_URL },
  { key: 'get_app_android', href: process.env.NEXT_PUBLIC_PLAY_STORE_URL },
] as const;

export function AppPromoCard({ feature, title, body }: { feature: string; title: string; body: string }) {
  const t = useTranslations('web.home');
  if (!isAppOnly(feature)) return null;
  const stores = STORE_LINKS.filter((s): s is { key: (typeof s)['key']; href: string } => !!s.href);

  return (
    <aside className="flex flex-col gap-3 rounded-lg bg-primary-light p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
          <BellRing strokeWidth={1.75} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-md font-semibold text-fg">{title}</p>
          <p className="text-md text-fg">{body}</p>
        </div>
      </div>
      {stores.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <li key={s.key}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-md font-semibold text-on-primary outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t(s.key)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
