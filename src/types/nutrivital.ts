export type ProductCategory =
  | 'Batidos Proteicos'
  | 'Superalimentos'
  | 'Suplementos Naturales'
  | 'Snacks Orgánicos';

export type ProductTag =
  | '100% Orgánico'
  | 'Sin Azúcar'
  | 'Keto'
  | 'Vegano'
  | 'Sin Gluten';

export type ProductStatus = 'Activo' | 'Bajo Stock' | 'Agotado';

export type IllustrationVariant =
  | 'protein-matcha'
  | 'spirulina-jar'
  | 'keto-bars'
  | 'omega-capsules'
  | 'cacao-maca'
  | 'collagen-peptides'
  | 'chia-granola'
  | 'ashwagandha-drops';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  tag: ProductTag;
  calories: number;
  protein: number;
  fiber: number;
  price: number;
  stock: number;
  status: ProductStatus;
  description: string;
  servingSize: string;
  illustration: IllustrationVariant;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  totalItems: number;
}

export interface SaleRecord {
  week: number;
  weekLabel: string;
  revenue: number;
  units: number;
  ordersCount: number;
}

export interface RegressionPoint {
  x: number;
  weekLabel: string;
  actualY: number | null;
  predictedY: number;
  residual: number | null;
  isForecast: boolean;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
  equation: string;
  meanX: number;
  meanY: number;
  points: RegressionPoint[];
  nextWeekPrediction: number;
}

export interface WellnessProjectionPoint {
  week: number;
  weekLabel: string;
  energyScore: number;
  sleepQuality: number;
  inflammationReduction: number;
  compositeVitality: number;
}

export interface OrderReceipt {
  id: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export type AdminRole =
  | 'Administrador General'
  | 'Gestor de Catálogo'
  | 'Directora de Nutrición'
  | 'Director de Nutrición'
  | 'Director/a de Nutrición'
  | 'Analista de Operaciones';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  accessCode: string;
  password: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  loggedInAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  recommendedCategory?: ProductCategory;
}

export type Gender = 'Masculino' | 'Femenino' | 'Otro';

export type FattyLiverGrade = 0 | 1 | 2 | 3; // 0=No detectado/Normal, 1=Leve, 2=Moderado, 3=Severo

export type MedicalRangeStatus = 'normal' | 'borderline' | 'critical';

export interface MedicalRangeEvaluation {
  status: MedicalRangeStatus;
  label: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
}

export type ChartMetricView =
  | 'presion'
  | 'pulsaciones'
  | 'peso_masa'
  | 'vitalidad'
  | 'higado_graso';

export type ChartMetricFocus = ChartMetricView;

// ==========================================
// INFORMES MÉDICOS & BIOMARCADORES DE LAB
// ==========================================

export interface MedicalLabMarkers {
  fastingGlucose?: number;   // Glucosa en ayunas (mg/dL, normal: 70-99)
  hba1c?: number;            // Hemoglobina glicosilada (%, normal: <5.7)
  ldlCholesterol?: number;   // Colesterol LDL (mg/dL, óptimo: <100)
  hdlCholesterol?: number;   // Colesterol HDL (mg/dL, óptimo: >50)
  triglycerides?: number;    // Triglicéridos (mg/dL, óptimo: <150)
  vitaminD?: number;         // 25-OH Vitamina D (ng/mL, óptimo: 30-60)
  hsCRP?: number;            // Proteína C Reactiva ultrasensible (mg/L, óptimo: <1.0)
  creatinine?: number;       // Creatinina sérica (mg/dL, normal: 0.6-1.2)
  potassium?: number;        // Potasio sérico (mEq/L, normal: 3.5-5.1)
  ferritin?: number;         // Ferritina (ng/mL, normal: 30-300)
  fattyLiverGrade?: FattyLiverGrade; // Grado de esteatosis hepática detectado
}

