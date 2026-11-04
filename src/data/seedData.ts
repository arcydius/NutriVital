import {
  AdminUser,
  Product,
  ProductCategory,
  SaleRecord,
} from '../types/nutrivital';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'NV-101',
    name: 'Proteína Bio-Activa Matcha & Vainilla',
    category: 'Batidos Proteicos',
    tag: '100% Orgánico',
    calories: 135,
    protein: 25,
    fiber: 6,
    price: 44.5,
    stock: 28,
    status: 'Activo',
    description:
      'Aislado de proteína de guisante germinado con té verde matcha ceremonial de Uji y enzimas digestivas naturales.',
    servingSize: '34g · 25 porciones',
    illustration: 'protein-matcha',
  },
  {
    id: 'NV-102',
    name: 'Espirulina Azul & Chlorella Celular',
    category: 'Superalimentos',
    tag: '100% Orgánico',
    calories: 45,
    protein: 8,
    fiber: 4,
    price: 36.0,
    stock: 19,
    status: 'Activo',
    description:
      'Microalgas de pared celular rota cultivadas en agua filtrada de manantial para oxigenación celular y desintoxicación.',
    servingSize: '10g · 30 porciones',
    illustration: 'spirulina-jar',
  },
  {
    id: 'NV-103',
    name: 'Barras Ceto Cacao Crudo & Macadamia',
    category: 'Snacks Orgánicos',
    tag: 'Keto',
    calories: 190,
    protein: 12,
    fiber: 9,
    price: 29.0,
    stock: 7,
    status: 'Bajo Stock',
    description:
      'Caja de 12 barras prensadas en frío con nuez de macadamia tostada, nibs de cacao criollo y fibra prebiótica de achicoria.',
    servingSize: '45g · Caja x 12 uds',
    illustration: 'keto-bars',
  },
  {
    id: 'NV-104',
    name: 'Omega-3 Vegano de Microalgas EPA + DHA',
    category: 'Suplementos Naturales',
    tag: 'Sin Azúcar',
    calories: 20,
    protein: 0,
    fiber: 0,
    price: 48.0,
    stock: 34,
    status: 'Activo',
    description:
      'Ácidos grasos esenciales de alta biodisponibilidad extraídos en frío de Schizochytrium sp., libre de metales pesados.',
    servingSize: '60 cápsulas blandas',
    illustration: 'omega-capsules',
  },
  {
    id: 'NV-105',
    name: 'Elixir Adaptógeno Cacao, Maca Negra & Reishi',
    category: 'Superalimentos',
    tag: 'Sin Azúcar',
    calories: 65,
    protein: 4,
    fiber: 5,
    price: 38.5,
    stock: 22,
    status: 'Activo',
    description:
      'Mezcla sinérgica para vitalidad sostenida y enfoque mental sin picos de cortisol, endulzada sutilmente con fruto del monje.',
    servingSize: '15g · 25 porciones',
    illustration: 'cacao-maca',
  },
  {
    id: 'NV-106',
    name: 'Péptidos Bio-Colágeno Marino + Vitamina C Acerola',
    category: 'Suplementos Naturales',
    tag: 'Keto',
    calories: 70,
    protein: 18,
    fiber: 1,
    price: 52.0,
    stock: 15,
    status: 'Activo',
    description:
      'Colágeno hidrolizado tipo I y III de bajo peso molecular enriquecido con ácido hialurónico y acerola orgánica.',
    servingSize: '20g · 30 porciones',
    illustration: 'collagen-peptides',
  },
  {
    id: 'NV-107',
    name: 'Granola Germinada Chía, Cáñamo & Coco',
    category: 'Snacks Orgánicos',
    tag: 'Sin Azúcar',
    calories: 165,
    protein: 9,
    fiber: 7,
    price: 24.0,
    stock: 31,
    status: 'Activo',
    description:
      'Semillas activadas deshidratadas a baja temperatura para preservar enzimas vivas, omega vegetal y textura crujiente.',
    servingSize: '40g · Bolsa 450g',
    illustration: 'chia-granola',
  },
  {
    id: 'NV-108',
    name: 'Extracto KSM-66 Ashwagandha & Magnesio Bisglicinato',
    category: 'Suplementos Naturales',
    tag: '100% Orgánico',
    calories: 10,
    protein: 0,
    fiber: 0,
    price: 41.0,
    stock: 6,
    status: 'Bajo Stock',
    description:
      'Fórmula nocturna para recuperación profunda, regulación del sistema nervioso y descanso reparador.',
    servingSize: '60 cápsulas vegetales',
    illustration: 'ashwagandha-drops',
  },
];

