import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MatrixRain } from "@/components/MatrixRain";
import logoMain from "@/assets/logo-main.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/i18n/translations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const { setLanguage, t } = useLanguage();
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserLanguage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setCurrentLanguage((prefs?.language as Language) || null);
      }
      setIsLoading(false);
    };
    
    loadUserLanguage();
  }, []);

  const handleLanguageSelect = async (lang: Language) => {
    try {
      await setLanguage(lang);
      
      toast.success(
        lang === 'pt' ? 'Idioma confirmado!' : 
        lang === 'en' ? 'Language confirmed!' : 
        '¡Idioma confirmado!'
      );
      
      // Verificar se já viu welcome pages
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('has_seen_welcome')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (prefs?.has_seen_welcome) {
          navigate("/chat");
        } else {
          navigate("/welcome/1");
        }
      }
    } catch (error) {
      console.error('Error selecting language:', error);
      toast.error(
        lang === 'pt' ? 'Erro ao selecionar idioma' : 
        lang === 'en' ? 'Error selecting language' : 
        'Error al seleccionar idioma'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = currentLanguage 
    ? "Confirm Your Language / Confirme seu Idioma / Confirma tu Idioma"
    : "Choose Your Language / Escolha seu Idioma / Elige tu Idioma";
  
  const subtitle = currentLanguage
    ? "Your language preference / Sua preferência de idioma / Tu preferencia de idioma"
    : "Select the course language / Selecione o idioma do curso / Selecciona el idioma del curso";

  const languages = [
    { code: 'pt' as Language, name: 'Português', flag: '🇧🇷', nativeName: 'Portuguese' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es' as Language, name: 'Español', flag: '🇪🇸', nativeName: 'Spanish' },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <MatrixRain />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background/80 pointer-events-none" />
      
      {/* Animated glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          {/* Logo */}
          <div className="text-center mb-12 animate-fade-in">
            <img 
              src={logoMain} 
              alt="Logo" 
              className="w-32 h-32 mx-auto mb-6 opacity-90"
            />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-muted-foreground text-lg">
              {subtitle}
            </p>
          </div>

          {/* Language Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {languages.map((lang, index) => (
              <div
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`group relative cursor-pointer ${
                  currentLanguage === lang.code ? 'ring-2 ring-primary/60' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glass card */}
                <div className="relative overflow-hidden rounded-2xl bg-card/30 backdrop-blur-xl border border-primary/20 p-8 hover:bg-card/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
                  {/* Current language badge */}
                  {currentLanguage === lang.code && (
                    <div className="absolute top-3 right-3 z-20">
                      <div className="bg-primary/20 border border-primary/50 rounded-full px-3 py-1 backdrop-blur-sm">
                        <span className="text-xs text-primary font-medium">
                          {lang.code === 'pt' ? 'Atual' : lang.code === 'en' ? 'Current' : 'Actual'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Animated border gradient */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                       style={{
                         background: 'linear-gradient(45deg, transparent 30%, rgba(var(--primary-rgb), 0.3) 50%, transparent 70%)',
                         backgroundSize: '200% 200%',
                         animation: 'gradient-shift 3s ease infinite'
                       }}
                  />

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <div className="text-7xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      {lang.flag}
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">
                      {lang.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {lang.nativeName}
                    </p>

                    {/* Click indicator */}
                    <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                        <span className="text-sm font-medium text-primary">
                          {lang.code === 'pt' ? 'Selecionar' : lang.code === 'en' ? 'Select' : 'Seleccionar'}
                        </span>
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skip button if language already set */}
          {currentLanguage && (
            <div className="text-center mt-8 animate-fade-in">
              <button 
                onClick={() => handleLanguageSelect(currentLanguage)}
                className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm font-medium group"
              >
                {currentLanguage === 'pt' ? 'Continuar com idioma atual →' :
                 currentLanguage === 'en' ? 'Continue with current language →' :
                 'Continuar con idioma actual →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
