import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawApiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const isValidApiKey =
    rawApiKey.length > 0 &&
    !rawApiKey.includes('PEGA_AQUI') &&
    !rawApiKey.includes('MY_GEMINI_API_KEY');
  const apiKey = isValidApiKey ? rawApiKey : '';

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
              const modelCandidates = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
              let responseText: string | undefined;
              let lastErr: unknown;
              for (const model of modelCandidates) {
                try {
                  const response = await ai.models.generateContent({
                    model,
                    contents: [
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
                    },
                  });
                  responseText = response.text;
                  break;
                } catch (err) {
                  lastErr = err;
                }
              }

              if (!responseText) throw lastErr || new Error('Sin respuesta de Gemini');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(responseText);
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
              let lastErr: unknown;
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
                  lastErr = err;
                }
              }

              if (!replyText) throw lastErr || new Error('Sin respuesta de Gemini');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: replyText }));
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