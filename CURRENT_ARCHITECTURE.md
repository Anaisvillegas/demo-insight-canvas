# Informe Detallado: demo-insight-canvas

---

## 1. Estructura de Carpetas y Archivos Principales

- **Raíz**
  - Configuración: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `next.config.mjs`, `Dockerfile`, `docker-compose.yml`
  - Documentación: `README.md`, `CHANGELOG.md`, `docker-readme.md`, `LICENSE`
  - Variables de entorno: `.env`, `.env.production.example`
  - Pipelines: `azure-pipelines.yaml`
- **app/**
  - Rutas Next.js (App Router): autenticación, chat, artefactos, páginas principales, estilos globales, tipos.
- **components/**
  - Componentes reutilizables: UI, autenticación, chat, markdown, artefactos, navegación lateral, etc.
- **lib/**
  - Lógica de negocio y utilidades: integración con Supabase, hooks, servicios, utilidades generales.
- **public/**
  - Recursos estáticos: imágenes, videos, íconos, scripts JS.
- **supabase/**
  - Configuración, migraciones y seeds para Supabase.
- **k8s/**
  - Definición para Kubernetes.
- **scripts/**
  - Scripts utilitarios.

---

## 2. Archivos que contienen las palabras clave

**Palabras clave:** artifact, render, iframe, chatbot, response, bot, chat

- **artifact:**  
  - `app/artifact-workspace/page.tsx`
  - `lib/artifact.ts`
  - `components/artifact/` (varios archivos: drag-drop-canvas, artifact-panel-popup, artifact-search, etc.)
  - `app/styles/drag-drop-canvas.css`, `app/styles/z-index.css`
  - `.env` (NEXT_PUBLIC_ARTIFACT_RENDERER_URL)
- **render:**  
  - `app/react-query-provider.tsx` (comentarios sobre render)
  - `components/artifact/html.tsx`, `components/artifact/react.tsx`
  - `components/markdown/markdown.tsx`, `components/markdown/code-block.tsx`
- **iframe:**  
  - No se detectan archivos principales con uso directo de iframe en los nombres, pero puede haber uso en componentes de artefactos.
- **chatbot, bot:**  
  - No hay archivos con "chatbot" o "bot" en el nombre, pero sí lógica de chat.
- **chat, response:**  
  - `app/chat/[id]/page.tsx`, `components/chat/` (input, message, message-list, panel, attachment-preview-button)
  - `app/api/chat/route.ts` (manejo de respuestas del chat)
  - `app/new/page.tsx`, `app/artifact-workspace/page.tsx` (uso de ChatPanel)
  - `app/types.ts` (tipos de Chat)
  - `app/styles/z-index.css` (z-index para chat)
  - `lib/sampleMessages.ts` (mensajes de ejemplo para chat)

---

## 3. Componente React que maneja la renderización de artefactos

El componente principal es:
- **`components/artifact/simple-drag-drop-canvas.tsx`**
- También relevantes:  
  - `components/artifact/drag-drop-canvas.tsx`
  - `components/artifact/html.tsx`
  - `components/artifact/react.tsx`
  - `components/artifact/artifact-panel-popup.tsx`
  - `components/artifact/artifact-search.tsx`
  - `components/artifact/test-artifact.tsx`

Estos componentes son utilizados en `app/artifact-workspace/page.tsx` para renderizar y manipular artefactos visuales.

---

## 4. Código del chatbot y manejo de respuestas

- **Frontend:**  
  - `components/chat/panel.tsx` (ChatPanel): componente principal del chat, maneja mensajes, input y renderizado.
  - `components/chat/message-list.tsx`, `components/chat/message.tsx`, `components/chat/input.tsx`: renderizan mensajes y entrada de usuario.
  - `app/chat/[id]/page.tsx`, `app/new/page.tsx`, `app/artifact-workspace/page.tsx`: integran el ChatPanel en las páginas.

- **Backend/API:**  
  - `app/api/chat/route.ts`: endpoint API para manejar mensajes y respuestas del chat.
  - `lib/sampleMessages.ts`: mensajes de ejemplo.
  - `lib/db.ts`: acceso a la base de datos para chats y mensajes.

El flujo es: el usuario envía un mensaje → el frontend lo envía al endpoint `/api/chat/route.ts` → se procesa y responde → el frontend actualiza la UI.

---

## 5. Dependencias y librerías de UI (package.json)

- **UI principal:**  
  - **Radix UI**: (`@radix-ui/react-*`) para diálogos, menús, tabs, tooltips, etc.
  - **TailwindCSS**: para estilos utilitarios y personalizados.
  - **lucide-react**: íconos SVG.
- **Otras dependencias clave:**  
  - Next.js, React, React Query, Supabase, react-hook-form, react-hot-toast, react-markdown, gridstack, zod, etc.

---

## 6. Mapa completo del sistema actual

```mermaid
graph TD
  subgraph Frontend (Next.js + React)
    A[app/page.tsx, layout.tsx]
    B[components/ui/]
    C[components/artifact/]
    D[components/chat/]
    E[components/side-navbar/]
    F[components/markdown/]
    G[app/(auth)/]
    H[app/artifact-workspace/page.tsx]
    I[app/chat/[id]/page.tsx]
    J[app/new/page.tsx]
    K[lib/hooks/]
    L[lib/artifact.ts]
    M[lib/db.ts]
    N[lib/sampleMessages.ts]
    O[lib/supabase/]
    P[public/]
  end

  subgraph API Routes (Next.js)
    Q[app/api/chat/route.ts]
    R[app/api/context/route.ts]
    S[app/api/auth/]
    T[app/api/chat/systemPrompt.ts]
  end

  subgraph Servicios Externos
    U[Supabase]
    V[Memgraph]
    W[Artifact Renderer (URL)]
  end

  A --> B
  A --> C
  A --> D
  A --> E
  A --> F
  A --> G
  H --> C
  H --> D
  I --> D
  J --> D
  D --> Q
  Q --> U
  Q --> V
  C --> W
  O --> U
  L --> V
```

---

## 7. Librería de UI utilizada

- **Radix UI**: para componentes de interfaz avanzados y accesibles.
- **TailwindCSS**: para estilos utilitarios y personalizados.
- **lucide-react**: para íconos SVG.
- **NO se usa Material-UI ni Ant Design.**

---

**Resumen:**  
El proyecto demo-insight-canvas es una aplicación Next.js/React modular, con arquitectura moderna, integración a Supabase y Memgraph, y un sistema de artefactos visuales y chat avanzado. Utiliza Radix UI y TailwindCSS como base de su sistema de diseño.
