import { useState, useEffect } from "react";
import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-main.png";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/i18n/translations";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

  // Verificar se usuário já está logado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Verificar se já viu as welcome pages
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('has_seen_welcome')
          .eq('user_id', user.id)
          .maybeSingle();

        if (preferences?.has_seen_welcome) {
          window.location.href = "/chat";
        } else {
          window.location.href = "/welcome/1";
        }
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
      
      // Enforce lesson states
      try {
        await supabase.functions.invoke('enforce-lesson-states', {
          body: { userId: data.user.id }
        });
      } catch (e) {
        console.warn('Failed to enforce lesson states:', e);
      }

      // Verificar se usuário já tem idioma configurado
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('language, has_seen_welcome')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!userPrefs?.language) {
        window.location.href = "/language-selection";
      } else if (userPrefs.has_seen_welcome) {
        window.location.href = "/chat";
      } else {
        window.location.href = "/welcome/1";
      }
      }
    } catch (error: any) {
      toast({
        title: t('login.loginError'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Signup removido - usuários devem comprar via Ticto

  const handleLanguageChange = async (lang: Language) => {
    setSelectedLanguage(lang);
    await setLanguage(lang);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Premium Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Logo Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[640px] h-auto object-contain opacity-[0.03] select-none"
        />
      </div>
      
      {/* Animated Premium Glows */}
      <div className="fixed top-20 left-20 w-[480px] h-[480px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-20 right-20 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1.5s' }} />

      {/* Login Container with Scale */}
      <div className="w-full flex justify-center" style={{ zIndex: 10 }}>
        <div className="origin-top scale-100 md:scale-95 lg:scale-[0.85] transition-transform duration-300">
          <div className="w-full max-w-sm px-5 py-0">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="Global Institute of Cripto" 
                className="w-58 sm:w-64 h-auto object-contain drop-shadow-[0_0_50px_rgba(77,208,225,0.6)] filter brightness-125 contrast-125"
                style={{ filter: 'drop-shadow(0 0 50px rgba(77,208,225,0.6)) brightness(1.25) contrast(1.25)' }}
              />
            </div>

            {/* Premium Login Card */}
            <div className="glass-effect rounded-2xl p-3 sm:p-5 pt-2 sm:pt-3 shadow-2xl border-glow relative overflow-hidden">
              {/* Premium corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/30 rounded-br-2xl"></div>
              {/* Logo Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <img 
                  src={logo} 
                  alt="" 
                  className="w-[240px] h-auto object-contain opacity-[0.04] select-none"
                />
              </div>

              {/* Language Selector */}
              <div className="flex justify-center gap-2 mb-2 relative z-10">
                {[
                  { code: 'pt' as Language, flag: 'https://flagcdn.com/br.svg', name: 'PT', country: 'Brasil' },
                  { code: 'en' as Language, flag: 'https://flagcdn.com/us.svg', name: 'EN', country: 'USA' },
                  { code: 'es' as Language, flag: 'https://flagcdn.com/es.svg', name: 'ES', country: 'España' }
                ].map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`
                          px-4 py-2 rounded-lg glass-effect
                          border transition-all duration-300
                          flex items-center gap-2
                          hover:scale-105 hover:border-primary/50
                          ${selectedLanguage === lang.code 
                            ? 'border-primary/80 shadow-[0_0_20px_rgba(77,208,225,0.3)]' 
                            : 'border-primary/20'
                          }
                        `}
                      >
                        <img 
                          src={lang.flag} 
                          alt={lang.country}
                          className="w-5 h-5 rounded-sm object-cover shadow-sm"
                        />
                        <span className="text-sm font-medium text-foreground">{lang.name}</span>
                      </button>
                ))}
              </div>

              <div className="text-center mb-3 relative z-10">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  {t('login.title')}
                </h1>
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm font-light leading-relaxed tracking-wide">
                  {t('login.subtitle')}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/90 text-sm font-medium tracking-wide">
                    {t('login.email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('login.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/90 text-sm font-medium tracking-wide">
                    {t('login.password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('login.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold tracking-wide"
                  disabled={isLoading}
                >
                  {t('login.loginButton')}
                </Button>

                {/* Info about signup */}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground/70">
                    Acesso exclusivo para alunos matriculados
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground/80">
                © 2025 Global Institute of Cripto
              </p>
              <p className="text-xs text-primary/50 mt-1 matrix-code">
                SECURE • ENCRYPTED • VERIFIED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
