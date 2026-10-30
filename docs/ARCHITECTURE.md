# Kiến trúc Super App Người Hòa Phát

Oct 30, 2026 · @DatXE

## 1. Tổng quan sản phẩm

Super App Người Hòa Phát là **ứng dụng cá nhân, phát triển độc lập** (không phải app nội bộ của Tập đoàn Hòa Phát) cho cộng đồng người lao động quanh các khu liên hợp Hòa Phát: mua bán đồ cũ, tìm trọ, tìm việc, ghép xe, ghép trận thể thao và tìm đồ thất lạc. Kiến trúc chọn là **app mobile Expo + web Next.js chạy song song trên 1 backend Supabase (Postgres)**, tổ chức theo **modular monolith**, để một người hoặc đội 2–3 người vibe code ra MVP trong 12 tuần.

**Lưu ý về tên và thương hiệu:** "Hòa Phát" là thương hiệu đã đăng ký của Tập đoàn. App cá nhân dùng tên, logo hoặc mã màu y hệt nhận diện có thể bị hiểu là app chính thức, dẫn tới yêu cầu gỡ khỏi store. Nên đặt tên riêng (ví dụ "Phố Thép", "Dung Quất Connect"), dùng màu xanh thép gần giống chứ không sao chép logo, và ghi rõ "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" trong app và trang store. Mình không phải luật sư; nếu muốn dùng chính tên Hòa Phát, cần xin phép bằng văn bản.

**Đối tượng người dùng**

- Công nhân, kỹ sư, nhân viên văn phòng tại các khu liên hợp (Dung Quất, Hải Dương, Hưng Yên...) và nhà thầu, công nhân thời vụ làm việc quanh đó.
- Người dân địa phương cung cấp dịch vụ cho họ: chủ trọ, chủ sân, quán ăn, người tuyển việc làm thêm, nhà xe.
- Độ tuổi 18–55, nhiều người không quen app phức tạp; phần lớn dùng Android tầm trung, mạng 4G không ổn định, thao tác một tay, thời gian rảnh ngắn giữa ca.
- Quản trị: chính bạn và 1–2 cộng tác viên kiểm duyệt.

**Nguyên tắc thiết kế**

1. Một lõi dùng chung, nhiều mini-app: thêm tính năng mới không phải viết lại auth, chat, upload, thông báo.
2. Offline-tolerant và nhẹ: cache dữ liệu, ảnh nén, app dưới 40 MB, mở màn hình chính dưới 1,5 giây.
3. Mọi thứ là Postgres: tránh thêm hệ thống phụ (Redis, Elastic, Kafka) cho đến khi dữ liệu thực sự đòi hỏi.
4. Bảo mật đặt ở tầng dữ liệu (Row Level Security), không tin phía client.
5. Ưu tiên công nghệ mà AI sinh code tốt nhất (TypeScript, React Native, SQL) để vibe code hiệu quả.

**Mục tiêu MVP (3 tháng)**

| Chỉ số | Mục tiêu |
| --- | --- |
| Người dùng đăng ký | 5.000 |
| Tin đăng pass đồ / tháng | 2.000 |
| Tỷ lệ người quay lại tuần | trên 30% |
| Thời gian mở app (cold start) | dưới 2 giây trên Android tầm trung |
| Tỷ lệ crash | dưới 0,5% phiên |

## 2. Tính năng và mô hình dữ liệu chung

Sáu tính năng của app quy về **hai mẫu dữ liệu**: **Tin đăng (Listing)** và **Nhóm ghép (Group)**. Xây xong hai mẫu này cùng phần lõi là có đủ sáu tính năng; thêm tính năng mới về sau chỉ là thêm một `category`.

| # | Tính năng | Danh mục con | Mẫu dữ liệu | Thuộc tính riêng (JSONB) |
| --- | --- | --- | --- | --- |
| 1 | Pass đồ | Điện thoại / máy tính / điện tử; Xe cộ; Đồ bảo hộ lao động; Nội thất, gia dụng | Listing | tình trạng (mới/đã dùng), hãng, đời máy, số km, biển số, size đồ bảo hộ |
| 2 | Tìm trọ | Phòng trọ; Nhà nguyên căn; Ở ghép | Listing | diện tích m², giá điện/nước, giờ giấc, có gác, chỗ để xe, khoảng cách đến nhà máy |
| 3 | Tìm việc | Việc chính; Việc làm thêm ngoài ca | Listing | ca làm, lương, hình thức trả, yêu cầu, công ty/cá nhân đăng |
| 4 | Ghép xe về thành phố | Xe cá nhân; Xe khách gom; Xe máy chở kèm | Group | điểm đi, điểm đến, giờ khởi hành, số ghế, phí/người, loại xe |
| 5 | Ghép trận / tìm sân | Bóng đá; Cầu lông; Pickleball | Group | sân, giờ, số người cần, trình độ, phí sân chia/người |
| 6 | Đồ thất lạc | Tôi làm mất; Tôi nhặt được | Listing | loại đồ, nơi mất/nhặt, thời điểm, đặc điểm nhận dạng, đã trả chưa |

**Mẫu Listing (tin đăng)**

- Một người đăng, nhiều người xem và liên hệ qua chat.
- Vòng đời: `draft` → `pending_review` (tuỳ danh mục) → `active` → `sold` / `closed` / `expired` / `rejected`.
- Có vị trí (lat/lng) và địa bàn (khu liên hợp) để lọc theo khoảng cách.
- Ảnh từ 1 đến 10, ảnh đầu là ảnh bìa.
- Tin tự hết hạn sau 30 ngày (pass đồ, trọ), 14 ngày (việc), 60 ngày (thất lạc), có thể gia hạn.

**Mẫu Group (nhóm ghép)**

- Một người tạo, nhiều người tham gia cho đến khi đủ chỗ.
- Có thời điểm diễn ra; trước giờ diễn ra app nhắc, sau giờ diễn ra nhóm tự đóng.
- Vòng đời: `open` → `full` → `in_progress` → `completed` / `cancelled`.
- Thành viên: `requested` → `accepted` / `declined` → `left` / `kicked`.
- Mỗi nhóm có một phòng chat nhóm riêng, tự tạo khi nhóm được tạo.

**Phần lõi dùng chung cho cả hai mẫu**

- Hồ sơ người dùng, huy hiệu xác minh tùy chọn, ngôn ngữ (vi/en/zh)
- Chat 1-1 và chat nhóm
- Thông báo đẩy và thông báo trong app
- Upload ảnh
- Lưu tin (bookmark), đánh giá sau giao dịch, điểm uy tín
- Báo cáo vi phạm, chặn người dùng, kiểm duyệt
- Tìm kiếm và lọc theo danh mục, khoảng cách, giá

## 3. Tech stack

Toàn bộ stack là TypeScript + SQL, chạy trên dịch vụ quản lý sẵn (managed), để đội nhỏ không phải vận hành server và AI sinh code chính xác nhất.

| Lớp | Lựa chọn | Lý do chọn | Phương án thay thế |
| --- | --- | --- | --- |
| Mobile app | React Native + Expo SDK mới nhất, TypeScript, Expo Router | Một code cho iOS/Android; AI viết React Native tốt nhất trong các framework mobile; EAS Update đẩy bản vá không cần duyệt store | Flutter nếu đội đã quen Dart |
| Hiệu năng UI | Reanimated 3, Gesture Handler, FlashList, expo-image | Animation chạy trên UI thread, danh sách dài 60 fps, ảnh cache đĩa |  |
| Styling / UI kit | NativeWind (Tailwind cho RN) + bộ component tự xây | AI quen cú pháp Tailwind, design token tập trung một chỗ | Tamagui nếu cần web cùng code |
| State server | TanStack Query | Cache, refetch nền, optimistic update, phân trang vô hạn |  |
| State client | Zustand | Nhẹ, đủ cho auth, bộ lọc, bản nháp tin đăng |  |
| Form | React Hook Form + Zod | Validate một chỗ, dùng lại schema Zod ở Edge Functions |  |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | Một dịch vụ thay cho 5 hệ thống; có free tier và self-host được khi cần | Firebase (NoSQL, khó query quan hệ); NestJS tự host (tốn người vận hành) |
| Database | PostgreSQL 16 + PostGIS + pg\_trgm | Dữ liệu quan hệ rõ, PostGIS tính khoảng cách, pg\_trgm tìm gần đúng tiếng Việt |  |
| Tìm kiếm | Postgres full-text + pg\_trgm (MVP) | Đủ cho dưới 1 triệu tin | Meilisearch/Typesense khi cần tìm mờ, gợi ý tức thì |
| Logic server | Supabase Edge Functions (Deno, TypeScript) + Postgres functions/triggers | Logic nhạy cảm (ghép nhóm, tính điểm uy tín, gửi push) chạy server, client chỉ gọi |  |
| Bản đồ | Goong Maps (API tương thích Google, giá VN) | Địa chỉ Việt Nam chuẩn, rẻ hơn Google Maps | Mapbox, Google Maps |
| Push notification | Expo Push Notifications (qua FCM/APNs) | Một API cho cả hai nền tảng, gửi từ Edge Function | OneSignal nếu cần phân khúc marketing |
| OTP | Zalo ZNS hoặc SMS brandname (eSMS, Vietguys) qua Supabase Auth custom SMS hook | ZNS rẻ và tới người VN nhanh hơn SMS quốc tế | Twilio |
| Ảnh | Supabase Storage + Image Transformation | Resize theo kích thước yêu cầu, CDN sẵn | Cloudflare R2 + Images |
| Web (marketing, người dùng, /admin) | Next.js 15 + shadcn/ui + Supabase | Một web cho marketing, người dùng (render sẵn trang tin cho SEO) và /admin; AI viết Next.js tốt nhất; dùng chung logic với app qua packages/core | Refine, Retool |
| Analytics | PostHog | Funnel, session replay, feature flag trong một tool | Mixpanel + LaunchDarkly |
| Crash / log | Sentry (mobile + Edge Functions) |  |  |
| CI/CD | GitHub Actions + EAS Build/Submit/Update | Build cloud, không cần máy Mac |  |
| Monorepo | pnpm workspaces + Turborepo | `apps/mobile`, `apps/web`, `packages/db`, `packages/core, packages/tokens` dùng chung type |  |

