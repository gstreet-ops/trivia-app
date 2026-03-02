import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  subscriber_id?: string;
  community_id: number;
  email: string;
  name?: string;
  test?: boolean;
}

// ── Platform sync helpers ─────────────────────────────────────────────

async function syncToMailchimp(
  config: Record<string, string>,
  email: string,
  name?: string,
) {
  const { api_key, server, list_id } = config;
  const auth = btoa(`anystring:${api_key}`);

  // PUT (add-or-update) to avoid duplicate errors
  const emailHash = await crypto.subtle
    .digest("MD5", new TextEncoder().encode(email.toLowerCase()))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );

  const body: Record<string, unknown> = {
    email_address: email,
    status_if_new: "subscribed",
  };
  if (name) {
    const parts = name.trim().split(/\s+/);
    body.merge_fields = {
      FNAME: parts[0] || "",
      LNAME: parts.slice(1).join(" ") || "",
    };
  }

  const res = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${list_id}/members/${emailHash}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToConvertKit(
  config: Record<string, string>,
  email: string,
  name?: string,
) {
  const { api_key, form_id } = config;
  const body: Record<string, unknown> = { api_key, email };
  if (name) body.first_name = name.split(/\s+/)[0];

  const res = await fetch(
    `https://api.convertkit.com/v3/forms/${form_id}/subscribe`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToBeehiiv(
  config: Record<string, string>,
  email: string,
) {
  const { api_key, publication_id } = config;
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publication_id}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, reactivate_existing: true }),
    },
  );
  return { status: res.status, ok: res.ok, data: await res.json() };
}

async function syncToWebhook(
  config: Record<string, string>,
  email: string,
  name?: string,
  communityId?: number,
) {
  const { url, secret } = config;
  const payload = {
    event: "new_subscriber",
    email,
    name: name || null,
    community_id: communityId,
    timestamp: new Date().toISOString(),
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Optional HMAC signature
  if (secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(JSON.stringify(payload)),
    );
    headers["X-GStreet-Signature"] = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return { status: res.status, ok: res.ok, data: await res.text() };
}

// ── Test-mode helpers (validate config without creating subscribers) ──

async function testMailchimp(config: Record<string, string>) {
  const { api_key, server, list_id } = config;
  const auth = btoa(`anystring:${api_key}`);
  const res = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${list_id}`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const data = await res.json();
  if (!res.ok) return { ok: false, status: res.status, data };
  return {
    ok: true,
    status: res.status,
    data: { name: data.name, member_count: data.stats?.member_count },
  };
}

async function testConvertKit(config: Record<string, string>) {
  const { api_key, form_id } = config;
  const res = await fetch(
    `https://api.convertkit.com/v3/forms/${form_id}?api_key=${api_key}`,
  );
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function testBeehiiv(config: Record<string, string>) {
  const { api_key, publication_id } = config;
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publication_id}`,
    { headers: { Authorization: `Bearer ${api_key}` } },
  );
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function testWebhook(config: Record<string, string>) {
  const { url, secret } = config;
  const payload = { event: "test", timestamp: new Date().toISOString() };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(JSON.stringify(payload)),
    );
    headers["X-GStreet-Signature"] = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.text() };
}

// ── Main handler ──────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT if provided
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body: SyncRequest = await req.json();
    const { community_id, email, name, test } = body;

    if (!community_id || !email) {
      return new Response(
        JSON.stringify({ error: "community_id and email required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch enabled integrations for this community
    const { data: integrations, error: intErr } = await supabaseAdmin
      .from("email_integrations")
      .select("*")
      .eq("community_id", community_id)
      .eq("enabled", true);

    if (intErr) throw intErr;
    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled integrations", synced: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Test mode: validate configs without creating subscribers ──
    if (test) {
      const testResults = [];
      for (const integration of integrations) {
        let result;
        try {
          switch (integration.platform) {
            case "mailchimp":
              result = await testMailchimp(integration.config);
              break;
            case "convertkit":
              result = await testConvertKit(integration.config);
              break;
            case "beehiiv":
              result = await testBeehiiv(integration.config);
              break;
            case "webhook":
              result = await testWebhook(integration.config);
              break;
            default:
              result = { ok: false, status: 0, data: "Unknown platform" };
          }
        } catch (err) {
          result = { ok: false, status: 0, data: (err as Error).message };
        }
        testResults.push({
          platform: integration.platform,
          ok: result.ok,
          status: result.status,
          data: result.data,
        });
      }
      return new Response(JSON.stringify({ test: true, results: testResults }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Live sync ──
    const results = [];

    for (const integration of integrations) {
      let result;
      try {
        switch (integration.platform) {
          case "mailchimp":
            result = await syncToMailchimp(integration.config, email, name);
            break;
          case "convertkit":
            result = await syncToConvertKit(integration.config, email, name);
            break;
          case "beehiiv":
            result = await syncToBeehiiv(integration.config, email);
            break;
          case "webhook":
            result = await syncToWebhook(
              integration.config,
              email,
              name,
              community_id,
            );
            break;
          default:
            result = { ok: false, status: 0, data: "Unknown platform" };
        }
      } catch (err) {
        result = { ok: false, status: 0, data: (err as Error).message };
      }

      const logStatus = result.ok ? "success" : "error";
      const errorMsg = result.ok
        ? null
        : typeof result.data === "string"
          ? result.data
          : JSON.stringify(result.data);

      // Log the sync attempt
      await supabaseAdmin.from("email_sync_logs").insert({
        community_id,
        integration_id: integration.id,
        subscriber_email: email,
        platform: integration.platform,
        status: logStatus,
        response_code: result.status,
        error_message: errorMsg,
      });

      // Update integration last_sync info
      await supabaseAdmin
        .from("email_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: logStatus,
          last_sync_error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      results.push({ platform: integration.platform, status: logStatus });
    }

    return new Response(
      JSON.stringify({ synced: results.length, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("sync-subscriber error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
