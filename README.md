# NutriVital — Nutrición Funcional, Biometría IA & E-Commerce

Plataforma web en **React + TypeScript + Vite** con análisis de informes médicos mediante **Google Gemini (`gemini-2.5-flash`)**, base de datos en **Supabase (PostgreSQL + Storage)** y funciones serverless en **Vercel**.

---

## 1. Configurar la Base de Datos en Supabase

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/dashboard).
2. En el menú lateral entra a **SQL Editor** → **New query**.
3. Copia todo el contenido de [`database/supabase_schema.sql`](database/supabase_schema.sql), pégalo y haz clic en **Run**.
   - Esto crea todas las tablas (`users`, `user_biometrics`, `user_health_goals`, `products`, `supplements`, `user_active_supplements`, `medical_reports`, `orders`, `order_items`, `sales_history`), el bucket privado `medical-reports` en Storage, las políticas RLS y los datos iniciales.
4. Ve a **Project Settings → API** y copia:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon / public key** (`VITE_SUPABASE_ANON_KEY`)

---

## 2. Configurar Variables de Entorno en Local (`.env.local`)

Crea o actualiza tu archivo `.env.local` en la raíz usando `.env.example` como plantilla:

```env
GEMINI_API_KEY="AIza...tu_clave_de_gemini..."
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="tu_anon_key_de_supabase"
```

*(Si no configuras Supabase en local, la app funciona automáticamente en modo offline usando `localStorage`).*

Instala dependencias e inicia el servidor local:

```powershell
npm install
npm run dev
```

---

## 3. Desplegar en Vercel (con IA + Supabase en la nube)

1. Sube tus cambios a GitHub.
2. Entra a [Vercel](https://vercel.com/new) e importa tu repositorio de GitHub (`NutriVital`).
3. En **Environment Variables**, agrega exactamente estas 3 variables para *Production* y *Preview*:
   - `GEMINI_API_KEY` → tu clave de Google AI Studio.
   - `VITE_SUPABASE_URL` → la URL de tu proyecto Supabase.
   - `VITE_SUPABASE_ANON_KEY` → la `anon` key de Supabase.
4. Haz clic en **Deploy**.
   - Vercel usará [`vercel.json`](vercel.json) para compilar el frontend (`dist/`) y publicar automáticamente las funciones serverless [`api/chat.ts`](api/chat.ts) y [`api/analyze-medical-report.ts`](api/analyze-medical-report.ts).

---

## Scripts disponibles

- `npm run dev` — servidor de desarrollo en `http://localhost:3000`
- `npm run lint` — verificación de tipos TypeScript (`tsc --noEmit`)
- `npm run test` — pruebas unitarias (`tsx --test src/utils/analytics.test.ts`)
- `npm run build` — compilación de producción (`dist/`)
