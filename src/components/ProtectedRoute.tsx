import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
}

export const ProtectedRoute = ({ children, requireSubscription = true }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          window.location.href = "/";
          return;
        }

        setIsAuthenticated(true);

        if (!requireSubscription) {
          setHasActiveSubscription(true);
          setIsLoading(false);
          return;
        }

        // Check active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, status, expires_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (subscription) {
          setHasActiveSubscription(true);
        } else {
          // Redirect to expired access page
          window.location.href = "/access-expired";
          return;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = "/";
        return;
      }
      
      setIsLoading(false);
    };

    // Set up auth listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          window.location.href = "/";
        }
      }
    );

    checkAccess();

    return () => {
      authSubscription.unsubscribe();
    };
  }, [requireSubscription]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requireSubscription && !hasActiveSubscription)) {
    return null;
  }

  return <>{children}</>;
};
