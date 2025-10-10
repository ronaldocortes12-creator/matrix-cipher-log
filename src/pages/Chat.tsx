import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar histórico do chat e verificar autenticação
  useEffect(() => {
    const loadChatHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = "/";
        return;
      }

      setUserId(user.id);

      // Carregar mensagens do banco
      const { data: chatMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar histórico:', error);
      } else if (chatMessages && chatMessages.length > 0) {
        setMessages(chatMessages.map((msg, idx) => ({
          id: idx + 1,
          role: msg.role as "user" | "assistant",
          content: msg.content
        })));
      } else {
        // Mensagem inicial apenas se não houver histórico
        const initialMessage: Message = {
          id: 1,
          role: "assistant",
          content: "Seja bem-vindo, serei seu professor nesses próximos dias e eu mesmo vou garantir que você aprenda tudo e consiga operar e lucrar consistentemente no mercado que mais cresce no mundo.\n\nNosso treinamento será por aqui, e começamos com o básico sobre cripto para os leigos. Me diga se você já entende o básico, caso já saiba, podemos pular a primeira parte."
        };
        setMessages([initialMessage]);
        
        // Salvar mensagem inicial no banco
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: initialMessage.content
        });
      }
      
      setIsLoading(false);
    };

    loadChatHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    
    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    
    // Salvar mensagem do usuário no banco
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      content: userMessage.content
    });
    
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          userId: userId,
          messages: updatedMessages.map(m => ({ 
            role: m.role, 
            content: m.content 
          })) 
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Falha ao conectar com a IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { 
                  id: prev.length + 1, 
                  role: "assistant", 
                  content: assistantContent 
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      
      // Salvar resposta do assistente no banco
      if (assistantContent && userId) {
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          content: assistantContent
        });
        
        // Verificar se a resposta contém confirmação de conclusão de aula
        const lessonCompletionMatch = assistantContent.match(/Dia (\d+).*concluído|completamos.*Dia (\d+)/i);
        if (lessonCompletionMatch) {
          const lessonDay = parseInt(lessonCompletionMatch[1] || lessonCompletionMatch[2]);
          if (lessonDay >= 1 && lessonDay <= 20) {
            // Marcar a aula como concluída
            const { error: progressError } = await supabase
              .from('lesson_progress')
              .upsert({
                user_id: userId,
                lesson_day: lessonDay,
                completed: true,
                completed_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,lesson_day'
              });
            
            if (!progressError) {
              toast({
                title: "Aula Concluída! 🎉",
                description: `Dia ${lessonDay} foi marcado como completo.`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Por favor, tente novamente.",
      }]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <MatrixRain />
        <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
        <div className="relative z-10 text-primary">Carregando...</div>
      </div>
    );
  }

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
