import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ChevronRight } from "lucide-react";

const Welcome1 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[800px] h-auto object-contain opacity-[0.03] select-none"
        />
      </div>
      
      <div className="fixed top-20 left-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-20 right-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1.5s' }} />

      <div className="relative z-10 w-full max-w-3xl px-4 sm:px-6 mx-4 py-4 sm:py-8">
        <div className="glass-effect rounded-2xl p-6 sm:p-12 shadow-2xl border-glow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/30 rounded-br-2xl"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[400px] h-auto object-contain opacity-[0.04] select-none"
            />
          </div>

          <div className="relative z-10 space-y-6 sm:space-y-8">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                Bem-vindo à nova era
              </h1>
              <div className="w-16 sm:w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4 sm:mb-6"></div>
              <p className="text-base sm:text-xl text-primary/80 font-light tracking-wider">
                da rentabilidade cripto
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6 text-foreground/90 leading-relaxed text-sm sm:text-base md:text-lg">
              <p className="text-center font-light">
                Aqui, no <span className="text-primary font-medium">Global Institute of Cripto</span>, não falamos de promessas vazias.
              </p>
              
              <p className="text-center font-light">
                Falamos de <span className="text-primary font-medium">dados</span>, <span className="text-primary font-medium">estudos</span> e a união entre especialistas de mercado e a mais avançada inteligência artificial.
              </p>

              <div className="bg-primary/5 rounded-xl p-4 sm:p-6 border border-primary/20 my-6 sm:my-8">
                <p className="text-center italic text-muted-foreground text-sm sm:text-base">
                  "Se não puder ser brilhante, seja claro"
                </p>
                <p className="text-center text-xs sm:text-sm text-primary/60 mt-2">
                  — David Ogilvy
                </p>
              </div>

              <p className="text-center font-light">
                E a clareza aqui é simples: você terá um <span className="text-primary font-medium">plano concreto</span> para viver de cripto.
              </p>
            </div>

            <div className="flex items-center justify-between mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-primary/20">
              <span className="text-xs sm:text-sm text-muted-foreground">Página 1 de 5</span>
              <Button 
                onClick={() => navigate("/welcome/2")}
                size="default"
                className="font-semibold tracking-wide text-xs sm:text-sm"
              >
                Continuar
                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome1;
