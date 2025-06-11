# INTEGRATION POINTS - Sistema de Renderizado de Artefactos

**Fecha:** 2025-06-04  
**Proyecto:** demo-insight-canvas  
**Objetivo:** Documentar puntos exactos de integración para el sistema optimizado

---

## 1. COMPONENTES ACTUALES DE RENDERIZADO

### 🎯 Componentes Principales Identificados

**A. ReactArtifact** (`components/artifact/react.tsx`)
- **Props exactas:**
  ```typescript
  export type Props = {
    code: string;
    mode: "preview" | "code";
    recording: boolean;
    onCapture: (params: { selectionImg: string; artifactImg: string }) => void;
  };
  ```
- **Funcionalidad:** Renderiza componentes React usando iframe externo
- **URL externa:** `process.env.NEXT_PUBLIC_ARTIFACT_RENDERER_URL`
- **Comunicación:** postMessage con tipos `UPDATE_COMPONENT`, `CAPTURE_SELECTION`, `INIT_COMPLETE`, `SELECTION_DATA`

**B. HTMLArtifact** (`components/artifact/html.tsx`)
- **Props exactas:**
  ```typescript
  export type Props = {
    code: string;
    mode: "preview" | "code";
    recording: boolean;
    onCapture: (params: { selectionImg: string; artifactImg: string }) => void;
  };
  ```
- **Funcionalidad:** Renderiza HTML usando iframe con srcDoc
- **Características:** Inyecta html2canvas para captura de pantalla

---

## 2. DÓNDE SE USAN LOS COMPONENTES

### 🔍 Archivos que Importan y Usan Artefactos

**A. ArtifactPanel** (`components/artifact/index.tsx`)
- **Importaciones:**
  ```typescript
  import { ReactArtifact } from "@/components/artifact/react";
  import { HTMLArtifact } from "@/components/artifact/html";
  ```
- **Uso condicional por tipo:**
  ```typescript
  {type === "application/react" && (
    <ReactArtifact
      code={content}
      mode={mode}
      recording={recording}
      onCapture={onCapture}
    />
  )}
  
  {type === "text/html" && (
    <HTMLArtifact
      code={content}
      mode={mode}
      recording={recording}
      onCapture={onCapture}
    />
  )}
  ```

**B. ArtifactPanelPopup** (`components/artifact/artifact-panel-popup.tsx`)
- **Importaciones idénticas:**
  ```typescript
  import { ReactArtifact } from "@/components/artifact/react";
  import { HTMLArtifact } from "@/components/artifact/html";
  ```
- **Uso idéntico al ArtifactPanel**

**C. SimpleDragDropCanvas** (`components/artifact/simple-drag-drop-canvas.tsx`)
- **Importaciones:**
  ```typescript
  import { ReactArtifact } from '@/components/artifact/react';
  import { HTMLArtifact } from '@/components/artifact/html';
  ```
- **Uso en renderizado de artefactos arrastrados:**
  ```typescript
  {artifact.type === "text/html" ? (
    <HTMLArtifact 
      code={artifact.code} 
      mode="preview" 
      recording={false}
      onCapture={() => {}}
    />
  ) : (
    <ReactArtifact
      code={artifact.code}
      mode="preview"
      recording={false}
      onCapture={() => {}}
    />
  )}
  ```

---

## 3. SISTEMA DE CHATBOT Y GENERACIÓN

### 🤖 Flujo de Generación de Artefactos

**A. ChatPanel** (`components/chat/panel.tsx`)
- **Hook principal:** `useChat` de `ai/react`
- **Estado de artefacto actual:**
  ```typescript
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactMessagePartData | null>(null);
  ```
- **Callback de captura:**
  ```typescript
  const handleCapture: ReactArtifactProps["onCapture"] = ({
    selectionImg,
    artifactImg,
  }) => {
    setAttachments((prev) => [...prev, {
      contentType: "image/png",
      url: selectionImg,
    }]);
    setSelectedArtifacts((prev) => {
      if (prev.includes(artifactImg)) return prev;
      return [...prev, artifactImg];
    });
  };
  ```

**B. Parsing de Mensajes** (`lib/utils.ts`)
- **Tipo de datos de artefacto:**
  ```typescript
  export type ArtifactMessagePartData = {
    generating: boolean;
    id: string | null;
    type: string | null;
    title: string | null;
    content: string;
    language: string | null;
  };
  ```
- **Función de parsing:** `parseMessage(message: string): MessagePart[]`
- **Detección de artefactos:** Tags `<artifact>` con atributos `identifier`, `type`, `title`, `language`

---

## 4. GESTIÓN DE ESTADO

### 📊 No hay Estado Global Centralizado

**A. Estado Local por Componente**
- Cada componente maneja su propio estado de artefactos
- No se usa Redux, Zustand o Context API para artefactos
- Estado distribuido entre:
  - `ChatPanel`: `currentArtifact`
  - `ArtifactPanel`: `mode`, `isMaster`, `publishing`
  - `SimpleDragDropCanvas`: `artifacts` array local

