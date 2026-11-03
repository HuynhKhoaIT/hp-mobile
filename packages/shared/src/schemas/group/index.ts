// Zod cho nhóm ghép (tuần 7): attributes theo kind (hợp đồng với groups.attributes), input tạo / sửa, bộ lọc danh sách.
// Khớp ràng buộc cột public.groups + trigger trg_groups_guard (migration 20261102110000_groups). Mã lỗi = key ns errors.
import { z } from 'zod';
import { GROUP_KINDS, GROUP_SUB_KINDS, type GroupKind } from '../../enums';
import { GROUP_RULES, GROUP_TIME_WINDOWS, maxSeatsFor } from '../../group-display';
import { LOCALES } from '../../locales';
import { SiteCode } from '../profile';

export const SKILL_LEVELS = ['any', 'beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/**
 * Trường `attributes` theo kind. Nhãn: i18n `group.attr.<key>`; giá trị enum `group.attr_value.<key>.<value>`.
 * ride: có chỗ để hành lý, nhận dừng dọc đường, ghi chú xe ("Vios trắng"). sport: trình độ.
 * `players_have` (sport, đội đã có sẵn) không nằm ở đây: form + thẻ hiển thị riêng qua groupLineup().
 */
export const GROUP_ATTRIBUTE_FIELDS = {
  ride: [
    { key: 'luggage_ok', kind: 'bool' },
    { key: 'stops_ok', kind: 'bool' },
    { key: 'vehicle_note', kind: 'text' },
  ],
  sport: [{ key: 'skill_level', kind: 'enum', options: SKILL_LEVELS }],
} as const satisfies Record<GroupKind, readonly { key: string; kind: 'bool' | 'text' | 'enum'; options?: readonly string[] }[]>;

export const GroupAttributes = {
  ride: z
    .object({
      luggage_ok: z.boolean().optional(),
      stops_ok: z.boolean().optional(),
      vehicle_note: z.string().trim().max(60, 'too_long').optional(),
    })
    .strict(),
  sport: z
    .object({
      skill_level: z.enum(SKILL_LEVELS).optional(),
      /** Đội đã có bao nhiêu người (tính cả chủ nhóm) — không bắt buộc; hiển thị bằng groupLineup(). */
      players_have: z.number().int('invalid_input').min(1, 'invalid_input').max(GROUP_RULES.maxSeats, 'invalid_input').optional(),
    })
    .strict(),
} as const satisfies Record<GroupKind, z.ZodType>;

const place = z.string().trim().min(2, 'required').max(GROUP_RULES.placeMax, 'too_long');
const lat = z.number().min(-90).max(90).nullable();
const lng = z.number().min(-180).max(180).nullable();

const fields = {
  title: z.string().trim().min(GROUP_RULES.titleMin, 'too_short').max(GROUP_RULES.titleMax, 'too_long'),
  description: z.string().trim().max(GROUP_RULES.descriptionMax, 'too_long').nullable(),
  starts_at: z.iso.datetime({ offset: true, message: 'invalid_input' }),
  seats_total: z.number().int('invalid_input').min(1, 'invalid_input').max(GROUP_RULES.maxSeats, 'invalid_input'),
  fee_per_person: z.number().int('invalid_input').min(0, 'invalid_input').max(GROUP_RULES.feeMax, 'invalid_input'),
  origin_text: place,
  destination_text: place.nullable(),
  requires_approval: z.boolean(),
  /** Ghép trận: sân trong danh mục (approved, đúng môn — trigger báo invalid_venue). Ghép xe luôn null. */
  venue_id: z.uuid('invalid_input').nullable(),
};

/** Giờ diễn ra: từ 15 phút tới 60 ngày nữa (trigger báo starts_too_soon / starts_too_far). */
function checkStartsAt(startsAt: string | undefined, ctx: z.RefinementCtx, now = Date.now()) {
  if (!startsAt) return;
  const t = Date.parse(startsAt);
  if (t < now + GROUP_RULES.minLeadMinutes * 60_000) ctx.addIssue({ code: 'custom', path: ['starts_at'], message: 'starts_too_soon' });
  else if (t > now + GROUP_RULES.maxDaysAhead * 86_400_000) ctx.addIssue({ code: 'custom', path: ['starts_at'], message: 'starts_too_far' });
}

type Checked = {
  kind: GroupKind;
  sub_kind: string;
  seats_total?: number;
  destination_text?: string | null;
  attributes?: Record<string, unknown>;
  starts_at?: string;
  venue_id?: string | null;
};

function refineGroup(v: Checked, ctx: z.RefinementCtx) {
  if (!(GROUP_SUB_KINDS[v.kind] as readonly string[]).includes(v.sub_kind)) {
    ctx.addIssue({ code: 'custom', path: ['sub_kind'], message: 'invalid_input' });
  }
  if (v.seats_total !== undefined && v.seats_total > maxSeatsFor(v.kind, v.sub_kind)) {
    ctx.addIssue({ code: 'custom', path: ['seats_total'], message: 'invalid_input' });
  }
  if (v.kind === 'ride' && v.destination_text === null) {
    ctx.addIssue({ code: 'custom', path: ['destination_text'], message: 'required' });
  }
  if (v.attributes) {
    const parsed = GroupAttributes[v.kind].safeParse(v.attributes);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', path: ['attributes', ...issue.path], message: issue.message.startsWith('too_') ? issue.message : 'invalid_input' });
      }
    }
  }
  if (v.kind !== 'sport' && v.venue_id) {
    ctx.addIssue({ code: 'custom', path: ['venue_id'], message: 'invalid_venue' });
  }
  checkStartsAt(v.starts_at, ctx);
}

