/**
 * OptimizedArtifactRenderer.ts
 * 
 * Renderizador optimizado de artefactos basado en la implementación original
 * pero adaptado para TypeScript y el estilo del proyecto actual.
 * 
 * Características principales:
 * - Renderización optimizada con iframe aislado
 * - Detección automática de tipos de contenido
 * - Gestión de renders pendientes
 * - Comunicación segura via postMessage
 * - Compatibilidad con React 18 y Next.js 14
 */

// Importar solo si están disponibles, con fallbacks
let contentDetector: any = null;
let performanceMonitor: any = null;
let RENDERER_CONSTANTS: any = { MAX_RENDER_TIME: 10000 };
let MESSAGES: any = { ERRORS: { RENDER_TIMEOUT: 'Timeout de renderizado' } };

try {
  contentDetector = require('../../utils/renderer/contentDetector').contentDetector;
} catch (e) {
  console.warn('contentDetector no disponible, usando fallback');
}

try {
  performanceMonitor = require('../../utils/renderer/performanceMonitor').performanceMonitor;
} catch (e) {
  console.warn('performanceMonitor no disponible, usando fallback');
  performanceMonitor = {
    startMeasurement: () => {
      try {
        return null;
      } catch (error) {
        console.warn('Error en startMeasurement fallback:', error);
        return null;
      }
    },
    endMeasurement: () => {
      try {
        return null;
      } catch (error) {
        console.warn('Error en endMeasurement fallback:', error);
        return null;
      }
    }
  };
}

try {
  const constants = require('./constants');
  RENDERER_CONSTANTS = constants.RENDERER_CONSTANTS;
  MESSAGES = constants.MESSAGES;
} catch (e) {
  console.warn('constants no disponibles, usando fallback');
}

/**
 * Tipos de contenido soportados
 */
type ContentType = 'html' | 'react' | 'markdown' | 'python' | 'auto';

/**
 * Estructura de un render pendiente
 */
interface PendingRender {
  code: string;
  type: ContentType;
  timestamp: number;
  artifactId?: string;
}

/**
 * Datos de mensaje para renderizado
 */
interface RenderMessage {
  type: string;
  payload?: {
    code: string;
    type: ContentType;
    artifactId?: string;
  };
  error?: string;
  success?: boolean;
}

/**
 * Configuración del renderizador
 */
interface RendererConfig {
  frameUrl?: string;
  enablePerformanceMonitoring?: boolean;
  maxPendingRenders?: number;
  renderTimeout?: number;
}

/**
 * Clase principal del renderizador optimizado
 */
export class OptimizedArtifactRenderer {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private isInitialized: boolean = false;
  private pendingRenders: PendingRender[] = [];
  private config: RendererConfig;
  private performanceId: string | null = null;
  private renderTimeout: NodeJS.Timeout | null = null;
  private initializationTimeout: NodeJS.Timeout | null = null;
  private initializationAttempts: number = 0;
  private maxInitializationAttempts: number = 3;

  constructor(containerElement: HTMLElement, config: RendererConfig = {}) {
    this.container = containerElement;
    this.config = {
      frameUrl: '/renderer-frame.html',
      enablePerformanceMonitoring: true,
      maxPendingRenders: 10,
      renderTimeout: RENDERER_CONSTANTS.MAX_RENDER_TIME,
      ...config
    };
    
    this.init();
  }

  /**
   * Inicializa el renderizador
   */
  private init(): void {
    try {
      this.createIframe();
      this.setupMessageHandling();
      this.preloadRenderer();
    } catch (error) {
      console.error('Error inicializando OptimizedArtifactRenderer:', error);
    }
  }

