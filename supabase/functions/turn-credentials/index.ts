const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const turnKeyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
  const turnApiToken = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");

  if (!turnKeyId || !turnApiToken) {
    return new Response(JSON.stringify({ error: "TURN service is not configured." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(turnKeyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${turnApiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl: 86400 })
      }
    );

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("TURN credential generation failed:", error);
    return new Response(JSON.stringify({ error: "Unable to generate TURN credentials." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
