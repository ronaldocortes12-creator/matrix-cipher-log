import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[enforce-lesson-states] 🚀 Starting lesson state enforcement');

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body for optional user_id
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
    } catch {
      // No body or invalid JSON, process all users
    }

    console.log(`[enforce-lesson-states] Target user: ${targetUserId || 'ALL USERS'}`);

    // Build query for users to process
    let usersQuery = supabaseClient
      .from('profiles')
      .select('user_id')
      .is('deleted_at', null);

    if (targetUserId) {
      usersQuery = usersQuery.eq('user_id', targetUserId);
    }

    const { data: users, error: usersError } = await usersQuery.limit(1000);

    if (usersError) {
      console.error('[enforce-lesson-states] ❌ Error fetching users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('[enforce-lesson-states] ⚠️ No users found to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users to process',
          users_processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enforce-lesson-states] 📊 Processing ${users.length} users`);

    const results = {
      users_processed: 0,
      users_corrected: 0,
      errors: [] as any[],
    };

    // Process each user
    for (const user of users) {
      const userId = user.user_id;
      console.log(`[enforce-lesson-states] 👤 Processing user: ${userId}`);

      try {
        // Get all lessons for this user
        const { data: lessons, error: lessonsError } = await supabaseClient
          .from('lessons')
          .select('*')
          .eq('user_id', userId)
          .order('lesson_number', { ascending: true });

        if (lessonsError) throw lessonsError;

        // Get all lesson_progress for this user
        const { data: progress, error: progressError } = await supabaseClient
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .order('lesson_day', { ascending: true });

        if (progressError) throw progressError;

        // Calculate max completed day from both tables
        const maxCompletedFromLessons = lessons
          ?.filter(l => l.status === 'completed')
          .map(l => l.lesson_number)
          .reduce((max, num) => Math.max(max, num), 0) || 0;

        const maxCompletedFromProgress = progress
          ?.filter(p => p.completed === true)
          .map(p => p.lesson_day)
          .reduce((max, day) => Math.max(max, day), 0) || 0;

        const maxCompleted = Math.max(maxCompletedFromLessons, maxCompletedFromProgress);

        console.log(`[enforce-lesson-states] 📈 User ${userId}: max completed = ${maxCompleted}`);

        let needsCorrection = false;

        // Update lessons table
        for (let i = 1; i <= 20; i++) {
          const lesson = lessons?.find(l => l.lesson_number === i);
          
          if (!lesson) {
            console.log(`[enforce-lesson-states] ⚠️ Missing lesson ${i} for user ${userId}`);
            continue;
          }

          let expectedStatus: string;
          if (i <= maxCompleted) {
            expectedStatus = 'completed';
          } else if (i === maxCompleted + 1) {
            expectedStatus = 'active';
          } else {
            expectedStatus = 'pending';
          }

          if (lesson.status !== expectedStatus) {
            console.log(`[enforce-lesson-states] 🔧 Correcting lesson ${i}: ${lesson.status} -> ${expectedStatus}`);
            needsCorrection = true;

            const { error: updateError } = await supabaseClient
              .from('lessons')
              .update({ status: expectedStatus })
              .eq('id', lesson.id);

            if (updateError) {
              console.error(`[enforce-lesson-states] ❌ Error updating lesson ${i}:`, updateError);
              throw updateError;
            }
          }
        }

        // Ensure lesson_progress has entries for all completed lessons
        for (let i = 1; i <= maxCompleted; i++) {
          const progressEntry = progress?.find(p => p.lesson_day === i);
          
          if (!progressEntry || !progressEntry.completed) {
            console.log(`[enforce-lesson-states] 🔧 Upserting progress for day ${i}`);
            needsCorrection = true;

            const { error: upsertError } = await supabaseClient
              .from('lesson_progress')
              .upsert({
                user_id: userId,
                lesson_day: i,
                completed: true,
                completed_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,lesson_day'
              });

            if (upsertError) {
              console.error(`[enforce-lesson-states] ❌ Error upserting progress day ${i}:`, upsertError);
              throw upsertError;
            }
          }
        }

        results.users_processed++;
        if (needsCorrection) {
          results.users_corrected++;
          console.log(`[enforce-lesson-states] ✅ User ${userId} corrected`);
        } else {
          console.log(`[enforce-lesson-states] ✓ User ${userId} already correct`);
        }

        // Log audit entry for corrected users
        if (needsCorrection) {
          await supabaseClient.from('audit_logs').insert({
            action: 'enforce_lesson_states',
            table_name: 'lessons',
            user_id: userId,
            new_data: {
              max_completed: maxCompleted,
              timestamp: new Date().toISOString()
            }
          });
        }

      } catch (error: any) {
        console.error(`[enforce-lesson-states] ❌ Error processing user ${userId}:`, error);
        results.errors.push({
          user_id: userId,
          error: error.message
        });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`[enforce-lesson-states] ⏱️ Execution time: ${executionTime}ms`);

    // Log to cron_execution_logs
    await supabaseClient.from('cron_execution_logs').insert({
      job_name: 'enforce-lesson-states',
      status: results.errors.length > 0 ? 'partial_success' : 'success',
      details: {
        execution_time_ms: executionTime,
        ...results
      }
    });

    console.log('[enforce-lesson-states] ✅ Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        execution_time_ms: executionTime,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[enforce-lesson-states] ❌ Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
