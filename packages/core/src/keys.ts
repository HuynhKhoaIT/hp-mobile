// Query key TanStack Query — nguồn duy nhất cho app và web. Mutation invalidate đúng các key này.
// Key cha (vd keys.listings()) dùng cho invalidate cả nhánh: qc.invalidateQueries({ queryKey: keys.listings() }).
type Filters = Record<string, unknown> | undefined;

export const keys = {
  all: ['hp'] as const,

  profile: (id: string) => ['hp', 'profile', id] as const,
  ownerListings: (ownerId: string) => ['hp', 'listings', 'owner', ownerId] as const,
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
  homeFeed: (site?: string | null) => ['hp', 'listings', 'home-feed', site ?? ''] as const,
  lostFoundMatches: (listingId: string) => ['hp', 'listing', listingId, 'lost-found-matches'] as const,
  /** Người đã nhắn tin về tin (chọn người để cảm ơn / đánh giá) — con của keys.listing(id). */
  listingCounterparts: (listingId: string) => ['hp', 'listing', listingId, 'counterparts'] as const,
  translation: (listingId: string, lang: string) => ['hp', 'listing', listingId, 'translation', lang] as const,
  myBadgeRequests: () => ['hp', 'badge-requests', 'mine'] as const,

  groups: (kind?: string, filters?: Filters) =>
    kind ? (['hp', 'groups', kind, filters ?? {}] as const) : (['hp', 'groups'] as const),
  group: (id: string) => ['hp', 'group', id] as const,
  groupBySlug: (slug: string) => ['hp', 'group', 'slug', slug] as const,
  /** Con của keys.group(id): invalidate keys.group(id) làm mới cả thành viên + trạng thái của mình. */
  groupMembers: (id: string) => ['hp', 'group', id, 'members'] as const,
  groupMembership: (id: string, userId: string) => ['hp', 'group', id, 'membership', userId] as const,
  /** tab: 'upcoming' | 'past'; không truyền = cả nhánh (invalidate). */
  myGroups: (tab?: string) => (tab ? (['hp', 'my-groups', tab] as const) : (['hp', 'my-groups'] as const)),
  venues: (filters?: Filters) => (filters ? (['hp', 'venues', filters] as const) : (['hp', 'venues'] as const)),
  myVenues: () => ['hp', 'venues', 'mine'] as const,

  conversations: () => ['hp', 'conversations'] as const,
  conversation: (id: string) => ['hp', 'conversations', id] as const,
  groupConversation: (groupId: string, userId: string) => ['hp', 'conversations', 'group', groupId, userId] as const,
  conversationMembers: (id: string) => ['hp', 'conversations', id, 'members'] as const,
  unreadConversations: () => ['hp', 'conversations', 'unread'] as const,
  messages: (conversationId: string) => ['hp', 'messages', conversationId] as const,
  chatImages: (conversationId: string, paths: readonly string[]) => ['hp', 'messages', conversationId, 'images', paths] as const,

  notifications: () => ['hp', 'notifications'] as const,
  unreadCount: () => ['hp', 'notifications', 'unread'] as const,
  bookmarks: (targetType?: 'listing' | 'group') =>
    targetType ? (['hp', 'bookmarks', targetType] as const) : (['hp', 'bookmarks'] as const),
  blocks: () => ['hp', 'blocks'] as const,

  // Quản trị (web /admin đọc ở server; key để client tương tác / app staff sau này dùng chung). Key cha keys.admin()
  // invalidate cả nhánh sau mỗi hành động staff.
  admin: () => ['hp', 'admin'] as const,
  adminStats: () => ['hp', 'admin', 'stats'] as const,
  adminReports: (filters?: Filters) => ['hp', 'admin', 'reports', filters ?? {}] as const,
  adminBadgeRequests: (filters?: Filters) => ['hp', 'admin', 'badge-requests', filters ?? {}] as const,
  adminUsers: (filters?: Filters) => ['hp', 'admin', 'users', filters ?? {}] as const,
  adminUser: (id: string) => ['hp', 'admin', 'user', id] as const,
  adminListings: (filters?: Filters) => ['hp', 'admin', 'listings', filters ?? {}] as const,
  adminGroups: (filters?: Filters) => ['hp', 'admin', 'groups', filters ?? {}] as const,
  adminSites: () => ['hp', 'admin', 'sites'] as const,
  adminVenues: (filters?: Filters) => ['hp', 'admin', 'venues', filters ?? {}] as const,
  adminKeywords: (filters?: Filters) => ['hp', 'admin', 'keywords', filters ?? {}] as const,
  adminBanners: (filters?: Filters) => ['hp', 'admin', 'banners', filters ?? {}] as const,
  adminLeads: (filters?: Filters) => ['hp', 'admin', 'leads', filters ?? {}] as const,
  adminAudit: (filters?: Filters) => ['hp', 'admin', 'audit', filters ?? {}] as const,
} as const;