**Chi phí vận hành ước tính (MVP, 5.000 người dùng)**

| Khoản | Tháng (USD) |
| --- | --- |
| Supabase Pro | 25 |
| EAS Production | 99 |
| Goong Maps | 0–20 |
| OTP (ZNS \~300đ/tin, 10.000 tin) | \~120 |
| Sentry + PostHog free tier | 0 |
| Tổng | \~250–270 |

Số liệu giá là ước tính tại thời điểm viết; cần kiểm tra lại bảng giá hiện hành trước khi chốt ngân sách.

## 4. Kiến trúc tổng thể

Kiến trúc là **modular monolith**: một app mobile, một backend Supabase, một database Postgres; bên trong chia theo module tính năng chứ không tách microservice. Đội nhỏ chỉ phải vận hành một hệ thống, nhưng code vẫn chia ranh giới rõ để sau này tách ra nếu cần.

&#91;embedded content: kiến trúc hệ thống · 2 client, 6 dịch vụ Supabase, 3 dịch vụ ngoài\]

App mobile và web Next.js gọi thẳng Supabase qua HTTPS và WebSocket; logic nhạy cảm chạy trong Edge Functions hoặc trong Postgres (trigger, function); Postgres là nguồn sự thật duy nhất, mọi dịch vụ khác chỉ đọc/ghi vào nó.

**Nguyên tắc phân tầng**

1. **Client (mobile, web)**: hiển thị, cache, validate đầu vào. Không chứa logic nghiệp vụ quyết định quyền hay tiền.
2. **API tự sinh (PostgREST)**: mọi thao tác CRUD đơn giản đi thẳng từ client vào DB, được chặn bởi RLS. Không viết endpoint cho CRUD.
3. **Edge Functions**: chỉ cho logic cần bí mật (API key bên thứ ba), cần nhiều bước trong một giao dịch (ghép nhóm, xác nhận giao dịch), hoặc cần gọi dịch vụ ngoài (push, OTP).
4. **Postgres functions và triggers**: ràng buộc dữ liệu (số chỗ không âm, nhóm đủ chỗ thì tự chuyển `full`), đếm đánh giá, cập nhật `updated_at`, tạo thông báo khi có tin nhắn.
5. **Cron (pg\_cron)**: hết hạn tin đăng, đóng nhóm sau giờ diễn ra, nhắc trước giờ ghép xe/ghép trận 1 giờ.

**Luồng dữ liệu điển hình**

| Luồng | Đường đi |
| --- | --- |
| Đăng tin pass đồ | App nén ảnh → upload Storage → insert `listings` qua PostgREST (RLS kiểm tra `owner_id = auth.uid()`) → trigger tạo bản ghi `moderation_queue` nếu danh mục cần duyệt |
| Tìm trọ gần nhà máy | App gửi lat/lng + bán kính → gọi Postgres function `search_listings(...)` dùng PostGIS `ST_DWithin` + full-text → trả về danh sách phân trang |
| Ghép xe | Người tham gia gọi Edge Function `join_group` → kiểm tra còn chỗ trong một transaction → insert `group_members` → trigger cập nhật `seats_taken`, chuyển `full` khi đủ → gửi push cho chủ nhóm |
| Chat | Client subscribe Realtime kênh `conversation:{id}` → insert `messages` qua PostgREST → trigger tạo `notifications` → Edge Function gửi push nếu người nhận offline |
| Kiểm duyệt | Admin web đọc `moderation_queue` → duyệt/từ chối → trigger đổi trạng thái tin và gửi thông báo cho người đăng |

**Cấu trúc monorepo**

```
hoaphat-app/
├── apps/
│   ├── mobile/          # Expo (iOS, Android) — có CLAUDE.md riêng
│   └── web/             # Next.js: marketing (/), người dùng, quản trị (/admin) — có CLAUDE.md riêng
├── packages/
│   ├── core/            # logic dùng chung app + web: hàm gọi Supabase, query keys, hooks TanStack Query, capabilities
│   ├── shared/          # Zod schemas, enums, constants, i18n vi/en/zh, format tiền/ngày
│   ├── db/              # database.types.ts sinh tự động
│   └── tokens/          # design tokens (màu, chữ, spacing, motion) dùng cho cả NativeWind và Tailwind
├── supabase/            # migrations, functions, tests, seed — có CLAUDE.md riêng
└── docs/                # tài liệu này + ADR
```

**Web và app chạy song song**

Người dùng làm được việc chính ngay trên web, không bắt buộc tải app; app giữ những tính năng cần thiết bị. Web viết bằng Next.js (không dùng Expo web) vì ba lý do: trang tin render sẵn để Google index ("phòng trọ gần Dung Quất" là kênh kéo người dùng miễn phí), mở từ link Zalo/Facebook hiện nội dung trong khoảng 1–1,8 giây thay vì 2,5–4 giây, và giao diện desktop tự nhiên cho chủ trọ, nhà tuyển dụng. Đổi lại, lớp giao diện viết hai lần; công sức frontend ước khoảng 1,6–1,8 lần, giảm được nhờ dùng chung `packages/core`, `packages/shared`, `packages/tokens` và cùng cú pháp Tailwind (NativeWind trên app).

| Tính năng | Web | App |
| --- | --- | --- |
| Xem, tìm, lọc tin và nhóm (không cần đăng nhập) | có, render sẵn cho SEO | có |
| Đăng tin, sửa tin, đánh dấu đã bán | có (ảnh chọn từ máy, nén trên trình duyệt) | có, chụp nhiều ảnh nhanh |
| Chat 1-1, chat nhóm | có, realtime khi đang mở tab | có |
| Tạo / tham gia ghép xe, ghép trận | có | có |
| Hồ sơ, lưu tin, đánh giá, báo cáo, chặn | có | có |
| Gửi giấy tờ xin huy hiệu | có (tải ảnh) | có (chụp trực tiếp) |
| Thông báo đẩy tức thì | không (chỉ chấm đỏ khi mở web) | **chỉ app** |
| Nhắc trước giờ đi xe / giờ đá 60 phút | không | **chỉ app** |
| Báo ngay khi đồ thất lạc khớp | thấy khi mở web | **chỉ app** |
| Quanh tôi theo GPS liên tục | vị trí một lần | **app** |
| Bản nháp và cache khi mất mạng | không | **app** |

Danh sách tính năng chỉ có trên app khai báo một chỗ trong `packages/core/capabilities.ts`. Trên web, component `AppOnly` thay tính năng đó bằng thẻ mời tải app đúng ngữ cảnh (ví dụ sau khi tham gia nhóm: "Tải app để được nhắc trước giờ đi"), không dùng popup chặn màn hình.

| Địa chỉ | Nội dung | Render |
| --- | --- | --- |
| `tenapp.vn` | Landing, trang tính năng, tải app, pháp lý, blog | tĩnh (SSG) |
| `tenapp.vn/tin/...`, `/tro/...`, `/viec-lam/...`, `/nhom/...` | Danh sách và chi tiết tin, nhóm (công khai) | server render + ISR 5 phút, có metadata, OG, JSON-LD |
| `tenapp.vn/dang-tin`, `/tin-nhan`, `/toi`... | Khu người dùng đã đăng nhập | server + client, không index |
| `tenapp.vn/admin` | Quản trị | server, không index, MFA bắt buộc |

Cùng một tài khoản Supabase dùng trên web và app; web giữ phiên bằng cookie (`@supabase/ssr`). Link một tin luôn là URL web (`tenapp.vn/tin/{slug}-{id}`); nếu máy đã cài app, Universal Link / App Link mở thẳng app, chưa cài thì hiện trang web đầy đủ.

## 5. Thiết kế cơ sở dữ liệu

Schema gồm 5 nhóm bảng: Core, Listing, Group, Chat, Moderation. Tất cả bảng có `id uuid`, `created_at`, `updated_at`; xoá mềm bằng `deleted_at` cho dữ liệu người dùng. Enum dùng Postgres `enum type` để type sinh ra cho TypeScript tự động.

**5.1 Core**

```sql
create type verification_status as enum ('pending','verified','rejected');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null,
  avatar_url text,
  badges text[] not null default '{}',     -- phone | worker | landlord | venue | employer
  locale text not null default 'vi',       -- vi | en | zh
  site text,                               -- khu liên hợp: dung_quat, hai_duong, hung_yen...
  department text,
  verification verification_status not null default 'pending',
  verified_at timestamptz,
  reputation_score int not null default 0,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  home_location geography(point, 4326),    -- để gợi ý ghép xe, trọ gần nhà
  is_banned boolean not null default false,
  role text not null default 'user',       -- user | moderator | admin
  push_tokens text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sites (                        -- danh mục khu liên hợp / nhà máy
  code text primary key,
  name text not null,
  location geography(point, 4326) not null
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid references profiles(id),
  ratee_id uuid references profiles(id),
  context_type text not null,              -- listing | group
  context_id uuid not null,
  score smallint check (score between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (rater_id, context_type, context_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,                      -- new_message | group_joined | listing_approved ...
  title text not null,
  body text,
  data jsonb default '{}',                 -- deep link: {screen, params}
  read_at timestamptz,
  created_at timestamptz default now()
);

create table bookmarks (
  user_id uuid references profiles(id) on delete cascade,
  target_type text not null,               -- listing | group
  target_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, target_type, target_id)
);
```

**5.2 Listing (Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc)**

