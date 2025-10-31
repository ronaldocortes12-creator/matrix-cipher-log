import { BookOpen, Plus, TrendingUp, Lock, ChevronLeft, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserHeader } from "./UserHeader";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

type Lesson = {
  id: string;
  lesson_number: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
};

type ChatSidebarProps = {
  lessons: Lesson[];
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onToggleSidebar?: () => void;
};

export const ChatSidebar = ({ lessons, activeLessonId, onSelectLesson, onToggleSidebar }: ChatSidebarProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="w-80 h-full overflow-hidden bg-card/50 backdrop-blur-xl border-r border-primary/20 flex flex-col">
      {/* User Header */}
      <UserHeader />

      {/* Toggle Button */}
      {onToggleSidebar && (
        <div className="px-4 py-2 border-b border-primary/10">
          <button
            onClick={onToggleSidebar}
            className="w-full p-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-300 flex items-center justify-center gap-2 group"
            title="Recolher sidebar"
          >
            <ChevronLeft className="h-4 w-4 text-primary group-hover:translate-x-[-2px] transition-transform" />
            <span className="text-xs font-medium text-primary">Recolher</span>
          </button>
        </div>
      )}

      {/* Lessons List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Aulas
            </h2>
          </div>

          {lessons.map((lesson) => {
            const isLocked = lesson.status === 'pending';
            const isClickable = !isLocked;
            const isSpecial = lesson.lesson_number === 21;
            
            return (
              <button
                key={lesson.id}
                onClick={() => isClickable && onSelectLesson(lesson.id)}
                disabled={isLocked}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all duration-300 group",
                  isSpecial && "bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-2 border-yellow-500/40 hover:scale-[1.02] hover:border-yellow-500/60",
                  !isSpecial && isLocked && "bg-card/10 border border-border/50 opacity-60 cursor-not-allowed",
                  !isSpecial && !isLocked && "hover:bg-primary/10 hover:border-primary/30",
                  !isSpecial && activeLessonId === lesson.id && !isLocked
                    ? "bg-primary/20 border border-primary/40"
                    : !isSpecial && !isLocked && "bg-card/30 border border-border",
                  isSpecial && activeLessonId === lesson.id && "bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-2 border-yellow-500/60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isSpecial && "bg-yellow-500/20 text-yellow-500",
                    !isSpecial && lesson.status === 'completed' && "bg-green-500/20 text-green-400",
                    !isSpecial && lesson.status === 'active' && "bg-primary/20 text-primary",
                    !isSpecial && lesson.status === 'pending' && "bg-muted/20 text-muted-foreground"
                  )}>
                    {isSpecial ? (
                      <Award className="h-5 w-5" />
                    ) : isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium",
                        isSpecial && "text-yellow-500",
                        !isSpecial && lesson.status === 'completed' && "text-green-400",
                        !isSpecial && lesson.status === 'active' && "text-primary",
                        !isSpecial && lesson.status === 'pending' && "text-muted-foreground"
                      )}>
                        Dia {lesson.lesson_number}
                      </span>
                      {lesson.status === 'completed' && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                      {isLocked && !isSpecial && (
                        <span className="text-muted-foreground text-xs">🔒</span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-1 line-clamp-2",
                      isSpecial && "text-yellow-500/90 font-medium",
                      !isSpecial && activeLessonId === lesson.id && !isLocked && "text-foreground",
                      !isSpecial && (activeLessonId !== lesson.id || isLocked) && "text-muted-foreground"
                    )}>
                      {lesson.title.replace(/^Dia \d+ - /, '')}
                    </p>
                    
                    {isSpecial && (
                      <p className="text-xs text-yellow-500/70 mt-2 italic leading-tight">
                        Aqui, suas operações serão guiadas por nosso Especialista Estatístico em Cripto
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-primary/20 space-y-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full p-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition-all duration-300 flex items-center justify-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Ver Progresso</span>
        </button>
      </div>
    </div>
  );
};
