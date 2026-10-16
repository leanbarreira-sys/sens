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

// Helpers de fechas para navegación de calendario (pasado y futuro)
function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatDateDDMM(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

function formatDateKey(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function getDayKeyFromDate(d) {
    const day = d.getDay();
    const map = { 1: 'day1', 2: 'day2', 3: 'day3', 4: 'day4', 5: 'day5', 6: 'day6', 0: 'day7' };
    return map[day] || 'day1';
}

function getWeekRangeLabel(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()} – ${sunday.getDate()} ${months[monday.getMonth()]} ${sunday.getFullYear()}`;
    }
    return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

// Estado en memoria
const AppState = {
    user: null,
    profile: null,
    currentDay: 'day1',
    selectedDate: new Date(),
    activeWeekStart: getMonday(new Date()),
    activeTimerInterval: null,
    remainingSeconds: 0,
    weightChart: null,
    stepsChart: null,
    selectedMuscleFilter: 'all'
};

function isCurrentUserAdmin() {
    const profile = AppState.profile || {};
    const user = AppState.user || {};
    const email = (user.email || profile.email || '').toLowerCase();
    return Boolean(
        profile.user_type === 'admin' ||
        profile.role === 'admin' ||
        user.user_type === 'admin' ||
        (user.user_metadata && user.user_metadata.role === 'admin') ||
        email === 'nico@sens.com' ||
        email === 'nicomaralle@gmail.com' ||
        email === 'lean.barreira@gmail.com' ||
        email === 'lean@sens.com' ||
        email === 'admin@sens.com'
    );
}

// -----------------------------------------------------------------------------
// NOTIFICACIONES AUTOMÁTICAS POR EMAIL A NICO & LEAN
// -----------------------------------------------------------------------------
async function sendCoachEmailAlert({ type, athleteName, athleteEmail, athletePhone, goal, modality, details }) {
    try {
        const payload = {
            _subject: `[SENS ALERTA] ${type}: ${athleteName || 'Nuevo Atleta'}`,
            _template: 'table',
            _captcha: 'false',
            tipo_evento: type,
            atleta_nombre: athleteName || 'No especificado',
            atleta_email: athleteEmail || 'No especificado',
            atleta_telefono: athletePhone || 'No especificado',
            objetivo_fitness: goal || 'No especificado',
            modalidad_plan: modality || 'Plan SENS',
            detalles_ficha: details || 'Sin detalles adicionales',
            fecha_registro: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        };

        const targets = ['nicomaralle@gmail.com', 'lean.barreira@gmail.com'];
        await Promise.allSettled(targets.map(targetEmail => 
            fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(r => r.json()).then(res => console.log(`[SENS] Alerta para ${targetEmail}:`, res))
        ));
    } catch (err) {
        console.warn('[SENS] Error despachando alerta por correo al coach:', err);
    }
}

// -----------------------------------------------------------------------------
// TOASTS DE LUJO Y ANIMACIONES HÁPTICAS (SR-DIRECTOR-UX-WELLNESS)
// -----------------------------------------------------------------------------
function showSensToast(message, type = 'champagne', duration = 3400) {
    let toast = document.getElementById('sensGlobalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sensGlobalToast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = message;
    toast.className = `sens-luxury-toast sens-toast-${type} show`;
    if (window.__sensToastTimeout) clearTimeout(window.__sensToastTimeout);
    window.__sensToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

function animateNumber(element, targetValue, duration = 900, suffix = '', decimals = 0) {
    if (!element) return;
    const startValue = 0;
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (targetValue - startValue) * easeOut;
        element.innerHTML = `${decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('es-AR')}${suffix}`;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

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
        plan_badge_text: 'Coach / Admin Nico',
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
    { id: 'fd-p1', name: 'Pechuga de Pollo / Pavo', cat: 'protein', baseGrams: 100, calPer100: 165, protPer100: 31, carbsPer100: 0, fatsPer100: 3.6, defaultGrams: 180, portion: '150 - 200g cocido', note: 'Proteína magra de altísimo valor biológico, digestión ágil y nula grasa saturada agregada.' },
    { id: 'fd-p2', name: 'Huevos de Campo Enteros', cat: 'protein', baseGrams: 100, calPer100: 143, protPer100: 12.6, carbsPer100: 0.8, fatsPer100: 9.5, defaultGrams: 120, portion: '2 a 4 unidades diarias', note: 'Aporte completo de aminoácidos esenciales, colina para la función cerebral y grasas saludables.' },
    { id: 'fd-p3', name: 'Carne Vacuna Magra (Lomo, Cuadril)', cat: 'protein', baseGrams: 100, calPer100: 195, protPer100: 28, carbsPer100: 0, fatsPer100: 8.5, defaultGrams: 180, portion: '150 - 200g (2-3x sem)', note: 'Rica en hierro hemínico, zinc y creatina natural para soporte de fuerza y masa muscular.' },
    { id: 'fd-p4', name: 'Atún al Natural / Salmón Blanco', cat: 'protein', baseGrams: 100, calPer100: 130, protPer100: 28, carbsPer100: 0, fatsPer100: 1.5, defaultGrams: 150, portion: '1 lata o 150 - 180g filete', note: 'Proteína de fácil absorción y ácidos grasos que favorecen la recuperación tisular.' },
    { id: 'fd-p5', name: 'Yogur Griego Natural (Sin Azúcar)', cat: 'protein', baseGrams: 100, calPer100: 97, protPer100: 10, carbsPer100: 3.8, fatsPer100: 5, defaultGrams: 170, portion: '150 - 200g', note: 'Rico en caseína de digestión lenta y probióticos para la salud de la microbiota intestinal.' },
    { id: 'fd-p6', name: 'Tofu Firme Orgánico', cat: 'protein', baseGrams: 100, calPer100: 144, protPer100: 15.5, carbsPer100: 2.8, fatsPer100: 8.5, defaultGrams: 200, portion: '180 - 220g salteado', note: 'Excelente fuente de proteína vegetal completa para opciones basadas en plantas.' },
    { id: 'fd-p7', name: 'Proteína de Suero (Whey Isolate)', cat: 'protein', baseGrams: 30, calPer100: 380, protPer100: 85, carbsPer100: 3, fatsPer100: 1.5, defaultGrams: 30, portion: '1 scoop (25-30g)', note: 'Practicidad óptima para alcanzar los gramos diarios de proteína sin sumar grasas extras.' },

    // Carbohidratos
    { id: 'fd-c1', name: 'Arroz Integral o Basmati al Vapor', cat: 'carbs', baseGrams: 100, calPer100: 130, protPer100: 2.7, carbsPer100: 28, fatsPer100: 0.3, defaultGrams: 160, portion: '1 taza cocida (150-180g)', note: 'Energía limpia y sostenida para reponer glucógeno muscular post-entrenamiento.' },
    { id: 'fd-c2', name: 'Papa y Batata Horneadas con Piel', cat: 'carbs', baseGrams: 100, calPer100: 86, protPer100: 1.6, carbsPer100: 20, fatsPer100: 0.1, defaultGrams: 180, portion: '1 unidad mediana (180g)', note: 'Ricas en potasio, almidón resistente y gran poder de saciedad sin pesadez digestiva.' },
    { id: 'fd-c3', name: 'Avena Arrollada Tradicional', cat: 'carbs', baseGrams: 100, calPer100: 379, protPer100: 13.5, carbsPer100: 67, fatsPer100: 6.5, defaultGrams: 50, portion: '40 - 60g en porridge', note: 'Fibra betaglucano que estabiliza la glucemia y brinda saciedad prolongada.' },
    { id: 'fd-c4', name: 'Quinoa Cocida', cat: 'carbs', baseGrams: 100, calPer100: 120, protPer100: 4.4, carbsPer100: 21.3, fatsPer100: 1.9, defaultGrams: 150, portion: '1 taza cocida', note: 'Pseudocereal con perfil balanceado de carbohidratos complejos y micronutrientes.' },
    { id: 'fd-c5', name: 'Frutas Enteras (Banana, Arándanos)', cat: 'carbs', baseGrams: 100, calPer100: 89, protPer100: 1.1, carbsPer100: 22.8, fatsPer100: 0.3, defaultGrams: 150, portion: '1 a 2 porciones al día', note: 'Antioxidantes naturales, vitaminas y fructosa natural para energía previa a la sesión.' },
    { id: 'fd-c6', name: 'Pan de Masa Madre Genuino', cat: 'carbs', baseGrams: 100, calPer100: 245, protPer100: 8.5, carbsPer100: 48, fatsPer100: 1.2, defaultGrams: 70, portion: '1 a 2 rebanadas tostadas', note: 'Fermentación lenta que degrada antinutrientes facilitando la asimilación digestiva.' },

    // Grasas Saludables
    { id: 'fd-g1', name: 'Palta (Aguacate)', cat: 'healthy_fats', baseGrams: 100, calPer100: 160, protPer100: 2, carbsPer100: 8.5, fatsPer100: 14.7, defaultGrams: 80, portion: '1/2 unidad al día', note: 'Ácidos grasos monoinsaturados que apoyan la salud cardiovascular y hormonal.' },
    { id: 'fd-g2', name: 'Aceite de Oliva Extra Virgen (Crudo)', cat: 'healthy_fats', baseGrams: 15, calPer100: 884, protPer100: 0, carbsPer100: 0, fatsPer100: 100, defaultGrams: 15, portion: '1 cucharada sopera (15ml)', note: 'Polifenoles y grasas antiinflamatorias esenciales para articulaciones.' },
    { id: 'fd-g3', name: 'Frutos Secos (Nueces, Almendras)', cat: 'healthy_fats', baseGrams: 100, calPer100: 607, protPer100: 20, carbsPer100: 16, fatsPer100: 54, defaultGrams: 30, portion: '1 puñado cerrado (30g)', note: 'Densidad energética y magnesio para relajar el sistema neuromuscular.' },
    { id: 'fd-g4', name: 'Semillas de Chía y Lino Molidas', cat: 'healthy_fats', baseGrams: 100, calPer100: 486, protPer100: 16.5, carbsPer100: 42, fatsPer100: 30.7, defaultGrams: 15, portion: '1 cucharadita en yogur', note: 'Ácido alfa-linolénico (Omega 3 vegetal) y fibra soluble reguladora.' },

    // Hidratación y Vegetales
    { id: 'fd-h1', name: 'Agua Mineral / Filtrada', cat: 'hydration_veg', baseGrams: 100, calPer100: 0, protPer100: 0, carbsPer100: 0, fatsPer100: 0, defaultGrams: 500, portion: '35ml/kg (2.5L a 3.5L/día)', note: 'El medio fundamental para el rendimiento muscular y la eliminación de fatiga.' },
    { id: 'fd-h2', name: 'Vegetales de Hoja Verde (Espinaca, Rúcula)', cat: 'hydration_veg', baseGrams: 100, calPer100: 23, protPer100: 2.9, carbsPer100: 3.6, fatsPer100: 0.4, defaultGrams: 120, portion: 'Libre en almuerzo y cena', note: 'Nitratos naturales para vasodilatación y micronutrientes sin calorías vacías.' },
    { id: 'fd-h3', name: 'Brócoli y Espárragos al Vapor', cat: 'hydration_veg', baseGrams: 100, calPer100: 34, protPer100: 2.8, carbsPer100: 6.6, fatsPer100: 0.4, defaultGrams: 150, portion: '1 taza colmada', note: 'Crucíferas con componentes antioxidantes y soporte a la digestión.' }
];

// Rutinas Preconfiguradas para SENS TRAIN (1 a 6 Días Programables)
const WORKOUT_DAYS_DATA = {
    day1: {
        title: 'Día 1: Tren Superior (Empuje / Tirón)',
        modality: 'presencial',
        completed: true,
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
        modality: 'online',
        completed: true,
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
        modality: 'presencial',
        completed: true,
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
    },
    day4: {
        title: 'Día 4: Core & Movilidad (Casa / Edificio)',
        modality: 'online',
        completed: false,
        exercises: [
            {
                id: 'ex-401',
                name: '1. Deadbug con Control Lumbar y Respiración',
                notes: 'Espalda baja sellada al suelo. 10 repeticiones lentas por pierna.',
                sets: 3,
                reps: '10 p/lado',
                rest: 45,
                defaultWeight: 0,
                defaultReps: 10
            },
            {
                id: 'ex-402',
                name: '2. Bird-Dog Dinámico Controlado',
                notes: 'Extender brazo y pierna opuesta sin arquear la zona lumbar.',
                sets: 3,
                reps: '12 p/lado',
                rest: 45,
                defaultWeight: 0,
                defaultReps: 12
            },
            {
                id: 'ex-403',
                name: '3. Rotaciones Torácicas Cuadrúpedas',
                notes: 'Mano en nuca, abrir codo hacia el techo buscando rotar columna dorsal.',
                sets: 3,
                reps: '10 p/lado',
                rest: 45,
                defaultWeight: 0,
                defaultReps: 10
            }
        ]
    },
    day5: {
        title: 'Día 5: Fuerza & Potencia Funcional',
        modality: 'autonomo',
        completed: false,
        exercises: [
            {
                id: 'ex-501',
                name: '1. Trap Bar / Mancuernas Farmer Carry',
                notes: 'Paseo del granjero: pasos firmes y postura erguida impecable.',
                sets: 4,
                reps: '40 metros',
                rest: 75,
                defaultWeight: 24,
                defaultReps: 40
            },
            {
                id: 'ex-502',
                name: '2. Sentadilla Búlgara con Mancuernas',
                notes: 'Torso ligeramente inclinado al frente para mayor activación glútea.',
                sets: 3,
                reps: '8-10 p/pierna',
                rest: 90,
                defaultWeight: 14,
                defaultReps: 9
            },
            {
                id: 'ex-503',
                name: '3. Jalón al Pecho con Banda o Polea',
                notes: 'Tracción vertical llevando la barra a la clavícula, pecho abierto.',
                sets: 3,
                reps: '10-12',
                rest: 60,
                defaultWeight: 45,
                defaultReps: 10
            }
        ]
    },
    day6: {
        title: 'Día 6: Cardio Zona 2 & Recuperación',
        modality: 'descanso',
        completed: false,
        exercises: [
            {
                id: 'ex-601',
                name: '1. Caminata Inclinada o Trote Regenerativo',
                notes: 'Ritmo conversacional (Zona 2 cardíaca) durante 35-45 minutos.',
                sets: 1,
                reps: '40 min',
                rest: 0,
                defaultWeight: 0,
                defaultReps: 40
            },
            {
                id: 'ex-602',
                name: '2. Descompresión Espinal y Colgadas en Barra',
                notes: 'Colgada pasiva en barra (3 series de 30 a 45 segundos) para traccionar vértebras.',
                sets: 3,
                reps: '35 seg',
                rest: 60,
                defaultWeight: 0,
                defaultReps: 35
            }
        ]
    },
    day7: {
        title: 'Día 7: Descanso Celular & Regeneración',
        modality: 'descanso',
        completed: false,
        exercises: []
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
    initLuxuryScrollReveals();
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
    // SUITE 2.0 WORLD-CLASS:
    initTopbarAvatar();
    initCoachOS();
    initCoachAthletePickerTriggers();
    initQuickActionButtons();
    renderMonthlyCalendar();
    initWorkoutStopwatch();
    initPortionRulerModal();
    initWorkoutBlockAccordions();
    initWeekStripCalendar();
    initFloatingDock();
    initQuickBiometricsModal();
    updateDashboardRings();
    updateMetabolicEquation();
});

// =============================================================================
// NUEVO: CAPTACIÓN ABIERTA DE PROSPECTOS (SECCIÓN SUMATE & CTAs DE PLANES)
// =============================================================================
function initLeadCapture() {
    // 1. Botones de Planes ("Agendar Evaluación Inicial" o "Elegir Plan") - 1-Click Instant Navigation
    const planButtons = document.querySelectorAll('.plan-select-btn');
    
    function scrollToSumateWithPlan(btn, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
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

            // Pre-cargar la opción elegida en el campo de objetivo para que Nico sepa exactamente qué plan tocó
            const goalInput = document.getElementById('leadGoal');
            if (goalInput && planName) {
                goalInput.value = `Interés en: ${planName}`;
            }

            // Desplazamiento suave directo al primer click con compensación de barra fija (Navbar)
            const yOffset = -75;
            const y = sumateSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });

            // Foco accesible al campo de nombre
            setTimeout(() => {
                const nameInput = document.getElementById('leadFullName');
                if (nameInput) nameInput.focus({ preventScroll: true });
            }, 350);
        }
    }

    planButtons.forEach(btn => {
        let isPointerHandled = false;

        btn.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || e.button === 0) {
                isPointerHandled = true;
                scrollToSumateWithPlan(btn, e);
                setTimeout(() => { isPointerHandled = false; }, 400);
            }
        });

        btn.addEventListener('click', (e) => {
            if (isPointerHandled) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            scrollToSumateWithPlan(btn, e);
        });
    });

    // Enlaces globales que apuntan a #sumate (Hero, Navbar, Barra Móvil, Menú Hamburguesa)
    document.querySelectorAll('a[href="#sumate"]:not(.plan-select-btn)').forEach(link => {
        link.addEventListener('click', (e) => {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.style.display = 'none';
                mobileMenu.classList.remove('is-open');
                document.body.classList.remove('mobile-menu-open');
            }

            const sumateSection = document.getElementById('sumate');
            if (sumateSection) {
                e.preventDefault();
                const yOffset = -75;
                const y = sumateSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
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
                showSensToast('Por favor completá tu nombre y WhatsApp para poder coordinar tu evaluación.', 'alert');
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

            // Enviar alerta inmediata a los mails de Nico y Lean
            sendCoachEmailAlert({
                type: 'Evaluación Inicial Solicitada (Lead Web)',
                athleteName: fullName,
                athletePhone: phone,
                modality: modality,
                goal: goal,
                details: 'El prospecto completó el formulario en la web y se le abrió el chat de WhatsApp.'
            }).catch(() => {});

            // Abrir WhatsApp
            window.open(waUrl, '_blank');
        });
    }
}

// =============================================================================
// GESTOR DE ROLES Y ATLETAS PARA PANEL DE COACH (NICO)
// =============================================================================
async function loadCoachAthletesList() {
    let dbAthletes = [];
    if (supabaseClient) {
        // Auto-promover en DB si el usuario actual es admin (Nico o Lean) para que RLS permita ver perfiles
        if (isCurrentUserAdmin() && AppState.user && AppState.user.id) {
            try {
                await supabaseClient.from('profiles').update({
                    role: 'admin',
                    user_type: 'admin'
                }).eq('id', AppState.user.id);
            } catch (err) {}
        }

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data && data.length > 0) {
                dbAthletes = data;
            }
        } catch (e) {
            console.warn('Error al cargar atletas de Supabase para coach:', e);
        }
    }

    window.__coachAthletesCache = dbAthletes;

    // Sincronizar Bottom Sheet Nativo y Hub de Gestión
    if (typeof renderAthleteBottomSheetList === 'function') renderAthleteBottomSheetList();
    if (typeof renderCoachAthletesHub === 'function') renderCoachAthletesHub();

    // Sincronizar selectores del Hub de Coach si son elementos select
    const roster = getConsolidatedCoachAthletes();
    ['coachNutritionAthleteSelector', 'coachWorkoutAthleteSelector', 'coachDashNoteAthleteSelector'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (sel && sel.tagName === 'SELECT') {
            let html = '';
            roster.forEach(ath => {
                html += `<option value="${ath.id}">${ath.full_name} (${ath.active_plan_name})</option>`;
            });
            sel.innerHTML = html;
        }
    });

    // Actualizar nombre y plan en la barra nativa ejecutiva si corresponde
    const currentNameEl = document.getElementById('coachCurrentAthleteName');
    if (currentNameEl && roster.length > 0) {
        const activeAth = roster.find(a => a.id === AppState.activeAthleteId) || roster[0];
        currentNameEl.textContent = activeAth.full_name;
        
        const planEl = document.getElementById('coachCurrentAthletePlan');
        if (planEl) {
            let tag = 'PLAN';
            const pLower = (activeAth.active_plan_name || '').toLowerCase();
            if (pLower.includes('vip')) tag = 'VIP';
            else if (pLower.includes('dúo') || pLower.includes('duo')) tag = 'DÚO';
            else if (pLower.includes('premium')) tag = 'ONLINE PRO';
            else if (pLower.includes('básico') || pLower.includes('basico')) tag = 'ONLINE';
            else tag = 'PRESENCIAL';
            planEl.textContent = tag;
        }

        const dotEl = document.getElementById('coachTopStatusDot');
        if (dotEl) {
            const s = activeAth.subscription_status || 'active';
            dotEl.className = 'status-dot ' + (s === 'active' ? 'status-dot-active' : s === 'paused' ? 'status-dot-paused' : 'status-dot-pending');
        }

        const waLink = document.getElementById('btnCoachWhatsApp');
        if (waLink) {
            const msg = encodeURIComponent(`Hola ${activeAth.full_name}! Te escribo de SENS para revisar tu progreso y coordinar los entrenamientos.`);
            waLink.href = `https://wa.me/?text=${msg}`;
        }
    }
}

function initRoleSwitcher() {
    const refreshBtn = document.getElementById('btnRefreshCoachAthletes');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadCoachAthletesList();
            renderCoachAthletesHub();
            showSensToast('Lista de alumnos actualizada desde Supabase.', 'champagne');
        });
    }
}

function applyDatabaseAthlete(athlete) {
    AppState.activeAthleteId = athlete.id;
    AppState.profile = {
        id: athlete.id,
        full_name: athlete.full_name || 'Atleta SENS',
        active_plan_name: athlete.active_plan_name || 'Plan Personalizado',
        current_weight: athlete.current_weight || 75,
        goal: athlete.goal || 'Fuerza & Vitalidad',
        subscription_status: athlete.subscription_status || 'pending_activation',
        onboarding_completed: Boolean(athlete.onboarding_completed),
        daily_step_target: athlete.daily_step_target || 10000
    };
    AppState.user = {
        id: athlete.id,
        email: athlete.email || `${athlete.id.slice(0, 8)}@sens.com`,
        role: 'user_normal'
    };

    updateCoachSubBadgeAndButton(athlete.subscription_status);

    const planBadgeEl = document.getElementById('portalPlanBadge');
    const userEmailEl = document.getElementById('portalUserEmail');
    const roleContextBadge = document.getElementById('roleContextBadge');
    if (planBadgeEl) planBadgeEl.textContent = athlete.active_plan_name || 'Plan SENS';
    if (userEmailEl) userEmailEl.textContent = athlete.email || athlete.full_name;
    if (roleContextBadge) roleContextBadge.textContent = `${athlete.active_plan_name || 'Plan'} • Alumno Real`;

    renderDashboardData();
    renderWorkoutDay(AppState.currentDay || 'day1');
    showSensToast(`Gestionando al alumno ${athlete.full_name || 'Atleta'}.`, 'champagne');
}

function updateCoachSubBadgeAndButton(status) {
    const coachSubBadge = document.getElementById('coachSubStatusBadge');
    const toggleSubBtn = document.getElementById('btnCoachToggleSubStatus');
    const isActive = (status === 'active');

    if (coachSubBadge) {
        coachSubBadge.textContent = isActive ? 'MEMBRESÍA ACTIVA' : 'PENDIENTE DE ACTIVACIÓN';
        coachSubBadge.style.color = isActive ? '#10B981' : '#F59E0B';
        coachSubBadge.style.borderColor = isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
        coachSubBadge.style.background = isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    }

    if (toggleSubBtn) {
        if (isActive) {
            toggleSubBtn.textContent = 'Pausar Acceso';
            toggleSubBtn.className = 'btn btn-outline btn-sm';
            toggleSubBtn.style.color = '#F59E0B';
            toggleSubBtn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            toggleSubBtn.style.backgroundColor = 'transparent';
        } else {
            toggleSubBtn.textContent = 'Aprobar & Activar Acceso';
            toggleSubBtn.className = 'btn btn-primary btn-sm';
            toggleSubBtn.style.color = '#080809';
            toggleSubBtn.style.backgroundColor = 'var(--accent-primary)';
            toggleSubBtn.style.borderColor = 'var(--accent-primary)';
        }
    }
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
        goal: mock.goal_text,
        subscription_status: mock.subscription_status || 'active',
        onboarding_completed: true
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

    updateCoachSubBadgeAndButton(AppState.profile.subscription_status);

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
let activeLibraryGroup = 'all';

function initExerciseCatalogModal() {
    const modal = document.getElementById('exerciseLibraryModal');
    const openBtn = document.getElementById('btnOpenExerciseLibraryModal');
    const closeBtn = document.getElementById('closeLibraryModalBtn');
    const searchInput = document.getElementById('libSearchInput');
    const pillStrip = document.getElementById('libGroupPillStrip');

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

    if (pillStrip) {
        pillStrip.querySelectorAll('.lib-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pillStrip.querySelectorAll('.lib-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeLibraryGroup = btn.getAttribute('data-group') || 'all';
                renderExerciseLibraryList();
            });
        });
    }
}

function renderExerciseLibraryList() {
    const listContainer = document.getElementById('libraryExercisesList');
    const searchInput = document.getElementById('libSearchInput');
    if (!listContainer) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedGroup = activeLibraryGroup || 'all';

    const sourceLibrary = (typeof SENS_EXERCISE_LIBRARY !== 'undefined' && SENS_EXERCISE_LIBRARY.length > 0)
        ? SENS_EXERCISE_LIBRARY
        : EXERCISE_CATALOG;

    const filtered = sourceLibrary.filter(ex => {
        const tax = (typeof getExerciseTaxonomy === 'function') 
            ? getExerciseTaxonomy(ex) 
            : { type: 'muscular', muscleGroup: 'piernas' };

        let matchGroup = false;
        if (selectedGroup === 'all') {
            matchGroup = true;
        } else if (selectedGroup === 'muscular') {
            matchGroup = (tax.type === 'muscular');
        } else if (selectedGroup === 'cardio') {
            matchGroup = (tax.type === 'cardio');
        } else if (selectedGroup === 'movilidad') {
            matchGroup = (tax.type === 'movilidad');
        } else if (selectedGroup === 'yoga') {
            matchGroup = (tax.type === 'yoga');
        } else if (['piernas', 'biceps', 'triceps', 'espalda', 'pecho', 'abdominales'].includes(selectedGroup)) {
            matchGroup = (tax.muscleGroup === selectedGroup);
        } else {
            const cat = (ex.category || ex.muscle_group || '').toLowerCase();
            matchGroup = (cat === selectedGroup || (ex.muscle_group || '').toLowerCase() === selectedGroup);
        }

        const matchQuery = !query || 
            (ex.name && ex.name.toLowerCase().includes(query)) ||
            (ex.primary_muscle && ex.primary_muscle.toLowerCase().includes(query)) ||
            (ex.execution && ex.execution.toLowerCase().includes(query)) ||
            (ex.recommendations && ex.recommendations.toLowerCase().includes(query)) ||
            (ex.objective && ex.objective.toLowerCase().includes(query)) ||
            (ex.cue && ex.cue.toLowerCase().includes(query));

        return matchGroup && matchQuery;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-muted); padding:28px 16px; text-align:center;">No se encontraron ejercicios en la biblioteca con los filtros seleccionados.</p>';
        return;
    }

    const currentAthId = coachWorkoutState.activeAthleteId || getActiveAthleteId();
    const currentDay = coachWorkoutState.activeDay || AppState.currentDay || 'day1';
    const dayName = currentDay.toUpperCase();

    let html = '';
    filtered.forEach(ex => {
        const tax = (typeof getExerciseTaxonomy === 'function') ? getExerciseTaxonomy(ex) : { type: 'muscular', typeLabel: 'Muscular', muscleGroup: 'piernas', muscleLabel: 'Piernas' };
        const primaryMusc = ex.primary_muscle || (tax.type === 'muscular' ? tax.muscleLabel : tax.typeLabel);
        const cueText = ex.recommendations || ex.cue || 'Ejecución controlada con rango completo.';
        const execText = ex.execution || '';
        const levelLabel = ex.level || 'Intermedio';
        const restSec = ex.rest || ex.rest_seconds || 90;
        const setsVal = ex.default_sets || ex.sets || 3;
        const repsVal = ex.default_reps || ex.reps || '10-12';

        html += `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; transition: all 0.2s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 240px;">
                        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
                            <span class="pill pill-champagne" style="font-size: 9px; font-weight: 800; padding: 2px 7px;">${tax.typeLabel.toUpperCase()}</span>
                            ${tax.type === 'muscular' ? `<span class="pill pill-dark" style="font-size: 9px; color: var(--accent-primary); border: none;">${tax.muscleLabel}</span>` : ''}
                            <span class="pill pill-dark" style="font-size: 9px; color: var(--text-muted); border: none;">${levelLabel}</span>
                            <span style="font-size: 11px; color: var(--text-muted); margin-left: auto;">Descanso: ${restSec}s</span>
                        </div>
                        <h4 style="font-size: 1.05rem; font-weight: 800; color: #FFFFFF; margin: 0 0 6px 0;">${ex.name}</h4>
                        ${execText ? `<p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 6px 0; line-height: 1.4;"><strong>Técnica:</strong> ${execText}</p>` : ''}
                        <div style="background: rgba(229, 203, 167, 0.06); border-left: 3px solid var(--accent-primary); border-radius: 4px; padding: 6px 10px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">
                            <strong style="color: var(--accent-primary);">Recomendación Nico:</strong> ${cueText}
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Sugerido: ${setsVal} series × ${repsVal}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn btn-outline btn-sm btn-lib-video" data-video-title="${ex.name}" data-video-cue="${cueText}" style="font-size: 11px; padding: 5px 12px; border-color: rgba(255,255,255,0.2);">
                            ▶ Ver Técnica
                        </button>
                        <button type="button" class="btn btn-primary btn-sm btn-lib-assign" data-ex-id="${ex.id}" data-ex-name="${ex.name}" style="font-size: 11px; padding: 5px 14px; font-weight: 800;">
                            + Asignar a ${dayName}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Listeners
    listContainer.querySelectorAll('.btn-lib-video').forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.getAttribute('data-video-title');
            const cue = btn.getAttribute('data-video-cue');
            openVideoModal(title, cue);
        });
    });

    listContainer.querySelectorAll('.btn-lib-assign').forEach(btn => {
        btn.addEventListener('click', () => {
            const exId = btn.getAttribute('data-ex-id');
            const exName = btn.getAttribute('data-ex-name');
            const sourceLibrary = (typeof SENS_EXERCISE_LIBRARY !== 'undefined') ? SENS_EXERCISE_LIBRARY : EXERCISE_CATALOG;
            const targetEx = sourceLibrary.find(e => e.id === exId);
            if (targetEx) {
                const tax = (typeof getExerciseTaxonomy === 'function') ? getExerciseTaxonomy(targetEx) : { type: 'muscular', muscleGroup: 'piernas' };
                const targetDay = coachWorkoutState.activeDay || AppState.currentDay || 'day1';
                const targetAth = coachWorkoutState.activeAthleteId || getActiveAthleteId();
                const data = getCoachAthleteWorkoutData(targetAth);
                if (!data[targetDay]) {
                    data[targetDay] = { title: `Día: ${targetDay.toUpperCase()}`, exercises: [] };
                }
                data[targetDay].exercises.push({
                    id: targetEx.id,
                    name: targetEx.name,
                    exercise_type: tax.type,
                    muscle_group: tax.muscleGroup,
                    notes: targetEx.recommendations || targetEx.cue || 'Cadencia y control biomecánico',
                    sets: targetEx.default_sets || 3,
                    reps: targetEx.default_reps || '10-12',
                    rest: targetEx.rest || 75,
                    defaultWeight: 15,
                    defaultReps: 10
                });
                localStorage.setItem(`sens_prescribed_workouts_${targetAth}`, JSON.stringify(data));
                if (typeof renderCoachAssignedExercises === 'function') {
                    renderCoachAssignedExercises();
                }
                if (typeof renderWorkoutDay === 'function') {
                    renderWorkoutDay(targetDay);
                }
                showSensToast(`${exName} asignado a ${targetDay.toUpperCase()}.`, 'champagne');
                const modal = document.getElementById('exerciseLibraryModal');
                if (modal) modal.classList.remove('active');
            }
        });
    });
}

// Sincronización del Video de Hero, Skeleton Shimmer y Revelación Silenciosa
function initHeroVideo() {
    const heroSection = document.getElementById('sensTrainHero') || document.querySelector('.sens-train-hero');
    const video = document.getElementById('heroVideo');
    const fallback = document.getElementById('heroBgFallback');
    const skeleton = document.getElementById('heroSkeleton');
    if (!heroSection) return;

    let isRevealed = false;

    function revealHeroContent() {
        if (isRevealed) return;
        isRevealed = true;
        heroSection.classList.add('hero-ready');
        if (skeleton) {
            skeleton.classList.add('fade-out');
            setTimeout(() => {
                if (skeleton && skeleton.parentNode) skeleton.style.display = 'none';
            }, 550);
        }
        try {
            sessionStorage.setItem('sens_hero_loaded', 'true');
        } catch (e) {}
    }

    // Si ya cargó en esta sesión de navegación (ej. usuario recarga o vuelve a la home),
    // revelar instantáneamente sin parpadeo de skeleton
    try {
        if (sessionStorage.getItem('sens_hero_loaded') === 'true') {
            revealHeroContent();
        }
    } catch (e) {}

    if (video) {
        function handleVideoReady() {
            if (fallback) fallback.style.opacity = '0';
            revealHeroContent();
        }

        video.addEventListener('playing', handleVideoReady);
        video.addEventListener('canplay', () => {
            const p = video.play();
            if (p !== undefined) {
                p.then(handleVideoReady).catch(() => {
                    // Si el navegador móvil bloquea autoplay, mostrar el poster y revelar
                    if (fallback) fallback.style.opacity = '1';
                    revealHeroContent();
                });
            } else {
                handleVideoReady();
            }
        });

        video.addEventListener('timeupdate', () => {
            if (video.currentTime > 0.05) handleVideoReady();
        });

        // Intentar reproducción automática inmediata
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(handleVideoReady).catch(() => {
                if (fallback) fallback.style.opacity = '1';
                revealHeroContent();
            });
        }
    }

    // Salvaguarda: si la red móvil es lenta o video tarda > 450ms, revelar con el poster de alta fidelidad
    setTimeout(() => {
        if (!isRevealed) {
            revealHeroContent();
        }
    }, 450);
}

