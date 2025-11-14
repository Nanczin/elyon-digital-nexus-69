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

    // Create auth user
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
      console.error("CREATE_MEMBER_DEBUG: Auth user creation failed", authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log("CREATE_MEMBER_DEBUG: Auth user created", { userId });

    // Hash password for storage in members table
    const passwordHash = await hashPassword(password);

    // Create member record
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

    const memberId = memberData.id;
    console.log("CREATE_MEMBER_DEBUG: Member record created", { memberId });

    // Grant access to products
    if (productIds && productIds.length > 0) {
      const memberAccessRecords = productIds.map((productId: string) => ({
        member_id: memberId,
        product_id: productId,
        status: "active",
      }));

      const { error: accessError } = await supabase
        .from("member_access")
        .insert(memberAccessRecords);

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
      memberId,
      userId,
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
