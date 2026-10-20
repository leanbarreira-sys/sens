const fs = require('fs');
const path = require('path');

function parseCSVLine(text) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur.trim());
    return result;
}

function parseNum(val, def = 0) {
    if (typeof val === 'number') return val;
    if (!val) return def;
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? def : num;
}

const csvPath = path.join(__dirname, 'Nutricion', 'Base_Datos_500_Alimentos_y_Comidas_Fitness_Nutricion.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);

console.log('Total non-empty lines:', lines.length);

const header = parseCSVLine(lines[0]);
console.log('Header columns (' + header.length + '):', header.slice(0, 10));

const foodItems = [];
const imageChecks = { found: 0, missing: 0 };

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 25) {
        console.warn('Skipping short line ' + i + ': length ' + row.length);
        continue;
    }

    const id = row[0];
    const codigo = row[1];
    if (!id || !codigo || codigo.includes('PROMEDIO') || codigo.includes('TOTAL')) {
        console.log('Skipping summary row at line ' + i + ': ' + codigo);
        continue;
    }
    const nombre = row[2];
    const name_en = row[3];
    const tipo_item = row[4];
    const categoria = row[5];
    const objetivo = row[6];
    const momento_consumo = row[7];
    const timing_entrenamiento = row[8];
    const porcion_g = parseNum(row[9], 100);
    const unidades_caseras = row[10];
    const ingredientes = row[11];
    const calorias = parseNum(row[12], 100);
    const proteinas = parseNum(row[13], 0);
    const carbohidratos = parseNum(row[14], 0);
    const grasas = parseNum(row[15], 0);
    const fibra = parseNum(row[16], 0);
    const densidad_proteica = parseNum(row[17], 0);
    const saciedad = row[18];
    const dificultad = row[19];
    const tiempo_prep = parseNum(row[20], 10);
    const preparacion = row[21];
    const dietas = row[22];
    const alergenos = row[23];
    const micronutrientes = row[24];
    const reemplazos = row[25];
    const tip_nutricionista = row[26];
    
    // Imagen path
    let imagen_path = row[27] || '';
    if (!imagen_path) {
        // Generar fallback a partir del código si existe en Nutricion/images
        const files = fs.readdirSync(path.join(__dirname, 'Nutricion', 'images'));
        const prefix = codigo.toLowerCase();
        const matched = files.find(f => f.toLowerCase().startsWith(prefix));
        if (matched) {
            imagen_path = 'Nutricion/images/' + matched;
        }
    }

    if (imagen_path && fs.existsSync(path.join(__dirname, imagen_path))) {
        imageChecks.found++;
    } else {
        imageChecks.missing++;
    }

    // Normalizar momentos de consumo para filtros rápidos
    const momentoLower = (momento_consumo || '').toLowerCase();
    const meals = [];
    if (momentoLower.includes('desayuno')) meals.push('desayuno');
    if (momentoLower.includes('almuerzo')) meals.push('almuerzo');
    if (momentoLower.includes('merienda')) meals.push('merienda');
    if (momentoLower.includes('cena')) meals.push('cena');
    if (momentoLower.includes('snack') || momentoLower.includes('colación') || momentoLower.includes('colacion')) meals.push('snack');
    if (meals.length === 0) meals.push('almuerzo', 'cena');

    // Normalizar categoría simplificada
    let catSimple = 'protein';
    const catLower = (categoria || '').toLowerCase();
    if (catLower.includes('proteína') || catLower.includes('proteina')) catSimple = 'protein';
    else if (catLower.includes('carbohidrato') || catLower.includes('cereal') || catLower.includes('tubérculo') || catLower.includes('legumbre')) catSimple = 'carbs';
    else if (catLower.includes('grasa') || catLower.includes('semilla') || catLower.includes('fruto seco') || catLower.includes('aceite')) catSimple = 'healthy_fats';
    else if (catLower.includes('vegetal') || catLower.includes('fruta') || catLower.includes('hidratación') || catLower.includes('fibra')) catSimple = 'hydration_veg';

    // Normalizar objetivo simplificado
    const objLower = (objetivo || '').toLowerCase();
    const goals = [];
    if (objLower.includes('déficit') || objLower.includes('deficit') || objLower.includes('grasa')) goals.push('deficit');
    if (objLower.includes('recomposición') || objLower.includes('recomposicion') || objLower.includes('mantenimiento')) goals.push('recomposicion');
    if (objLower.includes('superávit') || objLower.includes('superavit') || objLower.includes('muscular') || objLower.includes('hipertrofia')) goals.push('hipertrofia');
    if (goals.length === 0) goals.push('deficit', 'recomposicion', 'hipertrofia');

    // Calcular valores por 100g para el cálculo proporcional dinámico (regla de tres simple)
    const factor100 = porcion_g > 0 ? (100 / porcion_g) : 1;
    const calPer100 = Math.round(calorias * factor100);
    const protPer100 = Math.round((proteinas * factor100) * 10) / 10;
    const carbsPer100 = Math.round((carbohidratos * factor100) * 10) / 10;
    const fatsPer100 = Math.round((grasas * factor100) * 10) / 10;

    foodItems.push({
        id,
        codigo,
        name: nombre,
        name_es: nombre,
        name_en,
        tipo_item,
        categoria_nutricional: categoria,
        cat: catSimple,
        objetivo_principal: objetivo,
        goals,
        momento_consumo,
        meals,
        timing_entrenamiento,
        porcion_total_g_ml: porcion_g,
        baseGrams: porcion_g,
        defaultGrams: porcion_g,
        unidades_caseras_total: unidades_caseras,
        portion: unidades_caseras || (porcion_g + ' g'),
        ingredientes_y_gramajes: ingredientes,
        calorias_kcal: calorias,
        calories: calorias,
        proteinas_g: proteinas,
        protein: proteinas,
        carbohidratos_g: carbohidratos,
        carbs: carbohidratos,
        grasas_g: grasas,
        fats: grasas,
        fibra_g: fibra,
        densidad_proteica_pct: densidad_proteica,
        indice_saciedad: saciedad,
        grado_dificultad: dificultad,
        tiempo_preparacion_min: tiempo_prep,
        paso_a_paso_preparacion: preparacion,
        etiquetas_dieta_filtros: dietas,
        alergenos,
        micronutrientes_clave: micronutrientes,
        reemplazos_equivalentes: reemplazos,
        tip_nutricionista_deportivo: tip_nutricionista,
        note: tip_nutricionista || preparacion,
        image_url: imagen_path,
        imagen_path,
        thumbnail: imagen_path,
        calPer100,
        protPer100,
        carbsPer100,
        fatsPer100
    });
}

