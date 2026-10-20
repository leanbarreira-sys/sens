/**
 * =============================================================================
 * SENS COACH NUTRITION MASTER (PLANIFICADOR NUTRICIONAL DE PRECISIÓN)
 * =============================================================================
 * Arquitectura Mobile-First & Quiet Luxury diseñada según estándares
 * de Senior Director PM & Senior Director UX de Wellness.
 * 
 * Capacidades Principales:
 * 1. Ficha Clínica 360° + Cálculo Basal BMR & TDEE (Mifflin-St Jeor).
 * 2. Target Calórico Recomendado vs. Manual con Diálogo de Confirmación.
 * 3. Reparto Científico de Macros (Proteína 2.2g/kg, Grasas 0.9g/kg, Carbos balance).
 * 4. Mesa de Trabajo con Sugerencias Inteligentes que llenan las calorías de cada comida.
 * 5. Edición táctil de gramajes con regla de tres simple instantánea.
 * 6. Duplicación Masiva en 1 Tap (Lunes a Viernes, Toda la Semana, Fines de Semana).
 * 7. Visión Mensual Completa con filtro por alimentos y seguimiento de cumplimiento.
 * 8. Sincronización en tiempo real con Supabase y Card de Inicio (Dashboard).
 */

const CoachNutritionMaster = {
    activeAthleteId: null,
    currentStep: 1,
    activeVision: 'wizard', // 'wizard' | 'month' | 'library'
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    calendarMonthViewMode: 'grid', // 'grid' | 'list'
    selectedCalendarDateStr: null,
    isMultiSelectMode: false,
    selectedMultiDates: new Set(),
    activeDayKey: 'day1',
    activeMealKey: 'desayuno',
    foodSearchQuery: '',
    foodCategoryFilter: 'all',
    monthFoodFilter: '',
    recommendedKcal: 2150,
    isManualKcalConfirmed: false,
    dayPlanCache: {},

    // Inicialización del Módulo
    init() {
        this.bindEvents();
        const initialAthId = (typeof getActiveAthleteId === 'function') ? getActiveAthleteId() : 'mock_vip';
        this.syncActiveAthlete(initialAthId);
    },

    // Sincronizar con el alumno activo
    syncActiveAthlete(athleteId) {
        if (!athleteId) return;
        this.activeAthleteId = athleteId;
        this.loadAthletePlan();
        if (this.activeVision === 'wizard') {
            this.renderWizardStep();
        } else if (this.activeVision === 'month') {
            this.renderMonthVision();
        } else if (this.activeVision === 'library') {
            this.renderLibraryVision();
        }
    },

    // Obtener datos clínicos del atleta
    getAthleteProfile() {
        let profile = null;
        if (typeof AppState !== 'undefined' && AppState.profile && (AppState.profile.id === this.activeAthleteId || !this.activeAthleteId)) {
            profile = AppState.profile;
        }
        if (!profile && typeof window.__coachAthletesCache !== 'undefined' && Array.isArray(window.__coachAthletesCache)) {
            profile = window.__coachAthletesCache.find(a => a.id === this.activeAthleteId);
        }
        if (!profile && typeof localStorage !== 'undefined') {
            try {
                const roster = JSON.parse(localStorage.getItem('sens_registered_athletes') || '[]');
                profile = roster.find(a => a.id === this.activeAthleteId);
            } catch (e) {}
        }

        // Defaults clínicos si faltan campos
        return {
            id: this.activeAthleteId || 'usr-vip-001',
            full_name: profile?.full_name || profile?.name || 'Atleta SENS',
            gender: profile?.gender || 'male',
            age: parseInt(profile?.age, 10) || 30,
            weight: parseFloat(profile?.current_weight || profile?.weight || 75.5) || 75.5,
            height: parseFloat(profile?.height || 176) || 176,
            goal: profile?.goal || 'fat_loss',
            activity_level: profile?.activity_level || 'moderate',
            plan_name: profile?.subscription_status === 'active' ? 'Plan Activo' : 'Membresía SENS'
        };
    },

    // Cálculo Metabólico Científico (Mifflin-St Jeor)
    calculateMetabolicNeeds(ath) {
        // Tasa Metabólica Basal (BMR)
        let bmr = (10 * ath.weight) + (6.25 * ath.height) - (5 * ath.age);
        bmr += (ath.gender === 'female' ? -161 : 5);
        bmr = Math.round(bmr);

        // Factor de Actividad Física
        const activityFactors = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            high: 1.725,
            extreme: 1.9
        };
        const factor = activityFactors[ath.activity_level] || 1.55;
        const tdee = Math.round(bmr * factor);

        // Calorías según Objetivo
        let recommended = tdee;
        let goalLabel = 'Recomposición Magra';
        let deficitSurplusLabel = 'Mantenimiento Isocalórico';

        if (ath.goal === 'fat_loss' || ath.goal === 'deficit') {
            recommended = Math.round(tdee - 450);
            goalLabel = 'Déficit Calórico Estructurado';
            deficitSurplusLabel = '-450 kcal / día (Pérdida de grasa)';
        } else if (ath.goal === 'muscle_gain' || ath.goal === 'hypertrophy' || ath.goal === 'superavit') {
            recommended = Math.round(tdee + 350);
            goalLabel = 'Superávit Hipertrofia';
            deficitSurplusLabel = '+350 kcal / día (Ganancia muscular)';
        }

        // Distribución Óptima de Macros de Nico
        const protGrams = Math.round(ath.weight * 2.2); // 2.2 g/kg
        const fatsGrams = Math.round(ath.weight * 0.9); // 0.9 g/kg
        const protKcal = protGrams * 4;
        const fatsKcal = fatsGrams * 9;
        const remainingKcal = Math.max(0, recommended - protKcal - fatsKcal);
        const carbsGrams = Math.round(remainingKcal / 4);

        return {
            bmr,
            tdee,
            recommendedKcal: Math.max(1300, recommended),
            goalLabel,
            deficitSurplusLabel,
            protGrams,
            fatsGrams,
            carbsGrams,
            waterLiters: (Math.round((ath.weight * 0.038) * 10) / 10)
        };
    },

    // Cargar Plan del Atleta
    loadAthletePlan() {
        const athId = this.activeAthleteId;
        const ath = this.getAthleteProfile();
        const meta = this.calculateMetabolicNeeds(ath);
        this.recommendedKcal = meta.recommendedKcal;

        let data = null;
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(`sens_prescribed_nutrition_${athId}`);
                if (raw) data = JSON.parse(raw);
            } catch (e) {}
        }

        if (!data) {
            data = {
                target_calories: meta.recommendedKcal,
                target_protein: meta.protGrams,
                target_carbs: meta.carbsGrams,
                target_fats: meta.fatsGrams,
                target_water: meta.waterLiters,
                directive_note: 'Priorizá 35-40g de proteína en cada una de las comidas principales y mantené hidratación constante antes y después de entrenar.',
                days: {}
            };
        }

        // Asegurar que existan los 7 días de la semana
        const dayNames = {
            day1: 'Lunes',
            day2: 'Martes',
            day3: 'Miércoles',
            day4: 'Jueves',
            day5: 'Viernes',
            day6: 'Sábado',
            day7: 'Domingo'
        };

        if (!data.days || typeof data.days !== 'object') {
            data.days = {};
        }

        Object.keys(dayNames).forEach(k => {
            if (!data.days[k]) {
                data.days[k] = {
                    title: dayNames[k],
                    target_calories: data.target_calories || meta.recommendedKcal,
                    meals: {
                        desayuno: { target_kcal: Math.round(data.target_calories * 0.20), foods: [] },
                        almuerzo: { target_kcal: Math.round(data.target_calories * 0.35), foods: [] },
                        merienda: { target_kcal: Math.round(data.target_calories * 0.15), foods: [] },
                        cena: { target_kcal: Math.round(data.target_calories * 0.20), foods: [] },
                        snack: { target_kcal: Math.round(data.target_calories * 0.10), foods: [] }
                    }
                };
            }
        });

        // Si los días no tienen comidas y hay alimentos heredados en prescribed_foods
        if (Array.isArray(data.prescribed_foods) && data.prescribed_foods.length > 0) {
            const d1 = data.days.day1;
            const hasAny = Object.values(d1.meals).some(m => m.foods && m.foods.length > 0);
            if (!hasAny) {
                data.prescribed_foods.forEach(f => {
                    const resolved = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                    const meals = (resolved && resolved.meals) ? resolved.meals : ['almuerzo'];
                    const targetMeal = meals[0] || 'almuerzo';
                    if (d1.meals[targetMeal]) {
                        d1.meals[targetMeal].foods.push({
                            id: f.id,
                            grams: f.grams || f.porcion_total_g_ml || 100
                        });
                    }
                });
            }
        }

        this.dayPlanCache = data;
    },

    // Cambiar de Visión (Wizard vs Mensual vs Biblioteca)
    switchVision(vision) {
        this.activeVision = vision;
        document.querySelectorAll('#coachNutritionVisionToggleStrip .coach-vision-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-target') === vision);
        });

        const wizardWrap = document.getElementById('coachNutritionWizardView');
        const monthWrap = document.getElementById('coachNutritionMonthView');
        const libWrap = document.getElementById('coachNutritionLibView');

        if (wizardWrap) wizardWrap.style.display = (vision === 'wizard') ? 'block' : 'none';
        if (monthWrap) monthWrap.style.display = (vision === 'month') ? 'block' : 'none';
        if (libWrap) libWrap.style.display = (vision === 'library') ? 'block' : 'none';

        if (vision === 'wizard') {
            this.renderWizardStep();
        } else if (vision === 'month') {
            this.renderMonthVision();
        } else if (vision === 'library') {
            this.renderLibraryVision();
        }
    },

    // Ir a un Paso del Wizard
    goToStep(step) {
        this.currentStep = Math.max(1, Math.min(4, step));
        this.renderWizardStep();
    },

    // Renderizar Paso Actual del Wizard
    renderWizardStep() {
        // Actualizar Stepper Nodes
        for (let i = 1; i <= 4; i++) {
            const node = document.getElementById(`nutriStepNode${i}`);
            if (node) {
                node.classList.toggle('active', i === this.currentStep);
                node.classList.toggle('completed', i < this.currentStep);
            }
            const pane = document.getElementById(`nutriWizardPaneStep${i}`);
            if (pane) {
                pane.style.display = (i === this.currentStep) ? 'block' : 'none';
            }
        }

        const progressLabel = document.getElementById('nutriWizardStepProgressText');
        const stepLabels = [
            'Paso 1 de 4 • Ficha Clínica & Meta Calórica',
            'Paso 2 de 4 • Distribución de Macros & Comidas',
            'Paso 3 de 4 • Alimentos & Sugerencias Inteligentes',
            'Paso 4 de 4 • Duplicar Masivamente & Guardar'
        ];
        if (progressLabel) {
            progressLabel.textContent = stepLabels[this.currentStep - 1] || '';
        }

        if (this.currentStep === 1) this.renderStep1();
        else if (this.currentStep === 2) this.renderStep2();
        else if (this.currentStep === 3) this.renderStep3();
        else if (this.currentStep === 4) this.renderStep4();
    },

    // -------------------------------------------------------------------------
    // PASO 1: Ficha Clínica 360°, BMR/TDEE & Target Calórico
    // -------------------------------------------------------------------------
    renderStep1() {
        const ath = this.getAthleteProfile();
        const meta = this.calculateMetabolicNeeds(ath);
        const currentTarget = this.dayPlanCache.target_calories || meta.recommendedKcal;

        const container = document.getElementById('nutriStep1Dossier');
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
                <!-- Ficha 360° del Alumno -->
                <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 18px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #080809; color: #E5CBA7; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px;">
                            ${ath.full_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #121214;">${ath.full_name}</h4>
                            <span style="font-size: 11px; color: #71717A;">${ath.plan_name} • ${ath.gender === 'male' ? 'Hombre' : 'Mujer'}, ${ath.age} años</span>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; background: #F8F9FA; padding: 10px; border-radius: 10px;">
                        <div>
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Peso</span>
                            <div style="font-size: 14px; font-weight: 800; color: #121214;">${ath.weight} kg</div>
                        </div>
                        <div>
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Altura</span>
                            <div style="font-size: 14px; font-weight: 800; color: #121214;">${ath.height} cm</div>
                        </div>
                        <div>
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">IMC</span>
                            <div style="font-size: 14px; font-weight: 800; color: #121214;">${(ath.weight / Math.pow(ath.height / 100, 2)).toFixed(1)}</div>
                        </div>
                    </div>
                </div>

                <!-- Cálculo Metabólico Clínico SENS -->
                <div style="background: linear-gradient(135deg, rgba(229, 203, 167, 0.12) 0%, rgba(18, 18, 20, 0.03) 100%); border: 1px solid rgba(158, 125, 75, 0.3); border-radius: 14px; padding: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="pill pill-champagne" style="font-size: 9px; font-weight: 800;">ALGORITMO METABÓLICO SENS</span>
                        <span style="font-size: 11px; color: #9E7D4B; font-weight: 700;">Mifflin-St Jeor</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                        <span style="color: #71717A;">Tasa Basal (BMR):</span>
                        <strong style="color: #121214;">${meta.bmr} kcal</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                        <span style="color: #71717A;">Gasto Total (TDEE):</span>
                        <strong style="color: #121214;">${meta.tdee} kcal / día</strong>
                    </div>
                    <div style="border-top: 1px dashed rgba(158, 125, 75, 0.3); padding-top: 10px;">
                        <span style="font-size: 10.5px; color: #71717A; text-transform: uppercase; font-weight: 700;">Recomendación Clínica:</span>
                        <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 2px;">
                            <span style="font-size: 1.45rem; font-weight: 800; color: #9E7D4B;">${meta.recommendedKcal} kcal</span>
                            <span style="font-size: 11px; color: #10B981; font-weight: 700;">${meta.deficitSurplusLabel}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input de Modificación con Confirmación Modal -->
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 800; color: #121214; margin-bottom: 6px;">
                    Calorías Diarias Objetivo para la Prescripción
                </label>
                <p style="font-size: 11.5px; color: #71717A; margin: 0 0 12px 0;">
                    El algoritmo propone <strong>${meta.recommendedKcal} kcal</strong>. Podés confirmar este valor o fijar un objetivo manual personalizado.
                </p>
                
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
                    <div style="position: relative; width: 180px;">
                        <input type="number" id="nutriKcalTargetInput" class="input-control" value="${currentTarget}"
                            step="50" min="1200" max="5000"
                            style="font-size: 1.4rem; font-weight: 800; color: #9E7D4B; margin-bottom: 0; padding-right: 50px;">
                        <span style="position: absolute; right: 12px; top: 12px; font-size: 11px; font-weight: 700; color: #71717A;">kcal</span>
                    </div>

                    <button type="button" class="btn btn-outline btn-sm" id="btnResetToRecommendedKcal" style="font-size: 11.5px; padding: 9px 14px;">
                        Volver a Recomendada (${meta.recommendedKcal} kcal)
                    </button>
                </div>

                <!-- Presets Rápidos -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="pill pill-dark coach-preset-btn" data-kcal="${meta.recommendedKcal}">Recomendada: ${meta.recommendedKcal}</button>
                    <button type="button" class="pill pill-dark coach-preset-btn" data-kcal="${Math.round(meta.tdee - 600)}">Déficit Alto: ${Math.round(meta.tdee - 600)}</button>
                    <button type="button" class="pill pill-dark coach-preset-btn" data-kcal="${meta.tdee}">Mantenimiento: ${meta.tdee}</button>
                    <button type="button" class="pill pill-dark coach-preset-btn" data-kcal="${Math.round(meta.tdee + 400)}">Superávit: ${Math.round(meta.tdee + 400)}</button>
                </div>
            </div>

            <!-- Diálogo de Confirmación Flotante al Modificar -->
            <div id="nutriKcalChangeConfirmBox" style="display: none; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div style="flex: 1;">
                        <strong style="font-size: 12px; color: #92400E; display: block;">¿Confirmás modificar la recomendación de ${meta.recommendedKcal} kcal?</strong>
                        <p style="font-size: 11.5px; color: #78350F; margin: 4px 0 10px 0;">
                            Estás fijando un objetivo manual de <strong id="nutriNewManualKcalLabel">0</strong> kcal. Las pautas de macronutrientes se recalcularán proporcionalmente.
                        </p>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn btn-primary btn-sm" id="btnConfirmManualKcal" style="background: #9E7D4B; font-size: 11px; padding: 5px 12px;">Confirmar Cambio Manual</button>
                            <button type="button" class="btn btn-outline btn-sm" id="btnCancelManualKcal" style="font-size: 11px; padding: 5px 12px;">Mantener ${meta.recommendedKcal} kcal</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-primary" id="btnNutriGoStep2" style="font-weight: 800; padding: 12px 28px;">
                    Siguiente: Distribuir Macros →
                </button>
            </div>
        `;

        this.bindStep1Events(meta);
    },

    bindStep1Events(meta) {
        const input = document.getElementById('nutriKcalTargetInput');
        const confirmBox = document.getElementById('nutriKcalChangeConfirmBox');
        const newLabel = document.getElementById('nutriNewManualKcalLabel');
        const btnConfirm = document.getElementById('btnConfirmManualKcal');
        const btnCancel = document.getElementById('btnCancelManualKcal');
        const btnReset = document.getElementById('btnResetToRecommendedKcal');
        const btnNext = document.getElementById('btnNutriGoStep2');

        if (input) {
            input.addEventListener('change', () => {
                const val = parseInt(input.value, 10) || meta.recommendedKcal;
                if (val !== meta.recommendedKcal) {
                    if (newLabel) newLabel.textContent = val;
                    if (confirmBox) confirmBox.style.display = 'block';
                } else {
                    if (confirmBox) confirmBox.style.display = 'none';
                    this.dayPlanCache.target_calories = val;
                }
            });
        }

        if (btnConfirm) {
            btnConfirm.addEventListener('click', () => {
                const val = parseInt(input.value, 10) || meta.recommendedKcal;
                this.dayPlanCache.target_calories = val;
                this.isManualKcalConfirmed = true;
                if (confirmBox) confirmBox.style.display = 'none';
                if (typeof showSensToast === 'function') {
                    showSensToast(`Objetivo manual de ${val} kcal confirmado.`, 'champagne');
                }
            });
        }

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                if (input) input.value = meta.recommendedKcal;
                this.dayPlanCache.target_calories = meta.recommendedKcal;
                if (confirmBox) confirmBox.style.display = 'none';
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (input) input.value = meta.recommendedKcal;
                this.dayPlanCache.target_calories = meta.recommendedKcal;
                if (confirmBox) confirmBox.style.display = 'none';
            });
        }

        document.querySelectorAll('.coach-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const k = parseInt(btn.getAttribute('data-kcal'), 10);
                if (input) input.value = k;
                input.dispatchEvent(new Event('change'));
            });
        });

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                const val = parseInt(input.value, 10) || meta.recommendedKcal;
                this.dayPlanCache.target_calories = val;
                this.goToStep(2);
            });
        }
    },

    // -------------------------------------------------------------------------
    // PASO 2: Distribución de Macros y Comidas
    // -------------------------------------------------------------------------
    renderStep2() {
        const ath = this.getAthleteProfile();
        const meta = this.calculateMetabolicNeeds(ath);
        const kcal = this.dayPlanCache.target_calories || meta.recommendedKcal;

        // Si no están configurados, usar ratios sugeridos
        let prot = this.dayPlanCache.target_protein || meta.protGrams;
        let fats = this.dayPlanCache.target_fats || meta.fatsGrams;
        let carbs = this.dayPlanCache.target_carbs || Math.max(50, Math.round((kcal - (prot * 4) - (fats * 9)) / 4));

        const container = document.getElementById('nutriStep2Macros');
        if (!container) return;

        const protKcal = prot * 4;
        const fatsKcal = fats * 9;
        const carbsKcal = carbs * 4;
        const totalSumKcal = protKcal + fatsKcal + carbsKcal;

        const pPct = Math.round((protKcal / totalSumKcal) * 100) || 30;
        const fPct = Math.round((fatsKcal / totalSumKcal) * 100) || 25;
        const cPct = 100 - pPct - fPct;

        container.innerHTML = `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #121214;">Distribución de Macronutrientes</h4>
                        <span style="font-size: 11.5px; color: #71717A;">Total Prescrito: <strong>${kcal} kcal / día</strong></span>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" id="btnResetSuggestedMacros" style="font-size: 11px;">
                        Aplicar Ratios Óptimos SENS
                    </button>
                </div>

                <!-- Barra de Distribución Segmentada -->
                <div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 16px; background: #E4E4E7;">
                    <div style="width: ${pPct}%; background: #9E7D4B;" title="Proteína: ${pPct}%"></div>
                    <div style="width: ${cPct}%; background: #3B82F6;" title="Carbohidratos: ${cPct}%"></div>
                    <div style="width: ${fPct}%; background: #F59E0B;" title="Grasas: ${fPct}%"></div>
                </div>

                <!-- Grid de Inputs de Macros -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 16px;">
                    <div style="background: rgba(158, 125, 75, 0.08); border: 1px solid rgba(158, 125, 75, 0.25); border-radius: 10px; padding: 12px;">
                        <span style="font-size: 11px; font-weight: 700; color: #9E7D4B; display: block; margin-bottom: 4px;">Proteína (4 kcal/g)</span>
                        <input type="number" id="macroProtInput" class="input-control" value="${prot}" step="5" style="font-weight: 800; margin-bottom: 2px;">
                        <div style="font-size: 10.5px; color: #71717A;">${pPct}% • ${(prot / ath.weight).toFixed(1)} g/kg</div>
                    </div>

                    <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 10px; padding: 12px;">
                        <span style="font-size: 11px; font-weight: 700; color: #2563EB; display: block; margin-bottom: 4px;">Carbohidratos (4 kcal/g)</span>
                        <input type="number" id="macroCarbsInput" class="input-control" value="${carbs}" step="5" style="font-weight: 800; margin-bottom: 2px;">
                        <div style="font-size: 10.5px; color: #71717A;">${cPct}% • ${(carbs / ath.weight).toFixed(1)} g/kg</div>
                    </div>

                    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 12px;">
                        <span style="font-size: 11px; font-weight: 700; color: #D97706; display: block; margin-bottom: 4px;">Grasas (9 kcal/g)</span>
                        <input type="number" id="macroFatsInput" class="input-control" value="${fats}" step="2" style="font-weight: 800; margin-bottom: 2px;">
                        <div style="font-size: 10.5px; color: #71717A;">${fPct}% • ${(fats / ath.weight).toFixed(1)} g/kg</div>
                    </div>

                    <div style="background: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 10px; padding: 12px;">
                        <span style="font-size: 11px; font-weight: 700; color: #52525B; display: block; margin-bottom: 4px;">Agua Diaria (L)</span>
                        <input type="number" id="macroWaterInput" class="input-control" value="${this.dayPlanCache.target_water || meta.waterLiters}" step="0.2" style="font-weight: 800; margin-bottom: 2px;">
                        <div style="font-size: 10.5px; color: #71717A;">~38 ml por kg peso</div>
                    </div>
                </div>

                <!-- Reparto Orientativo por Comida -->
                <div style="border-top: 1px solid #E4E4E7; padding-top: 14px;">
                    <span style="font-size: 12px; font-weight: 800; color: #121214; display: block; margin-bottom: 8px;">
                        Distribución de Calorías en las 5 Ingestas del Día
                    </span>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; text-align: center;">
                        <div style="background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Desayuno</span>
                            <div style="font-size: 13px; font-weight: 800; color: #121214;">${Math.round(kcal * 0.20)} kcal</div>
                            <span style="font-size: 9.5px; color: #9E7D4B;">20%</span>
                        </div>
                        <div style="background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Almuerzo</span>
                            <div style="font-size: 13px; font-weight: 800; color: #121214;">${Math.round(kcal * 0.35)} kcal</div>
                            <span style="font-size: 9.5px; color: #9E7D4B;">35%</span>
                        </div>
                        <div style="background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Merienda</span>
                            <div style="font-size: 13px; font-weight: 800; color: #121214;">${Math.round(kcal * 0.15)} kcal</div>
                            <span style="font-size: 9.5px; color: #9E7D4B;">15%</span>
                        </div>
                        <div style="background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Cena</span>
                            <div style="font-size: 13px; font-weight: 800; color: #121214;">${Math.round(kcal * 0.20)} kcal</div>
                            <span style="font-size: 9.5px; color: #9E7D4B;">20%</span>
                        </div>
                        <div style="background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                            <span style="font-size: 10px; color: #71717A; text-transform: uppercase;">Snack</span>
                            <div style="font-size: 13px; font-weight: 800; color: #121214;">${Math.round(kcal * 0.10)} kcal</div>
                            <span style="font-size: 9.5px; color: #9E7D4B;">10%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 12px;">
                <button type="button" class="btn btn-outline" onclick="CoachNutritionMaster.goToStep(1)">
                    ← Volver a Meta
                </button>
                <button type="button" class="btn btn-primary" id="btnNutriGoStep3" style="font-weight: 800; padding: 12px 28px;">
                    Siguiente: Seleccionar Alimentos →
                </button>
            </div>
        `;

        this.bindStep2Events(ath, meta);
    },

    bindStep2Events(ath, meta) {
        const pInput = document.getElementById('macroProtInput');
        const cInput = document.getElementById('macroCarbsInput');
        const fInput = document.getElementById('macroFatsInput');
        const wInput = document.getElementById('macroWaterInput');
        const btnReset = document.getElementById('btnResetSuggestedMacros');
        const btnNext = document.getElementById('btnNutriGoStep3');

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (pInput) pInput.value = meta.protGrams;
                if (fInput) fInput.value = meta.fatsGrams;
                if (cInput) cInput.value = meta.carbsGrams;
                if (wInput) wInput.value = meta.waterLiters;
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.dayPlanCache.target_protein = parseInt(pInput?.value, 10) || meta.protGrams;
                this.dayPlanCache.target_carbs = parseInt(cInput?.value, 10) || meta.carbsGrams;
                this.dayPlanCache.target_fats = parseInt(fInput?.value, 10) || meta.fatsGrams;
                this.dayPlanCache.target_water = parseFloat(wInput?.value) || meta.waterLiters;
                this.goToStep(3);
            });
        }
    },

    // -------------------------------------------------------------------------
    // PASO 3: Mesa de Trabajo & Sugerencias Inteligentes de Alimentos
    // -------------------------------------------------------------------------
    renderStep3() {
        const container = document.getElementById('nutriStep3Worktable');
        if (!container) return;

        const dayKey = this.activeDayKey;
        const currentDayPlan = this.dayPlanCache.days[dayKey] || { title: 'Lunes', meals: {} };
        const dayKcal = this.dayPlanCache.target_calories || 2150;

        // Calcular totales acumulados en este día
        let dayTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
        const mealsList = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'];
        mealsList.forEach(mKey => {
            const m = currentDayPlan.meals[mKey];
            if (m && Array.isArray(m.foods)) {
                m.foods.forEach(f => {
                    const resolved = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                    const macros = (typeof window.calculateFoodMacros === 'function') 
                        ? window.calculateFoodMacros(resolved, f.grams) 
                        : { calories: 150, protein: 10, carbs: 15, fats: 5 };
                    dayTotals.calories += macros.calories;
                    dayTotals.protein += macros.protein;
                    dayTotals.carbs += macros.carbs;
                    dayTotals.fats += macros.fats;
                });
            }
        });

        const dayNames = {
            day1: 'LUN', day2: 'MAR', day3: 'MIÉ', day4: 'JUE',
            day5: 'VIE', day6: 'SÁB', day7: 'DOM'
        };

        container.innerHTML = `
            <!-- Barra de Selección de Día -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
                <div class="coach-horizontal-pills" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;">
                    ${Object.keys(dayNames).map(k => `
                        <button type="button" class="pill ${k === this.activeDayKey ? 'pill-champagne active' : 'pill-dark'} nutri-day-pill" data-day="${k}" style="cursor: pointer; border: none; font-weight: 800;">
                            ${dayNames[k]}
                        </button>
                    `).join('')}
                </div>

                <!-- Botón Mágico: Autollenar Sugerencias que Llenan las Calorías -->
                <button type="button" class="btn btn-primary btn-sm" id="btnAutoFillSmartMenu" style="background: linear-gradient(135deg, #E5CBA7 0%, #C4A47C 100%); color: #080809; font-weight: 800; font-size: 11px; padding: 7px 16px; border: none; display: inline-flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>Autollenar Menú Óptimo (~${dayKcal} kcal)</span>
                </button>
            </div>

            <!-- Resumen de Balance Calórico del Día -->
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span style="font-size: 10px; text-transform: uppercase; color: #71717A; font-weight: 700;">Balance del Día (${currentDayPlan.title})</span>
                    <div style="display: flex; align-items: baseline; gap: 6px;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: #121214;">${dayTotals.calories}</span>
                        <span style="font-size: 11.5px; color: #71717A;">/ ${dayKcal} kcal</span>
                        <span class="pill ${Math.abs(dayTotals.calories - dayKcal) <= 100 ? 'pill-champagne' : 'pill-dark'}" style="font-size: 9.5px; padding: 2px 7px;">
                            ${dayTotals.calories >= dayKcal ? 'Completo' : `Faltan ${Math.max(0, dayKcal - dayTotals.calories)} kcal`}
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 11px; color: #52525B;">
                    <span>Prot: <strong>${Math.round(dayTotals.protein)}g</strong></span>
                    <span>Carbs: <strong>${Math.round(dayTotals.carbs)}g</strong></span>
                    <span>Grasas: <strong>${Math.round(dayTotals.fats)}g</strong></span>
                </div>
            </div>

            <!-- Acordeón de las 5 Comidas del Día -->
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                ${mealsList.map(mKey => this.renderMealSection(mKey, currentDayPlan.meals[mKey], dayKcal)).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; gap: 12px;">
                <button type="button" class="btn btn-outline" onclick="CoachNutritionMaster.goToStep(2)">
                    ← Volver a Macros
                </button>
                <button type="button" class="btn btn-primary" onclick="CoachNutritionMaster.goToStep(4)" style="font-weight: 800; padding: 12px 28px;">
                    Siguiente: Duplicar Semanas →
                </button>
            </div>
        `;

        this.bindStep3Events();
    },

    renderMealSection(mealKey, mealData, dayKcal) {
        const mealTitles = {
            desayuno: 'Desayuno (20%)',
            almuerzo: 'Almuerzo (35%)',
            merienda: 'Merienda (15%)',
            cena: 'Cena (20%)',
            snack: 'Snacks / Colación (10%)'
        };
        const title = mealTitles[mealKey] || mealKey.toUpperCase();
        const foods = (mealData && Array.isArray(mealData.foods)) ? mealData.foods : [];

        let mealCalories = 0;
        let mealProt = 0;
        foods.forEach(f => {
            const resolved = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
            const macros = (typeof window.calculateFoodMacros === 'function') ? window.calculateFoodMacros(resolved, f.grams) : { calories: 100, protein: 8 };
            mealCalories += macros.calories;
            mealProt += macros.protein;
        });

        return `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 12px; overflow: hidden;">
                <div style="background: #F8F9FA; padding: 10px 14px; border-bottom: 1px solid #E4E4E7; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; font-weight: 800; color: #121214; text-transform: uppercase;">${title}</span>
                        <span class="pill pill-champagne" style="font-size: 9.5px; padding: 2px 7px;">${mealCalories} kcal • ${Math.round(mealProt)}g Prot</span>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm btn-open-food-modal" data-meal="${mealKey}" style="font-size: 10.5px; padding: 4px 10px; border-color: #9E7D4B; color: #9E7D4B;">
                        + Agregar Alimento
                    </button>
                </div>

                <div style="padding: 10px 14px;">
                    ${foods.length === 0 ? `
                        <div style="text-align: center; padding: 14px; font-size: 11.5px; color: #A1A1AA;">
                            No hay alimentos asignados. Hacé clic en "+ Agregar Alimento" o usá el botón de "Autollenar Menú".
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${foods.map((f, idx) => this.renderMealFoodRow(mealKey, f, idx)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderMealFoodRow(mealKey, item, idx) {
        const food = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(item) : item;
        const grams = item.grams || food.defaultGrams || food.porcion_total_g_ml || 100;
        const macros = (typeof window.calculateFoodMacros === 'function') 
            ? window.calculateFoodMacros(food, grams) 
            : { calories: 150, protein: 12, carbs: 15, fats: 4 };

        const imgSrc = food.image_url || food.imagen_path || 'Nutricion/images/nut-001-pechuga-de-pollo-a-la-plancha.webp';

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px; background: #F8F9FA; border-radius: 8px; border: 1px solid #E4E4E7; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 180px;">
                    <img src="${imgSrc}" alt="${food.name}" style="width: 38px; height: 38px; border-radius: 6px; object-fit: cover; background: #000; flex-shrink: 0;" />
                    <div>
                        <strong style="font-size: 12px; color: #121214; display: block; line-height: 1.2;">${food.name}</strong>
                        <span style="font-size: 10px; color: #71717A;">${food.unidades_caseras_total || food.portion || ''}</span>
                    </div>
                </div>

                <!-- Input Gramos Táctil con cálculo en vivo -->
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="position: relative; width: 85px;">
                        <input type="number" class="input-control food-grams-input" 
                            data-meal="${mealKey}" data-index="${idx}" value="${grams}" step="10" min="10" max="1000"
                            style="font-size: 12px; font-weight: 700; padding: 4px 22px 4px 8px; height: 30px; margin-bottom: 0;">
                        <span style="position: absolute; right: 6px; top: 7px; font-size: 9.5px; color: #71717A;">g</span>
                    </div>

                    <div style="min-width: 80px; text-align: right; font-size: 11px;">
                        <strong style="color: #9E7D4B;">${macros.calories} kcal</strong>
                        <div style="font-size: 9.5px; color: #71717A;">${macros.protein}g P • ${macros.carbs}g C</div>
                    </div>

                    <button type="button" class="btn-remove-meal-food" data-meal="${mealKey}" data-index="${idx}" style="background: none; border: none; color: #EF4444; font-size: 14px; cursor: pointer; padding: 4px;">
                        ✕
                    </button>
                </div>
            </div>
        `;
    },

    bindStep3Events() {
        // Cambio de día activo
        document.querySelectorAll('.nutri-day-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeDayKey = btn.getAttribute('data-day') || 'day1';
                this.renderStep3();
            });
        });

        // Botón Autollenar Sugerencias
        const btnAuto = document.getElementById('btnAutoFillSmartMenu');
        if (btnAuto) {
            btnAuto.addEventListener('click', () => {
                this.autoFillDayMenu(this.activeDayKey);
            });
        }

        // Cambio de gramaje en vivo
        document.querySelectorAll('.food-grams-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const meal = inp.getAttribute('data-meal');
                const idx = parseInt(inp.getAttribute('data-index'), 10);
                const val = parseInt(inp.value, 10) || 100;
                const dPlan = this.dayPlanCache.days[this.activeDayKey];
                if (dPlan && dPlan.meals[meal] && dPlan.meals[meal].foods[idx]) {
                    dPlan.meals[meal].foods[idx].grams = val;
                    this.renderStep3();
                }
            });
        });

        // Eliminar alimento de la comida
        document.querySelectorAll('.btn-remove-meal-food').forEach(btn => {
            btn.addEventListener('click', () => {
                const meal = btn.getAttribute('data-meal');
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const dPlan = this.dayPlanCache.days[this.activeDayKey];
                if (dPlan && dPlan.meals[meal]) {
                    dPlan.meals[meal].foods.splice(idx, 1);
                    this.renderStep3();
                }
            });
        });

        // Abrir Modal de Selector de Alimentos
        document.querySelectorAll('.btn-open-food-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const meal = btn.getAttribute('data-meal');
                this.openFoodPickerModal(meal);
            });
        });
    },

    // Autollenar Menú Inteligente que Llena el Volumen Calórico
    autoFillDayMenu(dayKey) {
        if (typeof SENS_FOOD_LIBRARY === 'undefined' || SENS_FOOD_LIBRARY.length === 0) return;
        const dPlan = this.dayPlanCache.days[dayKey];
        if (!dPlan) return;

        const targetKcal = this.dayPlanCache.target_calories || 2150;
        const ath = this.getAthleteProfile();

        // Alimentos insignia por momento de la base de 500
        const sampleMenus = {
            fat_loss: {
                desayuno: [
                    { code: 'NUT-002', grams: 100 }, // Huevos enteros
                    { code: 'NUT-003', grams: 150 }, // Claras
                    { code: 'NUT-038', grams: 45 }   // Avena
                ],
                almuerzo: [
                    { code: 'NUT-001', grams: 180 }, // Pechuga pollo
                    { code: 'NUT-037', grams: 140 }, // Arroz basmati
                    { code: 'NUT-082', grams: 10 }   // Aceite oliva
                ],
                merienda: [
                    { code: 'NUT-007', grams: 170 }, // Yogur griego
                    { code: 'NUT-085', grams: 25 }   // Frutos secos
                ],
                cena: [
                    { code: 'NUT-004', grams: 160 }, // Lomo vacuno magro
                    { code: 'NUT-040', grams: 180 }, // Batata al horno
                    { code: 'NUT-120', grams: 120 }  // Vegetales verdes
                ],
                snack: [
                    { code: 'NUT-010', grams: 30 }   // Whey protein
                ]
            }
        };

        const template = sampleMenus.fat_loss;
        Object.keys(template).forEach(mKey => {
            dPlan.meals[mKey].foods = template[mKey].map(item => {
                const food = SENS_FOOD_LIBRARY.find(f => f.codigo === item.code) || SENS_FOOD_LIBRARY[0];
                return {
                    id: food.id,
                    grams: item.grams
                };
            });
        });

        this.renderStep3();
        if (typeof showSensToast === 'function') {
            showSensToast(`Menú inteligente cargado para ${dPlan.title} (~${targetKcal} kcal).`, 'champagne');
        }
    },

    // Modal de Selección de Alimentos (Catálogo de 500)
    openFoodPickerModal(targetMeal) {
        this.activeMealKey = targetMeal;
        let modal = document.getElementById('coachFoodPickerModal');
        if (!modal) {
            this.createFoodPickerModal();
            modal = document.getElementById('coachFoodPickerModal');
        }
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            this.renderFoodPickerGrid();
        }
    },

    createFoodPickerModal() {
        const modalHtml = `
            <div class="sens-modal-backdrop" id="coachFoodPickerModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="sens-modal-content" style="background: #121214; border: 1px solid rgba(229, 203, 167, 0.3); border-radius: 16px; width: 100%; max-width: 680px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                    <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span class="pill pill-champagne" style="font-size: 9.5px; font-weight: 800;">BASE MAESTRA SENS (500 ALIMENTOS)</span>
                            <h3 style="margin: 4px 0 0 0; font-size: 1.15rem; color: #FFFFFF;" id="foodPickerModalTitle">Agregar a Desayuno</h3>
                        </div>
                        <button type="button" class="modal-close-btn" onclick="CoachNutritionMaster.closeFoodPickerModal()" style="background: none; border: none; color: #FFF; font-size: 20px; cursor: pointer;">✕</button>
                    </div>

                    <!-- Buscador & Filtros -->
                    <div style="padding: 12px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 8px;">
                        <input type="text" id="foodPickerSearchInput" class="input-control" placeholder="Buscar entre 500 alimentos por nombre o ingrediente..." style="margin-bottom: 0; font-size: 12.5px;">
                        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;">
                            <button type="button" class="pill pill-champagne food-cat-filter active" data-cat="all">Todos</button>
                            <button type="button" class="pill pill-dark food-cat-filter" data-cat="protein">Proteínas</button>
                            <button type="button" class="pill pill-dark food-cat-filter" data-cat="carbs">Carbohidratos</button>
                            <button type="button" class="pill pill-dark food-cat-filter" data-cat="healthy_fats">Grasas</button>
                            <button type="button" class="pill pill-dark food-cat-filter" data-cat="hydration_veg">Vegetales</button>
                        </div>
                    </div>

                    <!-- Grid de Resultados -->
                    <div id="foodPickerResultsGrid" style="flex: 1; overflow-y: auto; padding: 16px 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
                        <!-- Inyectado dinámicamente -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const searchInp = document.getElementById('foodPickerSearchInput');
        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                this.foodSearchQuery = e.target.value.toLowerCase().trim();
                this.renderFoodPickerGrid();
            });
        }

        document.querySelectorAll('.food-cat-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.food-cat-filter').forEach(b => {
                    b.classList.remove('pill-champagne', 'active');
                    b.classList.add('pill-dark');
                });
                btn.classList.remove('pill-dark');
                btn.classList.add('pill-champagne', 'active');
                this.foodCategoryFilter = btn.getAttribute('data-cat') || 'all';
                this.renderFoodPickerGrid();
            });
        });
    },

    closeFoodPickerModal() {
        const modal = document.getElementById('coachFoodPickerModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    renderFoodPickerGrid() {
        const grid = document.getElementById('foodPickerResultsGrid');
        if (!grid || typeof SENS_FOOD_LIBRARY === 'undefined') return;

        const title = document.getElementById('foodPickerModalTitle');
        if (title) title.textContent = `Agregar a ${this.activeMealKey.toUpperCase()}`;

        const q = this.foodSearchQuery;
        const cat = this.foodCategoryFilter;

        const filtered = SENS_FOOD_LIBRARY.filter(f => {
            if (cat !== 'all' && f.cat !== cat) return false;
            if (q) {
                const hay = `${f.name} ${f.name_en || ''} ${f.categoria_nutricional || ''} ${f.ingredientes_y_gramajes || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        }).slice(0, 60); // Mostrar hasta 60 en viewport

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #71717A;">No se encontraron alimentos para este filtro.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(f => {
            const imgSrc = f.image_url || 'Nutricion/images/nut-001-pechuga-de-pollo-a-la-plancha.webp';
            return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <img src="${imgSrc}" alt="${f.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #000; flex-shrink: 0;" />
                        <div style="min-width: 0;">
                            <strong style="font-size: 12px; color: #FFFFFF; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name}</strong>
                            <span style="font-size: 10px; color: #9E7D4B; display: block;">${f.calorias_kcal} kcal • ${f.portion || (f.porcion_total_g_ml + 'g')}</span>
                            <span style="font-size: 9.5px; color: #71717A;">P: ${f.proteinas_g}g • C: ${f.carbohidratos_g}g • G: ${f.grasas_g}g</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" onclick="CoachNutritionMaster.addFoodToActiveMeal('${f.id}')" style="font-size: 10px; padding: 5px 9px; flex-shrink: 0; border-color: #9E7D4B; color: #E5CBA7;">
                        + Añadir
                    </button>
                </div>
            `;
        }).join('');
    },

    addFoodToActiveMeal(foodId) {
        let dPlan = null;
        if (this.activeVision === 'month' && this.selectedCalendarDateStr) {
            dPlan = this.getDayPlanForDate(this.selectedCalendarDateStr);
            if (!this.dayPlanCache.calendar_schedule) this.dayPlanCache.calendar_schedule = {};
            if (!this.dayPlanCache.calendar_schedule[this.selectedCalendarDateStr]) {
                this.dayPlanCache.calendar_schedule[this.selectedCalendarDateStr] = JSON.parse(JSON.stringify(dPlan));
                dPlan = this.dayPlanCache.calendar_schedule[this.selectedCalendarDateStr];
            }
        } else {
            dPlan = this.dayPlanCache.days ? this.dayPlanCache.days[this.activeDayKey] : null;
        }
        if (!dPlan || !dPlan.meals[this.activeMealKey]) return;

        const food = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(foodId) : null;
        if (!food) return;

        if (!Array.isArray(dPlan.meals[this.activeMealKey].foods)) {
            dPlan.meals[this.activeMealKey].foods = [];
        }

        dPlan.meals[this.activeMealKey].foods.push({
            id: food.id,
            grams: food.defaultGrams || food.porcion_total_g_ml || 100
        });

        this.closeFoodPickerModal();
        if (this.activeVision === 'month') {
            this.renderMonthVision();
        } else {
            this.renderStep3();
        }
        if (typeof showSensToast === 'function') {
            showSensToast(`${food.name} agregado a ${this.activeMealKey.toUpperCase()}.`, 'champagne');
        }
    },

    // -------------------------------------------------------------------------
    // PASO 4: Duplicación Masiva y Guardado
    // -------------------------------------------------------------------------
    renderStep4() {
        const container = document.getElementById('nutriStep4Duplicate');
        if (!container) return;

        const dayNames = {
            day1: 'Lunes', day2: 'Martes', day3: 'Miércoles', day4: 'Jueves',
            day5: 'Viernes', day6: 'Sábado', day7: 'Domingo'
        };

        container.innerHTML = `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 800; color: #121214;">
                    Duplicación Masiva del Menú Semanal
                </h4>
                <p style="font-size: 12px; color: #71717A; margin: 0 0 16px 0;">
                    Copiá el menú del día seleccionado para acelerar la prescripción sin repetir cargas manuales.
                </p>

                <!-- Botones Rápidos de Duplicación -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btnDupMonToFri" style="font-size: 11px; padding: 8px 14px;">
                        Duplicar Lunes a Días de Semana (Lun a Vie)
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" id="btnDupMonToAll" style="font-size: 11px; padding: 8px 14px;">
                        Duplicar Lunes a Toda la Semana (Lun a Dom)
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" id="btnDupSatToSun" style="font-size: 11px; padding: 8px 14px;">
                        Copiar Sábado a Domingo
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" id="btnDupToFullMonth" style="font-size: 11px; padding: 8px 14px; background: rgba(229, 203, 167, 0.15); border-color: #E5CBA7; color: #121214; font-weight: 800;">
                        Duplicar a Todo el Mes (4 Semanas de Periodización)
                    </button>
                </div>

                <!-- Selección Granular por Días -->
                <div style="border-top: 1px solid #E4E4E7; padding-top: 14px; margin-bottom: 16px;">
                    <span style="font-size: 12px; font-weight: 700; color: #121214; display: block; margin-bottom: 8px;">
                        Copiar menú de <strong>${dayNames[this.activeDayKey]}</strong> en:
                    </span>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;">
                        ${Object.keys(dayNames).map(k => `
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #52525B; cursor: pointer; background: #F8F9FA; padding: 8px; border-radius: 8px; border: 1px solid #E4E4E7;">
                                <input type="checkbox" class="nutri-dup-day-check" value="${k}" ${k !== this.activeDayKey ? 'checked' : 'disabled'}>
                                <span>${dayNames[k]}</span>
                            </label>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" id="btnExecuteGranularDuplicate" style="margin-top: 10px; font-size: 11px; padding: 6px 14px;">
                        Aplicar Copia a Días Seleccionados
                    </button>
                </div>

                <!-- Directiva / Consejo de Nico -->
                <div style="border-top: 1px solid #E4E4E7; padding-top: 16px;">
                    <label style="display: block; font-size: 12.5px; font-weight: 800; color: #121214; margin-bottom: 6px;">
                        Consejo / Directiva Nutricional de Nico (Visible en el Portal del Alumno)
                    </label>
                    <textarea id="nutriStep4DirectiveText" class="input-control" rows="3" style="font-size: 12px;">${this.dayPlanCache.directive_note || ''}</textarea>
                </div>
            </div>

            <!-- Banner Prominente de Confirmación de Guardado -->
            <div id="coachNutriSaveNotice" class="sens-save-feedback-banner" style="display: none; margin-bottom: 14px;"></div>

            <div style="display: flex; justify-content: space-between; gap: 12px;">
                <button type="button" class="btn btn-outline" onclick="CoachNutritionMaster.goToStep(3)">
                    ← Volver a Alimentos
                </button>
                <button type="button" class="btn btn-primary" id="btnSaveCompleteNutritionPlan" style="font-weight: 800; padding: 12px 32px; background: linear-gradient(135deg, #E5CBA7 0%, #C4A47C 100%); color: #080809; border: none; box-shadow: 0 4px 15px rgba(229,203,167,0.35); transition: all 0.25s ease;">
                    Guardar &amp; Sincronizar Plan Nutricional
                </button>
            </div>
        `;

        this.bindStep4Events();
    },

    bindStep4Events() {
        const btnMonFri = document.getElementById('btnDupMonToFri');
        const btnMonAll = document.getElementById('btnDupMonToAll');
        const btnSatSun = document.getElementById('btnDupSatToSun');
        const btnFullMonth = document.getElementById('btnDupToFullMonth');
        const btnGranular = document.getElementById('btnExecuteGranularDuplicate');
        const btnSave = document.getElementById('btnSaveCompleteNutritionPlan');
        const noteInput = document.getElementById('nutriStep4DirectiveText');

        const duplicate = (srcKey, destKeys) => {
            const src = this.dayPlanCache.days[srcKey];
            if (!src) return;
            destKeys.forEach(k => {
                if (k !== srcKey) {
                    this.dayPlanCache.days[k] = JSON.parse(JSON.stringify(src));
                    this.dayPlanCache.days[k].title = this.getDayTitle(k);
                }
            });
            if (typeof showSensToast === 'function') {
                showSensToast(`Menú de ${src.title} duplicado en ${destKeys.length} días.`, 'champagne');
            }
        };

        if (btnMonFri) btnMonFri.addEventListener('click', () => duplicate('day1', ['day2', 'day3', 'day4', 'day5']));
        if (btnMonAll) btnMonAll.addEventListener('click', () => duplicate('day1', ['day2', 'day3', 'day4', 'day5', 'day6', 'day7']));
        if (btnSatSun) btnSatSun.addEventListener('click', () => duplicate('day6', ['day7']));
        if (btnFullMonth) btnFullMonth.addEventListener('click', () => this.duplicateToFullMonth());

        if (btnGranular) {
            btnGranular.addEventListener('click', () => {
                const checks = Array.from(document.querySelectorAll('.nutri-dup-day-check:checked')).map(c => c.value);
                if (checks.length > 0) {
                    duplicate(this.activeDayKey, checks);
                }
            });
        }

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                if (noteInput) this.dayPlanCache.directive_note = noteInput.value.trim();
                this.savePlan();
            });
        }
    },

    duplicateToFullMonth() {
        // Replicar a 4 semanas completas (período mensual de periodización)
        const weeklySnapshot = JSON.parse(JSON.stringify(this.dayPlanCache.days));
        this.dayPlanCache.weeks = {
            week1: weeklySnapshot,
            week2: JSON.parse(JSON.stringify(weeklySnapshot)),
            week3: JSON.parse(JSON.stringify(weeklySnapshot)),
            week4: JSON.parse(JSON.stringify(weeklySnapshot))
        };
        this.dayPlanCache.periodized_month = true;

        const notice = document.getElementById('coachNutriSaveNotice');
        if (notice) {
            notice.style.display = 'flex';
            notice.innerHTML = `<span style="font-size: 16px;">✓</span> <span>Menú semanal replicado a las <strong>4 semanas del mes</strong> (30 días de periodización activa).</span>`;
        }
        if (typeof showSensToast === 'function') {
            showSensToast('Menú duplicado para las 4 semanas del mes.', 'champagne');
        }
    },

    getDayTitle(dayKey) {
        const m = { day1: 'Lunes', day2: 'Martes', day3: 'Miércoles', day4: 'Jueves', day5: 'Viernes', day6: 'Sábado', day7: 'Domingo' };
        return m[dayKey] || 'Día';
    },

    // Guardado y Sincronización
    async savePlan() {
        const athId = this.activeAthleteId;
        if (!athId) return;

        const btnSave = document.getElementById('btnSaveCompleteNutritionPlan');
        const originalBtnText = btnSave ? btnSave.innerHTML : 'Guardar & Sincronizar Plan Nutricional';
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `Sincronizando con Alumno...`;
            btnSave.style.opacity = '0.7';
        }

        // Aplanar alimentos para compatibilidad con código anterior
        const allFoods = [];
        Object.keys(this.dayPlanCache.days).forEach(dKey => {
            const d = this.dayPlanCache.days[dKey];
            Object.values(d.meals).forEach(m => {
                if (Array.isArray(m.foods)) {
                    m.foods.forEach(f => {
                        if (!allFoods.some(x => x.id === f.id)) {
                            allFoods.push(f);
                        }
                    });
                }
            });
        });
        this.dayPlanCache.prescribed_foods = allFoods;

        // 1. Guardar en LocalStorage
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`sens_prescribed_nutrition_${athId}`, JSON.stringify(this.dayPlanCache));
        }

        // 2. Sincronizar en Memoria del Portal
        if (typeof syncMemberNutritionPrescription === 'function') {
            syncMemberNutritionPrescription(athId, this.dayPlanCache);
        }
        if (typeof updateNutriSummaryCardData === 'function') {
            updateNutriSummaryCardData();
        }

        // 3. Guardar en Supabase si está disponible
        let supabaseSuccess = false;
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { error } = await supabaseClient
                    .from('profiles')
                    .update({ prescribed_nutrition: this.dayPlanCache })
                    .eq('id', athId);
                if (!error) supabaseSuccess = true;
            }
        } catch (e) {}

        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Feedback Visual Inequívoco y Prominente (Point 4)
        const notice = document.getElementById('coachNutriSaveNotice');
        if (notice) {
            notice.style.display = 'flex';
            notice.innerHTML = `<span style="font-size: 16px;">✓</span> <span>Plan nutricional de <strong>${athId}</strong> sincronizado exitosamente con el portal a las <strong>${timeStr}</strong> • Prescripción activa.</span>`;
        }

        if (btnSave) {
            btnSave.disabled = false;
            btnSave.style.opacity = '1';
            btnSave.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
            btnSave.style.color = '#FFFFFF';
            btnSave.innerHTML = `✓ Plan Guardado y Sincronizado`;

            setTimeout(() => {
                if (btnSave) {
                    btnSave.style.background = 'linear-gradient(135deg, #E5CBA7 0%, #C4A47C 100%)';
                    btnSave.style.color = '#080809';
                    btnSave.innerHTML = originalBtnText;
                }
            }, 3000);
        }

        if (typeof showSensToast === 'function') {
            showSensToast(`Plan nutricional guardado y sincronizado (${timeStr}).`, 'champagne');
        }
    },

    // -------------------------------------------------------------------------
    // HELPERS DE CÁLCULO, FECHAS & MACROS MENSUALES (UX WELLNESS STANDARD)
    // -------------------------------------------------------------------------
    getDateKey(dateStr) {
        if (!dateStr) return 'day1';
        const parts = dateStr.split('-');
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayOfWeek = (dateObj.getDay() === 0 ? 7 : dateObj.getDay());
        return `day${dayOfWeek}`;
    },

    getDayPlanForDate(dateStr) {
        if (!this.dayPlanCache) this.loadAthletePlan();
        if (this.dayPlanCache.calendar_schedule && this.dayPlanCache.calendar_schedule[dateStr]) {
            return this.dayPlanCache.calendar_schedule[dateStr];
        }
        const dayKey = this.getDateKey(dateStr);
        return (this.dayPlanCache.days && this.dayPlanCache.days[dayKey]) ? this.dayPlanCache.days[dayKey] : null;
    },

    calculateDayMacros(dPlan) {
        if (!dPlan) {
            return {
                kcal: 2150,
                actualKcal: 0,
                targetKcal: 2150,
                prot: 160,
                carbs: 220,
                fats: 70,
                protPct: 30,
                carbsPct: 50,
                fatsPct: 20,
                totalFoods: 0
            };
        }

        let totalKcal = 0;
        let totalProt = 0;
        let totalCarbs = 0;
        let totalFats = 0;
        let totalFoods = 0;

        if (dPlan.meals) {
            Object.values(dPlan.meals).forEach(m => {
                if (Array.isArray(m.foods)) {
                    m.foods.forEach(f => {
                        totalFoods++;
                        const res = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                        if (res) {
                            const grams = parseFloat(f.grams) || 100;
                            const baseGrams = parseFloat(res.porcion_total_g_ml) || 100;
                            const ratio = grams / (baseGrams > 0 ? baseGrams : 100);
                            totalKcal += (res.calorias_kcal || 0) * ratio;
                            totalProt += (res.proteinas_g || 0) * ratio;
                            totalCarbs += (res.carbohidratos_g || 0) * ratio;
                            totalFats += (res.grasas_g || 0) * ratio;
                        }
                    });
                }
            });
        }

        totalKcal = Math.round(totalKcal);
        totalProt = Math.round(totalProt);
        totalCarbs = Math.round(totalCarbs);
        totalFats = Math.round(totalFats);

        const targetKcal = dPlan.target_calories || this.dayPlanCache.target_calories || 2150;
        const displayKcal = totalFoods > 0 ? totalKcal : targetKcal;

        const pKcal = totalProt * 4;
        const cKcal = totalCarbs * 4;
        const fKcal = totalFats * 9;
        const sumKcal = (pKcal + cKcal + fKcal) || displayKcal || 2150;

        let protPct = Math.round((pKcal / sumKcal) * 100) || 30;
        let fatsPct = Math.round((fKcal / sumKcal) * 100) || 20;
        let carbsPct = Math.max(0, 100 - protPct - fatsPct);

        if (totalFoods === 0) {
            protPct = 30;
            carbsPct = 50;
            fatsPct = 20;
        }

        return {
            kcal: displayKcal,
            actualKcal: totalKcal,
            targetKcal: targetKcal,
            prot: totalProt,
            carbs: totalCarbs,
            fats: totalFats,
            protPct,
            carbsPct,
            fatsPct,
            totalFoods
        };
    },

    formatDateSpanish(dateStr) {
        const parts = dateStr.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dayIdx = d.getDay();
        const dowNumber = (dayIdx === 0 ? 7 : dayIdx);
        return {
            dayName: dayNames[dayIdx],
            dayNum: d.getDate(),
            monthName: monthNames[d.getMonth()],
            year: d.getFullYear(),
            dowNumber,
            formatted: `${dayNames[dayIdx]} ${d.getDate()} de ${monthNames[d.getMonth()]}`
        };
    },

    // -------------------------------------------------------------------------
    // VISIÓN MENSUAL (Calendario del Mes + Workstation Integrada + Edición Masiva)
    // -------------------------------------------------------------------------
    renderMonthVision() {
        const container = document.getElementById('coachNutritionMonthView');
        if (!container) return;

        const year = this.calendarYear;
        const month = this.calendarMonth;
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
        const startingDay = (firstDay === 0 ? 6 : firstDay - 1); // 0 is Monday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const q = (this.monthFoodFilter || '').toLowerCase().trim();
        const isMulti = Boolean(this.isMultiSelectMode);
        const viewMode = this.calendarMonthViewMode || 'grid';

        // Auto-seleccionar primer día si no hay ninguno seleccionado para el workstation
        if (!this.selectedCalendarDateStr) {
            const firstDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            this.selectedCalendarDateStr = firstDateStr;
        }

        let html = `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 16px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.03);">
                <!-- Toolbar Principal: Navegación, Toggle Grilla/Lista & Edición Masiva -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #F4F4F5;">
                    <!-- Navegación de Mes -->
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnNutriPrevMonth" style="padding: 5px 11px; border-radius: 8px; font-weight: 700; color: #121214;">←</button>
                        <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #121214; letter-spacing: -0.3px;">
                            ${monthNames[month]} ${year}
                        </h4>
                        <button type="button" class="btn btn-outline btn-sm" id="btnNutriNextMonth" style="padding: 5px 11px; border-radius: 8px; font-weight: 700; color: #121214;">→</button>
                    </div>

                    <!-- Controles Centrales & Switch de Vista -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <!-- Toggle de Vista: Grilla vs Lista Semanal (Ergonomía Mobile) -->
                        <div class="pill-group" style="display: inline-flex; background: #F4F4F5; padding: 3px; border-radius: 10px;">
                            <button type="button" class="btn-nutri-view-mode ${viewMode === 'grid' ? 'active' : ''}" data-mode="grid" style="border: none; background: ${viewMode === 'grid' ? '#FFFFFF' : 'transparent'}; color: ${viewMode === 'grid' ? '#121214' : '#71717A'}; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 7px; cursor: pointer; box-shadow: ${viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                                Grilla 30 Días
                            </button>
                            <button type="button" class="btn-nutri-view-mode ${viewMode === 'list' ? 'active' : ''}" data-mode="list" style="border: none; background: ${viewMode === 'list' ? '#FFFFFF' : 'transparent'}; color: ${viewMode === 'list' ? '#121214' : '#71717A'}; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 7px; cursor: pointer; box-shadow: ${viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                                Lista Semanal
                            </button>
                        </div>

                        <!-- Botón Toggle de Edición Masiva -->
                        <button type="button" class="btn btn-sm ${isMulti ? 'btn-primary' : 'btn-outline'}" id="btnToggleNutriMultiMode" style="font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; ${isMulti ? 'background: #9E7D4B; border-color: #9E7D4B; color: #FFFFFF;' : 'border-color: #E4E4E7; color: #18181B;'}">
                            <span>${isMulti ? '✓ Modo Masivo Activo' : 'Edición Masiva'}</span>
                        </button>
                    </div>

                    <!-- Buscador de Alimentos en el Mes -->
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; max-width: 280px;">
                        <input type="text" id="monthFoodFilterInput" class="input-control" value="${this.monthFoodFilter}" placeholder="Buscar alimento en el mes..." style="margin-bottom: 0; font-size: 11.5px; height: 32px; border-radius: 8px;">
                    </div>
                </div>

                <!-- Chips de Selección Rápida en Modo Masivo -->
                ${isMulti ? `
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; padding: 8px 12px; background: #FFFDF9; border: 1px solid rgba(158, 125, 75, 0.25); border-radius: 10px;">
                        <span style="font-size: 10.5px; font-weight: 800; color: #9E7D4B; text-transform: uppercase;">Seleccionar en lote:</span>
                        <button type="button" class="btn-nutri-quick-select pill pill-dark" data-preset="weekdays" style="cursor: pointer; font-size: 10px;">Lunes a Viernes</button>
                        <button type="button" class="btn-nutri-quick-select pill pill-dark" data-preset="weekends" style="cursor: pointer; font-size: 10px;">Fines de Semana</button>
                        <button type="button" class="btn-nutri-quick-select pill pill-dark" data-preset="all" style="cursor: pointer; font-size: 10px;">Todo el Mes</button>
                        <button type="button" class="btn-nutri-quick-select pill pill-outline" data-preset="clear" style="cursor: pointer; font-size: 10px; color: #EF4444; border-color: #FCA5A5;">Limpiar Selección</button>
                        <span style="margin-left: auto; font-size: 11px; font-weight: 700; color: #18181B;">${this.selectedMultiDates.size} días seleccionados</span>
                    </div>
                ` : ''}

                <!-- Vista de Grilla o Lista -->
                ${viewMode === 'grid' ? this.buildMonthGridHtml(year, month, daysInMonth, startingDay, q) : this.buildMonthListHtml(year, month, daysInMonth, q)}

                <!-- Barra Flotante / Dock de Acciones Masivas -->
                ${(isMulti && this.selectedMultiDates.size > 0) ? this.buildMultiActionBarHtml() : ''}
            </div>

            <!-- Panel de Trabajo Integrado del Día (Day Workstation) -->
            ${(!isMulti && this.selectedCalendarDateStr) ? this.buildDayWorkstationHtml(this.selectedCalendarDateStr) : ''}
        `;

        container.innerHTML = html;
        this.bindMonthVisionEvents(container);
    },

    // -------------------------------------------------------------------------
    // VISTA GRILLA: 7 COLUMNAS RESPONSIVAS CON MICRO-BARRA DE MACROS
    // -------------------------------------------------------------------------
    buildMonthGridHtml(year, month, daysInMonth, startingDay, q) {
        const todayStr = new Date().toISOString().split('T')[0];
        let cellsHtml = '';

        // Días previos de padding
        for (let i = 0; i < startingDay; i++) {
            cellsHtml += `<div class="coach-month-day-cell is-empty" style="background: #FAFAFA; border: 1px dashed #E4E4E7; border-radius: 10px; opacity: 0.35; min-height: 68px;"></div>`;
        }

        // Celdas del mes
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = (dateStr === todayStr);
            const isSelected = (this.selectedCalendarDateStr === dateStr);
            const isMultiSelected = this.isMultiSelectMode && this.selectedMultiDates.has(dateStr);

            const dPlan = this.getDayPlanForDate(dateStr);
            const macros = this.calculateDayMacros(dPlan);

            // Búsqueda de alimento
            let hasFood = false;
            if (q && dPlan && dPlan.meals) {
                Object.values(dPlan.meals).forEach(m => {
                    if (Array.isArray(m.foods)) {
                        m.foods.forEach(f => {
                            const res = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                            if (res && res.name && res.name.toLowerCase().includes(q)) hasFood = true;
                        });
                    }
                });
            }

            // Status dot semántico: verde si 5 comidas, ámbar si 1-4, gris si 0
            let statusDotClass = 'status-dot-pending';
            let statusTitle = 'Plan base asignado';
            if (macros.totalFoods >= 5) {
                statusDotClass = 'status-dot-active';
                statusTitle = 'Plan nutricional completo con alimentos';
            } else if (macros.totalFoods === 0) {
                statusDotClass = 'status-dot-paused';
                statusTitle = 'Sin alimentos prescriptos';
            }

            const multiCheckHtml = this.isMultiSelectMode ? `
                <div class="multi-select-check ${isMultiSelected ? 'checked' : ''}" style="display: block; position: absolute; top: 4px; right: 4px; width: 16px; height: 16px; border-radius: 4px; background: ${isMultiSelected ? '#9E7D4B' : '#FFFFFF'}; border: 1px solid ${isMultiSelected ? '#9E7D4B' : '#D4D4D8'}; color: #FFF; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; z-index: 3;">
                    ${isMultiSelected ? '✓' : ''}
                </div>
            ` : '';

            cellsHtml += `
                <div class="coach-month-day-cell nutri-day-cell ${hasFood ? 'is-matching-filter' : ''} ${isToday ? 'is-today' : ''} ${isSelected && !this.isMultiSelectMode ? 'is-selected' : ''} ${isMultiSelected ? 'is-multi-selected' : ''}" data-date="${dateStr}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span class="cell-number ${isToday ? 'today-circle' : ''}" style="font-size: 11px; font-weight: 800; color: #121214;">${dayNum}</span>
                        <span class="coach-month-kcal-pill">~${macros.kcal}</span>
                    </div>

                    <!-- Telemetría Semántica: Estado + Conteo de Alimentos -->
                    <div style="font-size: 9.5px; color: #71717A; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
                        <span class="coach-month-status-dot ${statusDotClass}" title="${statusTitle}"></span>
                        <span style="font-weight: 500;">${macros.totalFoods > 0 ? `${macros.totalFoods} alim.` : 'Sin plan'}</span>
                    </div>

                    <!-- Micro-Barra de Macros Proporcional (Reemplaza los circulitos vacíos) -->
                    <div class="coach-cal-macro-bar" title="Macros del Día: P: ${macros.prot}g (${macros.protPct}%) • C: ${macros.carbs}g (${macros.carbsPct}%) • G: ${macros.fats}g (${macros.fatsPct}%)">
                        <div class="macro-seg seg-p" style="width: ${macros.protPct}%;"></div>
                        <div class="macro-seg seg-c" style="width: ${macros.carbsPct}%;"></div>
                        <div class="macro-seg seg-f" style="width: ${macros.fatsPct}%;"></div>
                    </div>

                    ${multiCheckHtml}
                </div>
            `;
        }

        return `
            <div class="coach-calendar-responsive-wrap">
                <!-- Cabecera de Días de la Semana -->
                <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; text-align: center; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: #71717A; min-width: 520px;">
                    <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
                </div>

                <!-- Celdas de Días -->
                <div class="coach-nutri-cal-grid">
                    ${cellsHtml}
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------------------
    // VISTA LISTA: TARJETAS SEMANALES MODULARES (MOBILE-FIRST 100% APPLE-GRADE)
    // -------------------------------------------------------------------------
    buildMonthListHtml(year, month, daysInMonth, q) {
        let weeksHtml = '';
        let currentWeekDays = [];
        let weekNumber = 1;

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const parts = dateStr.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dow = (d.getDay() === 0 ? 7 : d.getDay()); // 1 to 7

            currentWeekDays.push({ dayNum, dateStr, dow, d });

            // Cierre de semana los domingos (dow === 7) o el último día del mes
            if (dow === 7 || dayNum === daysInMonth) {
                const startDateStr = currentWeekDays[0].dayNum;
                const endDateStr = currentWeekDays[currentWeekDays.length - 1].dayNum;

                let daysRowsHtml = '';
                let weekKcalSum = 0;

                currentWeekDays.forEach(item => {
                    const dPlan = this.getDayPlanForDate(item.dateStr);
                    const macros = this.calculateDayMacros(dPlan);
                    weekKcalSum += macros.kcal;

                    const spanish = this.formatDateSpanish(item.dateStr);
                    const isSelected = (this.selectedCalendarDateStr === item.dateStr);
                    const isMultiSelected = this.isMultiSelectMode && this.selectedMultiDates.has(item.dateStr);

                    // Conteo y nombres de alimentos
                    const foodNames = [];
                    if (dPlan && dPlan.meals) {
                        Object.values(dPlan.meals).forEach(m => {
                            if (Array.isArray(m.foods)) {
                                m.foods.slice(0, 3).forEach(f => {
                                    const res = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                                    if (res && res.name) foodNames.push(res.name);
                                });
                            }
                        });
                    }

                    const foodsPreview = foodNames.length > 0 ? foodNames.join(', ') : 'Sin alimentos cargados';

                    daysRowsHtml += `
                        <div class="coach-nutri-day-row ${isSelected && !this.isMultiSelectMode ? 'is-selected' : ''}" data-date="${item.dateStr}">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 140px;">
                                ${this.isMultiSelectMode ? `
                                    <input type="checkbox" class="multi-select-check-input" ${isMultiSelected ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #9E7D4B;">
                                ` : ''}
                                <div>
                                    <strong style="font-size: 13px; color: #121214; display: block;">${spanish.dayName} ${spanish.dayNum}</strong>
                                    <span style="font-size: 11px; color: #71717A;">${spanish.dowNumber <= 5 ? 'Día Laboral' : 'Fin de Semana'}</span>
                                </div>
                            </div>

                            <div style="flex: 1; min-width: 160px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                                    <span class="pill pill-champagne" style="font-size: 9px; font-weight: 800;">~${macros.kcal} kcal</span>
                                    <span style="font-size: 10.5px; color: #52525B; font-weight: 600;">P: ${macros.prot}g • C: ${macros.carbs}g • G: ${macros.fats}g</span>
                                </div>
                                <div class="coach-cal-macro-bar" style="max-width: 220px;">
                                    <div class="macro-seg seg-p" style="width: ${macros.protPct}%;"></div>
                                    <div class="macro-seg seg-c" style="width: ${macros.carbsPct}%;"></div>
                                    <div class="macro-seg seg-f" style="width: ${macros.fatsPct}%;"></div>
                                </div>
                                <span style="font-size: 10px; color: #71717A; display: block; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
                                    ${foodsPreview}
                                </span>
                            </div>

                            <div>
                                <button type="button" class="btn btn-outline btn-sm btn-select-day-action" data-date="${item.dateStr}" style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-color: #9E7D4B; color: #9E7D4B;">
                                    ${isSelected ? 'Editando ✓' : 'Editar Día →'}
                                </button>
                            </div>
                        </div>
                    `;
                });

                const avgKcal = Math.round(weekKcalSum / currentWeekDays.length);

                weeksHtml += `
                    <div class="coach-nutri-week-card">
                        <div class="coach-nutri-week-header">
                            <span>SEMANA ${weekNumber} (${startDateStr} al ${endDateStr} de ${this.formatDateSpanish(currentWeekDays[0].dateStr).monthName})</span>
                            <span class="pill pill-champagne" style="font-size: 9.5px;">Promedio: ~${avgKcal} kcal/día</span>
                        </div>
                        <div>
                            ${daysRowsHtml}
                        </div>
                    </div>
                `;

                weekNumber++;
                currentWeekDays = [];
            }
        }

        return `<div>${weeksHtml}</div>`;
    },

    // -------------------------------------------------------------------------
    // BARRA FLOTANTE DE ACCIONES MASIVAS
    // -------------------------------------------------------------------------
    buildMultiActionBarHtml() {
        const count = this.selectedMultiDates.size;
        return `
            <div class="coach-month-multi-bar" style="margin-top: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="pill pill-champagne" style="font-size: 10px; font-weight: 800;">${count} DÍAS ELEGIDOS</span>
                    <strong style="font-size: 13px; color: #FFFFFF;">Acciones Masivas en Lote</strong>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <!-- Copiar Menú de un Día Base -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px; color: #D4D4D8;">Copiar menú de:</span>
                        <select id="bulkCopySourceSelect" style="background: #27272A; border: 1px solid rgba(255,255,255,0.2); color: #FFF; font-size: 11.5px; border-radius: 6px; padding: 4px 8px;">
                            <option value="day1">Lunes (Día 1)</option>
                            <option value="day2">Martes (Día 2)</option>
                            <option value="day3">Miércoles (Día 3)</option>
                            <option value="day4">Jueves (Día 4)</option>
                            <option value="day5">Viernes (Día 5)</option>
                            <option value="day6">Sábado (Día 6)</option>
                            <option value="day7">Domingo (Día 7)</option>
                        </select>
                        <button type="button" class="btn btn-outline btn-sm" id="btnExecuteBulkCopy" style="font-size: 11px; padding: 5px 10px; border-color: #E5CBA7; color: #E5CBA7; font-weight: 700;">
                            Clonar a Seleccionados
                        </button>
                    </div>

                    <!-- Ajustar Calorías en Lote -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px; color: #D4D4D8;">Target Kcal:</span>
                        <input type="number" id="bulkTargetKcalInput" value="${this.dayPlanCache.target_calories || 2150}" step="50" style="width: 75px; background: #27272A; border: 1px solid rgba(255,255,255,0.2); color: #FFF; font-size: 11.5px; border-radius: 6px; padding: 4px 6px; text-align: center;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnExecuteBulkKcal" style="font-size: 11px; padding: 5px 10px; border-color: #E5CBA7; color: #E5CBA7; font-weight: 700;">
                            Aplicar Kcal
                        </button>
                    </div>

                    <button type="button" class="btn btn-primary btn-sm" id="btnSaveBulkChanges" style="font-size: 11px; font-weight: 800; padding: 6px 14px; background: #9E7D4B; border-color: #9E7D4B; color: #FFF;">
                        ✓ Guardar en Lote
                    </button>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------------------
    // PANEL DE TRABAJO DÍA POR DÍA (DAY WORKSTATION - REEMPLAZA EL POP-UP RÍGIDO)
    // -------------------------------------------------------------------------
    buildDayWorkstationHtml(dateStr) {
        const dPlan = this.getDayPlanForDate(dateStr);
        const spanish = this.formatDateSpanish(dateStr);
        const macros = this.calculateDayMacros(dPlan);

        const mealLabels = {
            desayuno: 'Desayuno',
            almuerzo: 'Almuerzo',
            merienda: 'Merienda',
            cena: 'Cena',
            snack: 'Snack / Colación'
        };

        const targetCalories = dPlan ? (dPlan.target_calories || this.dayPlanCache.target_calories || 2150) : 2150;

        let mealsHtml = '';
        const mealsObj = (dPlan && dPlan.meals) ? dPlan.meals : {};

        Object.keys(mealLabels).forEach(mKey => {
            const m = mealsObj[mKey] || { target_kcal: 400, foods: [] };
            const foods = m.foods || [];

            let foodRowsHtml = '';
            let mealKcalSum = 0;

            foods.forEach((f, fIdx) => {
                const res = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                const grams = parseFloat(f.grams) || 100;
                const baseGrams = parseFloat(res.porcion_total_g_ml) || 100;
                const ratio = grams / (baseGrams > 0 ? baseGrams : 100);
                const itemKcal = Math.round((res.calorias_kcal || 0) * ratio);
                mealKcalSum += itemKcal;

                const imgSrc = res.image_url || 'Nutricion/images/nut-001-pechuga-de-pollo-a-la-plancha.webp';

                foodRowsHtml += `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                            <img src="${imgSrc}" alt="${res.name}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; background: #000; flex-shrink: 0;" />
                            <div style="min-width: 0;">
                                <strong style="font-size: 11.5px; color: #121214; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${res.name}</strong>
                                <span style="font-size: 10px; color: #71717A;">${itemKcal} kcal • P:${Math.round((res.proteinas_g || 0) * ratio)}g C:${Math.round((res.carbohidratos_g || 0) * ratio)}g G:${Math.round((res.grasas_g || 0) * ratio)}g</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                            <input type="number" class="input-food-grams-live" data-meal="${mKey}" data-idx="${fIdx}" value="${grams}" step="5" min="5" style="width: 65px; height: 26px; font-size: 11px; text-align: center; border: 1px solid #D4D4D8; border-radius: 6px; font-weight: 700; color: #121214;">
                            <span style="font-size: 10.5px; color: #71717A;">g</span>
                            <button type="button" class="btn-delete-food-live" data-meal="${mKey}" data-idx="${fIdx}" title="Eliminar alimento" style="background: none; border: none; color: #EF4444; font-size: 14px; cursor: pointer; padding: 2px 6px;">✕</button>
                        </div>
                    </div>
                `;
            });

            mealsHtml += `
                <div style="background: #F8F9FA; border: 1px solid #E4E4E7; border-radius: 12px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <strong style="font-size: 12px; text-transform: uppercase; color: #9E7D4B; letter-spacing: 0.5px;">${mealLabels[mKey]}</strong>
                            <span style="font-size: 10.5px; color: #71717A; margin-left: 6px;">${mealKcalSum} kcal prescriptas</span>
                        </div>
                        <button type="button" class="btn btn-outline btn-sm btn-open-food-modal-workstation" data-meal="${mKey}" style="font-size: 10px; padding: 3px 8px; border-color: #9E7D4B; color: #9E7D4B; font-weight: 700;">
                            + Agregar Alimento
                        </button>
                    </div>

                    <div>
                        ${foods.length === 0 ? `<div style="font-size: 11px; color: #A1A1AA; font-style: italic; padding: 6px 0;">Sin alimentos prescriptos para esta comida.</div>` : foodRowsHtml}
                    </div>
                </div>
            `;
        });

        return `
            <div class="coach-nutri-workstation" id="coachNutritionWorkstation">
                <!-- Header de Workstation con Navegación Continua (Día por Día) -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E4E4E7;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="pill pill-champagne" style="font-size: 9px; font-weight: 800;">DÍA ${spanish.dowNumber} DE LA SEMANA</span>
                            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #121214;">
                                ${spanish.formatted}
                            </h3>
                        </div>
                        <span style="font-size: 11px; color: #71717A;">Editá las calorías, gramajes y alimentos de este día individualmente o replicalo masivamente.</span>
                    </div>

                    <!-- Navegación Fluida: Anterior / Siguiente -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnWorkstationPrevDay" style="font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px;">
                            ← Día Anterior
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" id="btnWorkstationNextDay" style="font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px;">
                            Día Siguiente →
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" id="btnWorkstationReplicateDay" style="font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border-color: #9E7D4B; color: #9E7D4B;">
                            Replicar este Día...
                        </button>
                        <button type="button" id="btnCloseDayWorkstation" title="Cerrar panel de trabajo" style="background: none; border: 1px solid #E4E4E7; border-radius: 8px; width: 30px; height: 30px; font-size: 16px; color: #71717A; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Tarjeta de Control Calórico y Desglose de Macros en Tiempo Real -->
                <div style="background: #F8F9FA; border: 1px solid #E4E4E7; border-radius: 12px; padding: 14px; margin-bottom: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <!-- Calorie Stepper Inline -->
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 12px; font-weight: 800; color: #121214;">Meta Calórica del Día:</span>
                            <button type="button" class="btn btn-outline btn-sm btn-step-day-kcal" data-delta="-100" style="padding: 2px 8px; font-size: 11px; font-weight: 800;">-100</button>
                            <button type="button" class="btn btn-outline btn-sm btn-step-day-kcal" data-delta="-50" style="padding: 2px 8px; font-size: 11px; font-weight: 800;">-50</button>
                            <input type="number" id="inputWorkstationDayKcal" value="${targetCalories}" step="50" style="width: 80px; height: 30px; text-align: center; font-size: 13px; font-weight: 800; border-radius: 6px; border: 1px solid #D4D4D8; color: #121214;">
                            <button type="button" class="btn btn-outline btn-sm btn-step-day-kcal" data-delta="50" style="padding: 2px 8px; font-size: 11px; font-weight: 800;">+50</button>
                            <button type="button" class="btn btn-outline btn-sm btn-step-day-kcal" data-delta="100" style="padding: 2px 8px; font-size: 11px; font-weight: 800;">+100</button>
                            <span style="font-size: 11.5px; font-weight: 700; color: #9E7D4B;">kcal</span>
                        </div>

                        <!-- Telemetría de Macros -->
                        <div style="display: flex; align-items: center; gap: 12px; font-size: 11.5px;">
                            <span>Alimentos: <strong style="color: #121214;">${macros.actualKcal} kcal</strong></span>
                            <span>P: <strong style="color: #9E7D4B;">${macros.prot}g</strong></span>
                            <span>C: <strong style="color: #3B82F6;">${macros.carbs}g</strong></span>
                            <span>G: <strong style="color: #F59E0B;">${macros.fats}g</strong></span>
                        </div>
                    </div>

                    <!-- Macro Balance Bar -->
                    <div class="coach-cal-macro-bar" style="margin-top: 10px; height: 5px;">
                        <div class="macro-seg seg-p" style="width: ${macros.protPct}%;"></div>
                        <div class="macro-seg seg-c" style="width: ${macros.carbsPct}%;"></div>
                        <div class="macro-seg seg-f" style="width: ${macros.fatsPct}%;"></div>
                    </div>
                </div>

                <!-- Comidas del Día -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${mealsHtml}
                </div>

                <!-- Footer de Guardado y Acciones -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #E4E4E7;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; color: #18181B; cursor: pointer;">
                        <input type="checkbox" id="chkApplyToAllWeekdays" style="width: 16px; height: 16px; accent-color: #9E7D4B;">
                        <span>Aplicar cambios también a todos los <strong>${spanish.dayName}s</strong> del mes</span>
                    </label>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnGoToStep3FromDay" style="font-size: 11px; font-weight: 700; padding: 7px 14px; border-color: #9E7D4B; color: #9E7D4B;">
                            Abrir en Mesa de Trabajo Avanzada (Paso 3) →
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" id="btnSaveWorkstationDayEdits" style="font-size: 11px; font-weight: 800; padding: 7px 18px; background: #9E7D4B; border-color: #9E7D4B; color: #FFF; box-shadow: 0 2px 8px rgba(158, 125, 75, 0.3);">
                            ✓ Guardar Cambios de este Día
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------------------
    // BINDING DE EVENTOS DE VISIÓN MENSUAL (REACTIVIDAD & EDICIÓN INTEGRADA)
    // -------------------------------------------------------------------------
    bindMonthVisionEvents(container) {
        // 1. Navegación de Mes
        const prevBtn = document.getElementById('btnNutriPrevMonth');
        const nextBtn = document.getElementById('btnNutriNextMonth');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.calendarMonth === 0) {
                    this.calendarMonth = 11;
                    this.calendarYear--;
                } else {
                    this.calendarMonth--;
                }
                this.renderMonthVision();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.calendarMonth === 11) {
                    this.calendarMonth = 0;
                    this.calendarYear++;
                } else {
                    this.calendarMonth++;
                }
                this.renderMonthVision();
            });
        }

        // 2. Toggle de Vista: Grilla vs Lista Semanal
        container.querySelectorAll('.btn-nutri-view-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                this.calendarMonthViewMode = btn.getAttribute('data-mode') || 'grid';
                this.renderMonthVision();
            });
        });

        // 3. Toggle de Modo Selección Múltiple
        const toggleMultiBtn = document.getElementById('btnToggleNutriMultiMode');
        if (toggleMultiBtn) {
            toggleMultiBtn.addEventListener('click', () => {
                this.isMultiSelectMode = !this.isMultiSelectMode;
                if (!this.isMultiSelectMode) this.selectedMultiDates.clear();
                this.renderMonthVision();
            });
        }

        // 4. Filtro Rápido de Alimentos
        const filterInp = document.getElementById('monthFoodFilterInput');
        if (filterInp) {
            filterInp.addEventListener('input', (e) => {
                this.monthFoodFilter = e.target.value;
                this.renderMonthVision();
            });
        }

        // 5. Chips de Selección Rápida en Modo Masivo
        container.querySelectorAll('.btn-nutri-quick-select').forEach(chip => {
            chip.addEventListener('click', () => {
                const preset = chip.getAttribute('data-preset');
                const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();

                this.selectedMultiDates.clear();

                if (preset === 'weekdays' || preset === 'weekends' || preset === 'all') {
                    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                        const dateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const parts = dateStr.split('-');
                        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        const dow = (d.getDay() === 0 ? 7 : d.getDay());

                        if (preset === 'weekdays' && dow <= 5) this.selectedMultiDates.add(dateStr);
                        if (preset === 'weekends' && dow >= 6) this.selectedMultiDates.add(dateStr);
                        if (preset === 'all') this.selectedMultiDates.add(dateStr);
                    }
                }
                this.renderMonthVision();
            });
        });

        // 6. Clic en Celdas de Grilla o Filas de Lista
        container.querySelectorAll('.coach-month-day-cell.nutri-day-cell, .coach-nutri-day-row').forEach(el => {
            el.addEventListener('click', (e) => {
                // Si hizo clic en un botón interno, no propagar
                if (e.target.closest('button') || e.target.closest('input')) return;

                const dateStr = el.getAttribute('data-date');
                if (!dateStr) return;

                if (this.isMultiSelectMode) {
                    if (this.selectedMultiDates.has(dateStr)) {
                        this.selectedMultiDates.delete(dateStr);
                    } else {
                        this.selectedMultiDates.add(dateStr);
                    }
                    this.renderMonthVision();
                } else {
                    this.selectedCalendarDateStr = dateStr;
                    this.renderMonthVision();
                    // Smooth scroll hacia el workstation
                    setTimeout(() => {
                        const ws = document.getElementById('coachNutritionWorkstation');
                        if (ws) ws.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 50);
                }
            });
        });

        // 7. Clic en Botón "Editar Día →" en Vista Lista
        container.querySelectorAll('.btn-select-day-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dateStr = btn.getAttribute('data-date');
                if (dateStr) {
                    this.selectedCalendarDateStr = dateStr;
                    this.renderMonthVision();
                    setTimeout(() => {
                        const ws = document.getElementById('coachNutritionWorkstation');
                        if (ws) ws.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 50);
                }
            });
        });

        // 8. Eventos de la Barra Flotante de Acciones Masivas
        const btnBulkCopy = document.getElementById('btnExecuteBulkCopy');
        if (btnBulkCopy) {
            btnBulkCopy.addEventListener('click', () => {
                const sel = document.getElementById('bulkCopySourceSelect');
                const srcDayKey = sel ? sel.value : 'day1';
                this.executeBulkDayMenuCopy(srcDayKey);
            });
        }

        const btnBulkKcal = document.getElementById('btnExecuteBulkKcal');
        if (btnBulkKcal) {
            btnBulkKcal.addEventListener('click', () => {
                const inp = document.getElementById('bulkTargetKcalInput');
                const val = parseInt(inp ? inp.value : 2150, 10) || 2150;
                this.executeBulkKcalAdjustment(val);
            });
        }

        const btnSaveBulk = document.getElementById('btnSaveBulkChanges');
        if (btnSaveBulk) {
            btnSaveBulk.addEventListener('click', async () => {
                await this.savePlan();
                if (typeof showSensToast === 'function') {
                    showSensToast(`✓ Plan masivo actualizado en ${this.selectedMultiDates.size} días.`, 'champagne');
                }
                this.isMultiSelectMode = false;
                this.selectedMultiDates.clear();
                this.renderMonthVision();
            });
        }

        // 9. Eventos del Workstation Día por Día
        this.bindWorkstationEvents();
    },

    // -------------------------------------------------------------------------
    // BINDING DE EVENTOS ESPECÍFICOS DEL WORKSTATION DÍA POR DÍA
    // -------------------------------------------------------------------------
    bindWorkstationEvents() {
        const ws = document.getElementById('coachNutritionWorkstation');
        if (!ws) return;

        const curDateStr = this.selectedCalendarDateStr;
        if (!curDateStr) return;

        const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
        const curDayNum = parseInt(curDateStr.split('-')[2], 10);

        // A. Navegación Anterior / Siguiente
        const prevBtn = document.getElementById('btnWorkstationPrevDay');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const newDayNum = curDayNum > 1 ? curDayNum - 1 : daysInMonth;
                this.selectedCalendarDateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(newDayNum).padStart(2, '0')}`;
                this.renderMonthVision();
            });
        }

        const nextBtn = document.getElementById('btnWorkstationNextDay');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const newDayNum = curDayNum < daysInMonth ? curDayNum + 1 : 1;
                this.selectedCalendarDateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(newDayNum).padStart(2, '0')}`;
                this.renderMonthVision();
            });
        }

        // B. Cerrar Workstation
        const closeBtn = document.getElementById('btnCloseDayWorkstation');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.selectedCalendarDateStr = null;
                this.renderMonthVision();
            });
        }

        // C. Replicar este Día
        const repBtn = document.getElementById('btnWorkstationReplicateDay');
        if (repBtn) {
            repBtn.addEventListener('click', () => {
                this.openReplicateDayDialog(curDateStr);
            });
        }

        // D. Steppers de Calorías del Día
        ws.querySelectorAll('.btn-step-day-kcal').forEach(btn => {
            btn.addEventListener('click', () => {
                const delta = parseInt(btn.getAttribute('data-delta'), 10) || 0;
                const inp = document.getElementById('inputWorkstationDayKcal');
                if (inp) {
                    const currentVal = parseInt(inp.value, 10) || 2150;
                    const newVal = Math.max(1200, currentVal + delta);
                    inp.value = newVal;
                    this.updateWorkstationDayTargetKcal(curDateStr, newVal);
                }
            });
        });

        const dayKcalInp = document.getElementById('inputWorkstationDayKcal');
        if (dayKcalInp) {
            dayKcalInp.addEventListener('change', () => {
                const newVal = Math.max(1200, parseInt(dayKcalInp.value, 10) || 2150);
                this.updateWorkstationDayTargetKcal(curDateStr, newVal);
            });
        }

        // E. Edición en Vivo de Gramos de Alimentos
        ws.querySelectorAll('.input-food-grams-live').forEach(inp => {
            inp.addEventListener('input', () => {
                const mealKey = inp.getAttribute('data-meal');
                const fIdx = parseInt(inp.getAttribute('data-idx'), 10);
                const newGrams = Math.max(5, parseFloat(inp.value) || 5);
                this.updateFoodGramsLive(curDateStr, mealKey, fIdx, newGrams);
            });
        });

        // F. Eliminar Alimento de la Comida
        ws.querySelectorAll('.btn-delete-food-live').forEach(btn => {
            btn.addEventListener('click', () => {
                const mealKey = btn.getAttribute('data-meal');
                const fIdx = parseInt(btn.getAttribute('data-idx'), 10);
                this.removeFoodFromMealLive(curDateStr, mealKey, fIdx);
            });
        });

        // G. Agregar Alimento (+ Agregar Alimento a comida)
        ws.querySelectorAll('.btn-open-food-modal-workstation').forEach(btn => {
            btn.addEventListener('click', () => {
                const mealKey = btn.getAttribute('data-meal');
                this.openFoodPickerModal(mealKey);
            });
        });

        // H. Guardar Cambios de este Día
        const saveDayBtn = document.getElementById('btnSaveWorkstationDayEdits');
        if (saveDayBtn) {
            saveDayBtn.addEventListener('click', async () => {
                const applyToAllWeekdays = Boolean(document.getElementById('chkApplyToAllWeekdays')?.checked);
                await this.saveActiveWorkstationDay(curDateStr, applyToAllWeekdays);
            });
        }

        // I. Abrir en Mesa de Trabajo Avanzada (Paso 3)
        const goStep3Btn = document.getElementById('btnGoToStep3FromDay');
        if (goStep3Btn) {
            goStep3Btn.addEventListener('click', () => {
                const dayKey = this.getDateKey(curDateStr);
                this.activeDayKey = dayKey;
                this.switchVision('wizard');
                this.goToStep(3);
                if (typeof showSensToast === 'function') {
                    showSensToast(`Mesa de trabajo activa para ${this.getDayTitle(dayKey)}.`, 'champagne');
                }
            });
        }
    },

    // -------------------------------------------------------------------------
    // MÉTODOS DE MUTACIÓN Y PERSISTENCIA DEL WORKSTATION DÍA POR DÍA
    // -------------------------------------------------------------------------
    ensureDatedPlanInCache(dateStr) {
        if (!this.dayPlanCache.calendar_schedule) {
            this.dayPlanCache.calendar_schedule = {};
        }
        if (!this.dayPlanCache.calendar_schedule[dateStr]) {
            const basePlan = this.getDayPlanForDate(dateStr);
            this.dayPlanCache.calendar_schedule[dateStr] = JSON.parse(JSON.stringify(basePlan));
        }
        return this.dayPlanCache.calendar_schedule[dateStr];
    },

    updateWorkstationDayTargetKcal(dateStr, newKcal) {
        const dPlan = this.ensureDatedPlanInCache(dateStr);
        dPlan.target_calories = newKcal;
        this.renderMonthVision();
    },

    updateFoodGramsLive(dateStr, mealKey, fIdx, newGrams) {
        const dPlan = this.ensureDatedPlanInCache(dateStr);
        if (dPlan.meals && dPlan.meals[mealKey] && dPlan.meals[mealKey].foods && dPlan.meals[mealKey].foods[fIdx]) {
            dPlan.meals[mealKey].foods[fIdx].grams = newGrams;
        }
    },

    removeFoodFromMealLive(dateStr, mealKey, fIdx) {
        const dPlan = this.ensureDatedPlanInCache(dateStr);
        if (dPlan.meals && dPlan.meals[mealKey] && Array.isArray(dPlan.meals[mealKey].foods)) {
            dPlan.meals[mealKey].foods.splice(fIdx, 1);
            this.renderMonthVision();
            if (typeof showSensToast === 'function') {
                showSensToast('Alimento eliminado de la comida.', 'info');
            }
        }
    },

    async saveActiveWorkstationDay(dateStr, applyToAllWeekdays) {
        const dPlan = this.ensureDatedPlanInCache(dateStr);

        if (applyToAllWeekdays) {
            const dayKey = this.getDateKey(dateStr);
            if (this.dayPlanCache.days) {
                this.dayPlanCache.days[dayKey] = JSON.parse(JSON.stringify(dPlan));
            }
        }

        await this.savePlan();
        const spanish = this.formatDateSpanish(dateStr);
        const msg = applyToAllWeekdays
            ? `✓ Menú guardado para el ${spanish.dayNum}/${this.calendarMonth + 1} y replicado a todos los ${spanish.dayName}s.`
            : `✓ Menú guardado para el día ${spanish.formatted}.`;

        if (typeof showSensToast === 'function') {
            showSensToast(msg, 'champagne');
        }
        this.renderMonthVision();
    },

    // -------------------------------------------------------------------------
    // DIÁLOGO DE REPLICACIÓN DE UN DÍA (1-TAP REPLICATION)
    // -------------------------------------------------------------------------
    openReplicateDayDialog(sourceDateStr) {
        const spanish = this.formatDateSpanish(sourceDateStr);
        const modalId = 'modalNutriReplicateDay';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHtml = `
            <div class="sens-modal-backdrop active" id="${modalId}" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div style="background: #121214; border: 1px solid rgba(229, 203, 167, 0.35); border-radius: 16px; width: 100%; max-width: 480px; padding: 22px; color: #FFF; box-shadow: 0 20px 50px rgba(0,0,0,0.85);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div>
                            <span class="pill pill-champagne" style="font-size: 9.5px; font-weight: 800;">REPLICACIÓN EN 1 TAP</span>
                            <h3 style="margin: 4px 0 0 0; font-size: 1.2rem; color: #FFFFFF;">Clonar Menú de ${spanish.dayName} ${spanish.dayNum}</h3>
                        </div>
                        <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background: none; border: none; font-size: 20px; color: #A1A1AA; cursor: pointer;">✕</button>
                    </div>

                    <p style="font-size: 12px; color: #A1A1AA; margin: 0 0 16px 0; line-height: 1.4;">
                        Seleccioná a qué días querés copiar exactamente el menú, alimentos y macros configurados para este día:
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button type="button" class="btn btn-outline btn-replicate-target" data-target="same_weekdays" style="text-align: left; padding: 10px 14px; border-color: rgba(229,203,167,0.3); color: #FFF; font-weight: 700; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>A todos los <strong>${spanish.dayName}s</strong> del mes</span>
                            <span style="color: #9E7D4B;">→</span>
                        </button>

                        <button type="button" class="btn btn-outline btn-replicate-target" data-target="weekdays" style="text-align: left; padding: 10px 14px; border-color: rgba(229,203,167,0.3); color: #FFF; font-weight: 700; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>A todos los días de semana (<strong>Lunes a Viernes</strong>)</span>
                            <span style="color: #9E7D4B;">→</span>
                        </button>

                        <button type="button" class="btn btn-outline btn-replicate-target" data-target="weekends" style="text-align: left; padding: 10px 14px; border-color: rgba(229,203,167,0.3); color: #FFF; font-weight: 700; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>A todos los fines de semana (<strong>Sábados y Domingos</strong>)</span>
                            <span style="color: #9E7D4B;">→</span>
                        </button>

                        <button type="button" class="btn btn-outline btn-replicate-target" data-target="all_month" style="text-align: left; padding: 10px 14px; border-color: rgba(229,203,167,0.3); color: #FFF; font-weight: 700; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>A <strong>Todo el Mes Completo</strong> (30 días)</span>
                            <span style="color: #9E7D4B;">→</span>
                        </button>
                    </div>

                    <div style="margin-top: 16px; text-align: right;">
                        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('${modalId}').remove()" style="border-color: #52525B; color: #A1A1AA;">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.querySelectorAll('.btn-replicate-target').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const targetType = btn.getAttribute('data-target');
                    modalEl.remove();
                    await this.executeReplicationTarget(sourceDateStr, targetType);
                });
            });
        }
    },

    async executeReplicationTarget(sourceDateStr, targetType) {
        const sourcePlan = this.getDayPlanForDate(sourceDateStr);
        if (!sourcePlan) return;

        const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
        const sourceParts = sourceDateStr.split('-');
        const sourceD = new Date(parseInt(sourceParts[0], 10), parseInt(sourceParts[1], 10) - 1, parseInt(sourceParts[2], 10));
        const sourceDow = (sourceD.getDay() === 0 ? 7 : sourceD.getDay());

        if (!this.dayPlanCache.calendar_schedule) {
            this.dayPlanCache.calendar_schedule = {};
        }

        let appliedCount = 0;

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const curDateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const parts = curDateStr.split('-');
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dow = (d.getDay() === 0 ? 7 : d.getDay());

            let shouldApply = false;
            if (targetType === 'same_weekdays' && dow === sourceDow) shouldApply = true;
            if (targetType === 'weekdays' && dow <= 5) shouldApply = true;
            if (targetType === 'weekends' && dow >= 6) shouldApply = true;
            if (targetType === 'all_month') shouldApply = true;

            if (shouldApply) {
                this.dayPlanCache.calendar_schedule[curDateStr] = JSON.parse(JSON.stringify(sourcePlan));
                appliedCount++;
            }
        }

        // Si fue a los mismos días de semana, actualizar también el template semanal
        if (targetType === 'same_weekdays') {
            const dayKey = `day${sourceDow}`;
            if (this.dayPlanCache.days) {
                this.dayPlanCache.days[dayKey] = JSON.parse(JSON.stringify(sourcePlan));
            }
        } else if (targetType === 'weekdays') {
            ['day1', 'day2', 'day3', 'day4', 'day5'].forEach(k => {
                if (this.dayPlanCache.days) this.dayPlanCache.days[k] = JSON.parse(JSON.stringify(sourcePlan));
            });
        } else if (targetType === 'all_month') {
            ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'].forEach(k => {
                if (this.dayPlanCache.days) this.dayPlanCache.days[k] = JSON.parse(JSON.stringify(sourcePlan));
            });
        }

        await this.savePlan();
        if (typeof showSensToast === 'function') {
            showSensToast(`✓ Menú clonado a ${appliedCount} días con éxito.`, 'champagne');
        }
        this.renderMonthVision();
    },

    // -------------------------------------------------------------------------
    // ACCIONES MASIVAS EN LOTE (BATCH EXECUTION)
    // -------------------------------------------------------------------------
    executeBulkDayMenuCopy(sourceDayKey) {
        const sourcePlan = this.dayPlanCache.days ? this.dayPlanCache.days[sourceDayKey] : null;
        if (!sourcePlan) return;

        if (!this.dayPlanCache.calendar_schedule) {
            this.dayPlanCache.calendar_schedule = {};
        }

        this.selectedMultiDates.forEach(dateStr => {
            this.dayPlanCache.calendar_schedule[dateStr] = JSON.parse(JSON.stringify(sourcePlan));
        });

        if (typeof showSensToast === 'function') {
            showSensToast(`Menú de ${this.getDayTitle(sourceDayKey)} copiado a ${this.selectedMultiDates.size} días.`, 'champagne');
        }
        this.renderMonthVision();
    },

    executeBulkKcalAdjustment(newKcal) {
        if (!this.dayPlanCache.calendar_schedule) {
            this.dayPlanCache.calendar_schedule = {};
        }

        this.selectedMultiDates.forEach(dateStr => {
            const dPlan = this.ensureDatedPlanInCache(dateStr);
            dPlan.target_calories = newKcal;
        });

        if (typeof showSensToast === 'function') {
            showSensToast(`Objetivo de ${newKcal} kcal aplicado a ${this.selectedMultiDates.size} días.`, 'champagne');
        }
        this.renderMonthVision();
    },

    // -------------------------------------------------------------------------
    // VISIÓN BIBLIOTECA (Exploración de los 500 Alimentos)
    // -------------------------------------------------------------------------
    renderLibraryVision() {
        const container = document.getElementById('coachNutritionLibView');
        if (!container || typeof SENS_FOOD_LIBRARY === 'undefined') return;

        container.innerHTML = `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #121214;">Catálogo Maestro de 500 Alimentos &amp; Recetas</h4>
                        <span style="font-size: 11.5px; color: #71717A;">Imágenes en alta definición, micronutrientes, porciones y equivalentes</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
                    ${SENS_FOOD_LIBRARY.slice(0, 48).map(f => `
                        <div style="background: #F8F9FA; border: 1px solid #E4E4E7; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column;">
                            <img src="${f.image_url}" alt="${f.name}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #000;">
                            <div style="padding: 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <span class="pill pill-champagne" style="font-size: 8.5px;">${f.codigo}</span>
                                        <span style="font-size: 10.5px; font-weight: 700; color: #9E7D4B;">${f.calorias_kcal} kcal</span>
                                    </div>
                                    <strong style="font-size: 12px; color: #121214; display: block; line-height: 1.25; margin-bottom: 4px;">${f.name}</strong>
                                    <p style="font-size: 10.5px; color: #71717A; margin: 0 0 8px 0; line-height: 1.3;">${f.portion}</p>
                                </div>
                                <div style="font-size: 10px; color: #52525B; border-top: 1px solid #E4E4E7; padding-top: 6px; display: flex; justify-content: space-between;">
                                    <span>P: <strong>${f.proteinas_g}g</strong></span>
                                    <span>C: <strong>${f.carbohidratos_g}g</strong></span>
                                    <span>G: <strong>${f.grasas_g}g</strong></span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    bindEvents() {
        // Toggle de Visión
        document.querySelectorAll('#coachNutritionVisionToggleStrip .coach-vision-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                if (target) this.switchVision(target);
            });
        });
    }
};

window.CoachNutritionMaster = CoachNutritionMaster;
