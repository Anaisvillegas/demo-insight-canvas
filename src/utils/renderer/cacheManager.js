/**
 * cacheManager.js
 * 
 * Sistema de cache inteligente para el renderizador de artefactos.
 * Gestiona el almacenamiento, recuperación y limpieza de contenido
 * renderizado para optimizar el rendimiento y reducir re-renderizados.
 * 
 * Características:
 * - Cache LRU (Least Recently Used)
 * - TTL (Time To Live) configurable
 * - Compresión automática
 * - Limpieza automática
 * - Métricas de rendimiento
 * - Persistencia opcional
 */

import { RENDERER_CONSTANTS } from '../../components/renderer/constants';

/**
 * Gestor de cache principal
 */
class CacheManager {
  constructor(config = {}) {
    this.config = {
      maxSize: RENDERER_CONSTANTS.CACHE_MAX_SIZE,
      defaultTTL: RENDERER_CONSTANTS.CACHE_DEFAULT_TTL,
      cleanupInterval: RENDERER_CONSTANTS.CACHE_CLEANUP_INTERVAL,
      enableCompression: true,
      enablePersistence: false,
      storageKey: 'artifact-renderer-cache',
      ...config
    };

    this.cache = new Map();
    this.accessOrder = new Map(); // Para LRU
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      compressionSavings: 0
    };

    this.cleanupTimer = null;
    this.isInitialized = false;

