---
paths:
  - "supabase/migrations/**"
---

# RPC, trigger, pg_cron, webhook

## RPC (Postgres function)
- Đọc phức tạp (tìm kiếm, gợi ý, thống kê, slug): `language sql | plpgsql stable security invoker set search_path = ''`. Tham số tiền tố `p_`, có default; `p_limit` → `least(coalesce(p_limit, 20), 50)`; phân trang **cursor** (`p_cursor timestamptz`, `created_at < p_cursor`), không offset.
- RPC công khai (`grant execute ... to anon, authenticated`): `get_listing_by_slug`, `get_group_by_slug`, `search_listings`, `search_groups`, `similar_listings`, `public_stats` (cache 1 giờ qua bảng `stats_cache`), `sitemap_listings(p_page)`, `home_feed`. Trả `setof public_listings` / `public_groups` (view đã che PII), **không** `setof listings`.
- Tìm kiếm: `search_vector @@ plainto_tsquery('simple', unaccent(p_query)) or title % p_query` (trigram bắt buộc cho tiếng Trung); `st_dwithin(location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)`; ghi `search_logs` qua RPC `volatile` riêng `log_search`, vì RPC `stable` không ghi.
- Ghi trong transaction (dùng bởi Edge Function): `security definer`, tên hậu tố `_tx` (`join_group_tx`, `respond_join_tx`, `mark_sold_tx`), kiểm tra `auth.uid()` bên trong hoặc nhận `p_actor` từ service role; `revoke execute on function ... from public, anon` và chỉ `grant` cho `authenticated` khi user được gọi trực tiếp. Báo lỗi nghiệp vụ bằng `raise exception using errcode = 'P0001', message = 'group_full'` để Edge Function map sang `AppError`.
- `reveal_contact(p_listing_id)`: `security definer`, yêu cầu `auth.uid()`, `assert_rate_limit` 20 / giờ, insert `audit_log('contact.reveal')`, trả `phone`.
- Mỗi RPC: `comment on function`, index phủ (`explain analyze` trên seed, ghi vào comment đầu migration), test pgTAP (kết quả + quyền anon + `p_limit` bị kẹp 50), wrapper trong `packages/core`, type trong `packages/db` (`Database['public']['Functions']`).

## Trigger
Chỉ cho: ràng buộc, đếm (`seats_taken`, `rating_count`, `rating_avg`, `reputation_score`), `updated_at`, sinh `slug` / `short_id`, guard trạng thái (chủ tin không tự `active` từ `pending_review` / `rejected`; user không đổi `role` / `badges`), tạo `notifications`, tạo `conversations` cho group, cập nhật `last_message_*`, tạo `moderation_queue` khi 3 báo cáo / 24h, ẩn tạm.
- Hàm trigger `plpgsql`, tên `trg_<table>_<việc>`; `security definer` chỉ khi cần ghi bảng mà người dùng không có quyền (`notifications` của người khác), kèm `set search_path = ''`.
- Không gọi mạng trong trigger nghiệp vụ (`pg_net` chỉ trong trigger webhook riêng). Không logic chậm.
- Một việc không vừa ở trigger vừa ở Edge Function. Phân công cố định: notification `new_message`, `listing_approved / rejected / expiring`, `join_request`, `join_accepted`, `group_reminder`, `lost_found_match` do **trigger / cron trong DB** tạo; Edge Function chỉ **gửi push** từ bảng `notifications` và làm việc cần dịch vụ ngoài.
- Insert `notifications` luôn có `type`, `title_key`, `body_key`, `params jsonb`, `data jsonb {screen, params}` để client dịch theo `locale` (không lưu chữ đã dịch).

## pg_cron
- Lịch khai trong migration:
```sql
select cron.schedule('expire-content', '0 * * * *', $$
  select net.http_post(
    url := current_setting('app.functions_url') || '/expire-content',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', current_setting('app.cron_secret')),
    body := '{}'::jsonb)
$$);
```
- `app.functions_url`, `app.cron_secret`, `app.web_revalidate_url`, `app.web_revalidate_secret` đặt bằng `alter database postgres set app.x = '...'` trong migration riêng **cho local**; staging / prod đặt bằng tay (ghi trong `docs/RUNBOOK.md`), không commit giá trị thật.
- Job: `expire-content` mỗi giờ; `remind-groups` mỗi 15 phút; `purge-deleted-accounts` hàng ngày (xoá cứng sau 30 ngày); `purge-verification-files` hàng ngày (30 ngày sau duyệt); `refresh-public-stats` mỗi giờ.

## DB webhook (pg_net)
`notifications` insert → `send-push`; `listings` insert → `moderate-listing`, và → `match-lost-found` khi `category in ('lost','found')`; `listings` / `groups` update `status` / `title` / `images` → `POST {app.web_revalidate_url}` với header secret, body `{ tag: 'listing:{id}' }`. Khai báo bằng trigger `supabase_functions.http_request` hoặc `net.http_post` trong migration để reproducible; không cấu hình tay trên Dashboard.
