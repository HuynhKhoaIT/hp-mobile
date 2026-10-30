# Bối cảnh monorepo

- Một repo cho cả sản phẩm: `apps/mobile` (Expo iOS / Android), `apps/web` (Next.js: marketing, người dùng, `/admin`), `supabase/` (Postgres, Auth, Storage, Realtime, Edge Functions), `packages/` (`core`, `shared`, `db`, `tokens` dùng chung), `docs/` (kiến trúc + kế hoạch). pnpm workspace + Turborepo.
- Luật theo khu vực nằm trong `CLAUDE.md` của khu đó: `apps/mobile/CLAUDE.md`, `apps/web/CLAUDE.md`, `supabase/CLAUDE.md` (file này cũng quản `packages/`). `CLAUDE.md` gốc chỉ tóm tắt. Kiến trúc đầy đủ: `docs/ARCHITECTURE.md`. Kế hoạch: `docs/PLAN.md` (tổng) và `docs/plan/{mobile,web,backend}.md`.
- Thứ tự ưu tiên khi mâu thuẫn: `CLAUDE.md` của khu vực > `.claude/rules/*` > `CLAUDE.md` gốc > `docs/ARCHITECTURE.md`.
- Rule có tiền tố `mobile-`, `web-`, `be-` và chỉ nạp khi chạm vào đúng thư mục; đường dẫn trong thân rule viết tương đối so với app đó (`app/`, `src/` nghĩa là `apps/mobile/app`, `apps/web/src`…).
- Tên hàm / hook / helper nêu trong rule (`requireAuth`, `handler`, `writeAudit`, `imageUrl`, `keys`…) là **quy ước đã chốt**; chưa tồn tại thì tạo đúng tên và vị trí đó, không đặt tên khác.
- `packages/*` là nguồn sự thật dùng chung: thiếu hàm dữ liệu → thêm vào `packages/core`; thiếu schema / enum / chữ → `packages/shared`; type DB chỉ sinh từ migration vào `packages/db`; token chỉ ở `packages/tokens`. Không copy logic vào app. Đổi gói → `/shared-package-change`.
- Một tính năng chỉ "xong" khi chạy trên cả app và web (trừ `capabilities.appOnly`) và backend đã có RLS + test.
- Tiếng Việt cho tài liệu / trả lời; code, commit tiếng Anh, Conventional Commits với scope theo khu: `feat(pass): …`, `feat(web-room): …`, `feat(admin-moderation): …`, `feat(db): …`, `feat(fn-join-group): …`, `feat(core): …`.
- Lệnh gốc: `pnpm i18n:check`, `pnpm -r build`, `pnpm --filter mobile <script>`, `pnpm --filter web <script>`, `supabase start | db reset | test db`. Không deploy (`eas submit`, `vercel --prod`, `supabase db push / functions deploy / secrets set` lên staging / prod) khi chưa được yêu cầu bằng tên môi trường.
- Thêm thư viện mới ở bất kỳ app nào → hỏi trước, nêu lý do và dung lượng.
- Skill: mobile `/new-screen`, `/new-ui-component`, `/configure-feature`, `/optimistic-mutation`, `/mobile-done-check`; web `/new-page`, `/server-action`, `/admin-screen`, `/seo-check`, `/web-done-check`; backend `/new-migration`, `/rls-policy`, `/new-edge-function`, `/new-rpc`, `/shared-package-change`, `/be-done-check`; chung `/add-i18n-key`.