    this.init();
  }

  /**
   * Inicializa el cache manager
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Cargar cache persistente si está habilitado
      if (this.config.enablePersistence) {
        await this.loadFromStorage();
      }

      // Configurar limpieza automática
      this.startCleanupTimer();

      this.isInitialized = true;
      console.log('CacheManager inicializado correctamente');

    } catch (error) {
      console.error('Error inicializando CacheManager:', error);
      throw error;
    }
  }

  /**
   * Almacena un elemento en el cache
   * @param {string} key - Clave del elemento
   * @param {*} value - Valor a almacenar
   * @param {Object} options - Opciones de almacenamiento
   */
  set(key, value, options = {}) {
    try {
      const entry = this.createCacheEntry(key, value, options);
      
      // Verificar si hay espacio disponible
      this.ensureSpace();
      
      // Almacenar en cache
      this.cache.set(key, entry);
      this.updateAccessOrder(key);
      
      // Actualizar estadísticas
      this.stats.sets++;
      
      // Persistir si está habilitado
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }

      return true;

    } catch (error) {
      console.error('Error almacenando en cache:', error);
      return false;
    }
  }

  /**
   * Recupera un elemento del cache
   * @param {string} key - Clave del elemento
   * @returns {*} - Valor almacenado o null si no existe
   */
  get(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Verificar TTL
      if (this.isExpired(entry)) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Actualizar acceso
      this.updateAccessOrder(key);
      entry.accessCount++;
      entry.lastAccess = Date.now();
      
      // Actualizar estadísticas
      this.stats.hits++;

      // Descomprimir si es necesario
      const value = this.decompressValue(entry.value, entry.compressed);
      
      return value;

    } catch (error) {
      console.error('Error recuperando del cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Elimina un elemento del cache
   * @param {string} key - Clave del elemento
   * @returns {boolean} - Si se eliminó exitosamente
   */
  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      this.accessOrder.delete(key);
      
      if (deleted) {
        this.stats.deletes++;
        
        // Persistir si está habilitado
        if (this.config.enablePersistence) {
          this.saveToStorage();
        }
      }
      
      return deleted;

    } catch (error) {
      console.error('Error eliminando del cache:', error);
      return false;
    }
  }

  /**
   * Verifica si existe un elemento en el cache
   * @param {string} key - Clave del elemento
   * @returns {boolean} - Si existe y no ha expirado
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this.isExpired(entry);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    
    // Resetear estadísticas parcialmente
    this.stats.sets = 0;
    this.stats.deletes = 0;
    
    // Persistir si está habilitado
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} - Estadísticas actuales
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Obtiene información de un elemento específico
   * @param {string} key - Clave del elemento
   * @returns {Object|null} - Información del elemento
   */
  getInfo(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      key,
      size: this.estimateEntrySize(entry),
      created: entry.timestamp,
      lastAccess: entry.lastAccess,
      accessCount: entry.accessCount,
      ttl: entry.ttl,
      expired: this.isExpired(entry),
      compressed: entry.compressed
    };
  }

  /**
   * Lista todas las claves en el cache
   * @returns {Array} - Array de claves
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Métodos privados
   */

  /**
   * Crea una entrada de cache
   */
  createCacheEntry(key, value, options) {
    const now = Date.now();
    const ttl = options.ttl || this.config.defaultTTL;
    
    // Comprimir valor si está habilitado
    const { compressedValue, isCompressed, compressionSavings } = this.compressValue(value);
    
    if (compressionSavings > 0) {
      this.stats.compressionSavings += compressionSavings;
    }

    return {
      key,
      value: compressedValue,
      compressed: isCompressed,
      timestamp: now,
      lastAccess: now,
      accessCount: 0,
      ttl,
      metadata: options.metadata || {}
    };
  }

  /**
   * Verifica si una entrada ha expirado
   */
  isExpired(entry) {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Actualiza el orden de acceso para LRU
   */
  updateAccessOrder(key) {
    // Remover si ya existe
    this.accessOrder.delete(key);
    // Agregar al final (más reciente)
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Asegura que hay espacio disponible en el cache
   */
  ensureSpace() {
    while (this.cache.size >= this.config.maxSize) {
      // Obtener la clave menos recientemente usada
      const oldestKey = this.accessOrder.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      } else {
        break; // Evitar loop infinito
      }
    }
  }

  /**
   * Comprime un valor si es beneficioso
   */
  compressValue(value) {
    if (!this.config.enableCompression) {
      return { compressedValue: value, isCompressed: false, compressionSavings: 0 };
    }

    try {
      const serialized = JSON.stringify(value);
      const originalSize = new Blob([serialized]).size;
      
      // Solo comprimir si el valor es lo suficientemente grande
      if (originalSize < 1024) { // < 1KB
        return { compressedValue: value, isCompressed: false, compressionSavings: 0 };
      }

      // Simulación de compresión (en un entorno real usarías pako o similar)
      const compressed = this.simpleCompress(serialized);
      const compressedSize = new Blob([compressed]).size;
      const savings = originalSize - compressedSize;

      if (savings > 0) {
        return { 
          compressedValue: compressed, 
          isCompressed: true, 
          compressionSavings: savings 
        };
      } else {
        return { compressedValue: value, isCompressed: false, compressionSavings: 0 };
      }

    } catch (error) {
      console.warn('Error comprimiendo valor:', error);
      return { compressedValue: value, isCompressed: false, compressionSavings: 0 };
    }
  }

  /**
   * Descomprime un valor
   */
  decompressValue(value, isCompressed) {
    if (!isCompressed) return value;

    try {
      const decompressed = this.simpleDecompress(value);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Error descomprimiendo valor:', error);
      return value; // Fallback al valor original
    }
  }

  /**
   * Compresión simple (placeholder - usar librería real en producción)
   */
  simpleCompress(str) {
    // Implementación muy básica - en producción usar pako.gzip
    return btoa(str);
  }

  /**
   * Descompresión simple (placeholder)
   */
  simpleDecompress(compressed) {
    // Implementación muy básica - en producción usar pako.ungzip
    return atob(compressed);
  }

  /**
   * Estima el uso de memoria del cache
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += this.estimateEntrySize(entry);
    }
    
    return totalSize;
  }

  /**
   * Estima el tamaño de una entrada
   */
  estimateEntrySize(entry) {
    try {
      const serialized = JSON.stringify(entry);
      return new Blob([serialized]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Inicia el timer de limpieza automática
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Detiene el timer de limpieza
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup() {
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.stats.cleanups++;
      console.log(`Cache cleanup: ${cleanedCount} entradas eliminadas`);
    }
  }

  /**
   * Carga cache desde almacenamiento persistente
   */
  async loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restaurar entradas válidas
        for (const [key, entry] of Object.entries(data.cache || {})) {
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
            this.updateAccessOrder(key);
          }
        }
        
        // Restaurar estadísticas
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (error) {
      console.warn('Error cargando cache desde storage:', error);
    }
  }

  /**
   * Guarda cache en almacenamiento persistente
   */
  async saveToStorage() {
    try {
      const data = {
        cache: Object.fromEntries(this.cache),
        stats: this.stats,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Error guardando cache en storage:', error);
    }
  }

  /**
   * Limpieza al destruir la instancia
   */
  destroy() {
    this.stopCleanupTimer();
    
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
    
    this.clear();
    this.isInitialized = false;
  }
}

/**
 * Instancia singleton del cache manager
 */
const cacheManager = new CacheManager();

export { cacheManager, CacheManager };
export default cacheManager;
