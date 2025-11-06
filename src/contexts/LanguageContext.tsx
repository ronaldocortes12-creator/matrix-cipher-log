import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { translations, Language } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  subscribeToLanguageChange: (callback: () => void) => () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt');
  const [loading, setLoading] = useState(true);
  const [languageChangeListeners, setLanguageChangeListeners] = useState<Set<() => void>>(new Set());

  useEffect(() => {
    loadUserLanguage();
  }, []);

  const loadUserLanguage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setLanguageState((data.language as Language) || 'pt');
        }
      }
    } catch (error) {
      console.error('Error loading user language:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLanguageChange = (callback: () => void) => {
    setLanguageChangeListeners(prev => new Set(prev).add(callback));
    return () => {
      setLanguageChangeListeners(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    
    // Notificar todos os listeners
    languageChangeListeners.forEach(listener => listener());
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({ 
            user_id: user.id, 
            language: lang 
          }, { 
            onConflict: 'user_id' 
          });
      }
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, subscribeToLanguageChange }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
