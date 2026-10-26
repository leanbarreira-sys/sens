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

function parseCSV(text) {
    const records = [];
    let curRecord = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                curRecord += '""';
                i++;
            } else {
                inQuotes = !inQuotes;
                curRecord += c;
            }
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && text[i + 1] === '\n') i++;
            if (curRecord.trim()) {
                records.push(parseCSVLine(curRecord));
            }
            curRecord = '';
        } else {
            curRecord += c;
        }
    }
    if (curRecord.trim()) {
        records.push(parseCSVLine(curRecord));
    }
    return records;
}

const parseNumberAR = (val, def = 0) => {
    if (typeof val === 'number') return val;
    if (!val) return def;
    const cleaned = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? def : num;
};

const csvPath = path.join(__dirname, '..', 'Nutricion', 'SENS_Base_Datos_500_Alimentos_y_Comidas_Fitness_Nutricion_v2.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(raw);

console.log('Total rows (with header):', rows.length);
const headers = rows[0];
console.log('Total headers:', headers.length);
console.log('Headers:', headers);

const headerIndex = {};
headers.forEach((h, idx) => {
    headerIndex[h.trim()] = idx;
});

const foodItems = [];
const imageChecks = { found: 0, missing: 0 };
const imagesDir = path.join(__dirname, '..', 'Nutricion', 'images');
const availableImages = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];

