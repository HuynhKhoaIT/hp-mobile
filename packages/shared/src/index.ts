// @hp/shared — Zod schemas, enums, constants, i18n vi/en/zh, format tiền/ngày, slug.
// Không import React, React Native, Expo, Next hay Supabase.
// Luật: .claude/rules/be-shared-packages.md · Kế hoạch: docs/plan/backend.md.
export const LOCALES = ['vi', 'en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';

export * from './constants';
export * from './enums';
export * from './format';
export * from './slug';
