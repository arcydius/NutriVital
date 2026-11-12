import React, { useMemo } from 'react';
import { Edit3 } from 'lucide-react';
import {
  ClientUser,
  Product,
} from '../types/nutrivital';
import { AVAILABLE_SUPPLEMENTS } from '../data/seedData';
import {
  calculateProjectedImpact,
  generateDynamicBiometricTrend,
  generateNutritionalRecommendations,
} from '../utils/healthAnalytics';
import { DynamicProgressChart, ChartMetricView } from './DynamicProgressChart';
import { SupplementAnalysisEngine } from './SupplementAnalysisEngine';

interface HealthAnalyticsSectionProps {
  currentClient: ClientUser;
  onOpenProfileModal: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
  activeSupplementIds: string[];
  onToggleSupplement: (suppId: string) => void;
  simulatedCalories: number;
  onChangeSimulatedCalories: (cal: number) => void;
  selectedChartMetric: ChartMetricView;
  onSelectChartMetric: (m: ChartMetricView) => void;
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
}) => {
  const selectedSupplements = useMemo(() => {
    const idSet = new Set(activeSupplementIds);
    return AVAILABLE_SUPPLEMENTS.filter((s) => idSet.has(s.id));
  }, [activeSupplementIds]);

  const timelineWeeks = currentClient.goals.timelineWeeks || 8;

  const impactSummary = useMemo(() => {
    return calculateProjectedImpact(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      simulatedCalories,
      timelineWeeks
    );
  }, [currentClient.biometrics, currentClient.goals, selectedSupplements, simulatedCalories, timelineWeeks]);

  const trendPoints = useMemo(() => {
    return generateDynamicBiometricTrend(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      simulatedCalories,
      timelineWeeks
    );
  }, [currentClient.biometrics, currentClient.goals, selectedSupplements, simulatedCalories, timelineWeeks]);

  const recommendations = useMemo(() => {
    return generateNutritionalRecommendations(
      currentClient.biometrics,
      currentClient.goals,
      selectedSupplements,
      simulatedCalories,
      products,
      trendPoints,
      selectedChartMetric
    );
  }, [
    currentClient.biometrics,
    currentClient.goals,
    selectedSupplements,
    simulatedCalories,
    products,
    trendPoints,
    selectedChartMetric,
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
              Módulo de Salud Personalizada · Motor de Análisis & IA Nutricional
            </p>
            <h2
              id="health-analytics-heading"
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
            >
              Tu Perfil Biométrico & Gráfica de Metas
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Simula sugerencias de la IA y observa en tiempo real cómo se transforman tus curvas de presión arterial, ritmo cardíaco y composición corporal.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-800 font-bold text-sm">
                {currentClient.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{currentClient.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    {currentClient.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  {currentClient.biometrics.systolicBP}/{currentClient.biometrics.diastolicBP} mmHg · {currentClient.biometrics.heartRate} lpm · {currentClient.biometrics.bodyWeight} kg
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenProfileModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Biometría & Metas</span>
            </button>
          </div>
        </div>

        {/* Vista Dividida en Tiempo Real: Gráfica Fija a la Izquierda + KPIs & IA a la Derecha */}
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
              targetCalories={currentClient.goals.targetCalories}
              baselineCalories={currentClient.biometrics.dailyCalories}
              recommendations={recommendations}
              activeSupplementIds={activeSupplementIds}
              onToggleSupplement={onToggleSupplement}
              availableSupplements={AVAILABLE_SUPPLEMENTS}
            />
          </div>

          {/* Columna Derecha: KPIs Proyectados & Diagnósticos Predictivos de IA */}
          <div className="lg:col-span-5">
            <SupplementAnalysisEngine
              biometrics={currentClient.biometrics}
              goals={currentClient.goals}
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
            />
          </div>
        </div>
      </div>
    </section>
  );
};