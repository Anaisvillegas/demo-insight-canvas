/**
 * Constantes del renderizador de artefactos
 */

export const RENDERER_CONSTANTS = {
  MAX_RENDER_TIME: 10000,
  MAX_PENDING_RENDERS: 10,
  INITIALIZATION_TIMEOUT: 10000,
  MAX_INITIALIZATION_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 2000,
  IFRAME_SANDBOX_PERMISSIONS: ['allow-scripts', 'allow-forms'],
  SUPPORTED_CONTENT_TYPES: ['html', 'react', 'markdown', 'python', 'auto'] as const,
  DEFAULT_FRAME_URL: '/renderer-frame.html'
};

export const MESSAGES = {
  ERRORS: {
    RENDER_TIMEOUT: 'Timeout de renderizado',
    INITIALIZATION_FAILED: 'No se pudo inicializar el renderer después de múltiples intentos',
    IFRAME_NOT_AVAILABLE: 'Iframe no disponible para enviar mensaje',
    SCRIPTS_NOT_LOADED: 'Error cargando scripts externos. Verifique la conexión a internet.',
    UNKNOWN_ERROR: 'Error desconocido'
  },
  SUCCESS: {
    RENDERER_READY: 'Renderer inicializado y listo',
    RENDER_COMPLETE: 'Render completado exitosamente',
    SCRIPTS_LOADED: 'Scripts esenciales cargados'
  },
  WARNINGS: {
    CONTENT_DETECTOR_UNAVAILABLE: 'contentDetector no disponible, usando fallback',
    PERFORMANCE_MONITOR_UNAVAILABLE: 'performanceMonitor no disponible, usando fallback',
    CONSTANTS_UNAVAILABLE: 'constants no disponibles, usando fallback',
    RECHARTS_UNAVAILABLE: 'Recharts no disponible o falló al cargar, usando fallbacks',
    REACT_18_UNAVAILABLE: 'React 18 createRoot no disponible, usando render legacy'
  }
};

export const CONTENT_TYPE_DETECTION = {
  HTML_INDICATORS: ['<!DOCTYPE html>', '<html', '<body', '<head'],
  REACT_INDICATORS: ['import React', 'export default', 'useState', 'useEffect'],
  MARKDOWN_INDICATORS: ['# ', '## ', '### ', '**', '*', '```'],
  PYTHON_INDICATORS: ['def ', 'import ', 'from ', 'class ', 'if __name__']
};

export const PERFORMANCE_METRICS = {
  MEASUREMENT_TYPES: {
    ARTIFACT_RENDER: 'artifact-render',
    INITIALIZATION: 'initialization',
    CONTENT_DETECTION: 'content-detection'
  },
  THRESHOLDS: {
    SLOW_RENDER: 5000,
    VERY_SLOW_RENDER: 10000
  }
};

export const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 50,
  CACHE_TTL: 300000, // 5 minutos
  CACHE_KEYS: {
    RENDERED_CONTENT: 'rendered_content',
    DETECTED_TYPES: 'detected_types',
    PERFORMANCE_DATA: 'performance_data'
  }
};

export type ContentType = typeof RENDERER_CONSTANTS.SUPPORTED_CONTENT_TYPES[number];
export type PerformanceMeasurementType = keyof typeof PERFORMANCE_METRICS.MEASUREMENT_TYPES;
