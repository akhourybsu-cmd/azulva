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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      custom_deals: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_sources: {
        Row: {
          affiliate_supported: boolean
          api_supported: boolean
          base_url: string | null
          created_at: string
          enabled: boolean
          id: string
          name: string
          notes: string | null
          slug: string
          source_type: string
          trust_level: string
          updated_at: string
        }
        Insert: {
          affiliate_supported?: boolean
          api_supported?: boolean
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          notes?: string | null
          slug: string
          source_type: string
          trust_level?: string
          updated_at?: string
        }
        Update: {
          affiliate_supported?: boolean
          api_supported?: boolean
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          notes?: string | null
          slug?: string
          source_type?: string
          trust_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batch_rows: {
        Row: {
          batch_id: string
          created_at: string
          created_deal_id: string | null
          id: string
          message: string | null
          raw_data: Json | null
          row_number: number
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_deal_id?: string | null
          id?: string
          message?: string | null
          raw_data?: Json | null
          row_number: number
          status: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_deal_id?: string | null
          id?: string
          message?: string | null
          raw_data?: Json | null
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          duplicate_count: number
          error_count: number
          filename: string | null
          id: string
          imported_count: number
          mode: string
          status: string
          summary: Json
          total_rows: number
          uploaded_by: string | null
          warning_count: number
        }
        Insert: {
          created_at?: string
          duplicate_count?: number
          error_count?: number
          filename?: string | null
          id?: string
          imported_count?: number
          mode?: string
          status?: string
          summary?: Json
          total_rows?: number
          uploaded_by?: string | null
          warning_count?: number
        }
        Update: {
          created_at?: string
          duplicate_count?: number
          error_count?: number
          filename?: string | null
          id?: string
          imported_count?: number
          mode?: string
          status?: string
          summary?: Json
          total_rows?: number
          uploaded_by?: string | null
          warning_count?: number
        }
        Relationships: []
      }
      outbound_clicks: {
        Row: {
          affiliate_url: string | null
          created_at: string
          deal_id: string
          departure_airport: string | null
          destination_id: string | null
          id: string
          outbound_url: string | null
          referrer: string | null
          source: string | null
          source_id: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_url?: string | null
          created_at?: string
          deal_id: string
          departure_airport?: string | null
          destination_id?: string | null
          id?: string
          outbound_url?: string | null
          referrer?: string | null
          source?: string | null
          source_id?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_url?: string | null
          created_at?: string
          deal_id?: string
          departure_airport?: string | null
          destination_id?: string | null
          id?: string
          outbound_url?: string | null
          referrer?: string | null
          source?: string | null
          source_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_clicks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "deal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          captured_at: string
          captured_by: string
          captured_by_user: string | null
          currency: string
          deal_id: string
          departure_airport: string | null
          destination_slug: string | null
          end_date: string | null
          flight_included: boolean | null
          id: string
          nights: number | null
          notes: string | null
          price_per_person: number
          resort_name: string | null
          source_id: string | null
          source_url: string | null
          start_date: string | null
        }
        Insert: {
          captured_at?: string
          captured_by?: string
          captured_by_user?: string | null
          currency?: string
          deal_id: string
          departure_airport?: string | null
          destination_slug?: string | null
          end_date?: string | null
          flight_included?: boolean | null
          id?: string
          nights?: number | null
          notes?: string | null
          price_per_person: number
          resort_name?: string | null
          source_id?: string | null
          source_url?: string | null
          start_date?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string
          captured_by_user?: string | null
          currency?: string
          deal_id?: string
          departure_airport?: string | null
          destination_slug?: string | null
          end_date?: string | null
          flight_included?: boolean | null
          id?: string
          nights?: number | null
          notes?: string | null
          price_per_person?: number
          resort_name?: string | null
          source_id?: string | null
          source_url?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "deal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          home_airport: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_airport?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_airport?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_deals: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_destinations: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_room_deals: {
        Row: {
          added_at: string
          added_by: string
          deal_id: string
          id: string
          room_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          deal_id: string
          id?: string
          room_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          deal_id?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_room_deals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trip_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_room_destination_votes: {
        Row: {
          comment: string | null
          created_at: string
          destination_id: string
          id: string
          room_id: string
          updated_at: string
          user_id: string
          vote_type: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          destination_id: string
          id?: string
          room_id: string
          updated_at?: string
          user_id: string
          vote_type: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          destination_id?: string
          id?: string
          room_id?: string
          updated_at?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: []
      }
      trip_room_destinations: {
        Row: {
          added_by: string
          created_at: string
          destination_id: string
          id: string
          room_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          destination_id: string
          id?: string
          room_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          destination_id?: string
          id?: string
          room_id?: string
        }
        Relationships: []
      }
      trip_room_members: {
        Row: {
          display_name: string | null
          id: string
          joined_at: string
          preferences: Json
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          joined_at?: string
          preferences?: Json
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          joined_at?: string
          preferences?: Json
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trip_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_room_votes: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          room_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          id?: string
          room_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          room_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_room_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trip_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_rooms: {
        Row: {
          created_at: string
          data: Json
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          invite_code: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
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
      has_admin_role: {
        Args: { _required: string; _user?: string }
        Returns: boolean
      }
      is_admin: { Args: { _user?: string }; Returns: boolean }
      is_trip_member: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      join_trip_room_by_code: {
        Args: { _code: string; _display_name?: string }
        Returns: string
      }
    }
    Enums: {
      admin_role: "owner" | "admin" | "editor" | "viewer"
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
      admin_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
