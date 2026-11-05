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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          entity: string
          entity_id: string | null
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          created_by?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          automatic: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          max_uses_per_customer: number | null
          name: string
          plan: Database["public"]["Enums"]["plan_tier"] | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          automatic?: boolean
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_customer?: number | null
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          automatic?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_customer?: number | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"] | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          amount_cents: number | null
          created_at: string
          granted_at: string | null
          id: string
          notes: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          purchased_at: string | null
          source: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          granted_at?: string | null
          id?: string
          notes?: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          purchased_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          granted_at?: string | null
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          purchased_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          last_viewed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          last_viewed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          last_viewed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json
          created_at: string
          id: string
          module_id: string
          published: boolean
          sort_order: number
          summary: string | null
          title: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          module_id: string
          published?: boolean
          sort_order?: number
          summary?: string | null
          title: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          module_id?: string
          published?: boolean
          sort_order?: number
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          published: boolean
          required_plan: Database["public"]["Enums"]["plan_tier"]
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          required_plan?: Database["public"]["Enums"]["plan_tier"]
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          required_plan?: Database["public"]["Enums"]["plan_tier"]
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json
          payment_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json
          payment_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          label: string
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          label: string
          provider?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          label?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          coupon_id: string | null
          created_at: string
          discount_cents: number
          final_cents: number
          gateway: string
          gateway_tx_id: string | null
          id: string
          metadata: Json
          paid_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          final_cents: number
          gateway?: string
          gateway_tx_id?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          final_cents?: number
          gateway?: string
          gateway_tx_id?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          access_info: string | null
          active: boolean
          badge: string | null
          checkout_url: string | null
          cta_label: string | null
          description: string | null
          featured: boolean
          features: Json
          name: string
          price_cents: number | null
          slug: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          access_info?: string | null
          active?: boolean
          badge?: string | null
          checkout_url?: string | null
          cta_label?: string | null
          description?: string | null
          featured?: boolean
          features?: Json
          name: string
          price_cents?: number | null
          slug: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          access_info?: string | null
          active?: boolean
          badge?: string | null
          checkout_url?: string | null
          cta_label?: string | null
          description?: string | null
          featured?: boolean
          features?: Json
          name?: string
          price_cents?: number | null
          slug?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_course_access: {
        Args: {
          _plan: Database["public"]["Enums"]["plan_tier"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lesson_outline: {
        Args: never
        Returns: {
          id: string
          module_id: string
          sort_order: number
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      enrollment_status:
        | "pending"
        | "active"
        | "blocked"
        | "refunded"
        | "canceled"
      plan_tier: "basic" | "pro"
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
    Enums: {
      app_role: ["admin", "user"],
      enrollment_status: [
        "pending",
        "active",
        "blocked",
        "refunded",
        "canceled",
      ],
      plan_tier: ["basic", "pro"],
    },
  },
} as const
