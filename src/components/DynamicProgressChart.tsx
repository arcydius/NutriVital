import React, { useState } from 'react';
import {
  Activity,
  Heart,
  Scale,
  Zap,
  Flame,
  RotateCcw,
  Sparkles,
  Check,
  TrendingDown,
  TrendingUp,
  FileText,
  LineChart,
  ShieldAlert,
} from 'lucide-react';
import {
  BiometricTrendPoint,
  MedicalReportRecord,
  NutritionRecommendation,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';
import {
  calculateSeriesLinearRegression,
  getBloodPressureCategory,
  getMedicalMetricRange,
} from '../utils/healthAnalytics';

export type ChartMetricView =
  | 'presion'
  | 'pulsaciones'
  | 'peso_masa'
  | 'vitalidad'
  | 'higado_graso';

interface DynamicProgressChartProps {
  trendPoints: BiometricTrendPoint[];
  impactSummary: ProjectedImpactSummary & {
    waistDelta?: number;
    whtr?: number;
    whtrStatus?: string;
  };
  selectedMetric: ChartMetricView;
  onSelectMetric: (metric: ChartMetricView) => void;
  timelineWeeks: number;
  simulatedCalories: number;
  onChangeSimulatedCalories: (calories: number) => void;
  targetCalories: number;
  baselineCalories: number;
  recommendations?: NutritionRecommendation[];
  activeSupplementIds?: string[];
  onToggleSupplement?: (suppId: string) => void;
  availableSupplements?: SupplementItem[];
  medicalReports?: MedicalReportRecord[];
  clientAge?: number;
}

export const DynamicProgressChart: React.FC<DynamicProgressChartProps> = ({
  trendPoints,
  impactSummary,
  selectedMetric,
  onSelectMetric,
  timelineWeeks,
  simulatedCalories,
  onChangeSimulatedCalories,
  targetCalories,
  baselineCalories,
  recommendations = [],
  activeSupplementIds = [],
  onToggleSupplement,
  availableSupplements = [],
  medicalReports = [],
  clientAge,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showRegression, setShowRegression] = useState<boolean>(true);

  const tabs: { id: ChartMetricView; label: string; icon: React.ReactNode }[] = [
    { id: 'presion', label: 'Presión Arterial', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'pulsaciones', label: 'Pulsaciones', icon: <Heart className="w-3.5 h-3.5" /> },
    { id: 'peso_masa', label: 'Peso & IMC', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'vitalidad', label: 'Vitalidad', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'higado_graso', label: 'Hígado Graso', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  ];

  // Dimensiones del lienzo SVG
  const width = 680;
  const height = 270;
  const padLeft = 48;
  const padRight = 28;
  const padTop = 28;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const safePoints = trendPoints.length > 0 ? trendPoints : [];
  const count = safePoints.length;

  const getX = (index: number) => {
    if (count <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (count - 1)) * plotW;
  };

  // Cálculo de escalas y series según la métrica seleccionada
  const getChartData = () => {
    if (safePoints.length === 0) {
      return {
        minY: 0,
        maxY: 100,
        unit: '',
        primarySeries: [] as number[],
        secondarySeries: null as number[] | null,
        targetValue: 0,
        primaryLabel: '',
        secondaryLabel: '',
        primaryColor: '#059669',
        secondaryColor: '#0284c7',
      };
    }

    if (selectedMetric === 'presion') {
      const sys = safePoints.map((p) => p.systolicBP);
      const dia = safePoints.map((p) => p.diastolicBP);
      const target = safePoints[0].targetSystolic;
      const allVals = [...sys, ...dia, target];
      const minY = Math.floor((Math.min(...allVals) - 8) / 5) * 5;
      const maxY = Math.ceil((Math.max(...allVals) + 8) / 5) * 5;

      return {
        minY,
        maxY,
        unit: 'mmHg',
        primarySeries: sys,
        secondarySeries: dia,
        targetValue: target,
        primaryLabel: 'Sistólica',
        secondaryLabel: 'Diastólica',
        primaryColor: '#e11d48',
        secondaryColor: '#0284c7',
      };
    }

    if (selectedMetric === 'pulsaciones') {
      const hrs = safePoints.map((p) => p.heartRate);
      const target = safePoints[0].targetHeartRate;
      const allVals = [...hrs, target];
      // Escala fisiológica revisada y optimizada para reposo (rango clínico humano)
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);
      const minY = Math.max(45, Math.floor((minVal - 6) / 5) * 5);
      const maxY = Math.min(130, Math.ceil((maxVal + 6) / 5) * 5);

      return {
        minY,
        maxY,
        unit: 'lpm',
        primarySeries: hrs,
        secondarySeries: null,
        targetValue: target,
        primaryLabel: 'Ritmo Cardíaco en Reposo',
        secondaryLabel: '',
        primaryColor: '#e11d48',
        secondaryColor: '',
      };
    }

    if (selectedMetric === 'peso_masa') {
      const weights = safePoints.map((p) => p.bodyWeight);
      const target = safePoints[0].targetWeight;
      const allVals = [...weights, target];
      const minY = Math.floor(Math.min(...allVals) - 2);
      const maxY = Math.ceil(Math.max(...allVals) + 2);

      return {
        minY,
        maxY,
        unit: 'kg',
        primarySeries: weights,
        secondarySeries: null,
        targetValue: target,
        primaryLabel: 'Peso Corporal',
        secondaryLabel: '',
        primaryColor: '#059669',
        secondaryColor: '',
      };
    }

    if (selectedMetric === 'higado_graso') {
      const scores = safePoints.map((p) => p.fattyLiverScore ?? 0);
      const target = safePoints[0].targetFattyLiverScore ?? 10;
      const allVals = [...scores, target];
      const minY = 0;
      const maxY = Math.max(100, Math.ceil((Math.max(...allVals) + 10) / 10) * 10);

      return {
        minY,
        maxY,
        unit: '% Riesgo',
        primarySeries: scores,
        secondarySeries: null,
        targetValue: target,
        primaryLabel: 'Riesgo Esteatosis Hepática',
        secondaryLabel: '',
        primaryColor: '#d97706',
        secondaryColor: '',
      };
    }

    const scores = safePoints.map((p) => p.generalHealthScore);
    return {
      minY: 20,
      maxY: 100,
      unit: 'pts',
      primarySeries: scores,
      secondarySeries: null,
      targetValue: 85,
      primaryLabel: 'Vitalidad Celular',
      secondaryLabel: '',
      primaryColor: '#059669',
      secondaryColor: '',
    };
  };

  const chart = getChartData();
  const rangeY = Math.max(1, chart.maxY - chart.minY);

  const getY = (val: number) => {
    const ratio = (val - chart.minY) / rangeY;
    return padTop + plotH - ratio * plotH;
  };

  const buildPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
      .join(' ');

  const buildAreaPath = (values: number[]) => {
    if (values.length === 0) return '';
    const line = buildPath(values);
    const lastX = getX(values.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Number((chart.minY + rangeY * t).toFixed(selectedMetric === 'peso_masa' ? 1 : 0))
  );

  const activeIdx = hoveredIdx !== null ? hoveredIdx : Math.max(0, safePoints.length - 1);
  const inspectedPoint = safePoints[activeIdx];
  const initialPoint = safePoints[0];
  const finalPoint = safePoints[safePoints.length - 1];

  const calorieDiffFromTarget = simulatedCalories - targetCalories;
  const activeSet = new Set(activeSupplementIds);

  // Separamos suplementos funcionales del catálogo vs factores de hábito/riesgo para control transparente
  const catalogSupplements = availableSupplements.filter(
    (s) => s.matchingProductId || s.id === 'SUP-OMEGA3' || s.id === 'SUP-MAGNESIO' || s.id === 'SUP-ASHWAGANDHA' || s.id === 'SUP-MATCHA' || s.id === 'SUP-ESPIRULINA' || s.id === 'SUP-COLAGENO'
  );
  const lifestyleFactors = availableSupplements.filter(
    (s) => s.id === 'SUP-CAFE' || s.id === 'SUP-SAL'
  );

  const getVitalityRange = (score: number) => {
    if (score >= 80) {
      return {
        status: 'normal' as const,
        label: 'Óptimo (≥80)',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        textClass: 'text-emerald-700',
        dotClass: 'bg-emerald-500',
      };
    }
    if (score >= 60) {
      return {
        status: 'borderline' as const,
        label: 'Moderado (60-79)',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        textClass: 'text-amber-700',
        dotClass: 'bg-amber-500',
      };
    }
    return {
      status: 'critical' as const,
      label: 'Mejorable (<60)',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      textClass: 'text-rose-700',
      dotClass: 'bg-rose-500',
    };
  };

  const getEffectBadge = (supp: SupplementItem) => {
    if (supp.id === 'SUP-SAL') return '+6 mmHg PA';
    if (supp.id === 'SUP-CAFE') return '+6 lpm · -80 kcal';
    if (supp.caloricBurnBonus) return `-${supp.caloricBurnBonus} kcal/d`;
    if (supp.heartRateEffect <= -4) return `${supp.heartRateEffect} lpm`;
    if (supp.systolicEffect < 0) return `${supp.systolicEffect} mmHg`;
    return `+${supp.vitalityScoreBonus} vit`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Encabezado y Selector de Curvas */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              {impactSummary.trendDirection === 'improving' ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>Proyección a {timelineWeeks} semanas</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {activeSupplementIds.length}{' '}
              {activeSupplementIds.length === 1 ? 'suplemento activo' : 'suplementos activos'}
            </span>
            {medicalReports.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                <FileText className="w-3 h-3" />
                <span>{medicalReports.length} analítica(s)</span>
              </span>
            )}
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
            Curva de Evolución Biométrica en Tiempo Real
          </h3>
        </div>

        {/* Pestañas de Métricas */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl">
          {tabs.map((tab) => {
            const active = selectedMetric === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectMetric(tab.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${active
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lectura Instantánea: Inicial vs Punto Inspeccionado vs Meta con Indicadores de Color */}
      {inspectedPoint && initialPoint && finalPoint && (() => {
        const initBpCat = getBloodPressureCategory(
          Math.round(initialPoint.systolicBP),
          Math.round(initialPoint.diastolicBP),
          clientAge
        );
        const inspBpCat = getBloodPressureCategory(
          Math.round(inspectedPoint.systolicBP),
          Math.round(inspectedPoint.diastolicBP),
          clientAge
        );

        const initRange =
          selectedMetric === 'presion'
            ? {
                ...getMedicalMetricRange('systolic', initialPoint.systolicBP, clientAge),
                label: initBpCat,
              }
            : selectedMetric === 'pulsaciones'
              ? getMedicalMetricRange('heartRate', initialPoint.heartRate)
              : selectedMetric === 'peso_masa'
                ? getMedicalMetricRange('bmi', initialPoint.bodyMass)
                : selectedMetric === 'higado_graso'
                  ? getMedicalMetricRange('fattyLiver', Math.min(3, Math.floor((initialPoint.fattyLiverScore ?? 0) / 28)))
                  : getVitalityRange(initialPoint.generalHealthScore);

        const inspRange =
          selectedMetric === 'presion'
            ? {
                ...getMedicalMetricRange('systolic', inspectedPoint.systolicBP, clientAge),
                label: inspBpCat,
              }
            : selectedMetric === 'pulsaciones'
              ? getMedicalMetricRange('heartRate', inspectedPoint.heartRate)
              : selectedMetric === 'peso_masa'
                ? getMedicalMetricRange('bmi', inspectedPoint.bodyMass)
                : selectedMetric === 'higado_graso'
                  ? getMedicalMetricRange('fattyLiver', Math.min(3, Math.floor((inspectedPoint.fattyLiverScore ?? 0) / 28)))
                  : getVitalityRange(inspectedPoint.generalHealthScore);

        return (
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50/90 rounded-2xl p-3 border border-slate-200/70 text-xs">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  Inicio (Hoy)
                </span>
                <span className={`w-2 h-2 rounded-full ${initRange.dotClass}`} title={initRange.label} />
              </div>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {selectedMetric === 'presion' &&
                  `${Math.round(initialPoint.systolicBP)}/${Math.round(initialPoint.diastolicBP)} mmHg`}
                {selectedMetric === 'pulsaciones' && `${Math.round(initialPoint.heartRate)} lpm`}
                {selectedMetric === 'peso_masa' && `${initialPoint.bodyWeight} kg`}
                {selectedMetric === 'vitalidad' && `${initialPoint.generalHealthScore}/100`}
                {selectedMetric === 'higado_graso' && `${initialPoint.fattyLiverScore ?? 0}% Riesgo`}
              </span>
              <p className={`text-[10px] font-semibold ${initRange.textClass} mt-0.5`}>
                {initRange.label}
              </p>
            </div>

            <div className="border-x border-slate-200/80 px-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase text-emerald-700 block">
                  {inspectedPoint.weekLabel} (Simulado)
                </span>
                <span className={`w-2 h-2 rounded-full ${inspRange.dotClass}`} title={inspRange.label} />
              </div>
              <span className="font-mono font-extrabold text-emerald-800 text-sm">
                {selectedMetric === 'presion' &&
                  `${Math.round(inspectedPoint.systolicBP)}/${Math.round(inspectedPoint.diastolicBP)} mmHg`}
                {selectedMetric === 'pulsaciones' && `${Math.round(inspectedPoint.heartRate)} lpm`}
                {selectedMetric === 'peso_masa' &&
                  `${inspectedPoint.bodyWeight} kg · IMC ${inspectedPoint.bodyMass}`}
                {selectedMetric === 'vitalidad' && `${inspectedPoint.generalHealthScore}/100 pts`}
                {selectedMetric === 'higado_graso' && `${inspectedPoint.fattyLiverScore ?? 0}% Riesgo`}
              </span>
              <p className={`text-[10px] font-semibold ${inspRange.textClass} mt-0.5`}>
                {inspRange.label}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">
                Meta Sugerida (IA)
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {selectedMetric === 'presion' &&
                  `${initialPoint.targetSystolic}/${initialPoint.targetDiastolic} mmHg`}
                {selectedMetric === 'pulsaciones' && `${initialPoint.targetHeartRate} lpm`}
                {selectedMetric === 'peso_masa' && `${initialPoint.targetWeight} kg`}
                {selectedMetric === 'vitalidad' && `≥ 85/100`}
                {selectedMetric === 'higado_graso' && `≤ 15% (Bajo)`}
              </span>
              <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                Orientativa · No médica
              </p>
            </div>
          </div>
        );
      })()}

      {/* Barra de Regresión Lineal OLS & Zona Fisiológica */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRegression((prev) => !prev)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors border ${
              showRegression
                ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-sky-600" />
            <span>Tendencia Lineal (OLS): {showRegression ? 'Visible' : 'Oculta'}</span>
          </button>

          {showRegression && chart.primarySeries.length > 1 && (() => {
            const regPoints = chart.primarySeries.map((y, idx) => ({ x: idx, y }));
            const reg = calculateSeriesLinearRegression(regPoints);
            return (
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                Pendiente: {reg.slope > 0 ? `+${reg.slope}` : reg.slope} {chart.unit}/sem · R²: {reg.rSquared}
              </span>
            );
          })()}
        </div>

        {selectedMetric === 'pulsaciones' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-xl border border-emerald-200/70 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zona Normal en Reposo: 60 - 80 lpm</span>
          </div>
        )}
      </div>

      {/* Lienzo SVG Interactivo con Transición Suave en Tiempo Real */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50/60 to-white border border-slate-100 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
          role="img"
          aria-label="Gráfica dinámica de progreso biométrico"
        >
          <defs>
            <linearGradient id="nutrivitalAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.primaryColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={chart.primaryColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Zona Fisiológica Óptima para Ritmo Cardíaco (60 - 80 lpm) */}
          {selectedMetric === 'pulsaciones' && chart.minY <= 80 && chart.maxY >= 60 && (
            <g>
              <rect
                x={padLeft}
                y={Math.max(padTop, getY(80))}
                width={plotW}
                height={Math.min(plotH, Math.max(12, getY(60) - getY(80)))}
                fill="#10b981"
                fillOpacity="0.08"
                rx="6"
              />
              <text
                x={width - padRight - 8}
                y={getY(70) + 3}
                textAnchor="end"
                className="fill-emerald-700/80 text-[9px] font-bold select-none"
              >
                Rango Óptimo Reposo (60-80 lpm)
              </text>
            </g>
          )}

          {/* Líneas de cuadrícula horizontal */}
          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Línea de Meta Sugerida IA (etiqueta a la izquierda con fondo para evitar solapamiento) */}
          {chart.targetValue >= chart.minY && chart.targetValue <= chart.maxY && (
            <g className="transition-all duration-300">
              <line
                x1={padLeft}
                y1={getY(chart.targetValue)}
                x2={width - padRight}
                y2={getY(chart.targetValue)}
                stroke="#10b981"
                strokeWidth="1.75"
                strokeDasharray="6 4"
              />
              <rect
                x={padLeft + 4}
                y={getY(chart.targetValue) - 16}
                width={136}
                height={14}
                rx={4}
                fill="#ffffff"
                fillOpacity="0.92"
              />
              <text
                x={padLeft + 8}
                y={getY(chart.targetValue) - 6}
                textAnchor="start"
                className="fill-emerald-700 text-[9.5px] font-bold font-mono"
              >
                Meta IA ({chart.targetValue} {chart.unit})
              </text>
            </g>
          )}

          {/* Recta de Regresión Lineal OLS (si está activada) */}
          {showRegression && chart.primarySeries.length > 1 && (() => {
            const regPoints = chart.primarySeries.map((y, idx) => ({ x: idx, y }));
            const reg = calculateSeriesLinearRegression(regPoints);
            const x1 = getX(0);
            const y1 = getY(reg.predict(0));
            const x2 = getX(chart.primarySeries.length - 1);
            const y2 = getY(reg.predict(chart.primarySeries.length - 1));
            return (
              <g className="transition-all duration-300">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeOpacity="0.8"
                />
              </g>
            );
          })()}

          {/* Área sombreada bajo la curva principal */}
          {chart.primarySeries.length > 1 && (
            <path
              d={buildAreaPath(chart.primarySeries)}
              fill="url(#nutrivitalAreaGrad)"
              className="transition-all duration-300 ease-out"
            />
          )}

          {/* Curva Secundaria (Diastólica en Presión Arterial) */}
          {chart.secondarySeries && chart.secondarySeries.length > 1 && (
            <path
              d={buildPath(chart.secondarySeries)}
              fill="none"
              stroke={chart.secondaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 ease-out"
            />
          )}

          {/* Curva Principal */}
          {chart.primarySeries.length > 1 && (
            <path
              d={buildPath(chart.primarySeries)}
              fill="none"
              stroke={chart.primaryColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 ease-out"
            />
          )}

          {/* Puntos y etiquetas del eje X */}
          {safePoints.map((pt, i) => {
            const x = getX(i);
            const y1 = getY(chart.primarySeries[i]);
            const y2 = chart.secondarySeries ? getY(chart.secondarySeries[i]) : null;
            const isSelected = activeIdx === i;

            return (
              <g
                key={pt.week}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(i)}
              >
                {/* Guía vertical al seleccionar */}
                {isSelected && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotH}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Punto Secundario */}
                {y2 !== null && (
                  <circle
                    cx={x}
                    cy={y2}
                    r={isSelected ? 5 : 3.5}
                    fill="#ffffff"
                    stroke={chart.secondaryColor}
                    strokeWidth="2.5"
                    className="transition-all duration-300"
                  />
                )}

                {/* Punto Principal */}
                <circle
                  cx={x}
                  cy={y1}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? chart.primaryColor : '#ffffff'}
                  stroke={chart.primaryColor}
                  strokeWidth="2.5"
                  className="transition-all duration-300"
                />

                {/* Etiqueta de valor sobre el punto */}
                <text
                  x={x}
                  y={y1 - 10}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-bold transition-all duration-300 ${isSelected ? 'fill-slate-900' : 'fill-slate-500'
                    }`}
                >
                  {selectedMetric === 'presion' &&
                    `${Math.round(pt.systolicBP)}/${Math.round(pt.diastolicBP)}`}
                  {selectedMetric === 'pulsaciones' && `${Math.round(pt.heartRate)}`}
                  {selectedMetric === 'peso_masa' && `${pt.bodyWeight}`}
                  {selectedMetric === 'vitalidad' && `${pt.generalHealthScore}`}
                  {selectedMetric === 'higado_graso' && `${pt.fattyLiverScore ?? 0}%`}
                </text>

                {/* Etiqueta Semana */}
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-mono ${isSelected ? 'fill-emerald-800 font-bold' : 'fill-slate-500'
                    }`}
                >
                  {pt.week === 0 ? 'Hoy' : pt.weekLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Leyenda compacta */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-1 pb-1 text-[11px] text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: chart.primaryColor }}
              />
              {chart.primaryLabel}
            </span>
            {chart.secondaryLabel && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: chart.secondaryColor }}
                />
                {chart.secondaryLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-3 border-t-2 border-dashed border-emerald-500 inline-block" />
              Meta Sugerida IA
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Toca o pasa el cursor por cada semana
          </span>
        </div>
      </div>

      {/* Simulador Calórico Integrado debajo de la Gráfica */}
      <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Simulador de Ingesta Calórica Diaria
              </span>
              <span className="text-[11px] text-slate-500">
                Habitual: <strong className="font-mono">{baselineCalories}</strong> kcal · Meta:{' '}
                <strong className="font-mono text-emerald-700">{targetCalories}</strong> kcal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-xl ${Math.abs(calorieDiffFromTarget) <= 150
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-orange-100 text-orange-800'
                }`}
            >
              {simulatedCalories} kcal/día
            </span>

            {simulatedCalories !== baselineCalories && (
              <button
                type="button"
                onClick={() => onChangeSimulatedCalories(baselineCalories)}
                title="Restaurar calorías habituales"
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <input
          id="simulated-calories-slider"
          name="simulatedCalories"
          type="range"
          min={1200}
          max={3600}
          step={50}
          value={simulatedCalories}
          onChange={(e) => onChangeSimulatedCalories(Number(e.target.value))}
          aria-label="Simulador de calorías diarias"
          className="w-full accent-emerald-700 cursor-pointer h-2 bg-emerald-200/80 rounded-lg"
        />

        {/* Selector Transparente de Suplementos y Factores Simulados (Control Real de la Curva) */}
        {onToggleSupplement && catalogSupplements.length > 0 && (
          <div className="pt-3 border-t border-emerald-200/70 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protocolo simulado en la gráfica (activa o desactiva para ver impacto):</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {catalogSupplements.map((supp) => {
                const isSimulated = activeSet.has(supp.id);
                return (
                  <button
                    key={supp.id}
                    type="button"
                    onClick={() => onToggleSupplement(supp.id)}
                    title={`${supp.name} (${supp.dailyDose}) — ${supp.description}`}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${isSimulated
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white hover:bg-emerald-100/70 text-slate-700 border-emerald-200/90'
                      }`}
                  >
                    {isSimulated && <Check className="w-3 h-3 shrink-0" />}
                    <span>{supp.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isSimulated
                          ? 'bg-emerald-800/80 text-emerald-100'
                          : 'bg-emerald-50 text-emerald-800'
                        }`}
                    >
                      {getEffectBadge(supp)}
                    </span>
                  </button>
                );
              })}
            </div>

            {lifestyleFactors.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mr-1">
                  Simular hábitos de riesgo:
                </span>
                {lifestyleFactors.map((factor) => {
                  const isSimulated = activeSet.has(factor.id);
                  return (
                    <button
                      key={factor.id}
                      type="button"
                      onClick={() => onToggleSupplement(factor.id)}
                      title={factor.description}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${isSimulated
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                        }`}
                    >
                      <span>{factor.id === 'SUP-SAL' ? 'Exceso de Sal (>5g)' : 'Café Funcional'}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isSimulated
                            ? 'bg-amber-700 text-amber-50'
                            : 'bg-amber-50 text-amber-800'
                          }`}
                      >
                        {getEffectBadge(factor)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};