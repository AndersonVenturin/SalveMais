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
      avaliacao_produto: {
        Row: {
          avaliacao: number
          data_cadastro: string
          data_transacao: string
          historico_transacao_id: number
          id: number
          observacao: string | null
          produto_id: number
          usuario_destino_id: number
          usuario_origem_id: number
        }
        Insert: {
          avaliacao: number
          data_cadastro?: string
          data_transacao: string
          historico_transacao_id: number
          id?: never
          observacao?: string | null
          produto_id: number
          usuario_destino_id: number
          usuario_origem_id: number
        }
        Update: {
          avaliacao?: number
          data_cadastro?: string
          data_transacao?: string
          historico_transacao_id?: number
          id?: never
          observacao?: string | null
          produto_id?: number
          usuario_destino_id?: number
          usuario_origem_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_produto_historico_transacao_id_fkey"
            columns: ["historico_transacao_id"]
            isOneToOne: false
            referencedRelation: "historico_transacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_produto_usuario_destino_id_fkey"
            columns: ["usuario_destino_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_produto_usuario_origem_id_fkey"
            columns: ["usuario_origem_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_usuario: {
        Row: {
          avaliacao: number
          data_cadastro: string
          historico_transacao_id: number
          id: number
          observacao: string | null
          usuario_avaliado_id: number
          usuario_origem_id: number
        }
        Insert: {
          avaliacao: number
          data_cadastro?: string
          historico_transacao_id: number
          id?: never
          observacao?: string | null
          usuario_avaliado_id: number
          usuario_origem_id: number
        }
        Update: {
          avaliacao?: number
          data_cadastro?: string
          historico_transacao_id?: number
          id?: never
          observacao?: string | null
          usuario_avaliado_id?: number
          usuario_origem_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_usuario_historico_transacao_id_fkey"
            columns: ["historico_transacao_id"]
            isOneToOne: false
            referencedRelation: "historico_transacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_usuario_usuario_avaliado_id_fkey"
            columns: ["usuario_avaliado_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_usuario_usuario_origem_id_fkey"
            columns: ["usuario_origem_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_transacao: {
        Row: {
          data_cadastro: string
          data_transacao: string | null
          id: number
          observacao: string | null
          observacao_resposta: string | null
          produto_id: number
          produto_troca_id: number | null
          situacao_id: number
          tipo_transacao_id: number
          usuario_destino_id: number
          usuario_origem_id: number
        }
        Insert: {
          data_cadastro: string
          data_transacao?: string | null
          id?: number
          observacao?: string | null
          observacao_resposta?: string | null
          produto_id: number
          produto_troca_id?: number | null
          situacao_id: number
          tipo_transacao_id: number
          usuario_destino_id: number
          usuario_origem_id: number
        }
        Update: {
          data_cadastro?: string
          data_transacao?: string | null
          id?: number
          observacao?: string | null
          observacao_resposta?: string | null
          produto_id?: number
          produto_troca_id?: number | null
          situacao_id?: number
          tipo_transacao_id?: number
          usuario_destino_id?: number
          usuario_origem_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_transacao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_transacao_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_transacao_tipo_transacao_id_fkey"
            columns: ["tipo_transacao_id"]
            isOneToOne: false
            referencedRelation: "tipo_transacao"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_lida: {
        Row: {
          data_leitura: string
          historico_transacao_id: number
          id: number
          usuario_id: number
        }
        Insert: {
          data_leitura?: string
          historico_transacao_id: number
          id?: number
          usuario_id: number
        }
        Update: {
          data_leitura?: string
          historico_transacao_id?: number
          id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_notificacao_lida_historico_transacao"
            columns: ["historico_transacao_id"]
            isOneToOne: false
            referencedRelation: "historico_transacao"
            referencedColumns: ["id"]
          },
        ]
      }
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
        }
        Insert: {
          data_cadastro: string
          email: string
          id?: number
          nome: string
          preferencias?: string | null
          senha: string
          token_ativo?: boolean | null
        }
        Update: {
          data_cadastro?: string
          email?: string
          id?: number
          nome?: string
          preferencias?: string | null
          senha?: string
          token_ativo?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_avaliacao: {
        Args: {
          p_avaliacao_produto: number
          p_avaliacao_usuario: number
          p_data_transacao: string
          p_historico_transacao_id: number
          p_observacao_produto: string
          p_observacao_usuario: string
          p_produto_id: number
          p_user_email: string
          p_usuario_destino_id: number
          p_usuario_origem_id: number
        }
        Returns: undefined
      }
      current_user_can_access_produto: {
        Args: { produto_usuario_id: number }
        Returns: boolean
      }
      current_user_can_access_produto_foto: {
        Args: { foto_produto_id: number }
        Returns: boolean
      }
      get_avaliacoes_usuario: {
        Args: { p_historico_ids: number[]; p_user_email: string }
        Returns: {
          avaliacao: number
          data_cadastro: string
          historico_transacao_id: number
          id: number
          observacao: string | null
          usuario_avaliado_id: number
          usuario_origem_id: number
        }[]
        SetofOptions: {
          from: "*"
          to: "avaliacao_usuario"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      migrate_existing_usuarios: { Args: never; Returns: undefined }
      set_user_context: { Args: { user_email: string }; Returns: undefined }
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
