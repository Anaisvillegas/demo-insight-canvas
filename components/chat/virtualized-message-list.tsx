"use client";

import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { Models } from "@/app/types";
import { OptimizedProgressiveMessage } from "@/components/chat/progressive-message";
import { Separator } from "@/components/ui/separator";
import { ArtifactMessagePartData } from "@/lib/utils";
import { Message } from "ai";
import { useVirtualScrolling, useDOMOptimizer, useLayoutOptimizer } from "@/lib/hooks/use-dom-optimizer";

type Props = {
  messages: Message[];
  setCurrentArtifact: (data: ArtifactMessagePartData) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  containerHeight?: number;
  itemHeight?: number;
};

// Componente de mensaje memoizado para virtual scrolling
const VirtualizedMessage = React.memo(({ 
  message, 
  index, 
  style, 
  setCurrentArtifact 
}: {
  message: Message;
  index: number;
  style: React.CSSProperties;
  setCurrentArtifact: (data: ArtifactMessagePartData) => void;
}) => {
  const { batchDOMOperations } = useDOMOptimizer();
  const messageRef = useRef<HTMLDivElement>(null);

  // Optimizar el renderizado del mensaje
  const handleRender = useCallback(() => {
    if (messageRef.current) {
      batchDOMOperations(() => {
        // Aplicar estilos de posicionamiento virtual
        Object.assign(messageRef.current!.style, style);
      });
    }
  }, [style, batchDOMOperations]);

  useEffect(() => {
    handleRender();
  }, [handleRender]);

  return (
    <div 
      ref={messageRef}
      style={style}
      className="absolute w-full"
      data-message-index={index}
    >
      <div className="px-2">
        <OptimizedProgressiveMessage
          role={message.role}
          model={Models.claude}
          text={message.content}
          attachments={message.experimental_attachments || []}
          setCurrentArtifact={setCurrentArtifact}
          isStreaming={false}
        />
        
        {/* Separator optimizado */}
        <div className="my-4">
          <Separator />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.index === nextProps.index &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

VirtualizedMessage.displayName = "VirtualizedMessage";

export const VirtualizedMessageList = ({
  messages,
  setCurrentArtifact,
  containerRef,
  containerHeight = 600,
  itemHeight = 150
}: Props) => {
  const { 
    batchDOMOperations, 
    insertMultipleElements, 
    getCachedElement,
    measureElement 
  } = useDOMOptimizer();
  
  const { scheduleRead, scheduleWrite } = useLayoutOptimizer();
  
  // Filtrar mensajes de contexto
  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const metadata = message.metadata as any;
      return (message as any).message_type !== "context" && 
            !(metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
    });
  }, [messages]);

  // Virtual scrolling hook
  const {
    containerRef: virtualContainerRef,
    handleScroll,
    getVisibleItems,
    totalHeight,
    visibleRange
  } = useVirtualScrolling(filteredMessages, itemHeight, containerHeight);

  // Combinar refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    if (containerRef) {
      (containerRef as any).current = node;
    }
    (virtualContainerRef as any).current = node;
  }, [containerRef, virtualContainerRef]);

  // Optimizar el scroll con batching
  const optimizedHandleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    scheduleRead(() => {
      handleScroll(event);
    });
  }, [handleScroll, scheduleRead]);

  // Renderizar elementos visibles de forma optimizada
  const renderVisibleMessages = useCallback(() => {
    const visibleItems = getVisibleItems();
    
    return visibleItems.map(({ item: message, index, style }) => (
      <VirtualizedMessage
        key={`message-${message.id || index}`}
        message={message}
        index={index}
        style={style}
        setCurrentArtifact={setCurrentArtifact}
      />
    ));
  }, [getVisibleItems, setCurrentArtifact]);

  // Optimizar el contenedor con DocumentFragment si es necesario
  const containerStyle = useMemo(() => ({
    height: containerHeight,
    overflow: 'auto' as const,
    position: 'relative' as const
  }), [containerHeight]);

  // Efecto para optimizar el scroll inicial
  useEffect(() => {
    if (virtualContainerRef.current && filteredMessages.length > 0) {
      scheduleWrite(() => {
        // Scroll al final para mensajes nuevos
        const container = virtualContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [filteredMessages.length, scheduleWrite, virtualContainerRef]);

  // Fallback para pocos mensajes (sin virtualización)
  if (filteredMessages.length <= 10) {
    return (
      <div
        ref={combinedRef}
        className="flex-1 flex flex-col gap-4 max-w-3xl mx-auto w-full pt-1"
        style={containerStyle}
        onScroll={optimizedHandleScroll}
      >
        {filteredMessages.map((message, index) => (
          <div key={`message-${message.id || index}`}>
            <OptimizedProgressiveMessage
              role={message.role}
              model={Models.claude}
              text={message.content}
              attachments={message.experimental_attachments || []}
              setCurrentArtifact={setCurrentArtifact}
              isStreaming={false}
            />

            {index !== filteredMessages.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  // Virtual scrolling para muchos mensajes
  return (
    <div
      ref={combinedRef}
      className="flex-1 max-w-3xl mx-auto w-full pt-1"
      style={containerStyle}
      onScroll={optimizedHandleScroll}
    >
      {/* Contenedor virtual con altura total */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {renderVisibleMessages()}
      </div>
      
      {/* Indicador de rango visible para debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black text-white p-2 text-xs rounded z-50">
          Visible: {visibleRange.start}-{visibleRange.end} / {filteredMessages.length}
        </div>
      )}
    </div>
  );
};

// Hook para detectar si se necesita virtualización
export const useVirtualizationThreshold = (messages: Message[], threshold: number = 20) => {
  return useMemo(() => {
    const filteredMessages = messages.filter((message) => {
      const metadata = message.metadata as any;
      return (message as any).message_type !== "context" && 
            !(metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
    });
    
    return {
      shouldVirtualize: filteredMessages.length > threshold,
      messageCount: filteredMessages.length,
      threshold
    };
  }, [messages, threshold]);
};

// Componente adaptativo que decide entre lista normal y virtualizada
export const AdaptiveMessageList = (props: Props) => {
  const { shouldVirtualize } = useVirtualizationThreshold(props.messages);
  
  if (shouldVirtualize) {
    return <VirtualizedMessageList {...props} />;
  }
  
  // Usar lista normal para pocos mensajes
  const { messages, setCurrentArtifact, containerRef } = props;
  const filteredMessages = messages.filter((message) => {
    const metadata = message.metadata as any;
    return (message as any).message_type !== "context" && 
          !(metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col gap-4 max-w-3xl mx-auto w-full pt-1"
    >
      {filteredMessages.map((message, index) => (
        <div key={`message-${message.id || index}`}>
          <OptimizedProgressiveMessage
            role={message.role}
            model={Models.claude}
            text={message.content}
            attachments={message.experimental_attachments || []}
            setCurrentArtifact={setCurrentArtifact}
            isStreaming={false}
          />

          {index !== filteredMessages.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
};
