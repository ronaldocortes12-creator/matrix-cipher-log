import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ChevronRight } from "lucide-react";

const Welcome2 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-tr from-background via-deep-navy to-primary/20" style={{ zIndex: 1 }} />
      
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[900px] h-auto object-contain opacity-[0.02] select-none"
        />
      </div>
      
      <div className="fixed top-40 right-20 w-[500px] h-[500px] bg-primary/12 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-40 left-20 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-3xl px-6 mx-4 py-8">
        <div className="glass-effect rounded-2xl p-12 shadow-2xl border-glow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-primary/40 rounded-tl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-primary/40 rounded-br-2xl"></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[400px] h-auto object-contain opacity-[0.04] select-none"
            />
          </div>

          <div className="relative z-10 space-y-8">
            <div className="text-center mb-8">
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-6"></div>
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                A Força da Crença
              </h2>
            </div>

            <div className="space-y-6 text-foreground/90 leading-relaxed text-lg">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 border border-primary/30 my-8">
                <p className="text-center text-xl italic text-foreground/90 mb-4">
                  "A verdadeira força da persuasão está na crença"
                </p>
                <p className="text-center text-sm text-primary/70">
                  — Gary Halbert
                </p>
              </div>

              <p className="text-center font-light">
                E a primeira crença que você precisa cultivar é esta:
              </p>

              <p className="text-center text-2xl font-semibold text-primary tracking-wide my-8">
                Cripto é liberdade.
              </p>

              <p className="text-center font-light">
                Liberdade de <span className="text-primary font-medium">tempo</span>, de <span className="text-primary font-medium">fronteiras</span>, de velhos sistemas que aprisionam.
              </p>

              <p className="text-center font-light mt-6">
                Você está entrando em um espaço onde cada decisão é guiada por <span className="text-primary font-medium">gestão de dados de alto nível</span>, por estratégias validadas, e pela mente mais poderosa do mercado: a inteligência aplicada ao seu crescimento.
              </p>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-primary/20">
              <span className="text-sm text-muted-foreground">Página 2 de 5</span>
              <Button 
                onClick={() => navigate("/welcome/3")}
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

export default Welcome2;
