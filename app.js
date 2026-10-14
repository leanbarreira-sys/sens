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
        email === 'lean.barreira@gmail.com'
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
    },
    day4: {
        title: 'Día 4: Core & Movilidad (Casa / Edificio)',
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
    initQuickActionButtons();
    renderMonthlyCalendar();
    initWorkoutStopwatch();
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
            if (mobileMenu) mobileMenu.style.display = 'none';

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
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                dbAthletes = data;
            }
        } catch (e) {
            console.warn('Error al cargar atletas de Supabase para coach:', e);
        }
    }

    window.__coachAthletesCache = dbAthletes;

    // Sincronizar Bottom Sheet Nativo
    renderAthleteBottomSheetList();

    // Sincronizar selectores del Hub de Coach
    const roster = getConsolidatedCoachAthletes();
    ['coachNutritionAthleteSelector', 'coachWorkoutAthleteSelector', 'coachDashNoteAthleteSelector'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (sel) {
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

    const isAdmin = isCurrentUserAdmin();
    filtered.forEach(ex => {
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
                showSensToast(`${exName} asignado correctamente a ${currentDay.toUpperCase()}.`, 'champagne');
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
        el.classList.add('sens-reveal');
        observer.observe(el);
    });
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

        mobileMenu.querySelectorAll('a, button').forEach(el => {
            if (el !== mobileMenuCloseBtn) {
                el.addEventListener('click', () => {
                    mobileMenu.style.display = 'none';
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

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) {
                showAuthAlert(formatAuthErrorMessage(error.message), 'error');
                return;
            }

            // Si Supabase requiere confirmación de email y no retorna sesión inmediata:
            if (data.user && !data.session) {
                showAuthAlert('¡Cuenta creada con éxito! Te enviamos un correo de confirmación a tu email para activar tu acceso. Por favor revisá tu bandeja de entrada o spam.', 'success');
                return;
            }

            AppState.user = data.user;
            AppState.profile = { 
                id: data.user.id, 
                full_name: fullName, 
                email: email,
                role: 'user_normal',
                user_type: 'client_presencial_vip',
                subscription_status: 'pending_activation',
                billing_provider: 'manual',
                onboarding_completed: false 
            };
            try {
                await supabaseClient.from('profiles').upsert(AppState.profile);
            } catch (err) {
                console.warn('[SENS] Error al guardar perfil inicial en registro:', err);
            }
        } else {
            AppState.user = { id: 'local-user-' + Date.now(), email };
            AppState.profile = { 
                full_name: fullName, 
                subscription_status: 'pending_activation',
                onboarding_completed: false 
            };
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        // Enviar alerta inmediata a los mails de Nico y Lean
        sendCoachEmailAlert({
            type: 'Nueva Cuenta Creada (Atleta Registrado)',
            athleteName: fullName,
            athleteEmail: email,
            details: 'El usuario se acaba de registrar en el portal. Su estado inicial es: PENDIENTE DE ACTIVACIÓN.'
        }).catch(() => {});

        showAuthAlert('¡Cuenta creada con éxito! Ingresando a tu cuenta...', 'success');
        updateAuthNavButtons();
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(true); // Redirige a Evaluación inicial para nuevos atletas
        }, 700);
    });
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

        // Suscripción reactiva a cambios de sesión (login, logout, refresh de token)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session && session.user) {
                AppState.user = session.user;
                await loadProfileFromSupabase(session.user.id);
                updateAuthNavButtons();
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
    if (viewId === 'profileSettingsView') {
        renderProfileSettingsData();
    }
}


function openUserPortal(forceOnboarding = false) {
    const portal = document.getElementById('app-container');
    const publicLanding = document.getElementById('publicLanding');
    const userEmailEl = document.getElementById('portalUserEmail');
    const planBadgeEl = document.getElementById('portalPlanBadge');
    const coachBar = document.getElementById('coachAthleteBar');
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
    if (coachBar) {
        coachBar.style.display = isAdmin ? 'flex' : 'none';
        if (isAdmin) {
            loadCoachAthletesList();
            renderCoachAthletesHub();
        }
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
        // Redirige al Paywall de Activación
        document.getElementById('portalSubNav').style.display = 'none';

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
        startDiagnosisWizard(false);
    } else {
        // Redirige al Dashboard de Atleta
        document.getElementById('portalSubNav').style.display = 'flex';
        renderDashboardData();
        renderWorkoutDay(AppState.currentDay || 'day1');
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
        animateNumber(weightKpi, parseFloat(profile.current_weight) || 78.2, 800, ' <span style="font-size:1rem; font-weight:400;">kg</span>', 1);
    }
    const stepsKpi = document.getElementById('kpiAvgSteps');
    if (stepsKpi) {
        const targetSteps = parseInt(anamnesis.daily_step_target || profile.daily_step_target || 10420, 10);
        animateNumber(stepsKpi, targetSteps, 850);
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

function renderWorkoutDay(dayKey) {
    AppState.currentDay = dayKey;
    const dayData = WORKOUT_DAYS_DATA[dayKey];
    const container = document.getElementById('exercisesContainer');
    if (!dayData || !container) return;

    const isAdmin = isCurrentUserAdmin();
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

    // Sincronizar Hero Card de Sesión de Hoy
    const heroTitle = document.getElementById('heroWorkoutTitle');
    const heroSub = document.getElementById('heroWorkoutSubtitle');
    if (heroTitle) heroTitle.textContent = dayData.title || `Día: ${dayKey}`;
    if (heroSub) heroSub.textContent = `${exercisesToShow.length} Ejercicios asignados • ~${Math.max(30, exercisesToShow.length * 12)} min estimadas • Descanso cronometrado por serie`;

    let html = '';
    exercisesToShow.forEach((ex, idx) => {
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
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="pill pill-champagne" style="font-size: 9.5px; padding: 2px 7px; font-weight: 700;">Ejercicio ${idx + 1} de ${exercisesToShow.length}</span>
                        </div>
                        <h3 class="exercise-title" style="margin-top: 4px;">${ex.name}</h3>
                        <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 6px; background: rgba(229, 203, 167, 0.08); border: 1px solid rgba(229, 203, 167, 0.2); padding: 4px 10px; border-radius: 6px; font-size: 11.5px; color: var(--accent-primary);">
                            <strong>¿Para qué sirve?</strong> ${ex.notes || 'Fortalecimiento biomecánico y postura funcional'}
                        </div>
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
        workoutCirc.style.strokeDashoffset = hasTrainedToday ? '0' : '45';
    }
    if (workoutText) {
        workoutText.textContent = hasTrainedToday ? 'Completado' : 'En Progreso';
        workoutText.style.color = hasTrainedToday ? '#10B981' : 'var(--accent-primary)';
    }

    // 2. Anillo de Pasos (meta: 10.000)
    const currentSteps = 7450;
    const stepTarget = 10000;
    const stepRatio = Math.min(1, currentSteps / stepTarget);
    if (stepsCirc) {
        stepsCirc.style.strokeDashoffset = String(circumference * (1 - stepRatio));
    }
    if (stepsText) {
        stepsText.textContent = `${currentSteps.toLocaleString('es-AR')} / 10k`;
    }

    // 3. Anillo de Fuel & Agua (kcal y litros)
    const nutrition = AppState.dailyNutrition || JSON.parse(localStorage.getItem('sens_daily_nutrition') || '{"calories":1650,"protein":125,"carbs":170,"fats":48}');
    const water = AppState.dailyWater || 2.0;
    const calTarget = 2100;
    const fuelRatio = Math.min(1, (nutrition.calories || 1650) / calTarget);
    if (fuelCirc) {
        fuelCirc.style.strokeDashoffset = String(circumference * (1 - fuelRatio));
    }
    if (fuelText) {
        fuelText.textContent = `${water.toFixed(1)} / 2.5 L`;
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
        let statusClass = 'active';
        let statusLabel = 'Activo';

        if (status === 'pending_activation') {
            statusClass = 'pending';
            statusLabel = 'Pendiente';
        } else if (status === 'paused') {
            statusClass = 'paused';
            statusLabel = 'Pausado';
        }

        html += `
            <div class="sheet-athlete-item ${isSelected ? 'is-selected' : ''}" data-athlete-id="${ath.id}">
                <div class="sheet-athlete-left">
                    <div class="sheet-athlete-avatar">${initials}</div>
                    <div class="sheet-athlete-info">
                        <span class="sheet-athlete-name">${ath.full_name}</span>
                        <span class="sheet-athlete-sub">${ath.active_plan_name || 'Plan SENS'} • ${ath.email}</span>
                    </div>
                </div>
                <div class="sheet-athlete-status">
                    <span class="status-dot status-dot-${statusClass}"></span>
                    <span>${statusLabel}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.sheet-athlete-item').forEach(item => {
        item.addEventListener('click', () => {
            const athId = item.getAttribute('data-athlete-id');
            selectAthleteFromSheet(athId);
        });
    });
}

function selectAthleteFromSheet(athId) {
    const roster = getConsolidatedCoachAthletes();
    const athlete = roster.find(a => a.id === athId);
    if (!athlete) return;

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
        if (el) el.value = athId;
    });

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

    dbAthletes.forEach(ath => {
        seenIds.add(ath.id);
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

function initCoachAthletesHub() {
    const searchInput = document.getElementById('coachSearchAthleteInput');
    const filterBtns = document.querySelectorAll('.coach-filter-status');

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
                            <select class="input-control coach-athlete-plan-select" data-athlete-id="${ath.id}" style="width: auto; min-width: 210px; padding: 2px 8px; font-size: 11px; height: 26px; margin-bottom: 0; background: var(--bg-surface);">
                                <option value="client_presencial_vip" ${planKey === 'client_presencial_vip' ? 'selected' : ''}>Presencial 1 a 1 VIP (CABA)</option>
                                <option value="client_presencial_group" ${planKey === 'client_presencial_group' ? 'selected' : ''}>Presencial Dúo / Grupo</option>
                                <option value="client_online_premium" ${planKey === 'client_online_premium' ? 'selected' : ''}>Online Premium (Diario)</option>
                                <option value="client_online_basic" ${planKey === 'client_online_basic' ? 'selected' : ''}>Online Básico</option>
                            </select>
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

    container.querySelectorAll('.coach-athlete-plan-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            const athId = sel.getAttribute('data-athlete-id');
            const newPlanKey = e.target.value;
            await updateAthletePlanType(athId, newPlanKey);
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
    if (athId.startsWith('mock_')) {
        const stored = JSON.parse(localStorage.getItem(`sens_athlete_override_${athId}`) || '{}');
        stored.subscription_status = newStatus;
        localStorage.setItem(`sens_athlete_override_${athId}`, JSON.stringify(stored));
    }

    renderCoachAthletesHub();
    loadCoachAthletesList();
    showSensToast(
        newStatus === 'active' 
            ? 'Atleta aprobado con éxito! Acceso y entrenamientos habilitados.' 
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

    switchPortalView('dashView');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showSensToast(`Inspeccionando vista de ${target.full_name}.`, 'champagne');
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
    const raw = localStorage.getItem(`sens_prescribed_workouts_${athId}`);
    if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(WORKOUT_DAYS_DATA));
}

function renderCoachAssignedExercises() {
    const container = document.getElementById('coachAssignedExercisesContainer');
    const titleInput = document.getElementById('coachDayTitleInput');
    if (!container) return;

    const data = getCoachAthleteWorkoutData(coachWorkoutState.activeAthleteId);
    const day = data[coachWorkoutState.activeDay] || { title: `Día: ${coachWorkoutState.activeDay}`, exercises: [] };

    if (titleInput) titleInput.value = day.title;

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

    if (AppState.user && (AppState.user.id === athId || athId === 'mock_vip')) {
        Object.assign(WORKOUT_DAYS_DATA, data);
        renderWorkoutDay(AppState.currentDay || 'day1');
        renderMonthlyCalendar();
    }

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

            const dashWeeklyNote = document.getElementById('dashCoachWeeklyNote');
            if (dashWeeklyNote && body) dashWeeklyNote.textContent = body;

            showSensToast('Mensaje de Nico publicado en el Dashboard del alumno.', 'champagne');
        });
    }

    loadCoachAthleteDashNote('mock_vip');
}

function loadCoachAthleteDashNote(athId) {
    const raw = localStorage.getItem(`sens_coach_dash_note_${athId}`);
    const titleInp = document.getElementById('coachDashNoteTitleInput');
    const bodyInp = document.getElementById('coachDashNoteBodyInput');

    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (titleInp) titleInp.value = parsed.title || '';
            if (bodyInp) bodyInp.value = parsed.body || '';
            return;
        } catch (e) {}
    }

    if (titleInp) titleInp.value = 'Foco de la Semana: Precisión Biomecánica & Adherencia';
    if (bodyInp) bodyInp.value = 'Excelente ritmo en tus sesiones. Esta semana mantené el foco en descansar los 75-90 segundos pautados y alcanzar tus 160g de proteína sin saltear comidas.';
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
        const raw = localStorage.getItem(`sens_prescribed_nutrition_${athId}`);
        if (raw) {
            try { data = JSON.parse(raw); } catch (e) {}
        }
    }

    if (!data) {
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

    const kcalEl = document.getElementById('nutriPrescribedKcal');
    const noteEl = document.getElementById('nutriPrescribedCoachNote');
    const foodsGrid = document.getElementById('nutriPrescribedFoodsGrid');

    if (kcalEl) kcalEl.innerHTML = `${(data.target_calories || 2200).toLocaleString('es-AR')} <span style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 400;">kcal / día</span>`;
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
