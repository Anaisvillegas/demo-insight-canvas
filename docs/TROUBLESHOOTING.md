# Guía de Troubleshooting - Sistema de Renderización Optimizado

## Descripción General

Esta guía proporciona soluciones para problemas comunes del sistema de renderización optimizado, incluyendo diagnóstico, resolución paso a paso, y herramientas de debug.

## Tabla de Contenidos

- [Diagnóstico Rápido](#diagnóstico-rápido)
- [Problemas de Renderizado](#problemas-de-renderizado)
- [Problemas de Performance](#problemas-de-performance)
- [Problemas de Cache](#problemas-de-cache)
- [Problemas de Configuración](#problemas-de-configuración)
- [Errores de Migración](#errores-de-migración)
- [Herramientas de Debug](#herramientas-de-debug)
- [Logs y Monitoreo](#logs-y-monitoreo)
- [Escalación y Soporte](#escalación-y-soporte)

---

## Diagnóstico Rápido

### Checklist de Diagnóstico Inicial

```javascript
// src/utils/diagnostics.js
export const quickDiagnostic = {
  // Verificar estado del sistema
  checkSystemHealth() {
    const checks = {
      rendererLoaded: !!window.OptimizedArtifactRenderer,
      cacheEnabled: !!window.rendererCache,
      performanceMonitoring: !!window.performanceMonitor,
      configValid: this.validateConfig()
    }
    
    console.log('🔍 System Health Check:', checks)
    return checks
  },

  // Validar configuración
  validateConfig() {
    try {
      const config = {
        optimization: process.env.NEXT_PUBLIC_RENDERER_OPTIMIZATION,
        cache: process.env.NEXT_PUBLIC_CACHE_ENABLED,
        monitoring: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING
      }
      
      return Object.values(config).every(val => val !== undefined)
    } catch (error) {
      console.error('Config validation failed:', error)
      return false
    }
  },

  // Test básico de renderizado
  async testBasicRender() {
    try {
      const { OptimizedArtifactRenderer } = await import('@/src/components/renderer/OptimizedArtifactRenderer')
      const result = await OptimizedArtifactRenderer.render('<div>Test</div>', 'html')
      
      console.log('✅ Basic render test passed:', result.renderTime + 'ms')
      return true
    } catch (error) {
      console.error('❌ Basic render test failed:', error)
      return false
    }
  }
}

// Ejecutar diagnóstico rápido
quickDiagnostic.checkSystemHealth()
quickDiagnostic.testBasicRender()
```

### Comandos de Diagnóstico

```bash
# Verificar estado del sistema
npm run diagnostic:health

# Test de performance
npm run diagnostic:performance

# Verificar configuración
npm run diagnostic:config

# Test completo
npm run diagnostic:full
```

---

## Problemas de Renderizado

### 1. Contenido No Se Renderiza

#### Síntomas
- Pantalla en blanco
- Componente no aparece
- Error: "Cannot render content"

#### Diagnóstico

```javascript
// Debug paso a paso
const debugRender = async (content, type) => {
  console.log('🔍 Debug Render Start')
  console.log('Content length:', content?.length)
  console.log('Content type:', type)
  console.log('Content preview:', content?.substring(0, 100))
  
  // Verificar contenido válido
  if (!content || typeof content !== 'string') {
    console.error('❌ Invalid content:', typeof content)
    return false
  }
  
  // Verificar tipo
  if (!type) {
    const detectedType = detectContentType(content)
    console.log('🔍 Auto-detected type:', detectedType)
    type = detectedType
  }
  
  // Intentar renderizado
  try {
    const result = await OptimizedArtifactRenderer.render(content, type)
    console.log('✅ Render successful:', result)
    return result
  } catch (error) {
    console.error('❌ Render failed:', error)
    return false
  }
}
```

#### Soluciones

**Solución 1: Validar Contenido**
```javascript
// Verificar y limpiar contenido
const validateAndCleanContent = (content) => {
  if (!content) {
    throw new Error('Content is required')
  }
  
  if (typeof content !== 'string') {
    console.warn('Converting content to string')
    content = String(content)
  }
  
  // Limpiar caracteres problemáticos
  content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  return content.trim()
}
```

**Solución 2: Configurar Fallback**
```javascript
// Renderizador con fallback
const RenderWithFallback = ({ content, type, ...props }) => {
  const [error, setError] = useState(null)
  
  if (error) {
    return (
      <div className="render-error">
        <p>Error rendering content: {error.message}</p>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    )
  }
  
  return (
    <ArtifactRendererWrapper
      content={content}
      type={type}
      onError={setError}
      options={{
        enableCache: true,
        timeout: 10000,
        fallbackRenderer: 'basic'
      }}
      {...props}
    />
  )
}
```

### 2. Renderizado Lento o Colgado

#### Síntomas
- Renderizado toma >5 segundos
- Interfaz se congela
- Timeout errors

#### Diagnóstico

```javascript
// Monitor de timeout
const timeoutMonitor = {
  activeRenders: new Map(),
  
  startTracking(operationId, timeout = 5000) {
    const startTime = Date.now()
    this.activeRenders.set(operationId, startTime)
    
    setTimeout(() => {
      if (this.activeRenders.has(operationId)) {
        console.warn(`⚠️ Render timeout: ${operationId} (${timeout}ms)`)
        this.activeRenders.delete(operationId)
      }
    }, timeout)
  },
  
  endTracking(operationId) {
    const startTime = this.activeRenders.get(operationId)
    if (startTime) {
      const duration = Date.now() - startTime
      console.log(`✅ Render completed: ${operationId} (${duration}ms)`)
      this.activeRenders.delete(operationId)
    }
  }
}
```

#### Soluciones

**Solución 1: Optimizar Contenido Grande**
```javascript
// Chunking para contenido grande
const renderLargeContent = async (content, type, options = {}) => {
  const CHUNK_SIZE = 50000 // 50KB chunks
  
  if (content.length > CHUNK_SIZE) {
    console.log('📦 Chunking large content')
    
    // Dividir contenido
    const chunks = []
    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
      chunks.push(content.substring(i, i + CHUNK_SIZE))
    }
    
    // Renderizar chunks progresivamente
    const results = []
    for (const chunk of chunks) {
      const result = await OptimizedArtifactRenderer.render(chunk, type, {
        ...options,
        enableLazyLoading: true
      })
      results.push(result)
    }
    
    return combineResults(results)
  }
  
  return OptimizedArtifactRenderer.render(content, type, options)
}
```

**Solución 2: Web Workers**
```javascript
// Renderizado en Web Worker
const workerRenderer = {
  worker: null,
  
  init() {
    this.worker = new Worker('/workers/renderer-worker.js')
    this.worker.onmessage = this.handleMessage.bind(this)
  },
  
  async render(content, type, options) {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString()
      
      this.worker.postMessage({
        id,
        action: 'render',
        content,
        type,
        options
      })
      
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'))
      }, options.timeout || 10000)
      
      this.worker.onmessage = (event) => {
        if (event.data.id === id) {
          clearTimeout(timeout)
          if (event.data.error) {
            reject(new Error(event.data.error))
          } else {
            resolve(event.data.result)
          }
        }
      }
    })
  }
}
```

### 3. Errores de Sintaxis

#### Síntomas
- "Syntax Error" en consola
- Contenido React no compila
- HTML malformado

#### Diagnóstico

```javascript
// Validador de sintaxis
const syntaxValidator = {
  validateHTML(content) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, 'text/html')
      const errors = doc.querySelectorAll('parsererror')
      
      if (errors.length > 0) {
        return {
          isValid: false,
          errors: Array.from(errors).map(err => err.textContent)
        }
      }
      
      return { isValid: true, errors: [] }
    } catch (error) {
      return { isValid: false, errors: [error.message] }
    }
  },
  
  validateReact(code) {
    try {
      // Usar Babel para validar sintaxis
      const babel = require('@babel/standalone')
      babel.transform(code, {
        presets: ['react'],
        plugins: ['syntax-jsx']
      })
      
      return { isValid: true, errors: [] }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          line: error.loc?.line,
          column: error.loc?.column,
          message: error.message
        }]
      }
    }
  }
}
```

#### Soluciones

**Solución 1: Auto-corrección**
```javascript
// Auto-corrector de sintaxis
const syntaxFixer = {
  fixHTML(content) {
    // Cerrar tags no cerrados
    content = content.replace(/<(\w+)([^>]*?)(?<!\/)\s*>/g, (match, tag, attrs) => {
      const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link']
      if (selfClosing.includes(tag.toLowerCase())) {
        return `<${tag}${attrs} />`
      }
      return match
    })
    
    // Escapar caracteres especiales
    content = content.replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[\da-f]+);)/gi, '&amp;')
    
    return content
  },
  
  fixReact(code) {
    // Agregar imports faltantes
    if (!code.includes('import React') && code.includes('React')) {
      code = "import React from 'react';\n" + code
    }
    
    // Corregir JSX
    code = code.replace(/class=/g, 'className=')
    code = code.replace(/for=/g, 'htmlFor=')
    
    return code
  }
}
```

---

## Problemas de Performance

### 1. Renderizado Lento

#### Síntomas
- Tiempo de renderizado >2 segundos
- Alertas de performance en dashboard
- UI bloqueada durante renderizado

#### Diagnóstico

```javascript
// Profiler de performance
const performanceProfiler = {
  profiles: new Map(),
  
  startProfile(operationId) {
    const profile = {
      startTime: performance.now(),
      startMemory: performance.memory?.usedJSHeapSize || 0,
      operations: []
    }
    
    this.profiles.set(operationId, profile)
    return profile
  },
  
  addOperation(operationId, operation, duration) {
    const profile = this.profiles.get(operationId)
    if (profile) {
      profile.operations.push({ operation, duration, timestamp: performance.now() })
    }
  },
  
  endProfile(operationId) {
    const profile = this.profiles.get(operationId)
    if (profile) {
      profile.endTime = performance.now()
      profile.endMemory = performance.memory?.usedJSHeapSize || 0
      profile.totalTime = profile.endTime - profile.startTime
      profile.memoryDelta = profile.endMemory - profile.startMemory
      
      console.log('📊 Performance Profile:', profile)
      this.profiles.delete(operationId)
      return profile
    }
  }
}
```

#### Soluciones

**Solución 1: Optimización de Cache**
```javascript
// Cache inteligente
const intelligentCache = {
  // Cache con prioridades
  priorityCache: new Map(),
  
  set(key, value, priority = 'normal', ttl) {
    const item = {
      value,
      priority,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(priority),
      accessCount: 0
    }
    
    this.priorityCache.set(key, item)
    this.cleanup()
  },
  
  get(key) {
    const item = this.priorityCache.get(key)
    if (item) {
      // Verificar TTL
      if (Date.now() - item.timestamp > item.ttl) {
        this.priorityCache.delete(key)
        return null
      }
      
      item.accessCount++
      return item.value
    }
    return null
  },
  
  getDefaultTTL(priority) {
    const ttls = {
      high: 600000,    // 10 minutos
      normal: 300000,  // 5 minutos
      low: 180000      // 3 minutos
    }
    return ttls[priority] || ttls.normal
  },
  
  cleanup() {
    if (this.priorityCache.size > 100) {
      // Eliminar items de baja prioridad y poco acceso
      const items = Array.from(this.priorityCache.entries())
      items.sort((a, b) => {
        const scoreA = this.calculateScore(a[1])
        const scoreB = this.calculateScore(b[1])
        return scoreA - scoreB
      })
      
      // Eliminar 20% de items con menor score
      const toRemove = Math.floor(items.length * 0.2)
      for (let i = 0; i < toRemove; i++) {
        this.priorityCache.delete(items[i][0])
      }
    }
  },
  
  calculateScore(item) {
    const priorityWeight = { high: 3, normal: 2, low: 1 }
    const ageWeight = (Date.now() - item.timestamp) / item.ttl
    return (priorityWeight[item.priority] * item.accessCount) / (1 + ageWeight)
  }
}
```

**Solución 2: Lazy Loading Avanzado**
```javascript
// Lazy loading con intersection observer
const advancedLazyLoader = {
  observer: null,
  
  init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadContent(entry.target)
        }
      })
    }, {
      rootMargin: '50px',
      threshold: 0.1
    })
  },
  
  observe(element, content, type, options) {
    element.dataset.content = content
    element.dataset.type = type
    element.dataset.options = JSON.stringify(options)
    
    // Placeholder mientras carga
    element.innerHTML = '<div class="loading-placeholder">Loading...</div>'
    
    this.observer.observe(element)
  },
  
  async loadContent(element) {
    try {
      const content = element.dataset.content
      const type = element.dataset.type
      const options = JSON.parse(element.dataset.options || '{}')
      
      const result = await OptimizedArtifactRenderer.render(content, type, options)
      element.innerHTML = result.html
      
      this.observer.unobserve(element)
    } catch (error) {
      element.innerHTML = '<div class="error-placeholder">Error loading content</div>'
      console.error('Lazy loading failed:', error)
    }
  }
}
```

### 2. Uso Excesivo de Memoria

#### Síntomas
- Memoria JavaScript >100MB
- Browser se vuelve lento
- Crashes por memoria

#### Diagnóstico

```javascript
// Monitor de memoria
const memoryMonitor = {
  checkMemoryUsage() {
    if (performance.memory) {
      const memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      }
      
      console.log('💾 Memory Usage:', memory)
      
      if (memory.used > 100) {
        console.warn('⚠️ High memory usage detected')
        this.suggestCleanup()
      }
      
      return memory
    }
  },
  
  suggestCleanup() {
    console.log('🧹 Cleanup suggestions:')
    console.log('- Clear cache: rendererCache.clear()')
    console.log('- Reset performance monitor: performanceMonitor.reset()')
    console.log('- Check for memory leaks in components')
  }
}

// Ejecutar cada 30 segundos
setInterval(() => memoryMonitor.checkMemoryUsage(), 30000)
```

#### Soluciones

**Solución 1: Limpieza Automática**
```javascript
// Sistema de limpieza automática
const autoCleanup = {
  thresholds: {
    memory: 80, // MB
    cacheSize: 50,
    renderHistory: 100
  },
  
  init() {
    setInterval(() => this.performCleanup(), 60000) // Cada minuto
  },
  
  performCleanup() {
    const memory = memoryMonitor.checkMemoryUsage()
    
    if (memory && memory.used > this.thresholds.memory) {
      console.log('🧹 Performing automatic cleanup')
      
      // Limpiar cache
      if (rendererCache.size() > this.thresholds.cacheSize) {
        const toRemove = rendererCache.size() - this.thresholds.cacheSize
        console.log(`Removing ${toRemove} cache entries`)
        this.cleanupCache(toRemove)
      }
      
      // Limpiar historial de performance
      const metrics = performanceMonitor.getMetrics()
      if (metrics.rendering.renderTimes?.length > this.thresholds.renderHistory) {
        console.log('Cleaning performance history')
        performanceMonitor.trimHistory(this.thresholds.renderHistory)
      }
      
      // Forzar garbage collection si está disponible
      if (window.gc) {
        window.gc()
      }
    }
  },
  
  cleanupCache(count) {
    const keys = rendererCache.keys()
    const oldestKeys = keys.slice(0, count)
    oldestKeys.forEach(key => rendererCache.delete(key))
  }
}
```

---

## Problemas de Cache

### 1. Cache Hit Rate Bajo

#### Síntomas
- Hit rate <50%
- Renderizado lento en contenido repetido
- Cache metrics muestran muchos misses

#### Diagnóstico

```javascript
// Analizador de cache
const cacheAnalyzer = {
  analyzeHitRate() {
    const metrics = rendererCache.getMetrics()
    console.log('📊 Cache Analysis:')
    console.log(`Hit Rate: ${metrics.hitRate}%`)
    console.log(`Total Requests: ${metrics.totalRequests}`)
    console.log(`Hits: ${metrics.hits}`)
    console.log(`Misses: ${metrics.misses}`)
    
    if (metrics.hitRate < 50) {
      this.suggestImprovements(metrics)
    }
  },
  
  suggestImprovements(metrics) {
    console.log('💡 Cache Improvement Suggestions:')
    
    if (metrics.totalRequests < 10) {
      console.log('- Low request volume, hit rate will improve with usage')
    }
    
    if (rendererCache.size() < 20) {
      console.log('- Consider increasing cache size')
    }
    
    console.log('- Check if content is highly dynamic')
    console.log('- Verify TTL settings are appropriate')
    console.log('- Consider content normalization')
  },
  
  analyzeContentPatterns() {
    const keys = rendererCache.keys()
    const patterns = {}
    
    keys.forEach(key => {
      const type = key.split(':')[0]
      patterns[type] = (patterns[type] || 0) + 1
    })
    
    console.log('📈 Content Patterns:', patterns)
    return patterns
  }
}
```

#### Soluciones

**Solución 1: Optimizar Configuración**
```javascript
// Configuración optimizada de cache
const optimizeCacheConfig = () => {
  // Aumentar tamaño de cache
  rendererCache.setMaxSize(200)
  
  // TTL específico por tipo
  const ttlConfig = {
    html: 600000,      // 10 minutos
    react: 300000,     // 5 minutos
    markdown: 900000,  // 15 minutos
    json: 1200000,     // 20 minutos
    css: 1800000,      // 30 minutos
    javascript: 600000 // 10 minutos
  }
  
  // Aplicar configuración
  Object.entries(ttlConfig).forEach(([type, ttl]) => {
    rendererCache.setTypeTTL(type, ttl)
  })
  
  console.log('✅ Cache configuration optimized')
}
```

**Solución 2: Normalización de Contenido**
```javascript
// Normalizar contenido para mejor cache
const contentNormalizer = {
  normalize(content, type) {
    switch (type) {
      case 'html':
        return this.normalizeHTML(content)
      case 'react':
        return this.normalizeReact(content)
      case 'css':
        return this.normalizeCSS(content)
      default:
        return content.trim()
    }
  },
  
  normalizeHTML(html) {
    return html
      .replace(/\s+/g, ' ')           // Normalizar espacios
      .replace(/>\s+</g, '><')        // Remover espacios entre tags
      .replace(/\s+>/g, '>')          // Remover espacios antes de >
      .replace(/<!--.*?-->/g, '')     // Remover comentarios
      .trim()
  },
  
  normalizeReact(code) {
    return code
      .replace(/\s+/g, ' ')           // Normalizar espacios
      .replace(/;\s*}/g, '}')         // Limpiar punto y coma antes de }
      .replace(/{\s+/g, '{')          // Limpiar espacios después de {
      .replace(/\s+}/g, '}')          // Limpiar espacios antes de }
      .trim()
  },
  
  normalizeCSS(css) {
    return css
      .replace(/\s+/g, ' ')           // Normalizar espacios
      .replace(/;\s*}/g, '}')         // Limpiar punto y coma antes de }
      .replace(/{\s+/g, '{')          // Limpiar espacios después de {
      .replace(/\s*;\s*/g, ';')       // Normalizar punto y coma
      .trim()
  }
}
```

### 2. Cache Corrupto

#### Síntomas
- Contenido incorrecto renderizado
- Errores al recuperar del cache
- Cache metrics inconsistentes

#### Diagnóstico

```javascript
// Validador de cache
const cacheValidator = {
  validateCache() {
    const issues = []
    const keys = rendererCache.keys()
    
    keys.forEach(key => {
      try {
        const value = rendererCache.get(key)
        
        if (!value) {
          issues.push(`Key ${key} returns null`)
          return
        }
        
        if (typeof value !== 'object' || !value.html) {
          issues.push(`Key ${key} has invalid structure`)
          return
        }
        
        if (!value.renderTime || !value.contentType) {
          issues.push(`Key ${key} missing metadata`)
        }
        
      } catch (error) {
        issues.push(`Key ${key} throws error: ${error.message}`)
      }
    })
    
    if (issues.length > 0) {
      console.error('❌ Cache validation failed:')
      issues.forEach(issue => console.error(`- ${issue}`))
    } else {
      console.log('✅ Cache validation passed')
    }
    
    return issues
  },
  
  repairCache() {
    console.log('🔧 Repairing cache...')
    const keys = rendererCache.keys()
    let repaired = 0
    
    keys.forEach(key => {
      try {
        const value = rendererCache.get(key)
        if (!value || typeof value !== 'object') {
          rendererCache.delete(key)
          repaired++
        }
      } catch (error) {
        rendererCache.delete(key)
        repaired++
      }
    })
    
    console.log(`✅ Repaired ${repaired} cache entries`)
    return repaired
  }
}
```

#### Soluciones

**Solución 1: Reconstruir Cache**
```javascript
// Reconstruir cache desde cero
const rebuildCache = async () => {
  console.log('🔄 Rebuilding cache...')
  
  // Backup de contenido importante
  const importantContent = []
  const keys = rendererCache.keys()
  
  keys.forEach(key => {
    try {
      const value = rendererCache.get(key)
      if (value && value.metadata?.important) {
        importantContent.push({ key, value })
      }
    } catch (error) {
      // Ignorar entradas corruptas
    }
  })
  
  // Limpiar cache
  rendererCache.clear()
  
  // Restaurar contenido importante
  for (const item of importantContent) {
    try {
      // Re-renderizar para asegurar validez
      const content = item.value.originalContent
      const type = item.value.contentType
      
      if (content && type) {
        const result = await OptimizedArtifactRenderer.render(content, type)
        rendererCache.set(item.key, result)
      }
    } catch (error) {
      console.warn(`Failed to restore ${item.key}:`, error)
    }
  }
  
  console.log('✅ Cache rebuilt successfully')
}
```

---

## Problemas de Configuración

### 1. Variables de Entorno No Funcionan

#### Síntomas
- Configuración no se aplica
- Features no se habilitan
- Valores por defecto siempre activos

#### Diagnóstico

```javascript
// Verificador de configuración
const configChecker = {
  checkEnvironment() {
    const envVars = {
      'NEXT_PUBLIC_RENDERER_OPTIMIZATION': process.env.NEXT_PUBLIC_RENDERER_OPTIMIZATION,
      'NEXT_PUBLIC_CACHE_ENABLED': process.env.NEXT_PUBLIC_CACHE_ENABLED,
      'NEXT_PUBLIC_PERFORMANCE_MONITORING': process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING,
      'NEXT_PUBLIC_CACHE_MAX_SIZE': process.env.NEXT_PUBLIC_CACHE_MAX_SIZE,
      'NEXT_PUBLIC_CACHE_TTL': process.env.NEXT_PUBLIC_CACHE_TTL
    }
    
    console.log('🔧 Environment Variables:')
    Object.entries(envVars).forEach(([key, value]) => {
      const status = value ? '✅' : '❌'
      console.log(`${status} ${key}: ${value || 'undefined'}`)
    })
    
    return envVars
  },
  
  validateConfig() {
    const config = this.checkEnvironment()
    const issues = []
    
    if (!config.NEXT_PUBLIC_RENDERER_OPTIMIZATION) {
      issues.push('Renderer optimization not enabled')
    }
    
    if (!config.NEXT_PUBLIC_CACHE_ENABLED) {
      issues.push('Cache not enabled')
    }
    
    if (config.NEXT_PUBLIC_CACHE_MAX_SIZE && isNaN(Number(config.NEXT_PUBLIC_CACHE_MAX_SIZE))) {
      issues.push('Invalid cache max size')
    }
    
    return issues
  }
}
```

#### Soluciones

**Solución 1: Verificar Archivos de Configuración**
```bash
# Verificar .env files
ls -la .env*

# Verificar contenido
cat .env.local
cat .env.development
cat .env.production
```

**Solución 2: Configuración Programática**
```javascript
// Configuración de fallback
const ensureConfig = () => {
  // Valores por defecto si las env vars no están disponibles
  const defaultConfig = {
    rendererOptimization: true,
    cacheEnabled: true,
    performanceMonitoring: true,
    cacheMaxSize: 100,
    cacheTTL: 300000
  }
  
  // Aplicar configuración
  window.rendererConfig = {
    optimization: process.env.NEXT_PUBLIC_RENDERER_OPTIMIZATION === 'true' || defaultConfig.rendererOptimization,
    cache: process.env.NEXT_PUBLIC_CACHE_ENABLED === 'true' || defaultConfig.cacheEnabled,
    monitoring: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING === 'true' || defaultConfig.performanceMonitoring,
    cacheMaxSize: Number(process.env.NEXT_PUBLIC_CACHE_MAX_SIZE) || defaultConfig.cacheMaxSize,
    cacheTTL: Number(process.env.NEXT_PUBLIC_CACHE_TTL) || defaultConfig.cacheTTL
