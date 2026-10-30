// @hp/shared — Zod schemas, enums, constants, i18n vi/en/zh, format tiền/ngày, slug.
// Không import React, React Native, Expo, Next hay Supabase.
// Luật: .claude/rules/be-shared-packages.md · Kế hoạch: docs/plan/backend.md tuần 1.
export const LOCALES = ['vi', 'en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';

// Tên hiển thị (store, tiêu đề trang, push). Định danh kỹ thuật (slug, bundle id, domain, scheme) chưa chốt — xem docs/PLAN.md mục 2.
export const APP_NAME = 'Người Dung Quất';
export const APP_DISCLAIMER_KEY = 'common.disclaimer'; // "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát"
