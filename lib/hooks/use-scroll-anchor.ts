import { Message } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const useScrollAnchor = (messages: Message[], isGenerating?: boolean) => {
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastMessageRef = useRef<Message | null>(null);

  // ✅ CORRECCIÓN: Mejorar scrollToBottom con requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // ✅ CORRECCIÓN: Scroll automático optimizado para evitar parpadeo
  useEffect(() => {
    if (isGenerating && autoScroll) {
      const interval = setInterval(() => {
        scrollToBottom();
      }, 300); // Reducir frecuencia de 100ms a 300ms para evitar parpadeo
      
      return () => clearInterval(interval);
    }
  }, [isGenerating, autoScroll, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage !== lastMessageRef.current) {
        // New message added
        lastMessageRef.current = lastMessage;
        if (isAtBottom || autoScroll) {
          // ✅ CORRECCIÓN: Delay para permitir renderizado
          setTimeout(() => {
            scrollToBottom();
          }, 50);
        } else {
          setShowScrollButton(true);
        }
      } else if (autoScroll) {
        // Existing message updated (streaming)
        setTimeout(() => {
          scrollToBottom();
        }, 10);
      }
    }
  }, [messages, isAtBottom, autoScroll, scrollToBottom]);

  // ✅ CORRECCIÓN: Mejorar detección de posición con threshold mayor
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const bottomThreshold = 50; // ✅ Aumentar threshold de 20 a 50
      const newIsAtBottom =
        scrollTop + clientHeight >= scrollHeight - bottomThreshold;

      setIsAtBottom(newIsAtBottom);
      setShowScrollButton(!newIsAtBottom);
      setAutoScroll(newIsAtBottom);
    }
  }, []);

  useEffect(() => {
    const current = scrollRef.current;
    if (current) {
      current.addEventListener("scroll", handleScroll, { passive: true });
      return () => current.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const handleNewMessage = useCallback(() => {
    if (isAtBottom || autoScroll) {
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    } else {
      setShowScrollButton(true);
    }
    setAutoScroll(true);
  }, [isAtBottom, autoScroll, scrollToBottom]);

  const handleManualScroll = () => {
    scrollToBottom();
    setAutoScroll(true);
    setShowScrollButton(false);
  };

  // ✅ CORRECCIÓN: Función para forzar scroll (útil para debugging)
  const forceScrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      console.log('🔄 Forzando scroll al final');
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const { scrollHeight, clientHeight } = scrollRef.current;
          scrollRef.current.scrollTop = scrollHeight - clientHeight;
          console.log('✅ Scroll forzado completado:', {
            scrollTop: scrollRef.current.scrollTop,
            scrollHeight,
            clientHeight
          });
        }
      });
    }
  }, []);

  return {
    messagesRef,
    scrollRef,
    scrollToBottom,
    forceScrollToBottom,
    isAtBottom,
    showScrollButton,
    handleNewMessage,
    handleManualScroll,
  };
};
