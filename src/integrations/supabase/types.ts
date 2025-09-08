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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      produto: {
        Row: {
          contato: string
          data_alteracao: string | null
          data_insercao: string
          descricao: string
          id: number
          municipio: string
          nome: string
          quantidade: number
          tipo_produto_id: number
          tipo_transacao_id: number | null
          uf: string
          usuario_id: number
        }
        Insert: {
          contato: string
          data_alteracao?: string | null
          data_insercao: string
          descricao: string
          id?: number
          municipio: string
          nome: string
          quantidade: number
          tipo_produto_id: number
          tipo_transacao_id?: number | null
          uf: string
          usuario_id: number
        }
        Update: {
          contato?: string
          data_alteracao?: string | null
          data_insercao?: string
          descricao?: string
          id?: number
          municipio?: string
          nome?: string
          quantidade?: number
          tipo_produto_id?: number
          tipo_transacao_id?: number | null
          uf?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "produto_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipo_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_tipo_transacao_id_fkey"
            columns: ["tipo_transacao_id"]
            isOneToOne: false
            referencedRelation: "tipo_transacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_foto: {
        Row: {
          data_insercao: string | null
          foto: string
          id: number
          produto_id: number
        }
        Insert: {
          data_insercao?: string | null
          foto: string
          id?: number
          produto_id: number
        }
        Update: {
          data_insercao?: string | null
          foto?: string
          id?: number
          produto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "produto_foto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      situacao: {
        Row: {
          data_insercao: string | null
          id: number
          nome: string
        }
        Insert: {
          data_insercao?: string | null
          id?: number
          nome: string
        }
        Update: {
          data_insercao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipo_produto: {
        Row: {
          data_insercao: string
          id: number
          nome: string
        }
        Insert: {
          data_insercao: string
          id?: number
          nome: string
        }
        Update: {
          data_insercao?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      tipo_transacao: {
        Row: {
          data_insercao: string
          id: number
          nome: string
        }
        Insert: {
          data_insercao: string
          id?: number
          nome: string
        }
        Update: {
          data_insercao?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      usuario: {
        Row: {
          data_cadastro: string
          email: string
          id: number
          nome: string
          preferencias: string | null
          senha: string
          token_ativo: boolean | null
          user_id: string | null
        }
        Insert: {
          data_cadastro: string
          email: string
          id?: number
          nome: string
          preferencias?: string | null
          senha: string
          token_ativo?: boolean | null
          user_id?: string | null
        }
        Update: {
          data_cadastro?: string
          email?: string
          id?: number
          nome?: string
          preferencias?: string | null
          senha?: string
          token_ativo?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_can_access_produto: {
        Args: { produto_usuario_id: number }
        Returns: boolean
      }
      current_user_can_access_produto_foto: {
        Args: { foto_produto_id: number }
        Returns: boolean
      }
      migrate_existing_usuarios: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      verify_user_login: {
        Args: { user_email: string }
        Returns: {
          email: string
          id: number
          nome: string
          senha: string
          token_ativo: boolean
        }[]
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
    Enums: {},
  },
} as const
