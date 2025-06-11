/**
 * ArtifactOptimizer - Optimiza la detección y procesamiento de artefactos
 * Incluye regex pre-compilados, caché de parsing y métricas de performance
 */

interface ArtifactProcessingMetrics {
  messageId: string;
  startTime: number;
  endTime?: number;
  processingDuration?: number;
  artifactsFound: number;
  messageLength: number;
  parsingMethod: 'optimized' | 'legacy';
}

interface OptimizedArtifact {
  type: 'react' | 'html' | 'json' | 'code';
  code?: string;
  data?: any;
  id: string;
  language?: string;
  title?: string;
}

export class ArtifactOptimizer {
  private metrics: ArtifactProcessingMetrics[] = [];
  private parsingCache: Map<string, OptimizedArtifact[]> = new Map();
  
  // Pre-compilar regex para mejor performance
  private readonly artifactRegex = /```(?:jsx?|javascript|react)?\n([\s\S]*?)\n```/g;
  private readonly jsonRegex = /```json\n([\s\S]*?)\n```/g;
  private readonly htmlRegex = /```html\n([\s\S]*?)\n```/g;
  private readonly xmlArtifactRegex = /<artifact[^>]*>([\s\S]*?)<\/artifact>/g;
  private readonly codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;

  constructor() {
    console.log('🚀 ArtifactOptimizer inicializado con regex pre-compilados');
  }

