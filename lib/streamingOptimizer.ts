/**
 * StreamingOptimizer - Utilidad para optimizar respuestas streaming del chatbot
 * Incluye respuesta optimista, indicadores de carga y métricas de streaming
 */

interface StreamingMetrics {
  messageId: string;
  startTime: number;
  firstChunkTime?: number;
  endTime?: number;
  totalChunks: number;
  totalCharacters: number;
  averageChunkSize: number;
  streamingDuration?: number;
  timeToFirstChunk?: number;
}

interface OptimisticMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  isLoading: boolean;
  isOptimistic: boolean;
  timestamp: number;
  chunks?: string[];
}

export class StreamingOptimizer {
  private metrics: StreamingMetrics[] = [];
  private optimisticMessages: Map<string, OptimisticMessage> = new Map();
  private streamingStates: Map<string, boolean> = new Map();

  constructor() {
    console.log('🚀 StreamingOptimizer inicializado');
  }

  /**
   * Crea un mensaje optimista mientras se espera la respuesta real
   */
  createOptimisticMessage(messageId: string, userMessage: string): OptimisticMessage {
    const optimisticMessage: OptimisticMessage = {
      id: messageId,
      role: 'assistant',
      content: this.generateOptimisticContent(userMessage),
      isLoading: true,
      isOptimistic: true,
      timestamp: Date.now(),
      chunks: []
    };

    this.optimisticMessages.set(messageId, optimisticMessage);
    
    console.log('🔮 Mensaje optimista creado:', {
      id: messageId,
      content: optimisticMessage.content.substring(0, 50) + '...'
    });

    return optimisticMessage;
  }

  /**
   * Genera contenido optimista basado en el mensaje del usuario
   */
  private generateOptimisticContent(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    // Respuestas optimistas contextuales
    if (message.includes('cuento') || message.includes('historia')) {
      return '📖 Creando un cuento especial para ti...';
    }
    
    if (message.includes('código') || message.includes('programar')) {
      return '💻 Generando código optimizado...';
    }
    
    if (message.includes('análisis') || message.includes('datos')) {
      return '📊 Analizando datos y preparando insights...';
    }
    
    if (message.includes('ayuda') || message.includes('cómo')) {
      return '🤔 Buscando la mejor solución para tu consulta...';
    }
    
    if (message.includes('explicar') || message.includes('qué es')) {
      return '📚 Preparando una explicación detallada...';
    }
    
    // Respuesta genérica
    return '🧠 Procesando tu mensaje y preparando respuesta...';
  }

  /**
   * Inicia el tracking de streaming para un mensaje
   */
  startStreamingTracking(messageId: string): void {
    const metrics: StreamingMetrics = {
      messageId,
      startTime: performance.now(),
      totalChunks: 0,
      totalCharacters: 0,
      averageChunkSize: 0
    };

    this.metrics.push(metrics);
    this.streamingStates.set(messageId, true);
    
    console.log('📡 Iniciando tracking de streaming:', messageId);
  }

  /**
   * Procesa un chunk de streaming recibido
   */
  processStreamingChunk(messageId: string, chunk: string): void {
    const metrics = this.metrics.find(m => m.messageId === messageId);
    if (!metrics) return;

    const now = performance.now();
    
    // Registrar primer chunk
    if (metrics.totalChunks === 0) {
      metrics.firstChunkTime = now;
      metrics.timeToFirstChunk = now - metrics.startTime;
      console.log('⚡ Primer chunk recibido:', {
        messageId,
        timeToFirstChunk: metrics.timeToFirstChunk.toFixed(2) + 'ms',
        chunkSize: chunk.length
      });
    }

    // Actualizar métricas
    metrics.totalChunks++;
    metrics.totalCharacters += chunk.length;
    metrics.averageChunkSize = metrics.totalCharacters / metrics.totalChunks;

    // Actualizar mensaje optimista si existe
    const optimisticMessage = this.optimisticMessages.get(messageId);
    if (optimisticMessage) {
      optimisticMessage.chunks = optimisticMessage.chunks || [];
      optimisticMessage.chunks.push(chunk);
      optimisticMessage.content = optimisticMessage.chunks.join('');
      optimisticMessage.isLoading = false; // Ya no está cargando, está streaming
    }

    console.log('📦 Chunk procesado:', {
      messageId,
      chunkNumber: metrics.totalChunks,
      chunkSize: chunk.length,
      totalCharacters: metrics.totalCharacters,
      avgChunkSize: metrics.averageChunkSize.toFixed(1)
    });
  }

