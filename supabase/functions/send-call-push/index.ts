import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@ming.app";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const admin = createClient(supabaseUrl, serviceRoleKey);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const recipientId = String(body.recipientId || "");
    const callId = String(body.callId || "");
    const kind = body.kind === "video" ? "video" : "voice";
    const callerName = String(body.callerName || "Someone").slice(0, 80);

    if (!recipientId || !callId) {
      return new Response(JSON.stringify({ error: "Missing recipientId or callId" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const { data: connection } = await admin
      .from("connections")
      .select("id")
      .eq("status", "accepted")
      .or(
        "and(requester_id.eq." + user.id + ",recipient_id.eq." + recipientId + ")," +
        "and(requester_id.eq." + recipientId + ",recipient_id.eq." + user.id + ")"
      )
      .maybeSingle();

    if (!connection) {
      return new Response(JSON.stringify({ error: "Users are not connected" }), {
        status: 403,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const { data: subscriptions, error: subError } = await admin
      .from("ming_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId);

    if (subError) throw subError;

    const payload = JSON.stringify({
      type: "ming-call",
      callId,
      kind,
      callerName
    });

    const results = await Promise.all((subscriptions || []).map(async sub => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload, { TTL: 90 });
        return { ok: true };
      } catch (error) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("ming_push_subscriptions").delete().eq("id", sub.id);
        }
        return { ok: false, status };
      }
    }));

    return new Response(JSON.stringify({
      ok: true,
      sent: results.filter(r => r.ok).length,
      subscriptions: results.length
    }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("send-call-push failed", error);
    return new Response(JSON.stringify({ error: "Push delivery failed" }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }
});
