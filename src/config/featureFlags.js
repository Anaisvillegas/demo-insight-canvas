/**
 * featureFlags.js
 * 
 * Sistema de feature flags para controlar funcionalidades experimentales
 * y optimizaciones del sistema de renderizado.
 * 
 * Uso:
 * import { FEATURE_FLAGS } from '@/config/featureFlags';
 * if (FEATURE_FLAGS.OPTIMIZED_RENDERER) { ... }
 */

/**
 * Feature flags principales del sistema
 */
export const FEATURE_FLAGS = {
  // Sistema de renderizado optimizado
  OPTIMIZED_RENDERER: process.env.NEXT_PUBLIC_USE_OPTIMIZED_RENDERER === 'true',
  
  // Cache del renderizador
  RENDERER_CACHE: process.env.NEXT_PUBLIC_RENDERER_CACHE === 'true',
  
  // Monitoreo de rendimiento
  PERFORMANCE_MONITORING: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING === 'true',
  
  // Lazy loading de artefactos
  LAZY_LOADING: process.env.NEXT_PUBLIC_LAZY_LOADING === 'true',
  
  // Virtualización para contenido complejo
  VIRTUALIZATION: process.env.NEXT_PUBLIC_VIRTUALIZATION === 'true',
  
  // Compresión de cache
  CACHE_COMPRESSION: process.env.NEXT_PUBLIC_CACHE_COMPRESSION === 'true',
  
  // Debug mode para desarrollo
  DEBUG_MODE: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_RENDERER === 'true',
  
  // Preload de frames
  PRELOAD_FRAMES: process.env.NEXT_PUBLIC_PRELOAD_FRAMES === 'true',
  
  // Detección automática de contenido
  AUTO_CONTENT_DETECTION: process.env.NEXT_PUBLIC_AUTO_CONTENT_DETECTION === 'true',
  
  // Alertas de rendimiento
  PERFORMANCE_ALERTS: process.env.NEXT_PUBLIC_PERFORMANCE_ALERTS === 'true',
  
  // ChatbotOptimizer flags
  OPTIMIZED_CHATBOT: process.env.NEXT_PUBLIC_OPTIMIZED_CHATBOT === 'true',
  CHAT_QUEUE: process.env.NEXT_PUBLIC_CHAT_QUEUE === 'true',
  CHAT_CACHE: process.env.NEXT_PUBLIC_CHAT_CACHE === 'true',
  CHAT_LAZY_LOADING: process.env.NEXT_PUBLIC_CHAT_LAZY_LOADING === 'true',
  CHAT_METRICS: process.env.NEXT_PUBLIC_CHAT_METRICS === 'true'
};

/**
 * Configuración del renderizador basada en variables de entorno
 */
export const RENDERER_CONFIG = {
  // Tamaño del cache (número de elementos)
  CACHE_SIZE: parseInt(process.env.NEXT_PUBLIC_RENDERER_CACHE_SIZE || '100', 10),
  
  // Timeout para renderizado (ms)
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_RENDERER_TIMEOUT || '5000', 10),
  
  // Número máximo de frames concurrentes
  MAX_FRAMES: parseInt(process.env.NEXT_PUBLIC_MAX_FRAMES || '5', 10),
  
  // TTL del cache (ms)
  CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300000', 10), // 5 minutos
  
  // Umbral de memoria para limpieza automática (MB)
  MEMORY_THRESHOLD: parseInt(process.env.NEXT_PUBLIC_MEMORY_THRESHOLD || '100', 10),
  
  // Intervalo de limpieza de cache (ms)
  CLEANUP_INTERVAL: parseInt(process.env.NEXT_PUBLIC_CLEANUP_INTERVAL || '60000', 10), // 1 minuto
  
  // Nivel de compresión (0-9)
  COMPRESSION_LEVEL: parseInt(process.env.NEXT_PUBLIC_COMPRESSION_LEVEL || '6', 10),
  
  // Frecuencia de muestreo de rendimiento (0-1)
  PERFORMANCE_SAMPLE_RATE: parseFloat(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || '0.1'),
  
  // URL del frame optimizado
  FRAME_URL: process.env.NEXT_PUBLIC_OPTIMIZED_FRAME_URL || '/renderer-frame.html',
  
  // URL del frame legacy (fallback)
  LEGACY_FRAME_URL: process.env.NEXT_PUBLIC_ARTIFACT_RENDERER_URL || 'https://open-artifacts-renderer-tools33.replit.app'
};

