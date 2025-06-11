# Sistema de Monitoreo de Performance

## Descripción General

El sistema de monitoreo de performance proporciona tracking en tiempo real de métricas clave de la aplicación, incluyendo tiempos de renderización, errores, uso de cache y performance del chatbot.

## Componentes Principales

### 1. PerformanceMonitor (`src/utils/PerformanceMonitor.js`)

Monitor centralizado que recopila y analiza métricas de performance.

#### Características:
- **Tracking de Renderizado**: Mide tiempos de renderización por tipo de contenido
- **Monitoreo de Cache**: Trackea hit/miss rates y tiempos de respuesta
- **Performance del Chatbot**: Mide tiempos de respuesta y tasa de errores
- **Detección de Errores**: Captura y categoriza errores del sistema
- **Alertas Automáticas**: Genera alertas basadas en umbrales configurables
- **Recomendaciones**: Proporciona sugerencias de optimización

#### API Principal:

```javascript
import performanceMonitor from '@/src/utils/PerformanceMonitor'

// Tracking de renderizado
const operationId = performanceMonitor.startRenderTracking('render_123', 'html')
// ... operación de renderizado ...
performanceMonitor.endRenderTracking(operationId, true) // success = true

// Tracking de cache
performanceMonitor.trackCacheUsage(true, 150) // hit = true, duration = 150ms

// Tracking de chatbot
const messageId = performanceMonitor.startChatbotTracking('msg_456')
// ... procesamiento del mensaje ...
performanceMonitor.endChatbotTracking(messageId, true)

// Tracking de errores
performanceMonitor.trackError('render', new Error('Failed to render'), 'renderer')

// Obtener métricas
const metrics = performanceMonitor.getMetrics()
```

### 2. PerformanceDashboard (`src/components/PerformanceDashboard.jsx`)

Dashboard visual para monitorear métricas en tiempo real.

#### Características:
- **Vista en Tiempo Real**: Auto-refresh configurable (1s, 5s, 10s, 30s)
- **Tarjetas de Resumen**: Health Score, Rendering Efficiency, Cache Hit Rate, Error Rate
- **Alertas Activas**: Muestra alertas críticas y recomendaciones
- **Métricas Detalladas**: Breakdown por categoría (renderizado, cache, chatbot, errores)
- **Errores Recientes**: Lista de los últimos errores con timestamps
- **Exportación**: Permite exportar métricas a JSON

#### Uso:
```jsx
import PerformanceDashboard from '@/src/components/PerformanceDashboard'

<PerformanceDashboard
  isOpen={isDashboardOpen}
  onClose={() => setIsDashboardOpen(false)}
/>
```

### 3. PerformanceButton (`src/components/PerformanceButton.jsx`)

Botón flotante para acceder al dashboard (solo en desarrollo).

#### Características:
- **Solo en Desarrollo**: Automáticamente oculto en producción
- **Posición Fija**: Botón flotante en esquina inferior derecha
- **Acceso Rápido**: Un clic para abrir el dashboard

## Integración en Componentes

### ArtifactRendererWrapper

El wrapper del renderizador integra automáticamente el tracking de performance:

```jsx
// Inicio del tracking
const operationId = performanceMonitor.startRenderTracking(operationId, detectedType)

try {
  // Renderizado...
  performanceMonitor.endRenderTracking(operationId, true)
  
  // Tracking de cache si aplica
  if (result.fromCache !== undefined) {
    performanceMonitor.trackCacheUsage(result.fromCache, totalRenderTime)
  }
} catch (err) {
  // Tracking de error
  performanceMonitor.endRenderTracking(operationId, false, err)
}
```

### Chat Panel (Futuro)

Para integrar tracking del chatbot:

```jsx
// Al enviar mensaje
const messageId = performanceMonitor.startChatbotTracking(messageId)

try {
  // Procesamiento del mensaje...
  performanceMonitor.endChatbotTracking(messageId, true)
} catch (error) {
  performanceMonitor.endChatbotTracking(messageId, false, error)
}
```

## Métricas Recopiladas

### Renderizado
- **Total Renders**: Número total de operaciones de renderizado
- **Successful/Failed**: Conteo de renderizados exitosos vs fallidos
- **Average Render Time**: Tiempo promedio de renderizado
- **Content Types**: Breakdown por tipo de contenido (HTML, React, etc.)
- **Render Times**: Historial de tiempos de renderizado

### Cache
- **Total Requests**: Número total de requests al cache
- **Hits/Misses**: Conteo de cache hits vs misses
- **Hit Rate**: Porcentaje de cache hits
- **Average Hit/Miss Time**: Tiempos promedio para hits y misses

### Chatbot
- **Total Messages**: Número total de mensajes procesados
- **Successful Responses**: Respuestas exitosas
- **Errors**: Número de errores
- **Average Response Time**: Tiempo promedio de respuesta

