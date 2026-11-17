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