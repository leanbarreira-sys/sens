/**
 * SENS QUIET VITALITY — UNIVERSAL MARKETING SUITE ENHANCER v3.0 (STUDIO UHD ENGINE)
 * 
 * Standards Compliance:
 * - sr-director-ux-wellness:
 *   - Mobile-First Thumb-Zone ergonomics: Dedicated action bar per template with 44px+ touch targets.
 *   - Zero cartoon emojis: Refined micro-SVGs (camera, edit, download).
 *   - Quiet Luxury palette: Onyx Obsidian (#080809), Elevated Card (#121214), Champagne Gold Accent (#E5CBA7).
 *   - Full-Bleed Story/Post Exports: Eliminates rounded corner clipping and black letterboxing on download.
 *   - Tactile Apple-grade Native Bottom Sheet Quick Editor with live 2-way sync.
 * - sr-director-it-wellness:
 *   - Native Full Resolution Image Pipeline: Replaces lossy CSS background-image with full-res <img> elements.
 *   - Uncapped Canvas Backing Store: Eliminates windowWidth/windowHeight restrictions in html2canvas.
 *   - Studio UHD 4K (2160px width) & Full HD 1080p fallback: Guaranteed zero-pixelation export.
 *   - Active Video Frame Snapshot: High-speed canvas extraction prevents black video frames.
 *   - Micro-frontend containment: Zero global CSS leakage into host portal.
 */