/**
 * Configuración de seguridad
 */
export const SECURITY_CONFIG = {
  // Sandbox del iframe
  IFRAME_SANDBOX: process.env.NEXT_PUBLIC_IFRAME_SANDBOX === 'true',
  
  // Sanitización de HTML
  HTML_SANITIZATION: process.env.NEXT_PUBLIC_HTML_SANITIZATION !== 'false', // true por defecto
  
  // Validación de contenido
  CONTENT_VALIDATION: process.env.NEXT_PUBLIC_CONTENT_VALIDATION !== 'false', // true por defecto
  
  // CSP estricto
  STRICT_CSP: process.env.NEXT_PUBLIC_STRICT_CSP === 'true'
};

/**
 * Configuración de desarrollo
 */
export const DEV_CONFIG = {
  // Logs detallados
  VERBOSE_LOGGING: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_VERBOSE_LOGS === 'true',
  
  // Métricas en consola
  CONSOLE_METRICS: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_CONSOLE_METRICS === 'true',
  
  // Hot reload del frame
  HOT_RELOAD_FRAME: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_HOT_RELOAD_FRAME === 'true',
  
  // Simulación de latencia
  SIMULATE_LATENCY: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SIMULATE_LATENCY === 'true',
  
  // Latencia simulada (ms)
  SIMULATED_LATENCY: parseInt(process.env.NEXT_PUBLIC_SIMULATED_LATENCY || '0', 10)
};

/**
 * Función para verificar si una feature está habilitada
 * @param {string} flagName - Nombre del feature flag
 * @returns {boolean} - Estado del flag
 */
export const isFeatureEnabled = (flagName) => {
  return FEATURE_FLAGS[flagName] === true;
};

/**
 * Función para obtener configuración del renderizador
 * @param {string} configKey - Clave de configuración
 * @returns {any} - Valor de configuración
 */
export const getRendererConfig = (configKey) => {
  return RENDERER_CONFIG[configKey];
};

/**
 * Función para verificar si estamos en modo desarrollo
 * @returns {boolean} - True si está en desarrollo
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Función para verificar si estamos en modo producción
 * @returns {boolean} - True si está en producción
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Función para obtener configuración completa basada en el entorno
 * @returns {object} - Configuración completa
 */
export const getEnvironmentConfig = () => {
  const baseConfig = {
    ...FEATURE_FLAGS,
    ...RENDERER_CONFIG,
    ...SECURITY_CONFIG
  };

  // En desarrollo, agregar configuración de desarrollo
  if (isDevelopment()) {
    return {
      ...baseConfig,
      ...DEV_CONFIG
    };
  }

  return baseConfig;
};

/**
 * Función para validar configuración
 * @returns {object} - Resultado de validación
 */
export const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Validar tamaño de cache
  if (RENDERER_CONFIG.CACHE_SIZE < 10 || RENDERER_CONFIG.CACHE_SIZE > 1000) {
    warnings.push('CACHE_SIZE debería estar entre 10 y 1000');
  }

  // Validar timeout
  if (RENDERER_CONFIG.TIMEOUT < 1000 || RENDERER_CONFIG.TIMEOUT > 30000) {
    warnings.push('TIMEOUT debería estar entre 1000ms y 30000ms');
  }

  // Validar max frames
  if (RENDERER_CONFIG.MAX_FRAMES < 1 || RENDERER_CONFIG.MAX_FRAMES > 20) {
    warnings.push('MAX_FRAMES debería estar entre 1 y 20');
  }

  // Validar sample rate
  if (RENDERER_CONFIG.PERFORMANCE_SAMPLE_RATE < 0 || RENDERER_CONFIG.PERFORMANCE_SAMPLE_RATE > 1) {
    errors.push('PERFORMANCE_SAMPLE_RATE debe estar entre 0 y 1');
  }

  // Validar URLs
  if (!RENDERER_CONFIG.FRAME_URL) {
    errors.push('FRAME_URL es requerida');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Validar configuración al cargar el módulo en desarrollo
if (isDevelopment()) {
  const validation = validateConfig();
  if (!validation.isValid) {
    console.error('❌ Errores en configuración de feature flags:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Advertencias en configuración:', validation.warnings);
  }
  if (DEV_CONFIG.VERBOSE_LOGGING) {
    console.log('🚀 Feature flags cargados:', FEATURE_FLAGS);
    console.log('⚙️ Configuración del renderizador:', RENDERER_CONFIG);
  }
}

export default FEATURE_FLAGS;
