import React, { useMemo } from 'react';
import { FileText, LogIn, ShieldCheck, Sparkles, User, AlertCircle } from 'lucide-react';
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
import { DynamicProgressChart, ChartMetricView } from './DynamicProgressChart';
import { SupplementAnalysisEngine } from './SupplementAnalysisEngine';

const GUEST_CLIENT: ClientUser = {
  id: 'CLI-GUEST',
  name: 'Modo Invitado',
  email: 'invitado@nutrivital.salud',
  role: 'Cliente',
  createdAt: '2026-01-01',
  gender: 'Femenino',
  biometrics: {
    systolicBP: 124,
    diastolicBP: 82,
    heartRate: 74,
    bodyWeight: 67,
    height: 170,
    waistCircumference: 80,
    bodyMass: 23.2,
    dailyCalories: 2150,
    fattyLiverGrade: 0,
    lastUpdated: '2026-11-19 12:00',
  },
  goals: {
    targetSystolicBP: 118,
    targetDiastolicBP: 78,
    targetHeartRate: 68,
    targetWeight: 63,
    targetBodyMass: 21.8,
    targetCalories: 1950,
    timelineWeeks: 12,
    source: 'baseline_default',
    aiRationale:
      'Referencia demostrativa. Inicia sesión y sube un informe médico para que la IA calcule tus metas orientativas personalizadas.',
  },
  activeSupplements: ['SUP-OMEGA3', 'SUP-MAGNESIO'],
};

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
  onUploadMedicalReport: (report: MedicalReportRecord) => void;
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
  const client = currentClient ?? GUEST_CLIENT;
  const isGuest = !currentClient;
  const clientAge = calculateAge(client.dateOfBirth);

  const selectedSupplements = useMemo(() => {
    const idSet = new Set(activeSupplementIds);
    return AVAILABLE_SUPPLEMENTS.filter((s) => idSet.has(s.id));
  }, [activeSupplementIds]);

  const timelineWeeks = client.goals.timelineWeeks || 8;

  const impactSummary = useMemo(() => {
    return calculateProjectedImpact(
      client.biometrics,
      client.goals,
      selectedSupplements,
      simulatedCalories,
      timelineWeeks,
      medicalReports,
      clientAge
    );
  }, [
    client.biometrics,
    client.goals,
    selectedSupplements,
    simulatedCalories,
    timelineWeeks,
    medicalReports,
    clientAge,
  ]);

  const trendPoints = useMemo(() => {
    return generateDynamicBiometricTrend(
      client.biometrics,
      client.goals,
      selectedSupplements,
      simulatedCalories,
      timelineWeeks,
      medicalReports,
      clientAge
    );
  }, [
    client.biometrics,
    client.goals,
    selectedSupplements,
    simulatedCalories,
    timelineWeeks,
    medicalReports,
    clientAge,
  ]);

  const recommendations = useMemo(() => {
    return generateNutritionalRecommendations(
      client.biometrics,
      client.goals,
      selectedSupplements,
      simulatedCalories,
      products,
      trendPoints,
      selectedChartMetric,
      medicalReports,
      clientAge
    );
  }, [
    client.biometrics,
    client.goals,
    selectedSupplements,
    simulatedCalories,
    products,
    trendPoints,
    selectedChartMetric,
    medicalReports,
    clientAge,
  ]);

  const hasAiReportGoals = client.goals.source === 'ai_report';

  const handleApplyCalorieDelta = (delta: number) => {
    onChangeSimulatedCalories(Math.max(1200, Math.min(3800, simulatedCalories + delta)));
  };

  return (
    <section
      id="mi-salud"
      aria-labelledby="health-analytics-heading"
      className="py-16 bg-[#F8FAFC] border-t border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Encabezado y resumen del cliente */}
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
              Sube tus analíticas o informes médicos para que la IA extraiga tus biomarcadores, calcule <strong>metas orientativas sugeridas</strong> y te permita simular en tiempo real cómo impactan calorías y suplementos antes de elegir tu protocolo.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-sm ${
                isGuest ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100/80 text-emerald-800'
              }`}>
                {isGuest ? (
                  <User className="w-5 h-5 text-slate-500" />
                ) : (
                  client.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{client.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isGuest ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {client.role}
                  </span>
                  {medicalReports.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>
                        {medicalReports.length}{' '}
                        {medicalReports.length === 1 ? 'informe' : 'informes'}
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {calculateAge(client.dateOfBirth) !== undefined
                    ? `${calculateAge(client.dateOfBirth)} años · `
                    : ''}
                  {client.gender ? `${client.gender} · ` : ''}
                  {client.biometrics.systolicBP}/{client.biometrics.diastolicBP} mmHg ·{' '}
                  {client.biometrics.heartRate} lpm · {client.biometrics.bodyWeight} kg ·{' '}
                  Hígado G{client.biometrics.fattyLiverGrade ?? 0}
                  {isGuest && <span className="text-emerald-700 font-sans ml-1">(Datos de demostración)</span>}
                </div>
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
            ) : (
              <div
                title="Tus datos biométricos se actualizan automáticamente al subir informes médicos"
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center gap-1.5 shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Actualizado vía informes médicos</span>
              </div>
            )}
          </div>
        </div>

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
                    {hasAiReportGoals
                      ? 'Metas Orientativas Calculadas por IA según tu Informe Médico'
                      : 'Metas Orientativas de Referencia (Pendiente de Informe Médico)'}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      hasAiReportGoals
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {hasAiReportGoals
                      ? `Generado por IA · ${client.goals.timelineWeeks} sem`
                      : 'Referencia base'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {client.goals.aiRationale ||
                    'Sube un informe médico para que la IA personalice estas metas orientativas con base en tus resultados reales.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                PA: <strong>{client.goals.targetSystolicBP}/{client.goals.targetDiastolicBP}</strong> mmHg
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                Pulso: <strong>{client.goals.targetHeartRate}</strong> lpm
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                Peso: <strong>{client.goals.targetWeight}</strong> kg
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                Calorías: <strong>{client.goals.targetCalories}</strong> kcal
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
          {/* Columna Izquierda (Sticky): Gráfica Dinámica + Simulador Calórico + Píldoras IA */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <DynamicProgressChart
              trendPoints={trendPoints}
              impactSummary={impactSummary}
              selectedMetric={selectedChartMetric}
              onSelectMetric={onSelectChartMetric}
              timelineWeeks={timelineWeeks}
              simulatedCalories={simulatedCalories}
              onChangeSimulatedCalories={onChangeSimulatedCalories}
              targetCalories={client.goals.targetCalories}
              baselineCalories={client.biometrics.dailyCalories}
              recommendations={recommendations}
              activeSupplementIds={activeSupplementIds}
              onToggleSupplement={onToggleSupplement}
              availableSupplements={AVAILABLE_SUPPLEMENTS}
              medicalReports={medicalReports}
              clientAge={clientAge}
            />
          </div>

          {/* Columna Derecha: Gestor de Informes Médicos + KPIs Proyectados + Sugerencias IA */}
          <div className="lg:col-span-5">
            <SupplementAnalysisEngine
              biometrics={client.biometrics}
              goals={client.goals}
              activeSupplementIds={activeSupplementIds}
              onToggleSupplement={onToggleSupplement}
              simulatedCalories={simulatedCalories}
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
              clientName={client.name}
              clientDob={client.dateOfBirth}
              clientGender={client.gender}
              clientAge={clientAge}
            />
          </div>
        </div>
      </div>
    </section>
  );
};