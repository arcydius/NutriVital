import React, { useMemo, useRef, useState } from 'react';
import {
  FileText,
  LogIn,
  ShieldCheck,
  Sparkles,
  User,
  AlertCircle,
  Upload,
  Loader2,
  AlertTriangle,
  Download,
  CheckCircle2,
} from 'lucide-react';
import {
  ClientUser,
  MedicalReportRecord,
  Product,
} from '../types/nutrivital';
import { AVAILABLE_SUPPLEMENTS } from '../data/seedData';
import {
  AI_GOAL_DISCLAIMER,
  calculateAge,
  calculateProjectedImpact,
  generateDynamicBiometricTrend,
  generateNutritionalRecommendations,
} from '../utils/healthAnalytics';
import { analyzeMedicalReportFile } from '../utils/medicalReportAnalyzer';
import { downloadSampleMedicalReportTemplate } from '../utils/reportExporter';
import { DynamicProgressChart, ChartMetricView } from './DynamicProgressChart';
import { SupplementAnalysisEngine } from './SupplementAnalysisEngine';

interface HealthAnalyticsSectionProps {
  currentClient: ClientUser | null;
  onRequireLogin: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
  activeSupplementIds: string[];
  onToggleSupplement: (suppId: string) => void;
  simulatedCalories: number;
  onChangeSimulatedCalories: (cal: number) => void;
  selectedChartMetric: ChartMetricView;
  onSelectChartMetric: (m: ChartMetricView) => void;
  medicalReports: MedicalReportRecord[];
  onUploadMedicalReport: (
    report: MedicalReportRecord,
    rawFile?: File
  ) => { ok: boolean; error?: string } | void;
  onDeleteMedicalReport: (reportId: string) => void;
}

