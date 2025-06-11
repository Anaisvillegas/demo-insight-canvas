import { Message } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const useOptimizedScrollAnchor = (messages: Message[]) => {
  const messagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastMessageRef = useRef<Message | null>(null);
  const scrollTimeoutRef = useRef<number>();
  const rafRef = useRef<number>();

  // Scroll optimizado usando requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // Scroll suave optimizado
  const smoothScrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const targetScrollTop = element.scrollHeight - element.clientHeight;
    const startScrollTop = element.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 300; // 300ms para scroll suave
    let startTime: number;

    const animateScroll = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      // Función de easing suave
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = startScrollTop + distance * easeOutCubic;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateScroll);
      }
    };

    rafRef.current = requestAnimationFrame(animateScroll);
  }, []);

  // Detectar cambios en mensajes con debouncing
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage !== lastMessageRef.current) {
        // Nuevo mensaje añadido
        lastMessageRef.current = lastMessage;
        
        if (isAtBottom && autoScroll) {
          // Usar scroll inmediato para nuevos mensajes
          scrollToBottom();
        } else {
          setShowScrollButton(true);
        }
      } else if (autoScroll && isAtBottom) {
        // Mensaje existente actualizado (streaming)
        // Debounce el scroll para evitar múltiples llamadas
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = window.setTimeout(() => {
          scrollToBottom();
        }, 50); // 50ms de debounce
      }
    }
  }, [messages, isAtBottom, autoScroll, scrollToBottom]);

  // Optimizar el listener de scroll con throttling
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const bottomThreshold = 20;
            const newIsAtBottom =
              scrollTop + clientHeight >= scrollHeight - bottomThreshold;

            setIsAtBottom(newIsAtBottom);
            setShowScrollButton(!newIsAtBottom);
            setAutoScroll(newIsAtBottom);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const current = scrollRef.current;
    if (current) {
      current.addEventListener("scroll", handleScroll, { passive: true });
      return () => current.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleNewMessage = useCallback(() => {
    if (isAtBottom) {
      smoothScrollToBottom();
    } else {
      setShowScrollButton(true);
    }
    setAutoScroll(true);
  }, [isAtBottom, smoothScrollToBottom]);

  const handleManualScroll = useCallback(() => {
    smoothScrollToBottom();
    setAutoScroll(true);
    setShowScrollButton(false);
  }, [smoothScrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    messagesRef,
    scrollRef,
    scrollToBottom: smoothScrollToBottom,
    isAtBottom,
    showScrollButton,
    handleNewMessage,
    handleManualScroll,
  };
};
