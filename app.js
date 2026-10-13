/**
 * SENS TRAIN & WELLNESS — Main Application Logic (v1.0 MVP)
 * Modules 1 to 7: Global Nav, Landing, Supabase Auth, Onboarding, Dashboard, Workout Manager with Rest Timer, Nutrition & Daily Tracking
 */

// =============================================================================
// 0. CONFIGURACIÓN DE SUPABASE & ESTADO GLOBAL
// =============================================================================
const SUPABASE_CONFIG = {
    url: window.__SUPABASE_URL__ || 'https://pqzbkkxiljuccegbipkp.supabase.co',
    anonKey: window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxemJra3hpbGp1Y2NlZ2JpcGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTk5MzYsImV4cCI6MjEwNzM3NTkzNn0.UOhfid8S09kdfMqIPRkZiLySKGXYQ2Mb3m_YhCLYgs4'
};

const isSupabaseConfigured = Boolean(
    window.supabase &&
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE')
);

let supabaseClient = null;
if (isSupabaseConfigured) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('[SENS] Conectado a Supabase en la nube.');
    } catch (e) {
        console.warn('[SENS] Error al inicializar Supabase, usando almacenamiento local de respaldo:', e);
    }
} else {
    console.log('[SENS] Modo Demo Activo (LocalStorage). La aplicación funciona al 100% de manera autónoma.');
}

// Estado en memoria
const AppState = {
    user: null,
    profile: null,
    currentDay: 'day1',
    activeTimerInterval: null,
    remainingSeconds: 0,
    weightChart: null,
    stepsChart: null,
    selectedMuscleFilter: 'all'
};

// -----------------------------------------------------------------------------
// PERFILES MOCK DE MULTI-USUARIO (Soporte para roles de Supabase)
// -----------------------------------------------------------------------------
const MOCK_USER_PROFILES = {
    client_presencial_vip: {
        id: 'usr-vip-001',
        full_name: 'Roberto Gómez',
        email: 'roberto.gomez@sens.com',
        user_type: 'client_presencial_vip',
        role: 'user_vip',
        active_plan_name: 'Presencial 1 a 1 VIP (CABA)',
        plan_badge_text: 'Presencial 1 a 1 • 2x/Semana',
        sessions_week: '2 / 2',
        current_weight: 78.2,
        weight_diff: '-1.2 kg',
        avg_steps: '10.420',
        goal_text: 'Fuerza & Recomposición Corporal',
        coach_message: 'Excelente consistencia en sobrecarga progresiva esta semana, Roberto. Cuidar la pausa excéntrica en sentadillas.'
    },
    client_presencial_group: {
        id: 'usr-grp-002',
        full_name: 'Laura & Marcos',
        email: 'laura.marcos@sens.com',
        user_type: 'client_presencial_group',
        role: 'user_normal',
        active_plan_name: 'Presencial Semi-Personalizado (Dúo)',
        plan_badge_text: 'Modalidad Dúo • 8 Sesiones/mes',
        sessions_week: '2 / 2',
        current_weight: 66.4,
        weight_diff: '-0.8 kg',
        avg_steps: '9.350',
        goal_text: 'Fuerza Compartida & Hábitos',
        coach_message: 'Muy buen ritmo en el dúo de ayer. Marcos enfocar en el empuje de talones en peso muerto.'
    },
    client_online_premium: {
        id: 'usr-onl-003',
        full_name: 'Esteban Bianchi',
        email: 'esteban.b@sens.com',
        user_type: 'client_online_premium',
        role: 'user_vip',
        active_plan_name: 'Online Asesorado Premium',
        plan_badge_text: 'Online Premium • Videollamadas',
        sessions_week: '3 / 3',
        current_weight: 81.5,
        weight_diff: '-2.4 kg',
        avg_steps: '11.800',
        goal_text: 'Hipertrofia & Alivio Lumbar',
        coach_message: 'Revisé tus videos enviados el martes: la técnica en remo mejoró notablemente. Mantener RIR 2.'
    },
    client_online_basic: {
        id: 'usr-onl-004',
        full_name: 'Carla Méndez',
        email: 'carla.m@sens.com',
        user_type: 'client_online_basic',
        role: 'user_normal',
        active_plan_name: 'Online Asesorado Básico',
        plan_badge_text: 'Online Básico • Plan Mensual',
        sessions_week: '2 / 3',
        current_weight: 58.2,
        weight_diff: '-0.4 kg',
        avg_steps: '8.400',
        goal_text: 'Movilidad & Tonificación',
        coach_message: 'Plan de rutina al día. Recordar marcar las series en la web para chequear los descansos.'
    },
    admin: {
        id: 'usr-adm-nico',
        full_name: 'Nico (Coach & Admin)',
        email: 'nico@sens.com',
        user_type: 'admin',
        role: 'admin',
        active_plan_name: 'Panel Administrador SENS',
        plan_badge_text: '⚡ Coach / Admin Nico',
        sessions_week: 'Coach Activo',
        current_weight: 75.0,
        weight_diff: 'Óptimo',
        avg_steps: '12.500',
        goal_text: 'Gestión Integral de Alumnos',
        coach_message: 'Modo Administrador Activo: Tenés control total para asignar ejercicios, modificar cargas y auditar alumnos.'
    }
};