```sql
create type listing_category as enum (
  'pass_electronics','pass_vehicle','pass_ppe','pass_home',
  'room_rent','room_share',
  'job_main','job_parttime',
  'lost','found'
);
create type listing_status as enum
  ('draft','pending_review','active','sold','closed','expired','rejected');

create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  category listing_category not null,
  status listing_status not null default 'active',
  title text not null check (char_length(title) <= 120),
  description text,
  price numeric(14,0),                     -- VND; null = thoả thuận / miễn phí
  price_type text default 'fixed',         -- fixed | negotiable | free
  attributes jsonb not null default '{}',  -- thuộc tính riêng theo category (validate bằng Zod)
  site text references sites(code),
  location geography(point, 4326),
  address_text text,
  images text[] not null default '{}',     -- path trong Storage, ảnh đầu là bìa
  view_count int not null default 0,
  expires_at timestamptz,
  search_vector tsvector generated always as
    (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index listings_cat_status_idx on listings (category, status, created_at desc);
create index listings_location_idx on listings using gist (location);
create index listings_search_idx on listings using gin (search_vector);
create index listings_title_trgm_idx on listings using gin (title gin_trgm_ops);
create index listings_attrs_idx on listings using gin (attributes);
```

Ví dụ `attributes` theo danh mục (schema Zod đặt trong `packages/shared`):

| Category | Keys trong `attributes` |
| --- | --- |
| pass\_electronics | `brand`, `model`, `condition` (new/like\_new/used), `warranty_months` |
| pass\_vehicle | `vehicle_type` (motorbike/car/bicycle), `brand`, `year`, `odometer_km`, `plate_prefix` |
| pass\_ppe | `item_type` (boots/helmet/uniform/gloves), `size`, `condition` |
| room\_rent | `area_m2`, `electricity_price`, `water_price`, `has_loft`, `has_parking`, `curfew`, `max_people` |
| job\_main / job\_parttime | `shift` (day/night/rotating), `salary_min`, `salary_max`, `pay_type` (hour/day/month), `requirements`, `contact_name` |
| lost / found | `item_type`, `lost_at` (timestamptz), `place`, `identifying_marks`, `returned` |

**5.3 Group (Ghép xe, Ghép trận)**

```sql
create type group_kind as enum ('ride','sport');
create type group_status as enum ('open','full','in_progress','completed','cancelled');
create type member_status as enum ('requested','accepted','declined','left','kicked');

create table groups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id),
  kind group_kind not null,
  sub_kind text not null,                  -- ride: car_owner|bus_pool|motorbike ; sport: football|badminton|pickleball
  status group_status not null default 'open',
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  seats_total int not null check (seats_total > 0),
  seats_taken int not null default 0,
  fee_per_person numeric(14,0) default 0,
  origin geography(point, 4326),           -- ride: điểm đi ; sport: sân
  origin_text text,
  destination geography(point, 4326),      -- ride: điểm đến
  destination_text text,
  attributes jsonb not null default '{}',  -- skill_level, vehicle_type, ...
  requires_approval boolean not null default true,
  conversation_id uuid,                    -- chat nhóm, tạo bởi trigger
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status member_status not null default 'requested',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create index groups_kind_status_starts_idx on groups (kind, status, starts_at);
create index groups_origin_idx on groups using gist (origin);
create index groups_destination_idx on groups using gist (destination);
```

Trigger `on group_members change`: đếm lại `seats_taken` từ các thành viên `accepted`; nếu bằng `seats_total` thì đổi `status = 'full'`, nếu giảm xuống thì về `open`. Trigger `on groups insert`: tạo `conversations` kiểu `group` và gán `conversation_id`.

**5.4 Chat**

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                      -- direct | group
  context_type text,                       -- listing | group
  context_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz default now()
);

create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz,
  muted boolean default false,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text,
  image_url text,
  created_at timestamptz default now()
);
create index messages_conv_created_idx on messages (conversation_id, created_at desc);
```

Chat 1-1 về một tin đăng: `conversations` với `kind='direct'`, `context_type='listing'`, unique theo (listing, người mua) để không tạo trùng. Realtime bật trên bảng `messages`, client lọc theo `conversation_id`.

**5.5 Moderation**

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  target_type text not null,               -- listing | group | profile | message
  target_id uuid not null,
  reason text not null,                    -- scam | spam | inappropriate | other
  detail text,
  status text not null default 'open',     -- open | reviewing | resolved | dismissed
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  reason text,                             -- auto: keyword | first_post | high_price
  status text default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table audit_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz default now()
);
```

**5.6 Hàm tìm kiếm mẫu**

```sql
create or replace function search_listings(
  p_category listing_category[],
  p_query text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m int default 10000,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_limit int default 20,
  p_cursor timestamptz default null
) returns setof listings
language sql stable as $$
  select * from listings l
  where l.status = 'active' and l.deleted_at is null
    and (p_category is null or l.category = any(p_category))
    and (p_query is null or l.search_vector @@ plainto_tsquery('simple', p_query)
         or l.title % p_query)
    and (p_lat is null or st_dwithin(l.location,
         st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m))
    and (p_price_min is null or l.price >= p_price_min)
    and (p_price_max is null or l.price <= p_price_max)
    and (p_cursor is null or l.created_at < p_cursor)
  order by l.created_at desc
  limit p_limit;
$$;
```

Phân trang dùng cursor theo `created_at` thay vì offset để danh sách dài vẫn nhanh. Tiếng Việt: dùng config `'simple'` (không stemming) kết hợp `pg_trgm` để tìm gần đúng; thêm `unaccent` nếu người dùng gõ không dấu.

## 6. Xác thực và phân quyền

Ai có số điện thoại Việt Nam đều đăng ký được bằng OTP; xác minh là **tùy chọn** và đổi lấy huy hiệu tin cậy, không phải điều kiện vào app. Quyền được kiểm tra ở tầng database bằng Row Level Security, nên dù client bị sửa cũng không đọc/ghi được dữ liệu không thuộc về mình.

**Luồng đăng ký**

1. Nhập số điện thoại → Supabase Auth gửi OTP qua hook SMS tuỳ chỉnh (Zalo ZNS, fallback SMS). Có thể thêm "Đăng nhập bằng Google/Apple" để giảm chi phí OTP.
2. Nhập OTP → nhận JWT, trigger tạo `profiles`.
3. Onboarding 3 bước ngắn: chọn ngôn ngữ (Tiếng Việt / English / 中文) → tên + ảnh đại diện → chọn khu vực và mối quan tâm. Bỏ qua được.
4. Xác minh tùy chọn, mỗi loại cho một huy hiệu riêng:
   - **Đã xác thực SĐT**: mặc định sau OTP.
   - **Người lao động khu công nghiệp**: tải ảnh thẻ nhân viên/thẻ ra vào (che số), cộng tác viên duyệt thủ công. App không kết nối dữ liệu nhân sự của bất kỳ công ty nào.
   - **Chủ trọ / chủ sân / nhà tuyển dụng**: ảnh CCCD che một phần hoặc giấy phép kinh doanh.
5. Tài khoản mới được dùng đủ tính năng nhưng chịu giới hạn tần suất chặt hơn trong 7 ngày đầu (mục 11).

**Vai trò**

| Vai trò | Quyền |
| --- | --- |
| khách (chưa đăng nhập) | Xem tin, tìm kiếm; bấm liên hệ thì yêu cầu đăng nhập |
| user | Đăng tin, chat, tạo/tham gia nhóm, đánh giá, báo cáo, lưu tin |
| user có huy hiệu | Như user, giới hạn tần suất nới hơn, tin được ưu tiên hiển thị |
| moderator | Duyệt tin, xử lý báo cáo, ẩn tin, cảnh cáo, khoá tạm, duyệt huy hiệu |
| admin | Toàn quyền, quản lý moderator, xem audit log, cấu hình danh mục |

**Row Level Security (mẫu)**

```sql
alter table listings enable row level security;

-- Ai cũng đọc tin active; chủ tin đọc mọi trạng thái của mình; mod/admin đọc tất cả
create policy listings_select on listings for select using (
  status = 'active' and deleted_at is null
  or owner_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('moderator','admin'))
);

-- Người dùng đã đăng nhập, không bị cấm, chỉ đăng với owner_id = chính mình
create policy listings_insert on listings for insert with check (
  owner_id = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid()
              and not p.is_banned)
);

create policy listings_update on listings for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status <> 'active' or status = 'active');

-- messages: chỉ thành viên cuộc hội thoại đọc/ghi
create policy messages_rw on messages for all using (
  exists (select 1 from conversation_members m
          where m.conversation_id = messages.conversation_id and m.user_id = auth.uid())
);
```

**Quy tắc bảo mật khác**

- Cột nhạy cảm (`phone`, `push_tokens, ảnh giấy tờ xác minh`) không expose qua view công khai: tạo view `public_profiles` chỉ có `id, full_name, avatar_url, site, rating_avg, verification`.
- Số điện thoại người đăng chỉ hiện sau khi người xem đã bấm "Liên hệ" và được ghi `audit_log`, để hạn chế thu thập số hàng loạt.
- JWT hết hạn 1 giờ, refresh token xoay vòng; đăng xuất xoá push token.
- Giới hạn tần suất: tối đa 10 tin đăng/ngày, 50 tin nhắn đầu tiên/giờ cho tài khoản mới (Edge Function + bảng `rate_limits`).
- Service role key chỉ tồn tại trong Edge Functions và admin server, không bao giờ trong app.

## 7. Thiết kế từng module

Mỗi module là một thư mục `features/<tên>` trong app, dùng chung component Listing hoặc Group, chỉ khác form đăng, bộ lọc và thẻ hiển thị.

**7.1 Pass đồ**

- Màn hình: danh sách theo danh mục (tab: Điện tử / Xe / Bảo hộ / Gia dụng) → chi tiết → chat với người bán.
- Form đăng: chọn danh mục → chụp/chọn ảnh (tối đa 10, nén còn 1280px) → tiêu đề, giá, tình trạng, mô tả → vị trí (mặc định khu liên hợp của người đăng).
- Bộ lọc: danh mục con, khoảng giá, tình trạng, bán kính, khu liên hợp, mới nhất/giá thấp.
- Giao dịch trực tiếp giữa hai người, app không giữ tiền; sau khi người bán đánh dấu "Đã bán" và chọn người mua, cả hai được mời đánh giá.
- Chống lừa đảo: tin có giá thấp bất thường so với trung vị danh mục (dưới 30%) hoặc tài khoản mới dưới 7 ngày → vào `moderation_queue`.

