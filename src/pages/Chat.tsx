import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Olá! Sou sua IA educacional sobre criptomoedas. Como posso ajudá-lo hoje?",
    },
    {
      id: 2,
      role: "user",
      content: "Como funcionam as ordens de stop loss?",
    },
    {
      id: 3,
      role: "assistant",
      content: "Stop loss é uma ordem automática que vende seus ativos quando o preço atinge um determinado patamar, limitando suas perdas. É essencial para gestão de risco.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
    };
    
    setMessages([...messages, newMessage]);
    setInput("");
    
    // Simula resposta da IA
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        role: "assistant",
        content: "Esta é uma resposta simulada. Em produção, aqui seria integrado com uma IA real.",
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col">
      <MatrixRain />
      
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Header */}
      <div className="relative z-10 bg-card/50 backdrop-blur-lg border-b border-primary/20 p-4">
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">
          IA Educacional
        </h1>
      </div>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-3 sm:p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "glass-effect text-foreground"
              }`}
            >
              <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="relative z-10 bg-card/95 backdrop-blur-lg border-t border-primary/20 p-4 pb-20">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-input border-primary/20 focus:border-primary/40"
          />
          <Button onClick={handleSend} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Chat;
