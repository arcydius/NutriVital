import React from 'react';
import {
  Activity,
  Heart,
  Plus,
  Check,
  Scale,
  Zap,
  Sparkles,
  ShieldCheck,
  Ruler,
  TrendingDown,
  TrendingUp,
  LineChart,
} from 'lucide-react';
import {
  BiometricTrendPoint,
  ClientBiometrics,
  ClientHealthGoals,
  NutritionRecommendation,
  Product,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';
import {
  calculateBMI,
  calculateWHtR,
  getWHtRStatus,
  ChartMetricFocus,
} from '../utils/healthAnalytics';

interface SupplementAnalysisEngineProps {
  biometrics: ClientBiometrics;
  goals: ClientHealthGoals;
  activeSupplementIds: string[];
  onToggleSupplement: (suppId: string) => void;
  simulatedCalories: number;
  onChangeSimulatedCalories: (calories: number) => void;
  impactSummary: ProjectedImpactSummary & { waistDelta?: number; whtr?: number; whtrStatus?: string };
  recommendations: NutritionRecommendation[];
  onApplyCalorieDelta: (delta: number) => void;
  onAddToCart?: (product: Product) => void;
  allProducts: Product[];
  availableSupplements: SupplementItem[];
  trendPoints: BiometricTrendPoint[];
  selectedChartMetric: ChartMetricFocus;
  timelineWeeks: number;
}

export const SupplementAnalysisEngine: React.FC<SupplementAnalysisEngineProps> = ({
  biometrics,
  goals,
  activeSupplementIds,
  onToggleSupplement,
  impactSummary,
  recommendations,
  onApplyCalorieDelta,
  onAddToCart,
  allProducts,
  availableSupplements,
  trendPoints,
  selectedChartMetric,
  timelineWeeks,
}) => {
  const activeSet = new Set(activeSupplementIds);

  // Datos biométricos proyectados
  const heightCm = biometrics.height || 170;
  const currentWaistCm = biometrics.waistCircumference || 80;

  const projectedSystolic = Math.round(biometrics.systolicBP + impactSummary.systolicDelta);
  const projectedDiastolic = Math.round(biometrics.diastolicBP + impactSummary.diastolicDelta);
  const projectedHr = Math.round(biometrics.heartRate + impactSummary.heartRateDelta);
  const projectedWeight = Number((biometrics.bodyWeight + impactSummary.weightDelta).toFixed(1));

  // IMC Real en tiempo real basado en Peso proyectado y Estatura
  const projectedBmi = calculateBMI(projectedWeight, heightCm);

  // Cintura proyectada en tiempo real
  const waistDelta = impactSummary.waistDelta ?? impactSummary.weightDelta;
  const projectedWaist = Number(Math.max(40, currentWaistCm + waistDelta).toFixed(1));
  const projectedWhtr = calculateWHtR(projectedWaist, heightCm);
  const whtrStatus = impactSummary.whtrStatus || getWHtRStatus(projectedWhtr);

  // Telemetría de la curva activa en la gráfica
  const initialPoint = trendPoints[0];
  const finalPoint = trendPoints[trendPoints.length - 1];

  const getChartTelemetrySummary = () => {
    if (!initialPoint || !finalPoint) {
      return {
        label: 'Curva Biométrica',
        trajectory: 'Calculando trayectoria...',
        deltaText: '0',
        convergesToGoal: true,
      };
    }

    if (selectedChartMetric === 'presion') {
      const delta = Number((finalPoint.systolicBP - initialPoint.systolicBP).toFixed(1));
      const converges = finalPoint.systolicBP <= goals.targetSystolicBP + 3;
      return {
        label: 'Presión Arterial',
        trajectory: `${Math.round(initialPoint.systolicBP)}/${Math.round(initialPoint.diastolicBP)} → ${Math.round(finalPoint.systolicBP)}/${Math.round(finalPoint.diastolicBP)} mmHg`,
        deltaText: `${delta <= 0 ? `▼ ${Math.abs(delta)}` : `▲ +${delta}`} mmHg`,
        convergesToGoal: converges,
      };
    }

    if (selectedChartMetric === 'pulsaciones') {
      const delta = Number((finalPoint.heartRate - initialPoint.heartRate).toFixed(1));
      const converges = finalPoint.heartRate <= goals.targetHeartRate + 3;
      return {
        label: 'Ritmo Cardíaco',
        trajectory: `${Math.round(initialPoint.heartRate)} → ${Math.round(finalPoint.heartRate)} lpm`,
        deltaText: `${delta <= 0 ? `▼ ${Math.abs(delta)}` : `▲ +${delta}`} lpm`,
        convergesToGoal: converges,
      };
    }

    if (selectedChartMetric === 'peso_masa') {
      const delta = Number((finalPoint.bodyWeight - initialPoint.bodyWeight).toFixed(1));
      const converges = Math.abs(finalPoint.bodyWeight - goals.targetWeight) <= 2;
      return {
        label: 'Peso & IMC',
        trajectory: `${initialPoint.bodyWeight} → ${finalPoint.bodyWeight} kg (IMC ${finalPoint.bodyMass})`,
        deltaText: `${delta <= 0 ? `▼ ${Math.abs(delta)}` : `▲ +${delta}`} kg`,
        convergesToGoal: converges,
      };
    }

    const delta = finalPoint.generalHealthScore - initialPoint.generalHealthScore;
    return {
      label: 'Vitalidad Celular',
      trajectory: `${initialPoint.generalHealthScore}/100 → ${finalPoint.generalHealthScore}/100 pts`,
      deltaText: `${delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`} pts`,
      convergesToGoal: finalPoint.generalHealthScore >= 80,
    };
  };

  const telemetry = getChartTelemetrySummary();

  const metricBadgeLabels: Record<ChartMetricFocus, string> = {
    presion: 'Curva: Presión',
    pulsaciones: 'Curva: Pulsaciones',
    peso_masa: 'Curva: Peso & IMC',
    vitalidad: 'Curva: Vitalidad',
  };

  return (
    <div className="space-y-6">
      {/* 1. TARJETAS DE IMPACTO PROYECTADO EN TIEMPO REAL (2x2 en panel lateral) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Presión Arterial */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Presión Arterial</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${impactSummary.bloodPressureCategory === 'Óptima' ||
                impactSummary.bloodPressureCategory === 'Normal'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
                }`}
            >
              {impactSummary.bloodPressureCategory}
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {projectedSystolic}/{projectedDiastolic}
              <span className="text-[11px] font-normal text-slate-400 ml-1">mmHg</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Meta: <span className="font-mono font-semibold text-emerald-700">{goals.targetSystolicBP}/{goals.targetDiastolicBP}</span>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Delta:</span>
            <span
              className={`font-bold ${impactSummary.systolicDelta <= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
            >
              {impactSummary.systolicDelta <= 0
                ? `▼ ${Math.abs(impactSummary.systolicDelta).toFixed(1)} mmHg`
                : `▲ +${impactSummary.systolicDelta.toFixed(1)} mmHg`}
            </span>
          </div>
        </div>

        {/* Ritmo Cardíaco */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Ritmo Cardíaco</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              Reposo
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {projectedHr}
              <span className="text-[11px] font-normal text-slate-400 ml-1">lpm</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Meta: <span className="font-mono font-semibold text-emerald-700">{goals.targetHeartRate} lpm</span>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Delta:</span>
            <span
              className={`font-bold ${impactSummary.heartRateDelta <= 0 ? 'text-emerald-700' : 'text-slate-700'
                }`}
            >
              {impactSummary.heartRateDelta <= 0
                ? `▼ ${Math.abs(impactSummary.heartRateDelta).toFixed(1)} lpm`
                : `▲ +${impactSummary.heartRateDelta.toFixed(1)} lpm`}
            </span>
          </div>
        </div>

        {/* Peso, IMC y Cintura */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Peso & Cintura</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800">
              {whtrStatus.split(' ')[0]}
            </span>
          </div>

          <div className="my-2.5 space-y-1">
            <div className="text-lg font-extrabold text-slate-900 font-mono tracking-tight flex items-baseline justify-between">
              <span>
                {projectedWeight} <span className="text-[11px] font-normal text-slate-400">kg</span>
              </span>
              <span className="text-xs font-bold text-amber-700 font-mono">
                IMC {projectedBmi}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span className="flex items-center gap-1 text-slate-500">
                <Ruler className="w-3 h-3 text-emerald-600" />
                <span>Cintura:</span>
              </span>
              <span className="font-bold text-slate-900">
                {projectedWaist} cm ({projectedWhtr})
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Cintura:</span>
            <span
              className={`font-bold ${waistDelta <= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
            >
              {waistDelta <= 0
                ? `▼ ${Math.abs(waistDelta).toFixed(1)} cm`
                : `▲ +${waistDelta.toFixed(1)} cm`}
            </span>
          </div>
        </div>

        {/* Score de Vitalidad General */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-4 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Vitalidad</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/15 text-emerald-100">
              Score
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {impactSummary.vitalityScore}
              <span className="text-xs font-normal text-emerald-200 ml-1">/ 100</span>
            </div>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              {activeSupplementIds.length} {activeSupplementIds.length === 1 ? 'suplemento activo' : 'suplementos activos'}
            </p>
          </div>

          <div className="pt-2 border-t border-emerald-700/60 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-200">Mejora:</span>
            <span className="font-bold text-[#86EFAC]">
              +{impactSummary.vitalityDelta > 0 ? impactSummary.vitalityDelta : 0} pts
            </span>
          </div>
        </div>
      </div>

      {/* 2. MOTOR DE IA & ANÁLISIS PREDICTIVO DE GRÁFICAS */}
      <div className="bg-gradient-to-b from-[#F0FDF4]/90 via-white to-white rounded-3xl border border-emerald-200/90 p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                Recomendaciones médicas
              </h3>
              <p className="text-[11px] text-slate-600">
                Sincronizadas con la gráfica a {timelineWeeks} semanas.
              </p>
            </div>
          </div>

          <span className="text-[11px] bg-emerald-100/80 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-semibold shrink-0">
            {recommendations.length} alertas
          </span>
        </div>

        {/* Barra de Resumen Telemétrico de la Curva Activa */}
        <div className="bg-white rounded-2xl border border-emerald-200/70 p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <LineChart className="w-3.5 h-3.5" />
              <span>{telemetry.label}</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${telemetry.convergesToGoal
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
                }`}
            >
              {telemetry.convergesToGoal ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  <span>En meta</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span>Brecha detectada</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <span className="font-bold text-slate-900">{telemetry.trajectory}</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {telemetry.deltaText}
            </span>
          </div>
        </div>

        {/* Tarjetas de Recomendaciones Generadas por la IA */}
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const relatedProduct = rec.relatedProductId
              ? allProducts.find((p) => p.id === rec.relatedProductId)
              : null;

            const matchedSupplement = availableSupplements.find(
              (s) =>
                (rec.relatedSupplementId && s.id === rec.relatedSupplementId) ||
                (rec.relatedProductId && s.matchingProductId === rec.relatedProductId)
            );

            const isSupplementSimulated = matchedSupplement
              ? activeSet.has(matchedSupplement.id)
              : false;

            const cardBg =
              rec.urgency === 'alta'
                ? 'bg-rose-50/70 border-rose-200/90'
                : rec.urgency === 'media'
                  ? 'bg-amber-50/70 border-amber-200/90'
                  : rec.urgency === 'positiva'
                    ? 'bg-emerald-50/60 border-emerald-200/90'
                    : 'bg-sky-50/60 border-sky-200/90';

            const badgeStyle =
              rec.urgency === 'alta'
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : rec.urgency === 'media'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : rec.urgency === 'positiva'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-sky-100 text-sky-800 border-sky-200';

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-2xl border transition-all duration-200 space-y-2.5 shadow-2xs ${cardBg}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badgeStyle}`}
                  >
                    {rec.urgency}
                  </span>

                  {rec.chartMetricTrigger && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/90 text-slate-700 border border-slate-200/80">
                      {metricBadgeLabels[rec.chartMetricTrigger]}
                    </span>
                  )}

                  {rec.metricEvidence && (
                    <span className="text-[10px] font-mono font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {rec.metricEvidence}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">{rec.title}</h4>

                <p className="text-xs text-slate-600 leading-relaxed">{rec.message}</p>

                {matchedSupplement && (
                  <div className="text-[11px] text-slate-600 bg-white/70 rounded-xl px-2.5 py-1.5 border border-slate-200/60">
                    <span className="font-semibold text-emerald-800">Protocolo IA: </span>
                    <span className="font-bold text-slate-900">{matchedSupplement.name}</span>{' '}
                    <span className="font-mono text-slate-500">({matchedSupplement.dailyDose})</span>
                  </div>
                )}

                {/* Acciones Directas con Feedback Inmediato en la Gráfica Fija */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {matchedSupplement && (
                    <button
                      type="button"
                      onClick={() => onToggleSupplement(matchedSupplement.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 ${isSupplementSimulated
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300'
                        }`}
                    >
                      {isSupplementSimulated ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Simulando en curva</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Simular en gráfica</span>
                        </>
                      )}
                    </button>
                  )}

                  {rec.suggestedCalorieDelta && (
                    <button
                      type="button"
                      onClick={() => onApplyCalorieDelta(rec.suggestedCalorieDelta!)}
                      className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      {rec.suggestedCalorieDelta > 0
                        ? `+${rec.suggestedCalorieDelta}`
                        : rec.suggestedCalorieDelta}{' '}
                      kcal
                    </button>
                  )}

                  {relatedProduct && onAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(relatedProduct)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {relatedProduct.name.split(' ')[0]} (${relatedProduct.price.toFixed(2)})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};