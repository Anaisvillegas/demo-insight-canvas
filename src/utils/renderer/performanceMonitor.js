/**
 * performanceMonitor.js
 * 
 * Sistema de monitoreo de rendimiento para el renderizador de artefactos.
 * Recopila métricas detalladas, detecta cuellos de botella y proporciona
 * insights para optimizar el rendimiento del sistema.
 * 
 * Características:
 * - Medición de tiempos de renderizado
 * - Monitoreo de uso de memoria
 * - Detección de degradación de rendimiento
 * - Alertas automáticas
 * - Reportes de rendimiento
 * - Integración con herramientas de desarrollo
 */

// Fallback constants si no se pueden importar
const RENDERER_CONSTANTS = {
  PERFORMANCE_SAMPLE_RATE: 0.1,
  PERFORMANCE_BUFFER_SIZE: 1000,
  PERFORMANCE_FLUSH_INTERVAL: 60000
};

const MONITORING_CONFIG = {
  thresholds: {
    renderTime: 5000,
    memoryUsage: 100 * 1024 * 1024 // 100MB
  },
  reporting: {
    enabled: false
  }
};

/**
 * Monitor de rendimiento principal
 */
class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      sampleRate: RENDERER_CONSTANTS.PERFORMANCE_SAMPLE_RATE,
      bufferSize: RENDERER_CONSTANTS.PERFORMANCE_BUFFER_SIZE,
      flushInterval: RENDERER_CONSTANTS.PERFORMANCE_FLUSH_INTERVAL,
      thresholds: MONITORING_CONFIG.thresholds,
      enableReporting: MONITORING_CONFIG.reporting.enabled,
      ...config
    };

    this.measurements = new Map();
    this.metrics = [];
    this.alerts = [];
    this.isEnabled = true;
    this.flushTimer = null;

    this.init();
  }

  /**
   * Inicializa el monitor de rendimiento
   */
  init() {
    try {
      // Configurar flush automático
      this.startFlushTimer();
      
      // Configurar observadores de rendimiento si están disponibles
      this.setupPerformanceObservers();
      
      // Configurar monitoreo de memoria
      this.setupMemoryMonitoring();
      
      console.log('PerformanceMonitor inicializado correctamente');
      
    } catch (error) {
      console.error('Error inicializando PerformanceMonitor:', error);
    }
  }

  /**
   * Inicia una medición de rendimiento
   * @param {string} name - Nombre de la medición
   * @param {Object} metadata - Metadatos adicionales
   * @returns {string} - ID de la medición
   */
  startMeasurement(name, metadata = {}) {
    if (!this.isEnabled || !this.shouldSample()) {
      return null;
    }

    const id = this.generateMeasurementId(name);
    const measurement = {
      id,
      name,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      metadata,
      marks: []
    };

    this.measurements.set(id, measurement);
    
    // Crear marca de rendimiento si está disponible
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }

    return id;
  }

  /**
   * Finaliza una medición de rendimiento
   * @param {string} id - ID de la medición
   * @returns {Object|null} - Resultado de la medición
   */
  endMeasurement(id) {
    if (!id || !this.measurements.has(id)) {
      return null;
    }

    const measurement = this.measurements.get(id);
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const result = {
      ...measurement,
      endTime,
      endMemory,
      duration: endTime - measurement.startTime,
      memoryDelta: endMemory - measurement.startMemory,
      timestamp: Date.now()
    };

    // Crear marca de finalización
    if (performance.mark && performance.measure) {
      performance.mark(`${measurement.name}-end`);
      try {
        performance.measure(
          measurement.name,
          `${measurement.name}-start`,
          `${measurement.name}-end`
        );
      } catch (error) {
        // Ignorar errores de medición
      }
    }

    // Almacenar métrica
    this.addMetric(result);
    
    // Verificar umbrales
    this.checkThresholds(result);
    
    // Limpiar medición activa
    this.measurements.delete(id);

    return result;
  }

  /**
   * Agrega una marca intermedia a una medición
   * @param {string} id - ID de la medición
   * @param {string} markName - Nombre de la marca
   * @param {Object} data - Datos adicionales
   */
  addMark(id, markName, data = {}) {
    if (!id || !this.measurements.has(id)) {
      return;
    }

    const measurement = this.measurements.get(id);
    const mark = {
      name: markName,
      time: performance.now(),
      relativeTime: performance.now() - measurement.startTime,
      data
    };

    measurement.marks.push(mark);
    
    // Crear marca de rendimiento
    if (performance.mark) {
      performance.mark(`${measurement.name}-${markName}`);
    }
  }

  /**
   * Registra una métrica personalizada
   * @param {string} name - Nombre de la métrica
   * @param {number} value - Valor de la métrica
   * @param {Object} metadata - Metadatos adicionales
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.isEnabled) return;

    const metric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Obtiene estadísticas de rendimiento
   * @param {string} name - Nombre específico de métrica (opcional)
   * @returns {Object} - Estadísticas calculadas
   */
  getStats(name = null) {
    const filteredMetrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return null;
    }

    const durations = filteredMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration);

    const memoryDeltas = filteredMetrics
      .filter(m => m.memoryDelta !== undefined)
      .map(m => m.memoryDelta);

    return {
      count: filteredMetrics.length,
      duration: this.calculateStats(durations),
      memory: this.calculateStats(memoryDeltas),
      recent: filteredMetrics.slice(-10), // Últimas 10 mediciones
      alerts: this.alerts.filter(a => !name || a.metric === name)
    };
  }

  /**
   * Obtiene un reporte completo de rendimiento
   * @returns {Object} - Reporte detallado
   */
  getReport() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const metricsByName = this.groupMetricsByName(recentMetrics);
    
    const report = {
      timestamp: now,
      period: '1 hour',
      summary: {
        totalMeasurements: recentMetrics.length,
        uniqueMetrics: Object.keys(metricsByName).length,
        alerts: this.alerts.length,
        memoryUsage: this.getMemoryUsage()
      },
      metrics: {},
      alerts: this.alerts.slice(-20), // Últimas 20 alertas
      recommendations: this.generateRecommendations(recentMetrics)
    };

    // Calcular estadísticas por métrica
    for (const [name, metrics] of Object.entries(metricsByName)) {
      report.metrics[name] = this.getStats(name);
    }

    return report;
  }

  /**
   * Limpia métricas antiguas
   * @param {number} maxAge - Edad máxima en milisegundos
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 horas por defecto
    const cutoff = Date.now() - maxAge;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Habilita o deshabilita el monitoreo
   * @param {boolean} enabled - Si habilitar el monitoreo
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }

  /**
   * Métodos privados
   */

  /**
   * Genera un ID único para la medición
   */
  generateMeasurementId(name) {
    return `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determina si debe tomar una muestra
   */
  shouldSample() {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Obtiene el uso actual de memoria
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  /**
   * Agrega una métrica al buffer
   */
  addMetric(metric) {
    this.metrics.push(metric);
    
    // Mantener tamaño del buffer
    if (this.metrics.length > this.config.bufferSize) {
      this.metrics = this.metrics.slice(-this.config.bufferSize);
    }
  }

  /**
   * Verifica umbrales y genera alertas
   */
  checkThresholds(measurement) {
    const { thresholds } = this.config;
    
    // Verificar tiempo de renderizado
    if (measurement.duration > thresholds.renderTime) {
      this.createAlert('render-time', measurement, {
        threshold: thresholds.renderTime,
        actual: measurement.duration
      });
    }
    
    // Verificar uso de memoria
    if (measurement.endMemory.used > thresholds.memoryUsage) {
      this.createAlert('memory-usage', measurement, {
        threshold: thresholds.memoryUsage,
        actual: measurement.endMemory.used
      });
    }
  }

  /**
   * Crea una alerta
   */
  createAlert(type, measurement, details) {
    const alert = {
      type,
      measurement: measurement.name,
      timestamp: Date.now(),
      details,
      severity: this.calculateSeverity(type, details)
    };
    
    this.alerts.push(alert);
    
    // Mantener solo las últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    console.warn('Performance Alert:', alert);
  }

  /**
   * Calcula la severidad de una alerta
   */
  calculateSeverity(type, details) {
    const ratio = details.actual / details.threshold;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * Calcula estadísticas de un array de valores
   */
  calculateStats(values) {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, p95: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  /**
   * Agrupa métricas por nombre
   */
  groupMetricsByName(metrics) {
    return metrics.reduce((groups, metric) => {
      const name = metric.name;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(metric);
      return groups;
    }, {});
  }

  /**
   * Genera recomendaciones basadas en métricas
   */
  generateRecommendations(metrics) {
    const recommendations = [];
    const stats = this.getStats();
    
    // Recomendación por tiempo de renderizado lento
    if (stats && stats.duration.avg > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Tiempo de renderizado promedio alto. Considerar optimizaciones de cache o virtualización.',
        metric: 'render-time'
      });
    }
    
    // Recomendación por uso de memoria alto
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.used > memoryUsage.limit * 0.8) {
      recommendations.push({
        type: 'memory',
        priority: 'critical',
        message: 'Uso de memoria cercano al límite. Implementar limpieza más agresiva.',
        metric: 'memory-usage'
      });
    }
    
    return recommendations;
  }

  /**
   * Configura observadores de rendimiento
   */
  setupPerformanceObservers() {
    // Solo configurar en el cliente
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;
    
    try {
      // Observar mediciones de rendimiento
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('artifact') || entry.name.includes('render')) {
            this.recordMetric(`browser-${entry.name}`, entry.duration, {
              entryType: entry.entryType,
              startTime: entry.startTime
            });
          }
        }
      });
      
      measureObserver.observe({ entryTypes: ['measure'] });
      
    } catch (error) {
      console.warn('No se pudo configurar PerformanceObserver:', error);
    }
  }

  /**
   * Configura monitoreo de memoria
   */
  setupMemoryMonitoring() {
    // Solo configurar en el cliente
    if (typeof window === 'undefined') return;
    
    // Monitorear memoria cada 30 segundos
    setInterval(() => {
      const memory = this.getMemoryUsage();
      this.recordMetric('memory-snapshot', memory.used, {
        total: memory.total,
        limit: memory.limit,
        percentage: (memory.used / memory.limit) * 100
      });
    }, 30000);
  }

  /**
   * Inicia el timer de flush
   */
  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Detiene el timer de flush
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Envía métricas al endpoint configurado
   */
  async flush() {
    if (!this.config.enableReporting || this.metrics.length === 0) {
      return;
    }
    
    try {
      const report = this.getReport();
      
      // En un entorno real, enviarías esto a tu servicio de monitoreo
      console.log('Performance Report:', report);
      
      // Limpiar métricas antiguas
      this.cleanup();
      
    } catch (error) {
      console.error('Error enviando reporte de rendimiento:', error);
    }
  }

  /**
   * Limpieza al destruir la instancia
   */
  destroy() {
    this.stopFlushTimer();
    this.measurements.clear();
    this.metrics.length = 0;
    this.alerts.length = 0;
    this.isEnabled = false;
  }
}

/**
 * Instancia singleton del monitor de rendimiento
 */
const performanceMonitor = new PerformanceMonitor();

export { performanceMonitor, PerformanceMonitor };
export default performanceMonitor;
