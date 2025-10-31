import { useNavigate } from "react-router-dom";
import { MatrixRain } from "@/components/MatrixRain";
import logoMain from "@/assets/logo-main.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/i18n/translations";
import { toast } from "sonner";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = async (lang: Language) => {
    try {
      await setLanguage(lang);
      toast.success(
        lang === 'pt' ? 'Idioma selecionado!' : 
        lang === 'en' ? 'Language selected!' : 
        '¡Idioma seleccionado!'
      );
      navigate("/welcome/1");
    } catch (error) {
      console.error('Error selecting language:', error);
      toast.error(
        lang === 'pt' ? 'Erro ao selecionar idioma' : 
        lang === 'en' ? 'Error selecting language' : 
        'Error al seleccionar idioma'
      );
    }
  };

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
              Choose Your Language
            </h1>
            <p className="text-muted-foreground text-lg">
              Select the course language / Selecione o idioma do curso / Selecciona el idioma del curso
            </p>
          </div>

          {/* Language Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {languages.map((lang, index) => (
              <div
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className="group relative cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glass card */}
                <div className="relative overflow-hidden rounded-2xl bg-card/30 backdrop-blur-xl border border-primary/20 p-8 hover:bg-card/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20">
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
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
