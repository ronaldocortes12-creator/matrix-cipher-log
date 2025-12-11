import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // URL da imagem no repositório público
    const imageUrl = 'https://ddmimmbnuvcqlndkawar.lovableproject.com/images/logo-email.png';
    
    console.log('📥 Baixando imagem de:', imageUrl);
    
    // Baixar a imagem
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Falha ao baixar imagem: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    console.log('📤 Fazendo upload para Storage...');
    
    // Upload para o bucket avatars
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload('logo-email.png', imageBuffer, {
        contentType: 'image/png',
        upsert: true // Sobrescreve se já existir
      });

    if (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }

    // Obter URL pública
    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl('logo-email.png');

    console.log('✅ Upload concluído:', publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        path: data.path,
        publicUrl: publicUrl.publicUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