// -----------------------------------------------------------------------------
// CATÁLOGO MAESTRO: 52 EJERCICIOS CURADOS POR NICO (5 GRUPOS MUSCULARES)
// -----------------------------------------------------------------------------
const EXERCISE_CATALOG = [
    // 1. Dominante de Rodilla (Cuádriceps)
    { id: 'ex-q1', name: 'Sentadilla Goblet con Mancuerna', muscle_group: 'quadriceps', pattern: 'Squat', rest: 90, cue: 'Codos cerrados pegados al torso, bajada en 3 segundos buscando profundidad cómoda sin redondear lumbares.', video: 'https://www.youtube.com/watch?v=MeIiIdhvXT4' },
    { id: 'ex-q2', name: 'Sentadilla Trasera con Barra', muscle_group: 'quadriceps', pattern: 'Squat', rest: 120, cue: 'Barra apoyada firme en trapecios, pies al ancho de hombros, empuje uniforme desde el centro del pie.', video: 'https://www.youtube.com/watch?v=bEv6CCg2BC8' },
    { id: 'ex-q3', name: 'Sentadilla Frontal con Barra', muscle_group: 'quadriceps', pattern: 'Squat', rest: 120, cue: 'Codos altos y pecho orgulloso para mantener el torso vertical durante todo el recorrido.', video: 'https://www.youtube.com/watch?v=uYumuL_G_V0' },
    { id: 'ex-q4', name: 'Prensa 45°', muscle_group: 'quadriceps', pattern: 'Leg Press', rest: 90, cue: 'Pies a media plataforma, descender hasta 90° sin despegar el sacro del respaldo.', video: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ' },
    { id: 'ex-q5', name: 'Estocadas Búlgaras con Mancuernas', muscle_group: 'quadriceps', pattern: 'Lunge', rest: 90, cue: 'Pie trasero elevado en banco, ligera inclinación del torso hacia adelante para cargar cuádriceps y glúteo.', video: 'https://www.youtube.com/watch?v=2C-uNgKwPLE' },
    { id: 'ex-q6', name: 'Step-up en Cajón Controlado', muscle_group: 'quadriceps', pattern: 'Single Leg Step', rest: 75, cue: 'Todo el peso en la pierna de arriba, evitar impulsarse con la punta del pie en el suelo.', video: 'https://www.youtube.com/watch?dQqApCGd5Ss' },
    { id: 'ex-q7', name: 'Sentadilla Hack en Máquina', muscle_group: 'quadriceps', pattern: 'Hack Squat', rest: 90, cue: 'Espalda totalmente apoyada, control excéntrico en 3 segundos para máximo estímulo de vastos.', video: 'https://www.youtube.com/watch?v=0tn5K9NlCfo' },
    { id: 'ex-q8', name: 'Extensión de Cuádriceps en Máquina', muscle_group: 'quadriceps', pattern: 'Isolation', rest: 60, cue: 'Pausa isométrica de 1 segundo arriba, bajar sin golpear las placas.', video: 'https://www.youtube.com/watch?v=YyvSfVjQeL0' },
    { id: 'ex-q9', name: 'Sentadilla Cosaca (Cossack Squat)', muscle_group: 'quadriceps', pattern: 'Mobility Squat', rest: 75, cue: 'Talón del pie flexionado en el suelo, excelente para apertura de cadera y fuerza unilateral.', video: 'https://www.youtube.com/watch?v=tpvgtrbp8ik' },
    { id: 'ex-q10', name: 'Zancadas Caminando con Mancuernas', muscle_group: 'quadriceps', pattern: 'Lunge', rest: 90, cue: 'Paso amplio, rodilla trasera roza suavemente el suelo con control.', video: 'https://www.youtube.com/watch?v=L8fvypPrzzs' },

    // 2. Dominante de Cadera (Isquiosurales & Glúteos)
    { id: 'ex-h1', name: 'Peso Muerto Rumano con Mancuernas', muscle_group: 'hamstrings_glutes', pattern: 'Hinge', rest: 90, cue: 'Empujar las caderas hacia atrás como si quisieras tocar la pared con los glúteos. Espalda neutra.', video: 'https://www.youtube.com/watch?v=JCXUYuzwNrM' },
    { id: 'ex-h2', name: 'Hip Thrust con Barra en Banco', muscle_group: 'hamstrings_glutes', pattern: 'Glute Bridge', rest: 90, cue: 'Mentón pegado al pecho, extender la cadera hasta alinear rodillas y hombros apretando glúteos 2 segundos.', video: 'https://www.youtube.com/watch?v=SEdqd1n0cvg' },
    { id: 'ex-h3', name: 'Peso Muerto Convencional con Barra', muscle_group: 'hamstrings_glutes', pattern: 'Deadlift', rest: 150, cue: 'Barra pegada a las tibias, dorsales activos antes de despegar el peso del suelo.', video: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
    { id: 'ex-h4', name: 'Curl Femoral Acostado en Máquina', muscle_group: 'hamstrings_glutes', pattern: 'Leg Curl', rest: 75, cue: 'Caderas firmes contra el banco, no arquear la columna lumbar al flexionar.', video: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs' },
    { id: 'ex-h5', name: 'Curl Femoral Sentado en Máquina', muscle_group: 'hamstrings_glutes', pattern: 'Leg Curl', rest: 75, cue: 'Excelente estímulo en rango de estiramiento del isquiosural. Bajar lento en 3 segundos.', video: 'https://www.youtube.com/watch?v=Orxowest56U' },
    { id: 'ex-h6', name: 'Buenos Días con Barra Ligera', muscle_group: 'hamstrings_glutes', pattern: 'Hinge', rest: 90, cue: 'Ligera flexión de rodilla, bisagra pura de cadera para fortalecer erectores espinales e isquios.', video: 'https://www.youtube.com/watch?v=YA-h3n9L4YU' },
    { id: 'ex-h7', name: 'Peso Muerto Rumano a Una Pierna', muscle_group: 'hamstrings_glutes', pattern: 'Single Leg Hinge', rest: 75, cue: 'Cadera cuadrada mirando hacia el piso, enfoque en equilibrio y propiocepción.', video: 'https://www.youtube.com/watch?v=18ZkMeqwMaw' },
    { id: 'ex-h8', name: 'Kettlebell Swing Estilo Ruso', muscle_group: 'hamstrings_glutes', pattern: 'Ballistic Hinge', rest: 60, cue: 'Potencia explosiva desde los glúteos, los brazos solo acompañan la trayectoria de la pesa.', video: 'https://www.youtube.com/watch?v=YSxHifyI6s8' },
    { id: 'ex-h9', name: 'Hiperextensiones a 45°', muscle_group: 'hamstrings_glutes', pattern: 'Back Extension', rest: 75, cue: 'Redondear ligeramente la zona dorsal alta para enfocar el esfuerzo en glúteos e isquios.', video: 'https://www.youtube.com/watch?v=ph3pddpKzzw' },
    { id: 'ex-h10', name: 'Puente de Glúteos Unilateral en Suelo', muscle_group: 'hamstrings_glutes', pattern: 'Glute Bridge', rest: 60, cue: 'Excelente ejercicio de activación previa o rehabilitación de cadera.', video: 'https://www.youtube.com/watch?v=AVox3Vpw44U' },

    // 3. Empuje Tren Superior (Pecho, Deltoides & Tríceps)
    { id: 'ex-p1', name: 'Press de Banca Plano con Mancuernas', muscle_group: 'push', pattern: 'Horizontal Push', rest: 90, cue: 'Escápulas retraídas y deprimidas, recorrido completo con los codos a 45-60 grados del torso.', video: 'https://www.youtube.com/watch?v=VmB1G1K7v94' },
    { id: 'ex-p2', name: 'Press de Banca con Barra', muscle_group: 'push', pattern: 'Horizontal Push', rest: 120, cue: 'Pies firmes clavados en el suelo, arco lumbar natural, descenso controlado al esternón.', video: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
    { id: 'ex-p3', name: 'Press Militar de Pie con Barra', muscle_group: 'push', pattern: 'Vertical Push', rest: 120, cue: 'Glúteos y abdomen activos para proteger la zona lumbar, barra pasa cerca de la nariz.', video: 'https://www.youtube.com/watch?v=2yjwXTZQDDI' },
    { id: 'ex-p4', name: 'Press Militar Sentado con Mancuernas', muscle_group: 'push', pattern: 'Vertical Push', rest: 90, cue: 'Respaldo a 75-80°, empujar hacia arriba sin juntar ni chocar las mancuernas en el tope.', video: 'https://www.youtube.com/watch?v=qEwKCR5JCog' },
    { id: 'ex-p5', name: 'Fondos en Paralelas Asistidos / Libres', muscle_group: 'push', pattern: 'Vertical Push', rest: 90, cue: 'Ligera inclinación del pecho hacia adelante para enfocar fibras pectorales inferiores.', video: 'https://www.youtube.com/watch?v=2z8JmcrW-As' },
    { id: 'ex-p6', name: 'Flexiones de Brazos (Push-ups) con Pausa', muscle_group: 'push', pattern: 'Horizontal Push', rest: 75, cue: 'Cuerpo como una tabla sólida, pausa de 1 segundo con el pecho a 2 cm del suelo.', video: 'https://www.youtube.com/watch?v=IODxDxX7oi4' },
    { id: 'ex-p7', name: 'Press Inclinado con Mancuernas (30°)', muscle_group: 'push', pattern: 'Incline Push', rest: 90, cue: 'Inclinación sutil de 30° para priorizar haz clavicular del pectoral sin sobrecargar el hombro.', video: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
    { id: 'ex-p8', name: 'Aperturas en Polea (Crossover)', muscle_group: 'push', pattern: 'Flye', rest: 60, cue: 'Movimiento de abrazo semicircular con contracción máxima de 1 segundo en el centro.', video: 'https://www.youtube.com/watch?v=taI4XduLpBe' },
    { id: 'ex-p9', name: 'Elevaciones Laterales en Polea a Una Mano', muscle_group: 'push', pattern: 'Lateral Raise', rest: 60, cue: 'Polea a la altura de la rodilla, elevar el codo alineado en el plano escapular.', video: 'https://www.youtube.com/watch?v=PPrzBWZDOhA' },
    { id: 'ex-p10', name: 'Elevaciones Laterales con Mancuerna', muscle_group: 'push', pattern: 'Lateral Raise', rest: 60, cue: 'Codos ligeramente flexionados, guiar el movimiento con los codos sin encoger hombros.', video: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
    { id: 'ex-p11', name: 'Extensión de Tríceps en Polea con Cuerda', muscle_group: 'push', pattern: 'Triceps Extension', rest: 60, cue: 'Codos pegados a los costados, separar la cuerda al final de la extensión.', video: 'https://www.youtube.com/watch?v=vB5OHsJ3EME' },
    { id: 'ex-p12', name: 'Press Francés con Mancuernas en Banco Plano', muscle_group: 'push', pattern: 'Triceps Extension', rest: 75, cue: 'Bajar mancuernas a los costados de las orejas sintiendo el estiramiento de la porción larga.', video: 'https://www.youtube.com/watch?v=d_KZxkY_0cM' },

    // 4. Tracción Tren Superior (Espalda, Romboides & Bíceps)
    { id: 'ex-t1', name: 'Dominadas Asistidas en Máquina o Banda', muscle_group: 'pull', pattern: 'Vertical Pull', rest: 90, cue: 'Pecho hacia la barra, iniciar el tirón deprimiendo las escápulas antes de flexionar los brazos.', video: 'https://www.youtube.com/watch?v=y3JaVUf0G_s' },
    { id: 'ex-t2', name: 'Jalón al Pecho en Polea (Agarre Neutro)', muscle_group: 'pull', pattern: 'Vertical Pull', rest: 90, cue: 'Tirar los codos hacia abajo y hacia los bolsillos traseros, manteniendo el pecho abierto.', video: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
    { id: 'ex-t3', name: 'Remo con Mancuerna a Una Mano en Banco', muscle_group: 'pull', pattern: 'Horizontal Pull', rest: 75, cue: 'Espalda paralela al piso, tirar la mancuerna hacia la cadera evitando rotar el tronco.', video: 'https://www.youtube.com/watch?v=pYcpY20QaE8' },
    { id: 'ex-t4', name: 'Remo con Barra Inclinado (Agarre Prono)', muscle_group: 'pull', pattern: 'Horizontal Pull', rest: 90, cue: 'Torso a 45 grados, barra viaja rozando los muslos hacia el ombligo.', video: 'https://www.youtube.com/watch?v=G8l_8chR5BE' },
    { id: 'ex-t5', name: 'Remo en Polea Baja con Agarre Estrecho', muscle_group: 'pull', pattern: 'Horizontal Pull', rest: 75, cue: 'Espalda erguida, extender dorsales al frente y traccionar juntando escápulas.', video: 'https://www.youtube.com/watch?v=GZbfZ033f74' },
    { id: 'ex-t6', name: 'Face Pull en Polea con Cuerda a la Frente', muscle_group: 'pull', pattern: 'Posture / Rear Delt', rest: 60, cue: 'Traccionar hacia la altura de los ojos rotando externamente los hombros. Clave postural.', video: 'https://www.youtube.com/watch?v=rep-qVOkqgk' },
    { id: 'ex-t7', name: 'Remo Apoyado en Banco Inclinado', muscle_group: 'pull', pattern: 'Chest Supported Row', rest: 75, cue: 'Elimina toda compensación lumbar, puro aislamiento de la espalda media.', video: 'https://www.youtube.com/watch?v=H75im9fAUMc' },
    { id: 'ex-t8', name: 'Pullover en Polea Alta con Barra Recta', muscle_group: 'pull', pattern: 'Lat Isolation', rest: 60, cue: 'Brazos casi extendidos, llevar la barra hacia los muslos comprimiendo los dorsales.', video: 'https://www.youtube.com/watch?v=fA4hQYk7C9w' },
    { id: 'ex-t9', name: 'Curl de Bíceps con Mancuernas Supinadas', muscle_group: 'pull', pattern: 'Biceps Curl', rest: 60, cue: 'Rotar la muñeca hacia afuera en la subida para máxima activación del bíceps braquial.', video: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
    { id: 'ex-t10', name: 'Curl Martillo con Mancuernas o Cuerda', muscle_group: 'pull', pattern: 'Brachialis', rest: 60, cue: 'Palmas mirándose entre sí todo el recorrido, fortalece braquial y antebrazo.', video: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
    { id: 'ex-t11', name: 'Curl en Banco Inclinado a 45°', muscle_group: 'pull', pattern: 'Biceps Curl', rest: 75, cue: 'Mancuernas cuelgan por detrás del torso para enfatizar la cabeza larga del bíceps.', video: 'https://www.youtube.com/watch?v=soxrZlIl35U' },

    // 5. Core & Conciencia Postural
    { id: 'ex-c1', name: 'Plancha Frontal con Retroversión Pélvica', muscle_group: 'core_mobility', pattern: 'Isometric Core', rest: 60, cue: 'Apretar glúteos y cuádriceps, tirar los codos hacia las rodillas isométricamente (20-30s).', video: 'https://www.youtube.com/watch?v=6TKq62P_4gE' },
    { id: 'ex-c2', name: 'Deadbug con Control Lumbar y Respiración', muscle_group: 'core_mobility', pattern: 'Anti-Extension', rest: 60, cue: 'Espalda baja en contacto continuo con el suelo. Exhalar al extender brazo y pierna contraria.', video: 'https://www.youtube.com/watch?v=g_BYB0R-4Ws' },
    { id: 'ex-c3', name: 'Press Pallof con Banda o Polea', muscle_group: 'core_mobility', pattern: 'Anti-Rotation', rest: 60, cue: 'Extender los brazos al frente resistiendo la rotación del tronco, mantener 2 segundos.', video: 'https://www.youtube.com/watch?v=AH_QZLm_0-s' },
    { id: 'ex-c4', name: 'Bird-Dog Dinámico Controlado', muscle_group: 'core_mobility', pattern: 'Cross-Body Stability', rest: 60, cue: 'Extender brazo y pierna opuesta sin arquear la zona lumbar ni balancear la pelvis.', video: 'https://www.youtube.com/watch?v=wiFNA3sqjCA' },
    { id: 'ex-c5', name: 'Paseo del Granjero con Mancuernas', muscle_group: 'core_mobility', pattern: 'Loaded Carry', rest: 60, cue: 'Caminar erguido con pasos firmes y cadencia controlada manteniendo los hombros neutros.', video: 'https://www.youtube.com/watch?v=Fkzk_RqlYig' },
    { id: 'ex-c6', name: 'Rueda Abdominal con Rango Seguro', muscle_group: 'core_mobility', pattern: 'Anti-Extension', rest: 75, cue: 'Mantener pelvis en retroversión, rodar hacia adelante hasta donde se mantenga el control.', video: 'https://www.youtube.com/watch?v=rqiTPdK1cjg' },
    { id: 'ex-c7', name: 'Hollow Body Hold Isométrico', muscle_group: 'core_mobility', pattern: 'Gymnastic Core', rest: 60, cue: 'Curva corporal cóncava con zona lumbar sellada al piso y brazos extendidos atrás.', video: 'https://www.youtube.com/watch?v=44ScXWFaVBs' },
    { id: 'ex-c8', name: 'Movilidad Gato-Vaca y Descompresión', muscle_group: 'core_mobility', pattern: 'Spinal Mobility', rest: 45, cue: 'Sincronizar inhalación en extensión y exhalación en flexión dorsal completa.', video: 'https://www.youtube.com/watch?v=W_X0R3V3X2Y' },
    { id: 'ex-c9', name: 'Rotaciones Torácicas Cuadrúpedas', muscle_group: 'core_mobility', pattern: 'Thoracic Mobility', rest: 45, cue: 'Mano en la nuca, abrir el codo hacia el techo buscando rotar la columna dorsal.', video: 'https://www.youtube.com/watch?v=2T_LpL_3c2s' }
];

// -----------------------------------------------------------------------------
// CATÁLOGO DE ALIMENTOS BASE & HÁBITOS (Curados por Nico)
// -----------------------------------------------------------------------------
const FOOD_CATALOG = [
    // Proteínas
    { id: 'fd-p1', name: 'Pechuga de Pollo / Pavo', cat: 'protein', portion: '150 - 200g cocido', note: 'Proteína magra de altísimo valor biológico, digestión ágil y nula grasa saturada agregada.' },
    { id: 'fd-p2', name: 'Huevos de Campo Enteros', cat: 'protein', portion: '2 a 4 unidades diarias', note: 'Aporte completo de aminoácidos esenciales, colina para la función cerebral y grasas saludables.' },
    { id: 'fd-p3', name: 'Carne Vacuna Magra (Lomo, Cuadril)', cat: 'protein', portion: '150 - 200g (2-3x sem)', note: 'Rica en hierro hemínico, zinc y creatina natural para soporte de fuerza y masa muscular.' },
    { id: 'fd-p4', name: 'Atún al Natural / Salmón Blanco', cat: 'protein', portion: '1 lata o 150 - 180g filete', note: 'Proteína de fácil absorción y ácidos grasos que favorecen la recuperación tisular.' },
    { id: 'fd-p5', name: 'Yogur Griego Natural (Sin Azúcar)', cat: 'protein', portion: '150 - 200g', note: 'Rico en caseína de digestión lenta y probióticos para la salud de la microbiota intestinal.' },
    { id: 'fd-p6', name: 'Tofu Firme Orgánico', cat: 'protein', portion: '180 - 220g salteado', note: 'Excelente fuente de proteína vegetal completa para opciones basadas en plantas.' },
    { id: 'fd-p7', name: 'Proteína de Suero (Whey Isolate)', cat: 'protein', portion: '1 scoop (25-30g)', note: 'Practicidad óptima para alcanzar los gramos diarios de proteína sin sumar grasas extras.' },

    // Carbohidratos
    { id: 'fd-c1', name: 'Arroz Integral o Basmati al Vapor', cat: 'carbs', portion: '1 taza cocida (150-180g)', note: 'Energía limpia y sostenida para reponer glucógeno muscular post-entrenamiento.' },
    { id: 'fd-c2', name: 'Papa y Batata Horneadas con Piel', cat: 'carbs', portion: '1 unidad mediana (180g)', note: 'Ricas en potasio, almidón resistente y gran poder de saciedad sin pesadez digestiva.' },
    { id: 'fd-c3', name: 'Avena Arrollada Tradicional', cat: 'carbs', portion: '40 - 60g en porridge', note: 'Fibra betaglucano que estabiliza la glucemia y brinda saciedad prolongada.' },
    { id: 'fd-c4', name: 'Quinoa Cocida', cat: 'carbs', portion: '1 taza cocida', note: 'Pseudocereal con perfil balanceado de carbohidratos complejos y micronutrientes.' },
    { id: 'fd-c5', name: 'Frutas Enteras (Banana, Arándanos)', cat: 'carbs', portion: '1 a 2 porciones al día', note: 'Antioxidantes naturales, vitaminas y fructosa natural para energía previa a la sesión.' },
    { id: 'fd-c6', name: 'Pan de Masa Madre Genuino', cat: 'carbs', portion: '1 a 2 rebanadas tostadas', note: 'Fermentación lenta que degrada antinutrientes facilitando la asimilación digestiva.' },

    // Grasas Saludables
    { id: 'fd-g1', name: 'Palta (Aguacate)', cat: 'healthy_fats', portion: '1/2 unidad al día', note: 'Ácidos grasos monoinsaturados que apoyan la salud cardiovascular y hormonal.' },
    { id: 'fd-g2', name: 'Aceite de Oliva Extra Virgen (Crudo)', cat: 'healthy_fats', portion: '1 cucharada sopera', note: 'Polifenoles y grasas antiinflamatorias esenciales para articulaciones.' },
    { id: 'fd-g3', name: 'Frutos Secos (Nueces, Almendras)', cat: 'healthy_fats', portion: '1 puñado cerrado (30g)', note: 'Densidad energética y magnesio para relajar el sistema neuromuscular.' },
    { id: 'fd-g4', name: 'Semillas de Chía y Lino Molidas', cat: 'healthy_fats', portion: '1 cucharadita en yogur', note: 'Ácido alfa-linolénico (Omega 3 vegetal) y fibra soluble reguladora.' },

    // Hidratación y Vegetales
    { id: 'fd-h1', name: 'Agua Mineral / Filtrada', cat: 'hydration_veg', portion: '35ml/kg (2.5L a 3.5L/día)', note: 'El medio fundamental para el rendimiento muscular y la eliminación de fatiga.' },
    { id: 'fd-h2', name: 'Vegetales de Hoja Verde (Espinaca, Rúcula)', cat: 'hydration_veg', portion: 'Libre en almuerzo y cena', note: 'Nitratos naturales para vasodilatación y micronutrientes sin calorías vacías.' },
    { id: 'fd-h3', name: 'Brócoli y Espárragos al Vapor', cat: 'hydration_veg', portion: '1 taza colmada', note: 'Crucíferas con componentes antioxidantes y soporte a la digestión.' }
];

// Rutinas Preconfiguradas para SENS TRAIN
const WORKOUT_DAYS_DATA = {
    day1: {
        title: 'Día 1: Tren Superior (Empuje / Tirón)',
        exercises: [
            {
                id: 'ex-101',
                name: '1. Peso Muerto Rumano con Mancuernas',
                notes: 'Foco en bisagra de cadera y activación de isquiosurales y glúteos.',
                sets: 3,
                reps: '8-10',
                rest: 90,
                defaultWeight: 22.5,
                defaultReps: 10
            },
            {
                id: 'ex-102',
                name: '2. Press Plano con Mancuernas en Banco',
                notes: 'Empuje horizontal controlado con retracción escapular activa.',
                sets: 3,
                reps: '10-12',
                rest: 75,
                defaultWeight: 18,
                defaultReps: 11
            },
            {
                id: 'ex-103',
                name: '3. Remo Unilateral con Mancuerna apoyado',
                notes: 'Tirón horizontal sin rotar el torso. Pausa de 1 seg arriba.',
                sets: 3,
                reps: '10-12',
                rest: 60,
                defaultWeight: 16,
                defaultReps: 10
            },
            {
                id: 'ex-104',
                name: '4. Press Militar con Mancuernas de pie',
                notes: 'Activación del core y glúteos para proteger la zona lumbar.',
                sets: 3,
                reps: '8-10',
                rest: 75,
                defaultWeight: 14,
                defaultReps: 9
            }
        ]
    },
    day2: {
        title: 'Día 2: Tren Inferior (Fuerza & Cadera)',
        exercises: [
            {
                id: 'ex-201',
                name: '1. Goblet Squat (Sentadilla profunda asistida)',
                notes: 'Apertura de cadera, talones apoyados, pecho erguido.',
                sets: 4,
                reps: '10-12',
                rest: 90,
                defaultWeight: 20,
                defaultReps: 10
            },
            {
                id: 'ex-202',
                name: '2. Hip Thrust en Banco con Mancuerna / Barra',
                notes: 'Extensión completa de cadera con bloqueo glúteo de 1 segundo.',
                sets: 3,
                reps: '10-12',
                rest: 90,
                defaultWeight: 35,
                defaultReps: 12
            },
            {
                id: 'ex-203',
                name: '3. Estocadas Estáticas (Split Squat)',
                notes: 'Control en el descenso de rodilla sin golpear el piso.',
                sets: 3,
                reps: '10 p/pierna',
                rest: 60,
                defaultWeight: 12,
                defaultReps: 10
            },
            {
                id: 'ex-204',
                name: '4. Elevación de Gemelos & Estiramiento Isquiotibial',
                notes: 'Rango completo de movimiento con pausa en máxima contracción.',
                sets: 3,
                reps: '15',
                rest: 45,
                defaultWeight: 16,
                defaultReps: 15
            }
        ]
    },
    day3: {
        title: 'Día 3: Full Body & Conciencia Postural',
        exercises: [
            {
                id: 'ex-301',
                name: '1. Kettlebell / Mancuerna Swing',
                notes: 'Potencia de cadera y respiración coordinada.',
                sets: 3,
                reps: '12-15',
                rest: 75,
                defaultWeight: 16,
                defaultReps: 15
            },
            {
                id: 'ex-302',
                name: '2. Push-Ups (Flexiones) con tempo controlado',
                notes: 'Bajar en 3 segundos, subir explosivo. Opción con rodillas.',
                sets: 3,
                reps: '8-12',
                rest: 60,
                defaultWeight: 0,
                defaultReps: 10
            },
            {
                id: 'ex-303',
                name: '3. Plancha Frontal con Respiración Diafragmática',
                notes: 'Retracción abdominal, glúteos activos durante 45 segundos.',
                sets: 3,
                reps: '45 seg',
                rest: 60,
                defaultWeight: 0,
                defaultReps: 45
            },
            {
                id: 'ex-304',
                name: '4. Movilidad Flujo Yoga: Paloma & Perro Boca Abajo',
                notes: 'Apertura de cadera, extensión torácica y alivio lumbar.',
                sets: 2,
                reps: '5 min',
                rest: 60,
                defaultWeight: 0,
                defaultReps: 5
            }
        ]
    }
};

// Histórico de métricas para gráficos (Demo seed)
const DEMO_METRICS = {
    weights: [
        { date: '1 Oct', val: 79.4 },
        { date: '3 Oct', val: 79.1 },
        { date: '5 Oct', val: 78.9 },
        { date: '7 Oct', val: 78.7 },
        { date: '9 Oct', val: 78.5 },
        { date: '11 Oct', val: 78.3 },
        { date: 'Hoy', val: 78.2 }
    ],
    steps: [
        { date: 'Lun', val: 9800 },
        { date: 'Mar', val: 11200 },
        { date: 'Mié', val: 10450 },
        { date: 'Jue', val: 8900 },
        { date: 'Vie', val: 12100 },
        { date: 'Sáb', val: 10800 },
        { date: 'Hoy', val: 10420 }
    ]
};

// =============================================================================
// 1. INICIALIZACIÓN AL CARGAR EL DOM
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initHeroVideo();
    initPricingTabs();
    initLeadCapture();
    initRoleSwitcher();
    initExerciseCatalogModal();
    initCarousels();
    initAuthModal();
    initPortalNavigation();
    initOnboardingWizard();
    initWorkoutManager();
    initNutritionHabits();
    initDailyTracking();
    initCharts();
    checkExistingSession();
});

// =============================================================================
// NUEVO: CAPTACIÓN ABIERTA DE PROSPECTOS (SECCIÓN SUMATE & CTAs DE PLANES)
// =============================================================================
function initLeadCapture() {
    // 1. Botones de Planes ("Agendar Evaluación Inicial" o "Elegir Plan")
    const planButtons = document.querySelectorAll('.plan-select-btn');
    planButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planName = btn.getAttribute('data-plan') || '';
            const sumateSection = document.getElementById('sumate');
            if (sumateSection) {
                // Preseleccionar radio button correspondiente
                const radioPresencial = document.querySelector('input[name="leadModality"][value="Presencial 1 a 1 (CABA)"]');
                const radioGrupo = document.querySelector('input[name="leadModality"][value="Presencial Grupal (Dúo o Trío)"]');
                const radioOnline = document.querySelector('input[name="leadModality"][value="Online Asesorado"]');
                
                if (planName.includes('Grupo') || planName.includes('Dúo') || planName.includes('Trío')) {
                    if (radioGrupo) radioGrupo.checked = true;
                } else if (planName.includes('Online')) {
                    if (radioOnline) radioOnline.checked = true;
                } else {
                    if (radioPresencial) radioPresencial.checked = true;
                }
            }
        });
    });

    // 2. Envío de Formulario Lead Intake
    const btnSubmitLead = document.getElementById('btnSubmitLead');
    if (btnSubmitLead) {
        btnSubmitLead.addEventListener('click', async () => {
            const fullName = document.getElementById('leadFullName') ? document.getElementById('leadFullName').value.trim() : '';
            const phone = document.getElementById('leadPhone') ? document.getElementById('leadPhone').value.trim() : '';
            const selectedModalityRadio = document.querySelector('input[name="leadModality"]:checked');
            const modality = selectedModalityRadio ? selectedModalityRadio.value : 'Presencial 1 a 1 (CABA)';
            const goal = document.getElementById('leadGoal') ? document.getElementById('leadGoal').value : 'Fuerza y recomposición física';

            if (!fullName || !phone) {
                alert('Por favor completá tu nombre y WhatsApp para poder coordinar la evaluación inicial.');
                return;
            }

            // Guardar lead en Supabase si está disponible, o en localStorage
            const leadData = {
                full_name: fullName,
                phone: phone,
                preferred_modality: modality.includes('Grupo') ? 'presencial_grupo' : (modality.includes('Online') ? 'online_premium' : 'presencial_caba'),
                fitness_goal: goal,
                created_at: new Date().toISOString()
            };

            if (supabaseClient) {
                try {
                    await supabaseClient.from('leads').insert([leadData]);
                } catch (err) {
                    console.log('[SENS] Guardado local de lead');
                }
            }
            localStorage.setItem('sens_last_lead', JSON.stringify(leadData));

            // Mensaje preconfigurado para WhatsApp de Nico
            const waText = encodeURIComponent(`Hola Nico! Me gustaría agendar una Evaluación Inicial en SENS.\nMi nombre es: ${fullName}\nModalidad de interés: ${modality}\nMi objetivo: ${goal}`);
            const waUrl = `https://wa.me/5491136329846?text=${waText}`;

            // Abrir WhatsApp
            window.open(waUrl, '_blank');
        });
    }
}

// =============================================================================
// NUEVO: GESTOR DE MULTI-USUARIOS Y ROLES (SUPABASE ROLES & DEMO SWITCHER)
// =============================================================================
function initRoleSwitcher() {
    const roleSelector = document.getElementById('userRoleSelector');
    if (!roleSelector) return;

    // Aplicar perfil por defecto
    applyUserProfile('client_presencial_vip');

    roleSelector.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        applyUserProfile(selectedType);
    });
}

function applyUserProfile(userTypeKey) {
    const mock = MOCK_USER_PROFILES[userTypeKey] || MOCK_USER_PROFILES['client_presencial_vip'];
    AppState.user = {
        id: mock.id,
        email: mock.email,
        user_type: mock.user_type,
        role: mock.role
    };
    AppState.profile = {
        full_name: mock.full_name,
        active_plan_name: mock.active_plan_name,
        current_weight: mock.current_weight,
        goal: mock.goal_text
    };

    // Actualizar elementos visuales del Portal
    const planBadgeEl = document.getElementById('portalPlanBadge');
    const userEmailEl = document.getElementById('portalUserEmail');
    const roleContextBadge = document.getElementById('roleContextBadge');
    const adminIndicatorBadge = document.getElementById('adminIndicatorBadge');
    const adminAddBtn = document.getElementById('btnAdminAddExercise');

    if (planBadgeEl) planBadgeEl.textContent = mock.active_plan_name;
    if (userEmailEl) userEmailEl.textContent = mock.email;
    if (roleContextBadge) roleContextBadge.textContent = mock.plan_badge_text;

    if (mock.user_type === 'admin') {
        if (adminIndicatorBadge) adminIndicatorBadge.style.display = 'block';
        if (adminAddBtn) adminAddBtn.style.display = 'inline-block';
    } else {
        if (adminIndicatorBadge) adminIndicatorBadge.style.display = 'none';
        if (adminAddBtn) adminAddBtn.style.display = 'none';
    }

    // Re-renderizar Dashboard y Rutinas
    renderDashboardData();
    renderWorkoutDay(AppState.currentDay || 'day1');
}

// =============================================================================
// NUEVO: MODAL DE BIBLIOTECA MAESTRA (50 EJERCICIOS) & BÚSQUEDA
// =============================================================================
function initExerciseCatalogModal() {
    const modal = document.getElementById('exerciseLibraryModal');
    const openBtn = document.getElementById('btnOpenExerciseLibraryModal');
    const closeBtn = document.getElementById('closeLibraryModalBtn');
    const searchInput = document.getElementById('libSearchInput');
    const groupFilter = document.getElementById('libGroupFilter');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (modal) {
                modal.classList.add('active');
                renderExerciseLibraryList();
            }
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => renderExerciseLibraryList());
    }

    if (groupFilter) {
        groupFilter.addEventListener('change', () => renderExerciseLibraryList());
    }
}

