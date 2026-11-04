# Prompt Maestro: Desarrollo de Plataforma Web de Nutrición y E-commerce Saludable

Copia y pega el siguiente bloque de texto en el modelo de lenguaje o entorno de desarrollo de tu preferencia (ChatGPT, Claude, Gemini, Cursor, v0, etc.):

---

```text
Actúa como un Diseñador UI/UX y Desarrollador Full-Stack Senior experto en frontend moderno (React, Tailwind CSS, Chart.js/Recharts o JavaScript vanilla en un solo archivo interactivo). 

Tu tarea es crear una aplicación web completa y moderna para una marca de nutrición y bienestar llamada "NutriVital". La plataforma debe ser limpia, interactiva, funcional a nivel visual y simular todas las interacciones clave de un e-commerce y panel administrativo.

---

### 1. PALETA DE COLORES Y ESTILO VISUAL
- **Colores predominantes:** 
  - Verde claro / Menta (#86EFAC, #4ADE80, #A7F3D0).
  - Acentos orgánicos verde hoja (#16A34A, #15803D).
  - Blanco puro (#FFFFFF) y fondos neutros ultra claros (#F8FAFC, #F0FDF4).
- **Tipografía:** Moderna, legible y fresca (sans-serif, ej. Inter o Poppins).
- **Estilo de interfaz:** Clean design, tarjetas con sombras sutiles (`shadow-sm`, `shadow-md`), esquinas redondeadas (`rounded-2xl`), espaciado generoso y aspecto saludable y profesional.

---

### 2. ESTRUCTURA Y MÓDULOS DE LA PLATAFORMA

#### A. Barra de Navegación (Header)
- Logotipo de "NutriVital" con icono de hoja/bienestar.
- Enlaces de navegación: Inicio, Catálogo Saludable, Tu Progreso (Simulador), Administrador.
- Botón del Carrito de Compras con contador dinámico de artículos.
- Selector o interruptor rápido para alternar entre "Vista Cliente" y "Panel Administrador".

#### B. Catálogo de Productos Saludables
- Cuadrícula de productos de alta calidad (superalimentos, suplementos naturales, snacks orgánicos, batidos proteicos).
- Cada tarjeta debe incluir:
  - Imagen ilustrativa o mockup minimalista.
  - Nombre del producto y etiqueta ("100% Orgánico", "Sin Azúcar", "Keto").
  - Información nutricional rápida (calorías, proteína, fibra).
  - Precio unitario.
  - Botón interactivo "Añadir al Carrito".

#### C. Carrito de Compras y Simulación de Ventas
- Carrito lateral deslizable (drawer) o modal interactivo.
- Funcionalidades requeridas:
  - Listado de productos añadidos con opción de incrementar/reducir cantidad o eliminar.
  - Cálculo automático de subtotal, impuestos y total.
  - Botón "Finalizar Compra / Simular Pago".
  - Modal de confirmación de compra exitosa que descuente inventario de forma simulada y registre la transacción para las métricas del administrador.

#### D. Gráficas Interactivas para el Consumidor (Proyección de Bienestar)
- Sección interactiva titulada *"Calcula tu Transformación Saludable"*.
- Controles interactivos (sliders o selectores):
  - Semanas de consumo continuo (1 a 12 semanas).
  - Nivel de adherencia al plan nutricional (50% a 100%).
- Gráfica dinámica:
  - Debe actualizarse en tiempo real según los sliders.
  - Mostrar proyección de mejora de energía diaria, calidad del sueño y reducción de marcadores inflamatorios.
  - Curvas de tendencia claras, positivas y visualmente atractivas sobre fondo blanco con acentos verde menta.

#### E. Chatbot de Asesoría Nutricional (Mock / No funcional)
- Botón flotante en la esquina inferior derecha con icono de mensaje y badge animado.
- Al hacer clic, despliega una ventana de chat elegante:
  - Encabezado: "NutriBot - Asistente Virtual".
  - Mensaje inicial de bienvenida predeterminado: *"¡Hola! Soy tu asistente de nutrición. ¿Buscas recomendaciones para energía, pérdida de grasa o digestión?"*.
  - 3 a 4 botones de sugerencias rápidas (chips) como: "Productos sin gluten", "Horarios de envío", "Planes personalizados".
  - Campo de texto (input) y botón de envío (debe simular una respuesta automática genérica o indicar que es una demo).

#### F. Panel de Administrador (Gestión y Métricas de Ventas)
- Sección protegida o accesible vía toggle:
  1. **Gestión de Productos (CRUD simulado):**
     - Tabla interactiva con columnas: ID, Nombre, Categoría, Precio, Stock, Estado.
     - Botón para "Añadir Producto" (formulario modal sencillo).
     - Acciones para editar precio o eliminar producto en tiempo real en el estado local.
  2. **Métricas con Regresión Lineal No Logarítmica:**
     - Gráfica dedicada de **"Proyección de Ventas (Modelo Lineal Ordinario)"**.
     - Debe calcular y trazar una línea recta estricta siguiendo la ecuación:
       $$y = mx + b$$
       *(donde $x$ representa el tiempo/semanas y $y$ los ingresos o unidades vendidas).*
     - **Restricción obligatoria:** NO utilizar escalas logarítmicas, transformaciones exponenciales ni suavizados polinómicos; debe ser explícitamente una recta de regresión por mínimos cuadrados ordinarios.
     - Mostrar datos de dispersión (scatter plot con los puntos reales de ventas históricas) superpuestos con la recta de ajuste calculada.
     - Cuadro informativo con los coeficientes del modelo: pendiente ($m$), intercepto ($b$) y coeficiente de correlación ($R^2$).

---

### 3. REQUISITOS TÉCNICOS
- Código limpio, semántico, modular y bien comentado.
- Responsive design garantizado (adaptable a móviles, tablets y monitores de escritorio).
- Gestión de estado reactiva (ej. React hooks `useState`, `useEffect`, `useMemo` para el cálculo de la recta de regresión).
- Todas las interacciones deben ser funcionales en el navegador sin requerir un backend externo (usar datos mockeados en memoria o `localStorage`).
```
---

### Consejos de uso:
1. Si deseas el código en un único archivo ejecutable listo para navegador, añade al final del prompt: *"Proporciona todo el código dentro de un único archivo HTML con React (CDN), Tailwind CSS y Chart.js/Recharts listo para abrir en el navegador"*.
2. Si prefieres un proyecto estructurado (Next.js o Vite + React), añade: *"Proporciona la estructura de carpetas y los componentes clave para un proyecto Vite + React con Tailwind CSS y Recharts"*.