for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 10) continue;

    const getCol = (name) => {
        const idx = headerIndex[name];
        return (idx !== undefined && row[idx] !== undefined) ? row[idx] : '';
    };

    const id = getCol('id');
    const codigo = getCol('codigo');
    if (!id || !codigo || codigo.includes('PROMEDIO') || codigo.includes('TOTAL')) continue;

    const nombre = getCol('nombre_alimento_o_plato');
    const name_en = getCol('name_en');
    const tipo_item = getCol('tipo_item');
    const categoria = getCol('categoria_nutricional');
    const objetivo = getCol('objetivo_principal');
    const almuerzo_cena = getCol('almuerzo_cena').trim().toUpperCase() === 'TRUE';
    const desayuno_merienda = getCol('desayuno_merienda').trim().toUpperCase() === 'TRUE';
    const snack = getCol('snack').trim().toUpperCase() === 'TRUE';
    const timing_entrenamiento = getCol('timing_entrenamiento');
    const porcion_total_g = parseNumberAR(getCol('porcion_total_g_ml'), 100);
    const peso_unidad_g = parseNumberAR(getCol('peso_unidad_g'), porcion_total_g) || porcion_total_g;
    const unidades_caseras = getCol('unidades_caseras_total');
    const rawIng = getCol('ingredientes_y_gramajes');
    const calorias = parseNumberAR(getCol('calorias_kcal'), 0);
    const proteinas = parseNumberAR(getCol('proteinas_g'), 0);
    const carbohidratos = parseNumberAR(getCol('carbohidratos_g'), 0);
    const grasas = parseNumberAR(getCol('grasas_g'), 0);
    const fibra = parseNumberAR(getCol('fibra_g'), 0);
    const densidad_proteica = getCol('densidad_proteica_pct');
    const saciedad = getCol('indice_saciedad');
    const dificultad = getCol('grado_dificultad');
    const tiempo_prep = parseNumberAR(getCol('tiempo_preparacion_min'), 10);
    const costo_estimado_nivel = getCol('costo_estimado_nivel') || 'Medio';
    const apto_vianda_fria = getCol('apto_vianda_fria').trim().toUpperCase() === 'TRUE';
    const rawPasos = getCol('paso_a_paso_preparacion');
    const dietas = getCol('etiquetas_dieta_filtros');
    const alergenos = getCol('alergenos');
    const micronutrientes = getCol('micronutrientes_clave');
    const reemplazos = getCol('reemplazos_equivalentes');
    const tip_nutricionista = getCol('tip_nutricionista_deportivo');
    const truco_del_chef = getCol('truco_del_chef');
    const rawComprasJson = getCol('ingredientes_compras_json');
    let imagen_url = getCol('imagen_url');

    // Estructurar lista de ingredientes
    const ingredientesList = rawIng
        .split('\n')
        .map(line => line.replace(/^•\s*/, '').trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split(':');
            return {
                nombre: parts[0]?.trim() || line,
                detalle: parts.slice(1).join(':').trim()
            };
        });

    // Estructurar pasos
    const pasosList = rawPasos
        .split('\n')
        .map(step => step.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);

    // Parsear ingredientes compras json
    let ingredientesCompras = [];
    try {
        if (rawComprasJson) {
            ingredientesCompras = JSON.parse(rawComprasJson);
        }
    } catch (_) {
        ingredientesCompras = [];
    }

    // Resolver ruta de imagen
    if (!imagen_url || !fs.existsSync(path.join(__dirname, '..', imagen_url))) {
        const prefix = codigo.toLowerCase();
        const matched = availableImages.find(f => f.toLowerCase().startsWith(prefix));
        if (matched) {
            imagen_url = 'Nutricion/images/' + matched;
        } else {
            imagen_url = 'Nutricion/images/nut-001-pechuga-de-pollo-a-la-plancha.webp';
        }
    }

    if (fs.existsSync(path.join(__dirname, '..', imagen_url))) {
        imageChecks.found++;
    } else {
        imageChecks.missing++;
    }

    // Momento arrays para filtros compatibles
    const meals = [];
    if (desayuno_merienda) {
        meals.push('desayuno', 'merienda');
    }
    if (almuerzo_cena) {
        meals.push('almuerzo', 'cena');
    }
    if (snack) {
        meals.push('snack');
    }
    if (meals.length === 0) {
        meals.push('almuerzo', 'cena');
    }

    // Categoría simplificada
    let catSimple = 'protein';
    const catLower = (categoria || '').toLowerCase();
    if (catLower.includes('proteína') || catLower.includes('proteina') || catLower.includes('carne') || catLower.includes('pollo') || catLower.includes('pescado') || catLower.includes('huevo')) catSimple = 'protein';
    else if (catLower.includes('carbohidrato') || catLower.includes('cereal') || catLower.includes('tubérculo') || catLower.includes('legumbre') || catLower.includes('arroz') || catLower.includes('pasta')) catSimple = 'carbs';
    else if (catLower.includes('grasa') || catLower.includes('semilla') || catLower.includes('fruto seco') || catLower.includes('aceite') || catLower.includes('palta')) catSimple = 'healthy_fats';
    else if (catLower.includes('vegetal') || catLower.includes('fruta') || catLower.includes('hidratación') || catLower.includes('fibra') || catLower.includes('ensalada')) catSimple = 'hydration_veg';

    // Objetivos
    const objLower = (objetivo || '').toLowerCase();
    const goals = [];
    if (objLower.includes('déficit') || objLower.includes('deficit') || objLower.includes('grasa')) goals.push('deficit');
    if (objLower.includes('recomposición') || objLower.includes('recomposicion') || objLower.includes('mantenimiento')) goals.push('recomposicion');
    if (objLower.includes('superávit') || objLower.includes('superavit') || objLower.includes('muscular') || objLower.includes('hipertrofia')) goals.push('hipertrofia');
    if (goals.length === 0) goals.push('deficit', 'recomposicion', 'hipertrofia');

    // Valores por 100g para regla de tres
    const factor100 = porcion_total_g > 0 ? (100 / porcion_total_g) : 1;
    const calPer100 = Math.round(calorias * factor100);
    const protPer100 = Math.round((proteinas * factor100) * 10) / 10;
    const carbsPer100 = Math.round((carbohidratos * factor100) * 10) / 10;
    const fatsPer100 = Math.round((grasas * factor100) * 10) / 10;

    foodItems.push({
        id,
        codigo,
        name: nombre,
        nombre_alimento_o_plato: nombre,
        name_es: nombre,
        name_en,
        nameEn: name_en,
        tipo_item,
        tipoItem: tipo_item,
        categoria_nutricional: categoria,
        categoria,
        cat: catSimple,
        objetivo_principal: objetivo,
        objetivoPrincipal: objetivo,
        goals,
        // 3 Columnas booleanas directas
        almuerzo_cena,
        almuerzoCena: almuerzo_cena,
        desayuno_merienda,
        desayunoMerienda: desayuno_merienda,
        snack,
        meals,
        timing_entrenamiento,
        timingEntrenamiento: timing_entrenamiento,
        porcion_total_g_ml: porcion_total_g,
        porcionTotalG: porcion_total_g,
        baseGrams: porcion_total_g,
        defaultGrams: porcion_total_g,
        // Peso por unidad individual para escalado
        peso_unidad_g,
        pesoUnidadG: peso_unidad_g,
        unidades_caseras_total: unidades_caseras,
        unidadesCaseras: unidades_caseras,
        portion: unidades_caseras || (`${porcion_total_g} g`),
        ingredientes_y_gramajes: rawIng,
        ingredientesList,
        calorias_kcal: calorias,
        calories: calorias,
        proteinas_g: proteinas,
        protein: proteinas,
        carbohidratos_g: carbohidratos,
        carbs: carbohidratos,
        grasas_g: grasas,
        fats: grasas,
        fibra_g: fibra,
        fibraG: fibra,
        densidad_proteica_pct: densidad_proteica,
        densidadProteicaPct: densidad_proteica,
        indice_saciedad: saciedad,
        indiceSaciedad: saciedad,
        grado_dificultad: dificultad,
        gradoDificultad: dificultad,
        tiempo_preparacion_min: tiempo_prep,
        tiempoPreparacionMin: tiempo_prep,
        costo_estimado_nivel,
        costoEstimadoNivel: costo_estimado_nivel,
        apto_vianda_fria,
        aptoViandaFria: apto_vianda_fria,
        paso_a_paso_preparacion: rawPasos,
        pasosList,
        etiquetas_dieta_filtros: dietas,
        etiquetasDieta: (dietas || '').split(',').map(s => s.trim()).filter(Boolean),
        alergenos,
        alergenosList: (alergenos || '').split(',').map(s => s.trim()).filter(Boolean),
        micronutrientes_clave: micronutrientes,
        micronutrientes: (micronutrientes || '').split('|').map(s => s.trim()).filter(Boolean),
        reemplazos_equivalentes: reemplazos,
        reemplazosEquivalentes: reemplazos,
        tip_nutricionista_deportivo: tip_nutricionista,
        tipNutricionista: tip_nutricionista,
        truco_del_chef,
        trucoDelChef: truco_del_chef,
        ingredientes_compras_json: rawComprasJson,
        ingredientesCompras,
        image_url: imagen_url,
        imagen_url,
        imagen_path: imagen_url,
        image: imagen_url,
        thumbnail: imagen_url,
        calPer100,
        protPer100,
        carbsPer100,
        fatsPer100
    });
}

