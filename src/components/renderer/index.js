/**
 * index.js
 * 
 * Punto de entrada principal para el sistema de renderizado optimizado.
 * Exporta todos los componentes, utilidades y configuraciones necesarias
 * para integrar el sistema en la aplicación.
 * 
 * Características:
 * - Exportaciones centralizadas
 * - Configuración por defecto
 * - Inicialización del sistema
 * - Compatibilidad con importaciones nombradas y por defecto
 */

// Componentes principales
export { default as OptimizedArtifactRenderer } from './OptimizedArtifactRenderer';
export { default as ArtifactRendererWrapper } from './ArtifactRendererWrapper';
export { default as RendererManager } from './RendererManager';

// Tipos y constantes
export * from './types';
export * from './constants';

// Utilidades de renderizado
export * from '../utils/renderer';

/**
 * Configuración por defecto del sistema
 */
export const defaultRendererConfig = {
  type: 'html',
  enableCache: true,
  enableVirtualization: false,
  enableLazyLoading: false,
  securityLevel: 'medium',
  optimizations: [],
  maxFrames: 5,
  frameTimeout: 30000,
  enablePerformanceMonitoring: true
};

/**
 * Instancia global del RendererManager (singleton)
 */
let globalRendererManager = null;

/**
 * Obtiene la instancia global del RendererManager
 * @param {Object} config - Configuración opcional
 * @returns {RendererManager} - Instancia del manager
 */
export const getRendererManager = (config = {}) => {
  if (!globalRendererManager) {
    globalRendererManager = new RendererManager({
      ...defaultRendererConfig,
      ...config
    });
  }
  return globalRendererManager;
};

/**
 * Inicializa el sistema de renderizado
 * @param {Object} config - Configuración del sistema
 * @returns {Promise<RendererManager>} - Manager inicializado
 */
export const initializeRenderer = async (config = {}) => {
  const manager = getRendererManager(config);
  await manager.init();
  return manager;
};

/**
 * Limpia el sistema de renderizado
 */
export const cleanupRenderer = () => {
  if (globalRendererManager) {
    globalRendererManager.cleanup();
    globalRendererManager = null;
  }
};

/**
 * Hook para usar el renderizador en componentes React
 * @param {Object} config - Configuración opcional
 * @returns {Object} - Objeto con métodos del renderizador
 */
export const useRenderer = (config = {}) => {
  const manager = getRendererManager(config);
  
  return {
    render: manager.render.bind(manager),
    getStats: manager.getStats.bind(manager),
    cleanup: manager.cleanup.bind(manager)
  };
};

// Exportación por defecto
export { default } from './ArtifactRendererWrapper';
