/**
 * types.js
 * 
 * Definiciones de tipos y interfaces para el sistema de renderizado optimizado.
 * Proporciona tipado consistente y documentación de las estructuras de datos
 * utilizadas en todo el sistema de renderizado.
 * 
 * Características:
 * - Definiciones de tipos para TypeScript/JSDoc
 * - Validadores de runtime
 * - Constantes de tipos
 * - Utilidades de verificación de tipos
 */

/**
 * @typedef {Object} RenderConfig
 * @property {string} type - Tipo de contenido ('html', 'react', 'javascript')
 * @property {boolean} enableCache - Habilitar sistema de cache
 * @property {boolean} enableVirtualization - Habilitar virtualización
 * @property {boolean} enableLazyLoading - Habilitar carga lazy
 * @property {string} securityLevel - Nivel de seguridad ('low', 'medium', 'high')
 * @property {Array<string>} optimizations - Lista de optimizaciones a aplicar
 * @property {number} maxFrames - Máximo número de frames
 * @property {number} frameTimeout - Timeout para frames en ms
 * @property {boolean} enablePerformanceMonitoring - Habilitar monitoreo de rendimiento
 */

/**
 * @typedef {Object} ContentDetection
 * @property {string} type - Tipo detectado del contenido
 * @property {string} complexity - Complejidad ('low', 'medium', 'high')
 * @property {Array<string>} features - Características detectadas
 * @property {Array<string>} recommendedOptimizations - Optimizaciones recomendadas
 * @property {number} confidence - Nivel de confianza de la detección (0-1)
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {string} id - ID único de la medición
 * @property {string} name - Nombre de la métrica
 * @property {number} startTime - Tiempo de inicio
 * @property {number} endTime - Tiempo de finalización
 * @property {number} duration - Duración en ms
 * @property {Object} metadata - Metadatos adicionales
 */

/**
 * @typedef {Object} CacheEntry
 * @property {string} key - Clave del cache
 * @property {*} value - Valor almacenado
 * @property {number} timestamp - Timestamp de creación
 * @property {number} ttl - Time to live en ms
 * @property {number} accessCount - Número de accesos
 * @property {number} lastAccess - Último acceso
 */

/**
 * @typedef {Object} FrameInstance
 * @property {string} id - ID único del frame
 * @property {HTMLIFrameElement} element - Elemento iframe
 * @property {boolean} isReady - Si el frame está listo
 * @property {boolean} inUse - Si el frame está en uso
 * @property {number} createdAt - Timestamp de creación
 * @property {number} lastUsed - Último uso
 * @property {number} readyTime - Tiempo cuando estuvo listo
 */

/**
 * @typedef {Object} RenderContext
 * @property {string} frameId - ID del frame asignado
 * @property {string} content - Contenido a renderizar
 * @property {string} type - Tipo de contenido
 * @property {HTMLElement} container - Contenedor de destino
 * @property {Function} onSuccess - Callback de éxito
 * @property {Function} onError - Callback de error
 * @property {string} performanceId - ID de medición de rendimiento
 * @property {number} startTime - Tiempo de inicio
 */

/**
 * Tipos de contenido soportados
 */
export const CONTENT_TYPES = {
  HTML: 'html',
  REACT: 'react',
  JAVASCRIPT: 'javascript',
  CSS: 'css',
  MARKDOWN: 'markdown',
  JSON: 'json',
  XML: 'xml'
};

/**
 * Niveles de complejidad
 */
export const COMPLEXITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Niveles de seguridad
 */
export const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Estados de renderizado
 */
export const RENDER_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  RENDERING: 'rendering',
  COMPLETE: 'complete',
  ERROR: 'error'
};

/**
 * Tipos de optimización
 */
export const OPTIMIZATION_TYPES = {
  LAZY_LOADING: 'lazy-loading',
  VIRTUALIZATION: 'virtualization',
  CACHING: 'caching',
  COMPRESSION: 'compression',
  MINIFICATION: 'minification',
  CODE_SPLITTING: 'code-splitting'
};

/**
 * Validadores de tipos
 */
