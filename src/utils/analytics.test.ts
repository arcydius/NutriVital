import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateAdmin,
  calculateCartSummary,
  calculateOrdinaryLinearRegression,
  computeProductStatus,
  deductInventoryAfterPurchase,
  generateWellnessProjection,
} from './analytics';
import { AdminUser, Product, SaleRecord } from '../types/nutrivital';
import {
  calculateAge,
  calculateProjectedImpact,
  calculateSeriesLinearRegression,
  generateDynamicBiometricTrend,
  generateNutritionalRecommendations,
  getBloodPressureCategory,
  getMedicalMetricRange,
} from './healthAnalytics';
import { AVAILABLE_SUPPLEMENTS, INITIAL_PRODUCTS } from '../data/seedData';
import { analyzeMedicalReportFile, parseTextLabMarkers } from './medicalReportAnalyzer';

const sampleProduct: Product = {
  id: 'NV-01',
  name: 'Proteína Vegetal Matcha & Vainilla',
  category: 'Batidos Proteicos',
  tag: '100% Orgánico',
  calories: 130,
  protein: 24,
  fiber: 5,
  price: 40,
  stock: 15,
  status: 'Activo',
  description: 'Aislado de proteína de guisante y arroz.',
  servingSize: '32g por porción',
  illustration: 'protein-matcha',
};

test('calculateOrdinaryLinearRegression computes exact OLS slope m, intercept b, and R^2 for collinear data', () => {
  // Exact line: y = 150x + 1000
  const exactLinearSales: SaleRecord[] = [
    { week: 1, weekLabel: 'Sem 1', revenue: 1150, units: 23, ordersCount: 12 },
    { week: 2, weekLabel: 'Sem 2', revenue: 1300, units: 26, ordersCount: 14 },
    { week: 3, weekLabel: 'Sem 3', revenue: 1450, units: 29, ordersCount: 16 },
    { week: 4, weekLabel: 'Sem 4', revenue: 1600, units: 32, ordersCount: 18 },
  ];

  const result = calculateOrdinaryLinearRegression(
    exactLinearSales,
    'revenue',
    2
  );

  assert.equal(result.slope, 150);
  assert.equal(result.intercept, 1000);
  assert.equal(result.rSquared, 1);
  assert.equal(result.equation, 'y = 150.00x + 1000.00');
  assert.equal(result.nextWeekPrediction, 1750);
  assert.equal(result.points.length, 6); // 4 historical + 2 forecast
  assert.equal(result.points[4].isForecast, true);
  assert.equal(result.points[4].predictedY, 1750);
});

test('calculateCartSummary computes subtotal, 16% tax, and shipping threshold accurately', () => {
  const summaryWithShipping = calculateCartSummary([
    { product: sampleProduct, quantity: 1 }, // $40 < $90 threshold
  ]);
  assert.equal(summaryWithShipping.subtotal, 40);
  assert.equal(summaryWithShipping.tax, 6.4);
  assert.equal(summaryWithShipping.shipping, 6.5);
  assert.equal(summaryWithShipping.total, 52.9);

  const summaryFreeShipping = calculateCartSummary([
    { product: sampleProduct, quantity: 3 }, // $120 >= $90 threshold
  ]);
  assert.equal(summaryFreeShipping.subtotal, 120);
  assert.equal(summaryFreeShipping.tax, 19.2);
  assert.equal(summaryFreeShipping.shipping, 0);
  assert.equal(summaryFreeShipping.total, 139.2);
});

test('deductInventoryAfterPurchase decrements stock and updates status appropriately', () => {
  const updated = deductInventoryAfterPurchase(
    [sampleProduct],
    [{ product: sampleProduct, quantity: 10 }]
  );
  assert.equal(updated[0].stock, 5);
  assert.equal(updated[0].status, 'Bajo Stock');
  assert.equal(computeProductStatus(0), 'Agotado');
});

test('generateWellnessProjection scales monotonically with weeks and adherence', () => {
  const projLow = generateWellnessProjection(6, 55);
  const projHigh = generateWellnessProjection(12, 95);

  assert.equal(projLow.length, 6);
  assert.equal(projHigh.length, 12);
  assert.ok(projHigh[11].energyScore > projLow[5].energyScore);
  assert.ok(projHigh[11].sleepQuality > projHigh[0].sleepQuality);
  assert.ok(
    projHigh[11].inflammationReduction > projHigh[0].inflammationReduction
  );
});

