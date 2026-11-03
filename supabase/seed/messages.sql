-- Hội thoại mẫu (chạy sau listings.sql — tên file sắp sau). Không dữ liệu người thật.
-- 0900000004 (Duyệt) và 0900000005 (Quản) hỏi tin của 0900000001 (An); An còn tin chưa đọc để thử chấm đỏ.
-- Chạy với quyền postgres: trigger messages vẫn cập nhật last_message_* và tạo notifications new_message.
do $$
declare
  v_an uuid := '00000000-0000-4000-8000-000000000001';
  v_buyers uuid[] := array['00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005']::uuid[];
  v_listing record;
  v_conv uuid;
  v_msg uuid;
  v_buyer uuid;
  v_i int := 0;
  v_lines text[][] := array[
    array['Chào anh, món này còn không ạ?', 'Còn bạn ơi', 'Em ở gần cổng 2 nhà máy, chiều nay qua xem được không?', 'Được, 5h chiều nhé'],
    array['Giá còn bớt được không anh?', 'Bớt chút xăng xe thôi bạn', 'Ok anh, mai em liên hệ lại', 'Anh cho em xin thêm ảnh mặt sau với']
  ];
  v_t timestamptz;
begin
  for v_listing in
    select id from public.listings
    where owner_id = v_an and status = 'active' and category in ('pass_electronics', 'pass_home')
    order by created_at desc limit 2
  loop
    v_i := v_i + 1;
    v_buyer := v_buyers[v_i];
    insert into public.conversations (kind, context_type, context_id, user_low, user_high, created_by)
    values ('direct', 'listing', v_listing.id, least(v_an, v_buyer), greatest(v_an, v_buyer), v_buyer)
    returning id into v_conv;
    insert into public.conversation_members (conversation_id, user_id, last_read_at)
    values (v_conv, v_buyer, now()), (v_conv, v_an, now() - interval '3 days');

    for j in 1..4 loop
      v_t := now() - interval '2 hours' + (j * interval '10 minutes');
      insert into public.messages (conversation_id, sender_id, body)
      values (v_conv, case when j % 2 = 1 or (v_i = 2 and j = 4) then v_buyer else v_an end, v_lines[v_i][j])
      returning id into v_msg;
      -- giờ tin nhắn trải đều (trigger đặt now() lúc insert)
      update public.messages set created_at = v_t where id = v_msg;
    end loop;
    update public.conversations c set last_message_at = (select max(created_at) from public.messages where conversation_id = c.id)
    where c.id = v_conv;
    -- An đã đọc tới tin của chính mình trong hội thoại 1; hội thoại 2 còn 1 tin chưa đọc
    update public.conversation_members set last_read_at = case when v_i = 1 then now() else now() - interval '1 hour 25 minutes' end
    where conversation_id = v_conv and user_id = v_an;
  end loop;
end;
$$;
