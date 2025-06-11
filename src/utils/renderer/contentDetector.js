/**
 * contentDetector.js
 * 
 * Utilidad para detectar y analizar tipos de contenido de artefactos.
 * Proporciona análisis inteligente del contenido para optimizar
 * el renderizado y aplicar las mejores estrategias de rendimiento.
 * 
 * Características:
 * - Detección automática de tipos de contenido
 * - Análisis de complejidad
 * - Identificación de características especiales
 * - Recomendaciones de optimización
 * - Validación de seguridad
 */

// Fallback constants si no se pueden importar los tipos
const CONTENT_TYPES = {
  HTML: 'html',
  REACT: 'react',
  JAVASCRIPT: 'javascript',
  CSS: 'css',
  MARKDOWN: 'markdown',
  JSON: 'json',
  XML: 'xml',
  PYTHON: 'python',
  AUTO: 'auto'
};

const COMPLEXITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const OPTIMIZATION_TYPES = {
  LAZY_LOADING: 'lazy-loading',
  VIRTUALIZATION: 'virtualization',
  CODE_SPLITTING: 'code-splitting',
  COMPRESSION: 'compression',
  MINIFICATION: 'minification',
  CACHING: 'caching',
  PRELOADING: 'preloading'
};

/**
 * Detector de contenido principal
 */
class ContentDetector {
  constructor() {
    this.patterns = this.initializePatterns();
    this.securityRules = this.initializeSecurityRules();
  }

