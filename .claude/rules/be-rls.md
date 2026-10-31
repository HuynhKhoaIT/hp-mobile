---
paths:
  - "supabase/migrations/**"
  - "supabase/tests/**"
---

# Row Level Security

## Nguyên tắc
- Mọi bảng bật RLS trong migration tạo bảng. Không policy = không ai truy cập (đúng cho bảng nội bộ: `rate_limits`, `moderation_queue` cho user, `audit_log` cho user).
- Client chỉ ẩn / hiện; RLS là nơi duy nhất quyết định quyền. Không "tin" cột client gửi (`owner_id`, `host_id`, `role`, `is_banned`, `status` nhạy cảm) → ép bằng `with check` hoặc trigger.
- Helper (`security definer`, `stable`, `set search_path = ''`): `is_staff()`, `is_admin()`, `is_banned()`, `is_blocked(a uuid, b uuid)`, `is_member(conversation_id uuid)`.
- Tách policy theo lệnh (`for select` / `insert` / `update` / `delete`), tên `<table>_<cmd>_<ai>`: `listings_select_owner`, `listings_update_staff`. Mặc định `to authenticated`.
- `anon` chỉ `select` trên view `public_listings`, `public_profiles`, `public_groups`, bảng `sites`, `venues` (approved), `banners` (đang hiệu lực) và RPC công khai.
- View công khai: không cột nhạy cảm (`phone`, `push_tokens`, `notification_prefs`, email); vị trí làm tròn ~300 m (`ST_SnapToGrid(location::geometry, 0.003)::geography`); `full_name` → tên + chữ cái họ; chỉ `status = 'active' and deleted_at is null`. Dùng `security_invoker = false` + lọc chặt, hoặc `security_invoker = true` khi bảng gốc đã có policy đủ.

## Mẫu chuẩn (listings)
```sql
create policy listings_select_owner_or_staff on public.listings for select to authenticated
  using (owner_id = auth.uid() or is_staff());

create policy listings_insert_owner on public.listings for insert to authenticated
  with check (owner_id = auth.uid() and not is_banned());

create policy listings_update_owner on public.listings for update to authenticated
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());
-- chủ tin không tự đổi pending_review/rejected → active: chặn bằng trigger trg_listings_guard_status

create policy listings_update_staff on public.listings for update to authenticated
  using (is_staff()) with check (is_staff());
-- KHÔNG with check (true): Postgres OR with check của mọi policy permissive → 'true' mở update cho cả người không phải staff
```
- Người dùng khác xem tin active qua `public_listings`; view ẩn tin của người đã chặn người xem (`not is_blocked(owner_id, auth.uid())`).
- `messages`: insert khi `is_member(conversation_id) and sender_id = auth.uid() and not is_blocked(...)`; select khi `is_member`.
- `group_members`: user không insert trực tiếp (chỉ qua RPC của `join-group`); select khi là member hoặc host hoặc nhóm `open`.
- `profiles`: select chính mình hoặc staff; người khác qua `public_profiles`. Update chính mình nhưng **không** đổi `role`, `is_banned`, `badges`, `reputation_score` (trigger guard).
- `audit_log`: insert bởi service role hoặc staff; không update / delete cho bất kỳ ai; select chỉ `is_admin()`.

## Test pgTAP (bắt buộc với mỗi migration có policy)
`supabase/tests/<table>.test.sql`, chạy `supabase test db`:
```sql
begin;
select plan(8);
-- helper đổi vai trò: supabase/tests/_helpers.psql (tests.authenticate_as('user_a'), tests.clear_auth())

-- anon
select tests.clear_auth();
select is((select count(*)::int from public.public_listings), 500, 'anon đọc tin active qua view');
select throws_ok($$ select phone from public.profiles limit 1 $$, '42501', 'anon không đọc profiles');

-- user_a
select tests.authenticate_as('user_a');
select lives_ok($$ insert into public.listings (owner_id, category, title) values (tests.get_uid('user_a'), 'pass_home', 'test') $$, 'user đăng tin của mình');
select throws_ok($$ insert into public.listings (owner_id, category, title) values (tests.get_uid('user_b'), 'pass_home', 'x') $$, '42501', 'không đăng thay người khác');
select is((select count(*)::int from public.listings where owner_id = tests.get_uid('user_b')), 0, 'không thấy bảng gốc của người khác');

-- banned
select tests.authenticate_as('banned');
select throws_ok($$ insert into public.listings (owner_id, category, title) values (tests.get_uid('banned'), 'pass_home', 'x') $$, '42501', 'bị cấm không đăng');

-- moderator
select tests.authenticate_as('moderator');
select ok((select count(*) from public.listings where status = 'pending_review') >= 0, 'moderator đọc hàng chờ');
select lives_ok($$ update public.listings set status = 'active' where status = 'pending_review' $$, 'moderator duyệt');

select * from finish();
rollback;
```
Bốn vai trò **bắt buộc**: anon, user, user bị cấm, moderator; thêm admin khi bảng có quyền chỉ-admin. Realtime tôn trọng RLS → test thủ công: tài khoản không phải member không nhận event `messages` (ghi kết quả vào PLAN).