### Errores
- **Total Errors**: Número total de errores
- **By Type**: Breakdown por tipo de error
- **By Component**: Breakdown por componente
- **Recent Errors**: Lista de errores recientes con detalles

### Sistema
- **Memory Usage**: Uso de memoria JavaScript
- **Network Requests**: Número de requests de red
- **Slow Operations**: Operaciones que exceden umbrales

## Alertas y Umbrales

### Umbrales por Defecto
- **Renderizado Lento**: > 2000ms
- **Cache Hit Rate Bajo**: < 50%
- **Alta Tasa de Errores**: > 10%
- **Operaciones Lentas**: > 5 en 5 minutos

### Tipos de Alertas
- **High Severity**: Errores críticos, alta tasa de errores
- **Medium Severity**: Renderizado lento, cache bajo
- **Low Severity**: Advertencias generales

## Recomendaciones Automáticas

El sistema genera recomendaciones basadas en las métricas:

### Cache
- **Baja Hit Rate**: "Considerar aumentar el tamaño del cache"
- **Cache Ineficiente**: "Revisar estrategia de caching"

### Renderizado
- **Tiempos Altos**: "Optimizar tiempos de renderizado, considerar lazy loading"
- **Muchos Fallos**: "Revisar validación de contenido"

### Chatbot
- **Respuestas Lentas**: "Optimizar tiempos de respuesta del chatbot"
- **Muchos Errores**: "Revisar manejo de errores en el chatbot"

## Configuración

### Variables de Entorno
```bash
# Habilitar monitoreo de performance
NEXT_PUBLIC_PERFORMANCE_MONITORING=true

# Configuración de umbrales
NEXT_PUBLIC_SLOW_THRESHOLD=2000
NEXT_PUBLIC_CACHE_THRESHOLD=50
NEXT_PUBLIC_ERROR_THRESHOLD=10
```

### Configuración Programática
```javascript
// Configurar umbrales personalizados
const monitor = new PerformanceMonitor({
  slowThreshold: 1500,
  maxHistorySize: 500,
  sampleRate: 0.8
})

// Habilitar/deshabilitar
performanceMonitor.setEnabled(false)
```

## Exportación de Datos

### Formato JSON
```javascript
// Exportar métricas actuales
const data = performanceMonitor.exportMetrics()

// Estructura del JSON exportado
{
  "timestamp": 1704398400000,
  "rendering": { /* métricas de renderizado */ },
  "cache": { /* métricas de cache */ },
  "chatbot": { /* métricas de chatbot */ },
  "errors": { /* métricas de errores */ },
  "summary": {
    "performance": {
      "overallHealth": 85,
      "renderingEfficiency": 92,
      "cacheEffectiveness": 78,
      "chatbotPerformance": 88,
      "errorRate": 2.1
    },
    "alerts": [ /* alertas activas */ ],
    "recommendations": [ /* recomendaciones */ ]
  }
}
```

## Mejores Prácticas

### 1. Uso en Desarrollo
- Mantener el dashboard abierto durante desarrollo
- Revisar alertas y recomendaciones regularmente
- Exportar métricas antes de deploys importantes

### 2. Integración en Componentes
- Usar tracking en operaciones críticas
- Proporcionar contexto útil (tipo de contenido, IDs)
- Manejar errores apropiadamente

### 3. Análisis de Performance
- Monitorear tendencias a lo largo del tiempo
- Identificar patrones en operaciones lentas
- Usar métricas para validar optimizaciones

### 4. Producción
- El dashboard se oculta automáticamente
- Las métricas siguen recopilándose
- Considerar integración con servicios de monitoreo externos

## Troubleshooting

### Problemas Comunes

#### Dashboard No Aparece
- Verificar que esté en modo desarrollo
- Revisar que PerformanceButton esté en el layout
- Verificar imports correctos

#### Métricas No Se Actualizan
- Verificar que el monitoreo esté habilitado
- Revisar que los componentes estén integrados
- Verificar feature flags

#### Errores de Performance
- Revisar umbrales configurados
- Verificar que las operaciones se estén trackeando
- Revisar logs de consola para errores

### Debug
```javascript
// Verificar estado del monitor
console.log('Monitor enabled:', performanceMonitor.isEnabled)
console.log('Current metrics:', performanceMonitor.getMetrics())

// Verificar operaciones activas
console.log('Active operations:', performanceMonitor.activeOperations)
```

## Roadmap

### Próximas Funcionalidades
- [ ] Integración con servicios externos (DataDog, New Relic)
- [ ] Gráficos de tendencias temporales
- [ ] Alertas por email/Slack
- [ ] Comparación entre versiones
- [ ] Métricas de usuario (Core Web Vitals)
- [ ] Análisis de performance por usuario
- [ ] Reportes automáticos programados

### Mejoras Planificadas
- [ ] Optimización de memoria del monitor
- [ ] Compresión de datos históricos
- [ ] Filtros avanzados en el dashboard
- [ ] Exportación a múltiples formatos
- [ ] API REST para métricas
- [ ] Integración con CI/CD
