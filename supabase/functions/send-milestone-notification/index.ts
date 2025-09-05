import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Validate API key exists and initialize Resend
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MilestoneNotificationRequest {
  recipientEmail: string;
  recipientName: string;
  milestoneTitle: string;
  projectTitle: string;
  status: 'approved' | 'rejected' | 'submitted';
  feedback?: string;
  submissionNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`${req.method} request received to send-milestone-notification function`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("Processing milestone notification request");
    
    // Validate Resend API key
    if (!resendApiKey) {
      console.error("Resend API key not found in environment");
      return new Response(
        JSON.stringify({ error: "Email service not configured properly" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const body = await req.json();
    console.log("Request body received:", { 
      recipientEmail: body.recipientEmail, 
      milestoneTitle: body.milestoneTitle, 
      status: body.status 
    });
    
    const { 
      recipientEmail, 
      recipientName, 
      milestoneTitle, 
      projectTitle, 
      status, 
      feedback, 
      submissionNotes 
    }: MilestoneNotificationRequest = body;
    
    // Validate required fields
    if (!recipientEmail || !milestoneTitle || !projectTitle || !status) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    let subject = "";
    let htmlContent = "";
    
    switch (status) {
      case 'approved':
        subject = `🎉 Milestone Approved: ${milestoneTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8F6A4D; text-align: center;">Milestone Approved!</h1>
            
            <p>Hi ${recipientName || 'there'},</p>
            
            <p>Great news! Your milestone "<strong>${milestoneTitle}</strong>" for project "<strong>${projectTitle}</strong>" has been approved.</p>
            
            ${feedback ? `
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">Mentor Feedback:</h3>
              <p style="margin: 0; color: #164e63;">${feedback}</p>
            </div>
            ` : ''}
            
            <p>Keep up the excellent work!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                Team LoomeroFlow
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'rejected':
        subject = `📝 Milestone Needs Revision: ${milestoneTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #65604D; text-align: center;">Milestone Needs Revision</h1>
            
            <p>Hi ${recipientName || 'there'},</p>
            
            <p>Your milestone "<strong>${milestoneTitle}</strong>" for project "<strong>${projectTitle}</strong>" needs some revisions.</p>
            
            ${feedback ? `
            <div style="background-color: #fef7cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">Mentor Feedback:</h3>
              <p style="margin: 0; color: #78350f;">${feedback}</p>
            </div>
            ` : ''}
            
            <p>Please review the feedback and resubmit your milestone when ready.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                Team LoomeroFlow
              </p>
            </div>
          </div>
        `;
        break;
        
      case 'submitted':
        subject = `📋 New Milestone Submission: ${milestoneTitle}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8F6A4D; text-align: center;">New Milestone Submission</h1>
            
            <p>Hi ${recipientName || 'Mentor'},</p>
            
            <p>A new milestone has been submitted for review:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="color: #1e293b; margin: 0 0 10px 0;">Milestone Details:</h3>
              <p><strong>Milestone:</strong> ${milestoneTitle}</p>
              <p><strong>Project:</strong> ${projectTitle}</p>
            </div>
            
            ${submissionNotes ? `
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">Submission Notes:</h3>
              <p style="margin: 0; color: #164e63;">${submissionNotes}</p>
            </div>
            ` : ''}
            
            <p>Please review and provide feedback when ready.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                Team LoomeroFlow
              </p>
            </div>
          </div>
        `;
        break;
    }
    
    console.log("Sending milestone notification email to:", recipientEmail);

    const emailResponse = await resend.emails.send({
      from: "LoomeroFlow <notifications@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Milestone notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-milestone-notification function:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send milestone notification",
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