**7.2 Tìm trọ**

- Hai chế độ xem: danh sách và bản đồ (Goong Maps, cluster marker).
- Bộ lọc đặc thù: khoảng cách đến nhà máy (tính từ `sites.location`), giá, diện tích, có gác, chỗ để xe, giờ giấc, ở ghép nam/nữ.
- Ảnh phòng bắt buộc tối thiểu 3; tin trọ hết hạn 30 ngày, nhắc gia hạn trước 3 ngày.
- Thẻ hiển thị nhấn mạnh: giá/tháng, cách nhà máy X km, còn trống hay đã có người.

**7.3 Tìm việc**

- Hai danh mục: việc chính (toàn thời gian, thường do phòng nhân sự/nhà thầu đăng) và việc làm thêm ngoài ca (bốc xếp, giao hàng, dạy kèm, phụ quán...).
- Form đăng việc làm thêm: loại việc, ca (sáng/chiều/tối/cuối tuần), lương và hình thức trả, địa điểm, số người cần, liên hệ.
- Ứng tuyển = bấm "Quan tâm" mở chat với người đăng; không xây hệ thống hồ sơ/CV ở MVP.
- Tin của nhà tuyển dụng đã xác minh có huy hiệu "Chính thức" (`profiles.role` hoặc tag `official`).
- Hết hạn 14 ngày; cảnh báo lừa đảo nếu yêu cầu đặt cọc/phí (lọc từ khoá: "đặt cọc", "phí hồ sơ").

**7.4 Ghép xe về thành phố**

- Ba kiểu nhóm: chủ xe ô tô cần người đi cùng chia xăng; gom đủ người thuê xe khách; xe máy chở kèm.
- Tạo nhóm: điểm đi (mặc định cổng nhà máy), điểm đến (chọn trên bản đồ hoặc gõ địa chỉ Goong autocomplete), giờ đi, số chỗ, phí/người, ghi chú (có hành lý, dừng dọc đường).
- Tìm nhóm: lọc theo ngày, điểm đến cách điểm mong muốn dưới 5 km (`ST_DWithin` trên `destination`), còn chỗ.
- Tham gia: gửi yêu cầu → chủ xe duyệt (hoặc tự động nếu `requires_approval = false`) → vào chat nhóm.
- Nhắc: push trước giờ đi 1 giờ cho tất cả thành viên; sau giờ đi 3 giờ nhóm chuyển `completed`, mời đánh giá.
- Mùa cao điểm (Tết, lễ) hiển thị banner gom nhóm theo tỉnh.

**7.5 Ghép trận / tìm sân**

- Môn: bóng đá (5/7 người), cầu lông (đơn/đôi), pickleball.
- Tạo kèo: môn, sân (chọn từ danh sách sân đã lưu quanh khu liên hợp hoặc nhập mới), ngày giờ, số người cần, trình độ (mới chơi/trung bình/khá), phí sân chia/người.
- Danh sách sân (`venues`): tên, vị trí, môn, giá tham khảo, số điện thoại sân; người dùng đóng góp, moderator duyệt.
- Ghép theo trình độ: gợi ý kèo cùng trình độ và cùng khung giờ rảnh người dùng đã đặt trong hồ sơ.
- Sau trận: đánh giá "đúng giờ / đúng trình độ"; điểm uy tín thể thao hiển thị riêng.

**7.6 Tìm / trả đồ thất lạc**

- Hai loại tin: "Tôi làm mất" và "Tôi nhặt được"; miễn phí, không cần duyệt, hết hạn 60 ngày.
- Form: loại đồ (thẻ nhân viên, ví, điện thoại, chìa khoá, khác), nơi và thời điểm, ảnh (với đồ nhặt được: ảnh che một phần đặc điểm để người nhận phải mô tả đúng).
- Khớp tự động: Edge Function so `item_type` + khoảng thời gian ± 2 ngày + khoảng cách dưới 2 km giữa tin "mất" và "nhặt", gửi push gợi ý cho cả hai.
- Xác nhận trả: hai bên bấm "Đã nhận lại", tin chuyển `closed`, cộng điểm uy tín cho người trả.
- Điểm gửi/nhận đồ: hợp tác quán ăn, nhà trọ gần cổng nhà máy làm nơi giữ hộ đồ nhặt được.

**Ma trận dùng chung**

| Thành phần | Pass đồ | Trọ | Việc | Ghép xe | Ghép trận | Thất lạc |
| --- | --- | --- | --- | --- | --- | --- |
| Bảng dữ liệu | listings | listings | listings | groups | groups | listings |
| Bản đồ | tuỳ chọn | bắt buộc | tuỳ chọn | bắt buộc | bắt buộc | tuỳ chọn |
| Chat | 1-1 | 1-1 | 1-1 | nhóm | nhóm | 1-1 |
| Kiểm duyệt trước | theo rule | theo rule | có (việc chính) | không | không | không |
| Đánh giá sau | có | không | không | có | có | có |
| Hết hạn | 30 ngày | 30 ngày | 14 ngày | theo giờ đi | theo giờ đá | 60 ngày |

## 8. Kiến trúc ứng dụng mobile

App tổ chức theo **feature-first**: mỗi tính năng là một thư mục tự chứa (màn hình, hook, API, component riêng), dùng chung lớp `core` và `ui`. Routing bằng Expo Router (file-based), dữ liệu server qua TanStack Query, state cục bộ qua Zustand.

**Cấu trúc thư mục `apps/mobile`**

```
app/                          # Expo Router: mỗi file là một route
├── _layout.tsx               # Providers: Query, Auth, Theme, Toast
├── (auth)/
│   ├── phone.tsx
│   ├── otp.tsx
│   └── verify.tsx            # nhập mã nhân viên
├── (tabs)/
│   ├── _layout.tsx           # 5 tab: Trang chủ, Khám phá, Đăng (+), Tin nhắn, Tôi
│   ├── index.tsx             # lưới dịch vụ + feed gợi ý
│   ├── explore.tsx
│   ├── post.tsx              # chọn loại tin cần đăng
│   ├── chat/index.tsx
│   └── me.tsx
├── listing/
│   ├── [id].tsx              # chi tiết tin (mọi category)
│   └── new/[category].tsx    # form đăng theo category
├── group/
│   ├── [id].tsx
│   └── new/[kind].tsx
├── chat/[conversationId].tsx
└── search.tsx

src/
├── core/
│   ├── supabase.ts           # client + typed Database
│   ├── auth/                 # session store, hooks useSession, useProfile
│   ├── query/                # queryClient, queryKeys factory
│   ├── notifications/        # đăng ký push token, xử lý deep link
│   ├── location/             # xin quyền, lấy vị trí, cache
│   ├── upload/               # nén ảnh, upload Storage, retry
│   └── analytics/            # PostHog wrapper
├── features/
│   ├── listing/              # dùng chung cho 4 tính năng Listing
│   │   ├── api.ts            # fetchListings, createListing (gọi supabase)
│   │   ├── hooks.ts          # useListings (infinite), useListing, useCreateListing
│   │   ├── schemas.ts        # Zod theo category (re-export từ packages/shared)
│   │   └── components/       # ListingCard, ListingFilters, ListingForm
│   ├── pass/                 # cấu hình riêng: danh mục con, filter, card variant
│   ├── room/
│   ├── job/
│   ├── lost-found/
│   ├── group/                # dùng chung cho Ghép xe, Ghép trận
│   ├── ride/
│   ├── sport/
│   ├── chat/
│   └── profile/
├── ui/                       # design system
│   ├── tokens.ts             # màu, spacing, radius, typography
│   ├── Button.tsx, Text.tsx, Card.tsx, Sheet.tsx, Chip.tsx, Skeleton.tsx ...
│   └── icons/
└── lib/                      # format tiền, ngày, khoảng cách; i18n
```

**Quy tắc kiến trúc trong app**

1. Màn hình (`app/`) chỉ ghép component và gọi hook; không gọi Supabase trực tiếp.
2. Mọi gọi server nằm trong `features/*/api.ts`, mọi cache trong `features/*/hooks.ts` với `queryKeys` chuẩn: `['listings', filters]`, `['listing', id]`, `['groups', kind, filters]`, `['conversations']`, `['messages', conversationId]`.
3. Component trong `ui/` không biết gì về nghiệp vụ; component trong `features/*/components` không import từ feature khác.
4. Form: React Hook Form + Zod schema dùng chung với server; lỗi hiển thị ngay dưới ô nhập.
5. Điều hướng bằng deep link có cấu trúc: `hoaphat://listing/{id}`, `hoaphat://group/{id}`, `hoaphat://chat/{id}` — push notification và chia sẻ Zalo đều dùng link này.

**Design system**

| Token | Giá trị |
| --- | --- |
| Màu chính | Xanh Hòa Phát (lấy từ bộ nhận diện thương hiệu), màu nhấn cam cho nút Đăng |
| Typography | Inter hoặc Be Vietnam Pro; cỡ 12/14/16/20/24; tiêu đề 600, thân 400 |
| Spacing | thang 4: 4, 8, 12, 16, 24, 32 |
| Radius | 8 cho card, 12 cho sheet, 999 cho chip |
| Vùng chạm | tối thiểu 44×44 |
| Trạng thái | mỗi màn hình có đủ: loading (skeleton), empty (hình + CTA), error (nút thử lại) |
| Dark mode | hỗ trợ từ đầu qua token, không hard-code màu |

**Hiệu năng và cảm giác mượt**

