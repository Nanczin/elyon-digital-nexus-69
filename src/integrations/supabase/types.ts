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
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_automatic: boolean
          lesson_id: string | null
          member_area_id: string | null
          module_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_automatic?: boolean
          lesson_id?: string | null
          member_area_id?: string | null
          module_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compras: {
        Row: {
          acesso_expira_em: string | null
          cliente_documento: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string | null
          email_entrega_id: string | null
          entregavel_enviado: boolean | null
          entregavel_enviado_em: string | null
          id: string
          mercadopago_order_id: string | null
          mercadopago_payment_id: string
          metodo_pagamento: string | null
          moeda: string | null
          password: string | null
          produto_id: string | null
          status_pagamento: string
          updated_at: string | null
          username: string | null
          valor_pago: number
          webhook_payload: Json | null
        }
        Insert: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email: string
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago: number
          webhook_payload?: Json | null
        }
        Update: {
          acesso_expira_em?: string | null
          cliente_documento?: string | null
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string | null
          email_entrega_id?: string | null
          entregavel_enviado?: boolean | null
          entregavel_enviado_em?: string | null
          id?: string
          mercadopago_order_id?: string | null
          mercadopago_payment_id?: string
          metodo_pagamento?: string | null
          moeda?: string | null
          password?: string | null
          produto_id?: string | null
          status_pagamento?: string
          updated_at?: string | null
          username?: string | null
          valor_pago?: number
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_digitais"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_history: {
        Row: {
          action_type: string
          changes: Json
          checkout_id: string
          created_at: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          changes?: Json
          checkout_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          changes?: Json
          checkout_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_history_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkouts: {
        Row: {
          amount: number | null
          created_at: string
          form_fields: Json | null
          id: string
          integrations: Json | null
          layout: string
          member_area_id: string | null
          name: string | null
          order_bumps: Json | null
          payment_methods: Json | null
          price: number
          product_id: string
          promotional_price: number | null
          styles: Json | null
          support_contact: Json | null
          timer: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price: number
          product_id: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          form_fields?: Json | null
          id?: string
          integrations?: Json | null
          layout?: string
          member_area_id?: string | null
          name?: string | null
          order_bumps?: Json | null
          payment_methods?: Json | null
          price?: number
          product_id?: string
          promotional_price?: number | null
          styles?: Json | null
          support_contact?: Json | null
          timer?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          cpf: string | null
          email: string
          id: string
          last_purchase: string | null
          name: string
          phone: string | null
          purchase_count: number | null
          status: string | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cpf?: string | null
          email: string
          id?: string
          last_purchase?: string | null
          name: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cpf?: string | null
          email?: string
          id?: string
          last_purchase?: string | null
          name?: string
          phone?: string | null
          purchase_count?: number | null
          status?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          created_at: string
          id: string
          mercado_pago_access_token: string | null
          mercado_pago_token_public: string | null
          meta_pixel_id: string | null
          smtp_config: Json | null
          updated_at: string
          user_id: string
          utmify_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id: string
          utmify_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_token_public?: string | null
          meta_pixel_id?: string | null
          smtp_config?: Json | null
          updated_at?: string
          user_id?: string
          utmify_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          status: string
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          status?: string
          text_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          status?: string
          text_content?: string | null
          title?: string
          updated_at?: string
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
      logs_entrega: {
        Row: {
          assunto: string | null
          compra_id: string | null
          created_at: string | null
          destinatario: string
          erro_mensagem: string | null
          id: string
          status: string
          tentativa_numero: number | null
          tipo: string
        }
        Insert: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario: string
          erro_mensagem?: string | null
          id?: string
          status: string
          tentativa_numero?: number | null
          tipo: string
        }
        Update: {
          assunto?: string | null
          compra_id?: string | null
          created_at?: string | null
          destinatario?: string
          erro_mensagem?: string | null
          id?: string
          status?: string
          tentativa_numero?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_entrega_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
      member_access: {
        Row: {
          access_granted_at: string
          created_at: string
          id: string
          is_active: boolean
          member_area_id: string | null
          module_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_area_id?: string | null
          module_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_access_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_areas: {
        Row: {
          associated_products: string[] | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          associated_products?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      modules: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          member_area_id: string
          order_index: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_area_id: string
          order_index?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_area_id?: string
          order_index?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          payment_id: string | null
          product_id: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_id: string
          created_at: string
          date: string
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          payment_method: string | null
          payment_url: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          payment_method?: string | null
          payment_url?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          colors: Json | null
          created_at: string
          global_font_family: string | null
          id: string
          logo_url: string | null
          login_subtitle: string | null
          login_title: string | null
          member_area_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          colors?: Json | null
          created_at?: string
          global_font_family?: string | null
          id?: string
          logo_url?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          member_area_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_access: {
        Row: {
          access_granted_at: string
          created_at: string | null
          id: string
          payment_id: string | null
          product_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          access_granted_at?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_deliveries: {
        Row: {
          created_at: string | null
          error_message: string | null
          gmail_account_id: string | null
          id: string
          purchase_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          gmail_account_id?: string | null
          id?: string
          purchase_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "product_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          access_sent: boolean | null
          access_sent_at: string | null
          amount: number
          created_at: string | null
          customer_email: string
          customer_name: string
          id: string
          password: string | null
          payment_id: string
          payment_status: string
          product_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount: number
          created_at?: string | null
          customer_email: string
          customer_name: string
          id?: string
          password?: string | null
          payment_id: string
          payment_status: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount?: number
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          id?: string
          password?: string | null
          payment_id?: string
          payment_status?: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          access_url: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          email_template: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          member_area_id: string | null
          member_area_link: string | null
          name: string
          price: number
          price_original: number | null
          project_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name: string
          price: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email_template?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          member_area_id?: string | null
          member_area_link?: string | null
          name?: string
          price?: number
          price_original?: number | null
          project_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          login_url: string | null
          member_area_id: string | null
          name: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          login_url?: string | null
          member_area_id?: string | null
          name?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          access_url: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_url: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_url?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      produtos_digitais: {
        Row: {
          acesso_expira_em: number | null
          arquivo_url: string | null
          created_at: string | null
          descricao: string | null
          email_assunto: string
          email_template: string
          gerar_credenciais: boolean | null
          id: string
          instrucoes_acesso: string | null
          is_active: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at: string | null
          url_acesso: string | null
        }
        Insert: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome: string
          preco: number
          tipo_entregavel: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Update: {
          acesso_expira_em?: number | null
          arquivo_url?: string | null
          created_at?: string | null
          descricao?: string | null
          email_assunto?: string
          email_template?: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome?: string
          preco?: number
          tipo_entregavel?: string
          updated_at?: string | null
          url_acesso?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          checkout_id: string | null
          commission_amount: number | null
          created_at: string
          customer_id: string | null
          id: string
          net_amount: number | null
          order_bumps: Json | null
          payment_id: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string
          quantity: number | null
          selected_package: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          commission_amount?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          net_amount?: number | null
          order_bumps?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          selected_package?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      is_admin_of_member_area: {
        Args: {
          p_member_area_id: string
        }
        Returns: boolean
      }
      log_checkout_changes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      process_completed_sale: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_customer_stats: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: string
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

export interface DeliverableConfig {
  type: 'none' | 'link' | 'upload';
  link?: string | null;
  fileUrl?: string | null; // For uploaded files
  name?: string | null;
  description?: string | null;
}

export interface PackageConfig {
  id: number;
  name: string;
  description: string;
  topics: string[];
  price: number; // in Reais
  originalPrice: number; // in Reais
  mostSold?: boolean;
  associatedProductIds?: string[] | null; // Changed to array
  deliverable?: DeliverableConfig; // New: Package-specific deliverable
}

export interface GuaranteeConfig {
  enabled: boolean;
  days: number;
  description: string;
}

export interface ReservedRightsConfig {
  enabled: boolean;
  text: string;
}

export interface EmailConfig {
  email: string;
  appPassword: string;
  displayName: string;
  host?: string;
  port?: string;
  secure?: boolean;
  provider?: string;
}