test('authenticateAdmin validates credentials and rejects wrong passwords', () => {
  const admins: AdminUser[] = [
    {
      id: 'ADM-01',
      name: 'Dra. Elena Valdés',
      email: 'admin@nutrivital.com',
      role: 'Administrador General',
      accessCode: 'NV-2026',
      password: 'NutriAdmin2026!',
      createdAt: '2026-01-15',
    },
  ];

  const valid = authenticateAdmin(
    admins,
    'ADMIN@nutrivital.com',
    'NutriAdmin2026!'
  );
  assert.equal(valid.ok, true);

  // Password with accidental clipboard trailing space
  const validWithTrailingSpace = authenticateAdmin(
    admins,
    'admin@nutrivital.com',
    'NutriAdmin2026! '
  );
  assert.equal(validWithTrailingSpace.ok, true);

  // Login using admin ID or accessCode
  const validById = authenticateAdmin(
    admins,
    'ADM-01',
    'NutriAdmin2026!'
  );
  assert.equal(validById.ok, true);

  const validByCode = authenticateAdmin(
    admins,
    'NV-2026',
    'NutriAdmin2026!'
  );
  assert.equal(validByCode.ok, true);

  const invalidPass = authenticateAdmin(
    admins,
    'admin@nutrivital.com',
    'wrong-pass'
  );
  assert.equal(invalidPass.ok, false);

  const emptyPass = authenticateAdmin(
    admins,
    'admin@nutrivital.com',
    '   '
  );
  assert.equal(emptyPass.ok, false);
});

test('getBloodPressureCategory classifies BP according to ACC/AHA thresholds', () => {
  assert.equal(getBloodPressureCategory(115, 75), 'Óptima');
  assert.equal(getBloodPressureCategory(124, 78), 'Normal');
  assert.equal(getBloodPressureCategory(132, 84), 'Elevada');
  assert.equal(getBloodPressureCategory(144, 92), 'Hipertensión E1');
  assert.equal(getBloodPressureCategory(165, 105), 'Hipertensión E2');
});

test('calculateProjectedImpact calculates blood pressure and weight changes accurately', () => {
  const bio = {
    systolicBP: 130,
    diastolicBP: 85,
    heartRate: 78,
    bodyWeight: 80,
    bodyMass: 26.5,
    dailyCalories: 2400,
    lastUpdated: '2026-11-01',
  };
  const goals = {
    targetSystolicBP: 120,
    targetDiastolicBP: 80,
    targetHeartRate: 70,
    targetWeight: 75,
    targetBodyMass: 24,
    targetCalories: 2000,
    timelineWeeks: 8,
  };

  // Select vasodilating supplements: Omega-3 and Magnesio
  const supplements = AVAILABLE_SUPPLEMENTS.filter(
    (s) => s.id === 'SUP-OMEGA3' || s.id === 'SUP-MAGNESIO'
  );

  const impact = calculateProjectedImpact(bio, goals, supplements, 2000, 8);

  // Pressure should decrease (negative delta)
  assert.ok(impact.systolicDelta < 0, 'Systolic delta should be negative');
  assert.ok(impact.diastolicDelta < 0, 'Diastolic delta should be negative');
  assert.ok(impact.weightDelta < 0, 'Weight delta should be negative due to 400 kcal deficit');
  assert.equal(impact.trendDirection, 'improving');
});

test('generateDynamicBiometricTrend generates trajectory points including baseline and final week', () => {
  const bio = {
    systolicBP: 128,
    diastolicBP: 84,
    heartRate: 76,
    bodyWeight: 75,
    bodyMass: 25,
    dailyCalories: 2200,
    lastUpdated: '2026-11-01',
  };
  const goals = {
    targetSystolicBP: 118,
    targetDiastolicBP: 78,
    targetHeartRate: 70,
    targetWeight: 70,
    targetBodyMass: 23,
    targetCalories: 1950,
    timelineWeeks: 8,
  };

  const points = generateDynamicBiometricTrend(bio, goals, [AVAILABLE_SUPPLEMENTS[0]], 2000, 8);
  assert.ok(points.length >= 5);
  assert.equal(points[0].week, 0);
  assert.equal(points[0].systolicBP, 128);
  assert.equal(points[points.length - 1].week, 8);
  assert.ok(points[points.length - 1].systolicBP < 128);
});

