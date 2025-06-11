import { NextResponse } from 'next/server';
import { createArtifact } from '@/lib/artifact';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Función auxiliar para verificar si una cadena es JSON válido
function isValidJSON(str: string | null | undefined) {
  try {
    if (typeof str !== 'string') return false;
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Función para intentar parsear JSON de forma segura
function safeJSONParse(str: string | null | undefined, defaultValue: any = []) {
  if (!isValidJSON(str)) {
    console.log('[GET /api/context] El contenido no parece ser JSON válido');
    return defaultValue;
  }

  try {
    // En este punto sabemos que str es una cadena válida porque isValidJSON lo verificó
    return JSON.parse(str as string);
  } catch (e) {
    console.error('[GET /api/context] Error al parsear JSON:', e);
    return defaultValue;
  }
}

// Función para extraer URL de API de código React
async function extractApiDataFromReactCode(code: string) {
  try {
    console.log('[GET /api/context] Analizando código React para extraer URLs de API');
    
    // Buscar declaraciones de API_URL o configuraciones de API
    const apiUrlConstRegex = /const\s+API_URL\s*=\s*['"]([^'"]+)['"]/;
    const apiBaseConstRegex = /const\s+(?:API_BASE_URL|BASE_URL|BASE_API_URL)\s*=\s*['"]([^'"]+)['"]/;

    // Buscar patrones de fetch con url completas o variables
    const fetchPatterns = [
      /fetch\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                  // fetch("https://api.example.com/endpoint")
      /fetch\s*\(\s*`([^`]+)`\s*\)/g,                         // fetch(`https://api.example.com/endpoint`)
      /fetch\s*\(\s*(?:\$\{API_URL\}|API_URL\s*\+\s*)['"]([^'"]+)['"]\s*\)/g, // fetch(API_URL + "/endpoint") o fetch(`${API_URL}/endpoint`)
      /\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                  // axios.get("https://api.example.com/endpoint")
      /\.post\s*\(\s*['"]([^'"]+)['"]\s*,/g,                  // axios.post("https://api.example.com/endpoint", data)
    ];

    let apiEndpoints: string[] = [];
    let apiBaseUrl = "";
    let combinedApiData: Record<string, any> = {};

    // Extraer base URL si existe
    const apiUrlMatch = code.match(apiUrlConstRegex);
    const apiBaseMatch = code.match(apiBaseConstRegex);

    if (apiUrlMatch && apiUrlMatch[1]) {
      apiBaseUrl = apiUrlMatch[1];
      console.log(`[GET /api/context] Base URL de API encontrada: ${apiBaseUrl}`);
    } else if (apiBaseMatch && apiBaseMatch[1]) {
      apiBaseUrl = apiBaseMatch[1];
      console.log(`[GET /api/context] Base URL de API encontrada: ${apiBaseUrl}`);
    }

    // Extraer todos los endpoints de API mencionados en el código
    for (const pattern of fetchPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1]) {
          let endpoint = match[1];

          // Si el endpoint no comienza con http y tenemos base URL, combinarlos
          if (!endpoint.startsWith('http') && apiBaseUrl) {
            endpoint = apiBaseUrl + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
          }
          
          // Limpiar la URL de variables no resueltas como ${API_URL}/ y parámetros después de ?
          if (endpoint.includes('${API_URL}')) {
            endpoint = endpoint.replace('${API_URL}/', '');
            endpoint = endpoint.replace('${API_URL}', '');
          }
          
          // Eliminar cualquier parámetro de query (lo que va después del ?)
          endpoint = endpoint.split('?')[0];

          // Solo añadir URLs válidas que parezcan API endpoints
          if (endpoint.startsWith('http') && !apiEndpoints.includes(endpoint)) {
            apiEndpoints.push(endpoint);
          }
        }
      }
    }

    console.log(`[GET /api/context] Se encontraron ${apiEndpoints.length} endpoints de API en el código`);

    // Si no encontramos endpoints, intentar extraer por useEffect
    if (apiEndpoints.length === 0 && apiBaseUrl) {
      // Buscar patrones comunes en useEffect
      const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[\s*\]\s*\)/g;
      let match;
      while ((match = useEffectRegex.exec(code)) !== null) {
        if (match[1]) {
          const effectBody = match[1];
          // Buscar patrones como "/api/endpoint"
          const apiPathRegex = /['"`]\/api\/([^'"`]+)['"`]/g;
          let pathMatch;
          while ((pathMatch = apiPathRegex.exec(effectBody)) !== null) {
            // Eliminar parámetros de URL para peticiones de prueba
            const path = pathMatch[1].split('?')[0];
            const endpoint = apiBaseUrl + '/api/' + path;
            if (!apiEndpoints.includes(endpoint)) {
              apiEndpoints.push(endpoint);
            }
          }
        }
      }
      console.log(`[GET /api/context] Después de analizar useEffect, se encontraron ${apiEndpoints.length} endpoints`);
    }

    // Realizar peticiones a cada endpoint identificado
    if (apiEndpoints.length > 0) {
      for (const apiUrl of apiEndpoints) {
        try {
          console.log(`[GET /api/context] Obteniendo datos desde ${apiUrl}`);
          
          // Hacer petición real a la API
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
          });
          
          if (!response.ok) {
            console.error(`[GET /api/context] Error HTTP ${response.status} para ${apiUrl}`);
            continue;
          }
          
          const data = await response.json();
          console.log(`[GET /api/context] Datos obtenidos correctamente de ${apiUrl}`);

          // Extraer nombre de endpoint para usar como clave
          const endpointName = apiUrl.split('/').pop() || 'data';
          combinedApiData[endpointName] = data;
        } catch (error) {
          console.error(`[GET /api/context] Error al obtener datos de ${apiUrl}:`, error);
        }
      }

      // Si se obtuvieron datos de al menos un endpoint, devolver los datos combinados
      if (Object.keys(combinedApiData).length > 0) {
        return combinedApiData;
      }
    }

    return null;
  } catch (error) {
    console.error('[GET /api/context] Error al obtener datos de la API:', error);
    return null;
  }
}

// Función para determinar si el código es React
function isReactCode(code: string) {
  // Verificar patrones comunes de código React
  return (
    code.includes('import React') || 
    code.includes('useState') || 
    code.includes('useEffect') ||
    (code.includes('function') && code.includes('return') && code.includes('<div'))
  );
}

export async function GET() {
  console.log('[GET /api/context] Iniciando obtención de contexto desde artifacts');

  try {
    // 1. Conectar a Supabase y buscar artifacts de tipo "master"
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      console.error('[GET /api/context] Usuario no autenticado');
      return NextResponse.json(
        { success: false, error: "Usuario no autenticado" },
        { status: 401 }
      );
    }
    
    // @ts-ignore - Ignorar error de TypeScript porque la tabla "artifacts" no está en los tipos
    const { data: masterArtifacts, error } = await supabase
      .from("artifacts")
      .select("*")
      .eq("type", "master")
      .eq("user_id", user.id);

    if (error) {
      console.error('[GET /api/context] Error al consultar artifacts:', error);
      throw error;
    }

    console.log(`[GET /api/context] Se encontraron ${masterArtifacts?.length || 0} artifacts de tipo master`);

    // 2. Extraer datos y construir contexto
    const dataByType: Record<string, any> = {};
    let foundValidData = false;

    // Procesar cada artifact master para extraer los datos
    for (const artifact of (masterArtifacts || [])) {
      console.log(`[GET /api/context] Procesando artifact: ${artifact.name}, tipo: ${artifact.type}`);

      try {
        // Primero verificar si es un código React o un JSON
        if (isReactCode(artifact.code)) {
          console.log(`[GET /api/context] El artifact "${artifact.name}" contiene código React, extrayendo datos de API`);
          const apiData = await extractApiDataFromReactCode(artifact.code);

          if (apiData) {
            dataByType[artifact.name] = apiData;
            foundValidData = true;
            console.log(`[GET /api/context] Datos de API para "${artifact.name}" cargados exitosamente`);
          } else {
            console.log(`[GET /api/context] No se pudieron extraer datos de API de "${artifact.name}"`);
          }
        } 
        // Si no es React, intentar procesarlo como JSON
        else if (isValidJSON(artifact.code)) {
          const content = safeJSONParse(artifact.code);
          if (content && (Array.isArray(content) || typeof content === 'object')) {
            // Usar el nombre del artifact como clave en el objeto dataByType
            dataByType[artifact.name] = content;
            foundValidData = true;
            console.log(`[GET /api/context] Datos de "${artifact.name}" cargados exitosamente:`, 
                      JSON.stringify(content).substring(0, 100) + '...');
          }
        } else {
          console.log(`[GET /api/context] Contenido de "${artifact.name}" no es un JSON válido ni código React procesable`);
        }
      } catch (artifactError) {
        console.error(`[GET /api/context] Error procesando artifact ${artifact.name}:`, artifactError);
      }
    }

    // 3. Si no existen artifacts válidos o no contienen datos válidos, crear artifacts de ejemplo
    if (!foundValidData || Object.keys(dataByType).length === 0) {
      console.log('[GET /api/context] No se encontraron artifacts con datos válidos, creando ejemplos...');

      try {
        // Crear artifact de KPIs
        const kpisExample = [
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
        ];

        // @ts-ignore - Ignorar error de TypeScript
        const kpiResult = await createArtifact(
          supabase,
          {
            name: "KPIs",
            type: "master",
            code: JSON.stringify(kpisExample, null, 2),
            user_id: user.id
          },
          user.id
        );

        console.log('[GET /api/context] Artifact de KPIs creado con ID:', kpiResult.id);
        dataByType["KPIs"] = kpisExample;

        // Crear artifact de Sectores
        const sectorsExample = [
          "Bosque Viejo",
          "Don Ambrosio"
        ];

        // @ts-ignore - Ignorar error de TypeScript
        const sectorResult = await createArtifact(
          supabase,
          {
            name: "Sector",
            type: "master",
            code: JSON.stringify(sectorsExample, null, 2),
            user_id: user.id
          },
          user.id
        );

        console.log('[GET /api/context] Artifact de Sectores creado con ID:', sectorResult.id);
        dataByType["Sector"] = sectorsExample;
      } catch (createError) {
        console.error('[GET /api/context] Error al crear artifacts de ejemplo:', createError);
      }
    }

    // 4. Construir el contexto combinado
    let contextSections = [`
      # Información de Contexto
      
      Para esta Query:
      MATCH (a)-[r]->(b)
WHERE NOT "Concept" IN labels(a) AND NOT "Concept" IN labels(b)
WITH labels(a) AS aLabels, type(r) AS relType, labels(b) AS bLabels, 
     collect({source: a, relation: r, target: b}) AS examples,
     count(*) AS relationCount
UNWIND examples[0..1] AS example
RETURN aLabels, relType, bLabels, relationCount, 
       example.source AS sourceNode, 
       example.relation AS relationInstance, 
       example.target AS targetNode
ORDER BY relationCount DESC

      El Resultado que explica las relaciones del memgraph entre todos los tipos de nodos exitentes es:
      {"aLabels":["Age"],"relType":"HAS_ALARM","bLabels":["Alarm"],"relationCount":502236,"sourceNode":{"id":319164,"labels":["Age"],"properties":{"age":2,"date":{"year":2024,"month":4,"day":3}},"type":"node"},"relationInstance":{"id":1495529,"start":319164,"end":721717,"label":"HAS_ALARM","properties":{"created_at":1725652133706108,"instruction":"Revisar sistema de ventilación del pabellón 21","updated_at":1725652133706108},"type":"relationship"},"targetNode":{"id":721717,"labels":["Alarm"],"properties":{"date":{"year":2024,"month":4,"day":3},"idAlarm":320116,"idtas":[2103066001,2103066002,2103066003,2103066004,2103066005,2103066006,2103066007,2103066008,2103066009,2103066010,2103066011,2103066012,2103066013,2103066014,2103066015,2103066016,2103066017,2103066018,2103066019,2103066020,2103066021,2103066022,2103066023,2103066024,2103066025,2103066026,2103066027],"status":"cerrada","time":{"hour":13,"minute":30,"second":6,"nanosecond":0},"updated_at":1725649330181463},"type":"node"}}
{"aLabels":["Age"],"relType":"IN_DATE","bLabels":["Day"],"relationCount":88122,"sourceNode":{"id":184519,"labels":["Age"],"properties":{"age":41,"date":{"year":2024,"month":8,"day":26},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":306420,"start":184519,"end":115521,"label":"IN_DATE","properties":{},"type":"relationship"},"targetNode":{"id":115521,"labels":["Day"],"properties":{"day":27},"type":"node"}}
{"aLabels":["Age"],"relType":"HAS_MORTALITY","bLabels":["KPI","KPIMortality"],"relationCount":84604,"sourceNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":256059,"start":163504,"end":163509,"label":"HAS_MORTALITY","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163509,"labels":["KPI","KPIMortality"],"properties":{"created_at":1724951173827236,"mortalidadAcumulada":0,"mortalidadDia":0,"porcentajeMortalidadAcumulada":0,"porcentajeMortalidadDiaria":0,"stock":43200,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["ProductBatch","Crianza"],"relType":"HAS_AGE","bLabels":["Age"],"relationCount":84604,"sourceNode":{"id":163499,"labels":["ProductBatch","Crianza"],"properties":{"created_at":1724951173827236,"numero":218,"updated_at":1724951173827236},"type":"node"},"relationInstance":{"id":256053,"start":163499,"end":163504,"label":"HAS_AGE","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"}}
{"aLabels":["Age"],"relType":"COMPARES_TO","bLabels":["Age","Standard"],"relationCount":81357,"sourceNode":{"id":184548,"labels":["Age"],"properties":{"age":0,"date":{"year":2024,"month":7,"day":18},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":490158,"start":184548,"end":173661,"label":"COMPARES_TO","properties":{"created_at":1725397531223794,"updated_at":1725397531223794},"type":"relationship"},"targetNode":{"id":173661,"labels":["Age","Standard"],"properties":{"consumoAcumulado":0,"consumoAcumuladoAgua":0,"consumoDiario":0,"consumoDiarioAgua":0,"conversion":0,"conversionAcumulada":0,"created_at":1724973972529130,"ganancia":0,"gananciaMedia":0,"idSexo":2,"numero":0,"peso":0.044,"raza":"Ross","updated_at":1724973972529130},"type":"node"}}
{"aLabels":["Age"],"relType":"HAS_ANIMAL_WEIGHT","bLabels":["KPI","KPIAnimalWeight"],"relationCount":79607,"sourceNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":256056,"start":163504,"end":163506,"label":"HAS_ANIMAL_WEIGHT","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163506,"labels":["KPI","KPIAnimalWeight"],"properties":{"created_at":1724951173827236,"gananciaMediaPeriodo":0,"gananciaMediaStandard":0,"gananciaMediaTotal":0,"gananciaStandard":0,"pesoMedido":0.046542,"pesoStandard":0.044,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Age"],"relType":"HAS_CONVERSION_RATE","bLabels":["KPI","KPIConversionRate"],"relationCount":79607,"sourceNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":256057,"start":163504,"end":163507,"label":"HAS_CONVERSION_RATE","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163507,"labels":["KPI","KPIConversionRate"],"properties":{"conversionAcumuladaPabellon":0,"conversionStandard":0,"created_at":1724951173827236,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Age"],"relType":"HAS_FEED_CONSUMPTION","bLabels":["KPI","KPIFeedConsumption"],"relationCount":79607,"sourceNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":256055,"start":163504,"end":163505,"label":"HAS_FEED_CONSUMPTION","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163505,"labels":["KPI","KPIFeedConsumption"],"properties":{"consumoAcumuladoAnimal":0.043866,"consumoAcumuladoPabellon":1895,"consumoAcumuladoStandardAnimal":0,"consumoAcumuladoStandardPabellon":0,"consumoDiarioAnimal":0.043866,"consumoDiarioPabellon":1895,"consumoDiarioStandardAnimal":0,"consumoDiarioStandardPabellon":0,"created_at":1724951173827236,"desviacionAcumuladaAnimal":0,"desviacionDiariaAnimal":0,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Age"],"relType":"HAS_TEMPERATURE_SUMMARY","bLabels":["KPI","KPITemperatureSummary"],"relationCount":79607,"sourceNode":{"id":163504,"labels":["Age"],"properties":{"age":0,"created_at":1724951173827236,"date":{"year":2024,"month":5,"day":14},"updated_at":1725056160118983},"type":"node"},"relationInstance":{"id":256058,"start":163504,"end":163508,"label":"HAS_TEMPERATURE_SUMMARY","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163508,"labels":["KPI","KPITemperatureSummary"],"properties":{"areaBajoDeseado":-13493.25,"areaBajoMargen":-16079.25,"areaBajoMargenCastigada":322374.675,"areaSobreDeseado":0,"areaSobreDeseadoCastigada":0,"areaSobreMargen":0,"areaSobreMargenCastigada":0,"created_at":1724951173827236,"maximaBajada":4.1,"maximaSubida":-2.8,"maximaTemperaturaDia":28.8,"maximaTemperaturaExtDia":16.5,"minimaTemperaturaDia":10.9,"minimaTemperaturaExtDia":-1.5,"rangoTemperaturaDia":17.9,"rangoTemperaturaExtDia":18,"temperaturaPromedioBajoDeseado":19.75625,"temperaturaPromedioBajoMargen":13.905357,"temperaturaPromedioSobreDeseado":0,"temperaturaPromedioSobreMargen":0,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Alarm"],"relType":"HAS_TYPE","bLabels":["AlarmType"],"relationCount":77131,"sourceNode":{"id":721254,"labels":["Alarm"],"properties":{"date":{"year":2024,"month":4,"day":1},"idAlarm":319347,"idtas":[2103039001,2103039002,2103039003,2103039004,2103039005,2103039006,2103039007,2103039008,2103039009,2103039010,2103039011,2103039012,2103039013,2103039014,2103039015],"status":"cerrada","time":{"hour":0,"minute":2,"second":23,"nanosecond":0},"updated_at":1725649330181463},"type":"node"},"relationInstance":{"id":1040822,"start":721254,"end":721255,"label":"HAS_TYPE","properties":{"created_at":1725637610591272,"updated_at":1725637610591272},"type":"relationship"},"targetNode":{"id":721255,"labels":["AlarmType"],"properties":{"created_at":1725637610591272,"idType":18,"name":"Temperatura interior sobre exterior","updated_at":1725637610591272},"type":"node"}}
{"aLabels":["SiloWeight","Service"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":4943,"sourceNode":{"id":72023,"labels":["SiloWeight","Service"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","cell_5":"celda 5","cell_6":"celda 6","total":"silo 1"},"iues":81,"measurement":"food_weights","name":"Silo 1","updated_at":1721850453995012},"type":"node"},"relationInstance":{"id":96194,"start":72023,"end":70742,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70742,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["Firmware"],"relType":"INSTALLED_ON","bLabels":["Device"],"relationCount":4707,"sourceNode":{"id":91919,"labels":["Firmware"],"properties":{"name":"Pesaje Silo"},"type":"node"},"relationInstance":{"id":117788,"start":91919,"end":76354,"label":"INSTALLED_ON","properties":{},"type":"relationship"},"targetNode":{"id":76354,"labels":["Device"],"properties":{"name":"Caja Peso Silo","snta":"3924596539245965"},"type":"node"}}
{"aLabels":["Service","Temperature"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":4412,"sourceNode":{"id":75223,"labels":["Service","Temperature"],"properties":{"endpointMap":{"value":"temperatura interior"},"iues":3281,"measurement":"temperature","name":"Temperatura Interior","type":"Inner","updated_at":1721850719550790},"type":"node"},"relationInstance":{"id":99394,"start":75223,"end":70742,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70742,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["FoodFactory","Entity"],"relType":"ISSUED","bLabels":["Delivery"],"relationCount":3633,"sourceNode":{"id":94009,"labels":["FoodFactory","Entity"],"properties":{"created_at":1723154419528133,"idta":2108001000,"name":"LO MIRANDA","updated_at":1725037976418603},"type":"node"},"relationInstance":{"id":125605,"start":94009,"end":94010,"label":"ISSUED","properties":{"created_at":1723154419528133,"updated_at":1723154419528133},"type":"relationship"},"targetNode":{"id":94010,"labels":["Delivery"],"properties":{"created_at":1723154419528133,"kilos":28920,"number":3896116,"updated_at":1723567975482277},"type":"node"}}
{"aLabels":["Recipe"],"relType":"USED_IN","bLabels":["Delivery"],"relationCount":3633,"sourceNode":{"id":94008,"labels":["Recipe"],"properties":{"created_at":1723154419528133,"name":"01BGMMP-448","updated_at":1723154419528133},"type":"node"},"relationInstance":{"id":125600,"start":94008,"end":94010,"label":"USED_IN","properties":{"created_at":1723154419528133,"updated_at":1723154419528133},"type":"relationship"},"targetNode":{"id":94010,"labels":["Delivery"],"properties":{"created_at":1723154419528133,"kilos":28920,"number":3896116,"updated_at":1723567975482277},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["SiloWeight","Service"],"relationCount":3309,"sourceNode":{"id":77200,"labels":["Device"],"properties":{"name":"Caja Peso Silo","snta":"xrizp4"},"type":"node"},"relationInstance":{"id":102217,"start":77200,"end":70545,"label":"PROVIDES_DATA","properties":{"configId":2},"type":"relationship"},"targetNode":{"id":70545,"labels":["SiloWeight","Service"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","cell_5":"celda 5","cell_6":"celda 6","total":"silo 4"},"iues":1,"measurement":"food_weights","name":"Silo 4","updated_at":1721850476727246},"type":"node"}}
{"aLabels":["Entity","AnimalShed"],"relType":"BELONGS_TO","bLabels":["Sector","Entity"],"relationCount":2733,"sourceNode":{"id":78743,"labels":["Entity","AnimalShed"],"properties":{"idta":2303022001,"length":"150","name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2250,"width":"15"},"type":"node"},"relationInstance":{"id":103836,"start":78743,"end":70540,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":70540,"labels":["Sector","Entity"],"properties":{"address":"Parcelacion 238, Camino el Tranque","costCenter":"C006130307","idta":2303022000,"name":"El Melon 1","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Service","AnimalWeight"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":2687,"sourceNode":{"id":73757,"labels":["Service","AnimalWeight"],"properties":{"endpointMap":{"value_1":"pesaje crianza 1","value_10":"pesaje crianza 10","value_11":"pesaje crianza 11","value_12":"pesaje crianza 12","value_13":"pesaje crianza 13","value_14":"pesaje crianza 14","value_15":"pesaje crianza 15","value_16":"pesaje crianza 16","value_17":"pesaje crianza 17","value_18":"pesaje crianza 18","value_19":"pesaje crianza 19","value_2":"pesaje crianza 2","value_20":"pesaje crianza 20","value_3":"pesaje crianza 3","value_4":"pesaje crianza 4","value_5":"pesaje crianza 5","value_6":"pesaje crianza 6","value_7":"pesaje crianza 7","value_8":"pesaje crianza 8","value_9":"pesaje crianza 9"},"iues":1815,"measurement":"poultry_weights","name":"Pesaje Crianza","updated_at":1721852110210734},"type":"node"},"relationInstance":{"id":97928,"start":73757,"end":70742,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70742,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["Delivery"],"relType":"DELIVERED_TO","bLabels":["ProductBatch","Crianza"],"relationCount":2217,"sourceNode":{"id":172231,"labels":["Delivery"],"properties":{"kilos":25230,"number":1439302},"type":"node"},"relationInstance":{"id":268510,"start":172231,"end":172686,"label":"DELIVERED_TO","properties":{},"type":"relationship"},"targetNode":{"id":172686,"labels":["ProductBatch","Crianza"],"properties":{"numero":100},"type":"node"}}
{"aLabels":["WaterConsumption","Service"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":2206,"sourceNode":{"id":74664,"labels":["WaterConsumption","Service"],"properties":{"endpointMap":{"value":"consumo agua"},"iues":2722,"measurement":"water_consumption","name":"Consumo Agua","updated_at":1721852261155423},"type":"node"},"relationInstance":{"id":98835,"start":74664,"end":70742,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70742,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["ProductBatch","Crianza"],"relType":"INITIAL_VALUES","bLabels":["InitialData"],"relationCount":2122,"sourceNode":{"id":163499,"labels":["ProductBatch","Crianza"],"properties":{"created_at":1724951173827236,"numero":218,"updated_at":1724951173827236},"type":"node"},"relationInstance":{"id":256049,"start":163499,"end":163500,"label":"INITIAL_VALUES","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163500,"labels":["InitialData"],"properties":{"cantidadCobb":0,"cantidadHembras":43200,"cantidadMachos":0,"cantidadMedianas":8200,"cantidadMixtos":0,"cantidadNuevas":0,"cantidadRoss":43200,"cantidadViejas":35000,"clasificacionReproductora":"Vieja","created_at":1724951173827236,"densidad":18,"edadInicioCrianzaPromedio":0,"edadReproductora":53,"fechaInicioCargado":{"year":2024,"month":5,"day":14},"fechaInicioCrianza":{"year":2024,"month":5,"day":14},"fechaTerminoCargado":{"year":2024,"month":5,"day":14},"geneticaPredominante":"ROSS - 2020","porcentajeCobb":0,"porcentajeHembras":1,"porcentajeMachos":0,"porcentajeMedianas":0.19,"porcentajeMixtos":0,"porcentajeNuevas":0,"porcentajeViejas":0.81,"razaPredominante":"Ross","sexo":"Hembra","stockIncialAnimales":43200,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Entity","AnimalShed"],"relType":"PRODUCED","bLabels":["ProductBatch","Crianza"],"relationCount":2019,"sourceNode":{"id":70742,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"},"relationInstance":{"id":256048,"start":70742,"end":163499,"label":"PRODUCED","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163499,"labels":["ProductBatch","Crianza"],"properties":{"created_at":1724951173827236,"numero":218,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Delivery"],"relType":"ISSUED_ON","bLabels":["Day"],"relationCount":1947,"sourceNode":{"id":184311,"labels":["Delivery"],"properties":{"created_at":1725037976203019,"fecha":{"year":2024,"month":8,"day":27},"kilos":24950,"number":4544975,"updated_at":1725037976203019},"type":"node"},"relationInstance":{"id":1997830,"start":184311,"end":115521,"label":"ISSUED_ON","properties":{"created_at":1726006931821105,"updated_at":1726006931821105},"type":"relationship"},"targetNode":{"id":115521,"labels":["Day"],"properties":{"day":27},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Service","AnimalWeight"],"relationCount":1634,"sourceNode":{"id":91057,"labels":["Device"],"properties":{"name":"Caja Peso Pollo","snta":"VGT7OT"},"type":"node"},"relationInstance":{"id":116808,"start":91057,"end":73757,"label":"PROVIDES_DATA","properties":{"configId":3},"type":"relationship"},"targetNode":{"id":73757,"labels":["Service","AnimalWeight"],"properties":{"endpointMap":{"value_1":"pesaje crianza 1","value_10":"pesaje crianza 10","value_11":"pesaje crianza 11","value_12":"pesaje crianza 12","value_13":"pesaje crianza 13","value_14":"pesaje crianza 14","value_15":"pesaje crianza 15","value_16":"pesaje crianza 16","value_17":"pesaje crianza 17","value_18":"pesaje crianza 18","value_19":"pesaje crianza 19","value_2":"pesaje crianza 2","value_20":"pesaje crianza 20","value_3":"pesaje crianza 3","value_4":"pesaje crianza 4","value_5":"pesaje crianza 5","value_6":"pesaje crianza 6","value_7":"pesaje crianza 7","value_8":"pesaje crianza 8","value_9":"pesaje crianza 9"},"iues":1815,"measurement":"poultry_weights","name":"Pesaje Crianza","updated_at":1721852110210734},"type":"node"}}
{"aLabels":["Delivery"],"relType":"DELIVERED_TO","bLabels":["ProductBatch"],"relationCount":1416,"sourceNode":{"id":94010,"labels":["Delivery"],"properties":{"created_at":1723154419528133,"kilos":28920,"number":3896116,"updated_at":1723567975482277},"type":"node"},"relationInstance":{"id":127021,"start":94010,"end":94011,"label":"DELIVERED_TO","properties":{"created_at":1723154419528133,"updated_at":1723154419528133},"type":"relationship"},"targetNode":{"id":94011,"labels":["ProductBatch"],"properties":{"created_at":1723154419528133,"numero":205,"updated_at":1723154419528133},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["WaterConsumption","Service"],"relationCount":1170,"sourceNode":{"id":78135,"labels":["Device"],"properties":{"name":"Flujometro x","snta":"qhhwhi"},"type":"node"},"relationInstance":{"id":103212,"start":78135,"end":74664,"label":"PROVIDES_DATA","properties":{"configId":4},"type":"relationship"},"targetNode":{"id":74664,"labels":["WaterConsumption","Service"],"properties":{"endpointMap":{"value":"consumo agua"},"iues":2722,"measurement":"water_consumption","name":"Consumo Agua","updated_at":1721852261155423},"type":"node"}}
{"aLabels":["Service"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":946,"sourceNode":{"id":93061,"labels":["Service"],"properties":{"created_at":1723151576829851,"name":"Velocidad aire","updated_at":1723151576829851},"type":"node"},"relationInstance":{"id":124613,"start":93061,"end":70924,"label":"MEASURES_IN","properties":{"created_at":1723151576829851,"updated_at":1723151576829851},"type":"relationship"},"targetNode":{"id":70924,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103013001,"name":"Pabellón 1","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Service"],"relationCount":946,"sourceNode":{"id":93059,"labels":["Device"],"properties":{"created_at":1723151576829851,"name":"Fancom - Don Charles ","updated_at":1723151576829851},"type":"node"},"relationInstance":{"id":123666,"start":93059,"end":93061,"label":"PROVIDES_DATA","properties":{"created_at":1723151576829851,"updated_at":1723151576829851},"type":"relationship"},"targetNode":{"id":93061,"labels":["Service"],"properties":{"created_at":1723151576829851,"name":"Velocidad aire","updated_at":1723151576829851},"type":"node"}}
{"aLabels":["FoodFactory","Entity"],"relType":"ISSUED","bLabels":["ProductBatch","Crianza"],"relationCount":324,"sourceNode":{"id":172229,"labels":["FoodFactory","Entity"],"properties":{"idta":2108003000,"name":"CASABLANCA"},"type":"node"},"relationInstance":{"id":267214,"start":172229,"end":172232,"label":"ISSUED","properties":{},"type":"relationship"},"targetNode":{"id":172232,"labels":["ProductBatch","Crianza"],"properties":{"numero":100},"type":"node"}}
{"aLabels":["Sector","Entity"],"relType":"PRODUCED","bLabels":["ProductBatch","Crianza"],"relationCount":275,"sourceNode":{"id":70644,"labels":["Sector","Entity"],"properties":{"address":"Fdo. La Isla Lote B","costCenter":"C001005003","height":413.08,"idta":2103003000,"latitud":-34.205,"longitud":-70.8749,"name":"Bosque Viejo","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":266081,"start":70644,"end":172120,"label":"PRODUCED","properties":{},"type":"relationship"},"targetNode":{"id":172120,"labels":["ProductBatch","Crianza"],"properties":{"numero":218},"type":"node"}}
{"aLabels":["Delivery"],"relType":"DELIVERED_TO","bLabels":["Sector","Entity"],"relationCount":270,"sourceNode":{"id":172427,"labels":["Delivery"],"properties":{"kilos":25360,"number":3330626},"type":"node"},"relationInstance":{"id":268009,"start":172427,"end":70643,"label":"DELIVERED_TO","properties":{},"type":"relationship"},"targetNode":{"id":70643,"labels":["Sector","Entity"],"properties":{"address":"Fundo El Convento","costCenter":"C001006001","height":10.6995,"idta":2103029000,"latitud":-33.7741,"longitud":-71.7165,"name":"Los Pinos","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Delivery"],"relType":"DELIVERED_TO","bLabels":["Sector"],"relationCount":270,"sourceNode":{"id":172231,"labels":["Delivery"],"properties":{"kilos":25230,"number":1439302},"type":"node"},"relationInstance":{"id":266241,"start":172231,"end":172228,"label":"DELIVERED_TO","properties":{},"type":"relationship"},"targetNode":{"id":172228,"labels":["Sector"],"properties":{"idta":"2103059000"},"type":"node"}}
{"aLabels":["CompositionType"],"relType":"HAS_RECIPE","bLabels":["Recipe"],"relationCount":237,"sourceNode":{"id":94007,"labels":["CompositionType"],"properties":{"created_at":1723154419528133,"name":"Mediana","updated_at":1723154419528133},"type":"node"},"relationInstance":{"id":125559,"start":94007,"end":94008,"label":"HAS_RECIPE","properties":{"created_at":1723154419528133,"updated_at":1723154419528133},"type":"relationship"},"targetNode":{"id":94008,"labels":["Recipe"],"properties":{"created_at":1723154419528133,"name":"01BGMMP-448","updated_at":1723154419528133},"type":"node"}}
{"aLabels":["Day"],"relType":"IN_MONTH","bLabels":["Month"],"relationCount":201,"sourceNode":{"id":115521,"labels":["Day"],"properties":{"day":27},"type":"node"},"relationInstance":{"id":162888,"start":115521,"end":115522,"label":"IN_MONTH","properties":{},"type":"relationship"},"targetNode":{"id":115522,"labels":["Month"],"properties":{"month":8},"type":"node"}}
{"aLabels":["Sector","Entity"],"relType":"MANAGED_BY","bLabels":["Management"],"relationCount":167,"sourceNode":{"id":70625,"labels":["Sector","Entity"],"properties":{"address":"Fundo La Isla Lote B","costCenter":"C001005001","height":430.879,"idta":2103001000,"latitud":-34.1995,"longitud":-70.8556,"name":"La Punta","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":94626,"start":70625,"end":70695,"label":"MANAGED_BY","properties":{},"type":"relationship"},"targetNode":{"id":70695,"labels":["Management"],"properties":{"bucketTag":"pollos_crianza","name":"Crianza","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["Sector","Entity"],"relType":"LOCATED_IN","bLabels":["Zone"],"relationCount":166,"sourceNode":{"id":70666,"labels":["Sector","Entity"],"properties":{"address":"Parcela 12 Sitio 15","costCenter":"C001006022","height":317.685,"idta":2103061000,"latitud":-33.2286,"longitud":-71.3199,"name":"La Libreta","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":94748,"start":70666,"end":78694,"label":"LOCATED_IN","properties":{},"type":"relationship"},"targetNode":{"id":78694,"labels":["Zone"],"properties":{"name":"Casa Blanca"},"type":"node"}}
{"aLabels":["Sector"],"relType":"PRODUCED","bLabels":["ProductBatch","Crianza"],"relationCount":165,"sourceNode":{"id":172228,"labels":["Sector"],"properties":{"idta":"2103059000"},"type":"node"},"relationInstance":{"id":266240,"start":172228,"end":172232,"label":"PRODUCED","properties":{},"type":"relationship"},"targetNode":{"id":172232,"labels":["ProductBatch","Crianza"],"properties":{"numero":100},"type":"node"}}
{"aLabels":["Person"],"relType":"HOLDS_POSITION","bLabels":["Title"],"relationCount":154,"sourceNode":{"id":91627,"labels":["Person"],"properties":{"name":"Rodolfo Flores Espinoza"},"type":"node"},"relationInstance":{"id":117480,"start":91627,"end":91626,"label":"HOLDS_POSITION","properties":{},"type":"relationship"},"targetNode":{"id":91626,"labels":["Title"],"properties":{"name":"Jefe Sector"},"type":"node"}}
{"aLabels":["Title"],"relType":"SUBORDINATE_TO","bLabels":["Title"],"relationCount":153,"sourceNode":{"id":91626,"labels":["Title"],"properties":{"name":"Jefe Sector"},"type":"node"},"relationInstance":{"id":117479,"start":91626,"end":91629,"label":"SUBORDINATE_TO","properties":{},"type":"relationship"},"targetNode":{"id":91629,"labels":["Title"],"properties":{"name":"Jefe Terreno"},"type":"node"}}
{"aLabels":["Sex","Standard"],"relType":"HAS_AGE","bLabels":["Age","Standard"],"relationCount":150,"sourceNode":{"id":173660,"labels":["Sex","Standard"],"properties":{"created_at":1724973972529130,"name":"Macho","updated_at":1724973972529130},"type":"node"},"relationInstance":{"id":272614,"start":173660,"end":173661,"label":"HAS_AGE","properties":{"created_at":1724973972529130,"updated_at":1724973972529130},"type":"relationship"},"targetNode":{"id":173661,"labels":["Age","Standard"],"properties":{"consumoAcumulado":0,"consumoAcumuladoAgua":0,"consumoDiario":0,"consumoDiarioAgua":0,"conversion":0,"conversionAcumulada":0,"created_at":1724973972529130,"ganancia":0,"gananciaMedia":0,"idSexo":2,"numero":0,"peso":0.044,"raza":"Ross","updated_at":1724973972529130},"type":"node"}}
{"aLabels":["Sector","Entity"],"relType":"OVERSEEN_BY","bLabels":["Title"],"relationCount":123,"sourceNode":{"id":70659,"labels":["Sector","Entity"],"properties":{"address":"Parcela 1 Hacienda Santa Rosa","costCenter":"C001006016","height":164.092,"idta":2103045000,"latitud":-33.982,"longitud":-71.3188,"name":"Chifri","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":94728,"start":70659,"end":91626,"label":"OVERSEEN_BY","properties":{},"type":"relationship"},"targetNode":{"id":91626,"labels":["Title"],"properties":{"name":"Jefe Sector"},"type":"node"}}
{"aLabels":["Person"],"relType":"FRIENDS_WITH","bLabels":["Person"],"relationCount":91,"sourceNode":{"id":808703,"labels":["Person"],"properties":{"age":30,"name":"Alice"},"type":"node"},"relationInstance":{"id":2000104,"start":808703,"end":808704,"label":"FRIENDS_WITH","properties":{},"type":"relationship"},"targetNode":{"id":808704,"labels":["Person"],"properties":{"age":25,"name":"Bob"},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Temperature","Service"],"relationCount":63,"sourceNode":{"id":91311,"labels":["Device"],"properties":{"name":"LSN50V2-S31B","snta":"T10FVR"},"type":"node"},"relationInstance":{"id":117064,"start":91311,"end":91361,"label":"PROVIDES_DATA","properties":{"configId":33},"type":"relationship"},"targetNode":{"id":91361,"labels":["Temperature","Service"],"properties":{"endpointMap":{"value":"temperatura 1"},"iues":23443,"measurement":"temperature","name":"Temperatura 1","updated_at":1721850719550790},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Humidity","Service"],"relationCount":63,"sourceNode":{"id":91311,"labels":["Device"],"properties":{"name":"LSN50V2-S31B","snta":"T10FVR"},"type":"node"},"relationInstance":{"id":117065,"start":91311,"end":91362,"label":"PROVIDES_DATA","properties":{"configId":34},"type":"relationship"},"targetNode":{"id":91362,"labels":["Humidity","Service"],"properties":{"endpointMap":{"value":"humedad 1"},"iues":23444,"measurement":"humidity","name":"Humedad 1","updated_at":1721850900796702},"type":"node"}}
{"aLabels":["ProductBatch","Crianza"],"relType":"FINAL_VALUES","bLabels":["EndData"],"relationCount":36,"sourceNode":{"id":163499,"labels":["ProductBatch","Crianza"],"properties":{"created_at":1724951173827236,"numero":218,"updated_at":1724951173827236},"type":"node"},"relationInstance":{"id":256050,"start":163499,"end":163501,"label":"FINAL_VALUES","properties":{"created_at":1724951173827236,"updated_at":1724951173827236},"type":"relationship"},"targetNode":{"id":163501,"labels":["EndData"],"properties":{"alimentoConsumidoAnimalTecnoandina":4.358177,"alimentoConsumidoPabellonTecnoandina":185704,"alimentoSobranteTecnoandina":3060,"animalesFaenadosCliente":42207,"conversionBiologicaAcumuladaTecnoandina":1.653488,"conversionBrutaTecnoandina":1.66619,"created_at":1724951173827236,"diferenciaMortalidades":95,"diferenciaPorcentajeMortalidades":0.0022,"dispercionPesoFaena":0.08427,"edadFaena":43.0612220721681,"fechaCierre":{"year":2024,"month":6,"day":26},"fechaFinFaena":{"year":2024,"month":6,"day":26},"fechaInicioFaena":{"year":2024,"month":6,"day":26},"gananciaDiariaCliente":0.06338,"kilosFaenadosCliente":115196,"mortalidadAcumuladaFinal":898,"mortalidadGuiasAnimales":993,"pesoHomologadoCliente":2.808,"pesoPromedioFaenaCliente":2.729,"porcentajeDiferenciaMortalidades":0.09567,"porcentajeMortalidadAcumuladaFinal":0.02079,"porcentajeMortalidadGuiasAnimales":0.02299,"unidadesAltaTemperaturaTecnoandina":0,"unidadesBajaTemperaturaTecnoandina":346549,"updated_at":1724951173827236},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Door","Service"],"relationCount":34,"sourceNode":{"id":91317,"labels":["Device"],"properties":{"name":"LSN50V2-S31B","snta":"GYWLDJ"},"type":"node"},"relationInstance":{"id":117078,"start":91317,"end":91375,"label":"PROVIDES_DATA","properties":{"configId":35},"type":"relationship"},"targetNode":{"id":91375,"labels":["Door","Service"],"properties":{"endpointMap":{"value":"puerta abierta"},"iues":23457,"measurement":"door_status","name":"Puerta","updated_at":1721853155529016},"type":"node"}}
{"aLabels":["Entity","Machine"],"relType":"BELONGS_TO","bLabels":["Entity","Room"],"relationCount":34,"sourceNode":{"id":91347,"labels":["Entity","Machine"],"properties":{"idta":2301020401,"name":"INC 1","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":117142,"start":91347,"end":91343,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":91343,"labels":["Entity","Room"],"properties":{"idta":2301020400,"name":"Incubadora","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Door","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Machine"],"relationCount":34,"sourceNode":{"id":91375,"labels":["Door","Service"],"properties":{"endpointMap":{"value":"puerta abierta"},"iues":23457,"measurement":"door_status","name":"Puerta","updated_at":1721853155529016},"type":"node"},"relationInstance":{"id":117170,"start":91375,"end":91347,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91347,"labels":["Entity","Machine"],"properties":{"idta":2301020401,"name":"INC 1","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Humidity","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Machine"],"relationCount":34,"sourceNode":{"id":91374,"labels":["Humidity","Service"],"properties":{"endpointMap":{"value":"humedad"},"iues":23456,"measurement":"humidity","name":"Humedad","updated_at":1721850900796702},"type":"node"},"relationInstance":{"id":117169,"start":91374,"end":91347,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91347,"labels":["Entity","Machine"],"properties":{"idta":2301020401,"name":"INC 1","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Temperature","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Machine"],"relationCount":34,"sourceNode":{"id":91373,"labels":["Temperature","Service"],"properties":{"endpointMap":{"value":"temperatura"},"iues":23455,"measurement":"temperature","name":"Temperatura","updated_at":1721850719550790},"type":"node"},"relationInstance":{"id":117168,"start":91373,"end":91347,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91347,"labels":["Entity","Machine"],"properties":{"idta":2301020401,"name":"INC 1","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Humidity","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Room"],"relationCount":29,"sourceNode":{"id":91362,"labels":["Humidity","Service"],"properties":{"endpointMap":{"value":"humedad 1"},"iues":23444,"measurement":"humidity","name":"Humedad 1","updated_at":1721850900796702},"type":"node"},"relationInstance":{"id":117157,"start":91362,"end":91340,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91340,"labels":["Entity","Room"],"properties":{"idta":2301020100,"name":"Recepción Huevos","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Temperature","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Room"],"relationCount":29,"sourceNode":{"id":91361,"labels":["Temperature","Service"],"properties":{"endpointMap":{"value":"temperatura 1"},"iues":23443,"measurement":"temperature","name":"Temperatura 1","updated_at":1721850719550790},"type":"node"},"relationInstance":{"id":117156,"start":91361,"end":91340,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91340,"labels":["Entity","Room"],"properties":{"idta":2301020100,"name":"Recepción Huevos","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["_Node"],"relType":"_has_subclass","bLabels":["_SubClass"],"relationCount":14,"sourceNode":{"id":91596,"labels":["_Node"],"properties":{"name":"Service","props":[{"property":"iues","type":"int"},{"property":"name","type":"str"},{"property":"measurement","type":"str"},{"property":"endpointMap","type":"dict"}]},"type":"node"},"relationInstance":{"id":117452,"start":91596,"end":91604,"label":"_has_subclass","properties":{},"type":"relationship"},"targetNode":{"id":91604,"labels":["_SubClass"],"properties":{"name":"WaterFlow"},"type":"node"}}
{"aLabels":["_Relationship"],"relType":"_to","bLabels":["_Node"],"relationCount":13,"sourceNode":{"id":91599,"labels":["_Relationship"],"properties":{"name":"BELONGS_TO"},"type":"node"},"relationInstance":{"id":117460,"start":91599,"end":91595,"label":"_to","properties":{},"type":"relationship"},"targetNode":{"id":91595,"labels":["_Node"],"properties":{"name":"Entity","props":[{"property":"idta","type":"int"},{"property":"name","type":"str"}]},"type":"node"}}
{"aLabels":["_Relationship"],"relType":"_from","bLabels":["_Node"],"relationCount":13,"sourceNode":{"id":91599,"labels":["_Relationship"],"properties":{"name":"BELONGS_TO"},"type":"node"},"relationInstance":{"id":117459,"start":91599,"end":91595,"label":"_from","properties":{},"type":"relationship"},"targetNode":{"id":91595,"labels":["_Node"],"properties":{"name":"Entity","props":[{"property":"idta","type":"int"},{"property":"name","type":"str"}]},"type":"node"}}
{"aLabels":["Hardware"],"relType":"SUPPORTS","bLabels":["Firmware"],"relationCount":13,"sourceNode":{"id":91916,"labels":["Hardware"],"properties":{"name":"PCB-V5"},"type":"node"},"relationInstance":{"id":117781,"start":91916,"end":91919,"label":"SUPPORTS","properties":{},"type":"relationship"},"targetNode":{"id":91919,"labels":["Firmware"],"properties":{"name":"Pesaje Silo"},"type":"node"}}
{"aLabels":["Service","SiloWeight"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":12,"sourceNode":{"id":92592,"labels":["Service","SiloWeight"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","cell_5":"celda 5","cell_6":"celda 6","total":"silo 1"},"iues":23613,"measurement":"food_weights","name":"Silo 1","updated_at":1721850453995012},"type":"node"},"relationInstance":{"id":123196,"start":92592,"end":92588,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":92588,"labels":["Entity","AnimalShed"],"properties":{"idta":2305043001,"name":"Pabellón 1"},"type":"node"}}
{"aLabels":["Entity","AnimalShed"],"relType":"BELONGS_TO","bLabels":["Sector"],"relationCount":12,"sourceNode":{"id":92588,"labels":["Entity","AnimalShed"],"properties":{"idta":2305043001,"name":"Pabellón 1"},"type":"node"},"relationInstance":{"id":123192,"start":92588,"end":92587,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":92587,"labels":["Sector"],"properties":{"idta":2305043000,"name":"Los Pinos"},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Service","SiloWeight"],"relationCount":12,"sourceNode":{"id":92219,"labels":["Device"],"properties":{"snta":"C7QQJX"},"type":"node"},"relationInstance":{"id":122825,"start":92219,"end":92592,"label":"PROVIDES_DATA","properties":{"configId":1},"type":"relationship"},"targetNode":{"id":92592,"labels":["Service","SiloWeight"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","cell_5":"celda 5","cell_6":"celda 6","total":"silo 1"},"iues":23613,"measurement":"food_weights","name":"Silo 1","updated_at":1721850453995012},"type":"node"}}
{"aLabels":["DeviceType"],"relType":"HAS_DEVICE","bLabels":["Device"],"relationCount":12,"sourceNode":{"id":88402,"labels":["DeviceType"],"properties":{"SAPCode":200006,"name":"Caja Peso Pavos"},"type":"node"},"relationInstance":{"id":113605,"start":88402,"end":89123,"label":"HAS_DEVICE","properties":{},"type":"relationship"},"targetNode":{"id":89123,"labels":["Device"],"properties":{"name":"Caja Peso Pavos","snta":"18gkbn"},"type":"node"}}
{"aLabels":["DevicePart"],"relType":"USED_IN","bLabels":["Device"],"relationCount":12,"sourceNode":{"id":808661,"labels":["DevicePart"],"properties":{"created_at":1727987703863454,"name":"Celda de Carga","snta":"ax0001","updated_at":1727987703863454},"type":"node"},"relationInstance":{"id":2000075,"start":808661,"end":76944,"label":"USED_IN","properties":{"created_at":1727987703863454,"fechaInstalacion":{"year":2021,"month":11,"day":5},"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":76944,"labels":["Device"],"properties":{"name":"Caja Peso Silo","snta":"nirtvb"},"type":"node"}}
{"aLabels":["Model"],"relType":"IS_TYPE","bLabels":["DevicePart"],"relationCount":12,"sourceNode":{"id":808658,"labels":["Model"],"properties":{"created_at":1727987703863454,"name":"Modelo Celda 3 Ton.","updated_at":1727987703863454},"type":"node"},"relationInstance":{"id":2000076,"start":808658,"end":808661,"label":"IS_TYPE","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":808661,"labels":["DevicePart"],"properties":{"created_at":1727987703863454,"name":"Celda de Carga","snta":"ax0001","updated_at":1727987703863454},"type":"node"}}
{"aLabels":["Entity","Room"],"relType":"BELONGS_TO","bLabels":["Entity"],"relationCount":10,"sourceNode":{"id":91471,"labels":["Entity","Room"],"properties":{"idta":2301010100,"name":"Recepción Huevos","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":117321,"start":91471,"end":91470,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":91470,"labels":["Entity"],"properties":{"idta":2301010000,"name":"Cardonal","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["ProductBatch"],"relType":"PRODUCED_IN","bLabels":["Sector","Entity"],"relationCount":9,"sourceNode":{"id":94011,"labels":["ProductBatch"],"properties":{"created_at":1723154419528133,"numero":205,"updated_at":1723154419528133},"type":"node"},"relationInstance":{"id":127022,"start":94011,"end":70628,"label":"PRODUCED_IN","properties":{"created_at":1723154419528133,"updated_at":1723154419528133},"type":"relationship"},"targetNode":{"id":70628,"labels":["Sector","Entity"],"properties":{"address":"Parc. 20 Fdo. La Leonera","costCenter":"C001005011","height":577.272,"idta":2103013000,"latitud":-34.0498,"longitud":-70.6486,"name":"Don Charles","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Management"],"relType":"SUBMANAGEMENT_OF","bLabels":["Management"],"relationCount":9,"sourceNode":{"id":79079,"labels":["Management"],"properties":{"bucketTag":"pavos_crianza","name":"Crianza","updated_at":1722543095480644},"type":"node"},"relationInstance":{"id":104166,"start":79079,"end":70536,"label":"SUBMANAGEMENT_OF","properties":{},"type":"relationship"},"targetNode":{"id":70536,"labels":["Management"],"properties":{"name":"Pavos","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["DeviceType"],"relType":"HAS_CONFIGURATION","bLabels":["DeviceConfig"],"relationCount":8,"sourceNode":{"id":78709,"labels":["DeviceType"],"properties":{"SAPCode":200001,"name":"Caja Peso Silo"},"type":"node"},"relationInstance":{"id":103771,"start":78709,"end":89135,"label":"HAS_CONFIGURATION","properties":{},"type":"relationship"},"targetNode":{"id":89135,"labels":["DeviceConfig"],"properties":{"configId":1,"configuration":[{"field":"celda1","new_field":"cell_1"},{"field":"celda2","new_field":"cell_2"},{"field":"celda3","new_field":"cell_3"},{"field":"celda4","new_field":"cell_4"},{"field":"celda5","new_field":"cell_5"},{"field":"celda6","new_field":"cell_6"},{"field":"peso_silo1","new_field":"total"}],"name":"Salida Silo 1","service":"SiloWeight","updated_at":1722027442248183},"type":"node"}}
{"aLabels":["Entity","Room"],"relType":"BELONGS_TO","bLabels":["Entity","Incubator"],"relationCount":7,"sourceNode":{"id":91340,"labels":["Entity","Room"],"properties":{"idta":2301020100,"name":"Recepción Huevos","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":117135,"start":91340,"end":91339,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":91339,"labels":["Entity","Incubator"],"properties":{"idta":2301020000,"name":"Pucalán","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["DeviceConfig"],"relType":"USED_BY","bLabels":["Client"],"relationCount":7,"sourceNode":{"id":89135,"labels":["DeviceConfig"],"properties":{"configId":1,"configuration":[{"field":"celda1","new_field":"cell_1"},{"field":"celda2","new_field":"cell_2"},{"field":"celda3","new_field":"cell_3"},{"field":"celda4","new_field":"cell_4"},{"field":"celda5","new_field":"cell_5"},{"field":"celda6","new_field":"cell_6"},{"field":"peso_silo1","new_field":"total"}],"name":"Salida Silo 1","service":"SiloWeight","updated_at":1722027442248183},"type":"node"},"relationInstance":{"id":114756,"start":89135,"end":78708,"label":"USED_BY","properties":{},"type":"relationship"},"targetNode":{"id":78708,"labels":["Client"],"properties":{"name":"Agrosuper"},"type":"node"}}
{"aLabels":["Service","PpmNH3"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":7,"sourceNode":{"id":76347,"labels":["Service","PpmNH3"],"properties":{"endpointMap":{"nh3":"ppm nh3"},"iues":4405,"measurement":"air_composition","name":"ppm NH3","updated_at":1721853273312712},"type":"node"},"relationInstance":{"id":100518,"start":76347,"end":70758,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70758,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003017,"name":"Pabellón 17","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["Month"],"relType":"IN_YEAR","bLabels":["Year"],"relationCount":7,"sourceNode":{"id":115522,"labels":["Month"],"properties":{"month":8},"type":"node"},"relationInstance":{"id":162889,"start":115522,"end":115523,"label":"IN_YEAR","properties":{},"type":"relationship"},"targetNode":{"id":115523,"labels":["Year"],"properties":{"year":2024},"type":"node"}}
{"aLabels":["Service","PpmCO2"],"relType":"MEASURES_IN","bLabels":["Entity","AnimalShed"],"relationCount":6,"sourceNode":{"id":76341,"labels":["Service","PpmCO2"],"properties":{"endpointMap":{"co2":"ppm co2"},"iues":4399,"measurement":"air_composition","name":"ppm CO2","updated_at":1721853256596353},"type":"node"},"relationInstance":{"id":100512,"start":76341,"end":70758,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":70758,"labels":["Entity","AnimalShed"],"properties":{"constructionType":"Black Out","idta":2103003017,"name":"Pabellón 17","updated_at":1722543085294399,"usefulArea":2400},"type":"node"}}
{"aLabels":["Manufacturer"],"relType":"PRODUCES","bLabels":["Hardware"],"relationCount":6,"sourceNode":{"id":91911,"labels":["Manufacturer"],"properties":{"name":"Friendcom"},"type":"node"},"relationInstance":{"id":117773,"start":91911,"end":91913,"label":"PRODUCES","properties":{},"type":"relationship"},"targetNode":{"id":91913,"labels":["Hardware"],"properties":{"name":"FC-174"},"type":"node"}}
{"aLabels":["Stage"],"relType":"SEGMENTATION_OF","bLabels":["Management"],"relationCount":6,"sourceNode":{"id":79072,"labels":["Stage"],"properties":{"name":"Crianza"},"type":"node"},"relationInstance":{"id":104165,"start":79072,"end":70695,"label":"SEGMENTATION_OF","properties":{},"type":"relationship"},"targetNode":{"id":70695,"labels":["Management"],"properties":{"bucketTag":"pollos_crianza","name":"Crianza","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["GasTank"],"relType":"BELONGS_TO","bLabels":["Sector","Entity"],"relationCount":6,"sourceNode":{"id":93047,"labels":["GasTank"],"properties":{"name":"Tanque 1 - Conjunto 1"},"type":"node"},"relationInstance":{"id":123654,"start":93047,"end":78714,"label":"BELONGS_TO","properties":{},"type":"relationship"},"targetNode":{"id":78714,"labels":["Sector","Entity"],"properties":{"costCenter":"C006130108","idta":2302004000,"name":"Las Encinas","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Service","GasTankWeight"],"relType":"MEASURES_IN","bLabels":["GasTank"],"relationCount":6,"sourceNode":{"id":93048,"labels":["Service","GasTankWeight"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","total":"peso estanque"},"iues":23682,"measurement":"gas_weights","name":"Peso Estanque","updated_at":1721851091805565},"type":"node"},"relationInstance":{"id":123655,"start":93048,"end":93047,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":93047,"labels":["GasTank"],"properties":{"name":"Tanque 1 - Conjunto 1"},"type":"node"}}
{"aLabels":["Device"],"relType":"PROVIDES_DATA","bLabels":["Service","GasTankWeight"],"relationCount":6,"sourceNode":{"id":93046,"labels":["Device"],"properties":{"snta":"DHEPVD"},"type":"node"},"relationInstance":{"id":123652,"start":93046,"end":93048,"label":"PROVIDES_DATA","properties":{},"type":"relationship"},"targetNode":{"id":93048,"labels":["Service","GasTankWeight"],"properties":{"endpointMap":{"cell_1":"celda 1","cell_2":"celda 2","cell_3":"celda 3","cell_4":"celda 4","total":"peso estanque"},"iues":23682,"measurement":"gas_weights","name":"Peso Estanque","updated_at":1721851091805565},"type":"node"}}
{"aLabels":["Management"],"relType":"OVERSEEN_BY","bLabels":["Title"],"relationCount":5,"sourceNode":{"id":89139,"labels":["Management"],"properties":{"name":"Produccion Animal","updated_at":1722543095480644},"type":"node"},"relationInstance":{"id":1997766,"start":89139,"end":319134,"label":"OVERSEEN_BY","properties":{},"type":"relationship"},"targetNode":{"id":319134,"labels":["Title"],"properties":{"name":"Gerente Produccion Animal"},"type":"node"}}
{"aLabels":["EggShell","Service"],"relType":"MEASURES_IN","bLabels":["Entity","Incubator"],"relationCount":4,"sourceNode":{"id":91431,"labels":["EggShell","Service"],"properties":{"endpointMap":{"temperature":"Temperatura Cascara Huevo 1","temperature_unit":"unit"},"iues":23513,"measurement":"medioambiente","name":"Cascara de Huevo 1"},"type":"node"},"relationInstance":{"id":117226,"start":91431,"end":91339,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91339,"labels":["Entity","Incubator"],"properties":{"idta":2301020000,"name":"Pucalán","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["EggShell","Service"],"relType":"MEASURES_IN","bLabels":["Entity"],"relationCount":4,"sourceNode":{"id":91591,"labels":["EggShell","Service"],"properties":{"endpointMap":{"temperature":"Temperatura Cascara Huevo 1","temperature_unit":"unit"},"iues":23607,"measurement":"medioambiente","name":"Cascara de Huevo 1"},"type":"node"},"relationInstance":{"id":117441,"start":91591,"end":91470,"label":"MEASURES_IN","properties":{},"type":"relationship"},"targetNode":{"id":91470,"labels":["Entity"],"properties":{"idta":2301010000,"name":"Cardonal","updated_at":1722543085294399},"type":"node"}}
{"aLabels":["Genetic"],"relType":"HAS_SEX","bLabels":["Sex","Standard"],"relationCount":3,"sourceNode":{"id":173659,"labels":["Genetic"],"properties":{"created_at":1724973972529130,"name":"ROSS - 2020","updated_at":1724973972529130},"type":"node"},"relationInstance":{"id":272613,"start":173659,"end":173660,"label":"HAS_SEX","properties":{"created_at":1724973972529130,"updated_at":1724973972529130},"type":"relationship"},"targetNode":{"id":173660,"labels":["Sex","Standard"],"properties":{"created_at":1724973972529130,"name":"Macho","updated_at":1724973972529130},"type":"node"}}
{"aLabels":["Storage"],"relType":"STOCK","bLabels":["Model"],"relationCount":2,"sourceNode":{"id":808659,"labels":["Storage"],"properties":{"created_at":1727987703863454,"name":"Bodega 1","updated_at":1727987703863454},"type":"node"},"relationInstance":{"id":2000073,"start":808659,"end":808658,"label":"STOCK","properties":{"cantidad":31,"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":808658,"labels":["Model"],"properties":{"created_at":1727987703863454,"name":"Modelo Celda 3 Ton.","updated_at":1727987703863454},"type":"node"}}
{"aLabels":["Entity"],"relType":"MANAGED_BY","bLabels":["Management"],"relationCount":1,"sourceNode":{"id":91470,"labels":["Entity"],"properties":{"idta":2301010000,"name":"Cardonal","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":117320,"start":91470,"end":79080,"label":"MANAGED_BY","properties":{},"type":"relationship"},"targetNode":{"id":79080,"labels":["Management"],"properties":{"bucketTag":"pavos_incubadoras","name":"Incubadora","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["Entity","Incubator"],"relType":"MANAGED_BY","bLabels":["Management"],"relationCount":1,"sourceNode":{"id":91339,"labels":["Entity","Incubator"],"properties":{"idta":2301020000,"name":"Pucalán","updated_at":1722543085294399},"type":"node"},"relationInstance":{"id":117134,"start":91339,"end":79080,"label":"MANAGED_BY","properties":{},"type":"relationship"},"targetNode":{"id":79080,"labels":["Management"],"properties":{"bucketTag":"pavos_incubadoras","name":"Incubadora","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["WorkOrder"],"relType":"TYPE","bLabels":["Maintenance"],"relationCount":1,"sourceNode":{"id":808675,"labels":["WorkOrder"],"properties":{"created_at":1727987703863454,"falla":"Sin Datos","fecha":{"year":2024,"month":8,"day":27},"name":"OT - 672","number":672,"pata":3,"solucion":"Reemplazo","updated_at":1728044880663056},"type":"node"},"relationInstance":{"id":2000100,"start":808675,"end":808673,"label":"TYPE","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":808673,"labels":["Maintenance"],"properties":{"created_at":1727987703863454,"name":"Mantenimiento Celda","updated_at":1727987703863454},"type":"node"}}
{"aLabels":["Sector"],"relType":"LOCATED_IN","bLabels":["Zone"],"relationCount":1,"sourceNode":{"id":92587,"labels":["Sector"],"properties":{"idta":2305043000,"name":"Los Pinos"},"type":"node"},"relationInstance":{"id":123190,"start":92587,"end":79078,"label":"LOCATED_IN","properties":{},"type":"relationship"},"targetNode":{"id":79078,"labels":["Zone"],"properties":{"name":"Las Palmas"},"type":"node"}}
{"aLabels":["WorkOrder"],"relType":"INCLUDES","bLabels":["Device"],"relationCount":1,"sourceNode":{"id":808675,"labels":["WorkOrder"],"properties":{"created_at":1727987703863454,"falla":"Sin Datos","fecha":{"year":2024,"month":8,"day":27},"name":"OT - 672","number":672,"pata":3,"solucion":"Reemplazo","updated_at":1728044880663056},"type":"node"},"relationInstance":{"id":2000101,"start":808675,"end":76944,"label":"INCLUDES","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":76944,"labels":["Device"],"properties":{"name":"Caja Peso Silo","snta":"nirtvb"},"type":"node"}}
{"aLabels":["Maintenance"],"relType":"INSTRUCTION","bLabels":["Procedure"],"relationCount":1,"sourceNode":{"id":808673,"labels":["Maintenance"],"properties":{"created_at":1727987703863454,"name":"Mantenimiento Celda","updated_at":1727987703863454},"type":"node"},"relationInstance":{"id":2000099,"start":808673,"end":808674,"label":"INSTRUCTION","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":808674,"labels":["Procedure"],"properties":{"created_at":1727987703863454,"link":"https://youtu.be/p1PZUkJskZE","name":"Cambio Celda","updated_at":1727987703863454},"type":"node"}}
{"aLabels":["WorkOrder"],"relType":"IN_DATE","bLabels":["Day"],"relationCount":1,"sourceNode":{"id":808675,"labels":["WorkOrder"],"properties":{"created_at":1727987703863454,"falla":"Sin Datos","fecha":{"year":2024,"month":8,"day":27},"name":"OT - 672","number":672,"pata":3,"solucion":"Reemplazo","updated_at":1728044880663056},"type":"node"},"relationInstance":{"id":2000103,"start":808675,"end":115521,"label":"IN_DATE","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":115521,"labels":["Day"],"properties":{"day":27},"type":"node"}}
{"aLabels":["Sector"],"relType":"MANAGED_BY","bLabels":["Management"],"relationCount":1,"sourceNode":{"id":92587,"labels":["Sector"],"properties":{"idta":2305043000,"name":"Los Pinos"},"type":"node"},"relationInstance":{"id":123191,"start":92587,"end":79079,"label":"MANAGED_BY","properties":{},"type":"relationship"},"targetNode":{"id":79079,"labels":["Management"],"properties":{"bucketTag":"pavos_crianza","name":"Crianza","updated_at":1722543095480644},"type":"node"}}
{"aLabels":["WorkOrder"],"relType":"IN_CHARGE","bLabels":["Person"],"relationCount":1,"sourceNode":{"id":808675,"labels":["WorkOrder"],"properties":{"created_at":1727987703863454,"falla":"Sin Datos","fecha":{"year":2024,"month":8,"day":27},"name":"OT - 672","number":672,"pata":3,"solucion":"Reemplazo","updated_at":1728044880663056},"type":"node"},"relationInstance":{"id":2000102,"start":808675,"end":808676,"label":"IN_CHARGE","properties":{"created_at":1727987703863454,"updated_at":1727987703863454},"type":"relationship"},"targetNode":{"id":808676,"labels":["Person"],"properties":{"created_at":1727987703863454,"name":"Nicolás Fuenzalida","updated_at":1727987703863454},"type":"node"}}
{"aLabels":["Client"],"relType":"OVERSEEN_BY","bLabels":["Title"],"relationCount":1,"sourceNode":{"id":78708,"labels":["Client"],"properties":{"name":"Agrosuper"},"type":"node"},"relationInstance":{"id":1997765,"start":78708,"end":319133,"label":"OVERSEEN_BY","properties":{},"type":"relationship"},"targetNode":{"id":319133,"labels":["Title"],"properties":{"name":"Gerente General"},"type":"node"}}
{"aLabels":["Management"],"relType":"REPORTS_TO","bLabels":["Client"],"relationCount":1,"sourceNode":{"id":89139,"labels":["Management"],"properties":{"name":"Produccion Animal","updated_at":1722543095480644},"type":"node"},"relationInstance":{"id":114760,"start":89139,"end":78708,"label":"REPORTS_TO","properties":{},"type":"relationship"},"targetNode":{"id":78708,"labels":["Client"],"properties":{"name":"Agrosuper"},"type":"node"}}
{"aLabels":["Manufacturer"],"relType":"PRODUCES","bLabels":["Device"],"relationCount":1,"sourceNode":{"id":93060,"labels":["Manufacturer"],"properties":{"created_at":1723151576829851,"name":"Fancom","updated_at":1723151576829851},"type":"node"},"relationInstance":{"id":124612,"start":93060,"end":93059,"label":"PRODUCES","properties":{"created_at":1723151576829851,"updated_at":1723151576829851},"type":"relationship"},"targetNode":{"id":93059,"labels":["Device"],"properties":{"created_at":1723151576829851,"name":"Fancom - Don Charles ","updated_at":1723151576829851},"type":"node"}}
      `];

    // Agregar cada tipo de datos como una sección
    for (const [name, data] of Object.entries(dataByType)) {
      contextSections.push(`## ${name}\n${JSON.stringify(data, null, 2)}`);
    }

    const kpiAndSector = contextSections.join('\n\n');

    console.log('[GET /api/context] Contexto generado exitosamente');

    return NextResponse.json({ 
      success: true,
      kpiAndSector,
      rawData: dataByType
    });

  } catch (error) {
    console.error('[GET /api/context] Error al obtener contexto:', error);
    return NextResponse.json(
      { success: false, error: "Error al obtener información de contexto" },
      { status: 500 }
    );
  }
}
