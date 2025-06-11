/**
 * useFeatureFlag.js
 * 
 * Hook personalizado para gestionar feature flags en componentes React.
 * Proporciona una interfaz reactiva para verificar el estado de las features
 * y obtener configuración del renderizador.
 * 
 * Uso:
 * const { isEnabled, config, toggleFeature } = useFeatureFlag('OPTIMIZED_RENDERER');
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FEATURE_FLAGS, 
  RENDERER_CONFIG, 
  SECURITY_CONFIG,
  DEV_CONFIG,
  isFeatureEnabled, 
  getRendererConfig,
  getEnvironmentConfig,
  validateConfig,
  isDevelopment
} from '@/config/featureFlags';

/**
 * Hook principal para gestionar feature flags
 * @param {string} flagName - Nombre del feature flag
 * @returns {object} - Objeto con estado y métodos del feature flag
 */
export const useFeatureFlag = (flagName) => {
  const [isEnabled, setIsEnabled] = useState(() => isFeatureEnabled(flagName));
  const [config, setConfig] = useState(() => getEnvironmentConfig());
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Verificar si el flag está habilitado
  const checkFlag = useCallback(() => {
    const enabled = isFeatureEnabled(flagName);
    setIsEnabled(enabled);
    setLastUpdate(Date.now());
    return enabled;
  }, [flagName]);

  // Actualizar configuración
  const updateConfig = useCallback(() => {
    const newConfig = getEnvironmentConfig();
    setConfig(newConfig);
    setLastUpdate(Date.now());
    return newConfig;
  }, []);

  // Toggle del feature flag (solo en desarrollo)
  const toggleFeature = useCallback(() => {
    if (!isDevelopment()) {
      console.warn('toggleFeature solo está disponible en modo desarrollo');
      return false;
    }

    // En desarrollo, podemos simular el toggle modificando el localStorage
    const storageKey = `feature_flag_${flagName}`;
    const currentValue = localStorage.getItem(storageKey) === 'true';
    const newValue = !currentValue;
    
    localStorage.setItem(storageKey, newValue.toString());
    setIsEnabled(newValue);
    setLastUpdate(Date.now());
    
    if (DEV_CONFIG.VERBOSE_LOGGING) {
      console.log(`🔄 Feature flag ${flagName} toggled to:`, newValue);
    }
    
    return newValue;
  }, [flagName]);

  // Obtener valor específico de configuración
  const getConfigValue = useCallback((configKey) => {
    return getRendererConfig(configKey);
  }, []);

  // Efecto para escuchar cambios en localStorage (solo en desarrollo)
  useEffect(() => {
    if (!isDevelopment()) return;

    const handleStorageChange = (e) => {
      if (e.key === `feature_flag_${flagName}`) {
        const newValue = e.newValue === 'true';
        setIsEnabled(newValue);
        setLastUpdate(Date.now());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [flagName]);

  // Verificar localStorage en desarrollo
  useEffect(() => {
    if (!isDevelopment()) return;

    const storageKey = `feature_flag_${flagName}`;
    const storedValue = localStorage.getItem(storageKey);
    
    if (storedValue !== null) {
      const enabled = storedValue === 'true';
      setIsEnabled(enabled);
    }
  }, [flagName]);

  return {
    isEnabled,
    config,
    lastUpdate,
    checkFlag,
    updateConfig,
    toggleFeature: isDevelopment() ? toggleFeature : undefined,
    getConfigValue
  };
};

/**
 * Hook para gestionar múltiples feature flags
 * @param {string[]} flagNames - Array de nombres de feature flags
 * @returns {object} - Objeto con estado de múltiples flags
 */
export const useFeatureFlags = (flagNames = []) => {
  const [flags, setFlags] = useState(() => {
    const initialFlags = {};
    flagNames.forEach(name => {
      initialFlags[name] = isFeatureEnabled(name);
    });
    return initialFlags;
  });

  const [config, setConfig] = useState(() => getEnvironmentConfig());

  // Actualizar todos los flags
  const updateFlags = useCallback(() => {
    const newFlags = {};
    flagNames.forEach(name => {
      newFlags[name] = isFeatureEnabled(name);
    });
    setFlags(newFlags);
    setConfig(getEnvironmentConfig());
  }, [flagNames]);

  // Verificar si algún flag está habilitado
  const hasAnyEnabled = useMemo(() => {
    return Object.values(flags).some(Boolean);
  }, [flags]);

  // Verificar si todos los flags están habilitados
  const hasAllEnabled = useMemo(() => {
    return Object.values(flags).every(Boolean);
  }, [flags]);

  // Obtener flags habilitados
  const enabledFlags = useMemo(() => {
    return Object.entries(flags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }, [flags]);

  return {
    flags,
    config,
    hasAnyEnabled,
    hasAllEnabled,
    enabledFlags,
    updateFlags
  };
};

/**
 * Hook específico para el renderizador optimizado
 * @returns {object} - Estado y configuración del renderizador
 */
export const useOptimizedRenderer = () => {
  const { isEnabled, config, getConfigValue } = useFeatureFlag('OPTIMIZED_RENDERER');
  
  const rendererConfig = useMemo(() => ({
    enabled: isEnabled,
    cacheSize: getConfigValue('CACHE_SIZE'),
    timeout: getConfigValue('TIMEOUT'),
    maxFrames: getConfigValue('MAX_FRAMES'),
    frameUrl: getConfigValue('FRAME_URL'),
    legacyFrameUrl: getConfigValue('LEGACY_FRAME_URL'),
    cacheEnabled: FEATURE_FLAGS.RENDERER_CACHE,
    performanceMonitoring: FEATURE_FLAGS.PERFORMANCE_MONITORING,
    lazyLoading: FEATURE_FLAGS.LAZY_LOADING,
    virtualization: FEATURE_FLAGS.VIRTUALIZATION,
    cacheCompression: FEATURE_FLAGS.CACHE_COMPRESSION,
    debugMode: FEATURE_FLAGS.DEBUG_MODE
  }), [isEnabled, getConfigValue]);

  return {
    isEnabled,
    config: rendererConfig,
    shouldUseOptimized: isEnabled,
    shouldUseCache: isEnabled && FEATURE_FLAGS.RENDERER_CACHE,
    shouldMonitorPerformance: isEnabled && FEATURE_FLAGS.PERFORMANCE_MONITORING
  };
};

/**
 * Hook para configuración de seguridad
 * @returns {object} - Configuración de seguridad
 */
export const useSecurityConfig = () => {
  const securityConfig = useMemo(() => ({
    iframeSandbox: SECURITY_CONFIG.IFRAME_SANDBOX,
    htmlSanitization: SECURITY_CONFIG.HTML_SANITIZATION,
    contentValidation: SECURITY_CONFIG.CONTENT_VALIDATION,
    strictCSP: SECURITY_CONFIG.STRICT_CSP
  }), []);

  return securityConfig;
};

/**
 * Hook para configuración de desarrollo
 * @returns {object} - Configuración de desarrollo
 */
export const useDevConfig = () => {
  const devConfig = useMemo(() => {
    if (!isDevelopment()) {
      return {
        verboseLogging: false,
        consoleMetrics: false,
        hotReloadFrame: false,
        simulateLatency: false,
        simulatedLatency: 0
      };
    }

    return {
      verboseLogging: DEV_CONFIG.VERBOSE_LOGGING,
      consoleMetrics: DEV_CONFIG.CONSOLE_METRICS,
      hotReloadFrame: DEV_CONFIG.HOT_RELOAD_FRAME,
      simulateLatency: DEV_CONFIG.SIMULATE_LATENCY,
      simulatedLatency: DEV_CONFIG.SIMULATED_LATENCY
    };
  }, []);

  return devConfig;
};

/**
 * Hook para validación de configuración
 * @returns {object} - Resultado de validación
 */
export const useConfigValidation = () => {
  const [validation, setValidation] = useState(() => validateConfig());

  const revalidate = useCallback(() => {
    const newValidation = validateConfig();
    setValidation(newValidation);
    return newValidation;
  }, []);

  useEffect(() => {
    if (isDevelopment() && !validation.isValid) {
      console.error('❌ Configuración inválida:', validation.errors);
    }
    if (isDevelopment() && validation.warnings.length > 0) {
      console.warn('⚠️ Advertencias de configuración:', validation.warnings);
    }
  }, [validation]);

  return {
    ...validation,
    revalidate
  };
};

/**
 * Hook específico para el chatbot optimizado
 * @returns {object} - Estado y configuración del chatbot
 */
export const useOptimizedChatbot = () => {
  const { isEnabled, config, getConfigValue } = useFeatureFlag('OPTIMIZED_CHATBOT');
  
  const chatbotConfig = useMemo(() => ({
    enabled: isEnabled,
    queueEnabled: FEATURE_FLAGS.CHAT_QUEUE,
    cacheEnabled: FEATURE_FLAGS.CHAT_CACHE,
    lazyLoadingEnabled: FEATURE_FLAGS.CHAT_LAZY_LOADING,
    metricsEnabled: FEATURE_FLAGS.CHAT_METRICS,
    debounceDelay: parseInt(process.env.NEXT_PUBLIC_CHAT_DEBOUNCE_DELAY || '300', 10),
    cacheSize: parseInt(process.env.NEXT_PUBLIC_CHAT_CACHE_SIZE || '100', 10),
    maxConcurrentRequests: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS || '3', 10),
    maxRetries: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10)
  }), [isEnabled]);

  return {
    isEnabled,
    config: chatbotConfig,
    shouldUseOptimized: isEnabled,
    shouldUseQueue: isEnabled && FEATURE_FLAGS.CHAT_QUEUE,
    shouldUseCache: isEnabled && FEATURE_FLAGS.CHAT_CACHE,
    shouldUseLazyLoading: isEnabled && FEATURE_FLAGS.CHAT_LAZY_LOADING,
    shouldUseMetrics: isEnabled && FEATURE_FLAGS.CHAT_METRICS
  };
};

/**
 * Hook para debugging de feature flags (solo desarrollo)
 * @returns {object} - Herramientas de debugging
 */
export const useFeatureFlagDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);

  const getDebugInfo = useCallback(() => {
    if (!isDevelopment()) {
      return null;
    }

    const info = {
      featureFlags: FEATURE_FLAGS,
      rendererConfig: RENDERER_CONFIG,
      securityConfig: SECURITY_CONFIG,
      devConfig: DEV_CONFIG,
      environment: process.env.NODE_ENV,
      validation: validateConfig(),
      timestamp: new Date().toISOString()
    };

    setDebugInfo(info);
    return info;
  }, []);

  const logDebugInfo = useCallback(() => {
    if (!isDevelopment()) return;

    const info = getDebugInfo();
    console.group('🐛 Feature Flags Debug Info');
    console.log('Feature Flags:', info.featureFlags);
    console.log('Renderer Config:', info.rendererConfig);
    console.log('Security Config:', info.securityConfig);
    console.log('Dev Config:', info.devConfig);
    console.log('Validation:', info.validation);
    console.groupEnd();
  }, [getDebugInfo]);

  const exportConfig = useCallback(() => {
    if (!isDevelopment()) return null;

    const config = getDebugInfo();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-config-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    return config;
  }, [getDebugInfo]);

  return isDevelopment() ? {
    debugInfo,
    getDebugInfo,
    logDebugInfo,
    exportConfig
  } : null;
};

// Exportar hooks individuales
export default useFeatureFlag;
