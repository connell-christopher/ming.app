import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") || "";
const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function readJson(response: Response) {
  try { return await response.json(); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in to Tweaklr first." }, 401);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Tweak TikTok service is not configured." }, 503);

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Your Tweaklr session is invalid. Please sign in again." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: connection, error: connectionError } = await admin
      .from("tweak_tiktok_connections")
      .select("*")
      .eq("tweaklr_user_id", userData.user.id)
      .maybeSingle();

    if (connectionError) {
      console.error("TikTok connection lookup failed:", connectionError.message);
      return json({ error: "Could not load your TikTok connection." }, 500);
    }
    if (!connection) return json({ connected: false, videos: [] });

    let accessToken = connection.access_token as string;
    const expiry = Date.parse(connection.access_token_expires_at || "");
    if (!Number.isFinite(expiry) || expiry <= Date.now() + 5 * 60 * 1000) {
      if (!clientKey || !clientSecret || !connection.refresh_token) {
        return json({ error: "TikTok needs to be reconnected." }, 401);
      }

      const refreshResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token
        })
      });
      const refreshed = await readJson(refreshResponse);
      if (!refreshResponse.ok || !refreshed.access_token) {
        console.error("TikTok token refresh failed:", refreshed.error || refreshResponse.status);
        return json({ error: "TikTok authorization expired. Reconnect your TikTok account." }, 401);
      }

      accessToken = refreshed.access_token;
      const now = Date.now();
      const { error: refreshSaveError } = await admin.from("tweak_tiktok_connections").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || connection.refresh_token,
        scope: refreshed.scope || connection.scope,
        access_token_expires_at: new Date(now + Number(refreshed.expires_in || 86400) * 1000).toISOString(),
        refresh_token_expires_at: new Date(now + Number(refreshed.refresh_expires_in || 31536000) * 1000).toISOString(),
        updated_at: new Date(now).toISOString()
      }).eq("tweaklr_user_id", userData.user.id);
      if (refreshSaveError) {
        console.error("TikTok refreshed token save failed:", refreshSaveError.message);
        return json({ error: "Could not refresh TikTok authorization. Please try again." }, 500);
      }
    }

    const fields = "id,title,video_description,duration,cover_image_url,embed_link,share_url,create_time";
    const videoResponse = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=" + fields, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ max_count: 20 })
    });
    const videoBody = await readJson(videoResponse);
    if (!videoResponse.ok || videoBody?.error?.code && videoBody.error.code !== "ok") {
      console.error("TikTok video list failed:", videoBody?.error?.code || videoResponse.status);
      return json({ error: "TikTok could not return your videos. Please try again later." }, 502);
    }

    const videos = Array.isArray(videoBody?.data?.videos) ? videoBody.data.videos : [];
    if (videos.length) {
      const rows = videos.filter((v: any) => v?.id).map((v: any) => ({
        tweaklr_user_id: userData.user.id,
        tiktok_video_id: String(v.id),
        title: v.title || null,
        video_description: v.video_description || null,
        duration: Number.isFinite(Number(v.duration)) ? Number(v.duration) : null,
        cover_image_url: v.cover_image_url || null,
        embed_link: v.embed_link || null,
        share_url: v.share_url || null,
        create_time: Number.isFinite(Number(v.create_time)) ? Number(v.create_time) : null,
        fetched_at: new Date().toISOString()
      }));
      const { error: saveVideosError } = await admin.from("tweak_tiktok_videos").upsert(rows, {
        onConflict: "tweaklr_user_id,tiktok_video_id"
      });
      if (saveVideosError) console.error("TikTok video metadata cache failed:", saveVideosError.message);
    }

    const { data: cachedVideos, error: cachedError } = await admin
      .from("tweak_tiktok_videos")
      .select("tiktok_video_id,title,video_description,duration,cover_image_url,embed_link,share_url,create_time")
      .eq("tweaklr_user_id", userData.user.id)
      .order("create_time", { ascending: false, nullsFirst: false })
      .limit(20);

    if (cachedError) {
      console.error("TikTok video cache read failed:", cachedError.message);
      return json({ error: "Could not load your TikTok videos." }, 500);
    }

    return json({
      connected: true,
      profile: {
        display_name: connection.display_name,
        avatar_url: connection.avatar_url
      },
      videos: cachedVideos || []
    });
  } catch (error) {
    console.error("TikTok video retrieval failed:", error);
    return json({ error: "Could not load TikTok videos right now." }, 500);
  }
});
