"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

export type InlineStatus = 
  | "idle"           // No hay procesamiento activo
  | "processing"     // Procesando mensaje del usuario
  | "thinking"       // El asistente está pensando
  | "generating"     // Generando respuesta
  | "error";         // Error en el proceso

export type Props = {
  status: InlineStatus;
  isVisible?: boolean;
};

const statusMessages = {
  idle: "",
  processing: "Procesando tu mensaje...",
  thinking: "El asistente está pensando...",
  generating: "Generando respuesta...",
  error: "Error al procesar mensaje"
};

export const InlineStatusIndicator = ({ status, isVisible = true }: Props) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Controlar animación de entrada/salida
  useEffect(() => {
    if (isVisible && status !== "idle") {
      setIsAnimating(true);
    } else {
      // Delay para permitir animación de salida
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, status]);

  // No mostrar nada si está en idle o no es visible
  if (status === "idle" || !isVisible) {
    return null;
  }

  return (
    <div 
      className={`
        transition-all duration-300 ease-in-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        px-4 py-2 mb-3
      `}
    >
      <div className={`flex items-center gap-2 text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
        {/* Icono de carga animado o error */}
        <Loader2Icon className={`w-4 h-4 ${status === 'error' ? 'text-red-500' : 'text-blue-500 animate-spin'}`} />
        
        {/* Mensaje de estado */}
        <span className="font-medium">
          {statusMessages[status]}
        </span>
        
        {/* Puntos animados para dar sensación de actividad (solo si no es error) */}
        {status !== 'error' && (
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
};

// Hook para gestionar el estado inline del chat
export const useInlineStatus = () => {
  const [status, setStatus] = useState<InlineStatus>("idle");

  const updateInlineStatus = (newStatus: InlineStatus) => {
    console.log(`🔄 Estado inline del chat: ${status} → ${newStatus}`, {
      timestamp: new Date().toISOString()
    });
    setStatus(newStatus);
  };

  const resetInlineStatus = () => {
    setStatus("idle");
  };

  return {
    status,
    updateInlineStatus,
    resetInlineStatus
  };
};
