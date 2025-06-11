/**
 * ArtifactRendererWrapper.jsx
 * 
 * Wrapper de compatibilidad para el OptimizedArtifactRenderer
 * Proporciona una API idéntica a los componentes legacy ReactArtifact y HTMLArtifact
 * 
 * Características:
 * - API 100% compatible con componentes existentes
 * - Estados de loading, error y success
 * - Integración con SelectionTool para captura
 * - Fallback a SyntaxHighlighter en modo código
 * - Cleanup automático de recursos
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { OptimizedArtifactRenderer } from './OptimizedArtifactRenderer'
import { SelectionTool } from '../../../components/selection-tool'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FEATURE_FLAGS } from '../../config/featureFlags'
import performanceMonitor from '../../utils/PerformanceMonitor'

/**
 * Estados del renderizador
 */
const RENDER_STATES = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  EMPTY: 'empty'
}

/**
 * Componente wrapper para el renderizador optimizado
 */
const ArtifactRendererWrapper = ({
  code = '',
  type = 'html',
  mode = 'preview',
  recording = false,
  onCapture,
  onRenderComplete,
  onError,
  className = '',
  ...props
}) => {
  // Referencias
  const containerRef = useRef(null)
  const rendererRef = useRef(null)
  const contentRef = useRef(null)
  
  // Estados
  const [renderState, setRenderState] = useState(RENDER_STATES.LOADING)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [renderTime, setRenderTime] = useState(0)

  // Memoizar configuración del renderizador
  const rendererConfig = useMemo(() => ({
    type: type || 'html',
    enableCache: FEATURE_FLAGS.RENDERER_CACHE,
    enablePerformanceMonitoring: FEATURE_FLAGS.PERFORMANCE_MONITORING,
    enableLazyLoading: FEATURE_FLAGS.LAZY_LOADING,
    enableVirtualization: FEATURE_FLAGS.VIRTUALIZATION,
    debugMode: FEATURE_FLAGS.DEBUG_MODE
  }), [type])

  // Detectar tipo de contenido automáticamente
  const detectedType = useMemo(() => {
    if (type && type !== 'auto') return type
    
    if (!code) return 'html'
    
    // Detección simple de tipo
    if (code.includes('const ') || code.includes('function ') || code.includes('=>')) {
      return 'react'
    }
    if (code.includes('<') && code.includes('>')) {
      return 'html'
    }
    return 'text'
  }, [code, type])

  // Inicializar renderizador
  const initializeRenderer = useCallback(async () => {
    try {
      if (!FEATURE_FLAGS.OPTIMIZED_RENDERER) {
        setIsInitialized(true)
        return
      }

      if (!rendererRef.current) {
        rendererRef.current = new OptimizedArtifactRenderer(rendererConfig)
      }

      await rendererRef.current.init()
      setIsInitialized(true)
      setError(null)
    } catch (err) {
      console.error('[ArtifactRendererWrapper] Error al inicializar:', err)
      setError(`Error al inicializar el renderizador: ${err.message}`)
      setRenderState(RENDER_STATES.ERROR)
      onError?.(err.message)
    }
  }, [rendererConfig, onError])

  // Renderizar contenido
  const renderContent = useCallback(async () => {
    if (!code || !code.trim()) {
      setRenderState(RENDER_STATES.EMPTY)
      return
    }

    if (mode === 'code') {
      setRenderState(RENDER_STATES.SUCCESS)
      return
    }

    if (!isInitialized || !containerRef.current) {
      return
    }

    // Iniciar tracking de performance
    const operationId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    performanceMonitor.startRenderTracking(operationId, detectedType)

    try {
      setRenderState(RENDER_STATES.LOADING)
      setError(null)

      const startTime = performance.now()
      
      let result
      if (FEATURE_FLAGS.OPTIMIZED_RENDERER && rendererRef.current) {
        // Usar renderizador optimizado
        result = await rendererRef.current.render(code, containerRef.current)
      } else {
        // Fallback simple
        result = {
          success: true,
          html: code,
          performance: { renderTime: 0 }
        }
        
        if (containerRef.current) {
          containerRef.current.innerHTML = code
        }
      }

      const endTime = performance.now()
      const totalRenderTime = endTime - startTime

      setRenderTime(totalRenderTime)

      if (result.success) {
        // Finalizar tracking exitoso
        performanceMonitor.endRenderTracking(operationId, true)
        
        // Trackear uso de cache si aplica
        if (result.fromCache !== undefined) {
          performanceMonitor.trackCacheUsage(result.fromCache, totalRenderTime)
        }

        setRenderState(RENDER_STATES.SUCCESS)
        onRenderComplete?.({
          success: true,
          renderTime: result.performance?.renderTime || totalRenderTime,
          fromCache: result.fromCache || false
        })
      } else {
        throw new Error(result.error || 'Error desconocido en el renderizado')
      }

    } catch (err) {
      // Finalizar tracking con error
      performanceMonitor.endRenderTracking(operationId, false, err)
      
      console.error('[ArtifactRendererWrapper] Error al renderizar:', err)
      setError(err.message)
      setRenderState(RENDER_STATES.ERROR)
      onError?.(err.message)
    }
  }, [code, mode, isInitialized, onRenderComplete, onError, detectedType])

  // Reintentar renderizado
  const retryRender = useCallback(() => {
    setError(null)
    renderContent()
  }, [renderContent])

  // Manejar captura
  const handleCapture = useCallback((captureData) => {
    if (onCapture) {
      onCapture(captureData)
    }
  }, [onCapture])

  // Efecto de inicialización
  useEffect(() => {
    initializeRenderer()
  }, [initializeRenderer])

  // Efecto de renderizado
  useEffect(() => {
    if (isInitialized) {
      renderContent()
    }
  }, [isInitialized, code, detectedType, mode, renderContent])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        try {
          rendererRef.current.cleanup()
        } catch (err) {
          console.warn('[ArtifactRendererWrapper] Error en cleanup:', err)
        }
      }
    }
  }, [])

  // Obtener lenguaje para syntax highlighter
  const getLanguage = useCallback(() => {
    switch (detectedType) {
      case 'react':
      case 'javascript':
        return 'jsx'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'json':
        return 'json'
      default:
        return 'text'
    }
  }, [detectedType])

  // Renderizar estado de loading
  const renderLoading = () => (
    <div 
      className="flex items-center justify-center h-full min-h-[200px]"
      data-testid="loading-spinner"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Renderizando artefacto...</span>
      </div>
    </div>
  )

  // Renderizar estado de error
  const renderError = () => (
    <div 
      className="flex flex-col items-center justify-center h-full min-h-[200px] p-4"
      data-testid="error-state"
    >
      <div className="text-center">
        <div className="text-red-500 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error al renderizar el artefacto
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {error || 'Ha ocurrido un error inesperado'}
        </p>
        <button
          onClick={retryRender}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )

  // Renderizar estado vacío
  const renderEmpty = () => (
    <div 
      className="flex items-center justify-center h-full min-h-[200px]"
      data-testid="empty-state"
    >
      <div className="text-center text-gray-500">
        <p>No hay contenido para mostrar</p>
      </div>
    </div>
  )

  // Renderizar código con syntax highlighter
  const renderCode = () => (
    <div className="h-full overflow-auto">
      <SyntaxHighlighter
        language={getLanguage()}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers={true}
        wrapLines={true}
        data-testid="syntax-highlighter"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )

  // Renderizar contenido principal
  const renderMainContent = () => {
    if (mode === 'code') {
      return renderCode()
    }

    switch (renderState) {
      case RENDER_STATES.LOADING:
        return renderLoading()
      case RENDER_STATES.ERROR:
        return renderError()
      case RENDER_STATES.EMPTY:
        return renderEmpty()
      case RENDER_STATES.SUCCESS:
        return (
          <div 
            ref={containerRef}
            className="w-full h-full overflow-auto"
            data-testid="artifact-content"
          />
        )
      default:
        return renderLoading()
    }
  }

  // Renderizar información de performance en desarrollo
  const renderPerformanceInfo = () => {
    if (process.env.NODE_ENV !== 'development' || !FEATURE_FLAGS.DEBUG_MODE) {
      return null
    }

    return (
      <div 
        className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded"
        data-testid="performance-info"
      >
        <div>Render: {renderTime.toFixed(2)}ms</div>
        <div>Type: {detectedType}</div>
        <div>Mode: {mode}</div>
      </div>
    )
  }

  return (
    <div
      className={`relative w-full h-full ${className}`}
      data-testid="artifact-renderer-wrapper"
      role="region"
      aria-label="Artifact Renderer"
      tabIndex={0}
      {...props}
    >
      {/* Contenido principal */}
      {renderMainContent()}

      {/* SelectionTool para captura */}
      {recording && (
        <SelectionTool
          onSelect={handleCapture}
          targetRef={contentRef}
        />
      )}

      {/* Información de performance en desarrollo */}
      {renderPerformanceInfo()}

      {/* Status para screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {renderState === RENDER_STATES.LOADING && 'Cargando artefacto'}
        {renderState === RENDER_STATES.SUCCESS && 'Artefacto cargado correctamente'}
        {renderState === RENDER_STATES.ERROR && `Error: ${error}`}
        {renderState === RENDER_STATES.EMPTY && 'No hay contenido'}
      </div>
    </div>
  )
}

export default ArtifactRendererWrapper
