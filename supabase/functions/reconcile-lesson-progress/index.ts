import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 Iniciando reconciliação de lesson_progress...');

    // 1. Buscar todas as lessons completadas
    const { data: completedLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('user_id, lesson_number, status, updated_at')
      .eq('status', 'completed');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Encontradas ${completedLessons?.length || 0} aulas completadas`);

    const fixes = [];
    const errors = [];
    
    for (const lesson of completedLessons || []) {
      try {
        // Verificar se existe em lesson_progress
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', lesson.user_id)
          .eq('lesson_day', lesson.lesson_number)
          .eq('completed', true)
          .maybeSingle();

        if (!progress) {
          console.log(`⚠️ Inconsistência encontrada: user ${lesson.user_id}, aula ${lesson.lesson_number}`);
          
          // Criar registro faltante
          const { error: upsertError } = await supabase
            .from('lesson_progress')
            .upsert({
              user_id: lesson.user_id,
              lesson_day: lesson.lesson_number,
              completed: true,
              completed_at: lesson.updated_at
            }, {
              onConflict: 'user_id,lesson_day'
            });

          if (upsertError) {
            console.error(`❌ Erro ao corrigir: ${upsertError.message}`);
            errors.push({
              user_id: lesson.user_id,
              lesson_number: lesson.lesson_number,
              error: upsertError.message
            });
          } else {
            console.log(`✅ Corrigido: user ${lesson.user_id}, aula ${lesson.lesson_number}`);
            fixes.push({
              user_id: lesson.user_id,
              lesson_number: lesson.lesson_number,
              fixed_at: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Erro ao processar aula:`, errorMessage);
        errors.push({
          user_id: lesson.user_id,
          lesson_number: lesson.lesson_number,
          error: errorMessage
        });
      }
    }

    // Log de execução
    const { error: logError } = await supabase.from('cron_execution_logs').insert({
      job_name: 'reconcile-lesson-progress',
      status: errors.length > 0 ? 'partial_success' : 'success',
      details: {
        total_checked: completedLessons?.length || 0,
        fixes_applied: fixes.length,
        errors_count: errors.length,
        fixed_records: fixes,
        errors: errors.length > 0 ? errors : undefined
      }
    });

    if (logError) {
      console.error('❌ Erro ao gravar log:', logError);
    }

    const result = {
      success: true,
      checked: completedLessons?.length || 0,
      fixed: fixes.length,
      error_count: errors.length,
      fixes,
      error_details: errors.length > 0 ? errors : undefined
    };

    console.log('✅ Reconciliação completa:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Erro fatal na reconciliação:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});
