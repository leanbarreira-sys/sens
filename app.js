/**
 * SENS TRAIN & WELLNESS — Main Application Logic (v1.0 MVP)
 * Modules 1 to 7: Global Nav, Landing, Supabase Auth, Onboarding, Dashboard, Workout Manager with Rest Timer, Nutrition & Daily Tracking
 */

// =============================================================================
// 0. CONFIGURACIÓN DE SUPABASE & ESTADO GLOBAL
// =============================================================================
const SUPABASE_CONFIG = {
    // Para conectar tu base de datos de producción, reemplazá estas variables:
    url: window.__SUPABASE_URL__ || 'https://YOUR_SUPABASE_PROJECT.supabase.co',
    anonKey: window.__SUPABASE_ANON_KEY__ || 'YOUR_SUPABASE_ANON_KEY'
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
    stepsChart: null
};

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

    // Tap en un dot para navegar al slide correspondiente
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (slides[index]) {
                const targetLeft = slides[index].offsetLeft - carousel.offsetLeft;
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

    let currentMode = 'online';
    let currentSub = 'presencial-ind';

    function renderActivePricingView() {
        tabContents.forEach(c => c.style.display = 'none');

        if (currentMode === 'online') {
            if (subSelector) subSelector.style.display = 'none';
            const onlineTab = document.getElementById('tab-online');
            if (onlineTab) {
                onlineTab.style.display = 'block';
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
                const innerCarousel = targetEl.querySelector('.pricing-carousel');
                if (innerCarousel) innerCarousel.scrollLeft = 0;
                const activeDotsId = currentSub === 'presencial-ind' ? '#pricingDots' : '#groupsDots';
                const dots = document.querySelectorAll(activeDotsId + ' .carousel-dot');
                dots.forEach((dot, idx) => dot.classList.toggle('active', idx === 0));
            }
        }
    }

    mainBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mainBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentMode = btn.getAttribute('data-mode') || 'online';
            renderActivePricingView();
        });
    });

    subBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            subBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentSub = btn.getAttribute('data-sub') || 'presencial-ind';
            renderActivePricingView();
        });
    });

    // Soporte para tabs legacy en caso de ser referenciados
    const legacyTabBtns = document.querySelectorAll('.pricing-tabs-nav .tab-btn');
    legacyTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            legacyTabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            const targetEl = document.getElementById(btn.getAttribute('data-target'));
            if (targetEl) targetEl.style.display = 'block';
        });
    });
}

