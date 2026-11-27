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
      contact_requests: {
        Row: {
          created_at: string
          email: string
          escola: string
          id: string
          mensagem: string | null
          nome: string
          notas: string | null
          status: Database["public"]["Enums"]["contact_request_status"]
          submitted_by: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          escola: string
          id?: string
          mensagem?: string | null
          nome: string
          notas?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"]
          submitted_by?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          escola?: string
          id?: string
          mensagem?: string | null
          nome?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"]
          submitted_by?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          locked_until: string | null
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          locked_until?: string | null
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          locked_until?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      otp_send_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ano_escolar: string | null
          avatar_url: string | null
          created_at: string
          disciplinas_favoritas: string[] | null
          email: string | null
          estilo_explicacao: string | null
          frequencia_estudo: string | null
          id: string
          nome: string | null
          objetivo_estudo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_escolar?: string | null
          avatar_url?: string | null
          created_at?: string
          disciplinas_favoritas?: string[] | null
          email?: string | null
          estilo_explicacao?: string | null
          frequencia_estudo?: string | null
          id?: string
          nome?: string | null
          objetivo_estudo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_escolar?: string | null
          avatar_url?: string | null
          created_at?: string
          disciplinas_favoritas?: string[] | null
          email?: string | null
          estilo_explicacao?: string | null
          frequencia_estudo?: string | null
          id?: string
          nome?: string | null
          objetivo_estudo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_clients: {
        Row: {
          contact_request_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_request_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_request_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_clients_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: false
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      account_suspensions: {
        Row: {
          reason: string | null
          suspended_at: string
          suspended_by: string | null
          user_id: string
        }
        Insert: {
          reason?: string | null
          suspended_at?: string
          suspended_by?: string | null
          user_id: string
        }
        Update: {
          reason?: string | null
          suspended_at?: string
          suspended_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          device_id: string
          device_label: string | null
          last_seen: string
          started_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          device_label?: string | null
          last_seen?: string
          started_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          device_label?: string | null
          last_seen?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      known_devices: {
        Row: {
          device_id: string
          device_label: string | null
          first_seen: string
          last_seen: string
          user_id: string
        }
        Insert: {
          device_id: string
          device_label?: string | null
          first_seen?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          device_id?: string
          device_label?: string | null
          first_seen?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      session_events: {
        Row: {
          created_at: string
          device_id: string | null
          device_label: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_label?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_label?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_premium_cache: {
        Row: {
          checked_at: string
          premium: boolean
          user_id: string
        }
        Insert: {
          checked_at?: string
          premium: boolean
          user_id: string
        }
        Update: {
          checked_at?: string
          premium?: boolean
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          done: string[]
          id: string
          plan: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: string[]
          id?: string
          plan: Json
          user_id: string
        }
        Update: {
          created_at?: string
          done?: string[]
          id?: string
          plan?: Json
          user_id?: string
        }
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          created_at: string
          difficulty: string | null
          exercise_text: string | null
          has_image: boolean
          id: string
          mode: string
          result: Json | null
          school_year: string | null
          subject: string | null
          subtopic: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          exercise_text?: string | null
          has_image?: boolean
          id?: string
          mode: string
          result?: Json | null
          school_year?: string | null
          subject?: string | null
          subtopic?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          exercise_text?: string | null
          has_image?: boolean
          id?: string
          mode?: string
          result?: Json | null
          school_year?: string | null
          subject?: string | null
          subtopic?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      manual_premium_members: {
        Row: {
          granted_at: string
          granted_by: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      school_premium_members: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          school_client_id: string
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          school_client_id: string
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          school_client_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_premium_members_school_client_id_fkey"
            columns: ["school_client_id"]
            isOneToOne: false
            referencedRelation: "school_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          current_subject: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivo: string | null
          requested_subject: string
          status: Database["public"]["Enums"]["subject_change_status"]
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          current_subject: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          motivo?: string | null
          requested_subject: string
          status?: Database["public"]["Enums"]["subject_change_status"]
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          current_subject?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          motivo?: string | null
          requested_subject?: string
          status?: Database["public"]["Enums"]["subject_change_status"]
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          cooldown_until: string | null
          created_at: string
          id: string
          question_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cooldown_until?: string | null
          created_at?: string
          id?: string
          question_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cooldown_until?: string | null
          created_at?: string
          id?: string
          question_count?: number
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_school_premium: { Args: { _user_id: string }; Returns: boolean }
      is_premium_user: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      contact_request_status:
        | "Novo"
        | "Em análise"
        | "Contactado"
        | "Convertido"
        | "Rejeitado"
      subject_change_status: "Pendente" | "Aprovado" | "Rejeitado"
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
      app_role: ["admin", "moderator", "user"],
      contact_request_status: [
        "Novo",
        "Em análise",
        "Contactado",
        "Convertido",
        "Rejeitado",
      ],
      subject_change_status: ["Pendente", "Aprovado", "Rejeitado"],
    },
  },
} as const
