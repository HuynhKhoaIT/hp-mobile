// Template push 3 ngôn ngữ từ ns `push` của @hp/shared (nguồn duy nhất của chữ; client dịch cùng khoá này).
import enPush from '../../../packages/shared/i18n/en/push.json' with { type: 'json' };
import viPush from '../../../packages/shared/i18n/vi/push.json' with { type: 'json' };
import zhPush from '../../../packages/shared/i18n/zh/push.json' with { type: 'json' };

const TEMPLATES: Record<string, Record<string, unknown>> = { vi: viPush, en: enPush, zh: zhPush };

/** Chuỗi theo khoá chấm ("new_message.title") trong ns push của locale; thiếu → vi; không có → null. */
export function pushTemplate(locale: string | null | undefined, key: string): string | null {
  for (const l of [locale ?? 'vi', 'vi']) {
    let node: unknown = TEMPLATES[l];
    for (const part of key.split('.')) node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
    if (typeof node === 'string') return node;
  }
  return null;
}
