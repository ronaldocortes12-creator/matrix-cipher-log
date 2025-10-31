import { useState, useEffect, useRef } from "react";
import { Send, Menu, X, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/TabBar";
import { MatrixRain } from "@/components/MatrixRain";
import { ChatSidebar } from "@/components/ChatSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jeffAvatar from "@/assets/jeff-wu-avatar.png";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { LessonCompleteAnimation } from "@/components/LessonCompleteAnimation";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedLessonNumber, setCompletedLessonNumber] = useState(0);
  const [canCompleteLesson, setCanCompleteLesson] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        scrollToBottomInstant();
        setIsInitialLoad(false);
      } else {
        scrollToBottomSmooth();
      }
    }
  }, [messages]);

  useEffect(() => {
    if (activeLessonId) {
      setIsInitialLoad(true);
    }
  }, [activeLessonId]);

  // Set initial sidebar state based on device size
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const scrollToBottomInstant = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "instant",
        block: "end" 
      });
    }, 100);
  };

  const scrollToBottomSmooth = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end" 
      });
    }, 50);
  };

  const handleCompleteDay = async () => {
    if (!userId || !activeLessonId || !canCompleteLesson) return;

    const currentLesson = lessons.find(l => l.id === activeLessonId);
    if (!currentLesson || currentLesson.status === 'completed') return;

    try {
      console.log(`[CompleteDay] Marcando dia ${currentLesson.lesson_number} como concluído`);

      // Marcar aula como concluída e resetar can_complete
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ 
          status: 'completed',
          can_complete: false 
        })
        .eq('id', activeLessonId);

      if (lessonError) throw lessonError;

      // Upsert em lesson_progress
      const { error: progressError } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_day: currentLesson.lesson_number,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_day'
        });

      if (progressError) throw progressError;

      // Ativar próximo dia
      const nextLessonNumber = currentLesson.lesson_number + 1;
      if (nextLessonNumber <= 21) {
        const { data: nextLesson } = await supabase
          .from('lessons')
          .select('*')
          .eq('user_id', userId)
          .eq('lesson_number', nextLessonNumber)
          .single();

        if (nextLesson) {
          await supabase
            .from('lessons')
            .update({ status: 'active' })
            .eq('id', nextLesson.id);
        }
      }

      // Resetar autorização
      setCanCompleteLesson(false);

      // Mostrar celebração
      setCompletedLessonNumber(currentLesson.lesson_number);
      setShowCelebration(true);

      // Recarregar lições
      await loadLessons(userId);

      toast({
        title: "Dia concluído!",
        description: `Parabéns! Você completou o Dia ${currentLesson.lesson_number}.`,
      });

    } catch (error: any) {
      console.error('[CompleteDay] Erro ao concluir dia:', error);
      toast({
        title: "Erro ao concluir dia",
        description: error.message,
        variant: "destructive"
      });
    }
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
    const lessonTitles: Record<number, string> = {
      1: "Dia 1 - Introdução ao Mundo Cripto",
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
      21: "Dia 21 - Consultoria de Operações com Jeff Wu",
    };

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('user_id', uid)
      .order('lesson_number', { ascending: true });

    if (error) {
      console.error('Error loading lessons:', error);
      return;
    }

    // Se já existem lições, verificar se são todas as 20
    if (data && data.length > 0) {
      const existingNumbers = data.map(l => l.lesson_number);
      const missingLessons = [];
      
      // Criar as lições que faltam
      for (let i = 1; i <= 21; i++) {
        if (!existingNumbers.includes(i)) {
          missingLessons.push({
            user_id: uid,
            lesson_number: i,
            title: lessonTitles[i],
            status: 'pending'
          });
        }
      }

      // Inserir lições faltantes
      if (missingLessons.length > 0) {
        const { error: createError } = await supabase
          .from('lessons')
          .insert(missingLessons);

        if (createError) {
          console.error('Error creating missing lessons:', createError);
        }

        // Recarregar todas as lições
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('user_id', uid)
          .order('lesson_number', { ascending: true });

        if (allLessons) {
          setLessons(allLessons.map(l => ({
            id: l.id,
            lesson_number: l.lesson_number,
            title: l.title,
            status: l.status as 'pending' | 'active' | 'completed'
          })));
          const activeLesson = allLessons.find(l => l.status === 'active') || allLessons[0];
          setActiveLessonId(activeLesson.id);
        }
      } else {
        // Todas as 20 já existem
        setLessons(data.map(l => ({
          id: l.id,
          lesson_number: l.lesson_number,
          title: l.title,
          status: l.status as 'pending' | 'active' | 'completed'
        })));
        const activeLesson = data.find(l => l.status === 'active') || data[0];
        setActiveLessonId(activeLesson.id);
      }
    } else {
      // Não existe nenhuma lição, criar todas as 21
      const lessonsToCreate = Array.from({ length: 21 }, (_, i) => ({
        user_id: uid,
        lesson_number: i + 1,
        title: lessonTitles[i + 1],
        status: i === 0 ? 'active' : 'pending'
      }));

      const { data: newLessons, error: createError } = await supabase
        .from('lessons')
        .insert(lessonsToCreate)
        .select();

      if (createError) {
        console.error('Error creating lessons:', createError);
        return;
      }

      if (newLessons && newLessons.length > 0) {
        setLessons(newLessons.map(l => ({
          id: l.id,
          lesson_number: l.lesson_number,
          title: l.title,
          status: l.status as 'pending' | 'active' | 'completed'
        })));
        setActiveLessonId(newLessons[0].id);
      }
    }
  };

  const loadChatHistory = async (uid: string) => {
    const activeLesson = lessons.find(l => l.id === activeLessonId);
    
    // Verificar se aula atual já foi autorizada para conclusão
    if (activeLessonId) {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('can_complete')
        .eq('id', activeLessonId)
        .single();
      
      setCanCompleteLesson(lessonData?.can_complete || false);
    }
    
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
      scrollToBottomInstant();
    } else {
      // Initial message
      const initialMessage: Message = {
        id: 1,
        role: "assistant",
        content: "Seja bem-vindo! Serei seu professor nesses próximos dias e vou garantir que você aprenda tudo e consiga operar e lucrar consistentemente no mercado que mais cresce no mundo.\n\nNosso treinamento será por aqui, e começamos com o básico sobre cripto. Me diga se você já entende o básico - caso já saiba, podemos pular a primeira parte."
      };
      setMessages([initialMessage]);
      scrollToBottomInstant();
      
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
    setIsLoadingHistory(true);
    setActiveLessonId(lessonId);
    setMessages([]);
    setInput("");
    setCanCompleteLesson(false);
    setIsInitialLoad(true);
    
    if (userId) {
      await loadChatHistory(userId);
    }
    
    setIsLoadingHistory(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || isLoadingHistory || !userId || !activeLessonId) return;

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
              
              // Detectar frases de autorização para conclusão
              const authorizationPhrases = [
                "podemos fechar",
                "pode avançar",
                "aula concluída",
                "dia concluído",
                "próxima aula",
                "vamos para o dia",
                "vamos para o próximo dia",
                "próximo dia",
                "finalizamos",
                "terminamos",
                "parabéns",
                "você completou",
                "pode concluir",
                "concluir o dia",
                "avançar para o próximo"
              ];
              
              const contentLower = assistantContent.toLowerCase();
              if (authorizationPhrases.some(phrase => contentLower.includes(phrase))) {
                if (!canCompleteLesson) {
                  console.log('[Authorization] Jeff Wu autorizou conclusão do dia');
                  setCanCompleteLesson(true);
                  
                  // Salvar autorização no banco
                  await supabase
                    .from('lessons')
                    .update({ can_complete: true })
                    .eq('id', activeLessonId);
                }
              }
              
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
          "vamos para o dia",
          "vamos para o próximo dia",
          "próximo dia",
          "finalizamos",
          "terminamos"
        ];
        
        if (completionPhrases.some(phrase => assistantContent.toLowerCase().includes(phrase))) {
          const currentLesson = lessons.find(l => l.id === activeLessonId);
          if (currentLesson) {
            // Marcar aula atual como concluída
            await supabase
              .from('lessons')
              .update({ status: 'completed' })
              .eq('id', activeLessonId);

            console.log('✅ Aula marcada como concluída no lessons');

            // NOVO: Atualizar tabela lesson_progress para sincronização com Dashboard
            const { error: progressError } = await supabase
              .from('lesson_progress')
              .upsert({
                user_id: userId,
                lesson_day: currentLesson.lesson_number,
                completed: true,
                completed_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,lesson_day'
              });

            if (progressError) {
              console.error('❌ Erro ao atualizar progresso:', progressError);
              // Log para monitoramento
              await supabase.from('audit_logs').insert({
                action: 'lesson_completion_error',
                table_name: 'lesson_progress',
                user_id: userId,
                metadata: {
                  lesson_number: currentLesson.lesson_number,
                  error: progressError.message
                }
              });
            } else {
              console.log('✅ Progresso atualizado no Dashboard (lesson_progress)');
            }

            const nextLessonNumber = currentLesson.lesson_number + 1;
            
            // Mostrar animação de celebração
            setCompletedLessonNumber(currentLesson.lesson_number);
            setShowCelebration(true);

            // Ativar APENAS a próxima aula em sequência
            if (nextLessonNumber <= 20) {
              // Buscar a próxima aula
              const { data: nextLesson } = await supabase
                .from('lessons')
                .select('*')
                .eq('user_id', userId)
                .eq('lesson_number', nextLessonNumber)
                .single();

              if (nextLesson) {
                // Ativar apenas a próxima aula sequencial
                await supabase
                  .from('lessons')
                  .update({ status: 'active' })
                  .eq('id', nextLesson.id);
              }
              
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
    <div className="h-screen w-full relative flex overflow-hidden">
      <MatrixRain />
      <div className="fixed inset-0 bg-gradient-to-br from-deep-navy via-background to-secondary/30" style={{ zIndex: 1 }} />
      
      {/* Toggle Button (mobile only) - only show when sidebar is closed */}
      {isMobile && !isSidebarOpen && (
        <Button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 glass-effect hover:bg-primary/20 border border-primary/30 transition-all duration-300"
          size="icon"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      {isMobile ? (
        <div
          className={`fixed left-0 top-0 h-full z-20 shadow-2xl transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0 animate-slide-in-right' : '-translate-x-full'
          }`}
        >
          <ChatSidebar
            lessons={lessons}
            activeLessonId={activeLessonId}
            onSelectLesson={(lessonId) => {
              handleSelectLesson(lessonId);
              setIsSidebarOpen(false);
            }}
            onToggleSidebar={() => setIsSidebarOpen(false)}
          />
        </div>
      ) : (
        isSidebarOpen && (
          <div className="relative z-20">
            <ChatSidebar
              lessons={lessons}
              activeLessonId={activeLessonId}
              onSelectLesson={handleSelectLesson}
              onToggleSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        )
      )}

      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Expandir Sidebar Button (quando recolhido) */}
      {!isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 p-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 backdrop-blur-xl transition-all duration-300 group shadow-lg"
          title="Expandir sidebar"
        >
          <ChevronLeft className="h-5 w-5 text-primary rotate-180 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">
                  Carregando histórico...
                </span>
              </div>
            ) : (
              <>
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
                      <p 
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: message.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*([^\*]+?)\*/g, '<strong>$1</strong>')
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 bg-card/50 backdrop-blur-xl border-t border-primary/20 mb-16 space-y-2">
          {/* Botão Concluir Dia */}
          {activeLessonId && lessons.find(l => l.id === activeLessonId && l.status === 'active') && (
            <div className="flex justify-center">
              <Button
                onClick={handleCompleteDay}
                variant="outline"
                disabled={!canCompleteLesson}
                className={`glass-effect border-primary/40 font-semibold transition-all ${
                  canCompleteLesson 
                    ? 'hover:bg-primary/20 text-primary cursor-pointer animate-pulse' 
                    : 'opacity-50 cursor-not-allowed text-muted-foreground'
                }`}
                title={canCompleteLesson 
                  ? 'Clique para concluir o dia' 
                  : 'Aguarde Jeff Wu autorizar a conclusão desta aula'
                }
              >
                {canCompleteLesson ? '✅' : '🔒'} Concluir Dia {lessons.find(l => l.id === activeLessonId)?.lesson_number}
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Digite sua mensagem..."
              disabled={isSending || isLoadingHistory || !activeLessonId}
              className="flex-1 bg-background/50"
            />
            <Button
              onClick={handleSend}
              disabled={isSending || isLoadingHistory || !input.trim() || !activeLessonId}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Animação de conclusão de aula */}
      <LessonCompleteAnimation
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        lessonNumber={completedLessonNumber}
        totalLessons={20}
      />

      <TabBar />
    </div>
  );
};

export default Chat;