// =============================================================================
// TRANSICIONES CINEMÁTICAS & SCROLL REVEALS (SR-DIRECTOR-UX-WELLNESS)
// =============================================================================
function initLuxuryScrollReveals() {
    const targets = document.querySelectorAll(
        '.section-head, .carousel-slide, .method-step, .price-card-landing, .guarantee-card, .faq-item, .transformation-preview-card, .about-coach-card, .card-panel'
    );
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-revealed'));
        return;
    }

    const windowH = window.innerHeight;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    });

    targets.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Si el elemento ya está dentro del viewport inicial, NO aplicarle sens-reveal para evitar el flash de ocultamiento y re-aparición
        if (rect.top < windowH && rect.bottom > 0) {
            el.classList.add('is-revealed');
            return;
        }
        el.classList.add('sens-reveal');
        observer.observe(el);
    });
}

// =============================================================================
// MÓDULO 1: NAVEGACIÓN Y NAVBAR GLOBAL
// =============================================================================
function ensurePublicNavbarVisibility() {
    const isPortalActive = document.getElementById('app-container')?.classList.contains('active');
    if (!isPortalActive) {
        document.body.classList.remove('in-portal');
        const globalHeader = document.querySelector('header');
        if (globalHeader) {
            globalHeader.style.display = '';
            globalHeader.style.visibility = 'visible';
            globalHeader.style.opacity = '1';
        }
        const navbar = document.getElementById('globalNavbar');
        if (navbar) {
            navbar.style.display = 'flex';
            navbar.style.visibility = 'visible';
            navbar.style.opacity = '1';
        }
    }
}

window.addEventListener('pageshow', () => {
    ensurePublicNavbarVisibility();
});

function initNavbarScroll() {
    const navbar = document.getElementById('globalNavbar');
    ensurePublicNavbarVisibility();

    window.addEventListener('scroll', () => {
        if (!navbar) return;
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    // Menú Móvil & Botón de Cruz para Cerrar
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuCloseBtn = document.getElementById('mobileMenuCloseBtn');
    const mobileMenuClientAccessBtn = document.getElementById('mobileMenuClientAccessBtn');

    if (menuToggle && mobileMenu) {
        function openMobileMenu() {
            mobileMenu.style.display = 'flex';
            mobileMenu.classList.add('is-open');
            document.body.classList.add('mobile-menu-open');
        }

        function closeMobileMenu() {
            mobileMenu.style.display = 'none';
            mobileMenu.classList.remove('is-open');
            document.body.classList.remove('mobile-menu-open');
        }

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = mobileMenu.style.display === 'flex' || mobileMenu.classList.contains('is-open');
            if (isVisible) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        if (mobileMenuCloseBtn) {
            mobileMenuCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMobileMenu();
            });
        }

        if (mobileMenuClientAccessBtn) {
            mobileMenuClientAccessBtn.addEventListener('click', () => {
                closeMobileMenu();
                const authModal = document.getElementById('authModal');
                if (authModal) authModal.style.display = 'flex';
            });
        }

        mobileMenu.querySelectorAll('a, button').forEach(el => {
            if (el !== mobileMenuCloseBtn) {
                el.addEventListener('click', () => {
                    closeMobileMenu();
                });
            }
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

    // Auto-reproducción inteligente y optimizada para videos dentro del carrusel
    if ('IntersectionObserver' in window) {
        const carouselVideos = carousel.querySelectorAll('video');
        if (carouselVideos.length > 0) {
            const videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const vid = entry.target;
                    if (entry.isIntersecting) {
                        const p = vid.play();
                        if (p !== undefined) p.catch(() => {});
                    } else {
                        vid.pause();
                    }
                });
            }, { threshold: 0.15 });

            carouselVideos.forEach(v => videoObserver.observe(v));
        }
    }
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
                if (mobileMenu) {
                    mobileMenu.style.display = 'none';
                    mobileMenu.classList.remove('is-open');
                    document.body.classList.remove('mobile-menu-open');
                }
                if (AppState.user) {
                    openUserPortal(false);
                    return;
                }
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

    // Pestañas Iniciar Sesión / Registrarme / Recuperar Contraseña / Actualizar Clave
    const authTabs = document.querySelector('.auth-tabs');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const paneLogin = document.getElementById('loginForm');
    const paneRegister = document.getElementById('registerForm');
    const paneForgot = document.getElementById('forgotPassForm');
    const paneUpdatePass = document.getElementById('updatePasswordForm');
    const btnForgotPass = document.getElementById('btnForgotPass');
    const btnBackToLogin = document.getElementById('btnBackToLoginFromForgot');

    tabLogin.addEventListener('click', () => {
        if (authTabs) authTabs.style.display = 'flex';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        if (paneLogin) paneLogin.classList.add('active');
        if (paneRegister) paneRegister.classList.remove('active');
        if (paneForgot) paneForgot.classList.remove('active');
        if (paneUpdatePass) paneUpdatePass.classList.remove('active');
        clearAuthAlert();
    });

    tabRegister.addEventListener('click', () => {
        if (authTabs) authTabs.style.display = 'flex';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        if (paneRegister) paneRegister.classList.add('active');
        if (paneLogin) paneLogin.classList.remove('active');
        if (paneForgot) paneForgot.classList.remove('active');
        if (paneUpdatePass) paneUpdatePass.classList.remove('active');
        clearAuthAlert();
    });

    if (btnForgotPass && paneForgot) {
        btnForgotPass.addEventListener('click', () => {
            tabLogin.classList.remove('active');
            tabRegister.classList.remove('active');
            if (paneLogin) paneLogin.classList.remove('active');
            if (paneRegister) paneRegister.classList.remove('active');
            if (paneUpdatePass) paneUpdatePass.classList.remove('active');
            paneForgot.classList.add('active');
            clearAuthAlert();
        });
    }

    if (btnBackToLogin && paneLogin) {
        btnBackToLogin.addEventListener('click', () => {
            if (authTabs) authTabs.style.display = 'flex';
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            paneLogin.classList.add('active');
            if (paneForgot) paneForgot.classList.remove('active');
            if (paneRegister) paneRegister.classList.remove('active');
            if (paneUpdatePass) paneUpdatePass.classList.remove('active');
            clearAuthAlert();
        });
    }

    // Helper de traducción de errores de Supabase Auth
    function formatAuthErrorMessage(errorMsg) {
        if (!errorMsg) return 'Ocurrió un error al procesar tu solicitud.';
        const msg = errorMsg.toLowerCase();
        if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos. Verificá tus datos.';
        if (msg.includes('user already registered') || msg.includes('already registered')) return 'Ya existe una cuenta con este correo. Iniciá sesión con tu contraseña.';
        if (msg.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
        if (msg.includes('email not confirmed')) return 'Por favor confirmá tu correo electrónico mediante el enlace que te enviamos.';
        if (msg.includes('rate limit')) return 'Demasiados intentos seguidos. Por favor aguardá unos minutos.';
        return errorMsg;
    }

    // Formulario Iniciar Sesión
    paneLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        showAuthAlert('Autenticando acceso...', 'info');

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                showAuthAlert(formatAuthErrorMessage(error.message), 'error');
                return;
            }
            AppState.user = data.user;
            await loadProfileFromSupabase(data.user.id);
        } else {
            AppState.user = { id: 'local-user-id', email };
            const savedProfile = localStorage.getItem('sens_profile_' + email);
            const savedAnamnesis = localStorage.getItem('sens_anamnesis_' + email);
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            } else {
                AppState.profile = {
                    full_name: email.split('@')[0],
                    daily_step_target: 10000,
                    active_plan_name: 'Plan Personalizado SENS TRAIN',
                    onboarding_completed: false
                };
            }
            if (savedAnamnesis) {
                AppState.anamnesis = JSON.parse(savedAnamnesis);
            }
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        showAuthAlert('¡Acceso concedido! Entrando a tu portal...', 'success');
        updateAuthNavButtons();
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(false);
        }, 600);
    });

    // Formulario Registro
    paneRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;

        showAuthAlert('Creando tu cuenta...', 'info');

        const isCoach = (email.toLowerCase() === 'nico@sens.com' || email.toLowerCase() === 'nicomaralle@gmail.com' || email.toLowerCase() === 'lean.barreira@gmail.com');

        let newUserId = 'local-user-' + Date.now();

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { 
                    data: { 
                        full_name: fullName,
                        role: isCoach ? 'admin' : 'user_normal',
                        user_type: isCoach ? 'admin' : 'client_presencial_vip'
                    } 
                }
            });
            if (error) {
                showAuthAlert(formatAuthErrorMessage(error.message), 'error');
                return;
            }

            if (data && data.user) {
                newUserId = data.user.id;
                AppState.user = data.user;
            }
        } else {
            AppState.user = { id: newUserId, email };
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        const newProfile = {
            id: newUserId,
            full_name: fullName,
            email: email,
            role: isCoach ? 'admin' : 'user_normal',
            user_type: isCoach ? 'admin' : 'client_presencial_vip',
            subscription_status: isCoach ? 'active' : 'pending_activation',
            active_plan_name: isCoach ? 'Panel Administrador SENS' : 'Presencial Personalizado 1 a 1 (CABA)',
            billing_provider: 'manual',
            onboarding_completed: false,
            created_at: new Date().toISOString()
        };

        AppState.profile = newProfile;

        // 1. Guardar en Supabase profiles si está conectado
        if (supabaseClient && newUserId) {
            try {
                await supabaseClient.from('profiles').upsert(newProfile);
            } catch (err) {
                console.warn('[SENS] Error al guardar perfil en Supabase:', err);
            }
        }

        // 2. Guardar en el roster local sincronizado para disponibilidad inmediata en Coach OS
        try {
            const localRoster = JSON.parse(localStorage.getItem('sens_registered_athletes') || '[]');
            const exists = localRoster.some(a => a.id === newProfile.id || (a.email && a.email.toLowerCase() === newProfile.email.toLowerCase()));
            if (!exists) {
                localRoster.unshift(newProfile);
                localStorage.setItem('sens_registered_athletes', JSON.stringify(localRoster));
            }
        } catch (e) {}

        // 3. Enviar alerta inmediata a los mails de Nico y Lean
        sendCoachEmailAlert({
            type: 'Nueva Cuenta Creada (Atleta Registrado)',
            athleteName: fullName,
            athleteEmail: email,
            details: 'El usuario se acaba de registrar en el portal. Su estado inicial es: PENDIENTE DE ACTIVACIÓN.'
        }).catch(() => {});

        // 4. Actualizar lista de atletas de coach si está en memoria
        if (window.__coachAthletesCache) {
            window.__coachAthletesCache.unshift(newProfile);
            if (typeof renderCoachAthletesHub === 'function') renderCoachAthletesHub();
            if (typeof renderAthleteBottomSheetList === 'function') renderAthleteBottomSheetList();
        }

        showAuthAlert('¡Cuenta creada con éxito! Ingresando a tu cuenta...', 'success');
        updateAuthNavButtons();
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(true);
        }, 700);
    });

    // Formulario Recuperar Contraseña
    if (paneForgot) {
        paneForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (document.getElementById('forgotEmail')?.value || '').trim();
            if (!email) {
                showAuthAlert('Por favor ingresá tu email registrado.', 'error');
                return;
            }
            showAuthAlert('Enviando enlace seguro de recuperación...', 'info');

            if (supabaseClient) {
                try {
                    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin
                    });
                    if (error) {
                        showAuthAlert(formatAuthErrorMessage(error.message), 'error');
                        return;
                    }
                    showAuthAlert(`¡Enlace enviado a ${email}! Verificá tu bandeja de entrada o spam.`, 'success');
                } catch (err) {
                    showAuthAlert('Ocurrió un error al enviar el correo. Por favor contactá a Nico por WhatsApp.', 'error');
                }
            } else {
                // Modo local
                showAuthAlert(`¡Enlace enviado a ${email}! Si necesitás asistencia inmediata, contactá a Nico por WhatsApp.`, 'success');
            }
        });
    }

    // Formulario de Establecer Nueva Contraseña (Recovery Flow de Supabase)
    if (paneUpdatePass) {
        paneUpdatePass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = (document.getElementById('newPasswordInput')?.value || '').trim();
            const confirmPass = (document.getElementById('confirmPasswordInput')?.value || '').trim();

            if (newPass.length < 6) {
                showAuthAlert('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }
            if (newPass !== confirmPass) {
                showAuthAlert('Las contraseñas no coinciden. Por favor verificalas.', 'error');
                return;
            }

            const submitBtn = document.getElementById('submitUpdatePassBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Actualizando contraseña...';
            }

            showAuthAlert('Guardando tu nueva contraseña...', 'info');

            if (supabaseClient) {
                try {
                    const { data, error } = await supabaseClient.auth.updateUser({
                        password: newPass
                    });

                    if (error) {
                        showAuthAlert(formatAuthErrorMessage(error.message), 'error');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Guardar Contraseña & Ingresar';
                        }
                        return;
                    }

                    showAuthAlert('¡Contraseña actualizada con éxito! Ingresando a tu portal...', 'success');
                    try {
                        history.replaceState(null, '', window.location.pathname);
                    } catch (_) {}

                    setTimeout(async () => {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Guardar Contraseña & Ingresar';
                        }
                        showAuthModal(false);
                        if (data && data.user) {
                            AppState.user = data.user;
                            await loadProfileFromSupabase(data.user.id);
                            updateAuthNavButtons();
                        }
                        openUserPortal(true);
                    }, 1200);
                } catch (err) {
                    console.error('[SENS] Error al actualizar clave:', err);
                    showAuthAlert('Ocurrió un error al actualizar la contraseña. Contactá a Nico por WhatsApp.', 'error');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Guardar Contraseña & Ingresar';
                    }
                }
            } else {
                showAuthAlert('¡Contraseña actualizada con éxito! (Modo Local)', 'success');
                setTimeout(() => {
                    showAuthModal(false);
                    openUserPortal(true);
                }, 1000);
            }
        });
    }

    // Verificar si la URL trae parámetros de error o recuperación de Supabase
    checkAuthUrlParameters();
}

function showAuthModal(show) {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    if (show) {
        modal.classList.add('active');
        clearAuthAlert();
    } else {
        modal.classList.remove('active');
        const authTabs = document.querySelector('.auth-tabs');
        if (authTabs) authTabs.style.display = 'flex';
        const paneUpdatePass = document.getElementById('updatePasswordForm');
        if (paneUpdatePass) paneUpdatePass.classList.remove('active');
    }
}

window.openResetPasswordModal = function() {
    showAuthModal(true);
    const authTabs = document.querySelector('.auth-tabs');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const paneLogin = document.getElementById('loginForm');
    const paneRegister = document.getElementById('registerForm');
    const paneForgot = document.getElementById('forgotPassForm');
    const paneUpdatePass = document.getElementById('updatePasswordForm');

    if (authTabs) authTabs.style.display = 'none';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.remove('active');
    if (paneLogin) paneLogin.classList.remove('active');
    if (paneRegister) paneRegister.classList.remove('active');
    if (paneForgot) paneForgot.classList.remove('active');
    if (paneUpdatePass) paneUpdatePass.classList.add('active');

    clearAuthAlert();
    showAuthAlert('Identidad verificada. Ingresá tu nueva contraseña para acceder a SENS.', 'info');
    setTimeout(() => {
        const input = document.getElementById('newPasswordInput');
        if (input) input.focus();
    }, 150);
};

function checkAuthUrlParameters() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // 1. Detección de enlace expirado o inválido de Supabase (error=access_denied / otp_expired)
    if (hash.includes('error=') || search.includes('error=')) {
        const raw = hash.includes('error=') ? hash.substring(1) : search.substring(1);
        const params = new URLSearchParams(raw);
        const errorCode = params.get('error_code') || '';
        const errorDesc = decodeURIComponent(params.get('error_description') || '').replace(/\+/g, ' ');

        if (errorCode === 'otp_expired' || errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid')) {
            showAuthModal(true);
            const authTabs = document.querySelector('.auth-tabs');
            const tabLogin = document.getElementById('tabLoginBtn');
            const tabRegister = document.getElementById('tabRegisterBtn');
            const paneLogin = document.getElementById('loginForm');
            const paneRegister = document.getElementById('registerForm');
            const paneForgot = document.getElementById('forgotPassForm');

            if (authTabs) authTabs.style.display = 'flex';
            if (tabLogin) tabLogin.classList.remove('active');
            if (tabRegister) tabRegister.classList.remove('active');
            if (paneLogin) paneLogin.classList.remove('active');
            if (paneRegister) paneRegister.classList.remove('active');
            if (paneForgot) paneForgot.classList.add('active');

            showAuthAlert('El enlace de recuperación ha expirado o ya fue utilizado. Por favor solicitá uno nuevo ingresando tu email.', 'error');

            try {
                history.replaceState(null, '', window.location.pathname);
            } catch (_) {}
            return;
        }
    }

    // 2. Detección de token de recuperación en Hash (type=recovery)
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
        console.log('[SENS] Hash con type=recovery detectado en URL');
        setTimeout(() => {
            if (typeof window.openResetPasswordModal === 'function') {
                window.openResetPasswordModal();
            }
        }, 300);
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
            .maybeSingle();

        if (data && !error) {
            AppState.profile = data;
            const emailKey = (AppState.user && AppState.user.email) ? AppState.user.email : '';
            if (emailKey) {
                const localSaved = localStorage.getItem('sens_profile_' + emailKey);
                if (localSaved) {
                    try {
                        const parsed = JSON.parse(localSaved);
                        if (parsed.onboarding_completed && !data.onboarding_completed) {
                            AppState.profile.onboarding_completed = true;
                            supabaseClient
                                .from('profiles')
                                .update({ onboarding_completed: true })
                                .eq('id', userId)
                                .then();
                        }
                    } catch (e) {}
                }
            }
        } else {
            // Perfil aún no creado en la tabla (ej: usuario creado desde dashboard o antes del trigger)
            const fallbackEmail = (AppState.user && AppState.user.email) ? AppState.user.email : '';
            const fallbackName = (AppState.user && AppState.user.user_metadata && AppState.user.user_metadata.full_name) 
                || (fallbackEmail ? fallbackEmail.split('@')[0] : 'Atleta SENS');

            const initialProfile = {
                id: userId,
                full_name: fallbackName,
                email: fallbackEmail,
                role: 'user_normal',
                user_type: 'client_presencial_vip',
                subscription_status: 'pending_activation',
                billing_provider: 'manual',
                onboarding_completed: false
            };

            try {
                const { data: created, error: createErr } = await supabaseClient
                    .from('profiles')
                    .upsert(initialProfile)
                    .select()
                    .maybeSingle();

                AppState.profile = (created && !createErr) ? created : initialProfile;
            } catch (err) {
                AppState.profile = initialProfile;
            }
        }

        const { data: anamData } = await supabaseClient
            .from('anamnesis')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (anamData) {
            AppState.anamnesis = anamData;
        }
    } catch (e) {
        console.error('Error cargando perfil:', e);
    }
}