/** Tạo nhóm. host_id / status / site do server đặt (site theo hồ sơ chủ nhóm). */
export const CreateGroupInput = z
  .object({
    kind: z.enum(GROUP_KINDS),
    sub_kind: z.string(),
    title: fields.title,
    description: fields.description.default(null),
    starts_at: fields.starts_at,
    seats_total: fields.seats_total,
    fee_per_person: fields.fee_per_person.default(0),
    origin_text: fields.origin_text,
    origin_lat: lat.default(null),
    origin_lng: lng.default(null),
    destination_text: fields.destination_text.default(null),
    destination_lat: lat.default(null),
    destination_lng: lng.default(null),
    attributes: z.record(z.string(), z.unknown()).default({}),
    requires_approval: fields.requires_approval.default(true),
    venue_id: fields.venue_id.default(null),
    lang: z.enum(LOCALES).default('vi'),
  })
  .strict()
  .superRefine(refineGroup);
export type CreateGroupInput = z.input<typeof CreateGroupInput>;
export type CreateGroupValues = z.output<typeof CreateGroupInput>;

/** Sửa nhóm (kind / sub_kind không đổi — gửi kèm để kiểm). Chỉ gửi trường đổi. */
export const UpdateGroupInput = z
  .object({
    kind: z.enum(GROUP_KINDS),
    sub_kind: z.string(),
    title: fields.title.optional(),
    description: fields.description.optional(),
    starts_at: fields.starts_at.optional(),
    seats_total: fields.seats_total.optional(),
    fee_per_person: fields.fee_per_person.optional(),
    origin_text: fields.origin_text.optional(),
    origin_lat: lat.optional(),
    origin_lng: lng.optional(),
    destination_text: fields.destination_text.optional(),
    destination_lat: lat.optional(),
    destination_lng: lng.optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    requires_approval: fields.requires_approval.optional(),
    venue_id: fields.venue_id.optional(),
  })
  .strict()
  .superRefine(refineGroup);
export type UpdateGroupInput = z.input<typeof UpdateGroupInput>;

/** Bộ lọc danh sách nhóm (search params web, state app). Khớp tham số RPC search_groups. */
export const GroupFilters = z
  .object({
    subKinds: z.array(z.string()).max(3),
    query: z.string().trim().max(100, 'too_long'),
    site: SiteCode,
    when: z.enum(GROUP_TIME_WINDOWS),
    destLat: z.number().min(-90).max(90),
    destLng: z.number().min(-180).max(180),
    destRadiusM: z.number().int().min(100).max(100_000),
    includeFull: z.boolean(),
  })
  .partial()
  .strict();
export type GroupFilters = z.infer<typeof GroupFilters>;

/** Đánh giá chủ nhóm sau khi nhóm diễn ra (RPC rate_group). */
export const RateGroupInput = z
  .object({
    groupId: z.uuid('invalid_input'),
    score: z.number().int('invalid_input').min(1, 'invalid_input').max(5, 'invalid_input'),
    comment: z.string().trim().max(GROUP_RULES.ratingCommentMax, 'too_long').nullable().default(null),
  })
  .strict();
export type RateGroupInput = z.input<typeof RateGroupInput>;
