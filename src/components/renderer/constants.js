/**
 * constants.js
 * 
 * Constantes globales para el sistema de renderizado optimizado.
 * Centraliza valores de configuración, límites, timeouts y otros
 * parámetros que pueden necesitar ajuste o personalización.
 * 
 * Características:
 * - Configuración centralizada
 * - Valores por defecto del sistema
 * - Límites y restricciones
 * - URLs y endpoints
 * - Mensajes y textos
 */

/**
 * Configuración general del renderizador
 */
export const RENDERER_CONSTANTS = {
  // Configuración de frames
  MAX_FRAMES: 5,
  FRAME_TIMEOUT: 30000, // 30 segundos
  FRAME_POOL_SIZE: 3,
  FRAME_CLEANUP_INTERVAL: 60000, // 1 minuto
  
  // Configuración de cache
  CACHE_MAX_SIZE: 100,
  CACHE_DEFAULT_TTL: 300000, // 5 minutos
  CACHE_CLEANUP_INTERVAL: 60000, // 1 minuto
  
  // Configuración de rendimiento
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10% de muestreo
  PERFORMANCE_BUFFER_SIZE: 1000,
  PERFORMANCE_FLUSH_INTERVAL: 30000, // 30 segundos
  
  // Límites de contenido
  MAX_CONTENT_SIZE: 1024 * 1024, // 1MB
  MAX_RENDER_TIME: 10000, // 10 segundos
  MAX_CONCURRENT_RENDERS: 10,
  
  // Configuración de seguridad
  ALLOWED_ORIGINS: ['*'], // En producción, especificar orígenes
  SANDBOX_PERMISSIONS: [
    'allow-scripts',
    'allow-same-origin',
    'allow-forms'
  ],
  
  // URLs y endpoints
  DEFAULT_FRAME_URL: '/renderer-frame.html',
  FALLBACK_RENDERER_URL: null,
  
  // Configuración de retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  RETRY_BACKOFF_FACTOR: 2
};

/**
 * Mensajes del sistema
 */
export const MESSAGES = {
  // Mensajes de error
  ERRORS: {
    FRAME_TIMEOUT: 'Frame timeout: El frame no respondió en el tiempo esperado',
    FRAME_CREATION_FAILED: 'Error al crear frame de renderizado',
    CONTENT_TOO_LARGE: 'El contenido excede el tamaño máximo permitido',
    RENDER_TIMEOUT: 'Timeout: El renderizado tardó demasiado tiempo',
    INVALID_CONTENT_TYPE: 'Tipo de contenido no soportado',
    SECURITY_VIOLATION: 'Violación de seguridad detectada',
    CACHE_FULL: 'Cache lleno: No se puede almacenar más contenido',
    MAX_RENDERS_EXCEEDED: 'Máximo número de renderizados concurrentes excedido'
  },
  
  // Mensajes de estado
  STATUS: {
    INITIALIZING: 'Inicializando renderizador...',
    LOADING: 'Cargando contenido...',
    RENDERING: 'Renderizando artefacto...',
    COMPLETE: 'Renderizado completado',
    CACHED: 'Contenido obtenido del cache',
    FALLBACK: 'Usando renderizador de respaldo'
  },
  
  // Mensajes de debug
  DEBUG: {
    FRAME_CREATED: 'Frame creado exitosamente',
    FRAME_READY: 'Frame listo para renderizar',
    CACHE_HIT: 'Cache hit para contenido',
    CACHE_MISS: 'Cache miss, renderizando contenido',
    PERFORMANCE_LOGGED: 'Métricas de rendimiento registradas'
  }
};

/**
 * Configuración de tipos de contenido
 */
export const CONTENT_CONFIG = {
  html: {
    maxSize: 512 * 1024, // 512KB
    timeout: 5000,
    securityLevel: 'medium',
    allowedTags: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'a'],
    blockedTags: ['script', 'iframe', 'object', 'embed']
  },
  
  react: {
    maxSize: 1024 * 1024, // 1MB
    timeout: 10000,
    securityLevel: 'high',
    requiresTranspilation: true,
    allowedImports: ['react', 'react-dom']
  },
  
  javascript: {
    maxSize: 256 * 1024, // 256KB
    timeout: 5000,
    securityLevel: 'high',
    allowedAPIs: ['console', 'Math', 'Date'],
    blockedAPIs: ['fetch', 'XMLHttpRequest', 'eval']
  },
  
  css: {
    maxSize: 128 * 1024, // 128KB
    timeout: 2000,
    securityLevel: 'low',
    allowedProperties: ['color', 'background', 'font', 'margin', 'padding'],
    blockedProperties: ['@import', 'expression']
  }
};

/**
 * Configuración de optimizaciones
 */