export const validators = {
  /**
   * Valida configuración de renderizado
   * @param {*} config - Configuración a validar
   * @returns {boolean} - Si es válida
   */
  isValidRenderConfig(config) {
    if (!config || typeof config !== 'object') return false;
    
    const requiredFields = ['type'];
    for (const field of requiredFields) {
      if (!(field in config)) return false;
    }
    
    if (config.type && !Object.values(CONTENT_TYPES).includes(config.type)) {
      return false;
    }
    
    if (config.securityLevel && !Object.values(SECURITY_LEVELS).includes(config.securityLevel)) {
      return false;
    }
    
    return true;
  },

  /**
   * Valida detección de contenido
   * @param {*} detection - Detección a validar
   * @returns {boolean} - Si es válida
   */
  isValidContentDetection(detection) {
    if (!detection || typeof detection !== 'object') return false;
    
    const requiredFields = ['type', 'complexity', 'features'];
    for (const field of requiredFields) {
      if (!(field in detection)) return false;
    }
    
    if (!Object.values(CONTENT_TYPES).includes(detection.type)) return false;
    if (!Object.values(COMPLEXITY_LEVELS).includes(detection.complexity)) return false;
    if (!Array.isArray(detection.features)) return false;
    
    return true;
  },

  /**
   * Valida métricas de rendimiento
   * @param {*} metrics - Métricas a validar
   * @returns {boolean} - Si son válidas
   */
  isValidPerformanceMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') return false;
    
    const requiredFields = ['id', 'name', 'startTime'];
    for (const field of requiredFields) {
      if (!(field in metrics)) return false;
    }
    
    if (typeof metrics.startTime !== 'number') return false;
    if (metrics.endTime && typeof metrics.endTime !== 'number') return false;
    
    return true;
  },

  /**
   * Valida entrada de cache
   * @param {*} entry - Entrada a validar
   * @returns {boolean} - Si es válida
   */
  isValidCacheEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    
    const requiredFields = ['key', 'value', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in entry)) return false;
    }
    
    if (typeof entry.timestamp !== 'number') return false;
    if (entry.ttl && typeof entry.ttl !== 'number') return false;
    
    return true;
  }
};

/**
 * Utilidades de tipo
 */
export const typeUtils = {
  /**
   * Detecta el tipo de contenido basado en el string
   * @param {string} content - Contenido a analizar
   * @returns {string} - Tipo detectado
   */
  detectContentType(content) {
    if (!content || typeof content !== 'string') {
      return CONTENT_TYPES.HTML;
    }
    
    const trimmed = content.trim();
    
    // Detectar React/JSX
    if (trimmed.includes('React') || trimmed.includes('jsx') || trimmed.includes('useState')) {
      return CONTENT_TYPES.REACT;
    }
    
    // Detectar JavaScript
    if (trimmed.startsWith('function') || trimmed.includes('const ') || trimmed.includes('let ')) {
      return CONTENT_TYPES.JAVASCRIPT;
    }
    
    // Detectar CSS
    if (trimmed.includes('{') && trimmed.includes('}') && trimmed.includes(':')) {
      return CONTENT_TYPES.CSS;
    }
    
    // Detectar JSON
    try {
      JSON.parse(trimmed);
      return CONTENT_TYPES.JSON;
    } catch (e) {
      // No es JSON válido
    }
    
    // Detectar XML
    if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>'))) {
      return CONTENT_TYPES.XML;
    }
    
    // Detectar Markdown
    if (trimmed.includes('#') || trimmed.includes('**') || trimmed.includes('```')) {
      return CONTENT_TYPES.MARKDOWN;
    }
    
    // Por defecto, HTML
    return CONTENT_TYPES.HTML;
  },

  /**
   * Estima la complejidad del contenido
   * @param {string} content - Contenido a analizar
   * @returns {string} - Nivel de complejidad
   */
  estimateComplexity(content) {
    if (!content || typeof content !== 'string') {
      return COMPLEXITY_LEVELS.LOW;
    }
    
    const length = content.length;
    const scriptTags = (content.match(/<script/g) || []).length;
    const styleTags = (content.match(/<style/g) || []).length;
    const elements = (content.match(/</g) || []).length;
    
    // Complejidad alta
    if (length > 10000 || scriptTags > 3 || elements > 100) {
      return COMPLEXITY_LEVELS.HIGH;
    }
    
    // Complejidad media
    if (length > 2000 || scriptTags > 0 || styleTags > 0 || elements > 20) {
      return COMPLEXITY_LEVELS.MEDIUM;
    }
    
    // Complejidad baja
    return COMPLEXITY_LEVELS.LOW;
  },

  /**
   * Crea configuración por defecto
   * @param {Object} overrides - Sobrescribir valores por defecto
   * @returns {RenderConfig} - Configuración completa
   */
  createDefaultConfig(overrides = {}) {
    return {
      type: CONTENT_TYPES.HTML,
      enableCache: true,
      enableVirtualization: false,
      enableLazyLoading: false,
      securityLevel: SECURITY_LEVELS.MEDIUM,
      optimizations: [],
      maxFrames: 5,
      frameTimeout: 30000,
      enablePerformanceMonitoring: true,
      ...overrides
    };
  }
};

/**
 * Exportaciones por defecto
 */
export default {
  CONTENT_TYPES,
  COMPLEXITY_LEVELS,
  SECURITY_LEVELS,
  RENDER_STATES,
  OPTIMIZATION_TYPES,
  validators,
  typeUtils
};
