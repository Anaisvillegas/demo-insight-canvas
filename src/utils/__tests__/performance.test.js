/**
 * Performance Tests para Artifact Renderer
 * Tests de Jest que usan las clases de performance
 */

const { 
  LegacyArtifactRenderer, 
  OptimizedArtifactRenderer, 
  PerformanceMeasurer, 
  ReportGenerator 
} = require('../performance/index.js')

// Tests de performance
describe('Performance Tests - Artifact Renderer', () => {
  let measurer
  let testCases

  beforeAll(() => {
    // Setup DOM environment
    global.document = {
      createElement: jest.fn(() => ({
        style: {},
        appendChild: jest.fn()
      }))
    }
    
    global.performance = {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1000000
      }
    }

    global.btoa = jest.fn(str => Buffer.from(str).toString('base64'))

    measurer = new PerformanceMeasurer()
    
    testCases = [
      {
        name: 'Simple HTML',
        content: '<div>Hello World</div>'
      },
      {
        name: 'Complex HTML',
        content: `
          <div class="container">
            <h1>Title</h1>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
            </ul>
          </div>
        `
      },
      {
        name: 'Large Content',
        content: '<div>' + 'x'.repeat(10000) + '</div>'
      },
      {
        name: 'React Component',
        content: `
          function MyComponent() {
            return <div>React Component</div>;
          }
        `
      }
    ]
  })

  describe('Initialization Performance', () => {
    test('debe medir tiempo de inicialización', async () => {
      const legacyResult = await measurer.measureInitialization(LegacyArtifactRenderer)
      const optimizedResult = await measurer.measureInitialization(OptimizedArtifactRenderer)

      expect(legacyResult.time).toBeGreaterThan(optimizedResult.time)
      expect(legacyResult.renderer.isInitialized).toBe(true)
      expect(optimizedResult.renderer.isInitialized).toBe(true)
    })

    test('debe comparar uso de memoria durante inicialización', async () => {
      const legacyResult = await measurer.measureInitialization(LegacyArtifactRenderer)
      const optimizedResult = await measurer.measureInitialization(OptimizedArtifactRenderer)

      // El renderizador optimizado debería usar menos memoria
      expect(optimizedResult.memoryDelta).toBeLessThanOrEqual(legacyResult.memoryDelta)
    })
  })

  describe('Rendering Performance', () => {
    let legacyRenderer, optimizedRenderer

    beforeEach(async () => {
      legacyRenderer = new LegacyArtifactRenderer()
      optimizedRenderer = new OptimizedArtifactRenderer()
      
      await legacyRenderer.init()
      await optimizedRenderer.init()
    })

    test('debe comparar tiempos de renderizado', async () => {
      const legacyResults = await measurer.measureRenderingPerformance(legacyRenderer, testCases)
      const optimizedResults = await measurer.measureRenderingPerformance(optimizedRenderer, testCases)

      // Verificar que todos los tests pasaron
      expect(legacyResults.every(r => r.success)).toBe(true)
      expect(optimizedResults.every(r => r.success)).toBe(true)

      // El renderizador optimizado debería ser más rápido en promedio
      const legacyAvg = legacyResults.reduce((sum, r) => sum + r.time, 0) / legacyResults.length
      const optimizedAvg = optimizedResults.reduce((sum, r) => sum + r.time, 0) / optimizedResults.length

      expect(optimizedAvg).toBeLessThan(legacyAvg)
    })

    test('debe medir beneficios del cache', async () => {
      const content = testCases[0].content
      const container = document.createElement('div')

      // Primer renderizado (sin cache)
      const firstRender = await optimizedRenderer.render(content, container)
      expect(firstRender.cached).toBe(false)

      // Segundo renderizado (con cache)
      const secondRender = await optimizedRenderer.render(content, container)
      expect(secondRender.cached).toBe(true)
      expect(secondRender.renderTime).toBeLessThan(firstRender.renderTime)
    })

    test('debe medir performance con contenido grande', async () => {
      const largeContent = '<div>' + 'x'.repeat(50000) + '</div>'
      const container = document.createElement('div')

      const legacyTime = await measureRenderTime(legacyRenderer, largeContent, container)
      const optimizedTime = await measureRenderTime(optimizedRenderer, largeContent, container)

      expect(optimizedTime).toBeLessThan(legacyTime)
    })
  })

  describe('Concurrent Rendering Performance', () => {
    test('debe medir performance de renderizado concurrente', async () => {
      const legacyRenderer = new LegacyArtifactRenderer()
      const optimizedRenderer = new OptimizedArtifactRenderer()
      
      await legacyRenderer.init()
      await optimizedRenderer.init()

      const content = testCases[1].content
      const concurrency = 5

      const legacyResult = await measurer.measureConcurrentRendering(legacyRenderer, content, concurrency)
      const optimizedResult = await measurer.measureConcurrentRendering(optimizedRenderer, content, concurrency)

      expect(optimizedResult.totalTime).toBeLessThan(legacyResult.totalTime)
      expect(optimizedResult.averageTime).toBeLessThan(legacyResult.averageTime)
    })
  })

  describe('Memory Usage', () => {
    test('debe comparar uso de memoria durante múltiples renderizados', async () => {
      const legacyRenderer = new LegacyArtifactRenderer()
      const optimizedRenderer = new OptimizedArtifactRenderer()
      
      await legacyRenderer.init()
      await optimizedRenderer.init()

      const iterations = 10
      const content = testCases[0].content

      let legacyMemoryTotal = 0
      let optimizedMemoryTotal = 0

      for (let i = 0; i < iterations; i++) {
        const container1 = document.createElement('div')
        const container2 = document.createElement('div')

        const legacyResult = await measurer.measureRenderingPerformance(legacyRenderer, [{ name: 'test', content }])
        const optimizedResult = await measurer.measureRenderingPerformance(optimizedRenderer, [{ name: 'test', content }])

        legacyMemoryTotal += legacyResult[0].memoryDelta
        optimizedMemoryTotal += optimizedResult[0].memoryDelta
      }

      expect(optimizedMemoryTotal).toBeLessThanOrEqual(legacyMemoryTotal)
    })
  })

  describe('Report Generation', () => {
    test('debe generar reporte completo de performance', async () => {
      // Ejecutar todos los tests de performance
      const legacyRenderer = new LegacyArtifactRenderer()
      const optimizedRenderer = new OptimizedArtifactRenderer()

      const legacyInit = await measurer.measureInitialization(LegacyArtifactRenderer)
      const optimizedInit = await measurer.measureInitialization(OptimizedArtifactRenderer)

      await legacyInit.renderer.init()
      await optimizedInit.renderer.init()

      const legacyRendering = await measurer.measureRenderingPerformance(legacyInit.renderer, testCases)
      const optimizedRendering = await measurer.measureRenderingPerformance(optimizedInit.renderer, testCases)

      const legacyConcurrent = await measurer.measureConcurrentRendering(legacyInit.renderer, testCases[0].content)
      const optimizedConcurrent = await measurer.measureConcurrentRendering(optimizedInit.renderer, testCases[0].content)

      const legacyResults = {
        initialization: legacyInit,
        rendering: legacyRendering,
        concurrent: legacyConcurrent,
        stats: legacyInit.renderer.getStats()
      }

      const optimizedResults = {
        initialization: optimizedInit,
        rendering: optimizedRendering,
        concurrent: optimizedConcurrent,
        stats: optimizedInit.renderer.getStats()
      }

      const report = measurer.generateReport(legacyResults, optimizedResults)

      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('detailed')
      expect(report.summary.initializationImprovement).toBeGreaterThan(0)
    })
  })
})

// Función auxiliar para medir tiempo de renderizado
async function measureRenderTime(renderer, content, container) {
  const startTime = performance.now()
  await renderer.render(content, container)
  return performance.now() - startTime
}

module.exports = {
  LegacyArtifactRenderer,
  OptimizedArtifactRenderer,
  PerformanceMeasurer,
  ReportGenerator
}