- Danh sách: FlashList với `estimatedItemSize`, ảnh qua `expo-image` có placeholder blurhash, prefetch trang tiếp khi còn 5 item.
- Optimistic update: gửi tin nhắn, lưu tin, tham gia nhóm hiển thị ngay, rollback nếu lỗi.
- TanStack Query: `staleTime` 60 giây cho danh sách, persist cache xuống MMKV để mở app có dữ liệu ngay khi offline.
- Animation: Reanimated cho chuyển tab, bottom sheet, nút nổi; không dùng `Animated` cũ.
- Ảnh upload nén còn 1280px, chất lượng 0.8, WebP; thumbnail 400px do Storage transform.
- Khởi động: lazy-require màn hình nặng (bản đồ), font preload, splash giữ đến khi session khôi phục.
- Bản đồ chỉ mount khi người dùng chuyển sang chế độ bản đồ.
- Theo dõi: Sentry Performance đo TTI màn hình chính; mục tiêu p75 dưới 1,5 giây trên Android tầm trung.

**Offline và mạng yếu**

- Bản nháp tin đăng lưu local (Zustand persist), gửi khi có mạng.
- Hàng đợi upload ảnh với retry lũy thừa.
- Chat hiển thị trạng thái gửi/đã gửi/lỗi; tin nhắn chưa gửi giữ lại khi mở lại app.

## 9. Design system UI dùng chung

Xây design system trước khi viết màn hình đầu tiên: mọi màn hình chỉ được ghép từ component trong `src/ui` và token trong `tokens.ts`. Khi vibe code, AI nhận được một bộ "từ vựng" cố định nên 30 màn hình trông như một người thiết kế, và đổi màu thương hiệu sau này chỉ sửa một file.

**9.1 Token (`src/ui/tokens.ts`)**

| Nhóm | Token | Giá trị (light) | Ghi chú |
| --- | --- | --- | --- |
| Màu thương hiệu | `primary` | xanh thép chủ đạo, gần màu Hòa Phát nhưng không sao chép logo (`#0B4F9C`) | nút chính, tab active, link |
|  | `primary.light` | `#E6EFFA` | nền chip/badge primary |
|  | `accent` | cam `#F2762E` | nút Đăng tin, huy hiệu nổi bật |
| Màu ngữ nghĩa | `success` / `warning` / `danger` | `#1E9E5A` / `#E0A100` / `#D93025` | trạng thái, cảnh báo lừa đảo |
| Màu trung tính | `bg` / `surface` / `surface2` | `#F6F7F9` / `#FFFFFF` / `#EEF0F3` | nền màn hình / card / ô nhập |
|  | `border` | `#E2E5EA` | viền 1px |
|  | `text` / `text.muted` / `text.disabled` | `#111827` / `#6B7280` / `#9CA3AF` |  |
| Dark mode | cùng tên token, giá trị đảo | `bg #0F1115`, `surface #171A20`, `text #F3F4F6` | component không được biết đang ở theme nào |
| Typography | `xs 12 / sm 14 / md 16 / lg 18 / xl 20 / 2xl 24 / 3xl 28` | Be Vietnam Pro (vi/en), Noto Sans SC (zh) | line-height = size × 1,4; weight 400 thân, 500 nhãn, 600 tiêu đề, 700 giá tiền |
| Spacing | `1 4 / 2 8 / 3 12 / 4 16 / 5 20 / 6 24 / 8 32` | thang 4 | padding màn hình = 16, khoảng cách card = 12 |
| Radius | `sm 6 / md 10 / lg 14 / xl 20 / full 999` |  | input sm, card md, sheet lg, chip full |
| Shadow | `card` | `0 1 3 rgba(0,0,0,0.06)` | chỉ card và FAB có bóng |
| Icon | Lucide (`lucide-react-native`) | size 20 trong nút, 24 trong tab, stroke 1,75 | không trộn bộ icon khác |
| Vùng chạm | tối thiểu `44` |  | nút nhỏ vẫn có hitSlop |

**9.2 Component lõi (`src/ui/`)**

Mỗi component có file `.tsx`, props typed, variant bằng `cva`-style, và một ví dụ trong màn hình `app/(dev)/ui-gallery.tsx` để AI và người review nhìn thấy toàn bộ.

| Component | Variants / props chính | Dùng ở |
| --- | --- | --- |
| `Text` | `variant: title/heading/body/label/caption/price`, `color`, `numberOfLines` | mọi nơi; cấm dùng `<Text>` của RN trực tiếp |
| `Button` | `variant: primary/secondary/outline/ghost/danger`, `size: sm/md/lg`, `loading`, `icon`, `fullWidth` | CTA, form |
| `IconButton` | `icon`, `size`, `variant` | header, card actions |
| `Input` | `label`, `placeholder`, `error`, `helper`, `leftIcon`, `rightSlot`, `keyboardType`, `multiline` | mọi form |
| `Select` / `MultiSelect` | mở bottom sheet, `options`, `searchable` | danh mục, công ty, khu |
| `PriceInput` | định dạng `1.500.000 đ` khi gõ, `allowNegotiable`, `allowFree` | pass đồ, trọ, việc |
| `ImagePicker` | `max`, `min`, kéo thả sắp xếp, ảnh đầu là bìa, nén sẵn | form đăng tin |
| `LocationPicker` | nút "vị trí hiện tại", chọn trên bản đồ, autocomplete Goong | tin có vị trí, nhóm |
| `DateTimePicker` | `mode: date/time/datetime`, chặn quá khứ | ghép xe, ghép trận |
| `Chip` | `selected`, `onPress`, `icon`, `removable` | bộ lọc, tag |
| `Badge` | `tone: primary/success/warning/danger/neutral`, `label` | trạng thái tin, "Chính thức", "Giá tốt" |
| `Avatar` | `size`, `uri`, `name` (fallback chữ cái), `verified` | hồ sơ, chat |
| `Card` | `onPress`, `padding`, `elevated` | nền cho mọi card |
| `ListingCard` | `listing`, `layout: grid/row`, hiển thị ảnh bìa, tiêu đề, giá, khoảng cách, thời gian, badge | 4 tính năng Listing |
| `GroupCard` | `group`, hiển thị giờ, tuyến/sân, số chỗ còn, avatar thành viên, phí | ghép xe, ghép trận |
| `ServiceTile` | `icon`, `label`, `badgeCount` | lưới dịch vụ trang chủ |
| `SectionHeader` | `title`, `actionLabel`, `onAction` | trang chủ, chi tiết |
| `BottomSheet` | `snapPoints`, `title`, `scrollable` (gorhom) | bộ lọc, chọn, xác nhận |
| `Toast` | `type: success/error/info`, hàng đợi | sau mọi mutation |
| `Skeleton` + `SkeletonListingCard` | `width/height/radius`, animation shimmer | mọi trạng thái loading |
| `EmptyState` | `illustration`, `title`, `description`, `action` | danh sách trống, chưa có chat |
| `ErrorState` | `message`, `onRetry` | lỗi mạng |
| `Screen` | `scroll`, `padded`, `safeTop/safeBottom`, `header` | bọc mọi màn hình |
| `Header` | `title`, `back`, `rightActions`, `transparent` | mọi màn hình không phải tab |
| `TabBar` | 5 tab, nút giữa nổi màu accent | layout tabs |
| `SearchBar` | `value`, `onSubmit`, `onFilterPress`, `filterCount` | khám phá, danh sách |
| `FilterBar` | hàng chip cuộn ngang + nút "Lọc" mở sheet | danh sách tin, nhóm |
| `MapView` wrapper | `markers`, `cluster`, `onRegionChange`, lazy mount | trọ, ghép xe, sân |
| `MessageBubble` | `mine`, `status: sending/sent/failed`, `image` | chat |
| `Rating` | `value`, `editable`, `size` | đánh giá |
| `Divider`, `Spacer`, `Row`, `Col` | layout helper | thay cho style thủ công |

**9.3 Mẫu màn hình (templates)**

Chỉ có 5 kiểu màn hình; mọi màn hình mới phải thuộc một trong 5 kiểu này và dùng đúng khung của nó.

| Kiểu | Khung | Ví dụ |
| --- | --- | --- |
| Danh sách | `Screen` → `SearchBar` + `FilterBar` → `FlashList` của `ListingCard`/`GroupCard` → `Skeleton`/`EmptyState`/`ErrorState` → FAB Đăng | Pass đồ, Trọ, Việc, Ghép xe, Ghép trận, Thất lạc |
| Chi tiết | `Screen scroll` → carousel ảnh → tiêu đề, giá, badge → thông tin theo `attributes` → người đăng (`Avatar` + `Rating`) → mô tả → tin tương tự → thanh CTA dính đáy (Chat / Gọi / Tham gia) | chi tiết tin, chi tiết nhóm |
| Form | `Screen scroll` → các `Input`/`Select`/`ImagePicker` theo thứ tự ảnh → thông tin chính → chi tiết → vị trí → nút Đăng dính đáy, keyboard-aware | đăng tin, tạo nhóm, sửa hồ sơ |
| Hội thoại | `Header` có avatar + ngữ cảnh tin → danh sách `MessageBubble` đảo ngược → ô nhập + nút ảnh | chat 1-1, chat nhóm |
| Trang tổng | `Screen scroll` → `SectionHeader` + lưới `ServiceTile` → các section ngang | trang chủ, tab Tôi |

**9.4 Quy tắc tương tác**

- Phản hồi tức thì: mọi nút bấm có hiệu ứng scale 0,97 (Reanimated) và haptic nhẹ cho hành động quan trọng (đăng tin, tham gia nhóm).
- Chuyển màn hình: push mặc định của Expo Router; sheet cho hành động phụ; modal toàn màn hình chỉ cho xem ảnh và chọn vị trí.
- Tải dữ liệu: skeleton đúng hình dạng nội dung, không spinner giữa màn hình; pull-to-refresh ở mọi danh sách.
- Lỗi: toast cho lỗi tạm, `ErrorState` cho lỗi tải trang, inline dưới ô nhập cho lỗi form; thông điệp bằng tiếng Việt thân thiện, có hành động tiếp theo.
- Số và ngày: tiền `1.500.000 đ`, khoảng cách `1,2 km`, thời gian tương đối `5 phút trước` qua helper trong `src/lib/format.ts`; không tự định dạng trong màn hình.
- Ảnh: tỷ lệ 4:3 cho card, 1:1 cho avatar, carousel chi tiết full width; luôn có placeholder màu `surface2`.
- Accessibility: `accessibilityLabel` cho nút chỉ có icon, font scale hỗ trợ đến 130%, contrast tối thiểu 4,5:1.

