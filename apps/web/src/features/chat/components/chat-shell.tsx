'use client';

// Khung /tin-nhan (layout): ≥ 1024px hai cột — hộp thư trái (giữ nguyên khi đổi hội thoại), khung chat phải (trống khi
// chưa chọn). < 1024px một cột: /tin-nhan chỉ hộp thư, /tin-nhan/[id] chỉ khung chat (nút quay lại ở header khung chat).
// < 640px khung chat phủ toàn màn hình như màn chat của app (che header + thanh dưới; ô nhập dính đáy).
// Từ 640px: khung cao vừa màn hình (h-chat-panel, globals.css), cuộn bên trong.
import { useTranslations } from 'next-intl';
import { useSelectedLayoutSegment } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ConversationList } from './conversation-list';

export function ChatShell({ children }: { children: ReactNode }) {
  const t = useTranslations('chat');
  const selected = useSelectedLayoutSegment();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col sm:px-4 sm:py-4">
      <div className="flex flex-1 overflow-hidden bg-surface sm:h-chat-panel sm:flex-none sm:rounded-lg sm:border sm:border-border">
        <aside
          aria-label={t('title')}
          className={cn(
            'flex w-full flex-col sm:overflow-y-auto lg:w-96 lg:shrink-0 lg:border-r lg:border-border',
            selected && 'max-lg:hidden',
          )}
        >
          <ConversationList selectedId={selected} />
        </aside>
        <section
          className={cn(
            'flex min-w-0 flex-1 flex-col bg-surface max-sm:fixed max-sm:inset-0 max-sm:z-50',
            !selected && 'max-lg:hidden',
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
