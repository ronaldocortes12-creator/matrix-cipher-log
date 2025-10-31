import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Lesson = {
  day: number;
  title: string;
  completed: boolean;
};

type Module = {
  id: string;
  title: string;
  color: string;
  lessons: Lesson[];
};

const Dashboard = () => {
  const { t } = useLanguage();
  
  const getModules = (): Module[] => [
    {
      id: "1",
      title: t('dashboard.module1'),
      color: "hsl(220, 90%, 60%)",
      lessons: [
        { day: 1, title: t('dashboard.day1'), completed: false },
        { day: 2, title: t('dashboard.day2'), completed: false },
        { day: 3, title: t('dashboard.day3'), completed: false },
        { day: 4, title: t('dashboard.day4'), completed: false },
        { day: 5, title: t('dashboard.day5'), completed: false },
      ],
    },
    {
      id: "2",
      title: t('dashboard.module2'),
      color: "hsl(270, 90%, 60%)",
      lessons: [
        { day: 6, title: t('dashboard.day6'), completed: false },
        { day: 7, title: t('dashboard.day7'), completed: false },
        { day: 8, title: t('dashboard.day8'), completed: false },
        { day: 9, title: t('dashboard.day9'), completed: false },
        { day: 10, title: t('dashboard.day10'), completed: false },
      ],
    },
    {
      id: "3",
      title: t('dashboard.module3'),
      color: "hsl(330, 90%, 60%)",
      lessons: [
        { day: 11, title: t('dashboard.day11'), completed: false },
        { day: 12, title: t('dashboard.day12'), completed: false },
        { day: 13, title: t('dashboard.day13'), completed: false },
        { day: 14, title: t('dashboard.day14'), completed: false },
        { day: 15, title: t('dashboard.day15'), completed: false },
      ],
    },
    {
      id: "4",
      title: t('dashboard.module4'),
      color: "hsl(30, 95%, 60%)",
      lessons: [
        { day: 16, title: t('dashboard.day16'), completed: false },
        { day: 17, title: t('dashboard.day17'), completed: false },
        { day: 18, title: t('dashboard.day18'), completed: false },
        { day: 19, title: t('dashboard.day19'), completed: false },
        { day: 20, title: t('dashboard.day20'), completed: false },
      ],
    },
    {
      id: "5",
      title: t('dashboard.module5'),
      color: "hsl(45, 95%, 60%)",
      lessons: [
        { day: 21, title: t('dashboard.day21'), completed: false },
      ],
    },
  ];

  const [modules, setModules] = useState<Module[]>(getModules());

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressData) {
        const updatedModules = getModules().map(module => ({
          ...module,
          lessons: module.lessons.map(lesson => {
            const progress = progressData.find(p => p.lesson_day === lesson.day);
            return {
              ...lesson,
              completed: progress?.completed || false
            };
          })
        }));
        setModules(updatedModules);
      }
    };

    loadProgress();

    // Atualizar em tempo real
    const channel = supabase
      .channel('lesson_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_progress'
        },
        () => {
          loadProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0);
  const completedLessons = modules.reduce(
    (acc, module) => acc + module.lessons.filter((l) => l.completed).length,
    0
  );
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="min-h-screen w-full relative">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Header */}
      <div className="relative z-10 bg-card/50 backdrop-blur-lg border-b border-primary/20 p-4">
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
          {t('dashboard.title')}
        </h1>
      </div>

      <div className="relative z-10 p-4 pb-24 space-y-6">
        {/* Progress Card */}
        <div className="glass-effect rounded-2xl p-6 border-glow">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-primary mb-2">
              {progressPercentage}%
            </div>
            <p className="text-muted-foreground text-sm">{t('dashboard.completed')}</p>
          </div>
          
          <Progress value={progressPercentage} className="h-3 mb-3" />
          
          <p className="text-center text-sm text-foreground/80">
            {completedLessons} de {totalLessons} {t('dashboard.lessonsCompleted')}
          </p>
        </div>

        {/* Modules Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {modules.map((module) => {
            const isSpecial = module.id === "5";
            
            return (
              <AccordionItem
                key={module.id}
                value={module.id}
                className={cn(
                  "glass-effect rounded-xl border-0 overflow-hidden",
                  isSpecial && "bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 border-2 border-yellow-500/30"
                )}
                style={{
                  boxShadow: isSpecial 
                    ? `0 0 30px ${module.color}60, 0 0 50px ${module.color}30`
                    : `0 0 20px ${module.color}30`,
                }}
              >
                <AccordionTrigger
                  className="px-5 py-4 hover:no-underline"
                  style={{
                    borderLeft: `4px solid ${module.color}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: module.color }}
                    />
                    <span className={cn(
                      "font-semibold",
                      isSpecial ? "text-yellow-500" : "text-foreground"
                    )}>
                      {module.title}
                    </span>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-5 pb-4">
                  <div className="space-y-2 pt-2">
                    {module.lessons.map((lesson, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-all",
                          isSpecial && "bg-yellow-500/10 border border-yellow-500/20",
                          !isSpecial && lesson.completed && "bg-primary/10 text-foreground",
                          !isSpecial && !lesson.completed && "bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <CheckCircle2
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSpecial && "text-yellow-500",
                            !isSpecial && lesson.completed && "text-primary",
                            !isSpecial && !lesson.completed && "text-muted-foreground/50"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-medium",
                            isSpecial && "text-yellow-500"
                          )}>
                            {t('dashboard.dayLabel')} {lesson.day}
                          </span>
                          <span className={cn(
                            "text-xs",
                            isSpecial ? "text-yellow-500/80" : "text-muted-foreground"
                          )}>
                            {lesson.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {isSpecial && (
                    <div className="px-3 py-3 text-xs text-yellow-500/70 italic border-t border-yellow-500/20 mt-3 pt-3">
                      {t('dashboard.consultoriaDesc')}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <TabBar />
    </div>
  );
};

export default Dashboard;
