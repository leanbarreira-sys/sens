const fs = require('fs');

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell);
            currentCell = '';
            if (currentRow.some(c => c.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
        } else {
            currentCell += char;
        }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }
    return rows;
}

const csvRaw = fs.readFileSync('EJERCICIOS/supabase_ejercicios_completo.csv', 'utf8');
const parsed = parseCSV(csvRaw);
const headers = parsed[0].map(h => h.trim());
const data = parsed.slice(1);

console.log(`Loaded ${data.length} records from CSV.`);

// Diccionario canónico de IDs legados a nuevos UUIDs oficiales
const oldIdMap = {};

// 1. ex-q1 .. ex-q10
for (let i = 1; i <= 10; i++) oldIdMap['ex-q' + i] = data[i - 1][headers.indexOf('id')].trim();

// 2. ex-h1 .. ex-h10
for (let i = 1; i <= 10; i++) oldIdMap['ex-h' + i] = data[10 + i - 1][headers.indexOf('id')].trim();

// 3. ex-p1 .. ex-p12
for (let i = 1; i <= 12; i++) oldIdMap['ex-p' + i] = data[20 + i - 1][headers.indexOf('id')].trim();

// 4. ex-t1 .. ex-t11
for (let i = 1; i <= 11; i++) oldIdMap['ex-t' + i] = data[32 + i - 1][headers.indexOf('id')].trim();

// 5. ex-c1 .. ex-c9
for (let i = 1; i <= 9; i++) oldIdMap['ex-c' + i] = data[43 + i - 1][headers.indexOf('id')].trim();

// 6. WORKOUT_DAYS_DATA (ex-101 .. ex-602)
oldIdMap['ex-101'] = oldIdMap['ex-h1']; // Peso Muerto Rumano con Mancuernas
oldIdMap['ex-102'] = oldIdMap['ex-p1']; // Press de Banca Plano con Mancuernas
oldIdMap['ex-103'] = oldIdMap['ex-t3']; // Remo con Mancuerna a Una Mano en Banco
oldIdMap['ex-104'] = oldIdMap['ex-p4']; // Press Militar Sentado con Mancuernas

oldIdMap['ex-201'] = oldIdMap['ex-q1']; // Sentadilla Goblet con Mancuerna
oldIdMap['ex-202'] = oldIdMap['ex-h2']; // Hip Thrust con Barra en Banco
oldIdMap['ex-203'] = oldIdMap['ex-q5']; // Estocadas Búlgaras con Mancuernas
oldIdMap['ex-204'] = oldIdMap['ex-q6']; // Step-up en Cajón Controlado

oldIdMap['ex-301'] = oldIdMap['ex-h8']; // Kettlebell Swing Estilo Ruso
oldIdMap['ex-302'] = oldIdMap['ex-p6']; // Flexiones de Brazos (Push-ups) con Pausa
oldIdMap['ex-303'] = oldIdMap['ex-c1']; // Plancha Frontal con Retroversión Pélvica (RKC)
oldIdMap['ex-304'] = oldIdMap['ex-c8']; // Movilidad Gato-Vaca y Descompresión Espinal

oldIdMap['ex-401'] = oldIdMap['ex-c2']; // Deadbug con Control Lumbar y Respiración
oldIdMap['ex-402'] = oldIdMap['ex-c4']; // Bird-Dog Dinámico Controlado
oldIdMap['ex-403'] = oldIdMap['ex-c9']; // Rotaciones Torácicas en Posición Cuadrúpeda

oldIdMap['ex-501'] = oldIdMap['ex-c5']; // Paseo del Granjero con Mancuernas (Farmer Walk)
oldIdMap['ex-502'] = oldIdMap['ex-q5']; // Estocadas Búlgaras con Mancuernas
oldIdMap['ex-503'] = oldIdMap['ex-t2']; // Jalón al Pecho en Polea con Agarre Neutro

oldIdMap['ex-601'] = oldIdMap['ex-c1']; // Plancha Frontal
oldIdMap['ex-602'] = oldIdMap['ex-t1']; // Dominadas Asistidas