function renderExerciseLibraryList() {
    const listContainer = document.getElementById('libraryExercisesList');
    const searchInput = document.getElementById('libSearchInput');
    const groupFilter = document.getElementById('libGroupFilter');
    if (!listContainer) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedGroup = groupFilter ? groupFilter.value : 'all';

    const filtered = EXERCISE_CATALOG.filter(ex => {
        const matchGroup = selectedGroup === 'all' || ex.muscle_group === selectedGroup;
        const matchQuery = !query || ex.name.toLowerCase().includes(query) || ex.pattern.toLowerCase().includes(query) || ex.cue.toLowerCase().includes(query);
        return matchGroup && matchQuery;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-muted); padding:20px; text-align:center;">No se encontraron ejercicios con ese criterio.</p>';
        return;
    }

    const groupNames = {
        quadriceps: 'Dominante Rodilla (Cuádriceps)',
        hamstrings_glutes: 'Dominante Cadera (Isquios/Glúteo)',
        push: 'Empuje Tren Superior',
        pull: 'Tracción Tren Superior',
        core_mobility: 'Core & Conciencia Postural'
    };

    let html = '';
    filtered.forEach(ex => {
        const isAdmin = AppState.user && AppState.user.user_type === 'admin';
        html += `
            <div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:8px; padding:16px; display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap;">
                <div style="flex:1; min-width:260px;">
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                        <span class="pill pill-dark" style="font-size:9px; padding:3px 8px;">${groupNames[ex.muscle_group] || ex.muscle_group}</span>
                        <span class="pill pill-champagne" style="font-size:9px; padding:3px 8px;">${ex.pattern}</span>
                        <span style="font-size:11px; color:var(--text-muted);">Descanso: ${ex.rest}s</span>
                    </div>
                    <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${ex.name}</h4>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin:0; line-height:1.4;">
                        <strong>Consejo de Nico:</strong> ${ex.cue}
                    </p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button type="button" class="btn btn-outline btn-sm btn-lib-video" data-video-title="Técnica: ${ex.name}" data-video-cue="${ex.cue}" style="width:auto; margin:0; font-size:11px;">
                        ▶ Video Técnica
                    </button>
                    ${isAdmin ? `
                        <button type="button" class="btn btn-primary btn-sm btn-lib-assign" data-ex-id="${ex.id}" data-ex-name="${ex.name}" style="width:auto; margin:0; font-size:11px;">
                            + Asignar a Rutina
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Conectar botones de video dentro del modal de catálogo
    listContainer.querySelectorAll('.btn-lib-video').forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.getAttribute('data-video-title');
            const cue = btn.getAttribute('data-video-cue');
            openVideoModal(title, cue);
        });
    });

    // Conectar botones de asignación para Nico/Admin
    listContainer.querySelectorAll('.btn-lib-assign').forEach(btn => {
        btn.addEventListener('click', () => {
            const exId = btn.getAttribute('data-ex-id');
            const exName = btn.getAttribute('data-ex-name');
            const targetEx = EXERCISE_CATALOG.find(e => e.id === exId);
            if (targetEx) {
                const currentDay = AppState.currentDay || 'day1';
                if (!WORKOUT_DAYS_DATA[currentDay]) {
                    WORKOUT_DAYS_DATA[currentDay] = { title: `Día: ${currentDay}`, exercises: [] };
                }
                WORKOUT_DAYS_DATA[currentDay].exercises.push({
                    id: targetEx.id,
                    name: targetEx.name,
                    notes: targetEx.cue,
                    sets: 3,
                    reps: '8-12',
                    rest: targetEx.rest,
                    defaultWeight: 15,
                    defaultReps: 10
                });
                alert(`¡${exName} asignado correctamente a ${currentDay.toUpperCase()} para el alumno!`);
                renderWorkoutDay(currentDay);
                const modal = document.getElementById('exerciseLibraryModal');
                if (modal) modal.classList.remove('active');
            }
        });
    });
}

// Sincronización del Video de Hero y Desvanecimiento de Imagen Fallback
function initHeroVideo() {
    const video = document.getElementById('heroVideo');
    const fallback = document.getElementById('heroBgFallback');
    if (!video || !fallback) return;

    function handleVideoPlaying() {
        video.style.opacity = '1';
        fallback.style.opacity = '0';
    }

    video.addEventListener('playing', handleVideoPlaying);
    video.addEventListener('timeupdate', () => {
        if (video.currentTime > 0.05) handleVideoPlaying();
    });

    // Intentar reproducción automática
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            handleVideoPlaying();
        }).catch(() => {
            // Si el navegador bloquea autoplay, mantener la imagen nítida
            fallback.style.opacity = '1';
        });
    }
}

// =============================================================================
// MÓDULO 1: NAVEGACIÓN Y NAVBAR GLOBAL
// =============================================================================
function initNavbarScroll() {
    const navbar = document.getElementById('globalNavbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Menú Móvil & Botón de Cruz para Cerrar
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuCloseBtn = document.getElementById('mobileMenuCloseBtn');
    const mobileMenuClientAccessBtn = document.getElementById('mobileMenuClientAccessBtn');

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            const isVisible = mobileMenu.style.display === 'flex';
            mobileMenu.style.display = isVisible ? 'none' : 'flex';
        });

        if (mobileMenuCloseBtn) {
            mobileMenuCloseBtn.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
            });
        }

        if (mobileMenuClientAccessBtn) {
            mobileMenuClientAccessBtn.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
                const authModal = document.getElementById('authModal');
                if (authModal) authModal.style.display = 'flex';
            });
        }

        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
            });
        });
    }
}

// Lógica de Carruseles Touch-Swipe con Paginación de Dots
function initCarousels() {
    setupCarouselSwipe('pillarsCarousel', 'pillarsDots');
    setupCarouselSwipe('pricingCarousel', 'pricingDots');
    setupCarouselSwipe('groupsCarousel', 'groupsDots');
    setupCarouselSwipe('onlineCarousel', 'onlineDots');
}

