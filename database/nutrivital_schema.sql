-- ============================================================
-- NutriVital Database Schema
-- Compatible con MySQL 5.7+ / MariaDB 10.3+ (XAMPP)
-- Importar en phpMyAdmin: http://localhost/phpmyadmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS `nutrivital_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `nutrivital_db`;

-- ============================================================
-- 1. USUARIOS (Clientes + Administradores en tabla unificada)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('Cliente', 'Administrador General', 'Director de Nutrición', 'Directora de Nutrición', 'Analista de Operaciones') NOT NULL DEFAULT 'Cliente',
  `access_code` VARCHAR(50) DEFAULT NULL COMMENT 'Solo para admins (ej. NV-ADMIN-01)',
  `date_of_birth` DATE DEFAULT NULL COMMENT 'Fecha de nacimiento para umbrales de PA por edad',
  `gender` ENUM('Masculino', 'Femenino', 'Otro') DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. DATOS BIOMÉTRICOS DEL CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_biometrics` (
  `id` INT AUTO_INCREMENT,
  `user_id` VARCHAR(20) NOT NULL,
  `systolic_bp` DECIMAL(5,1) NOT NULL DEFAULT 120.0,
  `diastolic_bp` DECIMAL(5,1) NOT NULL DEFAULT 80.0,
  `heart_rate` DECIMAL(5,1) NOT NULL DEFAULT 72.0,
  `body_weight` DECIMAL(5,1) NOT NULL DEFAULT 70.0,
  `body_mass` DECIMAL(5,1) NOT NULL DEFAULT 24.0 COMMENT 'IMC (kg/m²)',
  `daily_calories` INT NOT NULL DEFAULT 2000,
  `height` DECIMAL(5,1) DEFAULT NULL COMMENT 'Estatura en cm',
  `waist_circumference` DECIMAL(5,1) DEFAULT NULL COMMENT 'Circunferencia de cintura en cm',
  `fatty_liver_grade` TINYINT DEFAULT NULL COMMENT 'Grado de hígado graso: 0=Normal, 1=Leve, 2=Moderado, 3=Severo',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_biometrics` (`user_id`),
  CONSTRAINT `fk_biometrics_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. METAS DE SALUD (Solo editables por Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_health_goals` (
  `id` INT AUTO_INCREMENT,
  `user_id` VARCHAR(20) NOT NULL,
  `target_systolic_bp` DECIMAL(5,1) NOT NULL DEFAULT 120.0,
  `target_diastolic_bp` DECIMAL(5,1) NOT NULL DEFAULT 80.0,
  `target_heart_rate` DECIMAL(5,1) NOT NULL DEFAULT 70.0,
  `target_weight` DECIMAL(5,1) NOT NULL DEFAULT 70.0,
  `target_body_mass` DECIMAL(5,1) NOT NULL DEFAULT 23.5,
  `target_calories` INT NOT NULL DEFAULT 2000,
  `timeline_weeks` INT NOT NULL DEFAULT 8,
  `set_by_admin_id` VARCHAR(20) DEFAULT NULL COMMENT 'ID del admin que estableció las metas',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_goals` (`user_id`),
  CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` ENUM('Batidos Proteicos', 'Superalimentos', 'Suplementos Naturales', 'Snacks Orgánicos') NOT NULL,
  `tag` ENUM('100% Orgánico', 'Sin Azúcar', 'Keto', 'Vegano', 'Sin Gluten') NOT NULL,
  `calories` INT NOT NULL DEFAULT 0,
  `protein` DECIMAL(5,1) NOT NULL DEFAULT 0,
  `fiber` DECIMAL(5,1) NOT NULL DEFAULT 0,
  `price` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `status` ENUM('Activo', 'Bajo Stock', 'Agotado') NOT NULL DEFAULT 'Activo',
  `description` TEXT,
  `serving_size` VARCHAR(100),
  `illustration` VARCHAR(50),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. SUPLEMENTOS (incluye Café y Sal)
-- ============================================================
CREATE TABLE IF NOT EXISTS `supplements` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` ENUM('Cardiovascular', 'Metabolismo', 'Adaptógenos', 'Vitalidad Celular', 'Micronutrientes', 'Estimulantes', 'Minerales') NOT NULL,
  `tag` VARCHAR(100),
  `daily_dose` VARCHAR(150),
  `systolic_effect` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `diastolic_effect` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `heart_rate_effect` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `vitality_score_bonus` INT NOT NULL DEFAULT 0,
  `weight_impact_rate_kg_per_week` DECIMAL(5,3) NOT NULL DEFAULT 0.000,
  `body_mass_impact` DECIMAL(5,3) NOT NULL DEFAULT 0.000,
  `caloric_burn_bonus` INT DEFAULT NULL,
  `description` TEXT,
  `scientific_mechanism` TEXT,
  `matching_product_id` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_supp_category` (`category`),
  CONSTRAINT `fk_supp_product` FOREIGN KEY (`matching_product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. SUPLEMENTOS ACTIVOS POR USUARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_active_supplements` (
  `id` INT AUTO_INCREMENT,
  `user_id` VARCHAR(20) NOT NULL,
  `supplement_id` VARCHAR(30) NOT NULL,
  `activated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_supplement` (`user_id`, `supplement_id`),
  CONSTRAINT `fk_active_supp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_active_supp_supplement` FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. CARRITO DE COMPRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` INT AUTO_INCREMENT,
  `user_id` VARCHAR(20) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cart_item` (`user_id`, `product_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. PEDIDOS / ÓRDENES
-- ============================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(20) NOT NULL,
  `user_id` VARCHAR(20) NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `payment_method` VARCHAR(100) NOT NULL DEFAULT 'Pago Verificado NutriVital Pay',
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tax` DECIMAL(10,2) NOT NULL,
  `shipping` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_user` (`user_id`),
  CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT,
  `order_id` VARCHAR(20) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(8,2) NOT NULL,
  `line_total` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_oi_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. INFORMES MÉDICOS
-- ============================================================
CREATE TABLE IF NOT EXISTS `medical_reports` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(20) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT 'Ruta del archivo en el servidor',
  `report_type` ENUM('Analítica Sanguínea', 'Perfil Lipídico', 'Chequeo Cardiometabólico', 'Panel Hormonal & Micronutrientes') NOT NULL,
  `report_date` DATE DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ai_clinical_summary` TEXT,
  `markers_json` JSON COMMENT 'MedicalLabMarkers serializado',
  `flagged_findings` JSON COMMENT 'Array de hallazgos relevantes',
  `contraindications` JSON COMMENT 'Array de contraindicaciones',
  `detected_systolic_bp` DECIMAL(5,1) DEFAULT NULL,
  `detected_diastolic_bp` DECIMAL(5,1) DEFAULT NULL,
  `detected_heart_rate` DECIMAL(5,1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_report_user` (`user_id`),
  INDEX `idx_report_date` (`report_date`),
  CONSTRAINT `fk_report_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. HISTORIAL DE VENTAS SEMANALES
-- ============================================================
CREATE TABLE IF NOT EXISTS `sales_history` (
  `id` INT AUTO_INCREMENT,
  `week` INT NOT NULL,
  `week_label` VARCHAR(20) NOT NULL,
  `revenue` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `units` INT NOT NULL DEFAULT 0,
  `orders_count` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_week` (`week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS INICIALES (SEED DATA)
-- ============================================================

-- ----- ADMINISTRADORES -----
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `access_code`, `created_at`, `last_login`) VALUES
('ADM-01', 'Dra. Elena Valdés', 'admin@nutrivital.com', 'NutriAdmin2026!', 'Administrador General', 'NV-ADMIN-01', '2026-01-10 00:00:00', '2026-11-03 09:15:00'),
('ADM-02', 'Lic. Marcos Salgado', 'nutricion@nutrivital.com', 'Vital2026!', 'Director de Nutrición', 'NV-NUTRI-02', '2026-03-22 00:00:00', '2026-11-02 17:40:00');

-- ----- CLIENTES -----
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `date_of_birth`, `gender`, `created_at`) VALUES
('CLI-01', 'Laura Morales', 'laura.morales@nutrivital.com', 'Cliente2026!', 'Cliente', '1992-05-14', 'Femenino', '2026-02-14 00:00:00'),
('CLI-02', 'Carlos Mendoza', 'carlos.mendoza@nutrivital.com', 'Cliente2026!', 'Cliente', '1988-11-22', 'Masculino', '2026-04-10 00:00:00'),
('CLI-03', 'Sofía Herrera', 'sofia.herrera@nutrivital.com', 'Cliente2026!', 'Cliente', '1995-08-03', 'Femenino', '2026-06-01 00:00:00');

-- ----- BIOMÉTRICOS -----
INSERT INTO `user_biometrics` (`user_id`, `systolic_bp`, `diastolic_bp`, `heart_rate`, `body_weight`, `body_mass`, `daily_calories`, `fatty_liver_grade`, `updated_at`) VALUES
('CLI-01', 128.0, 84.0, 76.0, 74.5, 25.4, 2200, 0, '2026-11-08 10:30:00'),
('CLI-02', 136.0, 88.0, 84.0, 88.0, 28.6, 2650, 1, '2026-11-09 16:45:00'),
('CLI-03', 116.0, 74.0, 64.0, 59.0, 21.2, 1950, 0, '2026-11-07 08:20:00');

-- ----- METAS DE SALUD -----
INSERT INTO `user_health_goals` (`user_id`, `target_systolic_bp`, `target_diastolic_bp`, `target_heart_rate`, `target_weight`, `target_body_mass`, `target_calories`, `timeline_weeks`, `set_by_admin_id`) VALUES
('CLI-01', 118.0, 78.0, 70.0, 69.0, 23.5, 1950, 8, 'ADM-01'),
('CLI-02', 120.0, 80.0, 72.0, 79.0, 25.0, 2150, 12, 'ADM-01'),
('CLI-03', 115.0, 72.0, 62.0, 58.5, 21.0, 2000, 8, 'ADM-01');

-- ----- PRODUCTOS -----
INSERT INTO `products` (`id`, `name`, `category`, `tag`, `calories`, `protein`, `fiber`, `price`, `stock`, `status`, `description`, `serving_size`, `illustration`) VALUES
('NV-101', 'Proteína Bio-Activa Matcha & Vainilla', 'Batidos Proteicos', '100% Orgánico', 135, 25.0, 6.0, 44.50, 28, 'Activo', 'Aislado de proteína de guisante germinado con té verde matcha ceremonial de Uji y enzimas digestivas naturales.', '34g · 25 porciones', 'protein-matcha'),
('NV-102', 'Espirulina Azul & Chlorella Celular', 'Superalimentos', '100% Orgánico', 45, 8.0, 4.0, 36.00, 19, 'Activo', 'Microalgas de pared celular rota cultivadas en agua filtrada de manantial para oxigenación celular y desintoxicación.', '10g · 30 porciones', 'spirulina-jar'),
('NV-103', 'Barras Ceto Cacao Crudo & Macadamia', 'Snacks Orgánicos', 'Keto', 190, 12.0, 9.0, 29.00, 7, 'Bajo Stock', 'Caja de 12 barras prensadas en frío con nuez de macadamia tostada, nibs de cacao criollo y fibra prebiótica de achicoria.', '45g · Caja x 12 uds', 'keto-bars'),
('NV-104', 'Omega-3 Vegano de Microalgas EPA + DHA', 'Suplementos Naturales', 'Sin Azúcar', 20, 0.0, 0.0, 48.00, 34, 'Activo', 'Ácidos grasos esenciales de alta biodisponibilidad extraídos en frío de Schizochytrium sp., libre de metales pesados.', '60 cápsulas blandas', 'omega-capsules'),
('NV-105', 'Elixir Adaptógeno Cacao, Maca Negra & Reishi', 'Superalimentos', 'Sin Azúcar', 65, 4.0, 5.0, 38.50, 22, 'Activo', 'Mezcla sinérgica para vitalidad sostenida y enfoque mental sin picos de cortisol, endulzada sutilmente con fruto del monje.', '15g · 25 porciones', 'cacao-maca'),
('NV-106', 'Péptidos Bio-Colágeno Marino + Vitamina C Acerola', 'Suplementos Naturales', 'Keto', 70, 18.0, 1.0, 52.00, 15, 'Activo', 'Colágeno hidrolizado tipo I y III de bajo peso molecular enriquecido con ácido hialurónico y acerola orgánica.', '20g · 30 porciones', 'collagen-peptides'),
('NV-107', 'Granola Germinada Chía, Cáñamo & Coco', 'Snacks Orgánicos', 'Sin Azúcar', 165, 9.0, 7.0, 24.00, 31, 'Activo', 'Semillas activadas deshidratadas a baja temperatura para preservar enzimas vivas, omega vegetal y textura crujiente.', '40g · Bolsa 450g', 'chia-granola'),
('NV-108', 'Extracto KSM-66 Ashwagandha & Magnesio Bisglicinato', 'Suplementos Naturales', '100% Orgánico', 10, 0.0, 0.0, 41.00, 6, 'Bajo Stock', 'Fórmula nocturna para recuperación profunda, regulación del sistema nervioso y descanso reparador.', '60 cápsulas vegetales', 'ashwagandha-drops');

-- ----- SUPLEMENTOS (incluye Café y Sal) -----
INSERT INTO `supplements` (`id`, `name`, `category`, `tag`, `daily_dose`, `systolic_effect`, `diastolic_effect`, `heart_rate_effect`, `vitality_score_bonus`, `weight_impact_rate_kg_per_week`, `body_mass_impact`, `caloric_burn_bonus`, `description`, `scientific_mechanism`, `matching_product_id`) VALUES
('SUP-OMEGA3', 'Omega-3 Microalgas EPA + DHA', 'Cardiovascular', 'Vasodilatador Natural', '2 perlas (1000 mg EPA/DHA)', -4.50, -3.00, -2.50, 9, -0.050, -0.040, NULL, 'Ácidos grasos poliinsaturados de cadena larga. Promueven vasodilatación mediada por óxido nítrico y reducen la agregación plaquetaria.', 'Inhibe la síntesis de tromboxano A2 e interleucina 6 (IL-6), facilitando la distensibilidad arterial.', 'NV-104'),
('SUP-MAGNESIO', 'Magnesio Bisglicinato Quelado', 'Cardiovascular', 'Relajante Endotelial', '400 mg elemental por la noche', -5.00, -3.50, -3.00, 10, -0.020, -0.020, NULL, 'Forma quelada de máxima absorción gastrointestinal. Actúa como antagonista fisiológico del calcio en el músculo liso arterial.', 'Bloquea la entrada excesiva de calcio en miocitos vasculares, induciendo relajación del tono simpático y arterias.', NULL),
('SUP-ASHWAGANDHA', 'Extracto KSM-66 Ashwagandha', 'Adaptógenos', 'Modulador de Cortisol', '600 mg estandarizado al 5% withanólidos', -3.50, -2.00, -4.50, 11, -0.080, -0.060, NULL, 'Extracto botánico de raíz con espectro completo. Atenúa la taquicardia reactiva al estrés y estabiliza la presión arterial.', 'Estimula receptores GABA-A y desciende la sobreactivación adrenérgica del eje hipotálamo-hipófisis-adrenal (HPA).', 'NV-108'),
('SUP-ESPIRULINA', 'Espirulina Azul & Chlorella', 'Vitalidad Celular', 'Óxido Nítrico & Detox', '1 cucharadita (5g en batido)', -3.00, -2.00, -1.00, 8, -0.050, -0.040, NULL, 'Rica en ficocianina bioactiva y clorofila celular. Incrementa la perfusión microvascular y la oxigenación de tejidos.', 'Up-regula la expresión génica de eNOS (óxido nítrico sintasa), mejorando el flujo laminar coronario.', 'NV-102'),
('SUP-MATCHA', 'Proteína Vegana & Matcha de Uji', 'Metabolismo', 'Termogénico & Saciedad', '34g (25g proteína neta)', 1.00, 0.00, 2.00, 9, -0.150, 0.220, 120, 'Concentrado proteico con polifenoles EGCG. Acelera el gasto calórico de reposo y preserva la masa corporal activa.', 'Inhibe catecol-O-metiltransferasa aumentando lipólisis y aporta aminoácidos ramificados (BCAA) para síntesis proteica.', 'NV-101'),
('SUP-COQ10', 'Coenzima Q10 Ubiquinol & BioPerine', 'Cardiovascular', 'Bioenergética Miocárdica', '100 mg con desayuno', -4.00, -2.50, -1.50, 10, -0.020, -0.010, NULL, 'Forma reducida bioidéntica de CoQ10. Fortalece la eficiencia contráctil del miocardio y protege el endotelio.', 'Optimiza la síntesis de ATP mitocondrial en cardiomiocitos y previene la peroxidación lipídica de membranas.', NULL),
('SUP-COLAGENO', 'Péptidos Bioactivos de Colágeno Marino', 'Vitalidad Celular', 'Elasticidad Vascular', '10g en agua tibia o café', -1.50, -1.00, 0.00, 7, 0.000, 0.120, NULL, 'Péptidos hidrolizados de absorción subcelular. Mantiene la integridad y elasticidad de la túnica arterial.', 'Aporta glicina, prolina e hidroxiprolina estimulando fibroblastos y el recambio de colágeno perivascular.', 'NV-106'),
('SUP-CACAO_MACA', 'Elixir Cacao Criollo, Maca & Reishi', 'Adaptógenos', 'Flavanoles & Vigor', '12g en infusión matutina', -2.50, -1.50, -1.00, 8, -0.040, 0.030, NULL, 'Flavanoles de cacao silvestre con maca gelatinizada andina. Favorece la vasodilatación cerebral y periférica.', 'Los epicatequinos inducen fosforilación de eNOS vía transducción de señal PI3K/Akt.', 'NV-105'),
('SUP-VIT_D3K2', 'Vitamina D3 5000 UI + K2 MK-7', 'Micronutrientes', 'Salud Arterial & Calcio', '1 perla diaria con grasa saludable', -2.00, -1.00, 0.00, 8, -0.020, 0.000, NULL, 'Complejo de transporte de calcio. Evita calcificación distrófica en arterias y modula el sistema renina-angiotensina.', 'La menaquinona-7 carboxila la osteocalcina y la proteína Gla de la matriz (MGP), protegiendo la elasticidad vascular.', NULL),
('SUP-POTASIO_ELECTRO', 'Citrato de Potasio & Complejo Electrolítico', 'Micronutrientes', 'Natriuresis & Descompresión', '1 sobre diluido en 500 ml', -4.50, -2.80, -1.50, 7, -0.090, -0.050, NULL, 'Equilibrio electrolítico intracelular. Compensa el exceso de sodio en la dieta y alivia la volemia arterial.', 'Aumenta la natriuresis renal estimulando la bomba de intercambio celular y disminuyendo la reactividad vascular.', NULL),
-- NUEVOS: Café y Sal
('SUP-CAFE', 'Café Funcional Orgánico', 'Estimulantes', 'Termogénico & Alerta', '1-2 tazas diarias (200-400 mg cafeína)', 4.00, 2.00, 6.00, 5, -0.060, -0.030, 80, 'Café de tueste medio con antioxidantes clorogénicos. Incrementa la termogénesis y el rendimiento cognitivo a corto plazo, pero eleva transitoriamente la presión arterial y la frecuencia cardíaca.', 'Antagonista de receptores de adenosina A1/A2A. Estimula liberación de catecolaminas (adrenalina, noradrenalina) activando lipólisis y el sistema nervioso simpático.', NULL),
('SUP-SAL', 'Sal Refinada / Sodio Dietético', 'Minerales', 'Retención & Volemia', 'Consumo habitual >5g/día NaCl', 6.00, 4.00, 1.50, -3, 0.120, 0.050, NULL, 'Exceso de cloruro de sodio en la dieta occidental. Incrementa la volemia, la rigidez arterial y la presión de filtración glomerular. Su reducción controlada es una de las intervenciones no farmacológicas más eficaces para la hipertensión.', 'Aumenta la reabsorción tubular de agua vía osmosis, expandiendo el volumen plasmático y elevando la resistencia vascular periférica. Inhibe la señalización de óxido nítrico endotelial.', NULL);

-- ----- SUPLEMENTOS ACTIVOS POR USUARIO -----
INSERT INTO `user_active_supplements` (`user_id`, `supplement_id`) VALUES
('CLI-01', 'SUP-OMEGA3'),
('CLI-01', 'SUP-MAGNESIO'),
('CLI-02', 'SUP-ASHWAGANDHA'),
('CLI-03', 'SUP-MATCHA'),
('CLI-03', 'SUP-COLAGENO'),
('CLI-03', 'SUP-ESPIRULINA');

-- ----- HISTORIAL DE VENTAS -----
INSERT INTO `sales_history` (`week`, `week_label`, `revenue`, `units`, `orders_count`) VALUES
(1, 'Sem 1', 2420.00, 58, 31),
(2, 'Sem 2', 2680.00, 64, 35),
(3, 'Sem 3', 2590.00, 61, 33),
(4, 'Sem 4', 2940.00, 70, 39),
(5, 'Sem 5', 3180.00, 76, 42),
(6, 'Sem 6', 3410.00, 82, 46),
(7, 'Sem 7', 3350.00, 79, 44),
(8, 'Sem 8', 3720.00, 89, 51),
(9, 'Sem 9', 3960.00, 94, 55),
(10, 'Sem 10', 4210.00, 101, 58);

-- ============================================================
-- DIRECTORIO PARA ARCHIVOS DE REPORTES MÉDICOS
-- Crear manualmente: C:\xampp\htdocs\nutrivital\uploads\
-- ============================================================
