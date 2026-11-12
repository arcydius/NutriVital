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
  slope: number; // m
  intercept: number; // b
  rSquared: number; // R^2
  correlation: number; // r
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

// ==========================================
// CLIENT BIOMETRICS & NUTRITIONAL AI ENGINE
// ==========================================

export interface ClientBiometrics {
  systolicBP: number; // Presión arterial sistólica (mmHg, e.g. 128)
  diastolicBP: number; // Presión arterial diastólica (mmHg, e.g. 84)
  heartRate: number; // Pulsaciones o latidos por minuto en reposo (bpm, e.g. 76)
  bodyWeight: number; // Peso corporal (kg, e.g. 74.5)
  bodyMass: number; // Masa corporal tratada como métrica independiente (IMC o índice magro, e.g. 24.8)
  dailyCalories: number; // Ingesta calórica habitual o simulada (kcal/día, e.g. 2200)
  height?: number; // Estatura o altura (cm, e.g. 170)
  waistCircumference?: number; // Perímetro o circunferencia de cintura (cm, e.g. 80)
  lastUpdated: string;
}

export interface ClientHealthGoals {
  targetSystolicBP: number; // Meta sistólica (mmHg, e.g. 118)
  targetDiastolicBP: number; // Meta diastólica (mmHg, e.g. 78)
  targetHeartRate: number; // Meta de pulsaciones (bpm, e.g. 70)
  targetWeight: number; // Meta de peso corporal (kg, e.g. 70.0)
  targetBodyMass: number; // Meta de masa corporal independiente (e.g. 22.5)
  targetCalories: number; // Meta de dieta calórica (kcal/día, e.g. 1950)
  timelineWeeks: number; // Horizonte de proyección (semanas, e.g. 8)
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Cliente';
  createdAt: string;
  biometrics: ClientBiometrics;
  goals: ClientHealthGoals;
  activeSupplements: string[]; // IDs de suplementos activos en su régimen
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
  | 'Micronutrientes';

export interface SupplementItem {
  id: string;
  name: string;
  category: SupplementCategory;
  tag: string;
  dailyDose: string;
  // Coeficientes de impacto fisiológico cuantificable
  systolicEffect: number; // Variación en mmHg (negativo = reduce presión)
  diastolicEffect: number; // Variación en mmHg
  heartRateEffect: number; // Variación en pulsaciones/bpm (negativo = calma / estabiliza)
  vitalityScoreBonus: number; // Aumento al score de vitalidad general (0..15)
  weightImpactRateKgPerWeek: number; // Impacto semanal en peso (kg)
  bodyMassImpact: number; // Impacto en masa corporal independiente
  caloricBurnBonus?: number; // Aceleración calórica diaria (kcal)
  description: string;
  scientificMechanism: string;
  matchingProductId?: string; // Vinculación con producto del catálogo NutriVital
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
  targetSystolic: number;
  targetDiastolic: number;
  targetHeartRate: number;
  targetWeight: number;
  targetBodyMass: number;
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
}

export interface NutritionRecommendation {
  id: string;
  category: 'presion' | 'pulsaciones' | 'calorias' | 'suplemento' | 'alerta' | 'positiva';
  title: string;
  message: string;
  urgency: 'alta' | 'media' | 'preventiva' | 'positiva';
  suggestedAction: string;
  relatedProductId?: string;
  relatedSupplementId?: string;
  suggestedCalorieDelta?: number;
  chartMetricTrigger?: 'presion' | 'pulsaciones' | 'peso_masa' | 'vitalidad';
  metricEvidence?: string;
}