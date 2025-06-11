/**
 * Tipos y constantes para el sistema de renderizado optimizado
 */

export const CONTENT_TYPES = {
  HTML: 'html',
  REACT: 'react',
  JAVASCRIPT: 'javascript',
  CSS: 'css',
  MARKDOWN: 'markdown',
  JSON: 'json',
  XML: 'xml',
  PYTHON: 'python',
  AUTO: 'auto'
} as const;

export const COMPLEXITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export const OPTIMIZATION_TYPES = {
  LAZY_LOADING: 'lazy-loading',
  VIRTUALIZATION: 'virtualization',
  CODE_SPLITTING: 'code-splitting',
  COMPRESSION: 'compression',
  MINIFICATION: 'minification',
  CACHING: 'caching',
  PRELOADING: 'preloading'
} as const;

export const RENDER_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  RENDERING: 'rendering',
  COMPLETE: 'complete',
  ERROR: 'error'
} as const;

export const SECURITY_LEVELS = {
  SAFE: 'safe',
  WARNING: 'warning',
  DANGEROUS: 'dangerous'
} as const;

export const SIZE_CATEGORIES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  VERY_LARGE: 'very-large'
} as const;

export const CPU_INTENSITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

// Tipos TypeScript
export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
export type ComplexityLevel = typeof COMPLEXITY_LEVELS[keyof typeof COMPLEXITY_LEVELS];
export type OptimizationType = typeof OPTIMIZATION_TYPES[keyof typeof OPTIMIZATION_TYPES];
export type RenderState = typeof RENDER_STATES[keyof typeof RENDER_STATES];
export type SecurityLevel = typeof SECURITY_LEVELS[keyof typeof SECURITY_LEVELS];
export type SizeCategory = typeof SIZE_CATEGORIES[keyof typeof SIZE_CATEGORIES];
export type CPUIntensity = typeof CPU_INTENSITY[keyof typeof CPU_INTENSITY];

export interface ContentAnalysis {
  type: ContentType;
  complexity: ComplexityLevel;
  features: string[];
  security: SecurityAnalysis;
  size: SizeAnalysis;
  performance: PerformanceAnalysis;
  recommendedOptimizations: OptimizationType[];
  confidence: number;
}

export interface SecurityAnalysis {
  level: SecurityLevel;
  issues: string[];
  warnings: string[];
}

export interface SizeAnalysis {
  bytes: number;
  kb: number;
  mb: number;
  category: SizeCategory;
}

export interface PerformanceAnalysis {
  estimatedRenderTime: number;
  memoryImpact: number;
  cpuIntensity: CPUIntensity;
  networkRequests: number;
}

export interface RenderConfig {
  frameUrl?: string;
  enablePerformanceMonitoring?: boolean;
  maxPendingRenders?: number;
  renderTimeout?: number;
  enableCaching?: boolean;
  enableVirtualization?: boolean;
  enableLazyLoading?: boolean;
}

export interface PendingRender {
  id: string;
  code: string;
  type: ContentType;
  timestamp: number;
  priority: number;
}

export interface RenderResult {
  success: boolean;
  renderTime: number;
  memoryUsed: number;
  error?: string;
  warnings?: string[];
}

export interface PerformanceMetrics {
  renderTime: number;
  initTime: number;
  memoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}