  /**
   * Crea el iframe para renderizado
   */
  private createIframe(): void {
    this.iframe = document.createElement('iframe');
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
      border-radius: 8px;
    `;
    
    // Configurar sandbox para seguridad (sin allow-same-origin para evitar escape)
    this.iframe.sandbox.add(
      'allow-scripts',
      'allow-forms'
    );
    
    this.iframe.src = this.config.frameUrl || '/renderer-frame.html';
    this.container.appendChild(this.iframe);
  }

  /**
   * Configura el manejo de mensajes
   */
  private setupMessageHandling(): void {
    window.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
      if (!this.iframe || event.source !== this.iframe.contentWindow) return;
      
      switch (event.data.type) {
        case 'RENDERER_READY':
          this.handleRendererReady();
          break;
        case 'RENDER_COMPLETE':
          this.handleRenderComplete(event.data);
          break;
        case 'RENDER_ERROR':
          this.handleRenderError(event.data);
          break;
        default:
          console.warn('Mensaje desconocido del renderer:', event.data.type);
      }
    });
  }

  /**
   * Precarga el renderizador
   */
  private preloadRenderer(): void {
    // El iframe se carga automáticamente y enviará RENDERER_READY cuando esté listo
    
    // Configurar timeout para la inicialización con límite de intentos
    this.initializationTimeout = setTimeout(() => {
      if (!this.isInitialized) {
        console.warn('Renderer no se inicializó en el tiempo esperado');
        this.handleInitializationTimeout();
      }
    }, this.config.renderTimeout || 10000);
  }

  /**
   * Renderiza un artefacto
   */
  public renderArtifact(code: string, type: ContentType = 'auto', artifactId?: string): void {
    try {
      // Iniciar monitoreo de rendimiento
      if (this.config.enablePerformanceMonitoring && performanceMonitor) {
        try {
          this.performanceId = performanceMonitor.startMeasurement('artifact-render', {
            type,
            codeLength: code.length,
            artifactId
          });
        } catch (error) {
          console.warn('Error iniciando monitoreo de rendimiento:', error);
          this.performanceId = null;
        }
      }

      const detectedType = type === 'auto' ? this.detectContentType(code) : type;
      
      if (!this.isInitialized) {
        this.addPendingRender(code, detectedType, artifactId);
        return;
      }

      this.sendRenderMessage(code, detectedType, artifactId);
      
    } catch (error) {
      console.error('Error renderizando artefacto:', error);
      this.handleRenderError({ 
        type: 'RENDER_ERROR', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  }

  /**
   * Detecta el tipo de contenido
   */
  private detectContentType(code: string): ContentType {
    try {
      // Usar el detector de contenido avanzado si está disponible
      if (contentDetector && contentDetector.analyze) {
        const detection = contentDetector.analyze(code);
        
        // Mapear tipos del detector a tipos del renderizador
        switch ((detection as any).type) {
          case 'html':
            return 'html';
          case 'react':
            return 'react';
          case 'markdown':
            return 'markdown';
          case 'javascript':
            // Verificar si es Python basado en sintaxis
            if (code.includes('def ') && code.includes(':')) {
              return 'python';
            }
            return 'react'; // Por defecto para JavaScript
          default:
            return this.fallbackDetection(code);
        }
      } else {
        return this.fallbackDetection(code);
      }
    } catch (error) {
      console.warn('Error en detección avanzada, usando fallback:', error);
      return this.fallbackDetection(code);
    }
  }

  /**
   * Detección de contenido de respaldo (implementación original)
   */
  private fallbackDetection(code: string): ContentType {
    const trimmedCode = code.trim();
    
    if (trimmedCode.startsWith('<!DOCTYPE html>')) return 'html';
    if (code.includes('import React') || code.includes('export default')) return 'react';
    if (trimmedCode.startsWith('# ') || code.includes('\n# ')) return 'markdown';
    if (code.includes('def ') && code.includes(':')) return 'python';
    
    return 'react'; // default
  }

  /**
   * Agrega un render a la cola de pendientes
   */
  private addPendingRender(code: string, type: ContentType, artifactId?: string): void {
    const pendingRender: PendingRender = {
      code,
      type,
      timestamp: Date.now(),
      artifactId
    };

    this.pendingRenders.push(pendingRender);
    
    // Limitar el número de renders pendientes
    if (this.pendingRenders.length > (this.config.maxPendingRenders || 10)) {
      this.pendingRenders.shift(); // Remover el más antiguo
    }

    console.log(`Render agregado a cola pendiente. Total: ${this.pendingRenders.length}`);
  }

  /**
   * Envía mensaje de renderizado al iframe
   */
  private sendRenderMessage(code: string, type: ContentType, artifactId?: string): void {
    if (!this.iframe?.contentWindow) {
      throw new Error('Iframe no disponible para enviar mensaje');
    }

    // Configurar timeout para el render
    this.setRenderTimeout();

    const message: RenderMessage = {
      type: 'RENDER_ARTIFACT',
      payload: { code, type, artifactId }
    };

    this.iframe.contentWindow.postMessage(message, '*');
  }

  /**
   * Configura timeout para el renderizado
   */
  private setRenderTimeout(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = setTimeout(() => {
      this.handleRenderError({
        type: 'RENDER_ERROR',
        error: MESSAGES.ERRORS.RENDER_TIMEOUT
      });
    }, this.config.renderTimeout || 10000);
  }

  /**
   * Limpia el timeout de renderizado
   */
  private clearRenderTimeout(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
  }

  /**
   * Maneja cuando el renderizador está listo
   */
  private handleRendererReady(): void {
    console.log('Renderer inicializado y listo');
    this.isInitialized = true;
    
    // Procesar renders pendientes
    this.processPendingRenders();
  }

  /**
   * Procesa todos los renders pendientes
   */
  private processPendingRenders(): void {
    if (this.pendingRenders.length === 0) return;

    console.log(`Procesando ${this.pendingRenders.length} renders pendientes`);
    
    // Procesar solo el más reciente para evitar sobrecarga
    const latestRender = this.pendingRenders[this.pendingRenders.length - 1];
    this.pendingRenders = []; // Limpiar cola
    
    this.sendRenderMessage(latestRender.code, latestRender.type, latestRender.artifactId);
  }

  /**
   * Maneja la finalización exitosa del renderizado
   */
  private handleRenderComplete(data: RenderMessage): void {
    console.log('Render completado exitosamente');
    
    this.clearRenderTimeout();
    
    // Finalizar monitoreo de rendimiento
    if (this.performanceId && this.config.enablePerformanceMonitoring && performanceMonitor) {
      try {
        performanceMonitor.endMeasurement(this.performanceId);
      } catch (error) {
        console.warn('Error finalizando monitoreo de rendimiento:', error);
      }
      this.performanceId = null;
    }

    // Emitir evento personalizado para notificar al componente padre
    this.container.dispatchEvent(new CustomEvent('renderComplete', {
      detail: { success: true, data }
    }));
  }

  /**
   * Maneja errores de renderizado
   */
  private handleRenderError(data: RenderMessage): void {
    console.error('Error en renderizado:', data.error);
    
    this.clearRenderTimeout();
    
    // Finalizar monitoreo de rendimiento con error
    if (this.performanceId && this.config.enablePerformanceMonitoring && performanceMonitor) {
      try {
        performanceMonitor.endMeasurement(this.performanceId);
      } catch (error) {
        console.warn('Error finalizando monitoreo de rendimiento con error:', error);
      }
      this.performanceId = null;
    }

    // Emitir evento de error
    this.container.dispatchEvent(new CustomEvent('renderError', {
      detail: { error: data.error, data }
    }));
  }

  /**
   * Maneja timeout de inicialización
   */
  private handleInitializationTimeout(): void {
    try {
      this.initializationAttempts++;
      console.error(`Timeout de inicialización del renderer (intento ${this.initializationAttempts}/${this.maxInitializationAttempts})`);
      
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        // Intentar reinicializar solo si no hemos excedido el límite
        console.log('Reintentando inicialización...');
        this.cleanup();
        setTimeout(() => {
          try {
            this.init();
          } catch (error) {
            console.error('Error en reinicialización:', error);
          }
        }, 2000 * this.initializationAttempts); // Aumentar delay progresivamente
      } else {
        // Excedido el límite de intentos, marcar como inicializado para evitar más intentos
        console.error('Máximo número de intentos de inicialización alcanzado. Marcando como inicializado para continuar.');
        this.isInitialized = true;
        
        // Emitir evento de error para notificar al componente padre
        try {
          this.container.dispatchEvent(new CustomEvent('renderError', {
            detail: { 
              error: 'No se pudo inicializar el renderer después de múltiples intentos',
              data: { type: 'INITIALIZATION_FAILED' }
            }
          }));
        } catch (eventError) {
          console.error('Error emitiendo evento de error:', eventError);
        }
      }
    } catch (error) {
      console.error('Error en handleInitializationTimeout:', error);
      // Como último recurso, marcar como inicializado para evitar bucles
      this.isInitialized = true;
    }
  }

  /**
   * Limpia recursos del renderizador
   */
  public cleanup(): void {
    this.clearRenderTimeout();
    
    // Limpiar timeout de inicialización
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }
    
    if (this.iframe) {
      this.container.removeChild(this.iframe);
      this.iframe = null;
    }
    
    this.isInitialized = false;
    this.pendingRenders = [];
    
    if (this.performanceId && this.config.enablePerformanceMonitoring && performanceMonitor) {
      try {
        performanceMonitor.endMeasurement(this.performanceId);
      } catch (error) {
        console.warn('Error finalizando monitoreo de rendimiento en cleanup:', error);
      }
      this.performanceId = null;
    }
  }

  /**
   * Obtiene el estado actual del renderizador
   */
  public getStatus(): {
    isInitialized: boolean;
    pendingRenders: number;
    hasIframe: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      pendingRenders: this.pendingRenders.length,
      hasIframe: this.iframe !== null
    };
  }

  /**
   * Reinicia el renderizador
   */
  public restart(): void {
    try {
      console.log('Reiniciando renderer...');
      this.cleanup();
      this.init();
    } catch (error) {
      console.error('Error reiniciando renderer:', error);
      // Como último recurso, marcar como inicializado para evitar bucles
      this.isInitialized = true;
    }
  }
}

export default OptimizedArtifactRenderer;
