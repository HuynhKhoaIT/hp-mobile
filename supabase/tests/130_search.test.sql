-- search_listings / home_feed / similar_listings sau tối ưu 50k tin (migration 20261106110000_public_rpc_perf):
-- hành vi tìm kiếm giữ nguyên (không dấu, lỗi gõ nhẹ, chữ Trung, từ ngắn), kẹp p_limit, chặn theo người xem.
begin;
\ir _helpers.psql
select plan(12);

select tests.create_user('s_owner');
select tests.create_user('s_viewer');
insert into public.listings (id, owner_id, category, title, description, status, site) values
  ('f0000000-0000-4000-8000-000000000001', tests.get_uid('s_owner'), 'pass_electronics', 'Điện thoại Samsung zxsr cũ', 'máy đẹp', 'active', 'hoa_phat_dung_quat'),
  ('f0000000-0000-4000-8000-000000000002', tests.get_uid('s_owner'), 'pass_home', '二手冰箱 zxsr', '很好', 'active', 'hoa_phat_dung_quat'),
  ('f0000000-0000-4000-8000-000000000003', tests.get_uid('s_owner'), 'pass_vehicle', 'Xe đạp zxsr', 'tốt', 'active', 'hoa_phat_dung_quat'),
  ('f0000000-0000-4000-8000-000000000004', tests.get_uid('s_owner'), 'pass_electronics', 'Tai nghe zxsr', 'mới', 'active', 'hoa_phat_dung_quat');

select tests.clear_auth();
select ok(exists (select 1 from public.search_listings(p_query => 'dien thoai samsung')
                  where id = 'f0000000-0000-4000-8000-000000000001'), 'từ khoá không dấu khớp tiêu đề có dấu');
select ok(exists (select 1 from public.search_listings(p_query => 'dien thaoi', p_limit => 50)
                  where id = 'f0000000-0000-4000-8000-000000000001'), 'lỗi gõ nhẹ vẫn khớp (word similarity)');
select ok(exists (select 1 from public.search_listings(p_query => '冰箱', p_limit => 50)
                  where id = 'f0000000-0000-4000-8000-000000000002'), 'chữ Trung 2 ký tự khớp giữa chuỗi');
select ok(exists (select 1 from public.search_listings(p_query => 'xe', p_limit => 50)
                  where id = 'f0000000-0000-4000-8000-000000000003'), 'từ Latin ngắn khớp nguyên từ');
select ok(exists (select 1 from public.search_listings(p_query => 'samsu', p_limit => 50)
                  where id = 'f0000000-0000-4000-8000-000000000001'), 'chuỗi con ≥ 3 ký tự khớp (LIKE)');
select is((select count(*)::int from public.search_listings(p_query => 'zxsr')), 4, 'mọi tin khớp mã zxsr');
select is((select count(*)::int from public.search_listings(p_query => '50%_off')), 0, 'ký tự đặc biệt LIKE được escape');
select is((select count(*)::int from public.search_listings(p_limit => 500)), 50, 'p_limit kẹp 50');
select ok(exists (select 1 from public.similar_listings('f0000000-0000-4000-8000-000000000001')
                  where id = 'f0000000-0000-4000-8000-000000000004'), 'similar_listings: cùng danh mục, cùng khu');
select ok((select count(*) from public.home_feed('hoa_phat_dung_quat')) between 1 and 20, 'home_feed (khách) trả tin');

-- Người xem bị chủ tin chặn → không thấy tin trong tìm kiếm / home_feed (view lọc bằng blocks).
reset role;
insert into public.blocks (blocker_id, blocked_id) values (tests.get_uid('s_owner'), tests.get_uid('s_viewer'));
select tests.authenticate_as('s_viewer');
select is((select count(*)::int from public.search_listings(p_query => 'zxsr')), 0, 'bị chặn: không thấy tin của người chặn');
select is((select count(*)::int from public.home_feed('hoa_phat_dung_quat', 50) where owner_id = tests.get_uid('s_owner')), 0,
  'bị chặn: home_feed không có tin của người chặn');

select * from finish();
rollback;
