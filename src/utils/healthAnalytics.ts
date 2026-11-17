import {
  BiometricTrendPoint,
  ClientBiometrics,
  ClientHealthGoals,
  MedicalLabMarkers,
  MedicalRangeEvaluation,
  MedicalRangeStatus,
  MedicalReportRecord,
  NutritionRecommendation,
  Product,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';

export type ChartMetricFocus =
  | 'presion'
  | 'pulsaciones'
  | 'peso_masa'
  | 'vitalidad'
  | 'higado_graso';

export function calculateAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function getBloodPressureCategory(
  systolic: number,
  diastolic: number,
  age?: number
): 'Óptima' | 'Normal' | 'Elevada' | 'Hipertensión E1' | 'Hipertensión E2' {
  // Ajuste según edad: a partir de 65 años, la rigidez arterial fisiológica tolera valores hasta 129 mmHg sin ser hipertensión
  if (age !== undefined && age >= 65) {
    if (systolic >= 160 || diastolic >= 100) return 'Hipertensión E2';
    if (systolic >= 140 || diastolic >= 90) return 'Hipertensión E1';
    if (systolic >= 130 || (diastolic >= 80 && diastolic < 90)) return 'Elevada';
    if (systolic >= 120 && diastolic < 80) return 'Normal';
    return 'Óptima';
  }

  // Adultos menores de 65 años (criterios clínicos AHA / ACC)
  if (systolic >= 160 || diastolic >= 100) return 'Hipertensión E2';
  if (systolic >= 140 || diastolic >= 90) return 'Hipertensión E1';
  if (systolic >= 130 || (diastolic >= 80 && diastolic < 90)) return 'Elevada';
  if (systolic >= 120 && diastolic < 80) return 'Normal';
  return 'Óptima';
}

export function getMedicalMetricRange(
  metric:
    | 'systolic'
    | 'diastolic'
    | 'heartRate'
    | 'bmi'
    | 'glucose'
    | 'triglycerides'
    | 'ldl'
    | 'vitaminD'
    | 'potassium'
    | 'fattyLiver',
  value: number,
  age?: number,
  _gender?: string
): MedicalRangeEvaluation {
  let status: MedicalRangeStatus = 'normal';
  let label = 'Normal / Óptimo';

  switch (metric) {
    case 'systolic':
      if (age !== undefined && age >= 65) {
        if (value >= 140) {
          status = 'critical';
          label = 'Hipertensión (≥140)';
        } else if (value >= 130) {
          status = 'borderline';
          label = 'Elevada para edad (130-139)';
        } else {
          status = 'normal';
          label = 'Normal (<130)';
        }
      } else {
        if (value >= 130) {
          status = 'critical';
          label = 'Elevada / HTA (≥130)';
        } else if (value >= 120) {
          status = 'borderline';
          label = 'Limítrofe (120-129)';
        } else {
          status = 'normal';
          label = 'Óptima (<120)';
        }
      }
      break;

    case 'diastolic':
      if (value >= 90) {
        status = 'critical';
        label = 'HTA Diastólica (≥90)';
      } else if (value >= 80) {
        status = 'borderline';
        label = 'Limítrofe (80-89)';
      } else {
        status = 'normal';
        label = 'Óptima (<80)';
      }
      break;

    case 'heartRate':
      if (value >= 100 || value < 50) {
        status = 'critical';
        label = value >= 100 ? 'Taquicardia (≥100)' : 'Bradicardia (<50)';
      } else if (value > 80 || (value >= 50 && value < 60)) {
        status = 'borderline';
        label = value > 80 ? 'Elevado (81-99 lpm)' : 'Bajo / Reposo atlético';
      } else {
        status = 'normal';
        label = 'Normal (60-80 lpm)';
      }
      break;

    case 'bmi':
      if (value >= 30 || value < 18.5) {
        status = 'critical';
        label = value >= 30 ? 'Obesidad (≥30)' : 'Bajo peso (<18.5)';
      } else if (value >= 25) {
        status = 'borderline';
        label = 'Sobrepeso (25-29.9)';
      } else {
        status = 'normal';
        label = 'Normopeso (18.5-24.9)';
      }
      break;

    case 'glucose':
      if (value >= 126 || value < 70) {
        status = 'critical';
        label = value >= 126 ? 'Alerta Hiperglucemia' : 'Hipoglucemia (<70)';
      } else if (value >= 100) {
        status = 'borderline';
        label = 'Glucosa alterada (100-125)';
      } else {
        status = 'normal';
        label = 'Normal (70-99 mg/dL)';
      }
      break;

    case 'triglycerides':
      if (value >= 200) {
        status = 'critical';
        label = 'Hipertrigliceridemia (≥200)';
      } else if (value >= 150) {
        status = 'borderline';
        label = 'Límite Alto (150-199)';
      } else {
        status = 'normal';
        label = 'Óptimo (<150 mg/dL)';
      }
      break;

    case 'ldl':
      if (value >= 160) {
        status = 'critical';
        label = 'LDL Alto (≥160)';
      } else if (value >= 100) {
        status = 'borderline';
        label = 'Límite (100-159)';
      } else {
        status = 'normal';
        label = 'Óptimo (<100 mg/dL)';
      }
      break;

    case 'vitaminD':
      if (value < 20) {
        status = 'critical';
        label = 'Deficiencia (<20 ng/mL)';
      } else if (value < 30) {
        status = 'borderline';
        label = 'Insuficiencia (20-29)';
      } else {
        status = 'normal';
        label = 'Suficiente (≥30 ng/mL)';
      }
      break;

    case 'potassium':
      if (value > 5.2 || value < 3.5) {
        status = 'critical';
        label = value > 5.2 ? 'Hiperpotasemia' : 'Hipopotasemia';
      } else {
        status = 'normal';
        label = 'Equilibrado (3.5-5.1)';
      }
      break;

    case 'fattyLiver':
      if (value >= 2) {
        status = 'critical';
        label = value === 3 ? 'Esteatosis Severa (G3)' : 'Esteatosis Moderada (G2)';
      } else if (value === 1) {
        status = 'borderline';
        label = 'Esteatosis Leve (G1)';
      } else {
        status = 'normal';
        label = 'Sin Esteatosis / Sano (G0)';
      }
      break;
  }

  const badgeClass =
    status === 'normal'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'borderline'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';

  const textClass =
    status === 'normal'
      ? 'text-emerald-700'
      : status === 'borderline'
        ? 'text-amber-700'
        : 'text-rose-700';

  const dotClass =
    status === 'normal'
      ? 'bg-emerald-500'
      : status === 'borderline'
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return { status, label, badgeClass, textClass, dotClass };
}

export function calculateSeriesLinearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
} {
  const n = points.length;
  if (n <= 1) {
    return {
      slope: 0,
      intercept: points[0]?.y ?? 0,
      rSquared: 0,
      predict: () => points[0]?.y ?? 0,
    };
  }

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += Math.pow(p.x - meanX, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssTot += Math.pow(p.y - meanY, 2);
    ssRes += Math.pow(p.y - pred, 2);
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return {
    slope: Number(slope.toFixed(3)),
    intercept: Number(intercept.toFixed(2)),
    rSquared: Number(rSquared.toFixed(3)),
    predict: (x: number) => Number((slope * x + intercept).toFixed(1)),
  };
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

export function calculateWHtR(waistCm: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  return Number((waistCm / heightCm).toFixed(2));
}

export function getWHtRStatus(whtr: number): string {
  if (whtr <= 0) return 'Sin datos';
  if (whtr < 0.40) return 'Bajo peso / Delgado';
  if (whtr <= 0.50) return 'Óptimo (Bajo riesgo)';
  if (whtr <= 0.60) return 'Riesgo Elevado (Grasa Visceral)';
  return 'Riesgo Muy Alto (Alta Adiposidad)';
}

export function calculateOverallVitalityScore(
  systolic: number,
  diastolic: number,
  heartRate: number,
  bodyMass: number,
  activeSupplementsCount: number,
  whtr?: number
): number {
  const bpDist = Math.max(0, systolic - 115) * 0.7 + Math.max(0, diastolic - 75) * 0.8;
  const bpScore = Math.max(0, 100 - bpDist * 2.2);

  const hrDist = Math.abs(heartRate - 64);
  const hrScore = Math.max(0, 100 - hrDist * 2.5);

  const massDist = Math.abs(bodyMass - 22.5);
  const massScore = Math.max(0, 100 - massDist * 6.0);

  let whtrPenalty = 0;
  if (whtr && whtr > 0.50) {
    whtrPenalty = (whtr - 0.50) * 45;
  }

  const supplementBonus = Math.min(18, activeSupplementsCount * 4.5);

  const rawScore =
    bpScore * 0.40 +
    hrScore * 0.25 +
    massScore * 0.25 +
    Math.max(0, 100 - whtrPenalty * 10) * 0.10 +
    supplementBonus;

  return Math.min(99, Math.max(20, Math.round(rawScore)));
}

export function calculateProjectedImpact(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  weeks: number = 8
): ProjectedImpactSummary & { waistDelta: number; whtr: number; whtrStatus: string; hepaticRiskScore: number } {
  const weeksClamped = Math.max(1, Math.min(24, weeks));
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;

  const baselineCal = biometrics.dailyCalories || 2100;
  const calorieDelta = simulatedCalories - baselineCal;

  const supplementBurn = selectedSupplements.reduce(
    (sum, s) => sum + (s.caloricBurnBonus ?? 0),
    0
  );
  const netDailyCaloricDelta = calorieDelta - supplementBurn;

  const weeklyCaloricWeightChange = (netDailyCaloricDelta * 7) / 7700;

  const supplementWeeklyWeightRate = selectedSupplements.reduce(
    (sum, s) => sum + s.weightImpactRateKgPerWeek,
    0
  );
  const totalWeeklyWeightChange = weeklyCaloricWeightChange + supplementWeeklyWeightRate;
  const totalWeightDelta = Number((totalWeeklyWeightChange * weeksClamped).toFixed(2));

  const waistDelta = Number(totalWeightDelta.toFixed(1));
  const projectedWaist = Math.max(40, waistCm + waistDelta);
  const currentWhtr = calculateWHtR(waistCm, heightCm);
  const projectedWhtr = calculateWHtR(projectedWaist, heightCm);
  const whtrStatus = getWHtRStatus(projectedWhtr);

  const visceralFatBpLoad = currentWhtr > 0.50 ? (currentWhtr - 0.50) * 10 : 0;

  const projectedWeight = Math.max(40, biometrics.bodyWeight + totalWeightDelta);
  const baselineBmi = biometrics.height
    ? calculateBMI(biometrics.bodyWeight, biometrics.height)
    : biometrics.bodyMass || 24;
  const projectedMass = biometrics.height
    ? calculateBMI(projectedWeight, biometrics.height)
    : Math.max(16, Math.min(45, (biometrics.bodyMass || 24) + (totalWeightDelta / biometrics.bodyWeight) * 20));

  const totalBodyMassDelta = Number((projectedMass - baselineBmi).toFixed(2));

  const weightBpSystolicImpact = totalWeightDelta * 0.95;
  const weightBpDiastolicImpact = totalWeightDelta * 0.65;

  const rawSupplementSystolic = selectedSupplements.reduce((sum, s) => sum + s.systolicEffect, 0);
  const rawSupplementDiastolic = selectedSupplements.reduce((sum, s) => sum + s.diastolicEffect, 0);
  const rawSupplementHr = selectedSupplements.reduce((sum, s) => sum + s.heartRateEffect, 0);

  const satFactor = 1 / (1 + 0.03 * Math.abs(rawSupplementSystolic));
  const finalSuppSystolic = rawSupplementSystolic * satFactor;
  const finalSuppDiastolic = rawSupplementDiastolic * satFactor;
  const finalSuppHr = rawSupplementHr * (1 / (1 + 0.03 * Math.abs(rawSupplementHr)));

  const totalSystolicDelta = Number((finalSuppSystolic + weightBpSystolicImpact + visceralFatBpLoad).toFixed(1));
  const totalDiastolicDelta = Number((finalSuppDiastolic + weightBpDiastolicImpact + visceralFatBpLoad * 0.6).toFixed(1));
  const totalHeartRateDelta = Number(finalSuppHr.toFixed(1));

  const projectedSystolic = Math.max(90, Math.min(200, biometrics.systolicBP + totalSystolicDelta));
  const projectedDiastolic = Math.max(55, Math.min(130, biometrics.diastolicBP + totalDiastolicDelta));
  const projectedHr = Math.max(48, Math.min(130, biometrics.heartRate + totalHeartRateDelta));

  const baselineScore = calculateOverallVitalityScore(
    biometrics.systolicBP,
    biometrics.diastolicBP,
    biometrics.heartRate,
    baselineBmi,
    0,
    currentWhtr
  );

  const projectedScore = calculateOverallVitalityScore(
    projectedSystolic,
    projectedDiastolic,
    projectedHr,
    projectedMass,
    selectedSupplements.length,
    projectedWhtr
  );

  const bpCategory = getBloodPressureCategory(projectedSystolic, projectedDiastolic);

  let trendDirection: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (
    projectedScore > baselineScore + 2 ||
    (totalSystolicDelta < -1.5 && biometrics.systolicBP > 120) ||
    projectedWhtr < currentWhtr
  ) {
    trendDirection = 'improving';
  } else if (projectedScore < baselineScore - 2 || (totalSystolicDelta > 3 && biometrics.systolicBP >= 125)) {
    trendDirection = 'deteriorating';
  }

  // Proyección de Hígado Graso (esteatosis hepática)
  const initialGrade = biometrics.fattyLiverGrade ?? 0;
  const hasOmega = selectedSupplements.some((s) => s.id === 'SUP-OMEGA3');
  const hasCoffee = selectedSupplements.some((s) => s.id === 'SUP-CAFE');
  const hasSalt = selectedSupplements.some((s) => s.id === 'SUP-SAL');

  let hepaticRiskScore = initialGrade * 30; // base score 0..90
  if (totalWeightDelta < -2) hepaticRiskScore -= 15;
  if (totalWeightDelta > 2) hepaticRiskScore += 20;
  if (hasOmega) hepaticRiskScore -= 12;
  if (hasCoffee) hepaticRiskScore -= 8; // Efecto hepatoprotector comprobado de ácidos clorogénicos
  if (hasSalt) hepaticRiskScore += 12;
  if (projectedWhtr > 0.55) hepaticRiskScore += 15;
  hepaticRiskScore = Math.max(0, Math.min(100, Math.round(hepaticRiskScore)));

  let fattyLiverRisk: 'Bajo / Normal' | 'Riesgo Moderado' | 'Esteatosis Activa' = 'Bajo / Normal';
  if (hepaticRiskScore >= 55) {
    fattyLiverRisk = 'Esteatosis Activa';
  } else if (hepaticRiskScore >= 25) {
    fattyLiverRisk = 'Riesgo Moderado';
  }

  return {
    systolicDelta: totalSystolicDelta,
    diastolicDelta: totalDiastolicDelta,
    heartRateDelta: totalHeartRateDelta,
    weightDelta: totalWeightDelta,
    bodyMassDelta: totalBodyMassDelta,
    vitalityScore: projectedScore,
    vitalityDelta: projectedScore - baselineScore,
    calorieDeltaVsMaintenance: netDailyCaloricDelta,
    bloodPressureCategory: bpCategory,
    trendDirection,
    waistDelta,
    whtr: projectedWhtr,
    whtrStatus,
    fattyLiverRisk,
    hepaticRiskScore,
  };
}

export function generateDynamicBiometricTrend(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  timelineWeeks: number = 8
): BiometricTrendPoint[] {
  const weeksTotal = Math.max(4, Math.min(16, timelineWeeks));
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;

  const impact = calculateProjectedImpact(
    biometrics,
    goals,
    selectedSupplements,
    simulatedCalories,
    weeksTotal
  );

  const points: BiometricTrendPoint[] = [];

  const step = weeksTotal <= 6 ? 1 : 2;
  const milestones: number[] = [0];
  for (let w = step; w <= weeksTotal; w += step) {
    milestones.push(w);
  }
  if (milestones[milestones.length - 1] !== weeksTotal) {
    milestones.push(weeksTotal);
  }

  const baselineBmi = biometrics.height
    ? calculateBMI(biometrics.bodyWeight, biometrics.height)
    : biometrics.bodyMass || 24;
  const baselineWhtr = calculateWHtR(waistCm, heightCm);

  const initialFattyScore = (biometrics.fattyLiverGrade ?? 0) * 30;

  for (const w of milestones) {
    if (w === 0) {
      points.push({
        week: 0,
        weekLabel: 'Inicial (Hoy)',
        systolicBP: biometrics.systolicBP,
        diastolicBP: biometrics.diastolicBP,
        heartRate: biometrics.heartRate,
        bodyWeight: biometrics.bodyWeight,
        bodyMass: baselineBmi,
        generalHealthScore: calculateOverallVitalityScore(
          biometrics.systolicBP,
          biometrics.diastolicBP,
          biometrics.heartRate,
          baselineBmi,
          0,
          baselineWhtr
        ),
        fattyLiverScore: initialFattyScore,
        targetSystolic: goals.targetSystolicBP,
        targetDiastolic: goals.targetDiastolicBP,
        targetHeartRate: goals.targetHeartRate,
        targetWeight: goals.targetWeight,
        targetBodyMass: goals.targetBodyMass,
        targetFattyLiverScore: 10,
      });
      continue;
    }

    const progressRatio = w / weeksTotal;
    const adaptationCurve = 1 - Math.exp(-2.2 * progressRatio);

    const curSystolic = Number((biometrics.systolicBP + impact.systolicDelta * adaptationCurve).toFixed(1));
    const curDiastolic = Number((biometrics.diastolicBP + impact.diastolicDelta * adaptationCurve).toFixed(1));
    const curHr = Number((biometrics.heartRate + impact.heartRateDelta * adaptationCurve).toFixed(1));
    const curWeight = Number((biometrics.bodyWeight + impact.weightDelta * progressRatio).toFixed(1));

    const curMass = biometrics.height
      ? calculateBMI(curWeight, biometrics.height)
      : Number(((biometrics.bodyMass || 24) + impact.bodyMassDelta * progressRatio).toFixed(1));

    const curWaist = Math.max(40, waistCm + impact.waistDelta * progressRatio);
    const curWhtr = calculateWHtR(curWaist, heightCm);

    const curScore = calculateOverallVitalityScore(
      curSystolic,
      curDiastolic,
      curHr,
      curMass,
      selectedSupplements.length,
      curWhtr
    );

    const curFatty = Math.max(
      0,
      Math.min(100, Math.round(initialFattyScore + (impact.hepaticRiskScore - initialFattyScore) * adaptationCurve))
    );

    points.push({
      week: w,
      weekLabel: `Sem ${w}`,
      systolicBP: curSystolic,
      diastolicBP: curDiastolic,
      heartRate: curHr,
      bodyWeight: curWeight,
      bodyMass: curMass,
      generalHealthScore: curScore,
      fattyLiverScore: curFatty,
      targetSystolic: goals.targetSystolicBP,
      targetDiastolic: goals.targetDiastolicBP,
      targetHeartRate: goals.targetHeartRate,
      targetWeight: goals.targetWeight,
      targetBodyMass: goals.targetBodyMass,
      targetFattyLiverScore: 10,
    });
  }

  return points;
}

/**
 * Motor Predictivo de IA:
 * Cruza las curvas biométricas (Sem 0 -> Sem N) con los Informes Médicos de Laboratorio adjuntos.
 */
export function generateNutritionalRecommendations(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  allProducts: Product[],
  trendPoints?: BiometricTrendPoint[],
  selectedChartMetric?: ChartMetricFocus,
  medicalReports: MedicalReportRecord[] = []
): NutritionRecommendation[] {
  const recs: NutritionRecommendation[] = [];
  const activeIds = new Set(selectedSupplements.map((s) => s.id));
  const activeNames = selectedSupplements.map((s) => s.name.toLowerCase());
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;
  const currentMetricFocus = selectedChartMetric || 'presion';

  // Localizador dinámico de productos en el catálogo real
  const findProduct = (preferredId: string, keyword: string): Product | undefined => {
    return (
      allProducts.find((p) => p.id === preferredId) ||
      allProducts.find((p) => p.name.toLowerCase().includes(keyword.toLowerCase())) ||
      allProducts.find((p) => p.category.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  const omegaProd = findProduct('NV-104', 'omega');
  const magnesiumProd = findProduct('NV-102', 'magnesio');
  const proteinProd = findProduct('NV-101', 'proteína');
  const ashwaProd = findProduct('NV-108', 'ashwagandha');
  const potassiumProd = findProduct('NV-106', 'potasio');
  const multivitProd =
    findProduct('NV-103', 'multivitamínico') || findProduct('NV-107', 'antioxidante');

  const fallbackTrend =
    trendPoints && trendPoints.length > 0
      ? trendPoints
      : generateDynamicBiometricTrend(
        biometrics,
        goals,
        selectedSupplements,
        simulatedCalories,
        goals.timelineWeeks || 8
      );

  const initialPt = fallbackTrend[0];
  const finalPt = fallbackTrend[fallbackTrend.length - 1];
  const finalWeekLabel = finalPt.weekLabel;

  // =========================================================================
  // 0. REGLAS DE LABORATORIO (INFORMES MÉDICOS ADJUNTOS AL PERFIL)
  // =========================================================================
  const allContraindications = medicalReports.flatMap((r) => r.contraindications || []);
  const blockPotassium = allContraindications.some((c) =>
    c.toLowerCase().includes('potasio')
  );

  // Consolidar biomarcadores de todos los informes médicos (los más recientes tienen precedencia)
  const consolidatedMarkers = medicalReports.reduceRight<Record<string, number | undefined>>(
    (acc, rep) => ({ ...acc, ...rep.markers }),
    {}
  );

  const latestReport = medicalReports.length > 0 ? medicalReports[0] : null;

  if (medicalReports.length > 0 && latestReport) {
    const m = consolidatedMarkers;
    const reportRef = latestReport.fileName;
    const reportDateRef = latestReport.reportDate;

    // Alerta de seguridad renal / potasio sérico elevado
    if (blockPotassium || (m.potassium && m.potassium > 5.0) || (m.creatinine && m.creatinine > 1.3)) {
      recs.push({
        id: 'rec-lab-renal-guard',
        category: 'alerta',
        urgency: 'alta',
        title: `Alerta Clínica de Laboratorio: Vigilancia Renal/Potasio (${reportRef})`,
        message: `Tu informe médico registra ${m.potassium ? `potasio sérico en ${m.potassium} mEq/L` : ''
          }${m.potassium && m.creatinine ? ' y ' : ''}${m.creatinine ? `creatinina en ${m.creatinine} mg/dL` : ''
          }. Se desaconseja el uso de electrolitos con potasio añadido; prioriza hidratación controlada y Omega-3.`,
        suggestedAction: 'Evitar complejos de potasio y consultar ajuste con nefrólogo',
        relatedProductId: magnesiumProd?.id || 'NV-102',
        relatedSupplementId: 'SUP-MAGNESIO',
        chartMetricTrigger: 'presion',
        metricEvidence: `Informe ${reportDateRef} · K+ ${m.potassium ?? '—'} mEq/L · Cr ${m.creatinine ?? '—'} mg/dL`,
      });
    }

    // Dislipidemia / Triglicéridos o LDL elevados -> Priorizar Omega-3 EPA/DHA
    if ((m.triglycerides && m.triglycerides >= 150) || (m.ldlCholesterol && m.ldlCholesterol >= 130)) {
      const trigText = m.triglycerides ? `Triglicéridos: ${m.triglycerides} mg/dL` : '';
      const ldlText = m.ldlCholesterol ? `LDL: ${m.ldlCholesterol} mg/dL` : '';
      recs.push({
        id: 'rec-lab-lipids-omega3',
        category: 'suplemento',
        urgency:
          (m.triglycerides && m.triglycerides >= 200) || (m.ldlCholesterol && m.ldlCholesterol >= 160)
            ? 'alta'
            : 'media',
        title: `Modulación Lipídica según Analítica (${[trigText, ldlText].filter(Boolean).join(' · ')})`,
        message: `Tu informe "${reportRef}" muestra perfil lipídico elevado. Los ácidos grasos Omega-3 EPA+DHA reducen la síntesis hepática de triglicéridos entre un 15% y 25% y protegen el endotelio vascular.`,
        suggestedAction: 'Simular Omega-3 Vegano EPA+DHA en tu gráfica cardiovascular',
        relatedProductId: omegaProd?.id || 'NV-104',
        relatedSupplementId: 'SUP-OMEGA3',
        chartMetricTrigger: 'presion',
        metricEvidence: `Lab (${reportDateRef}): ${[trigText, ldlText].filter(Boolean).join(' · ')}`,
      });
    }

    // Resistencia a la insulina / Glucosa basal o HbA1c elevada
    if ((m.fastingGlucose && m.fastingGlucose >= 100) || (m.hba1c && m.hba1c >= 5.7)) {
      recs.push({
        id: 'rec-lab-glucose-control',
        category: 'calorias',
        urgency:
          (m.fastingGlucose && m.fastingGlucose >= 126) || (m.hba1c && m.hba1c >= 6.5)
            ? 'alta'
            : 'media',
        title: `Control Glucémico Postprandial (Glucosa: ${m.fastingGlucose ?? '—'} mg/dL${m.hba1c ? ` · HbA1c: ${m.hba1c}%` : ''})`,
        message: `El laboratorio indica sensibilidad insulínica reducida. Reemplazar carbohidratos refinados por Proteína Bio-Activa con Matcha y aplicar -200 kcal/día estabiliza la curva glucémica y reduce la grasa visceral.`,
        suggestedAction: 'Aplicar ajuste de -200 kcal y añadir proteína de bajo índice glucémico',
        suggestedCalorieDelta: -200,
        relatedProductId: proteinProd?.id || 'NV-101',
        relatedSupplementId: 'SUP-PROTEINA_MATCHA',
        chartMetricTrigger: 'peso_masa',
        metricEvidence: `Lab (${reportDateRef}): Glucosa ${m.fastingGlucose ?? 'N/D'} mg/dL`,
      });
    }

    // Déficit de Vitamina D o Inflamación (PCR-us)
    if ((m.vitaminD && m.vitaminD < 30) || (m.hsCRP && m.hsCRP >= 2.0)) {
      recs.push({
        id: 'rec-lab-vitd-inflammation',
        category: 'suplemento',
        urgency: 'media',
        title: `Soporte Inmunometabólico (${m.vitaminD ? `Vitamina D: ${m.vitaminD} ng/mL` : `PCR-us: ${m.hsCRP} mg/L`})`,
        message: `Tu informe detecta ${m.vitaminD && m.vitaminD < 30 ? `niveles subóptimos de Vitamina D (${m.vitaminD} ng/mL)` : 'marcadores inflamatorios elevados'
          }. El Magnesio Bisglicinato actúa como cofactor esencial para activar la Vitamina D y reducir la inflamación celular.`,
        suggestedAction: 'Activar Magnesio Bisglicinato Quelado en tu protocolo',
        relatedProductId: magnesiumProd?.id || 'NV-102',
        relatedSupplementId: 'SUP-MAGNESIO',
        chartMetricTrigger: 'vitalidad',
        metricEvidence: `Lab (${reportDateRef}): ${m.vitaminD ? `Vit D ${m.vitaminD} ng/mL` : `PCR ${m.hsCRP} mg/L`}`,
      });
    }

    // Ferritina sérica disminuida
    if (m.ferritin !== undefined && m.ferritin < 30) {
      recs.push({
        id: 'rec-lab-ferritin-support',
        category: 'suplemento',
        urgency: m.ferritin < 15 ? 'alta' : 'media',
        title: `Reserva Férrica & Oxigenación Mitocondrial (Ferritina: ${m.ferritin} ng/mL)`,
        message: `Tu analítica indica ferritina sérica en ${m.ferritin} ng/mL (óptimo funcional: >40 ng/mL). Un aporte sinérgico de micronutrientes y vitamina C apoya el transporte mitocondrial de oxígeno.`,
        suggestedAction: 'Añadir complejo de micronutrientes y optimizar ingesta',
        relatedProductId: multivitProd?.id || 'NV-103',
        chartMetricTrigger: 'vitalidad',
        metricEvidence: `Lab (${reportDateRef}): Ferritina ${m.ferritin} ng/mL`,
      });
    }
  }

  // =========================================================================
  // 1. ANÁLISIS PREDICTIVO DE CURVA DE PRESIÓN ARTERIAL
  // =========================================================================
  const sysGapToGoal = Number((finalPt.systolicBP - goals.targetSystolicBP).toFixed(1));
  const diaGapToGoal = Number((finalPt.diastolicBP - goals.targetDiastolicBP).toFixed(1));
  const projectedBpCat = getBloodPressureCategory(finalPt.systolicBP, finalPt.diastolicBP);

  if (sysGapToGoal > 2 || diaGapToGoal > 2 || finalPt.systolicBP >= 128) {
    const hasOmega = activeIds.has('SUP-OMEGA3');
    const hasMagnesium = activeIds.has('SUP-MAGNESIO');

    const recommendedSuppId = !hasOmega
      ? 'SUP-OMEGA3'
      : !hasMagnesium || blockPotassium
        ? 'SUP-MAGNESIO'
        : 'SUP-POTASIO_ELECTRO';
    const recommendedSuppLabel = !hasOmega
      ? 'Omega-3 Vegano EPA+DHA'
      : !hasMagnesium || blockPotassium
        ? 'Magnesio Bisglicinato Quelado'
        : 'Complejo de Potasio & Electrolitos';

    recs.push({
      id: 'rec-curve-bp-gap',
      category: 'presion',
      urgency: finalPt.systolicBP >= 138 || sysGapToGoal >= 10 ? 'alta' : 'media',
      title: `Brecha Arterial Detectada en Curva (${projectedBpCat})`,
      message: `La curva proyecta cerrar en ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg en ${finalWeekLabel}, quedando +${Math.max(0, sysGapToGoal).toFixed(1)} mmHg por encima de tu meta (${goals.targetSystolicBP}/${goals.targetDiastolicBP} mmHg). Integrar ${recommendedSuppLabel} acelerará la vasodilatación endotelial.`,
      suggestedAction: `Simular ${recommendedSuppLabel} para doblar la curva hacia tu meta`,
      relatedProductId: !hasOmega ? omegaProd?.id || 'NV-104' : magnesiumProd?.id || 'NV-102',
      relatedSupplementId: recommendedSuppId,
      chartMetricTrigger: 'presion',
      metricEvidence: `${Math.round(initialPt.systolicBP)}/${Math.round(initialPt.diastolicBP)} → ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg`,
    });
  } else {
    recs.push({
      id: 'rec-curve-bp-converging',
      category: 'presion',
      urgency: 'positiva',
      title: 'Curva de Presión Arterial Convergiendo a la Meta',
      message: `La trayectoria arterial desciende de ${Math.round(initialPt.systolicBP)}/${Math.round(initialPt.diastolicBP)} mmHg a ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg en ${finalWeekLabel}, alineándose con tu objetivo clínico (${goals.targetSystolicBP}/${goals.targetDiastolicBP} mmHg).`,
      suggestedAction: 'Mantener protocolo antioxidante y balance electrolítico actual',
      relatedProductId: magnesiumProd?.id || 'NV-102',
      relatedSupplementId: 'SUP-MAGNESIO',
      chartMetricTrigger: 'presion',
      metricEvidence: `Tendencia: ${(finalPt.systolicBP - initialPt.systolicBP).toFixed(1)} mmHg en ${finalWeekLabel}`,
    });
  }

  // =========================================================================
  // 2. ANÁLISIS PREDICTIVO DE RITMO CARDÍACO
  // =========================================================================
  const hrGapToGoal = Number((finalPt.heartRate - goals.targetHeartRate).toFixed(1));
  if (hrGapToGoal > 3 || finalPt.heartRate >= 76) {
    const hasAshwa = activeIds.has('SUP-ASHWAGANDHA');
    recs.push({
      id: 'rec-curve-hr-elevated',
      category: 'pulsaciones',
      urgency: finalPt.heartRate >= 84 ? 'alta' : 'media',
      title: `Modulación Autonómica en Curva Cardíaca (+${Math.max(0, hrGapToGoal).toFixed(1)} lpm sobre meta)`,
      message: `En ${finalWeekLabel}, tus pulsaciones en reposo proyectan ${Math.round(finalPt.heartRate)} lpm frente a tu meta de ${goals.targetHeartRate} lpm. El extracto de Ashwagandha KSM-66 reduce el tono simpático y estabiliza la variabilidad cardíaca.`,
      suggestedAction: hasAshwa
        ? 'Mantener Ashwagandha KSM-66 y reducir estimulantes vespertinos'
        : 'Activar Ashwagandha KSM-66 en la simulación para bajar lpm',
      relatedProductId: ashwaProd?.id || 'NV-108',
      relatedSupplementId: 'SUP-ASHWAGANDHA',
      chartMetricTrigger: 'pulsaciones',
      metricEvidence: `${Math.round(initialPt.heartRate)} lpm → ${Math.round(finalPt.heartRate)} lpm (Meta: ${goals.targetHeartRate} lpm)`,
    });
  }

  // =========================================================================
  // 3. ANÁLISIS DE PESO, IMC, CINTURA (WHtR) Y BALANCE CALÓRICO
  // =========================================================================
  const weightGapToGoal = Number((finalPt.bodyWeight - goals.targetWeight).toFixed(1));
  const weightCurveChange = Number((finalPt.bodyWeight - initialPt.bodyWeight).toFixed(1));
  const calDeltaVsTarget = simulatedCalories - goals.targetCalories;
  const projectedWaist = Math.max(40, waistCm + weightCurveChange);
  const projectedWhtr = calculateWHtR(projectedWaist, heightCm);

  if (calDeltaVsTarget > 200 || (weightGapToGoal > 1.5 && weightCurveChange >= 0)) {
    const suggestedCut = Math.min(450, Math.max(250, calDeltaVsTarget > 0 ? calDeltaVsTarget : 300));
    recs.push({
      id: 'rec-curve-weight-stall',
      category: 'calorias',
      urgency: weightGapToGoal > 4 ? 'alta' : 'media',
      title: `Desviación en Curva de Peso (${weightCurveChange >= 0 ? `+${weightCurveChange}` : weightCurveChange} kg en ${finalWeekLabel})`,
      message: `Con ${simulatedCalories} kcal/día, tu peso proyectado en ${finalWeekLabel} es de ${finalPt.bodyWeight} kg (IMC ${finalPt.bodyMass}), manteniéndose a ${weightGapToGoal.toFixed(1)} kg de tu meta (${goals.targetWeight} kg). Aplicar un ajuste de -${suggestedCut} kcal/día inclinará la curva descendente.`,
      suggestedAction: `Aplicar ajuste de -${suggestedCut} kcal/día en el simulador`,
      suggestedCalorieDelta: -suggestedCut,
      relatedProductId: proteinProd?.id || 'NV-101',
      relatedSupplementId: 'SUP-PROTEINA_MATCHA',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `${initialPt.bodyWeight} kg → ${finalPt.bodyWeight} kg · IMC ${finalPt.bodyMass}`,
    });
  } else if (projectedWhtr > 0.50) {
    recs.push({
      id: 'rec-curve-whtr-visceral',
      category: 'suplemento',
      urgency: projectedWhtr > 0.58 ? 'alta' : 'media',
      title: `Reducción de Adiposidad Visceral (WHtR Proyectado: ${projectedWhtr})`,
      message: `Tu relación cintura/estatura proyectada de ${projectedWhtr} (${getWHtRStatus(projectedWhtr)}) sugiere potenciar la termogénesis lipídica. Combinar Proteína Bio-Activa con Matcha acelera la reducción abdominal sin perder tono muscular.`,
      suggestedAction: 'Simular complejo termogénico Matcha & Proteína Germinada',
      relatedProductId: proteinProd?.id || 'NV-101',
      relatedSupplementId: 'SUP-PROTEINA_MATCHA',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `Cintura proj.: ${projectedWaist.toFixed(1)} cm · IMC ${finalPt.bodyMass}`,
    });
  } else {
    recs.push({
      id: 'rec-curve-weight-optimal',
      category: 'calorias',
      urgency: 'positiva',
      title: 'Trayectoria de Peso e IMC en Zona Óptima',
      message: `Con ${simulatedCalories} kcal/día, tu curva evoluciona de ${initialPt.bodyWeight} kg a ${finalPt.bodyWeight} kg (IMC ${finalPt.bodyMass}) en ${finalWeekLabel}, acercándose de forma saludable a tu meta de ${goals.targetWeight} kg.`,
      suggestedAction: 'Conservar el balance calórico y proteico actual',
      relatedProductId: proteinProd?.id || 'NV-101',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `${initialPt.bodyWeight} kg → ${finalPt.bodyWeight} kg (Meta: ${goals.targetWeight} kg)`,
    });
  }

  // =========================================================================
  // 4. SCORE DE VITALIDAD CELULAR
  // =========================================================================
  const vitalityGain = finalPt.generalHealthScore - initialPt.generalHealthScore;
  if (finalPt.generalHealthScore < 85 || vitalityGain < 8) {
    const needsThermogenic =
      biometrics.bodyWeight > goals.targetWeight &&
      !activeNames.some((n) => n.includes('proteína') || n.includes('matcha'));

    const fallbackSupp = needsThermogenic
      ? 'SUP-PROTEINA_MATCHA'
      : blockPotassium
        ? 'SUP-MAGNESIO'
        : 'SUP-POTASIO_ELECTRO';

    recs.push({
      id: 'rec-curve-vitality-boost',
      category: 'suplemento',
      urgency: 'preventiva',
      title: `Potenciación de Vitalidad Celular (${finalPt.generalHealthScore}/100 en ${finalWeekLabel})`,
      message: `Tu curva de vitalidad gana ${vitalityGain >= 0 ? `+${vitalityGain}` : vitalityGain} pts hasta alcanzar ${finalPt.generalHealthScore}/100. Activar cofactores antioxidantes maximiza la pendiente de recuperación celular.`,
      suggestedAction: 'Activar soporte mitocondrial en la simulación',
      relatedProductId: needsThermogenic ? proteinProd?.id || 'NV-101' : magnesiumProd?.id || 'NV-102',
      relatedSupplementId: fallbackSupp,
      chartMetricTrigger: 'vitalidad',
      metricEvidence: `Score: ${initialPt.generalHealthScore}/100 → ${finalPt.generalHealthScore}/100`,
    });
  }

  // =========================================================================
  // 5. ANÁLISIS DE HÍGADO GRASO (ESTEATOSIS HEPÁTICA) & TRIGLICÉRIDOS
  // =========================================================================
  const hasFattyLiver =
    (biometrics.fattyLiverGrade !== undefined && biometrics.fattyLiverGrade >= 1) ||
    (consolidatedMarkers.triglycerides !== undefined && consolidatedMarkers.triglycerides >= 150);
  if (hasFattyLiver) {
    const hasOmega = activeIds.has('SUP-OMEGA3');
    recs.push({
      id: 'rec-fatty-liver-protocol',
      category: 'higado',
      urgency: (biometrics.fattyLiverGrade && biometrics.fattyLiverGrade >= 2) ? 'alta' : 'media',
      title: `Protocolo Hepatoprotector & Modulación de Grasa Hepática (Grado ${biometrics.fattyLiverGrade || 1})`,
      message: 'Se detecta esteatosis hepática / elevación de triglicéridos. Los ácidos grasos poliinsaturados EPA+DHA de microalgas reducen la lipogénesis de novo en hepatocitos, mientras que la restricción de azúcares libres y el café orgánico favorecen la autofagia hepática.',
      suggestedAction: hasOmega ? 'Mantener Omega-3 EPA+DHA y reducir carbohidratos refinados' : 'Activar Omega-3 Microalgas para proteger la función hepática',
      relatedProductId: omegaProd?.id || 'NV-104',
      relatedSupplementId: 'SUP-OMEGA3',
      chartMetricTrigger: 'higado_graso',
      metricEvidence: `Esteatosis G${biometrics.fattyLiverGrade || 1} · Triglicéridos: ${consolidatedMarkers.triglycerides || '150+'} mg/dL`,
    });
  }

  // =========================================================================
  // 6. ANÁLISIS DE SODIO / SAL & CAFEÍNA
  // =========================================================================
  if (activeIds.has('SUP-SAL')) {
    recs.push({
      id: 'rec-sodium-alert',
      category: 'alerta',
      urgency: 'alta',
      title: 'Sobrecarga de Sodio Activa (Impacto en Rigidez Arterial)',
      message: 'El consumo elevado de sal (>5g/día) expande el volumen plasmático y contrarresta los vasodilatadores. Se recomienda restringir la sal agregada y balancear con Citrato de Potasio.',
      suggestedAction: 'Moderar ingesta de sodio y compensar con citrato de potasio',
      relatedSupplementId: 'SUP-POTASIO_ELECTRO',
      chartMetricTrigger: 'presion',
      metricEvidence: 'Sal activa en simulación: +6 mmHg sistólica proyectada',
    });
  }

  if (activeIds.has('SUP-CAFE') && (finalPt.heartRate >= 80 || finalPt.systolicBP >= 135)) {
    recs.push({
      id: 'rec-caffeine-timing',
      category: 'pulsaciones',
      urgency: 'media',
      title: 'Ventana de Cafeína & Tono Simpático',
      message: 'El café funcional aporta polifenoles y protección hepática, pero su efecto estimulante eleva transitoriamente la FC y PA. Consúmelo antes de las 14:00 y acompáñalo de magnesio o ashwagandha para amortiguar el pico adrenérgico.',
      suggestedAction: 'Consumir café matutino y amortiguar con KSM-66 Ashwagandha',
      relatedProductId: ashwaProd?.id || 'NV-108',
      relatedSupplementId: 'SUP-ASHWAGANDHA',
      chartMetricTrigger: 'pulsaciones',
      metricEvidence: 'Café activo en simulación: +6 lpm ritmo cardíaco',
    });
  }

  const urgencyWeight: Record<NutritionRecommendation['urgency'], number> = {
    alta: 4,
    media: 3,
    preventiva: 2,
    positiva: 1,
  };

  return recs.sort((a, b) => {
    const aMatchesChart = a.chartMetricTrigger === currentMetricFocus ? 10 : 0;
    const bMatchesChart = b.chartMetricTrigger === currentMetricFocus ? 10 : 0;
    return bMatchesChart + urgencyWeight[b.urgency] - (aMatchesChart + urgencyWeight[a.urgency]);
  });
}