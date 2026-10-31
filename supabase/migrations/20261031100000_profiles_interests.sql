-- 0005 profiles_interests
-- Mục đích: bước 3 onboarding (app + web) — người dùng chọn tính năng quan tâm; home_feed (tuần 9) ưu tiên theo đây.
-- Bảng ảnh hưởng: profiles (+ interests). Không thêm vào public_profiles (dữ liệu riêng tư).
-- Client: @hp/shared FEATURES + OnboardingInput / UpdateProfileInput.interests; @hp/core MY_PROFILE_COLUMNS.
-- Mã khớp i18n `common.feature.<code>`.

alter table public.profiles
  add column if not exists interests text[] not null default '{}'
    check (interests <@ array['pass', 'room', 'job', 'lostFound', 'ride', 'sport']);
comment on column public.profiles.interests is 'Tính năng quan tâm (onboarding). Mã: @hp/shared FEATURES.';