test('generateNutritionalRecommendations flags elevated BP and caloric imbalance', () => {
  const bio = {
    systolicBP: 136,
    diastolicBP: 88,
    heartRate: 84,
    bodyWeight: 88,
    bodyMass: 28.6,
    dailyCalories: 2600,
    lastUpdated: '2026-11-01',
  };
  const goals = {
    targetSystolicBP: 120,
    targetDiastolicBP: 80,
    targetHeartRate: 72,
    targetWeight: 80,
    targetBodyMass: 25,
    targetCalories: 2100,
    timelineWeeks: 8,
  };

  const recs = generateNutritionalRecommendations(bio, goals, [], 2600, INITIAL_PRODUCTS);
  assert.ok(recs.some((r) => r.category === 'presion'), 'Should recommend BP protocol');
  assert.ok(recs.some((r) => r.category === 'pulsaciones'), 'Should recommend heart rate calming');
  assert.ok(recs.some((r) => r.category === 'calorias'), 'Should recommend caloric adjustment');
});

test('parseTextLabMarkers extracts multi-analyte lab values and flags clinical findings', () => {
  const labText = `
    INFORME DE LABORATORIO CLINICO
    Fecha: 2026-11-15
    Glucosa basal: 114 mg/dL (Ref: 70-99)
    Hemoglobina Glicosilada (HbA1c): 6.0 %
    Colesterol LDL: 148 mg/dL
    Triglicéridos: 210 mg/dL
    Potasio sérico: 5.3 mEq/L
    Creatinina: 1.4 mg/dL
    Vitamina D (25-OH): 22 ng/mL
    Presión Arterial: 136/88 mmHg
    Frecuencia Cardíaca: 78 lpm
  `;

  const record = parseTextLabMarkers(labText, 'analitica_completa.txt');
  assert.ok(record !== null, 'Record should be parsed');
  assert.equal(record.markers.fastingGlucose, 114);
  assert.equal(record.markers.hba1c, 6.0);
  assert.equal(record.markers.ldlCholesterol, 148);
  assert.equal(record.markers.triglycerides, 210);
  assert.equal(record.markers.potassium, 5.3);
  assert.equal(record.markers.creatinine, 1.4);
  assert.equal(record.markers.vitaminD, 22);
  assert.equal(record.detectedSystolicBP, 136);
  assert.equal(record.detectedDiastolicBP, 88);
  assert.equal(record.detectedHeartRate, 78);
  assert.ok(record.contraindications.some((c) => c.includes('potasio')));
  assert.ok(record.flaggedFindings.some((f) => f.includes('Triglicéridos')));
});

test('generateNutritionalRecommendations integrates lab reports with renal and lipid alerts', () => {
  const bio = {
    systolicBP: 125,
    diastolicBP: 80,
    heartRate: 70,
    bodyWeight: 75,
    bodyMass: 24.5,
    dailyCalories: 2200,
    lastUpdated: '2026-11-01',
  };
  const goals = {
    targetSystolicBP: 118,
    targetDiastolicBP: 78,
    targetHeartRate: 68,
    targetWeight: 72,
    targetBodyMass: 23.5,
    targetCalories: 2000,
    timelineWeeks: 8,
  };

  const sampleReport = {
    id: 'REP-TEST-1',
    fileName: 'chequeo_renal_lipidos.pdf',
    reportType: 'Chequeo Cardiometabólico' as const,
    reportDate: '2026-11-15',
    uploadedAt: '10:30',
    aiClinicalSummary: 'Potasio elevado y triglicéridos altos.',
    markers: {
      potassium: 5.4,
      creatinine: 1.38,
      triglycerides: 220,
      ldlCholesterol: 145,
    },
    flaggedFindings: ['Potasio sérico elevado', 'Triglicéridos elevados'],
    contraindications: ['Evitar suplementos concentrados de potasio'],
  };

  const recs = generateNutritionalRecommendations(
    bio,
    goals,
    [],
    2200,
    INITIAL_PRODUCTS,
    undefined,
    'presion',
    [sampleReport]
  );

  const renalAlert = recs.find((r) => r.id === 'rec-lab-renal-guard');
  assert.ok(renalAlert, 'Should trigger renal guard alert');
  assert.equal(renalAlert.urgency, 'alta');

  const lipidRec = recs.find((r) => r.id === 'rec-lab-lipids-omega3');
  assert.ok(lipidRec, 'Should trigger lipid modulation recommendation');
  assert.ok(lipidRec.message.includes('Omega-3'));
});

