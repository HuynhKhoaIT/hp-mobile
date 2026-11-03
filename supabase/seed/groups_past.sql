-- Nhóm đã diễn ra (thử "Nhóm của tôi → Đã qua" + đánh giá chủ nhóm). Quyền postgres: guard bỏ qua luật giờ.
-- An (…01) là thành viên accepted của một kèo đã xong của Duyệt (…04), chưa chấm; Quản (…05) đã chấm 5 sao.
do $$
declare
  v_id uuid;
begin
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, fee_per_person, origin,
                             origin_text, attributes, requires_approval)
  values ('00000000-0000-4000-8000-000000000004', 'sport', 'football', 'Đá giao hữu tối thứ Bảy',
          date_trunc('hour', now()) - interval '2 days', 8, 30000,
          extensions.st_setsrid(extensions.st_makepoint(108.845, 15.370), 4326)::extensions.geography,
          'Sân cỏ nhân tạo Vạn Tường', '{"skill_level": "any"}', false)
  returning id into v_id;

  insert into public.group_members (group_id, user_id, status)
  values (v_id, '00000000-0000-4000-8000-000000000001', 'accepted'),
         (v_id, '00000000-0000-4000-8000-000000000005', 'accepted');

  update public.groups set status = 'completed', reminded_at = starts_at - interval '1 hour' where id = v_id;

  insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment)
  values ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', 'group', v_id, 5,
          'Chủ kèo đúng giờ, sân tốt.');
end;
$$;
