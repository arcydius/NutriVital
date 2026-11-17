import React, { useEffect, useRef, useState } from 'react';
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
  FileText,
  Upload,
  Sparkles,
  Trash2,
  ShieldAlert,
  FlaskConical,
  Loader2,
  Download,
  Lock,
} from 'lucide-react';
import {
  ClientBiometrics,
  ClientHealthGoals,
  ClientUser,
  FattyLiverGrade,
  Gender,
  MedicalReportRecord,
} from '../types/nutrivital';
import {
  calculateAge,
  getBloodPressureCategory,
  getMedicalMetricRange,
} from '../utils/healthAnalytics';
import { analyzeMedicalReportFile } from '../utils/medicalReportAnalyzer';
import {
  downloadMedicalReportPdf,
  downloadMedicalReportTxt,
} from '../utils/reportExporter';

interface ClientBiometricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: ClientUser;
  allClients: ClientUser[];
  onUpdateBiometrics: (
    clientId: string,
    biometrics: ClientBiometrics,
    goals: ClientHealthGoals,
    medicalReports?: MedicalReportRecord[],
    dateOfBirth?: string,
    gender?: Gender
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
  // Profile Expansion State (DOB & Gender)
  const [dateOfBirth, setDateOfBirth] = useState<string>(currentClient.dateOfBirth || '');
  const [gender, setGender] = useState<Gender>(currentClient.gender || 'Femenino');

  // Biometrics Form State (includes Fatty Liver)
  const [systolic, setSystolic] = useState<number>(currentClient.biometrics.systolicBP);
  const [diastolic, setDiastolic] = useState<number>(currentClient.biometrics.diastolicBP);
  const [heartRate, setHeartRate] = useState<number>(currentClient.biometrics.heartRate);
  const [bodyWeight, setBodyWeight] = useState<number>(currentClient.biometrics.bodyWeight);
  const [bodyMass, setBodyMass] = useState<number>(currentClient.biometrics.bodyMass);
  const [dailyCalories, setDailyCalories] = useState<number>(currentClient.biometrics.dailyCalories);
  const [height, setHeight] = useState<number>(currentClient.biometrics.height || 170);
  const [waist, setWaist] = useState<number>(currentClient.biometrics.waistCircumference || 80);
  const [fattyLiverGrade, setFattyLiverGrade] = useState<FattyLiverGrade>(currentClient.biometrics.fattyLiverGrade ?? 0);

  // Goals Form State (Read-only for clients: "El usuario no puede poner metas")
  const targetSystolic = currentClient.goals.targetSystolicBP;
  const targetDiastolic = currentClient.goals.targetDiastolicBP;
  const targetHeartRate = currentClient.goals.targetHeartRate;
  const targetWeight = currentClient.goals.targetWeight;
  const targetBodyMass = currentClient.goals.targetBodyMass;
  const targetCalories = currentClient.goals.targetCalories;
  const timelineWeeks = currentClient.goals.timelineWeeks || 8;

  // Medical Reports State
  const [reports, setReports] = useState<MedicalReportRecord[]>(currentClient.medicalReports || []);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (currentClient) {
      setDateOfBirth(currentClient.dateOfBirth || '');
      setGender(currentClient.gender || 'Femenino');
      setSystolic(currentClient.biometrics.systolicBP);
      setDiastolic(currentClient.biometrics.diastolicBP);
      setHeartRate(currentClient.biometrics.heartRate);
      setBodyWeight(currentClient.biometrics.bodyWeight);
      setBodyMass(currentClient.biometrics.bodyMass);
      setDailyCalories(currentClient.biometrics.dailyCalories);
      setHeight(currentClient.biometrics.height || 170);
      setWaist(currentClient.biometrics.waistCircumference || 80);
      setFattyLiverGrade(currentClient.biometrics.fattyLiverGrade ?? 0);
      setReports(currentClient.medicalReports || []);
      setReportError(null);
    }
  }, [currentClient, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  const clientAge = calculateAge(dateOfBirth);
  const bpCategory = getBloodPressureCategory(systolic, diastolic, clientAge);

  const sysRange = getMedicalMetricRange('systolic', systolic, clientAge);
  const diaRange = getMedicalMetricRange('diastolic', diastolic);
  const hrRange = getMedicalMetricRange('heartRate', heartRate);
  const bmiRange = getMedicalMetricRange('bmi', bodyMass);
  const fattyRange = getMedicalMetricRange('fattyLiver', fattyLiverGrade);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReportError(null);
    setIsAnalyzingReport(true);
    try {
      const analyzed = await analyzeMedicalReportFile(file);
      setReports((prev) => [analyzed, ...prev]);

      // Si el informe detecta presión arterial, pulsaciones o esteatosis nuevas, actualizar campos
      if (analyzed.detectedSystolicBP) setSystolic(analyzed.detectedSystolicBP);
      if (analyzed.detectedDiastolicBP) setDiastolic(analyzed.detectedDiastolicBP);
      if (analyzed.detectedHeartRate) setHeartRate(analyzed.detectedHeartRate);
      if (analyzed.markers.fattyLiverGrade !== undefined) {
        setFattyLiverGrade(analyzed.markers.fattyLiverGrade);
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Error al procesar el informe médico.');
    } finally {
      setIsAnalyzingReport(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleReport = async (sampleType: 'lipidico' | 'renal') => {
    const dummyName =
      sampleType === 'lipidico'
        ? 'Analitica_Lipidica_Glucosa_2026.pdf'
        : 'Chequeo_Renal_Potasio_2026.pdf';
    const dummyFile = new File(['demo'], dummyName, { type: 'application/pdf' });
    setReportError(null);
    setIsAnalyzingReport(true);
    try {
      const analyzed = await analyzeMedicalReportFile(dummyFile);
      setReports((prev) => [analyzed, ...prev]);
    } finally {
      setIsAnalyzingReport(false);
    }
  };

  const handleRemoveReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleSaveBiometrics = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedBiometrics: ClientBiometrics = {
      systolicBP: Number(systolic),
      diastolicBP: Number(diastolic),
      heartRate: Number(heartRate),
      bodyWeight: Number(bodyWeight),
      bodyMass: Number(bodyMass),
      dailyCalories: Number(dailyCalories),
      height: Number(height),
      waistCircumference: Number(waist),
      fattyLiverGrade: Number(fattyLiverGrade) as FattyLiverGrade,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    onUpdateBiometrics(
      currentClient.id,
      updatedBiometrics,
      currentClient.goals,
      reports,
      dateOfBirth,
      gender
    );
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 850);
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
                Perfil Clínico, Analíticas & Metas
              </h2>
              <p className="text-xs text-emerald-100">
                Expediente de {currentClient.name} {clientAge !== undefined ? `· ${clientAge} años` : ''} ({gender})
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
            {/* Quick Profile Switcher */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cargar perfil clínico de prueba:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {allClients.map((c) => {
                  const cAge = calculateAge(c.dateOfBirth);
                  return (
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
                        {cAge !== undefined ? `${cAge} años` : 'Edad N/D'} · {c.biometrics.bodyWeight} kg · Hígado G{c.biometrics.fattyLiverGrade ?? 0}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic Header Badge con Calibración por Edad */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-emerald-800">
                    Diagnóstico de Presión Arterial:
                  </span>
                  {clientAge !== undefined && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                      Evaluado para {clientAge} años ({clientAge >= 65 ? 'Umbral adulto mayor ≥65a' : 'Umbral estándar <65a'})
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <span>
                    {systolic} / {diastolic} mmHg
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${bpCategory === 'Óptima' || bpCategory === 'Normal'
                        ? 'bg-emerald-200 text-emerald-900'
                        : bpCategory === 'Elevada'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                  >
                    {bpCategory}
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

            {/* 0. Datos de Identidad Fisiológica (Fecha de Nacimiento & Género) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Datos Fisiológicos del Paciente</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="user-dob" className="block text-xs font-semibold text-slate-700">
                    Fecha de Nacimiento / Edad
                  </label>
                  <input
                    id="user-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <p className="text-[10px] text-slate-500">
                    {clientAge !== undefined
                      ? `Edad calculada: ${clientAge} años (calibra umbrales de presión arterial)`
                      : 'Indica tu fecha de nacimiento para evaluar rangos de presión normal.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="user-gender" className="block text-xs font-semibold text-slate-700">
                    Género / Sexo Biológico
                  </label>
                  <select
                    id="user-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <p className="text-[10px] text-slate-500">Calibración metabólica y referencia antropométrica</p>
                </div>
              </div>
            </div>

            {/* 1. Datos Biométricos Iniciales con Marcadores de Color */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>1. Datos Biométricos Actuales (Indicadores Clínicos por Color)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Presión Sistólica */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor="bio-systolic" className="block text-xs font-semibold text-slate-700">
                      Sistólica (mmHg)
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${sysRange.badgeClass}`}>
                      {sysRange.label}
                    </span>
                  </div>
                  <input
                    id="bio-systolic"
                    type="number"
                    min={70}
                    max={220}
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Normal: &lt;{clientAge && clientAge >= 65 ? 130 : 120} mmHg</p>
                </div>

                {/* Presión Diastólica */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor="bio-diastolic" className="block text-xs font-semibold text-slate-700">
                      Diastólica (mmHg)
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${diaRange.badgeClass}`}>
                      {diaRange.label}
                    </span>
                  </div>
                  <input
                    id="bio-diastolic"
                    type="number"
                    min={40}
                    max={140}
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Rango normal: 70 - 80 mmHg</p>
                </div>

                {/* Pulsaciones */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor="bio-hr" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Pulsaciones (lpm)</span>
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${hrRange.badgeClass}`}>
                      {hrRange.label}
                    </span>
                  </div>
                  <input
                    id="bio-hr"
                    type="number"
                    min={40}
                    max={160}
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Reposo óptimo: 60 - 80 lpm</p>
                </div>

                {/* Hígado Graso */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor="bio-fatty" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span>Hígado Graso</span>
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${fattyRange.badgeClass}`}>
                      {fattyRange.label}
                    </span>
                  </div>
                  <select
                    id="bio-fatty"
                    value={fattyLiverGrade}
                    onChange={(e) => setFattyLiverGrade(Number(e.target.value) as FattyLiverGrade)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value={0}>Grado 0 - Sano / Sin esteatosis</option>
                    <option value={1}>Grado 1 - Esteatosis Leve</option>
                    <option value={2}>Grado 2 - Esteatosis Moderada</option>
                    <option value={3}>Grado 3 - Esteatosis Severa</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Diagnóstico ecográfico o analítico</p>
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
                    onChange={(e) => setBodyWeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Peso bruto registrado</p>
                </div>

                {/* Estatura */}
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
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Para cálculo exacto de IMC</p>
                </div>

                {/* Cintura */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <label htmlFor="bio-waist" className="block text-xs font-semibold text-slate-700">
                    Perímetro de Cintura (cm)
                  </label>
                  <input
                    id="bio-waist"
                    type="number"
                    min={50}
                    max={200}
                    value={waist}
                    onChange={(e) => setWaist(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Indicador de grasa visceral</p>
                </div>

                {/* Masa Corporal / IMC */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label htmlFor="bio-mass" className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>IMC / Masa (kg/m²)</span>
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${bmiRange.badgeClass}`}>
                      {bmiRange.label}
                    </span>
                  </div>
                  <input
                    id="bio-mass"
                    type="number"
                    step="0.1"
                    min={10}
                    max={60}
                    value={bodyMass}
                    onChange={(e) => setBodyMass(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Normopeso: 18.5 - 24.9</p>
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
                    onChange={(e) => setDailyCalories(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Ingesta energética base</p>
                </div>
              </div>
            </div>

            {/* 2. Metas de Salud (Solo Lectura: El usuario no puede poner metas) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>2. Metas de Salud & Objetivos Clínicos</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Lock className="w-3 h-3" />
                  <span>Solo Administrador</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 mb-3">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Protocolo Clínico NutriVital (Modo Solo Lectura):</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    El usuario no puede establecer ni modificar metas de salud personales. Tus objetivos terapéuticos han sido calibrados por el equipo nutricional y solo pueden ser actualizados desde el <strong>Portal Administrador</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-sys" className="block text-xs font-semibold text-slate-600">
                    Meta Sistólica (mmHg)
                  </label>
                  <input
                    id="goal-sys"
                    type="number"
                    disabled
                    value={targetSystolic}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Objetivo pautado por clínica</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-dia" className="block text-xs font-semibold text-slate-600">
                    Meta Diastólica (mmHg)
                  </label>
                  <input
                    id="goal-dia"
                    type="number"
                    disabled
                    value={targetDiastolic}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Objetivo pautado por clínica</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-pulse" className="block text-xs font-semibold text-slate-600">
                    Meta Pulsaciones (lpm)
                  </label>
                  <input
                    id="goal-pulse"
                    type="number"
                    disabled
                    value={targetHeartRate}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Objetivo pautado por clínica</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-w" className="block text-xs font-semibold text-slate-600">
                    Meta de Peso (kg)
                  </label>
                  <input
                    id="goal-w"
                    type="number"
                    disabled
                    value={targetWeight}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Peso objetivo pautado</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-m" className="block text-xs font-semibold text-slate-600">
                    Meta Masa Corporal (IMC)
                  </label>
                  <input
                    id="goal-m"
                    type="number"
                    disabled
                    value={targetBodyMass}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Composición meta pautada</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <label htmlFor="goal-c" className="block text-xs font-semibold text-slate-600">
                    Meta Calórica (kcal/día)
                  </label>
                  <input
                    id="goal-c"
                    type="number"
                    disabled
                    value={targetCalories}
                    className="w-full px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">Balance calórico meta ({timelineWeeks} sem)</p>
                </div>
              </div>
            </div>

            {/* 3. Informes Médicos & Analíticas de Laboratorio (IA) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-700" />
                    <span>3. Informes Médicos & Analíticas de Laboratorio (IA)</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Adjunta analíticas de sangre, perfil lipídico o chequeos cardiometabólicos (PDF, JPG, PNG o TXT). La IA extraerá biomarcadores y ajustará las sugerencias.
                  </p>
                </div>

                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900">
                  {reports.length} {reports.length === 1 ? 'informe adjunto' : 'informes adjuntos'}
                </span>
              </div>

              {/* Zona de Carga */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isAnalyzingReport}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2"
                >
                  {isAnalyzingReport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando informe con IA...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Subir Informe Médico (PDF / Imagen)</span>
                    </>
                  )}
                </button>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">O probar con:</span>
                  <button
                    type="button"
                    disabled={isAnalyzingReport}
                    onClick={() => handleLoadSampleReport('lipidico')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold transition-colors"
                  >
                    + Analítica Lipídica
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzingReport}
                    onClick={() => handleLoadSampleReport('renal')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 font-semibold transition-colors"
                  >
                    + Chequeo Renal/Potasio
                  </button>
                </div>
              </div>

              {reportError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              {/* Lista de Informes Analizados */}
              {reports.length > 0 && (
                <div className="space-y-2.5">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{rep.fileName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                {rep.reportType}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Fecha: {rep.reportDate} · Procesado {rep.uploadedAt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadMedicalReportTxt(rep, currentClient.name, dateOfBirth, gender)}
                            title="Descargar informe como archivo de texto (.txt)"
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>.TXT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadMedicalReportPdf(rep, currentClient.name, dateOfBirth, gender)}
                            title="Descargar o imprimir informe clínico (.pdf)"
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3 text-teal-600" />
                            <span>.PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveReport(rep.id)}
                            title="Eliminar informe"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                        {rep.aiClinicalSummary}
                      </p>

                      {/* Chips de Biomarcadores Detectados con Marcadores de Color */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {rep.markers.triglycerides !== undefined && (() => {
                          const r = getMedicalMetricRange('triglycerides', rep.markers.triglycerides);
                          return (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${r.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                              <span>Triglicéridos: {rep.markers.triglycerides} mg/dL</span>
                            </span>
                          );
                        })()}
                        {rep.markers.ldlCholesterol !== undefined && (() => {
                          const r = getMedicalMetricRange('ldl', rep.markers.ldlCholesterol);
                          return (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${r.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                              <span>LDL: {rep.markers.ldlCholesterol} mg/dL</span>
                            </span>
                          );
                        })()}
                        {rep.markers.fastingGlucose !== undefined && (() => {
                          const r = getMedicalMetricRange('glucose', rep.markers.fastingGlucose);
                          return (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${r.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                              <span>Glucosa: {rep.markers.fastingGlucose} mg/dL</span>
                            </span>
                          );
                        })()}
                        {rep.markers.vitaminD !== undefined && (() => {
                          const r = getMedicalMetricRange('vitaminD', rep.markers.vitaminD);
                          return (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${r.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                              <span>Vitamina D: {rep.markers.vitaminD} ng/mL</span>
                            </span>
                          );
                        })()}
                        {rep.markers.potassium !== undefined && (() => {
                          const r = getMedicalMetricRange('potassium', rep.markers.potassium);
                          return (
                            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${r.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${r.dotClass}`} />
                              <span>Potasio: {rep.markers.potassium} mEq/L</span>
                            </span>
                          );
                        })()}
                        {rep.markers.creatinine !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200">
                            Creatinina: {rep.markers.creatinine} mg/dL
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                Aviso: El análisis automatizado de documentos es orientativo para nutrición preventiva y no sustituye el diagnóstico de un médico especialista.
              </p>
            </div>

            {/* Horizonte Temporal (Bloqueado para cliente) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 opacity-80">
              <div className="flex justify-between items-baseline mb-2">
                <label htmlFor="timeline-weeks-edit" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Horizonte Temporal Asignado por Especialista:</span>
                </label>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {timelineWeeks} semanas
                </span>
              </div>
              <input
                id="timeline-weeks-edit"
                type="range"
                disabled
                min={4}
                max={16}
                step={2}
                value={timelineWeeks}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-not-allowed accent-slate-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>4 sem</span>
                <span>8 sem (Estándar clínico)</span>
                <span>16 sem</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>¡Expediente e informes sincronizados con la IA!</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  Los cambios recalcularán tus gráficas y sugerencias IA al instante.
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