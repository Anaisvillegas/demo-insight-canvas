/**
 * RendererManager.js
 * 
 * Gestor central del sistema de renderizado optimizado. Coordina la creación,
 * gestión y limpieza de instancias de renderizado, maneja la comunicación
 * con frames aislados y optimiza el rendimiento general del sistema.
 * 
 * Características:
 * - Gestión de ciclo de vida de renderizadores
 * - Pool de frames reutilizables
 * - Comunicación segura via postMessage
 * - Gestión de memoria y limpieza automática
 * - Monitoreo de rendimiento integrado
 */

import { performanceMonitor } from '../../utils/renderer/performanceMonitor';
import { cacheManager } from '../../utils/renderer/cacheManager';
import { RENDERER_CONSTANTS } from './constants';

/**
 * Gestor principal del sistema de renderizado
 */
export class RendererManager {
  constructor(config = {}) {
    this.config = {
      maxFrames: 5,
      frameTimeout: 30000,
      enableCache: true,
      enablePerformanceMonitoring: true,
      securityLevel: 'medium',
      ...config
    };
    
    this.frames = new Map(); // frameId -> frameInstance
    this.activeRenders = new Map(); // renderId -> renderContext
    this.framePool = [];
    this.messageHandlers = new Map();
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Inicializa el manager
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Configurar handlers de mensajes
      this.setupMessageHandlers();
      
      // Pre-crear frames si está configurado
      if (this.config.preCreateFrames) {
        await this.preCreateFrames();
      }
      
      this.isInitialized = true;
      console.log('RendererManager inicializado correctamente');
      
    } catch (error) {
      console.error('Error inicializando RendererManager:', error);
      throw error;
    }
  }

  /**
   * Configura los handlers de mensajes
   */
  setupMessageHandlers() {
    this.messageHandlers.set('FRAME_READY', this.handleFrameReady.bind(this));
    this.messageHandlers.set('FRAME_ERROR', this.handleFrameError.bind(this));
    this.messageHandlers.set('RENDER_COMPLETE', this.handleRenderComplete.bind(this));
    
    // Listener global para mensajes de frames
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * Maneja mensajes de los frames
   */
  handleMessage(event) {
    try {
      const { type, payload, frameId, renderId } = event.data;
      
      if (this.messageHandlers.has(type)) {
        const handler = this.messageHandlers.get(type);
        handler(payload, frameId, renderId, event);
      }
    } catch (error) {
      console.error('Error manejando mensaje de frame:', error);
    }
  }

  /**
   * Maneja cuando un frame está listo
   */
  handleFrameReady(payload, frameId) {
    const frame = this.frames.get(frameId);
    if (frame) {
      frame.isReady = true;
      frame.readyTime = Date.now();
      
      // Mover al pool si no está en uso
      if (!frame.inUse) {
        this.framePool.push(frame);
      }
    }
  }

  /**
   * Maneja errores de frames
   */
  handleFrameError(payload, frameId, renderId) {
    console.error(`Error en frame ${frameId}:`, payload);
    
    const render = this.activeRenders.get(renderId);
    if (render && render.onError) {
      render.onError(new Error(payload.message));
    }
    
    // Limpiar render activo
    this.cleanupRender(renderId);
  }

  /**
   * Maneja completación de renderizado
   */
  handleRenderComplete(payload, frameId, renderId) {
    const render = this.activeRenders.get(renderId);
    if (render) {
      // Finalizar monitoreo de rendimiento
      if (render.performanceId) {
        performanceMonitor.endMeasurement(render.performanceId);
      }
      
      // Callback de éxito
      if (render.onSuccess) {
        render.onSuccess(payload);
      }
      
      // Limpiar render activo
      this.cleanupRender(renderId);
    }
  }

  /**
   * Crea un nuevo frame
   */
  async createFrame() {
    const frameId = `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    
    // Configurar src del frame
    const frameUrl = this.getFrameUrl();
    iframe.src = frameUrl;
    
    document.body.appendChild(iframe);
    
    const frame = {
      id: frameId,
      element: iframe,
      isReady: false,
      inUse: false,
      createdAt: Date.now(),
      lastUsed: null
    };
    
    this.frames.set(frameId, frame);
    
    // Esperar a que el frame esté listo
    await this.waitForFrameReady(frameId);
    
    return frame;
  }

  /**
   * Obtiene la URL del frame
   */
  getFrameUrl() {
    // En desarrollo, usar ruta relativa
    if (process.env.NODE_ENV === 'development') {
      return '/renderer-frame.html';
    }
    
    // En producción, usar URL configurada o construir blob URL
    return this.config.frameUrl || this.createBlobFrameUrl();
  }

  /**
   * Crea una URL blob para el frame (fallback)
   */
  createBlobFrameUrl() {
    // Aquí se incluiría el contenido del frame HTML
    // Por ahora retornamos una URL placeholder
    return 'data:text/html;base64,' + btoa(`
      <!DOCTYPE html>
      <html>
        <head><title>Renderer Frame</title></head>
        <body>
          <div id="renderer-root">Frame placeholder</div>
          <script>
            window.parent.postMessage({type: 'FRAME_READY', frameId: '${Date.now()}'}, '*');
          </script>
        </body>
      </html>
    `);
  }

  /**
   * Espera a que un frame esté listo
   */
  async waitForFrameReady(frameId, timeout = this.config.frameTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const frame = this.frames.get(frameId);
        
        if (frame && frame.isReady) {
          resolve(frame);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Frame ${frameId} timeout`));
          return;
        }
        
        setTimeout(checkReady, 100);
      };
      
      checkReady();
    });
  }

  /**
   * Obtiene un frame disponible del pool o crea uno nuevo
   */
  async getAvailableFrame() {
    // Buscar frame disponible en el pool
    let frame = this.framePool.pop();
    
    if (!frame) {
      // Crear nuevo frame si no hay disponibles
      frame = await this.createFrame();
    }
    
    frame.inUse = true;
    frame.lastUsed = Date.now();
    
    return frame;
  }

  /**
   * Libera un frame de vuelta al pool
   */
  releaseFrame(frameId) {
    const frame = this.frames.get(frameId);
    if (frame) {
      frame.inUse = false;
      
      // Agregar de vuelta al pool si no está lleno
      if (this.framePool.length < this.config.maxFrames) {
        this.framePool.push(frame);
      } else {
        // Destruir frame si el pool está lleno
        this.destroyFrame(frameId);
      }
    }
  }

  /**
   * Destruye un frame
   */
  destroyFrame(frameId) {
    const frame = this.frames.get(frameId);
    if (frame) {
      if (frame.element && frame.element.parentNode) {
        frame.element.parentNode.removeChild(frame.element);
      }
      this.frames.delete(frameId);
    }
  }

  /**
   * Renderiza contenido
   */
  async render({ content, type = 'html', container, onSuccess, onError }) {
    const renderId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Verificar cache si está habilitado
      if (this.config.enableCache) {
        const cached = cacheManager.get(content);
        if (cached) {
          onSuccess?.(cached);
          return cached;
        }
      }
      
      // Iniciar monitoreo de rendimiento
      let performanceId = null;
      if (this.config.enablePerformanceMonitoring) {
        performanceId = performanceMonitor.startMeasurement(`render-${type}`);
      }
      
      // Obtener frame disponible
      const frame = await this.getAvailableFrame();
      
      // Registrar render activo
      this.activeRenders.set(renderId, {
        frameId: frame.id,
        content,
        type,
        container,
        onSuccess,
        onError,
        performanceId,
        startTime: Date.now()
      });
      
      // Enviar contenido al frame para renderizar
      this.sendToFrame(frame.id, 'RENDER_CONTENT', {
        content,
        type,
        renderId
      });
      
      return renderId;
      
    } catch (error) {
      console.error('Error en render:', error);
      onError?.(error);
      throw error;
    }
  }

  /**
   * Envía mensaje a un frame específico
   */
  sendToFrame(frameId, type, payload) {
    const frame = this.frames.get(frameId);
    if (frame && frame.element && frame.element.contentWindow) {
      frame.element.contentWindow.postMessage({
        type,
        payload,
        frameId,
        timestamp: Date.now()
      }, '*');
    }
  }

  /**
   * Limpia un render activo
   */
  cleanupRender(renderId) {
    const render = this.activeRenders.get(renderId);
    if (render) {
      // Liberar frame
      this.releaseFrame(render.frameId);
      
      // Remover de renders activos
      this.activeRenders.delete(renderId);
    }
  }

  /**
   * Limpieza general del manager
   */
  cleanup() {
    // Limpiar todos los renders activos
    for (const renderId of this.activeRenders.keys()) {
      this.cleanupRender(renderId);
    }
    
    // Destruir todos los frames
    for (const frameId of this.frames.keys()) {
      this.destroyFrame(frameId);
    }
    
    // Limpiar pools y maps
    this.framePool.length = 0;
    this.frames.clear();
    this.activeRenders.clear();
    
    // Remover listener de mensajes
    window.removeEventListener('message', this.handleMessage.bind(this));
    
    this.isInitialized = false;
  }

  /**
   * Obtiene estadísticas del manager
   */
  getStats() {
    return {
      totalFrames: this.frames.size,
      availableFrames: this.framePool.length,
      activeRenders: this.activeRenders.size,
      isInitialized: this.isInitialized
    };
  }
}

export default RendererManager;
