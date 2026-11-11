
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
                    "badge": string,"created_at": string,"document_path": string | null,"document_purged_at": string | null,"id": string,"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge": string,"created_at"?: string,"document_path"?: string | null,"document_purged_at"?: string | null,"id"?: string,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge"?: string,"created_at"?: string,"document_path"?: string | null,"document_purged_at"?: string | null,"id"?: string,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
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
                },"banners": {
                  Row: {
                    "created_at": string,"created_by": string | null,"cta_label": string | null,"ends_at": string | null,"id": string,"image_path": string | null,"is_active": boolean,"link_url": string | null,"locale": string | null,"placement": string,"sort": number,"starts_at": string | null,"subtitle": string | null,"title": string,"tone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"cta_label"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"locale"?: string | null,"placement": string,"sort"?: number,"starts_at"?: string | null,"subtitle"?: string | null,"title": string,"tone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"cta_label"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"locale"?: string | null,"placement"?: string,"sort"?: number,"starts_at"?: string | null,"subtitle"?: string | null,"title"?: string,"tone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "banners_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "banners_created_by_fkey"
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
                },"chat_banned_words": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"match_mode": string,"updated_at": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"match_mode"?: string,"updated_at"?: string,"word": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"match_mode"?: string,"updated_at"?: string,"word"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_banned_words_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chat_banned_words_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"created_at": string,"last_read_at": string,"muted": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"created_at"?: string,"last_read_at"?: string,"muted"?: boolean,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"created_at"?: string,"last_read_at"?: string,"muted"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "context_id": string | null,"context_type": string | null,"created_at": string,"created_by": string | null,"id": string,"kind": string,"last_message_at": string | null,"last_message_preview": string | null,"last_sender_id": string | null,"updated_at": string,"user_high": string | null,"user_low": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "context_id"?: string | null,"context_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null,"updated_at"?: string,"user_high"?: string | null,"user_low"?: string | null
                  }
                  Update: {
                    "context_id"?: string | null,"context_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null,"updated_at"?: string,"user_high"?: string | null,"user_low"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_last_sender_id_fkey"
      columns: ["last_sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_last_sender_id_fkey"
      columns: ["last_sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"note": string | null,"responded_at": string | null,"status": Database["public"]['Enums']["member_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"note"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"note"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "my_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "public_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "attributes": NonNullable<Json>,"conversation_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"destination": unknown,"destination_text": string | null,"ends_at": string | null,"fee_per_person": number,"host_id": string,"id": string,"kind": Database["public"]['Enums']["group_kind"],"lang": string,"origin": unknown,"origin_text": string,"reminded_at": string | null,"requires_approval": boolean,"seats_taken": number,"seats_total": number,"short_id": string | null,"site": string | null,"slug": string | null,"starts_at": string,"status": Database["public"]['Enums']["group_status"],"sub_kind": string,"title": string,"updated_at": string,"venue_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attributes"?: NonNullable<Json>,"conversation_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"destination"?: unknown,"destination_text"?: string | null,"ends_at"?: string | null,"fee_per_person"?: number,"host_id"?: string,"id"?: string,"kind": Database["public"]['Enums']["group_kind"],"lang"?: string,"origin"?: unknown,"origin_text": string,"reminded_at"?: string | null,"requires_approval"?: boolean,"seats_taken"?: number,"seats_total": number,"short_id"?: string | null,"site"?: string | null,"slug"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["group_status"],"sub_kind": string,"title": string,"updated_at"?: string,"venue_id"?: string | null
                  }
                  Update: {
                    "attributes"?: NonNullable<Json>,"conversation_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"destination"?: unknown,"destination_text"?: string | null,"ends_at"?: string | null,"fee_per_person"?: number,"host_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["group_kind"],"lang"?: string,"origin"?: unknown,"origin_text"?: string,"reminded_at"?: string | null,"requires_approval"?: boolean,"seats_taken"?: number,"seats_total"?: number,"short_id"?: string | null,"site"?: string | null,"slug"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["group_status"],"sub_kind"?: string,"title"?: string,"updated_at"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "groups_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
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
                    "address_text": string | null,"attributes": NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at": string,"deleted_at": string | null,"description": string | null,"expires_at": string | null,"id": string,"images": (string)[],"lang": string,"location": unknown,"moderation_hold": boolean,"moderation_reasons": (string)[],"owner_id": string,"price": number | null,"price_type": string,"published_at": string | null,"search_vector": unknown,"short_id": string,"site": string | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"title": string,"title_search": string | null,"updated_at": string,"view_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text"?: string | null,"attributes"?: NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"expires_at"?: string | null,"id"?: string,"images"?: (string)[],"lang"?: string,"location"?: unknown,"moderation_hold"?: boolean,"moderation_reasons"?: (string)[],"owner_id"?: string,"price"?: number | null,"price_type"?: string,"published_at"?: string | null,"search_vector"?: never,"short_id"?: string,"site"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"title_search"?: never,"updated_at"?: string,"view_count"?: number
                  }
                  Update: {
                    "address_text"?: string | null,"attributes"?: NonNullable<Json>,"category"?: Database["public"]['Enums']["listing_category"],"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"expires_at"?: string | null,"id"?: string,"images"?: (string)[],"lang"?: string,"location"?: unknown,"moderation_hold"?: boolean,"moderation_reasons"?: (string)[],"owner_id"?: string,"price"?: number | null,"price_type"?: string,"published_at"?: string | null,"search_vector"?: never,"short_id"?: string,"site"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"title_search"?: never,"updated_at"?: string,"view_count"?: number
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
                },"lost_found_matches": {
                  Row: {
                    "created_at": string,"distance_m": number | null,"found_id": string,"lost_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"distance_m"?: number | null,"found_id": string,"lost_id": string
                  }
                  Update: {
                    "created_at"?: string,"distance_m"?: number | null,"found_id"?: string,"lost_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lost_found_matches_found_id_fkey"
      columns: ["found_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lost_found_matches_found_id_fkey"
      columns: ["found_id"]
isOneToOne: false
      referencedRelation: "public_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lost_found_matches_lost_id_fkey"
      columns: ["lost_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lost_found_matches_lost_id_fkey"
      columns: ["lost_id"]
isOneToOne: false
      referencedRelation: "public_listings"
      referencedColumns: ["id"]
    }
                  ]
                },"marketing_leads": {
                  Row: {
                    "consent_at": string,"consent_version": string,"contact": string,"contact_type": string,"created_at": string,"handled_at": string | null,"handled_by": string | null,"id": string,"kind": string,"locale": string,"message": string | null,"name": string | null,"note": string | null,"site": string | null,"source": string,"status": string,"updated_at": string,"utm": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at": string,"consent_version": string,"contact": string,"contact_type": string,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind": string,"locale"?: string,"message"?: string | null,"name"?: string | null,"note"?: string | null,"site"?: string | null,"source"?: string,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>
                  }
                  Update: {
                    "consent_at"?: string,"consent_version"?: string,"contact"?: string,"contact_type"?: string,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind"?: string,"locale"?: string,"message"?: string | null,"name"?: string | null,"note"?: string | null,"site"?: string | null,"source"?: string,"status"?: string,"updated_at"?: string,"utm"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "marketing_leads_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marketing_leads_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marketing_leads_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"conversation_id": string,"created_at": string,"id": string,"image_path": string | null,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"conversation_id": string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"sender_id"?: string | null
                  }
                  Update: {
                    "body"?: string | null,"conversation_id"?: string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
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
                    "body_key": string | null,"created_at": string,"data": NonNullable<Json>,"id": string,"params": NonNullable<Json>,"pushed_at": string | null,"read_at": string | null,"title_key": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_key"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"params"?: NonNullable<Json>,"pushed_at"?: string | null,"read_at"?: string | null,"title_key": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body_key"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"params"?: NonNullable<Json>,"pushed_at"?: string | null,"read_at"?: string | null,"title_key"?: string,"type"?: string,"user_id"?: string
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
                },"reports": {
                  Row: {
                    "created_at": string,"detail": string | null,"id": string,"reason": string,"reporter_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: string | null,"id"?: string,"reason": string,"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
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
                },"venues": {
                  Row: {
                    "address_text": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"location": unknown,"name": string,"phone": string | null,"price_ref": number | null,"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"site": string | null,"sports": (string)[],"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"location"?: unknown,"name": string,"phone"?: string | null,"price_ref"?: number | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"site"?: string | null,"sports": (string)[],"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address_text"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"location"?: unknown,"name"?: string,"phone"?: string | null,"price_ref"?: number | null,"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"site"?: string | null,"sports"?: (string)[],"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venues_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venues_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venues_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venues_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venues_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    }
                  ]
                }
          }
          Views: {
            "my_groups": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string,"description": string | null,"destination_lat": number | null,"destination_lng": number | null,"destination_text": string | null,"ends_at": string | null,"fee_per_person": number,"host_avatar_url": string | null,"host_badges": (string)[],"host_id": string,"host_name": string | null,"host_rating_avg": number,"host_rating_count": number,"host_since": string,"id": string,"is_past": boolean | null,"is_upcoming": boolean | null,"kind": Database["public"]['Enums']["group_kind"],"lang": string,"members": Json | null,"my_rating": number | null,"my_role": string | null,"origin_lat": number | null,"origin_lng": number | null,"origin_text": string,"requires_approval": boolean,"seats_left": number | null,"seats_taken": number,"seats_total": number,"short_id": string | null,"site": string | null,"site_name": string | null,"slug": string | null,"starts_at": string,"status": Database["public"]['Enums']["group_status"],"sub_kind": string,"title": string,"updated_at": string,"venue_address": string | null,"venue_id": string | null,"venue_name": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "groups_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"public_groups": {
                  Row: {
                    "attributes": NonNullable<Json>,"created_at": string,"description": string | null,"destination_lat": number | null,"destination_lng": number | null,"destination_text": string | null,"ends_at": string | null,"fee_per_person": number,"host_avatar_url": string | null,"host_badges": (string)[],"host_id": string,"host_name": string | null,"host_rating_avg": number,"host_rating_count": number,"host_since": string,"id": string,"is_past": boolean | null,"kind": Database["public"]['Enums']["group_kind"],"lang": string,"members": Json | null,"origin_lat": number | null,"origin_lng": number | null,"origin_text": string,"requires_approval": boolean,"seats_left": number | null,"seats_taken": number,"seats_total": number,"short_id": string | null,"site": string | null,"site_name": string | null,"slug": string | null,"starts_at": string,"status": Database["public"]['Enums']["group_status"],"sub_kind": string,"title": string,"updated_at": string,"venue_address": string | null,"venue_id": string | null,"venue_name": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_site_fkey"
      columns: ["site"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "groups_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"public_listings": {
                  Row: {
                    "address_text": string | null,"attributes": NonNullable<Json>,"category": Database["public"]['Enums']["listing_category"],"created_at": string,"description": string | null,"distance_to_site_m": number | null,"expires_at": string | null,"id": string,"images": (string)[],"inactive_since": string | null,"is_expired": boolean | null,"lang": string,"lat": number | null,"lng": number | null,"owner_avatar_url": string | null,"owner_badges": (string)[],"owner_id": string,"owner_name": string | null,"owner_rating_avg": number,"owner_rating_count": number,"owner_since": string,"price": number | null,"price_type": string,"search_vector": unknown,"short_id": string,"site": string | null,"site_name": string | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"title": string,"title_search": string | null,"updated_at": string,"view_count": number
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
            "admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"app_setting":
{ Args: { "p_key": string }; Returns: string
                           },
"assert_rate_limit":
{ Args: { "p_action": string,"p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"call_purge_files":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"can_send_message":
{ Args: { "p_conversation_id": string }; Returns: boolean
                           },
"chat_message_violation":
{ Args: { "p_body": string }; Returns: string
                           },
"check_rate_limit":
{ Args: { "p_action": string,"p_key": string }; Returns: boolean
                           },
"count_unread_conversations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"expire_content":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"export_audit_log":
{ Args: { "p_action_prefix"?: string,"p_from"?: string,"p_limit"?: number,"p_to"?: string }; Returns: {
              "action": string,"actor_id": string,"actor_name": string,"created_at": string,"id": number,"meta": Json,"target_id": string,"target_type": string
            }[]
                           },
"export_marketing_leads":
{ Args: { "p_from"?: string,"p_limit"?: number,"p_status"?: string,"p_to"?: string }; Returns: {
              "contact": string,"contact_type": string,"created_at": string,"handled_at": string,"id": string,"kind": string,"locale": string,"message": string,"name": string,"note": string,"site": string,"source": string,"status": string,"utm": Json
            }[]
                           },
"f_unaccent":
{ Args: { "p_text": string }; Returns: string
                           },
"gen_short_id":
{ Args: { "p_length"?: number }; Returns: string
                           },
"get_group_by_slug":
{ Args: { "p_slug": string }; Returns: {
              "attributes": NonNullable<Json>,
"created_at": string,
"description": string | null,
"destination_lat": number | null,
"destination_lng": number | null,
"destination_text": string | null,
"ends_at": string | null,
"fee_per_person": number,
"host_avatar_url": string | null,
"host_badges": (string)[],
"host_id": string,
"host_name": string | null,
"host_rating_avg": number,
"host_rating_count": number,
"host_since": string,
"id": string,
"is_past": boolean | null,
"kind": Database["public"]['Enums']["group_kind"],
"lang": string,
"members": Json | null,
"origin_lat": number | null,
"origin_lng": number | null,
"origin_text": string,
"requires_approval": boolean,
"seats_left": number | null,
"seats_taken": number,
"seats_total": number,
"short_id": string | null,
"site": string | null,
"site_name": string | null,
"slug": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["group_status"],
"sub_kind": string,
"title": string,
"updated_at": string,
"venue_address": string | null,
"venue_id": string | null,
"venue_name": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_groups"
        isOneToOne: false
        isSetofReturn: true
      } },
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
"title_search": string | null,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"has_phone_number":
{ Args: { "p_text": string }; Returns: boolean
                           },
"home_feed":
{ Args: { "p_limit"?: number,"p_site"?: string }; Returns: {
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
"title_search": string | null,
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
"is_group_host":
{ Args: { "p_group_id": string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "p_group_id": string }; Returns: boolean
                           },
"is_member":
{ Args: { "p_conversation_id": string }; Returns: boolean
                           },
"is_member_path":
{ Args: { "p_name": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_group_tx":
{ Args: { "p_group_id": string,"p_note"?: string }; Returns: Database["public"]['Enums']["member_status"]
                           },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"list_conversation_members":
{ Args: { "p_conversation_id": string }; Returns: {
              "avatar_url": string,"badges": (string)[],"display_name": string,"joined_at": string,"user_id": string
            }[]
                           },
"list_conversations":
{ Args: { "p_conversation_id"?: string,"p_cursor"?: string,"p_limit"?: number }; Returns: {
              "blocked_by_me": boolean,"blocked_me": boolean,"context_id": string,"context_type": string,"created_at": string,"group_host_id": string,"group_kind": string,"group_slug": string,"group_starts_at": string,"group_status": string,"group_sub_kind": string,"group_title": string,"id": string,"kind": string,"last_message_at": string,"last_message_preview": string,"last_sender_id": string,"last_sender_name": string,"listing_category": string,"listing_image": string,"listing_owner_id": string,"listing_price": number,"listing_price_type": string,"listing_slug": string,"listing_status": string,"listing_title": string,"member_count": number,"muted": boolean,"other_avatar_url": string,"other_badges": (string)[],"other_last_read_at": string,"other_name": string,"other_user_id": string,"unread_count": number
            }[]
                           },
"list_group_members":
{ Args: { "p_group_id": string }; Returns: {
              "avatar_url": string,"badges": (string)[],"display_name": string,"joined_at": string,"note": string,"rating_avg": number,"rating_count": number,"responded_at": string,"status": Database["public"]['Enums']["member_status"],"user_id": string
            }[]
                           },
"list_listing_counterparts":
{ Args: { "p_listing_id": string }; Returns: {
              "avatar_url": string,"conversation_id": string,"display_name": string,"is_owner": boolean,"last_message_at": string,"my_score": number,"user_id": string
            }[]
                           },
"list_lost_found_matches":
{ Args: { "p_listing_id": string }; Returns: {
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
"title_search": string | null,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"listing_default_ttl":
{ Args: { "p_category": Database["public"]['Enums']["listing_category"] }; Returns: string
                           },
"log_search":
{ Args: { "p_category"?: Database["public"]['Enums']["listing_category"],"p_query": string,"p_results"?: number }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"mark_listing_returned":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"my_listing_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": number,"drafts": number,"expiring_soon": number,"pending": number,"rejected": number,"total_views": number
            }[]
                           },
"notification_push_enabled":
{ Args: { "p_prefs": Json,"p_type": string }; Returns: boolean
                           },
"owns_listing":
{ Args: { "p_listing_id": string }; Returns: boolean
                           },
"public_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "listings": number,"sites": number,"users": number
            }[]
                           },
"rate_group":
{ Args: { "p_comment"?: string,"p_group_id": string,"p_score": number }; Returns: undefined
                           },
"rate_listing":
{ Args: { "p_comment"?: string,"p_listing_id": string,"p_ratee_id": string,"p_score": number }; Returns: undefined
                           },
"record_listing_view":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"register_push_token":
{ Args: { "p_token": string }; Returns: undefined
                           },
"remind_groups":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"renew_listing":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"request_badge_tx":
{ Args: { "p_badge": string,"p_document_path": string }; Returns: string
                           },
"respond_join_tx":
{ Args: { "p_accept": boolean,"p_group_id": string,"p_user_id": string }; Returns: Database["public"]['Enums']["member_status"]
                           },
"reveal_contact":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"review_listing":
{ Args: { "p_approve": boolean,"p_listing_id": string,"p_note"?: string }; Returns: undefined
                           },
"safe_timestamptz":
{ Args: { "p_text": string }; Returns: string
                           },
"search_groups":
{ Args: { "p_cursor_id"?: string,"p_cursor_starts_at"?: string,"p_dest_lat"?: number,"p_dest_lng"?: number,"p_dest_radius_m"?: number,"p_from"?: string,"p_include_full"?: boolean,"p_kind": Database["public"]['Enums']["group_kind"],"p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_query"?: string,"p_radius_m"?: number,"p_site"?: string,"p_sub_kinds"?: (string)[],"p_to"?: string }; Returns: {
              "attributes": NonNullable<Json>,
"created_at": string,
"description": string | null,
"destination_lat": number | null,
"destination_lng": number | null,
"destination_text": string | null,
"ends_at": string | null,
"fee_per_person": number,
"host_avatar_url": string | null,
"host_badges": (string)[],
"host_id": string,
"host_name": string | null,
"host_rating_avg": number,
"host_rating_count": number,
"host_since": string,
"id": string,
"is_past": boolean | null,
"kind": Database["public"]['Enums']["group_kind"],
"lang": string,
"members": Json | null,
"origin_lat": number | null,
"origin_lng": number | null,
"origin_text": string,
"requires_approval": boolean,
"seats_left": number | null,
"seats_taken": number,
"seats_total": number,
"short_id": string | null,
"site": string | null,
"site_name": string | null,
"slug": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["group_status"],
"sub_kind": string,
"title": string,
"updated_at": string,
"venue_address": string | null,
"venue_id": string | null,
"venue_name": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_groups"
        isOneToOne: false
        isSetofReturn: true
      } },
"search_listings":
{ Args: { "p_attributes"?: Json,"p_categories"?: (Database["public"]['Enums']["listing_category"])[],"p_cursor"?: string,"p_cursor_id"?: string,"p_cursor_price"?: number,"p_free_only"?: boolean,"p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_max_distance_m"?: number,"p_price_max"?: number,"p_price_min"?: number,"p_query"?: string,"p_radius_m"?: number,"p_site"?: string,"p_sort"?: string }; Returns: {
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
"title_search": string | null,
"updated_at": string,
"view_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "public_listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"search_venues":
{ Args: { "p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_query"?: string,"p_site"?: string,"p_sport"?: string }; Returns: {
              "address_text": string,"distance_m": number,"id": string,"lat": number,"lng": number,"name": string,"phone": string,"price_ref": number,"site": string,"sports": (string)[]
            }[]
                           },
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
"title_search": string | null,
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
                           },
"staff_cancel_group":
{ Args: { "p_group_id": string,"p_note"?: string }; Returns: undefined
                           },
"staff_set_listing_status":
{ Args: { "p_listing_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["listing_status"] }; Returns: undefined
                           },
"start_listing_conversation":
{ Args: { "p_listing_id": string }; Returns: string
                           },
"unregister_push_token":
{ Args: { "p_token": string }; Returns: undefined
                           },
"valid_notification_prefs":
{ Args: { "p": Json }; Returns: boolean
                           }
          }
          Enums: {
            "group_kind": "ride"|"sport","group_status": "open"|"full"|"in_progress"|"completed"|"cancelled","listing_category": "pass_electronics"|"pass_vehicle"|"pass_ppe"|"pass_home"|"room_rent"|"room_share"|"job_main"|"job_parttime"|"lost"|"found"|"pass_appliance"|"pass_fashion"|"pass_sport"|"pass_tools"|"pass_baby"|"pass_other","listing_status": "draft"|"pending_review"|"active"|"sold"|"closed"|"expired"|"rejected","member_status": "requested"|"accepted"|"declined"|"left"|"kicked"
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
            "group_kind": ["ride", "sport"],"group_status": ["open", "full", "in_progress", "completed", "cancelled"],"listing_category": ["pass_electronics", "pass_vehicle", "pass_ppe", "pass_home", "room_rent", "room_share", "job_main", "job_parttime", "lost", "found", "pass_appliance", "pass_fashion", "pass_sport", "pass_tools", "pass_baby", "pass_other"],"listing_status": ["draft", "pending_review", "active", "sold", "closed", "expired", "rejected"],"member_status": ["requested", "accepted", "declined", "left", "kicked"]
          }
        }
} as const