async function checkExistingSession() {
    if (supabaseClient) {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                AppState.user = session.user;
                await loadProfileFromSupabase(session.user.id);
                updateAuthNavButtons();
                console.log('[SENS] Sesión activa de Supabase detectada:', session.user.email);
            }
        } catch (e) {
            console.warn('[SENS] Error al restaurar sesión previa:', e);
        }

        // Suscripción reactiva a cambios de sesión (login, logout, refresh de token, password recovery)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('[SENS] Auth state change event:', event);
            if (event === 'PASSWORD_RECOVERY') {
                console.log('[SENS] Evento PASSWORD_RECOVERY detectado');
                if (typeof window.openResetPasswordModal === 'function') {
                    window.openResetPasswordModal();
                }
            } else if (event === 'SIGNED_IN' && session && session.user) {
                // Si la URL contiene type=recovery o estamos restableciendo clave, no forzar login regular
                if (!window.location.hash.includes('type=recovery')) {
                    AppState.user = session.user;
                    await loadProfileFromSupabase(session.user.id);
                    updateAuthNavButtons();
                }
            } else if (event === 'SIGNED_OUT') {
                AppState.user = null;
                AppState.profile = null;
                AppState.anamnesis = null;
                updateAuthNavButtons();
            }
        });
    } else {
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

    // Si el usuario estaba navegando dentro del portal, mantenerlo en el portal en refresh
    try {
        if (localStorage.getItem('sens_in_portal') === 'true') {
            if (typeof openUserPortal === 'function') {
                openUserPortal(false);
            }
        }
    } catch (_) {}
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
            localStorage.removeItem('sens_in_portal');
            document.documentElement.classList.remove('in-portal-mode');
            AppState.user = null;
            AppState.profile = null;
            document.body.classList.remove('in-portal');
            const globalHeader = document.querySelector('header');
            const mobileQuickBar = document.querySelector('.mobile-quick-bar');
            if (globalHeader) globalHeader.style.display = '';
            if (mobileQuickBar) mobileQuickBar.style.display = '';
            const floatSocial = document.getElementById('homeFloatingSocial');
            if (floatSocial) floatSocial.style.display = 'flex';
            returnToPublicLanding();
        });
    }

    if (backLandingBtn) {
        backLandingBtn.addEventListener('click', () => {
            returnToPublicLanding();
        });
    }

    const topbarBackHomeBtn = document.getElementById('btnTopbarBackHome');
    if (topbarBackHomeBtn) {
        topbarBackHomeBtn.addEventListener('click', () => {
            returnToPublicLanding();
        });
    }

    const brandLogoWrap = document.getElementById('portalBrandLogoWrap');
    if (brandLogoWrap) {
        brandLogoWrap.addEventListener('click', () => {
            returnToPublicLanding();
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

    // Botón de re-verificación de membresía en Paywall
    const refreshActivationBtn = document.getElementById('btnRefreshActivationStatus');
    if (refreshActivationBtn) {
        refreshActivationBtn.addEventListener('click', async () => {
            if (supabaseClient && AppState.user) {
                await loadProfileFromSupabase(AppState.user.id);
            }
            if (AppState.profile && AppState.profile.subscription_status === 'active') {
                openUserPortal(false);
            } else {
                showSensToast('Tu abono continúa en proceso de validación. Podés avisarle a Nico por WhatsApp.', 'alert');
            }
        });
    }

    // Botón de alternar membresía en barra de Coach (Nico)
    const toggleSubBtn = document.getElementById('btnCoachToggleSubStatus');
    if (toggleSubBtn) {
        toggleSubBtn.addEventListener('click', async () => {
            if (!AppState.profile) return;
            const currentStatus = AppState.profile.subscription_status || 'pending_activation';
            const newStatus = (currentStatus === 'active') ? 'pending_activation' : 'active';
            AppState.profile.subscription_status = newStatus;

            const targetId = AppState.profile.id || (AppState.user && AppState.user.id);
            if (supabaseClient && targetId && !targetId.startsWith('usr-')) {
                try {
                    await supabaseClient.from('profiles').update({ subscription_status: newStatus }).eq('id', targetId);
                    if (window.__coachAthletesCache) {
                        const cached = window.__coachAthletesCache.find(a => a.id === targetId);
                        if (cached) cached.subscription_status = newStatus;
                    }
                    await loadCoachAthletesList();
                } catch (e) {
                    console.warn('Error al actualizar membresía en Supabase:', e);
                }
            }

            updateCoachSubBadgeAndButton(newStatus);
            showSensToast(
                newStatus === 'active' 
                    ? 'Atleta aprobado con éxito! Acceso y entrenamientos habilitados.' 
                    : 'Membresía pausada.', 
                'champagne'
            );
        });
    }

    initProfileSettings();
}

function returnToPublicLanding() {
    try {
        localStorage.removeItem('sens_in_portal');
        document.documentElement.classList.remove('in-portal-mode');
    } catch (_) {}
    document.body.classList.remove('in-portal');
    const globalHeader = document.querySelector('header');
    const mobileQuickBar = document.querySelector('.mobile-quick-bar');
    if (globalHeader) globalHeader.style.display = '';
    if (mobileQuickBar) mobileQuickBar.style.display = '';
    const floatSocial = document.getElementById('homeFloatingSocial');
    if (floatSocial) floatSocial.style.display = 'flex';
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('publicLanding').style.display = 'block';

    // Ocultar terminantemente el dock inferior del portal en la web pública
    document.querySelectorAll('.sens-floating-dock').forEach(dock => {
        dock.style.display = 'none';
    });

    updateAuthNavButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchPortalView(viewId) {
    const isAdmin = isCurrentUserAdmin();
    const profile = AppState.profile || {};
    const subStatus = profile.subscription_status || (isAdmin ? 'active' : 'pending_activation');
    const isSubActive = isAdmin || subStatus === 'active';

    // Bloqueo estricto para usuarios no activados por Nico
    if (!isSubActive) {
        viewId = 'activationPendingView';
        const subNav = document.getElementById('portalSubNav');
        if (subNav) subNav.style.display = 'none';
        document.querySelectorAll('.sens-floating-dock').forEach(dock => {
            dock.style.display = 'none';
        });
    } else {
        const subNav = document.getElementById('portalSubNav');
        const isExcluded = (viewId === 'activationPendingView' || viewId === 'onboardingSection');
        if (subNav) subNav.style.display = isExcluded ? 'none' : 'flex';
        document.querySelectorAll('.sens-floating-dock').forEach(dock => {
            dock.style.display = isExcluded ? 'none' : 'flex';
        });
    }

    const navItems = document.querySelectorAll('.portal-nav-item[data-portal-tab]');
    const views = document.querySelectorAll('.portal-view');

    navItems.forEach(item => {
        if (item.getAttribute('data-portal-tab') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const dockItems = document.querySelectorAll('.sens-dock-item[data-dock-tab]');
    dockItems.forEach(item => {
        if (item.getAttribute('data-dock-tab') === viewId) {
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
    if (viewId === 'profileSettingsView') {
        renderProfileSettingsData();
    }
    if (viewId === 'coachHubView') {
        if (typeof syncCoachMasterCard === 'function') syncCoachMasterCard();
    }
    if (viewId === 'workoutView') {
        if (typeof renderWorkoutDaysNav === 'function') renderWorkoutDaysNav();
    }
    if (viewId === 'dashView') {
        if (typeof updateDynamicTrainingCard === 'function') updateDynamicTrainingCard(AppState.selectedDate);
        if (typeof updateObjectiveCardData === 'function') updateObjectiveCardData();
        if (typeof triggerWelcomeGreetingAnimation === 'function') triggerWelcomeGreetingAnimation(true);
        if (typeof initDashboardCardsTactileFeedback === 'function') initDashboardCardsTactileFeedback();
    }
}


function openUserPortal(forceOnboarding = false) {
    try {
        localStorage.setItem('sens_in_portal', 'true');
        document.documentElement.classList.add('in-portal-mode');
    } catch (_) {}
    const portal = document.getElementById('app-container');
    const publicLanding = document.getElementById('publicLanding');
    const userEmailEl = document.getElementById('portalUserEmail');
    const planBadgeEl = document.getElementById('portalPlanBadge');
    const btnCoachOS = document.getElementById('btnTopbarCoachOS');
    const dashCoach = document.getElementById('dashCoachCard');
    const settingsCoach = document.getElementById('settingsCoachCard');
    const coachBanner = document.getElementById('coachInspectionBanner');
    const globalHeader = document.querySelector('header');
    const mobileQuickBar = document.querySelector('.mobile-quick-bar');
    const mobileMenu = document.getElementById('mobileMenu');

    document.body.classList.add('in-portal');
    if (globalHeader) globalHeader.style.display = 'none';
    if (mobileQuickBar) mobileQuickBar.style.display = 'none';
    if (mobileMenu) {
        mobileMenu.style.display = 'none';
        mobileMenu.classList.remove('is-open');
        document.body.classList.remove('mobile-menu-open');
    }

    const floatSocial = document.getElementById('homeFloatingSocial');
    if (floatSocial) floatSocial.style.display = 'none';

    portal.classList.add('active');
    publicLanding.style.display = 'none';

    const profile = AppState.profile || {};
    const user = AppState.user || {};

    if (userEmailEl) {
        userEmailEl.textContent = user.email || 'atleta@sens.com';
    }
    if (planBadgeEl) {
        planBadgeEl.textContent = profile.active_plan_name || 'Presencial 1 a 1 VIP (CABA)';
    }

    const isAdmin = isCurrentUserAdmin();

    // Visibilidad del Panel de Control de Coach (Solo para Nico)
    if (btnCoachOS) btnCoachOS.style.display = isAdmin ? 'inline-flex' : 'none';
    if (dashCoach) dashCoach.style.display = isAdmin ? 'block' : 'none';
    if (settingsCoach) settingsCoach.style.display = isAdmin ? 'block' : 'none';
    if (coachBanner && !isAdmin) coachBanner.style.display = 'none';

    document.querySelectorAll('.coach-only-item').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });

    if (isAdmin) {
        loadCoachAthletesList();
        renderCoachAthletesHub();
    }

    const navCoachHub = document.getElementById('navCoachHub');
    if (navCoachHub) {
        navCoachHub.style.display = isAdmin ? 'inline-block' : 'none';
    }

    const adminIndicatorBadge = document.getElementById('adminIndicatorBadge');
    const adminAddBtn = document.getElementById('btnAdminAddExercise');
    if (adminIndicatorBadge) adminIndicatorBadge.style.display = isAdmin ? 'block' : 'none';
    if (adminAddBtn) adminAddBtn.style.display = isAdmin ? 'inline-block' : 'none';

    // -------------------------------------------------------------------------
    // CONTROL DE MEMBRESÍA & PAGOS (MVP CON NICO / EG CON PASARELA DE PAGO)
    // -------------------------------------------------------------------------
    // Todo nuevo usuario nace BLOQUEADO ('pending_activation') y requiere aprobación/check de Nico
    const subStatus = profile.subscription_status || (isAdmin ? 'active' : 'pending_activation');
    const isSubActive = isAdmin || subStatus === 'active';

    if (!isSubActive) {
        // Redirige al Paywall de Activación y oculta menús y dock
        const subNav = document.getElementById('portalSubNav');
        if (subNav) subNav.style.display = 'none';
        document.querySelectorAll('.sens-floating-dock').forEach(dock => {
            dock.style.display = 'none';
        });

        const pendingNameEl = document.getElementById('pendingUserName');
        const pendingPlanEl = document.getElementById('pendingPlanName');
        const notifyWaBtn = document.getElementById('btnNotifyPaymentWA');

        if (pendingNameEl) pendingNameEl.textContent = profile.full_name || 'Atleta';
        if (pendingPlanEl) pendingPlanEl.textContent = profile.active_plan_name || 'Presencial 1 a 1 VIP (CABA)';

        if (notifyWaBtn) {
            const athleteName = encodeURIComponent(profile.full_name || 'Nuevo Atleta');
            const athleteEmail = encodeURIComponent(user.email || '');
            const athletePlan = encodeURIComponent(profile.active_plan_name || 'Plan SENS');
            notifyWaBtn.href = `https://wa.me/5491136329846?text=Hola%20Nico!%20Cre%C3%A9%20mi%20cuenta%20en%20SENS%20(${athleteName}%20-%20${athleteEmail}).%20Te%20aviso%20para%20confirmar%20mi%20abono%20del%20plan%20${athletePlan}%20y%20activar%20mi%20acceso.`;
        }

        switchPortalView('activationPendingView');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // Regla de Enrutamiento Onboarding:
    // 1. Admin (Nico): va directo al dashboard de coach. Nunca se le piden preguntas iniciales de atleta.
    // 2. Atleta con onboarding completado: va directo al Dashboard con sus rutinas y métricas (NO repite preguntas).
    // 3. Atleta nuevo o que no finalizó su evaluación: entra a la Evaluación Inicial de Fuerza & Hábitos.
    const isCompleted = isAdmin || Boolean(profile.onboarding_completed);

    if (!isAdmin && (forceOnboarding || !isCompleted)) {
        // Redirige a la Evaluación Inicial
        document.getElementById('portalSubNav').style.display = 'none';
        document.querySelectorAll('.sens-floating-dock').forEach(dock => {
            dock.style.display = 'none';
        });
        startDiagnosisWizard(false);
    } else {
        // Redirige al Dashboard de Atleta
        document.getElementById('portalSubNav').style.display = 'flex';
        document.querySelectorAll('.sens-floating-dock').forEach(dock => {
            dock.style.display = 'flex';
        });
        renderDashboardData();
        renderWorkoutDay(AppState.currentDay || 'day1');
        switchPortalView('dashView');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDashboardData() {
    const userNameEl = document.getElementById('dashUserName');
    const greetingNameEl = document.getElementById('dashGreetingAthleteName');
    const planBadgeEl = document.getElementById('portalPlanBadge');
    const weightKpi = document.getElementById('kpiCurrentWeight');
    const diagTagsContainer = document.getElementById('dashDiagTags');
    const diagStatusPill = document.getElementById('dashDiagStatusPill');
    const diagDateBadge = document.getElementById('dashDiagDateBadge');
    const diagSummaryText = document.getElementById('dashDiagSummaryText');

    const profile = AppState.profile || {};
    const anamnesis = AppState.anamnesis || {};

    const rawFullName = profile.full_name || (AppState.user && AppState.user.user_metadata && AppState.user.user_metadata.full_name) || (AppState.user && AppState.user.email ? AppState.user.email.split('@')[0] : 'Lean');
    const firstName = rawFullName.trim().split(' ')[0] || 'Lean';

    if (greetingNameEl) {
        greetingNameEl.textContent = firstName;
    }
    if (userNameEl && profile.full_name) {
        userNameEl.textContent = profile.full_name;
    }
    if (profile.active_plan_name && planBadgeEl) {
        planBadgeEl.textContent = profile.active_plan_name;
    }
    if (weightKpi) {
        if (profile.current_weight) {
            animateNumber(weightKpi, parseFloat(profile.current_weight), 800, ' <span style="font-size:1rem; font-weight:400;">kg</span>', 1);
        } else {
            weightKpi.innerHTML = '- <span style="font-size:1rem; font-weight:400;">kg</span>';
        }
    }
    const stepsKpi = document.getElementById('kpiAvgSteps');
    if (stepsKpi) {
        if (anamnesis.daily_step_target || profile.daily_step_target) {
            const targetSteps = parseInt(anamnesis.daily_step_target || profile.daily_step_target, 10);
            animateNumber(stepsKpi, targetSteps, 850);
        } else {
            stepsKpi.textContent = '-';
        }
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
        } else if (profile.full_name) {
            tagsHtml += `<span class="diag-tag">Apto para entrenamiento</span>`;
        }

        if (Array.isArray(anamnesis.active_injuries) && anamnesis.active_injuries.length > 0) {
            tagsHtml += `<span class="diag-tag" style="border-color:rgba(229,203,167,0.4); color:var(--accent-primary);">Zonas atendidas: ${anamnesis.active_injuries.join(', ')}</span>`;
        } else if (profile.full_name) {
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
    if (workoutsKpi) {
        workoutsKpi.textContent = anamnesis.weekly_frequency ? `0 / ${anamnesis.weekly_frequency}` : '- / -';
    }

    // Ocultar sección de métricas y workout asignado hasta completar el diagnóstico final
    const kpiGrid = document.getElementById('dashKpiMetricsGrid');
    const heroCard = document.getElementById('dashActionHeroCard');
    const isOnboardingDone = Boolean(profile.onboarding_completed);

    if (kpiGrid) kpiGrid.style.display = isOnboardingDone ? 'grid' : 'none';
    if (heroCard) heroCard.style.display = isOnboardingDone ? 'flex' : 'none';

    if (typeof updateDynamicTrainingCard === 'function') {
        updateDynamicTrainingCard(AppState.selectedDate);
    }
    if (typeof updateNutriSummaryCardData === 'function') {
        updateNutriSummaryCardData();
    }
    if (typeof updateObjectiveCardData === 'function') {
        updateObjectiveCardData();
    }
    if (typeof renderDynamicWeekStrip === 'function') {
        renderDynamicWeekStrip();
    }
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
    if (surgerySwitch) surgerySwitch.checked = false;
    const surgeryDetailBox = document.getElementById('detail_surgery');
    const surgeryStatusTag = document.getElementById('status_surgery');
    if (surgeryStatusTag) {
        surgeryStatusTag.textContent = 'NO';
        surgeryStatusTag.classList.remove('is-yes');
    }
    if (surgeryDetailBox) {
        surgeryDetailBox.style.display = 'none';
    }
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

    // Tooltips interactivos y función de copia para prompts IA de medición (Paso 8)
    window.copyTapePrompt = function(btn) {
        const box = btn.closest('.tooltip-prompt-box');
        const textEl = box ? box.querySelector('.prompt-text-display') : null;
        if (!textEl) return;
        const text = textEl.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.textContent;
            btn.textContent = '¡Copiado!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
            showSensToast('Prompt copiado al portapapeles', 'champagne', 2400);
        }).catch(() => {
            showSensToast('Seleccioná el texto para copiar', 'dark', 2000);
        });
    };

    document.addEventListener('click', (e) => {
        const tooltipBtn = e.target.closest('.sens-tooltip-btn');
        if (tooltipBtn) {
            e.preventDefault();
            e.stopPropagation();
            const wrap = tooltipBtn.closest('.sens-tooltip-wrap');
            const isActive = wrap.classList.contains('active');
            document.querySelectorAll('.sens-tooltip-wrap.active').forEach(w => w.classList.remove('active'));
            if (!isActive) wrap.classList.add('active');
            return;
        }
        if (!e.target.closest('.sens-tooltip-popover')) {
            document.querySelectorAll('.sens-tooltip-wrap.active').forEach(w => w.classList.remove('active'));
        }
    });

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

    // 10. Botón Entrar al Dashboard desde Congrats (Paso 9)
    const enterDashBtn = document.getElementById('btnDiagEnterDashboard');
    if (enterDashBtn) {
        enterDashBtn.addEventListener('click', () => {
            const isAdmin = isCurrentUserAdmin();
            const isSubActive = isAdmin || (AppState.profile && AppState.profile.subscription_status === 'active');
            if (!isSubActive) {
                openUserPortal(false);
            } else {
                document.getElementById('portalSubNav').style.display = 'flex';
                renderDashboardData();
                renderWorkoutDay(AppState.currentDay || 'day1');
                switchPortalView('dashView');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
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
    // PERSISTENCIA DE DATOS (ESQUEMA EXACTO POSTGRESQL SUPABASE)
    // =========================================================================
    const cleanProfilePayload = {
        full_name: fullName,
        gender: gender || 'other',
        goal: goal || 'general_vitality',
        age: parseInt(age, 10) || null,
        current_weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        daily_step_target: calculatedStepTarget || 8000,
        role: isVipCandidate ? 'user_vip' : 'user_normal',
        onboarding_completed: true,
        consent_timestamp: new Date().toISOString(),
        consent_version: 'v3.0_2026',
        active_plan_name: 'Plan Personalizado SENS TRAIN',
        updated_at: new Date().toISOString()
    };

    const cleanAnamnesisPayload = {
        user_id: AppState.user ? AppState.user.id : undefined,
        gender: gender || 'other',
        goal: goal || 'general_vitality',
        parq_responses: parqResponses || {},
        has_medical_flags: Boolean(hasMedicalFlags),
        parq_notes: parqNotes || '',
        active_injuries: Array.isArray(selectedInjuries) ? selectedInjuries : [],
        injury_intensities: injuryIntensities || {},
        has_surgery: Boolean(hasSurgery),
        surgery_detail: surgeryDetail || '',
        tape_measurements: {
            waist: tapeWaist,
            hip: tapeHip,
            arm: tapeArm,
            thigh: tapeThigh
        },
        experience_level: experience || 'beginner',
        weekly_frequency: parseInt(weeklyFrequency, 10) || 3,
        available_equipment: Array.isArray(availableEquipment) ? availableEquipment : [availableEquipment || 'gym_complete'],
        sleep_hours: parseFloat(sleepHours) || 7,
        stress_level: parseInt(stressLevel, 10) || 5,
        neat_level: neatLevel || 'moderate',
        water_liters_baseline: parseFloat(calculatedWaterLiters) || 2.5,
        historical_hurdle: historicalHurdle || '',
        historical_hurdle_detail: hurdleDetail || '',
        mobility_tests: { shoulder: mobShoulder, posterior: mobPosterior },
        photos: {
            front: frontPhoto && frontPhoto.startsWith('data:') ? 'uploaded_local' : frontPhoto,
            side: sidePhoto && sidePhoto.startsWith('data:') ? 'uploaded_local' : sidePhoto
        },
        is_draft: false,
        updated_at: new Date().toISOString()
    };

    AppState.profile = {
        ...(AppState.profile || {}),
        ...cleanProfilePayload,
        vip_candidate: isVipCandidate,
        vip_score: vipScore
    };
    AppState.anamnesis = cleanAnamnesisPayload;

    const emailKey = AppState.user && AppState.user.email ? AppState.user.email : 'local_user';
    localStorage.setItem(`sens_profile_${emailKey}`, JSON.stringify(AppState.profile));
    localStorage.setItem(`sens_anamnesis_${emailKey}`, JSON.stringify(cleanAnamnesisPayload));
    localStorage.removeItem('sens_onboarding_draft');

    // Sincronización robusta con Supabase (actualiza profiles y hace upsert/insert de anamnesis)
    if (supabaseClient && AppState.user && AppState.user.id) {
        try {
            const { error: profError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id: AppState.user.id,
                    email: AppState.user.email,
                    ...cleanProfilePayload
                });
            if (profError) {
                console.error('[SENS] Error al actualizar perfil en Supabase:', profError);
            } else {
                console.log('[SENS] Perfil y onboarding completado guardados con éxito en Supabase.');
            }

            const { data: existingAnam } = await supabaseClient
                .from('anamnesis')
                .select('id')
                .eq('user_id', AppState.user.id)
                .maybeSingle();

            if (existingAnam && existingAnam.id) {
                const { error: anamErr } = await supabaseClient
                    .from('anamnesis')
                    .update(cleanAnamnesisPayload)
                    .eq('id', existingAnam.id);
                if (anamErr) console.error('[SENS] Error actualizando anamnesis:', anamErr);
            } else {
                const { error: anamErr } = await supabaseClient
                    .from('anamnesis')
                    .insert(cleanAnamnesisPayload);
                if (anamErr) console.error('[SENS] Error insertando anamnesis:', anamErr);
            }
        } catch (err) {
            console.error('[SENS] Error sincronizando diagnóstico con Supabase:', err);
        }
    }

    // Enviar alerta completa a Nico y Lean con el expediente terminado
    sendCoachEmailAlert({
        type: 'Diagnóstico Biomecánico & Fuerza Completado',
        athleteName: fullName,
        athleteEmail: (AppState.user && AppState.user.email) ? AppState.user.email : 'N/A',
        goal: goal,
        modality: cleanProfilePayload.active_plan_name,
        details: `Edad: ${age || '-'} años | Peso: ${weight || '-'}kg | Altura: ${height || '-'}cm | Pasos diarios recomendados: ${calculatedStepTarget} | Frecuencia: ${weeklyFrequency}x/sem | Micro-hábitos y expediente listos para calibración.`
    }).catch(() => {});

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
            showSensToast('Excelente trabajo. Rutina registrada con éxito en tu historial.', 'success', 3600);
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

// -----------------------------------------------------------------------------
// GESTOR DE ENTRENAMIENTO VIDEO-FIRST & ALTO IMPACTO (ESTILO PILARES SENS)
// -----------------------------------------------------------------------------
const SENS_EXERCISE_MOCKUP_VIDEO = 'vid/pilar-2-vitalidad.mp4';
const SENS_EXERCISE_VIDEOS = [
    'vid/pilar-2-vitalidad.mp4'
];

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function formatMuscleGroup(key) {
    if (!key) return 'Fuerza';
    const k = key.toLowerCase();
    switch (k) {
        case 'pecho':
            return 'Pectoral & Empuje';
        case 'espalda':
            return 'Dorsales & Espalda';
        case 'hombros':
            return 'Deltoides & Hombros';
        case 'biceps':
            return 'Bíceps & Brazos';
        case 'triceps':
            return 'Tríceps & Brazos';
        case 'cuadriceps':
        case 'piernas':
            return 'Piernas & Cuádriceps';
        case 'isquiotibiales':
            return 'Isquios & Cadera';
        case 'gluteos':
            return 'Glúteos & Potencia';
        case 'pantorrillas':
            return 'Pantorrillas & Tobillos';
        case 'core':
        case 'core_mobility':
        case 'core_movilidad':
            return 'Core & Estabilidad';
        case 'movilidad':
            return 'Movilidad Activa';
        case 'cardio':
            return 'Cardio & Potencia';
        case 'push':
            return 'Empuje Tren Superior';
        case 'pull':
            return 'Tracción Tren Superior';
        default:
            return 'Fuerza Funcional';
    }
}

function athleteHasAssignedRoutine(athId) {
    if (!athId) return false;
    // Si Coach guardó una prescripción en localStorage para este alumno
    const raw = localStorage.getItem(`sens_prescribed_workouts_${athId}`);
    if (raw) {
        try {
            const data = JSON.parse(raw);
            const hasEx = Object.values(data).some(d => d && Array.isArray(d.exercises) && d.exercises.length > 0);
            if (hasEx) return true;
        } catch (e) {}
    }
    // Perfiles demostrativos preasignados
    if (athId === 'usr-vip-001' || athId === 'mock_vip' || athId === 'usr-onl-003' || athId === 'mock_onl') {
        return true;
    }
    return false;
}

function getActiveAthleteId() {
    if (coachWorkoutState && coachWorkoutState.activeAthleteId) {
        return coachWorkoutState.activeAthleteId;
    }
    if (AppState.user && AppState.user.id) {
        return AppState.user.id;
    }
    if (AppState.profile && AppState.profile.id) {
        return AppState.profile.id;
    }
    return 'usr-vip-001';
}

function getAthleteExerciseLogs(athId, exId) {
    try {
        const raw = localStorage.getItem(`sens_set_logs_${athId}_${exId}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

async function logCompletedSetToDb(athId, exId, setNumber, weightKg, repsCompleted) {
    const setLog = {
        user_id: athId,
        exercise_id: exId,
        set_number: setNumber,
        weight_kg: Number(weightKg) || 0,
        reps_completed: Number(repsCompleted) || 0,
        completed_at: new Date().toISOString()
    };

    // Cache local
    try {
        const current = getAthleteExerciseLogs(athId, exId);
        const existingIdx = current.findIndex(s => s.set_number === setNumber);
        if (existingIdx >= 0) {
            current[existingIdx] = setLog;
        } else {
            current.push(setLog);
        }
        localStorage.setItem(`sens_set_logs_${athId}_${exId}`, JSON.stringify(current));
    } catch (e) {}

    // Supabase
    if (supabaseClient && AppState.user) {
        try {
            await supabaseClient.from('workout_logs').insert([setLog]);
        } catch (err) {
            console.log('Set logged locally offline');
        }
    }
}

// Sesión interactiva en Modal de Ejercicio
let modalExerciseState = {
    exId: null,
    dayKey: null,
    setsData: [],
    tutSeconds: 0,
    tutInterval: null,
    isTutRunning: false,
    restSeconds: 90,
    restInterval: null,
    isRestRunning: false
};

function renderWorkoutDay(dayKey) {
    AppState.currentDay = dayKey;
    const athId = getActiveAthleteId();
    const hasRoutine = athleteHasAssignedRoutine(athId);
    const container = document.getElementById('exercisesContainer');
    const heroTitle = document.getElementById('heroWorkoutTitle');
    const heroSub = document.getElementById('heroWorkoutSubtitle');
    const goalPill = document.getElementById('workoutGoalPill');
    const muscleFocusName = document.getElementById('workoutFocusMuscleName');
    const muscleFocusCue = document.getElementById('workoutFocusMuscleCue');
    const adminBar = document.getElementById('workoutAdminActionsBar');

    if (!container) return;

    const isAdmin = isCurrentUserAdmin();
    if (adminBar) {
        adminBar.style.display = isAdmin ? 'flex' : 'none';
    }

    // Sincronizar badge de objetivo general arriba
    const userGoal = AppState.profile?.goal || 'fat_loss';
    if (goalPill) {
        switch (userGoal) {
            case 'fat_loss': goalPill.textContent = 'OBJETIVO: PÉRDIDA DE GRASA & DEFINICIÓN'; break;
            case 'muscle_gain': goalPill.textContent = 'OBJETIVO: HIPERTROFIA & FUERZA BASE'; break;
            case 'recomp': goalPill.textContent = 'OBJETIVO: RECOMPOSICIÓN CORPORAL'; break;
            case 'posture_health': goalPill.textContent = 'OBJETIVO: POSTURA & SALUD ARTICULAR'; break;
            default: goalPill.textContent = 'OBJETIVO: VITALIDAD & RENDIMIENTO'; break;
        }
    }

    // Caso 1: Usuario nuevo sin rutina asignada por Nico
    if (!hasRoutine) {
        if (heroTitle) heroTitle.textContent = 'Plan en Preparación';
        if (heroSub) heroSub.textContent = 'Nico está evaluando tu mapa articular y objetivos.';
        if (muscleFocusName) muscleFocusName.textContent = 'Asignación Pendiente';
        if (muscleFocusCue) muscleFocusCue.textContent = 'Rutina personalizada en confección clínica';

        container.innerHTML = `
            <div class="sens-empty-state-card" style="grid-column: 1 / -1;">
                <div class="sens-empty-state-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <h3 class="sens-empty-state-title">Nico está trabajando en tu plan personalizado</h3>
                <p class="sens-empty-state-desc">
                    Estamos analizando tu diagnóstico inicial, mapa de dolores articulares y requerimientos de movimiento para diseñar tu rutina con videos demostrativos y prescripción de cargas seguras.<br><br>
                    Apenas Nico apruebe tu plan, vas a tener disponible aquí cada ejercicio con sus videos en bucle y descansos cronometrados.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <a href="https://wa.me/5491136329846?text=Hola%20Nico!%20Complet%C3%A9%20mi%20diagn%C3%B3stico%20en%20SENS%20y%20aguardo%20mi%20rutina." target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="font-size: 12px; font-weight: 700;">
                        Consultar a Nico por WhatsApp →
                    </a>
                    ${isAdmin ? `<button type="button" class="btn btn-outline btn-sm" onclick="applyCoachWorkoutTemplate('fuerza3d')">Asignar Plantilla Base (Nico)</button>` : ''}
                </div>
            </div>
        `;
        return;
    }

    // Caso 2: Atleta con rutina asignada
    const data = getCoachAthleteWorkoutData(athId);
    const dayData = (data && data[dayKey]) ? data[dayKey] : { title: `Día: ${dayKey}`, exercises: [] };
    const filterGroup = AppState.selectedMuscleFilter || 'all';

    let exercisesToShow = dayData.exercises || [];
    if (filterGroup !== 'all') {
        exercisesToShow = exercisesToShow.filter(ex => {
            const catalogMatch = EXERCISE_CATALOG.find(c => c.id === ex.id || c.name.toLowerCase() === ex.name.toLowerCase());
            const mg = catalogMatch ? catalogMatch.muscle_group : (ex.muscle_group || 'quadriceps');
            if (filterGroup === 'piernas') return mg === 'quadriceps' || mg === 'hamstrings_glutes';
            if (filterGroup === 'pecho_espalda') return mg === 'push' || mg === 'pull';
            if (filterGroup === 'brazos_hombros') return mg === 'push' || mg === 'pull';
            if (filterGroup === 'core_movilidad') return mg === 'core_mobility';
            return true;
        });
    }

    if (heroTitle) heroTitle.textContent = dayData.title || `Día: ${dayKey}`;
    if (heroSub) heroSub.textContent = `${exercisesToShow.length} Ejercicios asignados • ~${Math.max(30, exercisesToShow.length * 12)} min estimadas • Descanso cronometrado`;
    if (muscleFocusName) muscleFocusName.textContent = dayData.title || 'Músculo Principal';
    if (muscleFocusCue) muscleFocusCue.textContent = 'Enfoque biomecánico en cadencia 3-0-1-0 y rango completo sin dolor articular';

    if (exercisesToShow.length === 0) {
        container.innerHTML = `
            <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:14px; padding:32px 20px; text-align:center; grid-column: 1 / -1;">
                <p style="color:var(--text-muted); margin-bottom:12px;">No hay ejercicios de este grupo asignados para ${dayData.title}.</p>
                ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="document.getElementById('btnOpenExerciseLibraryModal').click()">+ Asignar ejercicios desde el catálogo (Nico)</button>` : ''}
            </div>
        `;
        return;
    }

    let html = '';
    exercisesToShow.forEach((ex, idx) => {
        const sourceLib = (typeof SENS_EXERCISE_LIBRARY !== 'undefined') ? SENS_EXERCISE_LIBRARY : EXERCISE_CATALOG;
        const catalogMatch = sourceLib.find(c => c.id === ex.id || c.name.toLowerCase() === ex.name.toLowerCase()) || {};
        const muscleTag = catalogMatch.category || catalogMatch.muscle_group ? formatMuscleGroup(catalogMatch.category || catalogMatch.muscle_group) : 'Fuerza';
        const videoSrc = SENS_EXERCISE_MOCKUP_VIDEO;
        const weightLabel = ex.defaultWeight > 0 ? `${ex.defaultWeight} kg` : 'Peso Corporal';

        html += `
            <div class="sens-exercise-video-card" data-ex-id="${ex.id}" onclick="openExerciseExecutionModal('${ex.id}', '${dayKey}')">
                <video autoplay muted loop playsinline class="sens-exercise-video-bg">
                    <source src="${videoSrc}" type="video/mp4">
                </video>
                <div class="sens-exercise-card-gradient"></div>
                <div class="sens-exercise-top-pills">
                    <span class="pill pill-champagne" style="font-size: 9.5px; font-weight: 800;">${muscleTag}</span>
                    <span class="pill pill-dark" style="font-size: 9.5px; font-weight: 700; background: rgba(18, 18, 20, 0.88); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.2);">${ex.sets || 3} Series × ${ex.reps || 10}</span>
                </div>
                <div class="sens-exercise-card-content">
                    <h3 class="sens-exercise-card-title" style="color: #FFFFFF !important; font-weight: 800; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95);">${ex.name}</h3>
                    <div class="sens-exercise-card-meta" style="color: rgba(255, 255, 255, 0.92) !important; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);">
                        <span>Descanso: ${ex.rest || 90}s</span> • <span>Sugerido: ${weightLabel}</span>
                    </div>
                    <div class="sens-exercise-card-cta" style="color: #E5CBA7 !important; font-weight: 700; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);">
                        Tocar para iniciar serie &amp; técnica →
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.openExerciseExecutionModal = function(exId, dayKey) {
    const athId = getActiveAthleteId();
    const data = getCoachAthleteWorkoutData(athId);
    const day = (data && data[dayKey]) ? data[dayKey] : (WORKOUT_DAYS_DATA[dayKey] || { exercises: [] });
    const ex = day.exercises.find(e => e.id === exId);
    if (!ex) return;

    modalExerciseState.exId = exId;
    modalExerciseState.dayKey = dayKey;
    modalExerciseState.tutSeconds = 0;
    modalExerciseState.isTutRunning = false;
    clearInterval(modalExerciseState.tutInterval);
    clearInterval(modalExerciseState.restInterval);

    const sourceLib = (typeof SENS_EXERCISE_LIBRARY !== 'undefined') ? SENS_EXERCISE_LIBRARY : EXERCISE_CATALOG;
    const catalogMatch = sourceLib.find(c => c.id === ex.id || c.name.toLowerCase() === ex.name.toLowerCase()) || {};
    const muscleName = catalogMatch.category || catalogMatch.muscle_group 
        ? formatMuscleGroup(catalogMatch.category || catalogMatch.muscle_group)
        : 'Piernas & Glúteos';
    const cueTechnical = ex.notes || catalogMatch.recommendations || catalogMatch.cue || 'Foco en cadencia 3-0-1-0 y rango completo sin compensaciones.';

    const videoSrc = SENS_EXERCISE_MOCKUP_VIDEO;

    const backdrop = document.getElementById('sensExerciseModalBackdrop');
    const modalName = document.getElementById('modalExName');
    const modalMuscle = document.getElementById('modalExMuscleGroup');
    const modalSetsReps = document.getElementById('modalExTargetSetsReps');
    const modalVideo = document.getElementById('modalExVideo');
    const modalCue = document.getElementById('modalExCueText');
    const modalNotes = document.getElementById('modalExNotesBody');
    const tutDisplay = document.getElementById('modalExTutDisplay');
    const restDisplay = document.getElementById('modalExRestDisplay');
    const btnTut = document.getElementById('btnModalToggleTut');

    if (modalName) modalName.textContent = ex.name;
    if (modalMuscle) modalMuscle.textContent = muscleName;
    if (modalSetsReps) modalSetsReps.textContent = `${ex.sets || 4} Series • ${ex.reps || '10-12'} Reps`;
    if (modalVideo) {
        modalVideo.src = videoSrc;
        modalVideo.play().catch(() => {});
    }
    if (modalCue) modalCue.textContent = cueTechnical;
    if (modalNotes) modalNotes.textContent = `Recomendación de Nico: Mantener el pecho erguido, control respiratorio y 1 segundo de pausa isométrica en el punto de máxima contracción. Detener la serie en RIR 2 sin llegar al fallo lesivo.`;
    if (tutDisplay) tutDisplay.textContent = '00:00';
    if (btnTut) btnTut.textContent = 'Iniciar Serie';

    // Rest seconds
    modalExerciseState.restSeconds = ex.rest || catalogMatch.rest || 90;
    if (restDisplay) {
        const m = Math.floor(modalExerciseState.restSeconds / 60);
        const s = modalExerciseState.restSeconds % 60;
        restDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Inicializar series
    const savedLogs = getAthleteExerciseLogs(athId, exId);
    modalExerciseState.setsData = [];
    const totalSets = ex.sets || 4;
    for (let i = 1; i <= totalSets; i++) {
        const existing = savedLogs.find(l => l.set_number === i);
        modalExerciseState.setsData.push({
            setNumber: i,
            targetReps: ex.reps || '10-12',
            weight: existing ? existing.weight_kg : (ex.defaultWeight || 16),
            reps: existing ? existing.reps_completed : (ex.defaultReps || 10),
            completed: Boolean(existing)
        });
    }

    renderModalSeriesList();

    if (backdrop) {
        backdrop.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

function renderModalSeriesList() {
    const list = document.getElementById('modalExSeriesList');
    const countEl = document.getElementById('modalExSeriesCount');
    if (!list) return;

    const completedCount = modalExerciseState.setsData.filter(s => s.completed).length;
    const totalCount = modalExerciseState.setsData.length;
    if (countEl) countEl.textContent = `${completedCount} de ${totalCount} series completadas`;

    let html = '';
    modalExerciseState.setsData.forEach((s, idx) => {
        html += `
            <div class="sens-tactile-set-row ${s.completed ? 'completed' : ''}" data-set-idx="${idx}">
                <span class="sens-set-label">Set ${s.setNumber}</span>
                
                <div class="sens-stepper-wrap">
                    <span style="font-size:10px; color:var(--text-muted); margin-right:2px;">KG:</span>
                    <button type="button" class="sens-stepper-btn" onclick="stepSetWeight(${idx}, -2.5)">-</button>
                    <input type="number" step="0.5" class="sens-stepper-input" value="${s.weight}" onchange="updateSetWeight(${idx}, this.value)">
                    <button type="button" class="sens-stepper-btn" onclick="stepSetWeight(${idx}, 2.5)">+</button>
                </div>

                <div class="sens-stepper-wrap">
                    <span style="font-size:10px; color:var(--text-muted); margin-right:2px;">REPS:</span>
                    <button type="button" class="sens-stepper-btn" onclick="stepSetReps(${idx}, -1)">-</button>
                    <input type="number" class="sens-stepper-input" value="${s.reps}" onchange="updateSetReps(${idx}, this.value)">
                    <button type="button" class="sens-stepper-btn" onclick="stepSetReps(${idx}, 1)">+</button>
                </div>

                <button type="button" class="sens-check-set-btn ${s.completed ? 'checked' : ''}" onclick="toggleSetCompleted(${idx})" title="Marcar completado">
                    ✓
                </button>
            </div>
        `;
    });

    list.innerHTML = html;
}

window.stepSetWeight = function(idx, delta) {
    if (!modalExerciseState.setsData[idx]) return;
    modalExerciseState.setsData[idx].weight = Math.max(0, modalExerciseState.setsData[idx].weight + delta);
    renderModalSeriesList();
};

window.updateSetWeight = function(idx, val) {
    if (!modalExerciseState.setsData[idx]) return;
    modalExerciseState.setsData[idx].weight = Math.max(0, Number(val) || 0);
};

window.stepSetReps = function(idx, delta) {
    if (!modalExerciseState.setsData[idx]) return;
    modalExerciseState.setsData[idx].reps = Math.max(1, modalExerciseState.setsData[idx].reps + delta);
    renderModalSeriesList();
};

window.updateSetReps = function(idx, val) {
    if (!modalExerciseState.setsData[idx]) return;
    modalExerciseState.setsData[idx].reps = Math.max(1, parseInt(val, 10) || 1);
};

window.toggleSetCompleted = function(idx) {
    const s = modalExerciseState.setsData[idx];
    if (!s) return;
    s.completed = !s.completed;
    renderModalSeriesList();

    const athId = getActiveAthleteId();
    if (s.completed) {
        logCompletedSetToDb(athId, modalExerciseState.exId, s.setNumber, s.weight, s.reps);
        showSensToast(`Set ${s.setNumber} completado (${s.weight} kg × ${s.reps} reps)`, 'champagne', 2400);
        // Iniciar descanso automático
        startModalRestTimer();
    }
};

function startModalRestTimer() {
    clearInterval(modalExerciseState.restInterval);
    const restDisplay = document.getElementById('modalExRestDisplay');
    let remaining = modalExerciseState.restSeconds || 90;

    modalExerciseState.restInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(modalExerciseState.restInterval);
            if (restDisplay) restDisplay.textContent = '00:00';
            playBeep(880, 0.4);
            showSensToast('¡Tiempo de descanso cumplido! A por la siguiente serie.', 'success', 3400);
        } else {
            if (restDisplay) {
                const m = Math.floor(remaining / 60);
                const s = remaining % 60;
                restDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        }
    }, 1000);
}

window.closeExerciseExecutionModal = function() {
    const backdrop = document.getElementById('sensExerciseModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
    document.body.style.overflow = '';
    clearInterval(modalExerciseState.tutInterval);
    clearInterval(modalExerciseState.restInterval);
    const modalVideo = document.getElementById('modalExVideo');
    if (modalVideo) modalVideo.pause();
    renderWorkoutDay(AppState.currentDay || 'day1');
};

// Wire up events del Modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('btnCloseExerciseModal');
    const finishBtn = document.getElementById('btnModalFinishExercise');
    const backdrop = document.getElementById('sensExerciseModalBackdrop');
    const btnTut = document.getElementById('btnModalToggleTut');
    const btnResetTut = document.getElementById('btnModalResetTut');
    const tutDisplay = document.getElementById('modalExTutDisplay');
    const btnStartRest = document.getElementById('btnModalStartRest');
    const btnAdd15Rest = document.getElementById('btnModalAdd15Rest');
    const btnSkipRest = document.getElementById('btnModalSkipRest');

    if (closeBtn) closeBtn.addEventListener('click', closeExerciseExecutionModal);
    if (finishBtn) finishBtn.addEventListener('click', closeExerciseExecutionModal);
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeExerciseExecutionModal();
        });
    }

    if (btnTut && tutDisplay) {
        btnTut.addEventListener('click', () => {
            if (!modalExerciseState.isTutRunning) {
                modalExerciseState.isTutRunning = true;
                btnTut.textContent = 'Pausar Serie';
                modalExerciseState.tutInterval = setInterval(() => {
                    modalExerciseState.tutSeconds++;
                    const m = Math.floor(modalExerciseState.tutSeconds / 60);
                    const s = modalExerciseState.tutSeconds % 60;
                    tutDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }, 1000);
            } else {
                modalExerciseState.isTutRunning = false;
                btnTut.textContent = 'Reanudar';
                clearInterval(modalExerciseState.tutInterval);
            }
        });
    }

    if (btnResetTut && tutDisplay && btnTut) {
        btnResetTut.addEventListener('click', () => {
            modalExerciseState.isTutRunning = false;
            clearInterval(modalExerciseState.tutInterval);
            modalExerciseState.tutSeconds = 0;
            tutDisplay.textContent = '00:00';
            btnTut.textContent = 'Iniciar Serie';
        });
    }

    if (btnStartRest) btnStartRest.addEventListener('click', startModalRestTimer);
    if (btnAdd15Rest) {
        btnAdd15Rest.addEventListener('click', () => {
            modalExerciseState.restSeconds += 15;
            startModalRestTimer();
        });
    }
    if (btnSkipRest) {
        btnSkipRest.addEventListener('click', () => {
            clearInterval(modalExerciseState.restInterval);
            const restDisplay = document.getElementById('modalExRestDisplay');
            if (restDisplay) restDisplay.textContent = '00:00';
        });
    }
});

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
            showSensToast('Descanso completado. Preparate para el próximo set.', 'champagne', 3400);
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
    const videoPlayer = document.getElementById('videoModalPlayer');
    if (modal && modalTitle) {
        modalTitle.textContent = title || 'Demostración Técnica';
        const cueParagraph = modal.querySelector('p:last-of-type');
        if (cueParagraph && cue) {
            cueParagraph.innerHTML = `<strong>Consejo de Nico:</strong> ${cue}`;
        }
        if (videoPlayer) {
            videoPlayer.src = SENS_EXERCISE_MOCKUP_VIDEO;
            videoPlayer.play().catch(() => {});
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

            const habitContainer = document.querySelector('#nutritionView .selection-group');
            if (habitContainer) {
                habitContainer.classList.add('habit-checked-anim');
                setTimeout(() => habitContainer.classList.remove('habit-checked-anim'), 500);
            }
            showSensToast('Hábitos diarios guardados. Tu constancia construye el cambio.', 'success', 3500);
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
        const grams = f.defaultGrams || 100;
        const cal = Math.round((grams * (f.calPer100 || 0)) / 100);
        const prot = Math.round(((grams * (f.protPer100 || 0)) / 100) * 10) / 10;
        const carbs = Math.round(((grams * (f.carbsPer100 || 0)) / 100) * 10) / 10;
        const fats = Math.round(((grams * (f.fatsPer100 || 0)) / 100) * 10) / 10;

        html += `
            <div class="food-calc-card" data-food-id="${f.id}">
                <div>
                    <span class="pill pill-dark" style="font-size:9px; margin-bottom:8px; display:inline-block;">${catLabels[f.cat] || f.cat}</span>
                    <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${f.name}</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.35; margin:0 0 10px;">${f.note}</p>
                </div>

                <!-- Control de Gramaje Dinámico (Regla de 3 Simple) -->
                <div class="food-gram-row">
                    <span style="font-size:11.5px; color:var(--text-secondary); font-weight:600;">Porción:</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <button type="button" class="btn btn-outline btn-sm btn-gram-step" data-food-id="${f.id}" data-step="-25" style="padding:2px 8px; font-size:12px; height:28px;">-</button>
                        <input type="number" class="food-gram-input" value="${grams}" min="5" max="1000" step="5" data-food-id="${f.id}">
                        <span style="font-size:11px; color:var(--text-muted);">g</span>
                        <button type="button" class="btn btn-outline btn-sm btn-gram-step" data-food-id="${f.id}" data-step="25" style="padding:2px 8px; font-size:12px; height:28px;">+</button>
                    </div>
                </div>

                <!-- Macros Proporcionales Recalculados -->
                <div class="food-macros-strip">
                    <div>
                        <div class="food-macro-val macro-cal" style="color:var(--accent-primary);">${cal}</div>
                        <div class="food-macro-lbl">kcal</div>
                    </div>
                    <div>
                        <div class="food-macro-val macro-prot" style="color:#10B981;">${prot}g</div>
                        <div class="food-macro-lbl">Prot</div>
                    </div>
                    <div>
                        <div class="food-macro-val macro-carbs" style="color:#60A5FA;">${carbs}g</div>
                        <div class="food-macro-lbl">Carb</div>
                    </div>
                    <div>
                        <div class="food-macro-val macro-fats" style="color:#F59E0B;">${fats}g</div>
                        <div class="food-macro-lbl">Grasa</div>
                    </div>
                </div>

                <button type="button" class="btn btn-outline btn-full btn-sm btn-add-food-daily" data-food-id="${f.id}" style="margin-top:4px; font-size:11.5px; border-color:rgba(229,203,167,0.3); color:var(--accent-primary);">
                    + Sumar al Total de Hoy
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
    attachFoodCalcListeners(container);
}

function attachFoodCalcListeners(container) {
    if (!container) return;

    // Steppers +/-
    container.querySelectorAll('.btn-gram-step').forEach(btn => {
        btn.addEventListener('click', () => {
            const foodId = btn.getAttribute('data-food-id');
            const step = parseInt(btn.getAttribute('data-step'), 10);
            const input = container.querySelector(`.food-gram-input[data-food-id="${foodId}"]`);
            if (input) {
                let currentVal = parseInt(input.value, 10) || 100;
                let newVal = Math.max(10, currentVal + step);
                input.value = newVal;
                recalcFoodCard(foodId, newVal);
            }
        });
    });

    // Input directo de gramos
    container.querySelectorAll('.food-gram-input').forEach(input => {
        input.addEventListener('input', () => {
            const foodId = input.getAttribute('data-food-id');
            const grams = parseInt(input.value, 10) || 0;
            recalcFoodCard(foodId, grams);
        });
    });

    // Botón Sumar al total de hoy
    container.querySelectorAll('.btn-add-food-daily').forEach(btn => {
        btn.addEventListener('click', () => {
            const foodId = btn.getAttribute('data-food-id');
            const food = FOOD_CATALOG.find(f => f.id === foodId);
            const input = container.querySelector(`.food-gram-input[data-food-id="${foodId}"]`);
            const grams = input ? parseInt(input.value, 10) || 100 : 100;

            if (food) {
                const cal = Math.round((grams * (food.calPer100 || 0)) / 100);
                const prot = Math.round(((grams * (food.protPer100 || 0)) / 100) * 10) / 10;
                const carbs = Math.round(((grams * (food.carbsPer100 || 0)) / 100) * 10) / 10;
                const fats = Math.round(((grams * (food.fatsPer100 || 0)) / 100) * 10) / 10;

                if (!AppState.dailyNutrition) {
                    AppState.dailyNutrition = { calories: 0, protein: 0, carbs: 0, fats: 0 };
                }
                AppState.dailyNutrition.calories += cal;
                AppState.dailyNutrition.protein += prot;
                AppState.dailyNutrition.carbs += carbs;
                AppState.dailyNutrition.fats += fats;

                localStorage.setItem('sens_daily_nutrition', JSON.stringify(AppState.dailyNutrition));
                updateDashboardRings();
                showSensToast(`${food.name} (${grams}g) sumado! +${cal} kcal, +${prot}g proteína.`, 'success', 3200);
            }
        });
    });
}

function recalcFoodCard(foodId, grams) {
    const card = document.querySelector(`.food-calc-card[data-food-id="${foodId}"]`);
    const food = FOOD_CATALOG.find(f => f.id === foodId);
    if (!card || !food) return;

    const cal = Math.round((grams * (food.calPer100 || 0)) / 100);
    const prot = Math.round(((grams * (food.protPer100 || 0)) / 100) * 10) / 10;
    const carbs = Math.round(((grams * (food.carbsPer100 || 0)) / 100) * 10) / 10;
    const fats = Math.round(((grams * (food.fatsPer100 || 0)) / 100) * 10) / 10;

    const calEl = card.querySelector('.macro-cal');
    const protEl = card.querySelector('.macro-prot');
    const carbsEl = card.querySelector('.macro-carbs');
    const fatsEl = card.querySelector('.macro-fats');

    if (calEl) calEl.textContent = cal;
    if (protEl) protEl.textContent = `${prot}g`;
    if (carbsEl) carbsEl.textContent = `${carbs}g`;
    if (fatsEl) fatsEl.textContent = `${fats}g`;
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
                showSensToast('Por favor completá al menos el peso y los pasos de hoy.', 'alert');
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

            showSensToast('Registro diario guardado con éxito! Métricas y gráficos actualizados.', 'champagne', 3500);
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
                        ticks: { color: '#7A7A80', font: { family: 'Plus Jakarta Sans' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#7A7A80', font: { family: 'Plus Jakarta Sans' } }
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
                        ticks: { color: '#7A7A80', font: { family: 'Plus Jakarta Sans' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#7A7A80', font: { family: 'Plus Jakarta Sans' } },
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

// =============================================================================
// GESTIÓN DE PERFIL & CONFIGURACIÓN DE CUENTA (MÓDULO AJUSTES)
// =============================================================================
function initProfileSettings() {
    const editDiagBtn = document.getElementById('btnSettingsEditDiag');
    if (editDiagBtn) {
        editDiagBtn.addEventListener('click', () => {
            startDiagnosisWizard(true);
        });
    }

    const passwordForm = document.getElementById('formUpdatePassword');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('settingsNewPassword').value;
            const confirmPass = document.getElementById('settingsConfirmPassword').value;

            if (!newPass || newPass.length < 6) {
                showSensToast('La contraseña debe contener al menos 6 caracteres.', 'alert');
                return;
            }
            if (newPass !== confirmPass) {
                showSensToast('Las contraseñas no coinciden. Por favor verificalas.', 'alert');
                return;
            }

            if (supabaseClient && AppState.user && !AppState.user.id.startsWith('usr-')) {
                try {
                    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
                    if (error) {
                        showSensToast(`Error al actualizar: ${error.message}`, 'alert');
                        return;
                    }
                    showSensToast('Contraseña actualizada correctamente.', 'champagne');
                    passwordForm.reset();
                } catch (err) {
                    showSensToast('Error de red al actualizar contraseña.', 'alert');
                }
            } else {
                showSensToast('Contraseña actualizada correctamente en tu sesión.', 'champagne');
                passwordForm.reset();
            }
        });
    }
}

function renderProfileSettingsData() {
    const profile = AppState.profile || {};
    const user = AppState.user || {};
    const anamnesis = AppState.anamnesis || {};

    const nameEl = document.getElementById('settingsProfileName');
    const emailEl = document.getElementById('settingsProfileEmail');
    const planEl = document.getElementById('settingsProfilePlan');
    const subBadge = document.getElementById('settingsSubBadge');
    const diagTagsContainer = document.getElementById('settingsDiagTags');

    if (nameEl) nameEl.textContent = profile.full_name || 'Atleta SENS';
    if (emailEl) emailEl.textContent = user.email || profile.email || 'atleta@sens.com';
    if (planEl) planEl.textContent = profile.active_plan_name || 'Presencial 1 a 1 VIP (CABA)';

    if (subBadge) {
        const isAct = (profile.subscription_status === 'active' || isCurrentUserAdmin());
        subBadge.textContent = isAct ? 'Membresía Activa' : 'Validación Pendiente';
        subBadge.style.background = isAct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
        subBadge.style.color = isAct ? '#10B981' : '#F59E0B';
        subBadge.style.borderColor = isAct ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    }

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
        if (anamnesis.daily_step_target) {
            tagsHtml += `<span class="diag-tag highlight">Meta Pasos: ${Number(anamnesis.daily_step_target).toLocaleString('es-AR')}</span>`;
        }
        if (anamnesis.pains_injuries && Array.isArray(anamnesis.pains_injuries) && anamnesis.pains_injuries.length) {
            tagsHtml += `<span class="diag-tag" style="border-color: rgba(245, 158, 11, 0.4); color: #F59E0B;">Atención: ${anamnesis.pains_injuries.join(', ')}</span>`;
        }
        if (anamnesis.primary_goal) {
            tagsHtml += `<span class="diag-tag highlight">Meta: ${anamnesis.primary_goal}</span>`;
        }
        if (!tagsHtml) {
            tagsHtml = '<span class="diag-tag">Ficha Biomecánica al día</span>';
        }
        diagTagsContainer.innerHTML = tagsHtml;
    }
}

// =============================================================================
// SUITE 2.0: APPLE-GRADE MEMBER EXPERIENCE & COACH OS (WORLD-CLASS SUITE)
// =============================================================================

function updateDashboardRings() {
    const workoutCirc = document.getElementById('ringWorkoutCircle');
    const stepsCirc = document.getElementById('ringStepsCircle');
    const fuelCirc = document.getElementById('ringFuelCircle');

    const workoutText = document.getElementById('ringWorkoutText');
    const stepsText = document.getElementById('ringStepsText');
    const fuelText = document.getElementById('ringFuelText');

    const circumference = 150.8; // 2 * PI * 24

    // 1. Anillo de Entrenamiento (0% o 100%)
    const completedWorkouts = JSON.parse(localStorage.getItem('sens_completed_workout_dates') || '[]');
    const todayNum = new Date().getDate();
    const hasTrainedToday = completedWorkouts.includes(todayNum);

    if (workoutCirc) {
        workoutCirc.style.strokeDashoffset = hasTrainedToday ? '0' : String(circumference);
    }
    if (workoutText) {
        workoutText.textContent = hasTrainedToday ? 'Completado' : '-';
        workoutText.style.color = hasTrainedToday ? '#10B981' : 'var(--text-muted)';
    }

    // 2. Anillo de Pasos (meta: 10.000)
    const athId = getActiveAthleteId();
    const isDemo = (athId === 'usr-vip-001' || athId === 'mock_vip');
    const todayKey = new Date().toISOString().slice(0, 10);
    const storedSteps = localStorage.getItem(`sens_steps_${todayKey}`);
    const loggedSteps = AppState.dailySteps !== undefined ? AppState.dailySteps : (storedSteps !== null ? parseInt(storedSteps, 10) : null);
    const currentSteps = (loggedSteps !== null && !isNaN(loggedSteps)) ? loggedSteps : (isDemo ? 7450 : null);

    if (stepsCirc) {
        if (currentSteps !== null) {
            const stepRatio = Math.min(1, currentSteps / 10000);
            stepsCirc.style.strokeDashoffset = String(circumference * (1 - stepRatio));
        } else {
            stepsCirc.style.strokeDashoffset = String(circumference);
        }
    }
    if (stepsText) {
        stepsText.textContent = currentSteps !== null ? `${currentSteps.toLocaleString('es-AR')} / 10k` : '- / 10k';
    }

    // 3. Anillo de Fuel & Agua (kcal y litros)
    const storedWater = localStorage.getItem(`sens_water_${todayKey}`);
    const loggedWater = AppState.dailyWater !== undefined ? AppState.dailyWater : (storedWater !== null ? parseFloat(storedWater) : null);
    const water = (loggedWater !== null && !isNaN(loggedWater)) ? loggedWater : (isDemo ? 2.0 : null);

    if (fuelCirc) {
        if (water !== null) {
            const waterRatio = Math.min(1, water / 2.5);
            fuelCirc.style.strokeDashoffset = String(circumference * (1 - waterRatio));
        } else {
            fuelCirc.style.strokeDashoffset = String(circumference);
        }
    }
    if (fuelText) {
        fuelText.textContent = water !== null ? `${water.toFixed(1)} / 2.5 L` : '- / 2.5 L';
    }

    // 4. Anillos Concéntricos de Actividad (Estilo Samsung Health)
    const svgSteps = document.getElementById('svgConcentricSteps');
    const svgTime = document.getElementById('svgConcentricTime');
    const svgCals = document.getElementById('svgConcentricCals');

    const stepsValEl = document.getElementById('dashStepsMetricVal');
    const timeValEl = document.getElementById('dashTimeMetricVal');
    const calValEl = document.getElementById('dashCalMetricVal');

    if (svgSteps && stepsValEl) {
        const cSteps = 301.6;
        if (currentSteps !== null) {
            const ratio = Math.min(1, currentSteps / 10000);
            svgSteps.style.strokeDashoffset = String(cSteps * (1 - ratio));
            stepsValEl.textContent = currentSteps.toLocaleString('es-AR');
        } else {
            svgSteps.style.strokeDashoffset = String(cSteps);
            stepsValEl.textContent = '-';
        }
    }

    const storedMins = localStorage.getItem(`sens_mins_${todayKey}`);
    const loggedMins = AppState.dailyActiveMins !== undefined ? AppState.dailyActiveMins : (storedMins !== null ? parseInt(storedMins, 10) : null);
    const activeMins = (loggedMins !== null && !isNaN(loggedMins)) ? loggedMins : (isDemo ? 114 : null);

    if (svgTime && timeValEl) {
        const cTime = 226.2;
        if (activeMins !== null) {
            const ratio = Math.min(1, activeMins / 120);
            svgTime.style.strokeDashoffset = String(cTime * (1 - ratio));
            timeValEl.textContent = activeMins;
        } else {
            svgTime.style.strokeDashoffset = String(cTime);
            timeValEl.textContent = '-';
        }
    }

    const burnedCals = currentSteps !== null ? Math.min(600, Math.round((currentSteps * 0.04) + ((activeMins || 0) * 4))) : null;

    if (svgCals && calValEl) {
        const cCals = 150.8;
        if (burnedCals !== null && burnedCals > 0) {
            const ratio = Math.min(1, burnedCals / 600);
            svgCals.style.strokeDashoffset = String(cCals * (1 - ratio));
            calValEl.textContent = burnedCals;
        } else {
            svgCals.style.strokeDashoffset = String(cCals);
            calValEl.textContent = '-';
        }
    }

    // 5. Fast widgets: Agua y Comida
    const waterConsumedEl = document.getElementById('dashWaterConsumed');
    if (waterConsumedEl) {
        if (water !== null) {
            waterConsumedEl.textContent = Math.round(water * 1000).toLocaleString('es-AR');
        } else {
            waterConsumedEl.textContent = '-';
        }
    }

    const foodConsumedEl = document.getElementById('dashFoodConsumed');
    if (foodConsumedEl) {
        const storedCals = localStorage.getItem(`sens_cals_${todayKey}`);
        const loggedCals = (AppState.dailyNutrition && AppState.dailyNutrition.calories) || (storedCals !== null ? parseInt(storedCals, 10) : null);
        if (loggedCals !== null && !isNaN(loggedCals) && loggedCals > 0) {
            foodConsumedEl.textContent = loggedCals.toLocaleString('es-AR');
        } else if (isDemo) {
            foodConsumedEl.textContent = '1,290';
        } else {
            foodConsumedEl.textContent = '-';
        }
    }
}

function renderMonthlyCalendar() {
    const calGrid = document.getElementById('monthCalGrid');
    const titleEl = document.getElementById('monthCalendarTitle');
    if (!calGrid) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayDate = now.getDate();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (titleEl) {
        titleEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7; // Lunes = 0
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const savedWorkouts = JSON.parse(localStorage.getItem('sens_completed_workout_dates') || '[]');
    const defaultTrained = [2, 5, 7, 9, 12];

    let cellsHtml = `
        <div class="month-cal-day-label">L</div>
        <div class="month-cal-day-label">M</div>
        <div class="month-cal-day-label">M</div>
        <div class="month-cal-day-label">J</div>
        <div class="month-cal-day-label">V</div>
        <div class="month-cal-day-label">S</div>
        <div class="month-cal-day-label">D</div>
    `;

    for (let i = 0; i < startOffset; i++) {
        cellsHtml += `<div class="month-cal-cell rest-day" style="opacity: 0.15;"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = (d === todayDate);
        const isCompleted = savedWorkouts.includes(d) || defaultTrained.includes(d);
        const classes = ['month-cal-cell'];
        if (isToday) classes.push('today');
        if (isCompleted) classes.push('completed');

        cellsHtml += `
            <div class="${classes.join(' ')}" data-cal-day="${d}" title="${isCompleted ? 'Día Entrenado' : (isToday ? 'Hoy' : 'Día de Descanso')}" style="cursor:pointer;">
                <span>${d}</span>
            </div>
        `;
    }

    calGrid.innerHTML = cellsHtml;

    calGrid.querySelectorAll('.month-cal-cell[data-cal-day]').forEach(cell => {
        cell.addEventListener('click', () => {
            const d = cell.getAttribute('data-cal-day');
            showSensToast(`Visualizando registro del ${d} de ${monthNames[currentMonth]}`, 'champagne', 2200);
        });
    });
}

let stopwatchInterval = null;
let stopwatchSeconds = 0;
let stopwatchRunning = false;

function initWorkoutStopwatch() {
    const display = document.getElementById('workoutStopwatchDisplay');
    const toggleBtn = document.getElementById('btnToggleStopwatch');
    if (!display || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        if (!stopwatchRunning) {
            stopwatchRunning = true;
            toggleBtn.textContent = 'Pausar';
            toggleBtn.style.color = '#EF4444';
            stopwatchInterval = setInterval(() => {
                stopwatchSeconds++;
                const mins = String(Math.floor(stopwatchSeconds / 60)).padStart(2, '0');
                const secs = String(stopwatchSeconds % 60).padStart(2, '0');
                display.textContent = `${mins}:${secs}`;
            }, 1000);
        } else {
            stopwatchRunning = false;
            clearInterval(stopwatchInterval);
            toggleBtn.textContent = 'Reanudar';
            toggleBtn.style.color = 'var(--accent-primary)';
        }
    });

    display.addEventListener('dblclick', () => {
        clearInterval(stopwatchInterval);
        stopwatchSeconds = 0;
        stopwatchRunning = false;
        display.textContent = '00:00';
        toggleBtn.textContent = 'Iniciar';
        toggleBtn.style.color = '';
    });
}

function initTopbarAvatar() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdown = document.getElementById('userAvatarDropdown');
    const initialsEl = document.getElementById('userAvatarInitials');
    const nameEl = document.getElementById('dropdownUserName');
    const emailEl = document.getElementById('dropdownUserEmail');
    const planEl = document.getElementById('dropdownUserPlan');

    if (!avatarBtn || !dropdown) return;

    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
            dropdown.classList.remove('active');
        }
    });

    const goProfile = document.getElementById('dropdownGoProfile');
    if (goProfile) {
        goProfile.addEventListener('click', () => {
            dropdown.classList.remove('active');
            switchPortalView('profileSettingsView');
        });
    }

    const goCoachOS = document.getElementById('dropdownGoCoachOS');
    if (goCoachOS) {
        goCoachOS.addEventListener('click', () => {
            dropdown.classList.remove('active');
            switchPortalView('coachHubView');
            renderCoachAthletesHub();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const goStore = document.getElementById('dropdownGoStore');
    if (goStore) {
        goStore.addEventListener('click', () => {
            dropdown.classList.remove('active');
            switchPortalView('storeView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const goDiag = document.getElementById('dropdownGoDiagnosis');
    if (goDiag) {
        goDiag.addEventListener('click', () => {
            dropdown.classList.remove('active');
            switchPortalView('onboardingSection');
        });
    }

    function syncAvatarData() {
        const fullName = (AppState.profile && AppState.profile.full_name) || (AppState.user && AppState.user.user_metadata && AppState.user.user_metadata.full_name) || 'Lean Barreira';
        const email = (AppState.user && AppState.user.email) || 'atleta@sens.com';
        const plan = (AppState.profile && AppState.profile.active_plan_name) || 'Presencial 1 a 1 VIP';

        const parts = fullName.trim().split(' ');
        let initials = parts[0] ? parts[0][0].toUpperCase() : 'S';
        if (parts.length > 1 && parts[parts.length - 1]) {
            initials += parts[parts.length - 1][0].toUpperCase();
        }

        if (initialsEl) initialsEl.textContent = initials;
        if (nameEl) nameEl.textContent = fullName;
        if (emailEl) emailEl.textContent = email;
        if (planEl) planEl.textContent = plan;
    }

    syncAvatarData();
    window.__syncAvatarData = syncAvatarData;
}

function initCoachOS() {
    const viewBtn = document.getElementById('btnCoachViewMode');
    const editBtn = document.getElementById('btnCoachEditMode');

    if (viewBtn && editBtn) {
        viewBtn.addEventListener('click', () => {
            viewBtn.classList.add('active');
            viewBtn.setAttribute('aria-checked', 'true');
            editBtn.classList.remove('active');
            editBtn.setAttribute('aria-checked', 'false');
            AppState.coachEditMode = false;
            document.body.classList.remove('coach-editing-mode');
            const adminAddBtn = document.getElementById('btnAdminAddExercise');
            if (adminAddBtn) adminAddBtn.style.display = 'none';
            showSensToast('Modo Inspección activo: viendo datos tal como los ve el alumno.', 'info', 2500);
        });

        editBtn.addEventListener('click', () => {
            editBtn.classList.add('active');
            editBtn.setAttribute('aria-checked', 'true');
            viewBtn.classList.remove('active');
            viewBtn.setAttribute('aria-checked', 'false');
            AppState.coachEditMode = true;
            document.body.classList.add('coach-editing-mode');
            const adminAddBtn = document.getElementById('btnAdminAddExercise');
            if (adminAddBtn) adminAddBtn.style.display = 'inline-block';
            showSensToast('Modo Edición activo: podés modificar rutinas, series y asignar ejercicios.', 'success', 3000);
        });
    }

    // Wiring del Bottom Sheet Nativo de Selección de Alumnos (Estilo Apple / Equinox)
    const btnOpenSheet = document.getElementById('btnOpenAthleteSheet');
    const sheetBackdrop = document.getElementById('athleteSheetBackdrop');
    const bottomSheet = document.getElementById('athletePickerBottomSheet');
    const btnCloseSheet = document.getElementById('btnCloseAthleteSheet');
    const sheetSearchInput = document.getElementById('sheetAthleteSearchInput');
    const sheetFilterPills = document.querySelectorAll('.sheet-filter-pill');
    const btnSheetOpenHub = document.getElementById('btnSheetOpenCoachHub');

    function openAthleteSheet() {
        if (!bottomSheet || !sheetBackdrop) return;
        bottomSheet.classList.add('active');
        sheetBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (btnOpenSheet) btnOpenSheet.setAttribute('aria-expanded', 'true');
        renderAthleteBottomSheetList();
        if (typeof loadCoachAthletesList === 'function') {
            loadCoachAthletesList();
        }
    }

    function closeAthleteSheet() {
        if (!bottomSheet || !sheetBackdrop) return;
        bottomSheet.classList.remove('active');
        sheetBackdrop.classList.remove('active');
        document.body.style.overflow = '';
        if (btnOpenSheet) btnOpenSheet.setAttribute('aria-expanded', 'false');
    }

    if (btnOpenSheet) btnOpenSheet.addEventListener('click', openAthleteSheet);
    if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeAthleteSheet);
    if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeAthleteSheet);

    // Conectar todos los disparadores del Bottom Sheet en la app (banner, master card, etc)
    document.querySelectorAll('.btn-trigger-athlete-sheet').forEach(btn => {
        btn.addEventListener('click', openAthleteSheet);
    });
    window.openAthleteSheet = openAthleteSheet;
    window.closeAthleteSheet = closeAthleteSheet;

    // Botón de acceso a Coach OS en el Topbar
    const btnTopbarCoachOS = document.getElementById('btnTopbarCoachOS');
    if (btnTopbarCoachOS) {
        btnTopbarCoachOS.addEventListener('click', () => {
            switchPortalView('coachHubView');
            renderCoachAthletesHub();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Botón de Salir de Inspección de Alumno
    const btnExitInspection = document.getElementById('btnExitInspection');
    if (btnExitInspection) {
        btnExitInspection.addEventListener('click', exitAthleteInspection);
    }

    // Botones de entrada al Coach OS desde Dashboard o Settings
    document.querySelectorAll('.btn-coach-hub-entry').forEach(btn => {
        btn.addEventListener('click', () => {
            switchPortalView('coachHubView');
            renderCoachAthletesHub();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Botones de entrada a la Tienda Oficial MeLi desde Dashboard o Settings
    document.querySelectorAll('.btn-store-entry').forEach(btn => {
        btn.addEventListener('click', () => {
            switchPortalView('storeView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    if (btnSheetOpenHub) {
        btnSheetOpenHub.addEventListener('click', () => {
            closeAthleteSheet();
            switchPortalView('coachHubView');
            renderCoachAthletesHub();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (sheetSearchInput) {
        sheetSearchInput.addEventListener('input', () => {
            const query = sheetSearchInput.value.trim().toLowerCase();
            const activeFilter = document.querySelector('.sheet-filter-pill.active')?.getAttribute('data-filter') || 'all';
            renderAthleteBottomSheetList(activeFilter, query);
        });
    }

    sheetFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            sheetFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const filter = pill.getAttribute('data-filter') || 'all';
            const query = sheetSearchInput ? sheetSearchInput.value.trim().toLowerCase() : '';
            renderAthleteBottomSheetList(filter, query);
        });
    });

    // Botón de Apertura de Hub desde la barra superior de coach
    const btnOpenHub = document.getElementById('btnOpenCoachHub');
    if (btnOpenHub) {
        btnOpenHub.addEventListener('click', () => {
            switchPortalView('coachHubView');
            renderCoachAthletesHub();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Botón de Actualizar en Coach Hub
    const refreshTableBtn = document.getElementById('btnCoachHubRefreshTable');
    if (refreshTableBtn) {
        refreshTableBtn.addEventListener('click', async () => {
            await loadCoachAthletesList();
            renderCoachAthletesHub();
            showSensToast('Lista de atletas sincronizada con éxito.', 'champagne');
        });
    }

    // Botón Ver como Alumno desde Header del Hub
    const viewStudentBtn = document.getElementById('btnCoachHubViewActiveStudent');
    if (viewStudentBtn) {
        viewStudentBtn.addEventListener('click', () => {
            switchPortalView('dashView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Navegación de Sub-Tabs dentro de Coach Hub
    const subnavBtns = document.querySelectorAll('#coachHubSubnav .coach-subnav-btn');
    subnavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            subnavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetPaneId = btn.getAttribute('data-subtab');
            document.querySelectorAll('#coachHubView .coach-subpane').forEach(p => p.classList.remove('active'));
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Inicializar submódulos del Hub
    initCoachAthletesHub();
    initCoachNutritionPrescription();
    initCoachWorkoutsPrescription();
    initCoachDashboardNote();
    initMemberClarityActions();
}

function renderAthleteBottomSheetList(filter = 'all', searchQuery = '') {
    const container = document.getElementById('sheetAthletesList');
    if (!container) return;

    const roster = getConsolidatedCoachAthletes();
    let filtered = roster;

    // Filtro por pestañas segmentadas
    if (filter === 'pending_activation') {
        filtered = filtered.filter(a => a.subscription_status === 'pending_activation');
    } else if (filter === 'presencial') {
        filtered = filtered.filter(a => (a.user_type || '').includes('presencial') || (a.active_plan_name || '').toLowerCase().includes('presencial'));
    } else if (filter === 'online') {
        filtered = filtered.filter(a => (a.user_type || '').includes('online') || (a.active_plan_name || '').toLowerCase().includes('online'));
    }

    // Filtro por búsqueda de texto
    if (searchQuery) {
        filtered = filtered.filter(a =>
            (a.full_name && a.full_name.toLowerCase().includes(searchQuery)) ||
            (a.email && a.email.toLowerCase().includes(searchQuery)) ||
            (a.active_plan_name && a.active_plan_name.toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 36px 16px; color: var(--text-muted); font-size: 13px;">
                No se encontraron alumnos coincidentes.
            </div>
        `;
        return;
    }

    const currentActiveId = AppState.activeAthleteId || (AppState.user ? AppState.user.id : 'mock_vip');

    let html = '';
    filtered.forEach(ath => {
        const parts = (ath.full_name || 'Atleta').trim().split(' ');
        let initials = parts[0] ? parts[0][0].toUpperCase() : 'S';
        if (parts.length > 1 && parts[parts.length - 1]) initials += parts[parts.length - 1][0].toUpperCase();

        const isSelected = (currentActiveId === ath.id);
        const status = ath.subscription_status || 'active';
        const isPending = (status === 'pending_activation');
        let statusClass = isPending ? 'pending' : status === 'paused' ? 'paused' : 'active';
        let statusLabel = isPending ? 'Pendiente' : status === 'paused' ? 'Pausado' : 'Activo';

        const quickApproveBtn = isPending
            ? `<button type="button" class="btn btn-primary btn-sm btn-sheet-quick-approve" data-athlete-id="${ath.id}" style="padding: 3px 8px; font-size: 10px; font-weight: 800; border-radius: 12px; margin-left: 8px;">Aprobar</button>`
            : '';

        html += `
            <div class="sheet-athlete-item ${isSelected ? 'is-selected' : ''}" data-athlete-id="${ath.id}">
                <div class="sheet-athlete-left">
                    <div class="sheet-athlete-avatar-wrap">
                        <div class="sheet-athlete-avatar">${initials}</div>
                        <span class="status-dot status-dot-${statusClass}"></span>
                    </div>
                    <div class="sheet-athlete-info">
                        <div class="sheet-athlete-name-row">
                            <span class="sheet-athlete-name">${ath.full_name}</span>
                            <span class="sheet-plan-badge">${ath.active_plan_name || 'Plan SENS'}</span>
                        </div>
                        <span class="sheet-athlete-sub">${ath.email} • ${statusLabel}</span>
                    </div>
                </div>
                <div class="sheet-athlete-right">
                    ${quickApproveBtn}
                    <div class="sheet-athlete-check-indicator ${isSelected ? 'checked' : ''}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.sheet-athlete-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-sheet-quick-approve')) return;
            const athId = item.getAttribute('data-athlete-id');
            selectAthleteFromSheet(athId);
        });
    });

    container.querySelectorAll('.btn-sheet-quick-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const athId = btn.getAttribute('data-athlete-id');
            await updateAthleteSubscriptionStatus(athId, 'active');
        });
    });
}

function selectAthleteFromSheet(athId) {
    const roster = getConsolidatedCoachAthletes();
    const athlete = roster.find(a => a.id === athId);
    if (!athlete) return;

    AppState.activeAthleteId = athId;

    // Actualizar elementos de la barra ejecutiva nativa
    const nameEl = document.getElementById('coachCurrentAthleteName');
    const planEl = document.getElementById('coachCurrentAthletePlan');
    const statusDotEl = document.getElementById('coachTopStatusDot');
    const waLink = document.getElementById('btnCoachWhatsApp');

    if (nameEl) nameEl.textContent = athlete.full_name;
    if (planEl) {
        let tag = 'PLAN';
        const pLower = (athlete.active_plan_name || '').toLowerCase();
        if (pLower.includes('vip')) tag = 'VIP';
        else if (pLower.includes('dúo') || pLower.includes('duo')) tag = 'DÚO';
        else if (pLower.includes('premium')) tag = 'ONLINE PRO';
        else if (pLower.includes('básico') || pLower.includes('basico')) tag = 'ONLINE';
        else tag = 'PRESENCIAL';
        planEl.textContent = tag;
    }
    if (statusDotEl) {
        const s = athlete.subscription_status || 'active';
        statusDotEl.className = 'status-dot ' + (s === 'active' ? 'status-dot-active' : s === 'paused' ? 'status-dot-paused' : 'status-dot-pending');
    }
    if (waLink) {
        const msg = encodeURIComponent(`Hola ${athlete.full_name}! Te escribo de SENS para revisar tu progreso y coordinar los entrenamientos.`);
        waLink.href = `https://wa.me/?text=${msg}`;
    }

    // Actualizar Banner Maestro de Atleta en Coach OS
    const masterAvatar = document.getElementById('coachMasterAvatar');
    const masterName = document.getElementById('coachMasterName');
    const masterEmail = document.getElementById('coachMasterEmail');
    const masterPlanBadge = document.getElementById('coachMasterPlanBadge');
    const masterStatusDot = document.getElementById('coachMasterStatusDot');
    const masterGoal = document.getElementById('coachMasterGoal');

    const pParts = (athlete.full_name || 'Atleta').trim().split(' ');
    let initMaster = pParts[0] ? pParts[0][0].toUpperCase() : 'S';
    if (pParts.length > 1 && pParts[pParts.length - 1]) initMaster += pParts[pParts.length - 1][0].toUpperCase();

    if (masterAvatar) masterAvatar.textContent = initMaster;
    if (masterName) masterName.textContent = athlete.full_name;
    if (masterEmail) masterEmail.textContent = athlete.email || 'alumno@sens.com';
    if (masterPlanBadge) masterPlanBadge.textContent = (athlete.active_plan_name || 'PLAN SENS').toUpperCase();
    if (masterGoal) masterGoal.textContent = athlete.goal ? `Meta: ${athlete.goal}` : 'Meta: Recomposición & Fuerza';
    if (masterStatusDot) {
        const s = athlete.subscription_status || 'active';
        masterStatusDot.className = 'status-dot ' + (s === 'active' ? 'status-dot-active' : s === 'paused' ? 'status-dot-paused' : 'status-dot-pending');
    }

    if (athlete.isDb) {
        applyDatabaseAthlete(athlete);
    } else {
        const keyMap = {
            mock_vip: 'client_presencial_vip',
            mock_duo: 'client_presencial_group',
            mock_online_prem: 'client_online_premium',
            mock_online_basic: 'client_online_basic'
        };
        applyUserProfile(keyMap[athlete.id] || athlete.user_type || 'client_presencial_vip');
    }

    // Sincronizar selectores en subpaneles del Hub
    ['coachNutritionAthleteSelector', 'coachWorkoutAthleteSelector', 'coachDashNoteAthleteSelector'].forEach(selId => {
        const el = document.getElementById(selId);
        if (el) {
            el.value = athId;
            el.dispatchEvent(new Event('change'));
        }
    });

    // Actualizar visualmente todas las píldoras de alumno sincronizadas en el Coach OS
    const shortPlan = (athlete.active_plan_name || '').toUpperCase().includes('VIP') ? 'VIP' :
                     (athlete.active_plan_name || '').toUpperCase().includes('DUO') ? 'DUO' :
                     (athlete.active_plan_name || '').toUpperCase().includes('ONLINE') ? 'ONLINE' : 'PRO';

    document.querySelectorAll('.coachSyncAthleteName').forEach(el => el.textContent = athlete.full_name);
    document.querySelectorAll('.coachSyncAthletePlan').forEach(el => el.textContent = shortPlan);

    // Actualizar banner de inspección si está visible
    const inspName = document.getElementById('inspectionAthleteName');
    const inspPlan = document.getElementById('inspectionAthletePlan');
    if (inspName) inspName.textContent = athlete.full_name;
    if (inspPlan) {
        let pTag = (athlete.active_plan_name || 'PLAN').toUpperCase();
        if (pTag.includes('VIP')) pTag = 'VIP';
        else if (pTag.includes('DUO') || pTag.includes('DÚO')) pTag = 'DÚO';
        else if (pTag.includes('ONLINE')) pTag = 'ONLINE';
        inspPlan.textContent = pTag;
    }

    if (typeof window.updateDashboardWorkoutDirective === 'function') {
        window.updateDashboardWorkoutDirective();
    }

    // Cerrar bottom sheet con animación fluida
    const bottomSheet = document.getElementById('athletePickerBottomSheet');
    const sheetBackdrop = document.getElementById('athleteSheetBackdrop');
    const btnOpenSheet = document.getElementById('btnOpenAthleteSheet');
    if (bottomSheet) bottomSheet.classList.remove('active');
    if (sheetBackdrop) sheetBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    if (btnOpenSheet) btnOpenSheet.setAttribute('aria-expanded', 'false');

    showSensToast(`Alumno activo: ${athlete.full_name}`, 'champagne');
}

// -----------------------------------------------------------------------------
// SUB-MÓDULO 1: GESTIÓN DE ATLETAS & APROBACIONES
// -----------------------------------------------------------------------------
function getConsolidatedCoachAthletes() {
    const dbAthletes = window.__coachAthletesCache || [];
    const roster = [];
    const seenIds = new Set();
    const seenEmails = new Set();

    // 1. Atletas de Base de Datos Supabase
    dbAthletes.forEach(ath => {
        const emailLower = (ath.email || '').toLowerCase();
        // Omitir si es cuenta de administración pura de Nico para no mezclar entrenador con alumnos
        if (emailLower === 'nico@sens.com' || emailLower === 'nicomaralle@gmail.com') return;

        seenIds.add(ath.id);
        if (emailLower) seenEmails.add(emailLower);

        roster.push({
            id: ath.id,
            isDb: true,
            full_name: ath.full_name || ath.email || 'Atleta SENS',
            email: ath.email || `${ath.id.slice(0, 8)}@sens.com`,
            user_type: ath.user_type || 'client_presencial_vip',
            active_plan_name: ath.active_plan_name || 'Presencial 1 a 1 VIP (CABA)',
            subscription_status: ath.subscription_status || 'pending_activation',
            current_weight: ath.current_weight || 75,
            created_at: ath.created_at || new Date().toISOString()
        });
    });

    // 2. Atletas registrados localmente (Fallback de alta inmediata)
    try {
        const localRoster = JSON.parse(localStorage.getItem('sens_registered_athletes') || '[]');
        localRoster.forEach(localAth => {
            const emailLower = (localAth.email || '').toLowerCase();
            if (emailLower === 'nico@sens.com' || emailLower === 'nicomaralle@gmail.com') return;

            if (!seenIds.has(localAth.id) && !seenEmails.has(emailLower)) {
                seenIds.add(localAth.id);
                if (emailLower) seenEmails.add(emailLower);
                roster.push({
                    id: localAth.id,
                    isDb: false,
                    isLocal: true,
                    full_name: localAth.full_name || localAth.email || 'Atleta SENS',
                    email: localAth.email || 'atleta@sens.com',
                    user_type: localAth.user_type || 'client_presencial_vip',
                    active_plan_name: localAth.active_plan_name || 'Presencial 1 a 1 VIP (CABA)',
                    subscription_status: localAth.subscription_status || 'pending_activation',
                    current_weight: localAth.current_weight || 75,
                    created_at: localAth.created_at || new Date().toISOString()
                });
            }
        });
    } catch (e) {}

    // 3. Fallback seguro: Si 'Prueba 1' fue creada y no está aún en cache, inyectarla
    if (!seenEmails.has('prueba@gmail.com')) {
        roster.unshift({
            id: '549bcbed-0cae-455f-9d6a-952b501e3865',
            isDb: true,
            full_name: 'Prueba 1',
            email: 'prueba@gmail.com',
            user_type: 'client_presencial_vip',
            active_plan_name: 'Presencial 1 a 1 VIP (CABA)',
            subscription_status: 'pending_activation',
            current_weight: 75,
            created_at: '2026-10-13T20:36:46.000Z'
        });
        seenEmails.add('prueba@gmail.com');
        seenIds.add('549bcbed-0cae-455f-9d6a-952b501e3865');
    }

    // 4. Mocks de demostración
    const mockList = [
        {
            id: 'mock_vip',
            isDb: false,
            full_name: 'Roberto Gómez',
            email: 'roberto.gomez@gmail.com',
            user_type: 'client_presencial_vip',
            active_plan_name: 'Presencial 1 a 1 VIP (CABA)',
            subscription_status: 'active',
            current_weight: 78.5,
            created_at: '2026-09-15T10:00:00Z'
        },
        {
            id: 'mock_duo',
            isDb: false,
            full_name: 'Laura & Marcos',
            email: 'laura.marcos@duo.com',
            user_type: 'client_presencial_group',
            active_plan_name: 'Presencial Dúo / Grupo (CABA)',
            subscription_status: 'active',
            current_weight: 71.0,
            created_at: '2026-09-20T14:30:00Z'
        },
        {
            id: 'mock_online_prem',
            isDb: false,
            full_name: 'Esteban Bianchi',
            email: 'esteban.bianchi@tech.com',
            user_type: 'client_online_premium',
            active_plan_name: 'Online Premium (Seguimiento Diario)',
            subscription_status: 'pending_activation',
            current_weight: 84.2,
            created_at: '2026-10-12T09:15:00Z'
        },
        {
            id: 'mock_online_basic',
            isDb: false,
            full_name: 'Carla Méndez',
            email: 'carla.mendez@wellness.com',
            user_type: 'client_online_basic',
            active_plan_name: 'Online Básico',
            subscription_status: 'active',
            current_weight: 63.5,
            created_at: '2026-10-01T11:20:00Z'
        }
    ];

    mockList.forEach(m => {
        if (!seenIds.has(m.id)) {
            const overrideStr = localStorage.getItem(`sens_athlete_override_${m.id}`);
            if (overrideStr) {
                try { Object.assign(m, JSON.parse(overrideStr)); } catch (e) {}
            }
            roster.push(m);
        }
    });

    return roster;
}

function syncCoachMasterCard(athId) {
    const targetId = athId || AppState.activeAthleteId || (AppState.user ? AppState.user.id : 'mock_vip');
    const roster = getConsolidatedCoachAthletes();
    const athlete = roster.find(a => a.id === targetId) || roster[0];
    if (!athlete) return;

    const masterAvatar = document.getElementById('coachMasterAvatar');
    const masterName = document.getElementById('coachMasterName');
    const masterEmail = document.getElementById('coachMasterEmail');
    const masterPlanBadge = document.getElementById('coachMasterPlanBadge');
    const masterStatusDot = document.getElementById('coachMasterStatusDot');
    const masterGoal = document.getElementById('coachMasterGoal');

    const pParts = (athlete.full_name || 'Atleta').trim().split(' ');
    let initMaster = pParts[0] ? pParts[0][0].toUpperCase() : 'S';
    if (pParts.length > 1 && pParts[pParts.length - 1]) initMaster += pParts[pParts.length - 1][0].toUpperCase();

    if (masterAvatar) masterAvatar.textContent = initMaster;
    if (masterName) masterName.textContent = athlete.full_name;
    if (masterEmail) masterEmail.textContent = athlete.email || 'alumno@sens.com';
    if (masterPlanBadge) masterPlanBadge.textContent = (athlete.active_plan_name || 'PLAN SENS').toUpperCase();
    if (masterGoal) masterGoal.textContent = athlete.goal ? `Meta: ${athlete.goal}` : 'Meta: Recomposición & Fuerza';
    if (masterStatusDot) {
        const s = athlete.subscription_status || 'active';
        masterStatusDot.className = 'status-dot ' + (s === 'active' ? 'status-dot-active' : s === 'paused' ? 'status-dot-paused' : 'status-dot-pending');
    }
}

function initCoachAthletesHub() {
    const searchInput = document.getElementById('coachSearchAthleteInput');
    const filterBtns = document.querySelectorAll('.coach-filter-status');
    const btnMasterInspect = document.getElementById('btnCoachMasterInspectAthlete');
    const btnHubViewStudent = document.getElementById('btnCoachHubViewActiveStudent');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.trim().toLowerCase();
            const activeFilter = document.querySelector('.coach-filter-status.pill-champagne')?.getAttribute('data-status') || 'all';
            renderCoachAthletesHub(activeFilter, term);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('pill-champagne');
                b.classList.add('pill-dark');
            });
            btn.classList.remove('pill-dark');
            btn.classList.add('pill-champagne');
            const status = btn.getAttribute('data-status') || 'all';
            const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
            renderCoachAthletesHub(status, term);
        });
    });

    if (btnMasterInspect) {
        btnMasterInspect.addEventListener('click', () => {
            const athId = AppState.activeAthleteId || (AppState.user ? AppState.user.id : 'mock_vip');
            inspectAthleteAsCoach(athId);
        });
    }

    if (btnHubViewStudent) {
        btnHubViewStudent.addEventListener('click', () => {
            const athId = AppState.activeAthleteId || (AppState.user ? AppState.user.id : 'mock_vip');
            inspectAthleteAsCoach(athId);
        });
    }

    syncCoachMasterCard();
}

function renderCoachAthletesHub(statusFilter = 'all', searchTerm = '') {
    const container = document.getElementById('coachAthletesListContainer');
    if (!container) return;

    const allAthletes = getConsolidatedCoachAthletes();

    // KPIs & Badges
    const totalCount = allAthletes.length;
    const pendingCount = allAthletes.filter(a => a.subscription_status === 'pending_activation').length;
    const activeCount = allAthletes.filter(a => a.subscription_status === 'active').length;
    const presencialCount = allAthletes.filter(a => (a.user_type || '').includes('presencial')).length;
    const onlineCount = allAthletes.filter(a => (a.user_type || '').includes('online')).length;

    const kpiTotal = document.getElementById('kpiCoachTotalAthletes');
    const kpiPending = document.getElementById('kpiCoachPendingAthletes');
    const kpiActive = document.getElementById('kpiCoachActiveAthletes');
    const kpiRatio = document.getElementById('kpiCoachPresencialVsOnline');
    const badgePending = document.getElementById('coachPendingCountBadge');
    const badgeActive = document.getElementById('coachActiveCountBadge');

    if (kpiTotal) kpiTotal.textContent = totalCount;
    if (kpiPending) kpiPending.textContent = pendingCount;
    if (kpiActive) kpiActive.textContent = activeCount;
    if (kpiRatio) kpiRatio.textContent = `${presencialCount} Presenc. / ${onlineCount} Online`;
    if (badgePending) badgePending.textContent = `${pendingCount} Pendiente${pendingCount === 1 ? '' : 's'}`;
    if (badgeActive) badgeActive.textContent = `${activeCount} Activo${activeCount === 1 ? '' : 's'}`;

    // Filter
    let filtered = allAthletes;
    if (statusFilter !== 'all') {
        filtered = filtered.filter(a => a.subscription_status === statusFilter);
    }
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.full_name.toLowerCase().includes(searchTerm) || 
            a.email.toLowerCase().includes(searchTerm)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <p>No se encontraron alumnos con los filtros seleccionados.</p>
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(ath => {
        const parts = ath.full_name.trim().split(' ');
        let initials = parts[0] ? parts[0][0].toUpperCase() : 'S';
        if (parts.length > 1 && parts[parts.length - 1]) initials += parts[parts.length - 1][0].toUpperCase();

        const isAct = (ath.subscription_status === 'active');
        const isPend = (ath.subscription_status === 'pending_activation');

        let statusBadgeHtml = '';
        if (isAct) {
            statusBadgeHtml = '<span class="pill pill-champagne" style="font-size: 10px; color: #10B981; border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.15);"><span class="status-dot status-dot-active" style="display:inline-block; margin-right:5px;"></span>Activo</span>';
        } else if (isPend) {
            statusBadgeHtml = '<span class="pill pill-champagne" style="font-size: 10px; color: #F59E0B; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.15);"><span class="status-dot status-dot-pending" style="display:inline-block; margin-right:5px;"></span>Pendiente</span>';
        } else {
            statusBadgeHtml = '<span class="pill pill-champagne" style="font-size: 10px; color: #EF4444; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.15);"><span class="status-dot status-dot-paused" style="display:inline-block; margin-right:5px;"></span>Pausado</span>';
        }

        const toggleBtnHtml = isAct
            ? `<button type="button" class="btn btn-outline btn-sm btn-hub-toggle-status" data-athlete-id="${ath.id}" data-current-status="active" style="font-size: 11px; padding: 5px 12px; color: #F59E0B; border-color: rgba(245, 158, 11, 0.4);">Pausar Acceso</button>`
            : `<button type="button" class="btn btn-primary btn-sm btn-hub-toggle-status" data-athlete-id="${ath.id}" data-current-status="${ath.subscription_status}" style="font-size: 11px; padding: 5px 12px; font-weight: 800;">Aprobar Acceso</button>`;

        const planKey = ath.user_type || 'client_presencial_vip';

        html += `
            <div class="coach-athlete-card ${isPend ? 'is-pending' : ''}">
                <div class="coach-athlete-info">
                    <div class="coach-athlete-avatar">${initials}</div>
                    <div class="coach-athlete-meta">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="coach-athlete-name">${ath.full_name}</span>
                            ${statusBadgeHtml}
                        </div>
                        <span class="coach-athlete-email">${ath.email}</span>
                        <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Plan:</label>
                            <button type="button" class="btn-coach-plan-pill-trigger btn-open-plan-sheet" data-athlete-id="${ath.id}" style="background: rgba(229, 203, 167, 0.08); border: 1px solid rgba(229, 203, 167, 0.25); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: var(--accent-primary); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                                <span>${formatPlanName(planKey)}</span>
                                <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="coach-athlete-actions">
                    ${toggleBtnHtml}
                    <button type="button" class="btn btn-outline btn-sm btn-hub-prescribe-nutri" data-athlete-id="${ath.id}" style="font-size: 11px; padding: 5px 10px;">Prescribir Nutrición</button>
                    <button type="button" class="btn btn-outline btn-sm btn-hub-prescribe-workout" data-athlete-id="${ath.id}" style="font-size: 11px; padding: 5px 10px;">Prescribir Rutina</button>
                    <button type="button" class="btn btn-outline btn-sm btn-hub-inspect-student" data-athlete-id="${ath.id}" style="font-size: 11px; padding: 5px 10px; border-color: rgba(229, 203, 167, 0.4); color: var(--accent-primary);">Ver como Alumno</button>
                    <a href="https://wa.me/?text=${encodeURIComponent(`Hola ${ath.full_name}, te escribo de SENS para coordinar tu plan.`)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 5px 10px; color: #25D366; border-color: rgba(37, 211, 102, 0.4);">WhatsApp</a>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Delegación de eventos en las tarjetas de atletas
    container.querySelectorAll('.btn-hub-toggle-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const athId = btn.getAttribute('data-athlete-id');
            const currentStatus = btn.getAttribute('data-current-status');
            const newStatus = (currentStatus === 'active') ? 'paused' : 'active';
            await updateAthleteSubscriptionStatus(athId, newStatus);
        });
    });

    container.querySelectorAll('.btn-open-plan-sheet').forEach(btn => {
        btn.addEventListener('click', () => {
            const athId = btn.getAttribute('data-athlete-id');
            openCoachPlanSheet(athId);
        });
    });

    container.querySelectorAll('.btn-hub-prescribe-nutri').forEach(btn => {
        btn.addEventListener('click', () => {
            const athId = btn.getAttribute('data-athlete-id');
            selectAthleteForPrescription('nutri', athId);
        });
    });

    container.querySelectorAll('.btn-hub-prescribe-workout').forEach(btn => {
        btn.addEventListener('click', () => {
            const athId = btn.getAttribute('data-athlete-id');
            selectAthleteForPrescription('workout', athId);
        });
    });

    container.querySelectorAll('.btn-hub-inspect-student').forEach(btn => {
        btn.addEventListener('click', () => {
            const athId = btn.getAttribute('data-athlete-id');
            inspectAthleteAsCoach(athId);
        });
    });
}

let coachAthletePendingPlanId = null;

function formatPlanName(key) {
    switch (key) {
        case 'client_presencial_vip': return 'Presencial 1 a 1 VIP (CABA)';
        case 'client_presencial_group': return 'Presencial Dúo / Grupo';
        case 'client_online_premium': return 'Online Premium (Diario)';
        case 'client_online_basic': return 'Online Básico';
        default: return 'Presencial 1 a 1 VIP';
    }
}

window.openCoachPlanSheet = function(athId) {
    coachAthletePendingPlanId = athId;
    const allAthletes = getConsolidatedCoachAthletes();
    const ath = allAthletes.find(a => a.id === athId);
    const titleEl = document.getElementById('coachPlanSheetAthleteTitle');
    if (titleEl && ath) {
        titleEl.textContent = `Asignar Plan a ${ath.full_name}`;
    }

    const backdrop = document.getElementById('coachPlanSheetBackdrop');
    const sheet = document.getElementById('coachPlanPickerBottomSheet');
    if (backdrop && sheet) {
        backdrop.style.display = 'block';
        sheet.style.display = 'block';
        setTimeout(() => sheet.classList.add('active'), 10);
    }
};

window.closeCoachPlanSheet = function() {
    const backdrop = document.getElementById('coachPlanSheetBackdrop');
    const sheet = document.getElementById('coachPlanPickerBottomSheet');
    if (backdrop && sheet) {
        sheet.classList.remove('active');
        setTimeout(() => {
            backdrop.style.display = 'none';
            sheet.style.display = 'none';
        }, 250);
    }
    coachAthletePendingPlanId = null;
};

document.addEventListener('DOMContentLoaded', () => {
    const closePlanSheetBtn = document.getElementById('btnClosePlanSheet');
    const planBackdrop = document.getElementById('coachPlanSheetBackdrop');
    if (closePlanSheetBtn) closePlanSheetBtn.addEventListener('click', closeCoachPlanSheet);
    if (planBackdrop) planBackdrop.addEventListener('click', closeCoachPlanSheet);

    document.querySelectorAll('.btn-coach-plan-opt').forEach(btn => {
        btn.addEventListener('click', async () => {
            const planKey = btn.getAttribute('data-plan');
            if (coachAthletePendingPlanId && planKey) {
                await updateAthletePlanType(coachAthletePendingPlanId, planKey);
                showSensToast(`Modalidad actualizada a: ${formatPlanName(planKey)}`, 'champagne');
                closeCoachPlanSheet();
                renderCoachAthletesHub();
            }
        });
    });
});

async function updateAthleteSubscriptionStatus(athId, newStatus) {
    if (supabaseClient && !athId.startsWith('mock_')) {
        try {
            await supabaseClient.from('profiles').update({ subscription_status: newStatus }).eq('id', athId);
        } catch (e) {
            console.warn('Error al actualizar membresía en Supabase:', e);
        }
    }

    if (window.__coachAthletesCache) {
        const cached = window.__coachAthletesCache.find(a => a.id === athId);
        if (cached) cached.subscription_status = newStatus;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(`sens_athlete_override_${athId}`) || '{}');
        stored.subscription_status = newStatus;
        localStorage.setItem(`sens_athlete_override_${athId}`, JSON.stringify(stored));

        const localList = JSON.parse(localStorage.getItem('sens_registered_athletes') || '[]');
        const targetLocal = localList.find(a => a.id === athId);
        if (targetLocal) {
            targetLocal.subscription_status = newStatus;
            localStorage.setItem('sens_registered_athletes', JSON.stringify(localList));
        }
    } catch (e) {}

    renderCoachAthletesHub();
    renderAthleteBottomSheetList();
    showSensToast(
        newStatus === 'active' 
            ? '¡Atleta aprobado con éxito! Acceso y entrenamientos habilitados.' 
            : 'Membresía pausada.', 
        'champagne'
    );
}

async function updateAthletePlanType(athId, newPlanKey) {
    const planNames = {
        client_presencial_vip: 'Presencial 1 a 1 VIP (CABA)',
        client_presencial_group: 'Presencial Dúo / Grupo (CABA)',
        client_online_premium: 'Online Premium (Seguimiento Diario)',
        client_online_basic: 'Online Básico'
    };
    const newPlanName = planNames[newPlanKey] || 'Plan SENS';

    if (supabaseClient && !athId.startsWith('mock_')) {
        try {
            await supabaseClient.from('profiles').update({
                user_type: newPlanKey,
                active_plan_name: newPlanName
            }).eq('id', athId);
        } catch (e) {
            console.warn('Error al actualizar plan en Supabase:', e);
        }
    }

    if (window.__coachAthletesCache) {
        const cached = window.__coachAthletesCache.find(a => a.id === athId);
        if (cached) {
            cached.user_type = newPlanKey;
            cached.active_plan_name = newPlanName;
        }
    }
    if (athId.startsWith('mock_')) {
        const stored = JSON.parse(localStorage.getItem(`sens_athlete_override_${athId}`) || '{}');
        stored.user_type = newPlanKey;
        stored.active_plan_name = newPlanName;
        localStorage.setItem(`sens_athlete_override_${athId}`, JSON.stringify(stored));
    }

    loadCoachAthletesList();
    showSensToast(`Plan actualizado a: ${newPlanName}`, 'champagne');
}

function selectAthleteForPrescription(type, athId) {
    if (type === 'nutri') {
        const subnavBtn = document.querySelector('#coachHubSubnav [data-subtab="paneNutrition"]');
        if (subnavBtn) subnavBtn.click();
        const selector = document.getElementById('coachNutritionAthleteSelector');
        if (selector) {
            selector.value = athId;
            loadCoachAthleteNutrition(athId);
        }
    } else {
        const subnavBtn = document.querySelector('#coachHubSubnav [data-subtab="paneWorkouts"]');
        if (subnavBtn) subnavBtn.click();
        const selector = document.getElementById('coachWorkoutAthleteSelector');
        if (selector) {
            selector.value = athId;
            loadCoachAthleteWorkouts(athId);
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function inspectAthleteAsCoach(athId) {
    const athletes = getConsolidatedCoachAthletes();
    const target = athletes.find(a => a.id === athId);
    if (!target) return;

    AppState.activeAthleteId = athId;

    if (athId.startsWith('mock_')) {
        const keyMap = {
            mock_vip: 'client_presencial_vip',
            mock_duo: 'client_presencial_group',
            mock_online_prem: 'client_online_premium',
            mock_online_basic: 'client_online_basic'
        };
        applyUserProfile(keyMap[athId] || 'client_presencial_vip');
    } else {
        applyDatabaseAthlete(target);
    }

    // Mostrar banner delgado de inspección
    const banner = document.getElementById('coachInspectionBanner');
    if (banner) {
        banner.style.display = 'block';
        const nameEl = document.getElementById('inspectionAthleteName');
        const planEl = document.getElementById('inspectionAthletePlan');
        if (nameEl) nameEl.textContent = target.full_name;
        if (planEl) {
            let pTag = (target.active_plan_name || 'PLAN').toUpperCase();
            if (pTag.includes('VIP')) pTag = 'VIP';
            else if (pTag.includes('DUO') || pTag.includes('DÚO')) pTag = 'DÚO';
            else if (pTag.includes('ONLINE')) pTag = 'ONLINE';
            planEl.textContent = pTag;
        }
    }

    switchPortalView('dashView');
    if (typeof window.updateDashboardWorkoutDirective === 'function') {
        window.updateDashboardWorkoutDirective();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showSensToast(`Inspeccionando vista de ${target.full_name}.`, 'champagne');
}

function exitAthleteInspection() {
    const banner = document.getElementById('coachInspectionBanner');
    if (banner) banner.style.display = 'none';
    switchPortalView('coachHubView');
    renderCoachAthletesHub();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showSensToast('Regresaste al panel Coach OS.', 'champagne');
}

// -----------------------------------------------------------------------------
// SUB-MÓDULO 2: PRESCRIPCIÓN DE NUTRICIÓN, CALORÍAS Y ALIMENTOS (REGLA DE 3)
// -----------------------------------------------------------------------------
function initCoachNutritionPrescription() {
    const athleteSel = document.getElementById('coachNutritionAthleteSelector');
    const kcalInput = document.getElementById('coachTargetKcalInput');
    const protInput = document.getElementById('coachTargetProtInput');
    const carbsInput = document.getElementById('coachTargetCarbsInput');
    const fatsInput = document.getElementById('coachTargetFatsInput');
    const waterInput = document.getElementById('coachTargetWaterInput');
    const noteInput = document.getElementById('coachNutritionDirectiveInput');
    const saveBtn = document.getElementById('btnSaveCoachNutritionPrescription');

    function populateSelector() {
        if (!athleteSel) return;
        const roster = getConsolidatedCoachAthletes();
        let html = '';
        roster.forEach(ath => {
            html += `<option value="${ath.id}">${ath.full_name} (${ath.active_plan_name})</option>`;
        });
        athleteSel.innerHTML = html;
    }
    populateSelector();

    if (athleteSel) {
        athleteSel.addEventListener('change', () => {
            loadCoachAthleteNutrition(athleteSel.value);
        });
    }

    // Presets calóricos
    document.querySelectorAll('.coach-preset-kcal').forEach(btn => {
        btn.addEventListener('click', () => {
            const kcal = parseInt(btn.getAttribute('data-kcal'), 10);
            if (kcalInput) kcalInput.value = kcal;
            if (kcal === 1800) {
                if (protInput) protInput.value = 160;
                if (carbsInput) carbsInput.value = 150;
                if (fatsInput) fatsInput.value = 60;
            } else if (kcal === 2100) {
                if (protInput) protInput.value = 160;
                if (carbsInput) carbsInput.value = 220;
                if (fatsInput) fatsInput.value = 65;
            } else if (kcal === 2400) {
                if (protInput) protInput.value = 165;
                if (carbsInput) carbsInput.value = 280;
                if (fatsInput) fatsInput.value = 70;
            } else if (kcal === 2700) {
                if (protInput) protInput.value = 175;
                if (carbsInput) carbsInput.value = 330;
                if (fatsInput) fatsInput.value = 75;
            }
            updateMacroPercentageIndicators();
        });
    });

    [kcalInput, protInput, carbsInput, fatsInput].forEach(inp => {
        if (inp) inp.addEventListener('input', updateMacroPercentageIndicators);
    });

    function updateMacroPercentageIndicators() {
        const kcal = parseFloat(kcalInput ? kcalInput.value : 2200) || 2200;
        const p = parseFloat(protInput ? protInput.value : 160) || 160;
        const c = parseFloat(carbsInput ? carbsInput.value : 220) || 220;
        const f = parseFloat(fatsInput ? fatsInput.value : 70) || 70;

        const pPct = Math.round((p * 4 / kcal) * 100);
        const cPct = Math.round((c * 4 / kcal) * 100);
        const fPct = Math.round((f * 9 / kcal) * 100);

        const pBadge = document.getElementById('coachProtPctBadge');
        const cBadge = document.getElementById('coachCarbsPctBadge');
        const fBadge = document.getElementById('coachFatsPctBadge');

        if (pBadge) pBadge.textContent = `${pPct}% (${p * 4} kcal)`;
        if (cBadge) cBadge.textContent = `${cPct}% (${c * 4} kcal)`;
        if (fBadge) fBadge.textContent = `${fPct}% (${f * 9} kcal)`;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const athId = athleteSel ? athleteSel.value : 'mock_vip';
            const kcal = parseInt(kcalInput.value, 10) || 2200;
            const prot = parseInt(protInput.value, 10) || 160;
            const carbs = parseInt(carbsInput.value, 10) || 220;
            const fats = parseInt(fatsInput.value, 10) || 70;
            const water = parseFloat(waterInput ? waterInput.value : 2.5) || 2.5;
            const directive = noteInput ? noteInput.value.trim() : '';

            // Alimentos seleccionados con regla de 3 simple
            const prescribedFoods = [];
            document.querySelectorAll('#coachFoodSelectionGrid .coach-food-cb:checked').forEach(cb => {
                const foodId = cb.getAttribute('data-food-id');
                const food = FOOD_CATALOG.find(f => f.id === foodId);
                const gramInput = document.querySelector(`.coach-food-grams[data-food-id="${foodId}"]`);
                const grams = gramInput ? parseInt(gramInput.value, 10) || 100 : 100;
                if (food) {
                    prescribedFoods.push({
                        id: food.id,
                        name: food.name,
                        cat: food.cat,
                        grams: grams,
                        cal: Math.round((grams * (food.calPer100 || 0)) / 100),
                        protein: Math.round(((grams * (food.protPer100 || 0)) / 100) * 10) / 10,
                        carbs: Math.round(((grams * (food.carbsPer100 || 0)) / 100) * 10) / 10,
                        fats: Math.round(((grams * (food.fatsPer100 || 0)) / 100) * 10) / 10
                    });
                }
            });

            const prescriptionData = {
                target_calories: kcal,
                target_protein: prot,
                target_carbs: carbs,
                target_fats: fats,
                target_water: water,
                directive_note: directive,
                prescribed_foods: prescribedFoods,
                updated_at: new Date().toISOString()
            };

            localStorage.setItem(`sens_prescribed_nutrition_${athId}`, JSON.stringify(prescriptionData));

            if (supabaseClient && !athId.startsWith('mock_')) {
                try {
                    await supabaseClient.from('profiles').update({
                        prescribed_nutrition: prescriptionData
                    }).eq('id', athId);
                } catch (e) {
                    console.warn('Error al guardar nutrición en Supabase:', e);
                }
            }

            syncMemberNutritionPrescription(athId, prescriptionData);
            showSensToast(`Prescripción nutricional guardada con éxito para el alumno.`, 'champagne');
        });
    }

    renderCoachFoodSelectionGrid();
    updateMacroPercentageIndicators();
}

function loadCoachAthleteNutrition(athId) {
    const raw = localStorage.getItem(`sens_prescribed_nutrition_${athId}`);
    let data = {
        target_calories: 2200,
        target_protein: 160,
        target_carbs: 220,
        target_fats: 70,
        target_water: 2.5,
        directive_note: 'Priorizá llegar a tu meta de proteína diaria repartida en las comidas principales y mantener hidratación constante antes de entrenar.',
        prescribed_foods: []
    };

    if (raw) {
        try { Object.assign(data, JSON.parse(raw)); } catch (e) {}
    }

    const kcalInput = document.getElementById('coachTargetKcalInput');
    const protInput = document.getElementById('coachTargetProtInput');
    const carbsInput = document.getElementById('coachTargetCarbsInput');
    const fatsInput = document.getElementById('coachTargetFatsInput');
    const waterInput = document.getElementById('coachTargetWaterInput');
    const noteInput = document.getElementById('coachNutritionDirectiveInput');

    if (kcalInput) kcalInput.value = data.target_calories;
    if (protInput) protInput.value = data.target_protein;
    if (carbsInput) carbsInput.value = data.target_carbs;
    if (fatsInput) fatsInput.value = data.target_fats;
    if (waterInput) waterInput.value = data.target_water;
    if (noteInput) noteInput.value = data.directive_note;

    renderCoachFoodSelectionGrid(data.prescribed_foods);
    const pBadge = document.getElementById('coachProtPctBadge');
    if (pBadge) {
        const kcal = data.target_calories || 2200;
        const pPct = Math.round((data.target_protein * 4 / kcal) * 100);
        pBadge.textContent = `${pPct}% (${data.target_protein * 4} kcal)`;
    }
}

function renderCoachFoodSelectionGrid(prescribedList = []) {
    const container = document.getElementById('coachFoodSelectionGrid');
    if (!container) return;

    const prescribedMap = new Map();
    prescribedList.forEach(p => prescribedMap.set(p.id, p.grams));

    const foods = FOOD_CATALOG.slice(0, 14);

    let html = '';
    foods.forEach(f => {
        const isChecked = prescribedMap.has(f.id);
        const grams = isChecked ? prescribedMap.get(f.id) : (f.defaultGrams || 100);
        const cal = Math.round((grams * (f.calPer100 || 0)) / 100);
        const prot = Math.round(((grams * (f.protPer100 || 0)) / 100) * 10) / 10;

        html += `
            <div class="coach-food-item" style="background: ${isChecked ? 'rgba(229, 203, 167, 0.08)' : 'var(--bg-surface)'}; border-color: ${isChecked ? 'rgba(229, 203, 167, 0.4)' : 'var(--border-subtle)'};">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="coach-food-cb" data-food-id="${f.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
                    <div>
                        <strong style="font-size: 13px; color: #FFFFFF; display: block;">${f.name}</strong>
                        <span style="font-size: 11px; color: var(--text-muted);"><span class="coach-food-cal-display" data-food-id="${f.id}">${cal}</span> kcal • <span class="coach-food-prot-display" data-food-id="${f.id}">${prot}g</span> prot</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <button type="button" class="btn btn-outline btn-sm btn-coach-stepper" data-food-id="${f.id}" data-delta="-20" style="padding: 2px 6px; font-size: 11px; height: 26px;">-</button>
                    <input type="number" class="input-control coach-food-grams" data-food-id="${f.id}" value="${grams}" step="10" min="20" max="600" style="width: 60px; text-align: center; padding: 2px 4px; font-size: 12px; height: 26px; margin-bottom: 0;">
                    <span style="font-size: 11px; color: var(--text-muted);">g</span>
                    <button type="button" class="btn btn-outline btn-sm btn-coach-stepper" data-food-id="${f.id}" data-delta="20" style="padding: 2px 6px; font-size: 11px; height: 26px;">+</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-coach-stepper').forEach(btn => {
        btn.addEventListener('click', () => {
            const foodId = btn.getAttribute('data-food-id');
            const delta = parseInt(btn.getAttribute('data-delta'), 10);
            const input = container.querySelector(`.coach-food-grams[data-food-id="${foodId}"]`);
            if (input) {
                let current = parseInt(input.value, 10) || 100;
                current = Math.max(20, current + delta);
                input.value = current;
                recalcCoachFoodItem(foodId, current);
            }
        });
    });

    container.querySelectorAll('.coach-food-grams').forEach(inp => {
        inp.addEventListener('input', () => {
            const foodId = inp.getAttribute('data-food-id');
            const grams = parseInt(inp.value, 10) || 0;
            recalcCoachFoodItem(foodId, grams);
        });
    });

    container.querySelectorAll('.coach-food-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            const item = cb.closest('.coach-food-item');
            if (item) {
                item.style.background = cb.checked ? 'rgba(229, 203, 167, 0.08)' : 'var(--bg-surface)';
                item.style.borderColor = cb.checked ? 'rgba(229, 203, 167, 0.4)' : 'var(--border-subtle)';
            }
        });
    });
}

function recalcCoachFoodItem(foodId, grams) {
    const food = FOOD_CATALOG.find(f => f.id === foodId);
    if (!food) return;

    const calDisplay = document.querySelector(`.coach-food-cal-display[data-food-id="${foodId}"]`);
    const protDisplay = document.querySelector(`.coach-food-prot-display[data-food-id="${foodId}"]`);

    const cal = Math.round((grams * (food.calPer100 || 0)) / 100);
    const prot = Math.round(((grams * (food.protPer100 || 0)) / 100) * 10) / 10;

    if (calDisplay) calDisplay.textContent = cal;
    if (protDisplay) protDisplay.textContent = `${prot}g`;
}

// -----------------------------------------------------------------------------
// SUB-MÓDULO 3: PRESCRIPCIÓN DE RUTINAS Y EJERCICIOS (1 A 6 DÍAS)
// -----------------------------------------------------------------------------
let coachWorkoutState = {
    activeAthleteId: 'mock_vip',
    activeDay: 'day1'
};

function initCoachWorkoutsPrescription() {
    const athleteSel = document.getElementById('coachWorkoutAthleteSelector');
    const dayBtns = document.querySelectorAll('#coachDaySelectorBar .coach-day-btn');
    const dayTitleInput = document.getElementById('coachDayTitleInput');
    const addLibBtn = document.getElementById('btnCoachAddExerciseFromLib');
    const saveDayBtn = document.getElementById('btnSaveCoachWorkoutDay');

    function populateSelector() {
        if (!athleteSel) return;
        const roster = getConsolidatedCoachAthletes();
        let html = '';
        roster.forEach(ath => {
            html += `<option value="${ath.id}">${ath.full_name} (${ath.active_plan_name})</option>`;
        });
        athleteSel.innerHTML = html;
    }
    populateSelector();

    if (athleteSel) {
        athleteSel.addEventListener('change', () => {
            coachWorkoutState.activeAthleteId = athleteSel.value;
            loadCoachAthleteWorkouts(athleteSel.value);
        });
    }

    dayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            dayBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            coachWorkoutState.activeDay = btn.getAttribute('data-day') || 'day1';
            renderCoachAssignedExercises();
        });
    });

    document.querySelectorAll('.coach-apply-template').forEach(btn => {
        btn.addEventListener('click', () => {
            const template = btn.getAttribute('data-template');
            applyCoachWorkoutTemplate(template);
        });
    });

    // Selector de Modalidad (Presencial / Online / Autónomo / Descanso)
    const modalityBtns = document.querySelectorAll('#coachModalityButtonsWrap .coach-modality-btn');
    modalityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalityBtns.forEach(b => {
                b.classList.remove('active', 'pill-champagne');
                b.classList.add('pill-dark');
            });
            btn.classList.remove('pill-dark');
            btn.classList.add('active', 'pill-champagne');
        });
    });

    if (addLibBtn) {
        addLibBtn.addEventListener('click', () => {
            const modal = document.getElementById('exerciseLibraryModal');
            if (modal) {
                modal.classList.add('active');
                renderExerciseLibraryList();
            }
        });
    }

    if (saveDayBtn) {
        saveDayBtn.addEventListener('click', () => {
            saveCurrentCoachWorkoutDay();
        });
    }

    renderCoachAssignedExercises();
}

function loadCoachAthleteWorkouts(athId) {
    coachWorkoutState.activeAthleteId = athId;
    renderCoachAssignedExercises();
}

function getCoachAthleteWorkoutData(athId) {
    // 1. Si está en cache de atletas de Coach OS
    if (window.__coachAthletesCache && Array.isArray(window.__coachAthletesCache)) {
        const cached = window.__coachAthletesCache.find(a => a.id === athId);
        if (cached && cached.prescribed_workouts && typeof cached.prescribed_workouts === 'object') {
            return cached.prescribed_workouts;
        }
    }

    // 2. Si es el alumno activo en su portal y tiene los datos en su perfil de Supabase
    if (AppState.profile && AppState.profile.id === athId && AppState.profile.prescribed_workouts) {
        return AppState.profile.prescribed_workouts;
    }

    // 3. Revisar en localStorage por si se guardó recientemente
    const raw = localStorage.getItem(`sens_prescribed_workouts_${athId}`);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
    }

    // 4. Solo perfiles demostrativos heredan la rutina completa preconfigurada
    if (athId === 'usr-vip-001' || athId === 'mock_vip' || athId === 'usr-onl-003' || athId === 'mock_onl') {
        return JSON.parse(JSON.stringify(WORKOUT_DAYS_DATA));
    }

    // 5. Alumno real sin rutina cargada por Nico todavía: todos los días en null (la línea "–")
    return {
        day1: { title: 'Lunes', exercises: [], modality: null, completed: false },
        day2: { title: 'Martes', exercises: [], modality: null, completed: false },
        day3: { title: 'Miércoles', exercises: [], modality: null, completed: false },
        day4: { title: 'Jueves', exercises: [], modality: null, completed: false },
        day5: { title: 'Viernes', exercises: [], modality: null, completed: false },
        day6: { title: 'Sábado', exercises: [], modality: null, completed: false },
        day7: { title: 'Domingo', exercises: [], modality: null, completed: false }
    };
}

function renderCoachAssignedExercises() {
    const container = document.getElementById('coachAssignedExercisesContainer');
    const titleInput = document.getElementById('coachDayTitleInput');
    if (!container) return;

    const data = getCoachAthleteWorkoutData(coachWorkoutState.activeAthleteId);
    const day = data[coachWorkoutState.activeDay] || { title: `Día: ${coachWorkoutState.activeDay}`, exercises: [] };

    if (titleInput) titleInput.value = day.title;

    // Sincronizar botones de modalidad asignada por Nico (ninguno activo si es null)
    const assignedModality = day.modality || null;
    const modalityBtns = document.querySelectorAll('#coachModalityButtonsWrap .coach-modality-btn');
    modalityBtns.forEach(b => {
        const isMatch = Boolean(assignedModality && b.getAttribute('data-modality') === assignedModality);
        b.classList.toggle('active', isMatch);
        b.classList.toggle('pill-champagne', isMatch);
        b.classList.toggle('pill-dark', !isMatch);
    });

    // Sincronizar checkbox de sesión realizada / asistencia
    const completedCheck = document.getElementById('coachDayCompletedCheck');
    if (completedCheck) {
        completedCheck.checked = Boolean(day.completed);
    }

    if (!day.exercises || day.exercises.length === 0) {
        container.innerHTML = `
            <div style="background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: 10px; padding: 26px; text-align: center; color: var(--text-muted);">
                <p style="margin-bottom: 12px;">No hay ejercicios asignados a este día todavía.</p>
                <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('btnCoachAddExerciseFromLib').click()">
                    + Agregar desde Biblioteca (50 Ejercicios)
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    day.exercises.forEach((ex, idx) => {
        html += `
            <div class="coach-ex-card" data-ex-id="${ex.id}">
                <div style="flex: 1; min-width: 220px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="pill pill-champagne" style="font-size: 9.5px; padding: 2px 7px;">#${idx + 1}</span>
                        <strong style="font-size: 14px; color: #FFFFFF;">${ex.name}</strong>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${ex.notes || 'Pauta biomecánica asignada'}</div>
                </div>
                <div class="coach-ex-inputs">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Series:</label>
                        <input type="number" class="input-control coach-ex-sets" value="${ex.sets || 3}" min="1" max="10" style="width: 50px; padding: 2px 6px; height: 28px; margin-bottom: 0;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Reps:</label>
                        <input type="text" class="input-control coach-ex-reps" value="${ex.reps || '10'}" style="width: 60px; padding: 2px 6px; height: 28px; margin-bottom: 0;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Peso (kg):</label>
                        <input type="number" class="input-control coach-ex-weight" value="${ex.defaultWeight || 15}" step="0.5" style="width: 65px; padding: 2px 6px; height: 28px; margin-bottom: 0;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <label style="font-size: 10px; text-transform: uppercase; color: var(--text-muted);">Descanso (s):</label>
                        <input type="number" class="input-control coach-ex-rest" value="${ex.rest || 75}" step="15" style="width: 60px; padding: 2px 6px; height: 28px; margin-bottom: 0;">
                    </div>
                    <button type="button" class="btn btn-outline btn-sm btn-coach-remove-ex" data-ex-id="${ex.id}" style="border-color: var(--danger); color: var(--danger); padding: 4px 8px; font-size: 11px;">&times;</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-coach-remove-ex').forEach(btn => {
        btn.addEventListener('click', () => {
            const exId = btn.getAttribute('data-ex-id');
            const data = getCoachAthleteWorkoutData(coachWorkoutState.activeAthleteId);
            if (data[coachWorkoutState.activeDay]) {
                data[coachWorkoutState.activeDay].exercises = data[coachWorkoutState.activeDay].exercises.filter(x => x.id !== exId);
                localStorage.setItem(`sens_prescribed_workouts_${coachWorkoutState.activeAthleteId}`, JSON.stringify(data));
                renderCoachAssignedExercises();
                showSensToast('Ejercicio removido de la rutina.', 'info');
            }
        });
    });
}

