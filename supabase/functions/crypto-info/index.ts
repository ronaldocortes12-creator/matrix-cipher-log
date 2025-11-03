import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEMECOINS = ['DOGE', 'SHIB', 'WIF'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, name } = await req.json();
    
    if (!symbol || !name) {
      return new Response(
        JSON.stringify({ error: 'Symbol and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isMemecoin = MEMECOINS.includes(symbol.toUpperCase());

    if (isMemecoin) {
      const memecoinInfo: Record<string, string> = {
        'DOGE': 'Dogecoin é uma criptomoeda memecoin criada em 2013 por Billy Markus e Jackson Palmer como uma paródia do Bitcoin. Ganhou popularidade pela comunidade ativa e uso em gorjetas online.',
        'SHIB': 'Shiba Inu é uma criptomoeda memecoin lançada em agosto de 2020 por um desenvolvedor anônimo conhecido como "Ryoshi". Foi criada como uma alternativa ao Dogecoin e se autodenomina "Dogecoin killer".',
        'WIF': 'dogwifhat é uma memecoin baseada em Solana lançada em 2023, inspirada no meme viral de um cachorro usando um chapéu de malha rosa. Representa a cultura descontraída das memecoins.'
      };

      return new Response(
        JSON.stringify({ 
          info: memecoinInfo[symbol.toUpperCase()] || 'Memecoin popular na comunidade cripto.',
          isMemecoin: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para criptos não-memecoin, usar Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Escreva um resumo técnico e informativo sobre a criptomoeda ${name} (${symbol}) em português brasileiro, incluindo:

1. Quem criou e quando foi lançada
2. Qual tecnologia/blockchain utiliza
3. Qual o propósito principal e casos de uso
4. Principais diferenciais técnicos

Limite: 200 palavras. Tom: informativo e educacional. Formato: texto corrido em parágrafos.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit atingido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes no Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('Erro ao gerar informações');
    }

    const data = await aiResponse.json();
    const generatedInfo = data.choices?.[0]?.message?.content;

    if (!generatedInfo) {
      throw new Error('Resposta vazia da IA');
    }

    return new Response(
      JSON.stringify({ 
        info: generatedInfo,
        isMemecoin: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in crypto-info function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
