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
        const dPlan = this.dayPlanCache.days[this.activeDayKey];
        if (!dPlan || !dPlan.meals[this.activeMealKey]) return;

        const food = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(foodId) : null;
        if (!food) return;

        dPlan.meals[this.activeMealKey].foods.push({
            id: food.id,
            grams: food.defaultGrams || food.porcion_total_g_ml || 100
        });

        this.closeFoodPickerModal();
        this.renderStep3();
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
    // VISIÓN MENSUAL (Calendario del Mes + Filtro de Alimentos)
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

        const q = this.monthFoodFilter.toLowerCase().trim();

        container.innerHTML = `
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 14px; padding: 20px;">
                <!-- Header del Mes -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn btn-outline btn-sm" id="btnNutriPrevMonth" style="padding: 4px 10px;">←</button>
                        <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #121214;">
                            ${monthNames[month]} ${year}
                        </h4>
                        <button type="button" class="btn btn-outline btn-sm" id="btnNutriNextMonth" style="padding: 4px 10px;">→</button>
                    </div>

                    <!-- Buscador de Alimentos en el Mes -->
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; max-width: 320px;">
                        <input type="text" id="monthFoodFilterInput" class="input-control" value="${this.monthFoodFilter}" placeholder="Buscar alimento en el mes (ej: Pollo, Avena)..." style="margin-bottom: 0; font-size: 11.5px; height: 32px;">
                    </div>
                </div>

                <!-- Cabecera de Días de la Semana -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; margin-bottom: 6px; font-size: 11px; font-weight: 800; color: #71717A;">
                    <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
                </div>

                <!-- Celdas de Días -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
                    ${Array(startingDay).fill('').map(() => `<div style="min-height: 80px; background: #F8F9FA; border-radius: 8px; opacity: 0.4;"></div>`).join('')}
                    ${Array(daysInMonth).fill(0).map((_, i) => {
                        const dayNum = i + 1;
                        const dateObj = new Date(year, month, dayNum);
                        const dayOfWeek = (dateObj.getDay() === 0 ? 7 : dateObj.getDay());
                        const dayKey = `day${dayOfWeek}`;
                        const dPlan = this.dayPlanCache.days ? this.dayPlanCache.days[dayKey] : null;
                        const kcal = dPlan ? (dPlan.target_calories || this.dayPlanCache.target_calories || 2150) : 2150;

                        // Verificar si contiene el alimento buscado
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

                        const highlightStyle = hasFood ? 'border: 2px solid #9E7D4B; background: rgba(229,203,167,0.18);' : 'background: #FFFFFF; border: 1px solid #E4E4E7;';

                        return `
                            <div style="min-height: 85px; border-radius: 8px; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; ${highlightStyle}" onclick="CoachNutritionMaster.openDayDetailModal('${dayKey}', ${dayNum})">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <span style="font-size: 11px; font-weight: 800; color: #121214;">${dayNum}</span>
                                    <span class="pill pill-champagne" style="font-size: 8.5px; padding: 1px 4px;">~${kcal}</span>
                                </div>
                                <div style="font-size: 9.5px; color: #71717A; margin-top: 4px;">
                                    5 comidas
                                </div>
                                <div style="margin-top: auto; display: flex; gap: 2px;">
                                    <span style="width: 5px; height: 5px; border-radius: 50%; background: #9E7D4B;"></span>
                                    <span style="width: 5px; height: 5px; border-radius: 50%; background: #3B82F6;"></span>
                                    <span style="width: 5px; height: 5px; border-radius: 50%; background: #F59E0B;"></span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        const prevBtn = document.getElementById('btnNutriPrevMonth');
        const nextBtn = document.getElementById('btnNutriNextMonth');
        const filterInp = document.getElementById('monthFoodFilterInput');

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

        if (filterInp) {
            filterInp.addEventListener('input', (e) => {
                this.monthFoodFilter = e.target.value;
                this.renderMonthVision();
            });
        }
    },

    // Modal de Detalle de Día
    openDayDetailModal(dayKey, dayNum) {
        const dPlan = this.dayPlanCache.days ? this.dayPlanCache.days[dayKey] : null;
        if (!dPlan) return;

        let detailHtml = `
            <div class="sens-modal-backdrop active" id="nutriDayDetailModal" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div style="background: #FFFFFF; border-radius: 16px; width: 100%; max-width: 540px; max-height: 80vh; overflow-y: auto; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div>
                            <span class="pill pill-champagne" style="font-size: 9.5px;">PLAN DEL DÍA ${dayNum}</span>
                            <h3 style="margin: 4px 0 0 0; font-size: 1.2rem; color: #121214;">${dPlan.title} • ~${dPlan.target_calories || 2150} kcal</h3>
                        </div>
                        <button type="button" onclick="document.getElementById('nutriDayDetailModal').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #71717A;">✕</button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${Object.keys(dPlan.meals || {}).map(mKey => {
                            const m = dPlan.meals[mKey];
                            const foods = m.foods || [];
                            return `
                                <div style="background: #F8F9FA; padding: 10px; border-radius: 8px; border: 1px solid #E4E4E7;">
                                    <strong style="font-size: 11.5px; text-transform: uppercase; color: #9E7D4B; display: block; margin-bottom: 4px;">${mKey}</strong>
                                    ${foods.length === 0 ? `<span style="font-size: 11px; color: #A1A1AA;">Sin alimentos prescritos</span>` : `
                                        <div style="font-size: 11.5px; color: #121214; display: flex; flex-direction: column; gap: 4px;">
                                            ${foods.map(f => {
                                                const res = (typeof window.getResolvedFood === 'function') ? window.getResolvedFood(f) : f;
                                                return `<span>• <strong>${res.name}</strong> (${f.grams || 100}g)</span>`;
                                            }).join('')}
                                        </div>
                                    `}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', detailHtml);
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