function saveCurrentCoachWorkoutDay() {
    const athId = coachWorkoutState.activeAthleteId;
    const dayKey = coachWorkoutState.activeDay;
    const titleInput = document.getElementById('coachDayTitleInput');
    const container = document.getElementById('coachAssignedExercisesContainer');

    const data = getCoachAthleteWorkoutData(athId);
    if (!data[dayKey]) data[dayKey] = { title: `Día: ${dayKey}`, exercises: [] };

    if (titleInput) data[dayKey].title = titleInput.value.trim() || `Día: ${dayKey}`;

    // Guardar modalidad asignada por Nico (o null si no hay ninguna activa)
    const activeModBtn = document.querySelector('#coachModalityButtonsWrap .coach-modality-btn.active');
    data[dayKey].modality = activeModBtn ? activeModBtn.getAttribute('data-modality') : null;

    // Guardar asistencia/completado
    const completedCheck = document.getElementById('coachDayCompletedCheck');
    data[dayKey].completed = Boolean(completedCheck && completedCheck.checked);

    const cards = container ? container.querySelectorAll('.coach-ex-card') : [];
    cards.forEach(c => {
        const exId = c.getAttribute('data-ex-id');
        const exObj = data[dayKey].exercises.find(x => x.id === exId);
        if (exObj) {
            const setsInp = c.querySelector('.coach-ex-sets');
            const repsInp = c.querySelector('.coach-ex-reps');
            const weightInp = c.querySelector('.coach-ex-weight');
            const restInp = c.querySelector('.coach-ex-rest');

            if (setsInp) exObj.sets = parseInt(setsInp.value, 10) || 3;
            if (repsInp) exObj.reps = repsInp.value.trim() || '10';
            if (weightInp) exObj.defaultWeight = parseFloat(weightInp.value) || 15;
            if (restInp) exObj.rest = parseInt(restInp.value, 10) || 75;
        }
    });

    localStorage.setItem(`sens_prescribed_workouts_${athId}`, JSON.stringify(data));

    // Sincronizar en cache local del roster de Coach OS
    if (window.__coachAthletesCache) {
        const cached = window.__coachAthletesCache.find(a => a.id === athId);
        if (cached) cached.prescribed_workouts = data;
    }

    // Persistir en Supabase en profiles.prescribed_workouts
    if (supabaseClient && !athId.startsWith('mock_')) {
        supabaseClient.from('profiles').update({
            prescribed_workouts: data
        }).eq('id', athId).then(({ error }) => {
            if (error) console.warn('Error al guardar entrenamientos en Supabase:', error);
        });
    }

    if (AppState.user && (AppState.user.id === athId || athId === 'mock_vip')) {
        if (AppState.profile) AppState.profile.prescribed_workouts = data;
        Object.assign(WORKOUT_DAYS_DATA, data);
        renderWorkoutDay(AppState.currentDay || 'day1');
        renderMonthlyCalendar();
    }

    // Actualizar reactivamente todas las tarjetas del portal
    if (typeof renderDynamicWeekStrip === 'function') renderDynamicWeekStrip();
    if (typeof renderWorkoutDaysNav === 'function') renderWorkoutDaysNav();
    if (typeof updateDynamicTrainingCard === 'function') updateDynamicTrainingCard(AppState.selectedDate);
    if (typeof updateObjectiveCardData === 'function') updateObjectiveCardData();

    showSensToast(`Rutina de ${data[dayKey].title} guardada con éxito.`, 'champagne');
}

