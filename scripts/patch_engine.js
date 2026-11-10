const fs = require('fs');

let code = fs.readFileSync('marketing-suites/studio-master-engine.js', 'utf8');

// 1. Replace PILLARS_BY_FORMAT with PILLARS_BY_GROUP
const oldPillarsRegex = /const PILLARS_BY_FORMAT = \{[\s\S]*?\n  \};/;
const newPillars = `const PILLARS_BY_GROUP = {
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
  };`;

code = code.replace(oldPillarsRegex, newPillars);

// 2. Update state initial values
code = code.replace(
  /const state = \{\s*format: '9:16',\s*blockId: 'b1',\s*activeTemplateId: 'T01',/,
  `const state = {\n    group: 'static',\n    format: '9:16',\n    blockId: 'all',\n    activeTemplateId: 'E01',`
);

// 3. Update all scrim: 0.80 to scrim: 0.50
code = code.replace(/scrim: 0\.80/g, 'scrim: 0.50');
code = code.replace(/slot\.scrim \/ 0\.80/g, 'slot.scrim / 0.50');
code = code.replace(/from-primary\/80 via-primary\/30 to-transparent/g, 'from-primary/50 via-primary/25 to-transparent');

// 4. Update renderPillarChips and renderTemplateCarousel
const oldRenderChipsRegex = /function renderPillarChips\(\) \{[\s\S]*?function renderTemplateCarousel\(\) \{[\s\S]*?function selectTemplate\(id\) \{/;

const newRenderChips = `function renderPillarChips() {
    const pillars = PILLARS_BY_GROUP[state.group] || PILLARS_BY_GROUP['static'];
    els.pillarBar.innerHTML = pillars.map(p => {
      const active = p.id === state.blockId;
      const cls = active
        ? 'px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all shadow-sm'
        : 'px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface text-[11px] font-medium whitespace-nowrap shrink-0 transition-all';
      return \`<button type="button" data-pillar-id="\${p.id}" class="\${cls}">\${p.label}</button>\`;
    }).join('') + \`
      <button type="button" id="btn-inline-vault" class="px-3 py-1 rounded-full bg-surface-container-high text-primary text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">grid_view</span>
        <span>Ver Grilla</span>
      </button>
    \`;

    els.pillarBar.querySelectorAll('[data-pillar-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.blockId = btn.getAttribute('data-pillar-id');
        renderPillarChips();
        renderTemplateCarousel();
        const list = ALL_TEMPLATES.filter(t => t.group === state.group && (state.blockId === 'all' || t.blockId === state.blockId));
        if (list.length > 0 && !list.some(t => t.id === state.activeTemplateId)) {
          selectTemplate(list[0].id);
        }
      });
    });

    const inlineVaultBtn = document.getElementById('btn-inline-vault');
    if (inlineVaultBtn) {
      inlineVaultBtn.addEventListener('click', openVaultModal);
    }
  }

  // Render Horizontal Template Carousel for Active Group + Pillar
  function renderTemplateCarousel() {
    const items = ALL_TEMPLATES.filter(t => t.group === state.group && (state.blockId === 'all' || t.blockId === state.blockId));
    const aspectCls = 'w-20 h-32';

    els.carouselTrack.innerHTML = items.map(t => {
      const isSelected = t.id === state.activeTemplateId;
      const borderCls = isSelected
        ? 'border-2 border-secondary ring-2 ring-secondary/20'
        : 'border border-outline-variant/30 opacity-80 hover:opacity-100';
      const badgeCls = isSelected
        ? 'bg-secondary-fixed text-on-secondary-fixed font-bold'
        : 'bg-surface/85 text-on-surface font-mono';
      const displayCode = t.id;

      return \`
        <button type="button" data-template-card="\${t.id}" class="flex-shrink-0 \${aspectCls} rounded-xl relative overflow-hidden \${borderCls} group text-left transition-all">
          <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300" style="background-image: url('\${t.thumbBg}');"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-primary/55 via-primary/25 to-transparent"></div>
          <span class="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded \${badgeCls}">\${displayCode}</span>
          <div class="absolute bottom-1.5 left-1.5 right-1.5">
            <p class="text-[10px] font-medium text-surface leading-tight truncate">\${t.name}</p>
          </div>
        </button>
      \`;
    }).join('');

    els.carouselTrack.querySelectorAll('[data-template-card]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-template-card');
        selectTemplate(id);
      });
    });

    const activeCard = els.carouselTrack.querySelector(\`[data-template-card="\${state.activeTemplateId}"]\`);
    if (activeCard && typeof activeCard.scrollIntoView === 'function') {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function selectTemplate(id) {`;

code = code.replace(oldRenderChipsRegex, newRenderChips);

// 5. Update selectTemplate internal checks
code = code.replace(
  /if \(tpl\.format !== state\.format\) \{\s*state\.format = tpl\.format;\s*updateFormatButtonsUI\(\);\s*\}/,
  `if (tpl.group && tpl.group !== state.group) {\n      state.group = tpl.group;\n      updateGroupButtonsUI();\n    }\n    state.format = '9:16';`
);

// 6. Add updateGroupButtonsUI and handle group switching in initEvents
const oldInitEventsRegex = /function updateFormatButtonsUI\(\) \{[\s\S]*?function initEvents\(\) \{[\s\S]*?\/\/ Safe Zones Toggle/;

const newInitEvents = `function updateGroupButtonsUI() {
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

    // Safe Zones Toggle`;

code = code.replace(oldInitEventsRegex, newInitEvents);

// 7. Update Vault Grid rendering to show 140 templates
code = code.replace(
  /const items = ALL_TEMPLATES\.filter\(t => t\.format === state\.format\);/,
  `const items = ALL_TEMPLATES.filter(t => t.group === state.group);`
);
code = code.replace(
  /const aspectCls = state\.format === '9:16' \? 'aspect-\[9\/16\]' : 'aspect-\[4\/5\]';/,
  `const aspectCls = 'aspect-[9/16]';`
);

fs.writeFileSync('marketing-suites/studio-master-engine.js', code, 'utf8');
console.log('Successfully updated studio-master-engine.js');
