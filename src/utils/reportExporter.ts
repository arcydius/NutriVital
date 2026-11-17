import { MedicalReportRecord } from '../types/nutrivital';
import { calculateAge, getMedicalMetricRange } from './healthAnalytics';

/**
 * Generates and triggers browser download of a Medical Lab Report as structured text (.txt).
 */
export function downloadMedicalReportTxt(
  report: MedicalReportRecord,
  clientName: string,
  clientDob?: string,
  clientGender?: string
) {
  const age = calculateAge(clientDob);
  const ageStr = age !== undefined ? `${age} años` : 'No especificada';

  let txt = `================================================================================\n`;
  txt += `NUTRIVITAL - PLATAFORMA DE NUTRICIÓN FUNCIONAL & BIOMETRÍA\n`;
  txt += `EXPEDIENTE DE INFORME MÉDICO Y ANÁLISIS DE LABORATORIO\n`;
  txt += `================================================================================\n\n`;

  txt += `DATOS DEL PACIENTE:\n`;
  txt += `-------------------\n`;
  txt += `Nombre:                ${clientName}\n`;
  txt += `Fecha de Nacimiento:   ${clientDob || 'No registrada'} (Edad: ${ageStr})\n`;
  txt += `Género:                ${clientGender || 'No especificado'}\n`;
  txt += `ID de Informe:         ${report.id}\n`;
  txt += `Archivo Fuente:        ${report.fileName}\n`;
  txt += `Tipo de Analítica:     ${report.reportType}\n`;
  txt += `Fecha del Examen:      ${report.reportDate}\n`;
  txt += `Fecha de Carga / IA:   ${report.uploadedAt}\n\n`;

  txt += `1. RESUMEN CLÍNICO PROCESADO POR MOTOR DE IA NUTRIVITAL:\n`;
  txt += `---------------------------------------------------------\n`;
  txt += `${report.aiClinicalSummary}\n\n`;

  txt += `2. BIOMARCADORES DE LABORATORIO EXTRAÍDOS:\n`;
  txt += `-------------------------------------------\n`;
  const m = report.markers;

  if (m.fastingGlucose !== undefined) {
    const r = getMedicalMetricRange('glucose', m.fastingGlucose);
    txt += `• Glucosa en Ayunas:       ${m.fastingGlucose} mg/dL [${r.label.toUpperCase()}] (Ref: 70-99 mg/dL)\n`;
  }
  if (m.hba1c !== undefined) {
    txt += `• Hemoglobina Glicosilada: ${m.hba1c} % (Ref: <5.7 %)\n`;
  }
  if (m.triglycerides !== undefined) {
    const r = getMedicalMetricRange('triglycerides', m.triglycerides);
    txt += `• Triglicéridos:           ${m.triglycerides} mg/dL [${r.label.toUpperCase()}] (Ref: <150 mg/dL)\n`;
  }
  if (m.ldlCholesterol !== undefined) {
    const r = getMedicalMetricRange('ldl', m.ldlCholesterol);
    txt += `• Colesterol LDL:          ${m.ldlCholesterol} mg/dL [${r.label.toUpperCase()}] (Ref: <100 mg/dL)\n`;
  }
  if (m.hdlCholesterol !== undefined) {
    txt += `• Colesterol HDL:          ${m.hdlCholesterol} mg/dL (Ref: >50 mg/dL)\n`;
  }
  if (m.vitaminD !== undefined) {
    const r = getMedicalMetricRange('vitaminD', m.vitaminD);
    txt += `• 25-OH Vitamina D:        ${m.vitaminD} ng/mL [${r.label.toUpperCase()}] (Ref: 30-60 ng/mL)\n`;
  }
  if (m.potassium !== undefined) {
    const r = getMedicalMetricRange('potassium', m.potassium);
    txt += `• Potasio Sérico:          ${m.potassium} mEq/L [${r.label.toUpperCase()}] (Ref: 3.5-5.1 mEq/L)\n`;
  }
  if (m.creatinine !== undefined) {
    txt += `• Creatinina Sérica:       ${m.creatinine} mg/dL (Ref: 0.6-1.2 mg/dL)\n`;
  }
  if (m.hsCRP !== undefined) {
    txt += `• Proteína C Reactiva us:  ${m.hsCRP} mg/L (Ref: <1.0 mg/L)\n`;
  }
  if (m.ferritin !== undefined) {
    txt += `• Ferritina:               ${m.ferritin} ng/mL (Ref: 30-300 ng/mL)\n`;
  }
  if (m.fattyLiverGrade !== undefined) {
    const r = getMedicalMetricRange('fattyLiver', m.fattyLiverGrade);
    txt += `• Grado Esteatosis Hepática: Grado ${m.fattyLiverGrade} [${r.label.toUpperCase()}]\n`;
  }

  if (report.detectedSystolicBP && report.detectedDiastolicBP) {
    txt += `• Presión Arterial Reportada: ${report.detectedSystolicBP}/${report.detectedDiastolicBP} mmHg\n`;
  }
  if (report.detectedHeartRate) {
    txt += `• Ritmo Cardíaco Reportado:  ${report.detectedHeartRate} lpm\n`;
  }
  txt += `\n`;

  if (report.flaggedFindings && report.flaggedFindings.length > 0) {
    txt += `3. HALLAZGOS RELEVANTES / ALERTAS:\n`;
    txt += `-----------------------------------\n`;
    report.flaggedFindings.forEach((f, idx) => {
      txt += ` [${idx + 1}] ${f}\n`;
    });
    txt += `\n`;
  }

  if (report.contraindications && report.contraindications.length > 0) {
    txt += `4. CONTRAINDICACIONES Y PRECAUCIONES FARMACO-NUTRICIONALES:\n`;
    txt += `-----------------------------------------------------------\n`;
    report.contraindications.forEach((c, idx) => {
      txt += ` [!] ${c}\n`;
    });
    txt += `\n`;
  }

  txt += `================================================================================\n`;
  txt += `DOCUMENTO GENERADO POR NUTRIVITAL CLOUD ENGINE - VALIDEZ DIGITAL\n`;
  txt += `Este informe compila analíticas reales con calibración predictiva biométrica.\n`;
  txt += `================================================================================\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NutriVital_${report.fileName.replace(/\.[^/.]+$/, '')}_Reporte.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers browser print-to-PDF / PDF download formatted for clinical review.
 */
export function downloadMedicalReportPdf(
  report: MedicalReportRecord,
  clientName: string,
  clientDob?: string,
  clientGender?: string
) {
  const age = calculateAge(clientDob);
  const ageStr = age !== undefined ? `${age} años` : 'No especificada';
  const m = report.markers;

  const markersRows: string[] = [];

  if (m.fastingGlucose !== undefined) {
    const r = getMedicalMetricRange('glucose', m.fastingGlucose);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Glucosa en Ayunas</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${m.fastingGlucose} mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">70 - 99 mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  if (m.triglycerides !== undefined) {
    const r = getMedicalMetricRange('triglycerides', m.triglycerides);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Triglicéridos</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${m.triglycerides} mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">&lt; 150 mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  if (m.ldlCholesterol !== undefined) {
    const r = getMedicalMetricRange('ldl', m.ldlCholesterol);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Colesterol LDL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${m.ldlCholesterol} mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">&lt; 100 mg/dL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  if (m.vitaminD !== undefined) {
    const r = getMedicalMetricRange('vitaminD', m.vitaminD);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">25-OH Vitamina D</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${m.vitaminD} ng/mL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">30 - 60 ng/mL</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  if (m.potassium !== undefined) {
    const r = getMedicalMetricRange('potassium', m.potassium);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Potasio Sérico</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${m.potassium} mEq/L</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">3.5 - 5.1 mEq/L</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  if (m.fattyLiverGrade !== undefined) {
    const r = getMedicalMetricRange('fattyLiver', m.fattyLiverGrade);
    markersRows.push(`
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Esteatosis Hepática (Hígado Graso)</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">Grado ${m.fattyLiverGrade}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Grado 0 (Sano)</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${r.status === 'normal' ? '#dcfce7; color: #166534;' : r.status === 'borderline' ? '#fef3c7; color: #92400e;' : '#ffe4e6; color: #9f1239;'}">${r.label}</span></td>
      </tr>
    `);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>NutriVital - Informe Clínico (${report.fileName})</title>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 32px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #047857;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 24px;
          font-weight: 800;
          color: #065f46;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .patient-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          font-size: 13px;
          margin-bottom: 24px;
        }
        .box-item strong { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #065f46;
          border-left: 4px solid #10b981;
          padding-left: 8px;
          margin: 24px 0 12px 0;
        }
        .summary-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 13px;
          line-height: 1.6;
          color: #166534;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 8px;
        }
        th {
          text-align: left;
          padding: 8px 12px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
        }
        .alert-box {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 8px;
          padding: 10px 14px;
          color: #9f1239;
          font-size: 12px;
          margin-top: 12px;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">NutriVital</div>
          <div class="brand-subtitle">Plataforma Clínica de Nutrición Celular & Biometría</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <div><strong>EXPEDIENTE CLÍNICO DIGITAL</strong></div>
          <div>Emisión: ${new Date().toLocaleDateString('es-ES')}</div>
        </div>
      </div>

      <div class="patient-box">
        <div class="box-item">
          <strong>Paciente</strong>
          ${clientName}
        </div>
        <div class="box-item">
          <strong>Fecha de Nacimiento</strong>
          ${clientDob || 'N/D'} (${ageStr})
        </div>
        <div class="box-item">
          <strong>Género</strong>
          ${clientGender || 'No especificado'}
        </div>
        <div class="box-item">
          <strong>Estudio / Documento</strong>
          ${report.fileName}
        </div>
        <div class="box-item">
          <strong>Tipo de Analítica</strong>
          ${report.reportType}
        </div>
        <div class="box-item">
          <strong>Fecha de Análisis</strong>
          ${report.reportDate}
        </div>
      </div>

      <div class="section-title">1. Resumen Diagnóstico de Inteligencia Artificial</div>
      <div class="summary-box">
        ${report.aiClinicalSummary}
      </div>

      <div class="section-title">2. Biomarcadores Cuantitativos & Rangos Clínicos</div>
      <table>
        <thead>
          <tr>
            <th>Parámetro Bioquímico</th>
            <th>Valor Extraído</th>
            <th>Rango Óptimo</th>
            <th>Clasificación</th>
          </tr>
        </thead>
        <tbody>
          ${markersRows.length > 0 ? markersRows.join('') : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8;">No se detectaron marcadores cuantitativos estándar</td></tr>'}
        </tbody>
      </table>

      ${report.flaggedFindings && report.flaggedFindings.length > 0 ? `
        <div class="section-title">3. Hallazgos Relevantes Fuera de Rango</div>
        <ul style="font-size: 13px; color: #334155; line-height: 1.6;">
          ${report.flaggedFindings.map((f) => `<li>${f}</li>`).join('')}
        </ul>
      ` : ''}

      ${report.contraindications && report.contraindications.length > 0 ? `
        <div class="section-title">4. Precauciones y Contraindicaciones</div>
        <div class="alert-box">
          <strong>Atención Farmaconutricional:</strong> ${report.contraindications.join(' · ')}
        </div>
      ` : ''}

      <div class="footer">
        <div>NutriVital Health Intelligence · Sistema Seguro de Diagnóstico Nutricional</div>
        <div>Código de Validación: NV-${report.id.substring(0, 8)}</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if pop-up blocked: download as html blob
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NutriVital_${report.fileName.replace(/\.[^/.]+$/, '')}_Reporte.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