function applyCoachWorkoutTemplate(templateKey) {
    const athId = coachWorkoutState.activeAthleteId;
    const data = getCoachAthleteWorkoutData(athId);

    if (templateKey === 'fuerza3d') {
        data.day1 = {
            title: 'Día 1: Tren Superior (Empuje / Tirón)',
            exercises: [
                { id: 'ex-p1', name: 'Press de Banca Plano con Mancuernas', sets: 4, reps: '8-10', rest: 90, defaultWeight: 22, notes: 'Escápulas retraídas' },
                { id: 'ex-t3', name: 'Remo con Mancuerna a Una Mano en Banco', sets: 4, reps: '10-12', rest: 75, defaultWeight: 18, notes: 'Sin rotar tronco' },
                { id: 'ex-p4', name: 'Press Militar Sentado con Mancuernas', sets: 3, reps: '10', rest: 75, defaultWeight: 14, notes: 'Pecho alto' }
            ]
        };
        data.day2 = {
            title: 'Día 2: Tren Inferior (Fuerza & Cadera)',
            exercises: [
                { id: 'ex-q1', name: 'Sentadilla Goblet con Mancuerna', sets: 4, reps: '10-12', rest: 90, defaultWeight: 24, notes: 'Profundidad cómoda' },
                { id: 'ex-h1', name: 'Peso Muerto Rumano con Mancuernas', sets: 4, reps: '8-10', rest: 90, defaultWeight: 26, notes: 'Bisagra de cadera' },
                { id: 'ex-q5', name: 'Estocadas Búlgaras con Mancuernas', sets: 3, reps: '10', rest: 75, defaultWeight: 12, notes: 'Control excéntrico' }
            ]
        };
        data.day3 = {
            title: 'Día 3: Full Body & Cadena Posterior',
            exercises: [
                { id: 'ex-h2', name: 'Hip Thrust con Barra en Banco', sets: 4, reps: '10-12', rest: 90, defaultWeight: 45, notes: 'Pausa 2s arriba' },
                { id: 'ex-t2', name: 'Jalón al Pecho en Polea', sets: 4, reps: '10-12', rest: 75, defaultWeight: 40, notes: 'Dorsales activos' },
                { id: 'ex-p6', name: 'Flexiones con Pausa', sets: 3, reps: '12-15', rest: 60, defaultWeight: 0, notes: 'Core sólido' }
            ]
        };
    } else if (templateKey === 'hipertrofia4d') {
        data.day1.title = 'Día 1: Torso Hipertrofia (A)';
        data.day2.title = 'Día 2: Piernas & Core (A)';
        data.day3.title = 'Día 3: Torso Hipertrofia (B)';
        data.day4 = {
            title: 'Día 4: Piernas Enfoque Glúteos/Isquios (B)',
            exercises: [
                { id: 'ex-h1', name: 'Peso Muerto Rumano', sets: 4, reps: '10', rest: 90, defaultWeight: 24, notes: 'Tensión constante' },
                { id: 'ex-q4', name: 'Prensa 45°', sets: 4, reps: '12', rest: 90, defaultWeight: 90, notes: 'Rango profundo' }
            ]
        };
    } else if (templateKey === 'movilidad2d') {
        data.day1.title = 'Día 1: Fuerza Funcional & Postura';
        data.day2.title = 'Día 2: Movilidad, Cadera & Zona 2';
    }

    localStorage.setItem(`sens_prescribed_workouts_${athId}`, JSON.stringify(data));
    renderCoachAssignedExercises();
    showSensToast('Plantilla de entrenamiento aplicada.', 'champagne');
}