**9.5 Code mẫu**

```ts
// src/ui/tokens.ts
export const colors = {
  light: {
    primary: '#0B4F9C', primaryLight: '#E6EFFA', accent: '#F2762E',
    success: '#1E9E5A', warning: '#E0A100', danger: '#D93025',
    bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#EEF0F3', border: '#E2E5EA',
    text: '#111827', textMuted: '#6B7280', textDisabled: '#9CA3AF',
  },
  dark: {
    primary: '#5B9BE6', primaryLight: '#15283F', accent: '#F58A4C',
    success: '#3CBF78', warning: '#F0B429', danger: '#F05252',
    bg: '#0F1115', surface: '#171A20', surface2: '#1F232B', border: '#2A2F38',
    text: '#F3F4F6', textMuted: '#9CA3AF', textDisabled: '#6B7280',
  },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 } as const;
export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28 },
  family: { regular: 'BeVietnamPro_400Regular', medium: 'BeVietnamPro_500Medium',
            semibold: 'BeVietnamPro_600SemiBold', bold: 'BeVietnamPro_700Bold' },
} as const;
```

```tsx
// src/ui/Button.tsx
import { Pressable, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from './theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', size = 'md',
                         loading, disabled, icon, fullWidth }: Props) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const height = { sm: 36, md: 44, lg: 52 }[size];
  const bg = { primary: t.colors.primary, secondary: t.colors.primaryLight,
               outline: 'transparent', ghost: 'transparent', danger: t.colors.danger }[variant];
  const fg = { primary: '#fff', secondary: t.colors.primary, outline: t.colors.primary,
               ghost: t.colors.primary, danger: '#fff' }[variant];
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      accessibilityRole="button"
      style={[style, {
        height, paddingHorizontal: t.space[4], borderRadius: t.radius.md,
        backgroundColor: bg, opacity: disabled ? 0.5 : 1,
        borderWidth: variant === 'outline' ? 1 : 0, borderColor: t.colors.primary,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[2],
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text variant="label" style={{ color: fg }}>{label}</Text>
    </AnimatedPressable>
  );
}
```

**9.6 Thứ tự xây design system (tuần 1–2)**

1. `tokens.ts` + `theme.tsx` (ThemeProvider đọc light/dark từ hệ thống).
2. `Text`, `Screen`, `Header`, `Row/Col/Spacer/Divider`.
3. `Button`, `IconButton`, `Input`, `Chip`, `Badge`, `Avatar`, `Card`.
4. `Skeleton`, `EmptyState`, `ErrorState`, `Toast`.
5. `BottomSheet`, `Select`, `DateTimePicker`, `PriceInput`.
6. `ImagePicker`, `LocationPicker`, `MapView`.
7. `ListingCard`, `GroupCard`, `ServiceTile`, `SectionHeader`, `SearchBar`, `FilterBar`, `MessageBubble`, `Rating`.
8. Màn hình `ui-gallery` liệt kê tất cả với mọi variant; chụp ảnh màn hình này làm tham chiếu khi review.

**9.7 Luật cho AI khi sinh UI (đưa vào CLAUDE.md)**

- Chỉ import component từ `@/ui`; không dùng `View` có style màu/khoảng cách thủ công khi đã có `Row/Col/Card`.
- Không hard-code số pixel hay mã màu; luôn qua `t.space`, `t.radius`, `t.colors`, `t.font`.
- Màn hình mới phải khai báo thuộc kiểu nào trong 5 mẫu (mục 9.3) ở comment đầu file.
- Thiếu component → tạo trong `src/ui` kèm ví dụ trong `ui-gallery`, không tạo tại chỗ trong feature.
- Mọi danh sách dùng `FlashList`, mọi ảnh dùng `expo-image`, mọi animation dùng Reanimated.
- Trước khi báo xong, tự kiểm tra: loading/empty/error, dark mode, màn hình 360px rộng, font scale 130%.

**9.8 Phong cách hình ảnh: hiện đại, sáng, dễ dùng**

Phong cách tham chiếu là các super app phổ biến ở Việt Nam (Grab, MoMo, Zalo, Shopee): nền sáng, một màu chủ đạo mạnh, card bo tròn, nhiều khoảng thở, icon minh hoạ màu, mọi thứ quan trọng nằm trong tầm ngón cái.

- **Màu**: xanh thép làm màu chủ đạo cho header trang chủ (gradient nhẹ `#0B4F9C → #1E6FD9`), nút chính, tab đang chọn. Mỗi dịch vụ có một màu nhận diện riêng ở icon (Pass đồ cam, Trọ tím, Việc xanh lá, Ghép xe xanh ngọc, Thể thao đỏ, Thất lạc vàng) để người dùng nhận ra bằng mắt, không cần đọc chữ.
- **Trang chủ**: header xanh cong ở đáy chứa lời chào + ô tìm kiếm lớn; lưới 6 dịch vụ (icon 56px trong ô bo tròn 16, nhãn 2 dòng); banner trượt (sự kiện, ghép xe dịp lễ); các section ngang "Gần bạn", "Mới đăng", "Kèo hôm nay".
- **Card**: ảnh chiếm 60% card, giá in đậm màu primary, thông tin phụ một dòng màu muted kèm icon (vị trí, thời gian), badge góc ảnh.
- **Minh hoạ**: bộ illustration phẳng cùng phong cách cho empty state, onboarding, lỗi mạng; nhân vật là công nhân đội mũ bảo hộ, thân thiện.
- **Mật độ**: tối đa 1 hành động chính mỗi màn hình; hành động phụ trong menu "…" hoặc sheet.
- **Bottom tab**: 5 tab, nút Đăng ở giữa nổi tròn màu accent; tab active có icon đặc + chấm nhỏ.

**9.9 Chuyển động (motion)**

Animation có mục đích: báo hiệu phản hồi, giữ ngữ cảnh khi chuyển màn, và tạo cảm giác "cao cấp". Mọi animation dùng Reanimated + Moti, chạy trên UI thread.

| Token | Thời lượng | Easing | Dùng cho |
| --- | --- | --- | --- |
| `instant` | 100 ms | ease-out | nhấn nút (scale 0,97), đổi trạng thái chip |
| `fast` | 200 ms | ease-out | toast, tooltip, hiện/ẩn icon |
| `base` | 280 ms | spring (damping 18, stiffness 180) | bottom sheet, mở card, tab chuyển |
| `slow` | 400 ms | ease-in-out | chuyển màn hình chia sẻ phần tử, onboarding |

| Khoảnh khắc | Animation |
| --- | --- |
| Mở chi tiết tin từ card | Shared element: ảnh card phóng to thành ảnh bìa chi tiết |
| Danh sách tải xong | Item hiện lần lượt (fade + trượt lên 8px, cách nhau 30 ms, tối đa 8 item đầu) |
| Kéo để làm mới | Icon mũ bảo hộ/bánh răng xoay thay spinner mặc định |
| Lưu tin | Trái tim nảy (scale 1 → 1,3 → 1) + haptic nhẹ |
| Đăng tin thành công | Màn hình chúc mừng với Lottie confetti ngắn, nút "Xem tin" |
| Tham gia nhóm | Avatar của mình bay vào hàng avatar nhóm, số chỗ còn đếm ngược |
| Header trang chủ | Thu gọn mượt khi cuộn, ô tìm kiếm dính lên trên |
| Tab bar | Icon active nảy nhẹ; nút Đăng xoay 45° khi mở menu chọn loại tin |
| Skeleton | Shimmer chạy chéo 1,2 giây/lượt |

Tôn trọng cài đặt "Giảm chuyển động" của hệ thống (`AccessibilityInfo.isReduceMotionEnabled`): khi bật, thay mọi chuyển động bằng fade 150 ms. Không animation nào chặn thao tác người dùng.

**9.10 Dễ dùng cho mọi lứa tuổi**

- Chữ thân tối thiểu 16, nhãn 14; hỗ trợ cỡ chữ hệ thống đến 150% mà không vỡ layout (test bắt buộc).
- Icon luôn đi kèm chữ ở trang chủ và tab bar; không có nút chỉ là icon ở luồng chính.
- Vùng chạm 48×48 cho nút chính; khoảng cách giữa hai nút tối thiểu 8.
- Form ít ô: đăng tin pass đồ chỉ bắt buộc ảnh + tiêu đề + giá; còn lại gợi ý sẵn. Có "Đăng nhanh" 3 bước.
- Ngôn ngữ đời thường, không thuật ngữ: "Pass đồ" thay "Marketplace", "Ghép xe về quê" thay "Carpooling".
- Nhập liệu bằng giọng nói cho tìm kiếm và mô tả tin (speech-to-text của hệ thống).
- Nút gọi điện / nhắn Zalo nổi bật trên tin cho người quen gọi hơn chat.
- Tương phản tối thiểu 4,5:1; không truyền tải thông tin chỉ bằng màu.
- Hướng dẫn lần đầu (coach mark) ngắn cho 3 thao tác: tìm, đăng, nhắn; bỏ qua được và xem lại trong Cài đặt.
- Xác nhận trước hành động khó hoàn tác (xoá tin, rời nhóm) bằng sheet có chữ rõ, không chỉ "OK/Huỷ".

**9.11 Đa ngôn ngữ: Tiếng Việt, English, 中文**

