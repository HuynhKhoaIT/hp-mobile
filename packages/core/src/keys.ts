// Query key TanStack Query — nguồn duy nhất cho app và web. Mutation invalidate đúng các key này.
// Key cha (vd keys.listings()) dùng cho invalidate cả nhánh: qc.invalidateQueries({ queryKey: keys.listings() }).
type Filters = Record<string, unknown> | undefined;

export const keys = {
  all: ['hp'] as const,

  profile: (id: string) => ['hp', 'profile', id] as const,
  /** Hồ sơ của chính mình; truyền userId để đổi tài khoản không dùng nhầm cache. */
  me: (userId?: string) => (userId ? (['hp', 'me', userId] as const) : (['hp', 'me'] as const)),
  sites: () => ['hp', 'sites'] as const,
  banners: (placement: string, locale: string) => ['hp', 'banners', placement, locale] as const,
  myListingStats: () => ['hp', 'my-listings', 'stats'] as const,
  publicStats: () => ['hp', 'public-stats'] as const,

  listings: (filters?: Filters) => (filters ? (['hp', 'listings', filters] as const) : (['hp', 'listings'] as const)),
  listing: (id: string) => ['hp', 'listing', id] as const,
  listingBySlug: (slug: string) => ['hp', 'listing', 'slug', slug] as const,
  similarListings: (id: string) => ['hp', 'listing', id, 'similar'] as const,
  myListings: (tab?: string) => (tab ? (['hp', 'my-listings', tab] as const) : (['hp', 'my-listings'] as const)),
  myListing: (id: string) => ['hp', 'my-listing', id] as const,
  savedListings: () => ['hp', 'bookmarks', 'listing', 'items'] as const,

  groups: (kind?: string, filters?: Filters) =>
    kind ? (['hp', 'groups', kind, filters ?? {}] as const) : (['hp', 'groups'] as const),
  group: (id: string) => ['hp', 'group', id] as const,
  myGroups: () => ['hp', 'my-groups'] as const,

  conversations: () => ['hp', 'conversations'] as const,
  messages: (conversationId: string) => ['hp', 'messages', conversationId] as const,

  notifications: () => ['hp', 'notifications'] as const,
  unreadCount: () => ['hp', 'notifications', 'unread'] as const,
  bookmarks: (targetType?: 'listing' | 'group') =>
    targetType ? (['hp', 'bookmarks', targetType] as const) : (['hp', 'bookmarks'] as const),
  blocks: () => ['hp', 'blocks'] as const,
} as const;
