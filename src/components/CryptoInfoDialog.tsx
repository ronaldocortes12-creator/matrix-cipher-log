import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { parseSimpleMarkdown } from "@/utils/markdownToHtml";

interface CryptoInfoDialogProps {
  name: string;
  symbol: string;
  logo: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CryptoInfoDialog = ({ name, symbol, logo, isOpen, onClose }: CryptoInfoDialogProps) => {
  const isMobile = useIsMobile();
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

  const header = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-card/50 flex items-center justify-center">
        <img src={logo} alt={name} className="w-6 h-6" />
      </div>
      <div>
        <div className="text-foreground font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{symbol}</div>
      </div>
    </div>
  );

  const content = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <div 
          className="text-foreground leading-relaxed break-words [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(info) }}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="glass-effect border-primary/20 max-h-[90vh] min-h-[300px]">
          <DrawerHeader className="relative pb-2">
            <DrawerTitle className="text-left">{header}</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors">
              <X className="h-5 w-5" />
            </DrawerClose>
          </DrawerHeader>
          
          <div className="w-12 h-1 mx-auto bg-muted/50 rounded-full mb-2" />
          
          <ScrollArea className="h-[calc(90vh-140px)]">
            <div className="px-4 pb-8">
              {content}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass-effect border-primary/20 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {header}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[500px]">
          <div className="mt-4 pr-4">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
