import { useState, useEffect, useRef } from 'react';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface TranslatedMessageProps {
  content: string;
  originalLanguage?: string;
  className?: string;
}

export const TranslatedMessage = ({ 
  content, 
  originalLanguage = 'pt',
  className = '' 
}: TranslatedMessageProps) => {
  const { language, t, subscribeToLanguageChange } = useLanguage();
  const { translate, isTranslating } = useAutoTranslate();
  const [translatedContent, setTranslatedContent] = useState(content);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced translation for streaming content
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (language !== originalLanguage) {
        const [translated] = await translate([content], language, originalLanguage);
        setTranslatedContent(translated);
      } else {
        setTranslatedContent(content);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, language, originalLanguage]);

  // Re-traduzir quando idioma muda
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(async () => {
      if (language !== originalLanguage) {
        const [translated] = await translate([content], language, originalLanguage);
        setTranslatedContent(translated);
      } else {
        setTranslatedContent(content);
      }
    });
    
    return unsubscribe;
  }, [content, language, originalLanguage, subscribeToLanguageChange, translate]);

  if (isTranslating && language !== originalLanguage) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">{t('chat.translating')}</span>
      </div>
    );
  }

  return (
    <div 
      className={`whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{
        __html: translatedContent
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^\*]+?)\*/g, '<strong>$1</strong>')
      }}
    />
  );
};
