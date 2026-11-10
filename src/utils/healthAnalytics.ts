import {
  BiometricTrendPoint,
  ClientBiometrics,
  ClientHealthGoals,
  NutritionRecommendation,
  Product,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';

/**
 * Categorizes Blood Pressure according to international cardiology guidelines (AHA/ACC).
 */
export function getBloodPressureCategory(
  systolic: number,
  diastolic: number
): 'Óptima' | 'Normal' | 'Elevada' | 'Hipertensión E1' | 'Hipertensión E2' {
  if (systolic >= 160 || diastolic >= 100) return 'Hipertensión E2';
  if (systolic >= 140 || diastolic >= 90) return 'Hipertensión E1';
  if (systolic >= 130 || (diastolic >= 80 && diastolic < 90)) return 'Elevada';
  if (systolic >= 120 && diastolic < 80) return 'Normal';
  return 'Óptima';
}

/**
 * Calculates Body Mass Index (BMI = kg / m²).
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

/**
 * Calculates Waist-to-Height Ratio (WHtR = waist / height).
 */
export function calculateWHtR(waistCm: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  return Number((waistCm / heightCm).toFixed(2));
}

/**
 * Categorizes cardiometabolic risk according to Waist-to-Height Ratio (WHtR).
 */
export function getWHtRStatus(whtr: number): string {
  if (whtr <= 0) return 'Sin datos';
  if (whtr < 0.40) return 'Bajo peso / Delgado';
  if (whtr <= 0.50) return 'Óptimo (Bajo riesgo)';
  if (whtr <= 0.60) return 'Riesgo Elevado (Grasa Visceral)';
  return 'Riesgo Muy Alto (Alta Adiposidad)';
}

/**
 * Calculates a 0-100 overall Vitality / Health score based on multi-biometric proximity to optimal,
 * incorporating Waist-to-Height Ratio (WHtR) when height and waist are available.
 */
export function calculateOverallVitalityScore(
  systolic: number,
  diastolic: number,
  heartRate: number,
  bodyMass: number,
  activeSupplementsCount: number,
  whtr?: number
): number {
  // Pressure penalty: distance from optimal 115/75
  const bpDist = Math.max(0, systolic - 115) * 0.7 + Math.max(0, diastolic - 75) * 0.8;
  const bpScore = Math.max(0, 100 - bpDist * 2.2);

  // Heart rate penalty: distance from resting optimal 64 bpm
  const hrDist = Math.abs(heartRate - 64);
  const hrScore = Math.max(0, 100 - hrDist * 2.5);

  // Body mass / BMI penalty: distance from optimal 22.5
  const massDist = Math.abs(bodyMass - 22.5);
  const massScore = Math.max(0, 100 - massDist * 6.0);

  // Waist-to-Height Ratio penalty (visceral adiposity factor)
  let whtrPenalty = 0;
  if (whtr && whtr > 0.50) {
    whtrPenalty = (whtr - 0.50) * 45;
  }

  // Functional supplement synergy bonus
  const supplementBonus = Math.min(18, activeSupplementsCount * 4.5);

  const rawScore =
    bpScore * 0.40 +
    hrScore * 0.25 +
    massScore * 0.25 +
    Math.max(0, 100 - whtrPenalty * 10) * 0.10 +
    supplementBonus;

  return Math.min(99, Math.max(20, Math.round(rawScore)));
}

/**
 * Computes projected impact of active supplements, height, waist circumference and calorie intake on client biometrics.
 */
export function calculateProjectedImpact(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  weeks: number = 8
): ProjectedImpactSummary & { waistDelta: number; whtr: number; whtrStatus: string } {
  const weeksClamped = Math.max(1, Math.min(24, weeks));
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;

  // 1. Caloric Delta vs baseline
  const baselineCal = biometrics.dailyCalories || 2100;
  const calorieDelta = simulatedCalories - baselineCal;

  // Extra thermogenic burn from metabolic supplements
  const supplementBurn = selectedSupplements.reduce(
    (sum, s) => sum + (s.caloricBurnBonus ?? 0),
    0
  );
  const netDailyCaloricDelta = calorieDelta - supplementBurn;

  // 2. Weight impact from net calories (7700 kcal ≈ 1 kg)
  const weeklyCaloricWeightChange = (netDailyCaloricDelta * 7) / 7700;

  // Extra weight reduction from supplements
  const supplementWeeklyWeightRate = selectedSupplements.reduce(
    (sum, s) => sum + s.weightImpactRateKgPerWeek,
    0
  );
  const totalWeeklyWeightChange = weeklyCaloricWeightChange + supplementWeeklyWeightRate;
  const totalWeightDelta = Number((totalWeeklyWeightChange * weeksClamped).toFixed(2));

  // 3. Waist circumference & WHtR projection (1 kg fat loss ≈ 1 cm waist reduction)
  const waistDelta = Number(totalWeightDelta.toFixed(1));
  const projectedWaist = Math.max(40, waistCm + waistDelta);
  const currentWhtr = calculateWHtR(waistCm, heightCm);
  const projectedWhtr = calculateWHtR(projectedWaist, heightCm);
  const whtrStatus = getWHtRStatus(projectedWhtr);

  // Visceral fat peripheral resistance load on systolic BP (if WHtR > 0.50)
  const visceralFatBpLoad = currentWhtr > 0.50 ? (currentWhtr - 0.50) * 10 : 0;

  // 4. Body Mass / BMI impact (Calculated dynamically using Height when available)
  const projectedWeight = Math.max(40, biometrics.bodyWeight + totalWeightDelta);
  const baselineBmi = biometrics.height
    ? calculateBMI(biometrics.bodyWeight, biometrics.height)
    : biometrics.bodyMass || 24;
  const projectedMass = biometrics.height
    ? calculateBMI(projectedWeight, biometrics.height)
    : Math.max(16, Math.min(45, (biometrics.bodyMass || 24) + (totalWeightDelta / biometrics.bodyWeight) * 20));

  const totalBodyMassDelta = Number((projectedMass - baselineBmi).toFixed(2));

  // 5. Blood pressure effects:
  const weightBpSystolicImpact = totalWeightDelta * 0.95;
  const weightBpDiastolicImpact = totalWeightDelta * 0.65;

  const rawSupplementSystolic = selectedSupplements.reduce((sum, s) => sum + s.systolicEffect, 0);
  const rawSupplementDiastolic = selectedSupplements.reduce((sum, s) => sum + s.diastolicEffect, 0);
  const rawSupplementHr = selectedSupplements.reduce((sum, s) => sum + s.heartRateEffect, 0);

  // Saturation factor prevents excessive compounding of many supplements
  const satFactor = 1 / (1 + 0.03 * Math.abs(rawSupplementSystolic));
  const finalSuppSystolic = rawSupplementSystolic * satFactor;
  const finalSuppDiastolic = rawSupplementDiastolic * satFactor;
  const finalSuppHr = rawSupplementHr * (1 / (1 + 0.03 * Math.abs(rawSupplementHr)));

  // Combine physiological factors (including visceral fat BP load)
  const totalSystolicDelta = Number((finalSuppSystolic + weightBpSystolicImpact + visceralFatBpLoad).toFixed(1));
  const totalDiastolicDelta = Number((finalSuppDiastolic + weightBpDiastolicImpact + visceralFatBpLoad * 0.6).toFixed(1));
  const totalHeartRateDelta = Number(finalSuppHr.toFixed(1));

  // Projected values
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
  };
}

