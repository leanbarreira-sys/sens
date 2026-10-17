// =============================================================================
// SENS FITNESS - BASE MAESTRA DE EJERCICIOS (OFICIAL GUÍA NICO)
// Extraído de: Guía de ejercicios SENS (PDF 40 páginas)
// =============================================================================

const SENS_EXERCISE_LIBRARY = [
    // -------------------------------------------------------------------------
    // 1. PECHO (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'pecho-1',
        name: 'Press de banca con barra',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Acostate en el banco, apoyá los pies y mantené las escápulas estables. Bajá la barra hacia el pecho y empujá hasta extender los codos sin bloquearlos bruscamente.',
        breathing: 'Inspirá al bajar y espirá al empujar.',
        recommendations: 'Evitá rebotar la barra, levantar los glúteos o perder el control. Usá seguros o asistencia.',
        level: 'Intermedio',
        objective: 'Fuerza / Hipertrofia',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-2',
        name: 'Press inclinado con mancuernas',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor (porción clavicular)',
        execution: 'Colocá el banco con una inclinación moderada. Bajá las mancuernas a ambos lados del pecho y empujá hacia arriba.',
        breathing: 'Inspirá al bajar y espirá al subir.',
        recommendations: 'Mantené las muñecas alineadas y utilizá un recorrido cómodo para los hombros.',
        level: 'Intermedio',
        objective: 'Hipertrofia / Pecho Superior',
        rest: 90,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-3',
        name: 'Press de pecho en máquina',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Ajustá el asiento para que las empuñaduras queden aproximadamente a la altura del pecho. Empujá hacia delante y regresá lentamente.',
        breathing: 'Espirá al empujar e inspirá al regresar.',
        recommendations: 'Mantené la espalda apoyada y evitá bloquear los codos bruscamente.',
        level: 'Principiante',
        objective: 'Hipertrofia / Principiantes',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-4',
        name: 'Press de banca con mancuernas',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Acostate en un banco plano con las mancuernas a los lados del pecho. Empujá hacia arriba y bajá con control.',
        breathing: 'Espirá durante el empuje e inspirá al descender.',
        recommendations: 'Evitá chocar las mancuernas arriba y no bajes más allá del rango que controles cómodamente.',
        level: 'Intermedio',
        objective: 'Fuerza / Hipertrofia',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-5',
        name: 'Aperturas en poleas',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Con las poleas a la altura adecuada, llevá los brazos hacia delante describiendo un arco, con los codos ligeramente flexionados.',
        breathing: 'Espirá al juntar los brazos e inspirá al abrirlos.',
        recommendations: 'Evitá convertir el movimiento en un press o llevar los brazos demasiado atrás.',
        level: 'Intermedio',
        objective: 'Aislamiento / Hipertrofia',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-6',
        name: 'Aperturas con mancuernas en banco plano',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Acostado en banco, abrí los brazos en arco con los codos ligeramente flexionados y juntá las mancuernas sobre el pecho.',
        breathing: 'Inspirá al abrir y espirá al cerrar.',
        recommendations: 'Utilizá cargas ligeras y evitá bajar excesivamente, porque el ejercicio puede exigir mucho al hombro.',
        level: 'Intermedio',
        objective: 'Aislamiento',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-7',
        name: 'Flexiones de brazos (Push-ups)',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Apoyá manos y pies en el suelo, mantené el cuerpo alineado y descendé flexionando los codos. Empujá para volver a la posición inicial.',
        breathing: 'Inspirá al bajar y espirá al subir.',
        recommendations: 'Evitá hundir la cadera o adelantar la cabeza. Podés apoyar las manos en un banco para facilitar el ejercicio.',
        level: 'Adaptable',
        objective: 'Principiantes / Resistencia',
        rest: 60,
        default_sets: 3,
        default_reps: '10-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-8',
        name: 'Press inclinado en máquina',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor (porción clavicular)',
        execution: 'Ajustá el asiento y empujá las empuñaduras hacia arriba y delante, siguiendo la trayectoria de la máquina.',
        breathing: 'Espirá al empujar e inspirá al regresar.',
        recommendations: 'Mantené el respaldo apoyado y adaptá la posición si el movimiento genera molestias.',
        level: 'Principiante a intermedio',
        objective: 'Hipertrofia / Pecho Superior',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-9',
        name: 'Cruce de poleas de abajo hacia arriba',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor (porción clavicular)',
        execution: 'Comenzá con las manos bajas y ligeramente a los lados. Llevá los brazos hacia delante y arriba, aproximadamente a la altura del pecho superior.',
        breathing: 'Espirá al cerrar e inspirá al regresar.',
        recommendations: 'Mantené el tronco estable y evitá arquear la espalda para mover más peso.',
        level: 'Intermedio',
        objective: 'Énfasis en pecho superior / Aislamiento',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pecho-10',
        name: 'Press de pecho con banda elástica',
        category: 'pecho',
        muscle_group: 'pecho',
        primary_muscle: 'Pectoral mayor',
        execution: 'Colocá la banda en un anclaje firme detrás tuyo. Llevá las manos desde los lados del pecho hacia delante y regresá lentamente.',
        breathing: 'Espirá al empujar e inspirá al regresar.',
        recommendations: 'Verificá el anclaje antes de empezar y mantené las muñecas alineadas.',
        level: 'Principiante',
        objective: 'En Casa / Principiantes',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 2. ESPALDA (12 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'espalda-1',
        name: 'Jalón al pecho con agarre prono',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Dorsal ancho',
        execution: 'Sujetar la barra con las palmas hacia delante y llevarla hacia la parte superior del pecho, dirigiendo los codos hacia abajo.',
        breathing: 'Espirá al jalar e inspirá al subir.',
        recommendations: 'Evitar balancear el torso, encoger los hombros o llevar la barra detrás de la nuca.',
        level: 'Intermedio',
        objective: 'Hipertrofia / Amplitud',
        rest: 90,
        default_sets: 4,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-2',
        name: 'Jalón al pecho con agarre neutro',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Dorsal ancho y bíceps',
        execution: 'Usar un agarre con las palmas enfrentadas y llevar los codos hacia los costados del torso.',
        breathing: 'Espirá al traccionar e inspirá al extender.',
        recommendations: 'Mantener las muñecas alineadas y utilizar un recorrido cómodo para los hombros.',
        level: 'Intermedio',
        objective: 'Fuerza / Confort articular',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-3',
        name: 'Jalón al pecho con agarre supino',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Dorsal ancho y bíceps',
        execution: 'Sujetar la barra con las palmas hacia el cuerpo y llevarla hacia la parte superior del pecho flexionando los codos.',
        breathing: 'Espirá al descender la barra e inspirá al regresar.',
        recommendations: 'Evitar impulsarse hacia atrás y no forzar las muñecas.',
        level: 'Intermedio',
        objective: 'Fuerza / Hipertrofia',
        rest: 90,
        default_sets: 3,
        default_reps: '10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-4',
        name: 'Remo sentado en polea',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Espalda media y dorsales',
        execution: 'Llevar el agarre hacia el torso, moviendo los codos hacia atrás y manteniendo una postura estable.',
        breathing: 'Espirá al tirar hacia el torso e inspirá al extender brazos.',
        recommendations: 'Evitar balancear el tronco o redondear excesivamente la espalda.',
        level: 'Principiante a intermedio',
        objective: 'Densidad de espalda',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-5',
        name: 'Remo con barra',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Espalda completa y erectores',
        execution: 'Inclinar el torso mediante una bisagra de cadera y llevar la barra hacia el abdomen.',
        breathing: 'Espirá al levantar la barra e inspirá al descender.',
        recommendations: 'Mantener la columna estable y evitar utilizar impulso para levantar la carga.',
        level: 'Avanzado',
        objective: 'Fuerza máxima / Espesor',
        rest: 120,
        default_sets: 4,
        default_reps: '6-8',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-6',
        name: 'Remo unilateral con mancuerna',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Dorsal ancho y romboides',
        execution: 'Apoyarse en un banco y llevar la mancuerna hacia la cadera, flexionando el codo.',
        breathing: 'Espirá al elevar e inspirá al bajar.',
        recommendations: 'Evitar rotar el tronco y controlar tanto la subida como la bajada.',
        level: 'Intermedio',
        objective: 'Fuerza unilateral / Simetría',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-7',
        name: 'Remo en máquina con apoyo de pecho',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Espalda media y trapecio medio',
        execution: 'Apoyar el pecho en el cojín y tirar de las empuñaduras hacia el torso.',
        breathing: 'Espirá al traccionar e inspirá al soltar.',
        recommendations: 'Ajustar el asiento y evitar elevar los hombros al finalizar la repetición.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento sin fatiga lumbar',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-8',
        name: 'Face pull en polea',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Deltoides posterior y rotadores externos',
        execution: 'Tirar de la cuerda hacia la cara, separando las manos y moviendo los codos de forma controlada.',
        breathing: 'Espirá al tirar e inspirá al extender.',
        recommendations: 'Usar una carga moderada y evitar arquear la espalda o forzar la rotación del hombro.',
        level: 'Intermedio',
        objective: 'Salud postural y hombros',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-9',
        name: 'Aperturas inversas en Peck Deck',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Deltoides posterior y romboides',
        execution: 'Sentado mirando hacia el respaldo, abrir los brazos hacia los lados manteniendo los codos ligeramente flexionados.',
        breathing: 'Espirá al abrir e inspirá al cerrar.',
        recommendations: 'Evitar impulsos y no llevar los brazos excesivamente detrás del cuerpo.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento escapular',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-10',
        name: 'Pájaros con mancuernas',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Deltoides posterior',
        execution: 'Inclinar el torso y abrir los brazos lateralmente, controlando el movimiento.',
        breathing: 'Espirá al abrir e inspirá al descender.',
        recommendations: 'Utilizar poco peso y evitar balancearse. Trabaja principalmente el deltoides posterior.',
        level: 'Intermedio',
        objective: 'Aislamiento posterior',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-11',
        name: 'Encogimientos con mancuernas',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Trapecio superior',
        execution: 'Elevar los hombros verticalmente hacia las orejas, mantener brevemente y bajarlos de manera controlada.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Evitar hacer círculos con los hombros o utilizar impulso.',
        level: 'Intermedio',
        objective: 'Trapecios',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'espalda-12',
        name: 'Extensiones de espalda en banco romano',
        category: 'espalda',
        muscle_group: 'espalda',
        primary_muscle: 'Erectores espinales y glúteos',
        execution: 'Desde la cadera, elevar el tronco hasta alinearlo con las piernas y regresar controladamente.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Evitar hiperextender la columna. Adaptar el recorrido y la carga a la experiencia del alumno.',
        level: 'Adaptable',
        objective: 'Cadena posterior y lumbar',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 3. HOMBROS (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'hombros-1',
        name: 'Press de hombros con mancuernas',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides anterior y lateral',
        execution: 'Desde una posición sentada o de pie, empujar las mancuernas hacia arriba y bajarlas de forma controlada.',
        breathing: 'Inspirá al bajar y espirá al empujar.',
        recommendations: 'Mantener el tronco estable y usar un recorrido cómodo para los hombros.',
        level: 'Intermedio',
        objective: 'Fuerza e Hipertrofia',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-2',
        name: 'Press de hombros en máquina',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides anterior',
        execution: 'Ajustar el asiento y empujar las empuñaduras hacia arriba siguiendo la trayectoria de la máquina.',
        breathing: 'Espirá al empujar e inspirá al descender.',
        recommendations: 'Evitar arquear excesivamente la espalda y no forzar el recorrido.',
        level: 'Principiante',
        objective: 'Hipertrofia segura',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-3',
        name: 'Press de hombros en Smith',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides anterior',
        execution: 'Sentado bajo la barra guiada, empujar hacia arriba y descender lentamente.',
        breathing: 'Inspirá al bajar y espirá al empujar.',
        recommendations: 'Comprobar los seguros y ajustar la posición para que la trayectoria no genere molestias.',
        level: 'Intermedio',
        objective: 'Carga controlada',
        rest: 90,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-4',
        name: 'Elevaciones laterales con mancuernas',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides lateral',
        execution: 'Elevar los brazos hacia los lados con los codos ligeramente flexionados.',
        breathing: 'Espirá al elevar e inspirá al descender.',
        recommendations: 'Evitar balancear el tronco o encoger los hombros. Elegir una altura que resulte cómoda.',
        level: 'Intermedio',
        objective: 'Amplitud de hombros',
        rest: 60,
        default_sets: 4,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-5',
        name: 'Elevación lateral en polea',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides lateral',
        execution: 'Elevar un brazo lateralmente contra la resistencia de la polea, manteniendo el cuerpo estable.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Empezar con poca carga y controlar especialmente el descenso.',
        level: 'Intermedio',
        objective: 'Tensión constante',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-6',
        name: 'Elevaciones laterales en máquina',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides lateral',
        execution: 'Apoyar los brazos en los soportes y elevarlos lateralmente según el recorrido de la máquina.',
        breathing: 'Espirá al elevar e inspirá al descender.',
        recommendations: 'Ajustar el asiento y evitar utilizar impulso para completar las repeticiones.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento lateral',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-7',
        name: 'Aperturas inversas en Peck Deck (Hombro)',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides posterior',
        execution: 'Abrir los brazos hacia los lados con el pecho apoyado.',
        breathing: 'Espirá al abrir e inspirá al regresar.',
        recommendations: 'Mantener el cuello relajado y evitar llevar los codos demasiado atrás.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento posterior',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-8',
        name: 'Pájaros con mancuernas para deltoides',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides posterior',
        execution: 'Inclinar el torso y separar los brazos lateralmente, manteniendo una ligera flexión de codos.',
        breathing: 'Espirá al separar e inspirá al bajar.',
        recommendations: 'Utilizar cargas ligeras y evitar balancearse.',
        level: 'Intermedio',
        objective: 'Deltoides posterior',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-9',
        name: 'Aperturas posteriores en poleas',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides posterior',
        execution: 'Llevar los brazos hacia los lados contra la resistencia de las poleas, controlando el movimiento.',
        breathing: 'Espirá al traccionar e inspirá al cerrar.',
        recommendations: 'Mantener el tronco estable y elegir una posición que no provoque molestias.',
        level: 'Intermedio',
        objective: 'Tensión continua',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'hombros-10',
        name: 'Elevaciones frontales con mancuernas',
        category: 'hombros',
        muscle_group: 'hombros',
        primary_muscle: 'Deltoides anterior',
        execution: 'Elevar los brazos hacia delante hasta una altura cómoda y bajarlos lentamente.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Evitar impulsos y cargas excesivas. El deltoides anterior ya participa en presses.',
        level: 'Intermedio',
        objective: 'Aislamiento frontal',
        rest: 60,
        default_sets: 3,
        default_reps: '12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 4. BÍCEPS (11 Ejercicios incluyendo Bayesian Curl)
    // -------------------------------------------------------------------------
    {
        id: 'biceps-1',
        name: 'Curl de bíceps con barra recta',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Sujetar la barra con las palmas hacia arriba y flexionar los codos para elevarla. Bajar lentamente.',
        breathing: 'Espirá al flexionar e inspirá al descender.',
        recommendations: 'Mantener los codos relativamente estables y evitar balancear el tronco.',
        level: 'Intermedio',
        objective: 'Masa y Fuerza de Bíceps',
        rest: 75,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-2',
        name: 'Curl con barra EZ',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial y braquial',
        execution: 'Agarrar la barra por las zonas anguladas y flexionar los codos sin desplazar excesivamente los brazos.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Elegir un agarre cómodo para las muñecas y controlar el descenso.',
        level: 'Intermedio',
        objective: 'Cuidado articular de muñecas',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-3',
        name: 'Curl alternado con mancuernas',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Flexionar un codo por vez, alternando los brazos. Se puede mantener la palma hacia arriba durante todo el movimiento.',
        breathing: 'Espirá al elevar e inspirá al bajar.',
        recommendations: 'Evitar girar el tronco o utilizar impulso.',
        level: 'Principiante a intermedio',
        objective: 'Fuerza unilateral',
        rest: 60,
        default_sets: 3,
        default_reps: '10 por brazo',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-4',
        name: 'Curl martillo con mancuernas',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Braquial y braquiorradial',
        execution: 'Sujetar las mancuernas con las palmas enfrentadas y flexionar los codos sin cambiar el agarre.',
        breathing: 'Espirá al flexionar e inspirá al descender.',
        recommendations: 'Mantener las muñecas neutras y evitar balancearse.',
        level: 'Intermedio',
        objective: 'Grosor de brazo y antebrazo',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-5',
        name: 'Curl predicador en máquina',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Apoyar los brazos en el soporte y flexionar los codos para elevar la carga. Regresar lentamente.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Ajustar el asiento y evitar bloquear los codos o forzar la extensión al bajar.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento estricto',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-6',
        name: 'Curl predicador con mancuerna',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Apoyar la parte posterior del brazo en el banco predicador y flexionar el codo de forma controlada.',
        breathing: 'Espirá al flexionar e inspirá al descender.',
        recommendations: 'Evitar despegar el brazo del apoyo y usar un rango cómodo.',
        level: 'Intermedio',
        objective: 'Pico de bíceps unilateral',
        rest: 60,
        default_sets: 3,
        default_reps: '10 por brazo',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-7',
        name: 'Curl inclinado con mancuernas',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial (cabeza larga)',
        execution: 'Sentado en un banco inclinado, dejar los brazos a los lados y flexionar los codos para elevar las mancuernas.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'No forzar la posición extendida del hombro y evitar bajar más allá del rango tolerable.',
        level: 'Intermedio',
        objective: 'Estiramiento máximo',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-8',
        name: 'Curl de bíceps en polea baja',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Sujetar la barra conectada a la polea baja y flexionar los codos sin desplazar el tronco.',
        breathing: 'Espirá al flexionar e inspirá al regresar.',
        recommendations: 'Mantener tensión controlada y evitar inclinarse hacia atrás para completar la repetición.',
        level: 'Principiante a intermedio',
        objective: 'Tensión constante',
        rest: 60,
        default_sets: 3,
        default_reps: '12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-9',
        name: 'Curl unilateral en polea',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Con un agarre individual, flexionar un codo por vez manteniendo el brazo estable.',
        breathing: 'Espirá al traccionar e inspirá al extender.',
        recommendations: 'Trabajar ambos lados con técnica y esfuerzo comparables, sin girar el cuerpo.',
        level: 'Intermedio',
        objective: 'Simetría',
        rest: 60,
        default_sets: 3,
        default_reps: '12 por brazo',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-10',
        name: 'Curl de bíceps en banco Scott con barra EZ',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial',
        execution: 'Apoyar ambos brazos en el banco Scott y elevar la barra flexionando los codos. Descender de forma controlada.',
        breathing: 'Espirá al flexionar e inspirá al bajar.',
        recommendations: 'Ajustar el banco a la altura adecuada y evitar rebotes o extensión forzada de los codos.',
        level: 'Intermedio',
        objective: 'Aislamiento braquial',
        rest: 75,
        default_sets: 3,
        default_reps: '10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'biceps-11',
        name: 'Curl bayesiano de bíceps (Bayesian curl)',
        category: 'biceps',
        muscle_group: 'biceps',
        primary_muscle: 'Bíceps braquial (posición elongada)',
        execution: 'De espaldas a la polea baja con el cable detrás del cuerpo, flexioná el codo llevando la mano hacia el hombro sin adelantar el brazo.',
        breathing: 'Espirá al flexionar e inspirá al descender.',
        recommendations: 'Mantené el hombro estable y controlá la fase de descenso. Usá un peso que no te obligue a arquear la espalda.',
        level: 'Intermedio a avanzado',
        objective: 'Hipertrofia en máximo estiramiento',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 5. TRÍCEPS (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'triceps-1',
        name: 'Extensión de tríceps en polea con cuerda',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Con los codos pegados al torso, extendé los brazos hacia abajo y separá ligeramente los extremos de la cuerda al final.',
        breathing: 'Espirá al extender e inspirá al regresar.',
        recommendations: 'Evitá mover los hombros y balancear el cuerpo. Controlá el regreso.',
        level: 'Principiante a intermedio',
        objective: 'Aislamiento y definición',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-2',
        name: 'Extensión de tríceps en polea con barra recta',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Empujá la barra hacia abajo hasta extender los codos y regresá lentamente.',
        breathing: 'Espirá al empujar e inspirá al flexionar.',
        recommendations: 'Mantené las muñecas firmes y los codos estables. Usá un agarre cómodo.',
        level: 'Intermedio',
        objective: 'Sobrecarga progresiva',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-3',
        name: 'Extensión unilateral de tríceps en polea',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Con un brazo por vez, extendé el codo llevando la mano hacia abajo.',
        breathing: 'Espirá al extender e inspirá al subir.',
        recommendations: 'Evitá rotar el torso y compará el control y el recorrido entre ambos lados.',
        level: 'Intermedio',
        objective: 'Simetría',
        rest: 60,
        default_sets: 3,
        default_reps: '12 por brazo',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-4',
        name: 'Extensión de tríceps por encima de la cabeza en polea',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial (cabeza larga)',
        execution: 'De espaldas a la polea, con los brazos elevados, extendé los codos llevando las manos hacia adelante.',
        breathing: 'Espirá al extender e inspirá al flexionar.',
        recommendations: 'Mantené las costillas controladas y evitá arquear la zona lumbar. Requiere movilidad cómoda de hombros.',
        level: 'Intermedio',
        objective: 'Énfasis en cabeza larga',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-5',
        name: 'Extensión de tríceps por encima de la cabeza con mancuerna',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial (cabeza larga)',
        execution: 'Sostené una mancuerna con ambas manos, flexioná los codos para bajarla detrás de la cabeza y volvé a extenderlos.',
        breathing: 'Inspirá al bajar y espirá al extender.',
        recommendations: 'Evitá abrir excesivamente los codos y utilizá un recorrido sin molestias.',
        level: 'Intermedio',
        objective: 'Estiramiento del tríceps',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-6',
        name: 'Press francés con barra EZ',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Acostado en un banco, flexioná los codos para acercar la barra a la frente o ligeramente detrás de la cabeza y luego extendelos.',
        breathing: 'Inspirá al flexionar codos y espirá al extender.',
        recommendations: 'Mantené los brazos relativamente estables y evitá forzar los codos. La barra EZ es más cómoda para muñecas.',
        level: 'Intermedio',
        objective: 'Masa de tríceps',
        rest: 75,
        default_sets: 3,
        default_reps: '10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-7',
        name: 'Extensión de tríceps acostado con mancuernas',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Acostado en un banco, bajá las mancuernas flexionando los codos y volvé a extender los brazos.',
        breathing: 'Inspirá al bajar y espirá al extender.',
        recommendations: 'Mantené las muñecas neutras y usá un peso que permita controlar ambas mancuernas.',
        level: 'Intermedio',
        objective: 'Control y confort articular',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-8',
        name: 'Press de banca con agarre cerrado',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial y pectoral',
        execution: 'Acostado en un banco, bajá la barra hacia el pecho con un agarre algo más estrecho que el habitual y empujá hacia arriba.',
        breathing: 'Inspirá al descender y espirá al empujar.',
        recommendations: 'No juntes excesivamente las manos; mantené las muñecas alineadas y los codos en trayectoria cómoda.',
        level: 'Intermedio a avanzado',
        objective: 'Fuerza compuesta',
        rest: 90,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-9',
        name: 'Fondos en paralelas',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial y pectoral',
        execution: 'Sostené el cuerpo entre las barras, flexioná los codos para descender y empujá hasta volver arriba.',
        breathing: 'Inspirá al bajar y espirá al subir.',
        recommendations: 'Empezá con asistencia si es necesario. Evitá bajar más de lo que permitan tus hombros sin molestias.',
        level: 'Intermedio a avanzado',
        objective: 'Fuerza peso corporal',
        rest: 90,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'triceps-10',
        name: 'Patada de tríceps con mancuerna',
        category: 'triceps',
        muscle_group: 'triceps',
        primary_muscle: 'Tríceps braquial',
        execution: 'Incliná el torso, mantené el brazo junto al cuerpo y extendé el codo llevando la mancuerna hacia atrás.',
        breathing: 'Espirá al extender e inspirá al flexionar.',
        recommendations: 'Evitá balancear el brazo y priorizá la contracción controlada sobre el peso.',
        level: 'Principiante a intermedio',
        objective: 'Contracción isométrica final',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 6. CUÁDRICEPS (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'cuadriceps-1',
        name: 'Sentadilla con barra',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y glúteos',
        execution: 'Apoyá la barra sobre la espalda, flexioná caderas y rodillas para descender y volvé a subir empujando el suelo.',
        breathing: 'Inspirá al descender y espirá con fuerza al subir.',
        recommendations: 'Mantené el apoyo del pie estable, rodillas alineadas con los pies y el tronco firme. Ajustá la profundidad a tu movilidad.',
        level: 'Intermedio a avanzado',
        objective: 'Fuerza fundamental / Hipertrofia',
        rest: 120,
        default_sets: 4,
        default_reps: '6-8',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-2',
        name: 'Sentadilla frontal con barra',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y core anterior',
        execution: 'Apoyá la barra delante de los hombros y realizá una sentadilla manteniendo el torso erguido.',
        breathing: 'Inspirá al descender y espirá al empujar hacia arriba.',
        recommendations: 'Requiere movilidad de tobillos y muñecas. Empezá con cargas moderadas y una posición de barra cómoda.',
        level: 'Avanzado',
        objective: 'Énfasis en cuádriceps y postura',
        rest: 120,
        default_sets: 3,
        default_reps: '6-8',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-3',
        name: 'Prensa de piernas a 45°',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps',
        execution: 'Con los pies apoyados en la plataforma, flexioná las rodillas para bajar el carro y empujá para regresar.',
        breathing: 'Inspirá al bajar y espirá al empujar.',
        recommendations: 'Evitá bloquear las rodillas con fuerza y no desciendas tanto que la pelvis se despegue del respaldo.',
        level: 'Principiante a intermedio',
        objective: 'Sobrecarga de cuádriceps',
        rest: 90,
        default_sets: 4,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-4',
        name: 'Extensión de rodillas en máquina',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps (recto femoral)',
        execution: 'Extendé las rodillas para elevar el rodillo y bajalo lentamente.',
        breathing: 'Espirá al extender e inspirá al regresar.',
        recommendations: 'Alineá el eje de la máquina con la rodilla y regulá el recorrido según la comodidad articular.',
        level: 'Principiante',
        objective: 'Aislamiento de cuádriceps',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-5',
        name: 'Sentadilla goblet con mancuerna',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y glúteos',
        execution: 'Sostené una mancuerna frente al pecho y realizá una sentadilla controlada.',
        breathing: 'Inspirá al bajar y espirá al subir.',
        recommendations: 'Buena opción para aprender el patrón. Elegí una carga que no te haga perder el equilibrio ni la postura.',
        level: 'Principiante',
        objective: 'Técnica y control postural',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-6',
        name: 'Sentadilla en máquina Hack',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps',
        execution: 'Con la espalda apoyada, flexioná las rodillas para descender y empujá la plataforma para subir.',
        breathing: 'Inspirá al descender y espirá al empujar.',
        recommendations: 'Mantené la pelvis y la espalda apoyadas; ajustá la profundidad a tu movilidad y tolerancia.',
        level: 'Intermedio',
        objective: 'Hipertrofia profunda',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-7',
        name: 'Sentadilla en máquina Smith',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps',
        execution: 'Colocá la barra sobre la espalda, destrabala y realizá sentadillas siguiendo el recorrido guiado.',
        breathing: 'Inspirá al bajar y espirá al subir.',
        recommendations: 'Probá la posición de los pies con poca carga y utilizá los seguros de la máquina.',
        level: 'Principiante a intermedio',
        objective: 'Estabilidad guiada',
        rest: 90,
        default_sets: 3,
        default_reps: '10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-8',
        name: 'Sentadilla búlgara con mancuernas',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y glúteo mayor',
        execution: 'Apoyá el pie trasero en un banco, descendé flexionando la pierna delantera y volvé a subir.',
        breathing: 'Inspirá al descender y espirá al subir.',
        recommendations: 'Empezá sin peso si necesitás practicar el equilibrio. Una postura algo más corta suele aumentar la demanda sobre cuádriceps.',
        level: 'Intermedio a avanzado',
        objective: 'Fuerza unilateral de piernas',
        rest: 90,
        default_sets: 3,
        default_reps: '8-10 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-9',
        name: 'Zancadas hacia adelante con mancuernas',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y glúteos',
        execution: 'Avanzá con una pierna, flexioná ambas rodillas y empujá con la pierna adelantada para regresar.',
        breathing: 'Inspirá al dar el paso y espirá al empujar hacia atrás.',
        recommendations: 'Mantené el pie delantero estable y controlá la trayectoria de la rodilla. Usá apoyo si el equilibrio limita el movimiento.',
        level: 'Intermedio',
        objective: 'Dinámico / Piernas',
        rest: 75,
        default_sets: 3,
        default_reps: '10 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cuadriceps-10',
        name: 'Subidas al banco con mancuernas (step-up)',
        category: 'piernas',
        muscle_group: 'cuadriceps',
        primary_muscle: 'Cuádriceps y glúteos',
        execution: 'Apoyá un pie sobre una plataforma estable, subí extendiendo esa pierna y bajá de forma controlada.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Elegí una altura que puedas controlar sin impulsarte excesivamente con la pierna de abajo. Priorizá estabilidad.',
        level: 'Principiante a intermedio',
        objective: 'Funcional y estabilidad',
        rest: 60,
        default_sets: 3,
        default_reps: '10 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 7. ISQUIOTIBIALES (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'isquios-1',
        name: 'Curl femoral sentado en máquina',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales',
        execution: 'Flexioná las rodillas llevando el rodillo hacia abajo y atrás; regresá lentamente.',
        breathing: 'Espirá al flexionar e inspirá al regresar.',
        recommendations: 'Alineá la rodilla con el eje de la máquina y controlá tanto la subida como la bajada.',
        level: 'Principiante a intermedio',
        objective: 'Hipertrofia en posición elongada',
        rest: 75,
        default_sets: 4,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-2',
        name: 'Curl femoral acostado en máquina',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales',
        execution: 'Boca abajo, flexioná las rodillas acercando los talones a los glúteos.',
        breathing: 'Espirá al flexionar e inspirá al descender.',
        recommendations: 'Mantené la pelvis apoyada y evitá arquear la zona lumbar para mover más peso.',
        level: 'Intermedio',
        objective: 'Aislamiento de flexión de rodilla',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-3',
        name: 'Curl femoral unilateral en máquina',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales',
        execution: 'Flexioná una rodilla por vez contra la resistencia de la máquina.',
        breathing: 'Espirá al flexionar e inspirá al estirar.',
        recommendations: 'Evitá rotar la pelvis y compará el control y el recorrido entre ambas piernas.',
        level: 'Intermedio',
        objective: 'Simetría muscular',
        rest: 60,
        default_sets: 3,
        default_reps: '10 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-4',
        name: 'Peso muerto rumano con barra',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales y glúteos',
        execution: 'Llevá la cadera hacia atrás con las rodillas ligeramente flexionadas, bajá la barra cerca de las piernas y volvé extendiendo la cadera.',
        breathing: 'Inspirá al bajar y espirá al extender cadera.',
        recommendations: 'Mantené la columna estable y frená el descenso cuando ya no puedas llevar la cadera atrás sin perder la posición.',
        level: 'Intermedio a avanzado',
        objective: 'Cadena posterior y fuerza de cadera',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-5',
        name: 'Peso muerto rumano con mancuernas',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales y glúteos',
        execution: 'Realizá una bisagra de cadera bajando las mancuernas cerca de los muslos y las piernas.',
        breathing: 'Inspirá al descender y espirá al incorporarte.',
        recommendations: 'Mantené el peso cerca del cuerpo y evitá convertir el movimiento en una sentadilla.',
        level: 'Intermedio',
        objective: 'Confort de agarre y bisagra',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-6',
        name: 'Peso muerto rumano unilateral',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales y glúteo medio',
        execution: 'Apoyado sobre una pierna, llevá la cadera hacia atrás mientras la pierna libre se extiende detrás; regresá a la posición inicial.',
        breathing: 'Inspirá al descender y espirá al recuperar.',
        recommendations: 'Empezá sin carga o con apoyo para dominar el equilibrio antes de aumentar el peso.',
        level: 'Avanzado',
        objective: 'Estabilidad y fuerza unilateral',
        rest: 75,
        default_sets: 3,
        default_reps: '8 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-7',
        name: 'Buenos días con barra',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales y erectores espinales',
        execution: 'Con la barra sobre la espalda, flexioná ligeramente las rodillas y llevá la cadera hacia atrás inclinando el torso.',
        breathing: 'Inspirá al inclinarte y espirá al incorporarte.',
        recommendations: 'Comenzá con poca carga; requiere control del tronco y una buena técnica de bisagra de cadera.',
        level: 'Intermedio a avanzado',
        objective: 'Fuerza de bisagra',
        rest: 90,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-8',
        name: 'Curl nórdico de isquiotibiales',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales (fuerza excéntrica)',
        execution: 'Con los tobillos sujetos, descendé el cuerpo hacia adelante lentamente desde las rodillas y ayudate con las manos para regresar.',
        breathing: 'Respiración rítmica controlada.',
        recommendations: 'Es muy exigente. Empezá con un recorrido corto y asistencia; no fuerces las repeticiones hasta el fallo.',
        level: 'Avanzado',
        objective: 'Prevención de lesiones y fuerza excéntrica',
        rest: 120,
        default_sets: 3,
        default_reps: '4-6',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-9',
        name: 'Curl femoral con pelota suiza',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Isquiotibiales y core',
        execution: 'Acostado boca arriba con los talones sobre la pelota, elevá la pelvis y acercá la pelota flexionando las rodillas.',
        breathing: 'Espirá al flexionar e inspirá al estirar piernas.',
        recommendations: 'Mantené la pelvis elevada sin arquear la espalda y reducí la dificultad si perdés estabilidad.',
        level: 'Principiante a intermedio',
        objective: 'Control y estabilidad funcional',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'isquios-10',
        name: 'Pull-through en polea',
        category: 'piernas',
        muscle_group: 'isquiotibiales',
        primary_muscle: 'Glúteos e isquiotibiales',
        execution: 'De espaldas a la polea baja y con la cuerda entre las piernas, llevá la cadera atrás y después extendela para volver erguido.',
        breathing: 'Inspirá al llevar cadera atrás y espirá al extender.',
        recommendations: 'El movimiento nace en la cadera, no en los brazos. Evitá hiperextender la zona lumbar al terminar.',
        level: 'Principiante a intermedio',
        objective: 'Patrón de bisagra asistida',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 8. GLÚTEOS (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'gluteos-1',
        name: 'Hip thrust con barra',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor',
        execution: 'Apoyá la espalda alta en un banco, ubicá la barra sobre la cadera y elevá la pelvis hasta extender la cadera.',
        breathing: 'Inspirá al bajar y espirá fuerte al subir.',
        recommendations: 'Mantené el mentón ligeramente recogido y evitá arquear la zona lumbar al llegar arriba.',
        level: 'Intermedio a avanzado',
        objective: 'Máxima fuerza e hipertrofia de glúteos',
        rest: 90,
        default_sets: 4,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-2',
        name: 'Hip thrust en máquina',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor',
        execution: 'Ajustá el respaldo y el apoyo de la cadera; empujá contra la resistencia extendiendo la cadera.',
        breathing: 'Espirá al empujar e inspirá al descender.',
        recommendations: 'Regulá la máquina a tu anatomía y controlá el descenso sin rebotar.',
        level: 'Principiante a intermedio',
        objective: 'Sobrecarga de glúteos con confort',
        rest: 90,
        default_sets: 4,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-3',
        name: 'Puente de glúteos con mancuerna',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor',
        execution: 'Acostado boca arriba, con las rodillas flexionadas y el peso sobre la pelvis, elevá la cadera y bajá controladamente.',
        breathing: 'Espirá al elevar e inspirá al descender.',
        recommendations: 'Es una alternativa accesible al hip thrust. Mantené los pies firmes y evitá compensar con la espalda.',
        level: 'Principiante',
        objective: 'Activación de glúteos',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-4',
        name: 'Patada de glúteo en polea',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor',
        execution: 'Con una tobillera conectada a la polea baja, llevá la pierna hacia atrás extendiendo la cadera.',
        breathing: 'Espirá al empujar pierna atrás e inspirá al regresar.',
        recommendations: 'Evitá rotar la pelvis o arquear la espalda para ganar recorrido.',
        level: 'Intermedio',
        objective: 'Aislamiento de glúteo mayor',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-5',
        name: 'Abducción de cadera en máquina',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo medio y menor',
        execution: 'Sentado en la máquina, separá las rodillas contra la resistencia y regresá lentamente.',
        breathing: 'Espirá al abrir e inspirá al cerrar.',
        recommendations: 'Usá un recorrido cómodo y evitá impulsarte o rebotar al abrir las piernas.',
        level: 'Principiante a intermedio',
        objective: 'Glúteo medio y estabilidad de pelvis',
        rest: 60,
        default_sets: 3,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-6',
        name: 'Abducción de cadera acostado de lado',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo medio',
        execution: 'Acostado de costado, elevá la pierna superior sin girar la pelvis y bajala lentamente.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Mantené la pierna alineada con el torso y evitá elevarla tanto que empieces a compensar.',
        level: 'Principiante',
        objective: 'En Casa / Conciencia motora',
        rest: 45,
        default_sets: 3,
        default_reps: '15 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-7',
        name: 'Zancadas hacia atrás con mancuernas',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor y cuádriceps',
        execution: 'Llevá una pierna hacia atrás, descendé flexionando ambas rodillas y empujá con la pierna delantera para regresar.',
        breathing: 'Inspirá al dar el paso atrás y espirá al incorporarte.',
        recommendations: 'Mantené estable el pie delantero y usá un apoyo si el equilibrio te limita.',
        level: 'Intermedio',
        objective: 'Énfasis en glúteo con menor impacto en rodilla',
        rest: 75,
        default_sets: 3,
        default_reps: '10 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'gluteos-8',
        name: 'Extensión de cadera en banco romano',
        category: 'gluteos',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteo mayor y cadena posterior',
        execution: 'Con la pelvis apoyada en el banco, incliná el torso y volvé a elevarlo extendiendo la cadera apretando glúteos.',
        breathing: 'Inspirá al flexionar y espirá al extender.',
        recommendations: 'Terminá con el cuerpo alineado, sin hiperextender la espalda. Ajustá el banco para permitir mover la cadera.',
        level: 'Intermedio',
        objective: 'Fortalecimiento de cadena posterior',
        rest: 60,
        default_sets: 3,
        default_reps: '12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 9. PANTORRILLAS (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'pantorrillas-1',
        name: 'Elevación de talones de pie en máquina',
        category: 'pantorrillas',
        muscle_group: 'pantorrillas',
        primary_muscle: 'Gastrocnemio (gemelos)',
        execution: 'Elevá los talones lo máximo posible y descendé de forma controlada hasta sentir el estiramiento.',
        breathing: 'Espirá al subir e inspirá al descender.',
        recommendations: 'Mantené las rodillas extendidas sin bloquearlas y evitá rebotar abajo.',
        level: 'Principiante a intermedio',
        objective: 'Hipertrofia de gemelos',
        rest: 60,
        default_sets: 4,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pantorrillas-2',
        name: 'Elevación de talones sentado en máquina',
        category: 'pantorrillas',
        muscle_group: 'pantorrillas',
        primary_muscle: 'Sóleo',
        execution: 'Con las rodillas flexionadas a 90°, elevá los talones y bajalos lentamente.',
        breathing: 'Espirá al subir e inspirá al bajar.',
        recommendations: 'Mantené el antepié apoyado y aprovechá un recorrido amplio. La posición flexionada enfatiza el sóleo.',
        level: 'Principiante a intermedio',
        objective: 'Desarrollo del sóleo',
        rest: 60,
        default_sets: 4,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pantorrillas-3',
        name: 'Elevación de talones en prensa',
        category: 'pantorrillas',
        muscle_group: 'pantorrillas',
        primary_muscle: 'Gastrocnemio',
        execution: 'Colocá el antepié en la parte inferior de la plataforma y mové los tobillos para elevar y bajar los talones.',
        breathing: 'Espirá al empujar e inspirá al descender.',
        recommendations: 'Asegurá la plataforma, mantené las rodillas estables y no dejes que los pies resbalen.',
        level: 'Intermedio',
        objective: 'Sobrecarga de pantorrillas',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pantorrillas-4',
        name: 'Elevación de talón unilateral con mancuerna',
        category: 'pantorrillas',
        muscle_group: 'pantorrillas',
        primary_muscle: 'Gastrocnemio',
        execution: 'Apoyado sobre un pie, elevá el talón mientras sostenés una mancuerna con la mano.',
        breathing: 'Espirá al elevar e inspirá al descender.',
        recommendations: 'Utilizá una pared o soporte para equilibrarte y evitá desvíos laterales del tobillo.',
        level: 'Intermedio',
        objective: 'Simetría de tobillo y gemelo',
        rest: 45,
        default_sets: 3,
        default_reps: '12-15 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'pantorrillas-5',
        name: 'Elevación de talones en escalón',
        category: 'pantorrillas',
        muscle_group: 'pantorrillas',
        primary_muscle: 'Pantorrillas completas',
        execution: 'Con el antepié sobre un escalón estable, elevá los talones y descendé por debajo del nivel del apoyo si tu movilidad lo permite.',
        breathing: 'Espirá al subir e inspirá al estirar abajo.',
        recommendations: 'Sujetate para mantener el equilibrio y aumentá el recorrido gradualmente, sin rebotes.',
        level: 'Principiante',
        objective: 'Movilidad de tobillo y fuerza',
        rest: 45,
        default_sets: 3,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 10. ABDOMINALES & CORE (10 Ejercicios)
    // -------------------------------------------------------------------------
    {
        id: 'core-1',
        name: 'Crunch abdominal con control',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Recto abdominal',
        execution: 'Acostado boca arriba con las rodillas flexionadas, elevá ligeramente los hombros acercando las costillas a la pelvis.',
        breathing: 'Espirá al subir vaciando el aire e inspirá al bajar.',
        recommendations: 'Evitá tirar del cuello con las manos y usá un recorrido controlado, sin impulso.',
        level: 'Principiante',
        objective: 'Flexión de tronco',
        rest: 45,
        default_sets: 3,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-2',
        name: 'Crunch inverso',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Región inferior del recto abdominal',
        execution: 'Desde la posición acostada, llevá las rodillas hacia el torso elevando suavemente la pelvis del suelo.',
        breathing: 'Espirá al elevar pelvis e inspirá al descender.',
        recommendations: 'Evitá balancear las piernas. Priorizá el movimiento de la pelvis y la contracción abdominal.',
        level: 'Intermedio',
        objective: 'Control pélvico',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-3',
        name: 'Plancha frontal',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Core global y transverso abdominal',
        execution: 'Apoyá antebrazos y puntas de los pies, manteniendo el cuerpo alineado como una tabla sólida.',
        breathing: 'Respiración diafragmática continua sin apnea.',
        recommendations: 'Contraé abdomen y glúteos, respirando normalmente. Terminá la serie antes de que caiga la cadera.',
        level: 'Adaptable',
        objective: 'Anti-extensión lumbar',
        rest: 60,
        default_sets: 3,
        default_reps: '30-45 seg',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-4',
        name: 'Dead bug con control lumbar',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Transverso abdominal y estabilizadores profundos',
        execution: 'Boca arriba con brazos elevados y caderas a 90°, extendé un brazo y la pierna contraria rozando el suelo; alterná.',
        breathing: 'Espirá al extender e inspirá al regresar al centro.',
        recommendations: 'Mantené la espalda baja en contacto continuo con el suelo, sin arquear la zona lumbar.',
        level: 'Principiante a intermedio',
        objective: 'Estabilidad lumbopélvica',
        rest: 60,
        default_sets: 3,
        default_reps: '8 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-5',
        name: 'Plancha lateral',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Oblicuos y cuadrado lumbar',
        execution: 'Apoyá un antebrazo y el lateral del pie, elevando la pelvis para mantener el cuerpo en línea recta.',
        breathing: 'Respiración rítmica y tranquila.',
        recommendations: 'Si resulta difícil, apoyá las rodillas. Evitá que la cadera caiga hacia el suelo.',
        level: 'Intermedio',
        objective: 'Anti-flexión lateral',
        rest: 45,
        default_sets: 3,
        default_reps: '25-30 seg por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-6',
        name: 'Pallof press en polea',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Oblicuos y transverso (anti-rotación)',
        execution: 'Colocate de costado a la polea, sostené el agarre frente al pecho y extendé los brazos resistiendo el giro.',
        breathing: 'Espirá al extender brazos e inspirá al flexionarlos.',
        recommendations: 'Usá una carga que permita mantener la pelvis y el tronco estables sin rotar.',
        level: 'Intermedio',
        objective: 'Anti-rotación funcional',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-7',
        name: 'Ab wheel rollout (Rueda abdominal)',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Core anterior y dorsal ancho',
        execution: 'De rodillas, desplazá la rueda hacia adelante extendiendo el cuerpo y regresá manteniendo el control abdominal.',
        breathing: 'Inspirá al rodar al frente y espirá al regresar.',
        recommendations: 'Comenzá con recorrido corto. No permitas que la zona lumbar se hunda ni que las costillas se abran excesivamente.',
        level: 'Avanzado',
        objective: 'Fuerza extrema de anti-extensión',
        rest: 75,
        default_sets: 3,
        default_reps: '8-10',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-8',
        name: 'Elevación de rodillas en silla romana',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Flexores de cadera y abdomen inferior',
        execution: 'Apoyado en la silla romana, elevá las rodillas hacia el torso y descendé lentamente.',
        breathing: 'Espirá al elevar e inspirá al bajar.',
        recommendations: 'Evitá balancearte. A medida que progreses, podés aumentar el control y el recorrido.',
        level: 'Intermedio',
        objective: 'Fuerza abdominal suspendida',
        rest: 60,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-9',
        name: 'Bird dog dinámico',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Multífidos, erectores y glúteo',
        execution: 'En cuatro apoyos, extendé un brazo y la pierna contraria sin perder la alineación; alterná lados.',
        breathing: 'Espirá al extender e inspirá al apoyar.',
        recommendations: 'Evitá rotar la pelvis o elevar la pierna más allá de lo que permita mantener el tronco estable.',
        level: 'Principiante',
        objective: 'Salud lumbar y estabilidad cruzada',
        rest: 45,
        default_sets: 3,
        default_reps: '8 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'core-10',
        name: 'Woodchop en polea',
        category: 'core',
        muscle_group: 'core',
        primary_muscle: 'Oblicuos y cadenas rotacionales',
        execution: 'De pie con polea alta, llevá el agarre en diagonal hacia abajo y a través del cuerpo con movimiento coordinado.',
        breathing: 'Espirá durante la rotación e inspirá al regresar.',
        recommendations: 'Usá una carga moderada y controlá la rotación desde el tronco y las caderas, sin tirones.',
        level: 'Intermedio',
        objective: 'Potencia rotacional',
        rest: 60,
        default_sets: 3,
        default_reps: '10 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 11. ENTRADA EN CALOR, MOVILIDAD & CARDIO
    // -------------------------------------------------------------------------
    {
        id: 'mov-1',
        name: 'Movilidad de tobillo contra la pared',
        category: 'movilidad',
        muscle_group: 'movilidad',
        primary_muscle: 'Articulación del tobillo (dorsiflexión)',
        execution: 'Llevá la rodilla hacia la pared sin despegar el talón del suelo.',
        breathing: 'Respiración pausada.',
        recommendations: 'Preparación para sentadillas y zancadas. No fuerces si aparece dolor articular.',
        level: 'Todos',
        objective: 'Dorsiflexión y prevención',
        rest: 30,
        default_sets: 2,
        default_reps: '10 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'mov-2',
        name: 'Rotación torácica en cuatro apoyos (Open Book)',
        category: 'movilidad',
        muscle_group: 'movilidad',
        primary_muscle: 'Columna torácica y hombros',
        execution: 'Colocá una mano en la nuca y rotá el torso abriendo el codo hacia el techo; regresá controladamente.',
        breathing: 'Inspirá al abrir y espirá al regresar.',
        recommendations: 'Preparación para ejercicios de tren superior y presses.',
        level: 'Todos',
        objective: 'Apertura torácica',
        rest: 30,
        default_sets: 2,
        default_reps: '8 por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'mov-3',
        name: 'Rotaciones de cadera 90/90',
        category: 'movilidad',
        muscle_group: 'movilidad',
        primary_muscle: 'Cadera (rotación interna y externa)',
        execution: 'Sentado con ambas rodillas a 90 grados, cambiá de lado llevando las piernas de una posición a la otra de manera suave.',
        breathing: 'Respiración fluida.',
        recommendations: 'Adaptar el recorrido a la movilidad individual sin forzar las rodillas.',
        level: 'Todos',
        objective: 'Salud de cadera',
        rest: 30,
        default_sets: 2,
        default_reps: '6-8 cambios',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'mov-4',
        name: 'Cat-Cow (Gato-Vaca) vertebral',
        category: 'movilidad',
        muscle_group: 'movilidad',
        primary_muscle: 'Columna vertebral completa',
        execution: 'En cuatro apoyos, alterná suavemente entre redondear la espalda hacia el techo y extenderla mirando al frente.',
        breathing: 'Inspirá al extender columna y espirá al redondear.',
        recommendations: 'Movimientos suaves coordinados con el ritmo de respiración.',
        level: 'Todos',
        objective: 'Descompresión espinal',
        rest: 30,
        default_sets: 2,
        default_reps: '8-10 ciclos',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'mov-5',
        name: 'Deslizamientos de brazos en pared (Wall Slides)',
        category: 'movilidad',
        muscle_group: 'movilidad',
        primary_muscle: 'Serrato anterior y manguito rotador',
        execution: 'Apoyá los antebrazos en la pared y deslizalos hacia arriba y abajo manteniendo el contacto y el control escapular.',
        breathing: 'Respiración pausada.',
        recommendations: 'No fuerces la elevación si sentís dolor de hombros.',
        level: 'Todos',
        objective: 'Salud escapulohumeral',
        rest: 30,
        default_sets: 2,
        default_reps: '10 repeticiones',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-1',
        name: 'Remo ergométrico por intervalos',
        category: 'cardio',
        muscle_group: 'cardio',
        primary_muscle: 'Cardiovascular y cuerpo completo',
        execution: 'Empujá primero con las piernas, acompañá con el tronco y terminá llevando el mango hacia el esternón.',
        breathing: 'Espirá en el tirón e inspirá en el retorno.',
        recommendations: 'Aprendé la cadencia técnica antes de buscar potencia máxima.',
        level: 'Intermedio',
        objective: 'Capacidad aeróbica y resistencia',
        rest: 60,
        default_sets: 4,
        default_reps: '500 metros',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-2',
        name: 'Caminata del granjero (Farmer’s walk)',
        category: 'core',
        muscle_group: 'antebrazos',
        primary_muscle: 'Agarre, trapecios y estabilidad del core',
        execution: 'Caminá sosteniendo una mancuerna pesada en cada mano con el pecho abierto y hombros estables.',
        breathing: 'Respiración rítmica diafragmática.',
        recommendations: 'Mantené el tronco perfectamente erguido y una marcha controlada.',
        level: 'Intermedio',
        objective: 'Fuerza de agarre y postura',
        rest: 75,
        default_sets: 3,
        default_reps: '40 metros',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-3',
        name: 'Balanceo con kettlebell (Kettlebell Swing)',
        category: 'piernas',
        muscle_group: 'gluteos',
        primary_muscle: 'Glúteos, isquiotibiales y potencia de cadera',
        execution: 'Impulsá la pesa mediante una potente bisagra de cadera y dejá que oscile hasta la altura del pecho.',
        breathing: 'Inspirá al bajar la pesa y espirá fuerte al extender cadera.',
        recommendations: 'No levantes la pesa con los brazos ni hiperextiendas la espalda.',
        level: 'Intermedio',
        objective: 'Potencia metabólica',
        rest: 60,
        default_sets: 4,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    // -------------------------------------------------------------------------
    // 12. YOGA (8 Ejercicios Asanas & Flow con Nico)
    // -------------------------------------------------------------------------
    {
        id: 'yoga-1',
        name: 'Saludo al Sol A (Surya Namaskar A)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Cuerpo completo, flexibilidad y respiración coordinada',
        execution: 'Secuencia fluida de Tadasana, Urdhva Hastasana, Uttanasana, Chaturanga Dandasana, Urdhva Mukha Svanasana y Adho Mukha Svanasana.',
        breathing: 'Inhalación en extensiones, exhalación en flexiones hacia adelante.',
        recommendations: 'Priorizá la alineación de la columna antes de profundizar en la amplitud.',
        level: 'Todos los niveles',
        objective: 'Calentamiento dinámico y conciencia corporal',
        rest: 30,
        default_sets: 3,
        default_reps: '5 ciclos',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-2',
        name: 'Guerrero II (Virabhadrasana II)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Cuádriceps, glúteos, deltoides y apertura pélvica',
        execution: 'Pies separados ampliamente, rodilla delantera flexionada a 90° alineada con el segundo dedo del pie, brazos extendidos paralelos al suelo y mirada fija sobre la mano delantera.',
        breathing: 'Respiración Ujjayi suave y sostenida.',
        recommendations: 'No dejes que la rodilla colapse hacia adentro; activá los glúteos.',
        level: 'Principiante / Intermedio',
        objective: 'Fuerza isométrica y apertura de caderas',
        rest: 45,
        default_sets: 3,
        default_reps: '45 seg por lado',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-3',
        name: 'Perro Boca Abajo (Adho Mukha Svanasana)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Cadena posterior, hombros y descompresión axial',
        execution: 'En posición de V invertida, empujá el suelo con las palmas activas, isquiones hacia el cielo y talones descendiendo hacia el mat.',
        breathing: 'Respiraciones profundas sintiendo el espacio intervertebral.',
        recommendations: 'Si hay tensión en isquiotibiales, flexioná ligeramente las rodillas para cuidar las lumbares.',
        level: 'Todos los niveles',
        objective: 'Elongación de cadena posterior y descompresión',
        rest: 30,
        default_sets: 3,
        default_reps: '60 segundos',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-4',
        name: 'Postura de la Cobra (Bhujangasana)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Erectores espinales, glúteos y apertura de pecho',
        execution: 'Boca abajo con manos debajo de hombros, elevá el pecho contrayendo la espalda media sin presionar en exceso con las manos.',
        breathing: 'Inhalá al abrir el pecho, sostené la longitud cervical.',
        recommendations: 'Mantené los hombros lejos de las orejas y el pubis pegado al suelo.',
        level: 'Principiante',
        objective: 'Extensión espinal y alivio postural',
        rest: 30,
        default_sets: 3,
        default_reps: '10 respiraciones',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-5',
        name: 'Postura del Niño (Balasana)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Flexores de cadera, lumbares y relajación parasimpática',
        execution: 'Rodillas abiertas al ancho del mat, glúteos a los talones, brazos extendidos al frente y frente descansando en el suelo.',
        breathing: 'Respiración diafragmática profunda hacia la espalda baja.',
        recommendations: 'Postura de restauración ideal entre bloques de alta intensidad.',
        level: 'Todos los niveles',
        objective: 'Recuperación parasimpática y relax lumbar',
        rest: 30,
        default_sets: 2,
        default_reps: '90 segundos',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-6',
        name: 'Torsión Espinal Suave en Suelo (Supta Matsyendrasana)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Columna torácica, glúteos y oblicuos',
        execution: 'Acostado boca arriba, flexioná una rodilla y cruzala sobre el cuerpo mientras mantenés ambos hombros apoyados en el suelo.',
        breathing: 'Inhalá elongando la columna, exhalá profundizando la rotación.',
        recommendations: 'No fuerces el cuello, mantené la mirada hacia el lado opuesto a la rodilla.',
        level: 'Principiante',
        objective: 'Movilidad rotacional y salud intervertebral',
        rest: 30,
        default_sets: 2,
        default_reps: '45 seg por lado',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-7',
        name: 'Postura del Árbol (Vrksasana)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Estabilizadores de tobillo, glúteo medio y core',
        execution: 'De pie, apoyá la planta de un pie en la cara interna del muslo o pantorrilla opuesta (nunca en la rodilla). Manos al centro del pecho o arriba.',
        breathing: 'Respiración calmada fijando un punto visual (Drishti).',
        recommendations: 'Presioná activamente el pie contra el muslo y el muslo contra el pie.',
        level: 'Intermedio',
        objective: 'Equilibrio, propiocepción y concentración',
        rest: 30,
        default_sets: 3,
        default_reps: '40 seg por lado',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'yoga-8',
        name: 'Puente Dinámico en Yoga (Setu Bandhasana Flow)',
        exercise_type: 'yoga',
        category: 'yoga',
        muscle_group: 'yoga',
        primary_muscle: 'Glúteos, isquiotibiales y apertura de cuádriceps',
        execution: 'Boca arriba, pies al ancho de caderas, elevá la pelvis vértebra por vértebra coordinando con la respiración y descendé con control.',
        breathing: 'Inhalá elevando la cadera, exhalá al descender.',
        recommendations: 'No abras las rodillas hacia afuera; mantené los pies paralelos.',
        donts: 'Evitá empujar desde el cuello o hiperextender bruscamente la columna lumbar.',
        level: 'Principiante',
        objective: 'Movilidad articular de columna y activación posterior',
        rest: 30,
        default_sets: 3,
        default_reps: '12 repeticiones',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 13. ZONA LUMBAR (Erectores Espinales & Cadena Posterior Baja)
    // -------------------------------------------------------------------------
    {
        id: 'lumbar-1',
        name: 'Extensiones lumbares en banco a 45° (Hiperextensiones)',
        exercise_type: 'muscular',
        category: 'zona_lumbar',
        muscle_group: 'zona_lumbar',
        primary_muscle: 'Erectores espinales y multífidos lumbares',
        execution: 'Apoyá los muslos en el almohadón dejando libre la articulación de la cadera. Descendé el torso manteniendo columna neutra y subí hasta alinear tronco y piernas.',
        breathing: 'Inspirá al descender con control y espirá al alinear el tronco.',
        recommendations: 'Frená exactamente en la línea recta del cuerpo con pausa isométrica de 1 segundo.',
        donts: 'No hiperextiendas la columna hacia atrás pasando la línea neutra ni des tirones bruscos con inercia.',
        level: 'Principiante a intermedio',
        objective: 'Fortalecimiento lumbar y blindaje postural',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'lumbar-2',
        name: 'Extensión lumbar McGill / Superman alternado en suelo',
        exercise_type: 'muscular',
        category: 'zona_lumbar',
        muscle_group: 'zona_lumbar',
        primary_muscle: 'Cuadrado lumbar, multífidos y glúteo mayor',
        execution: 'Acostado boca abajo, elevá suavemente brazo derecho y pierna izquierda apenas unos centímetros del suelo buscando longitud axial, no altura excesiva.',
        breathing: 'Exhalá al extender e inhalá al apoyar sin perder tensión abdominal.',
        recommendations: 'Mantené la mirada hacia el mat para conservar la columna cervical neutra.',
        donts: 'No levantes excesivamente el mentón ni arquees la cintura de forma dolorosa.',
        level: 'Principiante',
        objective: 'Estabilidad lumbar y prevención de lumbalgia',
        rest: 45,
        default_sets: 3,
        default_reps: '10 por lado',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },
    {
        id: 'lumbar-3',
        name: 'Buenos días isométrico-dinámico con mancuerna al pecho',
        exercise_type: 'muscular',
        category: 'zona_lumbar',
        muscle_group: 'zona_lumbar',
        primary_muscle: 'Erectores espinales, zona lumbar e isquios',
        execution: 'Sostené una mancuerna pegada al esternón, destrabá rodillas 15 grados e incliná el torso hacia adelante con espalda recta hasta sentir tensión controlada.',
        breathing: 'Inhalá antes de bajar haciendo bracing abdominal y exhalá al volver.',
        recommendations: 'Ideal para educar la resistencia isométrica de la espalda baja sin carga sobre cervicales.',
        donts: 'Nunca redondees la espalda baja al final del recorrido.',
        level: 'Intermedio',
        objective: 'Fuerza postural de espalda baja',
        rest: 75,
        default_sets: 3,
        default_reps: '10-12',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 14. ANTEBRAZOS & FUERZA DE AGARRE
    // -------------------------------------------------------------------------
    {
        id: 'antebrazos-1',
        name: 'Curl de muñeca en banco con mancuernas (Flexores)',
        exercise_type: 'muscular',
        category: 'antebrazos',
        muscle_group: 'antebrazos',
        primary_muscle: 'Flexores del carpo y antebrazo anterior',
        execution: 'Apoyá los antebrazos sobre un banco o tus muslos con las palmas hacia arriba y las muñecas libres en el borde. Bajá las mancuernas y flexioná las muñecas hacia arriba.',
        breathing: 'Inhalá al extender la muñeca y exhalá al contraer hacia arriba.',
        recommendations: 'Realizá una pausa de 1 segundo en máxima contracción.',
        donts: 'No despegues los antebrazos del banco ni uses cargas que generen pinchazo articular.',
        level: 'Principiante a intermedio',
        objective: 'Fuerza de agarre e hipertrofia de antebrazo',
        rest: 45,
        default_sets: 3,
        default_reps: '15-20',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'antebrazos-2',
        name: 'Curl inverso con barra Z o mancuernas (Braquiorradial)',
        exercise_type: 'muscular',
        category: 'antebrazos',
        muscle_group: 'antebrazos',
        primary_muscle: 'Braquiorradial y extensores de antebrazo',
        execution: 'De pie con agarre prono (palmas hacia abajo), flexioná los codos manteniendo las muñecas firmes y alineadas con el antebrazo.',
        breathing: 'Exhalá al subir la barra e inhalá descendiendo en 3 segundos.',
        recommendations: 'Clavá los codos a los costados del torso para aislar el braquiorradial.',
        donts: 'Evitá doblar las muñecas hacia abajo o balancear la espalda para subir el peso.',
        level: 'Intermedio',
        objective: 'Desarrollo de antebrazos y prevención de epicondilitis',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'antebrazos-3',
        name: 'Suspensión activa en barra (Dead Hang Escapular)',
        exercise_type: 'muscular',
        category: 'antebrazos',
        muscle_group: 'antebrazos',
        primary_muscle: 'Flexores profundos de los dedos, antebrazos y descompresión',
        execution: 'Colgate de la barra fija cerrando el pulgar alrededor de la barra con hombros ligeramente activos lejos de las orejas.',
        breathing: 'Respiración nasal lenta y profunda.',
        recommendations: 'Excelente indicador de longevidad, fuerza de agarre y salud de hombros.',
        donts: 'No te sueltes de golpe al terminar la serie ni cuelgues con dolor agudo de hombro.',
        level: 'Todos los niveles',
        objective: 'Resistencia de agarre y descompresión axial',
        rest: 60,
        default_sets: 3,
        default_reps: '30-45 seg',
        video_url: 'vid/pilar-3-movilidad.mp4'
    },

    // -------------------------------------------------------------------------
    // 15. ESPECÍFICOS DE SUB-GRUPOS DE PIERNAS (Abductores & Sóleo) Y CARDIO
    // -------------------------------------------------------------------------
    {
        id: 'abductores-1',
        name: 'Caminata lateral con banda elástica (Monster Walk)',
        exercise_type: 'muscular',
        category: 'piernas',
        muscle_group: 'piernas',
        sub_muscle: 'abductores',
        primary_muscle: 'Abductores de cadera y glúteo medio',
        execution: 'Colocá una mini-banda por encima de las rodillas o en tobillos, adoptá media sentadilla atlética y desplazate lateralmente manteniendo tensión constante.',
        breathing: 'Respiración continua y controlada.',
        recommendations: 'Mantené las puntas de los pies mirando al frente sin juntar del todo los pies.',
        donts: 'No arrastres los pies ni inclines el tronco de lado a lado al dar el paso.',
        level: 'Principiante a intermedio',
        objective: 'Estabilidad pélvica y tonificación de abductores',
        rest: 45,
        default_sets: 3,
        default_reps: '15 pasos por lado',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'abductores-2',
        name: 'Abducción de cadera de pie en polea baja',
        exercise_type: 'muscular',
        category: 'piernas',
        muscle_group: 'piernas',
        sub_muscle: 'abductores',
        primary_muscle: 'Tensor de la fascia lata, glúteo medio y menor (abductores)',
        execution: 'Con tobillera en la pierna externa a la polea, separá la pierna lateralmente unos 35-45 grados manteniendo la pelvis nivelada.',
        breathing: 'Exhalá al separar la pierna e inhalá al volver.',
        recommendations: 'Guiá el movimiento con el talón ligeramente rotado hacia afuera.',
        donts: 'No inclines el torso para levantar más peso.',
        level: 'Intermedio',
        objective: 'Aislamiento analítico de abductores',
        rest: 60,
        default_sets: 3,
        default_reps: '12-15 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'soleo-1',
        name: 'Elevación de talón sentado unilateral con mancuerna (Sóleo)',
        exercise_type: 'muscular',
        category: 'piernas',
        muscle_group: 'piernas',
        sub_muscle: 'soleo',
        primary_muscle: 'Sóleo profundo y estabilizadores del tobillo',
        execution: 'Sentado en banco con el antepié sobre un disco o escalón y una mancuerna apoyada sobre la rodilla a 90°, elevá el talón al máximo y bajá en 3 segundos.',
        breathing: 'Exhalá en la contracción superior e inhalá en el estiramiento.',
        recommendations: 'Al estar la rodilla flexionada a 90° se inhibe el gemelo y trabaja casi exclusivamente el sóleo.',
        donts: 'No hagas rebotes cortos en la mitad del recorrido; buscá rango completo.',
        level: 'Todos los niveles',
        objective: 'Fortalecimiento del sóleo y protección del tendón de Aquiles',
        rest: 45,
        default_sets: 3,
        default_reps: '15-20 por pierna',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-4',
        name: 'Bicicleta fija / Air Bike en Zona 2 o Intervalos HIIT',
        exercise_type: 'cardio',
        category: 'cardio',
        muscle_group: 'cardio',
        primary_muscle: 'Sistema cardiorrespiratorio y tren inferior sin impacto articular',
        execution: 'Ajustá el asiento a la altura de tu cadera. Pedaleá con cadencia constante de 80-90 RPM (Zona 2) o alterná sprints de 20s con 40s suaves.',
        breathing: 'Respiración rítmica nasal en Zona 2 o bucal-nasal en intervalos.',
        recommendations: 'Excelente opción de oxidación de grasas y salud mitocondrial con cero impacto en rodillas.',
        donts: 'No configures el asiento tan bajo que las rodillas sufran flexión excesiva ni tan alto que se balancee la pelvis.',
        level: 'Todos los niveles',
        objective: 'Salud cardiovascular y gasto calórico',
        rest: 45,
        default_sets: 4,
        default_reps: '3 a 5 minutos',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-5',
        name: 'Caminata en cinta con inclinación (Incline Treadmill Zona 2)',
        exercise_type: 'cardio',
        category: 'cardio',
        muscle_group: 'cardio',
        primary_muscle: 'Capacidad aeróbica, glúteos y pantorrillas',
        execution: 'Configurá la cinta con inclinación del 6% al 12% y velocidad de marcha firme (4.5 a 5.5 km/h) sin sujetarte de las barandas.',
        breathing: 'Respiración controlada que permita hablar frases cortas (Zona 2).',
        recommendations: 'No te cuelgues de los pasamanos: si te agarrás, reducís hasta un 30% el gasto calórico real.',
        donts: 'Evitá sujetarte del frente de la máquina e inclinar el cuerpo hacia atrás.',
        level: 'Todos los niveles',
        objective: 'Oxidación de grasas sin fatiga del sistema nervioso',
        rest: 30,
        default_sets: 1,
        default_reps: '15-25 min',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    },
    {
        id: 'cardio-6',
        name: 'Saltos a la soga rítmicos (Jump Rope Coordinativo)',
        exercise_type: 'cardio',
        category: 'cardio',
        muscle_group: 'cardio',
        primary_muscle: 'Sistema cardiovascular, reactividad de tobillo, gemelos y sóleo',
        execution: 'Con codos cerca de las costillas, girá la soga desde las muñecas y saltá apenas 2-3 cm del suelo sobre el metatarso.',
        breathing: 'Respiración rítmica acompasada con los saltos.',
        recommendations: 'Aterrizá suave sobre la punta de los pies sin golpear los talones.',
        donts: 'No flexiones las rodillas llevando los talones a la cola ni abras los brazos.',
        level: 'Intermedio',
        objective: 'Coordinación, agilidad y alto gasto calórico',
        rest: 45,
        default_sets: 4,
        default_reps: '60 segundos',
        video_url: 'vid/pilar-2-vitalidad.mp4'
    }
];

// =============================================================================
// ÁRBOL TAXONÓMICO OFICIAL SENS DE 3 NIVELES (Arquitectura /sr-director-it-wellness)
// Nivel 1: Tipo (Muscular, Cardio, Yoga, Movilidad)
// Nivel 2: Grupo Muscular dentro de Muscular (Piernas, Bíceps, Tríceps, Pecho, Espalda, Abdominales, Hombros, Zona Lumbar, Antebrazos)
// Nivel 3: Sub-músculo dentro de Piernas (Cuádriceps, Isquios, Abductores, Glúteos, Gemelos, Sóleo)
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
 * Clasificador Taxonómico de 3 Niveles para cualquier ejercicio de la plataforma
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

    let idLower = (ex.id || '').toLowerCase();
    let cat = (ex.category || '').toLowerCase();
    let mg = (ex.muscle_group || '').toLowerCase();
    let subExplicit = (ex.sub_muscle || '').toLowerCase();
    let exTypeExplicit = (ex.exercise_type || '').toLowerCase();
    const nameLower = (ex.name || '').toLowerCase();
    const primaryLower = (ex.primary_muscle || '').toLowerCase();

    // Si faltan metadatos, intentar encontrar en SENS_EXERCISE_LIBRARY
    if ((!cat && !mg && !exTypeExplicit) && typeof SENS_EXERCISE_LIBRARY !== 'undefined') {
        const found = SENS_EXERCISE_LIBRARY.find(item => item.id === ex.id || item.name.toLowerCase() === nameLower);
        if (found) {
            idLower = (found.id || '').toLowerCase();
            cat = (found.category || '').toLowerCase();
            mg = (found.muscle_group || '').toLowerCase();
            subExplicit = (found.sub_muscle || '').toLowerCase();
            exTypeExplicit = (found.exercise_type || '').toLowerCase();
        }
    }

    // NIVEL 1: Tipo de Entrenamiento (muscular, cardio, yoga, movilidad)
    let type = 'muscular';
    let typeLabel = 'Muscular';

    if (exTypeExplicit === 'yoga' || cat === 'yoga' || mg === 'yoga' || idLower.startsWith('yoga-') || nameLower.includes('yoga') || nameLower.includes('saludo al sol') || nameLower.includes('asana') || nameLower.includes('balasana') || nameLower.includes('virabhadrasana')) {
        type = 'yoga';
        typeLabel = 'Yoga';
    } else if (exTypeExplicit === 'cardio' || cat === 'cardio' || mg === 'cardio' || idLower === 'cardio-1' || idLower === 'cardio-4' || idLower === 'cardio-5' || idLower === 'cardio-6' || nameLower.includes('ergométrico') || nameLower.includes('bicicleta') || nameLower.includes('cinta') || nameLower.includes('soga') || nameLower.includes('zona 2')) {
        type = 'cardio';
        typeLabel = 'Cardio';
    } else if (exTypeExplicit === 'movilidad' || cat === 'movilidad' || mg === 'movilidad' || idLower.startsWith('mov-') || nameLower.includes('movilidad') || nameLower.includes('rotación torácica') || nameLower.includes('90/90') || nameLower.includes('gato-vaca') || nameLower.includes('cat-cow') || nameLower.includes('wall slides')) {
        type = 'movilidad';
        typeLabel = 'Movilidad';
    }

    // NIVEL 2: Grupo Muscular dentro de Muscular
    // Opciones: piernas, biceps, triceps, pecho, espalda, abdominales, hombros, zona_lumbar, antebrazos
    let muscleGroup = 'piernas';
    let muscleLabel = 'Piernas';

    if (cat === 'zona_lumbar' || mg === 'zona_lumbar' || idLower.startsWith('lumbar-') || nameLower.includes('hiperextension') || nameLower.includes('extensión lumbar') || nameLower.includes('extensiones lumbares') || nameLower.includes('superman')) {
        muscleGroup = 'zona_lumbar';
        muscleLabel = 'Zona Lumbar';
    } else if (cat === 'antebrazos' || mg === 'antebrazos' || idLower.startsWith('antebrazos-') || idLower === 'cardio-2' || nameLower.includes('muñeca') || nameLower.includes('granjero') || nameLower.includes('farmer') || nameLower.includes('curl inverso') || nameLower.includes('dead hang')) {
        muscleGroup = 'antebrazos';
        muscleLabel = 'Antebrazos';
    } else if (cat === 'hombros' || mg === 'hombros' || idLower.startsWith('hombros-') || nameLower.includes('militar') || nameLower.includes('elevaciones laterales') || nameLower.includes('elevaciones frontales') || nameLower.includes('pájaros') || nameLower.includes('deltoides') || nameLower.includes('face pull') || nameLower.includes('arnold')) {
        muscleGroup = 'hombros';
        muscleLabel = 'Hombros';
    } else if (cat === 'biceps' || mg === 'biceps' || idLower.startsWith('biceps-') || (nameLower.includes('curl') && !nameLower.includes('femoral') && !nameLower.includes('nórdico') && !nameLower.includes('muñeca') && !nameLower.includes('inverso')) || nameLower.includes('bíceps') || nameLower.includes('biceps') || nameLower.includes('martillo') || nameLower.includes('predicador')) {
        muscleGroup = 'biceps';
        muscleLabel = 'Bíceps';
    } else if (cat === 'triceps' || mg === 'triceps' || idLower.startsWith('triceps-') || nameLower.includes('tríceps') || nameLower.includes('triceps') || nameLower.includes('francés') || nameLower.includes('copa') || nameLower.includes('patada de tríceps')) {
        muscleGroup = 'triceps';
        muscleLabel = 'Tríceps';
    } else if (cat === 'pecho' || mg === 'pecho' || mg === 'push' || idLower.startsWith('pecho-') || nameLower.includes('banca') || nameLower.includes('pecho') || nameLower.includes('aperturas') || nameLower.includes('flexiones') || nameLower.includes('push-up') || nameLower.includes('crossover') || nameLower.includes('fondos')) {
        muscleGroup = 'pecho';
        muscleLabel = 'Pecho';
    } else if (cat === 'espalda' || mg === 'espalda' || mg === 'pull' || idLower.startsWith('espalda-') || nameLower.includes('remo') || nameLower.includes('jalón') || nameLower.includes('dominada') || nameLower.includes('pullover') || nameLower.includes('dorsal')) {
        muscleGroup = 'espalda';
        muscleLabel = 'Espalda';
    } else if (cat === 'core' || cat === 'abdominales' || mg === 'core' || mg === 'abdominales' || mg === 'core_mobility' || idLower.startsWith('core-') || nameLower.includes('crunch') || nameLower.includes('plancha') || nameLower.includes('dead bug') || nameLower.includes('deadbug') || nameLower.includes('pallof') || nameLower.includes('ab wheel') || nameLower.includes('rueda abdominal') || nameLower.includes('silla romana') || nameLower.includes('bird dog') || nameLower.includes('woodchop') || nameLower.includes('hollow')) {
        muscleGroup = 'abdominales';
        muscleLabel = 'Abdominales';
    } else {
        muscleGroup = 'piernas';
        muscleLabel = 'Piernas';
    }

    // NIVEL 3: Sub-músculo dentro de Piernas (cuadriceps, isquios, abductores, gluteos, gemelos, soleo)
    let subMuscle = null;
    let subMuscleLabel = null;

    if (muscleGroup === 'piernas') {
        if (subExplicit === 'abductores' || idLower.startsWith('abductores-') || idLower === 'gluteos-5' || idLower === 'gluteos-6' || nameLower.includes('abducción') || nameLower.includes('abduccion') || nameLower.includes('monster walk') || nameLower.includes('abductor')) {
            subMuscle = 'abductores';
            subMuscleLabel = 'Abductores';
        } else if (subExplicit === 'soleo' || idLower.startsWith('soleo-') || idLower === 'pantorrillas-2' || primaryLower.includes('sóleo') || primaryLower.includes('soleo') || (nameLower.includes('talones') && nameLower.includes('sentado'))) {
            subMuscle = 'soleo';
            subMuscleLabel = 'Sóleo';
        } else if (subExplicit === 'gemelos' || cat === 'pantorrillas' || mg === 'pantorrillas' || idLower.startsWith('pantorrillas-') || nameLower.includes('talones') || nameLower.includes('talón') || nameLower.includes('gemelos') || nameLower.includes('pantorrilla')) {
            subMuscle = 'gemelos';
            subMuscleLabel = 'Gemelos';
        } else if (subExplicit === 'gluteos' || cat === 'gluteos' || mg === 'gluteos' || idLower.startsWith('gluteos-') || idLower === 'cardio-3' || nameLower.includes('hip thrust') || nameLower.includes('puente de glúteo') || nameLower.includes('patada de glúteo') || nameLower.includes('zancadas hacia atrás') || nameLower.includes('banco romano') || nameLower.includes('swing')) {
            subMuscle = 'gluteos';
            subMuscleLabel = 'Glúteos';
        } else if (subExplicit === 'isquios' || mg === 'isquiotibiales' || mg === 'hamstrings_glutes' || idLower.startsWith('isquios-') || nameLower.includes('femoral') || nameLower.includes('rumano') || nameLower.includes('buenos días') || nameLower.includes('nórdico') || nameLower.includes('pull-through') || nameLower.includes('peso muerto')) {
            subMuscle = 'isquios';
            subMuscleLabel = 'Isquios';
        } else {
            subMuscle = 'cuadriceps';
            subMuscleLabel = 'Cuádriceps';
        }
    }

    return {
        type,
        typeLabel,
        muscleGroup,
        muscleLabel,
        subMuscle,
        subMuscleLabel
    };
}

/**
 * Calcula el gasto calórico estimado por repetición, por serie y total del ejercicio
 */
function calculateExerciseKcal(ex, customSets = null, customReps = null) {
    if (!ex) return { kcalPerRep: 0.65, kcalPerSet: 7.8, totalKcal: 24, met: 5.0 };
    const tax = getExerciseTaxonomy(ex);
    const nameLower = (ex.name || '').toLowerCase();

    // Determinar MET y kcal base por repetición según demanda metabólica
    let kcalPerRep = typeof ex.kcal_per_rep === 'number' ? ex.kcal_per_rep : 0.65;
    let met = 5.5;

    if (typeof ex.kcal_per_rep !== 'number') {
        if (tax.type === 'cardio') {
            kcalPerRep = 1.15;
            met = 8.5;
        } else if (tax.type === 'yoga' || tax.type === 'movilidad') {
            kcalPerRep = 0.38;
            met = 3.3;
        } else if (tax.muscleGroup === 'piernas' && (nameLower.includes('sentadilla') || nameLower.includes('peso muerto') || nameLower.includes('prensa') || nameLower.includes('hip thrust') || nameLower.includes('búlgara') || nameLower.includes('zancada'))) {
            kcalPerRep = 0.95;
            met = 7.2;
        } else if (tax.muscleGroup === 'espalda' || tax.muscleGroup === 'pecho' || tax.muscleGroup === 'piernas') {
            kcalPerRep = 0.78;
            met = 6.2;
        } else if (tax.muscleGroup === 'hombros' || tax.muscleGroup === 'zona_lumbar' || tax.muscleGroup === 'abdominales') {
            kcalPerRep = 0.58;
            met = 5.0;
        } else {
            // Bíceps, tríceps, antebrazos, gemelos, sóleo, abductores
            kcalPerRep = 0.48;
            met = 4.2;
        }
    }

    const setsNum = parseInt(customSets || ex.default_sets || ex.sets || 3, 10) || 3;
    const repsStr = String(customReps || ex.default_reps || ex.reps || '10');
    let repsNum = 10;
    const nums = repsStr.match(/\d+/g);
    if (nums && nums.length > 0) {
        if (repsStr.toLowerCase().includes('seg') || repsStr.toLowerCase().includes('metro')) {
            repsNum = Math.max(8, Math.round(parseInt(nums[0], 10) / 3.5));
        } else if (nums.length >= 2) {
            repsNum = Math.round((parseInt(nums[0], 10) + parseInt(nums[1], 10)) / 2);
        } else {
            repsNum = parseInt(nums[0], 10);
        }
    }

    const kcalPerSet = typeof ex.kcal_per_set === 'number' && !customReps
        ? ex.kcal_per_set
        : Math.round(kcalPerRep * repsNum * 10) / 10;
    const totalKcal = Math.round(kcalPerSet * setsNum);

    return {
        kcalPerRep: Math.round(kcalPerRep * 100) / 100,
        kcalPerSet,
        totalKcal,
        sets: setsNum,
        repsAvg: repsNum,
        met
    };
}

/**
 * Genera el campo 'donts' (Cómo NO hacerlo / Errores a evitar) por defecto si no fue editado
 */
function getDefaultExerciseDonts(ex) {
    if (ex && ex.donts) return ex.donts;
    const rec = (ex && ex.recommendations) || '';
    if (rec.toLowerCase().includes('evitá') || rec.toLowerCase().includes('no ')) {
        return rec;
    }
    return 'Evitá usar inercia o balanceos del torso, no sacrifiques el rango controlado por exceso de peso y no contengas la respiración en el esfuerzo.';
}

/**
 * Obtiene un ejercicio con los overrides aplicados (Base Maestra Global + Puntual del Alumno si corresponde)
 */
function getResolvedExercise(exOrId, athleteId = null) {
    let baseEx = typeof exOrId === 'string'
        ? SENS_EXERCISE_LIBRARY.find(e => e.id === exOrId || e.name === exOrId)
        : exOrId;
    if (!baseEx) return null;

    let resolved = Object.assign({}, baseEx);

    // 1. Aplicar Override Global (Base Maestra modificada por Nico para TODOS los usuarios)
    try {
        const globalRaw = localStorage.getItem('sens_global_exercise_overrides_v1');
        if (globalRaw) {
            const globalMap = JSON.parse(globalRaw);
            if (globalMap && globalMap[resolved.id]) {
                resolved = Object.assign(resolved, globalMap[resolved.id], { _hasGlobalOverride: true });
            }
        }
    } catch (e) {}

    // 2. Aplicar Override Puntual del Alumno (Solo para ese usuario)
    const targetAthId = athleteId || (window.AppState && window.AppState.currentUser && window.AppState.currentUser.id) || null;
    if (targetAthId) {
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
    const energy = calculateExerciseKcal(resolved);
    resolved.taxonomy = tax;
    resolved.donts = getDefaultExerciseDonts(resolved);
    resolved.kcal_per_rep = energy.kcalPerRep;
    resolved.kcal_per_set = energy.kcalPerSet;
    resolved.total_default_kcal = energy.totalKcal;

    return resolved;
}

// Hidratar inicialmente todos los ejercicios de SENS_EXERCISE_LIBRARY en memoria
function hydrateExerciseLibraryInMemory() {
    let globalMap = {};
    try {
        const raw = localStorage.getItem('sens_global_exercise_overrides_v1');
        if (raw) globalMap = JSON.parse(raw) || {};
    } catch (e) {}

    SENS_EXERCISE_LIBRARY.forEach(ex => {
        if (globalMap[ex.id]) {
            Object.assign(ex, globalMap[ex.id]);
        }
        const tax = getExerciseTaxonomy(ex);
        const energy = calculateExerciseKcal(ex);
        ex.exercise_type = tax.type;
        ex.muscle_group_norm = tax.muscleGroup;
        ex.sub_muscle = tax.subMuscle;
        if (!ex.donts) ex.donts = getDefaultExerciseDonts(ex);
        ex.kcal_per_rep = energy.kcalPerRep;
        ex.kcal_per_set = energy.kcalPerSet;
        ex.total_default_kcal = energy.totalKcal;
    });
}

hydrateExerciseLibraryInMemory();

if (typeof window !== 'undefined') {
    window.SENS_EXERCISE_LIBRARY = SENS_EXERCISE_LIBRARY;
    window.SENS_TRAINING_TAXONOMY_TREE = SENS_TRAINING_TAXONOMY_TREE;
    window.getExerciseTaxonomy = getExerciseTaxonomy;
    window.calculateExerciseKcal = calculateExerciseKcal;
    window.getResolvedExercise = getResolvedExercise;
    window.hydrateExerciseLibraryInMemory = hydrateExerciseLibraryInMemory;
}

