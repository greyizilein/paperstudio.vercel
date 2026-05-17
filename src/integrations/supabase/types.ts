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
      admin_emails: {
        Row: {
          body: string
          created_at: string
          id: string
          sent_count: number
          subject: string
          to_email: string
          to_tier: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sent_count?: number
          subject: string
          to_email: string
          to_tier?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sent_count?: number
          subject?: string
          to_email?: string
          to_tier?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action: string
          created_at: string
          estimated_cost_usd: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          tier: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          tier?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      chapter_figures: {
        Row: {
          chapter_id: string
          created_at: string
          description: string
          figure_id: string
          figure_number: string
          id: string
          image_data_uri: string
          source_line: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string
          figure_id: string
          figure_number?: string
          id?: string
          image_data_uri: string
          source_line?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string
          figure_id?: string
          figure_number?: string
          id?: string
          image_data_uri?: string
          source_line?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          cleaned_data_profile: Json | null
          content: string | null
          created_at: string
          draft_config: Json | null
          id: string
          order_index: number
          project_id: string
          revision_count: number
          status: string
          supervisor_revisions: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
          word_count_actual: number | null
          word_count_target: number | null
        }
        Insert: {
          cleaned_data_profile?: Json | null
          content?: string | null
          created_at?: string
          draft_config?: Json | null
          id?: string
          order_index?: number
          project_id: string
          revision_count?: number
          status?: string
          supervisor_revisions?: Json | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          word_count_actual?: number | null
          word_count_target?: number | null
        }
        Update: {
          cleaned_data_profile?: Json | null
          content?: string | null
          created_at?: string
          draft_config?: Json | null
          id?: string
          order_index?: number
          project_id?: string
          revision_count?: number
          status?: string
          supervisor_revisions?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          word_count_actual?: number | null
          word_count_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      czar_artifacts: {
        Row: {
          created_at: string
          data_uri: string | null
          file_path: string | null
          id: string
          kind: string
          label: string
          message_id: string
          size_bytes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data_uri?: string | null
          file_path?: string | null
          id?: string
          kind: string
          label?: string
          message_id: string
          size_bytes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          data_uri?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          label?: string
          message_id?: string
          size_bytes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "czar_artifacts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "czar_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      czar_conversation_files: {
        Row: {
          conversation_id: string
          created_at: string
          extracted_text: string
          filename: string
          id: string
          mime: string
          original_size: number
          role: string
          storage_path: string | null
          summary: string | null
          user_id: string
          was_summarized: boolean
          word_count: number
        }
        Insert: {
          conversation_id: string
          created_at?: string
          extracted_text?: string
          filename: string
          id?: string
          mime?: string
          original_size?: number
          role?: string
          storage_path?: string | null
          summary?: string | null
          user_id: string
          was_summarized?: boolean
          word_count?: number
        }
        Update: {
          conversation_id?: string
          created_at?: string
          extracted_text?: string
          filename?: string
          id?: string
          mime?: string
          original_size?: number
          role?: string
          storage_path?: string | null
          summary?: string | null
          user_id?: string
          was_summarized?: boolean
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "czar_conversation_files_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "czar_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      czar_conversations: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_user_message: string | null
          metadata: Json
          pinned: boolean
          renamed: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_user_message?: string | null
          metadata?: Json
          pinned?: boolean
          renamed?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_user_message?: string | null
          metadata?: Json
          pinned?: boolean
          renamed?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      czar_file_cache: {
        Row: {
          created_at: string
          extracted_text: string
          filename: string
          mime: string
          original_size: number
          storage_path: string
          user_id: string
          was_summarized: boolean
          word_count: number
        }
        Insert: {
          created_at?: string
          extracted_text?: string
          filename?: string
          mime?: string
          original_size?: number
          storage_path: string
          user_id: string
          was_summarized?: boolean
          word_count?: number
        }
        Update: {
          created_at?: string
          extracted_text?: string
          filename?: string
          mime?: string
          original_size?: number
          storage_path?: string
          user_id?: string
          was_summarized?: boolean
          word_count?: number
        }
        Relationships: []
      }
      czar_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          model_used: string | null
          role: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          model_used?: string | null
          role: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          model_used?: string | null
          role?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "czar_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "czar_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      czar_subscriptions: {
        Row: {
          bonus_used: number
          bonus_words: number
          created_at: string
          expires_at: string | null
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
          word_limit: number
          words_used: number
        }
        Insert: {
          bonus_used?: number
          bonus_words?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
          word_limit?: number
          words_used?: number
        }
        Update: {
          bonus_used?: number
          bonus_words?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          word_limit?: number
          words_used?: number
        }
        Relationships: []
      }
      document_corrections: {
        Row: {
          annotations: Json
          conversation_id: string | null
          corrected_blocks: Json
          corrected_html: string
          correction_summary: string | null
          created_at: string
          id: string
          original_filename: string
          original_format: string
          original_storage_path: string
          parsed_blocks: Json
          parsed_text: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annotations?: Json
          conversation_id?: string | null
          corrected_blocks?: Json
          corrected_html?: string
          correction_summary?: string | null
          created_at?: string
          id?: string
          original_filename: string
          original_format?: string
          original_storage_path: string
          parsed_blocks?: Json
          parsed_text?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annotations?: Json
          conversation_id?: string | null
          corrected_blocks?: Json
          corrected_html?: string
          correction_summary?: string | null
          created_at?: string
          id?: string
          original_filename?: string
          original_format?: string
          original_storage_path?: string
          parsed_blocks?: Json
          parsed_text?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_generation_attempts: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          figure_id: string | null
          figure_title: string | null
          id: string
          job_id: string | null
          model: string | null
          request_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          figure_id?: string | null
          figure_title?: string | null
          id?: string
          job_id?: string | null
          model?: string | null
          request_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          figure_id?: string | null
          figure_title?: string | null
          id?: string
          job_id?: string | null
          model?: string | null
          request_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_generation_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "image_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      image_jobs: {
        Row: {
          colour_scheme: string | null
          completed: number
          created_at: string
          error: string | null
          figures: Json
          id: string
          project_id: string | null
          project_title: string
          request_id: string | null
          result_filename: string | null
          result_zip_b64: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          colour_scheme?: string | null
          completed?: number
          created_at?: string
          error?: string | null
          figures?: Json
          id?: string
          project_id?: string | null
          project_title?: string
          request_id?: string | null
          result_filename?: string | null
          result_zip_b64?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          colour_scheme?: string | null
          completed?: number
          created_at?: string
          error?: string | null
          figures?: Json
          id?: string
          project_id?: string | null
          project_title?: string
          request_id?: string | null
          result_filename?: string | null
          result_zip_b64?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_number: string | null
          alt_email: string | null
          avatar_url: string | null
          bank_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          notification_prefs: Json | null
          phone_number: string | null
          preferred_model: string | null
          referral_code: string | null
          settings_json: Json | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          alt_email?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          notification_prefs?: Json | null
          phone_number?: string | null
          preferred_model?: string | null
          referral_code?: string | null
          settings_json?: Json | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          alt_email?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          notification_prefs?: Json | null
          phone_number?: string | null
          preferred_model?: string | null
          referral_code?: string | null
          settings_json?: Json | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          ai_model: string | null
          citation_style: string | null
          created_at: string
          data_collection_method: string | null
          degree: string | null
          field_of_study: string | null
          framework_justification: string | null
          id: string
          include_hypotheses: boolean
          language_level: number | null
          language_style: string | null
          research_framework: string | null
          research_methodology: string | null
          research_objectives: Json | null
          research_questions: Json | null
          sample_size: number | null
          sampling_technique: string | null
          status: string
          title: string
          university: string | null
          updated_at: string
          user_id: string
          voice_profile: string | null
          word_count: number | null
          writing_mode: string | null
        }
        Insert: {
          ai_model?: string | null
          citation_style?: string | null
          created_at?: string
          data_collection_method?: string | null
          degree?: string | null
          field_of_study?: string | null
          framework_justification?: string | null
          id?: string
          include_hypotheses?: boolean
          language_level?: number | null
          language_style?: string | null
          research_framework?: string | null
          research_methodology?: string | null
          research_objectives?: Json | null
          research_questions?: Json | null
          sample_size?: number | null
          sampling_technique?: string | null
          status?: string
          title: string
          university?: string | null
          updated_at?: string
          user_id: string
          voice_profile?: string | null
          word_count?: number | null
          writing_mode?: string | null
        }
        Update: {
          ai_model?: string | null
          citation_style?: string | null
          created_at?: string
          data_collection_method?: string | null
          degree?: string | null
          field_of_study?: string | null
          framework_justification?: string | null
          id?: string
          include_hypotheses?: boolean
          language_level?: number | null
          language_style?: string | null
          research_framework?: string | null
          research_methodology?: string | null
          research_objectives?: Json | null
          research_questions?: Json | null
          sample_size?: number | null
          sampling_technique?: string | null
          status?: string
          title?: string
          university?: string | null
          updated_at?: string
          user_id?: string
          voice_profile?: string | null
          word_count?: number | null
          writing_mode?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          max_uses: number | null
          owner_email: string
          owner_id: string | null
          reward_description: string | null
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          max_uses?: number | null
          owner_email: string
          owner_id?: string | null
          reward_description?: string | null
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          max_uses?: number | null
          owner_email?: string
          owner_id?: string | null
          reward_description?: string | null
          uses_count?: number
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          commission_usd: number
          created_at: string
          id: string
          payment_amount_usd: number
          payment_reference: string | null
          referee_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_usd?: number
          created_at?: string
          id?: string
          payment_amount_usd?: number
          payment_reference?: string | null
          referee_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_usd?: number
          created_at?: string
          id?: string
          payment_amount_usd?: number
          payment_reference?: string | null
          referee_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      referral_payouts: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount_ngn: number
          amount_usd: number
          bank_name: string | null
          completed_at: string | null
          created_at: string
          exchange_rate: number | null
          failure_reason: string | null
          id: string
          paystack_recipient_code: string | null
          paystack_transfer_code: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount_ngn: number
          amount_usd: number
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          exchange_rate?: number | null
          failure_reason?: string | null
          id?: string
          paystack_recipient_code?: string | null
          paystack_transfer_code?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount_ngn?: number
          amount_usd?: number
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          exchange_rate?: number | null
          failure_reason?: string | null
          id?: string
          paystack_recipient_code?: string | null
          paystack_transfer_code?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          payment_amount: number | null
          payment_reference: string | null
          payment_tier: string | null
          referral_code_id: string
          referred_email: string | null
          referred_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_tier?: string | null
          referral_code_id: string
          referred_email?: string | null
          referred_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_tier?: string | null
          referral_code_id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_wallets: {
        Row: {
          balance_usd: number
          created_at: string
          lifetime_earned_usd: number
          pending_usd: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          lifetime_earned_usd?: number
          pending_usd?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          lifetime_earned_usd?: number
          pending_usd?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
          word_limit: number
          words_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
          word_limit?: number
          words_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          word_limit?: number
          words_used?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_completed_projects: { Args: { _user_id: string }; Returns: number }
      credit_referral_commission: {
        Args: { _amount_usd: number; _payment_ref: string; _referee_id: string }
        Returns: Json
      }
      deduct_wallet_for_payout: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      get_user_subscription: {
        Args: { _user_id: string }
        Returns: {
          status: string
          tier: string
          word_limit: number
          words_used: number
        }[]
      }
      increment_czar_words_used: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      increment_words_used: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      refund_wallet_after_failed_payout: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
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
