"use client";

import { ArtifactPanelPopup } from "@/components/artifact/artifact-panel-popup";
import { ChatInput, Props as ChatInputProps } from "@/components/chat/input";
import { ChatMessageList } from "@/components/chat/message-list";
import { Message, useChat } from "ai/react";
import { getSettings } from "@/lib/userSettings";
import { addMessage, createChat, getChatMessages } from "@/lib/db";
import { Loader2Icon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase";
import { Chat, Models, Attachment } from "@/app/types";
import { ArtifactMessagePartData } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useWhisper as useRealWhisper } from "@chengsokdara/use-whisper";
import { Props as ReactArtifactProps } from "@/components/artifact/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useScrollAnchor } from "@/lib/hooks/use-scroll-anchor";
import { useFakeWhisper } from "@/lib/hooks/use-fake-whisper";
import { chatOptimizer } from "@/lib/chatOptimizer";
import { fetchJSON, optimizedFetchManager } from "@/lib/optimizedFetch";
import { streamingOptimizer } from "@/lib/streamingOptimizer";
import { chatCache } from "@/lib/chatCache";
import { artifactOptimizer } from "@/lib/artifactOptimizer";
import { resourcePreloader } from "@/lib/resourcePreloader";
import { ChatStatusIndicator, useChatStatus } from "@/components/chat/status-indicator";
import { InlineStatusIndicator, useInlineStatus } from "@/components/chat/inline-status";

type Props = {
  id: string | null;
  onChatCreated?: (id: string) => void;
};