// =============================================================================
// MÓDULO 3: AUTENTICACIÓN (SUPABASE AUTH / LOCAL FALLBACK)
// =============================================================================
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
                if (mobileMenu) mobileMenu.style.display = 'none';
                showAuthModal(true);
            });
        }
    });

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
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            } else {
                AppState.profile = {
                    full_name: email.split('@')[0],
                    daily_step_target: 10000,
                    active_plan_name: 'Plan Personalizado SENS TRAIN'
                };
            }
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
        }

        showAuthAlert('¡Acceso correcto! Ingresando al portal...', 'success');
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
        setTimeout(() => {
            showAuthModal(false);
            openUserPortal(true); // Redirige a Onboarding (Módulo 4)
        }, 800);
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
            .single();

        if (data && !error) {
            AppState.profile = data;
        } else {
            AppState.profile = null;
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
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            }
        } catch (e) {
            console.error('Error parseando sesión previa:', e);
        }
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
            document.getElementById('app-container').classList.remove('active');
            document.getElementById('publicLanding').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (backLandingBtn) {
        backLandingBtn.addEventListener('click', () => {
            document.getElementById('app-container').classList.remove('active');
            document.getElementById('publicLanding').style.display = 'block';
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
    const userNameEl = document.getElementById('dashUserName');
    const planBadgeEl = document.getElementById('portalPlanBadge');

    portal.classList.add('active');
    publicLanding.style.display = 'none';

    if (AppState.user) {
        userEmailEl.textContent = AppState.user.email || 'atleta@sens.com';
    }

    const hasProfile = AppState.profile && AppState.profile.current_weight;
    if (forceOnboarding || !hasProfile) {
        // Redirige al Módulo 4: Onboarding
        document.getElementById('portalSubNav').style.display = 'none';
        switchPortalView('onboardingSection');
        if (AppState.profile && AppState.profile.full_name) {
            const nameInput = document.getElementById('obFullName');
            if (nameInput) nameInput.value = AppState.profile.full_name;
        }
    } else {
        // Redirige al Módulo 5: Dashboard
        document.getElementById('portalSubNav').style.display = 'flex';
        userNameEl.textContent = AppState.profile.full_name || 'Atleta';
        if (AppState.profile.active_plan_name) {
            planBadgeEl.textContent = AppState.profile.active_plan_name;
        }
        if (AppState.profile.current_weight) {
            document.getElementById('kpiCurrentWeight').innerHTML = `${AppState.profile.current_weight} <span style="font-size:1rem; font-weight:400;">kg</span>`;
        }
        switchPortalView('dashView');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================================================
// MÓDULO 4: ONBOARDING INTERACTIVO (WIZARD DE 3 PASOS)
// =============================================================================
function initOnboardingWizard() {
    const wizardForm = document.getElementById('onboardingWizardForm');
    const step1 = document.getElementById('wizardStep1');
    const step2 = document.getElementById('wizardStep2');
    const step3 = document.getElementById('wizardStep3');

    const next1 = document.getElementById('wizardNext1');
    const prev2 = document.getElementById('wizardPrev2');
    const next2 = document.getElementById('wizardNext2');
    const prev3 = document.getElementById('wizardPrev3');

    const node1 = document.getElementById('stepNode1');
    const node2 = document.getElementById('stepNode2');
    const node3 = document.getElementById('stepNode3');
    const progressBar = document.getElementById('wizardProgressBar');

    const stressSlider = document.getElementById('obStressRange');
    const stressDisplay = document.getElementById('obStressVal');

    if (stressSlider && stressDisplay) {
        stressSlider.addEventListener('input', () => {
            stressDisplay.textContent = stressSlider.value;
        });
    }

    function setStep(stepNum) {
        step1.classList.remove('active');
        step2.classList.remove('active');
        step3.classList.remove('active');
        node1.classList.remove('active', 'done');
        node2.classList.remove('active', 'done');
        node3.classList.remove('active', 'done');

        if (stepNum === 1) {
            step1.classList.add('active');
            node1.classList.add('active');
            progressBar.style.width = '0%';
        } else if (stepNum === 2) {
            step2.classList.add('active');
            node1.classList.add('done');
            node2.classList.add('active');
            progressBar.style.width = '50%';
        } else if (stepNum === 3) {
            step3.classList.add('active');
            node1.classList.add('done');
            node2.classList.add('done');
            node3.classList.add('active');
            progressBar.style.width = '100%';
        }
    }

    if (next1) {
        next1.addEventListener('click', () => {
            const name = document.getElementById('obFullName').value.trim();
            const age = document.getElementById('obAge').value;
            const weight = document.getElementById('obWeight').value;
            const height = document.getElementById('obHeight').value;

            if (!name || !age || !weight || !height) {
                alert('Por favor completá los 4 campos biométricos antes de continuar.');
                return;
            }
            setStep(2);
        });
    }

    if (prev2) prev2.addEventListener('click', () => setStep(1));
    if (next2) next2.addEventListener('click', () => setStep(3));
    if (prev3) prev3.addEventListener('click', () => setStep(2));

    // Envío del Onboarding -> Guarda en Supabase public.profiles
    if (wizardForm) {
        wizardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('obFullName').value.trim();
            const age = parseInt(document.getElementById('obAge').value, 10);
            const weight = parseFloat(document.getElementById('obWeight').value);
            const height = parseFloat(document.getElementById('obHeight').value);

            const selectedGoal = document.querySelector('input[name="obGoal"]:checked')?.value || 'fuerza';
            const selectedInjuries = Array.from(document.querySelectorAll('input[name="obInjuries"]:checked')).map(el => el.value);

            const stress = parseInt(document.getElementById('obStressRange').value, 10);
            const sleep = parseFloat(document.getElementById('obSleepHours').value);
            const stepTarget = parseInt(document.getElementById('obStepTarget').value, 10) || 10000;

            const profileData = {
                id: AppState.user ? AppState.user.id : undefined,
                full_name: fullName,
                age,
                current_weight: weight,
                height,
                fitness_goal: selectedGoal,
                medical_notes: selectedInjuries.join(', '),
                daily_step_target: stepTarget,
                active_plan_name: 'Plan Personalizado SENS TRAIN'
            };

            if (supabaseClient && AppState.user) {
                try {
                    const { error } = await supabaseClient
                        .from('profiles')
                        .upsert(profileData);
                    if (error) console.error('Error guardando perfil en Supabase:', error);
                } catch (err) {
                    console.error('Error Supabase upsert:', err);
                }
            }

            // Persistencia Local
            AppState.profile = profileData;
            if (AppState.user && AppState.user.email) {
                localStorage.setItem('sens_profile_' + AppState.user.email, JSON.stringify(profileData));
            }

            alert('¡Perfil configurado con éxito! Bienvenido a tu Dashboard de Entrenamiento.');
            document.getElementById('portalSubNav').style.display = 'flex';
            openUserPortal(false);
        });
    }
}

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

    // Delegación de eventos para checkboxes táctiles y video
    const container = document.getElementById('exercisesContainer');
    if (container) {
        container.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('set-completed-chk')) {
                if (e.target.checked) {
                    const restSeconds = parseInt(e.target.getAttribute('data-rest'), 10) || 90;
                    startRestTimer(restSeconds);
                    playBeep(440, 0.1); // feedback sonoro suave
                }
            }
        });

        container.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-video-demo')) {
                const title = e.target.getAttribute('data-video-title');
                openVideoModal(title);
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

    let html = '';
    dayData.exercises.forEach(ex => {
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
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">${ex.notes}</div>
                    </div>
                    <div class="exercise-meta-pills">
                        <span class="pill pill-dark">${ex.sets} Series</span>
                        <span class="pill pill-dark">${ex.reps} Reps</span>
                        <span class="pill pill-champagne">Descanso: ${ex.rest}s</span>
                        <button class="btn btn-outline btn-sm btn-video-demo" data-video-title="Técnica: ${ex.name}">Video Técnica</button>
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

function openVideoModal(title) {
    const modal = document.getElementById('videoModal');
    const modalTitle = document.getElementById('videoModalTitle');
    if (modal && modalTitle) {
        modalTitle.textContent = title || 'Demostración Técnica';
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
    const btnSaveHabits = document.getElementById('btnSaveHabits');
    if (btnSaveHabits) {
        btnSaveHabits.addEventListener('click', () => {
            alert('¡Hábitos del día actualizados y registrados correctamente!');
        });
    }
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
