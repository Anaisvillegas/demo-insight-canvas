/**
 * ChatOptimizer - Utilidad para optimizar requests del chatbot
 * Implementa debouncing, throttling y cola de requests
 */

interface QueuedRequest {
  message: string;
  callback: (message: string) => Promise<void>;
  timestamp: number;
}

export class ChatOptimizer {
  private debounceTimer: NodeJS.Timeout | null = null;
  private requestQueue: QueuedRequest[] = [];
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private readonly minInterval: number = 1000; // Mínimo 1 segundo entre requests

  constructor() {
    console.log('🚀 ChatOptimizer inicializado');
  }

  /**
   * Debounced send - Evita múltiples requests rápidos
   */
  debouncedSend(message: string, callback: (message: string) => Promise<void>, delay: number = 300): void {
    const startTime = performance.now();
    console.log('⏳ Debouncing mensaje:', message.substring(0, 50) + '...', 'delay:', delay + 'ms');
    
    // Limpiar timer anterior
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      console.log('🔄 Timer anterior cancelado');
    }
    
    this.debounceTimer = setTimeout(() => {
      const debounceTime = performance.now();
      console.log('✅ Debounce completado en:', ((debounceTime - startTime) / 1000).toFixed(3), 's');
      this.processMessage(message, callback);
    }, delay);
  }

  /**
   * Throttled send - Limita frecuencia de requests
   */
  throttledSend(message: string, callback: (message: string) => Promise<void>): void {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    console.log('🎛️ Throttling check - Tiempo desde último request:', timeSinceLastRequest + 'ms');
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      console.log('⏸️ Throttling activo - Esperando:', waitTime + 'ms');
      
      setTimeout(() => {
        this.processMessage(message, callback);
      }, waitTime);
    } else {
      console.log('✅ Throttling OK - Procesando inmediatamente');
      this.processMessage(message, callback);
    }
  }

  /**
   * Procesa mensaje con cola y prevención de duplicados
   */
  private async processMessage(message: string, callback: (message: string) => Promise<void>): Promise<void> {
    const processStartTime = performance.now();
    console.log('🔄 Iniciando procesamiento de mensaje');
    
    // Si ya está procesando, agregar a cola
    if (this.isProcessing) {
      console.log('⏳ Request en proceso, agregando a cola...');
      this.addToQueue(message, callback);
      return;
    }

    // Verificar duplicados en cola
    if (this.isDuplicateInQueue(message)) {
      console.log('🚫 Mensaje duplicado detectado, ignorando');
      return;
    }

    this.isProcessing = true;
    this.lastRequestTime = Date.now();
    
    try {
      console.log('🌐 Ejecutando callback del mensaje');
      const callbackStartTime = performance.now();
      
      await callback(message);
      
      const callbackTime = performance.now();
      console.log('✅ Callback completado en:', ((callbackTime - callbackStartTime) / 1000).toFixed(3), 's');
      
    } catch (error) {
      const errorTime = performance.now();
      console.error('❌ Error procesando mensaje:', error);
      console.log('⏰ Tiempo hasta error:', ((errorTime - processStartTime) / 1000).toFixed(3), 's');
    } finally {
      this.isProcessing = false;
      
      const totalTime = performance.now();
      console.log('🏁 Procesamiento total completado en:', ((totalTime - processStartTime) / 1000).toFixed(3), 's');
      
      // Procesar siguiente en cola
      this.processNextInQueue();
    }
  }

  /**
   * Agrega request a la cola
   */
  private addToQueue(message: string, callback: (message: string) => Promise<void>): void {
    const queueItem: QueuedRequest = {
      message,
      callback,
      timestamp: Date.now()
    };
    
    this.requestQueue.push(queueItem);
    console.log('📝 Mensaje agregado a cola. Total en cola:', this.requestQueue.length);
    
    // Limpiar cola si es muy antigua (más de 30 segundos)
    this.cleanOldRequests();
  }

  /**
   * Procesa el siguiente request en cola
   */
  private processNextInQueue(): void {
    if (this.requestQueue.length > 0) {
      console.log('🔄 Procesando siguiente en cola...');
      const { message, callback } = this.requestQueue.shift()!;
      
      // Pequeño delay para evitar spam
      setTimeout(() => {
        this.processMessage(message, callback);
      }, 100);
    } else {
      console.log('✅ Cola vacía - Listo para nuevos requests');
    }
  }

  /**
   * Verifica si hay duplicados en cola
   */
  private isDuplicateInQueue(message: string): boolean {
    const isDuplicate = this.requestQueue.some(item => item.message === message);
    if (isDuplicate) {
      console.log('🔍 Duplicado encontrado en cola para mensaje:', message.substring(0, 30) + '...');
    }
    return isDuplicate;
  }

  /**
   * Limpia requests antiguos de la cola
   */
  private cleanOldRequests(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 segundos
    const initialLength = this.requestQueue.length;
    
    this.requestQueue = this.requestQueue.filter(item => 
      now - item.timestamp < maxAge
    );
    
    const removedCount = initialLength - this.requestQueue.length;
    if (removedCount > 0) {
      console.log('🧹 Limpiados', removedCount, 'requests antiguos de la cola');
    }
  }

  /**
   * Cancela todos los requests pendientes
   */
  cancelPendingRequests(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      console.log('🚫 Timer de debounce cancelado');
    }
    
    const cancelledCount = this.requestQueue.length;
    this.requestQueue = [];
    
    if (cancelledCount > 0) {
      console.log('🚫 Cancelados', cancelledCount, 'requests pendientes');
    }
  }

  /**
   * Obtiene estadísticas del optimizador
   */
  getStats(): {
    isProcessing: boolean;
    queueLength: number;
    lastRequestTime: number;
    timeSinceLastRequest: number;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.requestQueue.length,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime
    };
  }

  /**
   * Resetea el optimizador
   */
  reset(): void {
    this.cancelPendingRequests();
    this.isProcessing = false;
    this.lastRequestTime = 0;
    console.log('🔄 ChatOptimizer reseteado');
  }
}

// Instancia singleton
export const chatOptimizer = new ChatOptimizer();