console.log('Successfully processed foods:', foodItems.length);
console.log('Images found:', imageChecks.found, 'Missing:', imageChecks.missing);

// Escribir nutrition_db.js
const jsContent = `/**
 * =============================================================================
 * SENS NUTRITION MASTER LIBRARY (500 ALIMENTOS Y COMIDAS FITNESS CLINICAS)
 * =============================================================================
 * Fuente Oficial de Verdad Nutricional para SENS Coach OS & Portal de Atleta.
 * Generado automáticamente a partir de Base_Datos_500_Alimentos_y_Comidas_Fitness_Nutricion.csv.
 * Incluye macronutrientes por porción, cálculo proporcional por 100g (regla de tres simple),
 * imágenes HD locales (.webp), micronutrientes, reemplazos y tips de Nico.
 */

const SENS_FOOD_LIBRARY = ${JSON.stringify(foodItems, null, 4)};

// Aliases y helpers de compatibilidad
if (typeof window !== 'undefined') {
    window.SENS_FOOD_LIBRARY = SENS_FOOD_LIBRARY;
    window.FOOD_CATALOG = SENS_FOOD_LIBRARY;
}

/**
 * Resuelve un alimento por ID, código o nombre con soporte para personalización del alumno
 */
function getResolvedFood(foodOrId, athleteId = null) {
    if (!foodOrId) return null;
    const searchId = typeof foodOrId === 'string' ? foodOrId : (foodOrId.id || foodOrId.codigo || '');
    const searchName = typeof foodOrId === 'string' ? foodOrId : (foodOrId.name || foodOrId.name_es || '');

    let baseFood = SENS_FOOD_LIBRARY.find(f => f.id === searchId || f.codigo === searchId);
    if (!baseFood && searchName) {
        const clean = searchName.toLowerCase().trim();
        baseFood = SENS_FOOD_LIBRARY.find(f => (f.name && f.name.toLowerCase() === clean) || (f.name_en && f.name_en.toLowerCase() === clean));
    }
    if (!baseFood && typeof foodOrId === 'object') {
        baseFood = foodOrId;
    }
    if (!baseFood) return null;

    let resolved = Object.assign({}, baseFood);

    // Overrides por alumno en Coach OS
    try {
        if (athleteId && typeof localStorage !== 'undefined') {
            const rawOverrides = localStorage.getItem(\`sens_athlete_food_overrides_\${athleteId}\`);
            if (rawOverrides) {
                const parsed = JSON.parse(rawOverrides);
                if (parsed[resolved.id]) {
                    Object.assign(resolved, parsed[resolved.id], { _hasAthleteOverride: true });
                }
            }
        }
    } catch (e) {}

    return resolved;
}

/**
 * Calcula macros exactos para un gramaje específico usando regla de tres simple
 */
function calculateFoodMacros(food, grams = null) {
    if (!food) return { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 };
    const targetGrams = (typeof grams === 'number' && grams > 0) ? grams : (food.defaultGrams || food.porcion_total_g_ml || 100);
    const factor = targetGrams / 100;

    return {
        grams: targetGrams,
        calories: Math.round((food.calPer100 || 0) * factor),
        protein: Math.round(((food.protPer100 || 0) * factor) * 10) / 10,
        carbs: Math.round(((food.carbsPer100 || 0) * factor) * 10) / 10,
        fats: Math.round(((food.fatsPer100 || 0) * factor) * 10) / 10
    };
}

if (typeof window !== 'undefined') {
    window.getResolvedFood = getResolvedFood;
    window.calculateFoodMacros = calculateFoodMacros;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SENS_FOOD_LIBRARY, getResolvedFood, calculateFoodMacros };
}
`;

