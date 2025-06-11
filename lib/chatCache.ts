/**
 * ChatCache - Sistema de caché inteligente para respuestas del chatbot
 * Incluye normalización de mensajes, TTL, métricas y gestión de memoria
 */

interface CachedResponse {
  response: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: number;
  };
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  messageHash: string;
}

interface CacheStats {
  hitRate: number;
  hits: number;
  misses: number;
  totalSize: number;
  averageResponseTime: number;
  oldestEntry: number;
  newestEntry: number;
}

export class ChatCache {
  private cache: Map<string, CachedResponse> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live en milliseconds
  private readonly cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 100, ttlMinutes: number = 60) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000; // Convertir a milliseconds
    this.cleanupInterval = 5 * 60 * 1000; // Limpiar cada 5 minutos
    
    console.log('🚀 ChatCache inicializado:', {
      maxSize: this.maxSize,
      ttl: ttlMinutes + ' minutos',
      cleanupInterval: '5 minutos'
    });

    // Iniciar limpieza automática
    this.startCleanupTimer();
  }

  /**
   * Genera una clave normalizada para el mensaje
   */
  generateKey(message: string): string {
    // Normalizar el mensaje
    let normalized = message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .replace(/[^\w\s]/g, '') // Remover puntuación
      .replace(/\b(por favor|please|gracias|thanks)\b/g, '') // Remover cortesías
      .trim();

    // Generar hash simple para la clave
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }

    return `msg_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Verifica si dos mensajes son similares (para evitar duplicados casi idénticos)
   */
  private isSimilarMessage(message1: string, message2: string): boolean {
    const normalized1 = this.generateKey(message1);
    const normalized2 = this.generateKey(message2);
    return normalized1 === normalized2;
  }

  /**
   * Obtiene una respuesta del caché
   */
  get(message: string): CachedResponse['response'] | null {
    const startTime = performance.now();
    const key = this.generateKey(message);
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      
      // Verificar TTL
      if (Date.now() - cached.timestamp > this.ttl) {
        console.log('⏰ Cache EXPIRED:', key, 'Age:', Date.now() - cached.timestamp, 'ms');
        this.cache.delete(key);
        this.missCount++;
        return null;
      }

      // Actualizar estadísticas de acceso
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      
      this.hitCount++;
      const retrievalTime = performance.now() - startTime;
      
      console.log('💾 Cache HIT:', {
        key,
        age: ((Date.now() - cached.timestamp) / 1000).toFixed(3) + 's',
        accessCount: cached.accessCount,
        retrievalTime: (retrievalTime / 1000).toFixed(3) + 's'
      });
      
      return cached.response;
    }
    
    this.missCount++;
    const missTime = performance.now() - startTime;
    console.log('🔍 Cache MISS:', {
      key,
      searchTime: (missTime / 1000).toFixed(3) + 's'
    });
    
    return null;
  }

  /**
   * Guarda una respuesta en el caché
   */
  set(message: string, response: string): void {
    const startTime = performance.now();
    const key = this.generateKey(message);
    
    // Verificar si ya existe una respuesta similar
    const entries = Array.from(this.cache.entries());
    for (const [existingKey, cached] of entries) {
      if (this.isSimilarMessage(message, cached.messageHash)) {
        console.log('🔄 Actualizando respuesta similar existente:', existingKey);
        this.cache.delete(existingKey);
        break;
      }
    }
    
    // Gestión de tamaño del caché (LRU - Least Recently Used)
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    // Crear entrada de caché
    const cachedResponse: CachedResponse = {
      response: {
        id: `cached-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      messageHash: message
    };
    
    this.cache.set(key, cachedResponse);
    
    const cacheTime = performance.now() - startTime;
      console.log('💾 Respuesta cacheada:', {
        key,
        responseLength: response.length,
        cacheTime: (cacheTime / 1000).toFixed(3) + 's',
        totalCached: this.cache.size
      });
  }

  /**
   * Elimina la entrada menos recientemente usada
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    const entries = Array.from(this.cache.entries());
    for (const [key, cached] of entries) {
      if (cached.lastAccessed < oldestTime) {
        oldestTime = cached.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log('🗑️ Entrada LRU eliminada:', {
        key: oldestKey,
        age: Date.now() - oldestTime + 'ms'
      });
    }
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanupExpired(): void {
    const startTime = performance.now();
    const now = Date.now();
    let removedCount = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, cached] of entries) {
      if (now - cached.timestamp > this.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    const cleanupTime = performance.now() - startTime;
    if (removedCount > 0) {
      console.log('🧹 Limpieza de caché completada:', {
        removedEntries: removedCount,
        remainingEntries: this.cache.size,
        cleanupTime: cleanupTime.toFixed(2) + 'ms'
      });
    }
  }

  /**
   * Inicia el timer de limpieza automática
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);
  }

  /**
   * Detiene el timer de limpieza automática
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('⏹️ Timer de limpieza de caché detenido');
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): CacheStats {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100) : 0;
    
    let oldestEntry = Date.now();
    let newestEntry = 0;
    let totalResponseTime = 0;
    
    const values = Array.from(this.cache.values());
    for (const cached of values) {
      if (cached.timestamp < oldestEntry) {
        oldestEntry = cached.timestamp;
      }
      if (cached.timestamp > newestEntry) {
        newestEntry = cached.timestamp;
      }
    }
    
    // Calcular tiempo promedio de respuesta (estimado como 0 para cache hits)
    const averageResponseTime = this.hitCount > 0 ? 0 : 2000; // 2s promedio para misses
    
    return {
      hitRate: parseFloat(hitRate.toFixed(1)),
      hits: this.hitCount,
      misses: this.missCount,
      totalSize: this.cache.size,
      averageResponseTime,
      oldestEntry: oldestEntry === Date.now() ? 0 : Date.now() - oldestEntry,
      newestEntry: newestEntry === 0 ? 0 : Date.now() - newestEntry
    };
  }

  /**
   * Verifica si un mensaje está en caché
   */
  has(message: string): boolean {
    const key = this.generateKey(message);
    const cached = this.cache.get(key);
    
    if (!cached) return false;
    
    // Verificar TTL
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    
    console.log('🗑️ Caché completamente limpiado:', {
      entriesRemoved: size
    });
  }

  /**
   * Obtiene el tamaño actual del caché
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Obtiene todas las claves del caché (para debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Precargar respuestas comunes
   */
  preloadCommonResponses(): void {
    const commonResponses = [
      {
        message: "hola",
        response: "¡Hola! ¿En qué puedo ayudarte hoy?"
      },
      {
        message: "como estas",
        response: "¡Estoy muy bien, gracias por preguntar! ¿Cómo puedo asistirte?"
      },
      {
        message: "que puedes hacer",
        response: "Puedo ayudarte con análisis de datos, generar código, crear contenido, responder preguntas y mucho más. ¿En qué te gustaría que te ayude?"
      },
      {
        message: "gracias",
        response: "¡De nada! Estoy aquí para ayudarte siempre que lo necesites."
      }
    ];

    commonResponses.forEach(({ message, response }) => {
      this.set(message, response);
    });

    console.log('📚 Respuestas comunes precargadas:', commonResponses.length);
  }

  /**
   * Destructor para limpieza
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    console.log('💥 ChatCache destruido');
  }
}

// Instancia singleton
export const chatCache = new ChatCache(100, 60); // 100 entradas, 60 minutos TTL

// Precargar respuestas comunes al inicializar
chatCache.preloadCommonResponses();
