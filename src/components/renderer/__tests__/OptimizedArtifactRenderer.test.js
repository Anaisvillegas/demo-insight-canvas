/**
 * OptimizedArtifactRenderer.test.js
 * 
 * Tests completos para el OptimizedArtifactRenderer
 * Incluye tests de inicialización, renderizado, errores, cache y performance
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { OptimizedArtifactRenderer } from '../OptimizedArtifactRenderer'
import { FEATURE_FLAGS } from '@/src/config/featureFlags'

// Mock del sistema de cache
jest.mock('../../../utils/renderer/cacheManager', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
    cleanup: jest.fn(),
  })),
}))

// Mock del detector de contenido
jest.mock('../../../utils/renderer/contentDetector', () => ({
  ContentDetector: jest.fn().mockImplementation(() => ({
    detectType: jest.fn((content) => {
      if (content.includes('<div>')) return 'html'
      if (content.includes('const ') || content.includes('function ')) return 'react'
      return 'text'
    }),
    validateContent: jest.fn(() => ({ isValid: true, errors: [] })),
    sanitizeContent: jest.fn((content) => content),
  })),
}))

// Mock del monitor de performance
jest.mock('../../../utils/renderer/performanceMonitor', () => ({
  PerformanceMonitor: jest.fn().mockImplementation(() => ({
    startMeasurement: jest.fn(() => 'test-id'),
    endMeasurement: jest.fn(),
    getMetrics: jest.fn(() => ({
      averageRenderTime: 100,
      totalRenders: 1,
      errorRate: 0,
    })),
    cleanup: jest.fn(),
  })),
}))

describe('OptimizedArtifactRenderer', () => {
  let mockContainer
  let mockIframe
  let mockContentWindow

  beforeEach(() => {
    // Mock del iframe y su contenido
    mockContentWindow = {
      postMessage: jest.fn(),
      document: {
        body: {
          innerHTML: '',
        },
        createElement: jest.fn(() => ({
          setAttribute: jest.fn(),
          appendChild: jest.fn(),
        })),
      },
    }

    mockIframe = {
      contentWindow: mockContentWindow,
      onload: null,
      onerror: null,
      src: '',
      style: {},
      setAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockContainer = {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(() => mockIframe),
      style: {},
    }

    // Mock de document.createElement para iframe
    const originalCreateElement = document.createElement
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'iframe') {
        return mockIframe
      }
      return originalCreateElement.call(document, tagName)
    })

    // Mock de querySelector para container
    document.querySelector = jest.fn(() => mockContainer)

    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    document.createElement.mockRestore?.()
    document.querySelector.mockRestore?.()
  })

  describe('Inicialización', () => {
    test('debe inicializarse correctamente con configuración por defecto', () => {
      const renderer = new OptimizedArtifactRenderer()
      
      expect(renderer).toBeDefined()
      expect(renderer.isInitialized).toBe(false)
      expect(renderer.config).toBeDefined()
      expect(renderer.config.type).toBe('html')
    })

    test('debe inicializarse con configuración personalizada', () => {
      const customConfig = {
        type: 'react',
        enableCache: false,
        timeout: 10000,
      }
      
      const renderer = new OptimizedArtifactRenderer(customConfig)
      
      expect(renderer.config.type).toBe('react')
      expect(renderer.config.enableCache).toBe(false)
      expect(renderer.config.timeout).toBe(10000)
    })

    test('debe inicializar componentes internos correctamente', async () => {
      const renderer = new OptimizedArtifactRenderer()
      await renderer.init()
      
      expect(renderer.isInitialized).toBe(true)
      expect(renderer.cacheManager).toBeDefined()
      expect(renderer.contentDetector).toBeDefined()
      expect(renderer.performanceMonitor).toBeDefined()
    })

    test('debe manejar errores durante la inicialización', async () => {
      const renderer = new OptimizedArtifactRenderer()
      
      // Simular error en la inicialización
      renderer.setupEventListeners = jest.fn(() => {
        throw new Error('Setup failed')
      })
      
      await expect(renderer.init()).rejects.toThrow('Setup failed')
      expect(renderer.isInitialized).toBe(false)
    })
  })

  describe('Renderizado de Contenido', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer()
      await renderer.init()
    })

    test('debe renderizar contenido HTML correctamente', async () => {
      const htmlContent = '<div>Hello World</div>'
      
      const result = await renderer.render(htmlContent, mockContainer)
      
      expect(result.success).toBe(true)
      expect(mockContainer.appendChild).toHaveBeenCalled()
      expect(mockIframe.src).toContain('renderer-frame.html')
    })

    test('debe renderizar contenido React correctamente', async () => {
      const reactContent = 'const App = () => <div>React Component</div>'
      
      renderer.config.type = 'react'
      const result = await renderer.render(reactContent, mockContainer)
      
      expect(result.success).toBe(true)
      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'render',
          content: reactContent,
          contentType: 'react',
        }),
        '*'
      )
    })

    test('debe detectar automáticamente el tipo de contenido', async () => {
      const htmlContent = '<div>Auto-detected HTML</div>'
      
      renderer.config.type = 'auto'
      await renderer.render(htmlContent, mockContainer)
      
      expect(renderer.contentDetector.detectType).toHaveBeenCalledWith(htmlContent)
    })

    test('debe manejar contenido vacío', async () => {
      const result = await renderer.render('', mockContainer)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Content is required')
    })

    test('debe manejar contenido inválido', async () => {
      const invalidContent = '<script>alert("xss")</script>'
      
      // Mock para que el detector marque como inválido
      renderer.contentDetector.validateContent.mockReturnValue({
        isValid: false,
        errors: ['Script tags not allowed'],
      })
      
      const result = await renderer.render(invalidContent, mockContainer)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Content validation failed')
    })

    test('debe aplicar timeout correctamente', async () => {
      renderer.config.timeout = 1000
      
      // No simular carga del iframe para que haga timeout
      const renderPromise = renderer.render('<div>Test</div>', mockContainer)
      
      // Avanzar el tiempo para activar el timeout
      jest.advanceTimersByTime(1500)
      
      const result = await renderPromise
      expect(result.success).toBe(false)
      expect(result.error).toContain('Render timeout')
    })
  })

  describe('Sistema de Cache', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer({ enableCache: true })
      await renderer.init()
    })

    test('debe usar cache para contenido previamente renderizado', async () => {
      const content = '<div>Cached content</div>'
      const cacheKey = 'test-cache-key'
      
      // Mock cache hit
      renderer.cacheManager.get.mockReturnValue({
        html: '<div>Cached result</div>',
        timestamp: Date.now(),
      })
      
      const result = await renderer.render(content, mockContainer)
      
      expect(renderer.cacheManager.get).toHaveBeenCalled()
      expect(result.fromCache).toBe(true)
    })

    test('debe guardar resultado en cache después del renderizado', async () => {
      const content = '<div>New content</div>'
      
      // Mock cache miss
      renderer.cacheManager.get.mockReturnValue(null)
      
      // Simular renderizado exitoso
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      await renderer.render(content, mockContainer)
      
      expect(renderer.cacheManager.set).toHaveBeenCalled()
    })

    test('debe limpiar cache cuando esté lleno', async () => {
      const content = '<div>Content to cache</div>'
      
      // Mock cache lleno
      renderer.cacheManager.set.mockImplementation(() => {
        throw new Error('Cache full')
      })
      
      await renderer.render(content, mockContainer)
      
      expect(renderer.cacheManager.cleanup).toHaveBeenCalled()
    })
  })

  describe('Manejo de Errores', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer()
      await renderer.init()
    })

    test('debe manejar errores de carga del iframe', async () => {
      const content = '<div>Test content</div>'
      
      // Simular error de carga
      setTimeout(() => {
        if (mockIframe.onerror) {
          mockIframe.onerror(new Error('Failed to load iframe'))
        }
      }, 100)
      
      const result = await renderer.render(content, mockContainer)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to load iframe')
    })

    test('debe manejar errores de postMessage', async () => {
      const content = '<div>Test content</div>'
      
      // Mock error en postMessage
      mockContentWindow.postMessage.mockImplementation(() => {
        throw new Error('PostMessage failed')
      })
      
      // Simular carga exitosa del iframe
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result = await renderer.render(content, mockContainer)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('PostMessage failed')
    })

    test('debe recuperarse de errores y continuar funcionando', async () => {
      const content1 = '<div>First content</div>'
      const content2 = '<div>Second content</div>'
      
      // Primer renderizado falla
      mockContentWindow.postMessage.mockImplementationOnce(() => {
        throw new Error('First render failed')
      })
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result1 = await renderer.render(content1, mockContainer)
      expect(result1.success).toBe(false)
      
      // Segundo renderizado debe funcionar
      mockContentWindow.postMessage.mockImplementation(() => {})
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result2 = await renderer.render(content2, mockContainer)
      expect(result2.success).toBe(true)
    })

    test('debe registrar errores para debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const content = '<div>Test content</div>'
      
      // Simular error
      setTimeout(() => {
        if (mockIframe.onerror) {
          mockIframe.onerror(new Error('Test error'))
        }
      }, 100)
      
      await renderer.render(content, mockContainer)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OptimizedArtifactRenderer]'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer({
        enablePerformanceMonitoring: true,
      })
      await renderer.init()
    })

    test('debe medir tiempo de renderizado', async () => {
      const content = '<div>Performance test</div>'
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      await renderer.render(content, mockContainer)
      
      expect(renderer.performanceMonitor.startMeasurement).toHaveBeenCalled()
      expect(renderer.performanceMonitor.endMeasurement).toHaveBeenCalled()
    })

    test('debe proporcionar métricas de performance', () => {
      const metrics = renderer.getStats()
      
      expect(metrics).toBeDefined()
      expect(metrics.performance).toBeDefined()
      expect(metrics.cache).toBeDefined()
      expect(typeof metrics.performance.averageRenderTime).toBe('number')
    })

    test('debe detectar renderizados lentos', async () => {
      const content = '<div>Slow render test</div>'
      
      // Mock renderizado lento
      renderer.performanceMonitor.endMeasurement.mockReturnValue(6000) // 6 segundos
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result = await renderer.render(content, mockContainer)
      
      expect(result.performance).toBeDefined()
      expect(result.performance.renderTime).toBeGreaterThan(5000)
    })

    test('debe optimizar renderizados repetidos', async () => {
      const content = '<div>Repeated content</div>'
      
      // Primer renderizado
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result1 = await renderer.render(content, mockContainer)
      
      // Segundo renderizado del mismo contenido
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result2 = await renderer.render(content, mockContainer)
      
      // El segundo debería ser más rápido (desde cache)
      expect(result2.fromCache).toBe(true)
    })
  })

  describe('Cleanup y Gestión de Memoria', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer()
      await renderer.init()
    })

    test('debe limpiar recursos correctamente', () => {
      renderer.cleanup()
      
      expect(renderer.cacheManager.cleanup).toHaveBeenCalled()
      expect(renderer.performanceMonitor.cleanup).toHaveBeenCalled()
      expect(renderer.isInitialized).toBe(false)
    })

    test('debe remover event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      renderer.cleanup()
      
      expect(removeEventListenerSpy).toHaveBeenCalled()
      removeEventListenerSpy.mockRestore()
    })

    test('debe limpiar iframes huérfanos', async () => {
      const content = '<div>Test content</div>'
      
      await renderer.render(content, mockContainer)
      renderer.cleanup()
      
      expect(mockContainer.removeChild).toHaveBeenCalled()
    })

    test('debe manejar cleanup múltiple sin errores', () => {
      expect(() => {
        renderer.cleanup()
        renderer.cleanup()
        renderer.cleanup()
      }).not.toThrow()
    })
  })

  describe('Integración con Feature Flags', () => {
    test('debe respetar feature flags deshabilitados', () => {
      // Mock feature flags deshabilitados
      jest.doMock('@/src/config/featureFlags', () => ({
        FEATURE_FLAGS: {
          OPTIMIZED_RENDERER: false,
          RENDERER_CACHE: false,
          PERFORMANCE_MONITORING: false,
        },
      }))
      
      const renderer = new OptimizedArtifactRenderer()
      
      expect(renderer.config.enableCache).toBe(false)
      expect(renderer.config.enablePerformanceMonitoring).toBe(false)
    })

    test('debe usar configuración de feature flags', () => {
      const renderer = new OptimizedArtifactRenderer()
      
      // Verificar que usa la configuración de las variables de entorno
      expect(renderer.config.cacheSize).toBe(100)
      expect(renderer.config.timeout).toBe(5000)
      expect(renderer.config.maxFrames).toBe(5)
    })
  })

  describe('Casos Edge', () => {
    let renderer

    beforeEach(async () => {
      renderer = new OptimizedArtifactRenderer()
      await renderer.init()
    })

    test('debe manejar contenido muy grande', async () => {
      const largeContent = '<div>' + 'x'.repeat(100000) + '</div>'
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result = await renderer.render(largeContent, mockContainer)
      
      expect(result.success).toBe(true)
    })

    test('debe manejar caracteres especiales', async () => {
      const specialContent = '<div>Ñoño 中文 🚀 "quotes" \'apostrophes\'</div>'
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const result = await renderer.render(specialContent, mockContainer)
      
      expect(result.success).toBe(true)
    })

    test('debe manejar renderizados concurrentes', async () => {
      const content1 = '<div>Concurrent 1</div>'
      const content2 = '<div>Concurrent 2</div>'
      
      setTimeout(() => {
        if (mockIframe.onload) {
          mockIframe.onload()
        }
      }, 100)
      
      const [result1, result2] = await Promise.all([
        renderer.render(content1, mockContainer),
        renderer.render(content2, mockContainer),
      ])
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    test('debe manejar container null o undefined', async () => {
      const content = '<div>Test content</div>'
      
      const result = await renderer.render(content, null)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Container is required')
    })
  })
})