export interface MedicalReportRecord {
  id: string;
  fileName: string;
  reportType: 'Analítica Sanguínea' | 'Perfil Lipídico' | 'Chequeo Cardiometabólico' | 'Panel Hormonal & Micronutrientes';
  reportDate: string;
  uploadedAt: string;
  aiClinicalSummary: string;
  markers: MedicalLabMarkers;
  flaggedFindings: string[];
  contraindications: string[]; // Ej. 'Precaución con potasio suplementario', 'Uso de anticoagulantes'
  detectedSystolicBP?: number;
  detectedDiastolicBP?: number;
  detectedHeartRate?: number;
  detectedWeight?: number;
  detectedHeight?: number;
  detectedWaist?: number;
  detectedDailyCalories?: number;
  suggestedGoals?: ClientHealthGoals;
  filePath?: string;
}

// ==========================================
// CLIENT BIOMETRICS & NUTRITIONAL AI ENGINE
// ==========================================

export interface ClientBiometrics {
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  bodyWeight: number;
  bodyMass: number;
  dailyCalories: number;
  height?: number;
  waistCircumference?: number;
  fattyLiverGrade?: FattyLiverGrade; // 0=Normal, 1=Leve, 2=Moderado, 3=Severo
  lastUpdated: string;
}

export interface ClientHealthGoals {
  targetSystolicBP: number;
  targetDiastolicBP: number;
  targetHeartRate: number;
  targetWeight: number;
  targetBodyMass: number;
  targetCalories: number;
  timelineWeeks: number;
  source?: 'ai_report' | 'baseline_default';
  aiRationale?: string;
  generatedFromReportId?: string;
  generatedAt?: string;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Cliente';
  createdAt: string;
  dateOfBirth?: string; // Formato YYYY-MM-DD
  gender?: Gender;
  biometrics?: ClientBiometrics | null;
  goals?: ClientHealthGoals | null;
  activeSupplements: string[];
  medicalReports?: MedicalReportRecord[]; // Informes médicos analizados por IA
}

export interface ClientSession {
  userId: string;
  name: string;
  email: string;
  role: 'Cliente';
  loggedInAt: string;
}

export type SupplementCategory =
  | 'Cardiovascular'
  | 'Metabolismo'
  | 'Adaptógenos'
  | 'Vitalidad Celular'
  | 'Micronutrientes'
  | 'Estimulantes'
  | 'Minerales';

export interface SupplementItem {
  id: string;
  name: string;
  category: SupplementCategory;
  tag: string;
  dailyDose: string;
  systolicEffect: number;
  diastolicEffect: number;
  heartRateEffect: number;
  vitalityScoreBonus: number;
  weightImpactRateKgPerWeek: number;
  bodyMassImpact: number;
  caloricBurnBonus?: number;
  description: string;
  scientificMechanism: string;
  matchingProductId?: string;
}

export interface BiometricTrendPoint {
  week: number;
  weekLabel: string;
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  bodyWeight: number;
  bodyMass: number;
  generalHealthScore: number;
  fattyLiverScore?: number; // 0 a 100 o índice de riesgo hepático
  targetSystolic: number;
  targetDiastolic: number;
  targetHeartRate: number;
  targetWeight: number;
  targetBodyMass: number;
  targetFattyLiverScore?: number;
}

export interface ProjectedImpactSummary {
  systolicDelta: number;
  diastolicDelta: number;
  heartRateDelta: number;
  weightDelta: number;
  bodyMassDelta: number;
  vitalityScore: number;
  vitalityDelta: number;
  calorieDeltaVsMaintenance: number;
  bloodPressureCategory: 'Óptima' | 'Normal' | 'Elevada' | 'Hipertensión E1' | 'Hipertensión E2';
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  fattyLiverRisk?: 'Bajo / Normal' | 'Riesgo Moderado' | 'Esteatosis Activa';
}

export interface NutritionRecommendation {
  id: string;
  category: 'presion' | 'pulsaciones' | 'calorias' | 'suplemento' | 'alerta' | 'positiva' | 'higado';
  title: string;
  message: string;
  urgency: 'alta' | 'media' | 'preventiva' | 'positiva';
  suggestedAction: string;
  relatedProductId?: string;
  relatedSupplementId?: string;
  suggestedCalorieDelta?: number;
  chartMetricTrigger?: ChartMetricView;
  metricEvidence?: string;
}