export const ChatPanel = ({ id, onChatCreated }: Props) => {
  // Get settings and supabase instance
  const settings = getSettings();
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Chat status management (Nielsen's Visibility of System Status)
  const { status, responseTime, message, updateStatus, resetStatus } = useChatStatus();
  
  // Inline status management (positioned below input field)
  const { status: inlineStatus, updateInlineStatus, resetInlineStatus } = useInlineStatus();

  // State management
  const [chatId, setChatId] = useState(id);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  
  // Efecto para limpiar mensajes cuando el ID cambia a null (nuevo chat)
  useEffect(() => {
    if (id === null && chatId !== null) {
      setChatId(null);
      setInitialMessages([]);
      setContextLoaded(false);
      contextLoadedRef.current = false;
    } else if (id !== chatId) {
      setChatId(id);
    }
  }, [id, chatId]);
  
  // Estado y referencias para el contexto
  const [contextLoaded, setContextLoaded] = useState(false);
  const contextMessagesRef = useRef<Message[]>([]);
  const contextLoadedRef = useRef(false);
  const loadingContextRef = useRef(false);
  const [currentArtifact, setCurrentArtifact] =
    useState<ArtifactMessagePartData | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>([]);
  
  // Estado para controlar la creación de chat y evitar duplicación
  const [chatCreated, setChatCreated] = useState(false);
  const chatCreationInProgressRef = useRef(false);

  // Función para verificar si hay mensajes de contexto
  const hasContextMessage = (messages: Message[]) => {
    return messages.some(m => 
      (m as any).message_type === "context" || 
      (m.metadata && typeof m.metadata === 'object' && 'isContext' in m.metadata && m.metadata.isContext)
    );
  };

  // Función para obtener el contexto desde el API (OPTIMIZADA)
  const fetchContext = async () => {
    try {
      console.log("🔄 Solicitando contexto desde el API con fetch optimizado...");
      
      // Mostrar estadísticas del fetch optimizado
      const fetchStats = optimizedFetchManager.getStats();
      console.log('📊 STATS FETCH OPTIMIZADO:', fetchStats);
      
      // Usar fetchJSON optimizado con configuración específica para contexto
      const data = await fetchJSON('/api/context', {
        method: 'GET',
        timeout: 8000, // 8 segundos timeout para contexto
        retries: 1, // Solo 1 reintento para contexto
        retryDelay: 500, // 500ms entre reintentos
        headers: {
          'Cache-Control': 'no-cache',
          'X-Request-Type': 'context-fetch'
        }
      });
      
      if (!data.success || !data.kpiAndSector) {
        console.error("❌ Formato de respuesta del contexto inválido:", data);
        throw new Error('El formato de respuesta del contexto es inválido');
      }
      
      console.log("✅ Contexto obtenido correctamente con fetch optimizado!!");
      return data.kpiAndSector;
      
    } catch (error) {
      console.error("❌ Error al obtener el contexto con fetch optimizado:", error);
      toast.error('No se pudo cargar el contexto. Algunas funciones pueden estar limitadas.');
      return null;
    }
  };

  // Función para cargar y añadir el contexto
  const loadAndAddContext = async () => {
    console.log("🔄 Iniciando carga de contexto...");
    // Prevenir múltiples cargas simultáneas
    if (loadingContextRef.current) {
      console.log("⚠️ Ya hay una carga de contexto en progreso, abortando");
      return null;
    }
    // Si el contexto ya está cargado, no hacer nada
    if (contextLoaded || contextLoadedRef.current) {
      console.log("ℹ️ El contexto ya está cargado, no es necesario volver a cargarlo");
      return null;
    }
    // Verificar si ya existe un mensaje de contexto
    if (hasContextMessage(contextMessagesRef.current)) {
      console.log("ℹ️ Ya existe un mensaje de contexto en los mensajes actuales");
      setContextLoaded(true);
      contextLoadedRef.current = true;
      return null;
    }
    // Establecer bloqueo para prevenir múltiples cargas
    loadingContextRef.current = true;
    console.log("🔒 Bloqueo establecido para prevenir múltiples cargas");
    try {
      // Verificar de nuevo en la base de datos si tenemos un chatId
      if (chatId) {
        console.log("🔍 Verificando si ya existe un mensaje de contexto en la base de datos");
        const dbMessages = await getChatMessages(supabase, chatId);
        const contextInDb = dbMessages.some(m => {
          const metadata = m.metadata as any;
          return m.text.includes("INFORMACIÓN CONTEXTUAL") || 
                 (metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
        });
        if (contextInDb) {
          console.log("✅ Se encontró un mensaje de contexto en la base de datos");
          setContextLoaded(true);
          contextLoadedRef.current = true;
          loadingContextRef.current = false;
          return null;
        }
        console.log("ℹ️ No se encontró un mensaje de contexto en la base de datos");
      }
      // Obtener contexto desde el API
      console.log("🔄 Obteniendo contexto desde el API");
      const contextData = await fetchContext();
      if (!contextData) {
        console.log("⚠️ No se pudo obtener el contexto desde el API");
        setContextLoaded(true);
        contextLoadedRef.current = true;
        loadingContextRef.current = false;
        return null;
      }
      console.log("✅ Contexto obtenido correctamente desde el API");
      // Crear mensaje de contexto
      console.log("🔄 Creando mensaje de contexto");
      const contextId = `context-${Date.now()}`;
      const contextMessage: Message = {
        id: contextId,
        role: "user",
        content: contextData,
        message_type: "context",
        metadata: { isContext: true }
      };
      console.log("✅ Mensaje de contexto creado:", contextId);
      // Guardar en la base de datos si ya tenemos chatId
      if (chatId) {
        console.log("🔄 Guardando mensaje de contexto en la base de datos");
        // Verificar una vez más por seguridad
        const dbMessages = await getChatMessages(supabase, chatId);
        const contextInDb = dbMessages.some(m => {
          const metadata = m.metadata as any;
          return (m as any).message_type === "context" || 
                 (metadata && typeof metadata === 'object' && metadata.isContext === true);
        });
        if (!contextInDb) {
          console.log("🔄 No se encontró un mensaje de contexto en la base de datos, guardando...");
          await addMessage(supabase, chatId, contextMessage);
          console.log("✅ Mensaje de contexto guardado en la base de datos");
        } else {
          console.log("ℹ️ Ya existe un mensaje de contexto en la base de datos, no es necesario guardarlo");
        }
      }
      // Actualizar el estado local de mensajes
      console.log("🔄 Actualizando el estado local de mensajes");
      if (!hasContextMessage(contextMessagesRef.current)) {
        setMessages(prevMessages => {
          if (!hasContextMessage(prevMessages)) {
            console.log("✅ Añadiendo mensaje de contexto al estado local");
            return [contextMessage, ...prevMessages];
          }
          console.log("ℹ️ Ya existe un mensaje de contexto en el estado local");
          return prevMessages;
        });
      }
      // Marcar el contexto como cargado
      console.log("✅ Marcando el contexto como cargado");
      setContextLoaded(true);
      contextLoadedRef.current = true;
      loadingContextRef.current = false;
      return contextMessage;
    } catch (error) {
      console.error("❌ Error al cargar el contexto:", error);
      loadingContextRef.current = false;
      setContextLoaded(true);
      contextLoadedRef.current = true;
      return null;
    }
  };

  // Fetch messages for existing chat
  const fetchMessages = async () => {
    if (chatId) {
      setFetchingMessages(true);
      // Verificar si ya existe un mensaje de contexto en la base de datos
      const dbMessages = await getChatMessages(supabase, chatId);
      const contextInDb = dbMessages.some(m => {
        const metadata = m.metadata as any;
        return m.text.includes("INFORMACIÓN CONTEXTUAL") || 
               (metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
      });
      // Marcar el contexto como cargado si ya existe
      if (contextInDb) {
        setContextLoaded(true);
        contextLoadedRef.current = true;
      } else {
        setContextLoaded(false);
        contextLoadedRef.current = false;
      }
      // Formatear y filtrar mensajes duplicados
      const formattedMessages = dbMessages.map((message) => {
        const isContextMessage = message.text.includes("INFORMACIÓN CONTEXTUAL");
        const metadata = isContextMessage 
          ? { isContext: true } 
          : message.metadata as any;
          
        return {
          id: String(message.id),
          role: message.role as Message["role"],
          content: message.text,
          experimental_attachments: (message.attachments as Attachment[]) || [],
          message_type: isContextMessage ? "context" : undefined,
          metadata: metadata
        };
      });
      // Eliminar mensajes de contexto duplicados
      const uniqueContextIds = new Set<string>();
      const filteredMessages = formattedMessages.filter(msg => {
        const metadata = msg.metadata as any;
        const isContextMsg = msg.message_type === "context" || 
                            (metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
        
        if (!isContextMsg) {
          return true;
        }
        if (!uniqueContextIds.has(msg.id)) {
          uniqueContextIds.add(msg.id);
          return true;
        }
        return false;
      });
      setInitialMessages(filteredMessages);
      setFetchingMessages(false);
    } else {
      setInitialMessages([]);
      console.log("Chat nuevo detectado, cargando contexto inmediatamente...");
      // Cargar contexto inmediatamente para chats nuevos
      loadAndAddContext();
    }
  };

  // Funciones para controlar el estado de creación de chat
  const startChatCreation = useCallback(() => {
    // Verificar si ya hay un chat en proceso de creación
    const chatInProgress = localStorage.getItem('chatCreationInProgress');
    if (chatInProgress || chatCreationInProgressRef.current || chatCreated) {
      console.log("🚫 Creación de chat ya en progreso, evitando duplicación");
      return false;
    }
    
    console.log("✅ Iniciando creación de chat");
    localStorage.setItem('chatCreationInProgress', 'true');
    chatCreationInProgressRef.current = true;
    return true;
  }, [chatCreated]);

  const finishChatCreation = useCallback(() => {
    console.log("✅ Finalizando creación de chat");
    localStorage.removeItem('chatCreationInProgress');
    chatCreationInProgressRef.current = false;
    setChatCreated(true);
  }, []);

  // Limpiar el estado de creación cuando se inicia un nuevo chat
  useEffect(() => {
    if (id === null && chatId === null) {
      console.log("🔄 Reiniciando estado de creación de chat");
      localStorage.removeItem('chatCreationInProgress');
      chatCreationInProgressRef.current = false;
      setChatCreated(false);
    }
  }, [id, chatId]);

  // Pre-cargar recursos y cargar contexto al montar el componente
  useEffect(() => {
    // Pre-cargar recursos comunes del sistema
    resourcePreloader.preloadCommonResources()
      .then(() => {
        console.log('📦 Recursos comunes pre-cargados exitosamente');
        // Mostrar estadísticas de pre-loading
        const preloadStats = resourcePreloader.getPreloadStats();
        console.log('📊 STATS PRE-LOADING:', preloadStats);
      })
      .catch(error => {
        console.error('❌ Error en pre-carga de recursos:', error);
      });

    // Pre-cargar recursos específicos para artefactos
    resourcePreloader.preloadArtifactResources()
      .then(() => {
        console.log('🎨 Recursos de artefactos pre-cargados exitosamente');
      })
      .catch(error => {
        console.error('❌ Error en pre-carga de recursos de artefactos:', error);
      });

    // Cargar contexto si es un chat nuevo
    if (!chatId && !contextLoaded && !contextLoadedRef.current) {
      console.log("Cargando contexto al iniciar...");
      loadAndAddContext();
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Create new chat mutation
  const createChatMutation = useMutation({
    mutationFn: async ({
      title,
      messages,
    }: {
      title: string;
      messages: Message[];
    }) => await createChat(supabase, title, session?.user.id),
    onSuccess: async (newChat, { messages }) => {
      try {
        console.log("✅ Chat creado exitosamente:", newChat.id);
        queryClient.setQueryData<Chat[]>(["chats"], (oldChats) => {
          return [...(oldChats || []), newChat];
        });
        setChatId(newChat.id);

        // Guardar todos los mensajes, incluido el de contexto si existe
        console.log("🔄 Guardando mensajes en la base de datos");
        for (const message of messages) {
          await addMessage(supabase, newChat.id, message);
        }

        // Notificar que se ha creado un nuevo chat
        if (onChatCreated) {
          console.log("🔄 Notificando creación de chat y actualizando URL");
          onChatCreated(newChat.id);
          
          // Actualizar la URL sin recargar la página
          const newUrl = `/artifact-workspace?chat=${newChat.id}`;
          window.history.pushState({ chatId: newChat.id }, '', newUrl);
        } else {
          // En el chat normal, redirigir a la página del chat
          console.log("🔄 Redirigiendo a la página del chat");
          router.push(`/chat/${newChat.id}`);
        }
      } finally {
        // Finalizar el proceso de creación de chat
        finishChatCreation();
      }
    },
  });

  // Chat hook setup con streaming optimizado
  const {
    messages,
    input,
    setInput,
    append,
    setMessages,
    stop: stopGenerating,
    isLoading: generatingResponse,
  } = useChat({
    initialMessages,
    onFinish: async (message) => {
      const finishTime = performance.now();
      console.log('🎯 RESPUESTA LLM COMPLETADA:', finishTime);
      
      // Finalizar tracking de streaming
      streamingOptimizer.finishStreamingTracking(message.id, message.content);
      
      // Mostrar estadísticas de streaming
      const streamingStats = streamingOptimizer.getStreamingStats();
      console.log('📊 STATS STREAMING:', streamingStats);
      
      // Cachear la respuesta para futuras consultas
      const cacheStartTime = performance.now();
      console.log('💾 Cacheando respuesta del LLM...');
      
      // Obtener el último mensaje del usuario (excluyendo contexto)
      const userMessages = messages.filter(m => 
        m.role === 'user' && 
        (m as any).message_type !== "context" && 
        !(m.metadata && typeof m.metadata === 'object' && 'isContext' in m.metadata && m.metadata.isContext)
      );
      
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        chatCache.set(lastUserMessage.content, message.content);
        
        // Mostrar estadísticas del caché después de agregar
        const cacheStats = chatCache.getStats();
        console.log('📊 STATS CACHÉ DESPUÉS DE AGREGAR:', cacheStats);
      }
      
      const cacheTime = performance.now();
      console.log('✅ Respuesta cacheada:', cacheTime - cacheStartTime, 'ms');
      
      const dbSaveStartTime = performance.now();
      console.log('💾 Iniciando guardado en base de datos...');
      
      if (chatId) {
        await addMessage(supabase, chatId, message);
      }
      
      const dbSaveTime = performance.now();
      console.log('✅ Guardado en BD completado:', dbSaveTime - dbSaveStartTime, 'ms');
      console.log('📊 TIEMPO TOTAL DESDE RESPUESTA HASTA GUARDADO:', dbSaveTime - finishTime, 'ms');
      
      // Limpiar mensaje optimista si existe
      streamingOptimizer.clearOptimisticMessage(message.id);
      
      // Actualizar estado: Respuesta completada
      updateStatus("completed", "Respuesta completada");
      updateInlineStatus("generating");
      
      // Resetear estado inline después de un breve delay
      setTimeout(() => {
        resetInlineStatus();
      }, 1000);
    },
    sendExtraMessageFields: true,
  });

  // Actualizar la referencia de mensajes cuando cambian
  useEffect(() => {
    contextMessagesRef.current = messages;
  }, [messages]);

  // Efecto adicional para limpiar mensajes cuando el ID cambia (después de useChat)
  useEffect(() => {
    if (id === null && chatId !== null && setMessages) {
      setMessages([]);
    }
  }, [id, chatId, setMessages]);

  // Scroll as new messages are added
  const { messagesRef, scrollRef, showScrollButton, handleManualScroll, forceScrollToBottom } =
    useScrollAnchor(messages, generatingResponse);

  // Create new chat when conditions are met
  useEffect(() => {
    const createNewChat = async () => {
      if (!chatId && messages.filter(msg => msg.role === 'assistant').length === 1 && !generatingResponse) {
        // Verificar si podemos iniciar la creación del chat
        if (!startChatCreation()) {
          return;
        }
        
        try {
          console.log("🔄 Iniciando proceso de creación de chat");
          // Obtener el primer mensaje del usuario que no es de contexto
          const userMessage = messages.find(
            (msg) => msg.role === 'user' && !msg.metadata?.isContext
          );

          const title = userMessage?.content.slice(0, 100) || 'Nuevo Chat';

          // Verificar si ya tenemos un mensaje de contexto
          if (hasContextMessage(messages)) {
            console.log("✅ Creando chat con contexto existente");
            createChatMutation.mutate({
              title,
              messages: messages,
            });
            return;
          }
          // Si no hay contexto, lo cargamos
          console.log("🔄 Cargando contexto para el nuevo chat");
          const contextData = await fetchContext();
          if (contextData) {
            // Crear mensaje de contexto
            const contextMessage: Message = {
              id: `context-${Date.now()}`,
              role: "user",
              content: contextData,
              message_type: "context",
              metadata: { isContext: true }
            };
            console.log("✅ Creando chat con nuevo contexto");
            createChatMutation.mutate({
              title: messages[0].content.slice(0, 100),
              messages: [contextMessage, ...messages],
            });
          } else {
            console.log("⚠️ Creando chat sin contexto");
            createChatMutation.mutate({
              title: messages[0].content.slice(0, 100),
              messages: messages,
            });
          }
        } catch (error) {
          console.error("❌ Error en la creación del chat:", error);
          finishChatCreation();
        }
      }
    };
    createNewChat();
  }, [chatId, messages, generatingResponse, startChatCreation, finishChatCreation]);

  // Whisper hook setup for voice input
  const hasOpenAIKey = !!settings.openaiApiKey;
  
  // Always call both hooks, but use the appropriate one
  const realWhisperResult = useRealWhisper({
    apiKey: settings.openaiApiKey || 'dummy-key',
    onTranscribe: hasOpenAIKey ? undefined : async () => Promise.resolve({ text: '' }),
  });
  
  const fakeWhisperResult = useFakeWhisper();
  
  // Use the appropriate result based on API key availability
  const { recording, transcribing, transcript, startRecording, stopRecording } = 
    hasOpenAIKey ? realWhisperResult : fakeWhisperResult;

  // Update input with transcribed text
  useEffect(() => {
    if (!recording && !transcribing && transcript?.text) {
      setInput((prev) => prev + ` ${transcript.text}`);
    }
  }, [recording, transcribing, transcript?.text, setInput]);

  // Handle artifact capture
  const handleCapture: ReactArtifactProps["onCapture"] = ({
    selectionImg,
    artifactImg,
  }) => {
    setAttachments((prev) => [
      ...prev,
      {
        contentType: "image/png",
        url: selectionImg,
      },
    ]);

    setSelectedArtifacts((prev) => {
      if (prev.includes(artifactImg)) return prev;
      return [...prev, artifactImg];
    });
  };

  // Handle attachment management
  const handleAddAttachment: ChatInputProps["onAddAttachment"] = (
    newAttachments
  ) => {
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment: ChatInputProps["onRemoveAttachment"] = (
    attachment
  ) => {
    setAttachments((prev) =>
      prev.filter((item) => item.url !== attachment.url)
    );
  };

  // Función interna para procesar el mensaje con caché inteligente
  const processMessage = async (message: string) => {
    const startTime = performance.now();
    console.log('🚀 INICIANDO ENVÍO DE MENSAJE:', startTime);

    // Actualizar estado: Procesando mensaje
    updateStatus("processing", "Procesando tu mensaje...");
    updateInlineStatus("processing");

    try {
      // Paso 0: Verificar caché primero
      const cacheStartTime = performance.now();
      console.log('💾 Verificando caché para mensaje...');
      
      const cachedResponse = chatCache.get(message);
      if (cachedResponse) {
        console.log('⚡ RESPUESTA DESDE CACHÉ - Tiempo: 0ms');
        
        // Actualizar estado: Respuesta desde caché
        updateStatus("cache_hit", "Respuesta instantánea desde caché");
        
        // Mostrar estadísticas del caché
        const cacheStats = chatCache.getStats();
        console.log('📊 STATS CACHÉ:', cacheStats);
        
        // Agregar mensaje del usuario
        const userMessage: Message = {
          id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: "user",
          content: message
        };
        
        // Agregar respuesta desde caché
        const assistantMessage: Message = {
          id: cachedResponse.id,
          role: "assistant",
          content: cachedResponse.content
        };
        
        // Actualizar mensajes en el estado
        setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
        
        // Limpiar input y estado
        setInput("");
        stopRecording();
        setAttachments([]);
        setSelectedArtifacts([]);
        
        // Guardar en base de datos si hay chatId
        if (chatId) {
          await addMessage(supabase, chatId, userMessage);
          await addMessage(supabase, chatId, assistantMessage);
        }
        
        const cacheTime = performance.now();
        console.log('✅ Respuesta desde caché completada:', cacheTime - startTime, 'ms');
        return;
      }
      
      const cacheCheckTime = performance.now();
      console.log('🔍 Cache MISS - Continuando con LLM:', cacheCheckTime - cacheStartTime, 'ms');

      // Paso 1: Validación inicial
      const validationStartTime = performance.now();
      console.log('🔍 Iniciando validación de API keys...');
      
      const settings = getSettings();

      if (settings.model === Models.claude && !settings.anthropicApiKey) {
        toast.error("Please enter your Claude API Key");
        return;
      }

      if (settings.model.startsWith("gpt") && !settings.openaiApiKey) {
        toast.error("Please enter your OpenAI API Key");
        return;
      }
      
      const validationTime = performance.now();
      console.log('✅ Validación completada:', validationTime - validationStartTime, 'ms');

      // Paso 2: Verificación y carga de contexto
      const contextStartTime = performance.now();
      console.log('🔄 Iniciando verificación de contexto...');
      
      if (chatId && !contextLoaded && !contextLoadedRef.current) {
        const dbMessages = await getChatMessages(supabase, chatId);
        const contextInDb = dbMessages.some(m => {
          const metadata = m.metadata as any;
          return m.text.includes("INFORMACIÓN CONTEXTUAL") || 
                 (metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
        });
        if (contextInDb) {
          setContextLoaded(true);
          contextLoadedRef.current = true;
        } else if (!hasContextMessage(contextMessagesRef.current)) {
          await loadAndAddContext();
        }
      } else if (!contextLoaded && !contextLoadedRef.current && !hasContextMessage(contextMessagesRef.current)) {
        await loadAndAddContext();
      }
      
      const contextTime = performance.now();
      console.log('✅ Verificación de contexto completada:', contextTime - contextStartTime, 'ms');

      // Paso 3: Preparación de attachments
      const attachmentStartTime = performance.now();
      console.log('📎 Preparando attachments...');
      
      const messageAttachments = [
        ...attachments
          .filter((item) => item.contentType?.startsWith("image"))
          .map((item) => ({ url: item.url, contentType: item.contentType })),
        ...selectedArtifacts.map((url) => ({ url })),
      ];
      
      const attachmentTime = performance.now();
      console.log('✅ Attachments preparados:', attachmentTime - attachmentStartTime, 'ms');
      console.log("📎 Enviando mensaje con attachments:", messageAttachments);

      // Paso 4: Envío del mensaje (append) con streaming tracking
      const appendStartTime = performance.now();
      console.log('🌐 Iniciando envío del mensaje al LLM...');
      
      // Actualizar estado: Generando respuesta
      updateStatus("thinking", "Generando respuesta...");
      updateInlineStatus("thinking");
      
      // Generar ID único para el mensaje de respuesta
      const responseMessageId = `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear mensaje optimista
      const optimisticMessage = streamingOptimizer.createOptimisticMessage(responseMessageId, message);
      console.log('🔮 Mensaje optimista creado para respuesta inmediata');
      
      // Iniciar tracking de streaming
      streamingOptimizer.startStreamingTracking(responseMessageId);
      
      append(
        {
          role: "user",
          content: message,
          experimental_attachments: messageAttachments,
        },
        {
          body: {
            model: settings.model,
            apiKey: settings.model.startsWith("gpt")
              ? settings.openaiApiKey
              : settings.anthropicApiKey,
            experimental_attachments: messageAttachments,
          },
        }
      );
      
      // Actualizar estado: Recibiendo respuesta
      updateStatus("streaming", "Recibiendo respuesta...");
      
      const appendTime = performance.now();
      console.log('✅ Mensaje enviado al LLM:', appendTime - appendStartTime, 'ms');

      // Paso 5: Limpieza del estado
      const cleanupStartTime = performance.now();
      console.log('🧹 Iniciando limpieza del estado...');
      
      setInput("");
      stopRecording();

      if (chatId) {
        await addMessage(
          supabase,
          chatId,
          { role: "user", content: message },
          attachments
        );
      }

      setAttachments([]);
      setSelectedArtifacts([]);
      
      const cleanupTime = performance.now();
      console.log('✅ Limpieza completada:', cleanupTime - cleanupStartTime, 'ms');

      // Tiempo total
      const totalTime = performance.now();
      console.log('⏰ TIEMPO TOTAL DE ENVÍO:', totalTime - startTime, 'ms');
      
      // Resumen de tiempos
      console.log('📊 RESUMEN DE TIEMPOS:');
      console.log('  - Validación:', validationTime - validationStartTime, 'ms');
      console.log('  - Contexto:', contextTime - contextStartTime, 'ms');
      console.log('  - Attachments:', attachmentTime - attachmentStartTime, 'ms');
      console.log('  - Envío LLM:', appendTime - appendStartTime, 'ms');
      console.log('  - Limpieza:', cleanupTime - cleanupStartTime, 'ms');
      console.log('  - TOTAL:', totalTime - startTime, 'ms');
      
    } catch (error) {
      const errorTime = performance.now();
      console.error('❌ Error en handleSend:', error);
      console.log('⏰ Tiempo hasta error:', errorTime - startTime, 'ms');
      
      // Actualizar estado: Error
      updateStatus("error", "Error al procesar mensaje");
      updateInlineStatus("error");
      
      // Resetear estado inline después de mostrar el error
      setTimeout(() => {
        resetInlineStatus();
      }, 3000);
    }
  };

  // Handle sending messages con optimizaciones
  const handleSend = async () => {
    const query = input.trim();
    if (!query) return;

    // Mostrar estadísticas del optimizador
    const stats = chatOptimizer.getStats();
    console.log('📊 STATS CHATOPTIMIZER:', stats);

    // Mostrar estadísticas del fetch optimizado
    const fetchStats = optimizedFetchManager.getStats();
    console.log('📊 STATS FETCH OPTIMIZADO:', fetchStats);

    // Usar debouncing para evitar múltiples requests rápidos
    console.log('🎯 Usando ChatOptimizer con debouncing...');
    chatOptimizer.debouncedSend(query, processMessage, 300);
  };

  // Cleanup del optimizador al desmontar el componente
  useEffect(() => {
    return () => {
      console.log('🧹 Limpiando ChatOptimizer al desmontar componente');
      chatOptimizer.cancelPendingRequests();
    };
  }, []);

  // Reset del optimizador cuando cambia el chat
  useEffect(() => {
    if (chatId) {
      console.log('🔄 Reseteando ChatOptimizer para nuevo chat:', chatId);
      chatOptimizer.reset();
    }
  }, [chatId]);

  return (
    <>
      {/* Indicador de estado del chatbot (Nielsen's Visibility of System Status) */}
      <ChatStatusIndicator 
        status={status}
        responseTime={responseTime}
        message={message}
        isVisible={status !== "idle"}
      />

      <div
        className="relative flex w-full flex-1 flex-col h-full overflow-hidden"
      >
        <div className="relative mx-auto w-full min-w-[400px] max-w-3xl flex-1 flex flex-col h-full md:px-2">
          {fetchingMessages && <Loader2Icon className="animate-spin mx-auto" />}

          {/* ✅ CORRECCIÓN: scrollRef apunta al contenedor con scroll real */}
          <div className="flex-1 overflow-y-auto mb-4" ref={scrollRef}>
            <div className="flex flex-col">
              <ChatMessageList
                messages={messages.filter(
                  (message) => {
                    const metadata = message.metadata as any;
                    return (message as any).message_type !== "context" && 
                          !(metadata && typeof metadata === 'object' && 'isContext' in metadata && metadata.isContext);
                  }
                )}
                setCurrentArtifact={setCurrentArtifact}
                containerRef={messagesRef}
              />
            </div>
          </div>

          {/* Input fijo en la parte inferior */}
          <div className="sticky bottom-0 w-full bg-white z-10">
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              isLoading={generatingResponse}
              recording={recording}
              onStartRecord={startRecording}
              onStopRecord={stopRecording}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              showScrollButton={showScrollButton}
              handleManualScroll={handleManualScroll}
              stopGenerating={stopGenerating}
            />
            
            {/* Indicador de estado inline - aparece justo debajo del input */}
            <InlineStatusIndicator 
              status={inlineStatus}
              isVisible={inlineStatus !== "idle"}
            />
          </div>
        </div>
      </div>

      <ArtifactPanelPopup
        artifact={currentArtifact}
        isOpen={!!currentArtifact}
        onClose={() => setCurrentArtifact(null)}
        recording={recording}
        onCapture={handleCapture}
      />
    </>
  );
};
