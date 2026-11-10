import React, { useState } from 'react';
import {
  Activity,
  Heart,
  Scale,
  Zap,
  TrendingDown,
  TrendingUp,
  Info,
  CheckCircle,
  Flame,
} from 'lucide-react';
import { BiometricTrendPoint, ProjectedImpactSummary } from '../types/nutrivital';

export type ChartMetricView = 'presion' | 'pulsaciones' | 'peso_masa' | 'vitalidad';

interface DynamicProgressChartProps {
  trendPoints: BiometricTrendPoint[];
  impactSummary: ProjectedImpactSummary;
  selectedMetric: ChartMetricView;
  onSelectMetric: (m: ChartMetricView) => void;
  timelineWeeks: number;
  simulatedCalories?: number;
  onChangeSimulatedCalories?: (calories: number) => void;
  targetCalories?: number;
  baselineCalories?: number;
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
}) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (trendPoints.length === 0) return null;

  const currentPoint =
    activePointIndex !== null && trendPoints[activePointIndex]
      ? trendPoints[activePointIndex]
      : trendPoints[trendPoints.length - 1];

  const initialPoint = trendPoints[0];

  // Dimensiones SVG
  const chartWidth = 760;
  const chartHeight = 310;
  const padLeft = 52;
  const padRight = 36;
  const padTop = 32;
  const padBottom = 48;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const totalPoints = trendPoints.length;

  const getX = (idx: number) => {
    if (totalPoints <= 1) return padLeft + innerWidth / 2;
    return padLeft + (idx / (totalPoints - 1)) * innerWidth;
  };

  // Rangos de Y dinámicos por métrica
  let minY = 60;
  let maxY = 160;

  if (selectedMetric === 'presion') {
    const allVals = trendPoints.flatMap((p) => [
      p.systolicBP,
      p.diastolicBP,
      p.targetSystolic,
      p.targetDiastolic,
    ]);
    minY = Math.max(50, Math.floor(Math.min(...allVals) / 10) * 10 - 10);
    maxY = Math.min(200, Math.ceil(Math.max(...allVals) / 10) * 10 + 10);
  } else if (selectedMetric === 'pulsaciones') {
    const allVals = trendPoints.flatMap((p) => [p.heartRate, p.targetHeartRate]);
    minY = Math.max(45, Math.floor(Math.min(...allVals) / 5) * 5 - 5);
    maxY = Math.min(130, Math.ceil(Math.max(...allVals) / 5) * 5 + 5);
  } else if (selectedMetric === 'peso_masa') {
    const allWeights = trendPoints.flatMap((p) => [p.bodyWeight, p.targetWeight]);
    minY = Math.floor(Math.min(...allWeights) / 5) * 5 - 5;
    maxY = Math.ceil(Math.max(...allWeights) / 5) * 5 + 5;
  } else if (selectedMetric === 'vitalidad') {
    minY = 30;
    maxY = 100;
  }

  const getY = (val: number, customMin: number = minY, customMax: number = maxY) => {
    const range = customMax - customMin || 1;
    const clamped = Math.max(customMin, Math.min(customMax, val));
    return padTop + innerHeight - ((clamped - customMin) / range) * innerHeight;
  };

  const buildPath = (values: number[], customMin?: number, customMax?: number) => {
    return values
      .map((val, idx) => {
        const x = getX(idx).toFixed(1);
        const y = getY(val, customMin, customMax).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const buildArea = (values: number[], customMin?: number, customMax?: number) => {
    if (values.length <= 1) return '';
    const line = buildPath(values, customMin, customMax);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(values.length - 1).toFixed(1);
    const baselineY = (padTop + innerHeight).toFixed(1);
    return `${line} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  };

  // Arreglos de valores
  const systolicValues = trendPoints.map((p) => p.systolicBP);
  const diastolicValues = trendPoints.map((p) => p.diastolicBP);
  const hrValues = trendPoints.map((p) => p.heartRate);
  const weightValues = trendPoints.map((p) => p.bodyWeight);
  const bodyMassValues = trendPoints.map((p) => p.bodyMass);
  const vitalityValues = trendPoints.map((p) => p.generalHealthScore);

  const minMass = Math.floor(Math.min(...trendPoints.flatMap((p) => [p.bodyMass, p.targetBodyMass])) - 2);
  const maxMass = Math.ceil(Math.max(...trendPoints.flatMap((p) => [p.bodyMass, p.targetBodyMass])) + 2);

  const isImproving = impactSummary.trendDirection === 'improving';
  const isDeteriorating = impactSummary.trendDirection === 'deteriorating';

  const calorieDelta =
    simulatedCalories !== undefined && baselineCalories !== undefined
      ? simulatedCalories - baselineCalories
      : 0;

  return (
    <div className="bg-white rounded-3xl border border-emerald-100/90 shadow-sm p-6 space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Panel de Gráficas Dinámicas & Metas
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${isImproving
                  ? 'bg-emerald-100 text-emerald-800'
                  : isDeteriorating
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
            >
              {isImproving ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>En progreso hacia tu meta</span>
                </>
              ) : isDeteriorating ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                  <span>Atención: Desviación de meta</span>
                </>
              ) : (
                <span>Comportamiento estable</span>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reacciona en tiempo real a la ingesta calórica y suplementos seleccionados.
          </p>
        </div>

        {/* Selector de Métricas */}
        <div
          role="group"
          aria-label="Seleccionar métrica de gráfica"
          className="inline-flex p-1 bg-slate-100 rounded-2xl gap-1 shrink-0 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => {
              onSelectMetric('presion');
              setActivePointIndex(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedMetric === 'presion'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-500" />
            <span>Presión Arterial</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectMetric('pulsaciones');
              setActivePointIndex(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedMetric === 'pulsaciones'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-600" />
            <span>Pulsaciones</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectMetric('peso_masa');
              setActivePointIndex(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedMetric === 'peso_masa'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Peso & Masa Corp.</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectMetric('vitalidad');
              setActivePointIndex(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedMetric === 'vitalidad'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Score Vitalidad</span>
          </button>
        </div>
      </div>

      {/* Leyenda e Indicador Semanal */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
          {selectedMetric === 'presion' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-rose-500" />
                <span>Sistólica ({currentPoint.systolicBP} mmHg)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-teal-600" />
                <span>Diastólica ({currentPoint.diastolicBP} mmHg)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 border-t-2 border-dashed border-emerald-500" />
                <span>Meta ({currentPoint.targetSystolic}/{currentPoint.targetDiastolic})</span>
              </span>
            </>
          )}

          {selectedMetric === 'pulsaciones' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-rose-600" />
                <span>Frecuencia en Reposo ({currentPoint.heartRate} lpm)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 border-t-2 border-dashed border-emerald-500" />
                <span>Meta Cardíaca ({currentPoint.targetHeartRate} lpm)</span>
              </span>
            </>
          )}

          {selectedMetric === 'peso_masa' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-600" />
                <span>Peso Corporal ({currentPoint.bodyWeight} kg)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-amber-500" />
                <span>Masa Corporal Indep. ({currentPoint.bodyMass})</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 border-t-2 border-dashed border-slate-400" />
                <span>Metas ({currentPoint.targetWeight} kg / {currentPoint.targetBodyMass})</span>
              </span>
            </>
          )}

          {selectedMetric === 'vitalidad' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-600" />
                <span>Índice Vital ({currentPoint.generalHealthScore}/100)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Progreso: +{currentPoint.generalHealthScore - initialPoint.generalHealthScore} pts</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Mostrando: </span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
            {currentPoint.weekLabel}
          </span>
        </div>
      </div>

      {/* Canvas SVG */}
      <div className="w-full overflow-x-auto bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[580px] select-none"
          role="img"
          aria-label="Gráfica de progreso dinámico y metas de salud"
        >
          <defs>
            <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grilla horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padTop + innerHeight * pct;
            const val = Math.round(maxY - pct * (maxY - minY));
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Etiquetas Eje X */}
          {trendPoints.map((pt, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + innerHeight}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padTop + innerHeight + 20}
                  textAnchor="middle"
                  className={`text-[10px] font-mono cursor-pointer transition-colors ${activePointIndex === idx ? 'fill-emerald-800 font-bold' : 'fill-slate-500'
                    }`}
                  onClick={() => setActivePointIndex(idx)}
                >
                  {pt.week === 0 ? 'Inicial' : `Sem ${pt.week}`}
                </text>
              </g>
            );
          })}

          {/* Curvas según métrica */}
          {selectedMetric === 'presion' && (
            <>
              <line
                x1={padLeft}
                y1={getY(currentPoint.targetSystolic)}
                x2={chartWidth - padRight}
                y2={getY(currentPoint.targetSystolic)}
                stroke="#10B981"
                strokeDasharray="5 4"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <line
                x1={padLeft}
                y1={getY(currentPoint.targetDiastolic)}
                x2={chartWidth - padRight}
                y2={getY(currentPoint.targetDiastolic)}
                stroke="#0D9488"
                strokeDasharray="5 4"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <path d={buildArea(systolicValues)} fill="url(#roseGradient)" />
              <path
                d={buildPath(systolicValues)}
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d={buildArea(diastolicValues)} fill="url(#tealGradient)" />
              <path
                d={buildPath(diastolicValues)}
                fill="none"
                stroke="#0D9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {trendPoints.map((p, idx) => {
                const x = getX(idx);
                const ySys = getY(p.systolicBP);
                const yDia = getY(p.diastolicBP);
                const isSelected = activePointIndex === idx;

                return (
                  <g key={idx} className="cursor-pointer" onClick={() => setActivePointIndex(idx)}>
                    <circle
                      cx={x}
                      cy={ySys}
                      r={isSelected ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#F43F5E"
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <circle
                      cx={x}
                      cy={yDia}
                      r={isSelected ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#0D9488"
                      strokeWidth={isSelected ? 3 : 2}
                    />
                  </g>
                );
              })}
            </>
          )}

          {selectedMetric === 'pulsaciones' && (
            <>
              <line
                x1={padLeft}
                y1={getY(currentPoint.targetHeartRate)}
                x2={chartWidth - padRight}
                y2={getY(currentPoint.targetHeartRate)}
                stroke="#10B981"
                strokeDasharray="5 4"
                strokeWidth="1.5"
              />
              <path d={buildArea(hrValues)} fill="url(#roseGradient)" />
              <path
                d={buildPath(hrValues)}
                fill="none"
                stroke="#E11D48"
                strokeWidth="2.75"
                strokeLinecap="round"
              />
              {trendPoints.map((p, idx) => {
                const x = getX(idx);
                const y = getY(p.heartRate);
                const isSelected = activePointIndex === idx;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : 4}
                    fill="#FFFFFF"
                    stroke="#E11D48"
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer"
                    onClick={() => setActivePointIndex(idx)}
                  />
                );
              })}
            </>
          )}

          {selectedMetric === 'peso_masa' && (
            <>
              <line
                x1={padLeft}
                y1={getY(currentPoint.targetWeight)}
                x2={chartWidth - padRight}
                y2={getY(currentPoint.targetWeight)}
                stroke="#059669"
                strokeDasharray="5 4"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <path d={buildArea(weightValues)} fill="url(#emeraldGradient)" />
              <path
                d={buildPath(weightValues)}
                fill="none"
                stroke="#059669"
                strokeWidth="2.75"
                strokeLinecap="round"
              />
              <path
                d={buildPath(bodyMassValues, minMass, maxMass)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                strokeLinecap="round"
              />
              {trendPoints.map((p, idx) => {
                const x = getX(idx);
                const yWeight = getY(p.bodyWeight);
                const yMass = getY(p.bodyMass, minMass, maxMass);
                const isSelected = activePointIndex === idx;
                return (
                  <g key={idx} className="cursor-pointer" onClick={() => setActivePointIndex(idx)}>
                    <circle
                      cx={x}
                      cy={yWeight}
                      r={isSelected ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#059669"
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <circle
                      cx={x}
                      cy={yMass}
                      r={isSelected ? 5 : 3.5}
                      fill="#FFFFFF"
                      stroke="#F59E0B"
                      strokeWidth={isSelected ? 3 : 2}
                    />
                  </g>
                );
              })}
            </>
          )}

          {selectedMetric === 'vitalidad' && (
            <>
              <path d={buildArea(vitalityValues)} fill="url(#emeraldGradient)" />
              <path
                d={buildPath(vitalityValues)}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {trendPoints.map((p, idx) => {
                const x = getX(idx);
                const y = getY(p.generalHealthScore);
                const isSelected = activePointIndex === idx;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isSelected ? 7 : 4.5}
                    fill="#FFFFFF"
                    stroke="#10B981"
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer"
                    onClick={() => setActivePointIndex(idx)}
                  />
                );
              })}
            </>
          )}
        </svg>
      </div>

      {/* SIMULADOR DE DIETA CALÓRICA DIARIA (DIRECTAMENTE DEBAJO DE LA GRÁFICA SVG) */}
      {simulatedCalories !== undefined && onChangeSimulatedCalories && (
        <div className="bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-white rounded-2xl border border-orange-200/80 p-5 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Simulador de Dieta Calórica Diaria
                </h4>
                <p className="text-[11px] text-slate-500">
                  Mueve el deslizador y observa cómo se recalculan las curvas en la gráfica superior.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                {simulatedCalories}{' '}
                <span className="text-xs font-normal text-slate-500">kcal/día</span>
              </span>

              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold ${calorieDelta < 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : calorieDelta > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
              >
                {calorieDelta < 0
                  ? `Déficit ${calorieDelta} kcal`
                  : calorieDelta > 0
                    ? `Superávit +${calorieDelta} kcal`
                    : 'Mantenimiento Base'}
              </span>
            </div>
          </div>

          {/* Deslizador del Simulador */}
          <div className="space-y-1 pt-1">
            <input
              type="range"
              min={1200}
              max={3800}
              step={50}
              value={simulatedCalories}
              onChange={(e) => onChangeSimulatedCalories(Number(e.target.value))}
              className="w-full h-2.5 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1200 kcal (Mínimo)</span>
              {targetCalories !== undefined && <span>Meta: {targetCalories} kcal</span>}
              {baselineCalories !== undefined && <span>Base: {baselineCalories} kcal</span>}
              <span>3800 kcal (Máximo)</span>
            </div>
          </div>

          {/* Botones de Presets Rápidos */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-orange-100/80">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Ajustes rápidos:
            </span>
            {targetCalories !== undefined && (
              <button
                type="button"
                onClick={() => onChangeSimulatedCalories(targetCalories)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${simulatedCalories === targetCalories
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                  }`}
              >
                Fijar a Meta ({targetCalories} kcal)
              </button>
            )}
            {baselineCalories !== undefined && (
              <>
                <button
                  type="button"
                  onClick={() => onChangeSimulatedCalories(Math.max(1200, baselineCalories - 300))}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                >
                  Déficit Moderado (-300 kcal)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSimulatedCalories(baselineCalories)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                >
                  Mantenimiento ({baselineCalories} kcal)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSimulatedCalories(Math.min(3800, baselineCalories + 300))}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                >
                  Superávit (+300 kcal)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tarjetas Inferiores de Inspección Semanal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] text-slate-500 font-medium">Presión en {currentPoint.weekLabel}</p>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
            {currentPoint.systolicBP} / {currentPoint.diastolicBP} <span className="text-xs text-slate-400 font-normal">mmHg</span>
          </p>
          <p className="text-[10px] font-mono mt-0.5 text-emerald-700">
            {currentPoint.systolicBP - initialPoint.systolicBP <= 0
              ? `▼ ${(initialPoint.systolicBP - currentPoint.systolicBP).toFixed(1)} mmHg`
              : `▲ +${(currentPoint.systolicBP - initialPoint.systolicBP).toFixed(1)} mmHg`}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] text-slate-500 font-medium">Pulsaciones</p>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
            {currentPoint.heartRate} <span className="text-xs text-slate-400 font-normal">lpm</span>
          </p>
          <p className="text-[10px] font-mono mt-0.5 text-slate-600">
            Meta: {currentPoint.targetHeartRate} lpm
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] text-slate-500 font-medium">Peso & Masa Corp.</p>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
            {currentPoint.bodyWeight} kg <span className="text-xs text-slate-400 font-normal">· {currentPoint.bodyMass}</span>
          </p>
          <p className="text-[10px] font-mono mt-0.5 text-emerald-700">
            Meta: {currentPoint.targetWeight} kg
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
          <p className="text-[11px] text-emerald-900 font-medium">Score Vitalidad</p>
          <p className="text-base font-bold text-emerald-900 font-mono mt-0.5">
            {currentPoint.generalHealthScore} / 100
          </p>
          <p className="text-[10px] font-mono mt-0.5 text-emerald-700">
            +{currentPoint.generalHealthScore - initialPoint.generalHealthScore} pts
          </p>
        </div>
      </div>
    </div>
  );
};