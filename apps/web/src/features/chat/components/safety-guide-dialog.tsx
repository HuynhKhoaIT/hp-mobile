'use client';

// Hướng dẫn giao dịch an toàn — hiện một lần trước cuộc trò chuyện đầu tiên trên trình duyệt này (giống SafetyGuideSheet
// của app): gặp nơi đông người, kiểm tra trước khi trả tiền, không đặt cọc, thấy lừa đảo thì Báo cáo. Đóng = đã hiểu.
import type { LucideIcon } from 'lucide-react';
import { Flag, HandCoins, MapPin, SearchCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TIPS: [LucideIcon, string][] = [
  [MapPin, 'tip_meet'],
  [SearchCheck, 'tip_check'],
  [HandCoins, 'tip_deposit'],
  [Flag, 'tip_report'],
];

export function SafetyGuideDialog({ open, onAccept }: { open: boolean; onAccept: () => void }) {
  const t = useTranslations('chat.safety');
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onAccept()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('intro')}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {TIPS.map(([Icon, key]) => (
            <li key={key} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <Icon aria-hidden strokeWidth={1.75} className="size-5" />
              </span>
              <span className="flex-1 pt-2 text-md text-fg">{t(key)}</span>
            </li>
          ))}
        </ul>
        <Button type="button" size="lg" onClick={onAccept}>
          {t('accept')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