function setupCarouselSwipe(carouselId, dotsContainerId) {
    const carousel = document.getElementById(carouselId);
    const dotsContainer = document.getElementById(dotsContainerId);
    if (!carousel || !dotsContainer) return;

    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    const slides = carousel.querySelectorAll('.carousel-slide');

    // Sincronizar dots al deslizar/scrollear de forma fluida
    let scrollTicking = false;
    function updateActiveDot() {
        const scrollLeft = carousel.scrollLeft;
        let activeIndex = 0;
        let minDiff = Infinity;

        slides.forEach((slide, index) => {
            const slideLeft = slide.offsetLeft - carousel.offsetLeft;
            const diff = Math.abs(scrollLeft - slideLeft);
            if (diff < minDiff) {
                minDiff = diff;
                activeIndex = index;
            }
        });

        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === activeIndex);
        });
        scrollTicking = false;
    }

    carousel.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(updateActiveDot);
            scrollTicking = true;
        }
    }, { passive: true });

    // Navegación instantánea por dots (soporta touch y click en el primer intento)
    dots.forEach((dot, index) => {
        let dotHandled = false;
        const goToDotSlide = () => {
            if (slides[index]) {
                const targetLeft = slides[index].offsetLeft - carousel.offsetLeft;
                carousel.scrollTo({
                    left: targetLeft,
                    behavior: 'smooth'
                });
                dots.forEach((d, idx) => d.classList.toggle('active', idx === index));
            }
        };

        dot.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || e.button === 0) {
                dotHandled = true;
                goToDotSlide();
                setTimeout(() => { dotHandled = false; }, 350);
            }
        });

        dot.addEventListener('click', (e) => {
            if (dotHandled) {
                e.preventDefault();
                return;
            }
            goToDotSlide();
        });
    });

    // Permitir click/tap en un slide para alinearlo al frente si no está centrado (sin interferir con botones o links)
    slides.forEach((slide, index) => {
        slide.addEventListener('click', (e) => {
            if (e.target.closest('a, button, input, select, textarea, label')) return;
            const targetLeft = slide.offsetLeft - carousel.offsetLeft;
            if (Math.abs(carousel.scrollLeft - targetLeft) > 30) {
                carousel.scrollTo({
                    left: targetLeft,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Soporte robusto de deslizamiento táctil (Swipe) para Android e iOS
    let touchStartX = 0;
    let touchStartY = 0;
    let hasTouchMoved = false;

    carousel.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasTouchMoved = false;
        }
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        hasTouchMoved = true;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        if (!hasTouchMoved || !e.changedTouches || e.changedTouches.length === 0) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;

        // Deslizamiento predominantemente horizontal con umbral de 35px
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 35) {
            const scrollLeft = carousel.scrollLeft;
            let currentIndex = 0;
            let minDiff = Infinity;

            slides.forEach((slide, index) => {
                const slideLeft = slide.offsetLeft - carousel.offsetLeft;
                const diff = Math.abs(scrollLeft - slideLeft);
                if (diff < minDiff) {
                    minDiff = diff;
                    currentIndex = index;
                }
            });

            let targetIndex = currentIndex;
            if (deltaX > 0 && currentIndex < slides.length - 1) {
                // Deslizó hacia la izquierda -> avanzar a la derecha
                targetIndex = currentIndex + 1;
            } else if (deltaX < 0 && currentIndex > 0) {
                // Deslizó hacia la derecha -> retroceder
                targetIndex = currentIndex - 1;
            }

            if (slides[targetIndex]) {
                const targetLeft = slides[targetIndex].offsetLeft - carousel.offsetLeft;
                carousel.scrollTo({
                    left: targetLeft,
                    behavior: 'smooth'
                });
            }
        }
    }, { passive: true });
}

function initPricingTabs() {
    const mainBtns = document.querySelectorAll('.pricing-main-btn');
    const subSelector = document.getElementById('presencialSubSelector');
    const subBtns = document.querySelectorAll('.pricing-sub-btn');
    const tabContents = document.querySelectorAll('.pricing-tab-content');

    let currentMode = 'presencial';
    let currentSub = 'presencial-ind';

    function renderActivePricingView() {
        tabContents.forEach(c => {
            c.style.display = 'none';
            c.classList.remove('active');
        });

        if (currentMode === 'online') {
            if (subSelector) subSelector.style.display = 'none';
            const onlineTab = document.getElementById('tab-online');
            if (onlineTab) {
                onlineTab.style.display = 'block';
                onlineTab.classList.add('active');
                const innerCarousel = onlineTab.querySelector('.pricing-carousel');
                if (innerCarousel) innerCarousel.scrollLeft = 0;
                const dots = document.querySelectorAll('#onlineDots .carousel-dot');
                dots.forEach((dot, idx) => dot.classList.toggle('active', idx === 0));
            }
        } else {
            // Modo Presencial
            if (subSelector) subSelector.style.display = 'flex';
            const targetId = 'tab-' + currentSub;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.style.display = 'block';
                targetEl.classList.add('active');
                const innerCarousel = targetEl.querySelector('.pricing-carousel');
                if (innerCarousel) innerCarousel.scrollLeft = 0;
                const activeDotsId = currentSub === 'presencial-ind' ? '#pricingDots' : '#groupsDots';
                const dots = document.querySelectorAll(activeDotsId + ' .carousel-dot');
                dots.forEach((dot, idx) => dot.classList.toggle('active', idx === 0));
            }
        }
    }

    function selectMode(btn) {
        if (!btn || btn.classList.contains('active')) return;
        mainBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentMode = btn.getAttribute('data-mode') || 'presencial';
        renderActivePricingView();
    }

    function selectSub(btn) {
        if (!btn || btn.classList.contains('active')) return;
        subBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentSub = btn.getAttribute('data-sub') || 'presencial-ind';
        renderActivePricingView();
    }

    // Activación instantánea en el primer click o touch (sin demoras ni trampas de hover)
    mainBtns.forEach(btn => {
        let handled = false;
        btn.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || e.button === 0) {
                handled = true;
                selectMode(btn);
                setTimeout(() => { handled = false; }, 350);
            }
        });
        btn.addEventListener('click', (e) => {
            if (handled) {
                e.preventDefault();
                return;
            }
            selectMode(btn);
        });
    });

    subBtns.forEach(btn => {
        let handled = false;
        btn.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || e.button === 0) {
                handled = true;
                selectSub(btn);
                setTimeout(() => { handled = false; }, 350);
            }
        });
        btn.addEventListener('click', (e) => {
            if (handled) {
                e.preventDefault();
                return;
            }
            selectSub(btn);
        });
    });

    // Soporte para tabs legacy en caso de ser referenciados
    const legacyTabBtns = document.querySelectorAll('.pricing-tabs-nav .tab-btn');
    legacyTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            legacyTabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });
            btn.classList.add('active');
            const targetEl = document.getElementById(btn.getAttribute('data-target'));
            if (targetEl) {
                targetEl.style.display = 'block';
                targetEl.classList.add('active');
            }
        });
    });
}

// =============================================================================
// MÓDULO 3: AUTENTICACIÓN (SUPABASE AUTH / LOCAL FALLBACK)
// =============================================================================
function updateAuthNavButtons() {
    const isLoggedIn = Boolean(AppState.user);
    const navBtn = document.getElementById('navClientAccessBtn');
    const navBtnMobile = document.getElementById('navClientAccessBtnMobile');
    const quickBtn = document.getElementById('mobileQuickAccessBtn');
    const menuBtn = document.getElementById('mobileMenuClientAccessBtn');

    if (navBtn) {
        navBtn.textContent = isLoggedIn ? 'Mi Portal' : 'Acceso Clientes';
        navBtn.classList.toggle('btn-logged-in', isLoggedIn);
    }
    if (navBtnMobile) {
        navBtnMobile.textContent = isLoggedIn ? 'Mi Portal' : 'Acceso';
        navBtnMobile.classList.toggle('btn-logged-in', isLoggedIn);
    }
    if (quickBtn) {
        quickBtn.textContent = isLoggedIn ? 'Mi Portal' : 'Acceso';
        quickBtn.classList.toggle('btn-logged-in', isLoggedIn);
    }
    if (menuBtn) {
        menuBtn.textContent = isLoggedIn ? 'Mi Portal' : 'Acceso Clientes';
        menuBtn.classList.toggle('btn-logged-in', isLoggedIn);
    }
}

function initAuthModal() {
    const modal = document.getElementById('authModal');
    const mobileMenu = document.getElementById('mobileMenu');
    const openBtns = [
        document.getElementById('navClientAccessBtn'),
        document.getElementById('navClientAccessBtnMobile'),
        document.getElementById('heroLoginBtn'),
        document.getElementById('mobileQuickAccessBtn'),
        document.getElementById('mobileMenuClientAccessBtn')
    ];
    const closeBtn = document.getElementById('closeAuthModalBtn');

    openBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (AppState.user) {
                    if (mobileMenu) mobileMenu.style.display = 'none';
                    openUserPortal(false);
                    return;
                }
                if (mobileMenu) mobileMenu.style.display = 'none';
                showAuthModal(true);
            });
        }
    });

    updateAuthNavButtons();

    if (closeBtn) {
        closeBtn.addEventListener('click', () => showAuthModal(false));
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) showAuthModal(false);
        });
    }

    // Pestañas Iniciar Sesión / Registrarme
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const paneLogin = document.getElementById('loginForm');
    const paneRegister = document.getElementById('registerForm');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        paneLogin.classList.add('active');
        paneRegister.classList.remove('active');
        clearAuthAlert();
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        paneRegister.classList.add('active');
        paneLogin.classList.remove('active');
        clearAuthAlert();
    });

    // Formulario Iniciar Sesión
    paneLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        showAuthAlert('Autenticando...', 'info');

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                showAuthAlert(error.message, 'error');
                return;
            }
            AppState.user = data.user;
            await loadProfileFromSupabase(data.user.id);
        } else {
            // Local Mock
            AppState.user = { id: 'local-user-id', email };
            const savedProfile = localStorage.getItem('sens_profile_' + email);
            const savedAnamnesis = localStorage.getItem('sens_anamnesis_' + email);
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            } else {
                AppState.profile = {
                    full_name: email.split('@')[0],
                    daily_step_target: 10000,
                    active_plan_name: 'Plan Personalizado SENS TRAIN'
                };
            }
            if (savedAnamnesis) {
                AppState.anamnesis = JSON.parse(savedAnamnesis);
            }
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        showAuthAlert('¡Acceso correcto! Ingresando al portal...', 'success');
        updateAuthNavButtons();
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(false);
        }, 700);
    });

    // Formulario Registro
    paneRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;

        showAuthAlert('Registrando cuenta...', 'info');

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) {
                showAuthAlert(error.message, 'error');
                return;
            }
            AppState.user = data.user;
            AppState.profile = { full_name: fullName };
        } else {
            AppState.user = { id: 'local-user-' + Date.now(), email };
            AppState.profile = { full_name: fullName };
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        showAuthAlert('¡Cuenta creada con éxito! Pasando al asistente de inicio...', 'success');
        updateAuthNavButtons();
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(true); // Redirige a Diagnóstico inicial (Módulo 4)
        }, 800);
    });

    // Botón de prueba directa sin registrarse (Modo Demo)
    const demoBtn = document.getElementById('demoDiagnosisBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            AppState.user = { id: 'demo-user-' + Date.now(), email: 'demo@sens.com' };
            AppState.profile = { full_name: 'Atleta Demo', onboarding_completed: false };
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
            updateAuthNavButtons();
            showAuthModal(false);
            openUserPortal(true);
        });
    }
}

function showAuthModal(show) {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    if (show) {
        modal.classList.add('active');
        clearAuthAlert();
    } else {
        modal.classList.remove('active');
    }
}

function showAuthAlert(msg, type) {
    const alertBox = document.getElementById('authAlertBox');
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'auth-alert ' + (type === 'error' ? 'error' : 'success');
    alertBox.style.display = 'block';
}

function clearAuthAlert() {
    const alertBox = document.getElementById('authAlertBox');
    if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }
}

async function loadProfileFromSupabase(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data && !error) {
            AppState.profile = data;
        } else {
            AppState.profile = null;
        }

        const { data: anamData } = await supabaseClient
            .from('anamnesis')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (anamData) {
            AppState.anamnesis = anamData;
        }
    } catch (e) {
        console.error('Error cargando perfil:', e);
    }
}

function checkExistingSession() {
    const localUser = localStorage.getItem('sens_active_user');
    if (localUser) {
        try {
            AppState.user = JSON.parse(localUser);
            const savedProfile = localStorage.getItem('sens_profile_' + AppState.user.email);
            const savedAnamnesis = localStorage.getItem('sens_anamnesis_' + AppState.user.email);
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            }
            if (savedAnamnesis) {
                AppState.anamnesis = JSON.parse(savedAnamnesis);
            }
        } catch (e) {
            console.error('Error parseando sesión previa:', e);
        }
    }
    updateAuthNavButtons();
}

