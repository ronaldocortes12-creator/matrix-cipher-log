import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n/translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'pt' as Language, flag: '🇧🇷', name: 'Português' },
  { code: 'en' as Language, flag: '🇺🇸', name: 'English' },
  { code: 'es' as Language, flag: '🇪🇸', name: 'Español' }
];

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  
  const currentLang = languages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full px-3 py-2 rounded-lg glass-effect border border-primary/20 
                     hover:border-primary/40 transition-all duration-300 
                     flex items-center gap-2 group"
          title="Selecionar idioma"
        >
          <Globe className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
          <span className="text-xl">{currentLang?.flag}</span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left">
            {currentLang?.code.toUpperCase()}
          </span>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="glass-effect border-primary/20 min-w-[180px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              language === lang.code ? 'bg-primary/10' : ''
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span className="text-sm">{lang.name}</span>
            {language === lang.code && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
