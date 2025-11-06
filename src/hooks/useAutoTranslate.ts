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

    // Verificar cache com chave melhorada (evita colisões)
    const cachedResults: (string | null)[] = texts.map(text => {
      const cacheKey = `${targetLang}_${text.substring(0, 50)}_${text.length}_${text.substring(Math.max(0, text.length - 20))}`;
      return cache[cacheKey]?.[targetLang] || null;
    });

    const needsTranslation = texts.filter((_, i) => cachedResults[i] === null);
    
    if (needsTranslation.length === 0) {
      console.log('[useAutoTranslate] Cache hit:', texts.length, 'texts');
      return cachedResults as string[];
    }

    console.log('[useAutoTranslate] Translating:', needsTranslation.length, 'texts to', targetLang);
    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { texts: needsTranslation, targetLanguage: targetLang }
      });

      if (error) throw error;

      // Normalizar resposta
      let translations = data.translations;
      
      // Se não for array, tentar transformar
      if (!Array.isArray(translations)) {
        if (typeof translations === 'string') {
          translations = [translations];
        } else {
          console.error('[useAutoTranslate] Invalid response format:', translations);
          return texts; // Fallback
        }
      }
      
      console.log('[useAutoTranslate] Received:', translations.length, 'translations for', needsTranslation.length, 'texts');

      // Garantir que temos traduções para todos os textos solicitados
      if (translations.length !== needsTranslation.length) {
        console.warn('[useAutoTranslate] Length mismatch - padding with originals');
        while (translations.length < needsTranslation.length) {
          translations.push(needsTranslation[translations.length]);
        }
      }

      // Atualizar cache
      const newCache = { ...cache };
      let translationIndex = 0;
      
      texts.forEach((text, i) => {
        if (cachedResults[i] === null) {
          const cacheKey = `${targetLang}_${text.substring(0, 50)}_${text.length}_${text.substring(Math.max(0, text.length - 20))}`;
          if (!newCache[cacheKey]) newCache[cacheKey] = {};
          newCache[cacheKey][targetLang] = translations[translationIndex];
          cachedResults[i] = translations[translationIndex];
          translationIndex++;
        }
      });

      setCache(newCache);
      return cachedResults as string[];

    } catch (error) {
      console.error('[useAutoTranslate] Translation error:', error);
      return texts; // Fallback: retorna original
    } finally {
      setIsTranslating(false);
    }
  }, [cache]);

  return { translate, isTranslating };
};