/**
 * Generates dynamic week-by-week multi-curve trajectory points from baseline (Week 0) to timelineWeeks.
 */
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
        targetSystolic: goals.targetSystolicBP,
        targetDiastolic: goals.targetDiastolicBP,
        targetHeartRate: goals.targetHeartRate,
        targetWeight: goals.targetWeight,
        targetBodyMass: goals.targetBodyMass,
      });
      continue;
    }

    const progressRatio = w / weeksTotal;
    const adaptationCurve = 1 - Math.exp(-2.2 * progressRatio);

    const curSystolic = Number((biometrics.systolicBP + impact.systolicDelta * adaptationCurve).toFixed(1));
    const curDiastolic = Number((biometrics.diastolicBP + impact.diastolicDelta * adaptationCurve).toFixed(1));
    const curHr = Number((biometrics.heartRate + impact.heartRateDelta * adaptationCurve).toFixed(1));
    const curWeight = Number((biometrics.bodyWeight + impact.weightDelta * progressRatio).toFixed(1));

    // Dynamic BMI calculation using height
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

    points.push({
      week: w,
      weekLabel: `Sem ${w}`,
      systolicBP: curSystolic,
      diastolicBP: curDiastolic,
      heartRate: curHr,
      bodyWeight: curWeight,
      bodyMass: curMass,
      generalHealthScore: curScore,
      targetSystolic: goals.targetSystolicBP,
      targetDiastolic: goals.targetDiastolicBP,
      targetHeartRate: goals.targetHeartRate,
      targetWeight: goals.targetWeight,
      targetBodyMass: goals.targetBodyMass,
    });
  }

  return points;
}

