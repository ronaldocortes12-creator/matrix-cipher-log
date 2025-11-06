import { useState, useEffect } from 'react';
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
  const { language } = useLanguage();
  const { translate, isTranslating } = useAutoTranslate();
  const [translatedContent, setTranslatedContent] = useState(content);

  useEffect(() => {
    const performTranslation = async () => {
      if (language !== originalLanguage) {
        const [translated] = await translate([content], language, originalLanguage);
        setTranslatedContent(translated);
      } else {
        setTranslatedContent(content);
      }
    };

    performTranslation();
  }, [content, language, originalLanguage, translate]);

  if (isTranslating && language !== originalLanguage) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Traduzindo...</span>
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
