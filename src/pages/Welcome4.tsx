import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ChevronRight } from "lucide-react";

const Welcome4 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-tl from-primary/15 via-background to-deep-navy" style={{ zIndex: 1 }} />
      
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[850px] h-auto object-contain opacity-[0.025] select-none"
        />
      </div>
      
      <div className="fixed top-10 right-40 w-[550px] h-[550px] bg-primary/15 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '0.3s' }} />
      <div className="fixed bottom-10 left-40 w-[600px] h-[600px] bg-primary/9 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1.8s' }} />

      <div className="relative z-10 w-full max-w-3xl px-6 mx-4 py-8">
        <div className="glass-effect rounded-2xl p-12 shadow-2xl border-glow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[400px] h-auto object-contain opacity-[0.04] select-none"
            />
          </div>

          <div className="relative z-10 space-y-8">
            <div className="text-center mb-10">
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-6"></div>
              <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                Parte da Elite
              </h2>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-6"></div>
            </div>

            <div className="space-y-8 text-foreground/90 leading-relaxed text-lg">
              <p className="text-center text-xl font-light">
                Aqui, você não será apenas mais um investidor.
              </p>

              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl p-8 border border-primary/20">
                <p className="text-center text-xl font-medium text-primary mb-4">
                  Você será parte de uma elite que aprende, executa e domina.
                </p>
              </div>

              <p className="text-center font-light">
                Será guiado <span className="text-primary font-medium">passo a passo</span>, com princípios sólidos, até que sua jornada se torne natural.
              </p>

              <div className="my-10 py-6">
                <p className="text-center font-light italic text-muted-foreground">
                  E quando olhar para trás, perceberá que essa escolha o diferenciou de todos os outros.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">Aprende</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">Executa</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">Domina</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-primary/20">
              <span className="text-sm text-muted-foreground">Página 2 de 3</span>
              <Button 
                onClick={() => navigate("/welcome/5")}
                size="lg"
                className="font-semibold tracking-wide"
              >
                Continuar
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome4;
