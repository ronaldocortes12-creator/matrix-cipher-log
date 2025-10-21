import { BookOpen, Plus, TrendingUp, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserHeader } from "./UserHeader";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
};

export const ChatSidebar = ({ lessons, activeLessonId, onSelectLesson }: ChatSidebarProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-80 h-full overflow-hidden bg-card/50 backdrop-blur-xl border-r border-primary/20 flex flex-col">
      {/* User Header */}
      <UserHeader />

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
            
            return (
              <button
                key={lesson.id}
                onClick={() => isClickable && onSelectLesson(lesson.id)}
                disabled={isLocked}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all duration-300 group",
                  isLocked 
                    ? "bg-card/10 border border-border/50 opacity-60 cursor-not-allowed"
                    : "hover:bg-primary/10 hover:border-primary/30",
                  activeLessonId === lesson.id && !isLocked
                    ? "bg-primary/20 border border-primary/40"
                    : !isLocked && "bg-card/30 border border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    lesson.status === 'completed' 
                      ? "bg-green-500/20 text-green-400"
                      : lesson.status === 'active'
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/20 text-muted-foreground"
                  )}>
                    {isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium",
                        lesson.status === 'completed'
                          ? "text-green-400"
                          : lesson.status === 'active'
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}>
                        Dia {lesson.lesson_number}
                      </span>
                      {lesson.status === 'completed' && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                      {isLocked && (
                        <span className="text-muted-foreground text-xs">🔒</span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm mt-1 line-clamp-2",
                      activeLessonId === lesson.id && !isLocked ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {lesson.title.replace(/^Dia \d+ - /, '')}
                    </p>
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
