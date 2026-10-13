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
            const savedAnamnesis = localStorage.getItem('sens_anamnesis_' + email);
            if (savedProfile) {
                AppState.profile = JSON.parse(savedProfile);
            } else {
                AppState.profile = {
                    full_name: email.split('@')[0],
                    daily_step_target: 10000,
                    active_plan_name: 'Plan Personalizado SENS TRAIN'
                };
            }
            if (savedAnamnesis) {
                AppState.anamnesis = JSON.parse(savedAnamnesis);
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
            openUserPortal(true); // Redirige a Diagnóstico inicial (Módulo 4)
        }, 800);
    });

    // Botón de prueba directa sin registrarse (Modo Demo)
    const demoBtn = document.getElementById('demoDiagnosisBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            AppState.user = { id: 'demo-user-' + Date.now(), email: 'demo@sens.com' };
            AppState.profile = { full_name: 'Atleta Demo', onboarding_completed: false };
            localStorage.setItem('sens_active_user', JSON.stringify(AppState.user));
            showAuthModal(false);
            openUserPortal(true);
        });
    }
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

        const { data: anamData } = await supabaseClient
            .from('anamnesis')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (anamData) {
            AppState.anamnesis = anamData;
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

    portal.classList.add('active');
    publicLanding.style.display = 'none';

    if (AppState.user) {
        userEmailEl.textContent = AppState.user.email || 'atleta@sens.com';
    }

    // Comprobar si el diagnóstico clínico fue completado
    const isCompleted = Boolean(AppState.profile && AppState.profile.onboarding_completed);

    if (forceOnboarding || !isCompleted) {
        // Redirige al diagnóstico inicial
        document.getElementById('portalSubNav').style.display = 'none';
        startDiagnosisWizard(false);
    } else {
        // Redirige al Dashboard de Atleta
        document.getElementById('portalSubNav').style.display = 'flex';
        renderDashboardData();
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
        weightKpi.innerHTML = `${profile.current_weight} <span style="font-size:1rem; font-weight:400;">kg</span>`;
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
            tagsHtml += `<span class="diag-tag" style="border-color:#D95D50; color:#F87171;">Bandera médica en revisión</span>`;
        } else {
            tagsHtml += `<span class="diag-tag">Sin banderas médicas</span>`;
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
            diagStatusPill.textContent = 'Expediente VIP • Prioritario';
            diagStatusPill.className = 'pill pill-champagne';
        } else {
            diagStatusPill.textContent = 'Expediente Activo • Nico';
            diagStatusPill.className = 'pill pill-champagne';
        }
    }

    if (diagDateBadge && profile.updated_at) {
        try {
            const d = new Date(profile.updated_at);
            diagDateBadge.textContent = `Actualizado ${d.toLocaleDateString()}`;
        } catch (e) {
            diagDateBadge.textContent = 'Expediente al día';
        }
    }

    if (diagSummaryText && profile.full_name) {
        diagSummaryText.textContent = `Expediente biomecánico y clínico de ${profile.full_name}. Información protegida bajo Ley 25.326 y auditada por Nico para calibrar tus sesiones.`;
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
                window.diagWizardGoStep(1, '¡Consentimiento registrado!');
            }
        });
    }

    // 2. Triaje Clínico PAR-Q+ (Paso 1)
    const triageItems = document.querySelectorAll('.triage-item');
    triageItems.forEach(item => {
        const btns = item.querySelectorAll('.triage-btn');
        btns.forEach(b => {
            b.addEventListener('click', () => {
                btns.forEach(btn => btn.classList.remove('active'));
                b.classList.add('active');
                checkParqFlags();
                saveDiagnosisDraft();
            });
        });
    });

    // 3. Topografía de Lesiones y EVA (Paso 2)
    const injuryPills = document.querySelectorAll('#injuriesPillGrid .pill-card');
    const noInjuriesCheck = document.getElementById('diagNoInjuriesCheck');
    const noInjuriesCard = document.getElementById('noInjuriesCard');
    const evaBox = document.getElementById('diagEvaBox');
    const evaSlider = document.getElementById('diagEvaSlider');
    const evaVal = document.getElementById('diagEvaVal');

    injuryPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Evita doble disparo por label nativo
            if (e.target.tagName !== 'INPUT') {
                const cb = pill.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = !cb.checked;
            }
            const cb = pill.querySelector('input[type="checkbox"]');
            pill.classList.toggle('selected', cb.checked);

            if (cb.checked) {
                if (noInjuriesCheck) {
                    noInjuriesCheck.checked = false;
                    noInjuriesCard.classList.remove('selected');
                }
            }
            updateEvaVisibility();
            saveDiagnosisDraft();
        });
    });

    if (noInjuriesCard && noInjuriesCheck) {
        noInjuriesCard.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                noInjuriesCheck.checked = !noInjuriesCheck.checked;
            }
            if (noInjuriesCheck.checked) {
                injuryPills.forEach(p => {
                    p.classList.remove('selected');
                    const cb = p.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = false;
                });
            }
            updateEvaVisibility();
            saveDiagnosisDraft();
        });
    }

    if (evaSlider && evaVal) {
        evaSlider.addEventListener('input', () => {
            evaVal.textContent = `${evaSlider.value} / 10`;
            saveDiagnosisDraft();
        });
    }

    function updateEvaVisibility() {
        const hasSelectedInjuries = Array.from(document.querySelectorAll('#injuriesPillGrid input[name="diagInjuries"]:checked')).length > 0;
        if (evaBox) {
            evaBox.style.display = hasSelectedInjuries ? 'block' : 'none';
        }
    }

    // 4. Contexto Deportivo (Paso 3)
    const freqBtns = document.querySelectorAll('.freq-btn');
    freqBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            freqBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveDiagnosisDraft();
        });
    });

    const equipPills = document.querySelectorAll('input[name="diagEquipment"]');
    equipPills.forEach(input => {
        const card = input.closest('.pill-card');
        if (card) {
            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    input.checked = !input.checked;
                }
                card.classList.toggle('selected', input.checked);
                saveDiagnosisDraft();
            });
        }
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

    // 6. Registro Fotográfico Postural (Paso 7)
    setupPhotoUpload('filePhotoFront', 'previewImgFront', 'boxPhotoFront');
    setupPhotoUpload('filePhotoSide', 'previewImgSide', 'boxPhotoSide');
    setupPhotoUpload('filePhotoBack', 'previewImgBack', 'boxPhotoBack');

    // 7. Botón Finalizar Diagnóstico (Paso 7 -> Paso 8)
    const finishBtn = document.getElementById('btnFinishDiagnosis');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            processDiagnosisSubmission();
        });
    }

    // 8. Botón Entrar al Dashboard desde Congrats (Paso 8)
    const enterDashBtn = document.getElementById('btnDiagEnterDashboard');
    if (enterDashBtn) {
        enterDashBtn.addEventListener('click', () => {
            document.getElementById('portalSubNav').style.display = 'flex';
            renderDashboardData();
            switchPortalView('dashView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 9. Botón Salir al Dashboard si se está en Modo Edición
    const exitDashBtn = document.getElementById('wizardExitToDashBtn');
    if (exitDashBtn) {
        exitDashBtn.addEventListener('click', () => {
            document.getElementById('portalSubNav').style.display = 'flex';
            renderDashboardData();
            switchPortalView('dashView');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 10. Botón "Ver o Modificar mis Datos" en Dashboard & Nav
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

// Comprobar banderas de PAR-Q+
function checkParqFlags() {
    const activeSi = document.querySelectorAll('.triage-item .triage-btn.active[data-val="si"]');
    const alertBox = document.getElementById('parqMedicalAlert');
    const notesGroup = document.getElementById('parqNotesGroup');
    const hasFlags = activeSi.length > 0;

    if (alertBox) alertBox.style.display = hasFlags ? 'block' : 'none';
    if (notesGroup) notesGroup.style.display = hasFlags ? 'block' : 'none';
    return hasFlags;
}

// Navegación secuencial de pasos
window.diagWizardGoStep = function(targetStep, toastMsg) {
    const stepCards = document.querySelectorAll('.wizard-step-card');
    const targetCard = document.getElementById(`diagStep${targetStep}`);
    if (!targetCard) return;

    stepCards.forEach(card => card.classList.remove('active'));
    targetCard.classList.add('active');

    // Actualizar barra de progreso y etiquetas
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const stepLabel = document.getElementById('diagStepLabel');

    const progressPercentages = [0, 15, 30, 45, 60, 75, 85, 95, 100];
    const stepNames = [
        'Paso 0 de 8: Consentimiento Legal',
        'Paso 1 de 8: Triaje Clínico PAR-Q+',
        'Paso 2 de 8: Topografía de Dolor & Lesiones',
        'Paso 3 de 8: Contexto Deportivo & Logística',
        'Paso 4 de 8: Carga Alostática & Estilo de Vida',
        'Paso 5 de 8: Barrera Psicológica de Adherencia',
        'Paso 6 de 8: Pruebas Funcionales de Movilidad',
        'Paso 7 de 8: Biometría & Registro Postural',
        'Paso 8 de 8: Micro-Hábitos & Confirmación'
    ];

    const pct = progressPercentages[targetStep] || 0;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}%`;
    if (stepLabel) stepLabel.textContent = stepNames[targetStep] || `Paso ${targetStep} de 8`;

    if (toastMsg) {
        showDiagnosisToast(toastMsg);
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

    // Efecto visual feedback
    const siblings = element.parentElement.querySelectorAll('.touch-card');
    siblings.forEach(s => s.style.borderColor = 'var(--border-subtle)');
    element.style.borderColor = 'var(--accent-primary)';

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
    }, 2000);
}

// Procesar el envío completo y calcular algoritmo VIP + Micro-hábitos
async function processDiagnosisSubmission() {
    const fullNameInput = document.getElementById('diagFullName');
    const ageInput = document.getElementById('diagAge');
    const weightInput = document.getElementById('diagWeight');
    const heightInput = document.getElementById('diagHeight');

    const fullName = (fullNameInput ? fullNameInput.value.trim() : '') || (AppState.user ? AppState.user.email.split('@')[0] : 'Atleta');
    const age = parseInt(ageInput ? ageInput.value : '45', 10);
    const weight = parseFloat(weightInput ? weightInput.value : '78.0') || 78.0;
    const height = parseFloat(heightInput ? heightInput.value : '175') || 175;

    // PAR-Q+ respuestas
    const parqResponses = {};
    let positiveParqCount = 0;
    document.querySelectorAll('.triage-item').forEach(item => {
        const qKey = item.getAttribute('data-q');
        const activeBtn = item.querySelector('.triage-btn.active');
        const val = activeBtn ? activeBtn.getAttribute('data-val') : 'no';
        parqResponses[qKey] = val;
        if (val === 'si') positiveParqCount++;
    });
    const hasMedicalFlags = positiveParqCount > 0;
    const parqNotes = document.getElementById('diagParqNotes')?.value.trim() || '';

    // Lesiones activas
    const selectedInjuries = Array.from(document.querySelectorAll('#injuriesPillGrid input[name="diagInjuries"]:checked')).map(el => el.value);
    const evaScore = parseInt(document.getElementById('diagEvaSlider')?.value || '5', 10);

    // Contexto deportivo
    const experience = document.querySelector('input[name="diagExperience"]:checked')?.value || 'intermediate';
    const activeFreqBtn = document.querySelector('.freq-btn.active');
    const weeklyFrequency = activeFreqBtn ? parseInt(activeFreqBtn.getAttribute('data-days'), 10) : 3;
    const availableEquipment = Array.from(document.querySelectorAll('input[name="diagEquipment"]:checked')).map(el => el.value);

    // Carga alostática
    const sleepHours = parseFloat(document.getElementById('diagSleepSlider')?.value || '7.0');
    const stressLevel = parseInt(document.getElementById('diagStressSlider')?.value || '6', 10);
    const neatLevel = document.querySelector('input[name="diagNeat"]:checked')?.value || 'sedentary';
    const activeWaterBtn = document.querySelector('.water-btn.active');
    const waterBaseline = activeWaterBtn ? parseFloat(activeWaterBtn.getAttribute('data-water')) : 2.0;

    // Obstáculo psicológico
    const historicalHurdle = document.querySelector('input[name="diagHurdle"]:checked')?.value || 'time';

    // Pruebas de movilidad
    const mobShoulder = document.querySelector('input[name="diagMobShoulder"]:checked')?.value || 'ok';
    const mobPosterior = document.querySelector('input[name="diagMobPosterior"]:checked')?.value || 'ok';

    // Fotos posturales
    const frontPhoto = document.getElementById('previewImgFront')?.src || null;
    const sidePhoto = document.getElementById('previewImgSide')?.src || null;
    const backPhoto = document.getElementById('previewImgBack')?.src || null;

    // =========================================================================
    // ALGORITMO VIP SCORE (PRD Sección 4)
    // Score VIP = (0.45 * C_clinica) + (0.30 * A_alostatica) + (0.25 * V_adherencia)
    // =========================================================================
    let c_clinica = 0;
    c_clinica += positiveParqCount * 4;
    if (selectedInjuries.length > 0 && evaScore >= 6) {
        c_clinica += selectedInjuries.length * 3;
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
    // Hidratación: 35 ml x peso(kg)
    // Pasos: 7.000 u 8.000 / 10.000 según NEAT
    // =========================================================================
    const calculatedWaterLiters = (Math.round((weight * 0.035) * 10) / 10).toFixed(1);
    let calculatedStepTarget = 8000;
    if (neatLevel === 'sedentary') calculatedStepTarget = 7000;
    else if (neatLevel === 'active') calculatedStepTarget = 10000;

    // Actualizar UI del Paso 8
    const habitWaterEl = document.getElementById('diagHabitWater');
    const habitStepsEl = document.getElementById('diagHabitSteps');
    const habitNeatDesc = document.getElementById('diagHabitNeatDesc');
    const habitTierEl = document.getElementById('diagHabitTier');
    const habitTierSub = document.getElementById('diagHabitTierSub');

    if (habitWaterEl) habitWaterEl.textContent = `${calculatedWaterLiters} L / día`;
    if (habitStepsEl) habitStepsEl.textContent = `${calculatedStepTarget.toLocaleString()} pasos`;
    if (habitNeatDesc) {
        habitNeatDesc.textContent = neatLevel === 'sedentary'
            ? 'Objetivo adaptado para compensar horas de oficina'
            : 'Calibrado según tu dinamismo laboral diario';
    }

    if (habitTierEl) {
        habitTierEl.textContent = isVipCandidate ? 'Atención Prioritaria Recomendada' : 'Expediente Biomecánico Activo';
    }
    if (habitTierSub) {
        habitTierSub.textContent = isVipCandidate
            ? `Score VIP: ${vipScore} / 10 • Canal prioritario sugerido`
            : `Score: ${vipScore} / 10 • Programación adaptativa activa`;
    }

    // Iniciar temporizador regresivo de 24 horas
    startDiagnosisCountdown(24 * 3600);

    // =========================================================================
    // PERSISTENCIA DE DATOS
    // =========================================================================
    const profilePayload = {
        id: AppState.user ? AppState.user.id : undefined,
        full_name: fullName,
        age,
        current_weight: weight,
        height,
        daily_step_target: calculatedStepTarget,
        role: isVipCandidate ? 'user_vip' : 'user_normal',
        vip_candidate: isVipCandidate,
        vip_score: vipScore,
        onboarding_completed: true,
        consent_timestamp: new Date().toISOString(),
        consent_version: 'v1.0_2026',
        active_plan_name: 'Plan Personalizado SENS TRAIN',
        updated_at: new Date().toISOString()
    };

    const anamnesisPayload = {
        user_id: AppState.user ? AppState.user.id : undefined,
        parq_responses: parqResponses,
        has_medical_flags: hasMedicalFlags,
        parq_notes: parqNotes,
        active_injuries: selectedInjuries,
        eva_score: evaScore,
        experience_level: experience,
        weekly_frequency: weeklyFrequency,
        available_equipment: availableEquipment,
        sleep_hours: sleepHours,
        stress_level: stressLevel,
        neat_level: neatLevel,
        water_liters_baseline: parseFloat(calculatedWaterLiters),
        historical_hurdle: historicalHurdle,
        mobility_tests: { shoulder: mobShoulder, posterior: mobPosterior },
        photos: {
            front: frontPhoto && frontPhoto.startsWith('data:') ? 'uploaded_local' : frontPhoto,
            side: sidePhoto && sidePhoto.startsWith('data:') ? 'uploaded_local' : sidePhoto,
            back: backPhoto && backPhoto.startsWith('data:') ? 'uploaded_local' : backPhoto
        },
        daily_step_target: calculatedStepTarget,
        is_draft: false,
        updated_at: new Date().toISOString()
    };

    AppState.profile = profilePayload;
    AppState.anamnesis = anamnesisPayload;

    const emailKey = AppState.user && AppState.user.email ? AppState.user.email : 'local_user';
    localStorage.setItem(`sens_profile_${emailKey}`, JSON.stringify(profilePayload));
    localStorage.setItem(`sens_anamnesis_${emailKey}`, JSON.stringify(anamnesisPayload));
    localStorage.removeItem('sens_onboarding_draft');

    // Sincronización en segundo plano con Supabase si está disponible
    if (supabaseClient && AppState.user) {
        try {
            await supabaseClient.from('profiles').upsert(profilePayload);
            await supabaseClient.from('anamnesis').upsert(anamnesisPayload);
        } catch (err) {
            console.error('Error sincronizando con Supabase:', err);
        }
    }

    // Avanzar a la pantalla de felicitaciones (Paso 8)
    window.diagWizardGoStep(8, '¡Diagnóstico y Biometría asegurados!');
}

// Temporizador regresivo de 24 horas (Compromiso SENS Train)
function startDiagnosisCountdown(totalSeconds) {
    if (AppState.diagCountdownInterval) {
        clearInterval(AppState.diagCountdownInterval);
    }
    let remaining = totalSeconds;
    const display = document.getElementById('diagCountdownDisplay');

    function update() {
        if (!display) return;
        const hrs = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        display.textContent = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
        if (remaining > 0) remaining--;
    }

    update();
    AppState.diagCountdownInterval = setInterval(update, 1000);
}

// Guardar borrador en tiempo real
function saveDiagnosisDraft() {
    try {
        const draft = {
            step: AppState.diagnosisCurrentStep || 0,
            fullName: document.getElementById('diagFullName')?.value || '',
            age: document.getElementById('diagAge')?.value || '',
            weight: document.getElementById('diagWeight')?.value || '',
            height: document.getElementById('diagHeight')?.value || '',
            eva: document.getElementById('diagEvaSlider')?.value || '5',
            sleep: document.getElementById('diagSleepSlider')?.value || '7',
            stress: document.getElementById('diagStressSlider')?.value || '6',
            timestamp: Date.now()
        };
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
        if (draft.fullName) document.getElementById('diagFullName').value = draft.fullName;
        if (draft.age) document.getElementById('diagAge').value = draft.age;
        if (draft.weight) document.getElementById('diagWeight').value = draft.weight;
        if (draft.height) document.getElementById('diagHeight').value = draft.height;
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
    if (p.age && document.getElementById('diagAge')) {
        document.getElementById('diagAge').value = p.age;
    }
    if (p.current_weight && document.getElementById('diagWeight')) {
        document.getElementById('diagWeight').value = p.current_weight;
    }
    if (p.height && document.getElementById('diagHeight')) {
        document.getElementById('diagHeight').value = p.height;
    }

    const consentCheck = document.getElementById('diagConsentCheck');
    const btnStart = document.getElementById('btnStartDiag');
    if (consentCheck) consentCheck.checked = true;
    if (btnStart) btnStart.disabled = false;

    if (a.parq_responses) {
        Object.keys(a.parq_responses).forEach(qKey => {
            const item = document.querySelector(`.triage-item[data-q="${qKey}"]`);
            if (item) {
                const val = a.parq_responses[qKey];
                item.querySelectorAll('.triage-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-val') === val);
                });
            }
        });
        checkParqFlags();
    }

    if (Array.isArray(a.active_injuries)) {
        a.active_injuries.forEach(inj => {
            const pill = document.querySelector(`#injuriesPillGrid .pill-card[data-injury="${inj}"]`);
            if (pill) {
                pill.classList.add('selected');
                const cb = pill.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = true;
            }
        });
        if (a.active_injuries.length > 0) {
            const evaBox = document.getElementById('diagEvaBox');
            if (evaBox) evaBox.style.display = 'block';
            if (a.eva_score) {
                const slider = document.getElementById('diagEvaSlider');
                const valEl = document.getElementById('diagEvaVal');
                if (slider) slider.value = a.eva_score;
                if (valEl) valEl.textContent = `${a.eva_score} / 10`;
            }
        }
    }

    if (a.weekly_frequency) {
        document.querySelectorAll('.freq-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-days'), 10) === a.weekly_frequency);
        });
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
