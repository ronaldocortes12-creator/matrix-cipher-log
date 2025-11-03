import { supabase } from "@/integrations/supabase/client";

interface ErrorReport {
  functionName: string;
  error: Error | unknown;
  context?: Record<string, any>;
  userId?: string;
}

export async function reportError({ 
  functionName, 
  error, 
  context, 
  userId 
}: ErrorReport): Promise<void> {
  try {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: errorObj.name || 'UnknownError',
      error_message: errorObj.message || String(error),
      stack_trace: errorObj.stack,
      user_id: userId,
      metadata: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
  } catch (reportError) {
    console.error('Failed to report error:', reportError);
  }
}

export function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    reportError({
      functionName: 'window_error',
      error: event.error,
      context: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      functionName: 'unhandled_promise_rejection',
      error: event.reason,
      context: {
        promise: String(event.promise)
      }
    });
  });
}