export const HealthAnalyticsSection: React.FC<HealthAnalyticsSectionProps> = ({
  currentClient,
  onRequireLogin,
  products,
  onAddToCart,
  activeSupplementIds,
  onToggleSupplement,
  simulatedCalories,
  onChangeSimulatedCalories,
  selectedChartMetric,
  onSelectChartMetric,
  medicalReports,
  onUploadMedicalReport,
  onDeleteMedicalReport,
}) => {
  const emptyUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingInitial, setIsUploadingInitial] = useState(false);
  const [initialUploadError, setInitialUploadError] = useState<string | null>(null);

  const isGuest = !currentClient;
  const hasClinicalData = Boolean(
    currentClient &&
      currentClient.biometrics &&
      currentClient.goals &&
      medicalReports.length > 0
  );
  const clientAge = calculateAge(currentClient?.dateOfBirth);

  const selectedSupplements = useMemo(() => {
    const idSet = new Set(activeSupplementIds);
    return AVAILABLE_SUPPLEMENTS.filter((s) => idSet.has(s.id));
  }, [activeSupplementIds]);

  const timelineWeeks = currentClient?.goals?.timelineWeeks || 8;
  const effectiveCalories =
    simulatedCalories > 0
      ? simulatedCalories
      : currentClient?.biometrics?.dailyCalories || 0;

  const impactSummary = useMemo(() => {
    if (!hasClinicalData || !currentClient?.biometrics || !currentClient?.goals) {
      return null;
    }
    return calculateProjectedImpact(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      effectiveCalories,
      timelineWeeks,
      medicalReports,
      clientAge
    );
  }, [
    hasClinicalData,
    currentClient?.biometrics,
    currentClient?.goals,
    selectedSupplements,
    effectiveCalories,
    timelineWeeks,
    medicalReports,
    clientAge,
  ]);

  const trendPoints = useMemo(() => {
    if (!hasClinicalData || !currentClient?.biometrics || !currentClient?.goals) {
      return [];
    }
    return generateDynamicBiometricTrend(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      effectiveCalories,
      timelineWeeks,
      medicalReports,
      clientAge
    );
  }, [
    hasClinicalData,
    currentClient?.biometrics,
    currentClient?.goals,
    selectedSupplements,
    effectiveCalories,
    timelineWeeks,
    medicalReports,
    clientAge,
  ]);

  const recommendations = useMemo(() => {
    if (!hasClinicalData || !currentClient?.biometrics || !currentClient?.goals) {
      return [];
    }
    return generateNutritionalRecommendations(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      effectiveCalories,
      products,
      trendPoints,
      selectedChartMetric,
      medicalReports,
      clientAge
    );
  }, [
    hasClinicalData,
    currentClient?.biometrics,
    currentClient?.goals,
    selectedSupplements,
    effectiveCalories,
    products,
    trendPoints,
    selectedChartMetric,
    medicalReports,
    clientAge,
  ]);

  const handleApplyCalorieDelta = (delta: number) => {
    onChangeSimulatedCalories(Math.max(1200, Math.min(3800, effectiveCalories + delta)));
  };

  const handleInitialReportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentClient) {
      if (emptyUploadInputRef.current) emptyUploadInputRef.current.value = '';
      onRequireLogin();
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setInitialUploadError(null);
    setIsUploadingInitial(true);
    try {
      const parsedReport = await analyzeMedicalReportFile(file);
      const result = onUploadMedicalReport(parsedReport, file);
      if (result && !result.ok && result.error) {
        setInitialUploadError(result.error);
      }
    } catch (err) {
      setInitialUploadError(
        err instanceof Error ? err.message : 'No se pudo analizar el informe médico.'
      );
    } finally {
      setIsUploadingInitial(false);
      if (emptyUploadInputRef.current) {
        emptyUploadInputRef.current.value = '';
      }
    }
  };

  return (
    <section
      id="mi-salud"
      aria-labelledby="health-analytics-heading"
      className="py-16 bg-[#F8FAFC] border-t border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Encabezado y estado del perfil del cliente */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-emerald-700 tracking-wide">
              Módulo de Salud Personalizada · Motor de Análisis & IA Clínica
            </p>
            <h2
              id="health-analytics-heading"
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
            >
              Tu Perfil Biométrico & Gráfica de Metas
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sube tu informe médico completo para que la IA extraiga tus biomarcadores reales, calcule <strong>metas orientativas sugeridas</strong> y habilite tus gráficas y simulaciones personalizadas sin usar valores predefinidos.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-sm ${
                  isGuest ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100/80 text-emerald-800'
                }`}
              >
                {isGuest ? (
                  <User className="w-5 h-5 text-slate-500" />
                ) : (
                  currentClient.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {currentClient ? currentClient.name : 'Sin sesión activa'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isGuest ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentClient ? currentClient.role : 'Visitante'}
                  </span>
                  {hasClinicalData && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>
                        {medicalReports.length}{' '}
                        {medicalReports.length === 1 ? 'informe' : 'informes'}
                      </span>
                    </span>
                  )}
                </div>

                {isGuest ? (
                  <p className="text-xs text-slate-500 mt-0.5">
                    0 métricas activas · Inicia sesión y sube tu informe médico
                  </p>
                ) : hasClinicalData && currentClient.biometrics ? (
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {clientAge !== undefined ? `${clientAge} años · ` : ''}
                    {currentClient.gender ? `${currentClient.gender} · ` : ''}
                    {currentClient.biometrics.systolicBP}/{currentClient.biometrics.diastolicBP} mmHg ·{' '}
                    {currentClient.biometrics.heartRate} lpm · {currentClient.biometrics.bodyWeight} kg ·{' '}
                    Hígado G{currentClient.biometrics.fattyLiverGrade ?? 0}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {clientAge !== undefined ? `${clientAge} años · ` : ''}
                    {currentClient.gender ? `${currentClient.gender} · ` : ''}
                    <span className="font-semibold text-amber-700">
                      0 métricas registradas (pendiente de informe médico)
                    </span>
                  </p>
                )}
              </div>
            </div>

            {isGuest ? (
              <button
                type="button"
                onClick={onRequireLogin}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-200" />
                <span>Iniciar Sesión</span>
              </button>
            ) : hasClinicalData ? (
              <div
                title="Tus datos biométricos provienen exclusivamente de tus informes médicos"
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center gap-1.5 shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Extraído de tu informe médico</span>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                Esperando informe médico
              </span>
            )}
          </div>
        </div>

        {/* ESTADO CERO: Sin métricas ni soluciones IA hasta que el usuario suba su informe médico completo */}
        {!hasClinicalData || !currentClient?.biometrics || !currentClient?.goals || !impactSummary ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Perfil en Cero · Sin Datos Predefinidos</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {isGuest
                    ? 'Inicia sesión y sube tu informe médico para activar tus métricas e IA'
                    : `Hola ${currentClient.name.split(' ')[0]}, sube tu primer informe médico para comenzar`}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Para garantizar precisión clínica, NutriVital <strong>no muestra métricas inventadas, curvas por defecto ni sugerencias de IA</strong> en cuentas nuevas. En cuanto subas tu informe médico (PDF, imagen o TXT) con tus datos base, la IA construirá automáticamente tus gráficas, metas orientativas y análisis personalizado.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <input
                  ref={emptyUploadInputRef}
                  id="initial-medical-report-upload"
                  name="initialMedicalReport"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                  onChange={handleInitialReportFileChange}
                  className="hidden"
                />

                {isGuest ? (
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LogIn className="w-4 h-4 text-emerald-200" />
                    <span>Iniciar Sesión para Subir Informe</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingInitial}
                    onClick={() => emptyUploadInputRef.current?.click()}
                    className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isUploadingInitial ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analizando informe con IA...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-emerald-200" />
                        <span>Subir Mi Informe Médico (PDF, Imagen o TXT)</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadSampleMedicalReportTemplate(currentClient?.name)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Descargar plantilla .TXT guía</span>
                </button>
              </div>
            </div>

            {initialUploadError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Informe incompleto o no legible</p>
                  <p className="mt-0.5 text-rose-800 leading-relaxed">{initialUploadError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Datos indispensables en tu primer informe</span>
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
                  <li className="bg-white rounded-xl px-3 py-2 border border-slate-200/70">
                    1. <strong>Presión Arterial</strong> <span className="text-slate-400 font-mono">(ej. 124/80 mmHg)</span>
                  </li>
                  <li className="bg-white rounded-xl px-3 py-2 border border-slate-200/70">
                    2. <strong>Pulsaciones / FC</strong> <span className="text-slate-400 font-mono">(ej. 72 lpm)</span>
                  </li>
                  <li className="bg-white rounded-xl px-3 py-2 border border-slate-200/70">
                    3. <strong>Peso Corporal</strong> <span className="text-slate-400 font-mono">(ej. 78 kg)</span>
                  </li>
                  <li className="bg-white rounded-xl px-3 py-2 border border-slate-200/70">
                    4. <strong>Estatura / Talla</strong> <span className="text-slate-400 font-mono">(ej. 175 cm o 1.75 m)</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200/70 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Biomarcadores de laboratorio que la IA también analiza</span>
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Si tu documento incluye <strong>Glucosa, HbA1c, Triglicéridos, Colesterol LDL/HDL, Vitamina D, Potasio, Creatinina, Perímetro de Cintura o Grado de Hígado Graso</strong>, el motor ajustará tus alertas de seguridad renal/hepática y refinará tus metas sugeridas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-amber-50/90 border border-amber-200/90 px-3.5 py-2.5 text-[11px] text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aviso importante (IA):</strong> {AI_GOAL_DISCLAIMER}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Resumen de Metas Sugeridas por IA + Aviso Médico Obligatorio */}
            <div className="rounded-3xl border border-emerald-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Metas Orientativas Calculadas por IA según tu Informe Médico
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                        Generado por IA · {currentClient.goals.timelineWeeks} sem
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {currentClient.goals.aiRationale}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                    PA: <strong>{currentClient.goals.targetSystolicBP}/{currentClient.goals.targetDiastolicBP}</strong> mmHg
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                    Pulso: <strong>{currentClient.goals.targetHeartRate}</strong> lpm
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                    Peso: <strong>{currentClient.goals.targetWeight}</strong> kg
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                    Calorías: <strong>{currentClient.goals.targetCalories}</strong> kcal
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl bg-amber-50/90 border border-amber-200/90 px-3.5 py-2.5 text-[11px] text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Aviso importante (IA):</strong> {AI_GOAL_DISCLAIMER}
                </p>
              </div>
            </div>

            {/* Vista Dividida en Tiempo Real: Gráfica Fija a la Izquierda + Informes IA & KPIs a la Derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 lg:sticky lg:top-24">
                <DynamicProgressChart
                  trendPoints={trendPoints}
                  impactSummary={impactSummary}
                  selectedMetric={selectedChartMetric}
                  onSelectMetric={onSelectChartMetric}
                  timelineWeeks={timelineWeeks}
                  simulatedCalories={effectiveCalories}
                  onChangeSimulatedCalories={onChangeSimulatedCalories}
                  targetCalories={currentClient.goals.targetCalories}
                  baselineCalories={currentClient.biometrics.dailyCalories}
                  recommendations={recommendations}
                  activeSupplementIds={activeSupplementIds}
                  onToggleSupplement={onToggleSupplement}
                  availableSupplements={AVAILABLE_SUPPLEMENTS}
                  medicalReports={medicalReports}
                  clientAge={clientAge}
                />
              </div>

              <div className="lg:col-span-5">
                <SupplementAnalysisEngine
                  biometrics={currentClient.biometrics}
                  goals={currentClient.goals}
                  activeSupplementIds={activeSupplementIds}
                  onToggleSupplement={onToggleSupplement}
                  simulatedCalories={effectiveCalories}
                  onChangeSimulatedCalories={onChangeSimulatedCalories}
                  impactSummary={impactSummary}
                  recommendations={recommendations}
                  onApplyCalorieDelta={handleApplyCalorieDelta}
                  onAddToCart={onAddToCart}
                  allProducts={products}
                  availableSupplements={AVAILABLE_SUPPLEMENTS}
                  trendPoints={trendPoints}
                  selectedChartMetric={selectedChartMetric}
                  timelineWeeks={timelineWeeks}
                  medicalReports={medicalReports}
                  onUploadMedicalReport={onUploadMedicalReport}
                  onDeleteMedicalReport={onDeleteMedicalReport}
                  isAuthenticated={!isGuest}
                  onRequireLogin={onRequireLogin}
                  clientName={currentClient.name}
                  clientDob={currentClient.dateOfBirth}
                  clientGender={currentClient.gender}
                  clientAge={clientAge}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
