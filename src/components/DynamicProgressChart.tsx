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
} from 'lucide-react';
import {
  BiometricTrendPoint,
  MedicalReportRecord,
  NutritionRecommendation,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';

export type ChartMetricView = 'presion' | 'pulsaciones' | 'peso_masa' | 'vitalidad';

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
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const tabs: { id: ChartMetricView; label: string; icon: React.ReactNode }[] = [
    { id: 'presion', label: 'Presión Arterial', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'pulsaciones', label: 'Pulsaciones', icon: <Heart className="w-3.5 h-3.5" /> },
    { id: 'peso_masa', label: 'Peso & IMC', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'vitalidad', label: 'Vitalidad', icon: <Zap className="w-3.5 h-3.5" /> },
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
      const minY = Math.floor((Math.min(...allVals) - 6) / 5) * 5;
      const maxY = Math.ceil((Math.max(...allVals) + 6) / 5) * 5;

      return {
        minY,
        maxY,
        unit: 'lpm',
        primarySeries: hrs,
        secondarySeries: null,
        targetValue: target,
        primaryLabel: 'Ritmo Cardíaco',
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

  // Suplementos únicos recomendados por la IA para acceso rápido dentro de la gráfica
  const aiQuickSupplements = recommendations
    .map((rec) =>
      availableSupplements.find(
        (s) =>
          (rec.relatedSupplementId && s.id === rec.relatedSupplementId) ||
          (rec.relatedProductId && s.matchingProductId === rec.relatedProductId)
      )
    )
    .filter(
      (supp, idx, arr): supp is SupplementItem =>
        Boolean(supp) && arr.findIndex((x) => x?.id === supp?.id) === idx
    )
    .slice(0, 3);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Encabezado y Selector de Curvas */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
              {activeSupplementIds.length} suplementos activos
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
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
          {tabs.map((tab) => {
            const active = selectedMetric === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectMetric(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${active
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

      {/* Lectura Instantánea: Inicial vs Punto Inspeccionado vs Meta */}
      {inspectedPoint && initialPoint && finalPoint && (
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50/90 rounded-2xl p-3 border border-slate-200/70 text-xs">
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Inicio (Hoy)
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {selectedMetric === 'presion' &&
                `${Math.round(initialPoint.systolicBP)}/${Math.round(initialPoint.diastolicBP)} mmHg`}
              {selectedMetric === 'pulsaciones' && `${Math.round(initialPoint.heartRate)} lpm`}
              {selectedMetric === 'peso_masa' && `${initialPoint.bodyWeight} kg`}
              {selectedMetric === 'vitalidad' && `${initialPoint.generalHealthScore}/100`}
            </span>
          </div>

          <div className="border-x border-slate-200/80 px-3">
            <span className="text-[10px] font-semibold uppercase text-emerald-700 block">
              {inspectedPoint.weekLabel} (Simulado)
            </span>
            <span className="font-mono font-extrabold text-emerald-800 text-sm">
              {selectedMetric === 'presion' &&
                `${Math.round(inspectedPoint.systolicBP)}/${Math.round(inspectedPoint.diastolicBP)} mmHg`}
              {selectedMetric === 'pulsaciones' && `${Math.round(inspectedPoint.heartRate)} lpm`}
              {selectedMetric === 'peso_masa' &&
                `${inspectedPoint.bodyWeight} kg · IMC ${inspectedPoint.bodyMass}`}
              {selectedMetric === 'vitalidad' && `${inspectedPoint.generalHealthScore}/100 pts`}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Meta Clínica
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {selectedMetric === 'presion' &&
                `${initialPoint.targetSystolic}/${initialPoint.targetDiastolic} mmHg`}
              {selectedMetric === 'pulsaciones' && `${initialPoint.targetHeartRate} lpm`}
              {selectedMetric === 'peso_masa' && `${initialPoint.targetWeight} kg`}
              {selectedMetric === 'vitalidad' && `≥ 85/100`}
            </span>
          </div>
        </div>
      )}

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

          {/* Línea de Meta Clínica */}
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
              <text
                x={width - padRight}
                y={getY(chart.targetValue) - 6}
                textAnchor="end"
                className="fill-emerald-700 text-[10px] font-bold font-mono"
              >
                Meta ({chart.targetValue} {chart.unit})
              </text>
            </g>
          )}

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
              Meta Clínica
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
          type="range"
          min={1200}
          max={3600}
          step={50}
          value={simulatedCalories}
          onChange={(e) => onChangeSimulatedCalories(Number(e.target.value))}
          aria-label="Simulador de calorías diarias"
          className="w-full accent-emerald-700 cursor-pointer h-2 bg-emerald-200/80 rounded-lg"
        />

        {/* Píldoras de Simulación Rápida IA para ver el efecto directo en la curva */}
        {aiQuickSupplements.length > 0 && onToggleSupplement && (
          <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simular sugerencia IA:</span>
            </span>

            {aiQuickSupplements.map((supp) => {
              const isSimulated = activeSet.has(supp.id);
              return (
                <button
                  key={supp.id}
                  type="button"
                  onClick={() => onToggleSupplement(supp.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${isSimulated
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white hover:bg-emerald-100/80 text-emerald-900 border border-emerald-300/80'
                    }`}
                >
                  {isSimulated ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                  )}
                  <span>{supp.name.split(' ').slice(0, 2).join(' ')}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};