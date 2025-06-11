"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, CheckCircleIcon, AlertCircleIcon, ClockIcon, ZapIcon } from "lucide-react";

export type ChatStatus = 
  | "idle"           // Esperando input del usuario
  | "typing"         // Usuario está escribiendo
  | "processing"     // Procesando mensaje (validaciones, contexto)
  | "thinking"       // LLM está generando respuesta
  | "streaming"      // Recibiendo respuesta del LLM
  | "cache_hit"      // Respuesta obtenida del caché
  | "completed"      // Respuesta completada
  | "error";         // Error en el proceso

export type Props = {
  status: ChatStatus;
  responseTime?: number; // Tiempo de respuesta en segundos
  isVisible?: boolean;
  message?: string;
};

const statusConfig = {
  idle: {
    icon: CheckCircleIcon,
    text: "Listo para recibir tu mensaje",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    animated: false
  },
  typing: {
    icon: ClockIcon,
    text: "Escribiendo...",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    animated: true
  },
  processing: {
    icon: Loader2Icon,
    text: "Procesando tu mensaje...",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    animated: true
  },
  thinking: {
    icon: Loader2Icon,
    text: "Generando respuesta...",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    animated: true
  },
  streaming: {
    icon: Loader2Icon,
    text: "Recibiendo respuesta...",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    animated: true
  },
  cache_hit: {
    icon: ZapIcon,
    text: "Respuesta instantánea desde caché",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    animated: false
  },
  completed: {
    icon: CheckCircleIcon,
    text: "Respuesta completada",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    animated: false
  },
  error: {
    icon: AlertCircleIcon,
    text: "Error al procesar mensaje",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    animated: false
  }
};

export const ChatStatusIndicator = ({ 
  status, 
  responseTime, 
  isVisible = true, 
  message 
}: Props) => {
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const config = statusConfig[status];
  const IconComponent = config.icon;

  // Contador de tiempo en tiempo real para estados activos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === "processing" || status === "thinking" || status === "streaming") {
      setDisplayTime(0);
      interval = setInterval(() => {
        setDisplayTime(prev => prev + 0.1);
      }, 100);
    } else {
      setDisplayTime(responseTime || 0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, responseTime]);

  // Animación de entrada/salida
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 
        transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div 
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
          ${config.bgColor} ${config.borderColor}
          backdrop-blur-sm
          max-w-sm
        `}
      >
        {/* Icono con animación condicional */}
        <div className="flex-shrink-0">
          <IconComponent 
            className={`
              w-5 h-5 ${config.color}
              ${config.animated ? 'animate-spin' : ''}
            `}
          />
        </div>

        {/* Contenido del estado */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${config.color}`}>
            {message || config.text}
          </div>
          
          {/* Tiempo de respuesta */}
          {(displayTime > 0 || status === "processing" || status === "thinking" || status === "streaming") && (
            <div className="text-xs text-gray-500 mt-1">
              {status === "cache_hit" ? (
                `⚡ Instantáneo (${displayTime.toFixed(3)}s)`
              ) : status === "completed" ? (
                `✅ Completado en ${displayTime.toFixed(1)}s`
              ) : (
                `⏱️ ${displayTime.toFixed(1)}s`
              )}
            </div>
          )}
        </div>

        {/* Barra de progreso para estados activos */}
        {(status === "processing" || status === "thinking" || status === "streaming") && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
            <div 
              className={`h-1 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`}
              style={{ 
                width: status === "processing" ? "33%" : 
                       status === "thinking" ? "66%" : 
                       status === "streaming" ? "90%" : "100%"
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Hook personalizado para gestionar el estado del chat
export const useChatStatus = () => {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [responseTime, setResponseTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const updateStatus = (newStatus: ChatStatus, customMessage?: string) => {
    console.log(`🔄 Estado del chat: ${status} → ${newStatus}`, {
      timestamp: new Date().toISOString(),
      previousResponseTime: responseTime,
      message: customMessage
    });

    setStatus(newStatus);
    if (customMessage) setMessage(customMessage);

    // 🚀 PASO 3.1: AL INICIO de cada nueva operación - Reset completo
    if (newStatus === "processing" || newStatus === "thinking" || newStatus === "streaming") {
      // Resetear completamente el contador
      setResponseTime(0);
      setStartTime(0);
      
      // Limpiar variables de tiempo anteriores
      console.log(`🧹 Reset completo del timer para nueva operación: ${newStatus}`);
      
      // Inicializar nuevo timer
      const newStartTime = performance.now();
      setStartTime(newStartTime);
      
      console.log(`🚀 Nuevo timer iniciado para ${newStatus}:`, {
        newStartTime,
        resetComplete: true,
        previousTimeCleared: true
      });
    }

    // 🎯 PASO 3.2: Durante la operación - Mantener solo tiempo actual
    // (El contador en tiempo real se maneja en el componente ChatStatusIndicator)

    // ✅ PASO 3.3: AL FINALIZAR - Calcular solo tiempo de esta operación
    if ((newStatus === "completed" || newStatus === "cache_hit" || newStatus === "error") && startTime > 0) {
      // Calcular solo el tiempo transcurrido de esta operación
      const endTime = performance.now();
      const operationTime = (endTime - startTime) / 1000; // Solo esta operación
      
      // Mostrar resultado individual
      setResponseTime(operationTime);
      
      console.log(`⏱️ Operación completada - Tiempo individual: ${operationTime.toFixed(3)}s`, {
        status: newStatus,
        startTime,
        endTime,
        operationTime,
        individualOperation: true,
        noAccumulation: true
      });
      
      // Limpiar variables para próxima operación
      setTimeout(() => {
        setStartTime(0);
        console.log(`🧹 Variables limpiadas para próxima operación`);
      }, 100);
    }

    // 🔄 Auto-transición con reset completo
    if (newStatus === "completed" || newStatus === "cache_hit") {
      setTimeout(() => {
        console.log(`🔄 Auto-reset después de completar operación`);
        resetStatus();
      }, 3000);
    }

    if (newStatus === "error") {
      setTimeout(() => {
        console.log(`🔄 Auto-reset después de error`);
        resetStatus();
      }, 5000);
    }
  };

  // 🧹 Reset completo del estado
  const resetStatus = () => {
    console.log(`🧹 Reset completo del estado del chat`);
    setStatus("idle");
    setResponseTime(0);
    setStartTime(0);
    setMessage("");
  };

  // 🔄 Reset manual para nueva operación
  const resetForNewOperation = () => {
    console.log(`🔄 Reset manual para nueva operación`);
    setResponseTime(0);
    setStartTime(0);
    setMessage("");
    // Mantener status actual
  };

  return {
    status,
    responseTime,
    message,
    updateStatus,
    resetStatus,
    resetForNewOperation
  };
};
