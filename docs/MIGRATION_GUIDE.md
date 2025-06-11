# Guía de Migración - Sistema de Renderización Optimizado

## Descripción General

Esta guía proporciona instrucciones paso a paso para migrar del sistema de renderización anterior al nuevo sistema optimizado. La migración está diseñada para ser gradual y mantener compatibilidad hacia atrás.

## Tabla de Contenidos

- [Preparación para la Migración](#preparación-para-la-migración)
- [Estrategias de Migración](#estrategias-de-migración)
- [Migración Paso a Paso](#migración-paso-a-paso)
- [Cambios en la API](#cambios-en-la-api)
- [Configuración](#configuración)
- [Testing y Validación](#testing-y-validación)
- [Rollback y Contingencia](#rollback-y-contingencia)
- [FAQ y Problemas Comunes](#faq-y-problemas-comunes)

---

## Preparación para la Migración

### Evaluación del Sistema Actual

Antes de comenzar la migración, evalúa tu implementación actual:

#### 1. Inventario de Componentes

```bash
# Buscar componentes que usan el renderizador anterior
grep -r "HTMLArtifact\|ReactArtifact" src/
grep -r "artifact.*render" src/
grep -r "dangerouslySetInnerHTML" src/
```

#### 2. Análisis de Dependencias

```javascript
// Identificar dependencias del sistema anterior
const legacyComponents = [
  'components/artifact/html.tsx',
  'components/artifact/react.tsx',
  'components/artifact/index.tsx'
]

// Verificar uso en el código
legacyComponents.forEach(component => {
  console.log(`Checking usage of ${component}`)
  // Usar herramientas de análisis estático
})
```

#### 3. Backup del Sistema Actual

```bash
# Crear backup del sistema actual
git checkout -b backup/pre-renderer-migration
git add .
git commit -m "Backup before renderer migration"

# Crear tag de referencia
git tag v1.0.0-pre-migration
```

### Requisitos Previos

#### Dependencias Necesarias

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0",
    "dompurify": "^3.0.0"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^13.0.0"
  }
}
```

#### Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_RENDERER_OPTIMIZATION=true
NEXT_PUBLIC_MIGRATION_MODE=gradual
NEXT_PUBLIC_FALLBACK_TO_LEGACY=true
```

---

## Estrategias de Migración

### Estrategia 1: Migración Gradual (Recomendada)

**Ventajas:**
- ✅ Riesgo mínimo
- ✅ Rollback fácil
- ✅ Testing incremental
- ✅ Feedback temprano

**Proceso:**
1. Instalar sistema nuevo en paralelo
2. Migrar componentes uno por uno
3. A/B testing entre sistemas
4. Rollout gradual por porcentaje de usuarios

### Estrategia 2: Migración Big Bang

**Ventajas:**
- ✅ Migración completa inmediata
- ✅ Sin duplicación de código
- ✅ Beneficios inmediatos

**Desventajas:**
- ❌ Alto riesgo
- ❌ Rollback complejo
- ❌ Testing limitado

### Estrategia 3: Migración por Funcionalidad

**Proceso:**
1. Migrar por tipo de contenido (HTML → React → Markdown)
2. Migrar por página/sección
3. Migrar por criticidad de componente

---

## Migración Paso a Paso

### Fase 1: Instalación del Sistema Nuevo

#### 1.1 Instalar Componentes Base

```bash
# Crear estructura de directorios
mkdir -p src/components/renderer
mkdir -p src/utils/renderer
mkdir -p src/hooks
```

#### 1.2 Configurar Wrapper de Compatibilidad

```javascript
// src/components/renderer/LegacyCompatWrapper.jsx
import React from 'react'
import { ArtifactRendererWrapper } from './ArtifactRendererWrapper'

// Wrapper que mantiene la API anterior
export const LegacyCompatWrapper = ({ 
  content, 
  type, 
  onRender,
  onError,
  ...props 
}) => {
  // Mapear props del sistema anterior al nuevo
  const newProps = {
    content,
    type: mapLegacyType(type),
    onRenderComplete: onRender,
    onError,
    options: {
      enableCache: true,
      enableLazyLoading: true,
      // Configuración conservadora para compatibilidad
      enableMinification: false
    },
    ...props
  }

  return <ArtifactRendererWrapper {...newProps} />
}

// Mapear tipos del sistema anterior
function mapLegacyType(legacyType) {
  const typeMap = {
    'html': 'html',
    'react': 'react',
    'jsx': 'react',
    'markdown': 'markdown',
    'md': 'markdown'
  }
  return typeMap[legacyType] || 'html'
}
```

### Fase 2: Migración de Componentes Individuales

#### 2.1 Migrar HTMLArtifact

**Antes:**
```jsx
// components/artifact/html.tsx
import { HTMLArtifact } from './html'

function MyComponent({ content }) {
  return (
    <HTMLArtifact 
      content={content}
      onRender={(result) => console.log('Rendered')}
    />
  )
}
```

**Después:**
```jsx
// components/artifact/html.tsx
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'

function MyComponent({ content }) {
  return (
    <ArtifactRendererWrapper
      content={content}
      type="html"
      options={{
        enableCache: true,
        enableLazyLoading: true,
        enableSanitization: true
      }}
      onRenderComplete={(result) => {
        console.log('Rendered in', result.renderTime, 'ms')
      }}
    />
  )
}
```

#### 2.2 Migrar ReactArtifact

**Antes:**
```jsx
// components/artifact/react.tsx
import { ReactArtifact } from './react'

function ReactRenderer({ code, onCapture }) {
  return (
    <ReactArtifact
      code={code}
      onCapture={onCapture}
      onError={(error) => console.error(error)}
    />
  )
}
```

**Después:**
```jsx
// components/artifact/react.tsx
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'

function ReactRenderer({ code, onCapture }) {
  return (
    <ArtifactRendererWrapper
      content={code}
      type="react"
      options={{
        enableCache: true,
        enableLazyLoading: true,
        timeout: 10000
      }}
      onRenderComplete={(result) => {
        console.log('React rendered successfully')
        // Mantener funcionalidad de captura si es necesaria
        if (onCapture) {
          // Implementar lógica de captura con el nuevo sistema
        }
      }}
      onError={(error) => console.error('Render error:', error)}
    />
  )
}
```

#### 2.3 Migrar Componente Principal

**Antes:**
```jsx
// components/artifact/index.tsx
import { HTMLArtifact } from './html'
import { ReactArtifact } from './react'

export function ArtifactRenderer({ content, type }) {
  switch (type) {
    case 'html':
      return <HTMLArtifact content={content} />
    case 'react':
      return <ReactArtifact code={content} />
    default:
      return <div>Unsupported type</div>
  }
}
```

**Después:**
```jsx
// components/artifact/index.tsx
import { ArtifactRendererWrapper } from '@/src/components/renderer/ArtifactRendererWrapper'

export function ArtifactRenderer({ content, type, ...props }) {
  return (
    <ArtifactRendererWrapper
      content={content}
      type={type}
      options={{
        enableCache: true,
        enableLazyLoading: true,
        enableMinification: true,
        enableSanitization: true
      }}
      {...props}
    />
  )
}

// Mantener exports para compatibilidad
export { ArtifactRenderer as HTMLArtifact }
export { ArtifactRenderer as ReactArtifact }
```

### Fase 3: Configuración Avanzada

#### 3.1 Configurar Cache

```javascript
// src/config/renderer.js
import { CacheManager } from '@/src/utils/renderer/cacheManager'

export const rendererCache = new CacheManager({
  maxSize: 100,
  defaultTTL: 300000, // 5 minutos
  strategy: 'lru',
  enableMetrics: true
})

// Configuración específica por tipo
export const cacheConfig = {
  html: { ttl: 600000 },      // 10 minutos
  react: { ttl: 300000 },     // 5 minutos
  markdown: { ttl: 900000 }   // 15 minutos
}
```

#### 3.2 Configurar Monitoreo

```javascript
// src/config/monitoring.js
import performanceMonitor from '@/src/utils/PerformanceMonitor'

// Configurar umbrales
performanceMonitor.setThresholds({
  slowRender: 2000,
  errorRate: 0.05,
  cacheHitRate: 0.7
})

// Configurar alertas
performanceMonitor.onAlert((alert) => {
  if (alert.severity === 'high') {
    // Enviar notificación crítica
    console.error('Critical performance alert:', alert)
  }
})
```

### Fase 4: Testing y Validación

#### 4.1 Tests de Compatibilidad

```javascript
// src/__tests__/migration.test.js
import { render } from '@testing-library/react'
import { ArtifactRenderer } from '@/components/artifact'

describe('Migration Compatibility', () => {
  test('HTML rendering maintains compatibility', () => {
    const content = '<div>Hello World</div>'
    const { container } = render(
      <ArtifactRenderer content={content} type="html" />
    )
    
    expect(container.innerHTML).toContain('Hello World')
  })

  test('React rendering maintains compatibility', () => {
    const code = 'function App() { return <div>React App</div> }'
    const { container } = render(
      <ArtifactRenderer content={code} type="react" />
    )
    
    // Verificar que el componente se renderiza
    expect(container).toBeTruthy()
  })

  test('Error handling maintains compatibility', () => {
    const invalidContent = '<div>Unclosed tag'
    const onError = jest.fn()
    
    render(
      <ArtifactRenderer 
        content={invalidContent} 
        type="html" 
        onError={onError}
      />
    )
    
    // Verificar que los errores se manejan correctamente
    expect(onError).toHaveBeenCalled()
  })
})
```

#### 4.2 Tests de Performance

```javascript
// src/__tests__/performance.test.js
import { performance } from 'perf_hooks'
import { OptimizedArtifactRenderer } from '@/src/components/renderer/OptimizedArtifactRenderer'

describe('Performance Improvements', () => {
  test('Rendering is faster than legacy system', async () => {
    const content = '<div>'.repeat(1000) + 'Content' + '</div>'.repeat(1000)
    
    const start = performance.now()
    await OptimizedArtifactRenderer.render(content, 'html')
    const end = performance.now()
    
    const renderTime = end - start
    expect(renderTime).toBeLessThan(1000) // Menos de 1 segundo
  })

  test('Cache improves re-rendering performance', async () => {
    const content = '<div>Cached content</div>'
    
    // Primera renderización
    const start1 = performance.now()
    await OptimizedArtifactRenderer.render(content, 'html')
    const end1 = performance.now()
    
    // Segunda renderización (desde cache)
    const start2 = performance.now()
    await OptimizedArtifactRenderer.render(content, 'html')
    const end2 = performance.now()
    
    const firstRender = end1 - start1
    const secondRender = end2 - start2
    
    expect(secondRender).toBeLessThan(firstRender * 0.5) // 50% más rápido
  })
})
```

---

## Cambios en la API

### Props y Configuración

#### Mapeo de Props

| Sistema Anterior | Sistema Nuevo | Notas |
|------------------|---------------|-------|
| `content` | `content` | Sin cambios |
| `type` | `type` | Detección automática disponible |
| `onRender` | `onRenderComplete` | Callback mejorado con métricas |
| `onError` | `onError` | Sin cambios |
| `className` | `className` | Sin cambios |
| `style` | `style` | Sin cambios |
| - | `options` | **Nuevo**: Configuración avanzada |

#### Nuevas Opciones Disponibles

```typescript
interface RenderOptions {
  enableCache?: boolean;          // Cache automático
  enableLazyLoading?: boolean;    // Lazy loading
  enableMinification?: boolean;   // Minificación
  enableSanitization?: boolean;   // Sanitización
  timeout?: number;               // Timeout de renderizado
  bypassCache?: boolean;          // Bypass del cache
  onProgress?: (progress: number) => void; // Callback de progreso
}
```

### Métodos y Utilidades

#### Nuevos Métodos Disponibles

```javascript
// Detección automática de tipo
import { OptimizedArtifactRenderer } from '@/src/components/renderer/OptimizedArtifactRenderer'

const type = OptimizedArtifactRenderer.detectContentType(content)

// Validación de contenido
const validation = OptimizedArtifactRenderer.validateContent(content, 'react')

// Renderizado directo
const result = await OptimizedArtifactRenderer.render(content, 'html', options)
```

#### Utilidades de Migración

```javascript
// src/utils/migration.js
export const migrationUtils = {
  // Convertir props del sistema anterior
  convertLegacyProps(legacyProps) {
    return {
      content: legacyProps.content,
      type: legacyProps.type || 'html',
      options: {
        enableCache: true,
        enableLazyLoading: true,
        timeout: legacyProps.timeout || 5000
      },
      onRenderComplete: legacyProps.onRender,
      onError: legacyProps.onError
    }
  },

  // Verificar compatibilidad
  checkCompatibility(component) {
    const issues = []
    
    if (component.props.unsupportedProp) {
      issues.push('unsupportedProp is no longer supported')
    }
    
    return {
      isCompatible: issues.length === 0,
      issues
    }
  }
}
```

---

## Configuración

### Configuración de Migración

#### Feature Flags

```javascript
// src/config/migration.js
export const migrationConfig = {
  // Habilitar migración gradual
  enableGradualMigration: true,
  
  // Porcentaje de usuarios en el nuevo sistema
  newSystemPercentage: 25,
  
  // Fallback al sistema anterior en caso de error
  fallbackToLegacy: true,
  
  // Componentes migrados
  migratedComponents: [
    'HTMLArtifact',
    'ReactArtifact'
  ],
  
  // Configuración por componente
  componentConfig: {
    HTMLArtifact: {
      enableCache: true,
      enableLazyLoading: true
    },
    ReactArtifact: {
      enableCache: true,
      timeout: 10000
    }
  }
}
```

#### Wrapper de Migración

```javascript
// src/components/MigrationWrapper.jsx
import React from 'react'
import { migrationConfig } from '@/src/config/migration'
import { ArtifactRendererWrapper } from './renderer/ArtifactRendererWrapper'
import { LegacyRenderer } from './artifact/LegacyRenderer'

export function MigrationWrapper({ component, ...props }) {
  const shouldUseLegacy = () => {
    // Lógica para determinar si usar sistema anterior
    if (!migrationConfig.enableGradualMigration) return false
    if (!migrationConfig.migratedComponents.includes(component)) return true
    
    // A/B testing basado en porcentaje
    const userHash = getUserHash()
    return userHash > migrationConfig.newSystemPercentage
  }

  const [useLegacy, setUseLegacy] = React.useState(shouldUseLegacy())
  const [error, setError] = React.useState(null)

  const handleError = (err) => {
    console.error('New system error:', err)
    setError(err)
    
    // Fallback al sistema anterior si está habilitado
    if (migrationConfig.fallbackToLegacy) {
      setUseLegacy(true)
    }
  }

  if (useLegacy || error) {
    return <LegacyRenderer {...props} />
  }

  return (
    <ArtifactRendererWrapper
      {...props}
      onError={handleError}
      options={{
        ...migrationConfig.componentConfig[component],
        ...props.options
      }}
    />
  )
}
```

### Variables de Entorno de Migración

```bash
# .env.local

# Configuración de migración
NEXT_PUBLIC_MIGRATION_ENABLED=true
NEXT_PUBLIC_MIGRATION_PERCENTAGE=25
NEXT_PUBLIC_FALLBACK_ENABLED=true

# Configuración del nuevo sistema
NEXT_PUBLIC_RENDERER_OPTIMIZATION=true
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_PERFORMANCE_MONITORING=true

# Debug y logging
NEXT_PUBLIC_MIGRATION_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL=info
```

---

## Testing y Validación

### Plan de Testing

#### 1. Tests Unitarios

```bash
# Ejecutar tests de migración
npm run test:migration

# Tests específicos por componente
npm run test:html-migration
npm run test:react-migration

# Tests de performance
npm run test:performance
```

#### 2. Tests de Integración

```javascript
// src/__tests__/integration/migration.test.js
describe('Migration Integration Tests', () => {
  test('Full page rendering with mixed components', () => {
    // Test de página completa con componentes migrados y no migrados
  })

  test('Error handling and fallback behavior', () => {
    // Test de manejo de errores y fallback
  })

  test('Performance metrics collection', () => {
    // Test de recolección de métricas
  })
})
```

#### 3. Tests de Carga

```javascript
// scripts/load-test-migration.js
const { performance } = require('perf_hooks')

async function loadTestMigration() {
  const results = []
  
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    
    // Simular renderizado
    await simulateRender()
    
    const end = performance.now()
    results.push(end - start)
  }
  
  const avgTime = results.reduce((a, b) => a + b) / results.length
  console.log(`Average render time: ${avgTime}ms`)
}
```

### Métricas de Validación

#### KPIs de Migración

```javascript
// src/utils/migrationMetrics.js
export const migrationMetrics = {
  // Métricas de performance
  renderTime: {
    before: 800, // ms promedio antes
    target: 400, // ms objetivo después
    current: 0   // ms actual
  },
  
  // Métricas de estabilidad
  errorRate: {
    before: 0.12, // 12% antes
    target: 0.03, // 3% objetivo
    current: 0    // % actual
  },
  
  // Métricas de adopción
  adoption: {
    target: 100,  // % objetivo
    current: 0    // % actual
  }
}

export function trackMigrationProgress() {
  const metrics = performanceMonitor.getMetrics()
  
  migrationMetrics.renderTime.current = metrics.rendering.averageRenderTime
  migrationMetrics.errorRate.current = metrics.summary.performance.errorRate / 100
  
  // Calcular progreso
  const progress = {
    performance: calculateImprovement(
      migrationMetrics.renderTime.before,
      migrationMetrics.renderTime.current,
      migrationMetrics.renderTime.target
    ),
    stability: calculateImprovement(
      migrationMetrics.errorRate.before,
      migrationMetrics.errorRate.current,
      migrationMetrics.errorRate.target
    )
  }
  
  return progress
}
```

---

## Rollback y Contingencia

### Plan de Rollback

#### 1. Rollback Inmediato

```javascript
// src/utils/rollback.js
export function emergencyRollback() {
  // Deshabilitar nuevo sistema inmediatamente
  localStorage.setItem('FORCE_LEGACY_RENDERER', 'true')
  
  // Notificar al equipo
  console.error('Emergency rollback activated')
  
  // Recargar página para aplicar cambios
  window.location.reload()
}

// Trigger automático en caso de errores críticos
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('RENDERER_CRITICAL_ERROR')) {
    emergencyRollback()
  }
})
```

#### 2. Rollback Gradual

```javascript
// src/config/rollback.js
export const rollbackConfig = {
  // Reducir porcentaje gradualmente
  rollbackSteps: [75, 50, 25, 0],
  
  // Tiempo entre pasos (minutos)
  stepInterval: 15,
  
  // Condiciones para rollback automático
  autoRollbackConditions: {
    errorRate: 0.1,      // 10% de errores
    performanceDrop: 0.5 // 50% degradación
  }
}

export function initiateGradualRollback() {
  rollbackConfig.rollbackSteps.forEach((percentage, index) => {
    setTimeout(() => {
      migrationConfig.newSystemPercentage = percentage
      console.log(`Rollback step ${index + 1}: ${percentage}% on new system`)
    }, index * rollbackConfig.stepInterval * 60 * 1000)
  })
}
```

### Monitoreo de Salud

```javascript
// src/utils/healthCheck.js
export function performHealthCheck() {
  const metrics = performanceMonitor.getMetrics()
  const health = {
    performance: metrics.summary.performance.overallHealth,
    errorRate: metrics.summary.performance.errorRate,
    cacheHitRate: metrics.cache.hitRate
  }
  
  // Verificar condiciones críticas
  const isCritical = 
    health.errorRate > rollbackConfig.autoRollbackConditions.errorRate ||
    health.performance < 50
  
  if (isCritical) {
    console.warn('Critical health detected, initiating rollback')
    initiateGradualRollback()
  }
  
  return health
}

// Ejecutar health check cada 5 minutos
setInterval(performHealthCheck, 5 * 60 * 1000)
```

---

## FAQ y Problemas Comunes

### Preguntas Frecuentes

#### Q: ¿Puedo migrar solo algunos componentes?
**A:** Sí, la migración está diseñada para ser gradual. Puedes migrar componente por componente usando el `MigrationWrapper`.

#### Q: ¿Qué pasa si el nuevo sistema falla?
**A:** El sistema incluye fallback automático al sistema anterior si está habilitado en la configuración.

#### Q: ¿Cómo verifico que la migración fue exitosa?
**A:** Usa el dashboard de performance para monitorear métricas en tiempo real y compara con los KPIs establecidos.

#### Q: ¿Puedo revertir la migración?
**A:** Sí, el sistema incluye herramientas de rollback tanto manual como automático.

### Problemas Comunes

#### 1. Componentes No Se Renderizan

**Síntomas:**
- Pantalla en blanco
- Error en consola: "Cannot read property of undefined"

**Solución:**
```javascript
// Verificar que el contenido es válido
if (!content || typeof content !== 'string') {
  console.error('Invalid content provided to renderer')
  return <div>Error: Invalid content</div>
}

// Verificar configuración
const options = {
  enableCache: true,
  enableLazyLoading: true,
  timeout: 10000 // Aumentar timeout si es necesario
}
```

#### 2. Performance Degradado

**Síntomas:**
- Renderizado más lento que antes
- Alertas de performance en el dashboard

**Solución:**
```javascript
// Optimizar configuración
const optimizedOptions = {
  enableCache: true,        // Asegurar que cache está habilitado
  enableLazyLoading: true,  // Habilitar lazy loading
  enableMinification: true, // Habilitar minificación
  timeout: 5000            // Reducir timeout si es apropiado
}

// Verificar tamaño del contenido
if (content.length > 50000) {
  console.warn('Large content detected, consider chunking')
}
```

#### 3. Errores de Compatibilidad

**Síntomas:**
- Props no reconocidas
- Funcionalidad faltante

**Solución:**
```javascript
// Usar wrapper de compatibilidad
import { LegacyCompatWrapper } from '@/src/components/renderer/LegacyCompatWrapper'

// Mapear props manualmente si es necesario
const mappedProps = migrationUtils.convertLegacyProps(originalProps)
```

#### 4. Cache No Funciona

**Síntomas:**
- Hit rate 0%
- No mejora en re-renderizado

**Solución:**
```javascript
// Verificar configuración de cache
import { rendererCache } from '@/src/config/renderer'

console.log('Cache size:', rendererCache.size())
console.log('Cache metrics:', rendererCache.getMetrics())

// Limpiar cache si es necesario
rendererCache.clear()
```

### Herramientas de Debug

#### Debug de Migración

```javascript
// src/utils/migrationDebug.js
export const migrationDebug = {
  logComponentUsage(component, props) {
    if (process.env.NEXT_PUBLIC_MIGRATION_DEBUG === 'true') {
      console.log(`[MIGRATION] ${component}:`, {
        props,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    }
  },

  logPerformance(component, renderTime, fromCache) {
    if (process.env.NEXT_PUBLIC_MIGRATION_DEBUG === 'true') {
      console.log(`[PERFORMANCE] ${component}:`, {
        renderTime,
        fromCache,
        timestamp: new Date().toISOString()
      })
    }
  },

  logError(component, error) {
    console.error(`[MIGRATION ERROR] ${component}:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }
}
```

#### Validador de Migración

```javascript
// scripts/validate-migration.js
const fs = require('fs')
const path = require('path')

function validateMigration() {
  const issues = []
  
  // Verificar que todos los componentes legacy han sido migrados
  const legacyComponents = findLegacyComponents()
  if (legacyComponents.length > 0) {
    issues.push(`Legacy components found: ${legacyComponents.join(', ')}`)
  }
  
  // Verificar configuración
  const config = require('../src/config/migration.js')
  if (!config.migrationConfig.enableGradualMigration) {
    issues.push('Gradual migration not enabled')
  }
  
  // Verificar tests
  const testFiles = findTestFiles()
  if (testFiles.length === 0) {
    issues.push('No migration tests found')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

function findLegacyComponents() {
  // Implementar búsqueda de componentes legacy
  return []
}

function findTestFiles() {
  // Implementar búsqueda de archivos de test
  return []
}

// Ejecutar validación
const result = validateMigration()
if (!result.isValid) {
  console.error('Migration validation failed:')
  result.issues.forEach(issue => console.error(`- ${issue}`))
  process.exit(1)
} else {
  console.log('Migration validation passed ✅')
}
```

---

## Checklist de Migración

### Pre-Migración
- [ ] Backup del sistema actual creado
- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] Plan de rollback definido
- [ ] Tests de migración escritos

### Durante la Migración
- [ ] Componentes migrados uno por uno
- [ ] Tests ejecutados después de cada migración
- [ ] Métricas de performance monitoreadas
- [ ] Errores documentados y resueltos
- [ ] Feedback del equipo recopilado

### Post-Migración
- [ ] Todos los componentes migrados
- [ ] Tests de integración pasando
- [ ] Performance mejorado según KPIs
- [ ] Documentación actualizada
- [ ] Equipo entrenado en nuevo sistema
- [ ] Monitoreo de producción configurado

---

Esta guía proporciona un framework completo para migrar al nuevo sistema de renderización de manera segura y eficiente. Para soporte adicional, consultar la documentación técnica y el equipo de desarrollo.
