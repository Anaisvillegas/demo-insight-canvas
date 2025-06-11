/**
 * index.js
 * 
 * Punto de entrada para las utilidades del sistema de renderizado.
 * Exporta todas las utilidades y herramientas necesarias para
 * el funcionamiento optimizado del renderizador de artefactos.
 * 
 * Características:
 * - Exportaciones centralizadas de utilidades
 * - Configuración por defecto
 * - Inicialización coordinada
 * - Compatibilidad con importaciones nombradas
 */

// Utilidades principales
export { default as contentDetector, ContentDetector } from './contentDetector';
export { default as cacheManager, CacheManager } from './cacheManager';
export { default as performanceMonitor, PerformanceMonitor } from './performanceMonitor';

/**
 * Configuración por defecto para las utilidades
 */
export const defaultUtilsConfig = {
  contentDetector: {
    enableSecurity: true,
    enablePerformanceAnalysis: true,
    confidenceThreshold: 0.7
  },
  
  cacheManager: {
    maxSize: 100,
    defaultTTL: 300000, // 5 minutos
    enableCompression: true,
    enablePersistence: false
  },
  
  performanceMonitor: {
    sampleRate: 0.1, // 10%
    enableReporting: true,
    bufferSize: 1000
  }
};

/**
 * Inicializa todas las utilidades del renderizador
 * @param {Object} config - Configuración personalizada
 * @returns {Promise<Object>} - Objeto con todas las utilidades inicializadas
 */
export const initializeRendererUtils = async (config = {}) => {
  try {
    const finalConfig = {
      ...defaultUtilsConfig,
      ...config
    };

    // Inicializar cache manager
    if (finalConfig.cacheManager) {
      await cacheManager.init();
    }

    // Inicializar performance monitor
    if (finalConfig.performanceMonitor) {
      performanceMonitor.setEnabled(true);
    }

    console.log('Utilidades del renderizador inicializadas correctamente');

    return {
      contentDetector,
      cacheManager,
      performanceMonitor,
      config: finalConfig
    };

  } catch (error) {
    console.error('Error inicializando utilidades del renderizador:', error);
    throw error;
  }
};

/**
 * Limpia todas las utilidades del renderizador
 */
export const cleanupRendererUtils = () => {
  try {
    // Limpiar cache manager
    if (cacheManager && typeof cacheManager.destroy === 'function') {
      cacheManager.destroy();
    }

    // Limpiar performance monitor
    if (performanceMonitor && typeof performanceMonitor.destroy === 'function') {
      performanceMonitor.destroy();
    }

    console.log('Utilidades del renderizador limpiadas correctamente');

  } catch (error) {
    console.error('Error limpiando utilidades del renderizador:', error);
  }
};

/**
 * Obtiene estadísticas de todas las utilidades
 * @returns {Object} - Estadísticas combinadas
 */
export const getUtilsStats = () => {
  return {
    cache: cacheManager.getStats(),
    performance: performanceMonitor.getStats(),
    timestamp: Date.now()
  };
};

/**
 * Hook para usar las utilidades en componentes React
 * @param {Object} config - Configuración opcional
 * @returns {Object} - Objeto con todas las utilidades
 */
export const useRendererUtils = (config = {}) => {
  return {
    contentDetector,
    cacheManager,
    performanceMonitor,
    getStats: getUtilsStats,
    cleanup: cleanupRendererUtils
  };
};

/**
 * Exportación por defecto - Objeto con todas las utilidades
 */
export default {
  contentDetector,
  cacheManager,
  performanceMonitor,
  initializeRendererUtils,
  cleanupRendererUtils,
  getUtilsStats,
  useRendererUtils,
  defaultUtilsConfig
};