test('analyzeMedicalReportFile correctly analyzes text files asynchronously', async () => {
  const sampleContent = 'Glucosa: 108 mg/dL\nTrigliceridos: 195 mg/dL\nVitamina D: 25 ng/mL\nPresion Arterial: 130/84 mmHg';
  const file = new File([sampleContent], 'laboratorio_paciente.txt', { type: 'text/plain' });

  const analyzed = await analyzeMedicalReportFile(file);
  assert.equal(analyzed.fileName, 'laboratorio_paciente.txt');
  assert.equal(analyzed.markers.fastingGlucose, 108);
  assert.equal(analyzed.markers.triglycerides, 195);
  assert.equal(analyzed.markers.vitaminD, 25);
  assert.equal(analyzed.detectedSystolicBP, 130);
  assert.equal(analyzed.detectedDiastolicBP, 84);
});

test('age-adjusted blood pressure & color-coded medical range evaluations work accurately', () => {
  const age = calculateAge('1950-01-01');
  assert.ok(age !== undefined && age >= 70);

  // 126 mmHg systolic: borderline for young adult, normal for >= 65
  const youngEval = getMedicalMetricRange('systolic', 126, 35);
  const seniorEval = getMedicalMetricRange('systolic', 126, 72);
  assert.equal(youngEval.status, 'borderline');
  assert.equal(seniorEval.status, 'normal');

  // Heart rate zones
  assert.equal(getMedicalMetricRange('heartRate', 68).status, 'normal');
  assert.equal(getMedicalMetricRange('heartRate', 88).status, 'borderline');
  assert.equal(getMedicalMetricRange('heartRate', 105).status, 'critical');

  // Fatty liver grading
  assert.equal(getMedicalMetricRange('fattyLiver', 0).status, 'normal');
  assert.equal(getMedicalMetricRange('fattyLiver', 1).status, 'borderline');
  assert.equal(getMedicalMetricRange('fattyLiver', 2).status, 'critical');
});

test('calculateSeriesLinearRegression computes accurate OLS slope and R-squared', () => {
  const reg = calculateSeriesLinearRegression([
    { x: 0, y: 80 },
    { x: 1, y: 78 },
    { x: 2, y: 76 },
    { x: 3, y: 74 },
  ]);
  assert.equal(reg.slope, -2);
  assert.equal(reg.intercept, 80);
  assert.equal(reg.rSquared, 1);
  assert.equal(reg.predict(4), 72);
});

test('Coffee and Salt supplements exist and Fatty Liver recommendations trigger', () => {
  const coffee = AVAILABLE_SUPPLEMENTS.find((s) => s.id === 'SUP-CAFE');
  const salt = AVAILABLE_SUPPLEMENTS.find((s) => s.id === 'SUP-SAL');
  assert.ok(coffee, 'Coffee supplement should exist');
  assert.ok(salt, 'Salt supplement should exist');
  assert.ok(coffee.heartRateEffect > 0);
  assert.ok(salt.systolicEffect > 0);

  const bio = {
    systolicBP: 132,
    diastolicBP: 84,
    heartRate: 78,
    bodyWeight: 85,
    bodyMass: 27.5,
    dailyCalories: 2400,
    fattyLiverGrade: 2 as const,
    lastUpdated: '2026-11-17',
  };
  const goals = {
    targetSystolicBP: 120,
    targetDiastolicBP: 80,
    targetHeartRate: 68,
    targetWeight: 78,
    targetBodyMass: 24.5,
    targetCalories: 2000,
    timelineWeeks: 8,
  };

  const trend = generateDynamicBiometricTrend(bio, goals, [salt], 2400, 8);
  assert.ok(trend[0].fattyLiverScore !== undefined && trend[0].fattyLiverScore > 0);

  const recs = generateNutritionalRecommendations(bio, goals, [salt], 2400, INITIAL_PRODUCTS, trend, 'higado_graso', []);
  assert.ok(recs.some((r) => r.id === 'rec-fatty-liver-protocol'), 'Should recommend fatty liver protocol');
  assert.ok(recs.some((r) => r.id === 'rec-sodium-alert'), 'Should warn about active sodium/salt');
});
