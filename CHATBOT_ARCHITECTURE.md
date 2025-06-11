# ARQUITECTURA DEL SISTEMA DE CHATBOT - DEMO INSIGHT CANVAS

## 📋 RESUMEN EJECUTIVO

El sistema de chatbot en demo-insight-canvas es una aplicación compleja que integra múltiples tecnologías para proporcionar una experiencia de chat inteligente con capacidades de generación de artefactos, consultas a base de datos Memgraph, y renderizado de visualizaciones dinámicas.

## 🏗️ ARQUITECTURA GENERAL

### **Componentes Principales:**
1. **Frontend React** - Interfaz de usuario del chat
2. **API Routes Next.js** - Endpoints del servidor
3. **Integración LLM** - OpenAI/Anthropic para procesamiento de lenguaje
4. **Base de Datos Supabase** - Almacenamiento de mensajes y artefactos
5. **Memgraph** - Base de datos de grafos para consultas especializadas
6. **Sistema de Artefactos** - Generación y renderizado de contenido dinámico

## 🔄 FLUJO COMPLETO DEL CHATBOT

### **1. INICIO DE CONVERSACIÓN**

```
Usuario accede → ChatPanel se monta → Carga contexto automáticamente
```

**Archivos involucrados:**
- `components/chat/panel.tsx` (Componente principal)
- `app/api/context/route.ts` (Carga de contexto)

**Proceso:**
1. El `ChatPanel` se monta y detecta si es un chat nuevo o existente
2. Si es nuevo, carga contexto inmediatamente desde `/api/context`
3. Si es existente, obtiene mensajes de Supabase y verifica contexto

### **2. ENVÍO DE MENSAJE**

```
Usuario escribe → Click "Enviar" → handleSend() → append() → API /chat
```

**Flujo detallado:**

#### **A. Captura de Input (`components/chat/input.tsx`)**
```typescript
// Función principal de envío
const handleSend = async () => {
  const query = input.trim();
  if (!query) return;

  // Validación de API keys
  if (settings.model === Models.claude && !settings.anthropicApiKey) {
    toast.error("Please enter your Claude API Key");
    return;
  }

  // Verificar y cargar contexto si es necesario
  if (!contextLoaded && !hasContextMessage(contextMessagesRef.current)) {
    await loadAndAddContext();
  }

  // Preparar attachments
  const messageAttachments = [
    ...attachments.filter(item => item.contentType?.startsWith("image")),
    ...selectedArtifacts.map(url => ({ url }))
  ];

  // Enviar mensaje usando hook useChat
  append({
    role: "user",
    content: query,
    experimental_attachments: messageAttachments,
  }, {
    body: {
      model: settings.model,
      apiKey: settings.model.startsWith("gpt") 
        ? settings.openaiApiKey 
        : settings.anthropicApiKey,
      experimental_attachments: messageAttachments,
    },
  });
}
```

#### **B. Procesamiento en API (`app/api/chat/route.ts`)**

**Flujo de procesamiento:**

1. **Recepción de datos:**
```typescript
const { messages: originalMessages, apiKey, model } = await req.json();
```

2. **Configuración del LLM:**
```typescript
// Selección del modelo (OpenAI o Anthropic)
if (model === Models.claude || model === Models.claude35Sonnet) {
  const anthropic = createAnthropic({ apiKey });
  llm = anthropic(model);
} else if (model.startsWith("gpt")) {
  const openai = createOpenAI({ apiKey });
  llm = openai(model);
}
```

3. **Preparación de mensajes:**
```typescript
const coreMessages: CoreMessage[] = [
  ...convertToCoreMessages(initialMessages),
  {
    role: "user",
    content: [
      { type: "text", text: currentMessage.content },
      ...imageParts, // Attachments de imágenes
    ],
  },
];
```

4. **Primera llamada al LLM:**
```typescript
const result = await streamText({
  model: llm,
  messages: coreMessages,
  system: ArtifactoSystemPrompt,
  ...options,
});
```