/**
 * AI / Clinical Rule-based Recommendation Engine:
 * Analyzes client biometrics (including height and waist circumference) against selected supplements and calorie goals.
 */
export function generateNutritionalRecommendations(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  allProducts: Product[]
): NutritionRecommendation[] {
  const recs: NutritionRecommendation[] = [];
  const activeIds = new Set(selectedSupplements.map((s) => s.id));
  const activeNames = selectedSupplements.map((s) => s.name.toLowerCase());
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;

  // 1. Blood Pressure Analysis
  const bpCat = getBloodPressureCategory(biometrics.systolicBP, biometrics.diastolicBP);
  if (biometrics.systolicBP >= 130 || biometrics.diastolicBP >= 85) {
    const hasOmega = activeIds.has('SUP-OMEGA3');
    const hasMagnesium = activeIds.has('SUP-MAGNESIO');

    if (!hasOmega || !hasMagnesium) {
      const needed: string[] = [];
      if (!hasOmega) needed.push('Omega-3 EPA/DHA');
      if (!hasMagnesium) needed.push('Magnesio Bisglicinato Quelado');

      recs.push({
        id: 'rec-bp-vasodilation',
        category: 'presion',
        urgency: biometrics.systolicBP >= 140 ? 'alta' : 'media',
        title: `Protocolo Endotelial Anti-Hipertensivo (${bpCat})`,
        message: `Tu presión actual (${biometrics.systolicBP}/${biometrics.diastolicBP} mmHg) indica resistencia vascular periférica. Añadir ${needed.join(' y ')} incrementará la síntesis de óxido nítrico y relajará la musculatura lisa arterial (-7 mmHg proyectado).`,
        suggestedAction: 'Incorporar vasodilatadores naturales al plan diario',
        relatedProductId: 'NV-104',
      });
    }
  } else if (biometrics.systolicBP <= 118 && biometrics.diastolicBP <= 76) {
    recs.push({
      id: 'rec-bp-optimal',
      category: 'presion',
      urgency: 'positiva',
      title: 'Presión Arterial en Rango Óptimo',
      message: `Excelente control cardiovascular (${biometrics.systolicBP}/${biometrics.diastolicBP} mmHg). Tus arterias presentan óptima compliance elástica. Mantén el consumo de antioxidantes y potasio.`,
      suggestedAction: 'Mantener hidratación celular y electrolitos',
      relatedProductId: 'NV-102',
    });
  }

  // 2. Waist-to-Height Ratio (WHtR) & Visceral Fat Risk Analysis
  const whtr = calculateWHtR(waistCm, heightCm);
  if (whtr > 0.50) {
    recs.push({
      id: 'rec-whtr-visceral',
      category: 'suplemento',
      urgency: whtr > 0.60 ? 'alta' : 'media',
      title: `Optimización de Grasa Visceral (Cintura/Altura: ${whtr})`,
      message: `Tu relación cintura/estatura de ${whtr} (${getWHtRStatus(whtr)}) señala acumulación de tejido adiposo visceral en cintura (${waistCm} cm). Aplicar un déficit calórico de 250 kcal/día reducirá la tensión mecánica sobre la circulación.`,
      suggestedAction: 'Aplicar déficit calórico moderado y ejercicio aeróbico',
      suggestedCalorieDelta: -250,
      relatedProductId: 'NV-101',
    });
  }

  // 3. Heart Rate / Pulsaciones Analysis
  if (biometrics.heartRate >= 80) {
    const hasAshwa = activeIds.has('SUP-ASHWAGANDHA');
    if (!hasAshwa) {
      recs.push({
        id: 'rec-hr-parasympathetic',
        category: 'pulsaciones',
        urgency: 'media',
        title: 'Estabilización del Ritmo Cardíaco en Reposo',
        message: `Tus pulsaciones en reposo (${biometrics.heartRate} lpm) superan la media óptima (60-72 lpm), señalando tono simpático o cortisol reactivo. El extracto de Ashwagandha KSM-66 y la CoQ10 modulan el ritmo miocárdico (-4.5 lpm).`,
        suggestedAction: 'Añadir adaptógenos reguladores del tono autónomo',
        relatedProductId: 'NV-108',
      });
    }
  }

  // 4. Caloric Intake & Weight / Body Mass Goals Analysis
  const calDelta = simulatedCalories - goals.targetCalories;
  if (calDelta > 250) {
    recs.push({
      id: 'rec-cal-surplus',
      category: 'calorias',
      urgency: 'media',
      title: `Ajuste Calórico: Excedente de +${calDelta} kcal/día`,
      message: `Tu consumo simulado (${simulatedCalories} kcal) excede tu meta de déficit/control (${goals.targetCalories} kcal). Este excedente frena la pérdida de peso en ~0.3 kg/semana e incrementa la volemia arterial.`,
      suggestedAction: `Reducir ${calDelta} kcal mediante reemplazo por batido funcional saciante`,
      suggestedCalorieDelta: -calDelta,
      relatedProductId: 'NV-101',
    });
  } else if (calDelta < -400) {
    recs.push({
      id: 'rec-cal-deficit-excess',
      category: 'alerta',
      urgency: 'media',
      title: 'Alerta de Déficit Calórico Muy Agresivo',
      message: `Un déficit excesivo (${Math.abs(calDelta)} kcal por debajo de tu meta) puede inducir pérdida de masa magra y estrés suprarrenal. Asegura un mínimo de 1.6g de proteína/kg para proteger tu masa corporal.`,
      suggestedAction: 'Aumentar la densidad proteica sin sumar azúcares simples',
      suggestedCalorieDelta: 250,
      relatedProductId: 'NV-101',
    });
  } else {
    recs.push({
      id: 'rec-cal-balanced',
      category: 'calorias',
      urgency: 'positiva',
      title: 'Balance Calórico y Metabólico Alineado',
      message: `Tu dieta calórica (${simulatedCalories} kcal/día) está perfectamente sincronizada con tu meta (${goals.targetCalories} kcal/día). Proyectas un progreso sostenible hacia tu peso objetivo de ${goals.targetWeight} kg.`,
      suggestedAction: 'Continuar con el régimen actual y asegurar hidratación',
    });
  }

  // 5. Synergy recommendation for Body Mass preservation
  if (biometrics.bodyWeight > goals.targetWeight && !activeNames.some((n) => n.includes('proteína') || n.includes('matcha'))) {
    recs.push({
      id: 'rec-body-mass-protection',
      category: 'suplemento',
      urgency: 'preventiva',
      title: 'Protección de Masa Corporal & Aceleración Termogénica',
      message: 'Durante el proceso de reducción de peso, incorporar proteína vegetal germinada con Matcha ceremonial previene la degradación muscular e incrementa el gasto energético basal en +120 kcal/día.',
      suggestedAction: 'Añadir Proteína Bio-Activa Matcha a la simulación',
      relatedProductId: 'NV-101',
    });
  }

  // 6. Electrolyte / Sodium balance recommendation
  if (!activeIds.has('SUP-POTASIO_ELECTRO') && biometrics.systolicBP >= 125) {
    recs.push({
      id: 'rec-electrolytes',
      category: 'suplemento',
      urgency: 'preventiva',
      title: 'Optimización del Ratio Sodio/Potasio',
      message: 'El citrato de potasio promueve la natriuresis renal (eliminación de sodio acumulado), reduciendo la presión intravascular y la retención de líquidos en 2 a 3 semanas.',
      suggestedAction: 'Integrar complejo de potasio y electrolitos en el desayuno',
    });
  }

  return recs;
}