**B. Persistencia en Base de Datos**
- **Tabla:** `messages` (Supabase)
- **Campos relevantes:**
  ```sql
  chat_id: string
  role: string
  text: string (contiene el código del artefacto)
  attachments: json
  metadata: json
  message_type: string
  ```
- **Funciones de DB:** `createChat`, `addMessage`, `getChatMessages` (`lib/db.ts`)

---

## 5. EVENTOS Y CALLBACKS

### 🔄 Flujo de Eventos Identificado

**A. Eventos de Renderizado**
- **ReactArtifact/HTMLArtifact:**
  - `onCapture`: Captura de pantalla de selecciones
  - Comunicación postMessage con iframe externo

**B. Eventos de Publicación**
- **ArtifactPanel/ArtifactPanelPopup:**
  ```typescript
  const handlePublish = async () => {
    if (isMaster) {
      await publishAsMaster(supabase, artifactData, userId);
    } else {
      await createArtifact(supabase, artifactData, userId);
    }
  };
  ```

**C. Eventos de Chat**
- **useChat hook:**
  ```typescript
  const { messages, append, setMessages, isLoading } = useChat({
    onFinish: async (message) => {
      if (chatId) {
        await addMessage(supabase, chatId, message);
      }
    }
  });
  ```

---

## 6. TIPOS DE ARTEFACTOS SOPORTADOS

### 📝 Tipos Identificados

**A. Tipos Principales**
- `"application/react"` → ReactArtifact
- `"text/html"` → HTMLArtifact
- `"text/markdown"` → Markdown component
- `"application/code"` → CodeBlock component

**B. Tipos con Preview**
```typescript
const artifactPreviewSupportedTypes = ["text/html", "application/react"];
```

**C. Modos de Visualización**
```typescript
export type ArtifactMode = "code" | "preview";
```

---

## 7. CONFIGURACIÓN EXTERNA

### ⚙️ Variables de Entorno

**A. Renderizador Externo**
- **Variable:** `NEXT_PUBLIC_ARTIFACT_RENDERER_URL`
- **Uso:** ReactArtifact usa esta URL para el iframe externo
- **Ubicación:** `process.env.NEXT_PUBLIC_ARTIFACT_RENDERER_URL`

**B. APIs de IA**
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (configuración de usuario)
- Modelos soportados: Claude, GPT-4, etc.

---

## 8. PUNTOS DE INTEGRACIÓN CRÍTICOS

### 🎯 Dónde Integrar el Sistema Optimizado

**A. Reemplazo Directo de Componentes**
1. **ReactArtifact** → `ArtifactRendererWrapper` con `type="react"`
2. **HTMLArtifact** → `ArtifactRendererWrapper` con `type="html"`

**B. Mantener API Exacta**
- Props idénticas: `code`, `mode`, `recording`, `onCapture`
- Eventos idénticos: `onCapture` con `{ selectionImg, artifactImg }`
- Tipos idénticos: `ArtifactMode`, `Props`

**C. Archivos a Modificar**
1. `components/artifact/index.tsx` - ArtifactPanel
2. `components/artifact/artifact-panel-popup.tsx` - ArtifactPanelPopup  
3. `components/artifact/simple-drag-drop-canvas.tsx` - SimpleDragDropCanvas

**D. Configuración Requerida**
- Actualizar `NEXT_PUBLIC_ARTIFACT_RENDERER_URL` para apuntar al nuevo frame
- Asegurar compatibilidad con SelectionTool existente
- Mantener integración con html2canvas para capturas

---

## 9. DEPENDENCIAS CRÍTICAS

### 📦 Librerías que Deben Mantenerse

**A. Captura de Pantalla**
- `html2canvas@1.4.1` (usado en HTMLArtifact)
- `SelectionTool` component (captura de selecciones)

**B. Renderizado de Código**
- `react-syntax-highlighter` con tema `oneDark`
- `react-markdown` para contenido markdown

**C. UI Components**
- Radix UI components (Dialog, Tabs, etc.)
- Lucide React icons
- TailwindCSS classes

---

## 10. PLAN DE MIGRACIÓN

### 🚀 Estrategia de Implementación

**A. Fase 1: Reemplazo Gradual**
1. Crear wrapper compatible con API existente ✅
2. Probar en un componente (ArtifactPanelPopup)
3. Migrar gradualmente otros componentes

**B. Fase 2: Optimizaciones**
1. Activar cache y performance monitoring
2. Implementar lazy loading
3. Optimizar para producción

**C. Fase 3: Cleanup**
1. Remover componentes legacy
2. Actualizar documentación
3. Optimizar configuración

---

## 11. RIESGOS Y CONSIDERACIONES

### ⚠️ Puntos de Atención

**A. Compatibilidad**
- SelectionTool debe funcionar con nuevo iframe
- html2canvas debe seguir funcionando
- postMessage API debe mantenerse

**B. Rendimiento**
- No degradar tiempo de carga inicial
- Mantener responsividad en drag & drop
- Cache no debe consumir excesiva memoria

**C. Seguridad**
- Sandbox del iframe debe mantenerse
- Sanitización de HTML debe preservarse
- XSS protection debe continuar