App hỗ trợ 3 ngôn ngữ ngay từ MVP: Tiếng Việt (mặc định), English và 中文 giản thể — phục vụ chuyên gia, kỹ sư và nhà thầu nước ngoài làm việc tại các khu công nghiệp. Giao diện được dịch hoàn toàn; nội dung người dùng đăng giữ nguyên ngôn ngữ gốc và có nút "Dịch".

| Thành phần | Cách làm |
| --- | --- |
| Thư viện | `i18next` + `react-i18next` + `expo-localization` (lấy ngôn ngữ máy làm mặc định lần đầu) |
| File dịch | `packages/shared/i18n/{vi,en,zh}/{common,listing,group,chat,auth,errors}.json`; key dạng `listing.form.price_label` |
| Chọn ngôn ngữ | Bước đầu onboarding + Cài đặt; lưu `profiles.locale` để thông báo đẩy và email gửi đúng ngôn ngữ |
| Danh mục, enum | Không lưu nhãn trong DB; DB lưu mã (`pass_vehicle`), app dịch qua key `category.pass_vehicle` |
| Tiền, số, ngày | `Intl.NumberFormat` / `Intl.DateTimeFormat` theo locale; tiền luôn là VND (`1.500.000 ₫`, `₫1,500,000`, `1,500,000 越南盾`) |
| Thời gian tương đối | `Intl.RelativeTimeFormat` ("5 phút trước" / "5 min ago" / "5分钟前") |
| Font | Be Vietnam Pro cho vi/en; Noto Sans SC cho zh (tải theo yêu cầu khi chọn tiếng Trung để không tăng dung lượng app) |
| Độ dài chữ | Thiết kế chừa 30% cho tiếng Anh dài hơn; tiếng Trung ngắn hơn nên kiểm tra căn chỉnh; không cắt chữ trong nút |
| Nội dung người dùng | Lưu `listings.lang` (tự nhận diện khi đăng); người xem khác ngôn ngữ thấy nút "Dịch" → Edge Function `translate-content` gọi API dịch (Google Translate / DeepL), cache vào `listing_translations(listing_id, lang, title, description)` |
| Tìm kiếm | Full-text config `simple` hoạt động với cả 3 ngôn ngữ; tiếng Trung dùng `pg_trgm` (không có khoảng trắng tách từ) |
| Thông báo đẩy | Template theo `profiles.locale` trong Edge Function `send-push` |
| Store | Mô tả, ảnh chụp màn hình App Store/Google Play cho cả 3 ngôn ngữ |

Quy tắc cho AI: không bao giờ viết chuỗi hiển thị trực tiếp trong component; mọi chữ qua `t('key')`, thêm key đồng thời vào cả 3 file. Script CI `i18n:check` báo lỗi khi thiếu key ở bất kỳ ngôn ngữ nào. Bản dịch đầu do AI sinh, sau đó nhờ người bản ngữ rà các màn hình chính.

```sql
alter table listings add column lang text not null default 'vi';   -- vi | en | zh

create table listing_translations (
  listing_id uuid references listings(id) on delete cascade,
  lang text not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  primary key (listing_id, lang)
);
```

## 10. Backend chi tiết

Backend không có server riêng: PostgREST lo CRUD, Postgres lo ràng buộc và tìm kiếm, Edge Functions lo các bước cần bí mật hoặc gọi ra ngoài, pg\_cron lo việc định kỳ.

**Edge Functions (thư mục `supabase/functions/`)**

| Function | Kích hoạt | Việc làm |
| --- | --- | --- |
| `send-otp` | Auth SMS hook | Gửi OTP qua Zalo ZNS, fallback SMS nếu ZNS lỗi, ghi log |
| `request-badge` | App gọi khi gửi giấy tờ xác minh | `Lưu ảnh giấy tờ vào bucket riêng tư, tạo task duyệt huy hiệu cho moderator` |
| `join-group` | App gọi | Transaction: kiểm tra còn chỗ, chưa bị chặn, chưa tham gia → insert member → push cho chủ nhóm |
| `respond-join` | App (chủ nhóm) | Duyệt/từ chối, thêm vào chat nhóm, push cho người xin |
| `send-push` | DB webhook trên `notifications` insert | Gọi Expo Push API theo `push_tokens`, xoá token hỏng |
| `match-lost-found` | DB webhook trên `listings` insert (lost/found) | Tìm tin khớp, tạo thông báo cho cả hai |
| `moderate-listing` | DB webhook trên `listings` insert | Chấm rule: từ khoá cấm, giá bất thường, tài khoản mới → `moderation_queue` |
| `expire-content` | pg\_cron mỗi giờ | Chuyển tin quá hạn sang `expired`, nhóm quá giờ sang `completed`, nhắc gia hạn |
| `remind-groups` | pg\_cron mỗi 15 phút | Push nhắc trước giờ đi/giờ đá 60 phút |
| `translate-content` | Người xem bấm "Dịch" trên tin khác ngôn ngữ | Dịch tiêu đề/mô tả qua API dịch, lưu cache `listing_translations` |

Mọi function validate đầu vào bằng Zod schema từ `packages/shared`, trả lỗi dạng `{code, message}` thống nhất, có Sentry.

**Realtime**

- Bật Realtime (Postgres Changes) cho `messages`, `group_members`, `groups` (chỉ cột status/seats), `notifications`.
- Client subscribe theo bộ lọc `conversation_id=eq.{id}`; khi rời màn hình thì unsubscribe để tiết kiệm kết nối.
- Presence (đang online, đang gõ) dùng kênh Broadcast, không ghi DB.
- Giới hạn: 1 kết nối/thiết bị, tối đa 5 kênh đồng thời.

**Storage**

| Bucket | Public | Quy tắc |
| --- | --- | --- |
| `listing-images` | đọc công khai, ghi theo RLS | Đường dẫn `{user_id}/{listing_id}/{n}.webp`, tối đa 2 MB/ảnh |
| `avatars` | đọc công khai | `{user_id}.webp`, 512px |
| `verification` | riêng tư | Ảnh thẻ nhân viên, chỉ moderator đọc, xoá sau 30 ngày |
| `chat-images` | riêng tư, signed URL 1 giờ | `{conversation_id}/{message_id}.webp` |

Dùng Image Transformation: `?width=400&quality=75` cho thumbnail, `?width=1280` cho xem chi tiết.

**Thông báo**

- Nguồn sự thật là bảng `notifications`; tab Thông báo trong app đọc từ đây, push chỉ là kênh nhắc.
- Loại thông báo và deep link: `new_message` → chat; `join_request`, `join_accepted` → group; `listing_approved`, `listing_rejected`, `listing_expiring` → listing; `lost_found_match` → listing; `group_reminder` → group.
- Người dùng tắt/bật từng loại trong Cài đặt (cột `notification_prefs jsonb` trong `profiles`).
- Gộp: nhiều tin nhắn trong 1 phút từ cùng một người chỉ gửi 1 push.

**Tìm kiếm và gợi ý**

- MVP: `search_listings()` (mục 5.6) kết hợp full-text + trigram + PostGIS; gợi ý từ khoá từ bảng `search_logs` (top 20 từ khoá tuần).
- Trang chủ gợi ý theo: cùng khu liên hợp, mới đăng, danh mục người dùng hay xem (đếm từ `listing_views`).
- Khi vượt 500.000 tin hoặc cần tìm tức thì khi gõ: thêm Meilisearch đồng bộ qua DB webhook.

**Bản đồ và vị trí**

- Goong Maps: autocomplete địa chỉ, geocode, hiển thị tile; key giới hạn theo bundle id.
- Vị trí người dùng xin khi cần (lúc đăng tin, lúc lọc gần tôi), không theo dõi nền.
- Khoảng cách hiển thị tính từ `sites.location` của khu liên hợp người dùng nếu họ không bật vị trí.

**Môi trường và triển khai**

| Môi trường | Supabase project | App |
| --- | --- | --- |
| local | Supabase CLI (Docker) | Expo Go / dev build |
| staging | project `hoaphat-staging` | EAS build internal, kênh update `staging` |
| production | project `hoaphat-prod` | Store + EAS Update kênh `production` |

Migration qua `supabase db diff` → file trong `supabase/migrations/`, chạy bằng GitHub Actions khi merge vào `main`; type TypeScript sinh bằng `supabase gen types` commit vào `packages/db`.

## 11. Kiểm duyệt, an toàn và bảo mật dữ liệu

Vì app gắn với cộng đồng người lao động và là sản phẩm cá nhân, mỗi vụ lừa đảo hay tin xấu đều ảnh hưởng thương hiệu; kiểm duyệt là tính năng lõi, không phải việc làm sau. Cách tiếp cận: rule tự động chặn phần lớn, moderator xử lý phần còn lại, mọi hành động có audit log.

**Kiểm duyệt tự động (Edge Function `moderate-listing`)**

| Rule | Hành động |
| --- | --- |
| Từ khoá cấm (cờ bạc, vay nặng lãi, đa cấp, hàng cấm) | Từ chối ngay, thông báo lý do |
| Tài khoản dưới 7 ngày hoặc chưa có đánh giá | Tin đầu tiên vào hàng chờ duyệt |
| Giá dưới 30% trung vị danh mục trong 30 ngày | Vào hàng chờ, gắn cờ "giá bất thường" |
| Việc làm có từ "đặt cọc", "phí hồ sơ", "chuyển khoản trước" | Vào hàng chờ, cảnh báo người xem |
| Cùng một người đăng trên 10 tin/ngày | Chặn đăng thêm 24 giờ |
| Ảnh trùng hash với tin bị từ chối trước đó | Từ chối |
| Bị 3 người báo cáo trong 24 giờ | Ẩn tạm, vào hàng chờ |

**Moderator (admin web)**

- Hàng chờ ưu tiên theo điểm rủi ro; mỗi tin xem được ảnh, lịch sử người đăng, số lần bị báo cáo.
- Hành động: duyệt, từ chối (chọn lý do mẫu), sửa danh mục, cảnh cáo, khoá 7/30 ngày, cấm vĩnh viễn.
- Mục tiêu SLA: tin trong hàng chờ được xử lý trong 2 giờ hành chính.
- Mọi hành động ghi `audit_log` kèm `actor_id`, không xoá cứng dữ liệu.

