import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const users = [
      { email: 'gcortes.lfelipe@gmail.com', password: '123456' },
      { email: 'cortesneto.rona@gmail.com', password: '123456' }
    ]

    const results = []

    for (const userData of users) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.email.split('@')[0]
          }
        })

        if (error) {
          console.error(`Erro ao criar ${userData.email}:`, error.message)
          results.push({ email: userData.email, success: false, error: error.message })
        } else {
          console.log(`Usuário ${userData.email} criado com sucesso`)
          results.push({ email: userData.email, success: true, userId: data.user.id })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`Erro ao criar ${userData.email}:`, errorMessage)
        results.push({ email: userData.email, success: false, error: errorMessage })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro geral:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
