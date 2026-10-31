import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Luật import: apps/web/CLAUDE.md mục 5, .claude/rules/web-admin.md, web-routing-rsc.md.
const NAVIGATION = [
  { name: "next/link", message: "Dùng Link từ @/i18n/navigation (giữ locale)." },
  {
    name: "next/navigation",
    importNames: ["redirect", "permanentRedirect", "useRouter", "usePathname"],
    message: "Dùng bản có locale từ @/i18n/navigation.",
  },
];
const ADMIN_ONLY = {
  group: ["@/features/admin/*", "@/components/admin/*", "@/lib/supabase/admin"],
  message: "Code admin chỉ được import trong app/[locale]/admin/** (tránh lọt vào bundle công khai).",
};
const NO_SUPABASE_IN_ROUTES = {
  group: ["@supabase/*", "@/lib/supabase/*"],
  message: "app/ không gọi Supabase trực tiếp — đọc qua features/*/queries.ts, ghi qua features/*/actions.ts.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: NAVIGATION, patterns: [ADMIN_ONLY] }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: NAVIGATION, patterns: [ADMIN_ONLY, NO_SUPABASE_IN_ROUTES] }],
    },
  },
  {
    // Route admin: được dùng code admin, vẫn không gọi Supabase trực tiếp trong route.
    files: ["app/[[]locale]/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: NAVIGATION, patterns: [NO_SUPABASE_IN_ROUTES] }],
    },
  },
  {
    // Code admin (queries, actions, components) được dùng client service role.
    files: ["src/features/admin/**/*.{ts,tsx}", "src/components/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: NAVIGATION }],
    },
  },
  {
    // Nơi định nghĩa navigation có locale và hạ tầng Supabase.
    files: ["src/i18n/**/*.ts", "src/lib/supabase/**/*.ts", "proxy.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