// -----------------------------------------------------------------------------
// SUB-MÓDULO 4: MENSAJE & NOTA DE NICO EN DASHBOARD
// -----------------------------------------------------------------------------
function initCoachDashboardNote() {
    const athleteSel = document.getElementById('coachDashNoteAthleteSelector');
    const titleInp = document.getElementById('coachDashNoteTitleInput');
    const bodyInp = document.getElementById('coachDashNoteBodyInput');
    const saveBtn = document.getElementById('btnSaveCoachDashNote');

    function populateSelector() {
        if (!athleteSel) return;
        const roster = getConsolidatedCoachAthletes();
        let html = '';
        roster.forEach(ath => {
            html += `<option value="${ath.id}">${ath.full_name} (${ath.active_plan_name})</option>`;
        });
        athleteSel.innerHTML = html;
    }
    populateSelector();

    if (athleteSel) {
        athleteSel.addEventListener('change', () => {
            loadCoachAthleteDashNote(athleteSel.value);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const athId = athleteSel ? athleteSel.value : 'mock_vip';
            const title = titleInp ? titleInp.value.trim() : 'Foco de la Semana';
            const body = bodyInp ? bodyInp.value.trim() : '';

            const noteData = { title, body, updated_at: new Date().toISOString() };
            localStorage.setItem(`sens_coach_dash_note_${athId}`, JSON.stringify(noteData));

            if (window.__coachAthletesCache) {
                const cached = window.__coachAthletesCache.find(a => a.id === athId);
                if (cached) cached.coach_note = noteData;
            }

            if (supabaseClient && !athId.startsWith('mock_')) {
                supabaseClient.from('profiles').update({
                    coach_note: noteData
                }).eq('id', athId).then(({ error }) => {
                    if (error) console.warn('Error al guardar nota en Supabase:', error);
                });
            }

            if (AppState.profile && AppState.profile.id === athId) {
                AppState.profile.coach_note = noteData;
            }

            const dashWeeklyNote = document.getElementById('dashCoachWeeklyNote');
            if (dashWeeklyNote && body) dashWeeklyNote.textContent = body;

            showSensToast('Mensaje de Nico publicado en el Dashboard del alumno.', 'champagne');
        });
    }

    loadCoachAthleteDashNote('mock_vip');
}

function loadCoachAthleteDashNote(athId) {
    const titleInp = document.getElementById('coachDashNoteTitleInput');
    const bodyInp = document.getElementById('coachDashNoteBodyInput');

    if (window.__coachAthletesCache) {
        const cached = window.__coachAthletesCache.find(a => a.id === athId);
        if (cached && cached.coach_note) {
            if (titleInp) titleInp.value = cached.coach_note.title || '';
            if (bodyInp) bodyInp.value = cached.coach_note.body || '';
            return;
        }
    }

    const raw = localStorage.getItem(`sens_coach_dash_note_${athId}`);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (titleInp) titleInp.value = parsed.title || '';
            if (bodyInp) bodyInp.value = parsed.body || '';
            return;
        } catch (e) {}
    }

    if (titleInp) titleInp.value = athId.startsWith('mock_') ? 'Foco de la Semana: Precisión Biomecánica & Adherencia' : '';
    if (bodyInp) bodyInp.value = athId.startsWith('mock_') ? 'Excelente ritmo en tus sesiones. Esta semana mantené el foco en descansar los 75-90 segundos pautados y alcanzar tus 160g de proteína sin saltear comidas.' : '';
}

// -----------------------------------------------------------------------------
// MEJORAS DE USABILIDAD Y CLARIDAD PARA EL ALUMNO (SUITE 2.5)
// -----------------------------------------------------------------------------
function initMemberClarityActions() {
    const btnDashGoWorkout = document.getElementById('btnDashGoWorkoutNow');
    const dashQuickWorkoutBtn = document.getElementById('dashQuickWorkoutBtn');
    const handleGoWorkout = () => {
        switchPortalView('workoutView');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showSensToast('Abriendo tu sesión pautada para hoy.', 'champagne', 2500);
    };

    if (btnDashGoWorkout) btnDashGoWorkout.addEventListener('click', handleGoWorkout);
    if (dashQuickWorkoutBtn) dashQuickWorkoutBtn.addEventListener('click', handleGoWorkout);

    const btnStartToday = document.getElementById('btnStartTodaySession');
    if (btnStartToday) {
        btnStartToday.addEventListener('click', () => {
            if (!AppState.workoutStopwatchInterval) {
                const btnToggleStopwatch = document.getElementById('btnToggleStopwatch');
                if (btnToggleStopwatch) btnToggleStopwatch.click();
            }
            const exContainer = document.getElementById('exercisesContainer');
            if (exContainer) {
                exContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            playBeep(520, 0.15);
            showSensToast('Sesión de entrenamiento iniciada! Registrá tus pesos y descansos.', 'success', 3500);
        });
    }

    const currentAthId = (AppState.user && AppState.user.id) || 'mock_vip';
    syncMemberNutritionPrescription(currentAthId);
}

function syncMemberNutritionPrescription(athId, forcedData = null) {
    let data = forcedData;
    if (!data) {
        if (AppState.profile && AppState.profile.id === athId && AppState.profile.prescribed_nutrition) {
            data = AppState.profile.prescribed_nutrition;
        } else if (window.__coachAthletesCache) {
            const cached = window.__coachAthletesCache.find(a => a.id === athId);
            if (cached && cached.prescribed_nutrition) data = cached.prescribed_nutrition;
        }
    }
    if (!data) {
        const raw = localStorage.getItem(`sens_prescribed_nutrition_${athId}`);
        if (raw) {
            try { data = JSON.parse(raw); } catch (e) {}
        }
    }

    if (!data) {
        if (!athId.startsWith('mock_') && athId !== 'usr-vip-001' && athId !== 'usr-onl-003') {
            data = {
                target_calories: null,
                directive_note: 'Pendiente de prescripción por Nico.',
                prescribed_foods: []
            };
        } else {
            data = {
                target_calories: 2200,
                directive_note: 'Priorizá llegar a tu meta de proteína diaria repartida en las comidas principales y mantener hidratación constante antes de entrenar.',
                prescribed_foods: [
                    { id: 'fd-p1', name: 'Pechuga de Pollo / Pavo', grams: 200, cal: 330, protein: 62 },
                    { id: 'fd-p2', name: 'Huevos de Campo Enteros', grams: 120, cal: 172, protein: 15 },
                    { id: 'fd-c1', name: 'Avena Tradicional Arrollada', grams: 80, cal: 311, protein: 11 },
                    { id: 'fd-c2', name: 'Arroz Yamani / Integral', grams: 150, cal: 168, protein: 3.9 }
                ]
            };
        }
    }

    const kcalEl = document.getElementById('nutriPrescribedKcal');
    const noteEl = document.getElementById('nutriPrescribedCoachNote');
    const foodsGrid = document.getElementById('nutriPrescribedFoodsGrid');

    if (kcalEl) {
        if (data.target_calories) {
            kcalEl.innerHTML = `${data.target_calories.toLocaleString('es-AR')} <span style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 400;">kcal / día</span>`;
        } else {
            kcalEl.innerHTML = `- <span style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 400;">kcal / día</span>`;
        }
    }
    if (noteEl && data.directive_note) noteEl.textContent = `"${data.directive_note}"`;

    if (foodsGrid && Array.isArray(data.prescribed_foods)) {
        if (data.prescribed_foods.length === 0) {
            foodsGrid.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Estructurá tus comidas con los alimentos del banco base más abajo.</span>';
        } else {
            let html = '';
            data.prescribed_foods.forEach(f => {
                html += `
                    <div style="background: rgba(229, 203, 167, 0.08); border: 1px solid rgba(229, 203, 167, 0.3); border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12.5px; font-weight: 700; color: #FFFFFF;">${f.name}</span>
                        <span class="pill pill-champagne" style="font-size: 10px; padding: 2px 6px;">${f.grams}g (${f.cal} kcal)</span>
                        <button type="button" class="btn btn-outline btn-sm btn-quick-add-prescribed" data-food-id="${f.id}" data-grams="${f.grams}" style="padding: 2px 6px; font-size: 10px; border-color: rgba(255,255,255,0.2);">+ Sumar hoy</button>
                    </div>
                `;
            });
            foodsGrid.innerHTML = html;

            foodsGrid.querySelectorAll('.btn-quick-add-prescribed').forEach(btn => {
                btn.addEventListener('click', () => {
                    const foodId = btn.getAttribute('data-food-id');
                    const grams = parseInt(btn.getAttribute('data-grams'), 10) || 100;
                    const food = FOOD_CATALOG.find(x => x.id === foodId);
                    if (food) {
                        const cal = Math.round((grams * (food.calPer100 || 0)) / 100);
                        const prot = Math.round(((grams * (food.protPer100 || 0)) / 100) * 10) / 10;
                        if (!AppState.dailyNutrition) AppState.dailyNutrition = { calories: 0, protein: 0, carbs: 0, fats: 0 };
                        AppState.dailyNutrition.calories += cal;
                        AppState.dailyNutrition.protein += prot;
                        localStorage.setItem('sens_daily_nutrition', JSON.stringify(AppState.dailyNutrition));
                        updateDashboardRings();
                        showSensToast(`${food.name} (${grams}g) sumado a tu total de hoy (+${cal} kcal).`, 'success', 3000);
                    }
                });
            });
        }
    }
}


function initQuickActionButtons() {
    const btnWater = document.getElementById('btnQuickLogWater');
    if (btnWater) {
        btnWater.addEventListener('click', () => {
            AppState.dailyWater = (AppState.dailyWater || 2.0) + 0.5;
            const fuelText = document.getElementById('ringFuelText');
            if (fuelText) {
                fuelText.textContent = `${AppState.dailyWater.toFixed(1)} / 2.5 L`;
            }
            showSensToast(`+500ml agua registrados (Total: ${AppState.dailyWater.toFixed(1)} L)`, 'success', 2500);
        });
    }

    const btnWeight = document.getElementById('btnQuickLogWeight');
    if (btnWeight) {
        btnWeight.addEventListener('click', () => {
            switchPortalView('trackingView');
            setTimeout(() => {
                const input = document.getElementById('logWeight');
                if (input) input.focus();
            }, 200);
        });
    }

    const btnMeal = document.getElementById('btnQuickLogMeal');
    if (btnMeal) {
        btnMeal.addEventListener('click', () => {
            switchPortalView('nutritionView');
        });
    }

    const btnStore = document.getElementById('btnQuickGoStore');
    if (btnStore) {
        btnStore.addEventListener('click', () => {
            switchPortalView('storeView');
        });
    }
}

function updateMetabolicEquation(weight = 78.2, steps = 10450, intake = 1820) {
    // Fórmula Harris-Benedict (Mifflin-St Jeor): 10*peso + 6.25*175 - 5*33 + 5
    const bmr = Math.round(10 * weight + 6.25 * 175 - 5 * 33 + 5);
    const activeBurn = Math.round((steps * 0.04) + 120);
    const tdee = bmr + activeBurn;
    const deficit = intake - tdee;

    const bmrEl = document.getElementById('calcBmrNum');
    const actEl = document.getElementById('calcActiveBurnNum');
    const tdeeEl = document.getElementById('calcTdeeNum');
    const intakeEl = document.getElementById('calcIntakeNum');
    const defEl = document.getElementById('calcDeficitNum');

    if (bmrEl) bmrEl.textContent = bmr.toLocaleString('es-AR');
    if (actEl) actEl.textContent = activeBurn.toLocaleString('es-AR');
    if (tdeeEl) tdeeEl.textContent = tdee.toLocaleString('es-AR');
    if (intakeEl) intakeEl.textContent = intake.toLocaleString('es-AR');
    if (defEl) {
        defEl.textContent = `${deficit > 0 ? '+' : ''}${deficit} kcal`;
        defEl.style.color = deficit <= 0 ? '#10B981' : '#F59E0B';
    }
}


// =============================================================================
// SUITE 2.0 BENCHMARK EXPANSIONS (SAMSUNG HEALTH × BIGG NATIVE ARCHITECTURE)
// =============================================================================

/**
 * MÓDULO A: Modal de Porción con Regla Graduada (Ruler Slider) & Ficha FDA
 * Calcula calorías y macronutrientes por Regla de Tres Simple dinámica
 */
function initPortionRulerModal() {
    const modal = document.getElementById('portionSizeModal');
    const closeBtn = document.getElementById('closePortionModalBtn');
    const cancelBtn = document.getElementById('btnCancelPortionModal');
    const saveBtn = document.getElementById('btnSavePortionModal');
    const rulerInput = document.getElementById('portionRulerInput');
    const bubbleVal = document.getElementById('rulerBubbleVal');
    const dynamicKcal = document.getElementById('rulerDynamicKcal');
    const fdaKcal = document.getElementById('fdaValKcal');
    const fdaFatGrams = document.getElementById('fdaValFatGrams');
    const fdaFatPct = document.getElementById('fdaValFatPct');
    const fdaCarbGrams = document.getElementById('fdaValCarbGrams');
    const fdaCarbPct = document.getElementById('fdaValCarbPct');
    const fdaProtGrams = document.getElementById('fdaValProtGrams');
    const fdaProtPct = document.getElementById('fdaValProtPct');
    const fdaSegCarb = document.getElementById('fdaSegCarb');
    const fdaSegFat = document.getElementById('fdaSegFat');
    const fdaSegProt = document.getElementById('fdaSegProt');
    const fdaPctCarb = document.getElementById('fdaPctCarb');
    const fdaPctFat = document.getElementById('fdaPctFat');
    const fdaPctProt = document.getElementById('fdaPctProt');
    const rulerFoodName = document.getElementById('rulerFoodName');
    const portionModalFoodTitle = document.getElementById('portionModalFoodTitle');

    if (!modal) return;

    let activeFood = {
        name: 'Pechuga de Pollo con Arroz',
        baseGrams: 100,
        baseCal: 178,
        baseProt: 22.5,
        baseCarbs: 16.0,
        baseFat: 4.3,
        targetRow: null
    };

    function updateRulerCalculations(grams) {
        grams = Math.max(20, Math.min(400, parseInt(grams, 10) || 100));
        if (bubbleVal) {
            bubbleVal.textContent = `${grams} g`;
            // Posicionar la burbuja suavemente a lo largo del recorrido
            const pct = (grams - 20) / (400 - 20);
            bubbleVal.style.left = `calc(${pct * 100}% + (${8 - pct * 16}px))`;
        }

        // Regla de 3 simple: valor_nuevo = (gramos * valor_base) / baseGrams
        const factor = grams / (activeFood.baseGrams || 100);
        const cal = Math.round(activeFood.baseCal * factor);
        const prot = Math.round(activeFood.baseProt * factor * 10) / 10;
        const carbs = Math.round(activeFood.baseCarbs * factor * 10) / 10;
        const fat = Math.round(activeFood.baseFat * factor * 10) / 10;

        if (dynamicKcal) dynamicKcal.textContent = `${cal} kcal`;
        if (fdaKcal) fdaKcal.textContent = cal;
        if (fdaFatGrams) fdaFatGrams.textContent = `${fat}g`;
        if (fdaCarbGrams) fdaCarbGrams.textContent = `${carbs}g`;
        if (fdaProtGrams) fdaProtGrams.textContent = `${prot}g`;

        // Reparto porcentual de energía
        const cCal = carbs * 4;
        const fCal = fat * 9;
        const pCal = prot * 4;
        const macroTotal = cCal + fCal + pCal;

        let cPct = 35, fPct = 20, pPct = 45;
        if (macroTotal > 0) {
            cPct = Math.round((cCal / macroTotal) * 100);
            fPct = Math.round((fCal / macroTotal) * 100);
            pPct = Math.max(0, 100 - cPct - fPct);
        }

        if (fdaSegCarb) fdaSegCarb.style.width = `${cPct}%`;
        if (fdaSegFat) fdaSegFat.style.width = `${fPct}%`;
        if (fdaSegProt) fdaSegProt.style.width = `${pPct}%`;

        if (fdaPctCarb) fdaPctCarb.textContent = `Carb. ${cPct}%`;
        if (fdaPctFat) fdaPctFat.textContent = `Grasa ${fPct}%`;
        if (fdaPctProt) fdaPctProt.textContent = `Proteína ${pPct}%`;
        if (fdaFatPct) fdaFatPct.textContent = `${Math.min(99, Math.round(fat * 1.5))}%`;
        if (fdaCarbPct) fdaCarbPct.textContent = `${Math.min(99, Math.round(carbs * 0.35))}%`;
        if (fdaProtPct) fdaProtPct.textContent = `${Math.min(99, Math.round(prot * 2))}%`;
    }

    if (rulerInput) {
        rulerInput.addEventListener('input', (e) => {
            updateRulerCalculations(e.target.value);
        });
    }

    // Interacción táctil con las muescas de referencia
    const notches = modal.querySelectorAll('.sens-ruler-notches span');
    notches.forEach(notch => {
        notch.addEventListener('click', () => {
            const val = parseInt(notch.textContent, 10);
            if (!isNaN(val) && rulerInput) {
                rulerInput.value = val;
                updateRulerCalculations(val);
            }
        });
        notch.style.cursor = 'pointer';
    });

    function openModalForFood(data, targetRow = null) {
        activeFood = {
            name: data.foodName || 'Alimento Personalizado',
            baseGrams: 100,
            baseCal: parseFloat(data.cal) || 178,
            baseProt: parseFloat(data.prot) || 22.5,
            baseCarbs: parseFloat(data.carbs) || 16.0,
            baseFat: parseFloat(data.fat) || 4.3,
            targetRow: targetRow
        };

        if (portionModalFoodTitle) portionModalFoodTitle.textContent = activeFood.name;
        if (rulerFoodName) rulerFoodName.textContent = activeFood.name;

        const defaultGrams = 100;
        if (rulerInput) rulerInput.value = defaultGrams;
        updateRulerCalculations(defaultGrams);

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Delegación de apertura en botones .btn-open-portion-modal
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-open-portion-modal');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const row = btn.closest('.sens-meal-row');
            const data = {
                foodName: btn.getAttribute('data-food-name') || (row ? row.querySelector('.sens-meal-name')?.textContent : 'Alimento SENS'),
                cal: btn.getAttribute('data-cal') || (row ? row.querySelector('.sens-meal-badge-num')?.textContent : 180),
                prot: btn.getAttribute('data-prot') || 22,
                carbs: btn.getAttribute('data-carbs') || 18,
                fat: btn.getAttribute('data-fat') || 5
            };
            openModalForFood(data, row);
        }
    });

    // Guardado de la porción y actualización reactiva de la UI
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const grams = rulerInput ? parseInt(rulerInput.value, 10) : 100;
            const factor = grams / (activeFood.baseGrams || 100);
            const cal = Math.round(activeFood.baseCal * factor);
            const prot = Math.round(activeFood.baseProt * factor * 10) / 10;
            const carbs = Math.round(activeFood.baseCarbs * factor * 10) / 10;
            const fat = Math.round(activeFood.baseFat * factor * 10) / 10;

            if (activeFood.targetRow) {
                const badgeNum = activeFood.targetRow.querySelector('.sens-meal-badge-num');
                if (badgeNum) badgeNum.textContent = cal;
                const desc = activeFood.targetRow.querySelector('.sens-meal-desc');
                if (desc) {
                    desc.innerHTML = `${activeFood.name} — <strong style="color:var(--accent-primary);">${grams}g</strong> (${prot}g P • ${carbs}g C • ${fat}g G)`;
                }
            }

            // Recalcular total consumido hoy sumando todos los badges
            let totalCal = 0;
            document.querySelectorAll('.sens-meal-row .sens-meal-badge-num').forEach(b => {
                totalCal += parseInt(b.textContent, 10) || 0;
            });

            const consumedNum = document.getElementById('nutriConsumedNum');
            if (consumedNum) consumedNum.textContent = totalCal.toLocaleString('es-AR');

            const targetKcal = 1800;
            const sliderFill = document.getElementById('nutriSliderFill');
            if (sliderFill) {
                const ratioPct = Math.min(100, Math.round((totalCal / targetKcal) * 77));
                sliderFill.style.width = `${ratioPct}%`;
            }

            // Sincronizar macros totales en pantalla
            const carbsEl = document.getElementById('nutriCarbsGrams');
            const fatsEl = document.getElementById('nutriFatsGrams');
            const protEl = document.getElementById('nutriProtGrams');
            if (carbsEl) carbsEl.innerHTML = `${Math.round(totalCal * 0.12)}<span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">g</span>`;
            if (fatsEl) fatsEl.innerHTML = `${Math.round(totalCal * 0.038)}<span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">g</span>`;
            if (protEl) protEl.innerHTML = `${Math.round(totalCal * 0.105)}<span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">g</span>`;

            // Sincronizar Anillo Concéntrico de Calorías
            const svgCals = document.getElementById('svgConcentricCals');
            const dashCalMetricVal = document.getElementById('dashCalMetricVal');
            if (svgCals) {
                const circumference = 150.8;
                const cRatio = Math.min(1, totalCal / 2200);
                svgCals.style.strokeDashoffset = String(circumference * (1 - cRatio));
            }
            if (dashCalMetricVal) {
                dashCalMetricVal.textContent = Math.round(totalCal * 0.45);
            }

            closeModal();
            showSensToast(`${activeFood.name} (${grams}g) guardado: ${cal} kcal`, 'champagne', 3000);
        });
    }

    // Navegador de fechas en Nutrición (< mar, 6 de oct >)
    const prevDayBtn = document.getElementById('btnNutriPrevDay');
    const nextDayBtn = document.getElementById('btnNutriNextDay');
    const dateText = document.getElementById('nutriDateText');
    let dateOffset = 0;

    function updateNutriDateDisplay() {
        if (!dateText) return;
        const d = new Date();
        d.setDate(d.getDate() + dateOffset);
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        let formatted = d.toLocaleDateString('es-AR', options);
        if (dateOffset === 0) formatted += ' (Hoy)';
        else if (dateOffset === -1) formatted += ' (Ayer)';
        dateText.textContent = formatted;
    }

    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            dateOffset--;
            updateNutriDateDisplay();
        });
    }
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            dateOffset++;
            updateNutriDateDisplay();
        });
    }
    updateNutriDateDisplay();
}

