"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { MessageSkeleton } from "./message-skeleton";
import { ChatMessage } from "./message";
import { Attachment, ChatMessageRoles, Models } from "@/app/types";
import { ArtifactMessagePartData } from "@/lib/utils";
import { useOptimizedMessageParser } from "@/lib/hooks/use-optimized-message-parser";

type Props = {
  role: ChatMessageRoles;
  model: Models | null;
  text: string;
  setCurrentArtifact: (data: ArtifactMessagePartData) => void;
  attachments: Attachment[];
  isStreaming?: boolean;
};

// ✅ Hook optimizado para renderizado progresivo sin parpadeo
const useProgressiveRender = (content: string, chunkSize: number = 1000) => {
  const [renderedContent, setRenderedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!content) return;

    setRenderedContent("");
    setCurrentIndex(0);
    setIsComplete(false);

    const renderChunk = () => {
      setCurrentIndex(prevIndex => {
        const nextIndex = Math.min(prevIndex + chunkSize, content.length);
        const chunk = content.slice(0, nextIndex);
        
        setRenderedContent(chunk);
        
        if (nextIndex >= content.length) {
          setIsComplete(true);
          return nextIndex;
        }
        
        // ✅ Usar setTimeout en lugar de requestAnimationFrame para reducir frecuencia
        timeoutRef.current = setTimeout(renderChunk, 150); // 150ms entre chunks
        return nextIndex;
      });
    };

    // Iniciar renderizado progresivo con delay inicial
    timeoutRef.current = setTimeout(renderChunk, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, chunkSize]);

  return { renderedContent, isComplete };
};


export const ProgressiveMessage = ({
  role,
  model,
  text,
  setCurrentArtifact,
  attachments,
  isStreaming = false
}: Props) => {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const mountTimeRef = useRef(Date.now());

  // Detectar si el mensaje contiene código
  useEffect(() => {
    const containsCode = text.includes("```") || text.includes("<artifact");
    setHasCode(containsCode);
  }, [text]);

  // Renderizado progresivo del contenido
  const { renderedContent, isComplete } = useProgressiveRender(
    text, 
    hasCode ? 200 : 500 // Chunks más pequeños para contenido con código
  );

  // Parsing progresivo memoizado usando hook optimizado
  const parsedParts = useOptimizedMessageParser(renderedContent, isComplete);

  // ✅ Lógica optimizada del skeleton para evitar parpadeo
  const shouldShowSkeleton = useMemo(() => {
    return showSkeleton && (!renderedContent || isStreaming);
  }, [showSkeleton, renderedContent, isStreaming]);

  // Controlar cuándo ocultar el skeleton con lógica más estable
  useEffect(() => {
    if (renderedContent && !isStreaming && renderedContent.length > 50) {
      // Solo ocultar skeleton si hay contenido suficiente
      const minDisplayTime = 200; // Aumentar tiempo mínimo
      const elapsed = Date.now() - mountTimeRef.current;
      const delay = Math.max(0, minDisplayTime - elapsed);
      
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [renderedContent, isStreaming]);

  // Mostrar skeleton con lógica memoizada
  if (shouldShowSkeleton) {
    return (
      <MessageSkeleton
        role={role === "user" || role === "assistant" ? role : "assistant"}
        isLoading={isStreaming}
        hasCode={hasCode}
        hasAttachments={attachments.length > 0}
      />
    );
  }

  // ✅ Renderizar mensaje sin transiciones durante streaming para evitar parpadeo
  return (
    <div className={isStreaming || !isComplete ? "" : "transition-opacity duration-300 ease-in-out"}>
      <ChatMessage
        role={role}
        model={model}
        text={renderedContent}
        setCurrentArtifact={setCurrentArtifact}
        attachments={attachments}
      />
      
      {/* Indicador de carga para contenido parcial - solo si no está streaming */}
      {!isComplete && !isStreaming && (
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 ml-8">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Cargando contenido...</span>
        </div>
      )}
    </div>
  );
};

// Componente optimizado con React.memo
export const OptimizedProgressiveMessage = React.memo(ProgressiveMessage, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.role === nextProps.role &&
    prevProps.model === nextProps.model &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.attachments.length === nextProps.attachments.length
  );
});

OptimizedProgressiveMessage.displayName = "OptimizedProgressiveMessage";
