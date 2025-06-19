
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  email: string;
  userName: string;
  role: string;
  accessCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, role, accessCode }: ApprovalEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "LoomeroFlow <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Your Access to LoomeroFlow Has Been Approved!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">🎉 Welcome to LoomeroFlow!</h1>
          
          <p>Hi ${userName},</p>
          
          <p>Your request to access <strong>LoomeroFlow</strong> has been approved.<br>
          You've been assigned the role of <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="color: #333; margin-bottom: 10px;">🔐 Your Access Code:</h2>
            <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; font-family: monospace;">
              ${accessCode}
            </div>
            <p style="color: #666; margin-top: 10px; font-size: 14px;">
              Use this code whenever you log in to access your personalized dashboard.
            </p>
          </div>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="color: #1e40af; margin-top: 0;">How to Access Your Account:</h3>
            <ol style="color: #1e3a8a;">
              <li>Go to the LoomeroFlow login page</li>
              <li>Click "Continue with Google"</li>
              <li>Enter your 6-digit access code when prompted</li>
              <li>You'll be redirected to your ${role} dashboard</li>
            </ol>
          </div>
          
          <p style="margin-top: 30px;">Best regards,<br>
          <strong>Team LoomeroFlow</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            This email was sent to ${email}. If you didn't request access to LoomeroFlow, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-approval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