  /**
   * Finaliza el tracking de streaming
   */
  finishStreamingTracking(messageId: string, finalContent?: string): void {
    const metrics = this.metrics.find(m => m.messageId === messageId);
    if (!metrics) return;

    const now = performance.now();
    metrics.endTime = now;
    metrics.streamingDuration = now - metrics.startTime;

    this.streamingStates.set(messageId, false);

    // Finalizar mensaje optimista
    const optimisticMessage = this.optimisticMessages.get(messageId);
    if (optimisticMessage) {
      optimisticMessage.isLoading = false;
      optimisticMessage.isOptimistic = false;
      if (finalContent) {
        optimisticMessage.content = finalContent;
      }
    }

    console.log('✅ Streaming completado:', {
      messageId,
      totalDuration: metrics.streamingDuration.toFixed(2) + 'ms',
      timeToFirstChunk: metrics.timeToFirstChunk?.toFixed(2) + 'ms',
      totalChunks: metrics.totalChunks,
      totalCharacters: metrics.totalCharacters,
      avgChunkSize: metrics.averageChunkSize.toFixed(1),
      charactersPerSecond: (metrics.totalCharacters / (metrics.streamingDuration / 1000)).toFixed(1)
    });
  }

  /**
   * Maneja errores en el streaming
   */
  handleStreamingError(messageId: string, error: Error): void {
    const metrics = this.metrics.find(m => m.messageId === messageId);
    if (metrics) {
      metrics.endTime = performance.now();
      metrics.streamingDuration = metrics.endTime - metrics.startTime;
    }

    this.streamingStates.set(messageId, false);

    // Actualizar mensaje optimista con error
    const optimisticMessage = this.optimisticMessages.get(messageId);
    if (optimisticMessage) {
      optimisticMessage.isLoading = false;
      optimisticMessage.isOptimistic = false;
      optimisticMessage.content = '❌ Error procesando mensaje. Intenta nuevamente.';
    }

    console.error('💥 Error en streaming:', {
      messageId,
      error: error.message,
      duration: metrics?.streamingDuration?.toFixed(2) + 'ms'
    });
  }

  /**
   * Obtiene el mensaje optimista por ID
   */
  getOptimisticMessage(messageId: string): OptimisticMessage | undefined {
    return this.optimisticMessages.get(messageId);
  }

  /**
   * Verifica si un mensaje está en streaming
   */
  isStreaming(messageId: string): boolean {
    return this.streamingStates.get(messageId) || false;
  }

  /**
   * Limpia mensaje optimista
   */
  clearOptimisticMessage(messageId: string): void {
    this.optimisticMessages.delete(messageId);
    this.streamingStates.delete(messageId);
    console.log('🧹 Mensaje optimista limpiado:', messageId);
  }

  /**
   * Obtiene estadísticas de streaming
   */
  getStreamingStats(): {
    totalMessages: number;
    averageStreamingTime: number;
    averageTimeToFirstChunk: number;
    averageCharactersPerSecond: number;
    recentMetrics: StreamingMetrics[];
  } {
    const completedMetrics = this.metrics.filter(m => m.streamingDuration !== undefined);
    const total = completedMetrics.length;

    if (total === 0) {
      return {
        totalMessages: 0,
        averageStreamingTime: 0,
        averageTimeToFirstChunk: 0,
        averageCharactersPerSecond: 0,
        recentMetrics: []
      };
    }

    const avgStreamingTime = completedMetrics.reduce((sum, m) => sum + (m.streamingDuration || 0), 0) / total;
    const avgTimeToFirstChunk = completedMetrics
      .filter(m => m.timeToFirstChunk !== undefined)
      .reduce((sum, m) => sum + (m.timeToFirstChunk || 0), 0) / total;
    
    const avgCharsPerSecond = completedMetrics.reduce((sum, m) => {
      const duration = (m.streamingDuration || 1) / 1000;
      return sum + (m.totalCharacters / duration);
    }, 0) / total;

    return {
      totalMessages: total,
      averageStreamingTime: avgStreamingTime,
      averageTimeToFirstChunk: avgTimeToFirstChunk,
      averageCharactersPerSecond: avgCharsPerSecond,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Limpia métricas antiguas
   */
  clearOldMetrics(): void {
    // Mantener solo las últimas 50 métricas
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    // Limpiar mensajes optimistas antiguos (más de 5 minutos)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const messagesToDelete: string[] = [];
    
    this.optimisticMessages.forEach((message, messageId) => {
      if (message.timestamp < fiveMinutesAgo) {
        messagesToDelete.push(messageId);
      }
    });
    
    messagesToDelete.forEach(messageId => {
      this.optimisticMessages.delete(messageId);
      this.streamingStates.delete(messageId);
    });

    console.log('🧹 Métricas antiguas limpiadas');
  }

  /**
   * Resetea todas las métricas
   */
  reset(): void {
    this.metrics = [];
    this.optimisticMessages.clear();
    this.streamingStates.clear();
    console.log('🔄 StreamingOptimizer reseteado');
  }
}

// Instancia singleton
export const streamingOptimizer = new StreamingOptimizer();