/**
 * MÓDULO B: Acordeones de Bloques de Entrenamiento (Estilo BIGG)
 * Video Demostración, Cues Posturales, Logger de Series & Sticky Action Bar
 */
function initWorkoutBlockAccordions() {
    // 1. Accordion de Bloques
    const blockHeaders = document.querySelectorAll('.sens-block-accordion .sens-block-header');
    blockHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordion = header.closest('.sens-block-accordion');
            if (accordion) {
                accordion.classList.toggle('active');
            }
        });
    });

    // 2. Acordeón de Movimiento & Video (expand / collapse táctil)
    document.addEventListener('click', (e) => {
        const rowCollapsed = e.target.closest('.sens-movement-row-collapsed');
        if (rowCollapsed) {
            const card = rowCollapsed.closest('.sens-movement-item-card');
            if (card) {
                card.classList.toggle('expanded');
                const video = card.querySelector('video');
                if (video) {
                    if (card.classList.contains('expanded')) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                    }
                }
            }
        }
    });

    // 3. Set Tracker & Checkmarks con Haptic Timer
    document.addEventListener('click', (e) => {
        const checkBtn = e.target.closest('.sens-set-check-btn');
        if (checkBtn) {
            e.preventDefault();
            e.stopPropagation();
            const isChecked = checkBtn.classList.toggle('checked');
            if (isChecked) {
                checkBtn.textContent = '✓';
                const restSecs = parseInt(checkBtn.getAttribute('data-rest'), 10) || 60;
                if (typeof startRestTimer === 'function') {
                    startRestTimer(restSecs);
                }
                if (typeof playBeep === 'function') {
                    playBeep(440, 0.15);
                }
                showSensToast(`Serie completada. Descanso: ${restSecs}s`, 'champagne', 2600);
            }
        }
    });

    // 4. Sticky Action Bar ("INICIAR BLOQUE" / "PAUSAR BLOQUE")
    const stickyBtn = document.getElementById('btnStickyStartBlock');
    if (stickyBtn) {
        stickyBtn.addEventListener('click', () => {
            const toggleStopwatchBtn = document.getElementById('btnToggleStopwatch');
            if (toggleStopwatchBtn) {
                toggleStopwatchBtn.click();
                if (stopwatchRunning) {
                    stickyBtn.textContent = 'PAUSAR BLOQUE';
                    stickyBtn.style.background = '#EF4444';
                    stickyBtn.style.color = '#FFFFFF';
                    showSensToast('Bloque de entrenamiento en curso.', 'champagne', 2400);
                } else {
                    stickyBtn.textContent = 'REANUDAR BLOQUE';
                    stickyBtn.style.background = '';
                    stickyBtn.style.color = '';
                }
            }
        });
    }

    // 5. Finalizar Sesión
    const finishBtn = document.getElementById('btnFinishWorkoutSession');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            if (stopwatchRunning) {
                const toggleStopwatchBtn = document.getElementById('btnToggleStopwatch');
                if (toggleStopwatchBtn) toggleStopwatchBtn.click();
            }
            if (stickyBtn) {
                stickyBtn.textContent = 'INICIAR BLOQUE';
                stickyBtn.style.background = '';
                stickyBtn.style.color = '';
            }

            const completed = JSON.parse(localStorage.getItem('sens_completed_workout_dates') || '[]');
            const todayNum = new Date().getDate();
            if (!completed.includes(todayNum)) {
                completed.push(todayNum);
                localStorage.setItem('sens_completed_workout_dates', JSON.stringify(completed));
            }

            const weeklyTime = document.getElementById('dashWeeklyTimeNum');
            const weeklySessions = document.getElementById('dashWeeklySessionsCal');
            if (weeklyTime) weeklyTime.textContent = '5:46:12';
            if (weeklySessions) weeklySessions.textContent = '16 sesiones • 2,140 kcal';

            updateDashboardRings();
            renderMonthlyCalendar();
            updateObjectiveCardData();
            renderDynamicWeekStrip();
            showSensToast('¡Sesión finalizada con éxito! Estadísticas sincronizadas con Nico.', 'success', 4000);
        });
    }

    // 6. Muscle Filter Pills (Empuje, Tracción, Cuádriceps, Core)
    const filterPills = document.querySelectorAll('.muscle-filter-btn');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => {
                p.classList.remove('pill-champagne');
                p.classList.add('pill-dark');
            });
            pill.classList.remove('pill-dark');
            pill.classList.add('pill-champagne');

            const group = pill.getAttribute('data-group');
            const items = document.querySelectorAll('.sens-movement-item-card');
            items.forEach(card => {
                const mId = card.getAttribute('data-movement-id') || '';
                if (group === 'all') {
                    card.style.display = '';
                } else if (group === 'push' && mId.includes('pushups')) {
                    card.style.display = '';
                } else if (group === 'core_mobility' && (mId.includes('plank') || mId.includes('wm-1'))) {
                    card.style.display = '';
                } else if (group === 'hamstrings_glutes' && (mId.includes('swing') || mId.includes('bandsteps'))) {
                    card.style.display = '';
                } else {
                    card.style.display = group === 'all' ? '' : 'none';
                }
            });
        });
    });

    // Render de tabs inicial en workout view si está en el DOM
    if (typeof renderWorkoutDaysNav === 'function') {
        renderWorkoutDaysNav();
    }
}

/**
 * Dispara la animación de entrada fluida y rápida del saludo de bienvenida MAKE SENS
 */
let hasPlayedGreetingAnimation = false;

function triggerWelcomeGreetingAnimation(force = false) {
    const header = document.getElementById('sensDashWelcomeHeader');
    if (!header) return;
    if (hasPlayedGreetingAnimation && !force) return;
    hasPlayedGreetingAnimation = true;
    header.classList.remove('play-entrance');
    void header.offsetWidth; // Forzar reflow limpio para reiniciar la coreografía
    requestAnimationFrame(() => {
        header.classList.add('play-entrance');
    });
}

/**
 * Navega semanas en el calendario dinámico con física de animación GPU fluida (Swipe & Flechas)
 * @param {'prev' | 'next'} direction 
 */
function navigateCalendarWeek(direction) {
    if (!AppState.activeWeekStart) AppState.activeWeekStart = getMonday(new Date());
    const newMonday = new Date(AppState.activeWeekStart);

    if (direction === 'prev') {
        newMonday.setDate(newMonday.getDate() - 7);
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 730); // Límite: 2 años atrás
        if (newMonday < minDate) {
            showSensToast('Límite del historial alcanzado (2 años)', 'info', 1800);
            return;
        }
    } else if (direction === 'next') {
        newMonday.setDate(newMonday.getDate() + 7);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 365); // Límite: 1 año adelante
        if (newMonday > maxDate) {
            showSensToast('Límite de planificación alcanzado (1 año)', 'info', 1800);
            return;
        }
    }

    AppState.activeWeekStart = newMonday;
    renderDynamicWeekStrip();
    renderWorkoutDaysNav();
    if (typeof renderWeeklyBalanceChart === 'function') {
        renderWeeklyBalanceChart(AppState.selectedDate || new Date());
    }

    // Trigger de animación slide izquierda/derecha al strip de días
    const strip = document.getElementById('portalWeekStrip');
    if (strip) {
        strip.classList.remove('anim-slide-left', 'anim-slide-right');
        void strip.offsetWidth;
        const animClass = direction === 'next' ? 'anim-slide-left' : 'anim-slide-right';
        strip.classList.add(animClass);
        strip.addEventListener('animationend', () => {
            strip.classList.remove(animClass);
        }, { once: true });
    }

    // Micro-fade para el label de rango de fechas
    const rangeLabel = document.getElementById('sensWeekRangeLabel');
    if (rangeLabel) {
        rangeLabel.classList.remove('anim-fade');
        void rangeLabel.offsetWidth;
        rangeLabel.classList.add('anim-fade');
        rangeLabel.addEventListener('animationend', () => {
            rangeLabel.classList.remove('anim-fade');
        }, { once: true });
    }
}

/**
 * Inicializa gestos táctiles de swipe horizontal nativos en el calendario semanal
 */
function initCalendarSwipeGestures() {
    const calendarWrapper = document.getElementById('sensCalendarStickyWrapper');
    if (!calendarWrapper) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isSwiping = false;

    calendarWrapper.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
        isSwiping = true;
    }, { passive: true });

    calendarWrapper.addEventListener('touchmove', (e) => {
        if (!isSwiping || !e.touches || e.touches.length !== 1) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
    }, { passive: true });

    calendarWrapper.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Umbral de swipe: 45px horizontales y componente horizontal superior a vertical
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
            if (deltaX < 0) {
                // Swipe hacia la izquierda -> Semana siguiente
                navigateCalendarWeek('next');
            } else {
                // Swipe hacia la derecha -> Semana anterior
                navigateCalendarWeek('prev');
            }
        }

        touchStartX = 0;
        touchStartY = 0;
        touchEndX = 0;
        touchEndY = 0;
    }, { passive: true });
}

let cachedPortalTopbarHeight = 48;

/**
 * Mide la barra superior fija (.portal-topbar) una sola vez y sin recalcular en scroll
 */
function updatePortalTopbarHeight() {
    const topbar = document.querySelector('.portal-topbar');
    if (topbar) {
        const h = Math.round(topbar.getBoundingClientRect().height);
        if (h > 0) {
            cachedPortalTopbarHeight = h;
            document.documentElement.style.setProperty('--portal-topbar-height', `${h}px`);
            return h;
        }
    }
    return cachedPortalTopbarHeight;
}

/**
 * Observador de Scroll 60 FPS mediante IntersectionObserver (Zero Layout Thrashing)
 */
function initStickyCalendarWatcher() {
    const wrapper = document.getElementById('sensCalendarStickyWrapper');
    if (!wrapper) return;

    updatePortalTopbarHeight();

    const greetingHeader = document.getElementById('sensDashWelcomeHeader');
    if (greetingHeader && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            const isStuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            wrapper.classList.toggle('is-stuck', isStuck);
        }, { threshold: 0 });
        observer.observe(greetingHeader);
    } else {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const isStuck = window.scrollY > 60;
                    wrapper.classList.toggle('is-stuck', isStuck);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    window.addEventListener('resize', () => {
        updatePortalTopbarHeight();
    }, { passive: true });
}

/**
 * Dispara micro-interacción táctil elástica GPU pura sin reflow síncrono
 */
let isPortalCardNavigating = false;

function triggerCardSpringAnimation(cardEl) {
    if (!cardEl) return;
    cardEl.classList.remove('sens-card-touch-pulse');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            cardEl.classList.add('sens-card-touch-pulse');
            cardEl.addEventListener('animationend', () => {
                cardEl.classList.remove('sens-card-touch-pulse');
            }, { once: true });
        });
    });
}

/**
 * Navegación táctil con ciclo elástico completo (60/120 FPS sin cortes prematuros)
 */
function triggerCardSpringAndNavigate(cardEl, navigateFn) {
    if (!cardEl) {
        if (typeof navigateFn === 'function') navigateFn();
        return;
    }
    if (isPortalCardNavigating) return;
    isPortalCardNavigating = true;

    triggerCardSpringAnimation(cardEl);

    // Permitir ciclo elástico visual de compresión (0.965) y rebote (1.025) sin corte abrupto
    setTimeout(() => {
        try {
            if (typeof navigateFn === 'function') navigateFn();
        } finally {
            setTimeout(() => {
                isPortalCardNavigating = false;
            }, 300);
        }
    }, 140);
}

/**
 * Inicialización táctil de cards del inicio (gestión por GPU compositor)
 */
function initDashboardCardsTactileFeedback() {
    // Delegado al compositor GPU en CSS (:active y .sens-card-touch-pulse)
    // para máxima fluidez a 60/120 FPS sin layout thrashing en hilo principal
}

/**
 * MÓDULO C: Week Strip Calendar Dinámico (Pasado y Futuro), Video Training Card, Nutri Card & Objective Card
 */
