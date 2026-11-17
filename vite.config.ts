import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-medical-report-ai',
        configureServer(server) {
          server.middlewares.use('/api/analyze-medical-report', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            if (!apiKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY no configurada en .env.local' }));
              return;
            }

            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(Buffer.from(chunk));
              }
              const { fileName, mimeType, base64Data } = JSON.parse(
                Buffer.concat(chunks).toString('utf-8')
              );

              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  `Analiza este informe médico o analítica clínica (${fileName}) y extrae los biomarcadores en español. Clasifica reportType como 'Analítica Sanguínea', 'Perfil Lipídico', 'Chequeo Cardiometabólico' u 'Otro'. Incluye valores fuera de rango en flaggedFindings con sus unidades y alertas de seguridad renal/potasio en contraindications si aplica.`,
                ],
                config: {
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
                    },
                    required: [
                      'reportType',
                      'aiClinicalSummary',
                      'markers',
                      'flaggedFindings',
                      'contraindications',
                    ],
                  },
                },
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(response.text);
            } catch (error) {
              console.error('Error en /api/analyze-medical-report:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Error analizando el documento con Gemini' }));
            }
          });

          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            if (!apiKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY no configurada' }));
              return;
            }

            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(Buffer.from(chunk));
              }
              const { message, userContext } = JSON.parse(
                Buffer.concat(chunks).toString('utf-8')
              );

              const ai = new GoogleGenAI({ apiKey });
              const systemPrompt = `Eres NutriBot, el asistente clínico virtual oficial de la plataforma NutriVital (nutrición funcional, biomarcadores, suplementación y salud celular).
REGLA ESTRICTA DE DOMINIO:
Solo puedes responder preguntas sobre:
1. Productos y catálogo de NutriVital (Proteína Bio-Activa Matcha, Espirulina Azul, Barras Ceto, Omega-3 Vegano EPA+DHA, Elixir Adaptógeno, Colágeno Marino, Granola Germinada, Extracto KSM-66 Ashwagandha).
2. Suplementos y simulaciones en NutriVital (Omega-3, Magnesio, Ashwagandha, Espirulina, Matcha, CoQ10, Colágeno, Vitamina D3+K2, Citrato de Potasio, Café Funcional, Sal/Sodio).
3. Salud, datos biométricos y analíticas médicas del usuario (Presión arterial según edad, pulsaciones/ritmo cardíaco, peso, IMC, cintura, vitalidad celular, hígado graso/esteatosis hepática, glucosa, triglicéridos, colesterol LDL, vitamina D, potasio).
4. Uso de NutriVital (carrito, envíos eco-térmicos, subida/descarga de informes médicos en PDF/TXT).

SI EL USUARIO PREGUNTA SOBRE CUALQUIER OTRO TEMA AJENO A LA PÁGINA O LA SALUD NUTRICIONAL (como programación, política, deportes, historia, clima, matemáticas, películas, chistes, tareas escolares, etc.), RESPONDE ÚNICA Y EXACTAMENTE CON ESTA FRASE:
"No puedo responder esto, por favor escribe una solicitud coherente con la página."

Contexto actual del paciente en sesión: ${JSON.stringify(userContext || {})}
Responde en español de forma concisa, clínica y amable.`;

              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                  { role: 'user', parts: [{ text: `${systemPrompt}\n\nConsulta del usuario: ${message}` }] },
                ],
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: response.text }));
            } catch (error) {
              console.error('Error en /api/chat:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Error consultando a Gemini' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});