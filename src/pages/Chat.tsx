import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { ChatSidebar } from "@/components/ChatSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jeffAvatar from "@/assets/jeff-wu-avatar.png";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type Lesson = {
  id: string;
  lesson_number: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/";
        return;
      }

      setUserId(session.user.id);
      await Promise.all([
        loadLessons(session.user.id),
        loadChatHistory(session.user.id)
      ]);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLessons = async (uid: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('user_id', uid)
      .order('lesson_number', { ascending: true });

    if (error) {
      console.error('Error loading lessons:', error);
      return;
    }

    if (data && data.length > 0) {
      setLessons(data.map(l => ({
        id: l.id,
        lesson_number: l.lesson_number,
        title: l.title,
        status: l.status as 'pending' | 'active' | 'completed'
      })));
      const activeLesson = data.find(l => l.status === 'active') || data[0];
      setActiveLessonId(activeLesson.id);
    }
  };

  const loadChatHistory = async (uid: string) => {
    const activeLesson = lessons.find(l => l.id === activeLessonId);
    
    const query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (activeLessonId) {
      query.eq('lesson_id', activeLessonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    if (data && data.length > 0) {
      setMessages(data.map((msg, idx) => ({
        id: idx + 1,
        role: msg.role as "user" | "assistant",
        content: msg.content
      })));
    } else {
      // Initial message
      const initialMessage: Message = {
        id: 1,
        role: "assistant",
        content: "Seja bem-vindo! Serei seu professor nesses próximos dias e vou garantir que você aprenda tudo e consiga operar e lucrar consistentemente no mercado que mais cresce no mundo.\n\nNosso treinamento será por aqui, e começamos com o básico sobre cripto. Me diga se você já entende o básico - caso já saiba, podemos pular a primeira parte."
      };
      setMessages([initialMessage]);
      
      if (uid && activeLessonId) {
        await supabase.from('chat_messages').insert({
          user_id: uid,
          lesson_id: activeLessonId,
          role: 'assistant',
          content: initialMessage.content
        });
      }
    }
  };

  const handleSelectLesson = async (lessonId: string) => {
    setActiveLessonId(lessonId);
    setMessages([]);
    if (userId) {
      await loadChatHistory(userId);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || !userId || !activeLessonId) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    // Save user message
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const { error: saveError } = await supabase.from('chat_messages').insert({
          user_id: userId,
          lesson_id: activeLessonId,
          role: 'user',
          content: userMessage.content
        });

        if (saveError) throw saveError;
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          toast({
            title: "Erro ao salvar mensagem",
            description: "Sua mensagem pode não ter sido salva",
            variant: "destructive"
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    // Send to AI
    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat([
            { role: "user", content: userMessage.content }
          ]),
          userId
        }),
      });

      if (response.status === 429) {
        toast({
          title: "Limite excedido",
          description: "Muitas requisições. Aguarde um momento.",
          variant: "destructive"
        });
        setIsSending(false);
        return;
      }

      if (response.status === 402) {
        toast({
          title: "Créditos insuficientes",
          description: "Por favor, adicione créditos.",
          variant: "destructive"
        });
        setIsSending(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      
      // Create assistant message placeholder
      const assistantMessageId = messages.length + 2;
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: "assistant",
        content: ""
      }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from('chat_messages').insert({
          user_id: userId,
          lesson_id: activeLessonId,
          role: 'assistant',
          content: assistantContent
        });

        // Check for lesson completion
        const completionPhrases = [
          "podemos fechar",
          "aula concluída",
          "dia concluído",
          "próxima aula",
          "vamos para o dia"
        ];
        
        if (completionPhrases.some(phrase => assistantContent.toLowerCase().includes(phrase))) {
          const currentLesson = lessons.find(l => l.id === activeLessonId);
          if (currentLesson) {
            await supabase
              .from('lessons')
              .update({ status: 'completed' })
              .eq('id', activeLessonId);

            const nextLessonNumber = currentLesson.lesson_number + 1;
            if (nextLessonNumber <= 20) {
              // Create or activate next lesson
              const { data: nextLesson } = await supabase
                .from('lessons')
                .select('*')
                .eq('user_id', userId)
                .eq('lesson_number', nextLessonNumber)
                .maybeSingle();

              if (!nextLesson) {
                const lessonTitles: Record<number, string> = {
                  2: "Dia 2 - Como o Dinheiro se Move",
                  3: "Dia 3 - Mercado Futuro Explicado",
                  4: "Dia 4 - Spot vs Futuro",
                  5: "Dia 5 - Seu Plano Financeiro",
                  6: "Dia 6 - A Matemática do Trader",
                  7: "Dia 7 - Dominando o Vector",
                  8: "Dia 8 - Os Indicadores que Importam",
                  9: "Dia 9 - Trabalhando com Ranges",
                  10: "Dia 10 - Gradiente Linear",
                  11: "Dia 11 - Nossa Estratégia",
                  12: "Dia 12 - Conhecendo a Bitget",
                  13: "Dia 13 - Vector na Prática",
                  14: "Dia 14 - Seu Maior Inimigo: Você Mesmo",
                  15: "Dia 15 - Simulando suas Primeiras Operações",
                  16: "Dia 16 - Hora da Verdade",
                  17: "Dia 17 - Colocando Dinheiro na Corretora",
                  18: "Dia 18 - Acompanhamento e Metas",
                  19: "Dia 19 - Consultoria Permanente",
                  20: "Dia 20 - Liberdade Financeira",
                };

                await supabase.from('lessons').insert({
                  user_id: userId,
                  lesson_number: nextLessonNumber,
                  title: lessonTitles[nextLessonNumber] || `Dia ${nextLessonNumber}`,
                  status: 'active'
                });
              } else {
                await supabase
                  .from('lessons')
                  .update({ status: 'active' })
                  .eq('id', nextLesson.id);
              }

              toast({
                title: "Aula concluída!",
                description: `Parabéns! Você completou a aula ${currentLesson.lesson_number}.`,
              });
              
              await loadLessons(userId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-primary animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex">
      <MatrixRain />
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Sidebar */}
      <div className="relative z-10">
        <ChatSidebar
          lessons={lessons}
          activeLessonId={activeLessonId}
          onSelectLesson={handleSelectLesson}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <img src={jeffAvatar} alt="Jeff Wu" className="w-10 h-10 rounded-full ring-2 ring-primary/30" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass-effect text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-card/50 backdrop-blur-xl border-t border-primary/20">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Digite sua mensagem..."
              disabled={isSending || !activeLessonId}
              className="flex-1 bg-background/50"
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !input.trim() || !activeLessonId}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  );
};

export default Chat;