5. **Detección de consultas Memgraph:**
```typescript
// Buscar patrones de consulta Memgraph en la respuesta
const memgraphQueryMatch = fullResponse.match(/<memgraph_query>([\s\S]*?)<\/memgraph_query>/);

if (memgraphQueryMatch && memgraphQueryMatch[1]) {
  const cypherQuery = memgraphQueryMatch[1].trim();
  
  try {
    // Ejecutar consulta Cypher
    const queryResults = await executeCypherQuery(cypherQuery);
    
    // Segunda llamada al LLM con resultados
    const secondResult = await streamText({
      model: llm,
      messages: [...coreMessages, 
        { role: 'assistant', content: fullResponse },
        { role: 'system', content: `Results: ${JSON.stringify(queryResults)}` }
      ],
      system: ArtifactoSystemPrompt,
    });
    
    return secondResult.toAIStreamResponse();
  } catch (error) {
    // Manejo de errores de Memgraph
  }
}
```

### **3. PROCESAMIENTO DE RESPUESTA**

#### **A. System Prompt (`app/api/chat/systemPrompt.ts`)**

**Características principales:**
- **Detección de consultas Memgraph:** Identifica cuándo necesita datos de la base de grafos
- **Generación de artefactos:** Crea contenido HTML, React, SVG, etc.
- **Manejo de contexto:** Utiliza información contextual de artifacts
- **Restricciones de datos:** NUNCA simula datos, solo usa datos reales de Memgraph

**Ejemplo de instrucción para Memgraph:**
```
When a user's question requires information from the knowledge base:
1. Formulate a Cypher query
2. Output: `<memgraph_query>YOUR_CYPHER_QUERY_HERE</memgraph_query>`
3. STOP your response
```

#### **B. Streaming de respuesta**
```typescript
// El LLM retorna un stream que se envía al cliente
return result.toAIStreamResponse();
```

### **4. RENDERIZADO DE MENSAJES**

#### **A. Lista de mensajes (`components/chat/message-list.tsx`)**
```typescript
// Filtra mensajes de contexto y renderiza solo mensajes de usuario/asistente
const visibleMessages = messages.filter(message => {
  const metadata = message.metadata as any;
  return message.message_type !== "context" && 
         !(metadata?.isContext);
});
```

#### **B. Mensaje individual (`components/chat/message.tsx`)**
- Detecta y renderiza artefactos
- Maneja attachments de imágenes
- Aplica formato markdown

### **5. GESTIÓN DE CONTEXTO**

#### **A. Carga automática de contexto (`components/chat/panel.tsx`)**
```typescript
const loadAndAddContext = async () => {
  // Prevenir múltiples cargas simultáneas
  if (loadingContextRef.current || contextLoaded) return;
  
  loadingContextRef.current = true;
  
  try {
    // Obtener contexto desde API
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
      
      // Guardar en BD si existe chatId
      if (chatId) {
        await addMessage(supabase, chatId, contextMessage);
      }
      
      // Actualizar estado local
      setMessages(prev => [contextMessage, ...prev]);
    }
  } finally {
    loadingContextRef.current = false;
    setContextLoaded(true);
  }
};
```

#### **B. API de contexto (`app/api/context/route.ts`)**

**Funciones principales:**
1. **Extracción de artifacts:** Busca artifacts tipo "master" en Supabase
2. **Procesamiento de datos:** Convierte JSON o extrae datos de APIs
3. **Creación de contexto:** Genera información contextual para el LLM
4. **Fallback:** Crea artifacts de ejemplo si no existen datos

```typescript
// Buscar artifacts master
const { data: masterArtifacts } = await supabase
  .from("artifacts")
  .select("*")
  .eq("type", "master")
  .eq("user_id", user.id);

// Procesar cada artifact
for (const artifact of masterArtifacts) {
  if (isReactCode(artifact.code)) {
    // Extraer datos de APIs desde código React
    const apiData = await extractApiDataFromReactCode(artifact.code);
    dataByType[artifact.name] = apiData;
  } else if (isValidJSON(artifact.code)) {
    // Procesar como JSON directo
    const content = safeJSONParse(artifact.code);
    dataByType[artifact.name] = content;
  }
}
```

### **6. CREACIÓN DE CHATS**

