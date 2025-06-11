// Gestor optimizado de requests con debouncing y cancelación
export class OptimizedRequestManager {
  private pendingRequests = new Map<string, AbortController>();
  private debouncedRequests = new Map<string, NodeJS.Timeout>();
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private requestQueue: Array<{ id: string; request: () => Promise<any>; priority: number }> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 3;
  private activeRequests = 0;

  // Ejecutar request con debouncing y cancelación
  async executeRequest<T>(
    requestId: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options: {
      debounceMs?: number;
      priority?: number;
      cacheTtl?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      debounceMs = 300,
      priority = 1,
      cacheTtl = 60000, // 1 minuto
      retries = 1
    } = options;

    // Verificar cache primero
    const cached = this.getCachedResponse<T>(requestId, cacheTtl);
    if (cached) {
      return cached;
    }

    // Cancelar request anterior con el mismo ID
    this.cancelRequest(requestId);

    // Debouncing
    if (debounceMs > 0) {
      return new Promise((resolve, reject) => {
        // Limpiar debounce anterior
        const existingTimeout = this.debouncedRequests.get(requestId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Crear nuevo debounce
        const timeoutId = setTimeout(async () => {
          this.debouncedRequests.delete(requestId);
          try {
            const result = await this.executeImmediateRequest(requestId, requestFn, {
              priority,
              cacheTtl,
              retries
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceMs);

        this.debouncedRequests.set(requestId, timeoutId);
      });
    }

    // Ejecutar inmediatamente si no hay debouncing
    return this.executeImmediateRequest(requestId, requestFn, { priority, cacheTtl, retries });
  }

  // Ejecutar request inmediato con cola de prioridad
  private async executeImmediateRequest<T>(
    requestId: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options: { priority: number; cacheTtl: number; retries: number }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Agregar a la cola con prioridad
      const queueItem = {
        id: requestId,
        request: async () => {
          const abortController = new AbortController();
          this.pendingRequests.set(requestId, abortController);

          try {
            this.activeRequests++;
            const result = await this.executeWithRetries(
              () => requestFn(abortController.signal),
              options.retries
            );

            // Cachear resultado
            this.cacheResponse(requestId, result, options.cacheTtl);
            
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          } finally {
            this.activeRequests--;
            this.pendingRequests.delete(requestId);
            this.processQueue(); // Continuar procesando cola
          }
        },
        priority: options.priority
      };

      // Insertar en cola según prioridad (mayor prioridad = menor número)
      const insertIndex = this.requestQueue.findIndex(item => item.priority > options.priority);
      if (insertIndex === -1) {
        this.requestQueue.push(queueItem);
      } else {
        this.requestQueue.splice(insertIndex, 0, queueItem);
      }

      this.processQueue();
    });
  }

  // Procesar cola de requests
  private async processQueue() {
    if (this.isProcessingQueue || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const queueItem = this.requestQueue.shift()!;
      
      // Ejecutar request sin esperar (async)
      queueItem.request().catch(() => {
        // Error ya manejado en executeImmediateRequest
      });
    }

    this.isProcessingQueue = false;
  }

  // Ejecutar con reintentos
  private async executeWithRetries<T>(
    requestFn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // No reintentar si es cancelación
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        // Esperar antes del siguiente intento (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Cancelar request específico
  cancelRequest(requestId: string): boolean {
    // Cancelar debounce
    const debouncedTimeout = this.debouncedRequests.get(requestId);
    if (debouncedTimeout) {
      clearTimeout(debouncedTimeout);
      this.debouncedRequests.delete(requestId);
    }

    // Cancelar request activo
    const abortController = this.pendingRequests.get(requestId);
    if (abortController) {
      abortController.abort();
      this.pendingRequests.delete(requestId);
      return true;
    }

    // Remover de cola
    const queueIndex = this.requestQueue.findIndex(item => item.id === requestId);
    if (queueIndex !== -1) {
      this.requestQueue.splice(queueIndex, 1);
      return true;
    }

    return false;
  }

  // Cancelar todos los requests
  cancelAllRequests() {
    // Cancelar debounces
    this.debouncedRequests.forEach(timeout => clearTimeout(timeout));
    this.debouncedRequests.clear();

    // Cancelar requests activos
    this.pendingRequests.forEach(controller => controller.abort());
    this.pendingRequests.clear();

    // Limpiar cola
    this.requestQueue = [];
  }

  // Cachear respuesta
  private cacheResponse(requestId: string, data: any, ttl: number) {
    this.requestCache.set(requestId, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Limpiar cache si es muy grande
    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }
  }

  // Obtener respuesta cacheada
  private getCachedResponse<T>(requestId: string, maxAge: number): T | null {
    const cached = this.requestCache.get(requestId);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > Math.min(cached.ttl, maxAge)) {
      this.requestCache.delete(requestId);
      return null;
    }

    return cached.data as T;
  }

  // Limpiar cache expirado
  cleanExpiredCache() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.requestCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.requestCache.delete(key));
  }

  // Obtener estadísticas
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      debouncedRequests: this.debouncedRequests.size,
      queuedRequests: this.requestQueue.length,
      activeRequests: this.activeRequests,
      cachedResponses: this.requestCache.size,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }

  // Configurar límite de requests concurrentes
  setMaxConcurrentRequests(max: number) {
    this.maxConcurrentRequests = max;
    this.processQueue(); // Procesar cola con nuevo límite
  }
}

// Instancia global del gestor de requests
export const globalRequestManager = new OptimizedRequestManager();

// Hook para usar el gestor de requests optimizado
export const useOptimizedRequests = () => {
  const executeRequest = async <T>(
    requestId: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options?: {
      debounceMs?: number;
      priority?: number;
      cacheTtl?: number;
      retries?: number;
    }
  ) => {
    return globalRequestManager.executeRequest(requestId, requestFn, options);
  };

  const cancelRequest = (requestId: string) => {
    return globalRequestManager.cancelRequest(requestId);
  };

  const cancelAllRequests = () => {
    globalRequestManager.cancelAllRequests();
  };

  const getStats = () => {
    return globalRequestManager.getStats();
  };

  return {
    executeRequest,
    cancelRequest,
    cancelAllRequests,
    getStats
  };
};

// Función utilitaria para crear request cancelable
export const createCancelableRequest = <T>(
  requestFn: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; cancel: () => void } => {
  const abortController = new AbortController();
  
  const promise = requestFn(abortController.signal);
  const cancel = () => abortController.abort();

  return { promise, cancel };
};

// Función para debouncing manual
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = { trailing: true }
): T & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFunction = ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    // Leading edge
    if (options.leading && now - lastCallTime > delay) {
      lastCallTime = now;
      return func(...args);
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Trailing edge
    if (options.trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
      }, delay);
    }
  }) as T & { cancel: () => void };

  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFunction;
};

// Función para throttling manual
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } => {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttledFunction = ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
      return func(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func(...args);
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  }) as T & { cancel: () => void };

  throttledFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFunction;
};
