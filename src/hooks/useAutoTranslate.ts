import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationCache {
  [key: string]: { [lang: string]: string };
}

export const useAutoTranslate = () => {
  const [cache, setCache] = useState<TranslationCache>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(async (
    texts: string[],
    targetLang: string,
    originalLang?: string
  ): Promise<string[]> => {
    // Se for o idioma original, não traduz
    if (originalLang && originalLang === targetLang) {
      return texts;
    }

    // Verificar cache
    const cachedResults: (string | null)[] = texts.map(text => {
      const cacheKey = `${text.substring(0, 100)}...`; // Key baseada em início do texto
      return cache[cacheKey]?.[targetLang] || null;
    });

    const needsTranslation = texts.filter((_, i) => cachedResults[i] === null);
    
    if (needsTranslation.length === 0) {
      return cachedResults as string[];
    }

    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { texts: needsTranslation, targetLanguage: targetLang }
      });

      if (error) throw error;

      const translations = data.translations;

      // Atualizar cache
      const newCache = { ...cache };
      let translationIndex = 0;
      
      texts.forEach((text, i) => {
        if (cachedResults[i] === null) {
          const cacheKey = `${text.substring(0, 100)}...`;
          if (!newCache[cacheKey]) newCache[cacheKey] = {};
          newCache[cacheKey][targetLang] = translations[translationIndex];
          cachedResults[i] = translations[translationIndex];
          translationIndex++;
        }
      });

      setCache(newCache);
      return cachedResults as string[];

    } catch (error) {
      console.error('Translation error:', error);
      return texts; // Fallback: retorna original
    } finally {
      setIsTranslating(false);
    }
  }, [cache]);

  return { translate, isTranslating };
};
