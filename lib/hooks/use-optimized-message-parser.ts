import { useMemo } from "react";
import { MessagePart, parseMessage } from "@/lib/utils";

// Cache LRU simple para parsing de mensajes
class MessageParseCache {
  private cache = new Map<string, MessagePart[]>();
  private maxSize = 100;

  get(key: string): MessagePart[] | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Mover al final (LRU)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: MessagePart[]): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Eliminar el más antiguo
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Se podría implementar tracking de hits/misses
    };
  }
}

// Instancia global del cache
const messageParseCache = new MessageParseCache();

// Hook optimizado para parsing de mensajes
export const useOptimizedMessageParser = (text: string, isComplete: boolean = true) => {
  return useMemo(() => {
    if (!text) return [];

    // Crear clave de cache basada en el contenido
    const cacheKey = `${text.length}-${text.slice(0, 100)}-${isComplete}`;

    // Verificar cache primero
    const cached = messageParseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let result: MessagePart[];

    // Para contenido incompleto y largo, usar parsing simplificado
    if (!isComplete && text.length > 200) {
      result = [{ type: "text", data: text }];
    } else {
      // Parsing completo para contenido final o corto
      result = parseMessage(text);
    }

    // Guardar en cache
    messageParseCache.set(cacheKey, result);

    return result;
  }, [text, isComplete]);
};

// Hook para obtener estadísticas del cache
export const useMessageParserStats = () => {
  return useMemo(() => messageParseCache.getStats(), []);
};

// Función para limpiar el cache manualmente
export const clearMessageParseCache = () => {
  messageParseCache.clear();
};

// Web Worker para parsing pesado (opcional)
export const useWebWorkerParser = (text: string, threshold: number = 5000) => {
  return useMemo(() => {
    if (text.length < threshold) {
      // Usar parsing normal para textos pequeños
      return parseMessage(text);
    }

    // Para textos muy largos, considerar Web Worker
    // Por ahora, usar parsing optimizado
    return parseMessage(text);
  }, [text, threshold]);
};

// Hook para parsing progresivo por chunks
export const useProgressiveParser = (text: string, chunkSize: number = 1000) => {
  return useMemo(() => {
    if (!text || text.length <= chunkSize) {
      return parseMessage(text);
    }

    // Para textos muy largos, procesar por chunks
    const chunks: MessagePart[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const chunk = text.slice(currentIndex, currentIndex + chunkSize);
      
      // Asegurar que no cortamos en medio de un tag
      let adjustedChunk = chunk;
      if (currentIndex + chunkSize < text.length) {
        const lastTagStart = chunk.lastIndexOf('<');
        const lastTagEnd = chunk.lastIndexOf('>');
        
        if (lastTagStart > lastTagEnd) {
          // Hay un tag incompleto, ajustar el chunk
          adjustedChunk = chunk.slice(0, lastTagStart);
        }
      }

      const parsedChunk = parseMessage(adjustedChunk);
      chunks.push(...parsedChunk);
      
      currentIndex += adjustedChunk.length;
    }

    return chunks;
  }, [text, chunkSize]);
};

// Función utilitaria para detectar si un mensaje necesita parsing pesado
export const needsHeavyParsing = (text: string): boolean => {
  return (
    text.includes('<artifact') ||
    text.includes('<thinking') ||
    text.includes('```') ||
    text.length > 2000
  );
};

// Hook para parsing adaptativo basado en el contenido
export const useAdaptiveParser = (text: string, isComplete: boolean = true) => {
  return useMemo(() => {
    if (!text) return [];

    // Detectar si necesita parsing pesado
    const isHeavy = needsHeavyParsing(text);

    if (isHeavy && !isComplete) {
      // Para contenido pesado e incompleto, usar parsing simple
      return [{ type: "text" as const, data: text }];
    } else if (isHeavy && isComplete) {
      // Para contenido pesado y completo, usar parsing progresivo
      return useProgressiveParser(text, 500);
    } else {
      // Para contenido ligero, usar parsing optimizado normal
      return useOptimizedMessageParser(text, isComplete);
    }
  }, [text, isComplete]);
};