console.log(`Mapped ${Object.keys(oldIdMap).length} old IDs to new UUIDs.`);

// 1. GENERATE SQL SCRIPT (supabase_sens_exercises_master.sql)
function escapeSql(val) {
    if (val === null || val === undefined) return 'NULL';
    const str = String(val).trim();
    if (!str) return 'NULL';
    return "'" + str.replace(/'/g, "''") + "'";
}

let sql = `-- =============================================================================
-- SENS TRAIN & WELLNESS — BASE DE DATOS MAESTRA DE EJERCICIOS (POSTGRESQL / SUPABASE)
-- Fuente Oficial Única: 52 Ejercicios con Videos Loop 1 a 1, i18n (ES, EN, PT)
-- y Taxonomía Restrictiva de 3 Niveles (Nivel 1 Tipo, Nivel 2 Músculo, Nivel 3 Piernas)
-- =============================================================================

-- 1. CREACIÓN DE LA TABLA MAESTRA ÚNICA
CREATE TABLE IF NOT EXISTS public.sens_exercises (
    id UUID PRIMARY KEY,
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_pt TEXT NOT NULL,
    
    -- NIVEL 1: Tipo de Entrenamiento (Restrictivo)
    nivel_1_tipo TEXT NOT NULL CHECK (nivel_1_tipo IN ('muscular', 'cardio', 'yoga', 'movilidad')),
    
    -- NIVEL 2: Grupo Muscular Principal (Restrictivo)
    nivel_2_grupo_muscular TEXT NOT NULL CHECK (nivel_2_grupo_muscular IN (
        'piernas', 'biceps', 'triceps', 'pecho', 'espalda', 
        'abdominales', 'hombros', 'zona_lumbar', 'antebrazos'
    )),
    
    -- NIVEL 3: Submúsculos de Piernas (Restrictivo - Solo permitido para Piernas)
    nivel_3_submusculo_piernas TEXT CHECK (
        nivel_3_submusculo_piernas IS NULL 
        OR nivel_3_submusculo_piernas IN ('cuadriceps', 'isquios', 'abductores', 'gluteos', 'gemelos', 'soleo', '')
    ),
    
    cue_technical_es TEXT,
    cue_technical_en TEXT,
    cue_technical_pt TEXT,
    detailed_movement_es TEXT,
    detailed_movement_en TEXT,
    detailed_movement_pt TEXT,
    calories_per_rep NUMERIC(5,2) DEFAULT 0.65,
    video_local_path TEXT NOT NULL,
    default_rest_seconds INTEGER DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Columnas virtuales generadas para compatibilidad con código anterior
ALTER TABLE public.sens_exercises 
    ADD COLUMN IF NOT EXISTS name TEXT GENERATED ALWAYS AS (name_es) STORED,
    ADD COLUMN IF NOT EXISTS muscle_group TEXT GENERATED ALWAYS AS (nivel_2_grupo_muscular) STORED,
    ADD COLUMN IF NOT EXISTS cue_technical TEXT GENERATED ALWAYS AS (cue_technical_es) STORED,
    ADD COLUMN IF NOT EXISTS video_url TEXT GENERATED ALWAYS AS (video_local_path) STORED;

-- Índices de alto rendimiento para filtros
CREATE INDEX IF NOT EXISTS idx_sens_ex_n1 ON public.sens_exercises(nivel_1_tipo);
CREATE INDEX IF NOT EXISTS idx_sens_ex_n2 ON public.sens_exercises(nivel_2_grupo_muscular);
CREATE INDEX IF NOT EXISTS idx_sens_ex_n3 ON public.sens_exercises(nivel_3_submusculo_piernas);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.sens_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública/alumnos" ON public.sens_exercises;
CREATE POLICY "Lectura pública/alumnos" ON public.sens_exercises 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión solo Admin" ON public.sens_exercises;
CREATE POLICY "Gestión solo Admin" ON public.sens_exercises 
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
        OR auth.jwt() ->> 'role' = 'service_role'
        OR public.is_admin()
    );

-- 2. INSERCIÓN / ACTUALIZACIÓN DE LOS 52 EJERCICIOS MAESTROS
`;

data.forEach((r, idx) => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);

    const id = escapeSql(obj.id);
    const name_es = escapeSql(obj.name_es);
    const name_en = escapeSql(obj.name_en);
    const name_pt = escapeSql(obj.name_pt);
    const nivel_1_tipo = escapeSql(obj.nivel_1_tipo);
    const nivel_2_grupo_muscular = escapeSql(obj.nivel_2_grupo_muscular);
    const nivel_3_submusculo_piernas = escapeSql(obj.nivel_3_submusculo_piernas);
    const cue_technical_es = escapeSql(obj.cue_technical_es);
    const cue_technical_en = escapeSql(obj.cue_technical_en);
    const cue_technical_pt = escapeSql(obj.cue_technical_pt);
    const detailed_movement_es = escapeSql(obj.detailed_movement_es);
    const detailed_movement_en = escapeSql(obj.detailed_movement_en);
    const detailed_movement_pt = escapeSql(obj.detailed_movement_pt);
    const calories_per_rep = parseFloat(obj.calories_per_rep) || 0.65;
    const video_local_path = escapeSql(obj.video_local_path);
    const default_rest_seconds = parseInt(obj.default_rest_seconds, 10) || 90;

    sql += `
INSERT INTO public.sens_exercises (
    id, name_es, name_en, name_pt,
    nivel_1_tipo, nivel_2_grupo_muscular, nivel_3_submusculo_piernas,
    cue_technical_es, cue_technical_en, cue_technical_pt,
    detailed_movement_es, detailed_movement_en, detailed_movement_pt,
    calories_per_rep, video_local_path, default_rest_seconds
) VALUES (
    ${id}, ${name_es}, ${name_en}, ${name_pt},
    ${nivel_1_tipo}, ${nivel_2_grupo_muscular}, ${nivel_3_submusculo_piernas},
    ${cue_technical_es}, ${cue_technical_en}, ${cue_technical_pt},
    ${detailed_movement_es}, ${detailed_movement_en}, ${detailed_movement_pt},
    ${calories_per_rep}, ${video_local_path}, ${default_rest_seconds}
)
ON CONFLICT (id) DO UPDATE SET
    name_es = EXCLUDED.name_es,
    name_en = EXCLUDED.name_en,
    name_pt = EXCLUDED.name_pt,
    nivel_1_tipo = EXCLUDED.nivel_1_tipo,
    nivel_2_grupo_muscular = EXCLUDED.nivel_2_grupo_muscular,
    nivel_3_submusculo_piernas = EXCLUDED.nivel_3_submusculo_piernas,
    cue_technical_es = EXCLUDED.cue_technical_es,
    cue_technical_en = EXCLUDED.cue_technical_en,
    cue_technical_pt = EXCLUDED.cue_technical_pt,
    detailed_movement_es = EXCLUDED.detailed_movement_es,
    detailed_movement_en = EXCLUDED.detailed_movement_en,
    detailed_movement_pt = EXCLUDED.detailed_movement_pt,
    calories_per_rep = EXCLUDED.calories_per_rep,
    video_local_path = EXCLUDED.video_local_path,
    default_rest_seconds = EXCLUDED.default_rest_seconds;
`;
});

