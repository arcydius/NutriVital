import {
  BiometricTrendPoint,
  ClientBiometrics,
  ClientHealthGoals,
  NutritionRecommendation,
  Product,
  ProjectedImpactSummary,
  SupplementItem,
} from '../types/nutrivital';

export type ChartMetricFocus = 'presion' | 'pulsaciones' | 'peso_masa' | 'vitalidad';

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
 * AI / Predictive Chart Recommendation Engine:
 * Analyzes real curve trajectories (Sem 0 -> Sem N) against client goals and active chart view.
 */
export function generateNutritionalRecommendations(
  biometrics: ClientBiometrics,
  goals: ClientHealthGoals,
  selectedSupplements: SupplementItem[],
  simulatedCalories: number,
  allProducts: Product[],
  trendPoints: BiometricTrendPoint[] = [],
  selectedChartMetric: ChartMetricFocus = 'presion'
): NutritionRecommendation[] {
  const recs: NutritionRecommendation[] = [];
  const activeIds = new Set(selectedSupplements.map((s) => s.id));
  const activeNames = selectedSupplements.map((s) => s.name.toLowerCase());
  const heightCm = biometrics.height || 170;
  const waistCm = biometrics.waistCircumference || 80;

  // Extracción de puntos de la curva real (Inicial vs Final Proyectado)
  const fallbackTrend =
    trendPoints.length > 0
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

  // 1. Análisis Predictivo de Curva de Presión Arterial
  const sysGapToGoal = Number((finalPt.systolicBP - goals.targetSystolicBP).toFixed(1));
  const diaGapToGoal = Number((finalPt.diastolicBP - goals.targetDiastolicBP).toFixed(1));
  const projectedBpCat = getBloodPressureCategory(finalPt.systolicBP, finalPt.diastolicBP);

  if (sysGapToGoal > 2 || diaGapToGoal > 2 || finalPt.systolicBP >= 128) {
    const hasOmega = activeIds.has('SUP-OMEGA3');
    const hasMagnesium = activeIds.has('SUP-MAGNESIO');

    const recommendedSuppId = !hasOmega
      ? 'SUP-OMEGA3'
      : !hasMagnesium
        ? 'SUP-MAGNESIO'
        : 'SUP-POTASIO_ELECTRO';
    const recommendedSuppLabel = !hasOmega
      ? 'Omega-3 Vegano EPA+DHA'
      : !hasMagnesium
        ? 'Magnesio Bisglicinato Quelado'
        : 'Complejo de Potasio & Electrolitos';

    recs.push({
      id: 'rec-curve-bp-gap',
      category: 'presion',
      urgency: finalPt.systolicBP >= 138 || sysGapToGoal >= 10 ? 'alta' : 'media',
      title: `Brecha Arterial Detectada en Curva (${projectedBpCat})`,
      message: `La curva proyecta cerrar en ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg en ${finalWeekLabel}, quedando +${Math.max(0, sysGapToGoal).toFixed(1)} mmHg por encima de tu meta (${goals.targetSystolicBP}/${goals.targetDiastolicBP} mmHg). Integrar ${recommendedSuppLabel} acelerará la vasodilatación endotelial.`,
      suggestedAction: `Simular ${recommendedSuppLabel} para doblar la curva hacia tu meta`,
      relatedProductId: 'NV-104',
      relatedSupplementId: recommendedSuppId,
      chartMetricTrigger: 'presion',
      metricEvidence: `${Math.round(initialPt.systolicBP)}/${Math.round(initialPt.diastolicBP)} → ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg (Meta: ${goals.targetSystolicBP}/${goals.targetDiastolicBP})`,
    });
  } else {
    recs.push({
      id: 'rec-curve-bp-converging',
      category: 'presion',
      urgency: 'positiva',
      title: 'Curva de Presión Arterial Convergiendo a la Meta',
      message: `La trayectoria arterial desciende de ${Math.round(initialPt.systolicBP)}/${Math.round(initialPt.diastolicBP)} mmHg a ${Math.round(finalPt.systolicBP)}/${Math.round(finalPt.diastolicBP)} mmHg en ${finalWeekLabel}, alineándose con tu objetivo clínico (${goals.targetSystolicBP}/${goals.targetDiastolicBP} mmHg).`,
      suggestedAction: 'Mantener protocolo antioxidante y balance electrolítico actual',
      relatedProductId: 'NV-102',
      relatedSupplementId: 'SUP-MAGNESIO',
      chartMetricTrigger: 'presion',
      metricEvidence: `Tendencia: ${(finalPt.systolicBP - initialPt.systolicBP).toFixed(1)} mmHg en ${finalWeekLabel}`,
    });
  }

  // 2. Análisis Predictivo de Curva de Ritmo Cardíaco (Pulsaciones)
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
      relatedProductId: 'NV-108',
      relatedSupplementId: 'SUP-ASHWAGANDHA',
      chartMetricTrigger: 'pulsaciones',
      metricEvidence: `${Math.round(initialPt.heartRate)} lpm → ${Math.round(finalPt.heartRate)} lpm (Meta: ${goals.targetHeartRate} lpm)`,
    });
  }

  // 3. Análisis Predictivo de Peso, IMC, Cintura (WHtR) y Balance Calórico
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
      relatedProductId: 'NV-101',
      relatedSupplementId: 'SUP-PROTEINA_MATCHA',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `${initialPt.bodyWeight} kg → ${finalPt.bodyWeight} kg · IMC ${finalPt.bodyMass} (Meta: ${goals.targetWeight} kg)`,
    });
  } else if (calDeltaVsTarget < -400) {
    recs.push({
      id: 'rec-curve-aggressive-deficit',
      category: 'alerta',
      urgency: 'media',
      title: `Déficit Calórico Excesivo Detectado (${simulatedCalories} kcal/día)`,
      message: `El simulador opera ${Math.abs(calDeltaVsTarget)} kcal por debajo de tu meta (${goals.targetCalories} kcal). Aunque el peso baja a ${finalPt.bodyWeight} kg, un recorte tan brusco compromete la masa muscular magra y el score de vitalidad.`,
      suggestedAction: 'Subir +250 kcal con proteína vegetal germinada para proteger masa magra',
      suggestedCalorieDelta: 250,
      relatedProductId: 'NV-101',
      relatedSupplementId: 'SUP-PROTEINA_MATCHA',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `Déficit actual: ${calDeltaVsTarget} kcal vs Meta (${goals.targetCalories} kcal)`,
    });
  } else if (projectedWhtr > 0.50) {
    recs.push({
      id: 'rec-curve-whtr-visceral',
      category: 'suplemento',
      urgency: projectedWhtr > 0.58 ? 'alta' : 'media',
      title: `Reducción de Adiposidad Visceral (WHtR Proyectado: ${projectedWhtr})`,
      message: `Tu relación cintura/estatura proyectada de ${projectedWhtr} (${getWHtRStatus(projectedWhtr)}) sugiere potenciar la termogénesis lipídica. Combinar Proteína Bio-Activa con Matcha acelera la reducción abdominal sin perder tono muscular.`,
      suggestedAction: 'Simular complejo termogénico Matcha & Proteína Germinada',
      relatedProductId: 'NV-101',
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
      relatedProductId: 'NV-101',
      chartMetricTrigger: 'peso_masa',
      metricEvidence: `${initialPt.bodyWeight} kg → ${finalPt.bodyWeight} kg (Meta: ${goals.targetWeight} kg)`,
    });
  }

  // 4. Análisis Predictivo del Score de Vitalidad Celular
  const vitalityGain = finalPt.generalHealthScore - initialPt.generalHealthScore;
  if (finalPt.generalHealthScore < 85 || vitalityGain < 8) {
    const needsThermogenic =
      biometrics.bodyWeight > goals.targetWeight &&
      !activeNames.some((n) => n.includes('proteína') || n.includes('matcha'));

    recs.push({
      id: 'rec-curve-vitality-boost',
      category: 'suplemento',
      urgency: 'preventiva',
      title: `Potenciación de Vitalidad Celular (${finalPt.generalHealthScore}/100 en ${finalWeekLabel})`,
      message: `Tu curva de vitalidad gana ${vitalityGain >= 0 ? `+${vitalityGain}` : vitalityGain} pts hasta alcanzar ${finalPt.generalHealthScore}/100. ${needsThermogenic
          ? 'Incorporar Proteína Bio-Activa Matcha añade +120 kcal de gasto basal y protege la síntesis mitocondrial.'
          : 'Activar cofactores antioxidantes y electrolitos maximiza la pendiente de recuperación celular.'
        }`,
      suggestedAction: 'Activar soporte mitocondrial en la simulación',
      relatedProductId: needsThermogenic ? 'NV-101' : 'NV-102',
      relatedSupplementId: needsThermogenic ? 'SUP-PROTEINA_MATCHA' : 'SUP-POTASIO_ELECTRO',
      chartMetricTrigger: 'vitalidad',
      metricEvidence: `Score: ${initialPt.generalHealthScore}/100 → ${finalPt.generalHealthScore}/100 (${vitalityGain >= 0 ? `+${vitalityGain}` : vitalityGain} pts)`,
    });
  }

  // Ordenar priorizando la pestaña activa en la gráfica y luego la urgencia clínica
  const urgencyWeight: Record<NutritionRecommendation['urgency'], number> = {
    alta: 4,
    media: 3,
    preventiva: 2,
    positiva: 1,
  };

  return recs.sort((a, b) => {
    const aMatchesChart = a.chartMetricTrigger === selectedChartMetric ? 10 : 0;
    const bMatchesChart = b.chartMetricTrigger === selectedChartMetric ? 10 : 0;
    return bMatchesChart + urgencyWeight[b.urgency] - (aMatchesChart + urgencyWeight[a.urgency]);
  });
}