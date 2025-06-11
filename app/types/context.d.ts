import { Message } from "ai/react";

// Extensión del tipo Message de la librería ai/react
declare module "ai/react" {
  interface Message {
    message_type?: string;    // Tipo de mensaje (ej: "context")
    metadata?: {
      isContext?: boolean;    // Indicador de que es un mensaje de contexto
    } | any;
  }
}
