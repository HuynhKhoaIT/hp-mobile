'use client';

// Chạy một Server Action admin trong transition: thành công → toast + callback; lỗi → toast errors.<code>.
// Action đã revalidatePath layout /admin nên dữ liệu server làm mới trong cùng lượt (không cần router.refresh).
import { useTransition } from 'react';
import { useToast } from '@/components/shared/toast';
import { useErrorText } from '@/features/auth/components/use-error-text';
import type { ActionResult } from '@/lib/action-result';

export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const errorText = useErrorText();

  const run = <T>(action: () => Promise<ActionResult<T>>, opts: { success?: string | ((data: T) => string); onDone?: (data: T) => void; onError?: (code: string) => void } = {}) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        const msg = typeof opts.success === 'function' ? opts.success(result.data) : opts.success;
        if (msg) toast.show(msg);
        opts.onDone?.(result.data);
      } else {
        toast.show(errorText(result.code), 'error');
        opts.onError?.(result.code);
      }
    });

  return { pending, run };
}
