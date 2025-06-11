# Performance Testing Guide

Este documento describe cómo ejecutar y interpretar los tests de performance para el sistema de renderizado de artifacts.

## Descripción General

El sistema de testing de performance compara el rendimiento entre:
- **Legacy Renderer**: Simulación del renderizador anterior sin optimizaciones
- **Optimized Renderer**: Nuevo renderizador con cache, optimizaciones y mejoras

## Scripts Disponibles

### 1. Tests de Performance Básicos
```bash
npm run test:performance
```
Ejecuta tests de performance y genera reportes en JSON y Markdown.

### 2. Tests con Jest
```bash
npm run test:performance:jest
```
Ejecuta tests de performance + tests unitarios de Jest.

### 3. Comparación de Benchmarks
```bash
npm run test:performance:comparison
```
Ejecuta tests y genera comparación con reportes anteriores.

### 4. Benchmark Completo
```bash
npm run benchmark
```
Ejecuta todos los tests, Jest y genera comparaciones.

## Métricas Medidas

### Inicialización
- **Tiempo de inicialización**: Tiempo para preparar el renderizador
- **Uso de memoria**: Memoria consumida durante la inicialización

### Renderizado
- **Tiempo de renderizado**: Por tipo de contenido (HTML simple, complejo, grande, React)
- **Beneficios del cache**: Comparación entre primer y segundo renderizado
- **Uso de memoria**: Memoria consumida durante renderizado

### Renderizado Concurrente
- **Tiempo total**: Para múltiples renderizados simultáneos
- **Tiempo promedio**: Por renderizado en escenario concurrente
- **Escalabilidad**: Cómo se comporta con carga

### Cache Performance
- **Cache Hit Rate**: Porcentaje de hits del cache
- **Tiempo de cache hit**: Velocidad de respuesta desde cache
- **Eficiencia de memoria**: Uso de memoria con cache

## Tipos de Contenido Probados

1. **Simple HTML**: `<div>Hello World</div>`
2. **Complex HTML**: HTML con múltiples elementos y estructura
3. **Large Content**: Contenido de 10,000+ caracteres
4. **React Component**: Componentes JSX

## Estructura de Reportes

### JSON Report
```json
{
  "timestamp": "2025-01-04T22:45:00.000Z",
  "summary": {
    "initializationImprovement": 75.0,
    "averageRenderingImprovement": 50.0,
    "memoryEfficiency": 30.0
  },
  "detailed": {
    "legacy": { /* resultados legacy */ },
    "optimized": { /* resultados optimizados */ }
  }
}
```

### Markdown Report
- Resumen ejecutivo con mejoras porcentuales
- Tablas detalladas de performance
- Métricas de cache
- Conclusiones y recomendaciones

## Ubicación de Reportes

Los reportes se guardan en:
```
performance-reports/
├── performance-report-2025-01-04T22-45-00-000Z.json
├── performance-report-2025-01-04T22-45-00-000Z.md
├── latest-performance-report.json
├── latest-performance-report.md
└── benchmark-comparison.json
```

## Interpretación de Resultados

### Mejoras Esperadas
- **Inicialización**: 60-80% más rápida
- **Renderizado**: 40-60% más eficiente
- **Memoria**: 20-40% más eficiente
- **Cache Hit Rate**: >80% para contenido repetido

### Indicadores de Problemas
- Mejoras <20% indican necesidad de optimización
- Cache Hit Rate <50% sugiere problemas de cache
- Uso de memoria creciente indica memory leaks

## Configuración Avanzada

### Variables de Entorno
```bash
# Configurar tamaño de cache
CACHE_SIZE=100

# Configurar timeout
RENDER_TIMEOUT=5000

# Configurar máximo de frames
MAX_FRAMES=10
```

### Personalizar Tests
Editar `src/utils/__tests__/performance.test.js` para:
- Agregar nuevos casos de prueba
- Modificar métricas medidas
- Cambiar configuraciones de test

## Automatización CI/CD

### GitHub Actions
```yaml
- name: Run Performance Tests
  run: npm run benchmark

- name: Upload Performance Reports
  uses: actions/upload-artifact@v3
  with:
    name: performance-reports
    path: performance-reports/
```

### Alertas de Regresión
```bash
# Comparar con baseline
node scripts/run-performance-tests.js --comparison

# Fallar si regresión >10%
if [ $REGRESSION_PERCENT -gt 10 ]; then
  echo "Performance regression detected!"
  exit 1
fi
```

## Troubleshooting

### Error: "Cannot find module"
```bash
# Instalar dependencias
npm install

# Verificar estructura de archivos
ls -la src/utils/__tests__/
```

### Error: "DOM not available"
El script configura automáticamente un entorno DOM mock. Si persiste:
```bash
# Ejecutar con Node.js específico
node --version  # Verificar Node.js 16+
```

### Reportes no se generan
```bash
# Verificar permisos de escritura
mkdir -p performance-reports
chmod 755 performance-reports
```

## Mejores Prácticas

### Frecuencia de Testing
- **Desarrollo**: Antes de cada commit importante
- **CI/CD**: En cada PR y merge a main
- **Release**: Antes de cada release

### Análisis de Tendencias
- Mantener histórico de reportes
- Monitorear tendencias a largo plazo
- Establecer alertas para regresiones

### Optimización Basada en Datos
- Identificar bottlenecks con métricas
- Priorizar optimizaciones por impacto
- Validar mejoras con tests A/B

## Extensiones Futuras

### Métricas Adicionales
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

### Integración con Herramientas
- Lighthouse CI
- WebPageTest
- Chrome DevTools Protocol

### Análisis Avanzado
- Profiling de CPU
- Análisis de memory leaks
- Network performance
- Bundle size analysis
