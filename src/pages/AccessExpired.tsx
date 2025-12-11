import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-main.png";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const AccessExpired = () => {
  const { t } = useLanguage();
  
  const handleRenew = () => {
    window.open('https://payment.ticto.app/O91100587', '_blank');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Premium Glows */}
      <div className="fixed top-20 left-20 w-[480px] h-[480px] bg-destructive/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-20 right-20 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1.5s' }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src={logo} 
            alt="Global Institute of Cripto" 
            className="w-48 h-auto object-contain opacity-80"
          />
        </div>

        {/* Expired Card */}
        <div className="glass-effect rounded-2xl p-8 shadow-2xl border border-destructive/30 relative overflow-hidden">
          {/* Corner accents - using destructive color */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-destructive/40 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-destructive/40 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-destructive/40 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-destructive/40 rounded-br-2xl"></div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/40">
              <Clock className="w-10 h-10 text-destructive" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-3 text-foreground">
            Acesso Expirado
          </h1>
          
          {/* Message */}
          <p className="text-center text-muted-foreground mb-6 leading-relaxed">
            Seu período de acesso ao <span className="text-primary font-medium">Global Institute of Crypto</span> chegou ao fim.
          </p>
          
          <p className="text-center text-muted-foreground mb-8 text-sm">
            Renove seu plano para continuar aprendendo e ter acesso a todas as funcionalidades da plataforma.
          </p>

          {/* Renew Button */}
          <Button
            onClick={handleRenew}
            size="lg"
            className="w-full font-semibold tracking-wide mb-4 bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-background"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Renovar Plano
          </Button>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="lg"
            className="w-full font-medium"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Dúvidas? Entre em contato conosco
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessExpired;
