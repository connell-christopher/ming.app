import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") || "";
const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  if (!clientKey || !redirectUri || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "TikTok integration is not configured on the server yet." }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in to Tweaklr first." }, 401);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Your Tweaklr session is invalid. Please sign in again." }, 401);

    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, "0")).join("");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: stateError } = await admin.from("tweak_tiktok_oauth_states").insert({
      state,
      tweaklr_user_id: userData.user.id,
      redirect_uri: redirectUri,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    if (stateError) {
      console.error("TikTok OAuth state creation failed:", stateError.message);
      return json({ error: "Could not start TikTok connection. Please try again." }, 500);
    }

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.set("client_key", clientKey);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user.info.basic,video.list");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    return json({ authorization_url: authUrl.toString() });
  } catch (error) {
    console.error("TikTok OAuth start failed:", error);
    return json({ error: "Could not start TikTok connection. Please try again." }, 500);
  }
});