export const OPTIMIZATION_CONFIG = {
  'lazy-loading': {
    enabled: true,
    threshold: 0.1, // 10% del viewport
    rootMargin: '50px'
  },
  
  'virtualization': {
    enabled: false,
    itemHeight: 50,
    overscan: 5
  },
  
  'caching': {
    enabled: true,
    strategy: 'lru', // least recently used
    maxAge: 300000 // 5 minutos
  },
  
  'compression': {
    enabled: true,
    algorithm: 'gzip',
    level: 6
  },
  
  'minification': {
    enabled: true,
    removeComments: true,
    removeWhitespace: true
  },
  
  'code-splitting': {
    enabled: false,
    chunkSize: 50 * 1024 // 50KB
  }
};

/**
 * Configuración de monitoreo
 */
export const MONITORING_CONFIG = {
  // Métricas a recopilar
  metrics: [
    'render-time',
    'frame-creation-time',
    'cache-hit-rate',
    'error-rate',
    'memory-usage'
  ],
  
  // Umbrales de alerta
  thresholds: {
    renderTime: 5000, // 5 segundos
    frameCreationTime: 2000, // 2 segundos
    errorRate: 0.05, // 5%
    memoryUsage: 100 * 1024 * 1024 // 100MB
  },
  
  // Configuración de reportes
  reporting: {
    enabled: true,
    interval: 60000, // 1 minuto
    endpoint: null, // Se configurará según el entorno
    batchSize: 50
  }
};

/**
 * Configuración de desarrollo
 */
export const DEV_CONFIG = {
  // Logging
  enableDebugLogs: process.env.NODE_ENV === 'development',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  
  // Hot reload
  enableHotReload: process.env.NODE_ENV === 'development',
  hotReloadPort: 3001,
  
  // Testing
  enableTestMode: process.env.NODE_ENV === 'test',
  mockFrames: process.env.NODE_ENV === 'test',
  
  // Performance
  enablePerformanceMarks: true,
  enableMemoryTracking: process.env.NODE_ENV === 'development'
};

/**
 * Configuración de producción
 */
export const PROD_CONFIG = {
  // Optimizaciones
  enableMinification: true,
  enableCompression: true,
  enableCaching: true,
  
  // Seguridad
  strictCSP: true,
  validateOrigins: true,
  sanitizeContent: true,
  
  // Monitoreo
  enableErrorReporting: true,
  enablePerformanceMonitoring: true,
  sampleRate: 0.01 // 1% en producción
};

/**
 * Selectores CSS para el sistema
 */
export const CSS_SELECTORS = {
  RENDERER_CONTAINER: '.optimized-artifact-renderer',
  WRAPPER_CONTAINER: '.artifact-renderer-wrapper',
  LOADING_INDICATOR: '.artifact-renderer-loading',
  ERROR_CONTAINER: '.artifact-renderer-error',
  FRAME_CONTAINER: '.renderer-frame-container',
  CACHE_INDICATOR: '.cache-indicator'
};

/**
 * Clases CSS del sistema
 */
export const CSS_CLASSES = {
  OPTIMIZED: 'optimized',
  LEGACY: 'legacy',
  LOADING: 'loading',
  ERROR: 'error',
  CACHED: 'cached',
  READY: 'ready',
  RENDERING: 'rendering'
};

/**
 * Eventos del sistema
 */
export const EVENTS = {
  // Eventos de frame
  FRAME_READY: 'FRAME_READY',
  FRAME_ERROR: 'FRAME_ERROR',
  FRAME_DESTROYED: 'FRAME_DESTROYED',
  
  // Eventos de renderizado
  RENDER_START: 'RENDER_START',
  RENDER_COMPLETE: 'RENDER_COMPLETE',
  RENDER_ERROR: 'RENDER_ERROR',
  
  // Eventos de cache
  CACHE_HIT: 'CACHE_HIT',
  CACHE_MISS: 'CACHE_MISS',
  CACHE_CLEARED: 'CACHE_CLEARED',
  
  // Eventos de rendimiento
  PERFORMANCE_MEASURED: 'PERFORMANCE_MEASURED',
  THRESHOLD_EXCEEDED: 'THRESHOLD_EXCEEDED'
};

/**
 * Configuración por defecto combinada
 */
export const DEFAULT_CONFIG = {
  ...RENDERER_CONSTANTS,
  contentConfig: CONTENT_CONFIG,
  optimizations: OPTIMIZATION_CONFIG,
  monitoring: MONITORING_CONFIG,
  development: DEV_CONFIG,
  production: PROD_CONFIG
};

/**
 * Exportación por defecto
 */
export default {
  RENDERER_CONSTANTS,
  MESSAGES,
  CONTENT_CONFIG,
  OPTIMIZATION_CONFIG,
  MONITORING_CONFIG,
  DEV_CONFIG,
  PROD_CONFIG,
  CSS_SELECTORS,
  CSS_CLASSES,
  EVENTS,
  DEFAULT_CONFIG
};
