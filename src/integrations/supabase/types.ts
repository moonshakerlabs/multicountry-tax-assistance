export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          country: string
          created_at: string
          id: string
          label_de: string | null
          label_en: string
          main_category: string
          sub_category: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          label_de?: string | null
          label_en: string
          main_category: string
          sub_category: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          label_de?: string | null
          label_en?: string
          main_category?: string
          sub_category?: string
        }
        Relationships: []
      }
      community_answers: {
        Row: {
          content: string
          created_at: string
          id: string
          is_correct: boolean
          post_id: string
          status: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_correct?: boolean
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_answers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          answer_count: number
          country: string
          created_at: string
          description: string
          id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          answer_count?: number
          country: string
          created_at?: string
          description: string
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          answer_count?: number
          country?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          country: string
          created_at: string
          id: string
          main_category: string
          sub_category: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          main_category: string
          sub_category: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          main_category?: string
          sub_category?: string
          user_id?: string
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          allow_download: boolean
          created_at: string
          document_ids: string[]
          expires_at: string
          id: string
          recipient_email: string
          recipient_metadata: Json | null
          recipient_type: string
          share_type: string
          status: string
          token: string
          user_id: string
        }
        Insert: {
          allow_download?: boolean
          created_at?: string
          document_ids: string[]
          expires_at: string
          id?: string
          recipient_email: string
          recipient_metadata?: Json | null
          recipient_type: string
          share_type: string
          status?: string
          token: string
          user_id: string
        }
        Update: {
          allow_download?: boolean
          created_at?: string
          document_ids?: string[]
          expires_at?: string
          id?: string
          recipient_email?: string
          recipient_metadata?: Json | null
          recipient_type?: string
          share_type?: string
          status?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_parse_consent: boolean | null
          category: Database["public"]["Enums"]["document_category"] | null
          country: string | null
          country_code: string | null
          created_at: string
          custom_sub_category: string | null
          file_name: string | null
          file_path: string | null
          file_type: string | null
          id: string
          main_category: string | null
          period_end: string | null
          period_start: string | null
          share_enabled: boolean
          sub_category: string | null
          tax_year: string | null
          user_id: string
        }
        Insert: {
          ai_parse_consent?: boolean | null
          category?: Database["public"]["Enums"]["document_category"] | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_sub_category?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          main_category?: string | null
          period_end?: string | null
          period_start?: string | null
          share_enabled?: boolean
          sub_category?: string | null
          tax_year?: string | null
          user_id: string
        }
        Update: {
          ai_parse_consent?: boolean | null
          category?: Database["public"]["Enums"]["document_category"] | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          custom_sub_category?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          main_category?: string | null
          period_end?: string | null
          period_start?: string | null
          share_enabled?: boolean
          sub_category?: string | null
          tax_year?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          google_email: string | null
          refresh_token: string | null
          root_folder_id: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token?: string | null
          root_folder_id?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_read: boolean
          can_write: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      share_audit_log: {
        Row: {
          access_expires_at: string
          created_at: string
          email_status: string
          id: string
          otp_verified_at: string | null
          recipient_email: string
          recipient_metadata: Json | null
          recipient_type: string
          share_id: string
          share_type: string
          user_id: string
        }
        Insert: {
          access_expires_at: string
          created_at?: string
          email_status?: string
          id?: string
          otp_verified_at?: string | null
          recipient_email: string
          recipient_metadata?: Json | null
          recipient_type: string
          share_id: string
          share_type: string
          user_id: string
        }
        Update: {
          access_expires_at?: string
          created_at?: string
          email_status?: string
          id?: string
          otp_verified_at?: string | null
          recipient_email?: string
          recipient_metadata?: Json | null
          recipient_type?: string
          share_id?: string
          share_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_audit_log_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "document_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          billing_cycle: string
          change_date: string
          change_type: string
          created_at: string
          id: string
          is_legacy_applied: boolean
          payment_reference_id: string | null
          plan: string
          price_at_purchase: number
          user_id: string
        }
        Insert: {
          billing_cycle: string
          change_date?: string
          change_type: string
          created_at?: string
          id?: string
          is_legacy_applied?: boolean
          payment_reference_id?: string | null
          plan: string
          price_at_purchase: number
          user_id: string
        }
        Update: {
          billing_cycle?: string
          change_date?: string
          change_type?: string
          created_at?: string
          id?: string
          is_legacy_applied?: boolean
          payment_reference_id?: string | null
          plan?: string
          price_at_purchase?: number
          user_id?: string
        }
        Relationships: []
      }
      user_country_preferences: {
        Row: {
          country: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          created_at: string
          gdpr_consent_date: string | null
          gdpr_consent_given: boolean | null
          google_drive_connected: boolean | null
          google_drive_folder_id: string | null
          other_tax_countries: string[] | null
          preferred_language: string
          primary_tax_residency: string
          storage_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gdpr_consent_date?: string | null
          gdpr_consent_given?: boolean | null
          google_drive_connected?: boolean | null
          google_drive_folder_id?: string | null
          other_tax_countries?: string[] | null
          preferred_language?: string
          primary_tax_residency?: string
          storage_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gdpr_consent_date?: string | null
          gdpr_consent_given?: boolean | null
          google_drive_connected?: boolean | null
          google_drive_folder_id?: string | null
          other_tax_countries?: string[] | null
          preferred_language?: string
          primary_tax_residency?: string
          storage_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          is_legacy_user: boolean
          legacy_price_amount: number | null
          legacy_valid_until: string | null
          points_balance: number
          subscription_end_date: string | null
          subscription_plan: string
          subscription_price_at_signup: number | null
          subscription_start_date: string
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          is_legacy_user?: boolean
          legacy_price_amount?: number | null
          legacy_valid_until?: string | null
          points_balance?: number
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_price_at_signup?: number | null
          subscription_start_date?: string
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          is_legacy_user?: boolean
          legacy_price_amount?: number | null
          legacy_valid_until?: string | null
          points_balance?: number
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_price_at_signup?: number | null
          subscription_start_date?: string
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin" | "employee_admin"
      document_category:
        | "employment"
        | "interest"
        | "dividend"
        | "capital_gains"
        | "rental"
        | "business"
        | "pension"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin", "employee_admin"],
      document_category: [
        "employment",
        "interest",
        "dividend",
        "capital_gains",
        "rental",
        "business",
        "pension",
        "other",
      ],
    },
  },
} as const