// =============================================================================
// NAVEGACIÓN DENTRO DEL PORTAL (#app-container)
// =============================================================================
function initPortalNavigation() {
    const navItems = document.querySelectorAll('.portal-nav-item[data-portal-tab]');
    const views = document.querySelectorAll('.portal-view');
    const logoutBtn = document.getElementById('logoutBtn');
    const backLandingBtn = document.getElementById('btnBackToLanding');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetViewId = item.getAttribute('data-portal-tab');
            switchPortalView(targetViewId);
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (supabaseClient) supabaseClient.auth.signOut();
            localStorage.removeItem('sens_active_user');
            AppState.user = null;
            AppState.profile = null;
            document.body.classList.remove('in-portal');
            const globalHeader = document.querySelector('header');
            const mobileQuickBar = document.querySelector('.mobile-quick-bar');
            if (globalHeader) globalHeader.style.display = '';
            if (mobileQuickBar) mobileQuickBar.style.display = '';
            const floatSocial = document.getElementById('homeFloatingSocial');
            if (floatSocial) floatSocial.style.display = 'flex';
            document.getElementById('app-container').classList.remove('active');
            document.getElementById('publicLanding').style.display = 'block';
            updateAuthNavButtons();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (backLandingBtn) {
        backLandingBtn.addEventListener('click', () => {
            document.body.classList.remove('in-portal');
            const globalHeader = document.querySelector('header');
            const mobileQuickBar = document.querySelector('.mobile-quick-bar');
            if (globalHeader) globalHeader.style.display = '';
            if (mobileQuickBar) mobileQuickBar.style.display = '';
            const floatSocial = document.getElementById('homeFloatingSocial');
            if (floatSocial) floatSocial.style.display = 'flex';
            document.getElementById('app-container').classList.remove('active');
            document.getElementById('publicLanding').style.display = 'block';
            updateAuthNavButtons();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Botones rápidos del Dashboard
    const quickWorkoutBtn = document.getElementById('dashQuickWorkoutBtn');
    const goWorkoutDetailBtn = document.getElementById('dashGoWorkoutDetailBtn');

    if (quickWorkoutBtn) {
        quickWorkoutBtn.addEventListener('click', () => switchPortalView('workoutView'));
    }
    if (goWorkoutDetailBtn) {
        goWorkoutDetailBtn.addEventListener('click', () => switchPortalView('workoutView'));
    }
}

function switchPortalView(viewId) {
    const navItems = document.querySelectorAll('.portal-nav-item[data-portal-tab]');
    const views = document.querySelectorAll('.portal-view');

    navItems.forEach(item => {
        if (item.getAttribute('data-portal-tab') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    views.forEach(v => {
        if (v.id === viewId) {
            v.classList.add('active');
        } else {
            v.classList.remove('active');
        }
    });

    if (viewId === 'trackingView') {
        setTimeout(initCharts, 100);
    }
}

function openUserPortal(forceOnboarding = false) {
    const portal = document.getElementById('app-container');
    const publicLanding = document.getElementById('publicLanding');
    const userEmailEl = document.getElementById('portalUserEmail');
    const globalHeader = document.querySelector('header');
    const mobileQuickBar = document.querySelector('.mobile-quick-bar');
    const mobileMenu = document.getElementById('mobileMenu');

    document.body.classList.add('in-portal');
    if (globalHeader) globalHeader.style.display = 'none';
    if (mobileQuickBar) mobileQuickBar.style.display = 'none';
    if (mobileMenu) mobileMenu.style.display = 'none';

    const floatSocial = document.getElementById('homeFloatingSocial');
    if (floatSocial) floatSocial.style.display = 'none';

    portal.classList.add('active');
    publicLanding.style.display = 'none';

    if (AppState.user) {
        userEmailEl.textContent = AppState.user.email || 'atleta@sens.com';
    }

    // Comprobar si el diagnóstico clínico fue completado
    const isCompleted = Boolean(AppState.profile && AppState.profile.onboarding_completed);

    if (forceOnboarding || !isCompleted) {
        // Redirige al diagnóstico inicial
        document.getElementById('portalSubNav').style.display = 'none';
        startDiagnosisWizard(false);
    } else {
        // Redirige al Dashboard de Atleta
        document.getElementById('portalSubNav').style.display = 'flex';
        renderDashboardData();
        switchPortalView('dashView');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDashboardData() {
    const userNameEl = document.getElementById('dashUserName');
    const planBadgeEl = document.getElementById('portalPlanBadge');
    const weightKpi = document.getElementById('kpiCurrentWeight');
    const diagTagsContainer = document.getElementById('dashDiagTags');
    const diagStatusPill = document.getElementById('dashDiagStatusPill');
    const diagDateBadge = document.getElementById('dashDiagDateBadge');
    const diagSummaryText = document.getElementById('dashDiagSummaryText');

    const profile = AppState.profile || {};
    const anamnesis = AppState.anamnesis || {};

    if (profile.full_name) {
        userNameEl.textContent = profile.full_name;
    }
    if (profile.active_plan_name && planBadgeEl) {
        planBadgeEl.textContent = profile.active_plan_name;
    }
    if (profile.current_weight && weightKpi) {
        weightKpi.innerHTML = `${profile.current_weight} <span style="font-size:1rem; font-weight:400;">kg</span>`;
    }

    // Actualizar Card de Diagnóstico en el Dashboard
    if (diagTagsContainer) {
        let tagsHtml = '';

        if (profile.current_weight) {
            tagsHtml += `<span class="diag-tag">Peso: ${profile.current_weight} kg</span>`;
        }
        if (anamnesis.weekly_frequency) {
            tagsHtml += `<span class="diag-tag">Frecuencia: ${anamnesis.weekly_frequency} días/sem</span>`;
        }
        if (anamnesis.experience_level) {
            const expMap = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
            tagsHtml += `<span class="diag-tag">Nivel: ${expMap[anamnesis.experience_level] || anamnesis.experience_level}</span>`;
        }
        if (anamnesis.water_liters_baseline) {
            tagsHtml += `<span class="diag-tag highlight">Agua: ${anamnesis.water_liters_baseline} L/día</span>`;
        }
        if (anamnesis.daily_step_target) {
            tagsHtml += `<span class="diag-tag">Pasos: ${anamnesis.daily_step_target.toLocaleString()} /día</span>`;
        }

        if (anamnesis.has_medical_flags) {
            tagsHtml += `<span class="diag-tag" style="border-color:#D95D50; color:#F87171;">Revisión de salud requerida</span>`;
        } else {
            tagsHtml += `<span class="diag-tag">Apto para entrenamiento</span>`;
        }

        if (Array.isArray(anamnesis.active_injuries) && anamnesis.active_injuries.length > 0) {
            tagsHtml += `<span class="diag-tag" style="border-color:rgba(229,203,167,0.4); color:var(--accent-primary);">Zonas atendidas: ${anamnesis.active_injuries.join(', ')}</span>`;
        } else {
            tagsHtml += `<span class="diag-tag">Articulaciones libres de dolor</span>`;
        }

        diagTagsContainer.innerHTML = tagsHtml;
    }

    if (diagStatusPill) {
        if (profile.vip_candidate) {
            diagStatusPill.textContent = 'Perfil VIP • Prioritario';
            diagStatusPill.className = 'pill pill-champagne';
        } else {
            diagStatusPill.textContent = 'Perfil Activo • Nico';
            diagStatusPill.className = 'pill pill-champagne';
        }
    }

    if (diagDateBadge && profile.updated_at) {
        try {
            const d = new Date(profile.updated_at);
            diagDateBadge.textContent = `Actualizado ${d.toLocaleDateString()}`;
        } catch (e) {
            diagDateBadge.textContent = 'Perfil al día';
        }
    }

    if (diagSummaryText && profile.full_name) {
        diagSummaryText.textContent = `Perfil biomecánico y de hábitos de ${profile.full_name}. Información protegida bajo Ley 25.326 y auditada por Nico para calibrar tus sesiones.`;
    }

    const workoutsKpi = document.getElementById('kpiWorkoutsWeek');
    if (workoutsKpi && anamnesis.weekly_frequency) {
        workoutsKpi.textContent = `0 / ${anamnesis.weekly_frequency}`;
    }
    const stepsKpi = document.getElementById('kpiAvgSteps');
    if (stepsKpi && anamnesis.daily_step_target) {
        stepsKpi.textContent = Number(anamnesis.daily_step_target).toLocaleString('es-AR');
    }

    // Ocultar sección de métricas y workout asignado hasta completar el diagnóstico final
    const kpiGrid = document.getElementById('dashKpiMetricsGrid');
    const heroCard = document.getElementById('dashActionHeroCard');
    const isOnboardingDone = Boolean(profile.onboarding_completed);

    if (kpiGrid) kpiGrid.style.display = isOnboardingDone ? 'grid' : 'none';
    if (heroCard) heroCard.style.display = isOnboardingDone ? 'flex' : 'none';
}

// Iniciar Wizard de Diagnóstico (Modo Inicial o Modo Edición)
function startDiagnosisWizard(isEditMode = false) {
    AppState.isEditingDiagnosis = isEditMode;
    const modeBadge = document.getElementById('diagModeBadge');
    const exitBtn = document.getElementById('wizardExitToDashBtn');

    if (isEditMode) {
        if (modeBadge) modeBadge.textContent = 'Modo Edición';
        if (exitBtn) exitBtn.style.display = 'inline-block';
        // En modo edición cargamos los datos existentes y vamos al paso 1
        prefillDiagnosisForm();
        window.diagWizardGoStep(1);
    } else {
        if (modeBadge) modeBadge.textContent = 'Diagnóstico Inicial';
        if (exitBtn) exitBtn.style.display = 'none';
        
        // Intentar restaurar borrador guardado en localStorage
        const hasDraft = restoreDiagnosisDraft();
        if (!hasDraft) {
            window.diagWizardGoStep(0);
        }
    }

    switchPortalView('onboardingSection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================================================
// MÓDULO 4: ONBOARDING, ANAMNESIS DIGITAL & DIAGNÓSTICO CLÍNICO (8 PASOS)
// =============================================================================
function initDiagnosisWizard() {
    // 1. Checkbox de Consentimiento (Paso 0)
    const consentCheck = document.getElementById('diagConsentCheck');
    const btnStartDiag = document.getElementById('btnStartDiag');
    if (consentCheck && btnStartDiag) {
        consentCheck.addEventListener('change', () => {
            btnStartDiag.disabled = !consentCheck.checked;
        });
        btnStartDiag.addEventListener('click', () => {
            if (consentCheck.checked) {
                window.diagWizardGoStep(1, '¡Comenzamos!');
            }
        });
    }

    // 2. Cuestionario de Salud con Switch Toggles (Paso 1)
    const healthToggles = document.querySelectorAll('.health-toggle-input');
    healthToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const qKey = toggle.getAttribute('data-q');
            const detailEl = document.getElementById(`detail_${qKey}`);
            const item = toggle.closest('.health-switch-item');
            const statusTag = document.getElementById(`status_${qKey}`);

            if (statusTag) {
                statusTag.textContent = toggle.checked ? 'SÍ' : 'NO';
                statusTag.classList.toggle('is-yes', toggle.checked);
            }

            if (toggle.checked) {
                if (detailEl) detailEl.style.display = 'block';
                if (item) item.classList.add('has-detail');
            } else {
                if (detailEl) detailEl.style.display = 'none';
                if (item) item.classList.remove('has-detail');
            }
            saveDiagnosisDraft();
        });
    });

    document.querySelectorAll('.health-detail-input').forEach(input => {
        input.addEventListener('input', () => {
            saveDiagnosisDraft();
        });
    });

    // 3. Topografía de Lesiones con Intensidad Localizada (Paso 2)
    const injuryCheckboxes = document.querySelectorAll('#injuriesPillGrid input[name="diagInjuries"]');
    const noInjuriesCheck = document.getElementById('diagNoInjuriesCheck');

    injuryCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const injuryKey = cb.value;
            const intensityRow = document.getElementById(`intensity_${injuryKey}`);
            
            if (cb.checked) {
                if (noInjuriesCheck) noInjuriesCheck.checked = false;
                if (intensityRow) intensityRow.style.display = 'flex';
            } else {
                if (intensityRow) intensityRow.style.display = 'none';
            }
            saveDiagnosisDraft();
        });
    });

    if (noInjuriesCheck) {
        noInjuriesCheck.addEventListener('change', () => {
            if (noInjuriesCheck.checked) {
                injuryCheckboxes.forEach(cb => {
                    cb.checked = false;
                    const intensityRow = document.getElementById(`intensity_${cb.value}`);
                    if (intensityRow) intensityRow.style.display = 'none';
                });
            }
            saveDiagnosisDraft();
        });
    }

    // Botones de intensidad por zona seleccionada (Leve | Moderada | Aguda)
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const group = btn.closest('.intensity-pill-group');
            if (group) {
                group.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
            }
            btn.classList.add('active');
            saveDiagnosisDraft();
        });
    });

    // Switch de Cirugías Previas (Paso 2)
    const surgerySwitch = document.getElementById('switchSurgeryCheck');
    const surgeryDetailBox = document.getElementById('detail_surgery');
    const surgeryStatusTag = document.getElementById('status_surgery');
    const surgeryInput = document.getElementById('diagSurgeryDetail');

    if (surgerySwitch) {
        surgerySwitch.addEventListener('change', () => {
            const isChecked = surgerySwitch.checked;
            if (surgeryStatusTag) {
                surgeryStatusTag.textContent = isChecked ? 'SÍ' : 'NO';
                surgeryStatusTag.classList.toggle('is-yes', isChecked);
            }
            if (surgeryDetailBox) {
                surgeryDetailBox.style.display = isChecked ? 'block' : 'none';
            }
            saveDiagnosisDraft();
        });
    }

    if (surgeryInput) {
        surgeryInput.addEventListener('input', () => saveDiagnosisDraft());
    }

    // 4. Contexto Deportivo (Paso 3)
    document.querySelectorAll('input[name="diagExperience"]').forEach(r => {
        r.addEventListener('change', () => saveDiagnosisDraft());
    });

    // Slider de frecuencia de 1 a 7
    const freqSlider = document.getElementById('diagFreqSlider');
    const freqDisplay = document.getElementById('diagFreqDisplay');
    const scaleTicks = document.querySelectorAll('.scale-tick');

    function updateFreqDisplay(val) {
        const num = parseInt(val, 10);
        if (freqDisplay) {
            freqDisplay.textContent = num === 1 ? '1 día por semana' : `${num} días por semana`;
        }
        scaleTicks.forEach(tick => {
            tick.classList.toggle('active', parseInt(tick.getAttribute('data-val'), 10) === num);
        });
    }

    if (freqSlider) {
        freqSlider.addEventListener('input', () => {
            updateFreqDisplay(freqSlider.value);
            saveDiagnosisDraft();
        });
    }

    scaleTicks.forEach(tick => {
        tick.addEventListener('click', () => {
            const v = tick.getAttribute('data-val');
            if (freqSlider) {
                freqSlider.value = v;
                updateFreqDisplay(v);
                saveDiagnosisDraft();
            }
        });
    });

    // Checkboxes de Equipamiento (Paso 3)
    document.querySelectorAll('input[name="diagEquipment"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const card = cb.closest('.pill-card');
            if (card) {
                card.classList.toggle('selected', cb.checked);
            }
            saveDiagnosisDraft();
        });
    });

    // 5. Carga Alostática (Paso 4)
    const sleepSlider = document.getElementById('diagSleepSlider');
    const sleepVal = document.getElementById('diagSleepVal');
    if (sleepSlider && sleepVal) {
        sleepSlider.addEventListener('input', () => {
            sleepVal.textContent = `${parseFloat(sleepSlider.value).toFixed(1)} hs`;
            saveDiagnosisDraft();
        });
    }

    const stressSlider = document.getElementById('diagStressSlider');
    const stressVal = document.getElementById('diagStressVal');
    if (stressSlider && stressVal) {
        stressSlider.addEventListener('input', () => {
            stressVal.textContent = `${stressSlider.value} / 10`;
            saveDiagnosisDraft();
        });
    }

    const waterBtns = document.querySelectorAll('.water-btn');
    waterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            waterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveDiagnosisDraft();
        });
    });

    document.querySelectorAll('input[name="diagNeat"]').forEach(r => {
        r.addEventListener('change', () => saveDiagnosisDraft());
    });

    // 6. Barrera de Adherencia (Paso 5)
    document.querySelectorAll('input[name="diagHurdle"]').forEach(r => {
        r.addEventListener('change', () => saveDiagnosisDraft());
    });
    const hurdleDetailInput = document.getElementById('diagHurdleDetail');
    if (hurdleDetailInput) {
        hurdleDetailInput.addEventListener('input', () => saveDiagnosisDraft());
    }

    // 7. Pruebas de Movilidad (Paso 6) & Opción Omitir
    const skipMobilityBtn = document.getElementById('btnSkipMobility');
    if (skipMobilityBtn) {
        skipMobilityBtn.addEventListener('click', () => {
            AppState.diagnosisDraft = AppState.diagnosisDraft || {};
            AppState.diagnosisDraft.mobilitySkipped = true;
            saveDiagnosisDraft();
            window.diagWizardGoStep(8, 'Pruebas omitidas por ahora');
        });
    }

    // 8. Registro Fotográfico Postural (Paso 7)
    setupPhotoUpload('filePhotoFront', 'previewImgFront', 'boxPhotoFront');
    setupPhotoUpload('filePhotoSide', 'previewImgSide', 'boxPhotoSide');
    setupPhotoUpload('filePhotoBack', 'previewImgBack', 'boxPhotoBack');

    // Monitoreo de campos biométricos y objetivo (Paso 7)
    ['diagFullName', 'diagAge', 'diagWeight', 'diagHeight', 'diagTapeWaist', 'diagTapeHip', 'diagTapeArm', 'diagTapeThigh'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => saveDiagnosisDraft());
    });

    document.querySelectorAll('input[name="diagGender"]').forEach(r => {
        r.addEventListener('change', () => saveDiagnosisDraft());
    });

    document.querySelectorAll('input[name="diagGoal"]').forEach(r => {
        r.addEventListener('change', () => saveDiagnosisDraft());
    });

    // 9. Botón Finalizar Diagnóstico (Paso 7 -> Paso 8)
    const finishBtn = document.getElementById('btnFinishDiagnosis');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            processDiagnosisSubmission();
        });
    }

    // 10. Botón Entrar al Dashboard desde Congrats (Paso 8)
    const enterDashBtn = document.getElementById('btnDiagEnterDashboard');
    if (enterDashBtn) {
        enterDashBtn.addEventListener('click', () => {
            document.getElementById('portalSubNav').style.display = 'flex';
            renderDashboardData();
            switchPortalView('dashView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 11. Botón Salir al Dashboard si se está en Modo Edición
    const exitDashBtn = document.getElementById('wizardExitToDashBtn');
    if (exitDashBtn) {
        exitDashBtn.addEventListener('click', () => {
            document.getElementById('portalSubNav').style.display = 'flex';
            renderDashboardData();
            switchPortalView('dashView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 12. Botón "Ver o Modificar mis Datos" en Dashboard & Nav
    const editDiagBtn = document.getElementById('dashEditDiagnosisBtn');
    if (editDiagBtn) {
        editDiagBtn.addEventListener('click', () => {
            startDiagnosisWizard(true);
        });
    }

    const navPortalDiag = document.getElementById('navPortalDiagnosis');
    if (navPortalDiag) {
        navPortalDiag.addEventListener('click', () => {
            startDiagnosisWizard(true);
        });
    }
}

// Helper: Setup Foto Postural con compresión WebP cliente
function setupPhotoUpload(inputId, imgId, boxId) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    const box = document.getElementById(boxId);
    if (!input || !img || !box) return;

    input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            img.src = dataUrl;
            img.style.display = 'block';

            const placeholder = box.querySelector('.photo-preview-placeholder');
            if (placeholder) placeholder.style.display = 'none';

            const btn = box.querySelector('.photo-upload-btn');
            if (btn) btn.textContent = 'Cambiar Foto';

            showDiagnosisToast('¡Foto cargada con éxito!');
            saveDiagnosisDraft();
        };
        reader.readAsDataURL(file);
    });
}

// Navegación secuencial de pasos con animación suave
window.diagWizardGoStep = function(targetStep, toastMsg) {
    const stepCards = document.querySelectorAll('.wizard-step-card');
    const targetCard = document.getElementById(`diagStep${targetStep}`);
    if (!targetCard) return;

    const currentStep = AppState.diagnosisCurrentStep || 0;
    const isMovingBack = targetStep < currentStep;

    stepCards.forEach(card => {
        card.classList.remove('active', 'slide-back');
    });

    if (isMovingBack) {
        targetCard.classList.add('slide-back');
    }
    targetCard.classList.add('active');

    // Actualizar barra de progreso y etiquetas
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const stepLabel = document.getElementById('diagStepLabel');

    const progressPercentages = [0, 12, 25, 37, 50, 62, 75, 87, 95, 100];
    const stepNames = [
        'Paso 0 de 8: Consentimiento Legal',
        'Paso 1 de 8: Perfil & Objetivo SENS',
        'Paso 2 de 8: Cuestionario de Salud',
        'Paso 3 de 8: Topografía de Dolor & Lesiones',
        'Paso 4 de 8: Contexto Deportivo & Logística',
        'Paso 5 de 8: Carga Alostática & Estilo de Vida',
        'Paso 6 de 8: Barrera de Adherencia',
        'Paso 7 de 8: Pruebas Funcionales de Movilidad',
        'Paso 8 de 8: Registro Postural & Medidas',
        'Expediente Completado'
    ];

    const pct = progressPercentages[targetStep] || 0;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}%`;
    if (stepLabel) stepLabel.textContent = stepNames[targetStep] || `Paso ${targetStep}`;

    if (toastMsg) {
        showDiagnosisToast(toastMsg);
    }

    if (targetStep === 9) {
        const p = AppState.profile || {};
        const a = AppState.anamnesis || {};
        const gender = p.gender || a.gender || document.querySelector('input[name="diagGender"]:checked')?.value || 'male';
        const weight = parseFloat(p.current_weight || document.getElementById('diagWeight')?.value || '78.0');
        const height = parseFloat(p.height || document.getElementById('diagHeight')?.value || '175');
        const goal = p.goal || a.goal || document.querySelector('input[name="diagGoal"]:checked')?.value || 'fat_loss';
        const fullName = p.full_name || document.getElementById('diagFullName')?.value || (AppState.user ? AppState.user.email.split('@')[0] : 'Atleta SENS');
        renderBiometricSilhouettes(gender, weight, height, goal, fullName);
    }

    AppState.diagnosisCurrentStep = targetStep;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Auto-avance Fricción Cero en preguntas de opción única (350ms pause)
window.diagAutoAdvanceRadio = function(element, groupName, nextStepTarget, toastMsg) {
    const radio = element.querySelector(`input[name="diag${groupName.charAt(0).toUpperCase() + groupName.slice(1)}"]`) || element.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
    }

    saveDiagnosisDraft();

    if (typeof nextStepTarget === 'number') {
        setTimeout(() => {
            window.diagWizardGoStep(nextStepTarget, toastMsg);
        }, 350);
    } else {
        showDiagnosisToast('¡Registrado!');
    }
};

// Toast de micro-dopamina
function showDiagnosisToast(message) {
    const toast = document.getElementById('feedbackToast');
    if (!toast) return;
    toast.textContent = message || '¡Excelente!';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

// Procesar el envío completo y calcular algoritmo VIP + Micro-hábitos
async function processDiagnosisSubmission() {
    const fullNameInput = document.getElementById('diagFullName');
    const ageInput = document.getElementById('diagAge');
    const weightInput = document.getElementById('diagWeight');
    const heightInput = document.getElementById('diagHeight');
    const genderInput = document.querySelector('input[name="diagGender"]:checked');
    const goalInput = document.querySelector('input[name="diagGoal"]:checked');

    const fullName = (fullNameInput ? fullNameInput.value.trim() : '') || (AppState.user ? AppState.user.email.split('@')[0] : 'Atleta SENS');
    const gender = genderInput ? genderInput.value : 'male';
    const goal = goalInput ? goalInput.value : 'fat_loss';
    const age = parseInt(ageInput ? ageInput.value : '45', 10);
    const weight = parseFloat(weightInput ? weightInput.value : '78.0') || 78.0;
    const height = parseFloat(heightInput ? heightInput.value : '175') || 175;

    // Respuestas del Cuestionario de Salud (Switches)
    const parqResponses = {};
    let positiveParqCount = 0;
    let parqNotes = '';

    document.querySelectorAll('.health-toggle-input').forEach(toggle => {
        const qKey = toggle.getAttribute('data-q');
        const isPos = toggle.checked;
        parqResponses[qKey] = isPos ? 'si' : 'no';
        if (isPos) {
            positiveParqCount++;
            const detailInput = document.querySelector(`.health-detail-input[data-for="${qKey}"]`);
            const note = detailInput ? detailInput.value.trim() : '';
            if (note) {
                parqNotes += (parqNotes ? ' | ' : '') + `${qKey}: ${note}`;
            }
        }
    });
    const hasMedicalFlags = positiveParqCount > 0;

    // Lesiones activas con intensidad localizada
    const selectedInjuries = [];
    const injuryIntensities = {};
    let hasAguda = false;
    let hasModerada = false;

    document.querySelectorAll('#injuriesPillGrid input[name="diagInjuries"]:checked').forEach(cb => {
        const k = cb.value;
        selectedInjuries.push(k);
        const activeBtn = document.querySelector(`.intensity-btn[data-injury="${k}"].active`);
        const lvl = activeBtn ? activeBtn.getAttribute('data-level') : 'moderada';
        injuryIntensities[k] = lvl;
        if (lvl === 'aguda') hasAguda = true;
        if (lvl === 'moderada') hasModerada = true;
    });

    // Medidas con cinta métrica (Opcionales)
    const tapeWaist = parseFloat(document.getElementById('diagTapeWaist')?.value) || null;
    const tapeHip = parseFloat(document.getElementById('diagTapeHip')?.value) || null;
    const tapeArm = parseFloat(document.getElementById('diagTapeArm')?.value) || null;
    const tapeThigh = parseFloat(document.getElementById('diagTapeThigh')?.value) || null;

    // Contexto deportivo
    const experience = document.querySelector('input[name="diagExperience"]:checked')?.value || 'intermediate';
    const freqSlider = document.getElementById('diagFreqSlider');
    const weeklyFrequency = freqSlider ? parseInt(freqSlider.value, 10) : 3;
    const availableEquipment = Array.from(document.querySelectorAll('input[name="diagEquipment"]:checked')).map(el => el.value);

    // Carga alostática
    const sleepHours = parseFloat(document.getElementById('diagSleepSlider')?.value || '7.0');
    const stressLevel = parseInt(document.getElementById('diagStressSlider')?.value || '6', 10);
    const neatLevel = document.querySelector('input[name="diagNeat"]:checked')?.value || 'sedentary';
    const activeWaterBtn = document.querySelector('.water-btn.active');
    const waterBaseline = activeWaterBtn ? parseFloat(activeWaterBtn.getAttribute('data-water')) : 2.0;

    // Cirugías previas
    const hasSurgery = Boolean(document.getElementById('switchSurgeryCheck')?.checked);
    const surgeryDetail = document.getElementById('diagSurgeryDetail')?.value.trim() || '';

    // Obstáculo de adherencia y detalle opcional
    const historicalHurdle = document.querySelector('input[name="diagHurdle"]:checked')?.value || 'time';
    const hurdleDetail = document.getElementById('diagHurdleDetail')?.value.trim() || '';

    // Pruebas de movilidad
    const isMobilitySkipped = AppState.diagnosisDraft?.mobilitySkipped || false;
    const mobShoulder = isMobilitySkipped ? 'skipped' : (document.querySelector('input[name="diagMobShoulder"]:checked')?.value || 'ok');
    const mobPosterior = isMobilitySkipped ? 'skipped' : (document.querySelector('input[name="diagMobPosterior"]:checked')?.value || 'ok');

    // Fotos posturales (Frontal y Perfil)
    const frontPhoto = document.getElementById('previewImgFront')?.src || null;
    const sidePhoto = document.getElementById('previewImgSide')?.src || null;

    // =========================================================================
    // ALGORITMO VIP SCORE (PRD Sección 4)
    // Score VIP = (0.45 * C_clinica) + (0.30 * A_alostatica) + (0.25 * V_adherencia)
    // =========================================================================
    let c_clinica = 0;
    c_clinica += positiveParqCount * 4;
    if (selectedInjuries.length > 0) {
        c_clinica += selectedInjuries.length * 2;
        if (hasAguda) c_clinica += 3;
        else if (hasModerada) c_clinica += 1.5;
    }
    if (hasSurgery) {
        c_clinica += 2;
    }
    if (mobShoulder === 'pain' || mobPosterior === 'pain') {
        c_clinica += 2;
    }
    c_clinica = Math.min(10, c_clinica);

    let a_alostatica = 0;
    if (stressLevel >= 8) a_alostatica += 5;
    if (sleepHours < 6) a_alostatica += 3;
    if (neatLevel === 'sedentary') a_alostatica += 2;
    a_alostatica = Math.min(10, a_alostatica);

    let v_adherencia = 0;
    if (historicalHurdle === 'pain' || historicalHurdle === 'consistency') v_adherencia += 5;
    if (experience === 'beginner') v_adherencia += 5;
    v_adherencia = Math.min(10, v_adherencia);

    const vipScore = parseFloat(((0.45 * c_clinica) + (0.30 * a_alostatica) + (0.25 * v_adherencia)).toFixed(2));
    const isVipCandidate = vipScore >= 6.5;

    // =========================================================================
    // CÁLCULO DE MICRO-HÁBITOS BASALES (PRD Sección 5.4)
    // =========================================================================
    const calculatedWaterLiters = (Math.round((weight * 0.035) * 10) / 10).toFixed(1);
    let calculatedStepTarget = 8000;
    if (neatLevel === 'sedentary') calculatedStepTarget = 7000;
    else if (neatLevel === 'active') calculatedStepTarget = 10000;

    // Renderizar siluetas biométricas y objetivo personalizado SENS
    renderBiometricSilhouettes(gender, weight, height, goal, fullName);

    // =========================================================================
    // PERSISTENCIA DE DATOS
    // =========================================================================
    const profilePayload = {
        id: AppState.user ? AppState.user.id : undefined,
        full_name: fullName,
        gender,
        goal,
        age,
        current_weight: weight,
        height,
        daily_step_target: calculatedStepTarget,
        role: isVipCandidate ? 'user_vip' : 'user_normal',
        vip_candidate: isVipCandidate,
        vip_score: vipScore,
        onboarding_completed: true,
        consent_timestamp: new Date().toISOString(),
        consent_version: 'v1.0_2026',
        active_plan_name: 'Plan Personalizado SENS TRAIN',
        updated_at: new Date().toISOString()
    };

    const anamnesisPayload = {
        user_id: AppState.user ? AppState.user.id : undefined,
        gender,
        goal,
        parq_responses: parqResponses,
        has_medical_flags: hasMedicalFlags,
        parq_notes: parqNotes,
        active_injuries: selectedInjuries,
        injury_intensities: injuryIntensities,
        has_surgery: hasSurgery,
        surgery_detail: surgeryDetail,
        tape_measurements: {
            waist: tapeWaist,
            hip: tapeHip,
            arm: tapeArm,
            thigh: tapeThigh
        },
        experience_level: experience,
        weekly_frequency: weeklyFrequency,
        available_equipment: availableEquipment,
        sleep_hours: sleepHours,
        stress_level: stressLevel,
        neat_level: neatLevel,
        water_liters_baseline: parseFloat(calculatedWaterLiters),
        historical_hurdle: historicalHurdle,
        historical_hurdle_detail: hurdleDetail,
        mobility_tests: { shoulder: mobShoulder, posterior: mobPosterior },
        photos: {
            front: frontPhoto && frontPhoto.startsWith('data:') ? 'uploaded_local' : frontPhoto,
            side: sidePhoto && sidePhoto.startsWith('data:') ? 'uploaded_local' : sidePhoto
        },
        daily_step_target: calculatedStepTarget,
        is_draft: false,
        updated_at: new Date().toISOString()
    };

    AppState.profile = profilePayload;
    AppState.anamnesis = anamnesisPayload;

    const emailKey = AppState.user && AppState.user.email ? AppState.user.email : 'local_user';
    localStorage.setItem(`sens_profile_${emailKey}`, JSON.stringify(profilePayload));
    localStorage.setItem(`sens_anamnesis_${emailKey}`, JSON.stringify(anamnesisPayload));
    localStorage.removeItem('sens_onboarding_draft');

    // Sincronización en segundo plano con Supabase si está disponible
    if (supabaseClient && AppState.user) {
        try {
            await supabaseClient.from('profiles').upsert(profilePayload);
            await supabaseClient.from('anamnesis').upsert(anamnesisPayload);
        } catch (err) {
            console.error('Error sincronizando con Supabase:', err);
        }
    }

    // Avanzar a la pantalla de felicitaciones (Paso 9)
    window.diagWizardGoStep(9, '¡Diagnóstico completado con éxito!');
}

// Temporizador regresivo (deprecado en favor de compromiso estático de Nico en 24h)
function startDiagnosisCountdown() {
    if (AppState.diagCountdownInterval) {
        clearInterval(AppState.diagCountdownInterval);
        AppState.diagCountdownInterval = null;
    }
}

// Renderizado de Siluetas Biométricas Dinámicas (Punto de Partida vs Objetivo SENS)
function renderBiometricSilhouettes(gender, weight, height, goal, fullName) {
    const currentContainer = document.getElementById('silhouetteRenderCurrent');
    const goalContainer = document.getElementById('silhouetteRenderGoal');
    const nameDisplay = document.getElementById('diagAthleteNameDisplay');
    const metricsTag = document.getElementById('diagAthleteMetricsTag');
    const statusBadge = document.getElementById('diagAthleteStatusBadge');
    const goalDisplay = document.getElementById('diagAthleteGoalDisplay');
    const goalSubTag = document.getElementById('diagAthleteGoalSubTag');

    const safeWeight = parseFloat(weight) || 78.0;
    const safeHeight = parseFloat(height) || 175.0;
    const heightM = safeHeight / 100;
    const bmi = parseFloat((safeWeight / (heightM * heightM)).toFixed(1));

    // Factor de altura en relación a la media poblacional deportiva
    const refHeight = gender === 'female' ? 164 : 175;
    const heightFactor = Math.min(1.15, Math.max(0.85, safeHeight / refHeight));

    // Factor de corpulencia / anchura basado en el IMC
    const widthFactor = Math.min(1.28, Math.max(0.78, Math.pow(bmi / 22.5, 0.72)));

    // Categorización cualitativa personalizada
    let heightDesc = 'Estatura Media';
    if (gender === 'female') {
        if (safeHeight >= 170) heightDesc = 'Estatura Alta';
        else if (safeHeight <= 158) heightDesc = 'Estatura Compacta';
    } else {
        if (safeHeight >= 182) heightDesc = 'Estatura Alta';
        else if (safeHeight <= 168) heightDesc = 'Estatura Compacta';
    }

    let corpDesc = 'Complexión Proporcional';
    if (bmi < 19.5) corpDesc = 'Complexión Esbelta / Ectomorfa';
    else if (bmi >= 19.5 && bmi < 24.5) corpDesc = 'Complexión Atlética';
    else if (bmi >= 24.5 && bmi < 28.5) corpDesc = 'Complexión Fuerte / Corpulenta';
    else corpDesc = 'Complexión Robusta';

    // Adaptación morfológica proyectada según objetivo
    let targetWidth = 1.0;
    let targetHeight = heightFactor * 1.02;
    let goalTitle = 'Definición & Pérdida de Grasa';
    let goalSub = 'Proyección SENS: Reducción Adiposa & Definición';

    if (goal === 'fat_loss') {
        targetWidth = Math.max(0.80, widthFactor * 0.86);
        goalTitle = 'Definición & Pérdida de Grasa';
        goalSub = 'Proyección SENS: Cintura Definida & Tono Muscular';
    } else if (goal === 'muscle_gain') {
        targetWidth = Math.min(1.18, Math.max(1.04, widthFactor * 1.08));
        goalTitle = 'Fuerza & Masa Muscular';
        goalSub = 'Proyección SENS: V-Taper, Expansión & Mayor Densidad';
    } else if (goal === 'recomp') {
        targetWidth = Math.min(1.04, Math.max(0.92, widthFactor * 0.94));
        goalTitle = 'Recomposición Corporal';
        goalSub = 'Proyección SENS: Densidad Magra & Cintura Estilizada';
    } else if (goal === 'posture_health') {
        targetWidth = Math.min(1.02, Math.max(0.90, widthFactor * 0.95));
        targetHeight = heightFactor * 1.04;
        goalTitle = 'Salud, Postura & Vitalidad';
        goalSub = 'Proyección SENS: Alineación Biomecánica & Simetría';
    }

    function buildSilhouetteSvg(isTarget, wFactor, hFactor) {
        const strokeColor = isTarget ? "#E5CBA7" : "rgba(229, 203, 167, 0.45)";
        const fillColor = isTarget ? "rgba(229, 203, 167, 0.16)" : "rgba(255, 255, 255, 0.04)";
        const glow = isTarget ? "filter: drop-shadow(0 0 12px rgba(229, 203, 167, 0.42));" : "";

        const malePath = `
            M 45 34
            C 40 35, 33 40, 24 46
            C 18 50, 15 62, 17 80
            L 14 115
            C 13 125, 16 128, 19 125
            L 23 96
            C 25 82, 32 78, 33 90
            L 34 105
            C 33 115, 30 126, 28 144
            C 27 156, 31 165, 31 175
            L 34 194
            L 42 194
            L 42 178
            C 42 165, 45 140, 48 122
            L 52 122
            C 55 140, 58 165, 58 178
            L 58 194
            L 66 194
            L 69 175
            C 69 165, 73 156, 72 144
            C 70 126, 67 115, 66 105
            L 67 90
            C 68 78, 75 82, 77 96
            L 81 125
            C 84 128, 87 125, 86 115
            L 83 80
            C 85 62, 82 50, 76 46
            C 67 40, 60 35, 55 34
            Z
        `;

        const femalePath = `
            M 46 34
            C 42 36, 35 41, 28 47
            C 22 52, 19 64, 20 80
            L 18 115
            C 17 124, 20 126, 22 123
            L 25 96
            C 27 80, 34 76, 35 88
            C 35 98, 29 108, 28 122
            C 27 136, 28 148, 29 160
            C 30 170, 33 178, 34 194
            L 41 194
            L 42 178
            C 42 165, 45 142, 48 123
            L 52 123
            C 55 142, 58 165, 58 178
            L 59 194
            L 66 194
            C 67 178, 70 170, 71 160
            C 72 148, 73 136, 72 122
            C 71 108, 65 98, 65 88
            C 66 76, 73 80, 75 96
            L 78 123
            C 80 126, 83 124, 82 115
            L 80 80
            C 81 64, 78 52, 72 47
            C 65 41, 58 36, 54 34
            Z
        `;

        const bodyPath = gender === 'female' ? femalePath : malePath;
        const headRadiusX = gender === 'female' ? 8 : 9;
        const headRadiusY = gender === 'female' ? 11 : 12;

        return `
        <svg viewBox="0 0 100 210" style="width: 100%; height: 210px; max-height: 230px; ${glow}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(50, 105) scale(${wFactor.toFixed(3)}, ${hFactor.toFixed(3)}) translate(-50, -105)">
                <ellipse cx="50" cy="20" rx="${headRadiusX}" ry="${headRadiusY}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
                <path d="${bodyPath.trim()}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/>
            </g>
        </svg>`;
    }

    if (currentContainer) currentContainer.innerHTML = buildSilhouetteSvg(false, widthFactor, heightFactor);
    if (goalContainer) goalContainer.innerHTML = buildSilhouetteSvg(true, targetWidth, targetHeight);

    if (nameDisplay) nameDisplay.textContent = fullName || 'Atleta SENS';
    if (metricsTag) metricsTag.textContent = `${safeHeight} cm • ${safeWeight.toFixed(1)} kg • IMC ${bmi}`;
    if (statusBadge) statusBadge.textContent = `${heightDesc} • ${corpDesc}`;
    if (goalDisplay) goalDisplay.textContent = goalTitle;
    if (goalSubTag) goalSubTag.textContent = goalSub;
}

// Guardar borrador en tiempo real
function saveDiagnosisDraft() {
    try {
        const injuriesDraft = [];
        document.querySelectorAll('#injuriesPillGrid input[name="diagInjuries"]:checked').forEach(cb => {
            const k = cb.value;
            const actBtn = document.querySelector(`.intensity-btn[data-injury="${k}"].active`);
            injuriesDraft.push({ key: k, level: actBtn ? actBtn.getAttribute('data-level') : 'moderada' });
        });

        const draft = {
            step: AppState.diagnosisCurrentStep || 0,
            fullName: document.getElementById('diagFullName')?.value || '',
            gender: document.querySelector('input[name="diagGender"]:checked')?.value || 'male',
            goal: document.querySelector('input[name="diagGoal"]:checked')?.value || 'fat_loss',
            age: document.getElementById('diagAge')?.value || '',
            weight: document.getElementById('diagWeight')?.value || '',
            height: document.getElementById('diagHeight')?.value || '',
            tapeWaist: document.getElementById('diagTapeWaist')?.value || '',
            tapeHip: document.getElementById('diagTapeHip')?.value || '',
            tapeArm: document.getElementById('diagTapeArm')?.value || '',
            tapeThigh: document.getElementById('diagTapeThigh')?.value || '',
            injuries: injuriesDraft,
            hasSurgery: Boolean(document.getElementById('switchSurgeryCheck')?.checked),
            surgeryDetail: document.getElementById('diagSurgeryDetail')?.value || '',
            equipment: Array.from(document.querySelectorAll('input[name="diagEquipment"]:checked')).map(el => el.value),
            hurdle: document.querySelector('input[name="diagHurdle"]:checked')?.value || 'time',
            hurdleDetail: document.getElementById('diagHurdleDetail')?.value || '',
            frequency: document.getElementById('diagFreqSlider')?.value || '3',
            sleep: document.getElementById('diagSleepSlider')?.value || '7',
            stress: document.getElementById('diagStressSlider')?.value || '6',
            mobilitySkipped: AppState.diagnosisDraft?.mobilitySkipped || false,
            timestamp: Date.now()
        };
        AppState.diagnosisDraft = draft;
        localStorage.setItem('sens_onboarding_draft', JSON.stringify(draft));
    } catch (e) {
        // Ignorar si Storage está lleno
    }
}

// Restaurar borrador de diagnóstico
function restoreDiagnosisDraft() {
    try {
        const raw = localStorage.getItem('sens_onboarding_draft');
        if (!raw) return false;
        const draft = JSON.parse(raw);
        AppState.diagnosisDraft = draft;

        if (draft.fullName && document.getElementById('diagFullName')) document.getElementById('diagFullName').value = draft.fullName;
        if (draft.gender) {
            const gRadio = document.querySelector(`input[name="diagGender"][value="${draft.gender}"]`);
            if (gRadio) gRadio.checked = true;
        }
        if (draft.goal) {
            const goalRadio = document.querySelector(`input[name="diagGoal"][value="${draft.goal}"]`);
            if (goalRadio) goalRadio.checked = true;
        }
        if (draft.age && document.getElementById('diagAge')) document.getElementById('diagAge').value = draft.age;
        if (draft.weight && document.getElementById('diagWeight')) document.getElementById('diagWeight').value = draft.weight;
        if (draft.height && document.getElementById('diagHeight')) document.getElementById('diagHeight').value = draft.height;

        if (draft.tapeWaist && document.getElementById('diagTapeWaist')) document.getElementById('diagTapeWaist').value = draft.tapeWaist;
        if (draft.tapeHip && document.getElementById('diagTapeHip')) document.getElementById('diagTapeHip').value = draft.tapeHip;
        if (draft.tapeArm && document.getElementById('diagTapeArm')) document.getElementById('diagTapeArm').value = draft.tapeArm;
        if (draft.tapeThigh && document.getElementById('diagTapeThigh')) document.getElementById('diagTapeThigh').value = draft.tapeThigh;

        // Cirugía
        if (typeof draft.hasSurgery === 'boolean') {
            const surgSwitch = document.getElementById('switchSurgeryCheck');
            const surgBox = document.getElementById('detail_surgery');
            const surgTag = document.getElementById('status_surgery');
            if (surgSwitch) surgSwitch.checked = draft.hasSurgery;
            if (surgTag) {
                surgTag.textContent = draft.hasSurgery ? 'SÍ' : 'NO';
                surgTag.classList.toggle('is-yes', draft.hasSurgery);
            }
            if (surgBox) surgBox.style.display = draft.hasSurgery ? 'block' : 'none';
        }
        if (draft.surgeryDetail && document.getElementById('diagSurgeryDetail')) {
            document.getElementById('diagSurgeryDetail').value = draft.surgeryDetail;
        }

        // Equipamiento
        if (Array.isArray(draft.equipment)) {
            document.querySelectorAll('input[name="diagEquipment"]').forEach(cb => {
                const isChecked = draft.equipment.includes(cb.value);
                cb.checked = isChecked;
                const card = cb.closest('.pill-card');
                if (card) card.classList.toggle('selected', isChecked);
            });
        }

        // Obstáculo y Detalle
        if (draft.hurdle) {
            const hurdleRadio = document.querySelector(`input[name="diagHurdle"][value="${draft.hurdle}"]`);
            if (hurdleRadio) hurdleRadio.checked = true;
        }
        if (draft.hurdleDetail && document.getElementById('diagHurdleDetail')) {
            document.getElementById('diagHurdleDetail').value = draft.hurdleDetail;
        }

        if (Array.isArray(draft.injuries)) {
            draft.injuries.forEach(item => {
                const cb = document.querySelector(`#injuriesPillGrid input[name="diagInjuries"][value="${item.key}"]`);
                if (cb) {
                    cb.checked = true;
                    const row = document.getElementById(`intensity_${item.key}`);
                    if (row) row.style.display = 'flex';
                    if (item.level) {
                        const btn = document.querySelector(`.intensity-btn[data-injury="${item.key}"][data-level="${item.level}"]`);
                        if (btn) {
                            const group = btn.closest('.intensity-pill-group');
                            if (group) group.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                        }
                    }
                }
            });
        }

        if (draft.frequency) {
            const freqSlider = document.getElementById('diagFreqSlider');
            const freqDisplay = document.getElementById('diagFreqDisplay');
            if (freqSlider) freqSlider.value = draft.frequency;
            if (freqDisplay) freqDisplay.textContent = `${draft.frequency} días por semana`;
            document.querySelectorAll('.scale-tick').forEach(tick => {
                tick.classList.toggle('active', parseInt(tick.getAttribute('data-val'), 10) === parseInt(draft.frequency, 10));
            });
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Rellenar formulario cuando se entra en "Modo Edición"
function prefillDiagnosisForm() {
    const p = AppState.profile || {};
    const a = AppState.anamnesis || {};

    if (p.full_name && document.getElementById('diagFullName')) {
        document.getElementById('diagFullName').value = p.full_name;
    }
    const userGender = p.gender || a.gender || 'male';
    const gRadio = document.querySelector(`input[name="diagGender"][value="${userGender}"]`);
    if (gRadio) gRadio.checked = true;

    const userGoal = p.goal || a.goal || 'fat_loss';
    const goalRadio = document.querySelector(`input[name="diagGoal"][value="${userGoal}"]`);
    if (goalRadio) goalRadio.checked = true;

    if (p.age && document.getElementById('diagAge')) {
        document.getElementById('diagAge').value = p.age;
    }
    if (p.current_weight && document.getElementById('diagWeight')) {
        document.getElementById('diagWeight').value = p.current_weight;
    }
    if (p.height && document.getElementById('diagHeight')) {
        document.getElementById('diagHeight').value = p.height;
    }

    if (a.tape_measurements) {
        if (a.tape_measurements.waist && document.getElementById('diagTapeWaist')) {
            document.getElementById('diagTapeWaist').value = a.tape_measurements.waist;
        }
        if (a.tape_measurements.hip && document.getElementById('diagTapeHip')) {
            document.getElementById('diagTapeHip').value = a.tape_measurements.hip;
        }
        if (a.tape_measurements.arm && document.getElementById('diagTapeArm')) {
            document.getElementById('diagTapeArm').value = a.tape_measurements.arm;
        }
        if (a.tape_measurements.thigh && document.getElementById('diagTapeThigh')) {
            document.getElementById('diagTapeThigh').value = a.tape_measurements.thigh;
        }
    }

    // Cirugía
    if (typeof a.has_surgery === 'boolean') {
        const surgSwitch = document.getElementById('switchSurgeryCheck');
        const surgBox = document.getElementById('detail_surgery');
        const surgTag = document.getElementById('status_surgery');
        if (surgSwitch) surgSwitch.checked = a.has_surgery;
        if (surgTag) {
            surgTag.textContent = a.has_surgery ? 'SÍ' : 'NO';
            surgTag.classList.toggle('is-yes', a.has_surgery);
        }
        if (surgBox) surgBox.style.display = a.has_surgery ? 'block' : 'none';
    }
    if (a.surgery_detail && document.getElementById('diagSurgeryDetail')) {
        document.getElementById('diagSurgeryDetail').value = a.surgery_detail;
    }

    // Obstáculo y Detalle
    if (a.historical_hurdle) {
        const hRadio = document.querySelector(`input[name="diagHurdle"][value="${a.historical_hurdle}"]`);
        if (hRadio) hRadio.checked = true;
    }
    if (a.historical_hurdle_detail && document.getElementById('diagHurdleDetail')) {
        document.getElementById('diagHurdleDetail').value = a.historical_hurdle_detail;
    }

    if (Array.isArray(a.available_equipment)) {
        document.querySelectorAll('input[name="diagEquipment"]').forEach(cb => {
            const isChecked = a.available_equipment.includes(cb.value);
            cb.checked = isChecked;
            const card = cb.closest('.pill-card');
            if (card) card.classList.toggle('selected', isChecked);
        });
    }

    const consentCheck = document.getElementById('diagConsentCheck');
    const btnStart = document.getElementById('btnStartDiag');
    if (consentCheck) consentCheck.checked = true;
    if (btnStart) btnStart.disabled = false;

    if (a.parq_responses) {
        Object.keys(a.parq_responses).forEach(qKey => {
            const toggle = document.querySelector(`.health-toggle-input[data-q="${qKey}"]`);
            if (toggle) {
                const isPos = a.parq_responses[qKey] === 'si';
                toggle.checked = isPos;
                const statusTag = document.getElementById(`status_${qKey}`);
                if (statusTag) {
                    statusTag.textContent = isPos ? 'SÍ' : 'NO';
                    statusTag.classList.toggle('is-yes', isPos);
                }
                const detailEl = document.getElementById(`detail_${qKey}`);
                const item = toggle.closest('.health-switch-item');
                if (detailEl) detailEl.style.display = isPos ? 'block' : 'none';
                if (item) item.classList.toggle('has-detail', isPos);
            }
        });
    }

    if (Array.isArray(a.active_injuries)) {
        a.active_injuries.forEach(inj => {
            const cb = document.querySelector(`#injuriesPillGrid input[name="diagInjuries"][value="${inj}"]`);
            if (cb) {
                cb.checked = true;
                const row = document.getElementById(`intensity_${inj}`);
                if (row) row.style.display = 'flex';
                if (a.injury_intensities && a.injury_intensities[inj]) {
                    const btn = document.querySelector(`.intensity-btn[data-injury="${inj}"][data-level="${a.injury_intensities[inj]}"]`);
                    if (btn) {
                        const group = btn.closest('.intensity-pill-group');
                        if (group) group.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    }
                }
            }
        });
    }

    if (a.weekly_frequency) {
        const freqSlider = document.getElementById('diagFreqSlider');
        const freqDisplay = document.getElementById('diagFreqDisplay');
        if (freqSlider) {
            freqSlider.value = a.weekly_frequency;
            if (freqDisplay) freqDisplay.textContent = `${a.weekly_frequency} días por semana`;
            document.querySelectorAll('.scale-tick').forEach(tick => {
                tick.classList.toggle('active', parseInt(tick.getAttribute('data-val'), 10) === a.weekly_frequency);
            });
        }
    }

    if (a.sleep_hours) {
        const slider = document.getElementById('diagSleepSlider');
        const badge = document.getElementById('diagSleepVal');
        if (slider) slider.value = a.sleep_hours;
        if (badge) badge.textContent = `${parseFloat(a.sleep_hours).toFixed(1)} hs`;
    }

    if (a.stress_level) {
        const slider = document.getElementById('diagStressSlider');
        const badge = document.getElementById('diagStressVal');
        if (slider) slider.value = a.stress_level;
        if (badge) badge.textContent = `${a.stress_level} / 10`;
    }
}

// Aliasing retrocompatible
function initOnboardingWizard() {
    initDiagnosisWizard();
}

// =============================================================================
// MÓDULO 6: GESTOR DE RUTINAS, MARCADOR TÁCTIL Y TIMER DE DESCANSO
// =============================================================================
// =============================================================================
// MÓDULO 6: GESTOR DE RUTINAS, MARCADOR TÁCTIL Y TIMER DE DESCANSO
// =============================================================================
function initWorkoutManager() {
    const dayButtons = document.querySelectorAll('.day-tab-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dayButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const dayKey = btn.getAttribute('data-day');
            renderWorkoutDay(dayKey);
        });
    });

    // Filtros de Grupo Muscular
    const muscleFilterBtns = document.querySelectorAll('.muscle-filter-btn');
    muscleFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            muscleFilterBtns.forEach(b => {
                b.classList.remove('pill-champagne');
                b.classList.add('pill-dark');
            });
            btn.classList.remove('pill-dark');
            btn.classList.add('pill-champagne');
            AppState.selectedMuscleFilter = btn.getAttribute('data-group') || 'all';
            renderWorkoutDay(AppState.currentDay || 'day1');
        });
    });

    // Botón de Admin: Asignar Ejercicio a este Día
    const btnAdminAdd = document.getElementById('btnAdminAddExercise');
    if (btnAdminAdd) {
        btnAdminAdd.addEventListener('click', () => {
            const modal = document.getElementById('exerciseLibraryModal');
            if (modal) {
                modal.classList.add('active');
                renderExerciseLibraryList();
            }
        });
    }

    // Delegación de eventos para checkboxes táctiles y video
    const container = document.getElementById('exercisesContainer');
    if (container) {
        container.addEventListener('change', async (e) => {
            if (e.target && e.target.classList.contains('set-completed-chk')) {
                if (e.target.checked) {
                    const restSeconds = parseInt(e.target.getAttribute('data-rest'), 10) || 90;
                    startRestTimer(restSeconds);
                    playBeep(440, 0.1); // feedback sonoro suave

                    // Guardar log del set completado
                    const card = e.target.closest('.exercise-item-card');
                    const exId = card ? card.getAttribute('data-exercise-id') : 'ex-unknown';
                    const row = e.target.closest('tr');
                    const weightVal = row && row.querySelector('.set-weight') ? parseFloat(row.querySelector('.set-weight').value) : 0;
                    const repsVal = row && row.querySelector('.set-reps') ? parseInt(row.querySelector('.set-reps').value, 10) : 0;

                    const setLog = {
                        user_id: AppState.user ? AppState.user.id : 'demo-user',
                        exercise_id: exId,
                        weight_kg: weightVal,
                        reps_completed: repsVal,
                        completed_at: new Date().toISOString()
                    };

                    if (supabaseClient && AppState.user) {
                        try {
                            await supabaseClient.from('workout_logs').insert([setLog]);
                        } catch (err) {
                            console.log('Set logged locally');
                        }
                    }
                    const localLogs = JSON.parse(localStorage.getItem('sens_workout_logs') || '[]');
                    localLogs.push(setLog);
                    localStorage.setItem('sens_workout_logs', JSON.stringify(localLogs));
                }
            }
        });

        container.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-video-demo')) {
                const title = e.target.getAttribute('data-video-title');
                const cue = e.target.getAttribute('data-video-cue');
                openVideoModal(title, cue);
            }
            if (e.target && e.target.classList.contains('btn-remove-exercise-admin')) {
                const exId = e.target.getAttribute('data-ex-id');
                const currentDay = AppState.currentDay || 'day1';
                if (WORKOUT_DAYS_DATA[currentDay]) {
                    WORKOUT_DAYS_DATA[currentDay].exercises = WORKOUT_DAYS_DATA[currentDay].exercises.filter(x => x.id !== exId);
                    renderWorkoutDay(currentDay);
                }
            }
        });
    }

    // Botones del Timer Flotante
    const add15Btn = document.getElementById('timerAdd15Btn');
    const skipBtn = document.getElementById('timerSkipBtn');

    if (add15Btn) {
        add15Btn.addEventListener('click', () => {
            AppState.remainingSeconds += 15;
            updateTimerDisplay();
        });
    }

    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            stopRestTimer();
        });
    }

    // Finalizar Rutina
    const finishBtn = document.getElementById('btnFinishWorkoutSession');
    if (finishBtn) {
        finishBtn.addEventListener('click', async () => {
            alert('¡Excelente trabajo! Rutina registrada con éxito en tu historial de entrenamiento.');
            // Guardar log en Supabase
            if (supabaseClient && AppState.user) {
                try {
                    await supabaseClient.from('workout_logs').insert([
                        {
                            user_id: AppState.user.id,
                            completed_at: new Date().toISOString()
                        }
                    ]);
                } catch (e) {
                    console.log('Workout log offline/saved local');
                }
            }
            switchPortalView('dashView');
        });
    }

    // Modal de Video
    const videoModal = document.getElementById('videoModal');
    const closeVideoBtn = document.getElementById('closeVideoModalBtn');
    if (closeVideoBtn && videoModal) {
        closeVideoBtn.addEventListener('click', () => videoModal.classList.remove('active'));
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) videoModal.classList.remove('active');
        });
    }
}