export const INITIAL_SALES_HISTORY: SaleRecord[] = [
  { week: 1, weekLabel: 'Sem 1', revenue: 2420, units: 58, ordersCount: 31 },
  { week: 2, weekLabel: 'Sem 2', revenue: 2680, units: 64, ordersCount: 35 },
  { week: 3, weekLabel: 'Sem 3', revenue: 2590, units: 61, ordersCount: 33 },
  { week: 4, weekLabel: 'Sem 4', revenue: 2940, units: 70, ordersCount: 39 },
  { week: 5, weekLabel: 'Sem 5', revenue: 3180, units: 76, ordersCount: 42 },
  { week: 6, weekLabel: 'Sem 6', revenue: 3410, units: 82, ordersCount: 46 },
  { week: 7, weekLabel: 'Sem 7', revenue: 3350, units: 79, ordersCount: 44 },
  { week: 8, weekLabel: 'Sem 8', revenue: 3720, units: 89, ordersCount: 51 },
  { week: 9, weekLabel: 'Sem 9', revenue: 3960, units: 94, ordersCount: 55 },
  { week: 10, weekLabel: 'Sem 10', revenue: 4210, units: 101, ordersCount: 58 },
];

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'ADM-01',
    name: 'Dra. Elena Valdés',
    email: 'admin@nutrivital.com',
    role: 'Administrador General',
    accessCode: 'NV-ADMIN-01',
    password: 'NutriAdmin2026!',
    createdAt: '2026-01-10',
    lastLogin: '2026-11-03 09:15',
  },
  {
    id: 'ADM-02',
    name: 'Lic. Marcos Salgado',
    email: 'nutricion@nutrivital.com',
    role: 'Directora de Nutrición',
    accessCode: 'NV-NUTRI-02',
    password: 'Vital2026!',
    createdAt: '2026-03-22',
    lastLogin: '2026-11-02 17:40',
  },
];

export const NUTRIBOT_QUICK_CHIPS: {
  label: string;
  query: string;
  response: string;
  recommendedCategory?: ProductCategory;
}[] = [
  {
    label: 'Productos sin gluten',
    query: '¿Qué productos son 100% libres de gluten y fáciles de digerir?',
    response:
      'Todos nuestros suplementos y batidos están certificados libres de gluten. Te recomiendo especialmente la Proteína Bio-Activa Matcha & Vainilla (con enzimas digestivas) y la Granola Germinada de Chía y Cáñamo.',
    recommendedCategory: 'Batidos Proteicos',
  },
  {
    label: 'Energía y enfoque',
    query: 'Busco recomendaciones para mejorar mi energía diaria sin cafeína nerviosa.',
    response:
      'Para energía celular sostenida sin picos de ansiedad, combina el Elixir Adaptógeno de Cacao, Maca Negra & Reishi por la mañana con la Espirulina Azul. Notarás mayor claridad mental desde la semana 2.',
    recommendedCategory: 'Superalimentos',
  },
  {
    label: 'Horarios de envío',
    query: '¿Cuáles son los tiempos, costos y horarios de envío?',
    response:
      'Despachamos en 24h hábiles con empaque eco-térmico de lunes a sábado (8:00 a 19:00). El envío estándar cuesta $6.50 USD y es 100% GRATIS en pedidos superiores a $90.00 USD.',
  },
  {
    label: 'Planes personalizados',
    query: '¿Cómo diseño un plan según mi meta de pérdida de grasa o descanso?',
    response:
      'Puedes usar nuestro simulador "Calcula tu Transformación Saludable" en esta página. Para saciedad y cetosis limpia, elige las Barras Ceto de Macadamia y para descanso reparador el Extracto KSM-66 Ashwagandha.',
    recommendedCategory: 'Suplementos Naturales',
  },
];
