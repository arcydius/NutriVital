import React, { useEffect, useMemo, useState } from 'react';
import { Sliders, Sparkles, Activity, Scale, Zap, AlertCircle, FileText, ArrowUpRight, LogIn } from 'lucide-react';
import { ClientUser, MedicalReportRecord } from '../types/nutrivital';
import { AVAILABLE_SUPPLEMENTS } from '../data/seedData';
import {
  calculateAge,
  calculateBMI,
  calculateOverallVitalityScore,
  calculateProjectedImpact,
  calculateWHtR,
} from '../utils/healthAnalytics';

interface WellnessSimulatorProps {
  currentClient?: ClientUser | null;
  activeSupplementIds?: string[];
  simulatedCalories?: number;
  medicalReports?: MedicalReportRecord[];
  onRequireLogin?: () => void;
}

interface AdherencePoint {
  week: number;
  weekLabel: string;
  bpAlignmentScore: number; // 0..100 qué tan cerca está de la meta de PA
  vitalityScore: number; // 0..100 score real de vitalidad
  metabolicProtectionScore: number; // 0..100 (100 - riesgo hepático/metabólico)
  projectedSystolic: number;
  projectedDiastolic: number;
  projectedWeight: number;
  goalCompletionIndex: number;
}

export const WellnessSimulator: React.FC<WellnessSimulatorProps> = ({
  currentClient = null,
  activeSupplementIds = [],
  simulatedCalories,
  medicalReports = [],
  onRequireLogin,
}) => {
  const hasClinicalData = Boolean(
    currentClient &&
      currentClient.biometrics &&
      currentClient.goals &&
      medicalReports.length > 0
  );
  const biometrics = hasClinicalData ? currentClient!.biometrics! : null;
  const goals = hasClinicalData ? currentClient!.goals! : null;
  const clientAge = calculateAge(currentClient?.dateOfBirth);
  const effectiveCalories =
    simulatedCalories && simulatedCalories > 0
      ? simulatedCalories
      : biometrics?.dailyCalories ?? 0;

  const [weeks, setWeeks] = useState<number>(() =>
    Math.max(4, Math.min(12, goals?.timelineWeeks || 8))
  );
  const [adherence, setAdherence] = useState<number>(85);

  // Sincroniza horizonte inicial cuando cambian las metas sugeridas por IA del usuario
  useEffect(() => {
    if (goals?.timelineWeeks) {
      setWeeks(Math.max(4, Math.min(12, goals.timelineWeeks)));
    }
  }, [goals?.timelineWeeks]);

  const selectedSupplements = useMemo(() => {
    const idSet = new Set(activeSupplementIds);
    return AVAILABLE_SUPPLEMENTS.filter((s) => idSet.has(s.id));
  }, [activeSupplementIds]);

  const projection = useMemo<AdherencePoint[]>(() => {
    if (!biometrics || !goals) return [];

    const fullImpact = calculateProjectedImpact(
      biometrics,
      goals,
      selectedSupplements,
      effectiveCalories,
      weeks,
      medicalReports,
      clientAge
    );

    const adherenceFactor = adherence / 100;
    const heightCm = biometrics.height || 170;
    const hasWaist =
      typeof biometrics.waistCircumference === 'number' && biometrics.waistCircumference > 0;
    const waistCm = hasWaist ? biometrics.waistCircumference! : 0;
    const maxAdaptation = 1 - Math.exp(-2.2);
    const supplementBonus = selectedSupplements.reduce(
      (sum, s) => sum + (s.vitalityScoreBonus ?? 0) * 0.55,
      0
    );

    const points: AdherencePoint[] = [];
    for (let w = 1; w <= weeks; w++) {
      const progressRatio = w / weeks;
      const adaptationCurve = (1 - Math.exp(-2.2 * progressRatio)) / maxAdaptation;
      const effectiveFactor = adaptationCurve * adherenceFactor;
      const weightFactor = progressRatio * adherenceFactor;

      const curSys = Number(
        Math.max(90, Math.min(200, biometrics.systolicBP + fullImpact.systolicDelta * effectiveFactor)).toFixed(1)
      );
      const curDia = Number(
        Math.max(55, Math.min(130, biometrics.diastolicBP + fullImpact.diastolicDelta * effectiveFactor)).toFixed(1)
      );
      const curHr = Number(
        Math.max(48, Math.min(130, biometrics.heartRate + fullImpact.heartRateDelta * effectiveFactor)).toFixed(1)
      );
      const curWeight = Number(
        Math.max(40, biometrics.bodyWeight + fullImpact.weightDelta * weightFactor).toFixed(1)
      );
      const curBmi = calculateBMI(curWeight, heightCm) || biometrics.bodyMass;
      const curWaist = hasWaist ? Math.max(40, waistCm + fullImpact.waistDelta * weightFactor) : 0;
      const curWhtr = hasWaist ? calculateWHtR(curWaist, heightCm) : undefined;

      const vitalityScore = calculateOverallVitalityScore(
        curSys,
        curDia,
        curHr,
        curBmi,
        supplementBonus * effectiveFactor,
        curWhtr
      );

      // Alineación arterial (0-100): 100 cuando alcanza o mejora la Meta IA
      const sysOverTarget = Math.max(0, curSys - goals.targetSystolicBP);
      const diaOverTarget = Math.max(0, curDia - goals.targetDiastolicBP);
      const bpAlignmentScore = Math.max(
        20,
        Math.min(100, Math.round(100 - sysOverTarget * 2.8 - diaOverTarget * 2.2))
      );

      // Protección hepática/metabólica (100 - riesgo hepático proyectado)
      const curHepaticRisk = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            fullImpact.baselineHepaticRiskScore +
              (fullImpact.hepaticRiskScore - fullImpact.baselineHepaticRiskScore) * effectiveFactor
          )
        )
      );
      const metabolicProtectionScore = Math.max(10, Math.min(100, 100 - curHepaticRisk));

      const goalCompletionIndex = Math.round(
        bpAlignmentScore * 0.35 + vitalityScore * 0.4 + metabolicProtectionScore * 0.25
      );

      points.push({
        week: w,
        weekLabel: `Sem ${w}`,
        bpAlignmentScore,
        vitalityScore,
        metabolicProtectionScore,
        projectedSystolic: curSys,
        projectedDiastolic: curDia,
        projectedWeight: curWeight,
        goalCompletionIndex,
      });
    }

    return points;
  }, [biometrics, goals, selectedSupplements, effectiveCalories, weeks, adherence, medicalReports, clientAge]);

  if (!hasClinicalData || !biometrics || !goals) {
    return (
      <section
        id="progreso"
        aria-labelledby="wellness-sim-heading"
        className="py-16 bg-[#F0FDF4]/70 border-y border-emerald-100"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-3xl border border-emerald-200/80 shadow-xs p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Simulador de Adherencia · En Espera de Informe Médico</span>
              </span>
              <h2
                id="wellness-sim-heading"
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              >
                Tu Progreso Semanal se activará con tus datos reales
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                No mostramos proyecciones genéricas ni pesos o presiones predefinidas. En cuanto subas tu informe médico completo en <strong>Mi Salud & Biometría</strong>, aquí podrás simular semana a semana cómo tu nivel de constancia te acerca a tus metas orientativas calculadas por IA.
              </p>
            </div>

            {currentClient ? (
              <a
                href="#mi-salud"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('mi-salud')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <span>Ir a Subir Mi Informe Médico</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-200" />
              </a>
            ) : (
              <button
                type="button"
                onClick={onRequireLogin}
                className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <LogIn className="w-4 h-4 text-emerald-200" />
                <span>Iniciar Sesión para Comenzar</span>
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const finalPoint = projection[projection.length - 1] ?? {
    week: 1,
    weekLabel: 'Sem 1',
    bpAlignmentScore: 80,
    vitalityScore: 75,
    metabolicProtectionScore: 85,
    projectedSystolic: biometrics.systolicBP,
    projectedDiastolic: biometrics.diastolicBP,
    projectedWeight: biometrics.bodyWeight,
    goalCompletionIndex: 80,
  };

  const weightChangeTotal = Number((finalPoint.projectedWeight - biometrics.bodyWeight).toFixed(1));
  const sysChangeTotal = Number((finalPoint.projectedSystolic - biometrics.systolicBP).toFixed(1));

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

  const buildPath = (values: number[]) => {
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
    const line = buildPath(values);
    const firstX = getX(0, values.length).toFixed(1);
    const lastX = getX(values.length - 1, values.length).toFixed(1);
    const baselineY = (padTop + innerHeight).toFixed(1);
    return `${line} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  };

  const vitalityValues = projection.map((p) => p.vitalityScore);
  const bpAlignValues = projection.map((p) => p.bpAlignmentScore);
  const metabolicValues = projection.map((p) => p.metabolicProtectionScore);

  return (
    <section
      id="progreso"
      aria-labelledby="wellness-sim-heading"
      className="py-16 bg-[#F0FDF4]/70 border-y border-emerald-100"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-8">
          <p className="text-xs font-semibold text-emerald-800 tracking-wide mb-2">
            Proyección de Adherencia · Conectada a tu Protocolo y Metas IA
          </p>
          <h2
            id="wellness-sim-heading"
            className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight"
          >
            Simula tu Constancia Semana a Semana
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Mientras arriba eliges <strong>qué suplementos y calorías</strong> incluir en tu plan, aquí proyectas cómo responde tu perfil actual (<strong>{currentClient ? currentClient.name : 'Modo Invitado'}</strong> · {selectedSupplements.length} {selectedSupplements.length === 1 ? 'factor activo' : 'factores activos'} · {effectiveCalories} kcal/día) según tu porcentaje real de cumplimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-emerald-100/80 shadow-sm p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-slate-900">
                    Constancia del Plan
                  </h3>
                </div>
                <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-mono font-bold tabular-nums">
                  Avance: {finalPoint.goalCompletionIndex}%
                </span>
              </div>

              {/* Slider 1: Weeks */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label
                    htmlFor="slider-weeks"
                    className="text-sm font-medium text-slate-800"
                  >
                    Horizonte de seguimiento
                  </label>
                  <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                    {weeks} {weeks === 1 ? 'semana' : 'semanas'}
                  </span>
                </div>
                <input
                  id="slider-weeks"
                  name="weeks"
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between gap-2 text-[11px] text-slate-400 font-mono tabular-nums mt-1.5">
                  <span>1 sem · Inicio</span>
                  <span>6 sem · Adapt.</span>
                  <span>12 sem · Óptimo</span>
                </div>
              </div>

              {/* Slider 2: Adherence */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label
                    htmlFor="slider-adherence"
                    className="text-sm font-medium text-slate-800"
                  >
                    Nivel de adherencia real
                  </label>
                  <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                    {adherence}%
                  </span>
                </div>
                <input
                  id="slider-adherence"
                  name="adherence"
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={adherence}
                  onChange={(e) => setAdherence(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between gap-2 text-[11px] text-slate-400 font-mono tabular-nums mt-1.5">
                  <span>50% · Moderado</span>
                  <span>75% · Constante</span>
                  <span>100% · Óptimo</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="pt-1">
                <p className="text-xs font-medium text-slate-500 mb-2.5">
                  Escenarios rápidos de constancia:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWeeks(4);
                      setAdherence(70);
                    }}
                    className={`px-2 py-2 text-[11px] font-semibold text-center leading-tight rounded-lg border transition-colors ${
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
                    className={`px-2 py-2 text-[11px] font-semibold text-center leading-tight rounded-lg border transition-colors ${
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
                    className={`px-2 py-2 text-[11px] font-semibold text-center leading-tight rounded-lg border transition-colors ${
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

            {/* Real Projected Outcome KPIs at Week N & Adherence% */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-emerald-100">
                <div className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                  <Activity className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Presión</span>
                </div>
                <p className="mt-1 text-base font-bold text-slate-900 font-mono tabular-nums">
                  {Math.round(finalPoint.projectedSystolic)}/{Math.round(finalPoint.projectedDiastolic)}
                </p>
                <p className="text-[10px] text-emerald-700 font-mono tabular-nums">
                  {sysChangeTotal <= 0 ? `${sysChangeTotal}` : `+${sysChangeTotal}`} mmHg
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-teal-700 text-[11px] font-semibold">
                  <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Peso</span>
                </div>
                <p className="mt-1 text-base font-bold text-slate-900 font-mono tabular-nums">
                  {finalPoint.projectedWeight} kg
                </p>
                <p className="text-[10px] text-teal-700 font-mono tabular-nums">
                  {weightChangeTotal <= 0 ? `${weightChangeTotal}` : `+${weightChangeTotal}`} kg
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-emerald-800 text-[11px] font-semibold">
                  <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Vitalidad</span>
                </div>
                <p className="mt-1 text-base font-bold text-slate-900 font-mono tabular-nums">
                  {finalPoint.vitalityScore}/100
                </p>
                <p className="text-[10px] text-emerald-800 font-mono tabular-nums">
                  Al {adherence}% plan
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Multi-Curve Chart Connected to Real Model */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-emerald-100/80 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Convergencia hacia tus Metas IA (Semanas 1 a {weeks})
                </h3>
                <p className="text-xs text-slate-500">
                  Calculado en vivo con tu perfil actual y {adherence}% de adherencia
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#16A34A]" />
                  Vitalidad Celular
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#0D9488]" />
                  Alineación Presión Arterial
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-[#4ADE80]" />
                  Protección Hepática/Metab.
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[520px]"
                role="img"
                aria-label={`Gráfica de convergencia hacia metas IA para ${weeks} semanas con ${adherence}% de adherencia`}
              >
                <defs>
                  <linearGradient id="vitalityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

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

                {projection.length > 1 && (
                  <path d={buildAreaPath(vitalityValues)} fill="url(#vitalityAreaGrad)" />
                )}

                <path
                  d={buildPath(metabolicValues)}
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />

                <path
                  d={buildPath(bpAlignValues)}
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.75"
                />

                <path
                  d={buildPath(vitalityValues)}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3.25"
                />

                {projection.map((pt, idx) => {
                  const x = getX(idx, projection.length);
                  const yVit = getY(pt.vitalityScore);
                  const yBp = getY(pt.bpAlignmentScore);
                  const yMet = getY(pt.metabolicProtectionScore);

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
                      <circle cx={x} cy={yMet} r={3.5} fill="#FFFFFF" stroke="#4ADE80" strokeWidth="2" />
                      <circle cx={x} cy={yBp} r={3.5} fill="#FFFFFF" stroke="#0D9488" strokeWidth="2" />
                      <circle cx={x} cy={yVit} r={4.5} fill="#16A34A" stroke="#FFFFFF" strokeWidth="1.5" />
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

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>
                    En <strong>Semana {weeks}</strong> al <strong>{adherence}%</strong> de constancia, tu índice de avance hacia las Metas IA alcanza el <strong>{finalPoint.goalCompletionIndex}%</strong>.
                  </span>
                </p>
                <span className="text-slate-400 font-mono tabular-nums shrink-0">
                  Modelo Bio-Adaptativo Conectado
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                <span>Simulación orientativa asistida por IA. Los resultados reales varían según cada persona y no reemplazan seguimiento médico.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
