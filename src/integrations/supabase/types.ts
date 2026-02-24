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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      archived_users: {
        Row: {
          created_at: string
          deletion_complete_at: string | null
          deletion_requested_at: string
          email: string
          first_name: string | null
          google_drive_connected: boolean | null
          id: string
          last_name: string | null
          meaningful_user_id: string | null
          original_user_id: string
          reason: string | null
          status: string
          storage_preference: string | null
        }
        Insert: {
          created_at?: string
          deletion_complete_at?: string | null
          deletion_requested_at?: string
          email: string
          first_name?: string | null
          google_drive_connected?: boolean | null
          id?: string
          last_name?: string | null
          meaningful_user_id?: string | null
          original_user_id: string
          reason?: string | null
          status?: string
          storage_preference?: string | null
        }
        Update: {
          created_at?: string
          deletion_complete_at?: string | null
          deletion_requested_at?: string
          email?: string
          first_name?: string | null
          google_drive_connected?: boolean | null
          id?: string
          last_name?: string | null
          meaningful_user_id?: string | null
          original_user_id?: string
          reason?: string | null
          status?: string
          storage_preference?: string | null
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_trending: boolean
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_trending?: boolean
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_trending?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          drive_permission_ids: Json | null
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
          drive_permission_ids?: Json | null
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
          drive_permission_ids?: Json | null
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
      employee_profiles: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string
          employee_id: string
          employment_status: string
          first_name: string
          id: string
          joined_date: string
          last_name: string
          pan_number: string | null
          phone_number: string
          resigned_date: string | null
          role: string
          uan_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          employee_id: string
          employment_status?: string
          first_name: string
          id?: string
          joined_date: string
          last_name: string
          pan_number?: string | null
          phone_number: string
          resigned_date?: string | null
          role?: string
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          employee_id?: string
          employment_status?: string
          first_name?: string
          id?: string
          joined_date?: string
          last_name?: string
          pan_number?: string | null
          phone_number?: string
          resigned_date?: string | null
          role?: string
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
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
      plan_feature_mapping: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          plan_key: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          plan_key: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_feature_mapping_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "plan_features"
            referencedColumns: ["feature_key"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          plan_key: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_key: string
          price?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_key?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      privacy_policy_versions: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_active: boolean
          published_at: string | null
          updated_by: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          updated_by: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          updated_by?: string
          version?: number
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
          meaningful_user_id: string | null
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
          meaningful_user_id?: string | null
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
          meaningful_user_id?: string | null
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
      subscription_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      support_ticket_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_email: string
          sender_type: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_email: string
          sender_type: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_email?: string
          sender_type?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          content: string
          created_at: string
          email: string
          id: string
          last_reply_at: string | null
          meaningful_user_id: string | null
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          email: string
          id?: string
          last_reply_at?: string | null
          meaningful_user_id?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          email?: string
          id?: string
          last_reply_at?: string | null
          meaningful_user_id?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
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
      user_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          otp_type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          otp_type?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          otp_type?: string
          used_at?: string | null
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
          india_tax_year_type: string | null
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
          india_tax_year_type?: string | null
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
          india_tax_year_type?: string | null
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
      user_security_settings: {
        Row: {
          created_at: string
          security_answer_1: string | null
          security_answer_2: string | null
          security_answer_3: string | null
          security_question_1: string | null
          security_question_2: string | null
          security_question_3: string | null
          session_timeout_minutes: number
          two_fa_enabled: boolean
          two_fa_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
          session_timeout_minutes?: number
          two_fa_enabled?: boolean
          two_fa_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
          session_timeout_minutes?: number
          two_fa_enabled?: boolean
          two_fa_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          downgrade_scheduled_at: string | null
          early_access_freemium_end: string | null
          early_access_pro_end: string | null
          early_access_user: boolean
          id: string
          is_legacy_user: boolean
          is_trial: boolean
          legacy_price_amount: number | null
          legacy_valid_until: string | null
          points_balance: number
          scheduled_billing_cycle: string | null
          scheduled_plan: string | null
          subscription_end_date: string | null
          subscription_plan: string
          subscription_price_at_signup: number | null
          subscription_start_date: string
          subscription_status: string
          trial_end_date: string | null
          trial_plan: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          downgrade_scheduled_at?: string | null
          early_access_freemium_end?: string | null
          early_access_pro_end?: string | null
          early_access_user?: boolean
          id?: string
          is_legacy_user?: boolean
          is_trial?: boolean
          legacy_price_amount?: number | null
          legacy_valid_until?: string | null
          points_balance?: number
          scheduled_billing_cycle?: string | null
          scheduled_plan?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_price_at_signup?: number | null
          subscription_start_date?: string
          subscription_status?: string
          trial_end_date?: string | null
          trial_plan?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          downgrade_scheduled_at?: string | null
          early_access_freemium_end?: string | null
          early_access_pro_end?: string | null
          early_access_user?: boolean
          id?: string
          is_legacy_user?: boolean
          is_trial?: boolean
          legacy_price_amount?: number | null
          legacy_valid_until?: string | null
          points_balance?: number
          scheduled_billing_cycle?: string | null
          scheduled_plan?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string
          subscription_price_at_signup?: number | null
          subscription_start_date?: string
          subscription_status?: string
          trial_end_date?: string | null
          trial_plan?: string | null
          trial_start_date?: string | null
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
      generate_meaningful_user_id: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
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
      app_role:
        | "user"
        | "admin"
        | "employee_admin"
        | "user_admin"
        | "super_admin"
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
      app_role: [
        "user",
        "admin",
        "employee_admin",
        "user_admin",
        "super_admin",
      ],
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
