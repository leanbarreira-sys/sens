// Senior Director UX Wellness - Elite Redesign of E01-E20 (Quiet Luxury 9:16 Standard)
const redesignedE01toE20 = [
  {
    num: 1,
    id: "E01",
    name: "Fuerza Sin Ruido • Tercio Inferior",
    title: "FUERZA SIN RUIDO. DOLOR CERO.",
    html: `
      <div class="relative w-full h-full flex flex-col justify-between p-6 text-white overflow-hidden bg-carbon">
        <img class="absolute inset-0 w-full h-full object-cover brightness-[0.42] scale-100 transition-transform duration-700" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>
        
        <!-- Top Quiet Luxury Badge -->
        <div class="relative z-10 flex justify-between items-center pt-8 px-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-champagne"></span>
            <span class="text-[11px] uppercase tracking-[0.2em] font-semibold text-champagne">SENS • BIOMECÁNICA</span>
          </div>
          <span class="text-[10px] uppercase tracking-widest text-white/60 font-mono">PROTOCOLO AXIAL</span>
        </div>

        <!-- Hero Monolith Content -->
        <div class="relative z-10 bg-carbon/90 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md pb-6 shadow-2xl mb-8">
          <span class="text-[10px] uppercase tracking-[0.22em] font-bold text-champagne block mb-2">Descompresión & Rendimiento</span>
          <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight">
            FUERZA <span class="text-champagne">SIN RUIDO.</span><br/>DOLOR CERO.
          </h2>
          <p class="text-sm text-neutral-300 mt-2.5 leading-relaxed font-normal">
            Tres sesiones semanales de precisión neuromuscular superan años de sobreentrenamiento caótico.
          </p>
          <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Nico Coach Somático</span>
            <span class="text-champagne font-semibold font-mono">3 CUPOS DISPONIBLES</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 2,
    id: "E02",
    name: "Editorial Suizo • Split Asimétrico",
    title: "El silencio neuromuscular de la cadera activa",
    html: `
      <div class="w-full h-full flex flex-col bg-alabastro relative overflow-hidden">
        <div class="h-[50%] relative overflow-hidden">
          <img class="w-full h-full object-cover" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1080&q=80" alt="visual"/>
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div class="absolute top-8 left-6 bg-carbon/90 text-champagne text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-champagne/20">
            SENS ARCHIVE
          </div>
        </div>
        <div class="h-[50%] bg-alabastro p-7 flex flex-col justify-between border-t border-neutral-300">
          <div>
            <p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-500 mb-2">Biomecánica & Longevidad</p>
            <h2 class="font-serif italic text-2xl leading-snug text-carbon font-semibold">
              “El silencio neuromuscular de la cadera activa.”
            </h2>
            <p class="text-xs text-neutral-600 mt-3 font-normal leading-relaxed">
              Menos palanca lumbar en L5-S1. Máxima tensión en glúteo medio para sentarse y moverse con total libertad.
            </p>
          </div>
          <div class="border-t border-neutral-200 pt-3 flex justify-between items-center text-[10px] font-mono text-neutral-600">
            <span class="font-medium">EVALUACIÓN CLÍNICA 1-ON-1</span>
            <span class="font-bold text-carbon">BUENOS AIRES</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 3,
    id: "E03",
    name: "Cita Somática • Comillas Monumentales",
    title: "No venís a transpirar para la foto",
    html: `
      <div class="relative w-full h-full bg-carbon flex flex-col justify-between p-8 text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-b from-carbon via-transparent to-carbon pointer-events-none"></div>
        
        <div class="relative z-10 flex justify-between items-center pt-6">
          <span class="text-[11px] uppercase tracking-[0.25em] font-semibold text-champagne">MANIFIESTO SENS</span>
          <span class="text-[10px] text-neutral-400 font-mono">AUTORIDAD CLÍNICA</span>
        </div>

        <div class="relative z-10 my-auto py-4">
          <span class="font-serif text-7xl text-champagne/30 leading-none select-none block -mb-6">“</span>
          <h2 class="font-serif text-2xl sm:text-3xl text-alabastro italic leading-snug relative z-10">
            No venís a transpirar para la foto. Venís a descomprimir tu estructura ósea.
          </h2>
          <div class="mt-6 flex items-center gap-3">
            <div class="w-8 h-0.5 bg-champagne"></div>
            <div>
              <span class="text-xs tracking-widest uppercase font-bold text-champagne block">Nico Coach</span>
              <span class="text-[10px] text-neutral-400 block">Especialista en Biomecánica Somática</span>
            </div>
          </div>
        </div>

        <div class="relative z-10 text-[10px] text-neutral-400 font-mono border-t border-white/10 pt-3 flex justify-between">
          <span>ALINEACIÓN VERTEBRAL</span>
          <span class="text-champagne">LINK EN BIO</span>
        </div>
      </div>
    `
  },
  {
    num: 4,
    id: "E04",
    name: "Telemetría Biomecánica • HUD Clínico",
    title: "Dorsiflexión de tobillo: el origen del dolor lumbar",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-champagne overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-35 brightness-75" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/60 to-transparent pointer-events-none"></div>
        
        <!-- Header -->
        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono border-b border-champagne/20 pb-2.5">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-white font-bold tracking-widest uppercase">SENS KINEMATIC LAB</span>
          </div>
          <span class="text-champagne font-bold">L5-S1 LOCK</span>
        </div>

        <!-- Center Reticle Graphic -->
        <div class="relative z-10 my-auto text-center py-4">
          <div class="w-24 h-24 border border-dashed border-champagne/40 rounded-full mx-auto flex flex-col items-center justify-center p-2 backdrop-blur-sm bg-black/40">
            <span class="text-lg font-mono font-bold text-white">174.2°</span>
            <span class="text-[9px] uppercase tracking-wider text-champagne font-semibold mt-0.5">Cadera Neutra</span>
          </div>
          <p class="text-xs text-neutral-300 max-w-[240px] mx-auto mt-3 font-mono leading-relaxed">
            Ángulo óptimo de descompresión lumbar medido en plataforma clínica.
          </p>
        </div>

        <!-- Bottom Insight Card -->
        <div class="relative z-10 bg-black/85 p-5 rounded-2xl border border-champagne/30 backdrop-blur-md mb-4 shadow-xl">
          <span class="text-[9px] uppercase tracking-widest text-champagne font-bold block mb-1">Diagnóstico Biomecánico</span>
          <h3 class="text-base text-white font-bold tracking-tight">
            DORSIFLEXIÓN MENOR A 28°
          </h3>
          <p class="text-xs text-neutral-300 mt-1 leading-relaxed">
            Si tu tobillo no flexiona, tu columna baja para compensar. En SENS corregimos el origen, no el síntoma.
          </p>
        </div>
      </div>
    `
  },
  {
    num: 5,
    id: "E05",
    name: "Métrica Monumental • -42% Compresión",
    title: "-42% Compresión L5-S1 con Nico Coach",
    html: `
      <div class="relative w-full h-full bg-carbon p-7 flex flex-col justify-between text-center text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-20 brightness-50" src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-transparent pointer-events-none"></div>

        <div class="relative z-10 flex justify-between items-center pt-6 text-[10px] font-mono text-neutral-400">
          <span class="text-champagne font-bold tracking-widest uppercase">EVIDENCIA CLÍNICA</span>
          <span class="bg-white/10 px-3 py-1 rounded-full text-white">SENS METHOD</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <span class="block text-7xl font-black text-champagne tracking-tighter leading-none font-mono">-42%</span>
          <span class="text-base uppercase tracking-widest font-extrabold text-white mt-3 block">Compresión Axial L5-S1</span>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto mt-3 leading-relaxed">
            Al reemplazar la sentadilla tradicional por carga axial asistida con vector anteroposterior guiado.
          </p>
        </div>

        <div class="relative z-10 text-[10px] text-neutral-400 uppercase tracking-widest font-mono border-t border-white/10 pt-3">
          AUDITORÍA POSTURAL DE 3 MINUTOS • COMENTÁ 'SENS'
        </div>
      </div>
    `
  },
  {
    num: 6,
    id: "E06",
    name: "Glassmorphic Frosted Card • Isometría Fascial",
    title: "Isometría Fascial: Tensión sin desgaste articular",
    html: `
      <div class="relative w-full h-full flex flex-col justify-end p-6 text-white overflow-hidden bg-black">
        <img class="absolute inset-0 w-full h-full object-cover brightness-[0.5]" src="https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>

        <div class="absolute top-8 left-6 z-10 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-champagne"></span>
          <span class="text-[11px] uppercase tracking-[0.2em] font-semibold text-champagne">SENS LONGEVIDAD</span>
        </div>

        <div class="relative z-10 bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl mb-6">
          <span class="text-[10px] uppercase tracking-widest text-champagne font-bold block mb-1.5">Tensión Somática Guiada</span>
          <h2 class="text-2xl font-bold text-white tracking-tight leading-snug">
            Cargar pesado con una técnica tan limpia que parezca fácil.
          </h2>
          <p class="text-xs text-neutral-200 mt-2.5 leading-relaxed font-light">
            El verdadero lujo del entrenamiento es lo que deja intacto: tus cartílagos y tu columna vertebral.
          </p>
          <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span class="text-champagne font-semibold">PLAN 100% PERSONALIZADO</span>
            <span class="text-white/70 font-mono">NICO COACH</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 7,
    id: "E07",
    name: "Brutalismo Sobrio • 3 Palabras Clave",
    title: "DESCOMPRIMÍ. ALINEÁ. CONSTRUÍ.",
    html: `
      <div class="relative w-full h-full bg-carbon flex flex-col justify-between p-8 text-center text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-b from-carbon via-transparent to-carbon pointer-events-none"></div>

        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono text-neutral-400">
          <span class="text-champagne font-semibold tracking-widest">SENS AXIOMA</span>
          <span>MÉTODO CLÍNICO</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <h2 class="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none text-white">
            DESCOMPRIMÍ.<br/>
            <span class="text-champagne">ALINEÁ.</span><br/>
            CONSTRUÍ.
          </h2>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto mt-5 leading-relaxed font-light">
            No aumentes la carga si no podés moverte sin compensar. Primero la base ósea, después el peso.
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-champagne tracking-widest uppercase border-t border-white/10 pt-3">
          AGENDA ABIERTA CON NICO COACH
        </div>
      </div>
    `
  },
  {
    num: 8,
    id: "E08",
    name: "Presupuesto Metabólico • Bóveda de Energía",
    title: "La ventana anabólica real es tu descanso",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-transparent pointer-events-none"></div>

        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono">
          <span class="text-champagne font-bold tracking-widest uppercase">NUTRICIÓN & REGENERACIÓN</span>
          <span class="bg-champagne/10 text-champagne px-3 py-1 rounded-full border border-champagne/20">SENS RECOVERY</span>
        </div>

        <div class="relative z-10 my-auto bg-black/75 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md">
          <span class="text-[10px] uppercase tracking-widest font-bold text-champagne block mb-2">Bioquímica Somática</span>
          <h2 class="text-xl sm:text-2xl font-bold leading-tight text-white">
            Sin fase parasimpática no hay síntesis proteica ni recuperación celular.
          </h2>
          <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-left">
            <div>
              <span class="text-[9px] uppercase tracking-widest text-neutral-400 block font-mono">PROTEÍNA DIARIA</span>
              <span class="text-base font-mono font-bold text-champagne">1.8g / kg</span>
            </div>
            <div>
              <span class="text-[9px] uppercase tracking-widest text-neutral-400 block font-mono">SUEÑO PROFUNDO</span>
              <span class="text-base font-mono font-bold text-white">&gt; 1h 30m</span>
            </div>
          </div>
        </div>

        <div class="relative z-10 text-[10px] text-neutral-400 font-mono border-t border-white/10 pt-3 flex justify-between">
          <span>PAUTA NUTRICIONAL INTEGRAL</span>
          <span class="text-champagne font-bold">NICO COACH</span>
        </div>
      </div>
    `
  },
  {
    num: 9,
    id: "E09",
    name: "Contraste Split • Antes vs SENS",
    title: "Gimnasio tradicional vs SENS Somático",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <div class="relative z-10 pt-6 text-center">
          <span class="text-[10px] uppercase tracking-[0.25em] font-semibold text-champagne block">PARADIGMA SENS</span>
          <h2 class="text-2xl font-black uppercase text-white mt-1">El Cambio de Eje</h2>
        </div>

        <div class="relative z-10 my-auto space-y-3.5">
          <!-- Card Traditional -->
          <div class="bg-white/5 p-4 rounded-xl border border-white/10 text-left">
            <span class="text-[9px] uppercase tracking-widest font-bold text-rose-400 block mb-1">FITNESS TRADICIONAL</span>
            <p class="text-xs text-neutral-300 leading-snug">
              Dolor como trofeo. Carga desmedida que comprime lumbares y desgasta cartílago.
            </p>
          </div>

          <!-- Card SENS -->
          <div class="bg-carbon-elevated p-5 rounded-2xl border border-champagne/40 text-left shadow-xl">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] uppercase tracking-widest font-bold text-champagne block">ESTÁNDAR SENS</span>
              <span class="w-2 h-2 rounded-full bg-champagne"></span>
            </div>
            <p class="text-xs text-white leading-relaxed font-medium">
              Biomecánica de precisión. Fuerza real sin inflamación, protegiendo tus discos para los próximos 30 años.
            </p>
          </div>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-center text-neutral-400 border-t border-white/10 pt-3">
          AUDITORÍA 1-ON-1 CON NICO COACH • LINK EN BIO
        </div>
      </div>
    `
  },
  {
    num: 10,
    id: "E10",
    name: "Monolito Minimal • Tu Eje es Todo",
    title: "TU EJE ES TODO. NADA AL AZAR.",
    html: `
      <div class="relative w-full h-full bg-carbon flex flex-col justify-between p-8 text-center text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-20 brightness-40" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-carbon pointer-events-none"></div>

        <div class="relative z-10 pt-6">
          <span class="text-[11px] uppercase tracking-[0.3em] font-semibold text-champagne">SENS • BUENOS AIRES</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <h2 class="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
            TU EJE<br/>
            <span class="text-champagne">ES TODO.</span>
          </h2>
          <p class="text-xs text-neutral-300 max-w-[240px] mx-auto mt-4 leading-relaxed font-light">
            La postura que sostenés en el escritorio es la que define la salud de tus cartílagos.
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-neutral-400 uppercase tracking-widest border-t border-white/10 pt-3">
          ENTRENAMIENTO SOMÁTICO DE ALTO RENDIMIENTO
        </div>
      </div>
    `
  },
  {
    num: 11,
    id: "E11",
    name: "Tarjeta Flotante Asimétrica • Masa Muscular",
    title: "La masa muscular es tu póliza biológica",
    html: `
      <div class="relative w-full h-full flex flex-col justify-end p-6 text-white overflow-hidden bg-black">
        <img class="absolute inset-0 w-full h-full object-cover brightness-[0.45]" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>

        <div class="absolute top-8 left-6 z-10 flex items-center gap-2">
          <span class="text-[11px] uppercase tracking-[0.2em] font-semibold text-champagne">SENS LONGEVIDAD</span>
        </div>

        <div class="relative z-10 bg-carbon/95 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md mb-6 shadow-2xl">
          <span class="text-[10px] uppercase tracking-widest font-bold text-champagne block mb-1.5">Activo Metabólico</span>
          <h2 class="text-xl sm:text-2xl font-bold leading-tight text-white">
            La masa muscular no es estética: es tu seguro de vida contra el envejecimiento celular.
          </h2>
          <p class="text-xs text-neutral-300 mt-2.5 leading-relaxed font-light">
            A los 40 años perdés 1% de fuerza anual si no la estimulás con biomecánica inteligente.
          </p>
          <div class="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-champagne">
            <span>AUDITORÍA POSTURAL</span>
            <span class="text-white">NICO COACH</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 12,
    id: "E12",
    name: "Ticket VIP Exclusivo • 2 Cupos",
    title: "Solo 2 cupos para seguimiento presencial",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/80 to-transparent pointer-events-none"></div>

        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono text-champagne">
          <span class="font-bold tracking-widest uppercase">SENS PRIVATE COACHING</span>
          <span class="bg-champagne text-carbon px-2.5 py-0.5 rounded font-bold">SOLO 2 CUPOS</span>
        </div>

        <div class="relative z-10 my-auto bg-black/80 p-6 rounded-2xl border border-champagne/40 backdrop-blur-md text-left">
          <span class="text-[10px] uppercase tracking-widest font-bold text-champagne block mb-2">Ingreso VIP • Palermo</span>
          <h2 class="text-2xl font-black text-white leading-tight uppercase">
            Auditoría de Columna & Cadera 1-on-1
          </h2>
          <p class="text-xs text-neutral-300 mt-2.5 leading-relaxed">
            Diagnóstico postural completo, test de movilidad activa y planificación semanal directa con Nico Coach.
          </p>
          <div class="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-neutral-400">
            <span>DURACIÓN: 60 MIN</span>
            <span class="text-champagne font-bold">WHATSAPP VIP</span>
          </div>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-center text-neutral-400 border-t border-white/10 pt-3">
          POSTULACIONES VÍA LINK EN BIO
        </div>
      </div>
    `
  },
  {
    num: 13,
    id: "E13",
    name: "Reflexión Clínica • El Dolor No Es Medalla",
    title: "El dolor articular no es una medalla",
    html: `
      <div class="relative w-full h-full bg-carbon p-8 flex flex-col justify-between text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-20 brightness-40" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-b from-carbon via-transparent to-carbon pointer-events-none"></div>

        <div class="relative z-10 pt-6">
          <span class="text-[10px] uppercase tracking-[0.25em] font-semibold text-champagne">AXIOMA DE RECUPERACIÓN</span>
        </div>

        <div class="relative z-10 my-auto py-4">
          <h2 class="font-serif italic text-2xl sm:text-3xl text-alabastro leading-snug">
            “Si salís de entrenar con dolor lumbar, no construiste fuerza: acumulaste inflamación.”
          </h2>
          <p class="text-xs text-neutral-300 mt-4 leading-relaxed font-light">
            En SENS priorizamos la estabilidad articular para que tu cuerpo rinda mejor dentro y fuera del salón.
          </p>
          <div class="mt-5 flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-champagne"></span>
            <span class="text-[11px] font-mono text-champagne uppercase tracking-widest font-semibold">Nico Coach</span>
          </div>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-neutral-400 uppercase tracking-widest border-t border-white/10 pt-3">
          SENS • TRAIN & WELLNESS
        </div>
      </div>
    `
  },
  {
    num: 14,
    id: "E14",
    name: "Cronómetro de Eficiencia • 42 Minutos",
    title: "42 minutos de precisión neuromuscular",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white text-center overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-transparent pointer-events-none"></div>

        <div class="relative z-10 pt-6 text-[10px] font-mono text-neutral-400 flex justify-between items-center">
          <span class="text-champagne font-bold tracking-widest uppercase">ALTA EFICIENCIA</span>
          <span>TIEMPO OPTIMIZADO</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <span class="block text-6xl font-black text-champagne tracking-tighter leading-none font-mono">42 MIN</span>
          <span class="text-sm uppercase tracking-widest font-extrabold text-white mt-3 block">Estímulo Sin Desgaste</span>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto mt-3 leading-relaxed">
            Entrenar más de 60 minutos con fatiga acumulada solo incrementa el cortisol y arruina la técnica.
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-neutral-400 uppercase tracking-widest border-t border-white/10 pt-3">
          SESIONES SEMIPRESENCIALES CON NICO COACH
        </div>
      </div>
    `
  },
  {
    num: 15,
    id: "E15",
    name: "Escala RIR 1-2 • Intensidad sin Fallo",
    title: "RIR 1-2: Estimular sin romperte",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <div class="relative z-10 pt-6 text-center">
          <span class="text-[10px] uppercase tracking-[0.25em] font-semibold text-champagne">METODOLOGÍA SENS</span>
          <h2 class="text-2xl font-black uppercase text-white mt-1">Escala RIR (Reps in Reserve)</h2>
        </div>

        <div class="relative z-10 my-auto bg-black/80 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-mono font-bold text-champagne">RIR 1-2 • ZONA ÓPTIMA</span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold">100% RECLUTAMIENTO</span>
          </div>
          <p class="text-xs text-neutral-300 leading-relaxed font-light">
            Frenar a 1 o 2 repeticiones del fallo mecánico recluta el 98% de las unidades motoras sin fatigar el sistema nervioso central.
          </p>
          <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-4">
            <div class="bg-champagne h-full w-[85%] rounded-full"></div>
          </div>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-center text-neutral-400 border-t border-white/10 pt-3">
          PLANIFICACIÓN BIOMECÁNICA PERSONALIZADA
        </div>
      </div>
    `
  },
  {
    num: 16,
    id: "E16",
    name: "Reeducación de Cadera • Rango Activo",
    title: "Reeducación de cadera y movilidad profunda",
    html: `
      <div class="relative w-full h-full flex flex-col justify-end p-6 text-white overflow-hidden bg-black">
        <img class="absolute inset-0 w-full h-full object-cover brightness-[0.45]" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>

        <div class="absolute top-8 left-6 z-10 flex items-center gap-2">
          <span class="text-[11px] uppercase tracking-[0.2em] font-semibold text-champagne">MOVILIDAD & CADERA</span>
        </div>

        <div class="relative z-10 bg-carbon/95 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md mb-6 shadow-2xl">
          <span class="text-[10px] uppercase tracking-widest font-bold text-champagne block mb-1.5">Biomecánica de Piso Pélvico</span>
          <h2 class="text-xl sm:text-2xl font-bold leading-tight text-white">
            Tu rigidez de cadera es el cuerpo protegiendo una articulación inestable.
          </h2>
          <p class="text-xs text-neutral-300 mt-2.5 leading-relaxed font-light">
            No estires pasivamente: dale control motor al glúteo medio para que la cadera libere el movimiento natural.
          </p>
          <div class="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-champagne">
            <span>PROTOCOLO SOMÁTICO</span>
            <span class="text-white">NICO COACH</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 17,
    id: "E17",
    name: "Status de Sistema • Readiness 94%",
    title: "Readiness del Sistema Nervioso Autónomo",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono">
          <span class="text-champagne font-bold tracking-widest uppercase">MONITOREO CLÍNICO</span>
          <span class="text-emerald-400 font-bold">● VAGAL ACTIVO</span>
        </div>

        <div class="relative z-10 my-auto bg-black/80 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md text-center">
          <span class="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block mb-1 font-mono">READINESS SCORE</span>
          <span class="block text-6xl font-black text-white tracking-tight font-mono">94%</span>
          <h3 class="text-sm uppercase tracking-widest font-bold text-champagne mt-2">Capacidad Neuromuscular Óptima</h3>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto mt-3 leading-relaxed font-light">
            Tu variabilidad cardíaca indica recuperación completa. Hoy cargamos con máxima intensidad mecánica.
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-center text-neutral-400 border-t border-white/10 pt-3">
          SENS • MONITOR DE RECUPERACIÓN VAGAL
        </div>
      </div>
    `
  },
  {
    num: 18,
    id: "E18",
    name: "Quiebre Tipográfico • Despertá el Core",
    title: "DESPERTÁ EL CORE PROFUNDO",
    html: `
      <div class="relative w-full h-full bg-carbon flex flex-col justify-between p-8 text-center text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-20 brightness-40" src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-carbon pointer-events-none"></div>

        <div class="relative z-10 pt-6">
          <span class="text-[10px] uppercase tracking-[0.25em] font-semibold text-champagne">ANATOMÍA FUNCIONAL</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <h2 class="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-none">
            DESPERTÁ EL<br/>
            <span class="text-champagne">CORE PROFUNDO.</span>
          </h2>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto mt-4 leading-relaxed font-light">
            Hacer 100 abdominales no protege tu columna. Activar el transverso con presión intraabdominal sí.
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-neutral-400 uppercase tracking-widest border-t border-white/10 pt-3">
          SUPERVISIÓN DIRECTA CON NICO COACH
        </div>
      </div>
    `
  },
  {
    num: 19,
    id: "E19",
    name: "Audio Note • Transcripción de Sala",
    title: "Audio Note de Nico: Descompresión en 4 minutos",
    html: `
      <div class="relative w-full h-full bg-carbon p-6 flex flex-col justify-between text-white overflow-hidden">
        <div class="relative z-10 pt-6 flex justify-between items-center text-[10px] font-mono text-champagne">
          <span class="font-bold tracking-widest uppercase">AUDIO NOTE #48</span>
          <span class="bg-white/10 text-white px-2.5 py-0.5 rounded">02:45 MIN</span>
        </div>

        <div class="relative z-10 my-auto bg-black/85 p-6 rounded-2xl border border-champagne/30 backdrop-blur-md">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-champagne text-carbon flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[20px]">graphic_eq</span>
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Nico Coach Somático</span>
              <span class="text-[10px] text-neutral-400 block font-mono">Mensaje para Alumnos</span>
            </div>
          </div>
          <p class="text-xs text-neutral-200 leading-relaxed font-light italic">
            “Antes de salir a correr o meterte al gym tras 8 horas en la computadora, respirá 4 minutos en el suelo descomprimiendo la pelvis. Si no lo hacés, tus vértebras amortiguan cada paso.”
          </p>
        </div>

        <div class="relative z-10 text-[10px] font-mono text-center text-neutral-400 border-t border-white/10 pt-3">
          ESCUCHÁ EL PROTOCOLO COMPLETO • LINK EN BIO
        </div>
      </div>
    `
  },
  {
    num: 20,
    id: "E20",
    name: "Manifiesto Cumbre • MAKES SENS",
    title: "Entrenar para los próximos 30 años",
    html: `
      <div class="relative w-full h-full bg-carbon flex flex-col justify-between p-8 text-center text-white overflow-hidden">
        <img class="absolute inset-0 w-full h-full object-cover opacity-25 brightness-50" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1080&q=80" alt="bg"/>
        <div class="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/80 to-transparent pointer-events-none"></div>

        <div class="relative z-10 pt-6">
          <span class="text-[11px] uppercase tracking-[0.3em] font-semibold text-champagne">MANIFIESTO MAESTRO</span>
        </div>

        <div class="relative z-10 my-auto py-6">
          <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            No te prometemos quemar grasa en 7 días.<br/>
            <span class="text-champagne font-serif italic text-xl sm:text-2xl lowercase block mt-2">
              te garantizamos un cuerpo fuerte para los próximos 30 años.
            </span>
          </h2>
          <div class="w-10 h-0.5 bg-champagne mx-auto my-5"></div>
          <p class="text-xs text-neutral-300 max-w-[260px] mx-auto leading-relaxed font-light">
            Fuerza sin ruido. Postura sin dolor. Longevidad real.
          </p>
        </div>

        <div class="relative z-10 text-[11px] font-mono text-champagne font-bold tracking-widest uppercase border-t border-white/10 pt-3">
          MAKES SENS • PALERMO
        </div>
      </div>
    `
  }
];

module.exports = { redesignedE01toE20 };
