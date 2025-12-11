import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  planDuration: string;
  setupToken: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, planDuration, setupToken }: WelcomeEmailRequest = await req.json();

    if (!email || !setupToken) {
      return new Response(
        JSON.stringify({ error: 'Email e token são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = Deno.env.get('SITE_URL') || 'https://ddmimmbnuvcqlndkawar.lovableproject.com';
    const setupUrl = `${baseUrl}/set-password?token=${setupToken}`;
    const displayName = fullName || email.split('@')[0];
    // Garantir que seja sempre 30 dias (plano único atual)
    const planLabel = '30 dias';
    const subject = `Bem-vindo ao Global Institute of Crypto - Acesso ${planLabel}`;

    // Premium HTML Email Template - Aligned with System Design
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Global Institute of Crypto</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0f;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">
          
          <!-- Logo Real do Sistema -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <div style="display: inline-block; padding: 25px 45px; background: linear-gradient(135deg, #0a0a0f 0%, #1a1f2c 50%, #0f0f16 100%); border-radius: 16px; border: 1px solid rgba(77, 208, 225, 0.3); box-shadow: 0 0 50px rgba(77, 208, 225, 0.2), inset 0 0 30px rgba(77, 208, 225, 0.05);">
                <img src="https://ddmimmbnuvcqlndkawar.supabase.co/storage/v1/object/public/avatars/logo-email.png" alt="Global Institute of Crypto" width="280" style="display: block; max-width: 100%; height: auto;">
              </div>
            </td>
          </tr>
          
          <!-- Gradient Divider -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <div style="width: 120px; height: 2px; margin: 0 auto; background: linear-gradient(90deg, transparent, #4DD0E1, transparent);"></div>
            </td>
          </tr>
          
          <!-- Main Card with Corner Accents -->
          <tr>
            <td>
              <div style="position: relative; padding: 3px; border-radius: 20px; background: linear-gradient(135deg, rgba(77, 208, 225, 0.3), rgba(77, 208, 225, 0.1), rgba(212, 175, 55, 0.2)); box-shadow: 0 0 40px rgba(77, 208, 225, 0.15), inset 0 0 60px rgba(77, 208, 225, 0.05);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(26, 31, 44, 0.98) 0%, rgba(15, 15, 22, 0.99) 50%, rgba(10, 10, 15, 1) 100%); border-radius: 18px;">
                  <tr>
                    <td style="padding: 45px 40px; position: relative;">
                      
                      <!-- Corner Accents (CSS pseudo-elements simulated with borders) -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td>
                            <!-- Top Left Corner -->
                            <div style="position: absolute; top: 15px; left: 15px; width: 25px; height: 25px; border-top: 2px solid #4DD0E1; border-left: 2px solid #4DD0E1;"></div>
                            <!-- Top Right Corner -->
                            <div style="position: absolute; top: 15px; right: 15px; width: 25px; height: 25px; border-top: 2px solid #4DD0E1; border-right: 2px solid #4DD0E1;"></div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Greeting -->
                      <h1 style="color: #D4AF37; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; text-align: center; text-shadow: 0 0 30px rgba(212, 175, 55, 0.4);">
                        Parabéns, ${displayName}!
                      </h1>
                      
                      <!-- Gradient Divider -->
                      <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 15px auto 30px auto;"></div>
                      
                      <!-- Message -->
                      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; text-align: center;">
                        Você acaba de dar um passo decisivo ao ingressar no mercado mais revolucionário do mundo.
                      </p>
                      
                      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; text-align: center;">
                        Ao levar este processo a sério durante os próximos <strong style="color: #4DD0E1; text-shadow: 0 0 10px rgba(77, 208, 225, 0.3);">${planLabel}</strong>, você terá a oportunidade de se tornar um <strong style="color: #D4AF37; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">operador fora da curva</strong> — e, de fato, transformar sua vida.
                      </p>
                      
                      <!-- Gradient Divider -->
                      <div style="width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(77, 208, 225, 0.4), transparent); margin: 30px 0;"></div>
                      
                      <!-- Access Info Box with Glow -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(77, 208, 225, 0.08) 0%, rgba(77, 208, 225, 0.03) 100%); border-radius: 14px; border: 1px solid rgba(77, 208, 225, 0.25); box-shadow: 0 0 25px rgba(77, 208, 225, 0.1), inset 0 0 30px rgba(77, 208, 225, 0.03);">
                        <tr>
                          <td style="padding: 28px;">
                            <p style="color: #4DD0E1; font-size: 13px; font-weight: 600; margin: 0 0 18px 0; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 15px rgba(77, 208, 225, 0.4);">
                              ⚡ Informações de Acesso
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(77, 208, 225, 0.1);">
                                  <span style="color: #9ca3af; font-size: 14px;">📧 E-mail:</span>
                                  <span style="color: #ffffff; font-size: 14px; font-weight: 600; margin-left: 12px;">${email}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 10px 0;">
                                  <span style="color: #9ca3af; font-size: 14px;">⏱️ Período:</span>
                                  <span style="color: #D4AF37; font-size: 14px; font-weight: 600; margin-left: 12px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">${planLabel} de acesso</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button with Premium Glow -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 35px;">
                        <tr>
                          <td style="text-align: center;">
                            <a 
                              href="${setupUrl}" 
                              style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 50%, #B8860B 100%); color: #0a0a0f; font-size: 15px; font-weight: 700; text-decoration: none; padding: 18px 55px; border-radius: 10px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 6px 30px rgba(212, 175, 55, 0.4), 0 0 50px rgba(212, 175, 55, 0.2);"
                            >
                              🔐 Configurar Senha
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 18px; font-style: italic;">
                        ⚠️ Este link expira em 7 dias.
                      </p>
                      
                      <!-- Gradient Divider -->
                      <div style="width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(77, 208, 225, 0.4), transparent); margin: 30px 0;"></div>
                      
                      <!-- Signature with Style -->
                      <p style="color: #9ca3af; font-size: 14px; margin: 0; text-align: center; letter-spacing: 1px;">
                        Atenciosamente,
                      </p>
                      <p style="color: #D4AF37; font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; text-align: center; text-shadow: 0 0 20px rgba(212, 175, 55, 0.4);">
                        Professor Jeff Wu
                      </p>
                      <p style="color: #4DD0E1; font-size: 12px; margin: 0; text-align: center; letter-spacing: 2px; text-transform: uppercase;">
                        Global Institute of Crypto
                      </p>
                      
                      <!-- Bottom Corner Accents -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td>
                            <!-- Bottom Left Corner -->
                            <div style="position: absolute; bottom: 15px; left: 15px; width: 25px; height: 25px; border-bottom: 2px solid #4DD0E1; border-left: 2px solid #4DD0E1;"></div>
                            <!-- Bottom Right Corner -->
                            <div style="position: absolute; bottom: 15px; right: 15px; width: 25px; height: 25px; border-bottom: 2px solid #4DD0E1; border-right: 2px solid #4DD0E1;"></div>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Gradient Spacer -->
          <tr>
            <td style="text-align: center; padding-top: 25px;">
              <div style="width: 60px; height: 2px; margin: 0 auto; background: linear-gradient(90deg, transparent, rgba(77, 208, 225, 0.3), transparent);"></div>
            </td>
          </tr>
          
          <!-- Premium Footer -->
          <tr>
            <td style="padding-top: 25px; text-align: center;">
              <p style="color: #4DD0E1; font-size: 11px; margin: 0 0 12px 0; font-family: 'Courier New', monospace; letter-spacing: 3px; text-shadow: 0 0 10px rgba(77, 208, 225, 0.3);">
                🔒 SECURE • 🛡️ ENCRYPTED • ✓ VERIFIED
              </p>
              <p style="color: #4b5563; font-size: 11px; margin: 0;">
                © 2025 Global Institute of Crypto. Todos os direitos reservados.
              </p>
              <p style="color: #374151; font-size: 10px; margin: 8px 0 0 0;">
                Este e-mail foi enviado automaticamente. Por favor, não responda.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    console.log(`📧 Enviando e-mail de boas-vindas para: ${email}`);

    const { data, error } = await resend.emails.send({
      from: 'Professor Jeff Wu <jeffwu@globalinstituteofcripto.com>',
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Erro ao enviar e-mail:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ E-mail enviado com sucesso: ${data?.id}`);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função send-welcome-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
