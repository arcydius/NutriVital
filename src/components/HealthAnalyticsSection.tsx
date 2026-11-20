import React, { useMemo } from 'react';
import { Edit3, FileText, LogIn, User } from 'lucide-react';
import {
  ClientUser,
  MedicalReportRecord,
  Product,
} from '../types/nutrivital';
import { AVAILABLE_SUPPLEMENTS } from '../data/seedData';
import {
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
    bodyMass: 23.1,
    dailyCalories: 2150,
    fattyLiverGrade: 0,
    lastUpdated: '2026-11-19 12:00',
  },
  goals: {
    targetSystolicBP: 118,
    targetDiastolicBP: 78,
    targetHeartRate: 68,
    targetWeight: 63,
    targetBodyMass: 22.0,
    targetCalories: 1950,
    timelineWeeks: 12,
    setByAdminId: 'ADM-01',
  },
  activeSupplements: ['SUP-OMEGA3', 'SUP-MAGNESIO'],
};

interface HealthAnalyticsSectionProps {
  currentClient: ClientUser | null;
  onOpenProfileModal: () => void;
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
  onOpenProfileModal,
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
      timelineWeeks
    );
  }, [
    client.biometrics,
    client.goals,
    selectedSupplements,
    simulatedCalories,
    timelineWeeks,
  ]);

  const trendPoints = useMemo(() => {
    return generateDynamicBiometricTrend(
      client.biometrics,
      client.goals,
      selectedSupplements,
      simulatedCalories,
      timelineWeeks
    );
  }, [
    client.biometrics,
    client.goals,
    selectedSupplements,
    simulatedCalories,
    timelineWeeks,
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
      medicalReports
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
  ]);

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
              Sube tus analíticas o informes médicos y simula sugerencias de la IA para observar en tiempo real cómo evolucionan tu presión arterial, ritmo cardíaco y composición corporal.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
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

            <button
              type="button"
              onClick={onOpenProfileModal}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                isGuest
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              {isGuest ? (
                <>
                  <LogIn className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Iniciar Sesión / Calibrar</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Mi Biometría</span>
                </>
              )}
            </button>
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
            />
          </div>
        </div>
      </div>
    </section>
  );
};