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
      athletes: {
        Row: {
          country_code: string
          country_flag: string
          created_at: string
          full_name: string
          id: string
          team: string | null
        }
        Insert: {
          country_code?: string
          country_flag?: string
          created_at?: string
          full_name: string
          id?: string
          team?: string | null
        }
        Update: {
          country_code?: string
          country_flag?: string
          created_at?: string
          full_name?: string
          id?: string
          team?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meet_id: string | null
          placement: Database["public"]["Enums"]["banner_placement"]
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meet_id?: string | null
          placement?: Database["public"]["Enums"]["banner_placement"]
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meet_id?: string | null
          placement?: Database["public"]["Enums"]["banner_placement"]
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_meet_id_fkey"
            columns: ["meet_id"]
            isOneToOne: false
            referencedRelation: "meets"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          meet_id: string | null
          mux_asset_id: string | null
          mux_playback_id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          meet_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          meet_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_meet_id_fkey"
            columns: ["meet_id"]
            isOneToOne: false
            referencedRelation: "meets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_entries: {
        Row: {
          athlete_id: string
          event_id: string
          id: string
          is_pb: boolean
          place: number | null
          result: string | null
        }
        Insert: {
          athlete_id: string
          event_id: string
          id?: string
          is_pb?: boolean
          place?: number | null
          result?: string | null
        }
        Update: {
          athlete_id?: string
          event_id?: string
          id?: string
          is_pb?: boolean
          place?: number | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_entries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rankings: {
        Row: {
          event_id: string
          id: string
          ranked_athlete_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          ranked_athlete_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          ranked_athlete_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rankings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          gender: Database["public"]["Enums"]["event_gender"]
          id: string
          meet_id: string
          name: string
          round: string | null
          scheduled_time: string | null
          sort_order: number
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          created_at?: string
          gender?: Database["public"]["Enums"]["event_gender"]
          id?: string
          meet_id: string
          name: string
          round?: string | null
          scheduled_time?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          created_at?: string
          gender?: Database["public"]["Enums"]["event_gender"]
          id?: string
          meet_id?: string
          name?: string
          round?: string | null
          scheduled_time?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "events_meet_id_fkey"
            columns: ["meet_id"]
            isOneToOne: false
            referencedRelation: "meets"
            referencedColumns: ["id"]
          },
        ]
      }
      meets: {
        Row: {
          broadcast_partner: string | null
          broadcast_url: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string
          end_date: string | null
          hero_image_url: string | null
          id: string
          location: string
          name: string
          slug: string
          start_date: string
          status: Database["public"]["Enums"]["meet_status"]
          updated_at: string
          venue: string
        }
        Insert: {
          broadcast_partner?: string | null
          broadcast_url?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string
          end_date?: string | null
          hero_image_url?: string | null
          id?: string
          location?: string
          name: string
          slug: string
          start_date: string
          status?: Database["public"]["Enums"]["meet_status"]
          updated_at?: string
          venue?: string
        }
        Update: {
          broadcast_partner?: string | null
          broadcast_url?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string
          end_date?: string | null
          hero_image_url?: string | null
          id?: string
          location?: string
          name?: string
          slug?: string
          start_date?: string
          status?: Database["public"]["Enums"]["meet_status"]
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          author_id: string | null
          body: string
          cover_image_url: string
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["work_status"]
          summary: string
          tags: string[] | null
          title: string
          updated_at: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          author_id?: string | null
          body?: string
          cover_image_url?: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["work_status"]
          summary?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_image_url?: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["work_status"]
          summary?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "works_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_event_pick_counts: {
        Args: { meet_id_param: string }
        Returns: {
          event_id: string
          pick_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
      banner_placement: "homepage" | "meet"
      event_gender: "men" | "women" | "mixed"
      event_status: "scheduled" | "in_progress" | "complete"
      meet_status: "draft" | "upcoming" | "live" | "archived"
      work_status: "draft" | "published" | "archived"
      work_type: "short" | "work" | "feature"
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
      app_role: ["admin", "viewer"],
      banner_placement: ["homepage", "meet"],
      event_gender: ["men", "women", "mixed"],
      event_status: ["scheduled", "in_progress", "complete"],
      meet_status: ["draft", "upcoming", "live", "archived"],
      work_status: ["draft", "published", "archived"],
      work_type: ["short", "work", "feature"],
    },
  },
} as const
