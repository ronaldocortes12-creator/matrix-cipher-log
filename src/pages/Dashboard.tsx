import { useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Lesson = {
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
  const modules: Module[] = [
    {
      id: "1",
      title: "Módulo 01",
      color: "hsl(220, 90%, 60%)",
      lessons: [
        { title: "Introdução a Cripto", completed: true },
        { title: "Movimentação de Criptos", completed: true },
        { title: "Mercado Futuro", completed: false },
        { title: "Spot x Futuro", completed: false },
        { title: "O seu plano", completed: false },
      ],
    },
    {
      id: "2",
      title: "Módulo 02",
      color: "hsl(270, 90%, 60%)",
      lessons: [
        { title: "A análise", completed: false },
        { title: "Gráfico x Vector", completed: true },
        { title: "Indicadores", completed: false },
        { title: "Ranges", completed: false },
        { title: "Gradiente Linear", completed: false },
      ],
    },
    {
      id: "3",
      title: "Módulo 03",
      color: "hsl(330, 90%, 60%)",
      lessons: [
        { title: "O operacional", completed: false },
        { title: "Bitget", completed: false },
        { title: "Vector", completed: true },
        { title: "Proteção Patrimonial", completed: false },
        { title: "Gestão de Metas", completed: false },
      ],
    },
    {
      id: "4",
      title: "Treino com IA",
      color: "hsl(30, 95%, 60%)",
      lessons: [
        { title: "Simulador com metas do mês", completed: false },
        { title: "IA para trazer relatório", completed: false },
        { title: "IA que guia e instrui", completed: true },
        { title: "IA com estatísticas e ranges estudados", completed: false },
        { title: "APP com indicadores e comunidade", completed: false },
      ],
    },
  ];

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
          Dados e Evoluções
        </h1>
      </div>

      <div className="relative z-10 p-4 pb-24 space-y-6">
        {/* Progress Card */}
        <div className="glass-effect rounded-2xl p-6 border-glow">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-primary mb-2">
              {progressPercentage}%
            </div>
            <p className="text-muted-foreground text-sm">Concluído</p>
          </div>
          
          <Progress value={progressPercentage} className="h-3 mb-3" />
          
          <p className="text-center text-sm text-foreground/80">
            {completedLessons} de {totalLessons} aulas concluídas
          </p>
        </div>

        {/* Modules Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {modules.map((module) => (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="glass-effect rounded-xl border-0 overflow-hidden"
              style={{
                boxShadow: `0 0 20px ${module.color}30`,
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
                  <span className="font-semibold text-foreground">{module.title}</span>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-5 pb-4">
                <div className="space-y-2 pt-2">
                  {module.lessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all",
                        lesson.completed
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 shrink-0",
                          lesson.completed ? "text-primary" : "text-muted-foreground/50"
                        )}
                      />
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <TabBar />
    </div>
  );
};

export default Dashboard;
