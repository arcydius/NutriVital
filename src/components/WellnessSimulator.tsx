import React, { useMemo, useState } from 'react';
import { Sliders, Sparkles, Moon, Activity, Zap } from 'lucide-react';
import { generateWellnessProjection } from '../utils/analytics';

export const WellnessSimulator: React.FC = () => {
  const [weeks, setWeeks] = useState<number>(8);
  const [adherence, setAdherence] = useState<number>(85);

  const projection = useMemo(
    () => generateWellnessProjection(weeks, adherence),
    [weeks, adherence]
  );

  const finalPoint = projection[projection.length - 1] ?? {
    week: 1,
    weekLabel: 'Sem 1',
    energyScore: 50,
    sleepQuality: 48,
    inflammationReduction: 25,
    compositeVitality: 41,
  };

  const initialPoint = projection[0] ?? finalPoint;

  // SVG Chart dimensions
  const chartWidth = 760;
  const chartHeight = 300;
  const padLeft = 48;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 42;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const getX = (index: number, total: number) => {
    if (total <= 1) return padLeft + innerWidth / 2;
    return padLeft + (index / (total - 1)) * innerWidth;
  };

  const getY = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    return padTop + innerHeight - (clamped / 100) * innerHeight;
  };

  const buildSmoothPath = (values: number[]) => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const x = getX(0, 1);
      const y = getY(values[0]);
      return `M ${x - 20} ${y} L ${x + 20} ${y}`;
    }
    return values
      .map((v, idx) => {
        const x = getX(idx, values.length).toFixed(1);
        const y = getY(v).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const buildAreaPath = (values: number[]) => {
    if (values.length <= 1) return '';
    const line = buildSmoothPath(values);
    const firstX = getX(0, values.length).toFixed(1);
    const lastX = getX(values.length - 1, values.length).toFixed(1);
    const baselineY = (padTop + innerHeight).toFixed(1);
    return `${line} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  };

  const energyValues = projection.map((p) => p.energyScore);
  const sleepValues = projection.map((p) => p.sleepQuality);
  const inflammationValues = projection.map((p) => p.inflammationReduction);

  return (
    <section
      id="progreso"
      aria-labelledby="wellness-sim-heading"
      className="py-16 bg-[#F0FDF4]/70 border-y border-emerald-100"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-medium text-emerald-800 tracking-wide mb-2">
            Simulador Fisiológico Interactivo · Proyección de Bienestar
          </p>
          <h2
            id="wellness-sim-heading"
            className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight"
          >
            Calcula tu Transformación Saludable
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Ajusta el horizonte de semanas de suplementación continua y tu porcentaje de adherencia nutricional para proyectar el impacto esperado en energía celular, arquitectura del sueño y reducción de marcadores inflamatorios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-emerald-100/80 shadow-sm p-6 flex flex-col justify-between">
            <div className="space-y-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-slate-900">
                    Parámetros de tu Plan
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Índice Vital: {finalPoint.compositeVitality}/100
                </span>
              </div>

              {/* Slider 1: Weeks */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label
                    htmlFor="slider-weeks"
                    className="text-sm font-medium text-slate-800"
                  >
                    Semanas de consumo continuo
                  </label>
                  <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                    {weeks} {weeks === 1 ? 'semana' : 'semanas'}
                  </span>
                </div>
                <input
                  id="slider-weeks"
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums mt-1.5">
                  <span>1 sem (Inicio)</span>
                  <span>6 sem (Adaptación)</span>
                  <span>12 sem (Óptimo)</span>
                </div>
              </div>

              {/* Slider 2: Adherence */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label
                    htmlFor="slider-adherence"
                    className="text-sm font-medium text-slate-800"
                  >
                    Nivel de adherencia al plan nutricional
                  </label>
                  <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                    {adherence}%
                  </span>
                </div>
                <input
                  id="slider-adherence"
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={adherence}
                  onChange={(e) => setAdherence(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums mt-1.5">
                  <span>50% (Moderado)</span>
                  <span>75% (Consistente)</span>
                  <span>100% (Disciplinado)</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="pt-2">
                <p className="text-xs font-medium text-slate-500 mb-2.5">
                  Escenarios rápidos de simulación:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWeeks(4);
                      setAdherence(70);
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      weeks === 4 && adherence === 70
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    1 Mes Base
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWeeks(8);
                      setAdherence(85);
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      weeks === 8 && adherence === 85
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    8 Sem Estándar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWeeks(12);
                      setAdherence(100);
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      weeks === 12 && adherence === 100
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    12 Sem Intensivo
                  </button>
                </div>
              </div>
            </div>

            {/* Summary KPI Cards at Week N */}
            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-emerald-100">
                <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium">
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Energía</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900 font-mono tabular-nums">
                  {finalPoint.energyScore}%
                </p>
                <p className="text-[11px] text-emerald-700 font-mono tabular-nums">
                  +{Math.max(0, finalPoint.energyScore - initialPoint.energyScore)}% vs sem 1
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-teal-700 text-xs font-medium">
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sueño</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900 font-mono tabular-nums">
                  {finalPoint.sleepQuality}%
                </p>
                <p className="text-[11px] text-teal-700 font-mono tabular-nums">
                  +{Math.max(0, finalPoint.sleepQuality - initialPoint.sleepQuality)}% vs sem 1
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-emerald-800 text-xs font-medium">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Desinflam.</span>
                </div>
                <p className="mt-1 text-xl font-bold text-slate-900 font-mono tabular-nums">
                  {finalPoint.inflammationReduction}%
                </p>
                <p className="text-[11px] text-emerald-800 font-mono tabular-nums">
                  +{Math.max(0, finalPoint.inflammationReduction - initialPoint.inflammationReduction)}% vs sem 1
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Multi-Curve Chart */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-emerald-100/80 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Curva de Evolución de Biomarcadores (Semanas 1 a {weeks})
                </h3>
                <p className="text-xs text-slate-500">
                  Adherencia configurada al {adherence}% · Actualización instantánea en tiempo real
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#16A34A]" />
                  Energía Diaria
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#0D9488]" />
                  Calidad del Sueño
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#4ADE80]" />
                  Reducción Inflamatoria
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[520px]"
                role="img"
                aria-label={`Gráfica de proyección de bienestar para ${weeks} semanas con ${adherence}% de adherencia`}
              >
                <defs>
                  <linearGradient id="energyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Y Grid lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = getY(val);
                  return (
                    <g key={val}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[11px] fill-slate-400 font-mono"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Area under Energy curve */}
                {projection.length > 1 && (
                  <path
                    d={buildAreaPath(energyValues)}
                    fill="url(#energyAreaGrad)"
                  />
                )}

                {/* Curve 3: Inflammation Reduction */}
                <path
                  d={buildSmoothPath(inflammationValues)}
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />

                {/* Curve 2: Sleep Quality */}
                <path
                  d={buildSmoothPath(sleepValues)}
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.75"
                />

                {/* Curve 1: Daily Energy */}
                <path
                  d={buildSmoothPath(energyValues)}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3.25"
                />

                {/* Data Points & X Axis Labels */}
                {projection.map((pt, idx) => {
                  const x = getX(idx, projection.length);
                  const yEnergy = getY(pt.energyScore);
                  const ySleep = getY(pt.sleepQuality);
                  const yInflam = getY(pt.inflammationReduction);

                  return (
                    <g key={pt.week}>
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={padTop + innerHeight}
                        stroke="#F8FAFC"
                        strokeWidth="1"
                      />
                      <circle
                        cx={x}
                        cy={yInflam}
                        r={3.5}
                        fill="#FFFFFF"
                        stroke="#4ADE80"
                        strokeWidth="2"
                      />
                      <circle
                        cx={x}
                        cy={ySleep}
                        r={3.5}
                        fill="#FFFFFF"
                        stroke="#0D9488"
                        strokeWidth="2"
                      />
                      <circle
                        cx={x}
                        cy={yEnergy}
                        r={4.5}
                        fill="#16A34A"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <text
                        x={x}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        className="text-[11px] fill-slate-500 font-mono"
                      >
                        {pt.weekLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>
                  En la <strong>Semana {weeks}</strong> con <strong>{adherence}%</strong> de adherencia, tu vitalidad combinada alcanza el <strong>{finalPoint.compositeVitality}%</strong>.
                </span>
              </p>
              <span className="text-slate-400 font-mono tabular-nums">
                Modelo NutriVital Bio-Adaptativo
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
