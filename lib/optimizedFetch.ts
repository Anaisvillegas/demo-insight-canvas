/**
 * OptimizedFetch - Utilidad para optimizar peticiones HTTP
 * Incluye timeout, headers optimizados, manejo de errores y métricas
 */

interface OptimizedFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface FetchMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status?: number;
  success: boolean;
  error?: string;
  retryCount: number;
}

class OptimizedFetchManager {
  private metrics: FetchMetrics[] = [];
  private readonly defaultTimeout = 10000; // 10 segundos
  private readonly defaultRetries = 2;
  private readonly defaultRetryDelay = 1000; // 1 segundo

  constructor() {
    console.log('🚀 OptimizedFetch inicializado');
  }

  /**
   * Fetch optimizado con timeout, reintentos y métricas
   */
  async optimizedFetch(url: string, options: OptimizedFetchOptions = {}): Promise<Response> {
    const startTime = performance.now();
    const method = options.method || 'GET';
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.retries || this.defaultRetries;
    const retryDelay = options.retryDelay || this.defaultRetryDelay;

    console.log('🌐 INICIANDO FETCH OPTIMIZADO:', {
      url,
      method,
      timeout: timeout + 'ms',
      maxRetries
    });

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.performFetch(url, options, timeout, attempt);
        
        // Registrar métricas exitosas
        this.recordMetrics({
          url,
          method,
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime,
          status: response.status,
          success: true,
          retryCount: attempt
        });

        console.log('✅ FETCH EXITOSO:', {
          url,
          status: response.status,
          duration: (performance.now() - startTime).toFixed(2) + 'ms',
          retryCount: attempt
        });

        return response;

      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        console.log('❌ FETCH FALLÓ (intento ' + (attempt + 1) + '/' + (maxRetries + 1) + '):', {
          url,
          error: lastError.message,
          duration: (performance.now() - startTime).toFixed(2) + 'ms'
        });

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
          const waitTime = retryDelay * Math.pow(2, attempt); // Backoff exponencial
          console.log('⏳ Esperando ' + waitTime + 'ms antes del siguiente intento...');
          await this.delay(waitTime);
        }
      }
    }

    // Registrar métricas de error
    this.recordMetrics({
      url,
      method,
      startTime,
      endTime: performance.now(),
      duration: performance.now() - startTime,
      success: false,
      error: lastError?.message || 'Error desconocido',
      retryCount
    });

    console.error('💥 FETCH FALLÓ DESPUÉS DE TODOS LOS INTENTOS:', {
      url,
      totalAttempts: maxRetries + 1,
      finalError: lastError?.message,
      totalDuration: (performance.now() - startTime).toFixed(2) + 'ms'
    });

    throw lastError;
  }

  /**
   * Realiza la petición fetch con timeout
   */
  private async performFetch(
    url: string, 
    options: OptimizedFetchOptions, 
    timeout: number,
    attempt: number
  ): Promise<Response> {
    const controller = new AbortController();
    
    // Configurar timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏰ TIMEOUT en intento ' + (attempt + 1) + ' después de ' + timeout + 'ms');
    }, timeout);

    try {
      // Headers optimizados
      const optimizedOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'User-Agent': 'OptimizedFetch/1.0',
          ...options.headers
        }
      };

      console.log('📡 Enviando request (intento ' + (attempt + 1) + '):', {
        url,
        method: optimizedOptions.method || 'GET',
        headers: optimizedOptions.headers
      });

      const response = await fetch(url, optimizedOptions);
      clearTimeout(timeoutId);

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('📨 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout después de ${timeout}ms`);
        }
        throw error;
      }
      
      throw new Error('Error desconocido en fetch');
    }
  }

  /**
   * Delay helper para reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Registra métricas de performance
   */
  private recordMetrics(metrics: FetchMetrics): void {
    this.metrics.push(metrics);
    
    // Mantener solo las últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    console.log('📊 MÉTRICAS REGISTRADAS:', {
      url: metrics.url,
      duration: metrics.duration.toFixed(2) + 'ms',
      success: metrics.success,
      retryCount: metrics.retryCount,
      totalMetrics: this.metrics.length
    });
  }

  /**
   * Obtiene estadísticas de performance
   */
  getStats(): {
    totalRequests: number;
    successRate: number;
    averageDuration: number;
    recentRequests: FetchMetrics[];
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const avgDuration = total > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;

    return {
      totalRequests: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: avgDuration,
      recentRequests: this.metrics.slice(-10) // Últimas 10 requests
    };
  }

  /**
   * Limpia las métricas
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('🧹 Métricas de fetch limpiadas');
  }

  /**
   * Fetch optimizado para JSON con parsing automático
   */
  async fetchJSON<T = any>(url: string, options: OptimizedFetchOptions = {}): Promise<T> {
    const response = await this.optimizedFetch(url, options);
    
    try {
      const data = await response.json();
      console.log('📄 JSON parseado exitosamente:', {
        url,
        dataType: typeof data,
        hasData: !!data
      });
      return data;
    } catch (error) {
      console.error('❌ Error parseando JSON:', error);
      throw new Error('Error parseando respuesta JSON: ' + (error as Error).message);
    }
  }
}

// Instancia singleton
export const optimizedFetchManager = new OptimizedFetchManager();

// Export de la función principal para uso directo
export const optimizedFetch = optimizedFetchManager.optimizedFetch.bind(optimizedFetchManager);
export const fetchJSON = optimizedFetchManager.fetchJSON.bind(optimizedFetchManager);
