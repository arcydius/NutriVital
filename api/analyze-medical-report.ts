import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  json?: (body: unknown) => void;
}

function sendJson(res: VercelResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const rawKey = (process.env.GEMINI_API_KEY || '').trim();
  const isValidKey =
    rawKey.length > 0 &&
    !rawKey.includes('PEGA_AQUI') &&
    !rawKey.includes('MY_GEMINI_API_KEY');

  if (!isValidKey) {
    return sendJson(res, 503, { error: 'GEMINI_API_KEY no configurada en Vercel' });
  }

  try {
    const { fileName, mimeType, base64Data } = await readJsonBody(req);
    if (
      typeof fileName !== 'string' ||
      typeof mimeType !== 'string' ||
      typeof base64Data !== 'string' ||
      !base64Data
    ) {
      return sendJson(res, 400, { error: 'Datos del archivo incompletos' });
    }

    const ai = new GoogleGenAI({ apiKey: rawKey });
    const modelCandidates = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    const promptContents = [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      `Analiza este informe médico o analítica clínica (${fileName}) y extrae únicamente los datos reales presentes en el documento en español (NUNCA inventes valores que no aparezcan en el archivo).
1. Clasifica reportType como 'Analítica Sanguínea', 'Perfil Lipídico', 'Chequeo Cardiometabólico' o 'Panel Hormonal & Micronutrientes'.
2. Extrae signos vitales y antropometría SOLO si aparecen explícitamente en el informe: presión arterial (detectedSystolicBP, detectedDiastolicBP), pulsaciones/FC en lpm (detectedHeartRate), peso en kg (detectedWeight), estatura SIEMPRE convertida a centímetros (detectedHeight, ej. si dice 1.75 m devuelve 175), cintura en cm (detectedWaist), ingesta calórica diaria si se menciona (detectedDailyCalories) y grado de hígado graso 0 a 3 en markers.fattyLiverGrade. Si un dato NO aparece en el informe, omítelo (no pongas valores por defecto).
3. Incluye valores fuera de rango en flaggedFindings con sus unidades y alertas de seguridad renal/potasio en contraindications si aplica.
4. Si hay datos suficientes, calcula en suggestedGoals unas metas orientativas conservadoras y realistas (targetSystolicBP, targetDiastolicBP, targetHeartRate, targetWeight, targetBodyMass, targetCalories, timelineWeeks entre 8 y 12, y aiRationale explicando por qué se sugieren). Recalca claramente en aiRationale que esta sugerencia es generada por IA con fines orientativos y no sustituye la evaluación ni prescripción de un médico.`,
    ];
    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reportType: { type: Type.STRING },
          reportDate: { type: Type.STRING },
          aiClinicalSummary: { type: Type.STRING },
          markers: {
            type: Type.OBJECT,
            properties: {
              fastingGlucose: { type: Type.NUMBER },
              hba1c: { type: Type.NUMBER },
              ldlCholesterol: { type: Type.NUMBER },
              hdlCholesterol: { type: Type.NUMBER },
              triglycerides: { type: Type.NUMBER },
              vitaminD: { type: Type.NUMBER },
              hsCRP: { type: Type.NUMBER },
              creatinine: { type: Type.NUMBER },
              potassium: { type: Type.NUMBER },
              ferritin: { type: Type.NUMBER },
              fattyLiverGrade: { type: Type.NUMBER },
            },
          },
          flaggedFindings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          contraindications: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          detectedSystolicBP: { type: Type.NUMBER },
          detectedDiastolicBP: { type: Type.NUMBER },
          detectedHeartRate: { type: Type.NUMBER },
          detectedWeight: { type: Type.NUMBER },
          detectedHeight: { type: Type.NUMBER },
          detectedWaist: { type: Type.NUMBER },
          detectedDailyCalories: { type: Type.NUMBER },
          suggestedGoals: {
            type: Type.OBJECT,
            properties: {
              targetSystolicBP: { type: Type.NUMBER },
              targetDiastolicBP: { type: Type.NUMBER },
              targetHeartRate: { type: Type.NUMBER },
              targetWeight: { type: Type.NUMBER },
              targetBodyMass: { type: Type.NUMBER },
              targetCalories: { type: Type.NUMBER },
              timelineWeeks: { type: Type.NUMBER },
              aiRationale: { type: Type.STRING },
            },
          },
        },
        required: [
          'reportType',
          'aiClinicalSummary',
          'markers',
          'flaggedFindings',
          'contraindications',
        ],
      },
    };

    let responseText: string | undefined;
    let lastError: unknown;
    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: promptContents,
          config: generationConfig,
        });
        responseText = response.text;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Modelo ${model} no disponible en /api/analyze-medical-report, probando respaldo...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Sin respuesta de Gemini');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(responseText);
  } catch (error) {
    console.error('Error en /api/analyze-medical-report:', error);
    return sendJson(res, 500, { error: 'Error analizando el documento con Gemini' });
  }
}
