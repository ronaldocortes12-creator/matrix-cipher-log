import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Sparkles } from "lucide-react";

const Welcome5 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-primary/10 to-background" style={{ zIndex: 1 }} />
      
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[700px] h-auto object-contain opacity-[0.04] select-none animate-pulse-glow"
        />
      </div>
      
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/12 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />

      <div className="relative z-10 w-full max-w-4xl px-6 mx-4 py-8">
        <div className="glass-effect rounded-2xl p-14 shadow-2xl border-glow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full border-2 border-primary/20 rounded-2xl"></div>
          <div className="absolute top-2 left-2 right-2 bottom-2 border border-primary/10 rounded-2xl"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[450px] h-auto object-contain opacity-[0.03] select-none"
            />
          </div>

          <div className="relative z-10 space-y-10">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-8">
                <Sparkles className="w-12 h-12 text-primary animate-pulse-glow" />
              </div>
              <h2 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent mb-6">
                O Futuro é Agora
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"></div>
            </div>

            <div className="space-y-10 text-foreground/90 leading-relaxed">
              <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-10 border-2 border-primary/30">
                <p className="text-center text-2xl font-semibold text-primary mb-6 tracking-wide">
                  A liberdade está ao seu alcance.
                </p>
                <p className="text-center text-lg font-light">
                  E você acaba de dar o primeiro passo para dominar, de fato, o mercado.
                </p>
              </div>

              <div className="text-center py-8">
                <p className="text-3xl font-bold tracking-wide bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  Bem-vindo à nova era.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-10">
                <div className="text-center p-6 bg-primary/5 rounded-xl border-l-4 border-primary">
                  <p className="text-lg font-light text-foreground/80">
                    Sua jornada para a <span className="text-primary font-semibold">liberdade financeira</span> começa aqui
                  </p>
                </div>
                <div className="text-center p-6 bg-primary/5 rounded-xl border-l-4 border-primary">
                  <p className="text-lg font-light text-foreground/80">
                    Você agora faz parte de uma <span className="text-primary font-semibold">elite global</span>
                  </p>
                </div>
                <div className="text-center p-6 bg-primary/5 rounded-xl border-l-4 border-primary">
                  <p className="text-lg font-light text-foreground/80">
                    O <span className="text-primary font-semibold">domínio do mercado</span> está ao seu alcance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-16 pt-8 border-t border-primary/20">
              <span className="text-sm text-muted-foreground">Página 5 de 5</span>
              <Button 
                onClick={() => navigate("/chat")}
                size="lg"
                className="font-semibold tracking-wide text-lg px-8"
              >
                Começar Jornada
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-primary/50 matrix-code">
            TRANSFORMAÇÃO • ELITE • DOMÍNIO
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome5;