// Retrocompatibilidad con public.exercises si existe
sql += `
-- 3. VISTA / SINÓNIMO DE RETROCOMPATIBILIDAD CON CODIGO LEGACY QUE CONSULTE 'exercises'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'exercises' AND table_schema = 'public') THEN
        -- Si public.exercises no es una tabla con datos críticos ajenos, la redirigimos a sens_exercises
        BEGIN
            CREATE OR REPLACE VIEW public.exercises AS 
            SELECT 
                id,
                name_es AS name,
                nivel_2_grupo_muscular AS muscle_group,
                nivel_3_submusculo_piernas AS sub_muscle,
                nivel_1_tipo AS exercise_type,
                cue_technical_es AS cue_technical,
                video_local_path AS video_url,
                default_rest_seconds,
                created_at
            FROM public.sens_exercises;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Si ya es tabla física existente, se conserva
        END;
    END IF;
END $$;
`;

fs.writeFileSync('supabase_sens_exercises_master.sql', sql, 'utf8');
console.log('Saved supabase_sens_exercises_master.sql successfully!');

// 2. GENERATE exercises_db.js
const exercisesJsonList = [];
data.forEach(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || '').trim());
    
    // Construct exercise item with full fields and backward compatibility
    const item = {
        id: obj.id,
        name: obj.name_es, // default in ES
        name_es: obj.name_es,
        name_en: obj.name_en,
        name_pt: obj.name_pt,
        
        nivel_1_tipo: obj.nivel_1_tipo,
        nivel_2_grupo_muscular: obj.nivel_2_grupo_muscular,
        nivel_3_submusculo_piernas: obj.nivel_3_submusculo_piernas || null,
        
        // Aliases for backward compatibility
        exercise_type: obj.nivel_1_tipo,
        category: obj.nivel_2_grupo_muscular,
        muscle_group: obj.nivel_2_grupo_muscular,
        sub_muscle: obj.nivel_3_submusculo_piernas || null,
        primary_muscle: obj.nivel_3_submusculo_piernas 
            ? (obj.nivel_3_submusculo_piernas.charAt(0).toUpperCase() + obj.nivel_3_submusculo_piernas.slice(1)) 
            : (obj.nivel_2_grupo_muscular.charAt(0).toUpperCase() + obj.nivel_2_grupo_muscular.slice(1)),
        
        cue_technical_es: obj.cue_technical_es,
        cue_technical_en: obj.cue_technical_en,
        cue_technical_pt: obj.cue_technical_pt,
        cue: obj.cue_technical_es,
        
        detailed_movement_es: obj.detailed_movement_es,
        detailed_movement_en: obj.detailed_movement_en,
        detailed_movement_pt: obj.detailed_movement_pt,
        execution: obj.detailed_movement_es, // used by old modals
        
        calories_per_rep: parseFloat(obj.calories_per_rep) || 0.65,
        kcal_per_rep: parseFloat(obj.calories_per_rep) || 0.65,
        
        video_local_path: obj.video_local_path,
        video_url: obj.video_local_path, // used by cards and modals
        video: obj.video_local_path,
        
        default_rest_seconds: parseInt(obj.default_rest_seconds, 10) || 90,
        rest: parseInt(obj.default_rest_seconds, 10) || 90,
        default_sets: 4,
        default_reps: '10-12',
        level: 'Intermedio',
        created_at: obj.created_at || '2026-03-31T00:00:00Z'
    };
    exercisesJsonList.push(item);
});