#### **A. Detección de nuevo chat**
```typescript
useEffect(() => {
  const createNewChat = async () => {
    // Crear chat cuando hay 1 respuesta del asistente y no está generando
    if (!chatId && 
        messages.filter(msg => msg.role === 'assistant').length === 1 && 
        !generatingResponse) {
      
      if (!startChatCreation()) return; // Prevenir duplicación
      
      try {
        const title = userMessage?.content.slice(0, 100) || 'Nuevo Chat';
        
        // Incluir contexto si existe
        const messagesToSave = hasContextMessage(messages) 
          ? messages 
          : [contextMessage, ...messages];
          
        createChatMutation.mutate({ title, messages: messagesToSave });
      } finally {
        finishChatCreation();
      }
    }
  };
  
  createNewChat();
}, [chatId, messages, generatingResponse]);
```

#### **B. Mutación de creación**
```typescript
const createChatMutation = useMutation({
  mutationFn: async ({ title, messages }) => 
    await createChat(supabase, title, session?.user.id),
  
  onSuccess: async (newChat, { messages }) => {
    // Actualizar cache de React Query
    queryClient.setQueryData(["chats"], oldChats => 
      [...(oldChats || []), newChat]);
    
    // Guardar mensajes en BD
    for (const message of messages) {
      await addMessage(supabase, newChat.id, message);
    }
    
    // Actualizar URL y notificar
    setChatId(newChat.id);
    if (onChatCreated) {
      onChatCreated(newChat.id);
      window.history.pushState({ chatId: newChat.id }, '', 
        `/artifact-workspace?chat=${newChat.id}`);
    }
  },
});
```

## 🔧 COMPONENTES TÉCNICOS DETALLADOS

### **1. Hooks y Estado**

#### **A. useChat (AI SDK)**
```typescript
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
    if (chatId) {
      await addMessage(supabase, chatId, message);
    }
  },
  sendExtraMessageFields: true,
});
```

#### **B. Estado de contexto**
```typescript
const [contextLoaded, setContextLoaded] = useState(false);
const contextMessagesRef = useRef<Message[]>([]);
const contextLoadedRef = useRef(false);
const loadingContextRef = useRef(false);
```

#### **C. Control de creación de chat**
```typescript
const [chatCreated, setChatCreated] = useState(false);
const chatCreationInProgressRef = useRef(false);

const startChatCreation = useCallback(() => {
  const chatInProgress = localStorage.getItem('chatCreationInProgress');
  if (chatInProgress || chatCreationInProgressRef.current || chatCreated) {
    return false; // Prevenir duplicación
  }
  
  localStorage.setItem('chatCreationInProgress', 'true');
  chatCreationInProgressRef.current = true;
  return true;
}, [chatCreated]);
```

### **2. Integración con Memgraph**

#### **A. Servicio Memgraph (`lib/memgraphService.ts`)**
```typescript
export async function executeCypherQuery(query: string) {
  try {
    const response = await fetch(MEMGRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${MEMGRAPH_AUTH}`,
      },
      body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error executing Cypher query:', error);
    throw error;
  }
}
```

#### **B. Tipos de consultas soportadas**
- **KPIMortality:** Datos de mortalidad
- **KPIFeedConsumption:** Consumo de alimento
- **KPIAnimalWeight:** Peso de animales
- **KPIConversionRate:** Tasas de conversión
- **KPITemperatureSummary:** Datos de temperatura

### **3. Sistema de Attachments**

#### **A. Manejo de archivos**
```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const filesArray = Array.from(e.target.files);
    const newAttachments = await Promise.all(
      filesArray.map(async (file) => ({
        url: await convertFileToBase64(file),
        name: file.name,
        contentType: file.type,
      }))
    );
    onAddAttachment(newAttachments);
  }
};
```

#### **B. Captura de artefactos**
```typescript
const handleCapture: ReactArtifactProps["onCapture"] = ({
  selectionImg,
  artifactImg,
}) => {
  setAttachments(prev => [...prev, {
    contentType: "image/png",
    url: selectionImg,
  }]);
  
  setSelectedArtifacts(prev => {
    if (prev.includes(artifactImg)) return prev;
    return [...prev, artifactImg];
  });
};
```

### **4. Integración con Whisper (Voz)**

#### **A. Configuración dual**
```typescript
// Hook real de Whisper (con API key)
const realWhisperResult = useRealWhisper({
  apiKey: settings.openaiApiKey || 'dummy-key',
  onTranscribe: hasOpenAIKey ? undefined : async () => Promise.resolve({ text: '' }),
});

