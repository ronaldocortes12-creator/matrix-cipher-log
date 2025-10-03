import { useState } from "react";
import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { Lock, Mail } from "lucide-react";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Premium Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Logo Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={logo} 
          alt="" 
          className="w-[800px] h-auto object-contain opacity-[0.03] select-none"
        />
      </div>
      
      {/* Animated Premium Glows */}
      <div className="fixed top-20 left-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-20 right-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: '1.5s' }} />

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md px-6 py-8 mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-6 animate-float">
          <img 
            src={logo} 
            alt="Global Institute of Cripto" 
            className="w-64 h-auto object-contain drop-shadow-[0_0_35px_rgba(77,208,225,0.4)]"
          />
        </div>

        {/* Premium Login Card */}
        <div className="glass-effect rounded-2xl p-8 shadow-2xl border-glow relative overflow-hidden">
          {/* Logo Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <img 
              src={logo} 
              alt="" 
              className="w-[280px] h-auto object-contain opacity-[0.04] select-none"
            />
          </div>

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-4xl font-bold mb-3 tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Acesso
            </h1>
            <p className="text-muted-foreground text-base font-light leading-relaxed">
              O futuro da análise cripto chegou, bem-vindo (a)
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/90 text-sm font-medium tracking-wide">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/90 text-sm font-medium tracking-wide">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold tracking-wide"
            >
              Entrar
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/80">
            © 2025 Global Institute of Cripto
          </p>
          <p className="text-xs text-primary/50 mt-1 matrix-code">
            SECURE • ENCRYPTED • VERIFIED
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
