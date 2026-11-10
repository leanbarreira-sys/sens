/**
 * SENS Marketing Studio Master Engine (Zero Layout Drift + True 4K UHD Pipeline)
 * Connects the 200 Sacred Templates (T01-T100 in 9:16, F01-F100 in 4:5 + T00 Somatic HUD)
 * to the 3-Step Natural Creation Flow specified in mkt-admin/DESIGN.md & Protocolo Maestro.
 */
(function () {
  'use strict';

  const rawDb = Array.isArray(window.SENS_TEMPLATES_DB_200) ? window.SENS_TEMPLATES_DB_200 : [];
  const ALL_TEMPLATES = [...rawDb];

  const PILLARS_BY_GROUP = {
    'static': [
      { id: 'all', label: 'Todos los Estáticos (100)' },
      { id: 'b1', label: 'E01-E20 Master Growth' },
      { id: 'b2', label: 'E21-E40 Editorial & Statements' },
      { id: 'b3', label: 'E41-E60 Telemetría & Datos' },
      { id: 'b4', label: 'E61-E80 Micro-Stories' },
      { id: 'b5', label: 'E81-E100 Conversión & Autoridad' }
    ],
    'motion': [
      { id: 'all', label: 'Todos con Animación (40)' },
      { id: 'm1', label: 'M01-M20 Growth Hooks' },
      { id: 'm2', label: 'M21-M40 Coreografías Algorítmicas' }
    ]
  };

  const QUICK_FORMULAS = {
    lumbar: {
      hook: 'El dolor lumbar a las 6 PM no es por tu silla.',
      bajada: 'El 94% de mis alumnos ejecutivos corrigen la compresión L5-S1 desbloqueando la rotación interna de cadera en 4 minutos.',
      cta: '2 CUPOS DISPONIBLES • LINK EN BIO'
    },
    rodilla: {
      hook: 'Tu rodilla colapsa 3cm hacia adentro al bajar.',
      bajada: 'Corregí el valgo dinámico activando el glúteo medio y el arco plantar antes de sumar carga axial.',
      cta: 'EVALUACIÓN BIOMECÁNICA • LINK EN BIO'
    },
    social: {
      hook: 'El fin de la culpa de fin de semana.',
      bajada: '+500 kcal de margen metabólico construyendo masa muscular activa que oxida glucosa mientras dormís.',
      cta: 'PROTOCOLO SENS • APLICAR HOY'
    },
    vip: {
      hook: 'Entrenar sin ruido. Vivir sin dolor.',
      bajada: 'Acompañamiento personalizado de longevidad atlética y precisión biomecánica para profesionales exigentes.',
      cta: 'SOLO 2 CUPOS VIP ESTE MES'
    }
  };

  const state = {
    group: 'static',
    format: '9:16',
    blockId: 'all',
    activeTemplateId: 'E01',
    motionLoop: false,
    safeZonesVisible: false,
    hudVisible: false,
    activeMediaSlotIndex: 0,
    mediaSlots: [], // [{ el, type: 'bg'|'img', originalUrl, customDataUrl, customVideoUrl, panY: 50, zoom: 1, scrim: 0.50, naturalWidth, naturalHeight }]
    textBindings: {
      hookEl: null,
      bajadaEl: null,
      ctaEl: null,
      extraEls: []
    },
    hiddenElements: new Set(),
    selectedElement: null
  };

  // DOM Elements
  const els = {
    pillarBar: document.getElementById('pillar-chips-bar'),
    carouselTrack: document.getElementById('template-carousel-track'),
    stageMount: document.getElementById('stage-mount'),
    activeBadge: document.getElementById('active-template-badge'),
    safezoneBtn: document.getElementById('btn-toggle-safezones'),
    safezoneDot: document.getElementById('safezone-dot'),
    safezoneLabel: document.getElementById('safezone-label'),
    exportSubtitle: document.getElementById('export-spec-subtitle'),
    mediaSlotSwitcher: document.getElementById('media-slot-switcher'),
    uploadBtn: document.getElementById('btn-upload-media'),
    quickUploadBtn: document.getElementById('btn-quick-upload-trigger'),
    fileInput: document.getElementById('media-file-input'),
    mediaStatusBar: document.getElementById('media-status-bar'),
    mediaStatusText: document.getElementById('media-status-text'),
    clearMediaBtn: document.getElementById('btn-clear-custom-media'),
    inputHook: document.getElementById('input-hook'),
    inputBajada: document.getElementById('input-bajada'),
    inputCta: document.getElementById('input-cta'),
    counterHook: document.getElementById('counter-hook'),
    counterBajada: document.getElementById('counter-bajada'),
    fieldWrapHook: document.getElementById('field-wrap-hook'),
    fieldWrapBajada: document.getElementById('field-wrap-bajada'),
    fieldWrapCta: document.getElementById('field-wrap-cta'),
    btnVisHook: document.getElementById('btn-toggle-vis-hook'),
    btnVisBajada: document.getElementById('btn-toggle-vis-bajada'),
    btnVisCta: document.getElementById('btn-toggle-vis-cta'),
    helperDefaultMsg: document.getElementById('helper-default-msg'),
    helperSelectionActions: document.getElementById('helper-selection-actions'),
    helperSelectedLabel: document.getElementById('helper-selected-label'),
    btnQuickHideSelected: document.getElementById('btn-quick-hide-selected'),
    btnQuickHideText: document.getElementById('btn-quick-hide-text'),
    btnRestoreAllHidden: document.getElementById('btn-restore-all-hidden'),
    restoreHiddenBadgeText: document.getElementById('restore-hidden-badge-text'),
    extraWrapper: document.getElementById('extra-components-wrapper'),
    extraToggleBtn: document.getElementById('btn-toggle-extra-fields'),
    extraLabel: document.getElementById('extra-fields-label'),
    extraList: document.getElementById('extra-fields-list'),
    hudToggleBtn: document.getElementById('btn-toggle-hud'),
    hudKnob: document.getElementById('hud-switch-knob'),
    exportOverlayPngBtn: document.getElementById('btn-export-overlay-png'),
    exportOverlayPngLabel: document.getElementById('export-overlay-png-label'),
    exportReelBtn: document.getElementById('btn-export-reel'),
    exportReelLabel: document.getElementById('export-reel-label'),
    export4kBtn: document.getElementById('btn-export-4k'),
    export4kLabel: document.getElementById('export-4k-label'),
    copyCaptionBtn: document.getElementById('btn-copy-caption'),
    vaultModal: document.getElementById('vault-modal'),
    vaultGrid: document.getElementById('vault-grid-container'),
    openVaultBtn: document.getElementById('btn-open-vault'),
    closeVaultBtn: document.getElementById('btn-close-vault'),
    resetTemplateBtn: document.getElementById('btn-reset-template'),
    toast: document.getElementById('studio-toast'),
    toastText: document.getElementById('studio-toast-text')
  };

  function showToast(msg) {
    if (!els.toast || !els.toastText) return;
    els.toastText.textContent = msg;
    els.toast.classList.remove('opacity-0', 'translate-y-2');
    els.toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      els.toast.classList.add('opacity-0', 'translate-y-2');
      els.toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2600);
  }

  function getTemplateById(id) {
    return ALL_TEMPLATES.find(t => t.id === id) || ALL_TEMPLATES[0];
  }

  // Render Pillar Filter Chips
  function renderPillarChips() {
    const pillars = PILLARS_BY_FORMAT[state.format] || PILLARS_BY_FORMAT['9:16'];
    els.pillarBar.innerHTML = pillars.map(p => {
      const active = p.id === state.blockId;
      const cls = active
        ? 'px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all shadow-sm'
        : 'px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface text-[11px] font-medium whitespace-nowrap shrink-0 transition-all';
      return `<button type="button" data-pillar-id="${p.id}" class="${cls}">${p.label}</button>`;
    }).join('') + `
      <button type="button" id="btn-inline-vault" class="px-3 py-1 rounded-full bg-surface-container-high text-primary text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">grid_view</span>
        <span>Ver Grilla</span>
      </button>
    `;

    els.pillarBar.querySelectorAll('[data-pillar-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.blockId = btn.getAttribute('data-pillar-id');
        renderPillarChips();
        renderTemplateCarousel();
        // Auto-select first template of this pillar
        const list = ALL_TEMPLATES.filter(t => t.format === state.format && t.blockId === state.blockId && t.id !== 'T00');
        if (list.length > 0) {
          selectTemplate(list[0].id);
        }
      });
    });

    const inlineVaultBtn = document.getElementById('btn-inline-vault');
    if (inlineVaultBtn) {
      inlineVaultBtn.addEventListener('click', openVaultModal);
    }
  }

  // Render Horizontal Template Carousel for Active Format + Pillar
  function renderTemplateCarousel() {
    const items = ALL_TEMPLATES.filter(t => t.format === state.format && t.blockId === state.blockId);
    const aspectCls = state.format === '9:16' ? 'w-20 h-28' : 'w-24 h-28';

    els.carouselTrack.innerHTML = items.map(t => {
      const isSelected = t.id === state.activeTemplateId;
      const borderCls = isSelected
        ? 'border-2 border-secondary ring-2 ring-secondary/20'
        : 'border border-outline-variant/30 opacity-80 hover:opacity-100';
      const badgeCls = isSelected
        ? 'bg-secondary-fixed text-on-secondary-fixed font-bold'
        : 'bg-surface/85 text-on-surface font-mono';
      const displayCode = t.id === 'T00' ? 'HUD' : t.id;

      return `
        <button type="button" data-template-card="${t.id}" class="flex-shrink-0 ${aspectCls} rounded-xl relative overflow-hidden ${borderCls} group text-left transition-all">
          <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300" style="background-image: url('${t.thumbBg}');"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/25 to-transparent"></div>
          <span class="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded ${badgeCls}">${displayCode}</span>
          <div class="absolute bottom-1.5 left-1.5 right-1.5">
            <p class="text-[10px] font-medium text-surface leading-tight truncate">${t.name}</p>
          </div>
        </button>
      `;
    }).join('');

    els.carouselTrack.querySelectorAll('[data-template-card]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-template-card');
        selectTemplate(id);
      });
    });

    // Scroll active card into view smoothly
    const activeCard = els.carouselTrack.querySelector(`[data-template-card="${state.activeTemplateId}"]`);
    if (activeCard && typeof activeCard.scrollIntoView === 'function') {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // Load and Mount Sacred Template into #stage-mount (Zero Layout Drift)
  function selectTemplate(templateId) {
    const tpl = getTemplateById(templateId);
    if (!tpl) return;

    state.activeTemplateId = tpl.id;
    // Reset hidden and selected elements on template switch
    state.hiddenElements.clear();
    state.selectedElement = null;
    if (tpl.group && tpl.group !== state.group) {
      state.group = tpl.group;
      updateGroupButtonsUI();
    }
    state.format = '9:16';
    if (tpl.blockId !== state.blockId) {
      state.blockId = tpl.blockId;
    }

    renderPillarChips();
    renderTemplateCarousel();

    // Mount exact HTML untouched
    els.stageMount.innerHTML = tpl.html;
    const rootEl = els.stageMount.firstElementChild;
    if (!rootEl) return;

    // Assign #video-canvas to the root element of the template
    rootEl.id = 'video-canvas';

    // Update utility bar labels
    els.activeBadge.textContent = `${tpl.id} • ${tpl.name}`;
    const floatingNameEl = document.getElementById('floating-bar-template-name');
    if (floatingNameEl) floatingNameEl.textContent = `${tpl.id} • ${tpl.name}`;
    els.safezoneLabel.textContent = state.format === '9:16' ? 'Safe Zones Reels / TikTok' : 'Safe Zone 1:1 Feed';
    els.exportSubtitle.textContent = state.format === '9:16'
      ? 'Renderizado UHD 2160 × 3840 px • Zero Layout Drift • Audio Original Sync'
      : 'Renderizado UHD 2160 × 2700 px (4:5) • Zero Layout Drift • Máxima Nitidez';

    // Discover media slots & editable text components without altering template layout
    discoverMediaSlots(rootEl);
    discoverAndBindTextNodes(rootEl);
    applySafeZoneState(rootEl);
    applyHudState(rootEl);
    applyMotionLoopState(rootEl);

    // Notify parent frame to adjust height for single seamless scroll
    if (window.self !== window.top) {
      setTimeout(() => {
        try {
          const h = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0);
          window.parent.postMessage({ type: 'SENS_MKT_HEIGHT', height: h }, '*');
        } catch (_) {}
      }, 60);
    }
  }

  // Discover Media Slots (background-image divs or img tags) without altering positioning
  function discoverMediaSlots(rootEl) {
    state.mediaSlots = [];
    state.activeMediaSlotIndex = 0;

    // 1. Find all elements with inline background-image url(...)
    const bgNodes = Array.from(rootEl.querySelectorAll('[style*="background-image"]'));
    bgNodes.forEach((el, idx) => {
      const m = (el.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/i);
      const originalUrl = m ? m[1] : '';
      el.setAttribute('data-sens-bg-slot', String(state.mediaSlots.length));
      // Find associated scrim/gradient overlay (either child or next sibling)
      let scrimEl = el.querySelector('[class*="bg-gradient"], [class*="bg-primary/"], [class*="bg-black/"]');
      if (!scrimEl && el.nextElementSibling && /bg-gradient|bg-primary\/|bg-black\//.test(el.nextElementSibling.className || '')) {
        scrimEl = el.nextElementSibling;
      }
      state.mediaSlots.push({
        el,
        scrimEl,
        type: 'bg',
        originalUrl,
        customDataUrl: null,
        customVideoUrl: null,
        fileName: null,
        panY: 50,
        zoom: 1,
        scrim: 0.50,
        naturalWidth: 0,
        naturalHeight: 0
      });
    });

    // 2. Find any standalone <img> tags inside the template
    const imgNodes = Array.from(rootEl.querySelectorAll('img'));
    imgNodes.forEach(img => {
      img.setAttribute('data-sens-bg-slot', String(state.mediaSlots.length));
      state.mediaSlots.push({
        el: img,
        scrimEl: null,
        type: 'img',
        originalUrl: img.getAttribute('src') || '',
        customDataUrl: null,
        customVideoUrl: null,
        fileName: null,
        panY: 50,
        zoom: 1,
        scrim: 0.50,
        naturalWidth: 0,
        naturalHeight: 0
      });
    });

    // 3. If a template is purely typographic/pass (0 media slots by default), create a dormant background slot at z-0
    if (state.mediaSlots.length === 0) {
      const fallbackBg = document.createElement('div');
      fallbackBg.className = 'sens-injected-bg absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-0 transition-opacity duration-300';
      fallbackBg.setAttribute('data-sens-bg-slot', '0');
      const fallbackScrim = document.createElement('div');
      fallbackScrim.className = 'absolute inset-0 bg-gradient-to-t from-primary/50 via-primary/25 to-transparent pointer-events-none opacity-0 transition-opacity duration-300';
      fallbackBg.appendChild(fallbackScrim);
      rootEl.insertBefore(fallbackBg, rootEl.firstChild);

      state.mediaSlots.push({
        el: fallbackBg,
        scrimEl: fallbackScrim,
        type: 'injected-bg',
        originalUrl: '',
        customDataUrl: null,
        customVideoUrl: null,
        fileName: null,
        panY: 50,
        zoom: 1,
        scrim: 0.50,
        naturalWidth: 0,
        naturalHeight: 0
      });
    }

    renderMediaSlotSwitcher();
    updateMediaCalibratorButtonsUI();
    updateMediaStatusBar();
    syncExportButtonsForMediaKind();
  }

  function renderMediaSlotSwitcher() {
    if (state.mediaSlots.length <= 1) {
      els.mediaSlotSwitcher.classList.add('hidden');
      els.mediaSlotSwitcher.classList.remove('flex');
      els.mediaSlotSwitcher.innerHTML = '';
      return;
    }
    els.mediaSlotSwitcher.classList.remove('hidden');
    els.mediaSlotSwitcher.classList.add('flex');
    els.mediaSlotSwitcher.innerHTML = state.mediaSlots.map((slot, idx) => {
      const active = idx === state.activeMediaSlotIndex;
      const cls = active
        ? 'px-2 py-0.5 rounded bg-primary text-on-primary text-[10px] font-semibold'
        : 'px-2 py-0.5 rounded text-on-surface-variant hover:text-on-surface text-[10px] font-medium';
      return `<button type="button" data-slot-idx="${idx}" class="${cls}">Fondo ${idx + 1}</button>`;
    }).join('');

    els.mediaSlotSwitcher.querySelectorAll('[data-slot-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeMediaSlotIndex = parseInt(btn.getAttribute('data-slot-idx'), 10) || 0;
        renderMediaSlotSwitcher();
        updateMediaCalibratorButtonsUI();
        updateMediaStatusBar();
      });
    });
  }

  function hasActiveVideoSlot() {
    return state.mediaSlots.some(s => {
      if (!s || !s.el) return false;
      if (s.isVideo || s.customVideoUrl) return true;
      const vid = s.videoEl || (s.el.querySelector && s.el.querySelector('video.sens-bg-video')) || (s.el.parentElement && s.el.parentElement.querySelector('video.sens-bg-video'));
      return Boolean(vid && vid.src);
    });
  }

  function syncExportButtonsForMediaKind() {
    const isVid = hasActiveVideoSlot();
    if (els.export4kLabel) {
      els.export4kLabel.textContent = isVid ? 'Video 4K UHD' : 'Portada 4K';
    }
    if (els.exportReelLabel) {
      els.exportReelLabel.textContent = 'Exportar Video HD';
    }
    if (els.exportOverlayPngLabel) {
      els.exportOverlayPngLabel.textContent = 'Capa PNG Transparente 4K';
    }
  }

  // Inject Photo or Video into the Active Media Slot WITHOUT altering position classes
  function handleMediaFileUpload(file) {
    if (!file || state.mediaSlots.length === 0) return;
    const slot = state.mediaSlots[state.activeMediaSlotIndex] || state.mediaSlots[0];
    if (!slot || !slot.el) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);

    if (isVideo) {
      if (slot.customVideoUrl) {
        URL.revokeObjectURL(slot.customVideoUrl);
      }
      const videoUrl = URL.createObjectURL(file);
      slot.customVideoUrl = videoUrl;
      slot.customDataUrl = null;
      slot.isVideo = true;
      slot.fileName = file.name;

      // Ensure injected-bg becomes visible if used
      if (slot.type === 'injected-bg') {
        slot.el.classList.remove('opacity-0');
        if (slot.scrimEl) slot.scrimEl.classList.remove('opacity-0');
      }

      if (slot.type === 'img') {
        // Replace img src poster or overlay video inside parent
        const parent = slot.el.parentElement;
        if (parent) {
          const parentPos = window.getComputedStyle(parent).position;
          if (parentPos === 'static') {
            parent.style.position = 'relative';
          }
          let existingVid = parent.querySelector('video.sens-bg-video');
          if (!existingVid) {
            existingVid = document.createElement('video');
            existingVid.className = 'sens-bg-video';
            parent.insertBefore(existingVid, slot.el);
          }
          existingVid.src = videoUrl;
          existingVid.muted = true;
          existingVid.loop = true;
          existingVid.playsInline = true;
          existingVid.autoplay = true;
          existingVid.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center ${slot.panY}%;z-index:1;pointer-events:none;`;
          slot.el.style.opacity = '0';
          slot.videoEl = existingVid;
          existingVid.onloadedmetadata = () => {
            slot.naturalWidth = existingVid.videoWidth || 1080;
            slot.naturalHeight = existingVid.videoHeight || 1920;
            updateMediaStatusBar();
            syncExportButtonsForMediaKind();
          };
          existingVid.play().catch(() => {});
        }
      } else {
        // Keep slot.el's position intact unless static (e.g., nested card div in Polaroid T07)
        const slotPos = window.getComputedStyle(slot.el).position;
        if (slotPos === 'static') {
          slot.el.style.position = 'relative';
        }
        // Clear static background-image so only the live video is shown
        slot.el.style.backgroundImage = 'none';
        let existingVid = slot.el.querySelector('video.sens-bg-video');
        if (!existingVid) {
          existingVid = document.createElement('video');
          existingVid.className = 'sens-bg-video';
          slot.el.insertBefore(existingVid, slot.el.firstChild);
        }
        existingVid.src = videoUrl;
        existingVid.muted = true;
        existingVid.loop = true;
        existingVid.playsInline = true;
        existingVid.autoplay = true;
        existingVid.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center ${slot.panY}%;z-index:0;pointer-events:none;`;
        slot.videoEl = existingVid;
        // Ensure any child gradient scrim inside slot.el sits above the video
        Array.from(slot.el.children).forEach(child => {
          if (child !== existingVid) {
            child.style.zIndex = '1';
          }
        });
        existingVid.onloadedmetadata = () => {
          slot.naturalWidth = existingVid.videoWidth || 1080;
          slot.naturalHeight = existingVid.videoHeight || 1920;
          updateMediaStatusBar();
          syncExportButtonsForMediaKind();
        };
        existingVid.play().catch(() => {});
      }
      applySlotTransformAndScrim(slot);
      updateMediaStatusBar();
      syncExportButtonsForMediaKind();
      showToast(`Video cargado en Fondo ${state.activeMediaSlotIndex + 1} (Exportación en Video activa)`);
    } else {
      // High-Res Photo Upload (Preserve 100% Native Resolution)
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const probeImg = new Image();
        probeImg.onload = () => {
          slot.customDataUrl = dataUrl;
          slot.isVideo = false;
          slot.videoEl = null;
          if (slot.customVideoUrl) {
            URL.revokeObjectURL(slot.customVideoUrl);
            slot.customVideoUrl = null;
          }
          slot.fileName = file.name;
          slot.naturalWidth = probeImg.naturalWidth;
          slot.naturalHeight = probeImg.naturalHeight;

          // Remove any previously injected video
          const oldVid = slot.el.parentElement ? slot.el.parentElement.querySelector('video.sens-bg-video') : null;
          if (oldVid) oldVid.remove();
          const innerVid = slot.el.querySelector ? slot.el.querySelector('video.sens-bg-video') : null;
          if (innerVid) innerVid.remove();

          if (slot.type === 'injected-bg') {
            slot.el.classList.remove('opacity-0');
            if (slot.scrimEl) slot.scrimEl.classList.remove('opacity-0');
          }

          if (slot.type === 'img') {
            slot.el.style.opacity = '1';
            slot.el.src = dataUrl;
          } else {
            slot.el.style.backgroundImage = `url("${dataUrl}")`;
          }

          applySlotTransformAndScrim(slot);
          updateMediaStatusBar();
          syncExportButtonsForMediaKind();
          showToast(`Foto UHD (${probeImg.naturalWidth}×${probeImg.naturalHeight}px) aplicada`);
        };
        probeImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  function restoreSlotOriginalMedia() {
    const slot = state.mediaSlots[state.activeMediaSlotIndex];
    if (!slot || !slot.el) return;

    if (slot.customVideoUrl) {
      URL.revokeObjectURL(slot.customVideoUrl);
    }
    slot.customDataUrl = null;
    slot.customVideoUrl = null;
    slot.isVideo = false;
    slot.videoEl = null;
    slot.fileName = null;
    slot.panY = 50;
    slot.zoom = 1;
    slot.scrim = 0.80;

    const oldVid = slot.el.parentElement ? slot.el.parentElement.querySelector('video.sens-bg-video') : null;
    if (oldVid) oldVid.remove();
    const innerVid = slot.el.querySelector ? slot.el.querySelector('video.sens-bg-video') : null;
    if (innerVid) innerVid.remove();

    if (slot.type === 'injected-bg') {
      slot.el.style.backgroundImage = 'none';
      slot.el.classList.add('opacity-0');
      if (slot.scrimEl) slot.scrimEl.classList.add('opacity-0');
    } else if (slot.type === 'img') {
      slot.el.style.opacity = '1';
      slot.el.src = slot.originalUrl;
    } else {
      slot.el.style.backgroundImage = slot.originalUrl ? `url("${slot.originalUrl}")` : '';
    }

    applySlotTransformAndScrim(slot);
    updateMediaCalibratorButtonsUI();
    updateMediaStatusBar();
    syncExportButtonsForMediaKind();
    showToast('Fondo original restaurado');
  }

  function applySlotTransformAndScrim(slot) {
    if (!slot || !slot.el) return;
    if (slot.type === 'img') {
      slot.el.style.objectPosition = `center ${slot.panY}%`;
      slot.el.style.transform = slot.zoom === 1 ? '' : `scale(${slot.zoom})`;
    } else {
      slot.el.style.backgroundPosition = `center ${slot.panY}%`;
      slot.el.style.transform = slot.zoom === 1 ? '' : `scale(${slot.zoom})`;
      const vid = slot.el.querySelector('video.sens-bg-video');
      if (vid) {
        vid.style.objectPosition = `center ${slot.panY}%`;
      }
    }
    if (slot.scrimEl) {
      // Scale scrim opacity relative to default 0.80
      const ratio = Math.min(1, Math.max(0.2, slot.scrim / 0.50));
      slot.scrimEl.style.opacity = String(ratio);
    }
  }

  function updateMediaStatusBar() {
    const slot = state.mediaSlots[state.activeMediaSlotIndex];
    if (!slot || (!slot.customDataUrl && !slot.customVideoUrl)) {
      els.mediaStatusBar.classList.add('hidden');
      els.mediaStatusBar.classList.remove('flex');
      return;
    }
    els.mediaStatusBar.classList.remove('hidden');
    els.mediaStatusBar.classList.add('flex');
    const resTag = slot.naturalWidth ? ` (${slot.naturalWidth}×${slot.naturalHeight} px)` : '';
    const kind = slot.customVideoUrl ? 'Video Loop' : 'Foto Nativa UHD';
    els.mediaStatusText.textContent = `${kind}: ${slot.fileName || 'Archivo cargado'}${resTag}`;
  }

  function updateMediaCalibratorButtonsUI() {
    const slot = state.mediaSlots[state.activeMediaSlotIndex] || { panY: 50, zoom: 1, scrim: 0.50 };

    document.querySelectorAll('[data-pan-btn]').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-pan-btn'));
      const active = Math.abs(val - slot.panY) < 1;
      btn.className = active
        ? 'px-2 py-1 rounded bg-primary text-on-primary text-[10px] font-mono transition-colors whitespace-nowrap shrink-0'
        : 'px-2 py-1 rounded bg-surface-container text-[10px] font-mono text-on-surface hover:bg-surface-container-high transition-colors whitespace-nowrap shrink-0';
    });

    document.querySelectorAll('[data-zoom-btn]').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-zoom-btn'));
      const active = Math.abs(val - slot.zoom) < 0.01;
      btn.className = active
        ? 'px-2 py-1 rounded bg-primary text-on-primary text-[10px] font-mono transition-colors whitespace-nowrap shrink-0'
        : 'px-2 py-1 rounded bg-surface-container text-[10px] font-mono text-on-surface hover:bg-surface-container-high transition-colors whitespace-nowrap shrink-0';
    });

    document.querySelectorAll('[data-scrim-btn]').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-scrim-btn'));
      const active = Math.abs(val - slot.scrim) < 0.02;
      btn.className = active
        ? 'px-2 py-1 rounded bg-primary text-on-primary text-[10px] font-mono transition-colors whitespace-nowrap shrink-0'
        : 'px-2 py-1 rounded bg-surface-container text-[10px] font-mono text-on-surface hover:bg-surface-container-high transition-colors whitespace-nowrap shrink-0';
    });
  }


  // =========================================================================
  // ELEMENT VISIBILITY & IN-CANVAS SELECTION ENGINE
  // Allows coaches to tap any component/pill in the template or in Step 3
  // to hide it completely from both preview and 4K UHD / HD video outputs.
  // =========================================================================

  function getTargetHideElement(el) {
    if (!el) return null;
    const stage = document.getElementById('video-canvas');
    if (el === stage || (el.id && el.id === 'video-canvas')) return null;

    // Check if the element is inside a dedicated chip / pill wrapper
    // (e.g. <div class="px-3 py-1 rounded-full bg-secondary-fixed ..."><span>Tag</span></div>)
    const parent = el.parentElement;
    if (parent && parent !== stage && parent.id !== 'video-canvas') {
      const parentClass = (parent.className || '').toString();
      const isBadgeOrPill = /(rounded-full|rounded-xl|rounded-lg|badge|pill|chip)/i.test(parentClass);
      const hasBgOrBorder = /(bg-|border)/i.test(parentClass);
      const childCount = parent.children ? parent.children.length : 0;
      if (isBadgeOrPill && (hasBgOrBorder || childCount <= 2)) {
        return parent;
      }
    }
    return el;
  }

  function selectCanvasElement(target) {
    if (!target) return;
    const stage = document.getElementById('video-canvas');
    if (target === stage || (target.id && target.id === 'video-canvas')) return;
    if (target.classList && (target.classList.contains('safe-zone-overlay') || target.closest('.safe-zone-overlay'))) return;

    if (state.selectedElement && state.selectedElement !== target) {
      state.selectedElement.classList.remove('sens-canvas-selected');
    }

    state.selectedElement = target;
    target.classList.add('sens-canvas-selected');
    updateVisibilityUI();
  }

  function clearCanvasSelection() {
    if (state.selectedElement) {
      state.selectedElement.classList.remove('sens-canvas-selected');
      state.selectedElement = null;
    }
    updateVisibilityUI();
  }

  function toggleElementVisibility(el) {
    if (!el) return;
    const hideTarget = getTargetHideElement(el);
    if (!hideTarget) return;

    const isCurrentlyHidden = state.hiddenElements.has(el) ||
      state.hiddenElements.has(hideTarget) ||
      hideTarget.classList.contains('sens-element-hidden') ||
      hideTarget.getAttribute('data-sens-hidden') === 'true';

    if (isCurrentlyHidden) {
      // Unhide
      hideTarget.classList.remove('sens-element-hidden');
      hideTarget.removeAttribute('data-sens-hidden');
      hideTarget.style.display = '';
      state.hiddenElements.delete(el);
      state.hiddenElements.delete(hideTarget);
      showToast('Elemento visible');
    } else {
      // Hide
      hideTarget.classList.add('sens-element-hidden');
      hideTarget.setAttribute('data-sens-hidden', 'true');
      state.hiddenElements.add(el);
      state.hiddenElements.add(hideTarget);
      showToast('Elemento oculto en exportación');
    }

    updateVisibilityUI();
    reportHeightToParent();
  }

  function restoreAllHiddenElements() {
    const stage = document.getElementById('video-canvas');
    if (stage) {
      const hiddenNodes = stage.querySelectorAll('.sens-element-hidden, [data-sens-hidden]');
      hiddenNodes.forEach(node => {
        node.classList.remove('sens-element-hidden');
        node.removeAttribute('data-sens-hidden');
        node.style.display = '';
      });
    }
    state.hiddenElements.clear();
    updateVisibilityUI();
    reportHeightToParent();
    showToast('Todos los elementos restaurados');
  }

  function updateVisibilityUI() {
    // 1. Hook visibility
    if (els.fieldWrapHook && els.btnVisHook) {
      const isHookHidden = state.textBindings.hookEl && (
        state.hiddenElements.has(state.textBindings.hookEl) ||
        state.textBindings.hookEl.classList.contains('sens-element-hidden') ||
        state.textBindings.hookEl.closest('.sens-element-hidden')
      );
      els.fieldWrapHook.classList.toggle('sens-field-muted', !!isHookHidden);
      if (els.inputHook) els.inputHook.disabled = !!isHookHidden;
      const icon = els.btnVisHook.querySelector('.material-symbols-outlined');
      const label = els.btnVisHook.querySelector('.vis-label');
      if (icon) icon.textContent = isHookHidden ? 'visibility_off' : 'visibility';
      if (label) label.textContent = isHookHidden ? 'Oculto' : 'Visible';
      els.btnVisHook.className = isHookHidden
        ? 'text-error hover:text-error/80 px-1.5 py-0.5 rounded bg-error/10 transition-colors flex items-center gap-1 text-[10px] font-semibold'
        : 'text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[10px] font-medium';
    }

    // 2. Bajada visibility
    if (els.fieldWrapBajada && els.btnVisBajada) {
      const isBajadaHidden = state.textBindings.bajadaEl && (
        state.hiddenElements.has(state.textBindings.bajadaEl) ||
        state.textBindings.bajadaEl.classList.contains('sens-element-hidden') ||
        state.textBindings.bajadaEl.closest('.sens-element-hidden')
      );
      els.fieldWrapBajada.classList.toggle('sens-field-muted', !!isBajadaHidden);
      if (els.inputBajada) els.inputBajada.disabled = !!isBajadaHidden;
      const icon = els.btnVisBajada.querySelector('.material-symbols-outlined');
      const label = els.btnVisBajada.querySelector('.vis-label');
      if (icon) icon.textContent = isBajadaHidden ? 'visibility_off' : 'visibility';
      if (label) label.textContent = isBajadaHidden ? 'Oculto' : 'Visible';
      els.btnVisBajada.className = isBajadaHidden
        ? 'text-error hover:text-error/80 px-1.5 py-0.5 rounded bg-error/10 transition-colors flex items-center gap-1 text-[10px] font-semibold'
        : 'text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[10px] font-medium';
    }

    // 3. CTA visibility
    if (els.fieldWrapCta && els.btnVisCta) {
      const isCtaHidden = state.textBindings.ctaEl && (
        state.hiddenElements.has(state.textBindings.ctaEl) ||
        state.textBindings.ctaEl.classList.contains('sens-element-hidden') ||
        state.textBindings.ctaEl.closest('.sens-element-hidden')
      );
      els.fieldWrapCta.classList.toggle('sens-field-muted', !!isCtaHidden);
      if (els.inputCta) els.inputCta.disabled = !!isCtaHidden;
      const icon = els.btnVisCta.querySelector('.material-symbols-outlined');
      const label = els.btnVisCta.querySelector('.vis-label');
      if (icon) icon.textContent = isCtaHidden ? 'visibility_off' : 'visibility';
      if (label) label.textContent = isCtaHidden ? 'Oculto' : 'Visible';
      els.btnVisCta.className = isCtaHidden
        ? 'text-error hover:text-error/80 px-1.5 py-0.5 rounded bg-error/10 transition-colors flex items-center gap-1 text-[10px] font-semibold'
        : 'text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[10px] font-medium';
    }

    // 4. Extra components visibility
    (state.textBindings.extraEls || []).forEach((el, idx) => {
      const wrap = document.getElementById(`field-wrap-extra-${idx}`);
      const btn = wrap ? wrap.querySelector('[data-vis-target]') : null;
      const inp = wrap ? wrap.querySelector('[data-extra-input]') : null;
      if (wrap && btn) {
        const isHidden = state.hiddenElements.has(el) ||
          el.classList.contains('sens-element-hidden') ||
          el.closest('.sens-element-hidden');
        wrap.classList.toggle('sens-field-muted', !!isHidden);
        if (inp) inp.disabled = !!isHidden;
        const icon = btn.querySelector('.material-symbols-outlined');
        const label = btn.querySelector('.vis-label');
        if (icon) icon.textContent = isHidden ? 'visibility_off' : 'visibility';
        if (label) label.textContent = isHidden ? 'Oculto' : 'Visible';
        btn.className = isHidden
          ? 'text-error hover:text-error/80 px-1.5 py-0.5 rounded bg-error/10 transition-colors flex items-center gap-1 text-[9.5px] font-semibold'
          : 'text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[9.5px] font-medium';
      }
    });

    // 5. Quick interactive helper row under canvas
    const stage = document.getElementById('video-canvas');
    const totalHidden = stage ? stage.querySelectorAll('.sens-element-hidden').length : state.hiddenElements.size;

    if (els.btnRestoreAllHidden && els.restoreHiddenBadgeText) {
      if (totalHidden > 0) {
        els.btnRestoreAllHidden.classList.remove('hidden');
        els.btnRestoreAllHidden.classList.add('flex');
        els.restoreHiddenBadgeText.textContent = `${totalHidden} oculto${totalHidden > 1 ? 's' : ''} (Restaurar)`;
      } else {
        els.btnRestoreAllHidden.classList.add('hidden');
        els.btnRestoreAllHidden.classList.remove('flex');
      }
    }

    // 6. Selected element bar in helper row
    if (els.helperSelectionActions && els.helperDefaultMsg) {
      if (state.selectedElement && state.selectedElement.isConnected) {
        els.helperDefaultMsg.classList.add('hidden');
        els.helperSelectionActions.classList.remove('hidden');
        els.helperSelectionActions.classList.add('flex');

        const hideTarget = getTargetHideElement(state.selectedElement);
        const isSelectedHidden = state.hiddenElements.has(state.selectedElement) ||
          (hideTarget && (hideTarget.classList.contains('sens-element-hidden') || hideTarget.getAttribute('data-sens-hidden') === 'true'));

        if (els.helperSelectedLabel) {
          const txt = cleanText(state.selectedElement);
          els.helperSelectedLabel.textContent = txt ? (txt.length > 18 ? txt.slice(0, 16) + '…' : txt) : 'Elemento';
        }
        if (els.btnQuickHideText) {
          els.btnQuickHideText.textContent = isSelectedHidden ? 'Mostrar' : 'Ocultar';
        }
        const quickIcon = els.btnQuickHideSelected ? els.btnQuickHideSelected.querySelector('.material-symbols-outlined') : null;
        if (quickIcon) {
          quickIcon.textContent = isSelectedHidden ? 'visibility' : 'visibility_off';
        }
      } else {
        els.helperSelectionActions.classList.add('hidden');
        els.helperSelectionActions.classList.remove('flex');
        els.helperDefaultMsg.classList.remove('hidden');
      }
    }
  }

  // Discover Editable Text Components & Bind to the 3 Universal Inputs + Extra Component Inputs
  function discoverAndBindTextNodes(rootEl) {
    const ignoredSelector = '.safe-zone-overlay, .card-safe-mask, .safe-guide, .grid-overlay-guideline, .material-symbols-outlined, script, style, svg';
    const candidates = [];

    // Walk elements in DOM order
    const allEls = Array.from(rootEl.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, span, div, li'));
    const claimedAncestors = new Set();

    allEls.forEach(el => {
      if (el.matches(ignoredSelector) || el.closest(ignoredSelector)) return;
      if (el.classList.contains('material-symbols-outlined')) return;

      // Avoid claiming a child if its semantic parent heading/paragraph is already claimed
      for (const anc of claimedAncestors) {
        if (anc.contains(el)) return;
      }

      const tag = el.tagName.toLowerCase();
      const isSemanticBlock = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'].includes(tag);

      // Check if it has only inline formatting children (span, br, strong, em) or direct text
      const childElements = Array.from(el.children);
      const hasComplexChildren = childElements.some(c => !['SPAN', 'BR', 'STRONG', 'EM', 'B', 'I'].includes(c.tagName) || c.classList.contains('material-symbols-outlined'));

      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      if (isSemanticBlock && !hasComplexChildren) {
        claimedAncestors.add(el);
        candidates.push({ el, tag, text });
      } else if (!isSemanticBlock && childElements.length === 0) {
        claimedAncestors.add(el);
        candidates.push({ el, tag, text });
      }
    });

    // Make every candidate directly editable in-canvas via tap/click & selectable for hide/show
    candidates.forEach(item => {
      item.el.setAttribute('contenteditable', 'true');
      item.el.setAttribute('spellcheck', 'false');
      item.el.setAttribute('data-sens-editable', 'true');

      item.el.addEventListener('focus', () => selectCanvasElement(item.el));
      item.el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectCanvasElement(item.el);
      });
    });

    // Assign Primary Hook (first heading h1-h4, or largest text block)
    let hookItem = candidates.find(c => ['h1', 'h2', 'h3', 'h4'].includes(c.tag));
    if (!hookItem) {
      hookItem = candidates.find(c => c.text.length > 12) || candidates[0] || null;
    }

    // Assign Primary Bajada (first paragraph <p> or longer description different from hookItem)
    let bajadaItem = candidates.find(c => c !== hookItem && (c.tag === 'p' || c.tag === 'blockquote' || c.text.length > 28));
    if (!bajadaItem) {
      bajadaItem = candidates.find(c => c !== hookItem && c.text.length > 10) || null;
    }

    // Assign Primary CTA / Kicker / Tag (last or first short label different from hook & bajada)
    const remaining = candidates.filter(c => c !== hookItem && c !== bajadaItem);
    let ctaItem = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    const extraItems = remaining.filter(c => c !== ctaItem);

    state.textBindings = {
      hookEl: hookItem ? hookItem.el : null,
      bajadaEl: bajadaItem ? bajadaItem.el : null,
      ctaEl: ctaItem ? ctaItem.el : null,
      extraEls: extraItems.map(x => x.el)
    };

    // Sync initial values into Step 3 inputs & enable multi-line breaks (pre-line)
    if (state.textBindings.hookEl) {
      state.textBindings.hookEl.style.whiteSpace = 'pre-line';
      els.inputHook.value = cleanText(state.textBindings.hookEl);
      els.inputHook.disabled = false;
    } else {
      els.inputHook.value = '';
      els.inputHook.disabled = true;
    }

    if (state.textBindings.bajadaEl) {
      state.textBindings.bajadaEl.style.whiteSpace = 'pre-line';
      els.inputBajada.value = cleanText(state.textBindings.bajadaEl);
      els.inputBajada.disabled = false;
    } else {
      els.inputBajada.value = '';
      els.inputBajada.disabled = true;
    }

    if (state.textBindings.ctaEl) {
      els.inputCta.value = cleanText(state.textBindings.ctaEl);
      els.inputCta.disabled = false;
    } else {
      els.inputCta.value = '';
      els.inputCta.disabled = true;
    }

    updateCharCounters();
    renderExtraComponentInputs();
    updateVisibilityUI();

    // Listen to in-canvas edits to keep Step 3 inputs in sync
    candidates.forEach(item => {
      item.el.addEventListener('input', () => {
        if (item.el === state.textBindings.hookEl) {
          els.inputHook.value = cleanText(item.el);
          updateCharCounters();
        } else if (item.el === state.textBindings.bajadaEl) {
          els.inputBajada.value = cleanText(item.el);
          updateCharCounters();
        } else if (item.el === state.textBindings.ctaEl) {
          els.inputCta.value = cleanText(item.el);
        } else {
          const idx = state.textBindings.extraEls.indexOf(item.el);
          if (idx !== -1) {
            const extraInput = els.extraList.querySelector(`[data-extra-input="${idx}"]`);
            if (extraInput) extraInput.value = cleanText(item.el);
          }
        }
      });
    });
  }

  function cleanText(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function updateCharCounters() {
    const hookLen = (els.inputHook.value || '').length;
    els.counterHook.textContent = `${hookLen} / 50 • ${hookLen <= 50 ? 'Óptimo' : 'Largo'}`;
    els.counterHook.className = hookLen <= 50
      ? 'text-[10px] font-mono text-tertiary-fixed-dim'
      : 'text-[10px] font-mono text-error';

    const bajadaLen = (els.inputBajada.value || '').length;
    els.counterBajada.textContent = `${bajadaLen} / 120`;
    els.counterBajada.className = bajadaLen <= 120
      ? 'text-[10px] font-mono text-on-surface-variant'
      : 'text-[10px] font-mono text-error';
  }

  function renderExtraComponentInputs() {
    const extras = state.textBindings.extraEls || [];
    if (extras.length === 0) {
      els.extraWrapper.classList.add('hidden');
      els.extraList.innerHTML = '';
      return;
    }
    els.extraWrapper.classList.remove('hidden');
    els.extraLabel.textContent = `Componentes adicionales del template (${extras.length})`;
    els.extraList.innerHTML = extras.map((el, idx) => {
      const val = cleanText(el).replace(/"/g, '&quot;');
      const isHidden = state.hiddenElements.has(el) || el.classList.contains('sens-element-hidden');
      return `
        <div id="field-wrap-extra-${idx}" class="bg-surface p-2.5 rounded-xl border border-outline-variant/20 focus-within:border-secondary transition-colors ${isHidden ? 'sens-field-muted' : ''}">
          <div class="flex justify-between items-center gap-1.5 mb-1">
            <label class="block text-[9px] font-mono uppercase tracking-wider text-on-surface-variant truncate">Componente #${idx + 1}</label>
            <button type="button" data-vis-target="extra-${idx}" class="text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[9.5px] font-medium" title="Ocultar o mostrar del output">
              <span class="material-symbols-outlined text-[14px]">${isHidden ? 'visibility_off' : 'visibility'}</span>
              <span class="vis-label hidden sm:inline">${isHidden ? 'Oculto' : 'Visible'}</span>
            </button>
          </div>
          <input type="text" data-extra-input="${idx}" value="${val}" ${isHidden ? 'disabled' : ''} class="w-full bg-transparent border-none p-0 text-xs font-medium text-on-surface focus:ring-0" />
        </div>
      `;
    }).join('');

    els.extraList.querySelectorAll('[data-extra-input]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-extra-input'), 10);
        const targetEl = state.textBindings.extraEls[idx];
        if (targetEl) {
          targetEl.textContent = inp.value;
        }
      });
    });

    els.extraList.querySelectorAll('[data-vis-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetKey = btn.getAttribute('data-vis-target');
        const idx = parseInt(targetKey.replace('extra-', ''), 10);
        const targetEl = state.textBindings.extraEls[idx];
        if (targetEl) {
          toggleElementVisibility(targetEl);
        }
      });
    });
  }

  // Safe Zones Overlay Toggle
  function applySafeZoneState(rootEl) {
    if (!rootEl) rootEl = document.getElementById('video-canvas');
    if (!rootEl) return;

    const overlays = rootEl.querySelectorAll('.safe-zone-overlay, .card-safe-mask, .safe-guide, .safe-zone-marker, .grid-overlay-guideline');
    overlays.forEach(ov => {
      if (state.safeZonesVisible) {
        ov.classList.remove('opacity-0', 'hidden');
        ov.classList.add('opacity-100');
      } else {
        ov.classList.remove('opacity-100');
        ov.classList.add('opacity-0');
      }
    });

    els.safezoneDot.className = state.safeZonesVisible
      ? 'w-2 h-2 rounded-full bg-tertiary-fixed-dim'
      : 'w-2 h-2 rounded-full bg-outline';
  }

  // Biometric HUD Overlay Toggle (Disabled / Removed per Coach UX directive)
  function applyHudState(rootEl) {
    if (!rootEl) rootEl = document.getElementById('video-canvas');
    if (!rootEl) return;
    rootEl.querySelectorAll('.sens-hud-layer, .sens-injected-hud').forEach(layer => {
      layer.remove();
    });
  }

  function applyMotionLoopState(rootEl) {
    if (!rootEl) rootEl = document.getElementById('video-canvas');
    if (!rootEl) return;
    if (state.motionLoop) {
      rootEl.classList.add('sens-motion-loop-active');
    } else {
      rootEl.classList.remove('sens-motion-loop-active');
    }
  }

  function updateGroupButtonsUI() {
    document.querySelectorAll('[data-group-btn]').forEach(btn => {
      const grp = btn.getAttribute('data-group-btn');
      const active = grp === state.group;
      btn.className = active
        ? 'px-3.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-semibold shadow-sm transition-all whitespace-nowrap shrink-0'
        : 'px-3.5 py-1 rounded-lg text-on-surface-variant hover:text-on-surface text-[11px] font-semibold transition-all whitespace-nowrap shrink-0';
    });
  }

  function initEvents() {
    // Group Switcher (Estáticos vs Con animación)
    document.querySelectorAll('[data-group-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.getAttribute('data-group-btn');
        if (grp && grp !== state.group) {
          state.group = grp;
          state.blockId = 'all';
          updateGroupButtonsUI();
          renderPillarChips();
          renderTemplateCarousel();
          const firstInGroup = ALL_TEMPLATES.find(t => t.group === state.group) || ALL_TEMPLATES[0];
          if (firstInGroup) {
            selectTemplate(firstInGroup.id);
          }
        }
      });
    });

    // Backwards-compatible format btn listener
    document.querySelectorAll('[data-format-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-format-btn');
        if (fmt === 'static' || fmt === 'motion') {
          if (fmt !== state.group) {
            state.group = fmt;
            state.blockId = 'all';
            updateGroupButtonsUI();
            renderPillarChips();
            renderTemplateCarousel();
            const firstInGroup = ALL_TEMPLATES.find(t => t.group === state.group) || ALL_TEMPLATES[0];
            if (firstInGroup) selectTemplate(firstInGroup.id);
          }
        }
      });
    });

    // Safe Zones Toggle
    els.safezoneBtn.addEventListener('click', () => {
      state.safeZonesVisible = !state.safeZonesVisible;
      applySafeZoneState();
    });

    // Upload Media Buttons
    els.uploadBtn.addEventListener('click', () => els.fileInput.click());
    if (els.quickUploadBtn) {
      els.quickUploadBtn.addEventListener('click', () => els.fileInput.click());
    }
    els.fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleMediaFileUpload(file);
      }
      els.fileInput.value = '';
    });

    els.clearMediaBtn.addEventListener('click', restoreSlotOriginalMedia);

    // Camera Calibrators: PanY, Zoom, Scrim
    document.querySelectorAll('[data-pan-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = state.mediaSlots[state.activeMediaSlotIndex];
        if (!slot) return;
        slot.panY = parseFloat(btn.getAttribute('data-pan-btn'));
        applySlotTransformAndScrim(slot);
        updateMediaCalibratorButtonsUI();
      });
    });

    document.querySelectorAll('[data-zoom-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = state.mediaSlots[state.activeMediaSlotIndex];
        if (!slot) return;
        slot.zoom = parseFloat(btn.getAttribute('data-zoom-btn'));
        applySlotTransformAndScrim(slot);
        updateMediaCalibratorButtonsUI();
      });
    });

    document.querySelectorAll('[data-scrim-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = state.mediaSlots[state.activeMediaSlotIndex];
        if (!slot) return;
        slot.scrim = parseFloat(btn.getAttribute('data-scrim-btn'));
        applySlotTransformAndScrim(slot);
        updateMediaCalibratorButtonsUI();
      });
    });

    // Quick Formula Pills
    document.querySelectorAll('[data-formula-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fId = btn.getAttribute('data-formula-id');
        const formula = QUICK_FORMULAS[fId];
        if (!formula) return;

        document.querySelectorAll('[data-formula-id]').forEach(b => {
          b.className = b === btn
            ? 'px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all'
            : 'px-2.5 py-1 rounded-full bg-surface text-on-surface-variant hover:text-on-surface text-[10px] font-medium whitespace-nowrap shrink-0 transition-all';
        });

        if (state.textBindings.hookEl) {
          els.inputHook.value = formula.hook;
          state.textBindings.hookEl.textContent = formula.hook;
        }
        if (state.textBindings.bajadaEl) {
          els.inputBajada.value = formula.bajada;
          state.textBindings.bajadaEl.textContent = formula.bajada;
        }
        if (state.textBindings.ctaEl) {
          els.inputCta.value = formula.cta;
          state.textBindings.ctaEl.textContent = formula.cta;
        }
        updateCharCounters();
        showToast('Fórmula de alto CTR inyectada');
      });
    });

    // 3 Universal Inputs Two-Way Binding
    els.inputHook.addEventListener('input', () => {
      if (state.textBindings.hookEl) {
        state.textBindings.hookEl.textContent = els.inputHook.value;
      }
      updateCharCounters();
    });

    els.inputBajada.addEventListener('input', () => {
      if (state.textBindings.bajadaEl) {
        state.textBindings.bajadaEl.textContent = els.inputBajada.value;
      }
      updateCharCounters();
    });

    els.inputCta.addEventListener('input', () => {
      if (state.textBindings.ctaEl) {
        state.textBindings.ctaEl.textContent = els.inputCta.value;
      }
    });

    // Extra Fields Accordion Toggle
    if (els.extraToggleBtn) {
      els.extraToggleBtn.addEventListener('click', () => {
        els.extraList.classList.toggle('hidden');
      });
    }

    // Export Buttons (Bottom & Quick Top Bar under Preview)
    if (els.exportOverlayPngBtn) {
      els.exportOverlayPngBtn.addEventListener('click', handleExportTransparentOverlayPNG);
    }
    const quickOverlayBtn = document.getElementById('btn-quick-export-overlay-png');
    if (quickOverlayBtn) {
      quickOverlayBtn.addEventListener('click', handleExportTransparentOverlayPNG);
    }
    const quickReelBtn = document.getElementById('btn-quick-export-reel');
    if (quickReelBtn) {
      quickReelBtn.addEventListener('click', handleExportReel60FPS);
    }
    const quick4kBtn = document.getElementById('btn-quick-export-4k');
    if (quick4kBtn) {
      quick4kBtn.addEventListener('click', handleExport4K);
    }
    els.export4kBtn.addEventListener('click', handleExport4K);
    els.exportReelBtn.addEventListener('click', handleExportReel60FPS);
    els.copyCaptionBtn.addEventListener('click', handleCopyCaption);

    // Sticky Floating Utility Bar for iOS Mobile Scroll (Keeps template info & Quick Export visible)
    const floatingBar = document.getElementById('sens-sticky-floating-bar');
    const floatingPngBtn = document.getElementById('btn-floating-export-png');
    const floatingScrollTopBtn = document.getElementById('btn-floating-scroll-top');
    const previewSection = document.getElementById('section-live-viewport');

    if (floatingBar && previewSection) {
      if (floatingPngBtn) {
        floatingPngBtn.addEventListener('click', handleExportTransparentOverlayPNG);
      }
      if (floatingScrollTopBtn) {
        floatingScrollTopBtn.addEventListener('click', () => {
          previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      let tickTicking = false;
      const updateFloatingBarVisibility = () => {
        const rect = previewSection.getBoundingClientRect();
        // When the bottom of the preview card has scrolled above the upper third of screen, show floating dock
        const isPreviewPast = rect.bottom < 180;
        if (isPreviewPast) {
          floatingBar.classList.remove('sens-dock-hidden');
        } else {
          floatingBar.classList.add('sens-dock-hidden');
        }
        tickTicking = false;
      };

      window.addEventListener('scroll', () => {
        if (!tickTicking) {
          window.requestAnimationFrame(updateFloatingBarVisibility);
          tickTicking = true;
        }
      }, { passive: true });
    }

    // Vault Modal
    els.openVaultBtn.addEventListener('click', openVaultModal);
    els.closeVaultBtn.addEventListener('click', () => els.vaultModal.classList.add('hidden'));
    els.vaultModal.addEventListener('click', (e) => {
      if (e.target === els.vaultModal) els.vaultModal.classList.add('hidden');
    });

    // Reset Template
    els.resetTemplateBtn.addEventListener('click', () => {
      selectTemplate(state.activeTemplateId);
      showToast('Template restaurado a su estado original');
    });

    // Visibility Toggles for Step 3 Universal Fields
    if (els.btnVisHook) {
      els.btnVisHook.addEventListener('click', () => {
        if (state.textBindings.hookEl) toggleElementVisibility(state.textBindings.hookEl);
      });
    }
    if (els.btnVisBajada) {
      els.btnVisBajada.addEventListener('click', () => {
        if (state.textBindings.bajadaEl) toggleElementVisibility(state.textBindings.bajadaEl);
      });
    }
    if (els.btnVisCta) {
      els.btnVisCta.addEventListener('click', () => {
        if (state.textBindings.ctaEl) toggleElementVisibility(state.textBindings.ctaEl);
      });
    }

    // Quick Canvas Selection Action Pill (under preview)
    if (els.btnQuickHideSelected) {
      els.btnQuickHideSelected.addEventListener('click', () => {
        if (state.selectedElement) {
          toggleElementVisibility(state.selectedElement);
        }
      });
    }
    if (els.btnRestoreAllHidden) {
      els.btnRestoreAllHidden.addEventListener('click', () => {
        restoreAllHiddenElements();
      });
    }

    // Stage Mount click listener for in-canvas element selection
    if (els.stageMount) {
      els.stageMount.addEventListener('click', (e) => {
        const target = e.target;
        if (!target || target === els.stageMount) return;
        selectCanvasElement(target);
      });
    }

    // Click outside canvas deselects active element
    document.addEventListener('pointerdown', (e) => {
      if (!state.selectedElement) return;
      const stage = document.getElementById('video-canvas');
      const helper = document.getElementById('quick-interactive-helper');
      if (stage && stage.contains(e.target)) return;
      if (helper && helper.contains(e.target)) return;
      clearCanvasSelection();
    });

    // Bottom Navigation Bar
    document.querySelectorAll('[data-bottom-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-bottom-nav');
        document.querySelectorAll('[data-bottom-nav]').forEach(b => {
          b.className = b === btn
            ? 'flex flex-col items-center justify-center text-primary font-semibold bg-secondary-fixed/40 rounded-xl px-3.5 py-1 transition-all duration-200'
            : 'flex flex-col items-center justify-center text-on-surface-variant hover:text-primary px-3.5 py-1 transition-all duration-200';
        });
        if (target === 'formato') {
          document.getElementById('section-step-1').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target === 'hooks') {
          document.getElementById('section-step-3').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target === 'preview') {
          document.getElementById('section-live-viewport').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (target === 'boveda') {
          openVaultModal();
        }
      });
    });

    // Report height to parent Coach OS window to enable a single smooth page scroll
    function reportHeightToParent() {
      if (window.self === window.top) return;
      try {
        if (!document.body.classList.contains('is-embedded')) {
          document.body.classList.add('is-embedded');
        }
        const h = Math.max(
          document.body.scrollHeight || 0,
          document.documentElement.scrollHeight || 0,
          document.body.offsetHeight || 0,
          document.documentElement.offsetHeight || 0
        );
        if (h > 100) {
          window.parent.postMessage({ type: 'SENS_MKT_HEIGHT', height: h }, '*');
        }
      } catch (_) {}
    }

    window.addEventListener('resize', reportHeightToParent, { passive: true });
    window.addEventListener('load', reportHeightToParent, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      try {
        const ro = new ResizeObserver(() => reportHeightToParent());
        ro.observe(document.body);
      } catch (_) {}
    }

    // Listen to postMessage from parent SENS portal if needed
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'SENS_SELECT_TEMPLATE' && e.data.id) {
        selectTemplate(e.data.id);
      } else if (e.data.type === 'SENS_EXPORT_4K') {
        handleExport4K();
      } else if (e.data.type === 'SENS_REQUEST_HEIGHT') {
        reportHeightToParent();
      }
    });
  }

  // Expose public API for testing & automation
  window.SENSMarketingStudio = {
    state,
    ALL_TEMPLATES,
    selectTemplate,
    handleMediaFileUpload,
    renderStageToHighResCanvas,
    handleExportTransparentOverlayPNG,
    handleExport4K,
    handleExportReel60FPS
  };

  // Boot Studio
  initEvents();
  selectTemplate('T01');
})();