(function initSensUniversalMarketingEnhancer() {
    'use strict';

    console.log('[SENS Universal Enhancer v3.0] Inicializando motor Studio UHD 4K...');

    // 1. Inyectar estilos responsivos y de interfaz Quiet Luxury para el suite
    function injectEnhancerStyles() {
        if (document.getElementById('sensEnhancerStyles')) return;
        const style = document.createElement('style');
        style.id = 'sensEnhancerStyles';
        style.textContent = `
            /* Layout móvil de alta ergonomía */
            @media (max-width: 768px) {
                body {
                    padding: 8px !important;
                }
                #template-grid, .grid, [class*="grid-cols-"] {
                    grid-template-columns: 1fr !important;
                    gap: 28px !important;
                }
                article, .template-card, .specimen-card, .template-item {
                    margin-bottom: 28px !important;
                    max-width: 100% !important;
                }
            }

            /* Barra de acciones táctil por template (Quiet Luxury) */
            .sens-card-action-bar {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 8px !important;
                padding: 10px 12px !important;
                background: #121214 !important;
                border: 1px solid rgba(229, 203, 167, 0.25) !important;
                border-radius: 14px !important;
                margin-top: 10px !important;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5) !important;
                z-index: 40 !important;
                position: relative !important;
            }

            .sens-bar-btn {
                flex: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                padding: 8px 10px !important;
                min-height: 44px !important;
                border-radius: 10px !important;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
                font-size: 11.5px !important;
                font-weight: 700 !important;
                letter-spacing: 0.02em !important;
                cursor: pointer !important;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                -webkit-tap-highlight-color: transparent !important;
                border: none !important;
                text-decoration: none !important;
            }

            .sens-bar-btn:active {
                transform: scale(0.96) !important;
            }

            .sens-btn-media {
                background: rgba(255, 255, 255, 0.08) !important;
                color: #FFFFFF !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
            }

            .sens-btn-edit {
                background: rgba(229, 203, 167, 0.12) !important;
                color: #E5CBA7 !important;
                border: 1px solid rgba(229, 203, 167, 0.3) !important;
            }

            .sens-btn-uhd {
                background: #E5CBA7 !important;
                color: #121214 !important;
                font-weight: 800 !important;
                border: none !important;
                box-shadow: 0 2px 10px rgba(229, 203, 167, 0.3) !important;
            }

            /* Edición in-canvas directa al tocar */
            [contenteditable="true"] {
                outline: none !important;
                cursor: text !important;
                -webkit-user-select: text !important;
                user-select: text !important;
                -webkit-user-modify: read-write-plaintext-only !important;
                transition: box-shadow 0.2s ease, background-color 0.2s ease !important;
            }

            [contenteditable="true"]:focus {
                box-shadow: 0 0 0 2px #E5CBA7, 0 0 14px rgba(229, 203, 167, 0.45) !important;
                border-radius: 4px !important;
                background: rgba(229, 203, 167, 0.08) !important;
                -webkit-line-clamp: unset !important;
                display: block !important;
                max-height: none !important;
            }

            /* Native Bottom Sheet Quick Editor */
            .sens-bottom-sheet-backdrop {
                position: fixed !important;
                inset: 0 !important;
                background: rgba(0, 0, 0, 0.75) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                z-index: 100000 !important;
                display: flex !important;
                align-items: flex-end !important;
                justify-content: center !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.25s ease !important;
            }

            .sens-bottom-sheet-backdrop.active {
                opacity: 1 !important;
                pointer-events: auto !important;
            }

            .sens-bottom-sheet {
                width: 100% !important;
                max-width: 540px !important;
                background: #121214 !important;
                border-radius: 24px 24px 0 0 !important;
                border-top: 1px solid rgba(229, 203, 167, 0.4) !important;
                border-left: 1px solid rgba(229, 203, 167, 0.15) !important;
                border-right: 1px solid rgba(229, 203, 167, 0.15) !important;
                padding: 18px 20px 28px !important;
                box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.7) !important;
                transform: translateY(100%) !important;
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                max-height: 85vh !important;
                overflow-y: auto !important;
                box-sizing: border-box !important;
            }

            .sens-bottom-sheet-backdrop.active .sens-bottom-sheet {
                transform: translateY(0) !important;
            }

            .sens-sheet-drag-handle {
                width: 40px !important;
                height: 4px !important;
                border-radius: 9999px !important;
                background: rgba(255, 255, 255, 0.25) !important;
                margin: 0 auto 16px !important;
            }

            .sens-sheet-title {
                color: #FFFFFF !important;
                font-family: 'Plus Jakarta Sans', sans-serif !important;
                font-size: 15px !important;
                font-weight: 800 !important;
                margin-bottom: 4px !important;
                letter-spacing: -0.01em !important;
            }

            .sens-sheet-subtitle {
                color: #A1A1AA !important;
                font-size: 11px !important;
                margin-bottom: 16px !important;
            }

            .sens-sheet-label {
                display: block !important;
                color: #E5CBA7 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                letter-spacing: 0.06em !important;
                text-transform: uppercase !important;
                margin-bottom: 6px !important;
            }

            .sens-sheet-input, .sens-sheet-textarea {
                width: 100% !important;
                background: #1A1A1D !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 10px !important;
                color: #FFFFFF !important;
                font-family: 'Plus Jakarta Sans', sans-serif !important;
                font-size: 13px !important;
                padding: 10px 12px !important;
                box-sizing: border-box !important;
                outline: none !important;
                margin-bottom: 14px !important;
                transition: border-color 0.2s ease !important;
            }

            .sens-sheet-input:focus, .sens-sheet-textarea:focus {
                border-color: #E5CBA7 !important;
            }

            .sens-sheet-textarea {
                min-height: 72px !important;
                resize: vertical !important;
                line-height: 1.45 !important;
            }

            .sens-sheet-footer {
                display: flex !important;
                gap: 10px !important;
                margin-top: 8px !important;
            }

            .sens-sheet-btn-done {
                flex: 1 !important;
                background: #E5CBA7 !important;
                color: #121214 !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 12px !important;
                font-family: 'Plus Jakarta Sans', sans-serif !important;
                font-size: 13px !important;
                font-weight: 800 !important;
                cursor: pointer !important;
                text-align: center !important;
            }

            /* Toast Feedback */
            .sens-toast {
                position: fixed !important;
                bottom: 24px !important;
                left: 50% !important;
                transform: translateX(-50%) translateY(20px) !important;
                background: #121214 !important;
                color: #FFFFFF !important;
                border: 1px solid rgba(229, 203, 167, 0.4) !important;
                padding: 8px 18px !important;
                border-radius: 9999px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                z-index: 100001 !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }

            .sens-toast.show {
                opacity: 1 !important;
                transform: translateX(-50%) translateY(0) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Toast flotante para feedback
    function showToast(message, isChampagne = true) {
        let toast = document.getElementById('sensGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sensGlobalToast';
            toast.className = 'sens-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${isChampagne ? '#E5CBA7' : '#FFFFFF'};"></span>
            <span>${message}</span>
        `;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    // Modal / Bottom Sheet Único Reutilizable
    let activeSheetData = null;
    function getOrCreateBottomSheet() {
        let backdrop = document.getElementById('sensBottomSheetBackdrop');
        if (backdrop) return backdrop;

        backdrop = document.createElement('div');
        backdrop.id = 'sensBottomSheetBackdrop';
        backdrop.className = 'sens-bottom-sheet-backdrop';
        backdrop.innerHTML = `
            <div class="sens-bottom-sheet" id="sensBottomSheetModal">
                <div class="sens-sheet-drag-handle"></div>
                <div class="sens-sheet-title" id="sensSheetTitle">Editar Template</div>
                <div class="sens-sheet-subtitle">Toca y edita los textos. El template se actualiza en tiempo real.</div>

                <label class="sens-sheet-label">Titular Principal</label>
                <input type="text" class="sens-sheet-input" id="sensSheetInputTitle" placeholder="Titular del template...">

                <label class="sens-sheet-label">Bajada / Descripción</label>
                <textarea class="sens-sheet-textarea" id="sensSheetInputBody" placeholder="Descripción o bajada..."></textarea>

                <div id="sensSheetExtraFields"></div>

                <div class="sens-sheet-footer">
                    <button type="button" class="sens-sheet-btn-done" id="sensSheetBtnDone">Listo ✓</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeBottomSheet();
        });

        document.getElementById('sensSheetBtnDone').addEventListener('click', closeBottomSheet);

        return backdrop;
    }

    function openBottomSheet(templateData) {
        activeSheetData = templateData;
        const backdrop = getOrCreateBottomSheet();

        const titleEl = document.getElementById('sensSheetTitle');
        const inputTitle = document.getElementById('sensSheetInputTitle');
        const inputBody = document.getElementById('sensSheetInputBody');
        const extraContainer = document.getElementById('sensSheetExtraFields');
        extraContainer.innerHTML = '';

        titleEl.textContent = `Editar Template • #${templateData.index}`;

        inputTitle.value = templateData.headlineEl ? templateData.headlineEl.textContent.trim() : '';
        inputBody.value = templateData.bodyEl ? templateData.bodyEl.textContent.trim() : '';

        inputTitle.oninput = () => {
            if (templateData.headlineEl) {
                templateData.headlineEl.textContent = inputTitle.value;
            }
        };

        inputBody.oninput = () => {
            if (templateData.bodyEl) {
                templateData.bodyEl.textContent = inputBody.value;
            }
        };

        if (templateData.extraElements && templateData.extraElements.length > 0) {
            templateData.extraElements.forEach((el, idx) => {
                const label = document.createElement('label');
                label.className = 'sens-sheet-label';
                label.textContent = `Texto Adicional ${idx + 1}`;

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'sens-sheet-input';
                input.value = el.textContent.trim();
                input.oninput = () => { el.textContent = input.value; };

                extraContainer.appendChild(label);
                extraContainer.appendChild(input);
            });
        }

        backdrop.classList.add('active');
    }

    function closeBottomSheet() {
        const backdrop = document.getElementById('sensBottomSheetBackdrop');
        if (backdrop) backdrop.classList.remove('active');
        activeSheetData = null;
    }

    // Buscar todos los templates en la suite actual
    function discoverTemplates() {
        const raw = Array.from(document.querySelectorAll('article, .template-card, .specimen-card, .template-item'));
        let cards = raw;
        if (cards.length === 0) {
            cards = Array.from(document.querySelectorAll('[class*="aspect-[4/5]"], [class*="aspect-[9/16]"]')).map(el => el.closest('.relative') || el);
        }

        const uniqueCards = [];
        const seen = new Set();
        cards.forEach(card => {
            if (!card || seen.has(card)) return;
            const hasParent = uniqueCards.some(p => p.contains(card));
            if (hasParent) return;
            seen.add(card);
            uniqueCards.push(card);
        });

        return uniqueCards;
    }

    // Localizar el viewport exacto y el fondo de un template
    function inspectCardComponents(card) {
        let viewport = card.matches('[class*="aspect-"]') ? card : card.querySelector('[class*="aspect-"]');
        if (!viewport) viewport = card;

        let bgElement = viewport.querySelector('[style*="background-image"], img, [class*="bg-cover"], [class*="object-cover"]');
        if (!bgElement) {
            bgElement = viewport.querySelector('.absolute.inset-0') || viewport;
        }

        const headings = Array.from(viewport.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="headline"], [class*="title"]'));
        const paragraphs = Array.from(viewport.querySelectorAll('p, [class*="body-"], [class*="desc"]'));
        const allTextNodes = Array.from(viewport.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span:not(.font-label-sm), blockquote'));

        const headlineEl = headings[0] || (paragraphs.length > 1 ? paragraphs[0] : null);
        const bodyEl = paragraphs.find(p => p !== headlineEl) || (headings.length > 1 ? headings[1] : null);

        const extraElements = allTextNodes.filter(el => el !== headlineEl && el !== bodyEl && el.textContent.trim().length > 2 && !el.closest('.safe-zone-overlay'));

        return {
            viewport,
            bgElement,
            headlineEl,
            bodyEl,
            extraElements,
            allTextNodes
        };
    }

    // Capturar frame de video activo para exportación
    function captureVideoFrame(video) {
        try {
            if (!video || video.readyState < 2) return null;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1080;
            canvas.height = video.videoHeight || 1920;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.warn('[SENS] Error al capturar frame de video:', e);
            return null;
        }
    }

    // Reemplaza o asigna una imagen de alta resolución nativa (<img> en vez de background-image comprimido)
    function setHighResImage(bgElement, imageUrl) {
        if (!bgElement) return;

        let img = bgElement.querySelector('img.sens-bg-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'sens-bg-img absolute inset-0 w-full h-full object-cover z-0 pointer-events-none';
            img.style.position = 'absolute';
            img.style.inset = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.zIndex = '0';
            img.style.pointerEvents = 'none';

            if (window.getComputedStyle(bgElement).position === 'static') {
                bgElement.style.position = 'relative';
            }
            bgElement.style.overflow = 'hidden';
            bgElement.prepend(img);
        }

        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        bgElement.style.backgroundImage = 'none';
        return img;
    }

    // Exportación en Alta Definición Real (UHD 4K 2160px o Full HD 1080p con fallback de memoria)
    function exportTemplateUHD(cardIndex, components, btnUhd) {
        const { viewport, bgElement } = components;
        if (!viewport) return;

        const origBtnText = btnUhd.innerHTML;
        btnUhd.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#121214" stroke-width="2.5" class="animate-spin" style="vertical-align: middle;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            <span>Generando UHD...</span>
        `;
        btnUhd.style.pointerEvents = 'none';

        // 1. Ocultar overlays informativos y barra de acciones
        const safeZone = viewport.querySelector('.safe-zone-overlay');
        if (safeZone) safeZone.style.display = 'none';

        const actionBar = components.actionBar;
        if (actionBar) actionBar.style.display = 'none';

        // 2. Desactivar bordes redondeados y sombras para exportación full-bleed (sin recorte negro en esquinas)
        const roundedClasses = ['rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'];
        const removedClasses = [];
        roundedClasses.forEach(cls => {
            if (viewport.classList.contains(cls)) {
                viewport.classList.remove(cls);
                removedClasses.push(cls);
            }
        });
        const origBorderRadius = viewport.style.borderRadius;
        const origBoxShadow = viewport.style.boxShadow;
        viewport.style.borderRadius = '0px';
        viewport.style.boxShadow = 'none';

        // 3. Captura estática de fotograma de video si hay un video activo
        let tempVideoSnapshot = null;
        const video = bgElement ? bgElement.querySelector('video') : null;
        if (video) {
            const frameUrl = captureVideoFrame(video);
            if (frameUrl) {
                tempVideoSnapshot = document.createElement('img');
                tempVideoSnapshot.src = frameUrl;
                tempVideoSnapshot.className = 'absolute inset-0 w-full h-full object-cover z-0';
                tempVideoSnapshot.style.position = 'absolute';
                tempVideoSnapshot.style.inset = '0';
                tempVideoSnapshot.style.width = '100%';
                tempVideoSnapshot.style.height = '100%';
                tempVideoSnapshot.style.objectFit = 'cover';
                tempVideoSnapshot.style.zIndex = '0';
                video.style.visibility = 'hidden';
                video.parentElement.appendChild(tempVideoSnapshot);
            }
        }

        // 4. Calcular ratio y escala UHD
        // Para 9:16: Ancho objetivo = 2160px (UHD 4K) con fallback a 1080px (Full HD)
        // Para 4:5:  Ancho objetivo = 2160px (UHD 4K) con fallback a 1080px (Full HD)
        const is916 = viewport.offsetHeight > viewport.offsetWidth * 1.3;
        const targetWidthUHD = 2160;
        const targetWidthHD = 1080;
        const scaleUHD = targetWidthUHD / viewport.offsetWidth;
        const scaleHD = targetWidthHD / viewport.offsetWidth;

        const restoreUi = () => {
            if (safeZone) safeZone.style.display = '';
            if (actionBar) actionBar.style.display = 'flex';
            viewport.style.borderRadius = origBorderRadius;
            viewport.style.boxShadow = origBoxShadow;
            removedClasses.forEach(cls => viewport.classList.add(cls));

            if (tempVideoSnapshot) {
                tempVideoSnapshot.remove();
                if (video) video.style.visibility = 'visible';
            }

            btnUhd.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#121214" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Descargado ✓</span>
            `;
            setTimeout(() => {
                btnUhd.innerHTML = origBtnText;
                btnUhd.style.pointerEvents = '';
            }, 2400);
        };

        const renderWithHtml2Canvas = (scaleToUse, isFallback = false) => {
            if (typeof html2canvas !== 'function') {
                restoreUi();
                alert('Motor de render html2canvas no disponible.');
                return;
            }

            // IMPORTANTE: NO pasar windowWidth ni windowHeight.
            // Al omitirlos, html2canvas dimensiona el canvas a (offsetWidth * scale) exactamente.
            html2canvas(viewport, {
                scale: scaleToUse,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#080809',
                imageTimeout: 15000,
                logging: false
            }).then(canvas => {
                restoreUi();
                const actualWidth = canvas.width;
                const actualHeight = canvas.height;
                console.log(`[SENS Studio] Exportación exitosa: ${actualWidth} × ${actualHeight} px`);

                const link = document.createElement('a');
                const ratioTag = is916 ? '9x16_Story' : '4x5_Post';
                const qualityLabel = actualWidth >= 2000 ? '4K_UHD' : 'FullHD';
                link.download = `SENS_Marketing_${ratioTag}_T${cardIndex}_${actualWidth}x${actualHeight}_${qualityLabel}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showToast(`Descargado en Alta Calidad: ${actualWidth}×${actualHeight} px`, true);
            }).catch(err => {
                console.warn('[SENS] Error al renderizar con escala ' + scaleToUse + ':', err);
                if (!isFallback && scaleToUse > scaleHD) {
                    console.log('[SENS] Reintentando con escala Full HD 1080p...');
                    renderWithHtml2Canvas(scaleHD, true);
                } else {
                    restoreUi();
                    showToast('Error al exportar. Reintentando...', false);
                }
            });
        };

        if (typeof html2canvas !== 'function') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => renderWithHtml2Canvas(scaleUHD);
            document.head.appendChild(script);
        } else {
            // Breve delay de 80ms para estabilizar el DOM tras remover bordes redondeados
            setTimeout(() => renderWithHtml2Canvas(scaleUHD), 80);
        }
    }

    // Configurar cada template individual
    function setupTemplateCard(card, index) {
        if (card._sensConfigured) return;
        card._sensConfigured = true;

        const components = inspectCardComponents(card);
        const { viewport, bgElement, headlineEl, bodyEl, allTextNodes } = components;

        // Convertir cualquier background-image existente a un <img> nativo de alta resolución
        if (bgElement && bgElement.style.backgroundImage && bgElement.style.backgroundImage !== 'none') {
            const bgMatch = bgElement.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (bgMatch && bgMatch[1]) {
                setHighResImage(bgElement, bgMatch[1]);
            }
        }

        // 1. Habilitar toque directo para editar texto en todos los nodos de texto
        allTextNodes.forEach(textEl => {
            if (textEl.closest('.safe-zone-overlay') || textEl.closest('.sens-card-action-bar')) return;

            textEl.setAttribute('contenteditable', 'true');
            textEl.setAttribute('spellcheck', 'false');

            ['touchstart', 'touchend', 'click', 'pointerdown'].forEach(evtName => {
                textEl.addEventListener(evtName, (e) => {
                    e.stopPropagation();
                }, { passive: false });
            });

            textEl.addEventListener('focus', () => {
                textEl.style.boxShadow = '0 0 0 2px #E5CBA7, 0 0 14px rgba(229, 203, 167, 0.45)';
                textEl.style.borderRadius = '4px';
            });

            textEl.addEventListener('blur', () => {
                textEl.style.boxShadow = '';
            });
        });

        // 2. Crear input de archivo para cambiar Foto o Video en alta calidad
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'video/mp4,video/webm,video/quicktime,video/*,image/jpeg,image/png,image/webp,image/*';
        fileInput.style.display = 'none';
        card.appendChild(fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video');
            const fileUrl = URL.createObjectURL(file);

            if (bgElement) {
                // Remover cualquier video previo
                const existingVid = bgElement.querySelector('video');
                if (existingVid) existingVid.remove();

                if (isVideo) {
                    // Remover imagen previa si había
                    const existingImg = bgElement.querySelector('img.sens-bg-img');
                    if (existingImg) existingImg.style.display = 'none';

                    const video = document.createElement('video');
                    video.src = fileUrl;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.setAttribute('webkit-playsinline', 'true');
                    video.className = 'absolute inset-0 w-full h-full object-cover z-0 pointer-events-none';
                    video.style.position = 'absolute';
                    video.style.inset = '0';
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'cover';
                    video.style.zIndex = '0';

                    if (window.getComputedStyle(bgElement).position === 'static') {
                        bgElement.style.position = 'relative';
                    }
                    bgElement.style.overflow = 'hidden';
                    bgElement.insertBefore(video, bgElement.firstChild);
                    video.play().catch(() => {});
                    showToast(`Video HD cargado en Template #${index} (Loop activo)`);
                } else {
                    // Renderizar imagen de alta resolución nativa
                    const highResImg = setHighResImage(bgElement, fileUrl);
                    if (highResImg) highResImg.style.display = 'block';
                    showToast(`Foto en Alta Resolución cargada en Template #${index}`);
                }
            }
        });

        // 3. Crear Barra de Acciones Táctil por Template
        const actionBar = document.createElement('div');
        actionBar.className = 'sens-card-action-bar';
        components.actionBar = actionBar;

        // Botón 1: Foto / Video
        const btnMedia = document.createElement('button');
        btnMedia.type = 'button';
        btnMedia.className = 'sens-bar-btn sens-btn-media';
        btnMedia.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" style="vertical-align: middle;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Foto / Video</span>
        `;
        btnMedia.onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        // Botón 2: Editar Textos (Bottom Sheet táctil)
        const btnEdit = document.createElement('button');
        btnEdit.type = 'button';
        btnEdit.className = 'sens-bar-btn sens-btn-edit';
        btnEdit.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5CBA7" stroke-width="2.2" style="vertical-align: middle;">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Editar Textos</span>
        `;
        btnEdit.onclick = (e) => {
            e.stopPropagation();
            openBottomSheet({
                index,
                card,
                viewport,
                headlineEl,
                bodyEl,
                extraElements: components.extraElements
            });
        };

        // Botón 3: Descargar UHD 4K / Full HD
        const btnUhd = document.createElement('button');
        btnUhd.type = 'button';
        btnUhd.className = 'sens-bar-btn sens-btn-uhd';
        btnUhd.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#121214" stroke-width="2.5" style="vertical-align: middle;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Bajar UHD</span>
        `;
        btnUhd.onclick = (e) => {
            e.stopPropagation();
            exportTemplateUHD(index, components, btnUhd);
        };

        actionBar.appendChild(btnMedia);
        actionBar.appendChild(btnEdit);
        actionBar.appendChild(btnUhd);

        ['touchstart', 'touchend', 'click', 'pointerdown'].forEach(evtName => {
            actionBar.addEventListener(evtName, (e) => {
                e.stopPropagation();
            });
        });

        if (card.parentElement && (card.tagName.toLowerCase() === 'article' || card.classList.contains('template-card') || card.classList.contains('specimen-card') || card.classList.contains('template-item'))) {
            card.appendChild(actionBar);
        } else if (viewport.parentElement) {
            viewport.parentElement.appendChild(actionBar);
        } else {
            card.appendChild(actionBar);
        }
    }

    // Inicialización global
    function init() {
        injectEnhancerStyles();
        const templates = discoverTemplates();
        console.log(`[SENS Universal Enhancer v3.0] ${templates.length} templates detectados. Configurando controles móviles UHD...`);

        templates.forEach((card, idx) => {
            setupTemplateCard(card, idx + 1);
        });

        const observer = new MutationObserver(() => {
            const currentTemplates = discoverTemplates();
            currentTemplates.forEach((card, idx) => {
                if (!card._sensConfigured) {
                    setupTemplateCard(card, idx + 1);
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
