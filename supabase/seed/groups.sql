-- Nhóm mẫu (ghép xe + ghép trận). Không dữ liệu người thật. Chạy với quyền postgres: guard bỏ qua luật client,
-- trigger vẫn tạo chat nhóm, đếm seats_taken, đổi open / full.
-- Chủ nhóm: An (…01), Duyệt (…04), Quản (…05). Thành viên accepted / requested trải đều để thử hàng avatar + duyệt.
do $$
declare
  v_hosts uuid[] := array['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004',
                          '00000000-0000-4000-8000-000000000005']::uuid[];
  v_gate extensions.geography := extensions.st_setsrid(extensions.st_makepoint(108.822, 15.385), 4326)::extensions.geography;
  v_dest record;
  v_id uuid;
  v_i int := 0;
  v_host uuid;
  v_sub text;
  v_seats int;
begin
  for v_dest in
    select * from (values
      ('Đà Nẵng — Bến xe trung tâm', 108.172, 16.059, 150000),
      ('TP Quảng Ngãi — Ngã 5', 108.792, 15.120, 50000),
      ('Huế — Ga Huế', 107.578, 16.456, 250000),
      ('Hội An — Bến xe Hội An', 108.335, 15.880, 120000),
      ('Tam Kỳ — Quảng trường 24/3', 108.474, 15.573, 80000),
      ('Quy Nhơn — Bến xe Quy Nhơn', 109.219, 13.782, 200000),
      ('Đà Nẵng — Sân bay', 108.199, 16.044, 170000),
      ('TP Quảng Ngãi — Bến xe', 108.809, 15.108, 50000),
      ('Đà Nẵng — Hòa Khánh', 108.150, 16.072, 150000),
      ('Núi Thành — Chợ Núi Thành', 108.660, 15.425, 30000)
    ) as d(name, lng, lat, fee)
  loop
    v_i := v_i + 1;
    v_host := v_hosts[1 + (v_i % 3)];
    v_sub := (array['car_owner', 'car_owner', 'bus_pool', 'motorbike'])[1 + (v_i % 4)];
    v_seats := case v_sub when 'motorbike' then 1 when 'bus_pool' then 12 else 3 end;
    insert into public.groups (host_id, kind, sub_kind, title, description, starts_at, seats_total, fee_per_person,
                               origin, origin_text, destination, destination_text, attributes, requires_approval)
    values (v_host, 'ride', v_sub,
            'Dung Quất → ' || split_part(v_dest.name, ' — ', 1),
            case when v_i % 2 = 0 then 'Đi sau ca chiều, có chỗ để hành lý nhỏ. Đón ở cổng chính.' end,
            date_trunc('hour', now()) + make_interval(hours => 3 + v_i * 7),
            v_seats, v_dest.fee,
            v_gate, 'Cổng chính Khu liên hợp Hòa Phát Dung Quất',
            extensions.st_setsrid(extensions.st_makepoint(v_dest.lng, v_dest.lat), 4326)::extensions.geography, v_dest.name,
            jsonb_build_object('luggage_ok', v_i % 2 = 0, 'stops_ok', v_i % 3 = 0),
            v_i % 3 <> 0)
    returning id into v_id;

    -- thành viên: người không phải chủ nhóm (trừ …03 bị cấm, …02 chưa onboarding)
    insert into public.group_members (group_id, user_id, status, note)
    select v_id, u, case when v_i % 2 = 0 then 'accepted' else 'requested' end::public.member_status,
           case when v_i % 2 = 1 then 'Cho mình đi cùng với, mình ở gần cổng chính.' end
    from unnest(v_hosts) u
    where u <> v_host
    limit case when v_i % 4 = 0 then 2 when v_i % 4 = 3 then 0 else 1 end;
  end loop;

  -- Ghép trận (tuần 8 có màn riêng; dữ liệu để web / app thử danh sách)
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, fee_per_person, origin,
                             origin_text, attributes, requires_approval)
  values
    (v_hosts[2], 'sport', 'football', 'Đá bóng 7 người sau ca chiều', date_trunc('hour', now()) + interval '30 hours', 2, 40000,
     extensions.st_setsrid(extensions.st_makepoint(108.80, 15.36), 4326)::extensions.geography, 'Sân bóng Bình Thạnh',
     '{"skill_level": "intermediate", "players_have": 5}', false),   -- đội có sẵn 5, cần thêm 2
    (v_hosts[3], 'sport', 'badminton', 'Cầu lông đôi nam nữ', date_trunc('hour', now()) + interval '50 hours', 2, 30000,
     extensions.st_setsrid(extensions.st_makepoint(108.79, 15.41), 4326)::extensions.geography, 'Nhà thi đấu Bình Sơn',
     '{"skill_level": "beginner"}', true),
    (v_hosts[1], 'sport', 'pickleball', 'Pickleball giao lưu cuối tuần', date_trunc('hour', now()) + interval '75 hours', 3, 50000,
     extensions.st_setsrid(extensions.st_makepoint(108.81, 15.39), 4326)::extensions.geography, 'Sân pickleball Dốc Sỏi',
     '{"skill_level": "any"}', false);
end;
$$;
