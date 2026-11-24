import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

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
    const { message, userContext } = await readJsonBody(req);
    if (typeof message !== 'string' || !message.trim()) {
      return sendJson(res, 400, { error: 'Mensaje vacío' });
    }

    const ai = new GoogleGenAI({ apiKey: rawKey });
    const systemPrompt = `Eres NutriBot, el asistente clínico virtual oficial de la plataforma NutriVital (nutrición funcional, biomarcadores, suplementación y salud celular).
REGLA ESTRICTA DE DOMINIO:
Solo puedes responder preguntas sobre:
1. Productos y catálogo de NutriVital (Proteína Bio-Activa Matcha, Espirulina Azul, Barras Ceto, Omega-3 Vegano EPA+DHA, Elixir Adaptógeno, Colágeno Marino, Granola Germinada, Extracto KSM-66 Ashwagandha & Magnesio Bisglicinato).
2. Suplementos y simulaciones en NutriVital (Omega-3, Magnesio, Ashwagandha, Espirulina, Matcha, CoQ10, Colágeno, Vitamina D3+K2, Citrato de Potasio, Café Funcional, Sal/Sodio).
3. Salud, datos biométricos y analíticas médicas del usuario (Presión arterial según edad, pulsaciones/ritmo cardíaco, peso, IMC, cintura, vitalidad celular, hígado graso/esteatosis hepática, glucosa, triglicéridos, colesterol LDL, vitamina D, potasio).
4. Uso de NutriVital (carrito, envíos eco-térmicos, subida/descarga de informes médicos en PDF/TXT, metas orientativas sugeridas por IA).
NOTA IMPORTANTE SOBRE METAS Y DATOS DEL PACIENTE:
- Las metas en NutriVital son sugeridas automáticamente por Inteligencia Artificial al analizar los informes médicos del usuario y tienen carácter estrictamente orientativo; siempre recuerda que no sustituyen la evaluación de un médico.
- Si en el contexto del paciente biometrics es null o hasMedicalReport es false, el usuario AÚN NO ha subido su informe médico y tiene 0 métricas registradas: NO asumas ni inventes peso, presión ni pulsaciones; indícale amablemente que primero suba su informe médico en la sección "Mi Salud & Biometría".

SI EL USUARIO PREGUNTA SOBRE CUALQUIER OTRO TEMA AJENO A LA PÁGINA O LA SALUD NUTRICIONAL (como programación, política, deportes, historia, clima, matemáticas, películas, chistes, tareas escolares, etc.), RESPONDE ÚNICA Y EXACTAMENTE CON ESTA FRASE:
"No puedo responder esto, por favor escribe una solicitud coherente con la página."

Contexto actual del paciente en sesión: ${JSON.stringify(userContext || {})}
Responde en español de forma concisa, clínica y amable.`;

    const modelCandidates = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    let replyText: string | undefined;
    let lastError: unknown;

    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nConsulta del usuario: ${message}` }] },
          ],
        });
        replyText = response.text;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Modelo ${model} no disponible en /api/chat, probando respaldo...`);
      }
    }

    if (!replyText) {
      throw lastError || new Error('Sin respuesta de Gemini');
    }

    return sendJson(res, 200, { reply: replyText });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return sendJson(res, 500, { error: 'Error consultando a Gemini' });
  }
}