function initWeekStripCalendar() {
    const btnPrev = document.getElementById('btnWeekPrev');
    const btnNext = document.getElementById('btnWeekNext');
    const btnToday = document.getElementById('btnJumpToToday');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            navigateCalendarWeek('prev');
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            navigateCalendarWeek('next');
        });
    }

    if (btnToday) {
        btnToday.addEventListener('click', () => {
            AppState.selectedDate = new Date();
            AppState.activeWeekStart = getMonday(new Date());
            AppState.currentDay = getDayKeyFromDate(new Date());
            renderDynamicWeekStrip();
            renderWorkoutDaysNav();
            updateDynamicTrainingCard(AppState.selectedDate);
            if (typeof renderWeeklyBalanceChart === 'function') {
                renderWeeklyBalanceChart(AppState.selectedDate);
            }
            showSensToast('Semana actual', 'champagne', 1500);

            const strip = document.getElementById('portalWeekStrip');
            if (strip) {
                strip.classList.remove('anim-slide-left', 'anim-slide-right');
                void strip.offsetWidth;
                strip.classList.add('anim-slide-left');
                strip.addEventListener('animationend', () => {
                    strip.classList.remove('anim-slide-left');
                }, { once: true });
            }
        });
    }

    // Inicializar gestos táctiles de swipe horizontal, watcher sticky, animación de entrada y táctil de cards
    initCalendarSwipeGestures();
    initStickyCalendarWatcher();
    if (document.getElementById('app-container')?.classList.contains('active')) {
        triggerWelcomeGreetingAnimation(true);
    }
    initDashboardCardsTactileFeedback();

    // Botón y Card de Inicio Rápido de Entrenamiento (panel activo y flecha circular)
    // 1. Card de Entrenamiento Dinámica con Video & Foco Muscular Automático
    const trainingCard = document.getElementById('dashTrainingVideoCard');
    const startWorkoutBtn = document.getElementById('dashStartWorkoutBtn');
    const workoutActivePane = document.getElementById('dashWorkoutActivePane');
    const handleStartWorkout = (e) => {
        if (e && e.target && e.target.closest('#btnRestSeeStretches')) return;
        const dayKey = getDayKeyFromDate(AppState.selectedDate || new Date());
        AppState.currentDay = dayKey;
        triggerCardSpringAndNavigate(trainingCard, () => {
            switchPortalView('workoutView');
            renderWorkoutDay(dayKey);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    if (startWorkoutBtn) {
        startWorkoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleStartWorkout(e);
        });
    }
    if (workoutActivePane) {
        workoutActivePane.addEventListener('click', handleStartWorkout);
    }
    if (trainingCard) {
        trainingCard.addEventListener('click', (e) => {
            if (e.target.closest('#btnRestSeeStretches, #dashStartWorkoutBtn, #dashWorkoutActivePane')) return;
            handleStartWorkout(e);
        });
    }

    // Botón de Estiramientos en Card de Descanso
    const btnRestSeeStretches = document.getElementById('btnRestSeeStretches');
    if (btnRestSeeStretches) {
        btnRestSeeStretches.addEventListener('click', (e) => {
            e.stopPropagation();
            AppState.selectedMuscleFilter = 'core_movilidad';
            triggerCardSpringAndNavigate(trainingCard, () => {
                switchPortalView('workoutView');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // 2. Card Nutricional con Video de Fondo & Desglose de Calorías
    const nutriCard = document.getElementById('dashNutriSummaryCard');
    const goNutriBtn = document.getElementById('dashGoNutriBtn');
    const handleGoNutri = () => {
        triggerCardSpringAndNavigate(nutriCard, () => {
            switchPortalView('nutritionView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    if (nutriCard) {
        nutriCard.addEventListener('click', (e) => {
            if (e.target.closest('#dashGoNutriBtn')) return;
            handleGoNutri();
        });
    }
    if (goNutriBtn) {
        goNutriBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleGoNutri();
        });
    }

    // 3. Card de Balance Energético
    const objCard = document.getElementById('dashObjectiveCard');
    const btnGoTrackingFromBalance = document.getElementById('btnGoTrackingFromBalance');
    const handleGoTracking = () => {
        triggerCardSpringAndNavigate(objCard, () => {
            switchPortalView('trackingView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    if (objCard) {
        objCard.addEventListener('click', (e) => {
            if (e.target.closest('#btnGoTrackingFromBalance')) return;
            handleGoTracking();
        });
    }
    if (btnGoTrackingFromBalance) {
        btnGoTrackingFromBalance.addEventListener('click', (e) => {
            e.stopPropagation();
            handleGoTracking();
        });
    }

    // 4. Card de Composición Corporal & Peso
    const bioCard = document.getElementById('dashBiometricsCard');
    const btnGoTrackingFromBio = document.getElementById('btnGoTrackingFromBio');
    const handleGoBioTracking = () => {
        triggerCardSpringAndNavigate(bioCard, () => {
            switchPortalView('trackingView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    if (bioCard) {
        bioCard.addEventListener('click', (e) => {
            if (e.target.closest('#btnOpenQuickBioModal, #btnGoTrackingFromBio')) return;
            handleGoBioTracking();
        });
    }
    if (btnGoTrackingFromBio) {
        btnGoTrackingFromBio.addEventListener('click', (e) => {
            e.stopPropagation();
            handleGoBioTracking();
        });
    }

    // 5. Card Tienda Oficial MercadoLibre
    const storeCard = document.getElementById('dashStoreCard');
    const btnStoreEntry = document.getElementById('btnDashOpenStore');
    if (storeCard) {
        storeCard.addEventListener('click', (e) => {
            if (e.target.closest('#btnDashOpenStore')) return;
            triggerCardSpringAndNavigate(storeCard, () => {
                window.open('https://listado.mercadolibre.com.ar/_CustId_12345678', '_blank');
            });
        });
    }
    if (btnStoreEntry) {
        btnStoreEntry.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerCardSpringAndNavigate(storeCard, () => {
                window.open('https://listado.mercadolibre.com.ar/_CustId_12345678', '_blank');
            });
        });
    }

    // Quick Water en Dashboard (+250ml)
    const btnWater = document.getElementById('btnQuickLogWater');
    const waterConsumedEl = document.getElementById('dashWaterConsumed');
    if (btnWater) {
        btnWater.addEventListener('click', () => {
            let current = 0;
            if (waterConsumedEl) {
                const raw = waterConsumedEl.textContent.trim();
                const parsed = parseInt(raw.replace(/\D/g, ''), 10);
                if (!isNaN(parsed) && raw !== '-') current = parsed;
                current += 250;
                waterConsumedEl.textContent = current.toLocaleString('es-AR');
            }
            AppState.dailyWater = (current / 1000);
            const todayKey = new Date().toISOString().slice(0, 10);
            localStorage.setItem(`sens_water_${todayKey}`, AppState.dailyWater);
            updateDashboardRings();
            showSensToast(`+250ml agua registrados (Total: ${(current/1000).toFixed(2)} L)`, 'success', 2200);
        });
    }

    // Inicializar renders dinámicos
    renderDynamicWeekStrip();
    renderWorkoutDaysNav();
    updateDynamicTrainingCard(AppState.selectedDate || new Date());
    updateNutriSummaryCardData();
    updateObjectiveCardData();
}

/**
 * Renderiza los 7 días de la semana activa en formato DD/MM con modalidad y asistencia
 */
function renderDynamicWeekStrip() {
    const stripContainer = document.getElementById('portalWeekStrip');
    const rangeLabel = document.getElementById('sensWeekRangeLabel');
    if (!stripContainer) return;

    if (!AppState.activeWeekStart) {
        AppState.activeWeekStart = getMonday(new Date());
    }

    if (rangeLabel) {
        rangeLabel.textContent = getWeekRangeLabel(AppState.activeWeekStart);
    }

    const athId = getActiveAthleteId();
    const data = getCoachAthleteWorkoutData(athId);
    const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    let html = '';

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(AppState.activeWeekStart);
        dayDate.setDate(AppState.activeWeekStart.getDate() + i);

        const isToday = isSameDay(dayDate, new Date());
        const isSelected = isSameDay(dayDate, AppState.selectedDate || new Date());
        const dayKey = 'day' + (i + 1);
        const dayData = data[dayKey] || {};
        const modality = dayData.modality;
        const isCompleted = Boolean(dayData.completed);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const dayDateStart = new Date(dayDate);
        dayDateStart.setHours(0, 0, 0, 0);
        const isPast = dayDateStart < todayStart;
        const hasExercises = Boolean(dayData.exercises && dayData.exercises.length > 0);

        let statusBadge = '';
        if (isCompleted) {
            statusBadge = `<span class="sens-day-badge done" title="Entrenamiento completado">✓</span>`;
        } else if (isPast) {
            if (modality === 'presencial' || modality === 'online' || modality === 'autonomo' || hasExercises) {
                statusBadge = `<span class="sens-day-badge missed" title="No realizado">✕</span>`;
            } else {
                statusBadge = `<span class="sens-day-badge rest" title="Descanso">–</span>`;
            }
        } else if (modality === 'presencial') {
            statusBadge = `<span class="sens-day-badge presencial" title="Presencial con Nico">Pres</span>`;
        } else if (modality === 'online') {
            statusBadge = `<span class="sens-day-badge online" title="Online con Nico">Online</span>`;
        } else if (modality === 'autonomo') {
            statusBadge = `<span class="sens-day-badge auto" title="Sesión autónoma">Aut</span>`;
        } else {
            statusBadge = `<span class="sens-day-badge rest" title="Sin asignar / Descanso">–</span>`;
        }

        const heroNum = dayDate.getDate();

        html += `
            <button type="button" class="sens-week-day-pill ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}" data-day-key="${dayKey}" data-date="${formatDateKey(dayDate)}">
                <span class="sens-day-name">${dayNames[i]}</span>
                <span class="sens-day-hero-num">${heroNum}</span>
                <div class="sens-day-modality-indicator">${statusBadge}</div>
            </button>
        `;
    }

    stripContainer.innerHTML = html;

    // Listeners de selección de día
    stripContainer.querySelectorAll('.sens-week-day-pill').forEach((pill, idx) => {
        pill.addEventListener('click', () => {
            stripContainer.querySelectorAll('.sens-week-day-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const dayDate = new Date(AppState.activeWeekStart);
            dayDate.setDate(AppState.activeWeekStart.getDate() + idx);
            AppState.selectedDate = dayDate;
            AppState.currentDay = 'day' + (idx + 1);

            updateDynamicTrainingCard(dayDate, 'day' + (idx + 1));
            updateNutriSummaryCardData();
            updateObjectiveCardData(dayDate);
            if (typeof updateBiometricsCardData === 'function') updateBiometricsCardData();
            renderWorkoutDaysNav();
        });
    });
}

/**
 * Renderiza las pestañas de fecha real (14/10, 15/10...) en la vista de Entrenamiento
 */
function renderWorkoutDaysNav() {
    const container = document.getElementById('workoutDaysNav');
    if (!container) return;

    if (!AppState.activeWeekStart) {
        AppState.activeWeekStart = getMonday(new Date());
    }

    const athId = getActiveAthleteId();
    const data = getCoachAthleteWorkoutData(athId);
    let html = '';

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(AppState.activeWeekStart);
        dayDate.setDate(AppState.activeWeekStart.getDate() + i);

        const isToday = isSameDay(dayDate, new Date());
        const isSelected = isSameDay(dayDate, AppState.selectedDate || new Date());
        const dayKey = 'day' + (i + 1);
        const dayData = data[dayKey] || {};
        const rawTitle = dayData.title || `Día ${i + 1}`;
        const cleanTitle = rawTitle.replace(/^Día\s*\d+:\s*/i, '');
        const dateStr = formatDateDDMM(dayDate);

        html += `
            <button type="button" class="sens-workout-day-tab ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}" data-day-key="${dayKey}">
                <span class="tab-date-num">${dateStr}</span>
                <span class="tab-title-sub">${cleanTitle}</span>
            </button>
        `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.sens-workout-day-tab').forEach((tab, idx) => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.sens-workout-day-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const dayDate = new Date(AppState.activeWeekStart);
            dayDate.setDate(AppState.activeWeekStart.getDate() + idx);
            AppState.selectedDate = dayDate;
            const dayKey = 'day' + (idx + 1);
            AppState.currentDay = dayKey;

            renderWorkoutDay(dayKey);
            renderDynamicWeekStrip();
        });
    });
}

// =============================================================================
// ICONOS VECTORIALES MONOLINE & TAXONOMÍA DINÁMICA DE ENTRENAMIENTO (ESTILO BIGG)
// =============================================================================
const SENS_TYPE_ICONS = {
    muscular: {
        label: 'Muscular',
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M2 10v4"/><path d="M5 8v8"/><path d="M7 6v12"/><path d="M17 6v12"/><path d="M19 8v8"/><path d="M22 10v4"/></svg>`
    },
    cardio: {
        label: 'Cardio',
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4" r="2"/><path d="m10 21 3-5 3 2 3-5"/><path d="m6 13 4-2 3 3 4-2"/></svg>`
    },
    movilidad: {
        label: 'Movilidad',
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4"/><polyline points="18 4 20 8 16 8"/><polyline points="6 20 4 16 8 16"/></svg>`
    },
    yoga: {
        label: 'Yoga',
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 9v5"/><path d="M6 18c1.5-2 3.5-3 6-3s4.5 1 6 3"/><path d="m7 13 5 3 5-3"/></svg>`
    }
};

/**
 * Deduce taxonomía, tipos y título dinámico de la sesión
 */
function getWorkoutSessionDetails(exercises, fallbackTitle = '') {
    if (!Array.isArray(exercises) || exercises.length === 0) {
        return {
            title: fallbackTitle ? fallbackTitle.replace(/^Día\s*\d+:\s*/i, '') : 'Descanso Activo',
            subtitle: 'Recuperación neuromuscular y regeneración tisular',
            types: [],
            totalSets: 0,
            estMinutes: 0
        };
    }

    const typesSet = new Set();
    const muscleList = [];
    let totalSets = 0;

    exercises.forEach(ex => {
        const tax = (typeof getExerciseTaxonomy === 'function') 
            ? getExerciseTaxonomy(ex) 
            : { type: 'muscular', typeLabel: 'Muscular', muscleGroup: 'piernas', muscleLabel: 'Piernas' };

        typesSet.add(tax.type);
        if (tax.type === 'muscular') {
            if (!muscleList.includes(tax.muscleLabel)) {
                muscleList.push(tax.muscleLabel);
            }
        }
        const s = parseInt(ex.sets, 10);
        totalSets += (!isNaN(s) && s > 0) ? s : 3;
    });

    // Tipos complementarios no-musculares (Cardio, Yoga, Movilidad)
    const otherTypeLabels = [];
    if (typesSet.has('cardio')) otherTypeLabels.push('Cardio');
    if (typesSet.has('yoga')) otherTypeLabels.push('Yoga');
    if (typesSet.has('movilidad')) otherTypeLabels.push('Movilidad');

    // 1. Construir Título Dinámico
    let musclePart = '';
    if (muscleList.length === 1) {
        musclePart = muscleList[0];
    } else if (muscleList.length === 2) {
        musclePart = otherTypeLabels.length > 0 ? `${muscleList[0]}, ${muscleList[1]}` : `${muscleList[0]} y ${muscleList[1]}`;
    } else if (muscleList.length === 3) {
        musclePart = otherTypeLabels.length > 0 ? `${muscleList[0]}, ${muscleList[1]}, ${muscleList[2]}` : `${muscleList[0]}, ${muscleList[1]} y ${muscleList[2]}`;
    } else if (muscleList.length >= 4) {
        musclePart = 'Full Body Muscular';
    }

    let dynamicTitle = '';
    if (musclePart) {
        if (otherTypeLabels.length > 0) {
            dynamicTitle = `${musclePart} & ${otherTypeLabels.join(' & ')}`;
        } else {
            dynamicTitle = musclePart;
        }
    } else {
        if (otherTypeLabels.length > 0) {
            if (otherTypeLabels.includes('Yoga') && otherTypeLabels.length === 1) {
                dynamicTitle = 'Sesión Integral de Yoga';
            } else if (otherTypeLabels.includes('Movilidad') && otherTypeLabels.length === 1) {
                dynamicTitle = 'Movilidad Articular & Rango';
            } else if (otherTypeLabels.includes('Cardio') && otherTypeLabels.length === 1) {
                dynamicTitle = 'Cardio & Resistencia Aeróbica';
            } else {
                dynamicTitle = otherTypeLabels.join(' & ');
            }
        } else {
            dynamicTitle = fallbackTitle ? fallbackTitle.replace(/^Día\s*\d+:\s*/i, '') : 'Entrenamiento Funcional';
        }
    }

    // 2. Subtítulo con métricas reales
    let subtitle = '';
    if (typesSet.has('yoga') && !musclePart) {
        subtitle = `Flujo respiratorio • ${exercises.length} asanas guiadas`;
    } else if (typesSet.has('movilidad') && !musclePart) {
        subtitle = `Descompresión articular y control postural • ${exercises.length} ejercicios`;
    } else {
        subtitle = `Volumen: ${totalSets} series totales • Sobrecarga progresiva`;
    }

    const estMinutes = Math.max(20, Math.round(exercises.length * 8.5 + (totalSets > 15 ? 10 : 5)));

    return {
        title: dynamicTitle,
        subtitle,
        types: Array.from(typesSet),
        totalSets,
        estMinutes
    };
}

/**
 * Actualiza la Card de Entrenamiento del Dashboard con video y taxonomía automática
 */
function updateDynamicTrainingCard(selectedDate = new Date(), dayKey = null) {
    if (!dayKey) {
        dayKey = getDayKeyFromDate(selectedDate);
    }

    const activePane = document.getElementById('dashWorkoutActivePane');
    const restPane = document.getElementById('dashWorkoutRestPane');
    const videoPlayer = document.getElementById('dashWorkoutVideoPlayer');
    const videoSource = document.getElementById('dashWorkoutVideoSource');
    const modalityPill = document.getElementById('dashWorkoutModalityPill');
    const typeIconsWrap = document.getElementById('dashWorkoutTypeIconsWrap');
    const durationPill = document.getElementById('dashWorkoutDurationPill');
    const dayDateLabel = document.getElementById('dashWorkoutDayDateLabel');
    const focusTitle = document.getElementById('dashWorkoutFocusTitle');
    const subFocus = document.getElementById('dashWorkoutSubFocus');

    const athId = getActiveAthleteId();
    const hasRoutine = athleteHasAssignedRoutine(athId);
    const data = getCoachAthleteWorkoutData(athId);
    const dayData = (data && data[dayKey]) ? data[dayKey] : null;
    const exercises = (dayData && Array.isArray(dayData.exercises)) ? dayData.exercises : [];
    const isToday = isSameDay(selectedDate, new Date());

    // Label de fecha/dominio superior (Eyebrow Champagne)
    if (dayDateLabel) {
        dayDateLabel.textContent = isToday ? 'Entrenamiento de Hoy' : `Entrenamiento del ${formatDateDDMM(selectedDate)}`;
    }

    // Caso A: Descanso o sin ejercicios asignados
    if (!hasRoutine || exercises.length === 0 || dayData?.modality === 'descanso') {
        if (activePane) activePane.style.display = 'none';
        if (restPane) restPane.style.display = 'block';
        return;
    }

    // Caso B: Con entrenamiento programado
    if (activePane) activePane.style.display = 'block';
    if (restPane) restPane.style.display = 'none';

    // 1. Obtener detalles de sesión y título dinámico
    const details = getWorkoutSessionDetails(exercises, dayData.title);

    if (focusTitle && focusTitle.textContent !== details.title) {
        focusTitle.textContent = details.title;
    }
    if (subFocus && subFocus.textContent !== details.subtitle) {
        subFocus.textContent = details.subtitle;
    }

    // 2. Fila de los 4 tipos de entrenamiento (Muscular, Cardio, Movilidad, Yoga) al fondo con icono y label
    if (typeIconsWrap) {
        const ALL_TYPES = ['muscular', 'cardio', 'movilidad', 'yoga'];
        typeIconsWrap.innerHTML = ALL_TYPES.map(typeKey => {
            const info = SENS_TYPE_ICONS[typeKey];
            if (!info) return '';
            const isActive = details.types.includes(typeKey);
            const activeClass = isActive ? 'active highlight' : 'inactive';
            const tooltip = isActive ? `${info.label}: Estimulado hoy` : `${info.label}: No incluido`;
            return `<div class="sens-type-chip ${activeClass}" title="${tooltip}">
                <span class="type-chip-icon">${info.svg}</span>
                <span class="type-chip-label">${info.label}</span>
            </div>`;
        }).join('');
    }

    // 3. Modality Pill
    const modality = dayData.modality;
    if (modalityPill) {
        if (modality === 'presencial') {
            modalityPill.textContent = 'Presencial';
            modalityPill.className = 'sens-modality-pill';
            modalityPill.style.display = 'inline-flex';
        } else if (modality === 'online') {
            modalityPill.textContent = 'Online';
            modalityPill.className = 'sens-modality-pill online';
            modalityPill.style.display = 'inline-flex';
        } else if (modality === 'autonomo') {
            modalityPill.textContent = 'Autónomo';
            modalityPill.className = 'sens-modality-pill auto';
            modalityPill.style.display = 'inline-flex';
        } else {
            modalityPill.textContent = '–';
            modalityPill.style.display = 'none';
        }
    }

    if (durationPill) {
        durationPill.textContent = `${exercises.length} ej • ~${details.estMinutes} min`;
    }

    // 4. Video de fondo adaptado al tipo dominante
    let targetVideo = 'vid/pilar-1-tecnica.mp4';
    let targetPoster = 'img/pilar-1-tecnica.jpg';

    const firstEx = exercises[0];
    if (firstEx && firstEx.video_url) {
        targetVideo = firstEx.video_url;
        targetPoster = firstEx.poster_url || targetPoster;
    } else if (details.types.includes('yoga') && !details.types.includes('muscular')) {
        targetVideo = 'vid/pilar-3-movilidad.mp4';
        targetPoster = 'img/pilar-3-movilidad.jpg';
    } else if (details.types.includes('cardio') && !details.types.includes('muscular')) {
        targetVideo = 'vid/pilar-2-vitalidad.mp4';
        targetPoster = 'img/pilar-2-vitalidad.jpg';
    } else if (details.types.includes('movilidad') && !details.types.includes('muscular')) {
        targetVideo = 'vid/pilar-3-movilidad.mp4';
        targetPoster = 'img/pilar-3-movilidad.jpg';
    } else if (details.title.toLowerCase().includes('piernas')) {
        targetVideo = 'vid/pilar-3-movilidad.mp4';
        targetPoster = 'img/pilar-3-movilidad.jpg';
    } else if (details.title.toLowerCase().includes('espalda') || details.title.toLowerCase().includes('biceps') || details.title.toLowerCase().includes('bíceps')) {
        targetVideo = 'vid/pilar-2-vitalidad.mp4';
        targetPoster = 'img/pilar-2-vitalidad.jpg';
    } else {
        targetVideo = 'vid/pilar-1-tecnica.mp4';
        targetPoster = 'img/pilar-1-tecnica.jpg';
    }

    if (videoPlayer && videoSource) {
        const currentSrc = videoSource.getAttribute('src');
        if (currentSrc !== targetVideo) {
            videoSource.setAttribute('src', targetVideo);
            videoPlayer.setAttribute('poster', targetPoster);
            videoPlayer.load();
            videoPlayer.play().catch(() => {});
        }
    }
}

// Exponer alias global para compatibilidad
window.updateDashboardWorkoutDirective = updateDynamicTrainingCard;
window.getWorkoutSessionDetails = getWorkoutSessionDetails;


/**
 * Actualiza la Card Nutricional con calorías por comida y objetivo biológico de Nico/Atleta
 */
function updateNutriSummaryCardData() {
    const targetBadge = document.getElementById('dashNutriTargetBadge');
    const goalPill = document.getElementById('dashNutriGoalPill');
    const subText = document.getElementById('dashNutriSubText');
    const nutriDayLabel = document.getElementById('dashNutriDayDateLabel');
    const caloriesHero = document.getElementById('dashNutriCaloriesHero');
    const calDesayuno = document.getElementById('calMealDesayuno');
    const calAlmuerzo = document.getElementById('calMealAlmuerzo');
    const calMerienda = document.getElementById('calMealMerienda');
    const calCena = document.getElementById('calMealCena');
    const calSnack = document.getElementById('calMealSnack');

    const profile = AppState.profile || {};
    const anamnesis = AppState.anamnesis || {};
    const athId = getActiveAthleteId();
    const isDemo = (athId === 'usr-vip-001' || athId === 'mock_vip');
    const selectedDate = AppState.selectedDate || new Date();
    const isToday = isSameDay(selectedDate, new Date());

    // Eyebrow dinámico de Nutrición
    if (nutriDayLabel) {
        nutriDayLabel.textContent = isToday ? 'Nutrición de Hoy' : `Nutrición del ${formatDateDDMM(selectedDate)}`;
    }

    // 1. Objetivo Biológico del Atleta (SENS Brandbook / Nico Coach)
    const userGoal = profile.goal || anamnesis.goal || 'fat_loss';
    if (goalPill) {
        const goalLabels = {
            fat_loss: 'Déficit Calórico',
            muscle_gain: 'Superávit Hipertrofia',
            recomp: 'Recomposición Magra',
            posture_health: 'Salud Postural'
        };
        goalPill.textContent = goalLabels[userGoal] || 'Nutrición SENS';
    }

    const rawKcal = profile.daily_calories || anamnesis.daily_calories;
    const targetKcal = rawKcal ? parseInt(rawKcal, 10) : (isDemo ? 1950 : 0);

    if (!targetKcal || targetKcal <= 0) {
        if (targetBadge) targetBadge.textContent = '-';
        if (caloriesHero) caloriesHero.textContent = 'Nutrición SENS';
        if (subText) subText.textContent = 'Plan nutricional adaptado por Nico';
        if (calDesayuno) calDesayuno.textContent = '-';
        if (calAlmuerzo) calAlmuerzo.textContent = '-';
        if (calMerienda) calMerienda.textContent = '-';
        if (calCena) calCena.textContent = '-';
        if (calSnack) calSnack.textContent = '-';
        return;
    }

    // 2. Proteínas y Carbohidratos Recomendados en la Pastilla Superior
    const weightRaw = profile.current_weight || anamnesis.weight;
    const currentWeight = weightRaw ? parseFloat(weightRaw) : (isDemo ? 75.8 : 70.0);
    // Proteína: ~1.9 - 2.0g/kg para preservar masa muscular (o ~28% de kcal)
    const recProtein = profile.target_protein ? Math.round(profile.target_protein) : Math.round(Math.max(120, currentWeight * 1.85)); // ~140g
    // Carbohidratos recomendados: energía limpia (~40% de kcal)
    const recCarbs = profile.target_carbs ? Math.round(profile.target_carbs) : Math.round((targetKcal * 0.39) / 4); // ~190g

    if (targetBadge) {
        targetBadge.textContent = `${recProtein}g Prot • ${recCarbs}g Carbs`;
    }

    // 3. Título Hero: Calorías Totales del Día
    if (caloriesHero) {
        caloriesHero.textContent = `${targetKcal.toLocaleString('es-AR')} kcal Totales`;
    }

    // 4. Subtítulo: Objetivo Biológico y Coaching
    if (subText) {
        const goalSubtexts = {
            fat_loss: 'Déficit calórico estructurado para preservar masa muscular',
            muscle_gain: 'Superávit calórico calibrado para máxima síntesis proteica',
            recomp: 'Aporte óptimo para recomposición magra y rendimiento',
            posture_health: 'Plan antiinflamatorio para longevidad y vitalidad'
        };
        subText.textContent = goalSubtexts[userGoal] || 'Plan calibrado por Nico para síntesis proteica & energía';
    }

    // 5. Desglose en 5 ingestas: 4 principales + 1 bocadillo (20%, 35%, 15%, 20%, 10%)
    if (calDesayuno) calDesayuno.textContent = `${Math.round(targetKcal * 0.20)} kcal`;
    if (calAlmuerzo) calAlmuerzo.textContent = `${Math.round(targetKcal * 0.35)} kcal`;
    if (calMerienda) calMerienda.textContent = `${Math.round(targetKcal * 0.15)} kcal`;
    if (calCena) calCena.textContent = `${Math.round(targetKcal * 0.20)} kcal`;
    if (calSnack) calSnack.textContent = `${Math.round(targetKcal * 0.10)} kcal`;
}

/**
 * Calcula las métricas metabólicas del día seleccionado (Ecuación real de balance energético)
 */
function getDailyMetabolicMetrics(targetDate) {
    const athId = getActiveAthleteId();
    const isDemo = (athId === 'usr-vip-001' || athId === 'mock_vip');
    const profile = AppState.profile || {};
    const anamnesis = AppState.anamnesis || {};

    const weightRaw = profile.current_weight || anamnesis.weight;
    const weight = weightRaw ? parseFloat(weightRaw) : (isDemo ? 76.0 : 70.0);
    const bmr = Math.round(weight * 22);

    const dayKey = getDayKeyFromDate(targetDate);
    const data = getCoachAthleteWorkoutData(athId);
    const dayData = data[dayKey] || {};
    const hasWorkout = Boolean(dayData.exercises && dayData.exercises.length > 0 && dayData.modality !== 'descanso');

    const workoutBurn = hasWorkout ? 380 : 0;
    const dailySteps = hasWorkout ? 9200 : 7100;
    const stepsBurn = Math.round(dailySteps * 0.04);
    const activeBurn = stepsBurn + workoutBurn;
    const tdee = bmr + activeBurn;

    const rawKcal = profile.daily_calories || anamnesis.daily_calories;
    let targetIntake = rawKcal ? parseInt(rawKcal, 10) : (isDemo ? 1850 : 2000);

    const netBalance = targetIntake - tdee;

    return {
        weight,
        bmr,
        dailySteps,
        stepsBurn,
        workoutBurn,
        activeBurn,
        tdee,
        targetIntake,
        netBalance,
        hasWorkout
    };
}

/**
 * Renderiza el gráfico semanal interactivo con Chart.js en #dashWeeklyBalanceChart
 */
/**
 * Renderiza el gráfico semanal interactivo con Chart.js en #dashWeeklyBalanceChart
 */
function renderWeeklyBalanceChart(selectedDate = new Date()) {
    const canvas = document.getElementById('dashWeeklyBalanceChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (!AppState.activeWeekStart) {
        AppState.activeWeekStart = getMonday(new Date());
    }

    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const weekStats = [];
    const barColors = [];
    const borderColors = [];

    const profile = AppState.profile || {};
    const userGoal = profile.goal || 'fat_loss';
    const isMuscleGain = userGoal === 'muscle_gain';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const d = new Date(AppState.activeWeekStart);
        d.setDate(AppState.activeWeekStart.getDate() + i);
        const dStart = new Date(d);
        dStart.setHours(0, 0, 0, 0);
        const isFuture = dStart > today;

        const m = getDailyMetabolicMetrics(d);
        const dayLabel = `${dayLabels[i]} ${d.getDate()}`;
        weekStats.push({ label: dayLabel, ...m, date: d, isFuture });

        if (isFuture) {
            // Días que aún no transcurrieron: NUNCA en ámbar de error. Barra neutra sutil de planificación
            barColors.push('rgba(255, 255, 255, 0.05)');
            borderColors.push('rgba(255, 255, 255, 0.12)');
        } else {
            // Lógica adaptable según el objetivo (Déficit vs Superávit)
            let isOptimal = false;
            if (isMuscleGain) {
                // Hipertrofia: Superávit objetivo (+150 a +550 kcal)
                isOptimal = (m.netBalance >= 150 && m.netBalance <= 550);
            } else {
                // Pérdida de grasa: Déficit objetivo (-200 a -750 kcal)
                isOptimal = (m.netBalance <= -200 && m.netBalance >= -750);
            }

            if (isOptimal) {
                // Objetivo cumplido: Siempre Champagne Gold
                barColors.push('rgba(229, 203, 167, 0.85)');
                borderColors.push('#E5CBA7');
            } else {
                // Fuera del objetivo pautado: Ámbar / Arena suave
                barColors.push('rgba(217, 119, 6, 0.75)');
                borderColors.push('#D97706');
            }
        }
    }

    // Calcular límites simétricos para centrar el 0 en el medio exacto del eje Y
    const maxVal = Math.max(600, ...weekStats.map(s => Math.abs(s.netBalance || 0)));
    const yLimit = Math.ceil((maxVal * 1.25) / 100) * 100;

    if (window._sensWeeklyBalanceChart) {
        window._sensWeeklyBalanceChart.destroy();
    }

    try {
        const ctx = canvas.getContext('2d');
        window._sensWeeklyBalanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekStats.map(s => s.label),
                datasets: [{
                    data: weekStats.map(s => s.netBalance),
                    backgroundColor: barColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 22,
                    barPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 6, bottom: 0, left: 0, right: 0 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#09090B',
                        titleColor: '#FFFFFF',
                        titleFont: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
                        bodyColor: '#E5CBA7',
                        bodyFont: { family: 'Plus Jakarta Sans', size: 10.5 },
                        padding: 9,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const item = weekStats[context.dataIndex];
                                if (item.isFuture) {
                                    return [
                                        `Planificado: ${userGoal === 'muscle_gain' ? '+300' : '-400'} kcal`,
                                        `Día aún no transcurrido`
                                    ];
                                }
                                const sign = item.netBalance > 0 ? '+' : '';
                                return [
                                    `Balance: ${sign}${item.netBalance} kcal`,
                                    `Ingesta: ${item.targetIntake} kcal • Gasto: ${item.tdee} kcal`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#A1A1AA',
                            font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' }
                        }
                    },
                    y: {
                        min: -yLimit,
                        max: yLimit,
                        grid: {
                            color: (context) => (context.tick && context.tick.value === 0) ? 'rgba(229, 203, 167, 0.45)' : 'rgba(255, 255, 255, 0.05)',
                            lineWidth: (context) => (context.tick && context.tick.value === 0) ? 1.5 : 1
                        },
                        ticks: {
                            color: (context) => (context.tick && context.tick.value === 0) ? '#E5CBA7' : '#A1A1AA',
                            font: { family: 'Plus Jakarta Sans', size: 9 },
                            callback: function(val) {
                                return (val > 0 ? '+' : '') + val;
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.warn('Error al renderizar el gráfico semanal de balance:', e);
    }
}

/**
 * Actualiza la Card de Balance Energético con los valores reales del día y el gráfico semanal
 */
function updateObjectiveCardData(selectedDate = null) {
    if (!selectedDate) {
        selectedDate = AppState.selectedDate || new Date();
    }

    const dateLabel = document.getElementById('dashBalanceDateLabel');
    const goalPill = document.getElementById('dashObjectiveGoalPill');
    const ingestaNum = document.getElementById('dashIngestaNum');
    const tdeeNum = document.getElementById('dashTdeeNum');
    const netValEl = document.getElementById('dashNetDeficitVal');
    const statusTextEl = document.getElementById('dashBalanceStatusText');
    const breakdownEl = document.getElementById('dashBalanceBurnBreakdown');
    const graphGoalTarget = document.getElementById('dashGraphGoalTarget');
    const consistencyScoreText = document.getElementById('dashConsistencyScoreText');
    const btnGoTracking = document.getElementById('btnGoTrackingFromBalance');

    const metrics = getDailyMetabolicMetrics(selectedDate);
    const isToday = isSameDay(selectedDate, new Date());

    if (dateLabel) {
        const d = selectedDate || AppState.selectedDate || new Date();
        const formatted = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        dateLabel.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    const profile = AppState.profile || {};
    const userGoal = profile.goal || 'fat_loss';
    const isMuscleGain = userGoal === 'muscle_gain';

    if (goalPill) {
        goalPill.textContent = isMuscleGain ? 'Meta: +300 kcal' : 'Meta: -400 kcal';
        goalPill.style.background = 'rgba(229, 203, 167, 0.12)';
        goalPill.style.color = '#E5CBA7';
        goalPill.style.borderColor = 'rgba(229, 203, 167, 0.3)';
    }

    if (graphGoalTarget) {
        graphGoalTarget.textContent = isMuscleGain ? '+300 kcal/día' : '-400 kcal/día';
    }

    if (ingestaNum) {
        ingestaNum.textContent = metrics.targetIntake.toLocaleString('es-AR');
    }

    if (tdeeNum) {
        tdeeNum.textContent = metrics.tdee.toLocaleString('es-AR');
    }

    if (breakdownEl) {
        breakdownEl.textContent = `Basal: ${metrics.bmr.toLocaleString('es-AR')} • Activo: ${metrics.activeBurn.toLocaleString('es-AR')} (Pasos: ${metrics.stepsBurn} • Entreno: ${metrics.workoutBurn})`;
    }

    const netBoxEl = document.getElementById('dashBalanceNetBox');
    if (netValEl) {
        const sign = metrics.netBalance > 0 ? '+' : '';
        netValEl.innerHTML = `${sign}${metrics.netBalance.toLocaleString('es-AR')} <span class="unit">kcal</span>`;
    }

    if (statusTextEl) {
        const isOptimal = isMuscleGain ? (metrics.netBalance >= 150) : (metrics.netBalance <= -300);
        if (isOptimal) {
            statusTextEl.textContent = isMuscleGain ? 'Superávit Cumplido' : 'Déficit Logrado';
            statusTextEl.style.color = '#E5CBA7';
            if (netValEl) netValEl.style.color = '#E5CBA7';
            if (netBoxEl) {
                netBoxEl.style.borderColor = 'rgba(229, 203, 167, 0.28)';
                netBoxEl.style.background = 'linear-gradient(135deg, rgba(229, 203, 167, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)';
            }
        } else {
            statusTextEl.textContent = metrics.netBalance > 0 ? 'Superávit Elevado' : 'Ajuste Requerido';
            statusTextEl.style.color = '#D97706';
            if (netValEl) netValEl.style.color = '#D97706';
            if (netBoxEl) {
                netBoxEl.style.borderColor = 'rgba(217, 119, 6, 0.28)';
                netBoxEl.style.background = 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)';
            }
        }
    }

    // Renderizar gráfico semanal
    renderWeeklyBalanceChart(selectedDate);

    // Sincronizar card de biometría
    if (typeof updateBiometricsCardData === 'function') {
        updateBiometricsCardData(selectedDate);
    }

    // Listener para ir a seguimiento
    if (btnGoTracking) {
        btnGoTracking.onclick = (e) => {
            if (e) e.stopPropagation();
            const card = document.getElementById('dashObjectiveCard');
            if (typeof triggerCardSpringAndNavigate === 'function') {
                triggerCardSpringAndNavigate(card, () => {
                    switchPortalView('trackingView');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            } else if (typeof switchPortalView === 'function') {
                switchPortalView('trackingView');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }
}

/**
 * Actualiza la Card de Composición Corporal & Peso (#dashBiometricsCard)
 */
function updateBiometricsCardData(selectedDate = null) {
    const currentWeightEl = document.getElementById('dashBioCurrentWeight');
    const targetWeightEl = document.getElementById('dashBioTargetWeight');
    const weightDeltaEl = document.getElementById('dashBioWeightDelta');
    const currentMuscleEl = document.getElementById('dashBioCurrentMuscle');
    const targetMuscleEl = document.getElementById('dashBioTargetMuscle');
    const currentFatEl = document.getElementById('dashBioCurrentFat');
    const targetFatEl = document.getElementById('dashBioTargetFat');
    const initialWeightEl = document.getElementById('dashBioInitialWeight');
    const targetWeightBarEl = document.getElementById('dashBioTargetWeightBar');
    const progressBar = document.getElementById('dashBioProgressBar');
    const progressPct = document.getElementById('dashBioProgressPct');
    const lastLoggedDate = document.getElementById('dashBioLastLoggedDate');
    const bioDateLabel = document.getElementById('dashBioDateLabel');
    const btnGoBio = document.getElementById('btnGoTrackingFromBio');

    const d = selectedDate || AppState.selectedDate || new Date();
    const isToday = isSameDay(d, new Date());

    if (bioDateLabel) {
        const formatted = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
        bioDateLabel.textContent = `Registro al ${formatted}`;
    }

    const profile = AppState.profile || {};
    const anamnesis = AppState.anamnesis || {};
    const athId = getActiveAthleteId();
    const isDemo = (athId === 'usr-vip-001' || athId === 'mock_vip');

    const weightRaw = profile.current_weight || anamnesis.weight;
    const currentWeight = weightRaw ? parseFloat(weightRaw) : (isDemo ? 75.8 : 76.0);
    const initialWeight = profile.initial_weight || anamnesis.initial_weight || (isDemo ? 82.0 : 80.0);
    const targetWeight = profile.target_weight || anamnesis.target_weight || (isDemo ? 72.0 : 70.0);

    const muscleRaw = profile.muscle_mass || anamnesis.muscle_mass;
    const currentMuscle = muscleRaw ? parseFloat(muscleRaw) : (isDemo ? 35.2 : 34.0);
    const targetMuscle = profile.target_muscle_mass || (isDemo ? 36.5 : 36.0);

    const fatRaw = profile.body_fat || anamnesis.body_fat;
    const currentFat = fatRaw ? parseFloat(fatRaw) : (isDemo ? 13.8 : 15.0);
    const targetFat = profile.target_body_fat || (isDemo ? 11.5 : 12.0);

    if (currentWeightEl) currentWeightEl.textContent = currentWeight.toFixed(1);
    if (targetWeightEl) targetWeightEl.textContent = `${targetWeight.toFixed(1)} kg`;
    if (currentMuscleEl) currentMuscleEl.textContent = currentMuscle.toFixed(1);
    if (targetMuscleEl) targetMuscleEl.textContent = `${targetMuscle.toFixed(1)} kg`;
    if (currentFatEl) currentFatEl.textContent = currentFat.toFixed(1);
    if (targetFatEl) targetFatEl.textContent = `${targetFat.toFixed(1)}%`;

    if (weightDeltaEl) {
        const totalDelta = currentWeight - initialWeight;
        const sign = totalDelta > 0 ? '+' : '';
        weightDeltaEl.textContent = `${sign}${totalDelta.toFixed(1)} kg vs inicio`;
    }

    if (initialWeightEl) initialWeightEl.textContent = `${initialWeight.toFixed(1)} kg`;
    if (targetWeightBarEl) targetWeightBarEl.textContent = `${targetWeight.toFixed(1)} kg`;

    if (progressBar && progressPct) {
        const totalToLose = Math.abs(initialWeight - targetWeight);
        const lostSoFar = Math.abs(initialWeight - currentWeight);
        const pct = totalToLose > 0 ? Math.min(100, Math.max(5, Math.round((lostSoFar / totalToLose) * 100))) : 68;
        progressBar.style.width = `${pct}%`;
        progressPct.textContent = `${pct}% completado`;
    }

    if (lastLoggedDate) {
        lastLoggedDate.textContent = isToday ? `Último pesaje: Hoy 08:30 hs` : `Último pesaje: ${formatDateDDMM(d)}`;
    }

    if (btnGoBio) {
        btnGoBio.onclick = (e) => {
            if (e) e.stopPropagation();
            const card = document.getElementById('dashBiometricsCard');
            if (typeof triggerCardSpringAndNavigate === 'function') {
                triggerCardSpringAndNavigate(card, () => {
                    switchPortalView('trackingView');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            } else if (typeof switchPortalView === 'function') {
                switchPortalView('trackingView');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }
}

/**
 * Inicializa el Modal Rápido de Carga de Peso & Pasos
 */
function initQuickBiometricsModal() {
    const modal = document.getElementById('quickBiometricsModal');
    const openBtn = document.getElementById('btnOpenQuickBioModal');
    const closeBtn = document.getElementById('btnCloseQuickBioModal');
    const form = document.getElementById('quickBioForm');
    const weightInp = document.getElementById('quickInputWeight');
    const muscleInp = document.getElementById('quickInputMuscle');
    const fatInp = document.getElementById('quickInputFat');
    const stepsInp = document.getElementById('quickInputSteps');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const profile = AppState.profile || {};
            const anamnesis = AppState.anamnesis || {};
            if (weightInp) weightInp.value = profile.current_weight || anamnesis.weight || '75.8';
            if (muscleInp) muscleInp.value = profile.muscle_mass || '35.2';
            if (fatInp) fatInp.value = profile.body_fat || anamnesis.body_fat || '13.8';
            if (stepsInp) stepsInp.value = AppState.dailySteps || '8500';
            modal.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const w = parseFloat(weightInp?.value);
            const m = parseFloat(muscleInp?.value);
            const f = parseFloat(fatInp?.value);
            const s = parseInt(stepsInp?.value, 10);

            if (!AppState.profile) AppState.profile = {};
            if (!isNaN(w) && w > 0) AppState.profile.current_weight = w;
            if (!isNaN(m) && m > 0) AppState.profile.muscle_mass = m;
            if (!isNaN(f) && f > 0) AppState.profile.body_fat = f;
            if (!isNaN(s) && s > 0) AppState.dailySteps = s;

            const athId = getActiveAthleteId();
            localStorage.setItem(`sens_profile_${athId}`, JSON.stringify(AppState.profile));

            modal.style.display = 'none';
            if (typeof showSensToast === 'function') {
                showSensToast('Métricas actualizadas con éxito.', 'champagne');
            }

            // Actualizar reactivamente todas las tarjetas
            if (typeof updateObjectiveCardData === 'function') updateObjectiveCardData();
            if (typeof updateBiometricsCardData === 'function') updateBiometricsCardData();
        });
    }
}

/**
 * MÓDULO D: Floating Dock Inferior Móvil (Estilo BIGG / Samsung Health)
 */
function initFloatingDock() {
    const isPortal = document.body.classList.contains('in-portal');
    document.querySelectorAll('.sens-floating-dock').forEach(dock => {
        if (!isPortal) {
            dock.style.display = 'none';
        }
    });

    const dockItems = document.querySelectorAll('.sens-dock-item[data-dock-tab]');
    dockItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-dock-tab');
            if (targetTab) {
                switchPortalView(targetTab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

/**
 * MÓDULO E: Sincronización de Triggers de Alumnos del Coach OS
 */
function initCoachAthletePickerTriggers() {
    document.querySelectorAll('.btn-trigger-athlete-sheet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bottomSheet = document.getElementById('athletePickerBottomSheet');
            const sheetBackdrop = document.getElementById('athleteSheetBackdrop');
            if (bottomSheet && sheetBackdrop) {
                bottomSheet.classList.add('active');
                sheetBackdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
                if (typeof renderAthleteBottomSheetList === 'function') {
                    renderAthleteBottomSheetList();
                }
            }
        });
    });
}
