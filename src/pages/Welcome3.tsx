import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ChevronRight } from "lucide-react";

const Welcome3 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-bl from-secondary/30 via-background to-deep-navy" style={{ zIndex: 1 }} />
      
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[750px] h-auto object-contain opacity-[0.035] select-none"
        />
      </div>
      
      <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '0.5s' }} />
      <div className="fixed bottom-1/4 right-1/4 w-[550px] h-[550px] bg-primary/12 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-3xl px-6 mx-4 py-8">
        <div className="glass-effect rounded-2xl p-12 shadow-2xl border-glow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-primary/30 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-primary/30 rounded-bl-2xl"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[400px] h-auto object-contain opacity-[0.04] select-none"
            />
          </div>

          <div className="relative z-10 space-y-8">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <div className="w-2 h-2 rounded-full bg-primary/60 mx-1"></div>
                <div className="w-2 h-2 rounded-full bg-primary/60 mx-1"></div>
                <div className="w-2 h-2 rounded-full bg-primary mx-1"></div>
                <div className="w-2 h-2 rounded-full bg-primary/60 mx-1"></div>
                <div className="w-2 h-2 rounded-full bg-primary/60 mx-1"></div>
              </div>
              <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                O Chamado
              </h2>
            </div>

            <div className="space-y-8 text-foreground/90 leading-relaxed text-lg">
              <p className="text-center font-light text-xl">
                Se você está aqui, é porque já sente o chamado.
              </p>

              <div className="my-10 py-8 border-y border-primary/20">
                <p className="text-center font-light">
                  Já compreendeu que existe algo <span className="text-primary font-medium">maior</span>, um sistema que pode transformar não só seu patrimônio, mas a sua forma de enxergar o mundo.
                </p>
              </div>

              <div className="bg-primary/5 rounded-xl p-8 border-l-4 border-primary">
                <p className="text-center text-lg font-light leading-loose">
                  Este é o momento de <span className="text-primary font-medium">transformação</span>.
                  <br />
                  <br />
                  O momento em que você deixa para trás as dúvidas e abraça uma nova realidade.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-primary/20">
              <span className="text-sm text-muted-foreground">Página 3 de 5</span>
              <Button 
                onClick={() => navigate("/welcome/4")}
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

export default Welcome3;
