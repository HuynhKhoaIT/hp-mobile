
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": string
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"meta": NonNullable<Json>,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"badge_requests": {
                  Row: {
                    "badge": string,"created_at": string,"document_path": string,"id": string,"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge": string,"created_at"?: string,"document_path": string,"id"?: string,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge"?: string,"created_at"?: string,"document_path"?: string,"id"?: string,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "badge_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "badge_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "badge_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "badge_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"banned_keywords": {
                  Row: {
                    "action": string,"categories": (Database["public"]['Enums']["listing_category"])[] | null,"created_at": string,"created_by": string | null,"id": string,"keyword": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action"?: string,"categories"?: (Database["public"]['Enums']["listing_category"])[] | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"keyword": string,"updated_at"?: string
                  }
                  Update: {
                    "action"?: string,"categories"?: (Database["public"]['Enums']["listing_category"])[] | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"keyword"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "banned_keywords_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "banned_keywords_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id"?: string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookmarks": {
                  Row: {
                    "created_at": string,"target_id": string,"target_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"target_id": string,"target_type": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"target_id"?: string,"target_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_translations": {
                  Row: {
                    "created_at": string,"description": string | null,"lang": string,"listing_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"lang": string,"listing_id": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"lang"?: string,"listing_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_translations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_translations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "public_listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_views": {
                  Row: {
                    "listing_id": string,"user_id": string,"viewed_at": string,"viewed_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "listing_id": string,"user_id": string,"viewed_at"?: string,"viewed_on"?: string
                  }
                  Update: {
                    "listing_id"?: string,"user_id"?: string,"viewed_at"?: string,"viewed_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_views_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_views_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "public_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_views_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_views_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "address_text": string | null,"attributes": NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at": string,"deleted_at": string | null,"description": string | null,"expires_at": string | null,"id": string,"images": (string)[],"lang": string,"location": unknown,"moderation_reasons": (string)[],"owner_id": string,"price": number | null,"price_type": string,"search_vector": unknown,"short_id": string,"site": string | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string,"view_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text"?: string | null,"attributes"?: NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"expires_at"?: string | null,"id"?: string,"images"?: (string)[],"lang"?: string,"location"?: unknown,"moderation_reasons"?: (string)[],"owner_id"?: string,"price"?: number | null,"price_type"?: string,"search_vector"?: never,"short_id"?: string,"site"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"updated_at"?: string,"view_count"?: number
                  }
                  Update: {
                    "address_text"?: string | null,"attributes"?: NonNullable<Json>,"category"?: Database["public"]['Enums']["listing_category"],"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"expires_at"?: string | null,"id"?: string,"images"?: (string)[],"lang"?: string,"location"?: unknown,"moderation_reasons"?: (string)[],"owner_id"?: string,"price"?: number | null,"price_type"?: string,"search_vector"?: never,"short_id"?: string,"site"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string,"view_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                },"moderation_queue": {
                  Row: {
                    "created_at": string,"id": string,"listing_id": string,"note": string | null,"reasons": (string)[],"reviewed_at": string | null,"reviewed_by": string | null,"risk_score": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_id": string,"note"?: string | null,"reasons": (string)[],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"risk_score"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_id"?: string,"note"?: string | null,"reasons"?: (string)[],"reviewed_at"?: string | null,"reviewed_by"?: string | null,"risk_score"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_queue_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_queue_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "public_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_queue_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_queue_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body_key": string | null,"created_at": string,"data": NonNullable<Json>,"id": string,"params": NonNullable<Json>,"read_at": string | null,"title_key": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_key"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"params"?: NonNullable<Json>,"read_at"?: string | null,"title_key": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body_key"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"params"?: NonNullable<Json>,"read_at"?: string | null,"title_key"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"badges": (string)[],"banned_until": string | null,"consent_at": string | null,"consent_version": string | null,"created_at": string,"deleted_at": string | null,"department": string | null,"full_name": string,"home_location": unknown,"id": string,"interests": (string)[],"is_banned": boolean,"locale": string,"notification_prefs": NonNullable<Json>,"phone": string | null,"push_tokens": (string)[],"rating_avg": number,"rating_count": number,"reputation_score": number,"role": string,"site": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"badges"?: (string)[],"banned_until"?: string | null,"consent_at"?: string | null,"consent_version"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"department"?: string | null,"full_name"?: string,"home_location"?: unknown,"id": string,"interests"?: (string)[],"is_banned"?: boolean,"locale"?: string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"push_tokens"?: (string)[],"rating_avg"?: number,"rating_count"?: number,"reputation_score"?: number,"role"?: string,"site"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"badges"?: (string)[],"banned_until"?: string | null,"consent_at"?: string | null,"consent_version"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"department"?: string | null,"full_name"?: string,"home_location"?: unknown,"id"?: string,"interests"?: (string)[],"is_banned"?: boolean,"locale"?: string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"push_tokens"?: (string)[],"rating_avg"?: number,"rating_count"?: number,"reputation_score"?: number,"role"?: string,"site"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "action": string,"count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "action"?: string,"count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ratings": {
                  Row: {
                    "comment": string | null,"context_id": string,"context_type": string,"created_at": string,"id": string,"ratee_id": string,"rater_id": string,"score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"context_id": string,"context_type": string,"created_at"?: string,"id"?: string,"ratee_id": string,"rater_id": string,"score": number
                  }
                  Update: {
                    "comment"?: string | null,"context_id"?: string,"context_type"?: string,"created_at"?: string,"id"?: string,"ratee_id"?: string,"rater_id"?: string,"score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_ratee_id_fkey"
      columns: ["ratee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_ratee_id_fkey"
      columns: ["ratee_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_rater_id_fkey"
      columns: ["rater_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_rater_id_fkey"
      columns: ["rater_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"search_logs": {
                  Row: {
                    "category": Database["public"]['Enums']["listing_category"] | null,"created_at": string,"id": number,"query": string,"results_count": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["listing_category"] | null,"created_at"?: string,"id"?: never,"query": string,"results_count"?: number,"user_id"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["listing_category"] | null,"created_at"?: string,"id"?: never,"query"?: string,"results_count"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "search_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "code": string,"created_at": string,"is_active": boolean,"location": unknown,"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"is_active"?: boolean,"location": unknown,"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"is_active"?: boolean,"location"?: unknown,"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "public_listings": {
                  Row: {
                    "address_text": string | null,"attributes": NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at": string,"description": string | null,"distance_to_site_m": number | null,"expires_at": string | null,"id": string,"images": (string)[],"inactive_since": string | null,"is_expired": boolean | null,"lang": string,"lat": number | null,"lng": number | null,"owner_avatar_url": string | null,"owner_badges": (string)[],"owner_id": string,"owner_name": string | null,"owner_rating_avg": number,"owner_rating_count": number,"owner_since": string,"price": number | null,"price_type": string,"search_vector": unknown,"short_id": string,"site": string | null,"site_name": string | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string,"view_count": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                },"public_profiles": {
                  Row: {
                    "avatar_url": string | null,"badges": (string)[],"created_at": string,"display_name": string | null,"id": string,"rating_avg": number,"rating_count": number,"reputation_score": number,"site": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "avatar_url"?: string | null,"badges"?: (string)[] | null,"created_at"?: string | null,"display_name"?: never,"id"?: string | null,"rating_avg"?: number | null,"rating_count"?: number | null,"reputation_score"?: number | null,"site"?: string | null
                         }
                        Update: {
                           "avatar_url"?: string | null,"badges"?: (string)[] | null,"created_at"?: string | null,"display_name"?: never,"id"?: string | null,"rating_avg"?: number | null,"rating_count"?: number | null,"reputation_score"?: number | null,"site"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "profiles_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                }
          }
          Functions: {
            "app_setting":
{ Args: { "p_key": string }; Returns: string
                           },
"assert_rate_limit":
{ Args: { "p_action": string,"p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"f_unaccent":
{ Args: { "p_text": string }; Returns: string
                           },
"gen_short_id":
{ Args: { "p_length"?: number }; Returns: string
                           },
"get_listing_by_slug":
{ Args: { "p_slug": string }; Returns: {
              "address_text": string | null,
"attributes": NonNullable<Json>,
"category": Database["public"]['Enums']["listing_category"],
"created_at": string,
"description": string | null,
"distance_to_site_m": number | null,
"expires_at": string | null,
"id": string,
"images": (string)[],
"inactive_since": string | null,
"is_expired": boolean | null,
"lang": string,
"lat": number | null,
"lng": number | null,
"owner_avatar_url": string | null,
"owner_badges": (string)[],
"owner_id": string,
"owner_name": string | null,
"owner_rating_avg": number,
"owner_rating_count": number,
"owner_since": string,
"price": number | null,
"price_type": string,
"search_vector": unknown,
"short_id": string,
"site": string | null,
"site_name": string | null,
"slug": string,
"status": Database["public"]['Enums']["listing_status"],
"title": string,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_banned":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_blocked":
{ Args: { "p_a": string,"p_b": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"listing_default_ttl":
{ Args: { "p_category": Database["public"]['Enums']["listing_category"] }; Returns: string
                           },
"log_search":
{ Args: { "p_category"?: Database["public"]['Enums']["listing_category"],"p_query": string,"p_results"?: number }; Returns: undefined
                           },
"public_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "listings": number,"sites": number,"users": number
            }[]
                           },
"record_listing_view":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"renew_listing":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"reveal_contact":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"review_listing":
{ Args: { "p_approve": boolean,"p_listing_id": string,"p_note"?: string }; Returns: undefined
                           },
"search_listings":
{ Args: { "p_attributes"?: Json,"p_categories"?: (Database["public"]['Enums']["listing_category"])[],"p_cursor"?: string,"p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_price_max"?: number,"p_price_min"?: number,"p_query"?: string,"p_radius_m"?: number,"p_site"?: string }; Returns: {
              "address_text": string | null,
"attributes": NonNullable<Json>,
"category": Database["public"]['Enums']["listing_category"],
"created_at": string,
"description": string | null,
"distance_to_site_m": number | null,
"expires_at": string | null,
"id": string,
"images": (string)[],
"inactive_since": string | null,
"is_expired": boolean | null,
"lang": string,
"lat": number | null,
"lng": number | null,
"owner_avatar_url": string | null,
"owner_badges": (string)[],
"owner_id": string,
"owner_name": string | null,
"owner_rating_avg": number,
"owner_rating_count": number,
"owner_since": string,
"price": number | null,
"price_type": string,
"search_vector": unknown,
"short_id": string,
"site": string | null,
"site_name": string | null,
"slug": string,
"status": Database["public"]['Enums']["listing_status"],
"title": string,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"short_name":
{ Args: { "p_full_name": string }; Returns: string
                           },
"similar_listings":
{ Args: { "p_limit"?: number,"p_listing_id": string }; Returns: {
              "address_text": string | null,
"attributes": NonNullable<Json>,
"category": Database["public"]['Enums']["listing_category"],
"created_at": string,
"description": string | null,
"distance_to_site_m": number | null,
"expires_at": string | null,
"id": string,
"images": (string)[],
"inactive_since": string | null,
"is_expired": boolean | null,
"lang": string,
"lat": number | null,
"lng": number | null,
"owner_avatar_url": string | null,
"owner_badges": (string)[],
"owner_id": string,
"owner_name": string | null,
"owner_rating_avg": number,
"owner_rating_count": number,
"owner_since": string,
"price": number | null,
"price_type": string,
"search_vector": unknown,
"short_id": string,
"site": string | null,
"site_name": string | null,
"slug": string,
"status": Database["public"]['Enums']["listing_status"],
"title": string,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"sitemap_listings":
{ Args: { "p_page"?: number }; Returns: {
              "slug": string,"updated_at": string
            }[]
                           },
"slugify":
{ Args: { "p_text": string }; Returns: string
                           }
          }
          Enums: {
            "listing_category": "pass_electronics"|"pass_vehicle"|"pass_ppe"|"pass_home"|"room_rent"|"room_share"|"job_main"|"job_parttime"|"lost"|"found","listing_status": "draft"|"pending_review"|"active"|"sold"|"closed"|"expired"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "listing_category": ["pass_electronics", "pass_vehicle", "pass_ppe", "pass_home", "room_rent", "room_share", "job_main", "job_parttime", "lost", "found"],"listing_status": ["draft", "pending_review", "active", "sold", "closed", "expired", "rejected"]
          }
        }
} as const
