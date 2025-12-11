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
    const planLabel = planDuration === '12M' ? '12 meses' : '30 dias';
    const subject = `Acesso Global Institute System [${planDuration}]`;

    // Premium HTML Email Template
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
          
          <!-- Logo -->
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <img 
                src="https://ddmimmbnuvcqlndkawar.supabase.co/storage/v1/object/public/avatars/logo-main.png" 
                alt="Global Institute of Crypto" 
                width="280" 
                style="max-width: 280px; height: auto;"
              />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(26, 31, 44, 0.95) 0%, rgba(10, 10, 15, 0.98) 100%); border-radius: 16px; border: 1px solid rgba(77, 208, 225, 0.2);">
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Greeting -->
                    <h1 style="color: #D4AF37; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; text-align: center;">
                      Parabéns, ${displayName}!
                    </h1>
                    
                    <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, #4DD0E1, transparent); margin: 0 auto 30px auto;"></div>
                    
                    <!-- Message -->
                    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0; text-align: center;">
                      Você acaba de dar um passo decisivo ao ingressar no mercado mais revolucionário do mundo.
                    </p>
                    
                    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0; text-align: center;">
                      Ao levar este processo a sério durante os próximos <strong style="color: #4DD0E1;">${planLabel}</strong>, você terá a oportunidade de se tornar um <strong style="color: #D4AF37;">operador fora da curva</strong> — e, de fato, transformar sua vida.
                    </p>
                    
                    <!-- Divider -->
                    <div style="border-top: 1px solid rgba(77, 208, 225, 0.2); margin: 30px 0;"></div>
                    
                    <!-- Access Info -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: rgba(77, 208, 225, 0.05); border-radius: 12px; border: 1px solid rgba(77, 208, 225, 0.15);">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="color: #4DD0E1; font-size: 14px; font-weight: 600; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                            Informações de Acesso
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #9ca3af; font-size: 14px;">📧 E-mail:</span>
                                <span style="color: #ffffff; font-size: 14px; font-weight: 600; margin-left: 10px;">${email}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #9ca3af; font-size: 14px;">⏱️ Período:</span>
                                <span style="color: #D4AF37; font-size: 14px; font-weight: 600; margin-left: 10px;">${planLabel} de acesso</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 35px;">
                      <tr>
                        <td style="text-align: center;">
                          <a 
                            href="${setupUrl}" 
                            style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #0a0a0f; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);"
                          >
                            Configurar Senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                      Este link expira em 7 dias.
                    </p>
                    
                    <!-- Divider -->
                    <div style="border-top: 1px solid rgba(77, 208, 225, 0.2); margin: 30px 0;"></div>
                    
                    <!-- Signature -->
                    <p style="color: #e5e5e5; font-size: 15px; margin: 0; text-align: center;">
                      Atenciosamente,
                    </p>
                    <p style="color: #D4AF37; font-size: 18px; font-weight: 600; margin: 10px 0 5px 0; text-align: center;">
                      Professor Jeff Wu
                    </p>
                    <p style="color: #4DD0E1; font-size: 13px; margin: 0; text-align: center; letter-spacing: 1px;">
                      Global Institute of Crypto
                    </p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="color: #4b5563; font-size: 12px; margin: 0;">
                © 2025 Global Institute of Crypto. Todos os direitos reservados.
              </p>
              <p style="color: #374151; font-size: 11px; margin: 10px 0 0 0; font-family: monospace;">
                SECURE • ENCRYPTED • VERIFIED
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
