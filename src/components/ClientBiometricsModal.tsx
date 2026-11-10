import React, { useEffect, useState } from 'react';
import {
  Activity,
  Heart,
  Scale,
  Target,
  User,
  X,
  Check,
  Flame,
  Zap,
  Lock,
  Ruler,
  AlertTriangle,
} from 'lucide-react';
import {
  ClientBiometrics,
  ClientHealthGoals,
  ClientUser,
} from '../types/nutrivital';
import { getBloodPressureCategory } from '../utils/healthAnalytics';

interface ClientBiometricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: ClientUser;
  allClients: ClientUser[];
  onUpdateBiometrics: (
    clientId: string,
    biometrics: ClientBiometrics,
    goals: ClientHealthGoals
  ) => void;
  onSelectClient?: (client: ClientUser) => void;
}

export const ClientBiometricsModal: React.FC<ClientBiometricsModalProps> = ({
  isOpen,
  onClose,
  currentClient,
  allClients,
  onUpdateBiometrics,
  onSelectClient,
}) => {
  // Biometrics Form State (Permite string vacío '' para evitar el cero inicial al borrar/sombrear)
  const [systolic, setSystolic] = useState<number | string>(currentClient.biometrics.systolicBP);
  const [diastolic, setDiastolic] = useState<number | string>(currentClient.biometrics.diastolicBP);
  const [heartRate, setHeartRate] = useState<number | string>(currentClient.biometrics.heartRate);
  const [bodyWeight, setBodyWeight] = useState<number | string>(currentClient.biometrics.bodyWeight);
  const [dailyCalories, setDailyCalories] = useState<number | string>(currentClient.biometrics.dailyCalories);
  const [height, setHeight] = useState<number | string>(currentClient.biometrics.height || 170);
  const [waist, setWaist] = useState<number | string>(currentClient.biometrics.waistCircumference || 80);

  // Goals Form State
  const [targetSystolic, setTargetSystolic] = useState<number | string>(currentClient.goals.targetSystolicBP);
  const [targetDiastolic, setTargetDiastolic] = useState<number | string>(currentClient.goals.targetDiastolicBP);
  const [targetHeartRate, setTargetHeartRate] = useState<number | string>(currentClient.goals.targetHeartRate);
  const [targetWeight, setTargetWeight] = useState<number | string>(currentClient.goals.targetWeight);
  const [targetBodyMass, setTargetBodyMass] = useState<number | string>(currentClient.goals.targetBodyMass);
  const [targetCalories, setTargetCalories] = useState<number | string>(currentClient.goals.targetCalories);
  const [timelineWeeks, setTimelineWeeks] = useState<number>(currentClient.goals.timelineWeeks || 8);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Valores numéricos limpios para cálculos fisiológicos en tiempo real
  const numWeight = Number(bodyWeight) || 0;
  const numHeight = Number(height) || 0;
  const numWaist = Number(waist) || 0;
  const numSystolic = Number(systolic) || 0;
  const numDiastolic = Number(diastolic) || 0;

  // 1. Cálculo en tiempo real del IMC Actual (kg/m²)
  const calculatedBmi =
    numHeight > 0 && numWeight > 0
      ? Number((numWeight / ((numHeight / 100) ** 2)).toFixed(1))
      : 0;

  // 2. Cálculo en tiempo real de la relación Cintura-Estatura (WHtR = cintura / altura)
  const calculatedWhtr =
    numHeight > 0 && numWaist > 0 ? Number((numWaist / numHeight).toFixed(2)) : 0;

  // Clasificación diagnóstica de IMC
  const getBmiCategory = (bmi: number): { label: string; style: string } => {
    if (bmi <= 0) return { label: 'Sin datos', style: 'bg-slate-100 text-slate-600' };
    if (bmi < 18.5) return { label: 'Bajo peso', style: 'bg-amber-100 text-amber-900' };
    if (bmi < 25.0) return { label: 'Peso normal', style: 'bg-emerald-100 text-emerald-900' };
    if (bmi < 30.0) return { label: 'Sobrepeso', style: 'bg-amber-100 text-amber-900' };
    return { label: 'Obesidad', style: 'bg-rose-100 text-rose-900' };
  };

  // Clasificación diagnóstica de Cintura / WHtR en tiempo real
  const getWhtrCategory = (whtr: number): { label: string; style: string; isHighRisk: boolean } => {
    if (whtr <= 0) return { label: 'Sin datos', style: 'bg-slate-100 text-slate-600', isHighRisk: false };
    if (whtr < 0.40) return { label: 'Cintura Delgada', style: 'bg-sky-100 text-sky-900', isHighRisk: false };
    if (whtr <= 0.50) return { label: 'Cintura Óptima', style: 'bg-emerald-100 text-emerald-900', isHighRisk: false };
    if (whtr <= 0.60) return { label: 'Riesgo Visceral Elevado', style: 'bg-amber-100 text-amber-900', isHighRisk: true };
    return { label: 'Riesgo Visceral Muy Alto', style: 'bg-rose-100 text-rose-900', isHighRisk: true };
  };

  const bmiCategory = getBmiCategory(calculatedBmi);
  const whtrCategory = getWhtrCategory(calculatedWhtr);

  // Helper para manejar cambios en inputs numéricos evitando el cero inicial
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number | string>>
  ) => {
    const val = e.target.value;
    if (val === '') {
      setter('');
    } else {
      const parsed = Number(val);
      setter(isNaN(parsed) ? '' : parsed);
    }
  };

  // Synchronize when currentClient or isOpen changes
  useEffect(() => {
    if (currentClient) {
      setSystolic(currentClient.biometrics.systolicBP);
      setDiastolic(currentClient.biometrics.diastolicBP);
      setHeartRate(currentClient.biometrics.heartRate);
      setBodyWeight(currentClient.biometrics.bodyWeight);
      setDailyCalories(currentClient.biometrics.dailyCalories);
      setHeight(currentClient.biometrics.height || 170);
      setWaist(currentClient.biometrics.waistCircumference || 80);

      setTargetSystolic(currentClient.goals.targetSystolicBP);
      setTargetDiastolic(currentClient.goals.targetDiastolicBP);
      setTargetHeartRate(currentClient.goals.targetHeartRate);
      setTargetWeight(currentClient.goals.targetWeight);
      setTargetBodyMass(currentClient.goals.targetBodyMass);
      setTargetCalories(currentClient.goals.targetCalories);
      setTimelineWeeks(currentClient.goals.timelineWeeks || 8);
    }
  }, [currentClient, isOpen]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bpCategory = getBloodPressureCategory(numSystolic, numDiastolic);

  const handleSaveBiometrics = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBiometrics: ClientBiometrics = {
      systolicBP: Number(systolic) || currentClient.biometrics.systolicBP,
      diastolicBP: Number(diastolic) || currentClient.biometrics.diastolicBP,
      heartRate: Number(heartRate) || currentClient.biometrics.heartRate,
      bodyWeight: Number(bodyWeight) || currentClient.biometrics.bodyWeight,
      bodyMass: calculatedBmi,
      dailyCalories: Number(dailyCalories) || currentClient.biometrics.dailyCalories,
      height: Number(height) || currentClient.biometrics.height || 170,
      waistCircumference: Number(waist) || currentClient.biometrics.waistCircumference || 80,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    const updatedGoals: ClientHealthGoals = {
      targetSystolicBP: Number(targetSystolic) || currentClient.goals.targetSystolicBP,
      targetDiastolicBP: Number(targetDiastolic) || currentClient.goals.targetDiastolicBP,
      targetHeartRate: Number(targetHeartRate) || currentClient.goals.targetHeartRate,
      targetWeight: Number(targetWeight) || currentClient.goals.targetWeight,
      targetBodyMass: Number(targetBodyMass) || currentClient.goals.targetBodyMass,
      targetCalories: Number(targetCalories) || currentClient.goals.targetCalories,
      timelineWeeks: Number(timelineWeeks) || currentClient.goals.timelineWeeks || 8,
    };

    onUpdateBiometrics(currentClient.id, updatedBiometrics, updatedGoals);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometrics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Activity className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 id="biometrics-modal-title" className="text-lg font-bold">
                Actualizar Datos Biométricos & Metas
              </h2>
              <p className="text-xs text-emerald-100">
                Perfil de Salud de {currentClient.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <form onSubmit={handleSaveBiometrics} className="space-y-6">
            {/* Quick Profile Switcher (Demo presets) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cargar perfil clínico de prueba:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {allClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectClient && onSelectClient(c)}
                    className={`p-2.5 text-left rounded-xl border text-xs transition-all ${currentClient.id === c.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                      }`}
                  >
                    <div className="font-bold truncate">{c.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.biometrics.systolicBP}/{c.biometrics.diastolicBP} mmHg · {c.biometrics.heartRate} lpm
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      {c.biometrics.bodyWeight} kg · Cintura: {c.biometrics.waistCircumference || 80} cm
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostic Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div>
                <span className="text-xs font-medium text-emerald-800">
                  Diagnóstico Clínico Actual:
                </span>
                <div className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2 mt-1">
                  <span>PA: {systolic || 0}/{diastolic || 0}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${bpCategory === 'Óptima' || bpCategory === 'Normal' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                    {bpCategory}
                  </span>

                  <span className="text-slate-300">·</span>

                  <span>IMC: {calculatedBmi}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${bmiCategory.style}`}>
                    {bmiCategory.label}
                  </span>

                  <span className="text-slate-300">·</span>

                  <span>Cintura: {waist || 0} cm</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold transition-all ${whtrCategory.style}`}>
                    {whtrCategory.label} ({calculatedWhtr})
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span>Última calibración: </span>
                <span className="font-mono text-slate-700 font-semibold">
                  {currentClient.biometrics.lastUpdated || 'Hoy'}
                </span>
              </div>
            </div>

            {/* ALERTA CLÍNICA DE CINTURA EN TIEMPO REAL */}
            {whtrCategory.isHighRisk && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-0.5">
                  <span className="font-bold">Advertencia por Riesgo Cardiometabólico Visceral:</span>
                  <p className="text-amber-800 leading-relaxed">
                    Un perímetro de cintura de <strong>{waist || 0} cm</strong> para una altura de <strong>{height || 0} cm</strong> genera una relación Cintura/Estatura de <strong>{calculatedWhtr}</strong> (umbral óptimo: &le; 0.50). Esto sobrecarga la resistencia vascular periférica.
                  </p>
                </div>
              </div>
            )}

            {/* 1. Datos Biométricos Iniciales */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>1. Datos Biométricos Actuales</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Presión Sistólica */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-systolic" className="block text-xs font-semibold text-slate-700">
                    Presión Sistólica (mmHg)
                  </label>
                  <input
                    id="bio-systolic"
                    type="number"
                    min={70}
                    max={220}
                    value={systolic}
                    onChange={(e) => handleInputChange(e, setSystolic)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Rango normal: 110 - 120 mmHg</p>
                </div>

                {/* Presión Diastólica */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-diastolic" className="block text-xs font-semibold text-slate-700">
                    Presión Diastólica (mmHg)
                  </label>
                  <input
                    id="bio-diastolic"
                    type="number"
                    min={40}
                    max={140}
                    value={diastolic}
                    onChange={(e) => handleInputChange(e, setDiastolic)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Rango normal: 70 - 80 mmHg</p>
                </div>

                {/* Frecuencia Cardíaca */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-hr" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Pulsaciones / Latidos (lpm)</span>
                  </label>
                  <input
                    id="bio-hr"
                    type="number"
                    min={40}
                    max={160}
                    value={heartRate}
                    onChange={(e) => handleInputChange(e, setHeartRate)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Reposo óptimo: 60 - 75 lpm</p>
                </div>

                {/* Peso Corporal */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-weight" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Peso Corporal (kg)</span>
                  </label>
                  <input
                    id="bio-weight"
                    type="number"
                    step="0.1"
                    min={30}
                    max={250}
                    value={bodyWeight}
                    onChange={(e) => handleInputChange(e, setBodyWeight)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Peso bruto registrado</p>
                </div>

                {/* Altura / Estatura */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-height" className="block text-xs font-semibold text-slate-700">
                    Altura / Estatura (cm)
                  </label>
                  <input
                    id="bio-height"
                    type="number"
                    min={100}
                    max={230}
                    value={height}
                    onChange={(e) => handleInputChange(e, setHeight)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Factor base para IMC y WHtR</p>
                </div>

                {/* Perímetro de Cintura */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-waist" className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Perímetro Cintura (cm)</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${whtrCategory.style}`}>
                      {whtrCategory.label}
                    </span>
                  </label>
                  <input
                    id="bio-waist"
                    type="number"
                    min={50}
                    max={200}
                    value={waist}
                    onChange={(e) => handleInputChange(e, setWaist)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">
                    Relación Cintura/Altura: <span className="font-mono font-bold text-slate-800">{calculatedWhtr}</span>
                  </p>
                </div>

                {/* IMC Actual (Solo lectura) */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1">
                  <label htmlFor="bio-bmi-readonly" className="block text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>IMC Actual (kg/m²)</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-normal text-slate-400">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Auto-calculado</span>
                    </span>
                  </label>
                  <input
                    id="bio-bmi-readonly"
                    type="number"
                    readOnly
                    value={calculatedBmi}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed select-none focus:outline-none"
                  />
                  <p className="text-[10px] text-emerald-700 font-medium">
                    {bmiCategory.label} · Calculado en vivo con Peso y Altura
                  </p>
                </div>

                {/* Dieta Calórica */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-cal" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>Dieta Calórica Base (kcal/día)</span>
                  </label>
                  <input
                    id="bio-cal"
                    type="number"
                    step="50"
                    min={1000}
                    max={5000}
                    value={dailyCalories}
                    onChange={(e) => handleInputChange(e, setDailyCalories)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Ingesta energética base</p>
                </div>
              </div>
            </div>

            {/* 2. Metas de Salud */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>2. Metas de Salud & Objetivos</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <label htmlFor="goal-sys" className="block text-xs font-semibold text-emerald-900">
                    Meta Sistólica (mmHg)
                  </label>
                  <input
                    id="goal-sys"
                    type="number"
                    min={90}
                    max={180}
                    value={targetSystolic}
                    onChange={(e) => handleInputChange(e, setTargetSystolic)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700">Objetivo: &lt;120 mmHg</p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <label htmlFor="goal-dia" className="block text-xs font-semibold text-emerald-900">
                    Meta Diastólica (mmHg)
                  </label>
                  <input
                    id="goal-dia"
                    type="number"
                    min={50}
                    max={110}
                    value={targetDiastolic}
                    onChange={(e) => handleInputChange(e, setTargetDiastolic)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700">Objetivo: &lt;80 mmHg</p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <label htmlFor="goal-pulse" className="block text-xs font-semibold text-emerald-900">
                    Meta Pulsaciones (lpm)
                  </label>
                  <input
                    id="goal-pulse"
                    type="number"
                    min={50}
                    max={120}
                    value={targetHeartRate}
                    onChange={(e) => handleInputChange(e, setTargetHeartRate)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700">Objetivo: 60 - 72 lpm</p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <label htmlFor="goal-w" className="block text-xs font-semibold text-emerald-900">
                    Meta de Peso (kg)
                  </label>
                  <input
                    id="goal-w"
                    type="number"
                    step="0.5"
                    min={40}
                    max={200}
                    value={targetWeight}
                    onChange={(e) => handleInputChange(e, setTargetWeight)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700">Peso objetivo</p>
                </div>

                {/* IMC META (EDITABLE) */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1 ring-1 ring-emerald-500/20">
                  <label htmlFor="goal-m" className="block text-xs font-bold text-emerald-950 flex items-center justify-between">
                    <span>Meta Masa Corporal / IMC Meta</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </label>
                  <input
                    id="goal-m"
                    type="number"
                    step="0.1"
                    min={15}
                    max={50}
                    value={targetBodyMass}
                    onChange={(e) => handleInputChange(e, setTargetBodyMass)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-800">
                    Ingresa manualmente tu IMC objetivo (ej. 22.5)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                  <label htmlFor="goal-c" className="block text-xs font-semibold text-emerald-900">
                    Meta Calórica (kcal/día)
                  </label>
                  <input
                    id="goal-c"
                    type="number"
                    step="50"
                    min={1200}
                    max={4000}
                    value={targetCalories}
                    onChange={(e) => handleInputChange(e, setTargetCalories)}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700">Balance calórico meta</p>
                </div>
              </div>
            </div>

            {/* Horizonte Temporal */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="timeline-weeks-edit" className="text-xs font-bold text-slate-800">
                  Horizonte Temporal de Proyección de Metas:
                </label>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {timelineWeeks} semanas
                </span>
              </div>
              <input
                id="timeline-weeks-edit"
                type="range"
                min={4}
                max={16}
                step={2}
                value={timelineWeeks}
                onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>4 sem (Corto)</span>
                <span>8 sem (Estándar clínico)</span>
                <span>16 sem (Transformación)</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>¡Datos guardados con éxito!</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  Los cambios actualizan de inmediato tus gráficas dinámicas.
                </span>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Recalcular</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};