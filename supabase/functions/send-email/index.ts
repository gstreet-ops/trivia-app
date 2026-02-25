import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to?: string;
  userId?: string;
  type: "invitation" | "join_confirmation" | "question_notification" | "generic";
  data: Record<string, string>;
}

// Georgetown-branded HTML email wrapper
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#041E42;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Trivia Platform</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <tr><td style="background:#f4f5f7;padding:16px 32px;text-align:center;font-size:12px;color:#54585A;">
          Trivia Platform &mdash; Georgetown Community Trivia
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildInvitationEmail(data: Record<string, string>): { subject: string; html: string } {
  const { communityName, inviteCode, description, personalMessage } = data;
  let body = `
    <h2 style="color:#041E42;margin:0 0 16px;">You're Invited!</h2>
    <p style="color:#333;font-size:15px;line-height:1.5;">
      You've been invited to join <strong>${communityName}</strong> on the Trivia Platform.
    </p>`;
  if (description) {
    body += `<p style="color:#54585A;font-size:14px;font-style:italic;margin:8px 0 16px;">${description}</p>`;
  }
  if (personalMessage) {
    body += `
    <div style="background:#E8ECF0;border-left:4px solid #041E42;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#333;font-size:14px;">${personalMessage}</p>
    </div>`;
  }
  body += `
    <div style="background:#041E42;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
      <p style="color:#8B9DC3;margin:0 0 8px;font-size:13px;">Your Invite Code</p>
      <p style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:3px;">${inviteCode}</p>
    </div>
    <p style="color:#54585A;font-size:14px;">
      To join, visit the Trivia Platform, go to <strong>My Communities</strong>, click <strong>Join Community</strong>, and enter the code above.
    </p>`;
  return { subject: `You're invited to ${communityName}!`, html: wrapHtml(body) };
}

function buildJoinConfirmationEmail(data: Record<string, string>): { subject: string; html: string } {
  const { username, communityName } = data;
  const body = `
    <h2 style="color:#041E42;margin:0 0 16px;">Welcome Aboard!</h2>
    <p style="color:#333;font-size:15px;line-height:1.5;">
      Hey <strong>${username}</strong>, you've successfully joined <strong>${communityName}</strong>!
    </p>
    <p style="color:#54585A;font-size:14px;line-height:1.5;">
      Start playing quizzes, climb the leaderboard, and unlock achievements. Head to the community page to get started.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#041E42;color:#ffffff;padding:12px 32px;border-radius:6px;font-weight:600;font-size:15px;">
        Let's Play!
      </span>
    </div>`;
  return { subject: `Welcome to ${communityName}!`, html: wrapHtml(body) };
}

function buildQuestionNotificationEmail(data: Record<string, string>): { subject: string; html: string } {
  const { username, questionText, status, rejectionReason } = data;
  const approved = status === "approved";
  const statusColor = approved ? "#28a745" : "#dc3545";
  const statusLabel = approved ? "Approved" : "Not Approved";
  const preview = questionText.length > 80 ? questionText.slice(0, 80) + "..." : questionText;

  let body = `
    <h2 style="color:#041E42;margin:0 0 16px;">Question ${statusLabel}</h2>
    <p style="color:#333;font-size:15px;line-height:1.5;">
      Hey <strong>${username}</strong>, your submitted question has been reviewed.
    </p>
    <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="color:#54585A;font-size:13px;margin:0 0 4px;">Your question:</p>
      <p style="color:#333;font-size:14px;margin:0;font-weight:500;">"${preview}"</p>
    </div>
    <p style="font-size:15px;">
      Status: <strong style="color:${statusColor};">${statusLabel}</strong>
    </p>`;
  if (!approved && rejectionReason) {
    body += `
    <div style="background:#fff3cd;border-left:4px solid #dc3545;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#333;font-size:14px;"><strong>Feedback:</strong> ${rejectionReason}</p>
    </div>`;
  }
  if (approved) {
    body += `<p style="color:#54585A;font-size:14px;">Your question is now live and may appear in quizzes!</p>`;
  } else {
    body += `<p style="color:#54585A;font-size:14px;">You can edit and resubmit your question from the question creator.</p>`;
  }
  return { subject: `Question ${statusLabel} — Trivia Platform`, html: wrapHtml(body) };
}

function buildGenericEmail(data: Record<string, string>): { subject: string; html: string } {
  const { username, subject, message } = data;
  const body = `
    <h2 style="color:#041E42;margin:0 0 16px;">${subject}</h2>
    <p style="color:#333;font-size:15px;line-height:1.5;">
      Hey <strong>${username || "there"}</strong>,
    </p>
    <p style="color:#333;font-size:15px;line-height:1.5;">
      ${message}
    </p>`;
  return { subject, html: wrapHtml(body) };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EmailRequest = await req.json();
    const { to, userId, type, data } = body;

    // Resolve recipient email
    let recipientEmail = to;
    if (!recipientEmail && userId) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) {
        return new Response(
          JSON.stringify({ error: "Could not resolve user email" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      recipientEmail = userData.user.email;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient: provide 'to' or 'userId'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build email from template
    let email: { subject: string; html: string };
    switch (type) {
      case "invitation":
        email = buildInvitationEmail(data);
        break;
      case "join_confirmation":
        email = buildJoinConfirmationEmail(data);
        break;
      case "question_notification":
        email = buildQuestionNotificationEmail(data);
        break;
      case "generic":
        email = buildGenericEmail(data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Send via Resend API
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Trivia Platform <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: email.subject,
        html: email.html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Email delivery failed", details: resendData }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