  /**
   * Inicializa patrones de detección
   */
  initializePatterns() {
    return {
      [CONTENT_TYPES.HTML]: [
        /<!DOCTYPE\s+html/i,
        /<html[\s>]/i,
        /<body[\s>]/i,
        /<div[\s>]/i,
        /<p[\s>]/i
      ],
      
      [CONTENT_TYPES.REACT]: [
        /import\s+React/i,
        /from\s+['"]react['"]/i,
        /useState\s*\(/i,
        /useEffect\s*\(/i,
        /jsx/i,
        /className=/i,
        /React\.Component/i
      ],
      
      [CONTENT_TYPES.JAVASCRIPT]: [
        /function\s+\w+\s*\(/i,
        /const\s+\w+\s*=/i,
        /let\s+\w+\s*=/i,
        /var\s+\w+\s*=/i,
        /=>\s*{/i,
        /console\./i
      ],
      
      [CONTENT_TYPES.CSS]: [
        /\.\w+\s*{/i,
        /#\w+\s*{/i,
        /\w+\s*:\s*[^;]+;/i,
        /@media/i,
        /@import/i,
        /background-color/i
      ],
      
      [CONTENT_TYPES.MARKDOWN]: [
        /^#{1,6}\s+/m,
        /\*\*[^*]+\*\*/,
        /\*[^*]+\*/,
        /```[\s\S]*?```/,
        /\[([^\]]+)\]\(([^)]+)\)/,
        /^\s*[-*+]\s+/m
      ],
      
      [CONTENT_TYPES.JSON]: [
        /^\s*{[\s\S]*}\s*$/,
        /^\s*\[[\s\S]*\]\s*$/
      ],
      
      [CONTENT_TYPES.XML]: [
        /^\s*<\?xml/i,
        /<\w+[^>]*>[\s\S]*<\/\w+>/
      ]
    };
  }

  /**
   * Inicializa reglas de seguridad
   */
  initializeSecurityRules() {
    return {
      dangerous: [
        /<script[\s>]/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /Function\s*\(/i,
        /document\.write/i,
        /innerHTML\s*=/i
      ],
      
      suspicious: [
        /<iframe[\s>]/i,
        /<object[\s>]/i,
        /<embed[\s>]/i,
        /fetch\s*\(/i,
        /XMLHttpRequest/i,
        /localStorage/i,
        /sessionStorage/i
      ],
      
      external: [
        /https?:\/\/[^\s'"]+/i,
        /src\s*=\s*['"][^'"]*https?:/i,
        /href\s*=\s*['"][^'"]*https?:/i
      ]
    };
  }

  /**
   * Analiza el contenido y retorna información detallada
   * @param {string} content - Contenido a analizar
   * @returns {Object} - Resultado del análisis
   */
  analyze(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Contenido inválido para análisis');
    }

    const detection = {
      type: this.detectType(content),
      complexity: this.analyzeComplexity(content),
      features: this.detectFeatures(content),
      security: this.analyzeSecurity(content),
      size: this.analyzeSize(content),
      performance: this.analyzePerformance(content),
      recommendedOptimizations: [],
      confidence: 0
    };

    // Calcular optimizaciones recomendadas
    detection.recommendedOptimizations = this.recommendOptimizations(detection);
    
    // Calcular nivel de confianza
    detection.confidence = this.calculateConfidence(content, detection);

    return detection;
  }

  /**
   * Detecta el tipo de contenido
   * @param {string} content - Contenido a analizar
   * @returns {string} - Tipo detectado
   */
  detectType(content) {
    const scores = {};
    
    // Inicializar scores
    Object.keys(this.patterns).forEach(type => {
      scores[type] = 0;
    });

    // Evaluar patrones
    Object.entries(this.patterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          scores[type]++;
        }
      });
    });

    // Validación especial para JSON
    if (scores[CONTENT_TYPES.JSON] > 0) {
      try {
        JSON.parse(content.trim());
        scores[CONTENT_TYPES.JSON] += 5; // Bonus por JSON válido
      } catch (e) {
        scores[CONTENT_TYPES.JSON] = 0;
      }
    }

    // Encontrar el tipo con mayor score
    const maxScore = Math.max(...Object.values(scores));
    const detectedType = Object.keys(scores).find(type => scores[type] === maxScore);

    return detectedType || CONTENT_TYPES.HTML;
  }

  /**
   * Analiza la complejidad del contenido
   * @param {string} content - Contenido a analizar
   * @returns {string} - Nivel de complejidad
   */
  analyzeComplexity(content) {
    const metrics = {
      length: content.length,
      lines: content.split('\n').length,
      elements: (content.match(/</g) || []).length,
      scripts: (content.match(/<script/gi) || []).length,
      styles: (content.match(/<style/gi) || []).length,
      functions: (content.match(/function\s+\w+/gi) || []).length,
      imports: (content.match(/import\s+/gi) || []).length
    };

    let complexityScore = 0;

    // Evaluar métricas
    if (metrics.length > 50000) complexityScore += 3;
    else if (metrics.length > 10000) complexityScore += 2;
    else if (metrics.length > 2000) complexityScore += 1;

    if (metrics.elements > 200) complexityScore += 3;
    else if (metrics.elements > 50) complexityScore += 2;
    else if (metrics.elements > 10) complexityScore += 1;

    if (metrics.scripts > 5) complexityScore += 3;
    else if (metrics.scripts > 2) complexityScore += 2;
    else if (metrics.scripts > 0) complexityScore += 1;

    if (metrics.functions > 10) complexityScore += 2;
    else if (metrics.functions > 3) complexityScore += 1;

    if (metrics.imports > 5) complexityScore += 2;
    else if (metrics.imports > 0) complexityScore += 1;

    // Determinar nivel
    if (complexityScore >= 8) return COMPLEXITY_LEVELS.HIGH;
    if (complexityScore >= 4) return COMPLEXITY_LEVELS.MEDIUM;
    return COMPLEXITY_LEVELS.LOW;
  }

  /**
   * Detecta características especiales del contenido
   * @param {string} content - Contenido a analizar
   * @returns {Array} - Lista de características
   */
  detectFeatures(content) {
    const features = [];

    // Características de contenido
    if (content.includes('<img')) features.push('images');
    if (content.includes('<video') || content.includes('<audio')) features.push('media');
    if (content.includes('<canvas')) features.push('canvas');
    if (content.includes('<svg')) features.push('svg');
    if (content.includes('<script')) features.push('scripts');
    if (content.includes('<style') || content.includes('css')) features.push('styles');
    if (content.includes('<form')) features.push('forms');
    if (content.includes('<input') || content.includes('<button')) features.push('interactive');
    
    // Características de JavaScript/React
    if (content.includes('useState') || content.includes('useEffect')) features.push('hooks');
    if (content.includes('async') || content.includes('await')) features.push('async');
    if (content.includes('fetch') || content.includes('XMLHttpRequest')) features.push('network');
    if (content.includes('localStorage') || content.includes('sessionStorage')) features.push('storage');
    
    // Características de CSS
    if (content.includes('@media')) features.push('responsive');
    if (content.includes('animation') || content.includes('transition')) features.push('animations');
    if (content.includes('grid') || content.includes('flexbox')) features.push('layout');
    
    // Características de datos
    if (content.includes('json') || this.isValidJSON(content)) features.push('data');
    if (content.includes('http://') || content.includes('https://')) features.push('external-links');

    return features;
  }

  /**
   * Analiza aspectos de seguridad
   * @param {string} content - Contenido a analizar
   * @returns {Object} - Análisis de seguridad
   */
  analyzeSecurity(content) {
    const security = {
      level: 'safe',
      issues: [],
      warnings: []
    };

    // Verificar patrones peligrosos
    this.securityRules.dangerous.forEach(pattern => {
      if (pattern.test(content)) {
        security.issues.push(`Patrón peligroso detectado: ${pattern.source}`);
        security.level = 'dangerous';
      }
    });

    // Verificar patrones sospechosos
    this.securityRules.suspicious.forEach(pattern => {
      if (pattern.test(content)) {
        security.warnings.push(`Patrón sospechoso detectado: ${pattern.source}`);
        if (security.level === 'safe') security.level = 'warning';
      }
    });

    // Verificar enlaces externos
    this.securityRules.external.forEach(pattern => {
      if (pattern.test(content)) {
        security.warnings.push('Enlaces externos detectados');
      }
    });

    return security;
  }

  /**
   * Analiza el tamaño del contenido
   * @param {string} content - Contenido a analizar
   * @returns {Object} - Análisis de tamaño
   */
  analyzeSize(content) {
    const bytes = new Blob([content]).size;
    const kb = bytes / 1024;
    const mb = kb / 1024;

    return {
      bytes,
      kb: Math.round(kb * 100) / 100,
      mb: Math.round(mb * 100) / 100,
      category: this.categorizeSizeImpact(bytes)
    };
  }

  /**
   * Analiza aspectos de rendimiento
   * @param {string} content - Contenido a analizar
   * @returns {Object} - Análisis de rendimiento
   */
  analyzePerformance(content) {
    const analysis = {
      estimatedRenderTime: this.estimateRenderTime(content),
      memoryImpact: this.estimateMemoryImpact(content),
      cpuIntensity: this.estimateCPUIntensity(content),
      networkRequests: this.countNetworkRequests(content)
    };

    return analysis;
  }

  /**
   * Recomienda optimizaciones basadas en el análisis
   * @param {Object} detection - Resultado del análisis
   * @returns {Array} - Lista de optimizaciones recomendadas
   */
  recommendOptimizations(detection) {
    const optimizations = [];

    // Basado en complejidad
    if (detection.complexity === COMPLEXITY_LEVELS.HIGH) {
      optimizations.push(OPTIMIZATION_TYPES.VIRTUALIZATION);
      optimizations.push(OPTIMIZATION_TYPES.CODE_SPLITTING);
    }

    // Basado en características
    if (detection.features.includes('images')) {
      optimizations.push(OPTIMIZATION_TYPES.LAZY_LOADING);
    }

    if (detection.size.kb > 100) {
      optimizations.push(OPTIMIZATION_TYPES.COMPRESSION);
      optimizations.push(OPTIMIZATION_TYPES.MINIFICATION);
    }

    if (detection.features.includes('scripts') || detection.features.includes('styles')) {
      optimizations.push(OPTIMIZATION_TYPES.CACHING);
    }

    return [...new Set(optimizations)]; // Remover duplicados
  }

  /**
   * Calcula el nivel de confianza de la detección
   * @param {string} content - Contenido original
   * @param {Object} detection - Resultado de la detección
   * @returns {number} - Nivel de confianza (0-1)
   */
  calculateConfidence(content, detection) {
    let confidence = 0.5; // Base

    // Aumentar confianza basado en patrones encontrados
    const typePatterns = this.patterns[detection.type] || [];
    const matchedPatterns = typePatterns.filter(pattern => pattern.test(content)).length;
    confidence += (matchedPatterns / typePatterns.length) * 0.4;

    // Ajustar por tamaño del contenido
    if (content.length > 100) confidence += 0.1;

    // Ajustar por validez (ej: JSON válido)
    if (detection.type === CONTENT_TYPES.JSON && this.isValidJSON(content)) {
      confidence = 0.95;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Utilidades auxiliares
   */
  isValidJSON(content) {
    try {
      JSON.parse(content.trim());
      return true;
    } catch (e) {
      return false;
    }
  }

  categorizeSizeImpact(bytes) {
    if (bytes < 10 * 1024) return 'small'; // < 10KB
    if (bytes < 100 * 1024) return 'medium'; // < 100KB
    if (bytes < 1024 * 1024) return 'large'; // < 1MB
    return 'very-large'; // >= 1MB
  }

  estimateRenderTime(content) {
    const baseTime = 100; // ms base
    const sizeMultiplier = content.length / 1000;
    const complexityMultiplier = (content.match(/</g) || []).length / 10;
    return Math.round(baseTime + sizeMultiplier + complexityMultiplier);
  }

  estimateMemoryImpact(content) {
    return Math.round(content.length * 2.5); // Estimación aproximada en bytes
  }

  estimateCPUIntensity(content) {
    let intensity = 'low';
    if (content.includes('<script') || content.includes('function')) intensity = 'medium';
    if (content.includes('canvas') || content.includes('animation')) intensity = 'high';
    return intensity;
  }

  countNetworkRequests(content) {
    const patterns = [
      /src\s*=\s*['"][^'"]*https?:/gi,
      /href\s*=\s*['"][^'"]*https?:/gi,
      /fetch\s*\(/gi,
      /XMLHttpRequest/gi
    ];
    
    return patterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);
  }
}

/**
 * Instancia singleton del detector
 */
const contentDetector = new ContentDetector();

export { contentDetector, ContentDetector };
export default contentDetector;
