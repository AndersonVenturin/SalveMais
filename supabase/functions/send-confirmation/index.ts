import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  nome: string;
  userId: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send confirmation function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome, userId }: ConfirmationEmailRequest = await req.json();
    console.log("Processing confirmation email for:", email);

    // Gerar token único para confirmação com timestamp de expiração (2 minutos para teste)
    const confirmationToken = crypto.randomUUID();
    const expirationTime = Date.now() + (2 * 60 * 1000); // 2 minutos em milliseconds
    
    // Obter a URL base do request
    const requestUrl = new URL(req.url);
    const baseUrl = req.headers.get('referer') || req.headers.get('origin') || `${requestUrl.protocol}//${requestUrl.host}`;
    const siteUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    const confirmationUrl = `${siteUrl}/confirm-email?token=${confirmationToken}&userId=${userId}&expires=${expirationTime}`;
    
    console.log("Confirmation URL:", confirmationUrl);

    const emailResponse = await resend.emails.send({
      from: "Salve+ <onboarding@resend.dev>",
      to: [email],
      subject: "Confirme seu e-mail - Salve+",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Bem-vindo ao Salve+!</h1>
          <p>Olá, ${nome}!</p>
          <p>Obrigado por se cadastrar no Salve+. Para ativar sua conta, clique no link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Confirmar E-mail
            </a>
          </div>
           <p style="color: #666; font-size: 14px;">
             <strong>Este link expira em 2 minutos.</strong> Se você não solicitou este cadastro, pode ignorar este e-mail.
           </p>
          <p style="color: #666; font-size: 14px;">
            Atenciosamente,<br>
            Equipe Salve+
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      confirmationToken,
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation function:", error);
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