let jsFileContent = `// =============================================================================
// SENS FITNESS — BASE MAESTRA ÚNICA DE EJERCICIOS (OFICIAL 52 EJERCICIOS)
// Fuente de Verdad: EJERCICIOS/supabase_ejercicios_completo.csv & videos_loop_final
// Soporte Trilingüe (ES, EN, PT), Videos Locales Loop y Taxonomía Restrictiva de 3 Niveles
// =============================================================================

const SENS_EXERCISE_LIBRARY = ${JSON.stringify(exercisesJsonList, null, 4)};

// Mapeo canónico de IDs antiguos (ex-q1, etc.) a nuevos UUIDs oficiales
const SENS_LEGACY_EXERCISE_ID_MAP = ${JSON.stringify(oldIdMap, null, 4)};

// =============================================================================
// ÁRBOL TAXONÓMICO RESTRICTIVO OFICIAL SENS (3 NIVELES)
// Nivel 1: Tipo (muscular, cardio, yoga, movilidad)
// Nivel 2: Grupo Muscular (piernas, biceps, triceps, pecho, espalda, abdominales, hombros, zona_lumbar, antebrazos)
// Nivel 3: Submúsculos de Piernas (cuadriceps, isquios, abductores, gluteos, gemelos, soleo)
// =============================================================================
const SENS_TRAINING_TAXONOMY_TREE = {
    types: [
        { id: 'muscular', label: 'Muscular' },
        { id: 'cardio', label: 'Cardio' },
        { id: 'yoga', label: 'Yoga' },
        { id: 'movilidad', label: 'Movilidad' }
    ],
    muscleGroups: [
        { id: 'piernas', label: 'Piernas', hasSubGroups: true },
        { id: 'biceps', label: 'Bíceps', hasSubGroups: false },
        { id: 'triceps', label: 'Tríceps', hasSubGroups: false },
        { id: 'pecho', label: 'Pecho', hasSubGroups: false },
        { id: 'espalda', label: 'Espalda', hasSubGroups: false },
        { id: 'abdominales', label: 'Abdominales', hasSubGroups: false },
        { id: 'hombros', label: 'Hombros', hasSubGroups: false },
        { id: 'zona_lumbar', label: 'Zona Lumbar', hasSubGroups: false },
        { id: 'antebrazos', label: 'Antebrazos', hasSubGroups: false }
    ],
    piernasSubGroups: [
        { id: 'cuadriceps', label: 'Cuádriceps' },
        { id: 'isquios', label: 'Isquios' },
        { id: 'abductores', label: 'Abductores' },
        { id: 'gluteos', label: 'Glúteos' },
        { id: 'gemelos', label: 'Gemelos' },
        { id: 'soleo', label: 'Sóleo' }
    ]
};

/**
 * Obtiene la taxonomía normalizada de 3 niveles para cualquier ejercicio
 */
function getExerciseTaxonomy(ex) {
    if (!ex) {
        return {
            type: 'muscular',
            typeLabel: 'Muscular',
            muscleGroup: 'piernas',
            muscleLabel: 'Piernas',
            subMuscle: 'cuadriceps',
            subMuscleLabel: 'Cuádriceps'
        };
    }

    const type = (ex.nivel_1_tipo || ex.exercise_type || 'muscular').toLowerCase();
    const muscleGroup = (ex.nivel_2_grupo_muscular || ex.muscle_group || ex.category || 'piernas').toLowerCase();
    const subMuscle = (ex.nivel_3_submusculo_piernas || ex.sub_muscle || '').toLowerCase() || null;

    const typeLabels = {
        muscular: 'Muscular',
        cardio: 'Cardio',
        yoga: 'Yoga',
        movilidad: 'Movilidad'
    };

    const groupLabels = {
        piernas: 'Piernas',
        biceps: 'Bíceps',
        triceps: 'Tríceps',
        pecho: 'Pecho',
        espalda: 'Espalda',
        abdominales: 'Abdominales',
        hombros: 'Hombros',
        zona_lumbar: 'Zona Lumbar',
        antebrazos: 'Antebrazos'
    };

    const subLabels = {
        cuadriceps: 'Cuádriceps',
        isquios: 'Isquios',
        abductores: 'Abductores',
        gluteos: 'Glúteos',
        gemelos: 'Gemelos',
        soleo: 'Sóleo'
    };

    return {
        type: typeLabels[type] ? type : 'muscular',
        typeLabel: typeLabels[type] || 'Muscular',
        muscleGroup: groupLabels[muscleGroup] ? muscleGroup : 'piernas',
        muscleLabel: groupLabels[muscleGroup] || 'Piernas',
        subMuscle: (muscleGroup === 'piernas' && subMuscle) ? subMuscle : null,
        subMuscleLabel: (muscleGroup === 'piernas' && subLabels[subMuscle]) ? subLabels[subMuscle] : null
    };
}

/**
 * Retorna las propiedades traducidas según el idioma activo ('es', 'en', 'pt')
 */
function getExerciseLocalized(ex, lang = null) {
    if (!ex) return null;
    const activeLang = lang || (typeof localStorage !== 'undefined' ? localStorage.getItem('sens_lang') : null) || 'es';
    const targetLang = ['es', 'en', 'pt'].includes(activeLang) ? activeLang : 'es';

    return {
        name: ex['name_' + targetLang] || ex.name_es || ex.name,
        cue: ex['cue_technical_' + targetLang] || ex.cue_technical_es || ex.cue,
        detailedMovement: ex['detailed_movement_' + targetLang] || ex.detailed_movement_es || ex.execution,
        lang: targetLang
    };
}

/**
 * Calcula el gasto calórico estimado por repetición, por serie y total del ejercicio
 */
function calculateExerciseKcal(ex, customSets = null, customReps = null, athleteWeight = 75) {
    if (!ex) return { kcalPerRep: 0.65, kcalPerSet: 7.8, totalKcal: 28, met: 5.0 };
    const tax = getExerciseTaxonomy(ex);
    const weightFactor = (athleteWeight > 0 ? athleteWeight : 75) / 75;

    let baseKcalPerRep = typeof ex.calories_per_rep === 'number' 
        ? ex.calories_per_rep 
        : (typeof ex.kcal_per_rep === 'number' ? ex.kcal_per_rep : 0.65);

    const setsNum = parseInt(customSets || ex.default_sets || ex.sets || 4, 10) || 4;
    const repsStr = String(customReps || ex.default_reps || ex.reps || '10');
    let repsNum = 10;
    const nums = repsStr.match(/\\d+/g);
    if (nums && nums.length > 0) {
        if (repsStr.toLowerCase().includes('seg') || repsStr.toLowerCase().includes('sec')) {
            repsNum = Math.max(8, Math.round(parseInt(nums[0], 10) / 3.5));
        } else if (nums.length >= 2) {
            repsNum = Math.round((parseInt(nums[0], 10) + parseInt(nums[1], 10)) / 2);
        } else {
            repsNum = parseInt(nums[0], 10);
        }
    }

    const kcalPerRep = Math.round(baseKcalPerRep * weightFactor * 100) / 100;
    const kcalPerSet = Math.round(kcalPerRep * repsNum * 10) / 10;
    const totalKcal = Math.round(kcalPerSet * setsNum);

    return {
        kcalPerRep,
        kcalPerSet,
        totalKcal,
        sets: setsNum,
        repsAvg: repsNum
    };
}

/**
 * Obtiene un ejercicio con los overrides aplicados (Base Maestra Global + Puntual del Alumno)
 */
function getResolvedExercise(exOrId, athleteId = null) {
    if (!exOrId) return null;

    let searchId = typeof exOrId === 'string' ? exOrId : (exOrId.id || '');
    let searchName = typeof exOrId === 'string' ? exOrId : (exOrId.name || exOrId.name_es || '');

    // 1. Resolver mapeo de ID legado (ej. ex-q1, ex-101 -> UUID)
    if (SENS_LEGACY_EXERCISE_ID_MAP[searchId]) {
        searchId = SENS_LEGACY_EXERCISE_ID_MAP[searchId];
    }

    // 2. Buscar por ID en SENS_EXERCISE_LIBRARY
    let baseEx = SENS_EXERCISE_LIBRARY.find(e => e.id === searchId);

    // 3. Si no encontró por ID, buscar por nombre exacto, inglés o tokens de coincidencia
    if (!baseEx && searchName) {
        const cleanName = searchName.replace(/^\\d+[\\.\\s\\-]+/, '').trim().toLowerCase();
        baseEx = SENS_EXERCISE_LIBRARY.find(e => {
            const esName = (e.name_es || '').toLowerCase();
            const enName = (e.name_en || '').toLowerCase();
            const ptName = (e.name_pt || '').toLowerCase();
            if (esName === cleanName || enName === cleanName || ptName === cleanName) return true;
            if (cleanName.includes(esName) || esName.includes(cleanName)) return true;
            if (cleanName.includes(enName) || enName.includes(cleanName)) return true;

            const tokens = cleanName.split(/[^a-záéíóúñ0-9]+/i).filter(t => t.length > 3);
            if (tokens.length > 0) {
                const matchCount = tokens.filter(t => esName.includes(t) || enName.includes(t)).length;
                if (matchCount >= 2 || (tokens.length === 1 && matchCount === 1)) return true;
            }
            return false;
        });
    }

    if (!baseEx && typeof exOrId === 'object') {
        baseEx = exOrId;
    }
    if (!baseEx) return null;

    let resolved = Object.assign({}, baseEx);

    // 1. Override Global de Nico (localStorage)
    try {
        if (typeof localStorage !== 'undefined') {
            const globalRaw = localStorage.getItem('sens_global_exercise_overrides_v1');
            if (globalRaw) {
                const globalMap = JSON.parse(globalRaw);
                if (globalMap && globalMap[resolved.id]) {
                    resolved = Object.assign(resolved, globalMap[resolved.id], { _hasGlobalOverride: true });
                }
            }
        }
    } catch (e) {}

    // 2. Override Puntual del Alumno
    const targetAthId = athleteId || (typeof window !== 'undefined' && window.AppState && window.AppState.currentUser && window.AppState.currentUser.id) || null;
    if (targetAthId && typeof localStorage !== 'undefined') {
        try {
            const athRaw = localStorage.getItem('sens_athlete_exercise_overrides_' + targetAthId);
            if (athRaw) {
                const athMap = JSON.parse(athRaw);
                if (athMap && athMap[resolved.id]) {
                    resolved = Object.assign(resolved, athMap[resolved.id], { _hasAthleteOverride: true });
                }
            }
        } catch (e) {}
    }

    const tax = getExerciseTaxonomy(resolved);
    resolved.taxonomy = tax;
    resolved.type_level1 = tax.type;
    resolved.group_level2 = tax.muscleGroup;
    resolved.sub_level3 = tax.subMuscle;
    resolved.video_url = resolved.video_local_path || resolved.video_url;

    return resolved;
}

// Hidratar inicialmente todos los ejercicios en memoria
function hydrateExerciseLibraryInMemory() {
    let globalMap = {};
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('sens_global_exercise_overrides_v1');
            if (raw) globalMap = JSON.parse(raw) || {};
        }
    } catch (e) {}

    SENS_EXERCISE_LIBRARY.forEach(ex => {
        if (globalMap[ex.id]) {
            Object.assign(ex, globalMap[ex.id]);
        }
        const tax = getExerciseTaxonomy(ex);
        ex.type_level1 = tax.type;
        ex.group_level2 = tax.muscleGroup;
        ex.sub_level3 = tax.subMuscle;
        ex.exercise_type = tax.type;
        ex.category = tax.muscleGroup;
        ex.muscle_group = tax.muscleGroup;
        ex.video_url = ex.video_local_path;
        ex.video = ex.video_local_path;
    });
}

hydrateExerciseLibraryInMemory();

// Exportaciones globales
if (typeof window !== 'undefined') {
    window.SENS_EXERCISE_LIBRARY = SENS_EXERCISE_LIBRARY;
    window.SENS_LEGACY_EXERCISE_ID_MAP = SENS_LEGACY_EXERCISE_ID_MAP;
    window.SENS_TRAINING_TAXONOMY_TREE = SENS_TRAINING_TAXONOMY_TREE;
    window.getExerciseTaxonomy = getExerciseTaxonomy;
    window.getExerciseLocalized = getExerciseLocalized;
    window.calculateExerciseKcal = calculateExerciseKcal;
    window.getResolvedExercise = getResolvedExercise;
    window.hydrateExerciseLibraryInMemory = hydrateExerciseLibraryInMemory;
    
    // Retrocompatibilidad con EXERCISE_CATALOG
    window.EXERCISE_CATALOG = SENS_EXERCISE_LIBRARY;
}
`;

fs.writeFileSync('exercises_db.js', jsFileContent, 'utf8');
console.log('Saved exercises_db.js with 52 exercises and taxonomy successfully!');
