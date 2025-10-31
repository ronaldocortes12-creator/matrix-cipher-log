import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Zap, Target } from "lucide-react";

interface LessonCompleteAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  lessonNumber: number;
  totalLessons: number;
}

const motivationalMessages = [
  "Excelente progresso! Você está dominando os fundamentos do mercado.",
  "Impressionante! Cada aula te aproxima da expertise profissional.",
  "Muito bem! Você está construindo uma base sólida de conhecimento.",
  "Parabéns! Sua jornada para se tornar um trader lucrativo está avançando.",
  "Sensacional! Você está no caminho certo para o sucesso nos mercados.",
  "Fantástico! Continue assim e logo será um operador profissional.",
  "Ótimo trabalho! A disciplina é a chave para o sucesso no trading.",
  "Incrível! Você está absorvendo conhecimento valioso a cada aula.",
  "Perfeito! Mantenha o foco e a consistência nos estudos.",
  "Magnífico! Você está se tornando um investidor mais preparado.",
];

export const LessonCompleteAnimation = ({
  isOpen,
  onClose,
  lessonNumber,
  totalLessons,
}: LessonCompleteAnimationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const remainingLessons = totalLessons - lessonNumber;
  const progressPercentage = (lessonNumber / totalLessons) * 100;
  const message = motivationalMessages[lessonNumber % motivationalMessages.length];

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Confetti Effect */}
          {showConfetti && (
            <div className="fixed inset-0 z-50 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--accent))" : "#00ff00",
                    left: `${Math.random() * 100}%`,
                    top: "-10%",
                  }}
                  animate={{
                    y: [0, window.innerHeight + 100],
                    x: [0, (Math.random() - 0.5) * 200],
                    rotate: [0, Math.random() * 360],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Card */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-effect border-2 border-primary/50 rounded-2xl p-8 max-w-lg w-full pointer-events-auto shadow-[0_0_50px_rgba(0,255,0,0.3)]">
              {/* Trophy Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <Trophy className="w-20 h-20 text-primary" />
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-primary text-center mb-4"
              >
                Aula {lessonNumber} Concluída!
              </motion.h2>

              {/* Jeff Wu Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6"
              >
                <p className="text-foreground/90 text-center italic leading-relaxed">
                  "{message}"
                </p>
                <p className="text-primary text-sm text-center mt-2 font-semibold">
                  - Jeff Wu
                </p>
              </motion.div>

              {/* Progress Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 mb-6"
              >
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-foreground/70">
                    <span>Progresso Total</span>
                    <span className="text-primary font-bold">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                    <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary">{lessonNumber}</div>
                    <div className="text-xs text-foreground/60">Completas</div>
                  </div>
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-accent mx-auto mb-1" />
                    <div className="text-2xl font-bold text-accent">{remainingLessons}</div>
                    <div className="text-xs text-foreground/60">Restantes</div>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                    <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary">{totalLessons}</div>
                    <div className="text-xs text-foreground/60">Total</div>
                  </div>
                </div>
              </motion.div>

              {/* Motivational Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center"
              >
                <p className="text-foreground/70 text-sm mb-4">
                  Faltam apenas <span className="text-primary font-bold">{remainingLessons} aulas</span> para você se tornar um operador de mercado lucrativo!
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-background font-bold rounded-lg hover:scale-105 transition-transform shadow-lg shadow-primary/30"
                >
                  Continuar Jornada
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
