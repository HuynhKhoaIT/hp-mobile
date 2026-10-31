// https://docs.expo.dev/guides/using-eslint/
// Luật import: apps/mobile/CLAUDE.md mục 4–5, .claude/rules/mobile-ui.md, mobile-routes.md.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const RN_BANNED = {
  name: 'react-native',
  importNames: ['Text', 'Image', 'FlatList', 'SectionList', 'Animated'],
  message: 'Dùng @/ui (Text), expo-image, @shopify/flash-list, Reanimated / Moti.',
};

const ROUTE_BANNED = [
  { name: '@/core/supabase', message: 'app/ không import supabase — dùng hook của @hp/core hoặc features/*.' },
  { name: '@supabase/supabase-js', message: 'app/ không import supabase — dùng hook của @hp/core hoặc features/*.' },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RN_BANNED] }],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RN_BANNED, ...ROUTE_BANNED] }],
    },
  },
  {
    // Nơi duy nhất được bọc Text gốc.
    files: ['src/ui/Text.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
