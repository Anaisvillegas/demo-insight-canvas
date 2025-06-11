/**
 * ResourcePreloader - Sistema de pre-loading y lazy loading para recursos del chatbot
 * Incluye pre-carga de librerías, lazy loading de componentes y métricas de carga
 */

interface PreloadMetrics {
  url: string;
  startTime: number;
  endTime?: number;
  loadDuration?: number;
  success: boolean;
  error?: string;
  resourceType: 'script' | 'style' | 'module';
}

interface LazyLoadMetrics {
  componentName: string;
  startTime: number;
  endTime?: number;
  loadDuration?: number;
  success: boolean;
  error?: string;
}

export class ResourcePreloader {
  private preloadMetrics: PreloadMetrics[] = [];
  private lazyLoadMetrics: LazyLoadMetrics[] = [];
  private preloadedResources: Set<string> = new Set();
  private lazyLoadedComponents: Map<string, any> = new Map();

  // Recursos comunes para pre-cargar
  private readonly commonLibraries = [
    {
      url: 'https://unpkg.com/react@18/umd/react.production.min.js',
      type: 'script' as const,
      priority: 'high'
    },
    {
      url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
      type: 'script' as const,
      priority: 'high'
    },
    {
      url: 'https://unpkg.com/recharts@2.1.9/umd/Recharts.js',
      type: 'script' as const,
      priority: 'medium'
    },
    {
      url: 'https://unpkg.com/lodash@4.17.21/lodash.min.js',
      type: 'script' as const,
      priority: 'low'
    },
    {
      url: 'https://unpkg.com/d3@7.8.5/dist/d3.min.js',
      type: 'script' as const,
      priority: 'low'
    }
  ];

  constructor() {
    console.log('🚀 ResourcePreloader inicializado');
  }

  /**
   * Pre-carga recursos comunes del sistema
   */
  async preloadCommonResources(): Promise<void> {
    const startTime = performance.now();
    console.log('📦 Iniciando pre-carga de recursos comunes...');

    // Agrupar por prioridad
    const highPriority = this.commonLibraries.filter(lib => lib.priority === 'high');
    const mediumPriority = this.commonLibraries.filter(lib => lib.priority === 'medium');
    const lowPriority = this.commonLibraries.filter(lib => lib.priority === 'low');

    try {
      // Cargar recursos de alta prioridad primero (en paralelo)
      await Promise.all(highPriority.map(lib => this.preloadResource(lib.url, lib.type)));
      console.log('✅ Recursos de alta prioridad cargados');

      // Cargar recursos de prioridad media
      await Promise.all(mediumPriority.map(lib => this.preloadResource(lib.url, lib.type)));
      console.log('✅ Recursos de prioridad media cargados');

      // Cargar recursos de baja prioridad (sin bloquear)
      Promise.all(lowPriority.map(lib => this.preloadResource(lib.url, lib.type)))
        .then(() => console.log('✅ Recursos de baja prioridad cargados'))
        .catch(error => console.warn('⚠️ Algunos recursos de baja prioridad fallaron:', error));

    } catch (error) {
      console.error('❌ Error en pre-carga de recursos:', error);
    }

    const totalTime = performance.now() - startTime;
    console.log('📦 Pre-carga completada:', (totalTime / 1000).toFixed(3) + 's');
  }

  /**
   * Pre-carga un recurso específico
   */
  private async preloadResource(url: string, type: 'script' | 'style' | 'module'): Promise<void> {
    const startTime = performance.now();
    
    // Verificar si ya está pre-cargado
    if (this.preloadedResources.has(url)) {
      console.log('💾 Recurso ya pre-cargado:', url);
      return;
    }

    const metrics: PreloadMetrics = {
      url,
      startTime,
      success: false,
      resourceType: type
    };

    try {
      console.log('📡 Pre-cargando recurso:', { url, type });

      if (type === 'script') {
        await this.preloadScript(url);
      } else if (type === 'style') {
        await this.preloadStyle(url);
      } else if (type === 'module') {
        await this.preloadModule(url);
      }

      metrics.success = true;
      this.preloadedResources.add(url);
      
    } catch (error) {
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : String(error);
      console.error('❌ Error pre-cargando recurso:', url, error);
    } finally {
      metrics.endTime = performance.now();
      metrics.loadDuration = metrics.endTime - metrics.startTime;
      this.preloadMetrics.push(metrics);
      
      console.log('📊 Recurso procesado:', {
        url: url.split('/').pop(),
        success: metrics.success,
        duration: metrics.loadDuration?.toFixed(2) + 'ms'
      });
    }
  }

