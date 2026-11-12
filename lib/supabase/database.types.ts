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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_api_credentials: {
        Row: {
          account_id: string
          created_at: string
          docs_url: string
          encrypted_key: string
          id: string
          key_last4: string
          label: string
          last_checked_at: string | null
          last_error: string
          nonce: string
          provider: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          account_id: string
          created_at?: string
          docs_url: string
          encrypted_key: string
          id: string
          key_last4: string
          label?: string
          last_checked_at?: string | null
          last_error?: string
          nonce: string
          provider: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          docs_url?: string
          encrypted_key?: string
          id?: string
          key_last4?: string
          label?: string
          last_checked_at?: string | null
          last_error?: string
          nonce?: string
          provider?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_api_credentials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_integration_health: {
        Row: {
          account_id: string
          details: string
          last_checked_at: string | null
          name: string
          status: string
        }
        Insert: {
          account_id: string
          details?: string
          last_checked_at?: string | null
          name: string
          status?: string
        }
        Update: {
          account_id?: string
          details?: string
          last_checked_at?: string | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_integration_health_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_security_settings: {
        Row: {
          account_id: string
          data_export_enabled: boolean
          incident_email: string
          marketing_consent_required: boolean
          retention_days: number
          retention_enabled: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          data_export_enabled?: boolean
          incident_email?: string
          marketing_consent_required?: boolean
          retention_days?: number
          retention_enabled?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          data_export_enabled?: boolean
          incident_email?: string
          marketing_consent_required?: boolean
          retention_days?: number
          retention_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_security_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_settings: {
        Row: {
          account_id: string
          auto_approve: boolean
          maximum_batch: number
          minimum_score: number
          require_affiliate_link: boolean
          require_image: boolean
          starter_initialized: boolean
          timezone: string
          updated_at: string
          whatsapp_dispatch_sequence: number
          whatsapp_rotation_enabled: boolean
        }
        Insert: {
          account_id: string
          auto_approve?: boolean
          maximum_batch?: number
          minimum_score?: number
          require_affiliate_link?: boolean
          require_image?: boolean
          starter_initialized?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_dispatch_sequence?: number
          whatsapp_rotation_enabled?: boolean
        }
        Update: {
          account_id?: string
          auto_approve?: boolean
          maximum_batch?: number
          minimum_score?: number
          require_affiliate_link?: boolean
          require_image?: boolean
          starter_initialized?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_dispatch_sequence?: number
          whatsapp_rotation_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "account_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_member_id: string
          plan: string
          slug: string
          status: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          owner_member_id: string
          plan?: string
          slug: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_member_id?: string
          plan?: string
          slug?: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          account_id: string
          created_at: string
          details: string
          event_type: string
          id: number
          status: string
          title: string
        }
        Insert: {
          account_id: string
          created_at?: string
          details?: string
          event_type: string
          id?: number
          status?: string
          title: string
        }
        Update: {
          account_id?: string
          created_at?: string
          details?: string
          event_type?: string
          id?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_competition_observations: {
        Row: {
          account_id: string
          category_slug: string | null
          created_at: string
          creators_found: number
          external_id: string
          id: string
          marketplace: string
          note: string
          observation_method: string
          observed_at: string
          product_title: string
          results_scanned: number
          search_term: string
          videos_found: number
        }
        Insert: {
          account_id: string
          category_slug?: string | null
          created_at?: string
          creators_found: number
          external_id: string
          id: string
          marketplace?: string
          note?: string
          observation_method?: string
          observed_at?: string
          product_title: string
          results_scanned?: number
          search_term?: string
          videos_found: number
        }
        Update: {
          account_id?: string
          category_slug?: string | null
          created_at?: string
          creators_found?: number
          external_id?: string
          id?: string
          marketplace?: string
          note?: string
          observation_method?: string
          observed_at?: string
          product_title?: string
          results_scanned?: number
          search_term?: string
          videos_found?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_competition_observations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_discovery_items: {
        Row: {
          account_id: string
          affiliate_url: string
          available: boolean | null
          brand_name: string
          campaign_id: string
          category_slug: string | null
          commission_rate: number | null
          external_id: string
          first_seen_at: string
          id: string
          image_url: string
          kind: string
          last_run_id: string | null
          last_seen_at: string
          marketplace: string
          offer_id: string | null
          price_cents: number | null
          processed_at: string | null
          processing_error: string
          processing_status: string
          product_url: string
          rating: number | null
          raw_data: Json
          sales_count: number | null
          source_keyword: string | null
          title: string
        }
        Insert: {
          account_id: string
          affiliate_url?: string
          available?: boolean | null
          brand_name?: string
          campaign_id?: string
          category_slug?: string | null
          commission_rate?: number | null
          external_id: string
          first_seen_at?: string
          id: string
          image_url?: string
          kind: string
          last_run_id?: string | null
          last_seen_at?: string
          marketplace: string
          offer_id?: string | null
          price_cents?: number | null
          processed_at?: string | null
          processing_error?: string
          processing_status?: string
          product_url?: string
          rating?: number | null
          raw_data?: Json
          sales_count?: number | null
          source_keyword?: string | null
          title?: string
        }
        Update: {
          account_id?: string
          affiliate_url?: string
          available?: boolean | null
          brand_name?: string
          campaign_id?: string
          category_slug?: string | null
          commission_rate?: number | null
          external_id?: string
          first_seen_at?: string
          id?: string
          image_url?: string
          kind?: string
          last_run_id?: string | null
          last_seen_at?: string
          marketplace?: string
          offer_id?: string | null
          price_cents?: number | null
          processed_at?: string | null
          processing_error?: string
          processing_status?: string
          product_url?: string
          rating?: number | null
          raw_data?: Json
          sales_count?: number | null
          source_keyword?: string | null
          title?: string
        }
        Relationships: []
      }
      affiliate_discovery_runs: {
        Row: {
          account_id: string
          created_at: string
          cursor_in: string | null
          cursor_out: string | null
          finished_at: string | null
          id: string
          last_error: string
          marketplace: string
          operation: string
          pages_completed: number
          rate_limit_remaining: number | null
          records_seen: number
          records_upserted: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          cursor_in?: string | null
          cursor_out?: string | null
          finished_at?: string | null
          id: string
          last_error?: string
          marketplace: string
          operation: string
          pages_completed?: number
          rate_limit_remaining?: number | null
          records_seen?: number
          records_upserted?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          cursor_in?: string | null
          cursor_out?: string | null
          finished_at?: string | null
          id?: string
          last_error?: string
          marketplace?: string
          operation?: string
          pages_completed?: number
          rate_limit_remaining?: number | null
          records_seen?: number
          records_upserted?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_discovery_snapshots: {
        Row: {
          account_id: string
          captured_at: string
          commission_rate: number | null
          external_id: string
          id: string
          kind: string
          marketplace: string
          price_cents: number | null
          rating: number | null
          sales_count: number | null
        }
        Insert: {
          account_id: string
          captured_at?: string
          commission_rate?: number | null
          external_id: string
          id: string
          kind: string
          marketplace: string
          price_cents?: number | null
          rating?: number | null
          sales_count?: number | null
        }
        Update: {
          account_id?: string
          captured_at?: string
          commission_rate?: number | null
          external_id?: string
          id?: string
          kind?: string
          marketplace?: string
          price_cents?: number | null
          rating?: number | null
          sales_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_discovery_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          account_id: string
          commission_cents: number
          created_at: string
          external_id: string
          gross_cents: number
          group_id: string | null
          id: string
          marketplace: string
          offer_id: string | null
          ordered_at: string
          status: string
          subid: string
          updated_at: string
        }
        Insert: {
          account_id: string
          commission_cents?: number
          created_at?: string
          external_id: string
          gross_cents?: number
          group_id?: string | null
          id: string
          marketplace: string
          offer_id?: string | null
          ordered_at: string
          status?: string
          subid?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          commission_cents?: number
          created_at?: string
          external_id?: string
          gross_cents?: number
          group_id?: string | null
          id?: string
          marketplace?: string
          offer_id?: string | null
          ordered_at?: string
          status?: string
          subid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_affiliate_sales_account_group"
            columns: ["account_id", "group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_affiliate_sales_account_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          auto_approve: boolean
          id: string
          maximum_batch: number
          minimum_score: number
          require_affiliate_link: boolean
          require_image: boolean
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean
          id: string
          maximum_batch?: number
          minimum_score?: number
          require_affiliate_link?: boolean
          require_image?: boolean
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean
          id?: string
          maximum_batch?: number
          minimum_score?: number
          require_affiliate_link?: boolean
          require_image?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_rules: {
        Row: {
          account_id: string
          category_id: string | null
          cooldown_minutes: number
          created_at: string
          id: string
          max_price: number | null
          max_publications_per_day: number
          min_discount: number
          min_score: number
          name: string
          require_price_history: boolean
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          category_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id: string
          max_price?: number | null
          max_publications_per_day?: number
          min_discount?: number
          min_score?: number
          name: string
          require_price_history?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          category_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_price?: number | null
          max_publications_per_day?: number
          min_discount?: number
          min_score?: number
          name?: string
          require_price_history?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_autopilot_tenant_category"
            columns: ["account_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      categories: {
        Row: {
          account_id: string
          color: string
          created_at: string
          icon: string
          id: string
          keywords: Json
          name: string
        }
        Insert: {
          account_id: string
          color?: string
          created_at?: string
          icon?: string
          id: string
          keywords?: Json
          name: string
        }
        Update: {
          account_id?: string
          color?: string
          created_at?: string
          icon?: string
          id?: string
          keywords?: Json
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          account_id: string
          group_id: string
          id: number
          marketplace: string
          occurred_at: string
          offer_id: string
          publication_id: string
        }
        Insert: {
          account_id: string
          group_id: string
          id?: number
          marketplace: string
          occurred_at?: string
          offer_id: string
          publication_id: string
        }
        Update: {
          account_id?: string
          group_id?: string
          id?: number
          marketplace?: string
          occurred_at?: string
          offer_id?: string
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_click_events_account_group"
            columns: ["account_id", "group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_click_events_account_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_clicks_tenant_publication"
            columns: ["account_id", "publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      connector_credential_bindings: {
        Row: {
          account_id: string
          credential_slot: string
          provider: string
        }
        Insert: {
          account_id: string
          credential_slot: string
          provider: string
        }
        Update: {
          account_id?: string
          credential_slot?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_credential_bindings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          account_id: string
          asset_url: string
          channel: string
          content: string
          created_at: string
          id: string
          kind: string
          offer_id: string | null
          provider_model: string
          status: string
        }
        Insert: {
          account_id: string
          asset_url?: string
          channel?: string
          content?: string
          created_at?: string
          id: string
          kind: string
          offer_id?: string | null
          provider_model?: string
          status?: string
        }
        Update: {
          account_id?: string
          asset_url?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          offer_id?: string | null
          provider_model?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assets_tenant_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
        ]
      }
      coupons: {
        Row: {
          account_id: string
          code: string
          created_at: string
          discount_text: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          marketplace: string
          max_discount_cents: number
          min_purchase_cents: number
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          account_id: string
          code: string
          created_at?: string
          discount_text?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id: string
          marketplace: string
          max_discount_cents?: number
          min_purchase_cents?: number
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string
        }
        Update: {
          account_id?: string
          code?: string
          created_at?: string
          discount_text?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          marketplace?: string
          max_discount_cents?: number
          min_purchase_cents?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_api_tokens: {
        Row: {
          account_id: string
          created_at: string
          id: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          token_last4: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          token_last4: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_last4?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_api_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_autopublish_settings: {
        Row: {
          account_id: string
          created_at: string
          enabled: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_autopublish_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_campaigns: {
        Row: {
          account_id: string
          created_at: string
          daily_budget_cents: number
          id: string
          name: string
          objective: string
          platform: string
          status: string
          updated_at: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }
        Insert: {
          account_id: string
          created_at?: string
          daily_budget_cents?: number
          id: string
          name: string
          objective?: string
          platform: string
          status?: string
          updated_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          daily_budget_cents?: number
          id?: string
          name?: string
          objective?: string
          platform?: string
          status?: string
          updated_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_batches: {
        Row: {
          account_id: string
          attempts: number
          created_at: string
          cursor: number
          duplicate_count: number
          event_id: string
          id: string
          inserted_count: number
          last_error: string
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          options: Json
          payload: Json
          rejected: Json
          state: string
          updated_at: string
        }
        Insert: {
          account_id: string
          attempts?: number
          created_at?: string
          cursor?: number
          duplicate_count?: number
          event_id: string
          id: string
          inserted_count?: number
          last_error?: string
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          options?: Json
          payload: Json
          rejected?: Json
          state?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          attempts?: number
          created_at?: string
          cursor?: number
          duplicate_count?: number
          event_id?: string
          id?: string
          inserted_count?: number
          last_error?: string
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          options?: Json
          payload?: Json
          rejected?: Json
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health: {
        Row: {
          details: string
          last_checked_at: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          details?: string
          last_checked_at?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          details?: string
          last_checked_at?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_costs: {
        Row: {
          account_id: string
          amount_cents: number
          created_at: string
          ends_at: string
          group_id: string | null
          id: string
          starts_at: string
        }
        Insert: {
          account_id: string
          amount_cents?: number
          created_at?: string
          ends_at: string
          group_id?: string | null
          id: string
          starts_at: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          created_at?: string
          ends_at?: string
          group_id?: string | null
          id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_costs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_costs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          account_id: string
          ddd: string | null
          event_type: string
          group_id: string
          id: number
          occurred_at: string
          phone_hash: string | null
          source_event_key: string | null
        }
        Insert: {
          account_id: string
          ddd?: string | null
          event_type: string
          group_id: string
          id?: number
          occurred_at?: string
          phone_hash?: string | null
          source_event_key?: string | null
        }
        Update: {
          account_id?: string
          ddd?: string | null
          event_type?: string
          group_id?: string
          id?: number
          occurred_at?: string
          phone_hash?: string | null
          source_event_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_account_group"
            columns: ["account_id", "group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "lead_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_api_audit: {
        Row: {
          account_id: string
          checked_at: string
          details: Json
          id: string
          marketplace: string
          operation: string
          page_count: number
          rate_limit_remaining: number | null
          returned_count: number
          status: string
          total_available: number | null
        }
        Insert: {
          account_id: string
          checked_at?: string
          details?: Json
          id?: string
          marketplace: string
          operation: string
          page_count?: number
          rate_limit_remaining?: number | null
          returned_count?: number
          status: string
          total_available?: number | null
        }
        Update: {
          account_id?: string
          checked_at?: string
          details?: Json
          id?: string
          marketplace?: string
          operation?: string
          page_count?: number
          rate_limit_remaining?: number | null
          returned_count?: number
          status?: string
          total_available?: number | null
        }
        Relationships: []
      }
      marketplace_api_credentials: {
        Row: {
          account_id: string
          created_at: string
          credential_fields: Json
          credentials_enc: string
          id: string
          key_last4: string
          last_checked_at: string | null
          last_error: string
          marketplace: string
          nonce: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credential_fields?: Json
          credentials_enc: string
          id: string
          key_last4?: string
          last_checked_at?: string | null
          last_error?: string
          marketplace: string
          nonce: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credential_fields?: Json
          credentials_enc?: string
          id?: string
          key_last4?: string
          last_checked_at?: string | null
          last_error?: string
          marketplace?: string
          nonce?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_api_credentials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_connections: {
        Row: {
          access_token_enc: string
          account_id: string
          created_at: string
          expires_at: string
          external_user_id: string
          id: string
          last_error: string
          marketplace: string
          refresh_token_enc: string
          status: string
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          account_id: string
          created_at?: string
          expires_at: string
          external_user_id?: string
          id: string
          last_error?: string
          marketplace: string
          refresh_token_enc: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          account_id?: string
          created_at?: string
          expires_at?: string
          external_user_id?: string
          id?: string
          last_error?: string
          marketplace?: string
          refresh_token_enc?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_oauth_states: {
        Row: {
          account_id: string
          code_verifier_enc: string
          created_at: string
          expires_at: string
          state: string
        }
        Insert: {
          account_id: string
          code_verifier_enc: string
          created_at?: string
          expires_at: string
          state: string
        }
        Update: {
          account_id?: string
          code_verifier_enc?: string
          created_at?: string
          expires_at?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_oauth_states_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_rotation_state: {
        Row: {
          account_id: string
          consecutive_count: number
          group_id: string
          last_source: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          consecutive_count?: number
          group_id: string
          last_source?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          consecutive_count?: number
          group_id?: string
          last_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_rules: {
        Row: {
          account_id: string
          affiliate_tag: string
          conversion_endpoint: string
          id: string
          marketplace: string
          social_profile_url: string
          status: string
          subid_template: string
          updated_at: string
        }
        Insert: {
          account_id: string
          affiliate_tag?: string
          conversion_endpoint?: string
          id: string
          marketplace: string
          social_profile_url?: string
          status?: string
          subid_template?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          affiliate_tag?: string
          conversion_endpoint?: string
          id?: string
          marketplace?: string
          social_profile_url?: string
          status?: string
          subid_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_generation_jobs: {
        Row: {
          account_id: string
          attempts: number
          created_at: string
          duration_seconds: number
          external_task_id: string
          id: string
          kind: string
          last_error: string
          output_url: string
          prompt: string
          provider: string
          ratio: string
          render_token: string
          status: string
          storage_key: string
          style: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          attempts?: number
          created_at?: string
          duration_seconds?: number
          external_task_id?: string
          id: string
          kind: string
          last_error?: string
          output_url?: string
          prompt: string
          provider?: string
          ratio?: string
          render_token?: string
          status?: string
          storage_key?: string
          style?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          attempts?: number
          created_at?: string
          duration_seconds?: number
          external_task_id?: string
          id?: string
          kind?: string
          last_error?: string
          output_url?: string
          prompt?: string
          provider?: string
          ratio?: string
          render_token?: string
          status?: string
          storage_key?: string
          style?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_generation_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meli_notification_dispatch_state: {
        Row: {
          id: string
          last_scheduled_at: string
        }
        Insert: {
          id: string
          last_scheduled_at?: string
        }
        Update: {
          id?: string
          last_scheduled_at?: string
        }
        Relationships: []
      }
      meli_notification_events: {
        Row: {
          account_id: string | null
          actions: Json
          application_id: string
          attempts: number
          external_user_id: string
          id: number
          last_error: string | null
          last_received_at: string
          notification_key: string
          payload: Json
          processed_at: string | null
          processing_attempts: number
          provider_received_at: string | null
          received_at: string
          resource: string
          resource_snapshot: Json | null
          sent_at: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          actions?: Json
          application_id: string
          attempts?: number
          external_user_id: string
          id?: number
          last_error?: string | null
          last_received_at?: string
          notification_key: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number
          provider_received_at?: string | null
          received_at?: string
          resource: string
          resource_snapshot?: Json | null
          sent_at?: string | null
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          actions?: Json
          application_id?: string
          attempts?: number
          external_user_id?: string
          id?: number
          last_error?: string | null
          last_received_at?: string
          notification_key?: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number
          provider_received_at?: string | null
          received_at?: string
          resource?: string
          resource_snapshot?: Json | null
          sent_at?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meli_notification_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          account_id: string
          body: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          body: string
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_compliance_events: {
        Row: {
          account_id: string
          channel: string
          consent_recorded: boolean
          contact_hash: string
          created_at: string
          decision: string
          event_type: string
          id: string
          last_interaction_at: string | null
          metadata: Json
          promotional: boolean
          reason: string
        }
        Insert: {
          account_id: string
          channel: string
          consent_recorded?: boolean
          contact_hash?: string
          created_at?: string
          decision?: string
          event_type: string
          id: string
          last_interaction_at?: string | null
          metadata?: Json
          promotional?: boolean
          reason?: string
        }
        Update: {
          account_id?: string
          channel?: string
          consent_recorded?: boolean
          contact_hash?: string
          created_at?: string
          decision?: string
          event_type?: string
          id?: string
          last_interaction_at?: string | null
          metadata?: Json
          promotional?: boolean
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_compliance_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          account_id: string
          affiliate_url: string
          captured_count: number
          category_id: string | null
          created_at: string
          external_source_id: string | null
          id: string
          last_error: string
          last_run_at: string | null
          mode: string
          name: string
          source_authorized: boolean
          source_type: string
          source_url: string
          status: string
        }
        Insert: {
          account_id: string
          affiliate_url?: string
          captured_count?: number
          category_id?: string | null
          created_at?: string
          external_source_id?: string | null
          id: string
          last_error?: string
          last_run_at?: string | null
          mode?: string
          name: string
          source_authorized?: boolean
          source_type?: string
          source_url?: string
          status?: string
        }
        Update: {
          account_id?: string
          affiliate_url?: string
          captured_count?: number
          category_id?: string | null
          created_at?: string
          external_source_id?: string | null
          id?: string
          last_error?: string
          last_run_at?: string | null
          mode?: string
          name?: string
          source_authorized?: boolean
          source_type?: string
          source_url?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_monitors_account_category"
            columns: ["account_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "monitors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_builder_settings: {
        Row: {
          account_id: string
          ai_assist: boolean
          link_mode: string
          link_type: string
          message_template_id: string | null
          message_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          ai_assist?: boolean
          link_mode?: string
          link_type?: string
          message_template_id?: string | null
          message_type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          ai_assist?: boolean
          link_mode?: string
          link_type?: string
          message_template_id?: string | null
          message_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_builder_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_price_history: {
        Row: {
          account_id: string
          captured_at: string
          id: string
          offer_id: string
          original_price: number | null
          price: number
          source_reference: string | null
          source_type: string
          verified_at: string | null
        }
        Insert: {
          account_id: string
          captured_at?: string
          id: string
          offer_id: string
          original_price?: number | null
          price: number
          source_reference?: string | null
          source_type?: string
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          captured_at?: string
          id?: string
          offer_id?: string
          original_price?: number | null
          price?: number
          source_reference?: string | null
          source_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_price_history_tenant_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "offer_price_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_price_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          account_id: string
          affiliate_url: string
          canonical_offer_id: string | null
          category_id: string | null
          classification_confidence: number | null
          classification_reason: string | null
          classification_status: string
          classification_tags: Json
          coupon_code: string | null
          coupon_url: string | null
          created_at: string
          current_price: number
          detected_at: string
          discount_percent: number
          fingerprint: string | null
          id: string
          image_storage_key: string | null
          image_url: string | null
          imported_by: string
          message: string
          original_price: number | null
          price_average: number | null
          price_first_seen: number | null
          price_highest: number | null
          price_history_count: number
          price_lowest: number | null
          product_url: string | null
          radar_reasons: string | null
          radar_score: number
          radar_updated_at: string | null
          score: number
          source: string
          source_category: string | null
          source_monitor_id: string | null
          status: string
          storefront_visible: boolean
          subcategory: string | null
          title: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          account_id: string
          affiliate_url: string
          canonical_offer_id?: string | null
          category_id?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          classification_status?: string
          classification_tags?: Json
          coupon_code?: string | null
          coupon_url?: string | null
          created_at?: string
          current_price: number
          detected_at?: string
          discount_percent?: number
          fingerprint?: string | null
          id: string
          image_storage_key?: string | null
          image_url?: string | null
          imported_by?: string
          message?: string
          original_price?: number | null
          price_average?: number | null
          price_first_seen?: number | null
          price_highest?: number | null
          price_history_count?: number
          price_lowest?: number | null
          product_url?: string | null
          radar_reasons?: string | null
          radar_score?: number
          radar_updated_at?: string | null
          score?: number
          source: string
          source_category?: string | null
          source_monitor_id?: string | null
          status?: string
          storefront_visible?: boolean
          subcategory?: string | null
          title: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          account_id?: string
          affiliate_url?: string
          canonical_offer_id?: string | null
          category_id?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          classification_status?: string
          classification_tags?: Json
          coupon_code?: string | null
          coupon_url?: string | null
          created_at?: string
          current_price?: number
          detected_at?: string
          discount_percent?: number
          fingerprint?: string | null
          id?: string
          image_storage_key?: string | null
          image_url?: string | null
          imported_by?: string
          message?: string
          original_price?: number | null
          price_average?: number | null
          price_first_seen?: number | null
          price_highest?: number | null
          price_history_count?: number
          price_lowest?: number | null
          product_url?: string | null
          radar_reasons?: string | null
          radar_score?: number
          radar_updated_at?: string | null
          score?: number
          source?: string
          source_category?: string | null
          source_monitor_id?: string | null
          status?: string
          storefront_visible?: boolean
          subcategory?: string | null
          title?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_offer_tenant_monitor"
            columns: ["account_id", "source_monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "offers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_backups: {
        Row: {
          account_id: string
          bytes: number
          created_at: string
          id: string
          row_counts: Json
          sha256: string
          storage_key: string
        }
        Insert: {
          account_id: string
          bytes: number
          created_at?: string
          id: string
          row_counts: Json
          sha256: string
          storage_key: string
        }
        Update: {
          account_id?: string
          bytes?: number
          created_at?: string
          id?: string
          row_counts?: Json
          sha256?: string
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_backups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          account_id: string
          created_at: string
          id: string
          identity_verified_at: string | null
          notes: string
          request_type: string
          requester_email: string
          resolution_notes: string
          resolved_at: string | null
          status: string
          subject_hash: string
          subject_scope: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id: string
          identity_verified_at?: string | null
          notes?: string
          request_type: string
          requester_email: string
          resolution_notes?: string
          resolved_at?: string | null
          status?: string
          subject_hash?: string
          subject_scope?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          identity_verified_at?: string | null
          notes?: string
          request_type?: string
          requester_email?: string
          resolution_notes?: string
          resolved_at?: string | null
          status?: string
          subject_hash?: string
          subject_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_groups: {
        Row: {
          account_id: string
          capacity: number
          category_id: string | null
          created_at: string
          external_id: string | null
          id: string
          invite_url: string
          joined_24h: number
          lead_cost_cents: number
          left_24h: number
          marketplace_subids: Json
          members: number
          name: string
          platform: string
          status: string
          whatsapp_destination_type: string
        }
        Insert: {
          account_id: string
          capacity?: number
          category_id?: string | null
          created_at?: string
          external_id?: string | null
          id: string
          invite_url?: string
          joined_24h?: number
          lead_cost_cents?: number
          left_24h?: number
          marketplace_subids?: Json
          members?: number
          name: string
          platform?: string
          status?: string
          whatsapp_destination_type?: string
        }
        Update: {
          account_id?: string
          capacity?: number
          category_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          invite_url?: string
          joined_24h?: number
          lead_cost_cents?: number
          left_24h?: number
          marketplace_subids?: Json
          members?: number
          name?: string
          platform?: string
          status?: string
          whatsapp_destination_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_groups_account_category"
            columns: ["account_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "promo_groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_scheduler_settings: {
        Row: {
          account_id: string
          batch_size: number
          enabled: boolean
          interval_minutes: number
          last_result: Json
          last_run_at: string | null
          last_source: string | null
          next_turn_at: string
          source_config: Json
          source_order: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          batch_size?: number
          enabled?: boolean
          interval_minutes?: number
          last_result?: Json
          last_run_at?: string | null
          last_source?: string | null
          next_turn_at?: string
          source_config?: Json
          source_order?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          batch_size?: number
          enabled?: boolean
          interval_minutes?: number
          last_result?: Json
          last_run_at?: string | null
          last_source?: string | null
          next_turn_at?: string
          source_config?: Json
          source_order?: Json
          updated_at?: string
        }
        Relationships: []
      }
      publications: {
        Row: {
          account_id: string
          attempts: number
          batch_category_id: string | null
          batch_id: string | null
          clicks: number
          connection_id: string | null
          content_type: string
          created_at: string
          dispatch_token: string | null
          eligibility_policy_version: string
          error_message: string | null
          external_message_id: string | null
          group_id: string
          id: string
          idempotency_key: string | null
          image_storage_key: string | null
          image_url: string | null
          last_attempt_at: string | null
          mention_all: boolean
          message: string
          mode: string
          next_attempt_at: string | null
          offer_id: string | null
          priority: number
          published_at: string | null
          schedule_id: string | null
          scheduled_at: string | null
          status: string
          telegram_connection_id: string | null
        }
        Insert: {
          account_id: string
          attempts?: number
          batch_category_id?: string | null
          batch_id?: string | null
          clicks?: number
          connection_id?: string | null
          content_type?: string
          created_at?: string
          dispatch_token?: string | null
          eligibility_policy_version?: string
          error_message?: string | null
          external_message_id?: string | null
          group_id: string
          id: string
          idempotency_key?: string | null
          image_storage_key?: string | null
          image_url?: string | null
          last_attempt_at?: string | null
          mention_all?: boolean
          message?: string
          mode?: string
          next_attempt_at?: string | null
          offer_id?: string | null
          priority?: number
          published_at?: string | null
          schedule_id?: string | null
          scheduled_at?: string | null
          status?: string
          telegram_connection_id?: string | null
        }
        Update: {
          account_id?: string
          attempts?: number
          batch_category_id?: string | null
          batch_id?: string | null
          clicks?: number
          connection_id?: string | null
          content_type?: string
          created_at?: string
          dispatch_token?: string | null
          eligibility_policy_version?: string
          error_message?: string | null
          external_message_id?: string | null
          group_id?: string
          id?: string
          idempotency_key?: string | null
          image_storage_key?: string | null
          image_url?: string | null
          last_attempt_at?: string | null
          mention_all?: boolean
          message?: string
          mode?: string
          next_attempt_at?: string | null
          offer_id?: string | null
          priority?: number
          published_at?: string | null
          schedule_id?: string | null
          scheduled_at?: string | null
          status?: string
          telegram_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_publication_tenant_schedule"
            columns: ["account_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_publication_tenant_telegram"
            columns: ["account_id", "telegram_connection_id"]
            isOneToOne: false
            referencedRelation: "telegram_connections"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_publication_tenant_whatsapp"
            columns: ["account_id", "connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_publications_account_group"
            columns: ["account_id", "group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "fk_publications_account_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "publications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_telegram_connection_id_fkey"
            columns: ["telegram_connection_id"]
            isOneToOne: false
            referencedRelation: "telegram_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          account_id: string
          category_id: string | null
          created_at: string
          end_time: string
          id: string
          interval_minutes: number
          link_preview: boolean
          mention_all: boolean
          name: string
          priority_mode: string
          start_time: string
          status: string
        }
        Insert: {
          account_id: string
          category_id?: string | null
          created_at?: string
          end_time?: string
          id: string
          interval_minutes?: number
          link_preview?: boolean
          mention_all?: boolean
          name: string
          priority_mode?: string
          start_time?: string
          status?: string
        }
        Update: {
          account_id?: string
          category_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          interval_minutes?: number
          link_preview?: boolean
          mention_all?: boolean
          name?: string
          priority_mode?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_queues_account_category"
            columns: ["account_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "queues_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_ai_control: {
        Row: {
          id: string
          paused_until: string | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          id: string
          paused_until?: string | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          paused_until?: string | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      radar_ai_copy_cache: {
        Row: {
          cache_key: string
          created_at: string
          model: string
          result: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          model?: string
          result: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          model?: string
          result?: Json
        }
        Relationships: []
      }
      radar_ai_insights: {
        Row: {
          account_id: string
          created_at: string
          id: string
          kind: string
          model: string
          reference_id: string | null
          result: Json
        }
        Insert: {
          account_id: string
          created_at?: string
          id: string
          kind: string
          model?: string
          reference_id?: string | null
          result?: Json
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          kind?: string
          model?: string
          reference_id?: string | null
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "radar_ai_insights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_gemini_throttle: {
        Row: {
          id: string
          next_slot_at: string
          updated_at: string
        }
        Insert: {
          id: string
          next_slot_at: string
          updated_at?: string
        }
        Update: {
          id?: string
          next_slot_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      radar_gemini_usage: {
        Row: {
          actor_id: string | null
          cached_tokens: number
          created_at: string
          duration_ms: number
          error_code: string | null
          http_status: number | null
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          purpose: string
          request_id: string
          status: string
          step: number
          total_tokens: number
        }
        Insert: {
          actor_id?: string | null
          cached_tokens?: number
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          http_status?: number | null
          id: string
          input_tokens?: number
          model: string
          output_tokens?: number
          purpose?: string
          request_id: string
          status: string
          step?: number
          total_tokens?: number
        }
        Update: {
          actor_id?: string | null
          cached_tokens?: number
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          purpose?: string
          request_id?: string
          status?: string
          step?: number
          total_tokens?: number
        }
        Relationships: []
      }
      schedules: {
        Row: {
          account_id: string
          created_at: string
          group_id: string | null
          id: string
          last_error: string
          last_run_at: string | null
          message: string
          name: string
          next_run_at: string | null
          once_date: string | null
          recurrence: string
          scheduler_task_id: string | null
          send_time: string
          status: string
          weekday: number
        }
        Insert: {
          account_id: string
          created_at?: string
          group_id?: string | null
          id: string
          last_error?: string
          last_run_at?: string | null
          message: string
          name: string
          next_run_at?: string | null
          once_date?: string | null
          recurrence?: string
          scheduler_task_id?: string | null
          send_time?: string
          status?: string
          weekday?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          last_error?: string
          last_run_at?: string | null
          message?: string
          name?: string
          next_run_at?: string | null
          once_date?: string | null
          recurrence?: string
          scheduler_task_id?: string | null
          send_time?: string
          status?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_schedules_account_group"
            columns: ["account_id", "group_id"]
            isOneToOne: false
            referencedRelation: "promo_groups"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "schedules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          account_id: string
          created_at: string
          details: Json
          event_type: string
          id: number
          severity: string
        }
        Insert: {
          account_id: string
          created_at?: string
          details?: Json
          event_type: string
          id?: number
          severity?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: number
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shopee_category_api_validation: {
        Row: {
          account_id: string
          category_id: string
          category_level: number
          category_name: string
          full_name: string
          last_checked_at: string | null
          last_error: string
          matched_count: number
          sample_count: number
          updated_at: string
          validation_status: string
        }
        Insert: {
          account_id: string
          category_id: string
          category_level?: number
          category_name?: string
          full_name?: string
          last_checked_at?: string | null
          last_error?: string
          matched_count?: number
          sample_count?: number
          updated_at?: string
          validation_status?: string
        }
        Update: {
          account_id?: string
          category_id?: string
          category_level?: number
          category_name?: string
          full_name?: string
          last_checked_at?: string | null
          last_error?: string
          matched_count?: number
          sample_count?: number
          updated_at?: string
          validation_status?: string
        }
        Relationships: []
      }
      shopee_discovery_cursors: {
        Row: {
          account_id: string
          discovery_key: string
          last_has_next_page: boolean
          last_page_count: number
          next_page: number
          pages_completed: number
          sort_type: number
          updated_at: string
        }
        Insert: {
          account_id: string
          discovery_key: string
          last_has_next_page?: boolean
          last_page_count?: number
          next_page?: number
          pages_completed?: number
          sort_type: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          discovery_key?: string
          last_has_next_page?: boolean
          last_page_count?: number
          next_page?: number
          pages_completed?: number
          sort_type?: number
          updated_at?: string
        }
        Relationships: []
      }
      shopee_video_drafts: {
        Row: {
          account_id: string
          caption: string
          created_at: string
          id: string
          platform: string
          product_image_url: string
          product_title: string
          product_url: string
          publication_enabled: boolean
          script: string
          status: string
          updated_at: string
          video_asset_url: string
        }
        Insert: {
          account_id: string
          caption?: string
          created_at?: string
          id: string
          platform?: string
          product_image_url?: string
          product_title: string
          product_url: string
          publication_enabled?: boolean
          script?: string
          status?: string
          updated_at?: string
          video_asset_url?: string
        }
        Update: {
          account_id?: string
          caption?: string
          created_at?: string
          id?: string
          platform?: string
          product_image_url?: string
          product_title?: string
          product_url?: string
          publication_enabled?: boolean
          script?: string
          status?: string
          updated_at?: string
          video_asset_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopee_video_drafts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_autopilot_settings: {
        Row: {
          account_id: string
          auto_generate: boolean
          channels: Json
          end_time: string
          interval_minutes: number
          last_run_at: string | null
          max_posts_per_day: number
          min_score: number
          require_approval: boolean
          start_time: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          account_id: string
          auto_generate?: boolean
          channels?: Json
          end_time?: string
          interval_minutes?: number
          last_run_at?: string | null
          max_posts_per_day?: number
          min_score?: number
          require_approval?: boolean
          start_time?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          auto_generate?: boolean
          channels?: Json
          end_time?: string
          interval_minutes?: number
          last_run_at?: string | null
          max_posts_per_day?: number
          min_score?: number
          require_approval?: boolean
          start_time?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_autopilot_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          account_id: string
          capabilities: Json
          created_at: string
          display_name: string
          external_id: string
          id: string
          last_error: string
          network: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          capabilities?: Json
          created_at?: string
          display_name?: string
          external_id?: string
          id: string
          last_error?: string
          network: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          capabilities?: Json
          created_at?: string
          display_name?: string
          external_id?: string
          id?: string
          last_error?: string
          network?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          account_id: string
          affiliate_url: string
          attempts: number
          channel: string
          clicks: number
          created_at: string
          external_id: string
          id: string
          idempotency_key: string
          image_job_id: string | null
          image_storage_key: string | null
          image_url: string
          last_error: string
          message: string
          next_attempt_at: string | null
          offer_id: string
          provider: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          affiliate_url: string
          attempts?: number
          channel: string
          clicks?: number
          created_at?: string
          external_id?: string
          id: string
          idempotency_key: string
          image_job_id?: string | null
          image_storage_key?: string | null
          image_url: string
          last_error?: string
          message: string
          next_attempt_at?: string | null
          offer_id: string
          provider?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          affiliate_url?: string
          attempts?: number
          channel?: string
          clicks?: number
          created_at?: string
          external_id?: string
          id?: string
          idempotency_key?: string
          image_job_id?: string | null
          image_storage_key?: string | null
          image_url?: string
          last_error?: string
          message?: string
          next_attempt_at?: string | null
          offer_id?: string
          provider?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_social_posts_tenant_offer"
            columns: ["account_id", "offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["account_id", "id"]
          },
          {
            foreignKeyName: "social_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      standalone_scheduled_jobs: {
        Row: {
          attempts: number
          event_key: string
          id: string
          payload: Json
          route: string
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          event_key: string
          id: string
          payload?: Json
          route: string
          run_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          event_key?: string
          id?: string
          payload?: Json
          route?: string
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      storefront_settings: {
        Row: {
          account_id: string
          collshp_url: string
          description: string
          logo_url: string
          primary_color: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          collshp_url?: string
          description?: string
          logo_url?: string
          primary_color?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          collshp_url?: string
          description?: string
          logo_url?: string
          primary_color?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string
          provider_customer_id: string
          provider_subscription_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          current_period_end?: string | null
          id: string
          plan?: string
          provider?: string
          provider_customer_id?: string
          provider_subscription_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string
          provider_customer_id?: string
          provider_subscription_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_connections: {
        Row: {
          account_id: string
          bot_id: string
          bot_username: string
          created_at: string
          failure_count: number
          id: string
          last_seen_at: string | null
          name: string
          priority: number
          secret_slot: number
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          bot_id: string
          bot_username?: string
          created_at?: string
          failure_count?: number
          id: string
          last_seen_at?: string | null
          name: string
          priority?: number
          secret_slot?: number
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          bot_id?: string
          bot_username?: string
          created_at?: string
          failure_count?: number
          id?: string
          last_seen_at?: string | null
          name?: string
          priority?: number
          secret_slot?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_studio_projects: {
        Row: {
          account_id: string
          caption: string
          content_type: string
          created_at: string
          duration_seconds: number
          id: string
          image_url: string
          last_error: string
          offer_id: string | null
          original_price_cents: number | null
          price_cents: number | null
          product_source: string
          product_title: string
          product_url: string
          script: string
          size_bytes: number
          status: string
          storage_key: string
          template: string
          updated_at: string
          youtube_published_at: string | null
          youtube_video_id: string
          youtube_video_url: string
        }
        Insert: {
          account_id: string
          caption?: string
          content_type?: string
          created_at?: string
          duration_seconds?: number
          id: string
          image_url?: string
          last_error?: string
          offer_id?: string | null
          original_price_cents?: number | null
          price_cents?: number | null
          product_source?: string
          product_title: string
          product_url?: string
          script?: string
          size_bytes?: number
          status?: string
          storage_key?: string
          template?: string
          updated_at?: string
          youtube_published_at?: string | null
          youtube_video_id?: string
          youtube_video_url?: string
        }
        Update: {
          account_id?: string
          caption?: string
          content_type?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          image_url?: string
          last_error?: string
          offer_id?: string | null
          original_price_cents?: number | null
          price_cents?: number | null
          product_source?: string
          product_title?: string
          product_url?: string
          script?: string
          size_bytes?: number
          status?: string
          storage_key?: string
          template?: string
          updated_at?: string
          youtube_published_at?: string | null
          youtube_video_id?: string
          youtube_video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_studio_projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          account_id: string
          action: string
          created_at: string
          error_message: string | null
          event_key: string
          id: number
          item_count: number
          processed_at: string | null
          provider: string
          response: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          action: string
          created_at?: string
          error_message?: string | null
          event_key: string
          id?: number
          item_count?: number
          processed_at?: string | null
          provider: string
          response?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          action?: string
          created_at?: string
          error_message?: string | null
          event_key?: string
          id?: number
          item_count?: number
          processed_at?: string | null
          provider?: string
          response?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          account_id: string
          created_at: string
          external_id: string
          failure_count: number
          group_messaging_supported: boolean
          id: string
          interval_seconds: number
          last_dispatch_sequence: number
          last_dispatched_at: string | null
          last_seen_at: string | null
          last_verified_at: string | null
          name: string
          phone_number: string
          priority: number
          provider: string
          status: string
          verified_groups: Json
        }
        Insert: {
          account_id: string
          created_at?: string
          external_id?: string
          failure_count?: number
          group_messaging_supported?: boolean
          id: string
          interval_seconds?: number
          last_dispatch_sequence?: number
          last_dispatched_at?: string | null
          last_seen_at?: string | null
          last_verified_at?: string | null
          name: string
          phone_number?: string
          priority?: number
          provider?: string
          status?: string
          verified_groups?: Json
        }
        Update: {
          account_id?: string
          created_at?: string
          external_id?: string
          failure_count?: number
          group_messaging_supported?: boolean
          id?: string
          interval_seconds?: number
          last_dispatch_sequence?: number
          last_dispatched_at?: string | null
          last_seen_at?: string | null
          last_verified_at?: string | null
          name?: string
          phone_number?: string
          priority?: number
          provider?: string
          status?: string
          verified_groups?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_connections: {
        Row: {
          access_token_enc: string
          account_id: string
          channel_id: string
          channel_title: string
          created_at: string
          expires_at: string
          last_error: string
          refresh_token_enc: string
          scope: string
          status: string
          updated_at: string
        }
        Insert: {
          access_token_enc: string
          account_id: string
          channel_id?: string
          channel_title?: string
          created_at?: string
          expires_at: string
          last_error?: string
          refresh_token_enc: string
          scope?: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_enc?: string
          account_id?: string
          channel_id?: string
          channel_title?: string
          created_at?: string
          expires_at?: string
          last_error?: string
          refresh_token_enc?: string
          scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_oauth_states: {
        Row: {
          account_id: string
          created_at: string
          state: string
        }
        Insert: {
          account_id: string
          created_at?: string
          state: string
        }
        Update: {
          account_id?: string
          created_at?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_oauth_states_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
