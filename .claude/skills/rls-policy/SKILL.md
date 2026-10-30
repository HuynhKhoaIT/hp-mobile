---
name: rls-policy
description: Viết policy RLS cho một bảng theo mẫu chuẩn (tách select/insert/update/delete, helper is_staff/is_blocked/is_member, view công khai che PII, trigger guard cột nhạy cảm) và test pgTAP cho 4 vai trò anon/user/banned/moderator. Dùng khi tạo bảng mới hoặc đổi quyền.
argument-hint: "<bảng> [mô tả quyền]"
---

# RLS cho bảng

1. **Ma trận quyền** (điền trước khi viết SQL, dán vào comment đầu migration):

| Vai trò | select | insert | update | delete |
|---|---|---|---|---|
| anon | qua view? | – | – | – |
| user (chủ) | | | | |
| user (khác) | | | | |
| user bị cấm | | – | – | – |
| moderator | | | | |
| admin | | | | |
| service role | (bỏ qua RLS) | | | |

2. **Policy** theo `.claude/rules/be-rls.md`: tên `<table>_<cmd>_<ai>`, `to authenticated` mặc định; `anon` chỉ qua view / RPC. Cột client không được tự đặt (`owner_id`, `host_id`, `status` nhạy cảm, `role`, `badges`, `is_banned`) ép bằng `with check` hoặc trigger `trg_<table>_guard`.
3. **View công khai** nếu bảng có PII hoặc vị trí → `public_<table>` (làm tròn vị trí 0.003°, rút gọn tên, bỏ phone / token), `grant select on public_<table> to anon, authenticated`; không grant bảng gốc cho anon.
4. **Chặn**: select ẩn nội dung của người đã chặn người xem (`not is_blocked(owner_id, auth.uid())`); insert `messages` bị chặn khi hai bên chặn nhau.
5. **Realtime**: bảng trong publication → RLS vẫn áp dụng; ghi test thủ công vào `docs/plan/backend.md`.
6. **Test** `supabase/tests/<table>.test.sql` dùng helper `supabase/tests/_helpers.sql` (`tests.authenticate_as`, `tests.clear_auth`, `tests.get_uid`) và seed user `user_a`, `user_b`, `banned`, `moderator`, `admin`. Mỗi ô trong ma trận ít nhất một assertion (`lives_ok` / `throws_ok '42501'` / `is(count)`); thêm assertion "không thấy cột nhạy cảm" cho view.
7. `supabase db reset && supabase test db` pass. Cập nhật `supabase/CLAUDE.md` mục 5 nếu thêm view / helper / RPC công khai.
