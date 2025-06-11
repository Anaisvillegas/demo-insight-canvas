import { useRef, useCallback, useEffect } from "react";

// Cache para referencias DOM
class DOMCache {
  private cache = new Map<string, HTMLElement>();
  private observers = new Map<string, MutationObserver>();

  get(selector: string): HTMLElement | null {
    if (this.cache.has(selector)) {
      return this.cache.get(selector)!;
    }

    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      this.cache.set(selector, element);
    }
    return element;
  }

  set(selector: string, element: HTMLElement): void {
    this.cache.set(selector, element);
  }

  clear(): void {
    // Limpiar observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.cache.clear();
  }

  // Observar cambios en el DOM para invalidar cache
  observeChanges(selector: string): void {
    if (this.observers.has(selector)) return;

    const observer = new MutationObserver(() => {
      this.cache.delete(selector);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set(selector, observer);
  }
}

// Instancia global del cache DOM
const domCache = new DOMCache();

// Hook para operaciones DOM optimizadas
export const useDOMOptimizer = () => {
  const batchedOperationsRef = useRef<(() => void)[]>([]);
  const rafRef = useRef<number>();

  // Función para agrupar operaciones DOM
  const batchDOMOperations = useCallback((operation: () => void) => {
    batchedOperationsRef.current.push(operation);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      // Ejecutar todas las operaciones en un solo frame
      const operations = batchedOperationsRef.current;
      batchedOperationsRef.current = [];

      // Agrupar por tipo de operación para minimizar reflow/repaint
      const reads: (() => void)[] = [];
      const writes: (() => void)[] = [];

      operations.forEach(op => {
        // Heurística simple: si la operación contiene 'get', 'offset', 'client', es una lectura
        const opString = op.toString();
        if (opString.includes('get') || opString.includes('offset') || opString.includes('client')) {
          reads.push(op);
        } else {
          writes.push(op);
        }
      });

      // Ejecutar todas las lecturas primero, luego todas las escrituras
      reads.forEach(op => op());
      writes.forEach(op => op());
    });
  }, []);

  // Función para crear DocumentFragment para inserciones múltiples
  const createDocumentFragment = useCallback(() => {
    return document.createDocumentFragment();
  }, []);

  // Función optimizada para insertar múltiples elementos
  const insertMultipleElements = useCallback((
    container: HTMLElement,
    elements: HTMLElement[]
  ) => {
    const fragment = createDocumentFragment();
    elements.forEach(element => fragment.appendChild(element));
    container.appendChild(fragment);
  }, [createDocumentFragment]);

  // Función para usar innerHTML en lugar de múltiples appendChild
  const setInnerHTML = useCallback((
    element: HTMLElement,
    html: string
  ) => {
    batchDOMOperations(() => {
      element.innerHTML = html;
    });
  }, [batchDOMOperations]);

  // Función para cachear y obtener elementos DOM
  const getCachedElement = useCallback((selector: string): HTMLElement | null => {
    return domCache.get(selector);
  }, []);

  // Función para establecer elemento en cache
  const setCachedElement = useCallback((selector: string, element: HTMLElement) => {
    domCache.set(selector, element);
  }, []);

  // Función para medir dimensiones sin causar reflow
  const measureElement = useCallback((element: HTMLElement) => {
    return batchDOMOperations(() => {
      return {
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight
      };
    });
  }, [batchDOMOperations]);

  // Función para aplicar estilos en lote
  const applyStyles = useCallback((
    element: HTMLElement,
    styles: Partial<CSSStyleDeclaration>
  ) => {
    batchDOMOperations(() => {
      Object.assign(element.style, styles);
    });
  }, [batchDOMOperations]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      domCache.clear();
    };
  }, []);

  return {
    batchDOMOperations,
    createDocumentFragment,
    insertMultipleElements,
    setInnerHTML,
    getCachedElement,
    setCachedElement,
    measureElement,
    applyStyles
  };
};

// Hook para virtual scrolling
export const useVirtualScrolling = (
  items: any[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const scrollTopRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useCallback(() => {
    const startIndex = Math.floor(scrollTopRef.current / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [items.length, itemHeight, containerHeight, overscan]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    scrollTopRef.current = event.currentTarget.scrollTop;
  }, []);

  const getVisibleItems = useCallback(() => {
    const range = visibleRange();
    return items.slice(range.start, range.end + 1).map((item, index) => ({
      item,
      index: range.start + index,
      style: {
        position: 'absolute' as const,
        top: (range.start + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return {
    containerRef,
    handleScroll,
    getVisibleItems,
    totalHeight,
    visibleRange: visibleRange()
  };
};

// Hook para minimizar reflow/repaint
export const useLayoutOptimizer = () => {
  const pendingReads = useRef<(() => any)[]>([]);
  const pendingWrites = useRef<(() => void)[]>([]);
  const rafRef = useRef<number>();

  const scheduleRead = useCallback((readFn: () => any) => {
    return new Promise((resolve) => {
      pendingReads.current.push(() => {
        const result = readFn();
        resolve(result);
        return result;
      });

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          // Ejecutar todas las lecturas primero
          const reads = pendingReads.current;
          const writes = pendingWrites.current;

          pendingReads.current = [];
          pendingWrites.current = [];

          reads.forEach(read => read());
          writes.forEach(write => write());

          rafRef.current = undefined;
        });
      }
    });
  }, []);

  const scheduleWrite = useCallback((writeFn: () => void) => {
    pendingWrites.current.push(writeFn);

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        const reads = pendingReads.current;
        const writes = pendingWrites.current;

        pendingReads.current = [];
        pendingWrites.current = [];

        reads.forEach(read => read());
        writes.forEach(write => write());

        rafRef.current = undefined;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    scheduleRead,
    scheduleWrite
  };
};

// Función utilitaria para detectar si un elemento está en viewport
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

// Función para optimizar animaciones CSS
export const optimizeAnimation = (element: HTMLElement, property: string, value: string) => {
  // Usar transform y opacity para animaciones hardware-accelerated
  if (property === 'left' || property === 'top') {
    element.style.transform = `translate(${property === 'left' ? value : '0'}, ${property === 'top' ? value : '0'})`;
  } else {
    element.style.setProperty(property, value);
  }
};
