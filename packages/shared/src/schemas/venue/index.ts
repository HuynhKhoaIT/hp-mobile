// Zod cho danh mục sân (venues, migration 20261103090000_venues). Mã lỗi = key ns errors.
import { z } from 'zod';
import { GROUP_SUB_KINDS } from '../../enums';

/** Góp sân mới (chờ moderator duyệt). created_by / status / site do server đặt (site theo hồ sơ). */
export const ContributeVenueInput = z
  .object({
    name: z.string().trim().min(2, 'too_short').max(120, 'too_long'),
    sports: z.array(z.enum(GROUP_SUB_KINDS.sport)).min(1, 'required').max(3, 'invalid_input'),
    address_text: z.string().trim().max(200, 'too_long').nullable().default(null),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    price_ref: z.number().int('invalid_input').min(0, 'invalid_input').max(100_000_000, 'invalid_input').nullable().default(null),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 .]{7,14}$/, 'phone_invalid')
      .nullable()
      .default(null),
  })
  .strict();
export type ContributeVenueInput = z.input<typeof ContributeVenueInput>;
export type ContributeVenueValues = z.output<typeof ContributeVenueInput>;