// Hook fake de Whisper (sin API key)
const fakeWhisperResult = useFakeWhisper();

// Usar el apropiado según disponibilidad de API key
const { recording, transcribing, transcript, startRecording, stopRecording } = 
  hasOpenAIKey ? realWhisperResult : fakeWhisperResult;
```

#### **B. Actualización de input con transcripción**
```typescript
useEffect(() => {
  if (!recording && !transcribing && transcript?.text) {
    setInput(prev => prev + ` ${transcript.text}`);
  }
}, [recording, transcribing, transcript?.text, setInput]);
```

## 🚀 CARACTERÍSTICAS AVANZADAS

### **1. Feature Flags**
```typescript
// Configuración de características del chatbot
const featureFlags = {
  OPTIMIZED_CHATBOT: false,
  CHAT_QUEUE: false,
  CHAT_CACHE: false,
  CHAT_LAZY_LOADING: false,
  CHAT_METRICS: false
};
```

### **2. Manejo de Errores**
- **Timeouts:** 300 segundos para consultas Memgraph
- **Fallbacks:** Respuestas de error cuando Memgraph falla
- **Validación:** Verificación de API keys antes de envío

### **3. Optimizaciones de Performance**
- **Lazy loading:** Carga diferida de componentes
- **Memoización:** Componentes React memoizados
- **Streaming:** Respuestas en tiempo real del LLM
- **Caching:** Cache de consultas React Query

## 📊 MÉTRICAS Y MONITOREO

### **A. Logs de Debug**
```typescript
console.log("🚀 Feature flags cargados:", featureFlags);
console.log("⚙️ Configuración del renderizador:", config);
console.log("✅ Contexto obtenido correctamente!!");
```

### **B. Estados de carga**
- `fetchingMessages`: Cargando mensajes existentes
- `generatingResponse`: Generando respuesta del LLM
- `contextLoaded`: Contexto cargado correctamente
- `chatCreated`: Chat creado exitosamente

## 🔒 SEGURIDAD Y VALIDACIÓN

### **1. Autenticación**
```typescript
const { supabase, session } = useSupabase();
if (!session?.user) {
  // Redirigir a login
}
```

### **2. Validación de API Keys**
```typescript
if (settings.model === Models.claude && !settings.anthropicApiKey) {
  toast.error("Please enter your Claude API Key");
  return;
}
```

### **3. Sanitización de datos**
- Validación JSON antes de parsing
- Escape de caracteres especiales
- Verificación de tipos de archivo

## 🎯 PUNTOS DE OPTIMIZACIÓN IDENTIFICADOS

### **1. Timeouts y Delays**
- **Timeout API:** 300 segundos (muy alto)
- **Debounce input:** No implementado
- **Rate limiting:** No implementado

### **2. Sistema de Cola**
- **Feature flag:** `CHAT_QUEUE: false`
- **Implementación:** Pendiente
- **Beneficio:** Manejo de múltiples requests

### **3. Cache de Chat**
- **Feature flag:** `CHAT_CACHE: false`
- **Implementación:** Pendiente
- **Beneficio:** Respuestas más rápidas

### **4. Métricas de Chat**
- **Feature flag:** `CHAT_METRICS: false`
- **Implementación:** Pendiente
- **Beneficio:** Análisis de performance

## 📝 CONCLUSIONES

El sistema de chatbot de demo-insight-canvas es una implementación robusta que integra:

✅ **Fortalezas:**
- Integración completa con LLMs (OpenAI/Anthropic)
- Sistema de contexto automático
- Consultas dinámicas a Memgraph
- Generación de artefactos avanzada
- Manejo de attachments y voz
- Prevención de duplicación de chats

⚠️ **Áreas de mejora:**
- Implementar sistema de cola para requests
- Activar cache de chat para mejor performance
- Reducir timeouts excesivos
- Implementar métricas de monitoreo
- Añadir rate limiting
- Optimizar lazy loading de chat

🔧 **Recomendaciones técnicas:**
1. Activar feature flags de optimización gradualmente
2. Implementar debounce en input para reducir requests
3. Añadir métricas de tiempo de respuesta
4. Crear sistema de fallback para Memgraph
5. Implementar cache inteligente de contexto
