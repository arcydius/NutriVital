-- ============================================================
-- NutriVital — Esquema PostgreSQL para Supabase
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> Run
-- Idempotente: puedes volver a ejecutarlo sin romper datos existentes
-- ============================================================

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función reutilizable para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USUARIOS (Clientes + Administradores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Cliente'
    CHECK (role IN (
      'Cliente',
      'Administrador General',
      'Gestor de Catálogo',
      'Director de Nutrición',
      'Directora de Nutrición',
      'Director/a de Nutrición',
      'Analista de Operaciones'
    )),
  access_code TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IS NULL OR gender IN ('Masculino', 'Femenino', 'Otro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- ============================================================
-- 2. DATOS BIOMÉTRICOS DEL CLIENTE (Actualizados vía informes médicos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_biometrics (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  systolic_bp NUMERIC(5,1) NOT NULL DEFAULT 120.0,
  diastolic_bp NUMERIC(5,1) NOT NULL DEFAULT 80.0,
  heart_rate NUMERIC(5,1) NOT NULL DEFAULT 72.0,
  body_weight NUMERIC(5,1) NOT NULL DEFAULT 70.0,
  height NUMERIC(5,1) DEFAULT 170.0,
  waist_circumference NUMERIC(5,1) DEFAULT 80.0,
  body_mass NUMERIC(5,1) NOT NULL DEFAULT 24.2,
  daily_calories INTEGER NOT NULL DEFAULT 2100,
  fatty_liver_grade SMALLINT NOT NULL DEFAULT 0 CHECK (fatty_liver_grade BETWEEN 0 AND 3),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_biometrics_updated_at ON public.user_biometrics;
CREATE TRIGGER trg_user_biometrics_updated_at
  BEFORE UPDATE ON public.user_biometrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. METAS ORIENTATIVAS DE SALUD (Calculadas por IA según informe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_health_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  target_systolic_bp NUMERIC(5,1) NOT NULL DEFAULT 118.0,
  target_diastolic_bp NUMERIC(5,1) NOT NULL DEFAULT 78.0,
  target_heart_rate NUMERIC(5,1) NOT NULL DEFAULT 68.0,
  target_weight NUMERIC(5,1) NOT NULL DEFAULT 68.0,
  target_body_mass NUMERIC(5,1) NOT NULL DEFAULT 23.5,
  target_calories INTEGER NOT NULL DEFAULT 1950,
  timeline_weeks INTEGER NOT NULL DEFAULT 8 CHECK (timeline_weeks BETWEEN 4 AND 16),
  source TEXT NOT NULL DEFAULT 'baseline_default'
    CHECK (source IN ('ai_report', 'baseline_default')),
  ai_rationale TEXT,
  generated_from_report_id TEXT,
  generated_at TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_health_goals_updated_at ON public.user_health_goals;
CREATE TRIGGER trg_user_health_goals_updated_at
  BEFORE UPDATE ON public.user_health_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. CATÁLOGO DE PRODUCTOS (Gestionado por el Panel Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('Batidos Proteicos', 'Superalimentos', 'Suplementos Naturales', 'Snacks Orgánicos')),
  tag TEXT NOT NULL
    CHECK (tag IN ('100% Orgánico', 'Sin Azúcar', 'Keto', 'Vegano', 'Sin Gluten')),
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC(5,1) NOT NULL DEFAULT 0,
  fiber NUMERIC(5,1) NOT NULL DEFAULT 0,
  price NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Activo'
    CHECK (status IN ('Activo', 'Bajo Stock', 'Agotado')),
  description TEXT,
  serving_size TEXT,
  illustration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);

-- ============================================================
-- 5. SUPLEMENTOS Y FACTORES SIMULABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tag TEXT,
  daily_dose TEXT,
  systolic_effect NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  diastolic_effect NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  heart_rate_effect NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  vitality_score_bonus INTEGER NOT NULL DEFAULT 0,
  weight_impact_rate_kg_per_week NUMERIC(5,3) NOT NULL DEFAULT 0.000,
  body_mass_impact NUMERIC(5,3) NOT NULL DEFAULT 0.000,
  caloric_burn_bonus INTEGER,
  description TEXT,
  scientific_mechanism TEXT,
  matching_product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL
);

-- ============================================================
-- 6. SUPLEMENTOS ACTIVOS POR USUARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_active_supplements (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supplement_id TEXT NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, supplement_id)
);

-- ============================================================
-- 7. INFORMES MÉDICOS ANALIZADOS POR IA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  report_type TEXT NOT NULL
    CHECK (report_type IN (
      'Analítica Sanguínea',
      'Perfil Lipídico',
      'Chequeo Cardiometabólico',
      'Panel Hormonal & Micronutrientes'
    )),
  report_date TEXT,
  uploaded_at TEXT,
  ai_clinical_summary TEXT,
  markers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  flagged_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  contraindications JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_systolic_bp NUMERIC(5,1),
  detected_diastolic_bp NUMERIC(5,1),
  detected_heart_rate NUMERIC(5,1),
  detected_weight NUMERIC(5,1),
  detected_height NUMERIC(5,1),
  detected_waist NUMERIC(5,1),
  suggested_goals_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_created ON public.medical_reports (user_id, created_at DESC);

-- ============================================================
-- 8. PEDIDOS / ÓRDENES Y DETALLE DE ÍTEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Pago Verificado NutriVital Pay',
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(8,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- 9. HISTORIAL DE VENTAS SEMANALES (Regresión Lineal OLS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_history (
  week INTEGER PRIMARY KEY,
  week_label TEXT NOT NULL,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  units INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 10. BUCKET DE SUPABASE STORAGE PARA INFORMES MÉDICOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-reports', 'medical-reports', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- NOTA: Políticas habilitadas para operar directamente con la
-- Anon Key de Vercel mientras usas el sistema de cuentas actual.
-- Cuando migres a Supabase Auth (JWT), restringe cada política
-- usando auth.uid().
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'user_biometrics',
    'user_health_goals',
    'products',
    'supplements',
    'user_active_supplements',
    'medical_reports',
    'orders',
    'order_items',
    'sales_history'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_app_access_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "allow_app_access_%I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "allow_medical_reports_storage" ON storage.objects;
CREATE POLICY "allow_medical_reports_storage"
  ON storage.objects FOR ALL TO anon, authenticated
  USING (bucket_id = 'medical-reports')
  WITH CHECK (bucket_id = 'medical-reports');

-- ============================================================
-- 12. DATOS SEMILLA INICIALES (IDEMPOTENTES)
-- ============================================================
INSERT INTO public.users (id, name, email, password, role, access_code, last_login) VALUES
  ('ADM-01', 'Dra. Elena Valdés', 'admin@nutrivital.com', 'NutriAdmin2026!', 'Administrador General', 'NV-ADMIN-01', '2026-11-03 09:15'),
  ('ADM-02', 'Lic. Marcos Salgado', 'nutricion@nutrivital.com', 'Vital2026!', 'Director de Nutrición', 'NV-NUTRI-02', '2026-11-02 17:40')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, password, role, date_of_birth, gender) VALUES
  ('CLI-01', 'Laura Morales', 'laura.morales@nutrivital.com', 'Cliente2026!', 'Cliente', '1992-05-14', 'Femenino'),
  ('CLI-02', 'Carlos Mendoza', 'carlos.mendoza@nutrivital.com', 'Cliente2026!', 'Cliente', '1988-11-22', 'Masculino'),
  ('CLI-03', 'Sofía Herrera', 'sofia.herrera@nutrivital.com', 'Cliente2026!', 'Cliente', '1995-08-03', 'Femenino')
ON CONFLICT (id) DO NOTHING;
-- NOTA: Los clientes inician con 0 métricas y 0 metas por defecto; user_biometrics y user_health_goals
-- se pueblan exclusivamente cuando el usuario sube su informe médico real.

INSERT INTO public.products (id, name, category, tag, calories, protein, fiber, price, stock, status, description, serving_size, illustration) VALUES
  ('NV-101', 'Proteína Bio-Activa Matcha & Vainilla', 'Batidos Proteicos', '100% Orgánico', 135, 25.0, 6.0, 44.50, 28, 'Activo', 'Aislado de proteína de guisante germinado con té verde matcha ceremonial de Uji y enzimas digestivas naturales.', '34g · 25 porciones', 'protein-matcha'),
  ('NV-102', 'Espirulina Azul & Chlorella Celular', 'Superalimentos', '100% Orgánico', 45, 8.0, 4.0, 36.00, 19, 'Activo', 'Microalgas de pared celular rota cultivadas en agua filtrada de manantial para oxigenación celular y desintoxicación.', '10g · 30 porciones', 'spirulina-jar'),
  ('NV-103', 'Barras Ceto Cacao Crudo & Macadamia', 'Snacks Orgánicos', 'Keto', 190, 12.0, 9.0, 29.00, 7, 'Bajo Stock', 'Caja de 12 barras prensadas en frío con nuez de macadamia tostada, nibs de cacao criollo y fibra prebiótica de achicoria.', '45g · Caja x 12 uds', 'keto-bars'),
  ('NV-104', 'Omega-3 Vegano de Microalgas EPA + DHA', 'Suplementos Naturales', 'Sin Azúcar', 20, 0.0, 0.0, 48.00, 34, 'Activo', 'Ácidos grasos esenciales de alta biodisponibilidad extraídos en frío de Schizochytrium sp., libre de metales pesados.', '60 cápsulas blandas', 'omega-capsules'),
  ('NV-105', 'Elixir Adaptógeno Cacao, Maca Negra & Reishi', 'Superalimentos', 'Sin Azúcar', 65, 4.0, 5.0, 38.50, 22, 'Activo', 'Mezcla sinérgica para vitalidad sostenida y enfoque mental sin picos de cortisol, endulzada sutilmente con fruto del monje.', '15g · 25 porciones', 'cacao-maca'),
  ('NV-106', 'Péptidos Bio-Colágeno Marino + Vitamina C Acerola', 'Suplementos Naturales', 'Keto', 70, 18.0, 1.0, 52.00, 15, 'Activo', 'Colágeno hidrolizado tipo I y III de bajo peso molecular enriquecido con ácido hialurónico y acerola orgánica.', '20g · 30 porciones', 'collagen-peptides'),
  ('NV-107', 'Granola Germinada Chía, Cáñamo & Coco', 'Snacks Orgánicos', 'Sin Azúcar', 165, 9.0, 7.0, 24.00, 31, 'Activo', 'Semillas activadas deshidratadas a baja temperatura para preservar enzimas vivas, omega vegetal y textura crujiente.', '40g · Bolsa 450g', 'chia-granola'),
  ('NV-108', 'Extracto KSM-66 Ashwagandha & Magnesio Bisglicinato', 'Suplementos Naturales', '100% Orgánico', 10, 0.0, 0.0, 41.00, 6, 'Bajo Stock', 'Fórmula nocturna para recuperación profunda, regulación del sistema nervioso y descanso reparador.', '60 cápsulas vegetales', 'ashwagandha-drops')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.supplements (id, name, category, tag, daily_dose, systolic_effect, diastolic_effect, heart_rate_effect, vitality_score_bonus, weight_impact_rate_kg_per_week, body_mass_impact, caloric_burn_bonus, description, scientific_mechanism, matching_product_id) VALUES
  ('SUP-OMEGA3', 'Omega-3 Microalgas EPA + DHA', 'Cardiovascular', 'Vasodilatador Natural', '2 perlas (1000 mg EPA/DHA)', -4.50, -3.00, -2.50, 9, -0.050, -0.040, NULL, 'Ácidos grasos poliinsaturados de cadena larga. Promueven vasodilatación mediada por óxido nítrico y reducen la agregación plaquetaria.', 'Inhibe la síntesis de tromboxano A2 e interleucina 6 (IL-6), facilitando la distensibilidad arterial.', 'NV-104'),
  ('SUP-MAGNESIO', 'Magnesio Bisglicinato Quelado', 'Cardiovascular', 'Relajante Endotelial', '400 mg elemental por la noche', -5.00, -3.50, -3.00, 10, -0.020, -0.020, NULL, 'Forma quelada de máxima absorción gastrointestinal. Actúa como antagonista fisiológico del calcio en el músculo liso arterial.', 'Bloquea la entrada excesiva de calcio en miocitos vasculares, induciendo relajación del tono simpático y arterias.', 'NV-108'),
  ('SUP-ASHWAGANDHA', 'Extracto KSM-66 Ashwagandha', 'Adaptógenos', 'Modulador de Cortisol', '600 mg estandarizado al 5% withanólidos', -3.50, -2.00, -4.50, 11, -0.080, -0.060, NULL, 'Extracto botánico de raíz con espectro completo. Atenúa la taquicardia reactiva al estrés y estabiliza la presión arterial.', 'Estimula receptores GABA-A y desciende la sobreactivación adrenérgica del eje hipotálamo-hipófisis-adrenal (HPA).', 'NV-108'),
  ('SUP-ESPIRULINA', 'Espirulina Azul & Chlorella', 'Vitalidad Celular', 'Óxido Nítrico & Detox', '1 cucharadita (5g en batido)', -3.00, -2.00, -1.00, 8, -0.050, -0.040, NULL, 'Rica en ficocianina bioactiva y clorofila celular. Incrementa la perfusión microvascular y la oxigenación de tejidos.', 'Up-regula la expresión génica de eNOS (óxido nítrico sintasa), mejorando el flujo laminar coronario.', 'NV-102'),
  ('SUP-MATCHA', 'Proteína Vegana & Matcha de Uji', 'Metabolismo', 'Termogénico & Saciedad', '34g (25g proteína neta)', 1.00, 0.00, 2.00, 9, -0.150, 0.220, 120, 'Concentrado proteico con polifenoles EGCG. Acelera el gasto calórico de reposo y preserva la masa corporal activa.', 'Inhibe catecol-O-metiltransferasa aumentando lipólisis y aporta aminoácidos ramificados (BCAA) para síntesis proteica.', 'NV-101'),
  ('SUP-COQ10', 'Coenzima Q10 Ubiquinol & BioPerine', 'Cardiovascular', 'Bioenergética Miocárdica', '100 mg con desayuno', -4.00, -2.50, -1.50, 10, -0.020, -0.010, NULL, 'Forma reducida bioidéntica de CoQ10. Fortalece la eficiencia contráctil del miocardio y protege el endotelio.', 'Optimiza la síntesis de ATP mitocondrial en cardiomiocitos y previene la peroxidación lipídica de membranas.', NULL),
  ('SUP-COLAGENO', 'Péptidos Bioactivos de Colágeno Marino', 'Vitalidad Celular', 'Elasticidad Vascular', '10g en agua tibia o café', -1.50, -1.00, 0.00, 7, 0.000, 0.120, NULL, 'Péptidos hidrolizados de absorción subcelular. Mantiene la integridad y elasticidad de la túnica arterial.', 'Aporta glicina, prolina e hidroxiprolina estimulando fibroblastos y el recambio de colágeno perivascular.', 'NV-106'),
  ('SUP-CACAO_MACA', 'Elixir Cacao Criollo, Maca & Reishi', 'Adaptógenos', 'Flavanoles & Vigor', '12g en infusión matutina', -2.50, -1.50, -1.00, 8, -0.040, 0.030, NULL, 'Flavanoles de cacao silvestre con maca gelatinizada andina. Favorece la vasodilatación cerebral y periférica.', 'Los epicatequinos inducen fosforilación de eNOS vía transducción de señal PI3K/Akt.', 'NV-105'),
  ('SUP-VIT_D3K2', 'Vitamina D3 5000 UI + K2 MK-7', 'Micronutrientes', 'Salud Arterial & Calcio', '1 perla diaria con grasa saludable', -2.00, -1.00, 0.00, 8, -0.020, 0.000, NULL, 'Complejo de transporte de calcio. Evita calcificación distrófica en arterias y modula el sistema renina-angiotensina.', 'La menaquinona-7 carboxila la osteocalcina y la proteína Gla de la matriz (MGP), protegiendo la elasticidad vascular.', NULL),
  ('SUP-POTASIO_ELECTRO', 'Citrato de Potasio & Complejo Electrolítico', 'Micronutrientes', 'Natriuresis & Descompresión', '1 sobre diluido en 500 ml', -4.50, -2.80, -1.50, 7, -0.090, -0.050, NULL, 'Equilibrio electrolítico intracelular. Compensa el exceso de sodio en la dieta y alivia la volemia arterial.', 'Aumenta la natriuresis renal estimulando la bomba de intercambio celular y disminuyendo la reactividad vascular.', NULL),
  ('SUP-CAFE', 'Café Funcional Orgánico', 'Estimulantes', 'Termogénico & Alerta', '1-2 tazas diarias (200-400 mg cafeína)', 4.00, 2.00, 6.00, 5, -0.060, -0.030, 80, 'Café de tueste medio con antioxidantes clorogénicos. Aumenta la termogénesis y el rendimiento cognitivo, con elevación transitoria de PA y FC.', 'Antagonista de receptores de adenosina A1/A2A.', NULL),
  ('SUP-SAL', 'Sal Refinada / Sodio Dietético', 'Minerales', 'Retención & Volemia', 'Consumo habitual >5g/día NaCl', 6.00, 4.00, 1.50, -3, 0.120, 0.050, NULL, 'Exceso de cloruro de sodio en la dieta habitual. Incrementa la volemia y la rigidez arterial.', 'Aumenta la reabsorción tubular de agua vía osmosis y eleva la resistencia vascular periférica.', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_history (week, week_label, revenue, units, orders_count) VALUES
  (1, 'Sem 1', 2420.00, 58, 31),
  (2, 'Sem 2', 2680.00, 64, 35),
  (3, 'Sem 3', 2590.00, 61, 33),
  (4, 'Sem 4', 2940.00, 70, 39),
  (5, 'Sem 5', 3180.00, 76, 42),
  (6, 'Sem 6', 3410.00, 82, 46),
  (7, 'Sem 7', 3350.00, 79, 44),
  (8, 'Sem 8', 3720.00, 89, 51),
  (9, 'Sem 9', 3960.00, 94, 55),
  (10, 'Sem 10', 4210.00, 101, 58)
ON CONFLICT (week) DO NOTHING;
