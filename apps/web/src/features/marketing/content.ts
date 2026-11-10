// Nội dung MDX: pháp lý content/legal/{vi,en,zh}/<slug>.mdx, blog content/blog/{vi,en,zh}/<slug>.mdx.
// Dùng `export const metadata` trong MDX (thay frontmatter: @next/mdx không đọc frontmatter, không thêm plugin).
// Thiếu bản dịch → bản vi + cờ `fallback` (trang hiện web.content.not_translated, không 404).
// Thêm bài blog = thêm file + một dòng ở BLOG_POSTS (import tĩnh: bundler chỉ biên dịch đúng các file này).
import 'server-only';
import type { Locale } from '@hp/shared';
import type { MDXContent } from 'mdx/types';

export type LegalMeta = { title: string; description: string; updated: string };
export type BlogMeta = {
  title: string;
  description: string;
  date: string;
  locale: Locale;
  cover: string | null;
  tags: string[];
  status: 'draft' | 'published';
};

type Mdx<M> = { default: MDXContent; metadata: M };
type Loaders = Partial<Record<Locale, () => Promise<unknown>>> & { vi: () => Promise<unknown> };

export const LEGAL_SLUGS = ['dieu-khoan', 'chinh-sach-bao-mat', 'xoa-tai-khoan', 'lien-he'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const LEGAL_DOCS: Record<LegalSlug, Loaders> = {
  'dieu-khoan': {
    vi: () => import('../../../content/legal/vi/dieu-khoan.mdx'),
    en: () => import('../../../content/legal/en/dieu-khoan.mdx'),
    zh: () => import('../../../content/legal/zh/dieu-khoan.mdx'),
  },
  'chinh-sach-bao-mat': {
    vi: () => import('../../../content/legal/vi/chinh-sach-bao-mat.mdx'),
    en: () => import('../../../content/legal/en/chinh-sach-bao-mat.mdx'),
    zh: () => import('../../../content/legal/zh/chinh-sach-bao-mat.mdx'),
  },
  'xoa-tai-khoan': {
    vi: () => import('../../../content/legal/vi/xoa-tai-khoan.mdx'),
    en: () => import('../../../content/legal/en/xoa-tai-khoan.mdx'),
    zh: () => import('../../../content/legal/zh/xoa-tai-khoan.mdx'),
  },
  'lien-he': {
    vi: () => import('../../../content/legal/vi/lien-he.mdx'),
    en: () => import('../../../content/legal/en/lien-he.mdx'),
    zh: () => import('../../../content/legal/zh/lien-he.mdx'),
  },
};

const BLOG_POSTS: Record<string, Loaders> = {
  'giao-dich-an-toan': { vi: () => import('../../../content/blog/vi/giao-dich-an-toan.mdx') },
};

async function load<M>(loaders: Loaders, locale: Locale) {
  const loader = loaders[locale];
  const mod = (await (loader ?? loaders.vi)()) as Mdx<M>;
  return { Content: mod.default, meta: mod.metadata, fallback: !loader };
}

export const loadLegal = (slug: LegalSlug, locale: Locale) => load<LegalMeta>(LEGAL_DOCS[slug], locale);

/** Bài đã đăng; không có / bản nháp → null. */
export async function loadBlogPost(slug: string, locale: Locale) {
  const loaders = Object.hasOwn(BLOG_POSTS, slug) ? BLOG_POSTS[slug] : undefined;
  if (!loaders) return null;
  const post = await load<BlogMeta>(loaders, locale);
  return post.meta.status === 'published' ? post : null;
}

/** Bài đã đăng, mới trước. */
export async function listBlogPosts(locale: Locale) {
  const posts = await Promise.all(
    Object.keys(BLOG_POSTS).map(async (slug) => {
      const post = await loadBlogPost(slug, locale);
      return post ? { slug, meta: post.meta, fallback: post.fallback } : null;
    }),
  );
  return posts
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}

export const blogSlugs = () => Object.keys(BLOG_POSTS);
