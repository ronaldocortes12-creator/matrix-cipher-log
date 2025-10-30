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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_data_collection_status: {
        Row: {
          coin_id: string
          created_at: string
          current_days: number
          id: string
          last_successful_update: string | null
          last_update_attempt: string | null
          newest_date: string | null
          oldest_date: string | null
          retry_count: number
          status: string
          symbol: string
          target_days: number
          updated_at: string
        }
        Insert: {
          coin_id: string
          created_at?: string
          current_days?: number
          id?: string
          last_successful_update?: string | null
          last_update_attempt?: string | null
          newest_date?: string | null
          oldest_date?: string | null
          retry_count?: number
          status?: string
          symbol: string
          target_days?: number
          updated_at?: string
        }
        Update: {
          coin_id?: string
          created_at?: string
          current_days?: number
          id?: string
          last_successful_update?: string | null
          last_update_attempt?: string | null
          newest_date?: string | null
          oldest_date?: string | null
          retry_count?: number
          status?: string
          symbol?: string
          target_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      crypto_historical_prices: {
        Row: {
          closing_price: number
          coin_id: string
          created_at: string | null
          date: string
          id: string
          symbol: string
        }
        Insert: {
          closing_price: number
          coin_id: string
          created_at?: string | null
          date: string
          id?: string
          symbol: string
        }
        Update: {
          closing_price?: number
          coin_id?: string
          created_at?: string | null
          date?: string
          id?: string
          symbol?: string
        }
        Relationships: []
      }
      crypto_market_cap: {
        Row: {
          coin_id: string
          created_at: string | null
          date: string
          id: string
          market_cap: number
          market_cap_change: number | null
          symbol: string
        }
        Insert: {
          coin_id: string
          created_at?: string | null
          date: string
          id?: string
          market_cap: number
          market_cap_change?: number | null
          symbol: string
        }
        Update: {
          coin_id?: string
          created_at?: string | null
          date?: string
          id?: string
          market_cap?: number
          market_cap_change?: number | null
          symbol?: string
        }
        Relationships: []
      }
      crypto_probabilities: {
        Row: {
          ath_date: string | null
          calculation_date: string
          coin_id: string
          created_at: string | null
          current_price: number | null
          direction: string
          final_probability: number
          ic_95_high: number | null
          ic_95_low: number | null
          id: string
          market_cap_component: number
          max_ath: number | null
          min_365d: number | null
          mu_cripto: number | null
          price_component: number
          probability_percentage: number
          sigma_cripto: number | null
          symbol: string
          validation_status: string | null
        }
        Insert: {
          ath_date?: string | null
          calculation_date?: string
          coin_id: string
          created_at?: string | null
          current_price?: number | null
          direction: string
          final_probability: number
          ic_95_high?: number | null
          ic_95_low?: number | null
          id?: string
          market_cap_component: number
          max_ath?: number | null
          min_365d?: number | null
          mu_cripto?: number | null
          price_component: number
          probability_percentage: number
          sigma_cripto?: number | null
          symbol: string
          validation_status?: string | null
        }
        Update: {
          ath_date?: string | null
          calculation_date?: string
          coin_id?: string
          created_at?: string | null
          current_price?: number | null
          direction?: string
          final_probability?: number
          ic_95_high?: number | null
          ic_95_low?: number | null
          id?: string
          market_cap_component?: number
          max_ath?: number | null
          min_365d?: number | null
          mu_cripto?: number | null
          price_component?: number
          probability_percentage?: number
          sigma_cripto?: number | null
          symbol?: string
          validation_status?: string | null
        }
        Relationships: []
      }
      data_integrity_reports: {
        Row: {
          completion_percentage: number
          created_at: string
          cryptos_complete: number
          cryptos_incomplete: number
          details: Json
          execution_time_ms: number | null
          id: string
          report_date: string
          status: string
          total_cryptos: number
        }
        Insert: {
          completion_percentage: number
          created_at?: string
          cryptos_complete: number
          cryptos_incomplete: number
          details: Json
          execution_time_ms?: number | null
          id?: string
          report_date: string
          status: string
          total_cryptos: number
        }
        Update: {
          completion_percentage?: number
          created_at?: string
          cryptos_complete?: number
          cryptos_incomplete?: number
          details?: Json
          execution_time_ms?: number | null
          id?: string
          report_date?: string
          status?: string
          total_cryptos?: number
        }
        Relationships: []
      }
      global_crypto_market_cap: {
        Row: {
          created_at: string
          daily_change_pct: number | null
          date: string
          id: string
          total_market_cap: number
        }
        Insert: {
          created_at?: string
          daily_change_pct?: number | null
          date: string
          id?: string
          total_market_cap: number
        }
        Update: {
          created_at?: string
          daily_change_pct?: number | null
          date?: string
          id?: string
          total_market_cap?: number
        }
        Relationships: []
      }
      interaction_blocks: {
        Row: {
          block_category: string | null
          block_tags: string[] | null
          block_type: string
          created_at: string | null
          deleted_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          module_id: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          block_category?: string | null
          block_tags?: string[] | null
          block_type: string
          created_at?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          block_category?: string | null
          block_tags?: string[] | null
          block_type?: string
          created_at?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_blocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "jeff_wu_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      jeff_wu_modules: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          module_data: Json | null
          module_name: string
          module_type: Database["public"]["Enums"]["module_type"]
          order_index: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          module_data?: Json | null
          module_name: string
          module_type: Database["public"]["Enums"]["module_type"]
          order_index?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          module_data?: Json | null
          module_name?: string
          module_type?: Database["public"]["Enums"]["module_type"]
          order_index?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_day: number
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_day: number
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_day?: number
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string | null
          id: string
          lesson_number: number
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_number: number
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_number?: number
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_cap_history: {
        Row: {
          created_at: string | null
          date: string
          id: string
          market_cap_change: number | null
          total_market_cap: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          market_cap_change?: number | null
          total_market_cap: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          market_cap_change?: number | null
          total_market_cap?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          age: number | null
          avatar_url: string | null
          created_at: string | null
          crypto_experience: string | null
          deleted_at: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          last_login_at: string | null
          metadata: Json | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          crypto_experience?: string | null
          deleted_at?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          crypto_experience?: string | null
          deleted_at?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          action_data: Json | null
          action_name: string
          block_id: string | null
          deleted_at: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          ip_address: unknown
          metadata: Json | null
          module_id: string | null
          result_data: Json | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_name: string
          block_id?: string | null
          deleted_at?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          ip_address?: unknown
          metadata?: Json | null
          module_id?: string | null
          result_data?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_name?: string
          block_id?: string | null
          deleted_at?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          ip_address?: unknown
          metadata?: Json | null
          module_id?: string | null
          result_data?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "interaction_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "jeff_wu_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          has_seen_welcome: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          has_seen_welcome?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          has_seen_welcome?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          ended_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          metadata: Json | null
          session_token: string
          started_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          metadata?: Json | null
          session_token: string
          started_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          metadata?: Json | null
          session_token?: string
          started_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backend_health_check: { Args: never; Returns: Json }
      create_user_session: {
        Args: {
          p_device_info?: Json
          p_ip_address?: unknown
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      soft_delete_user: { Args: { target_user_id: string }; Returns: boolean }
      update_session_activity: {
        Args: { p_session_token: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status:
        | "active"
        | "inactive"
        | "suspended"
        | "pending_verification"
      app_role: "admin" | "moderator" | "user"
      interaction_type:
        | "view"
        | "click"
        | "input"
        | "submit"
        | "navigation"
        | "error"
        | "success"
      module_type:
        | "lesson"
        | "chat"
        | "market"
        | "dashboard"
        | "crypto_analysis"
        | "portfolio"
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
      account_status: [
        "active",
        "inactive",
        "suspended",
        "pending_verification",
      ],
      app_role: ["admin", "moderator", "user"],
      interaction_type: [
        "view",
        "click",
        "input",
        "submit",
        "navigation",
        "error",
        "success",
      ],
      module_type: [
        "lesson",
        "chat",
        "market",
        "dashboard",
        "crypto_analysis",
        "portfolio",
      ],
    },
  },
} as const
