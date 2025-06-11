/**
 * ChatbotOptimizer.js
 * 
 * Sistema de optimización para el chatbot que incluye:
 * - Debouncing de requests
 * - Cache de respuestas frecuentes
 * - Queue de peticiones
 * - Retry logic con backoff exponencial
 * - Monitoreo de performance
 * 
 * Integración gradual sin romper funcionalidad existente.
 */

import { FEATURE_FLAGS, RENDERER_CONFIG } from '@/src/config/featureFlags';

/**
 * Configuración del optimizador
 */
const OPTIMIZER_CONFIG = {
  // Debouncing
  DEBOUNCE_DELAY: parseInt(process.env.NEXT_PUBLIC_CHAT_DEBOUNCE_DELAY || '300', 10),
  
  // Cache
  CACHE_SIZE: parseInt(process.env.NEXT_PUBLIC_CHAT_CACHE_SIZE || '100', 10),
  CACHE_TTL: parseInt(process.env.NEXT_PUBLIC_CHAT_CACHE_TTL || '300000', 10), // 5 minutos
  
  // Queue
  MAX_CONCURRENT_REQUESTS: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS || '3', 10),
  QUEUE_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_QUEUE_TIMEOUT || '30000', 10), // 30 segundos
  
  // Retry
  MAX_RETRIES: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10),
  INITIAL_RETRY_DELAY: parseInt(process.env.NEXT_PUBLIC_INITIAL_RETRY_DELAY || '1000', 10),
  MAX_RETRY_DELAY: parseInt(process.env.NEXT_PUBLIC_MAX_RETRY_DELAY || '10000', 10),
  
  // Performance
  PERFORMANCE_SAMPLE_RATE: parseFloat(process.env.NEXT_PUBLIC_CHAT_PERFORMANCE_SAMPLE_RATE || '0.1'),
  SLOW_REQUEST_THRESHOLD: parseInt(process.env.NEXT_PUBLIC_SLOW_REQUEST_THRESHOLD || '5000', 10),
  
  // Memory management
  MEMORY_CLEANUP_INTERVAL: parseInt(process.env.NEXT_PUBLIC_MEMORY_CLEANUP_INTERVAL || '60000', 10),
  MAX_MEMORY_USAGE_MB: parseInt(process.env.NEXT_PUBLIC_MAX_MEMORY_USAGE_MB || '50', 10)
};

/**
 * Clase principal del optimizador de chatbot
 */
class ChatbotOptimizer {
  constructor() {
    this.isEnabled = FEATURE_FLAGS.OPTIMIZED_RENDERER || false;
    this.debugMode = FEATURE_FLAGS.DEBUG_MODE || false;
    
    // Debouncing
    this.debounceTimers = new Map();
    
    // Cache de respuestas
    this.responseCache = new Map();
    this.cacheMetadata = new Map();
    
    // Queue de peticiones
    this.requestQueue = [];
    this.activeRequests = new Set();
    this.queueProcessor = null;
    
    // Retry logic
    this.retryAttempts = new Map();
    
    // Performance monitoring
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Memory management
    this.memoryCleanupTimer = null;
    
    this.init();
  }

  /**
   * Inicialización del optimizador
   */
  init() {
    if (!this.isEnabled) {
      this.log('ChatbotOptimizer deshabilitado por feature flags');
      return;
    }

    this.log('Inicializando ChatbotOptimizer...');
    
    // Iniciar procesador de queue
    this.startQueueProcessor();
    
    // Iniciar limpieza de memoria
    this.startMemoryCleanup();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    this.log('ChatbotOptimizer inicializado correctamente');
  }

