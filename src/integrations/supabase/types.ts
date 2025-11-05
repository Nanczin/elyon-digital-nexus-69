export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DeliverableConfig = {
  type: 'none' | 'link' | 'upload';
  link?: string | null;
  fileUrl?: string | null;
  name?: string | null; // Adicionado nome para o entregável
  description?: string | null; // Adicionado descrição para o entregável
};

// Novo tipo para a configuração de um pacote
export type PackageConfig = {
  id: number;
  name: string;
  description: string;
  topics: string[];
  price: number;
  originalPrice: number;
  mostSold: boolean;
};

// Novo tipo para a configuração de garantia
export type GuaranteeConfig = {
  enabled: boolean;
  days: number;
  description: string;
};

// Novo tipo para a configuração de direitos reservados
export type ReservedRightsConfig = {
  enabled: boolean;
  text: string;
};

// Interface simplificada para a configuração de e-mail
export interface EmailConfig {
  email: string; // O e-mail que será usado como remetente e usuário SMTP
  appPassword: string; // A senha do aplicativo (ou senha SMTP)
  displayName: string; // O nome que aparecerá como remetente
  // Campos SMTP padrão, que serão preenchidos automaticamente ou usados como fallback
  host?: string;
  port?: string;
  secure?: boolean;
}

export type FormFields = {
  requireName?: boolean;
  requireEmail?: boolean;
  requireEmailConfirm?: boolean;
  requirePhone?: boolean;
  requireCpf?: boolean;
  packages?: PackageConfig[]; // Usar o novo tipo PackageConfig[]
  guarantee?: GuaranteeConfig; // Usar o novo tipo GuaranteeConfig
  reservedRights?: ReservedRightsConfig; // Usar o novo tipo ReservedRightsConfig
  deliverable?: DeliverableConfig | null; // Adicionado tipo DeliverableConfig
  sendTransactionalEmail?: boolean; // Adicionado para controlar o envio de e-mail transacional
  transactionalEmailSubject?: string; // Novo campo para o assunto do e-mail
  transactionalEmailBody?: string; // Novo campo para o corpo do e-mail
};

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
        ]
      }
      checkouts: {
        Row: {
          created_at: string
          form_fields: FormFields | null // Usar o tipo FormFields mais específico
          id: string
          integrations: Json | null
          layout: string
          name: string | null; /* Adicionada nova coluna 'name' */
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
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Insert: {
          created_at?: string
          form_fields?: FormFields | null // Usar o tipo FormFields mais específico
          id?: string
          integrations?: Json | null
          layout?: string
          name?: string | null; /* Adicionada nova coluna 'name' */
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
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Update: {
          created_at?: string
          form_fields?: FormFields | null // Usar o tipo FormFields mais específico
          id?: string
          integrations?: Json | null
          layout?: string
          name?: string | null; /* Adicionada nova coluna 'name' */
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
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
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
          created_at: string
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
          updated_at: string
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
          created_at?: string
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
          updated_at?: string
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
          created_at?: string
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
          updated_at?: string
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
      customers: {
        Row: {
          cpf: string | null
          created_at: string
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
          cpf?: string | null
          created_at?: string
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
          cpf?: string | null
          created_at?: string
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
        Relationships: []
      }
      logs_entrega: {
        Row: {
          assunto: string | null
          compra_id: string | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          member_area_link: string | null
          name: string
          price: number
          price_original: number | null
          updated_at: string
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
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
          member_area_link?: string | null
          name: string
          price: number
          price_original?: number | null
          updated_at?: string
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
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
          member_area_link?: string | null
          name?: string
          price?: number
          price_original?: number | null
          updated_at?: string
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_digitais: {
        Row: {
          acesso_expira_em: string | null
          arquivo_url: string | null
          created_at: string
          descricao: string | null
          email_assunto: string
          email_template: string
          gerar_credenciais: boolean | null
          id: string
          instrucoes_acesso: string | null
          is_active: boolean | null
          nome: string
          prazo_acesso: number | null
          preco: number
          tipo_entregavel: string
          updated_at: string
          url_acesso: string | null
        }
        Insert: {
          acesso_expira_em?: string | null
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          email_assunto?: string
          email_template: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome: string
          prazo_acesso?: number | null
          preco: number
          tipo_entregavel: string
          updated_at?: string
          url_acesso?: string | null
        }
        Update: {
          acesso_expira_em?: string | null
          arquivo_url?: string | null
          created_at?: string
          descricao?: string | null
          email_assunto?: string
          email_template?: string
          gerar_credenciais?: boolean | null
          id?: string
          instrucoes_acesso?: string | null
          is_active?: boolean | null
          nome?: string
          prazo_acesso?: number | null
          preco?: number
          tipo_entregavel?: string
          updated_at?: string
          url_acesso?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
          updated_at: string
          user_id: string
          status: string; /* Adicionada nova coluna 'status' */
          login_url: string | null; /* Adicionada nova coluna 'login_url' */
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
          user_id: string
          status?: string; /* Adicionada nova coluna 'status' */
          login_url?: string | null; /* Adicionada nova coluna 'login_url' */
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          status?: string; /* Adicionada nova coluna 'status' */
          login_url?: string | null; /* Adicionada nova coluna 'login_url' */
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        }
        Relationships: []
      }
      product_access: {
        Row: {
          created_at: string | null
          id: string
          payment_id: string | null
          product_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_id?: string | null
          product_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          payment_id: string
          payment_status: string
          product_id: string | null
          user_id: string | null
          username: string | null
          password: string | null
        }
        Insert: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount: number
          created_at?: string | null
          customer_email: string
          customer_name: string
          id?: string
          payment_id: string
          payment_status: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
          password?: string | null
        }
        Update: {
          access_sent?: boolean | null
          access_sent_at?: string | null
          amount?: number
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          id?: string
          payment_id?: string
          payment_status?: string
          product_id?: string | null
          user_id?: string | null
          username?: string | null
          password?: string | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      
      -- Novas tabelas da área de membros
      member_areas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          primary_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_areas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          banner_url: string | null;
          order_index: number;
          status: string;
          created_at: string;
          updated_at: string;
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          banner_url?: string | null;
          order_index?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          banner_url?: string | null;
          order_index?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Relationships: [
          {
            foreignKeyName: "modules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modules_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          duration_minutes: number | null;
          content_type: string;
          content_url: string | null;
          text_content: string | null;
          order_index: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description?: string | null;
          duration_minutes?: number | null;
          content_type: string;
          content_url?: string | null;
          text_content?: string | null;
          order_index?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string | null;
          duration_minutes?: number | null;
          content_type?: string;
          content_url?: string | null;
          text_content?: string | null;
          order_index?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      member_access: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          access_granted_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          access_granted_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          access_granted_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Relationships: [
          {
            foreignKeyName: "member_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_access_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_access_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ];
      };
      platform_settings: {
        Row: {
          id: string;
          user_id: string | null;
          logo_url: string | null;
          login_title: string | null;
          login_subtitle: string | null;
          global_font_family: string | null;
          colors: {
            background_login?: string;
            card_login?: string;
            header_background?: string;
            header_border?: string;
            button_background?: string;
            text_primary?: string;
            text_header?: string;
            text_cards?: string;
            text_secondary?: string;
            checkmark_background?: string; /* Adicionado */
            checkmark_icon?: string; /* Adicionado */
          } | null;
          created_at: string;
          updated_at: string;
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          logo_url?: string | null;
          login_title?: string | null;
          login_subtitle?: string | null;
          global_font_family?: string | null;
          colors?: {
            background_login?: string;
            card_login?: string;
            header_background?: string;
            header_border?: string;
            button_background?: string;
            text_primary?: string;
            text_header?: string;
            text_cards?: string;
            text_secondary?: string;
            checkmark_background?: string; /* Adicionado */
            checkmark_icon?: string; /* Adicionado */
          } | null;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Update: {
          id?: string;
          user_id?: string | null;
          logo_url?: string | null;
          login_title?: string | null;
          login_subtitle?: string | null;
          global_font_family?: string | null;
          colors?: {
            background_login?: string;
            card_login?: string;
            header_background?: string;
            header_border?: string;
            button_background?: string;
            text_primary?: string;
            text_header?: string;
            text_cards?: string;
            text_secondary?: string;
            checkmark_background?: string; /* Adicionado */
            checkmark_icon?: string; /* Adicionado */
          } | null;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Relationships: [
          {
            foreignKeyName: "platform_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_settings_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          module_id: string | null;
          lesson_id: string | null;
          title: string;
          content: string;
          is_automatic: boolean;
          created_at: string;
          updated_at: string;
          member_area_id: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title: string;
          content: string;
          is_automatic?: boolean;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title?: string;
          content?: string;
          is_automatic?: boolean;
          created_at?: string;
          updated_at?: string;
          member_area_id?: string | null; /* Adicionada nova coluna 'member_area_id' */
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_posts_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_posts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_posts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ];
      };
      community_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_comments: { -- NEW TABLE
        Row: {
          id: string;
          lesson_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_completions: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_completions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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