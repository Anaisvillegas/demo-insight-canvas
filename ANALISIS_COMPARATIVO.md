# ANÁLISIS COMPARATIVO DE ARTEFACTOS - DEMO INSIGHT CANVAS

## 🔍 PROBLEMA IDENTIFICADO

Los artefactos "KPIs" y "Sector" NO muestran gráficos, mientras que el "Simple Bar Chart" SÍ funciona correctamente.

## 📊 CONTENIDO EXTRAÍDO DE LA BASE DE DATOS

### 1. ARTEFACTO "KPIs" (NO FUNCIONA)
- **ID**: c733ed62-edcc-453c-b62f-9f2ccf5ffd06
- **Tipo**: master
- **Contenido**: JSON con estructura de datos
```json
[
  {
    "properties": [
      "consumoAcumuladoStandardPabellon",
      "consumoAcumuladoStandardAnimal"
    ],
    "type": "KPIFeedConsumption"
  },
  {
    "properties": [
      "pesoGanado",
      "pesoMeta"
    ],
    "type": "KPIWeight"
  }
]
```

### 2. ARTEFACTO "Sector" (NO FUNCIONA)
- **ID**: 06097409-1205-438e-9c31-a9a6a0aa53d2
- **Tipo**: master
- **Contenido**: Array simple de strings
```json
[
  "Bosque Viejo",
  "Don Ambrosio"
]
```

### 3. ARTEFACTO "Simple Bar Chart" (SÍ FUNCIONA)
- **Tipo**: react
- **Contenido**: Código React completo con componente funcional
```javascript
import React from 'react';

const SimpleBarChart = () => {
  const data = [
    { name: 'Enero', ventas: 4000, gastos: 2400 },
    // ... más datos
  ];

  return (
    <div className="w-full h-96 p-4">
      <h2 className="text-xl font-bold mb-4">Gráfico de Barras - Ventas vs Gastos</h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="ventas" fill="#8884d8" />
          <Bar dataKey="gastos" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleBarChart;
```

## 🚨 DIFERENCIAS CRÍTICAS IDENTIFICADAS

### 1. **TIPO DE CONTENIDO**
- ❌ **KPIs y Sector**: Contienen solo **DATOS JSON** (no código React)
- ✅ **Simple Bar Chart**: Contiene **CÓDIGO REACT COMPLETO**

### 2. **ESTRUCTURA DEL CÓDIGO**
- ❌ **KPIs y Sector**: No tienen:
  - Declaración de componente React
  - Función de renderizado
  - JSX para mostrar gráficos
  - Uso de componentes Recharts
- ✅ **Simple Bar Chart**: Tiene todo lo necesario:
  - Componente React funcional
  - Datos estructurados
  - JSX con componentes Recharts
  - Export default

### 3. **PROCESAMIENTO EN EL RENDERER**
- ❌ **KPIs y Sector**: El renderer intenta procesar JSON como código React
- ✅ **Simple Bar Chart**: El renderer procesa código React válido

## 🔧 PROBLEMA EN EL SISTEMA

### En `/app/api/context/route.ts`:
```javascript
// El API intenta procesar artifacts "master" como si fueran código React
if (isReactCode(artifact.code)) {
  console.log(`El artifact "${artifact.name}" contiene código React, extrayendo datos de API`);
  const apiData = await extractApiDataFromReactCode(artifact.code);
} else if (isValidJSON(artifact.code)) {
  const content = safeJSONParse(artifact.code);
  // Solo guarda los datos JSON, no genera código React
}
```

### Función `isReactCode()`:
```javascript
function isReactCode(code: string) {
  return (
    code.includes('import React') || 
    code.includes('useState') || 
    code.includes('useEffect') ||
    (code.includes('function') && code.includes('return') && code.includes('<div'))
  );
}
```

**RESULTADO**: Los artefactos KPIs y Sector fallan la verificación `isReactCode()` porque son JSON puro.

## 🎯 SOLUCIÓN REQUERIDA

### OPCIÓN 1: Convertir datos JSON a componentes React
Los artefactos "master" deberían generar automáticamente código React que use los datos JSON para crear gráficos.

### OPCIÓN 2: Crear componentes React completos
Los artefactos "master" deberían contener código React completo, no solo datos JSON.

### OPCIÓN 3: Mejorar el procesamiento del renderer
El renderer debería detectar datos JSON y generar automáticamente componentes React con gráficos.

## 📋 DISCREPANCIA EN LA BASE DE DATOS

### Estructura detectada vs. Código:
- **Base de datos real**: `name`, `type`, `code` (campos que funcionan)
- **Esquema documentado**: `title`, `type`, `content` (campos en migraciones)
- **Código del API**: Usa `name`, `type`, `code` (coincide con la realidad)

## 🏆 CONCLUSIÓN

**Los artefactos "KPIs" y "Sector" NO muestran gráficos porque contienen solo datos JSON, no código React funcional.**

**El "Simple Bar Chart" SÍ funciona porque contiene código React completo con componentes Recharts.**

**Para que los gráficos se muestren, los artefactos necesitan código React que use los datos JSON para generar visualizaciones con Recharts.**
