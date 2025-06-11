import { useRef, useCallback, useEffect, useMemo } from "react";

// Tipos para el optimizador
type AsyncTask<T = any> = () => Promise<T>;
type SyncTask<T = any> = () => T;
type TaskPriority = 'high' | 'normal' | 'low';

interface TaskOptions {
  priority?: TaskPriority;
  timeout?: number;
  retries?: number;
  cancelable?: boolean;
}

interface QueuedTask<T = any> {
  id: string;
  task: AsyncTask<T> | SyncTask<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  options: TaskOptions;
  isAsync: boolean;
  abortController?: AbortController;
}

// Gestor de tareas asíncronas optimizado
class AsyncTaskManager {
  private taskQueue: QueuedTask[] = [];
  private runningTasks = new Map<string, QueuedTask>();
  private maxConcurrentTasks = 3;
  private isProcessing = false;

  // Agregar tarea a la cola
  addTask<T>(
    task: AsyncTask<T> | SyncTask<T>,
    options: TaskOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isAsync = task.constructor.name === 'AsyncFunction' || 
                     task.toString().includes('await') ||
                     task.toString().includes('Promise');

      const queuedTask: QueuedTask<T> = {
        id: taskId,
        task,
        resolve,
        reject,
        options: {
          priority: 'normal',
          timeout: 5000,
          retries: 1,
          cancelable: true,
          ...options
        },
        isAsync,
        abortController: options.cancelable ? new AbortController() : undefined
      };

      // Insertar según prioridad
      const insertIndex = this.getInsertIndex(queuedTask.options.priority!);
      this.taskQueue.splice(insertIndex, 0, queuedTask);

      this.processQueue();
    });
  }

  // Obtener índice de inserción según prioridad
  private getInsertIndex(priority: TaskPriority): number {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    for (let i = 0; i < this.taskQueue.length; i++) {
      const taskPriority = this.taskQueue[i].options.priority!;
      if (priorityOrder[priority] < priorityOrder[taskPriority]) {
        return i;
      }
    }
    
    return this.taskQueue.length;
  }

  // Procesar cola de tareas
  private async processQueue() {
    if (this.isProcessing || this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0 && this.runningTasks.size < this.maxConcurrentTasks) {
      const queuedTask = this.taskQueue.shift()!;
      this.runningTasks.set(queuedTask.id, queuedTask);

      this.executeTask(queuedTask);
    }

    this.isProcessing = false;
  }

  // Ejecutar tarea individual
  private async executeTask<T>(queuedTask: QueuedTask<T>) {
    const { id, task, resolve, reject, options, isAsync, abortController } = queuedTask;

    try {
      let result: T;

      if (isAsync) {
        // Tarea asíncrona con timeout
        const timeoutPromise = new Promise<never>((_, timeoutReject) => {
          setTimeout(() => timeoutReject(new Error('Task timeout')), options.timeout);
        });

        const taskPromise = (task as AsyncTask<T>)();
        result = await Promise.race([taskPromise, timeoutPromise]);
      } else {
        // Tarea síncrona con yield del hilo principal
        result = await this.executeSyncTaskWithYield(task as SyncTask<T>);
      }

      resolve(result);
    } catch (error) {
      if (options.retries! > 0) {
        // Reintentar
        queuedTask.options.retries = options.retries! - 1;
        this.taskQueue.unshift(queuedTask);
      } else {
        reject(error);
      }
    } finally {
      this.runningTasks.delete(id);
      this.processQueue(); // Continuar procesando
    }
  }

  // Ejecutar tarea síncrona con yield del hilo principal
  private async executeSyncTaskWithYield<T>(task: SyncTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const result = task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0); // setTimeout(0) para yield del hilo principal
    });
  }

  // Cancelar tarea
  cancelTask(taskId: string): boolean {
    // Cancelar de la cola
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      this.taskQueue.splice(queueIndex, 1);
      task.reject(new Error('Task cancelled'));
      return true;
    }

    // Cancelar tarea en ejecución
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask?.abortController) {
      runningTask.abortController.abort();
      runningTask.reject(new Error('Task cancelled'));
      this.runningTasks.delete(taskId);
      return true;
    }

    return false;
  }

  // Cancelar todas las tareas
  cancelAllTasks() {
    // Cancelar cola
    this.taskQueue.forEach(task => {
      task.reject(new Error('All tasks cancelled'));
    });
    this.taskQueue = [];

    // Cancelar tareas en ejecución
    this.runningTasks.forEach(task => {
      if (task.abortController) {
        task.abortController.abort();
      }
      task.reject(new Error('All tasks cancelled'));
    });
    this.runningTasks.clear();
  }

  // Obtener estadísticas
  getStats() {
    return {
      queuedTasks: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.maxConcurrentTasks
    };
  }
}

// Instancia global del gestor de tareas
const taskManager = new AsyncTaskManager();

