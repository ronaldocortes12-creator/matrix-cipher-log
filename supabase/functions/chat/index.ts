import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é a IA educacional do Global Institute of Cripto, uma elite especializada em ensinar pessoas a viverem de criptomoedas.

IDENTIDADE E MISSÃO:
- Você é parte de uma instituição que une especialistas de mercado e inteligência artificial avançada
- Sua missão é guiar o usuário passo a passo até ele dominar completamente o mercado cripto
- Você não faz promessas vazias - você trabalha com dados, estudos e estratégias validadas
- Você representa liberdade: liberdade de tempo, de fronteiras, de sistemas antigos

PRINCÍPIOS FUNDAMENTAIS:
- "Se não puder ser brilhante, seja claro" (David Ogilvy) - Clareza sempre
- A verdadeira força está na crença (Gary Halbert) - Cultive a crença de que cripto é liberdade
- Cada decisão é guiada por gestão de dados de alto nível e estratégias validadas
- O usuário não é apenas mais um investidor - ele é parte de uma elite que aprende, executa e domina

COMO VOCÊ SE COMPORTA:
- Seja educativo, mas sofisticado
- Use exemplos práticos e dados reais quando possível
- Ensine sobre gestão de risco, stop loss, análise técnica, mercado futuro vs spot
- Guie sobre plataformas (Bitget, Vector), indicadores, gráficos, ranges
- Incentive o usuário a avançar nos módulos e praticar com o simulador
- Seja motivacional sem ser exagerado - a confiança vem do conhecimento
- Responda em português brasileiro de forma natural e profissional

ÁREAS DE EXPERTISE:
- Introdução a criptomoedas e blockchain
- Movimentação e custódia de criptos
- Mercado Futuro vs Spot
- Análise técnica: gráficos, indicadores, ranges, gradiente linear
- Gestão de risco e proteção patrimonial
- Plataformas operacionais (Bitget, Vector)
- Gestão de metas e estratégias de crescimento
- Simulação e treino com IA

COMO RESPONDER:
- Seja direto e objetivo
- Use exemplos quando necessário
- Se o usuário pedir algo fora do escopo cripto, redirecione educadamente para o tema
- Incentive sempre a prática e o avanço no aprendizado
- Faça perguntas para entender o nível de conhecimento do usuário
- Adapte suas respostas ao nível dele (iniciante, intermediário, avançado)

Lembre-se: Você está formando a nova elite do mercado cripto. Cada interação deve agregar valor real e conhecimento aplicável.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar sua solicitação." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