  /**
   * Logging condicional
   */
  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[ChatbotOptimizer] ${message}`, ...args);
    }
  }

  /**
   * Sistema de debouncing para evitar requests múltiples
   */
  debounce(key, callback, delay = OPTIMIZER_CONFIG.DEBOUNCE_DELAY) {
    return new Promise((resolve, reject) => {
      // Cancelar timer anterior si existe
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }

      // Crear nuevo timer
      const timer = setTimeout(async () => {
        try {
          this.debounceTimers.delete(key);
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Generar hash para cache de mensajes
   */
  generateCacheKey(message, model, attachments = []) {
    const content = typeof message === 'string' ? message : JSON.stringify(message);
    const attachmentHashes = attachments.map(att => att.url || att.contentType || '').join('|');
    const keyString = `${content}|${model}|${attachmentHashes}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `chat_${Math.abs(hash)}`;
  }

  /**
   * Cache de respuestas frecuentes
   */
  getCachedResponse(cacheKey) {
    if (!this.isEnabled) return null;

    const cached = this.responseCache.get(cacheKey);
    const metadata = this.cacheMetadata.get(cacheKey);

    if (!cached || !metadata) {
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // Verificar TTL
    const now = Date.now();
    if (now - metadata.timestamp > OPTIMIZER_CONFIG.CACHE_TTL) {
      this.responseCache.delete(cacheKey);
      this.cacheMetadata.delete(cacheKey);
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // Actualizar último acceso
    metadata.lastAccessed = now;
    metadata.accessCount++;

    this.performanceMetrics.cacheHits++;
    this.log(`Cache hit para key: ${cacheKey}`);
    
    return cached;
  }

  /**
   * Guardar respuesta en cache
   */
  setCachedResponse(cacheKey, response) {
    if (!this.isEnabled) return;

    // Verificar límite de cache
    if (this.responseCache.size >= OPTIMIZER_CONFIG.CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    this.responseCache.set(cacheKey, response);
    this.cacheMetadata.set(cacheKey, {
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      size: this.estimateSize(response)
    });

    this.log(`Respuesta cacheada con key: ${cacheKey}`);
  }

  /**
   * Evicción LRU del cache
   */
  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.lastAccessed < oldestTime) {
        oldestTime = metadata.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.responseCache.delete(oldestKey);
      this.cacheMetadata.delete(oldestKey);
      this.log(`Evicted cache entry: ${oldestKey}`);
    }
  }

  /**
   * Estimación del tamaño de un objeto
   */
  estimateSize(obj) {
    try {
      return JSON.stringify(obj).length * 2; // Aproximación en bytes
    } catch {
      return 1000; // Fallback
    }
  }

  /**
   * Queue de peticiones para evitar sobrecarga
   */
  async queueRequest(requestFn, priority = 0) {
    if (!this.isEnabled) {
      return await requestFn();
    }

    return new Promise((resolve, reject) => {
      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fn: requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0
      };

      // Insertar en queue según prioridad
      const insertIndex = this.requestQueue.findIndex(r => r.priority < priority);
      if (insertIndex === -1) {
        this.requestQueue.push(request);
      } else {
        this.requestQueue.splice(insertIndex, 0, request);
      }

      this.log(`Request añadido a queue: ${request.id}, posición: ${this.requestQueue.length}`);
    });
  }

  /**
   * Procesador de queue
   */
  startQueueProcessor() {
    if (this.queueProcessor) return;

    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, 100); // Procesar cada 100ms
  }

  /**
   * Procesar queue de peticiones
   */
  async processQueue() {
    if (this.requestQueue.length === 0) return;
    if (this.activeRequests.size >= OPTIMIZER_CONFIG.MAX_CONCURRENT_REQUESTS) return;

    const request = this.requestQueue.shift();
    if (!request) return;

    // Verificar timeout
    const now = Date.now();
    if (now - request.timestamp > OPTIMIZER_CONFIG.QUEUE_TIMEOUT) {
      request.reject(new Error('Request timeout in queue'));
      this.log(`Request timeout: ${request.id}`);
      return;
    }

    this.activeRequests.add(request.id);
    this.log(`Procesando request: ${request.id}`);

    try {
      const startTime = performance.now();
      const result = await this.executeWithRetry(request);
      const endTime = performance.now();
      
      this.updatePerformanceMetrics(endTime - startTime, true);
      request.resolve(result);
      
    } catch (error) {
      this.updatePerformanceMetrics(0, false);
      request.reject(error);
      this.log(`Request failed: ${request.id}`, error);
      
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * Ejecutar request con retry logic
   */
  async executeWithRetry(request) {
    const maxRetries = OPTIMIZER_CONFIG.MAX_RETRIES;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt);
          this.log(`Retry attempt ${attempt} for ${request.id}, waiting ${delay}ms`);
          await this.sleep(delay);
        }

        const result = await request.fn();
        
        if (attempt > 0) {
          this.log(`Request ${request.id} succeeded on attempt ${attempt + 1}`);
        }
        
        return result;

      } catch (error) {
        lastError = error;
        this.log(`Request ${request.id} failed on attempt ${attempt + 1}:`, error.message);

        // No reintentar ciertos tipos de errores
        if (this.isNonRetryableError(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Calcular delay para backoff exponencial
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = OPTIMIZER_CONFIG.INITIAL_RETRY_DELAY;
    const maxDelay = OPTIMIZER_CONFIG.MAX_RETRY_DELAY;
    
    // Backoff exponencial con jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Verificar si un error no debe reintentarse
   */
  isNonRetryableError(error) {
    const nonRetryableMessages = [
      'API key',
      'authentication',
      'authorization',
      'invalid request',
      'bad request'
    ];

    const message = error.message?.toLowerCase() || '';
    return nonRetryableMessages.some(msg => message.includes(msg));
  }

  /**
   * Función de sleep para delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Actualizar métricas de performance
   */
  updatePerformanceMetrics(responseTime, success) {
    this.performanceMetrics.totalRequests++;
    
    if (success) {
      this.performanceMetrics.successfulRequests++;
      
      // Actualizar tiempo promedio de respuesta
      const total = this.performanceMetrics.totalRequests;
      const current = this.performanceMetrics.averageResponseTime;
      this.performanceMetrics.averageResponseTime = 
        (current * (total - 1) + responseTime) / total;
      
      // Contar requests lentos
      if (responseTime > OPTIMIZER_CONFIG.SLOW_REQUEST_THRESHOLD) {
        this.performanceMetrics.slowRequests++;
      }
      
    } else {
      this.performanceMetrics.failedRequests++;
    }

    // Muestreo de métricas
    if (Math.random() < OPTIMIZER_CONFIG.PERFORMANCE_SAMPLE_RATE) {
      this.logPerformanceMetrics();
    }
  }

  /**
   * Log de métricas de performance
   */
  logPerformanceMetrics() {
    const metrics = this.performanceMetrics;
    const successRate = (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2);
    const cacheHitRate = ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2);
    
    this.log('Performance Metrics:', {
      totalRequests: metrics.totalRequests,
      successRate: `${successRate}%`,
      averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
      slowRequests: metrics.slowRequests,
      cacheHitRate: `${cacheHitRate}%`,
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests.size
    });
  }

  /**
   * Limpieza de memoria
   */
  startMemoryCleanup() {
    if (this.memoryCleanupTimer) return;

    this.memoryCleanupTimer = setInterval(() => {
      this.cleanupMemory();
    }, OPTIMIZER_CONFIG.MEMORY_CLEANUP_INTERVAL);
  }

  /**
   * Ejecutar limpieza de memoria
   */
  cleanupMemory() {
    const now = Date.now();
    let cleanedEntries = 0;

    // Limpiar cache expirado
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now - metadata.timestamp > OPTIMIZER_CONFIG.CACHE_TTL) {
        this.responseCache.delete(key);
        this.cacheMetadata.delete(key);
        cleanedEntries++;
      }
    }

    // Limpiar timers de debounce expirados
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (!timer) {
        this.debounceTimers.delete(key);
      }
    }

    // Verificar uso de memoria
    const memoryUsage = this.estimateMemoryUsage();
    if (memoryUsage > OPTIMIZER_CONFIG.MAX_MEMORY_USAGE_MB) {
      this.forceMemoryCleanup();
    }

    if (cleanedEntries > 0) {
      this.log(`Memory cleanup: ${cleanedEntries} entries removed`);
    }
  }

  /**
   * Estimación del uso de memoria
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const metadata of this.cacheMetadata.values()) {
      totalSize += metadata.size || 0;
    }
    
    return totalSize / (1024 * 1024); // Convert to MB
  }

  /**
   * Limpieza forzada de memoria
   */
  forceMemoryCleanup() {
    const targetSize = Math.floor(OPTIMIZER_CONFIG.CACHE_SIZE * 0.7);
    
    // Ordenar por último acceso
    const entries = Array.from(this.cacheMetadata.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Eliminar entradas más antiguas
    const toRemove = entries.length - targetSize;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.responseCache.delete(key);
      this.cacheMetadata.delete(key);
    }
    
    this.log(`Force cleanup: removed ${toRemove} cache entries`);
  }

  /**
   * Event listeners para cleanup
   */
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      // Cleanup en visibilidad change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.cleanupMemory();
        }
      });
    }
  }

  /**
   * Método principal para optimizar requests de chat
   */
  async optimizeRequest(requestFn, options = {}) {
    if (!this.isEnabled) {
      return await requestFn();
    }

    const {
      cacheKey = null,
      priority = 0,
      debounceKey = null,
      debounceDelay = OPTIMIZER_CONFIG.DEBOUNCE_DELAY
    } = options;

    // Verificar cache primero
    if (cacheKey) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Aplicar debouncing si se especifica
    const executeRequest = async () => {
      return await this.queueRequest(requestFn, priority);
    };

    let result;
    if (debounceKey) {
      result = await this.debounce(debounceKey, executeRequest, debounceDelay);
    } else {
      result = await executeRequest();
    }

    // Guardar en cache si se especifica
    if (cacheKey && result) {
      this.setCachedResponse(cacheKey, result);
    }

    return result;
  }

  /**
   * Obtener estadísticas del optimizador
   */
  getStats() {
    return {
      isEnabled: this.isEnabled,
      performance: { ...this.performanceMetrics },
      cache: {
        size: this.responseCache.size,
        maxSize: OPTIMIZER_CONFIG.CACHE_SIZE,
        hitRate: this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100
      },
      queue: {
        pending: this.requestQueue.length,
        active: this.activeRequests.size,
        maxConcurrent: OPTIMIZER_CONFIG.MAX_CONCURRENT_REQUESTS
      },
      memory: {
        estimatedUsageMB: this.estimateMemoryUsage(),
        maxUsageMB: OPTIMIZER_CONFIG.MAX_MEMORY_USAGE_MB
      }
    };
  }

  /**
   * Limpiar recursos
   */
  cleanup() {
    this.log('Cleaning up ChatbotOptimizer...');
    
    // Limpiar timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
    
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }
    
    // Limpiar cache
    this.responseCache.clear();
    this.cacheMetadata.clear();
    
    // Limpiar queue
    this.requestQueue.length = 0;
    this.activeRequests.clear();
    
    this.log('ChatbotOptimizer cleanup completed');
  }
}

// Instancia singleton
let optimizerInstance = null;

/**
 * Obtener instancia del optimizador
 */
export const getChatbotOptimizer = () => {
  if (!optimizerInstance) {
    optimizerInstance = new ChatbotOptimizer();
  }
  return optimizerInstance;
};

/**
 * Hook para usar el optimizador en componentes React
 */
export const useChatbotOptimizer = () => {
  const optimizer = getChatbotOptimizer();
  
  return {
    optimizeRequest: optimizer.optimizeRequest.bind(optimizer),
    getStats: optimizer.getStats.bind(optimizer),
    isEnabled: optimizer.isEnabled,
    generateCacheKey: optimizer.generateCacheKey.bind(optimizer)
  };
};

/**
 * Función de utilidad para optimizar requests de chat
 */
export const optimizeChatRequest = async (requestFn, options = {}) => {
  const optimizer = getChatbotOptimizer();
  return await optimizer.optimizeRequest(requestFn, options);
};

/**
 * Función de utilidad para generar cache keys
 */
export const generateChatCacheKey = (message, model, attachments = []) => {
  const optimizer = getChatbotOptimizer();
  return optimizer.generateCacheKey(message, model, attachments);
};

export default ChatbotOptimizer;
