/**
 * SENS Marketing Studio Master Engine (Zero Layout Drift + True 4K UHD Pipeline)
 * Connects the 200 Sacred Templates (T01-T100 in 9:16, F01-F100 in 4:5 + T00 Somatic HUD)
 * to the 3-Step Natural Creation Flow specified in mkt-admin/DESIGN.md & Protocolo Maestro.
 */
(function () {
  'use strict';

  const rawDb = Array.isArray(window.SENS_TEMPLATES_DB_200) ? window.SENS_TEMPLATES_DB_200 : [];
  const ALL_TEMPLATES = [...rawDb];

  const PILLARS_BY_FORMAT = {
    '9:16': [
      { id: 'b1', label: 'T01-T20 Biomecánica' },
      { id: 'b2', label: 'T21-T40 Nutrición & Ritmo' },
      { id: 'b3', label: 'T41-T60 Métricas & Datos' },
      { id: 'b4', label: 'T61-T80 Diálogos & Stories' },
      { id: 'b5', label: 'T81-T100 Conversión Directa' }
    ],
    '4:5': [
      { id: 'b1', label: 'F01-F20 Bloques Flotantes' },
      { id: 'b2', label: 'F21-F40 Editorial & Tipografía' },
      { id: 'b3', label: 'F41-F60 Métricas & Datos' },
      { id: 'b4', label: 'F61-F80 Micro-Stories & Quotes' },
      { id: 'b5', label: 'F81-F100 Conversión Directa' }
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
    format: '9:16',
    blockId: 'b1',
    activeTemplateId: 'T01',
    motionLoop: false,
    safeZonesVisible: false,
    hudVisible: false,
    activeMediaSlotIndex: 0,
    mediaSlots: [], // [{ el, type: 'bg'|'img', originalUrl, customDataUrl, customVideoUrl, panY: 50, zoom: 1, scrim: 0.80, naturalWidth, naturalHeight }]
    textBindings: {
      hookEl: null,
      bajadaEl: null,
      ctaEl: null,
      extraEls: []
    }
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
    extraWrapper: document.getElementById('extra-components-wrapper'),
    extraToggleBtn: document.getElementById('btn-toggle-extra-fields'),
    extraLabel: document.getElementById('extra-fields-label'),
    extraList: document.getElementById('extra-fields-list'),
    hudToggleBtn: document.getElementById('btn-toggle-hud'),
    hudKnob: document.getElementById('hud-switch-knob'),
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
        ? 'px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm'
        : 'px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface text-[11px] font-medium whitespace-nowrap transition-all';
      return `<button type="button" data-pillar-id="${p.id}" class="${cls}">${p.label}</button>`;
    }).join('') + `
      <button type="button" id="btn-inline-vault" class="px-3 py-1 rounded-full bg-surface-container-high text-primary text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1">
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
    if (tpl.format !== state.format) {
      state.format = tpl.format;
      updateFormatButtonsUI();
    }
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
        scrim: 0.80,
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
        scrim: 0.80,
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
      fallbackScrim.className = 'absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent pointer-events-none opacity-0 transition-opacity duration-300';
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
        scrim: 0.80,
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
      els.exportReelLabel.textContent = isVid ? 'Exportar Reel 60FPS (MP4)' : 'Exportar Reel 60FPS (MP4)';
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
      const ratio = Math.min(1, Math.max(0.2, slot.scrim / 0.80));
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
    const slot = state.mediaSlots[state.activeMediaSlotIndex] || { panY: 50, zoom: 1, scrim: 0.80 };

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

    // Make every candidate directly editable in-canvas via tap/click
    candidates.forEach(item => {
      item.el.setAttribute('contenteditable', 'true');
      item.el.setAttribute('spellcheck', 'false');
      item.el.setAttribute('data-sens-editable', 'true');
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

    // Sync initial values into Step 3 inputs
    if (state.textBindings.hookEl) {
      els.inputHook.value = cleanText(state.textBindings.hookEl);
      els.inputHook.disabled = false;
    } else {
      els.inputHook.value = '';
      els.inputHook.disabled = true;
    }

    if (state.textBindings.bajadaEl) {
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
      return `
        <div class="bg-surface p-2.5 rounded-xl border border-outline-variant/20 focus-within:border-secondary transition-colors">
          <label class="block text-[9px] font-mono uppercase tracking-wider text-on-surface-variant mb-1">Componente #${idx + 1}</label>
          <input type="text" data-extra-input="${idx}" value="${val}" class="w-full bg-transparent border-none p-0 text-xs font-medium text-on-surface focus:ring-0" />
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

  function updateFormatButtonsUI() {
    document.querySelectorAll('[data-format-btn]').forEach(btn => {
      const fmt = btn.getAttribute('data-format-btn');
      if (fmt === 'loop') {
        btn.className = state.motionLoop
          ? 'px-2.5 py-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold shadow-sm transition-all whitespace-nowrap shrink-0'
          : 'px-2.5 py-1 rounded-lg text-on-surface-variant hover:text-on-surface text-[11px] font-medium transition-all whitespace-nowrap shrink-0';
      } else {
        const active = fmt === state.format;
        btn.className = active
          ? 'px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-medium shadow-sm transition-all whitespace-nowrap shrink-0'
          : 'px-2.5 py-1 rounded-lg text-on-surface-variant hover:text-on-surface text-[11px] font-medium transition-all whitespace-nowrap shrink-0';
      }
    });
  }

  // ============================================================================
  // TRUE 4K UHD EXPORT PIPELINE (2160 x 3840 for 9:16 | 2160 x 2700 for 4:5)
  // Pre-rasterizes all background images, <img>, and <video> slots at native 4K
  // with exact object-fit: cover + panY + zoom math so html2canvas never pixelates!
  // ============================================================================
  function loadImageForExport(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      if (!src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback without crossOrigin if server rejects CORS preflight
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = src;
      };
      img.src = src;
    });
  }

  function drawCoverTo4KCanvas(sourceEl, srcW, srcH, targetW, targetH, panYPercent, zoomFactor) {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let cropW, cropH;
    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = srcH * targetRatio;
    } else {
      cropW = srcW;
      cropH = srcW / targetRatio;
    }

    // Apply Somatic Zoom
    const z = Math.max(1, zoomFactor || 1);
    const zoomedW = cropW / z;
    const zoomedH = cropH / z;

    const panFraction = (typeof panYPercent === 'number' ? panYPercent : 50) / 100;
    const sx = (srcW - zoomedW) * 0.5;
    const sy = (srcH - zoomedH) * panFraction;

    ctx.drawImage(sourceEl, sx, sy, zoomedW, zoomedH, 0, 0, targetW, targetH);
    return canvas;
  }

  async function renderStageToHighResCanvas(targetWidthPx) {
    const stageEl = document.getElementById('video-canvas');
    if (!stageEl || typeof window.html2canvas !== 'function') {
      throw new Error('Stage o html2canvas no disponible');
    }

    const targetW = targetWidthPx || 2160;
    const targetH = state.format === '9:16' ? Math.round(targetW * (16 / 9)) : Math.round(targetW * (5 / 4));

    const rect = stageEl.getBoundingClientRect();
    const cssW = stageEl.offsetWidth || rect.width || 360;
    const cssH = stageEl.offsetHeight || rect.height || (state.format === '9:16' ? 640 : 450);
    const scale = targetW / cssW;

    // 1. Temporarily hide editor outlines & safezone overlays
    document.body.classList.add('sens-exporting');
    const wasSafeZone = state.safeZonesVisible;
    if (wasSafeZone) {
      state.safeZonesVisible = false;
      applySafeZoneState(stageEl);
    }

    // Remove temporary transform animations during capture
    const hadMotion = stageEl.classList.contains('sens-motion-loop-active');
    if (hadMotion) stageEl.classList.remove('sens-motion-loop-active');

    const cleanupCallbacks = [];

    try {
      // 2. Pre-rasterize every media slot at exact 4K pixel dimensions
      for (const slot of state.mediaSlots) {
        if (!slot.el) continue;
        const slotW = Math.max(1, Math.round((slot.el.offsetWidth || cssW) * scale));
        const slotH = Math.max(1, Math.round((slot.el.offsetHeight || cssH) * scale));

        const activeVid = slot.el.querySelector ? slot.el.querySelector('video.sens-bg-video') : null;
        let bakedCanvas = null;

        if (activeVid && activeVid.readyState >= 2 && activeVid.videoWidth > 0) {
          bakedCanvas = drawCoverTo4KCanvas(
            activeVid,
            activeVid.videoWidth,
            activeVid.videoHeight,
            slotW,
            slotH,
            slot.panY,
            slot.zoom
          );
        } else {
          const imgSrc = slot.customDataUrl || slot.originalUrl;
          if (imgSrc) {
            const loadedImg = await loadImageForExport(imgSrc);
            if (loadedImg && (loadedImg.naturalWidth || loadedImg.width)) {
              bakedCanvas = drawCoverTo4KCanvas(
                loadedImg,
                loadedImg.naturalWidth || loadedImg.width,
                loadedImg.naturalHeight || loadedImg.height,
                slotW,
                slotH,
                slot.panY,
                slot.zoom
              );
            }
          }
        }

        if (bakedCanvas) {
          try {
            const bakedDataUrl = bakedCanvas.toDataURL('image/png');
            if (slot.type === 'img') {
              const prevSrc = slot.el.src;
              const prevTransform = slot.el.style.transform;
              slot.el.src = bakedDataUrl;
              slot.el.style.transform = 'none';
              cleanupCallbacks.push(() => {
                slot.el.src = prevSrc;
                slot.el.style.transform = prevTransform;
              });
            } else {
              const prevBg = slot.el.style.backgroundImage;
              const prevTransform = slot.el.style.transform;
              const proxyImg = document.createElement('img');
              proxyImg.className = 'sens-4k-bake-proxy';
              proxyImg.src = bakedDataUrl;
              proxyImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;';
              slot.el.style.backgroundImage = 'none';
              slot.el.style.transform = 'none';
              if (activeVid) activeVid.style.display = 'none';
              slot.el.insertBefore(proxyImg, slot.el.firstChild);
              // Ensure any child gradient inside slot.el stays above proxyImg
              Array.from(slot.el.children).forEach(ch => {
                if (ch !== proxyImg && ch !== activeVid) {
                  ch.style.zIndex = '1';
                }
              });
              cleanupCallbacks.push(() => {
                proxyImg.remove();
                slot.el.style.backgroundImage = prevBg;
                slot.el.style.transform = prevTransform;
                if (activeVid) activeVid.style.display = '';
              });
            }
          } catch (corsErr) {
            // If remote image tainted the offscreen canvas, let html2canvas render it directly
          }
        }
      }

      // Wait 1 frame for proxy <img> layout
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const rawCanvas = await window.html2canvas(stageEl, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });

      // 3. Enforce exact UHD pixel dimensions (2160x3840 or 2160x2700)
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetW;
      finalCanvas.height = targetH;
      const fCtx = finalCanvas.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(rawCanvas, 0, 0, targetW, targetH);

      return finalCanvas;
    } finally {
      cleanupCallbacks.forEach(fn => {
        try { fn(); } catch (_) {}
      });
      if (hadMotion) stageEl.classList.add('sens-motion-loop-active');
      if (wasSafeZone) {
        state.safeZonesVisible = true;
        applySafeZoneState(stageEl);
      }
      document.body.classList.remove('sens-exporting');
    }
  }

  async function handleExport4K() {
    // CRITICAL RULE: If the user uploaded a VIDEO into any template (even an image/feed template),
    // the output MUST respect the video input and export a high-resolution video!
    if (hasActiveVideoSlot()) {
      await handleExportReel60FPS({ from4kBtn: true });
      return;
    }

    const origText = els.export4kLabel.textContent;
    els.export4kBtn.disabled = true;
    els.export4kLabel.textContent = 'Render 4K...';

    try {
      const canvas4K = await renderStageToHighResCanvas(2160);
      const dataUrl = canvas4K.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `SENS-4K-UHD-${state.activeTemplateId}-${canvas4K.width}x${canvas4K.height}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`Portada 4K descargada (${canvas4K.width}×${canvas4K.height}px)`);
    } catch (err) {
      console.error('Export 4K Error:', err);
      showToast('Error al exportar Portada 4K');
    } finally {
      els.export4kBtn.disabled = false;
      els.export4kLabel.textContent = origText;
    }
  }

  function drawCoverRectOnCtx(ctx, sourceEl, srcW, srcH, dstX, dstY, dstW, dstH, panYPercent, zoomFactor) {
    if (!sourceEl || !srcW || !srcH || !dstW || !dstH) return;
    const targetRatio = dstW / dstH;
    const srcRatio = srcW / srcH;

    let cropW, cropH;
    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = srcH * targetRatio;
    } else {
      cropW = srcW;
      cropH = srcW / targetRatio;
    }

    const z = Math.max(1, zoomFactor || 1);
    const zoomedW = cropW / z;
    const zoomedH = cropH / z;

    const panFraction = (typeof panYPercent === 'number' ? panYPercent : 50) / 100;
    const sx = (srcW - zoomedW) * 0.5;
    const sy = (srcH - zoomedH) * panFraction;

    ctx.drawImage(sourceEl, sx, sy, zoomedW, zoomedH, dstX, dstY, dstW, dstH);
  }

  async function renderVideoLayersForComposite(targetWidthPx, activeVideoEntries) {
    const stageEl = document.getElementById('video-canvas');
    if (!stageEl || typeof window.html2canvas !== 'function') {
      throw new Error('Stage o html2canvas no disponible');
    }

    const targetW = targetWidthPx || 1080;
    const targetH = state.format === '9:16' ? Math.round(targetW * (16 / 9)) : Math.round(targetW * (5 / 4));
    const rect = stageEl.getBoundingClientRect();
    const cssW = stageEl.offsetWidth || rect.width || 360;
    const scale = targetW / cssW;

    document.body.classList.add('sens-exporting');
    const wasSafeZone = state.safeZonesVisible;
    if (wasSafeZone) {
      state.safeZonesVisible = false;
      applySafeZoneState(stageEl);
    }

    const hadMotion = stageEl.classList.contains('sens-motion-loop-active');
    if (hadMotion) stageEl.classList.remove('sens-motion-loop-active');

    const cleanupAttrs = [];

    try {
      // Tag active video slots and their ancestors/preceding nodes so we only strip them inside html2canvas's cloned DOM!
      // This keeps the live <video> in the real DOM 100% visible and playing at 60FPS without browser throttling!
      const ancestorSet = new Set();
      for (const entry of activeVideoEntries) {
        const slot = entry.slot;
        if (slot && slot.el) {
          slot.el.setAttribute('data-sens-video-slot-el', '1');
          cleanupAttrs.push(() => slot.el.removeAttribute('data-sens-video-slot-el'));
        }
        const refNode = (slot && slot.el) ? slot.el : entry.vid;
        let curr = refNode;
        while (curr && curr !== stageEl.parentElement) {
          ancestorSet.add(curr);
          if (curr.setAttribute) {
            curr.setAttribute('data-sens-fg-anc', '1');
            const cRef = curr;
            cleanupAttrs.push(() => cRef.removeAttribute('data-sens-fg-anc'));
          }
          curr = curr.parentElement;
        }
      }

      const primaryRefNode = (activeVideoEntries[0].slot && activeVideoEntries[0].slot.el)
        ? activeVideoEntries[0].slot.el
        : activeVideoEntries[0].vid;

      if (primaryRefNode) {
        const allNodes = stageEl.querySelectorAll('*');
        allNodes.forEach(node => {
          if (ancestorSet.has(node) || node === primaryRefNode) return;
          if (primaryRefNode.contains && primaryRefNode.contains(node)) return;
          const posMask = node.compareDocumentPosition(primaryRefNode);
          if (posMask & Node.DOCUMENT_POSITION_FOLLOWING) {
            node.setAttribute('data-sens-fg-behind', '1');
            cleanupAttrs.push(() => node.removeAttribute('data-sens-fg-behind'));
          }
        });
      }

      // LAYER 0 (bgBaseCanvas): Capture template background & cards behind the video slot
      const rawBgBase = await window.html2canvas(stageEl, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('video').forEach(v => v.remove());
          clonedDoc.querySelectorAll('[data-sens-video-slot-el="1"]').forEach(el => {
            if (el.tagName === 'IMG') {
              el.style.setProperty('opacity', '0', 'important');
              el.removeAttribute('src');
            } else {
              el.style.setProperty('background-image', 'none', 'important');
              el.style.setProperty('background-color', 'transparent', 'important');
            }
          });
        }
      });

      const bgBaseCanvas = document.createElement('canvas');
      bgBaseCanvas.width = targetW;
      bgBaseCanvas.height = targetH;
      const bCtx = bgBaseCanvas.getContext('2d');
      bCtx.imageSmoothingEnabled = true;
      bCtx.imageSmoothingQuality = 'high';
      bCtx.drawImage(rawBgBase, 0, 0, targetW, targetH);

      // LAYER 2 (fgOverlayCanvas): Capture ONLY scrims, glass cards, badges & text in front of the video slot
      const rawOverlay = await window.html2canvas(stageEl, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('video').forEach(v => v.remove());
          clonedDoc.querySelectorAll('[data-sens-video-slot-el="1"]').forEach(el => {
            if (el.tagName === 'IMG') {
              el.style.setProperty('opacity', '0', 'important');
              el.removeAttribute('src');
            } else {
              el.style.setProperty('background', 'transparent', 'important');
              el.style.setProperty('background-color', 'transparent', 'important');
              el.style.setProperty('background-image', 'none', 'important');
            }
          });
          clonedDoc.querySelectorAll('[data-sens-fg-anc="1"]').forEach(anc => {
            anc.style.setProperty('background', 'transparent', 'important');
            anc.style.setProperty('background-color', 'transparent', 'important');
            anc.style.setProperty('background-image', 'none', 'important');
            anc.style.setProperty('box-shadow', 'none', 'important');
            anc.style.setProperty('border-color', 'transparent', 'important');
          });
          clonedDoc.querySelectorAll('[data-sens-fg-behind="1"]').forEach(behind => {
            behind.style.setProperty('visibility', 'hidden', 'important');
            behind.style.setProperty('opacity', '0', 'important');
          });
        }
      });

      const fgOverlayCanvas = document.createElement('canvas');
      fgOverlayCanvas.width = targetW;
      fgOverlayCanvas.height = targetH;
      const fCtx = fgOverlayCanvas.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(rawOverlay, 0, 0, targetW, targetH);

      return { bgBaseCanvas, fgOverlayCanvas };
    } finally {
      cleanupAttrs.forEach(fn => {
        try { fn(); } catch (_) {}
      });
      if (hadMotion) stageEl.classList.add('sens-motion-loop-active');
      if (wasSafeZone) {
        state.safeZonesVisible = true;
        applySafeZoneState(stageEl);
      }
      document.body.classList.remove('sens-exporting');
    }
  }

  // Export 60FPS Reel / Video UHD (Records live <video> slots + transparent UI overlay at 60FPS, or animated Ken Burns if photo)
  async function handleExportReel60FPS(opts) {
    const from4kBtn = Boolean(opts && opts.from4kBtn);
    const origReelText = els.exportReelLabel.textContent;
    const orig4kText = els.export4kLabel.textContent;
    els.exportReelBtn.disabled = true;
    els.export4kBtn.disabled = true;

    try {
      if (from4kBtn) {
        els.export4kLabel.textContent = 'Preparando Video...';
      } else {
        els.exportReelLabel.textContent = 'Preparando capas HD...';
      }

      const stageEl = document.getElementById('video-canvas');
      const stageRect = stageEl ? stageEl.getBoundingClientRect() : { left: 0, top: 0, width: 360, height: 640 };
      const stW = stageRect.width || 360;
      const stH = stageRect.height || (state.format === '9:16' ? 640 : 450);

      // Detect active <video class="sens-bg-video"> slots
      const activeVideoEntries = [];
      for (const slot of state.mediaSlots) {
        if (!slot || !slot.el) continue;
        let vid = slot.videoEl || (slot.el.querySelector ? slot.el.querySelector('video.sens-bg-video') : null);
        if (!vid && slot.el.parentElement) {
          vid = slot.el.parentElement.querySelector('video.sens-bg-video');
        }
        if (vid && (slot.isVideo || slot.customVideoUrl || vid.src)) {
          const targetBoxEl = (slot.type === 'img' && slot.el.parentElement) ? slot.el.parentElement : slot.el;
          const bRect = targetBoxEl.getBoundingClientRect();
          const relX = Math.max(0, (bRect.left - stageRect.left) / stW);
          const relY = Math.max(0, (bRect.top - stageRect.top) / stH);
          const relW = Math.min(1, (bRect.width || stW) / stW);
          const relH = Math.min(1, (bRect.height || stH) / stH);
          const compStyle = window.getComputedStyle(targetBoxEl);
          const cssRadius = parseFloat(compStyle.borderRadius) || 0;
          const relRadius = cssRadius / stW;
          activeVideoEntries.push({ slot, vid, relX, relY, relW, relH, relRadius });
        }
      }

      const hasLiveVideo = activeVideoEntries.length > 0;
      const outW = 1080;
      const outH = state.format === '9:16' ? 1920 : 1350;

      let bgBaseCanvas = null;
      let fgOverlayCanvas = null;
      let baseFrame = null;

      if (hasLiveVideo) {
        // Ensure all loaded videos are playing and ready
        for (const entry of activeVideoEntries) {
          entry.vid.muted = true;
          entry.vid.loop = true;
          entry.vid.playsInline = true;
          try {
            entry.vid.currentTime = 0;
            await entry.vid.play();
          } catch (_) {}
        }
        const layers = await renderVideoLayersForComposite(outW, activeVideoEntries);
        bgBaseCanvas = layers.bgBaseCanvas;
        fgOverlayCanvas = layers.fgOverlayCanvas;

        // Re-verify all loaded videos are actively playing from t=0 right before recording starts
        for (const entry of activeVideoEntries) {
          try {
            entry.vid.currentTime = 0;
            if (entry.vid.paused) {
              await entry.vid.play();
            }
          } catch (_) {}
        }
      } else {
        baseFrame = await renderStageToHighResCanvas(outW);
      }

      const streamCanvas = document.createElement('canvas');
      streamCanvas.width = outW;
      streamCanvas.height = outH;
      const ctx = streamCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const stream = streamCanvas.captureStream(60);
      let mimeType = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 32000000 // 32 Mbps Cinema UHD bitrate
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      let durationMs = 5000;
      if (hasLiveVideo) {
        const primaryVid = activeVideoEntries[0].vid;
        if (primaryVid && primaryVid.duration && isFinite(primaryVid.duration) && primaryVid.duration > 0) {
          durationMs = Math.min(15000, Math.max(4000, Math.round(primaryVid.duration * 1000)));
        } else {
          durationMs = 6000;
        }
      }

      const startTime = performance.now();

      await new Promise((resolve) => {
        recorder.onstop = resolve;
        recorder.start(100);

        function drawTick(now) {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const pctLabel = `${Math.round(progress * 100)}%`;
          if (from4kBtn) {
            els.export4kLabel.textContent = `Video ${pctLabel}`;
          } else {
            els.exportReelLabel.textContent = `Grabando 60FPS... ${pctLabel}`;
          }

          ctx.clearRect(0, 0, outW, outH);

          if (hasLiveVideo && fgOverlayCanvas) {
            // 1. Draw template background / card container layer (Layer 0)
            if (bgBaseCanvas) {
              ctx.drawImage(bgBaseCanvas, 0, 0, outW, outH);
            } else {
              ctx.fillStyle = '#121214';
              ctx.fillRect(0, 0, outW, outH);
            }

            // 2. Draw live moving <video> frame into exact slot rectangle (Layer 1)
            for (const entry of activeVideoEntries) {
              const v = entry.vid;
              if (v.paused && !v.ended) {
                v.play().catch(() => {});
              }
              const s = entry.slot;
              const vW = v.videoWidth || s.naturalWidth || 1080;
              const vH = v.videoHeight || s.naturalHeight || 1920;
              const dstX = Math.round(entry.relX * outW);
              const dstY = Math.round(entry.relY * outH);
              const dstW = Math.round(entry.relW * outW);
              const dstH = Math.round(entry.relH * outH);
              const radPx = Math.round((entry.relRadius || 0) * outW);
              const extraZoom = state.motionLoop ? (1 + 0.03 * Math.sin(progress * Math.PI * 2)) : 1;

              ctx.save();
              if (radPx > 1 && typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(dstX, dstY, dstW, dstH, radPx);
                ctx.clip();
              }
              drawCoverRectOnCtx(ctx, v, vW, vH, dstX, dstY, dstW, dstH, s.panY, (s.zoom || 1) * extraZoom);
              ctx.restore();
            }

            // 3. Draw foreground scrim gradients, glass cards, badges & crisp typography (Layer 2)
            ctx.drawImage(fgOverlayCanvas, 0, 0, outW, outH);
          } else if (baseFrame) {
            const scalePulse = 1 + 0.035 * Math.sin(progress * Math.PI * 2);
            ctx.save();
            ctx.translate(outW / 2, outH / 2);
            ctx.scale(scalePulse, scalePulse);
            ctx.drawImage(baseFrame, -outW / 2, -outH / 2, outW, outH);
            ctx.restore();
          }

          if (elapsed < durationMs) {
            requestAnimationFrame(drawTick);
          } else {
            recorder.stop();
          }
        }
        requestAnimationFrame(drawTick);
      });

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SENS-VIDEO-60FPS-${state.activeTemplateId}-${outW}x${outH}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast(`Video 60FPS exportado (${outW}×${outH}px)`);
    } catch (err) {
      console.error('Reel Export Error:', err);
      showToast('Error al exportar Video');
    } finally {
      els.exportReelBtn.disabled = false;
      els.export4kBtn.disabled = false;
      els.exportReelLabel.textContent = origReelText;
      syncExportButtonsForMediaKind();
    }
  }

  // Copy Caption to Clipboard
  function handleCopyCaption() {
    const hook = (els.inputHook.value || '').trim();
    const bajada = (els.inputBajada.value || '').trim();
    const cta = (els.inputCta.value || '').trim();

    const caption = [
      hook,
      '',
      bajada,
      '',
      cta ? `→ ${cta}` : '',
      '',
      '—',
      'SENS • Train & Wellness',
      '#MakesSENS #BiomecanicaAplicada #LongevidadAtletica #QuietLuxuryWellness'
    ].filter((line, idx, arr) => !(line === '' && arr[idx - 1] === '')).join('\n').trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(caption).then(() => {
        showToast('Caption copiado al portapapeles');
      }).catch(() => fallbackCopy(caption));
    } else {
      fallbackCopy(caption);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Caption copiado al portapapeles');
  }

  // Full 200-Template Vault Modal
  function openVaultModal() {
    els.vaultModal.classList.remove('hidden');
    const items = ALL_TEMPLATES.filter(t => t.format === state.format);
    const aspectCls = state.format === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]';

    els.vaultGrid.innerHTML = items.map(t => {
      const isSelected = t.id === state.activeTemplateId;
      const borderCls = isSelected
        ? 'border-2 border-secondary ring-2 ring-secondary/30'
        : 'border border-outline-variant/25 hover:border-secondary';
      return `
        <button type="button" data-vault-card="${t.id}" class="group relative w-full ${aspectCls} rounded-2xl overflow-hidden ${borderCls} text-left shadow-sm hover:shadow-md transition-all">
          <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300" style="background-image: url('${t.thumbBg}');"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/25 to-transparent"></div>
          <span class="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed">${t.id}</span>
          <div class="absolute bottom-2.5 left-2.5 right-2.5">
            <p class="text-xs font-medium text-surface leading-snug line-clamp-2">${t.name}</p>
          </div>
        </button>
      `;
    }).join('');

    els.vaultGrid.querySelectorAll('[data-vault-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-vault-card');
        els.vaultModal.classList.add('hidden');
        selectTemplate(id);
        document.getElementById('section-live-viewport').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // Event Listeners Initialization
  function initEvents() {
    // Format Switcher (9:16 | 4:5 | Motion Loop)
    document.querySelectorAll('[data-format-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-format-btn');
        if (fmt === 'loop') {
          state.motionLoop = !state.motionLoop;
          updateFormatButtonsUI();
          applyMotionLoopState();
          showToast(state.motionLoop ? 'Motion Loop Somático activado' : 'Motion Loop desactivado');
          return;
        }
        if (fmt !== state.format) {
          state.format = fmt;
          state.blockId = 'b1';
          updateFormatButtonsUI();
          const firstInFormat = ALL_TEMPLATES.find(t => t.format === state.format && t.blockId === 'b1' && t.id !== 'T00') || ALL_TEMPLATES[0];
          selectTemplate(firstInFormat.id);
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
            ? 'px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold whitespace-nowrap transition-all'
            : 'px-2.5 py-1 rounded-full bg-surface text-on-surface-variant hover:text-on-surface text-[10px] font-medium whitespace-nowrap transition-all';
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

    // Export Buttons
    els.export4kBtn.addEventListener('click', handleExport4K);
    els.exportReelBtn.addEventListener('click', handleExportReel60FPS);
    els.copyCaptionBtn.addEventListener('click', handleCopyCaption);

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

    // Listen to postMessage from parent SENS portal if needed
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'SENS_SELECT_TEMPLATE' && e.data.id) {
        selectTemplate(e.data.id);
      } else if (e.data.type === 'SENS_EXPORT_4K') {
        handleExport4K();
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
    handleExport4K,
    handleExportReel60FPS
  };

  // Boot Studio
  initEvents();
  selectTemplate('T01');
})();