fs.writeFileSync(path.join(__dirname, 'nutrition_db.js'), jsContent, 'utf8');
console.log('Successfully wrote nutrition_db.js (' + (Buffer.byteLength(jsContent) / 1024).toFixed(1) + ' KB)');

// Generar supabase_sens_nutrition_master.sql
let sql = `-- =============================================================================
-- SENS NUTRITION MASTER DATABASE SCHEMA & SEED (500 FITNESS FOODS & MEALS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sens_foods (
    id UUID PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    tipo_item TEXT,
    categoria_nutricional TEXT,
    cat TEXT,
    objetivo_principal TEXT,
    momento_consumo TEXT,
    timing_entrenamiento TEXT,
    porcion_total_g_ml NUMERIC NOT NULL,
    unidades_caseras_total TEXT,
    ingredientes_y_gramajes TEXT,
    calorias_kcal NUMERIC NOT NULL,
    proteinas_g NUMERIC NOT NULL,
    carbohidratos_g NUMERIC NOT NULL,
    grasas_g NUMERIC NOT NULL,
    fibra_g NUMERIC DEFAULT 0,
    densidad_proteica_pct NUMERIC,
    indice_saciedad TEXT,
    grado_dificultad TEXT,
    tiempo_preparacion_min INTEGER,
    paso_a_paso_preparacion TEXT,
    etiquetas_dieta_filtros TEXT,
    alergenos TEXT,
    micronutrientes_clave TEXT,
    reemplazos_equivalentes TEXT,
    tip_nutricionista_deportivo TEXT,
    image_url TEXT,
    cal_per_100 NUMERIC,
    prot_per_100 NUMERIC,
    carbs_per_100 NUMERIC,
    fats_per_100 NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.sens_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de alimentos a usuarios autenticados" ON public.sens_foods;
CREATE POLICY "Permitir lectura de alimentos a usuarios autenticados"
    ON public.sens_foods FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de alimentos" ON public.sens_foods;
CREATE POLICY "Permitir lectura publica de alimentos"
    ON public.sens_foods FOR SELECT TO anon USING (true);

-- Upsert de los 500 alimentos
INSERT INTO public.sens_foods (
    id, codigo, name, name_en, tipo_item, categoria_nutricional, cat,
    objetivo_principal, momento_consumo, timing_entrenamiento,
    porcion_total_g_ml, unidades_caseras_total, ingredientes_y_gramajes,
    calorias_kcal, proteinas_g, carbohidratos_g, grasas_g, fibra_g,
    densidad_proteica_pct, indice_saciedad, grado_dificultad,
    tiempo_preparacion_min, paso_a_paso_preparacion, etiquetas_dieta_filtros,
    alergenos, micronutrientes_clave, reemplazos_equivalentes,
    tip_nutricionista_deportivo, image_url, cal_per_100, prot_per_100,
    carbs_per_100, fats_per_100
) VALUES
`;

