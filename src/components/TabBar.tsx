import { MessageSquare, TrendingUp, LineChart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export const TabBar = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { icon: MessageSquare, label: t('nav.chat'), path: "/chat" },
    { icon: TrendingUp, label: t('nav.dashboard'), path: "/dashboard" },
    { icon: LineChart, label: t('nav.market'), path: "/market" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-primary/20">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
