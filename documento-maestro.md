# DOCUMENTO MAESTRO PRD / SSD: REFACTORIZACIÓN SENS TRAIN & WELLNESS (v1.0 MVP)

**Proyecto:** SENS Train & Wellness — Rediseño Web & WebApp MVP  
**Versión:** 1.0 (MVP)  
**Stack Objetivo:** Vanilla HTML5, CSS3 (Custom Properties), JavaScript ES6+ (Modules), Supabase (Auth & Database PostgreSQL).  
**Enfoque Design:** PWA Ready, Mobile-First Native Look, Dark Mode Estricto (Onyx & Champagne).

---

## 1. ARQUITECTURA DE SISTEMA Y BASE DE DATOS

### 1.1 Esquema PostgreSQL para Supabase

Ejecutar el siguiente script SQL en el Editor SQL de Supabase para inicializar la base de datos con Row Level Security (RLS):

```sql
-- 1. Perfiles de Usuarios (Vinculado a Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  age INT,
  current_weight NUMERIC(5,2),
  target_weight NUMERIC(5,2),
  height NUMERIC(5,2),
  activity_level TEXT,
  fitness_goal TEXT, -- 'fuerza', 'hipertrofia', 'movilidad', 'recomposicion'
  medical_notes TEXT,
  daily_step_target INT DEFAULT 10000,
  daily_calorie_target INT,
  active_plan_name TEXT DEFAULT 'Plan Personalizado SENS TRAIN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Rutinas Asignadas
CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_title TEXT NOT NULL, -- ej: 'Día 1: Tren Superior'
  order_index INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Ejercicios de Rutina
CREATE TABLE public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- ej: 'Peso Muerto Rumano'
  sets INT NOT NULL,
  reps TEXT NOT NULL, -- ej: '8-10'
  rest_seconds INT DEFAULT 90,
  video_url TEXT,
  notes TEXT,
  order_index INT DEFAULT 0
);

-- 4. Registro de Sesiones Completadas
CREATE TABLE public.workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  weight_used NUMERIC(5,2),
  reps_completed INT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Registro Diario de Métricas
CREATE TABLE public.daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  weight NUMERIC(5,2),
  steps INT DEFAULT 0,
  calories_consumed INT,
  water_ml INT DEFAULT 0,
  notes TEXT,
  UNIQUE(user_id, log_date)
);

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso
CREATE POLICY "Usuarios leen su propio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuarios leen sus rutinas" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios leen ejercicios" ON public.exercises FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = exercises.workout_id AND workouts.user_id = auth.uid())
);
CREATE POLICY "Usuarios gestionan sus logs de entrenamiento" ON public.workout_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuarios gestionan sus logs diarios" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);