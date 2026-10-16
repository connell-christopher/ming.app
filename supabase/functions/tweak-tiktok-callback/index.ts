import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") || "";
const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") || "";
const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI") || "";
const appUrl = Deno.env.get("TWEAKLR_APP_URL") || "https://connell-christopher.github.io/ming.app/app.html";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function returnToApp(status: "connected" | "error", reason = "") {
  const target = new URL(appUrl);
  target.searchParams.set("tiktok", status);
  if (reason) target.searchParams.set("reason", reason);
  return Response.redirect(target.toString(), 302);
}

async function readJson(response: Response) {
  try { return await response.json(); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed.", { status: 405 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return returnToApp("error", "authorization_denied");
  if (!code || !state) return returnToApp("error", "invalid_callback");
  if (!clientKey || !clientSecret || !redirectUri || !serviceRoleKey) {
    console.error("TikTok callback is missing server configuration.");
    return returnToApp("error", "server_not_configured");
  }

  try {
    // Delete-and-return makes the state single-use and checks its expiry atomically.
    const { data: stateRow, error: stateError } = await admin
      .from("tweak_tiktok_oauth_states")
      .delete()
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .select("tweaklr_user_id, redirect_uri")
      .maybeSingle();

    if (stateError || !stateRow || stateRow.redirect_uri !== redirectUri) {
      return returnToApp("error", "invalid_or_expired_state");
    }

    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });
    const tokenBody = await readJson(tokenResponse);
    if (!tokenResponse.ok || !tokenBody.access_token || !tokenBody.refresh_token || !tokenBody.open_id) {
      console.error("TikTok token exchange failed:", tokenBody.error || tokenBody.error_description || tokenResponse.status);
      return returnToApp("error", "token_exchange_failed");
    }

    const profileResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: "Bearer " + tokenBody.access_token } }
    );
    const profileBody = await readJson(profileResponse);
    const profile = profileBody?.data?.user;
    if (!profileResponse.ok || !profile?.open_id) {
      console.error("TikTok profile retrieval failed:", profileBody?.error?.code || profileResponse.status);
      return returnToApp("error", "profile_retrieval_failed");
    }

    const now = Date.now();
    const { error: saveError } = await admin.from("tweak_tiktok_connections").upsert({
      tweaklr_user_id: stateRow.tweaklr_user_id,
      tiktok_open_id: profile.open_id || tokenBody.open_id,
      display_name: profile.display_name || null,
      avatar_url: profile.avatar_url || null,
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      scope: tokenBody.scope || null,
      access_token_expires_at: new Date(now + Number(tokenBody.expires_in || 86400) * 1000).toISOString(),
      refresh_token_expires_at: new Date(now + Number(tokenBody.refresh_expires_in || 31536000) * 1000).toISOString(),
      updated_at: new Date(now).toISOString()
    }, { onConflict: "tweaklr_user_id" });

    if (saveError) {
      console.error("TikTok connection save failed:", saveError.message);
      return returnToApp("error", "connection_save_failed");
    }

    return returnToApp("connected");
  } catch (error) {
    console.error("TikTok OAuth callback failed:", error);
    return returnToApp("error", "callback_failed");
  }
});
