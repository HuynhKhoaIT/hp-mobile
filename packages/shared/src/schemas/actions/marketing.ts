// Lead marketing (form landing, /cho-chu-tro) — khớp bảng marketing_leads (migration 20261106090000_marketing_leads).
// Mã lỗi (message) là key ns errors.
import { z } from 'zod';
import { LOCALES } from '../../locales';
import { normalizeVnPhone } from '../../phone';

export const LEAD_KINDS = ['user', 'landlord', 'venue', 'employer'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD = { nameMax: 80, messageMax: 500, contactMax: 120, noteMax: 1000 } as const;

const UTM_VALUE = z
  .string()
  .trim()
  .max(100)
  .regex(/^[\w.\-+ ]*$/u);

/** utm_* lấy từ searchParams / cookie khi khách vào trang; giá trị lạ bị bỏ. Cột marketing_leads.utm. */
export const LeadUtmSchema = z.object({
  utm_source: UTM_VALUE.optional().catch(undefined),
  utm_medium: UTM_VALUE.optional().catch(undefined),
  utm_campaign: UTM_VALUE.optional().catch(undefined),
  utm_term: UTM_VALUE.optional().catch(undefined),
  utm_content: UTM_VALUE.optional().catch(undefined),
});
export type LeadUtm = z.infer<typeof LeadUtmSchema>;

/**
 * Form lead. `contact` là SĐT Việt Nam hoặc email; sau parse thành `contact` chuẩn hoá (84… / email chữ thường)
 * + `contactType`. `consent` bắt buộc true (Nghị định 13/2023).
 */
export const LeadInput = z
  .object({
    contact: z.string().trim().min(1, 'required').max(LEAD.contactMax, 'too_long'),
    kind: z.enum(LEAD_KINDS, 'invalid_input'),
    name: z.string().trim().max(LEAD.nameMax, 'too_long').optional(),
    site: z
      .string()
      .regex(/^[a-z0-9_]{1,40}$/, 'invalid_input')
      .optional(),
    message: z.string().trim().max(LEAD.messageMax, 'too_long').optional(),
    source: z
      .string()
      .regex(/^[a-z0-9_-]{1,40}$/, 'invalid_input')
      .default('landing'),
    locale: z.enum(LOCALES, 'invalid_input'),
    utm: LeadUtmSchema.default({}),
    consent: z.literal(true, 'consent_required'),
  })
  .transform((v, ctx) => {
    const raw = v.contact;
    let contact: string | null = null;
    let contactType: 'email' | 'phone' = 'phone';
    if (raw.includes('@')) {
      const email = z.email().safeParse(raw.toLowerCase());
      contact = email.success ? email.data : null;
      contactType = 'email';
    } else {
      contact = normalizeVnPhone(raw);
    }
    if (!contact) {
      ctx.addIssue({ code: 'custom', message: 'contact_invalid', path: ['contact'] });
      return z.NEVER;
    }
    return {
      contact,
      contactType,
      kind: v.kind,
      name: v.name || undefined,
      site: v.site,
      message: v.message || undefined,
      source: v.source,
      locale: v.locale,
      utm: v.utm,
    };
  });
export type LeadInput = z.input<typeof LeadInput>;
export type LeadParsed = z.output<typeof LeadInput>;

/** Staff đổi trạng thái / ghi chú lead. */
export const LeadUpdateInput = z.object({
  id: z.uuid('invalid_input'),
  status: z.enum(LEAD_STATUSES, 'invalid_input'),
  note: z.string().trim().max(LEAD.noteMax, 'too_long').optional(),
});
export type LeadUpdateInput = z.input<typeof LeadUpdateInput>;
