-- Nhật ký tin Zalo đã gửi cho admin: một view duy nhất để staff xem MỌI tin (tự động + bán tự động) kèm tên người gửi và tên người
-- nhận, lọc / phân trang ở PostgREST như cskh_queue. Không chứa SĐT (zalo_messages vốn không lưu SĐT).
--
-- ┌───────────────────┬─────────────────────────────┐
-- │ Vai trò           │ select zalo_message_log     │
-- ├───────────────────┼─────────────────────────────┤
-- │ anon              │ lỗi 42501 (không có grant)  │
-- │ user / bị cấm     │ 0 dòng (is_staff() = false) │
-- │ moderator, admin  │ mọi dòng                    │
-- └───────────────────┴─────────────────────────────┘
-- security_invoker: quyền đọc các bảng gốc (zalo_messages, profiles, marketing_leads) theo RLS của người gọi; `is_staff()` trong
-- where để người không phải staff luôn nhận 0 dòng dù có đọc được một phần bảng gốc.

create index zalo_messages_created_idx on public.zalo_messages (created_at desc);

create view public.zalo_message_log with (security_invoker = true) as
select
  m.id,
  m.created_at,
  m.staff_id,
  sp.full_name as staff_name,
  m.target_type,
  m.target_id,
  case m.target_type when 'lead' then l.name else tp.full_name end as target_name,
  m.kind,
  m.mode,
  m.status,
  m.error,
  m.content
from public.zalo_messages m
left join public.profiles sp on sp.id = m.staff_id
left join public.marketing_leads l on m.target_type = 'lead' and l.id = m.target_id
left join public.profiles tp on m.target_type = 'user' and tp.id = m.target_id
where (select public.is_staff());

comment on view public.zalo_message_log is
  'Nhật ký tin Zalo cho staff: tin + người gửi + tên người nhận (lead / người dùng). Không SĐT.';
grant select on public.zalo_message_log to authenticated;
