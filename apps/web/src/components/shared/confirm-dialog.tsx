'use client';

// ConfirmDialog — xác nhận hành động khó hoàn tác (bỏ tin đang soạn, đánh dấu đã bán, xoá tin). Ghi rõ hành động trong
// tiêu đề + nội dung; nút xác nhận mang tên hành động (không "OK"). Điều khiển bằng `open` / `onOpenChange` từ nơi gọi.
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Mặc định "Huỷ". */
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations('common.actions');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
