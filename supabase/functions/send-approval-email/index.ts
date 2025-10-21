import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// HTML escape function to prevent XSS attacks
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate API key exists and initialize Resend
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(resendApiKey);

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
  console.log(`${req.method} request received to send-approval-email function`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("Processing approval email request");
    
    // Validate Resend API key is available
    if (!resendApiKey) {
      console.error("Resend API key not found in environment");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured properly", 
          details: "RESEND_API_KEY not found" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const body = await req.json();
    console.log("Request body received:", { 
      email: body.email, 
      userName: body.userName, 
      role: body.role,
      hasAccessCode: !!body.accessCode
    });
    
    const { email, userName, role, accessCode }: ApprovalEmailRequest = body;
    
    // Validate required fields
    if (!email || !role || !accessCode) {
      console.error("Missing required fields:", { email: !!email, role: !!role, accessCode: !!accessCode });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          details: "email, role, and accessCode are required" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Sending email to:", email, "with role:", role);
    
    // Escape all user-provided data to prevent XSS
    const safeUserName = escapeHtml(userName || 'there');
    const safeRole = escapeHtml(role);
    const safeAccessCode = escapeHtml(accessCode);

    const emailResponse = await resend.emails.send({
      from: "Lovable <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Your Access to LoomeroFlow Has Been Approved!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Welcome to LoomeroFlow!</h1>
            
            <p>Hi ${safeUserName},</p>
            
            <p>Your request to access <strong>LoomeroFlow</strong> has been approved.</p>
            <p>You've been assigned the role of <strong>${safeRole}</strong>.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="color: #333; margin: 0 0 10px 0;">🔐 Your Access Code:</h2>
              <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; font-family: monospace;">
                ${safeAccessCode}
              </div>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>⚠️ Important:</strong> This access code is single-use only and will expire once used. Keep it secure and don't share it with anyone.
            </div>
            
            <p>Use this code whenever you log in to access your personalized dashboard.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                Team LoomeroFlow
              </p>
            </div>
          </body>
        </html>
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
    console.error("Error in send-approval-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send approval email",
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
