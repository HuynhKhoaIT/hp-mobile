'use server';
// Form lead (landing, /cho-chu-tro). Công khai nên có honeypot + rate limit theo hash IP (RPC check_rate_limit).
// Dùng client service role vì marketing_leads không cho anon / authenticated thêm (supabase/CLAUDE.md mục 4 "Marketing");
// đây là ngoại lệ duy nhất ngoài khu admin (eslint.config.mjs). Không log liên hệ.
import { createHash } from 'node:crypto';
import { submitLead } from '@hp/core';
import { LEAD_KINDS, LOCALES, type LeadInput } from '@hp/shared';
import { headers } from 'next/headers';
import { type ActionResult, err, fromResult, ok } from '@/lib/action-result';
import { createAdminClient } from '@/lib/supabase/admin';

export type LeadFormState = ActionResult<null> | null;

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

function parseUtm(raw: string): LeadInput['utm'] {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** Vercel tự đặt x-real-ip (client không giả được); x-forwarded-for dự phòng khi tự host sau proxy tin cậy. */
async function hashedIp(salt: string): Promise<string> {
  const h = await headers();
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function submitLeadAction(_prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  // Bot điền ô ẩn: trả như thành công, không lưu, không báo cho bot biết.
  if (text(form, 'website') !== '') return ok(null);
  const salt = process.env.IP_HASH_SALT;
  if (!salt) return err('unknown');

  const kind = text(form, 'kind');
  const locale = text(form, 'locale');
  const lead = {
    contact: text(form, 'contact'),
    kind: LEAD_KINDS.find((k) => k === kind) ?? 'user',
    name: text(form, 'name') || undefined,
    message: text(form, 'message') || undefined,
    source: text(form, 'source') || undefined,
    locale: LOCALES.find((l) => l === locale) ?? 'vi',
    utm: parseUtm(text(form, 'utm')),
    consent: form.get('consent') === 'on',
  } as LeadInput;

  return fromResult(await submitLead(createAdminClient(), { lead, ipHash: await hashedIp(salt) }));
}