function renderWorkoutDay(dayKey) {
    AppState.currentDay = dayKey;
    const dayData = WORKOUT_DAYS_DATA[dayKey];
    const container = document.getElementById('exercisesContainer');
    if (!dayData || !container) return;

    const isAdmin = AppState.user && AppState.user.user_type === 'admin';
    const filterGroup = AppState.selectedMuscleFilter || 'all';

    // Filtrar ejercicios si el usuario seleccionó un filtro muscular
    let exercisesToShow = dayData.exercises;
    if (filterGroup !== 'all') {
        exercisesToShow = exercisesToShow.filter(ex => {
            const catalogMatch = EXERCISE_CATALOG.find(c => c.id === ex.id || c.name.toLowerCase() === ex.name.toLowerCase());
            return catalogMatch ? catalogMatch.muscle_group === filterGroup : true;
        });
    }

    if (exercisesToShow.length === 0) {
        container.innerHTML = `
            <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:10px; padding:30px; text-align:center;">
                <p style="color:var(--text-muted); margin-bottom:12px;">No hay ejercicios de este grupo asignados para ${dayData.title}.</p>
                ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="document.getElementById('btnOpenExerciseLibraryModal').click()">Asignar ejercicios desde el catálogo</button>` : ''}
            </div>
        `;
        return;
    }

    let html = '';
    exercisesToShow.forEach(ex => {
        let setsRows = '';
        for (let i = 1; i <= ex.sets; i++) {
            setsRows += `
                <tr>
                    <td><strong>Set ${i}</strong></td>
                    <td>${ex.reps}</td>
                    <td><input type="number" class="set-input-tactile set-weight" value="${ex.defaultWeight}" step="0.5"></td>
                    <td><input type="number" class="set-input-tactile set-reps" value="${ex.defaultReps}"></td>
                    <td>
                        <label class="selection-item" style="justify-content: center;">
                            <input type="checkbox" class="set-completed-chk" data-rest="${ex.rest}">
                            <div class="custom-box"></div>
                        </label>
                    </td>
                </tr>
            `;
        }

        html += `
            <div class="exercise-item-card" data-exercise-id="${ex.id}">
                <div class="exercise-header-row">
                    <div>
                        <h3 class="exercise-title">${ex.name}</h3>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;"><strong>Pauta biomecánica:</strong> ${ex.notes}</div>
                    </div>
                    <div class="exercise-meta-pills">
                        <span class="pill pill-dark">${ex.sets} Series</span>
                        <span class="pill pill-dark">${ex.reps} Reps</span>
                        <span class="pill pill-champagne">Descanso: ${ex.rest}s</span>
                        <button class="btn btn-outline btn-sm btn-video-demo" data-video-title="Técnica: ${ex.name}" data-video-cue="${ex.notes}">Video Técnica</button>
                        ${isAdmin ? `<button class="btn btn-outline btn-sm btn-remove-exercise-admin" data-ex-id="${ex.id}" style="border-color:var(--danger); color:var(--danger);">Quitar</button>` : ''}
                    </div>
                </div>

                <div class="sets-table-wrap">
                    <table class="sets-tracker-table">
                        <thead>
                            <tr>
                                <th>Set</th>
                                <th>Reps Sugeridas</th>
                                <th>Peso Utilizado (kg)</th>
                                <th>Reps Logradas</th>
                                <th>Completado (Timer)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${setsRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function startRestTimer(seconds) {
    stopRestTimer();
    const widget = document.getElementById('floatingRestTimer');
    if (!widget) return;

    AppState.remainingSeconds = seconds;
    widget.classList.add('active');
    updateTimerDisplay();

    AppState.activeTimerInterval = setInterval(() => {
        AppState.remainingSeconds--;
        if (AppState.remainingSeconds <= 0) {
            stopRestTimer();
            playBeep(880, 0.4); // tono agudo de fin de descanso
            alert('¡Descanso completado! Preparate para el próximo set.');
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function stopRestTimer() {
    if (AppState.activeTimerInterval) {
        clearInterval(AppState.activeTimerInterval);
        AppState.activeTimerInterval = null;
    }
    const widget = document.getElementById('floatingRestTimer');
    if (widget) widget.classList.remove('active');
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;
    const mins = Math.floor(AppState.remainingSeconds / 60);
    const secs = AppState.remainingSeconds % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function openVideoModal(title, cue) {
    const modal = document.getElementById('videoModal');
    const modalTitle = document.getElementById('videoModalTitle');
    if (modal && modalTitle) {
        modalTitle.textContent = title || 'Demostración Técnica';
        const cueParagraph = modal.querySelector('p:last-of-type');
        if (cueParagraph && cue) {
            cueParagraph.innerHTML = `<strong>Consejo de Nico:</strong> ${cue}`;
        }
        modal.classList.add('active');
    }
}

// Generador de audio nativo con Web Audio API para timers
function playBeep(freq = 440, duration = 0.2) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        // Silencioso si no hay soporte o permisos
    }
}

// =============================================================================
// MÓDULO 7: NUTRICIÓN, HÁBITOS, DAILY LOG Y GRÁFICOS INTERACTIVOS
// =============================================================================
function initNutritionHabits() {
    renderFoodCatalog('all');

    const foodFilterBtns = document.querySelectorAll('.food-filter-btn');
    foodFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            foodFilterBtns.forEach(b => {
                b.classList.remove('pill-champagne');
                b.classList.add('pill-dark');
            });
            btn.classList.remove('pill-dark');
            btn.classList.add('pill-champagne');
            const cat = btn.getAttribute('data-cat') || 'all';
            renderFoodCatalog(cat);
        });
    });

    const btnSaveHabits = document.getElementById('btnSaveHabits');
    if (btnSaveHabits) {
        btnSaveHabits.addEventListener('click', async () => {
            const habits = {
                protein: document.getElementById('habitProtein') ? document.getElementById('habitProtein').checked : false,
                water: document.getElementById('habitWater') ? document.getElementById('habitWater').checked : false,
                preWorkout: document.getElementById('habitPreWorkout') ? document.getElementById('habitPreWorkout').checked : false,
                sleep: document.getElementById('habitSleep') ? document.getElementById('habitSleep').checked : false,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('sens_daily_habits', JSON.stringify(habits));

            if (supabaseClient && AppState.user) {
                try {
                    await supabaseClient.from('daily_logs').upsert({
                        user_id: AppState.user.id,
                        log_date: new Date().toISOString().split('T')[0],
                        habits_completed: habits
                    }, { onConflict: 'user_id,log_date' });
                } catch (e) {
                    console.log('Habit log synced locally');
                }
            }

            alert('¡Hábitos diarios actualizados y guardados correctamente en tu historial!');
        });
    }
}

function renderFoodCatalog(category = 'all') {
    const container = document.getElementById('foodCatalogGrid');
    if (!container) return;

    const filtered = FOOD_CATALOG.filter(f => category === 'all' || f.cat === category);
    const catLabels = {
        protein: 'Proteína de Calidad',
        carbs: 'Carbohidrato Complejo',
        healthy_fats: 'Grasa Saludable',
        hydration_veg: 'Hidratación & Vegetales'
    };

    let html = '';
    filtered.forEach(f => {
        html += `
            <div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
                <div>
                    <span class="pill pill-dark" style="font-size:9px; margin-bottom:8px; display:inline-block;">${catLabels[f.cat] || f.cat}</span>
                    <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">${f.name}</h4>
                    <div style="font-size:0.8rem; color:var(--accent-primary); font-weight:600; margin-bottom:8px;">Porción sugerida: ${f.portion}</div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4; margin:0;">${f.note}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function initDailyTracking() {
    const logForm = document.getElementById('dailyLogForm');
    if (logForm) {
        logForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const weight = parseFloat(document.getElementById('logWeight').value);
            const steps = parseInt(document.getElementById('logSteps').value, 10);
            const calories = parseInt(document.getElementById('logCalories').value, 10) || 0;
            const notes = document.getElementById('logNotes').value.trim();

            if (isNaN(weight) || isNaN(steps)) {
                alert('Por favor completá al menos el peso y los pasos de hoy.');
                return;
            }

            // Actualizar estado en memoria
            DEMO_METRICS.weights.push({ date: 'Hoy', val: weight });
            DEMO_METRICS.steps.push({ date: 'Hoy', val: steps });

            // Supabase sync
            if (supabaseClient && AppState.user) {
                try {
                    await supabaseClient.from('daily_logs').upsert({
                        user_id: AppState.user.id,
                        log_date: new Date().toISOString().split('T')[0],
                        weight,
                        steps,
                        calories_consumed: calories,
                        notes
                    });
                } catch (err) {
                    console.warn('Daily log saved locally');
                }
            }

            // Actualizar KPI de dashboard
            document.getElementById('kpiCurrentWeight').innerHTML = `${weight} <span style="font-size:1rem; font-weight:400;">kg</span>`;
            document.getElementById('kpiAvgSteps').textContent = steps.toLocaleString('es-AR');

            alert('¡Registro diario guardado con éxito! Tus gráficos se han actualizado.');
            logForm.reset();
            updateCharts();
        });
    }
}

function initCharts() {
    if (!window.Chart) return;

    // 1. Gráfico de Evolución de Peso
    const weightCtx = document.getElementById('weightChart');
    if (weightCtx) {
        if (AppState.weightChart) AppState.weightChart.destroy();
        AppState.weightChart = new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: DEMO_METRICS.weights.map(d => d.date),
                datasets: [{
                    label: 'Peso Corporal (kg)',
                    data: DEMO_METRICS.weights.map(d => d.val),
                    borderColor: '#E5CBA7',
                    backgroundColor: 'rgba(229, 203, 167, 0.12)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#080809',
                    pointBorderColor: '#E5CBA7',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#7A7A80', font: { family: 'Raleway' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#7A7A80', font: { family: 'Raleway' } }
                    }
                }
            }
        });
    }

    // 2. Gráfico de Pasos Diarios
    const stepsCtx = document.getElementById('stepsChart');
    if (stepsCtx) {
        if (AppState.stepsChart) AppState.stepsChart.destroy();
        AppState.stepsChart = new Chart(stepsCtx, {
            type: 'bar',
            data: {
                labels: DEMO_METRICS.steps.map(d => d.date),
                datasets: [{
                    label: 'Pasos Diarios',
                    data: DEMO_METRICS.steps.map(d => d.val),
                    backgroundColor: DEMO_METRICS.steps.map(d => d.val >= 10000 ? '#E5CBA7' : 'rgba(229, 203, 167, 0.35)'),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#7A7A80', font: { family: 'Raleway' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#7A7A80', font: { family: 'Raleway' } },
                        suggestedMax: 13000
                    }
                }
            }
        });
    }
}

function updateCharts() {
    if (AppState.weightChart) {
        AppState.weightChart.data.labels = DEMO_METRICS.weights.map(d => d.date);
        AppState.weightChart.data.datasets[0].data = DEMO_METRICS.weights.map(d => d.val);
        AppState.weightChart.update();
    }
    if (AppState.stepsChart) {
        AppState.stepsChart.data.labels = DEMO_METRICS.steps.map(d => d.date);
        AppState.stepsChart.data.datasets[0].data = DEMO_METRICS.steps.map(d => d.val);
        AppState.stepsChart.update();
    }
}
