import React, { useState } from 'react';
import {
  Activity,
  Flame,
  Heart,
  Plus,
  Check,
  Scale,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Ruler,
} from 'lucide-react';
import {
  ClientBiometrics,
  ClientHealthGoals,
  NutritionRecommendation,
  Product,
  ProjectedImpactSummary,
  SupplementCategory,
  SupplementItem,
} from '../types/nutrivital';
import {
  calculateBMI,
  calculateWHtR,
  getWHtRStatus,
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
}

export const SupplementAnalysisEngine: React.FC<SupplementAnalysisEngineProps> = ({
  biometrics,
  goals,
  activeSupplementIds,
  onToggleSupplement,
  simulatedCalories,
  impactSummary,
  recommendations,
  onApplyCalorieDelta,
  onAddToCart,
  allProducts,
  availableSupplements,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [expandedMechanismId, setExpandedMechanismId] = useState<string | null>(null);

  const categories: (string | SupplementCategory)[] = [
    'Todos',
    'Cardiovascular',
    'Metabolismo',
    'Adaptógenos',
    'Vitalidad Celular',
    'Micronutrientes',
  ];

  const filteredSupplements = availableSupplements.filter(
    (s) => selectedCategory === 'Todos' || s.category === selectedCategory
  );

  const activeSet = new Set(activeSupplementIds);

  // Datos biométricos proyectados
  const heightCm = biometrics.height || 170;
  const currentWaistCm = biometrics.waistCircumference || 80;

  const projectedSystolic = Math.round(biometrics.systolicBP + impactSummary.systolicDelta);
  const projectedDiastolic = Math.round(biometrics.diastolicBP + impactSummary.diastolicDelta);
  const projectedHr = Math.round(biometrics.heartRate + impactSummary.heartRateDelta);
  const projectedWeight = Number((biometrics.bodyWeight + impactSummary.weightDelta).toFixed(1));

  // IMC Real en tiempo real
  const projectedBmi = calculateBMI(projectedWeight, heightCm);

  // Cintura proyectada en tiempo real
  const waistDelta = impactSummary.waistDelta ?? impactSummary.weightDelta;
  const projectedWaist = Number(Math.max(40, currentWaistCm + waistDelta).toFixed(1));
  const projectedWhtr = calculateWHtR(projectedWaist, heightCm);
  const whtrStatus = impactSummary.whtrStatus || getWHtRStatus(projectedWhtr);

  return (
    <div className="space-y-8">
      {/* 1. TARJETAS DE IMPACTO PROYECTADO EN TIEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Presión Arterial */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-500" />
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

          <div className="my-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {projectedSystolic} / {projectedDiastolic}
              <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inicial: <span className="font-mono">{biometrics.systolicBP}/{biometrics.diastolicBP}</span> · Meta:{' '}
              <span className="font-mono font-medium text-emerald-700">
                {goals.targetSystolicBP}/{goals.targetDiastolicBP}
              </span>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Variación neta:</span>
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>Ritmo Cardíaco</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              Reposo
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {projectedHr}
              <span className="text-xs font-normal text-slate-400 ml-1">lpm</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inicial: <span className="font-mono">{biometrics.heartRate}</span> · Meta:{' '}
              <span className="font-mono font-medium text-emerald-700">{goals.targetHeartRate} lpm</span>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Variación neta:</span>
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Composición & Cintura</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800">
              {whtrStatus.split(' ')[0]}
            </span>
          </div>

          <div className="my-3 space-y-1">
            <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight flex items-baseline justify-between">
              <span>
                {projectedWeight} <span className="text-xs font-normal text-slate-400">kg</span>
              </span>
              <span className="text-sm font-bold text-amber-700 font-mono">
                IMC: {projectedBmi}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-600 pt-0.5">
              <span className="flex items-center gap-1 text-slate-500">
                <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cintura:</span>
              </span>
              <span className="font-bold text-slate-900">
                {projectedWaist} cm <span className="text-[10px] text-slate-400">({projectedWhtr} WHtR)</span>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Cambio en Cintura:</span>
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
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-5 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>Vitalidad Celular</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/15 text-emerald-100">
              Score Global
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {impactSummary.vitalityScore}
              <span className="text-xs font-normal text-emerald-200 ml-1">/ 100</span>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              {activeSupplementIds.length} suplementos activos en plan
            </p>
          </div>

          <div className="pt-2 border-t border-emerald-700/60 flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-200">Mejora acumulada:</span>
            <span className="font-bold text-[#86EFAC]">
              +{impactSummary.vitalityDelta > 0 ? impactSummary.vitalityDelta : 0} pts
            </span>
          </div>
        </div>
      </div>

      {/* 2. SIMULACIÓN DE SUPLEMENTOS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Simulación de Suplementos Vitamínicos & Funcionales</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Activa o desactiva suplementos para observar inmediatamente el impacto proyectado en tus biomarcadores.
            </p>
          </div>

          <span className="text-xs text-slate-600 font-mono">
            {activeSupplementIds.length} de {availableSupplements.length} activos
          </span>
        </div>

        {/* Filtro por Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${selectedCategory === cat
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Suplementos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSupplements.map((supp) => {
            const isActive = activeSet.has(supp.id);
            const isExpanded = expandedMechanismId === supp.id;
            const matchingProduct = supp.matchingProductId
              ? allProducts.find((p) => p.id === supp.matchingProductId)
              : null;

            return (
              <div
                key={supp.id}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${isActive
                  ? 'bg-emerald-50/50 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        {supp.category} · {supp.tag}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                        {supp.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Dosis diaria: {supp.dailyDose}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleSupplement(supp.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${isActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-700'
                        }`}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Probar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg ${supp.systolicEffect < 0
                        ? 'bg-emerald-100 text-emerald-900'
                        : supp.systolicEffect > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                      {supp.systolicEffect < 0
                        ? `▼ ${supp.systolicEffect} mmHg Presión`
                        : supp.systolicEffect > 0
                          ? `▲ +${supp.systolicEffect} mmHg`
                          : '0 mmHg Presión'}
                    </span>

                    {supp.heartRateEffect !== 0 && (
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg ${supp.heartRateEffect < 0
                          ? 'bg-teal-100 text-teal-900'
                          : 'bg-rose-100 text-rose-900'
                          }`}
                      >
                        {supp.heartRateEffect < 0
                          ? `▼ ${supp.heartRateEffect} lpm`
                          : `▲ +${supp.heartRateEffect} lpm`}
                      </span>
                    )}

                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900">
                      ★ +{supp.vitalityScoreBonus} Vitalidad
                    </span>

                    {supp.caloricBurnBonus && (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-900 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-600" />
                        <span>+{supp.caloricBurnBonus} kcal/día</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mt-3">
                    {supp.description}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMechanismId(isExpanded ? null : supp.id)
                    }
                    className="text-[11px] text-emerald-700 font-semibold hover:text-emerald-800 mt-2 flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Ocultar evidencia científica' : 'Ver mecanismo farmacológico'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-100/80 text-[11px] text-slate-700 leading-relaxed border border-slate-200">
                      <span className="font-bold text-slate-900">Mecanismo biomolecular: </span>
                      {supp.scientificMechanism}
                    </div>
                  )}
                </div>

                {matchingProduct && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">
                      {matchingProduct.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddToCart && onAddToCart(matchingProduct)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <span>Añadir a Carrito (${matchingProduct.price.toFixed(2)})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MOTOR DE RECOMENDACIONES CLÍNICAS */}
      <div className="bg-gradient-to-b from-[#F0FDF4]/90 via-white to-white rounded-3xl border border-emerald-200/90 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Motor de IA & Reglas Clínicas NutriVital
              </h3>
              <p className="text-xs text-slate-600">
                Análisis diagnóstico personalizado basado en tus biomarcadores y metas.
              </p>
            </div>
          </div>

          <span className="text-xs bg-emerald-100/80 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full font-mono font-semibold">
            {recommendations.length} recomendaciones activas
          </span>
        </div>

        <div className="space-y-3.5">
          {recommendations.map((rec) => {
            const relatedProduct = rec.relatedProductId
              ? allProducts.find((p) => p.id === rec.relatedProductId)
              : null;

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
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${cardBg}`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badgeStyle}`}
                    >
                      {rec.urgency}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {rec.message}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {rec.suggestedCalorieDelta && (
                    <button
                      type="button"
                      onClick={() => onApplyCalorieDelta(rec.suggestedCalorieDelta!)}
                      className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      Ajustar {rec.suggestedCalorieDelta > 0 ? `+${rec.suggestedCalorieDelta}` : rec.suggestedCalorieDelta} kcal
                    </button>
                  )}

                  {relatedProduct && onAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(relatedProduct)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{relatedProduct.name.split(' ')[0]} (${relatedProduct.price.toFixed(2)})</span>
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