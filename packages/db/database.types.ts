
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
            "audit_log": {
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
            "public_profiles": {
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
            "assert_rate_limit":
{ Args: { "p_action": string,"p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"gen_short_id":
{ Args: { "p_length"?: number }; Returns: string
                           },
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
"short_name":
{ Args: { "p_full_name": string }; Returns: string
                           },
"slugify":
{ Args: { "p_text": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
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
            
          }
        }
} as const