  /**
   * Pre-carga un script
   */
  private preloadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si el script ya existe
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      // Crear link de preload
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = url;
      preloadLink.as = 'script';
      preloadLink.crossOrigin = 'anonymous';
      
      preloadLink.onload = () => resolve();
      preloadLink.onerror = () => reject(new Error(`Failed to preload script: ${url}`));
      
      document.head.appendChild(preloadLink);
    });
  }

  /**
   * Pre-carga un stylesheet
   */
  private preloadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingLink = document.querySelector(`link[href="${url}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = url;
      preloadLink.as = 'style';
      preloadLink.crossOrigin = 'anonymous';
      
      preloadLink.onload = () => resolve();
      preloadLink.onerror = () => reject(new Error(`Failed to preload style: ${url}`));
      
      document.head.appendChild(preloadLink);
    });
  }

  /**
   * Pre-carga un módulo ES6
   */
  private preloadModule(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'modulepreload';
      preloadLink.href = url;
      preloadLink.crossOrigin = 'anonymous';
      
      preloadLink.onload = () => resolve();
      preloadLink.onerror = () => reject(new Error(`Failed to preload module: ${url}`));
      
      document.head.appendChild(preloadLink);
    });
  }

  /**
   * Lazy loading de componentes pesados
   */
  async lazyLoadComponent<T>(
    componentName: string, 
    importFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    console.log('🔄 Iniciando lazy loading:', componentName);

    // Verificar si ya está cargado
    if (this.lazyLoadedComponents.has(componentName)) {
      const cached = this.lazyLoadedComponents.get(componentName);
      console.log('💾 Componente ya cargado desde caché:', componentName);
      return cached;
    }

    const metrics: LazyLoadMetrics = {
      componentName,
      startTime,
      success: false
    };

    try {
      const component = await importFunction();
      
      // Cachear el componente
      this.lazyLoadedComponents.set(componentName, component);
      
      metrics.success = true;
      console.log('✅ Componente cargado exitosamente:', componentName);
      
      return component;
      
    } catch (error) {
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : String(error);
      console.error('❌ Error en lazy loading:', componentName, error);
      throw error;
      
    } finally {
      metrics.endTime = performance.now();
      metrics.loadDuration = metrics.endTime - metrics.startTime;
      this.lazyLoadMetrics.push(metrics);
      
      console.log('📊 Lazy loading completado:', {
        component: componentName,
        success: metrics.success,
        duration: metrics.loadDuration?.toFixed(2) + 'ms'
      });
    }
  }

  /**
   * Lazy loading específico para el renderizador de artefactos
   */
  async lazyLoadArtifactRenderer(): Promise<any> {
    return this.lazyLoadComponent(
      'OptimizedArtifactRenderer',
      async () => {
        // Verificar si ya está disponible globalmente
        if (typeof window !== 'undefined' && (window as any).artifactRenderer) {
          return (window as any).artifactRenderer;
        }

        // Importar dinámicamente
        const { OptimizedArtifactRenderer } = await import('@/src/components/renderer/OptimizedArtifactRenderer');
        
        // Cachear globalmente
        if (typeof window !== 'undefined') {
          (window as any).artifactRenderer = OptimizedArtifactRenderer;
        }
        
        return OptimizedArtifactRenderer;
      }
    );
  }

  /**
   * Lazy loading para librerías de gráficos
   */
  async lazyLoadChartLibrary(): Promise<any> {
    return this.lazyLoadComponent(
      'ChartLibrary',
      async () => {
        // Verificar si Recharts ya está disponible
        if (typeof window !== 'undefined' && (window as any).Recharts) {
          return (window as any).Recharts;
        }

        // Si no está pre-cargado, cargar dinámicamente
        await this.loadScriptDynamically('https://unpkg.com/recharts@2.1.9/umd/Recharts.js');
        
        return (window as any).Recharts;
      }
    );
  }

  /**
   * Carga un script dinámicamente
   */
  private loadScriptDynamically(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Pre-carga recursos específicos para artefactos
   */
  async preloadArtifactResources(): Promise<void> {
    console.log('🎨 Pre-cargando recursos para artefactos...');
    
    const artifactResources = [
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/prismjs@1.29.0/components/prism-core.min.js',
      'https://unpkg.com/prismjs@1.29.0/components/prism-javascript.min.js',
      'https://unpkg.com/prismjs@1.29.0/components/prism-jsx.min.js'
    ];

    await Promise.all(
      artifactResources.map(url => this.preloadResource(url, 'script'))
    );

    console.log('✅ Recursos para artefactos pre-cargados');
  }

  /**
   * Obtiene estadísticas de pre-loading
   */
  getPreloadStats(): {
    totalResources: number;
    successfulPreloads: number;
    failedPreloads: number;
    averageLoadTime: number;
    preloadedResourcesCount: number;
    recentMetrics: PreloadMetrics[];
  } {
    const total = this.preloadMetrics.length;
    const successful = this.preloadMetrics.filter(m => m.success).length;
    const failed = total - successful;
    
    const avgLoadTime = total > 0 
      ? this.preloadMetrics.reduce((sum, m) => sum + (m.loadDuration || 0), 0) / total
      : 0;

    return {
      totalResources: total,
      successfulPreloads: successful,
      failedPreloads: failed,
      averageLoadTime: avgLoadTime,
      preloadedResourcesCount: this.preloadedResources.size,
      recentMetrics: this.preloadMetrics.slice(-10)
    };
  }

  /**
   * Obtiene estadísticas de lazy loading
   */
  getLazyLoadStats(): {
    totalComponents: number;
    successfulLoads: number;
    failedLoads: number;
    averageLoadTime: number;
    cachedComponentsCount: number;
    recentMetrics: LazyLoadMetrics[];
  } {
    const total = this.lazyLoadMetrics.length;
    const successful = this.lazyLoadMetrics.filter(m => m.success).length;
    const failed = total - successful;
    
    const avgLoadTime = total > 0 
      ? this.lazyLoadMetrics.reduce((sum, m) => sum + (m.loadDuration || 0), 0) / total
      : 0;

    return {
      totalComponents: total,
      successfulLoads: successful,
      failedLoads: failed,
      averageLoadTime: avgLoadTime,
      cachedComponentsCount: this.lazyLoadedComponents.size,
      recentMetrics: this.lazyLoadMetrics.slice(-10)
    };
  }

  /**
   * Limpia métricas y caché antiguos
   */
  cleanup(): void {
    // Mantener solo las últimas 50 métricas
    if (this.preloadMetrics.length > 50) {
      this.preloadMetrics = this.preloadMetrics.slice(-50);
    }
    
    if (this.lazyLoadMetrics.length > 50) {
      this.lazyLoadMetrics = this.lazyLoadMetrics.slice(-50);
    }

    console.log('🧹 Limpieza de ResourcePreloader completada');
  }

  /**
   * Resetea todas las métricas y caché
   */
  reset(): void {
    this.preloadMetrics = [];
    this.lazyLoadMetrics = [];
    this.lazyLoadedComponents.clear();
    // No limpiar preloadedResources para mantener el estado de recursos cargados
    console.log('🔄 ResourcePreloader reseteado');
  }
}

// Instancia singleton
export const resourcePreloader = new ResourcePreloader();
