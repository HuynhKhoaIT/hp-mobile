-- 0004 sites_dung_quat
-- Mục đích: (1) sản phẩm chỉ tập trung khu vực Dung Quất (Quảng Ngãi): thay 3 khu liên hợp toàn quốc bằng 4 địa điểm
--           làm việc quanh Dung Quất; (2) danh mục địa điểm do admin quản lý (/admin/catalog): thêm, sửa, ẩn, sắp xếp,
--           mọi thay đổi ghi audit_log. Dữ liệu dưới đây chỉ là bộ khởi đầu; sau này admin tự thêm công ty / khu mới.
-- Bảng ảnh hưởng: sites (+ is_active, sort_order, updated_at; policy select chỉ trả địa điểm đang hiện, admin thấy hết;
--           trigger trg_sites_audit). Đổi mã dung_quat → hoa_phat_dung_quat (profiles.site tự theo nhờ on update cascade);
--           xoá hai_duong, hung_yen (profiles.site về null nhờ on delete set null).
-- Toạ độ gần đúng, đủ cho lọc khoảng cách; admin chỉnh lại trên màn quản lý.
-- Client: listSites lọc is_active, sắp theo sort_order. Admin: nên ẩn (is_active = false) thay vì xoá để hồ sơ giữ khu đã chọn.

alter table public.sites
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order int not null default 0,
  add column if not exists updated_at timestamptz not null default now();
comment on column public.sites.is_active is 'false = ẩn khỏi app / web (admin vẫn thấy). Ưu tiên ẩn thay vì xoá.';
comment on column public.sites.sort_order is 'Thứ tự hiển thị tăng dần; cùng giá trị thì theo name.';

drop trigger if exists trg_sites_updated_at on public.sites;
create trigger trg_sites_updated_at before update on public.sites
  for each row execute function public.set_updated_at();

drop policy if exists sites_select_all on public.sites;
drop policy if exists sites_select_active_or_admin on public.sites;
create policy sites_select_active_or_admin on public.sites for select to anon, authenticated
  using (is_active or (select public.is_admin()));

-- Ghi audit cho mọi thay đổi từ người dùng đăng nhập (admin). Migration / service role không có auth.uid() → bỏ qua.
create or replace function public.trg_sites_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is not null then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (
      v_actor,
      'site.' || case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
      'site',
      coalesce(new.code, old.code),
      jsonb_strip_nulls(jsonb_build_object(
        'old', case when tg_op <> 'INSERT' then to_jsonb(old) - 'location' end,
        'new', case when tg_op <> 'DELETE' then to_jsonb(new) - 'location' end)));
  end if;
  return coalesce(new, old);
end;
$$;
revoke execute on function public.trg_sites_audit() from public, anon, authenticated;

drop trigger if exists trg_sites_audit on public.sites;
create trigger trg_sites_audit after insert or update or delete on public.sites
  for each row execute function public.trg_sites_audit();

-- ── Dữ liệu khởi đầu khu Dung Quất ──────────────────────────────────────────────
update public.sites
set code = 'hoa_phat_dung_quat', name = 'Khu liên hợp Hòa Phát Dung Quất', sort_order = 10,
    location = extensions.st_setsrid(extensions.st_makepoint(108.8220, 15.3850), 4326)::extensions.geography
where code = 'dung_quat';

delete from public.sites where code in ('hai_duong', 'hung_yen');

insert into public.sites (code, name, sort_order, location) values
  ('hoa_phat_dung_quat', 'Khu liên hợp Hòa Phát Dung Quất', 10, extensions.st_setsrid(extensions.st_makepoint(108.8220, 15.3850), 4326)::extensions.geography),
  ('cang_dung_quat',     'Cảng Dung Quất',                  20, extensions.st_setsrid(extensions.st_makepoint(108.8000, 15.4000), 4326)::extensions.geography),
  ('vsip_quang_ngai',    'Khu công nghiệp VSIP Quảng Ngãi', 30, extensions.st_setsrid(extensions.st_makepoint(108.7750, 15.2100), 4326)::extensions.geography),
  ('hyundai_eco_vina',   'Hyundai Eco Vina',                40, extensions.st_setsrid(extensions.st_makepoint(108.7900, 15.3900), 4326)::extensions.geography)
on conflict (code) do nothing;