const escapeSql = str => (str === null || str === undefined) ? 'NULL' : `'${String(str).replace(/'/g, "''")}'`;

const valuesList = foodItems.map(f => {
    return `(
    ${escapeSql(f.id)}, ${escapeSql(f.codigo)}, ${escapeSql(f.name)}, ${escapeSql(f.name_en)}, ${escapeSql(f.tipo_item)}, ${escapeSql(f.categoria_nutricional)}, ${escapeSql(f.cat)},
    ${escapeSql(f.objetivo_principal)}, ${escapeSql(f.momento_consumo)}, ${escapeSql(f.timing_entrenamiento)},
    ${f.porcion_total_g_ml}, ${escapeSql(f.unidades_caseras_total)}, ${escapeSql(f.ingredientes_y_gramajes)},
    ${f.calorias_kcal}, ${f.proteinas_g}, ${f.carbohidratos_g}, ${f.grasas_g}, ${f.fibra_g},
    ${f.densidad_proteica_pct}, ${escapeSql(f.indice_saciedad)}, ${escapeSql(f.grado_dificultad)},
    ${f.tiempo_preparacion_min}, ${escapeSql(f.paso_a_paso_preparacion)}, ${escapeSql(f.etiquetas_dieta_filtros)},
    ${escapeSql(f.alergenos)}, ${escapeSql(f.micronutrientes_clave)}, ${escapeSql(f.reemplazos_equivalentes)},
    ${escapeSql(f.tip_nutricionista_deportivo)}, ${escapeSql(f.image_url)}, ${f.calPer100}, ${f.protPer100},
    ${f.carbsPer100}, ${f.fatsPer100}
)`;
});

sql += valuesList.join(',\n') + `\nON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    calorias_kcal = EXCLUDED.calorias_kcal,
    proteinas_g = EXCLUDED.proteinas_g,
    carbohidratos_g = EXCLUDED.carbohidratos_g,
    grasas_g = EXCLUDED.grasas_g,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();\n`;

fs.writeFileSync(path.join(__dirname, 'supabase_sens_nutrition_master.sql'), sql, 'utf8');
console.log('Successfully wrote supabase_sens_nutrition_master.sql (' + (Buffer.byteLength(sql) / 1024).toFixed(1) + ' KB)');
