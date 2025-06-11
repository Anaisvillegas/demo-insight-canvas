"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { OptimizedArtifactRenderer } from "./OptimizedArtifactRenderer";
import { contentDetector } from "../../utils/renderer/contentDetector";
import { cacheManager } from "../../utils/renderer/cacheManager";
import { performanceMonitor } from "../../utils/renderer/performanceMonitor";
import { RENDERER_CONSTANTS, MESSAGES } from "./constants";
import SelectionTool from "@/components/selection-tool";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

/**
 * Props del ArtifactRendererWrapper - Compatible con la API existente
 */
export type Props = {
  code: string;
  mode?: "preview" | "code";
  recording?: boolean;
  onCapture?: (params: { selectionImg: string; artifactImg: string }) => void;
  artifactId?: string;
  type?: "html" | "react" | "markdown" | "python" | "auto";
  useOptimized?: boolean;
  onRenderComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
};

/**
 * Estados del renderizador
 */
type RenderState = "idle" | "loading" | "rendering" | "complete" | "error";

/**
 * ArtifactRendererWrapper - Wrapper optimizado compatible con la API existente
 * 
 * Mantiene la misma API que ReactArtifact y HTMLArtifact pero usa el sistema optimizado
 */
const ArtifactRendererWrapper = ({
  code,
  mode = "preview",
  recording = false,
  onCapture,
  artifactId,
  type = "auto",
  useOptimized = true,
  onRenderComplete,
  onError,
  className = "",
  style = {},
  loading = "lazy",
  ...otherProps
}: Props) => {
  // Referencias
  const contentRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<OptimizedArtifactRenderer | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Estados
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isOptimizedReady, setIsOptimizedReady] = useState(false);
  const [detectedType, setDetectedType] = useState<string>(type);

  /**
   * Detecta el tipo de contenido si es necesario
   */
  const detectContentType = useCallback((content: string) => {
    if (type !== "auto") return type;

    try {
      const detection = contentDetector.analyze(content);
      return (detection as any).type || "react";
    } catch (err) {
      console.warn("Error en detección de contenido:", err);
      return "react";
    }
  }, [type]);

  /**
   * Maneja eventos del renderizador optimizado
   */
  const handleRendererEvents = useCallback((event: CustomEvent) => {
    switch (event.type) {
      case "renderComplete":
        setRenderState("complete");
        setError(null);
        onRenderComplete?.(event.detail);
        break;
      case "renderError":
        setRenderState("error");
        setError(event.detail.error);
        onError?.(new Error(event.detail.error));
        break;
    }
  }, [onRenderComplete, onError]);

  /**
   * Inicializa el renderizador optimizado
   */
  const initializeOptimizedRenderer = useCallback(() => {
    if (!contentRef.current || !useOptimized) return;

    try {
      // Limpiar renderizador anterior si existe
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }

      // Crear nuevo renderizador
      rendererRef.current = new OptimizedArtifactRenderer(contentRef.current, {
        frameUrl: "/renderer-frame.html",
        enablePerformanceMonitoring: true,
        maxPendingRenders: 5,
        renderTimeout: RENDERER_CONSTANTS.MAX_RENDER_TIME
      });

      // Configurar event listeners
      contentRef.current.addEventListener("renderComplete", handleRendererEvents as EventListener);
      contentRef.current.addEventListener("renderError", handleRendererEvents as EventListener);

      // Obtener referencia al iframe cuando esté disponible
      const checkIframe = () => {
        const iframe = contentRef.current?.querySelector("iframe");
        if (iframe) {
          iframeRef.current = iframe;
          setIsOptimizedReady(true);
        } else {
          setTimeout(checkIframe, 100);
        }
      };
      checkIframe();

    } catch (err) {
      console.error("Error inicializando renderizador optimizado:", err);
      setRenderState("error");
      setError(err instanceof Error ? err.message : "Error de inicialización");
    }
  }, [useOptimized, handleRendererEvents]);

  /**
   * Renderiza el contenido usando el renderizador optimizado
   */
  const renderWithOptimized = useCallback(() => {
    if (!rendererRef.current || !code) return;

    setRenderState("rendering");
    setError(null);

    const contentType = detectContentType(code);
    setDetectedType(contentType);

    try {
      rendererRef.current.renderArtifact(code, contentType as any, artifactId);
    } catch (err) {
      setRenderState("error");
      setError(err instanceof Error ? err.message : "Error de renderizado");
    }
  }, [code, detectContentType, artifactId]);

  /**
   * Maneja captura de selección (compatible con la API existente)
   */
  const handleSendCaptureMessage = useCallback((selection: any) => {
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "CAPTURE_SELECTION",
        selection,
      },
      "*"
    );
  }, []);

  /**
   * Maneja mensajes del iframe (compatible con la API existente)
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "SELECTION_DATA") {
      onCapture?.({
        selectionImg: event.data.data.selectionImg,
        artifactImg: event.data.data.artifactImg,
      });
    }
  }, [onCapture]);

  /**
   * Renderizado fallback (modo código o error)
   */
  const renderFallback = useCallback(() => {
    const language = detectedType === "html" ? "html" : 
                    detectedType === "react" ? "tsx" : 
                    detectedType === "python" ? "python" : "tsx";

    return (
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          width: "100%",
          overflow: "auto",
          height: "100%",
          maxHeight: "100%",
        }}
        codeTagProps={{
          style: {
            fontSize: "0.9rem",
            fontFamily: "var(--font-inter)",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    );
  }, [code, detectedType]);

  /**
   * Renderizado de estado de error
   */
  const renderError = useCallback(() => (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="text-red-500 mb-2">
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Error de Renderizado</h3>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button
        onClick={() => {
          setRenderState("idle");
          setError(null);
          if (useOptimized) {
            renderWithOptimized();
          }
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Reintentar
      </button>
    </div>
  ), [error, useOptimized, renderWithOptimized]);

  /**
   * Renderizado de estado de carga
   */
  const renderLoading = useCallback(() => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-sm text-gray-500">
          {renderState === "loading" ? "Inicializando..." : "Renderizando..."}
        </p>
      </div>
    </div>
  ), [renderState]);

  // Efectos
  useEffect(() => {
    if (mode === "preview" && useOptimized) {
      setRenderState("loading");
      initializeOptimizedRenderer();
    }
  }, [mode, useOptimized, initializeOptimizedRenderer]);

  useEffect(() => {
    if (isOptimizedReady && code && mode === "preview" && useOptimized) {
      renderWithOptimized();
    }
  }, [isOptimizedReady, code, mode, useOptimized, renderWithOptimized]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }
      if (contentRef.current) {
        contentRef.current.removeEventListener("renderComplete", handleRendererEvents as EventListener);
        contentRef.current.removeEventListener("renderError", handleRendererEvents as EventListener);
      }
    };
  }, [handleRendererEvents]);

  // Renderizado condicional
  if (mode === "code") {
    return renderFallback();
  }

  if (renderState === "error") {
    return renderError();
  }

  if (renderState === "loading" || renderState === "rendering") {
    return renderLoading();
  }

  // Renderizado principal (modo preview)
  return (
    <>
      <div 
        ref={contentRef} 
        className={`w-full h-full ${className}`}
        style={style}
        data-artifact-id={artifactId}
        data-render-state={renderState}
        data-content-type={detectedType}
        {...otherProps}
      >
        {/* El contenido se renderiza aquí por OptimizedArtifactRenderer */}
      </div>

      {/* SelectionTool para captura (compatible con API existente) */}
      {recording && isOptimizedReady && renderState === "complete" && (
        <SelectionTool
          targetRef={contentRef}
          onSelect={handleSendCaptureMessage}
        />
      )}
    </>
  );
};

ArtifactRendererWrapper.displayName = "ArtifactRendererWrapper";

export default ArtifactRendererWrapper;
export { ArtifactRendererWrapper };
