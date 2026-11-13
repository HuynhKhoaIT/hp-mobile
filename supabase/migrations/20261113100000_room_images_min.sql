-- Luật tin trọ cần ≥ 3 ảnh (trg_listings_images_min, migration 20261104090000) áp dụng cho MỌI loại trọ (`room_*`): thêm
-- Nhà nguyên căn, Căn hộ / ký túc xá (migration 20261113090000) và loại trọ sau này không cần sửa lại trigger.
-- Ảnh hưởng: hàm trg_listings_images_min (thân hàm; trigger giữ nguyên). Client: @hp/shared input.ts kiểm cùng luật.

create or replace function public.trg_listings_images_min()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated')
     and left(new.category::text, 5) = 'room_' and new.status = 'active'
     and coalesce(cardinality(new.images), 0) < 3
     and (tg_op = 'INSERT' or old.status is distinct from 'active' or new.images is distinct from old.images) then
    raise exception using errcode = 'P0001', message = 'images_min', detail = 'listings: tin trọ cần ít nhất 3 ảnh';
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_listings_images_min() from public, anon, authenticated;
