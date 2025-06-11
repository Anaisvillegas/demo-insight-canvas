"use client";

import React, { useMemo, useRef, useEffect, useCallback } from "react";
import remarkGfm from "remark-gfm";
import { twMerge } from "tailwind-merge";
import { LazyCodeBlock } from "@/components/markdown/lazy-code-block";
import { MemoizedReactMarkdown } from "@/components/markdown/memoized-react-markdownn";
import { useDOMOptimizer, useLayoutOptimizer } from "@/lib/hooks/use-dom-optimizer";

type Props = { 
  text: string; 
  className?: string;
  enableOptimizations?: boolean;
};

// Cache para componentes renderizados
const componentCache = new Map<string, React.ReactElement>();

// Hook para optimizar el renderizado de markdown
const useOptimizedMarkdown = (text: string, enableOptimizations: boolean = true) => {
  const { batchDOMOperations, setInnerHTML } = useDOMOptimizer();
  const { scheduleWrite } = useLayoutOptimizer();
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoizar el contenido procesado
  const processedContent = useMemo(() => {
    if (!text) return null;

    // Crear clave de cache
    const cacheKey = `${text.length}-${text.slice(0, 50)}`;
    
    // Verificar cache
    if (componentCache.has(cacheKey)) {
      return componentCache.get(cacheKey);
    }

    // Procesar contenido
    const content = (
      <MemoizedReactMarkdown
        className="prose text-black dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words"
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          a({ node, href, children, ...props }) {
            const childrenArray = React.Children.toArray(children);
            const childrenText = childrenArray
              .map((child) => child?.toString() ?? "")
              .join("");

            const cleanedText = childrenText.replace(/\[|\]/g, "");
            const isNumber = /^\d+$/.test(cleanedText);

            return isNumber ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                {...props}
                className="bg-mountain-meadow-100 hover:bg-mountain-meadow-100/80 dark:bg-colour-primary-800 dark:hover:bg-colour-primary-800/80 relative bottom-[6px] mx-0.5 rounded px-[5px] py-[2px] text-[8px] font-bold no-underline"
              >
                {children}
              </a>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                {...props}
                className="hover:underline"
              >
                {children}
              </a>
            );
          },
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <LazyCodeBlock
                key={crypto.randomUUID()}
                language={(match && match[1]) || ""}
                value={String(children).replace(/\n$/, "")}
              />
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </MemoizedReactMarkdown>
    );

    // Guardar en cache
    componentCache.set(cacheKey, content);
    
    // Limpiar cache si es muy grande
    if (componentCache.size > 50) {
      const firstKey = componentCache.keys().next().value;
      if (firstKey) {
        componentCache.delete(firstKey);
      }
    }

    return content;
  }, [text]);

  // Optimizar el renderizado usando DocumentFragment
  const optimizeRender = useCallback(() => {
    if (!enableOptimizations || !containerRef.current) return;

    scheduleWrite(() => {
      const container = containerRef.current;
      if (!container) return;

      // Usar DocumentFragment para minimizar reflow
      const fragment = document.createDocumentFragment();
      
      // Clonar el contenido actual
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = container.innerHTML;
      
      // Mover elementos al fragment
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      // Aplicar cambios de una vez
      batchDOMOperations(() => {
        container.innerHTML = '';
        container.appendChild(fragment);
      });
    });
  }, [enableOptimizations, batchDOMOperations, scheduleWrite]);

  return {
    processedContent,
    containerRef,
    optimizeRender
  };
};

// Componente principal optimizado
export const OptimizedMarkdown = ({ 
  text, 
  className = "", 
  enableOptimizations = true 
}: Props) => {
  const { processedContent, containerRef, optimizeRender } = useOptimizedMarkdown(text, enableOptimizations);

  // Optimizar después del primer render
  useEffect(() => {
    if (enableOptimizations) {
      // Usar timeout para permitir que React complete el render
      const timer = setTimeout(optimizeRender, 0);
      return () => clearTimeout(timer);
    }
  }, [optimizeRender, enableOptimizations]);

  if (!processedContent) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={twMerge(
        "prose text-black dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words",
        className
      )}
    >
      {processedContent}
    </div>
  );
};

// Componente con optimizaciones avanzadas para listas largas
export const BulkOptimizedMarkdown = ({ 
  texts, 
  className = "" 
}: { 
  texts: string[]; 
  className?: string; 
}) => {
  const { insertMultipleElements, createDocumentFragment } = useDOMOptimizer();
  const { scheduleWrite } = useLayoutOptimizer();
  const containerRef = useRef<HTMLDivElement>(null);

  // Renderizar múltiples elementos de markdown de forma optimizada
  const renderBulkContent = useCallback(() => {
    if (!containerRef.current || texts.length === 0) return;

    scheduleWrite(() => {
      const container = containerRef.current;
      if (!container) return;

      // Crear fragment para todas las operaciones
      const fragment = createDocumentFragment();

      // Crear elementos para cada texto
      const elements = texts.map((text, index) => {
        const div = document.createElement('div');
        div.className = 'markdown-item';
        div.setAttribute('data-index', index.toString());
        
        // Renderizar markdown (simplificado para bulk)
        div.innerHTML = text.replace(/\n/g, '<br>');
        
        return div;
      });

      // Insertar todos los elementos de una vez
      elements.forEach(element => fragment.appendChild(element));
      
      // Aplicar al DOM
      container.innerHTML = '';
      container.appendChild(fragment);
    });
  }, [texts, createDocumentFragment, scheduleWrite]);

  useEffect(() => {
    renderBulkContent();
  }, [renderBulkContent]);

  return (
    <div
      ref={containerRef}
      className={twMerge(
        "prose text-black dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words",
        className
      )}
    />
  );
};

// Hook para detectar si se necesita optimización bulk
export const useMarkdownOptimizationStrategy = (texts: string[]) => {
  return useMemo(() => {
    const totalLength = texts.reduce((acc, text) => acc + text.length, 0);
    const hasComplexContent = texts.some(text => 
      text.includes('```') || 
      text.includes('<artifact') || 
      text.includes('![') ||
      text.length > 1000
    );

    return {
      shouldUseBulk: texts.length > 10 && !hasComplexContent,
      shouldUseOptimized: totalLength > 5000 || hasComplexContent,
      strategy: texts.length > 10 && !hasComplexContent ? 'bulk' : 
                totalLength > 5000 || hasComplexContent ? 'optimized' : 'standard'
    };
  }, [texts]);
};

// Componente adaptativo que elige la mejor estrategia
export const AdaptiveMarkdown = ({ 
  text, 
  texts, 
  className = "" 
}: { 
  text?: string; 
  texts?: string[]; 
  className?: string; 
}) => {
  const strategy = useMarkdownOptimizationStrategy(texts || [text || ""]);

  if (texts && strategy.shouldUseBulk) {
    return <BulkOptimizedMarkdown texts={texts} className={className} />;
  }

  if (text && strategy.shouldUseOptimized) {
    return <OptimizedMarkdown text={text} className={className} enableOptimizations={true} />;
  }

  // Fallback a markdown estándar
  return <OptimizedMarkdown text={text || ""} className={className} enableOptimizations={false} />;
};

// Limpiar cache manualmente
export const clearMarkdownCache = () => {
  componentCache.clear();
};

export default OptimizedMarkdown;