  /**
   * Genera una clave de caché para el mensaje
   */
  private generateCacheKey(messageText: string): string {
    // Crear hash simple del contenido
    let hash = 0;
    for (let i = 0; i < messageText.length; i++) {
      const char = messageText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return `msg_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Procesa artefactos de forma optimizada
   */
  optimizeArtifactProcessing(responseText: string, messageId?: string): OptimizedArtifact[] {
    const startTime = performance.now();
    const msgId = messageId || `msg-${Date.now()}`;
    
    console.log('⚙️ Iniciando procesamiento optimizado de artefactos:', {
      messageId: msgId,
      messageLength: responseText.length
    });

    // Verificar caché primero
    const cacheKey = this.generateCacheKey(responseText);
    if (this.parsingCache.has(cacheKey)) {
      const cached = this.parsingCache.get(cacheKey)!;
      console.log('💾 Artefactos encontrados en caché:', {
        messageId: msgId,
        artifactsCount: cached.length,
        retrievalTime: (performance.now() - startTime).toFixed(2) + 'ms'
      });
      return cached;
    }

    const artifacts: OptimizedArtifact[] = [];
    let artifactCounter = 0;

    try {
      // 1. Buscar artefactos XML (formato específico del sistema)
      this.xmlArtifactRegex.lastIndex = 0;
      let match;
      while ((match = this.xmlArtifactRegex.exec(responseText)) !== null) {
        artifacts.push({
          type: 'react',
          code: match[1].trim(),
          id: `xml_artifact_${Date.now()}_${artifactCounter++}`,
          title: 'XML Artifact'
        });
      }

      // 2. Buscar bloques de código React/JavaScript
      this.artifactRegex.lastIndex = 0;
      while ((match = this.artifactRegex.exec(responseText)) !== null) {
        const code = match[1].trim();
        if (code.length > 10) { // Filtrar bloques muy pequeños
          artifacts.push({
            type: 'react',
            code: code,
            id: `react_artifact_${Date.now()}_${artifactCounter++}`,
            language: 'javascript',
            title: 'React Component'
          });
        }
      }

      // 3. Buscar artefactos JSON (para gráficos)
      this.jsonRegex.lastIndex = 0;
      while ((match = this.jsonRegex.exec(responseText)) !== null) {
        try {
          const jsonData = JSON.parse(match[1]);
          artifacts.push({
            type: 'json',
            data: jsonData,
            id: `json_artifact_${Date.now()}_${artifactCounter++}`,
            language: 'json',
            title: 'JSON Data'
          });
        } catch (e) {
          console.warn('⚠️ JSON inválido encontrado:', e);
        }
      }

      // 4. Buscar artefactos HTML
      this.htmlRegex.lastIndex = 0;
      while ((match = this.htmlRegex.exec(responseText)) !== null) {
        const htmlCode = match[1].trim();
        if (htmlCode.length > 10) {
          artifacts.push({
            type: 'html',
            code: htmlCode,
            id: `html_artifact_${Date.now()}_${artifactCounter++}`,
            language: 'html',
            title: 'HTML Content'
          });
        }
      }

      // 5. Buscar otros bloques de código
      this.codeBlockRegex.lastIndex = 0;
      while ((match = this.codeBlockRegex.exec(responseText)) !== null) {
        const language = match[1] || 'text';
        const code = match[2].trim();
        
        // Solo procesar si no es uno de los tipos ya procesados
        if (!['javascript', 'jsx', 'react', 'json', 'html'].includes(language) && code.length > 10) {
          artifacts.push({
            type: 'code',
            code: code,
            id: `code_artifact_${Date.now()}_${artifactCounter++}`,
            language: language,
            title: `${language.toUpperCase()} Code`
          });
        }
      }

      // Guardar en caché
      this.parsingCache.set(cacheKey, artifacts);

      // Limpiar caché si es muy grande
      if (this.parsingCache.size > 50) {
        const firstKey = this.parsingCache.keys().next().value;
        if (firstKey) {
          this.parsingCache.delete(firstKey);
        }
      }

    } catch (error) {
      console.error('❌ Error en procesamiento optimizado de artefactos:', error);
    }

    const endTime = performance.now();
    const processingDuration = endTime - startTime;

    // Registrar métricas
    const metrics: ArtifactProcessingMetrics = {
      messageId: msgId,
      startTime,
      endTime,
      processingDuration,
      artifactsFound: artifacts.length,
      messageLength: responseText.length,
      parsingMethod: 'optimized'
    };

    this.metrics.push(metrics);

    console.log('⚙️ Artefactos procesados:', {
      messageId: msgId,
      processingTime: (processingDuration / 1000).toFixed(3) + 's',
      artifactsFound: artifacts.length,
      messageLength: responseText.length,
      artifactsPerSecond: (artifacts.length / (processingDuration / 1000)).toFixed(1)
    });

    return artifacts;
  }

  /**
   * Detecta si un mensaje contiene artefactos potenciales (verificación rápida)
   */
  hasArtifacts(messageText: string): boolean {
    const quickCheckStart = performance.now();
    
    // Verificaciones rápidas sin regex complejo
    const hasCodeBlocks = messageText.includes('```');
    const hasXmlArtifacts = messageText.includes('<artifact');
    const hasReactKeywords = messageText.includes('import React') || 
                            messageText.includes('export default') ||
                            messageText.includes('function ') ||
                            messageText.includes('const ') && messageText.includes('=>');

    const result = hasCodeBlocks || hasXmlArtifacts || hasReactKeywords;
    
    console.log('🔍 Verificación rápida de artefactos:', {
      hasArtifacts: result,
      checkTime: (performance.now() - quickCheckStart).toFixed(2) + 'ms',
      indicators: {
        codeBlocks: hasCodeBlocks,
        xmlArtifacts: hasXmlArtifacts,
        reactKeywords: hasReactKeywords
      }
    });

    return result;
  }

  /**
   * Pre-procesa un mensaje para optimizar el parsing posterior
   */
  preprocessMessage(messageText: string): string {
    const startTime = performance.now();
    
    // Normalizar saltos de línea
    let processed = messageText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Limpiar espacios extra en bloques de código
    processed = processed.replace(/```(\w+)?\n\s*\n/g, '```$1\n');
    processed = processed.replace(/\n\s*\n```/g, '\n```');
    
    // Normalizar tags de artefactos
    processed = processed.replace(/<artifact\s+/g, '<artifact ');
    
    console.log('🔧 Mensaje pre-procesado:', {
      originalLength: messageText.length,
      processedLength: processed.length,
      processingTime: (performance.now() - startTime).toFixed(2) + 'ms'
    });

    return processed;
  }

  /**
   * Obtiene estadísticas de procesamiento
   */
  getProcessingStats(): {
    totalMessages: number;
    averageProcessingTime: number;
    totalArtifactsFound: number;
    averageArtifactsPerMessage: number;
    cacheHitRate: number;
    recentMetrics: ArtifactProcessingMetrics[];
  } {
    const total = this.metrics.length;
    
    if (total === 0) {
      return {
        totalMessages: 0,
        averageProcessingTime: 0,
        totalArtifactsFound: 0,
        averageArtifactsPerMessage: 0,
        cacheHitRate: 0,
        recentMetrics: []
      };
    }

    const avgProcessingTime = this.metrics.reduce((sum, m) => sum + (m.processingDuration || 0), 0) / total;
    const totalArtifacts = this.metrics.reduce((sum, m) => sum + m.artifactsFound, 0);
    const avgArtifactsPerMessage = totalArtifacts / total;
    const cacheHitRate = (this.parsingCache.size / total) * 100;

    return {
      totalMessages: total,
      averageProcessingTime: avgProcessingTime,
      totalArtifactsFound: totalArtifacts,
      averageArtifactsPerMessage: avgArtifactsPerMessage,
      cacheHitRate: cacheHitRate,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Limpia métricas y caché antiguos
   */
  cleanup(): void {
    // Mantener solo las últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Limpiar caché si es muy grande
    if (this.parsingCache.size > 50) {
      const keysToDelete = Array.from(this.parsingCache.keys()).slice(0, 25);
      keysToDelete.forEach(key => this.parsingCache.delete(key));
    }

    console.log('🧹 Limpieza de ArtifactOptimizer completada');
  }

  /**
   * Resetea todas las métricas y caché
   */
  reset(): void {
    this.metrics = [];
    this.parsingCache.clear();
    console.log('🔄 ArtifactOptimizer reseteado');
  }
}

// Instancia singleton
export const artifactOptimizer = new ArtifactOptimizer();
