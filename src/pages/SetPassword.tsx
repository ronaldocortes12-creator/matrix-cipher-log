import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MatrixRain } from "@/components/MatrixRain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-main.png";
import { Lock, Check, X, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenData, setTokenData] = useState<{
    email: string;
    full_name: string;
    plan_duration: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  // Validações de senha
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Token não fornecido. Verifique o link no seu e-mail.");
        setIsValidating(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("password_setup_tokens")
          .select("email, full_name, plan_duration, expires_at, used_at")
          .eq("token", token)
          .single();

        if (fetchError || !data) {
          setError("Link inválido ou expirado.");
          setIsValidating(false);
          return;
        }

        if (data.used_at) {
          setError("Este link já foi utilizado. Faça login com sua senha.");
          setIsValidating(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError("Este link expirou. Solicite um novo acesso.");
          setIsValidating(false);
          return;
        }

        setTokenData({
          email: data.email,
          full_name: data.full_name || data.email.split("@")[0],
          plan_duration: data.plan_duration || "30D",
        });
        setIsValidating(false);
      } catch {
        setError("Erro ao validar o link. Tente novamente.");
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || !token) return;

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("set-user-password", {
        body: { token, password },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao configurar senha");
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Erro ao configurar senha");
      }

      setSuccess(true);
      
      toast({
        title: "Senha configurada!",
        description: "Você será redirecionado para o login.",
      });

      // Aguardar e redirecionar para login
      setTimeout(() => {
        navigate("/");
      }, 3000);

    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao configurar senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? "text-green-400" : "text-muted-foreground"}`}>
      {valid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      <span>{text}</span>
    </div>
  );

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
        <MatrixRain />
        <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
        <MatrixRain />
        <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full max-w-md px-5">
          <div className="glass-effect rounded-2xl p-8 text-center border-glow">
            <X className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Link Inválido</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Ir para Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
        <MatrixRain />
        <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full max-w-md px-5">
          <div className="glass-effect rounded-2xl p-8 text-center border-glow">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Senha Configurada!</h1>
            <p className="text-muted-foreground mb-2">Sua senha foi definida com sucesso.</p>
            <p className="text-sm text-primary">Redirecionando para login...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      <MatrixRain />
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Logo Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <img src={logo} alt="" className="w-[640px] h-auto object-contain opacity-[0.03] select-none" />
      </div>
      
      {/* Premium Glows */}
      <div className="fixed top-20 left-20 w-[480px] h-[480px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1 }} />
      <div className="fixed bottom-20 right-20 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ zIndex: 1, animationDelay: "1.5s" }} />

      <div className="w-full flex justify-center" style={{ zIndex: 10 }}>
        <div className="origin-top scale-100 md:scale-95 lg:scale-[0.85] transition-transform duration-300">
          <div className="w-full max-w-sm px-5 py-0">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src={logo}
                alt="Global Institute of Cripto"
                className="w-58 sm:w-64 h-auto object-contain drop-shadow-[0_0_50px_rgba(77,208,225,0.6)] filter brightness-125 contrast-125"
              />
            </div>

            {/* Card */}
            <div className="glass-effect rounded-2xl p-5 shadow-2xl border-glow relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/30 rounded-br-2xl"></div>

              {/* Header */}
              <div className="text-center mb-5 relative z-10">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  Configure sua Senha
                </h1>
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-3"></div>
                <p className="text-muted-foreground text-sm">
                  Olá, <span className="text-primary font-medium">{tokenData?.full_name}</span>
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {tokenData?.email}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/90 text-sm font-medium">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground/90 text-sm font-medium">
                    Confirmar Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Validation */}
                <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground mb-2">Requisitos da senha:</p>
                  <ValidationItem valid={hasMinLength} text="Mínimo 8 caracteres" />
                  <ValidationItem valid={hasUppercase} text="Uma letra maiúscula" />
                  <ValidationItem valid={hasLowercase} text="Uma letra minúscula" />
                  <ValidationItem valid={hasNumber} text="Um número" />
                  <ValidationItem valid={passwordsMatch} text="Senhas coincidem" />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold tracking-wide"
                  disabled={!isValid || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    "CONFIRMAR SENHA"
                  )}
                </Button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground/80">© 2025 Global Institute of Crypto</p>
              <p className="text-xs text-primary/50 mt-1 matrix-code">SECURE • ENCRYPTED • VERIFIED</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
