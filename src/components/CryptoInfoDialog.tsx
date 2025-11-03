import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CryptoInfoDialogProps {
  name: string;
  symbol: string;
  logo: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CryptoInfoDialog = ({ name, symbol, logo, isOpen, onClose }: CryptoInfoDialogProps) => {
  const [info, setInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCryptoInfo();
    }
  }, [isOpen, symbol]);

  const fetchCryptoInfo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-info', {
        body: { symbol, name }
      });

      if (error) {
        console.error('Error fetching crypto info:', error);
        toast.error('Erro ao carregar informações');
        setInfo('Não foi possível carregar as informações no momento.');
        return;
      }

      setInfo(data.info);
    } catch (err) {
      console.error('Exception fetching crypto info:', err);
      toast.error('Erro ao carregar informações');
      setInfo('Não foi possível carregar as informações no momento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass-effect border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-card/50 flex items-center justify-center">
              <img src={logo} alt={name} className="w-6 h-6" />
            </div>
            <div>
              <div className="text-foreground">{name}</div>
              <div className="text-sm text-muted-foreground font-normal">{symbol}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {info}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
