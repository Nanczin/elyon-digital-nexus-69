import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  name: string;
  email: string;
  checkoutId: string;
  paymentId: string;
  planType: string;
  productIds: string[];
  memberAreaId: string;
}

interface CreateMemberResponse {
  success: boolean;
  memberId?: string;
  userId?: string;
  password?: string;
  message?: string;
  error?: string;
}

function generateRandomPassword(): string {
  const length = 12;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload: CreateMemberRequest = await req.json();
    const {
      name,
      email,
      checkoutId,
      paymentId,
      planType,
      productIds,
      memberAreaId,
    } = payload;

    console.log("CREATE_MEMBER_DEBUG: Starting member creation", {
      email,
      memberAreaId,
      productIds,
    });

    // Fetch member_settings for password configuration
    const { data: settingsData, error: settingsError } = await supabase
      .from("member_settings")
      .select("default_password_mode, default_fixed_password")
      .eq("member_area_id", memberAreaId)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("CREATE_MEMBER_DEBUG: Error fetching settings", settingsError);
      throw settingsError;
    }

    // Determine password based on mode
    let password = "";
    let forceChangePassword = false;

    if (settingsData) {
      const mode = settingsData.default_password_mode || "random";
      if (mode === "fixed") {
        password = settingsData.default_fixed_password || generateRandomPassword();
      } else if (mode === "force_change") {
        password = generateRandomPassword();
        forceChangePassword = true;
      } else {
        // random (default)
        password = generateRandomPassword();
      }
    } else {
      // Default to random if no settings
      password = generateRandomPassword();
    }

    console.log("CREATE_MEMBER_DEBUG: Password mode determined", {
      mode: settingsData?.default_password_mode || "random",
      passwordLength: password.length,
    });

    let userId: string | null = null;
    let createdNewAuthUser = false;
    try {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          force_password_change: forceChangePassword,
        },
      });

      if (authError) {
        // If email already exists, we'll try to recover existing user id
        console.error("CREATE_MEMBER_DEBUG: Auth user creation returned error", authError);
        throw authError;
      }

      userId = authData.user.id;
      createdNewAuthUser = true;
      console.log("CREATE_MEMBER_DEBUG: Auth user created", { userId });
    } catch (authErr: any) {
      // Handle duplicate email: try to find existing member record with that email
      const authMsg = authErr?.message || String(authErr);
      console.warn('CREATE_MEMBER_DEBUG: auth.createUser failed, attempting fallback. Message:', authMsg);

      if (authMsg && authMsg.toLowerCase().includes('duplicate')) {
        // try to find existing member entry
        try {
          const { data: existingMember } = await supabase
            .from('members')
            .select('id, user_id')
            .eq('email', email)
            .maybeSingle();

          if (existingMember && existingMember.user_id) {
            userId = existingMember.user_id;
            console.log('CREATE_MEMBER_DEBUG: Found existing member record for email, using user_id', { userId, memberId: existingMember.id });
          } else {
            console.warn('CREATE_MEMBER_DEBUG: No member record found for duplicate email; cannot auto-create auth user.');
            return new Response(JSON.stringify({ success: false, error: 'E-mail já cadastrado. Faça login ou recupere a senha.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 });
          }
        } catch (e) {
          console.error('CREATE_MEMBER_DEBUG: Error while looking up existing member for duplicate email', e);
          return new Response(JSON.stringify({ success: false, error: 'E-mail já cadastrado e não foi possível localizar usuário.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 });
        }
      } else {
        console.error('CREATE_MEMBER_DEBUG: Unexpected auth error:', authErr);
        return new Response(JSON.stringify({ success: false, error: authMsg || 'Falha ao criar usuário de autenticação.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    // Hash password for storage in members table
    const passwordHash = await hashPassword(password);

    // Prepare memberId variable; if we found existing member earlier (duplicate email fallback)
    // the variable may already be set. Otherwise, create a new member record.
    let memberId: string | null = null;

    if (!userId) {
      throw new Error('User id not available to create member record');
    }

    // Try to create member record only if we don't already have one
    const { data: existingMemberCheck } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingMemberCheck && existingMemberCheck.id) {
      memberId = existingMemberCheck.id;
      console.log('CREATE_MEMBER_DEBUG: Found existing member record, will reuse', { memberId });
    } else {
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .insert({
          user_id: userId,
          name,
          email,
          password_hash: passwordHash,
          checkout_id: checkoutId,
          payment_id: paymentId,
          plan_type: planType,
          status: "active",
        })
        .select()
        .single();

      if (memberError) {
        console.error("CREATE_MEMBER_DEBUG: Member record creation failed", memberError);
        throw new Error(`Failed to create member record: ${memberError.message}`);
      }

      memberId = memberData.id;
      console.log("CREATE_MEMBER_DEBUG: Member record created", { memberId });
    }

    // Grant access to products
    if (productIds && productIds.length > 0) {
      const memberAccessRecords = productIds.map((productId: string) => ({
        member_id: memberId,
        product_id: productId,
        status: "active",
      }));

      const { error: accessError } = await supabase
        .from("member_access")
        .upsert(memberAccessRecords, { onConflict: 'member_id,product_id' });

      if (accessError) {
        console.error("CREATE_MEMBER_DEBUG: Failed to grant product access", accessError);
        throw new Error(`Failed to grant product access: ${accessError.message}`);
      }

      console.log("CREATE_MEMBER_DEBUG: Product access granted", {
        memberId,
        productCount: productIds.length,
      });
    }

    const response: CreateMemberResponse = {
      success: true,
      memberId: memberId || undefined,
      userId: userId || undefined,
      password,
      message: "Member created successfully",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("CREATE_MEMBER_ERROR:", error);

    const response: CreateMemberResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
