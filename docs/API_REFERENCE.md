# API Reference - Sistema de Renderización Optimizado

## Descripción General

Esta documentación describe la API completa del sistema de renderización optimizado, incluyendo todos los componentes, utilidades, y configuraciones disponibles.

## Tabla de Contenidos

- [Componentes Principales](#componentes-principales)
- [Utilidades de Renderizado](#utilidades-de-renderizado)
- [Sistema de Cache](#sistema-de-cache)
- [Monitoreo de Performance](#monitoreo-de-performance)
- [Detección de Contenido](#detección-de-contenido)
- [Configuración](#configuración)
- [Tipos y Interfaces](#tipos-y-interfaces)

---

## Componentes Principales

### ArtifactRendererWrapper

Wrapper principal que orquesta todo el proceso de renderización optimizada.

#### Props

```typescript
interface ArtifactRendererWrapperProps {
  content: string;                    // Contenido a renderizar
  type?: ContentType;                 // Tipo de contenido (opcional, se detecta automáticamente)
  options?: RenderOptions;            // Opciones de renderizado
  onRenderComplete?: (result: RenderResult) => void;  // Callback al completar
  onError?: (error: Error) => void;   // Callback de error
  className?: string;                 // Clases CSS adicionales
  style?: React.CSSProperties;       // Estilos inline
}
```

#### Ejemplo de Uso

```jsx
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'

function MyComponent() {
  const handleRenderComplete = (result) => {
    console.log('Renderizado completado:', result.renderTime)
  }

  return (
    <ArtifactRendererWrapper
      content="<h1>Hello World</h1>"
      options={{ enableCache: true, enableLazyLoading: true }}
      onRenderComplete={handleRenderComplete}
      className="my-renderer"
    />
  )
}
```

### OptimizedArtifactRenderer

Renderizador optimizado que maneja diferentes tipos de contenido.

#### Métodos Estáticos

```typescript
class OptimizedArtifactRenderer {
  static async render(
    content: string,
    type: ContentType,
    options: RenderOptions = {}
  ): Promise<RenderResult>

  static detectContentType(content: string): ContentType

  static validateContent(content: string, type: ContentType): ValidationResult

  static getDefaultOptions(type: ContentType): RenderOptions
}
```

#### Ejemplo de Uso

```javascript
import { OptimizedArtifactRenderer } from '@/src/components/renderer/OptimizedArtifactRenderer'

// Renderizado directo
const result = await OptimizedArtifactRenderer.render(
  '<div>Hello</div>',
  'html',
  { enableCache: true }
)

// Detección automática de tipo
const type = OptimizedArtifactRenderer.detectContentType(content)

// Validación de contenido
const validation = OptimizedArtifactRenderer.validateContent(content, 'react')
if (!validation.isValid) {
  console.error('Errores de validación:', validation.errors)
}
```

### RendererManager

Gestor centralizado de renderizadores con soporte para múltiples tipos.

#### API

```typescript
class RendererManager {
  constructor(config: RendererManagerConfig)

  // Registrar renderizador personalizado
  registerRenderer(type: ContentType, renderer: CustomRenderer): void

  // Obtener renderizador para tipo específico
  getRenderer(type: ContentType): Renderer

  // Renderizar con el renderizador apropiado
  async render(content: string, type: ContentType, options: RenderOptions): Promise<RenderResult>

  // Configurar opciones globales
  setGlobalOptions(options: Partial<RenderOptions>): void

  // Obtener estadísticas de uso
  getUsageStats(): RendererStats
}
```

#### Ejemplo de Uso

```javascript
import { RendererManager } from '@/src/components/renderer/RendererManager'

const manager = new RendererManager({
  enableCache: true,
  defaultTimeout: 5000
})

// Registrar renderizador personalizado
manager.registerRenderer('custom', {
  async render(content, options) {
    // Lógica de renderizado personalizada
    return { html: processedContent, renderTime: Date.now() }
  }
})

// Usar el manager
const result = await manager.render(content, 'html', { enableLazyLoading: true })
```

---

## Utilidades de Renderizado

### renderUtils

Utilidades principales para operaciones de renderizado.

```typescript
// src/utils/renderer/index.js

export const renderUtils = {
  // Sanitizar contenido HTML
  sanitizeHTML(html: string, options?: SanitizeOptions): string

  // Minificar contenido
  minifyContent(content: string, type: ContentType): string

  // Generar hash de contenido para cache
  generateContentHash(content: string): string

  // Validar sintaxis por tipo
  validateSyntax(content: string, type: ContentType): ValidationResult

  // Optimizar imágenes en HTML
  optimizeImages(html: string, options?: ImageOptimizationOptions): string

  // Extraer metadatos del contenido
  extractMetadata(content: string, type: ContentType): ContentMetadata
}
```

#### Ejemplo de Uso

```javascript
import { renderUtils } from '@/src/utils/renderer'

// Sanitizar HTML
const safeHTML = renderUtils.sanitizeHTML(userHTML, {
  allowedTags: ['div', 'span', 'p'],
  allowedAttributes: ['class', 'id']
})

// Generar hash para cache
const hash = renderUtils.generateContentHash(content)

// Validar sintaxis React
const validation = renderUtils.validateSyntax(reactCode, 'react')
if (!validation.isValid) {
  console.error('Errores de sintaxis:', validation.errors)
}
```

---

## Sistema de Cache

### CacheManager

Gestor de cache con soporte para TTL, LRU, y métricas.

#### Constructor

```typescript
class CacheManager {
  constructor(options: CacheOptions = {})
}

interface CacheOptions {
  maxSize?: number;           // Tamaño máximo del cache (default: 100)
  defaultTTL?: number;        // TTL por defecto en ms (default: 300000)
  strategy?: 'lru' | 'lfu';   // Estrategia de eviction (default: 'lru')
  enableMetrics?: boolean;    // Habilitar métricas (default: true)
  persistToDisk?: boolean;    // Persistir a disco (default: false)
}
```

#### Métodos

```typescript
class CacheManager {
  // Operaciones básicas
  async get(key: string): Promise<any | null>
  async set(key: string, value: any, ttl?: number): Promise<void>
  async delete(key: string): Promise<boolean>
  async clear(): Promise<void>

  // Operaciones avanzadas
  async getOrSet(key: string, factory: () => Promise<any>, ttl?: number): Promise<any>
  async invalidatePattern(pattern: string): Promise<number>
  async touch(key: string): Promise<boolean>

  // Configuración
  setDefaultTTL(ttl: number): void
  setMaxSize(size: number): void
  setStrategy(strategy: 'lru' | 'lfu'): void

  // Métricas
  getMetrics(): CacheMetrics
  resetMetrics(): void

  // Utilidades
  has(key: string): boolean
  size(): number
  keys(): string[]
  values(): any[]
}
```

#### Ejemplo de Uso

```javascript
import { CacheManager } from '@/src/utils/renderer/cacheManager'

const cache = new CacheManager({
  maxSize: 200,
  defaultTTL: 600000, // 10 minutos
  strategy: 'lru',
  enableMetrics: true
})

// Uso básico
await cache.set('key1', { data: 'value' })
const value = await cache.get('key1')

// Patrón get-or-set
const result = await cache.getOrSet('expensive-operation', async () => {
  return await performExpensiveOperation()
}, 900000) // 15 minutos

// Invalidación por patrón
await cache.invalidatePattern('user:*')

// Métricas
const metrics = cache.getMetrics()
console.log(`Hit rate: ${metrics.hitRate}%`)
```

---

## Monitoreo de Performance

### PerformanceMonitor

Monitor de performance con tracking automático y alertas.

#### API Principal

```typescript
class PerformanceMonitor {
  // Tracking de renderizado
  startRenderTracking(operationId: string, contentType: string): string
  endRenderTracking(operationId: string, success: boolean, error?: Error): void

  // Tracking de cache
  trackCacheUsage(isHit: boolean, duration: number): void

  // Tracking de chatbot
  startChatbotTracking(messageId: string): string
  endChatbotTracking(operationId: string, success: boolean, error?: Error): void

  // Tracking de errores
  trackError(type: string, error: Error, component?: string): void

  // Métricas
  getMetrics(): PerformanceMetrics
  exportMetrics(): string
  reset(): void

  // Configuración
  setEnabled(enabled: boolean): void
  setThresholds(thresholds: PerformanceThresholds): void

  // Alertas
  onAlert(callback: (alert: PerformanceAlert) => void): void
  getActiveAlerts(): PerformanceAlert[]
}
```

#### Ejemplo de Uso

```javascript
import performanceMonitor from '@/src/utils/PerformanceMonitor'

// Tracking de renderizado
const operationId = performanceMonitor.startRenderTracking('render_123', 'html')
try {
  // ... operación de renderizado ...
  performanceMonitor.endRenderTracking(operationId, true)
} catch (error) {
  performanceMonitor.endRenderTracking(operationId, false, error)
}

// Tracking de cache
performanceMonitor.trackCacheUsage(true, 150) // hit, 150ms

// Configurar alertas
performanceMonitor.onAlert((alert) => {
  if (alert.severity === 'high') {
    console.error('Alerta crítica:', alert.message)
  }
})

// Obtener métricas
const metrics = performanceMonitor.getMetrics()
console.log('Health score:', metrics.summary.performance.overallHealth)
```

---

## Detección de Contenido

### contentDetector

Utilidad para detección automática de tipos de contenido.

#### API

```typescript
export const contentDetector = {
  // Detección principal
  detectContentType(content: string): ContentType

  // Detección con confianza
  detectWithConfidence(content: string): DetectionResult

  // Validadores específicos
  isHTML(content: string): boolean
  isReact(content: string): boolean
  isVue(content: string): boolean
  isAngular(content: string): boolean
  isMarkdown(content: string): boolean
  isJSON(content: string): boolean
  isXML(content: string): boolean
  isCSS(content: string): boolean
  isJavaScript(content: string): boolean

  // Configuración
  addCustomDetector(type: string, detector: ContentDetector): void
  setDetectionThreshold(threshold: number): void
}
```

#### Tipos

```typescript
interface DetectionResult {
  type: ContentType;
  confidence: number;        // 0-1
  alternatives: Array<{
    type: ContentType;
    confidence: number;
  }>;
  metadata: {
    framework?: string;      // Para React, Vue, etc.
    version?: string;
    features: string[];
  };
}

interface ContentDetector {
  detect(content: string): number;  // Retorna confianza 0-1
  validate?(content: string): boolean;
}
```

#### Ejemplo de Uso

```javascript
import { contentDetector } from '@/src/utils/renderer/contentDetector'

// Detección simple
const type = contentDetector.detectContentType(content)

// Detección con confianza
const result = contentDetector.detectWithConfidence(content)
console.log(`Tipo: ${result.type}, Confianza: ${result.confidence}`)

// Detector personalizado
contentDetector.addCustomDetector('svelte', {
  detect(content) {
    if (content.includes('<script>') && content.includes('export let')) {
      return 0.8
    }
    return 0
  }
})

// Validación específica
if (contentDetector.isReact(content)) {
  console.log('Contenido React detectado')
}
```

---

## Configuración

### Variables de Entorno

```bash
# Renderizador
NEXT_PUBLIC_RENDERER_OPTIMIZATION=true
NEXT_PUBLIC_RENDERER_TIMEOUT=10000

# Cache
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_MAX_SIZE=100
NEXT_PUBLIC_CACHE_TTL=300000
NEXT_PUBLIC_CACHE_STRATEGY=lru

# Performance
NEXT_PUBLIC_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_SLOW_THRESHOLD=2000
NEXT_PUBLIC_LARGE_CONTENT_THRESHOLD=50000

# Detección
NEXT_PUBLIC_AUTO_DETECTION=true
NEXT_PUBLIC_DETECTION_THRESHOLD=0.7
```

### Configuración Programática

```typescript
// Configuración global del renderizador
import { configureRenderer } from '@/src/utils/renderer'

configureRenderer({
  cache: {
    enabled: true,
    maxSize: 200,
    defaultTTL: 600000,
    strategy: 'lru'
  },
  performance: {
    monitoring: true,
    slowThreshold: 1500,
    largeContentThreshold: 100000
  },
  detection: {
    autoDetect: true,
    threshold: 0.8,
    fallbackType: 'html'
  },
  rendering: {
    timeout: 15000,
    enableLazyLoading: true,
    enableMinification: true,
    enableSanitization: true
  }
})
```

---

## Tipos y Interfaces

### Tipos Principales

```typescript
// Tipos de contenido soportados
type ContentType = 
  | 'html' 
  | 'react' 
  | 'vue' 
  | 'angular' 
  | 'markdown' 
  | 'json' 
  | 'xml' 
  | 'css' 
  | 'javascript'
  | 'unknown'

// Opciones de renderizado
interface RenderOptions {
  enableCache?: boolean;
  enableLazyLoading?: boolean;
  enableMinification?: boolean;
  enableSanitization?: boolean;
  timeout?: number;
  bypassCache?: boolean;
  customRenderer?: CustomRenderer;
  onProgress?: (progress: number) => void;
}

// Resultado de renderizado
interface RenderResult {
  html: string;
  renderTime: number;
  fromCache: boolean;
  contentType: ContentType;
  metadata: {
    size: number;
    optimizations: string[];
    warnings: string[];
  };
}

// Métricas de performance
interface PerformanceMetrics {
  rendering: {
    totalRenders: number;
    successfulRenders: number;
    failedRenders: number;
    averageRenderTime: number;
    contentTypes: Record<string, {
      count: number;
      averageTime: number;
    }>;
  };
  cache: {
    totalRequests: number;
    hits: number;
    misses: number;
    hitRate: number;
    averageHitTime: number;
    averageMissTime: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    byComponent: Record<string, number>;
    recent: Array<{
      timestamp: number;
      type: string;
      message: string;
      component: string;
    }>;
  };
  summary: {
    performance: {
      overallHealth: number;
      renderingEfficiency: number;
      cacheEffectiveness: number;
      errorRate: number;
    };
    alerts: PerformanceAlert[];
    recommendations: PerformanceRecommendation[];
  };
}
```

### Interfaces de Configuración

```typescript
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageHitTime: number;
  averageMissTime: number;
  size: number;
  maxSize: number;
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  data?: any;
}

interface PerformanceRecommendation {
  id: string;
  category: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    line?: number;
    column?: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}
```

---

## Eventos y Callbacks

### Eventos del Sistema

```typescript
// Event emitter para el sistema de renderizado
import { rendererEvents } from '@/src/utils/renderer'

// Eventos disponibles
rendererEvents.on('render:start', (data) => {
  console.log('Renderizado iniciado:', data.operationId)
})

rendererEvents.on('render:complete', (data) => {
  console.log('Renderizado completado:', data.renderTime)
})

rendererEvents.on('render:error', (data) => {
  console.error('Error de renderizado:', data.error)
})

rendererEvents.on('cache:hit', (data) => {
  console.log('Cache hit:', data.key)
})

rendererEvents.on('cache:miss', (data) => {
  console.log('Cache miss:', data.key)
})

rendererEvents.on('performance:alert', (alert) => {
  console.warn('Alerta de performance:', alert)
})
```

### Hooks de React

```typescript
// Hook para usar el renderizador
import { useRenderer } from '@/src/hooks/useRenderer'

function MyComponent() {
  const { render, isLoading, error, result } = useRenderer()

  const handleRender = async () => {
    await render(content, 'html', { enableCache: true })
  }

  return (
    <div>
      {isLoading && <div>Renderizando...</div>}
      {error && <div>Error: {error.message}</div>}
      {result && <div dangerouslySetInnerHTML={{ __html: result.html }} />}
    </div>
  )
}

// Hook para métricas de performance
import { usePerformanceMetrics } from '@/src/hooks/usePerformanceMetrics'

function PerformanceDisplay() {
  const metrics = usePerformanceMetrics({ refreshInterval: 5000 })

  return (
    <div>
      <p>Health Score: {metrics?.summary.performance.overallHealth}%</p>
      <p>Cache Hit Rate: {metrics?.cache.hitRate}%</p>
    </div>
  )
}
```

---

## Extensibilidad

### Renderizadores Personalizados

```typescript
// Crear renderizador personalizado
interface CustomRenderer {
  render(content: string, options: RenderOptions): Promise<RenderResult>
  validate?(content: string): ValidationResult
  optimize?(content: string): string
}

const myCustomRenderer: CustomRenderer = {
  async render(content, options) {
    // Lógica de renderizado personalizada
    const processed = await processContent(content)
    return {
      html: processed,
      renderTime: Date.now(),
      fromCache: false,
      contentType: 'custom',
      metadata: {
        size: processed.length,
        optimizations: ['custom-optimization'],
        warnings: []
      }
    }
  },

  validate(content) {
    // Validación personalizada
    return {
      isValid: true,
      errors: [],
      warnings: []
    }
  }
}

// Registrar el renderizador
import { RendererManager } from '@/src/components/renderer/RendererManager'
const manager = new RendererManager()
manager.registerRenderer('custom', myCustomRenderer)
```

### Plugins del Sistema

```typescript
// Plugin para el sistema de renderizado
interface RendererPlugin {
  name: string
  version: string
  install(manager: RendererManager): void
  uninstall?(manager: RendererManager): void
}

const myPlugin: RendererPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  install(manager) {
    // Registrar hooks, renderizadores, etc.
    manager.addHook('before:render', (content, options) => {
      // Pre-procesamiento
      return { content: preprocessContent(content), options }
    })
    
    manager.addHook('after:render', (result) => {
      // Post-procesamiento
      return postprocessResult(result)
    })
  }
}

// Usar el plugin
manager.use(myPlugin)
```

---

## Migración y Compatibilidad

### API de Compatibilidad

Para facilitar la migración desde el sistema anterior:

```typescript
// Wrapper de compatibilidad
import { LegacyRenderer } from '@/src/components/renderer/LegacyRenderer'

// Mantiene la API anterior pero usa el nuevo sistema internamente
const legacyRenderer = new LegacyRenderer({
  enableOptimizations: true,
  fallbackToOld: false
})

// API anterior sigue funcionando
await legacyRenderer.renderHTML(htmlContent)
await legacyRenderer.renderReact(reactContent)
```

---

## Ejemplos Completos

### Ejemplo 1: Renderizador Básico

```jsx
import React from 'react'
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'

function BasicRenderer({ content }) {
  return (
    <ArtifactRendererWrapper
      content={content}
      options={{
        enableCache: true,
        enableLazyLoading: true,
        timeout: 5000
      }}
      onRenderComplete={(result) => {
        console.log(`Renderizado en ${result.renderTime}ms`)
      }}
      onError={(error) => {
        console.error('Error de renderizado:', error)
      }}
    />
  )
}
```

### Ejemplo 2: Sistema Avanzado con Métricas

```jsx
import React, { useEffect, useState } from 'react'
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'
import performanceMonitor from '@/src/utils/PerformanceMonitor'

function AdvancedRenderer({ content }) {
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <ArtifactRendererWrapper
        content={content}
        options={{
          enableCache: true,
          enableLazyLoading: true,
          enableMinification: true
        }}
      />
      
      {metrics && (
        <div className="metrics">
          <p>Health Score: {metrics.summary.performance.overallHealth}%</p>
          <p>Cache Hit Rate: {metrics.cache.hitRate}%</p>
          <p>Avg Render Time: {metrics.rendering.averageRenderTime}ms</p>
        </div>
      )}
    </div>
  )
}
```

---

## Soporte y Contribución

### Reportar Issues

Para reportar problemas o solicitar funcionalidades:

1. Usar el sistema de issues del repositorio
2. Incluir información de debug:
   ```javascript
   console.log('Renderer version:', rendererVersion)
   console.log('Performance metrics:', performanceMonitor.getMetrics())
   console.log('Cache stats:', cacheManager.getMetrics())
   ```

### Contribuir

1. Fork del repositorio
2. Crear branch para la funcionalidad
3. Implementar con tests
4. Actualizar documentación
5. Crear pull request

### Testing

```bash
# Ejecutar tests del renderizador
npm run test:renderer

# Ejecutar benchmarks
npm run benchmark:renderer

# Tests de integración
npm run test:integration
```

---

Esta documentación cubre la API completa del sistema de renderización optimizado. Para ejemplos más específicos y casos de uso avanzados, consultar las otras guías de documentación.