**An toàn người dùng**

- Hướng dẫn giao dịch an toàn hiện trước khi mở chat lần đầu: gặp tại nơi công cộng trong khu, kiểm tra hàng trước khi trả tiền, không đặt cọc.
- Nút Báo cáo và Chặn ở mọi màn hình hồ sơ, tin, chat.
- Người bị chặn không thấy tin, không nhắn được; người chặn không nhận thông báo từ người kia.
- Ẩn số điện thoại cho đến khi bấm Liên hệ; ghi log ai đã xem số của ai.
- Không hiển thị vị trí chính xác nhà trọ/nhà riêng; làm tròn 300 m trên bản đồ công khai.

**Bảo mật dữ liệu nhân viên**

- Tuân thủ Nghị định 13/2023 về bảo vệ dữ liệu cá nhân: có màn hình đồng ý, chính sách bảo mật, quyền xoá tài khoản trong app (xoá mềm 30 ngày rồi xoá cứng).
- Ảnh giấy tờ xác minh chỉ moderator xem, tự xoá 30 ngày sau khi duyệt; DB chỉ giữ kết quả huy hiệu.
- Dữ liệu đặt tại region Singapore (Supabase gần VN nhất); khi chi phí cloud vượt VPS thì chuyển sang tự host Supabase trên VPS.
- Backup Postgres hàng ngày, PITR 7 ngày; kiểm tra khôi phục mỗi quý.
- Secrets trong EAS Secrets và Supabase Vault; không có `.env` trong git.
- Pen-test cơ bản trước khi ra mắt: RLS từng bảng, Storage policy, rate limit OTP (tối đa 5 OTP/số/giờ).
- Admin web bắt buộc đăng nhập 2 lớp (mật khẩu + OTP, hoặc Google có 2FA), log mọi phiên.

## 12. Lộ trình và đội ngũ

MVP ra mắt sau 12 tuần với đội 3 người; mỗi giai đoạn kết thúc bằng một cổng có tiêu chí rõ để không trôi.

&#91;embedded content: lộ trình 12 tuần · 4 giai đoạn, 4 cổng\]

Pass đồ và Tìm việc đi trước vì nhu cầu cao nhất và không cần bản đồ; ba tính năng cần bản đồ và nhóm đi sau khi lõi đã ổn.

Web Next.js đi song song, dùng lại `packages/core` nên chủ yếu là viết giao diện: tuần 3–6 trang tin công khai có SEO (danh sách, chi tiết, tìm kiếm) và đăng nhập; tuần 7–10 đăng tin, chat, ghép nhóm; tuần 11–12 marketing và `/admin`. Mỗi tính năng chỉ coi là xong khi chạy trên cả app và web (trừ phần chỉ có trên app).

**Tiêu chí qua cổng**

| Cổng | Tiêu chí |
| --- | --- |
| Schema + auth chạy | Đăng nhập OTP thật trên thiết bị, RLS pass bộ test, design system có 10 component, CI build xanh |
| Beta 100 người | 100 người quanh Dung Quất dùng 2 tuần, trên 200 tin đăng, crash dưới 1%, 5 buổi phỏng vấn người dùng |
| Ra mắt Dung Quất | Đủ 6 tính năng, moderator đã đào tạo, SLA kiểm duyệt 2 giờ, TTI p75 dưới 1,5 giây |
| Mở rộng khu vực | Lên store, đủ 3 ngôn ngữ, truyền thông qua nhóm Zalo/Facebook công nhân, dashboard chỉ số tuần |

**Đội ngũ tối thiểu**

| Vai trò | Số người | Việc chính |
| --- | --- | --- |
| Product + thiết kế | 1 | User flow, design system trong Figma, phỏng vấn người dùng, kiểm duyệt giai đoạn đầu |
| Mobile (vibe code) | 1–2 | Expo app, dùng AI sinh màn hình từ spec, review code |
| Backend + data | 1 | Schema, RLS, Edge Functions, web Next.js, CI/CD |
| Moderator (bán thời gian) | 1–2 | Cộng tác viên trong cộng đồng, từ giai đoạn beta |

Một người có thể kiêm mobile và backend nếu dùng AI tốt, nhưng phải có người thứ hai review schema và RLS trước khi ra mắt.

**Sau MVP (tháng 4–6)**

- Thanh toán/giữ tiền qua ví (MoMo, ZaloPay) cho pass đồ giá trị cao, nếu có nhu cầu.
- Mini-app thêm: đặt cơm ca, lịch xe đưa đón, thông báo công đoàn, hỏi đáp nội bộ.
- Mở rộng ra các khu liên hợp khác bằng cách thêm dòng vào bảng `sites`.
- Meilisearch, CDN riêng, tách Edge Function nặng ra service riêng khi vượt 50.000 người dùng.

## 13. Quy ước vibe code

Tài liệu này là context cho AI: đặt bản Markdown của nó vào `docs/ARCHITECTURE.md` và tóm tắt các quy tắc dưới đây vào `CLAUDE.md` ở gốc repo, cộng 3 file CLAUDE.md riêng cho apps/mobile, apps/web và supabase (Cursor dùng `.cursor/rules`). AI đọc được kiến trúc, schema và quy ước thì sinh code nhất quán; không có thì mỗi phiên lại tự chọn một kiểu.

**Thứ tự xây bằng AI**

1. Khởi tạo monorepo và Supabase local; chạy được `pnpm dev` và `supabase start`.
2. Viết toàn bộ migration schema (mục 5) và RLS (mục 6) trước, kèm seed 50 tin mẫu mỗi danh mục. Sinh type: `supabase gen types typescript`.
3. Xây design system `src/ui` từ bảng token (mục 8): Button, Text, Card, Input, Chip, Sheet, Skeleton, EmptyState, ListingCard, GroupCard. Mỗi component có file story/ví dụ.
4. Auth flow: phone → OTP → verify → tabs.
5. Feature Listing dùng chung → cấu hình Pass đồ → Tìm việc.
6. Chat 1-1, thông báo.
7. Feature Group dùng chung → Ghép xe → Ghép trận (bản đồ vào ở bước này).
8. Tìm trọ (bản đồ + filter), Thất lạc.
9. Web Next.js (trang tin công khai + SEO, đăng tin, chat, ghép nhóm) và /admin: hàng chờ kiểm duyệt, báo cáo, người dùng.
10. EAS build, Sentry, PostHog, store listing.

**Mẫu prompt cho một màn hình**

```
Đọc docs/ARCHITECTURE.md mục 5.2, 7.2 và 8.
Tạo màn hình app/listing/new/[category].tsx cho category = room_rent.
- Form bằng React Hook Form + schema roomRentSchema trong packages/shared.
- Ảnh: dùng hook useImageUpload trong src/core/upload, tối thiểu 3 ảnh.
- Vị trí: dùng LocationPicker trong src/ui, mặc định site của profile.
- Submit gọi useCreateListing; thành công thì router.replace sang listing/[id].
- Có đủ trạng thái loading/error; dùng component trong src/ui, không tạo style mới.
Không sửa file ngoài thư mục được nêu.
```

**Quy ước code (đưa vào CLAUDE.md)**

- TypeScript strict, không `any`; type DB lấy từ `packages/db/database.types.ts`.
- Gọi Supabase chỉ trong `features/*/api.ts`; màn hình không import `supabase` trực tiếp.
- Query key qua factory trong `src/core/query/keys.ts`; mutation phải `invalidateQueries` đúng key.
- Component UI chỉ từ `src/ui`; màu, spacing chỉ từ `tokens.ts`; không hard-code hex.
- Mỗi màn hình bắt buộc có 3 trạng thái: loading, empty, error.
- Tên file: component `PascalCase.tsx`, hook `useXxx.ts`, route theo Expo Router.
- Commit theo Conventional Commits: `feat(pass): form đăng xe`, `fix(chat): trùng tin nhắn`.
- Mọi migration đi kèm RLS policy và một test SQL trong `supabase/tests/`.
- Không commit secret; biến môi trường khai báo trong `.env.example`.
- Mọi chữ hiển thị qua `t('key')` của i18next, đủ 3 ngôn ngữ vi/en/zh trong `packages/shared/i18n`; CI chặn khi thiếu key.

**Checklist trước khi merge một tính năng**

- [ ] Chạy được trên Android tầm trung và iOS, không warning đỏ
- [ ] RLS đã test với tài khoản thường, moderator, tài khoản bị cấm
- [ ] Có skeleton khi tải, màn hình trống có CTA, lỗi có nút thử lại
- [ ] Ảnh được nén trước khi upload, thumbnail dùng transform
- [ ] Deep link từ push mở đúng màn hình
- [ ] Sự kiện analytics chính đã gắn (xem tin, liên hệ, đăng tin, tham gia nhóm)
- [ ] Đã cập nhật `docs/ARCHITECTURE.md` nếu đổi schema hoặc luồng

**Rủi ro và cách giảm**

| Rủi ro | Giảm thiểu |
| --- | --- |
| AI sinh code lệch kiến trúc qua nhiều phiên | CLAUDE.md + review mỗi PR theo checklist; refactor nhỏ mỗi tuần |
| Lừa đảo làm mất uy tín app | Huy hiệu xác minh, rule kiểm duyệt, hướng dẫn an toàn, phản hồi báo cáo trong 2 giờ |
| Ít người dùng ban đầu (marketplace trống) | Tự seed tin, mời chủ trọ/chủ sân đăng sớm, ra mắt từng khu, ưu đãi người đăng sớm |
| Phụ thuộc Supabase | Toàn bộ là Postgres chuẩn + Deno, self-host được; backup hàng ngày |
| OTP tốn chi phí / bị spam | Rate limit, ZNS giá rẻ, giữ phiên đăng nhập dài |
| Mạng yếu trong nhà máy | Cache MMKV, bản nháp offline, ảnh nhẹ |
