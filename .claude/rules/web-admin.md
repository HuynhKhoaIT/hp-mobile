---
paths:
  - "apps/web/app/**/admin/**"
  - "apps/web/src/features/admin/**"
  - "apps/web/src/components/admin/**"
  - "apps/web/src/lib/supabase/admin.ts"
---

# Khu quản trị `/admin`

## Ranh giới
- `src/features/admin/**`, `src/components/admin/**`, `src/lib/supabase/admin.ts` chỉ được import từ `app/[locale]/admin/**` (ESLint `no-restricted-imports`). Vi phạm = code admin lọt vào bundle công khai.
- `admin.ts` (service role) chỉ trong **server action / queries của admin**; không bao giờ trong client component, không trả client ra ngoài.
- Ưu tiên client theo session + policy `is_staff()` trong `supabase/`; chỉ dùng service role khi RLS không cho staff làm việc đó, kèm comment lý do.

## Mỗi server action admin
```ts
'use server';
export async function approveListingAction(raw: unknown): Promise<ActionResult> {
  const input = ApproveListingInput.parse(raw);                          // 1. Zod
  const { user, role } = await requireStaff();                           // 2. kiểm tra LẠI ở server: moderator | admin
  if (input.permanentBan && role !== 'admin') return err('forbidden');   // 3. quyền theo hành động
  const supabase = await createServerClient();
  const r = await approveListing(supabase, input);                       // 4. @hp/core
  if (r.error) return err(r.error.code);
  await writeAudit({ actorId: user.id, action: 'listing.approve', targetType: 'listing', targetId: input.id, meta: { reason: input.reason } }); // 5
  await notifyUser(r.data.owner_id, 'listing_approved', { listingId: input.id });  // 6. notifications (key i18n + tham số)
  revalidateTag(`listing:${input.id}`); revalidatePath('/admin/moderation');       // 7
  return ok();
}
```
- Không xoá cứng: chỉ đổi `status`, `deleted_at`, `is_banned`.
- Chỉ admin: cấm vĩnh viễn, đổi vai trò, catalog, nội dung marketing, toàn bộ audit log, xuất dữ liệu. Moderator: kiểm duyệt, báo cáo, huy hiệu, khoá tạm 7 / 30 ngày, xem lead.
- Ảnh giấy tờ: `createSignedUrl(path, 300)`. SĐT che một phần; nút "Xem" gọi action ghi audit `profile.reveal_phone` rồi mới trả số.
- Tên action audit: `<đối_tượng>.<động_từ>` (`listing.approve`, `listing.reject`, `user.ban_temp`, `badge.approve`, `report.dismiss`).

## UI
- shadcn/ui; `DataTable` chung (`src/components/admin/data-table.tsx`, TanStack Table) với sort / filter / trang trên URL `searchParams`; chọn nhiều + thanh hành động hàng loạt.
- `ConfirmDialog` ghi rõ hành động + đối tượng ("Từ chối tin 'Xe Wave 2019' của An N.?"); nút có chữ cụ thể, không "OK".
- `StatusBadge` màu + chữ. Hàng chờ: sắp theo `risk_score desc`; phím tắt `A` duyệt, `R` từ chối, `J` / `K` di chuyển; sau hành động tự chuyển mục kế.
- Transition tối đa 150ms; không animation trang trí.
- Chữ admin qua next-intl ns `admin`; đủ `vi`, `en`; `zh` được phép fallback `vi` (ngoại lệ duy nhất, khai báo trong config `i18n:check`).

## Bảo vệ
- `proxy.ts` (trước đây `middleware.ts`): chưa đăng nhập → `/admin/login`; không staff → 403; chưa `aal2` → `/admin/login/mfa`; header `X-Robots-Tag: noindex, nofollow`.
- MFA bắt buộc: `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`; TOTP enroll ở lần đăng nhập đầu.
- `/admin` không trong sitemap; layout admin không render header / footer marketing; không PostHog session replay ở admin.
