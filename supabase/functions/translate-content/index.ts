import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage } = await req.json();
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetLanguage || !['pt', 'en', 'es'].includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: 'targetLanguage must be pt, en, or es' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const languageNames: Record<string, string> = {
      pt: 'Portuguese (Brazil)',
      en: 'English (USA)',
      es: 'Spanish'
    };
    
    const prompt = `You are a professional translator. Translate the following texts to ${languageNames[targetLanguage]}. 

CRITICAL RULES:
- Return ONLY a valid JSON object with this exact format: {"translations":["text1","text2",...]}
- The translations array MUST have exactly ${texts.length} items
- Keep markdown formatting (**bold**, *italic*)
- For technical terms related to crypto/trading, keep them in English if commonly used
- Preserve emojis and special characters
- Keep numbers and percentages as they are
- DO NOT add explanations, comments, or any text outside the JSON object

Texts to translate:
${texts.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices[0].message.content || '';
    
    console.log('[Translate] Expected:', texts.length, 'texts');
    
    // Parse JSON robusto
    let translations: string[] = [];
    
    try {
      // Extrair JSON do conteúdo
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[Translate] No JSON found in response:', translatedText.substring(0, 200));
        throw new Error('No JSON object in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura
      if (!parsed.translations || !Array.isArray(parsed.translations)) {
        console.error('[Translate] Invalid JSON structure:', parsed);
        throw new Error('Invalid translations structure');
      }
      
      translations = parsed.translations;
      
      // Normalizar para garantir mesmo tamanho
      if (translations.length !== texts.length) {
        console.warn('[Translate] Count mismatch - expected:', texts.length, 'received:', translations.length);
        
        // Caso especial: 1 input, 1 output (mesmo que seja string)
        if (texts.length === 1 && translations.length >= 1) {
          translations = [translations[0]];
        } else if (translations.length < texts.length) {
          // Completar com textos originais
          while (translations.length < texts.length) {
            translations.push(texts[translations.length]);
          }
        } else {
          // Truncar excesso
          translations = translations.slice(0, texts.length);
        }
      }
      
      console.log('[Translate] Success:', translations.length, 'translations');
      
    } catch (error) {
      console.error('[Translate] Parse error:', error);
      console.error('[Translate] AI response:', translatedText.substring(0, 500));
      
      // Fallback: retornar textos originais
      return new Response(
        JSON.stringify({ translations: texts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