// Hook para optimización de JavaScript
export const useJavaScriptOptimizer = () => {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Ejecutar tarea asíncrona optimizada
  const executeAsyncTask = useCallback(async <T>(
    task: AsyncTask<T>,
    options: TaskOptions = {}
  ): Promise<T> => {
    return taskManager.addTask(task, options);
  }, []);

  // Ejecutar tarea síncrona con yield
  const executeSyncTask = useCallback(async <T>(
    task: SyncTask<T>,
    options: TaskOptions = {}
  ): Promise<T> => {
    return taskManager.addTask(task, options);
  }, []);

  // Debouncing optimizado
  const createDebouncedFunction = useCallback(<T extends any[]>(
    func: (...args: T) => void | Promise<void>,
    delay: number,
    options: { leading?: boolean; trailing?: boolean } = { trailing: true }
  ) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;
    let lastArgs: T | null = null;

    return (...args: T) => {
      const now = Date.now();
      lastArgs = args;

      // Leading edge
      if (options.leading && now - lastCallTime > delay) {
        lastCallTime = now;
        func(...args);
        return;
      }

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Trailing edge
      if (options.trailing) {
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            func(...lastArgs);
          }
          timeoutId = null;
        }, delay);
      }
    };
  }, []);

  // Throttling optimizado
  const createThrottledFunction = useCallback(<T extends any[]>(
    func: (...args: T) => void | Promise<void>,
    delay: number
  ) => {
    let lastCallTime = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      if (timeSinceLastCall >= delay) {
        lastCallTime = now;
        func(...args);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          func(...args);
          timeoutId = null;
        }, delay - timeSinceLastCall);
      }
    };
  }, []);

  // Cancelar request con AbortController
  const createCancelableRequest = useCallback(<T>(
    requestFn: (signal: AbortSignal) => Promise<T>,
    requestId?: string
  ): { promise: Promise<T>; cancel: () => void } => {
    const id = requestId || `request-${Date.now()}`;
    const abortController = new AbortController();
    
    // Cancelar request anterior con el mismo ID
    const existingController = abortControllersRef.current.get(id);
    if (existingController) {
      existingController.abort();
    }
    
    abortControllersRef.current.set(id, abortController);

    const promise = requestFn(abortController.signal).finally(() => {
      abortControllersRef.current.delete(id);
    });

    const cancel = () => {
      abortController.abort();
      abortControllersRef.current.delete(id);
    };

    return { promise, cancel };
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      // Cancelar todos los requests pendientes
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  return {
    executeAsyncTask,
    executeSyncTask,
    createDebouncedFunction,
    createThrottledFunction,
    createCancelableRequest,
    getTaskStats: () => taskManager.getStats(),
    cancelAllTasks: () => taskManager.cancelAllTasks()
  };
};

// Hook para optimización de regex y strings
export const useStringOptimizer = () => {
  // Cache para regex compiladas
  const regexCache = useMemo(() => new Map<string, RegExp>(), []);

  // Obtener regex cacheada
  const getCachedRegex = useCallback((pattern: string, flags?: string): RegExp => {
    const key = `${pattern}${flags || ''}`;
    
    if (regexCache.has(key)) {
      return regexCache.get(key)!;
    }

    const regex = new RegExp(pattern, flags);
    regexCache.set(key, regex);
    
    // Limpiar cache si es muy grande
    if (regexCache.size > 50) {
      const firstKey = regexCache.keys().next().value;
      if (firstKey) {
        regexCache.delete(firstKey);
      }
    }

    return regex;
  }, [regexCache]);

  // String operations optimizadas
  const optimizedStringOps = useMemo(() => ({
    // Replace optimizado con cache
    replace: (str: string, pattern: string, replacement: string, flags?: string) => {
      const regex = getCachedRegex(pattern, flags);
      return str.replace(regex, replacement);
    },

    // Split optimizado
    split: (str: string, separator: string | RegExp, limit?: number) => {
      if (typeof separator === 'string') {
        return str.split(separator, limit);
      }
      return str.split(separator, limit);
    },

    // Match optimizado
    match: (str: string, pattern: string, flags?: string) => {
      const regex = getCachedRegex(pattern, flags);
      return str.match(regex);
    },

    // Test optimizado
    test: (str: string, pattern: string, flags?: string) => {
      const regex = getCachedRegex(pattern, flags);
      return regex.test(str);
    }
  }), [getCachedRegex]);

  return {
    getCachedRegex,
    ...optimizedStringOps
  };
};

// Hook para Web Workers
export const useWebWorker = () => {
  const workersRef = useRef<Map<string, Worker>>(new Map());

  // Crear Web Worker
  const createWorker = useCallback((
    workerScript: string,
    workerId?: string
  ): Worker => {
    const id = workerId || `worker-${Date.now()}`;
    
    // Terminar worker existente
    const existingWorker = workersRef.current.get(id);
    if (existingWorker) {
      existingWorker.terminate();
    }

    const worker = new Worker(workerScript);
    workersRef.current.set(id, worker);

    return worker;
  }, []);

  // Ejecutar tarea en Web Worker
  const executeInWorker = useCallback(<T, R>(
    workerScript: string,
    data: T,
    workerId?: string
  ): Promise<R> => {
    return new Promise((resolve, reject) => {
      const worker = createWorker(workerScript, workerId);

      worker.onmessage = (event) => {
        resolve(event.data);
        worker.terminate();
        if (workerId) {
          workersRef.current.delete(workerId);
        }
      };

      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
        if (workerId) {
          workersRef.current.delete(workerId);
        }
      };

      worker.postMessage(data);
    });
  }, [createWorker]);

  // Cleanup
  useEffect(() => {
    return () => {
      workersRef.current.forEach(worker => {
        worker.terminate();
      });
      workersRef.current.clear();
    };
  }, []);

  return {
    createWorker,
    executeInWorker,
    terminateWorker: (workerId: string) => {
      const worker = workersRef.current.get(workerId);
      if (worker) {
        worker.terminate();
        workersRef.current.delete(workerId);
      }
    },
    terminateAllWorkers: () => {
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current.clear();
    }
  };
};
