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

export type AdminRole = 'Administrador General' | 'Directora de Nutrición' | 'Analista de Operaciones';

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