console.log('Successfully processed foods:', foodItems.length);
console.log('Images found:', imageChecks.found, 'Missing/fallback:', imageChecks.missing);

// Generar nutrition_db.js
const targetFile = path.join(__dirname, '..', 'nutrition_db.js');
const jsCode = `/**
 * =============================================================================
 * SENS NUTRITION MASTER LIBRARY (500 ALIMENTOS Y COMIDAS FITNESS CLINICAS v2)
 * =============================================================================
 * Fuente Oficial de Verdad Nutricional para SENS Coach OS & Portal de Atleta.
 * Generado automáticamente a partir de SENS_Base_Datos_500_Alimentos_y_Comidas_Fitness_Nutricion_v2.csv.
 * 35 columnas estandarizadas: macronutrientes, peso_unidad_g, costo_estimado_nivel,
 * apto_vianda_fria, truco_del_chef, ingredientes_compras_json e imagen_url.
 */

const SENS_FOOD_LIBRARY = ${JSON.stringify(foodItems, null, 2)};

// Aliases y registro global
if (typeof window !== 'undefined') {
    window.SENS_FOOD_LIBRARY = SENS_FOOD_LIBRARY;
    window.FOOD_CATALOG = SENS_FOOD_LIBRARY;
}

/**
 * Resuelve un alimento por ID, código o nombre con tolerancia de búsqueda inteligente
 */
function getResolvedFood(foodOrId, athleteId = null) {
    if (!foodOrId) return null;
    const searchId = typeof foodOrId === 'string' ? foodOrId : (foodOrId.id || foodOrId.codigo || '');
    const searchCode = typeof foodOrId === 'object' ? (foodOrId.codigo || foodOrId.code || '') : '';
    const searchName = typeof foodOrId === 'string' ? foodOrId : (foodOrId.name || foodOrId.nombre_alimento_o_plato || foodOrId.name_es || '');

    let baseFood = null;
    if (searchId) {
        baseFood = SENS_FOOD_LIBRARY.find(f => f.id === searchId || f.codigo === searchId);
    }
    if (!baseFood && searchCode) {
        baseFood = SENS_FOOD_LIBRARY.find(f => f.codigo === searchCode);
    }
    if (!baseFood && searchName) {
        const clean = searchName.toLowerCase().trim();
        baseFood = SENS_FOOD_LIBRARY.find(f => 
            (f.name && f.name.toLowerCase() === clean) ||
            (f.nombre_alimento_o_plato && f.nombre_alimento_o_plato.toLowerCase() === clean) ||
            (f.name_es && f.name_es.toLowerCase() === clean) ||
            (f.name_en && f.name_en.toLowerCase() === clean)
        );
        if (!baseFood) {
            // Intento con includes para títulos ligeramente modificados
            baseFood = SENS_FOOD_LIBRARY.find(f => 
                (f.name && (f.name.toLowerCase().includes(clean) || clean.includes(f.name.toLowerCase()))) ||
                (f.nombre_alimento_o_plato && (f.nombre_alimento_o_plato.toLowerCase().includes(clean) || clean.includes(f.nombre_alimento_o_plato.toLowerCase())))
            );
        }
    }
    if (!baseFood && typeof foodOrId === 'object') {
        baseFood = foodOrId;
    }
    if (!baseFood) return null;

    let resolved = Object.assign({}, baseFood);

    // Overrides por alumno en Coach OS si existen
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
    } catch (_) {}

    return resolved;
}

/**
 * Calcula macros exactos para un gramaje específico usando regla de tres simple
 */
function calculateFoodMacros(food, grams = null) {
    if (!food) return { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0, fiber: 0 };
    const porcionBase = food.porcion_total_g_ml || food.defaultGrams || 100;
    const targetGrams = (typeof grams === 'number' && grams > 0) ? grams : porcionBase;
    
    // Si tiene calPer100 calcular sobre 100g, sino sobre porcion_total_g_ml
    let cal, prot, carb, fat, fib;
    if (food.calPer100 !== undefined && !isNaN(food.calPer100)) {
        const factor = targetGrams / 100;
        cal = Math.round(food.calPer100 * factor);
        prot = Math.round((food.protPer100 || 0) * factor * 10) / 10;
        carb = Math.round((food.carbsPer100 || 0) * factor * 10) / 10;
        fat = Math.round((food.fatsPer100 || 0) * factor * 10) / 10;
        fib = Math.round(((food.fibra_g || 0) / (porcionBase / 100)) * factor * 10) / 10;
    } else {
        const factor = targetGrams / (porcionBase || 100);
        cal = Math.round((food.calorias_kcal || food.calories || 0) * factor);
        prot = Math.round(((food.proteinas_g || food.protein || 0) * factor) * 10) / 10;
        carb = Math.round(((food.carbohidratos_g || food.carbs || 0) * factor) * 10) / 10;
        fat = Math.round(((food.grasas_g || food.fats || 0) * factor) * 10) / 10;
        fib = Math.round(((food.fibra_g || 0) * factor) * 10) / 10;
    }

    return {
        grams: targetGrams,
        calories: cal,
        protein: prot,
        carbs: carb,
        fats: fat,
        fiber: fib
    };
}

/**
 * Generador Automático de Lista de Supermercado agrupada por Góndola
 */
function buildWeeklyShoppingList(plannedEntries) {
    const accumulator = new Map();

    for (const entry of (plannedEntries || [])) {
        const item = entry.item || entry;
        const gramosAsignados = entry.gramosAsignados || entry.grams || item.porcion_total_g_ml || 100;
        const porcionBase = item.porcion_total_g_ml || item.porcionTotalG || 100;
        const factor = gramosAsignados / (porcionBase || 1);

        const compras = item.ingredientesCompras || item.ingredientes_compras || [];
        for (const comp of compras) {
            const gondola = comp.gondola || 'Almacén y Legumbres';
            const ingName = comp.ingrediente || 'Ingrediente';
            const unidad = comp.unidad || 'g';
            const key = \`\${gondola}::\${ingName.toLowerCase()}::\${unidad}\`;
            const scaledQty = Math.round((comp.cantidad_compra || 0) * factor);
            const existing = accumulator.get(key);
            if (existing) {
                existing.cantidadTotal += scaledQty;
            } else {
                accumulator.set(key, {
                    ingrediente: ingName,
                    cantidadTotal: scaledQty,
                    unidad: unidad,
                    gondola: gondola
                });
            }
        }
    }

    const groupedByAisle = {};
    for (const entry of accumulator.values()) {
        if (!groupedByAisle[entry.gondola]) {
            groupedByAisle[entry.gondola] = [];
        }
        groupedByAisle[entry.gondola].push({
            ingrediente: entry.ingrediente,
            cantidadTotal: entry.cantidadTotal,
            unidad: entry.unidad
        });
    }
    return groupedByAisle;
}

if (typeof window !== 'undefined') {
    window.getResolvedFood = getResolvedFood;
    window.calculateFoodMacros = calculateFoodMacros;
    window.buildWeeklyShoppingList = buildWeeklyShoppingList;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SENS_FOOD_LIBRARY, getResolvedFood, calculateFoodMacros, buildWeeklyShoppingList };
}
`;

fs.writeFileSync(targetFile, jsCode, 'utf8');
console.log('SUCCESS! Wrote nutrition_db.js with', foodItems.length, 'foods.');
