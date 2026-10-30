/* =============================================================================
   SENS QUIET VITALITY — UNIVERSAL MARKETING SUITE ENHANCER
   Habilita en cada suite:
   1. Edición directa WYSIWYG de textos en todos los templates.
   2. Intercambio de Fotos por Videos (Loop continuo y controles).
   3. Exportación en Ultra High Definition (UHD 4K • 2160px sin pixelado).
   4. Estándar Quiet Luxury sin emojis.
   ============================================================================= */

(function initSensMarketingEnhancer() {
    console.log('[SENS Enhancer] Activando motor interactivo de marketing...');

    // 1. Inyectar botón flotante para cambiar foto/video en el master canvas
    function setupMediaUploader() {
        // Buscar el contenedor de fondo principal
        const bgTargets = [
            document.getElementById('masterBg'),
            document.getElementById('master-bg'),
            document.getElementById('hero-img-bg'),
            document.getElementById('masterOverlay'),
            document.querySelector('.master-bg'),
            document.querySelector('[id*="bg"]')
        ].filter(Boolean);

        const mainBg = bgTargets[0];
        if (!mainBg) return;

        // Crear input file oculto
        let fileInput = document.getElementById('sensEnhancerFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'sensEnhancerFileInput';
            fileInput.accept = 'video/mp4,video/webm,video/quicktime,video/*,image/jpeg,image/png,image/webp,image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        // Crear barra de herramientas flotante sobre el canvas maestro
        const parentStage = mainBg.parentElement;
        if (parentStage && !document.getElementById('sensEnhancerToolbar')) {
            parentStage.style.position = 'relative';

            const toolbar = document.createElement('div');
            toolbar.id = 'sensEnhancerToolbar';
            toolbar.style.cssText = \`
                position: absolute;
                top: 12px;
                right: 12px;
                z-index: 50;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(18, 18, 20, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 6px 12px;
                border-radius: 9999px;
                border: 1px solid rgba(229, 203, 167, 0.4);
                box-shadow: 0 4px 20px rgba(0,0,0,0.35);
            \`;

            // Botón Cambiar Foto / Video
            const btnMedia = document.createElement('button');
            btnMedia.type = 'button';
            btnMedia.innerHTML = \`
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E5CBA7" stroke-width="2.2" style="vertical-align: middle; margin-right: 4px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span style="color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 0.02em;">Foto / Video</span>
            \`;
            btnMedia.style.cssText = 'background: transparent; border: none; cursor: pointer; display: flex; align-items: center; padding: 2px 6px;';
            btnMedia.onclick = () => fileInput.click();

            // Botón Descargar UHD
            const btnUHD = document.createElement('button');
            btnUHD.type = 'button';
            btnUHD.innerHTML = \`
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E5CBA7" stroke-width="2.2" style="vertical-align: middle; margin-right: 4px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span style="color: #E5CBA7; font-size: 11px; font-weight: 800; letter-spacing: 0.04em;">Descargar UHD</span>
            \`;
            btnUHD.style.cssText = 'background: rgba(229, 203, 167, 0.15); border: 1px solid rgba(229, 203, 167, 0.5); border-radius: 9999px; cursor: pointer; display: flex; align-items: center; padding: 4px 10px; margin-left: 4px;';
            btnUHD.onclick = () => exportStageUHD(parentStage);

            toolbar.appendChild(btnMedia);
            toolbar.appendChild(btnUHD);
            parentStage.appendChild(toolbar);
        }

        // Listener para cambio de archivo
        fileInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video');
            const fileUrl = URL.createObjectURL(file);

            if (isVideo) {
                // Remover video anterior si existía
                const prevVid = mainBg.querySelector('video');
                if (prevVid) prevVid.remove();

                const video = document.createElement('video');
                video.src = fileUrl;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('webkit-playsinline', 'true');
                video.className = 'absolute inset-0 w-full h-full object-cover z-0 pointer-events-none';
                mainBg.style.position = 'relative';
                mainBg.appendChild(video);
                video.play().catch(() => {});
            } else {
                const prevVid = mainBg.querySelector('video');
                if (prevVid) prevVid.remove();
                mainBg.style.backgroundImage = \`url('\${fileUrl}')\`;
            }
        };
    }

    // 2. Hacer todos los textos del stage editables directamente (WYSIWYG)
    function setupWysiwygTextEditing() {
        const textSelectors = [
            '#masterCardTitle', '#masterCardBody', '#preview-titulo', '#preview-bajada',
            '#master-title', '#master-subtitle', '#inspector-title-preview', '#inspector-body-preview',
            '#masterTitle', '#masterBajada', 'h1', 'h2', 'h3', 'h4', 'p'
        ];

        document.querySelectorAll(textSelectors.join(', ')).forEach(el => {
            // Solo si está dentro de la tarjeta o viewport principal
            if (el.closest('.relative') || el.closest('[id*="master"]') || el.closest('[id*="preview"]') || el.closest('[id*="stage"]')) {
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('spellcheck', 'false');
                el.style.outline = 'none';
                el.style.cursor = 'text';

                el.addEventListener('focus', () => {
                    el.style.boxShadow = '0 0 0 2px rgba(229, 203, 167, 0.8)';
                    el.style.borderRadius = '4px';
                });
                el.addEventListener('blur', () => {
                    el.style.boxShadow = 'none';
                });
            }
        });
    }

    // 3. Exportación en Ultra High Definition (UHD 4K)
    function exportStageUHD(stageEl) {
        if (!stageEl) return;

        // Ocultar barra flotante durante la captura
        const toolbar = document.getElementById('sensEnhancerToolbar');
        if (toolbar) toolbar.style.display = 'none';

        // Determinar ratio
        const is916 = stageEl.offsetHeight > stageEl.offsetWidth * 1.4;
        const targetWidth = 2160;
        const scale = Math.max(2, Math.min(targetWidth / stageEl.offsetWidth, 4.5));

        const doExport = () => {
            if (typeof html2canvas === 'function') {
                html2canvas(stageEl, {
                    scale: scale,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    logging: false
                }).then(canvas => {
                    if (toolbar) toolbar.style.display = 'flex';
                    const link = document.createElement('a');
                    link.download = \`SENS_Template_UHD_\${is916 ? '9x16' : '4x5'}.png\`;
                    link.href = canvas.toDataURL('image/png', 1.0);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }).catch(err => {
                    if (toolbar) toolbar.style.display = 'flex';
                    console.error('Error al exportar UHD:', err);
                    alert('La imagen se descargará en resolución estándar por políticas de CORS.');
                });
            } else {
                if (toolbar) toolbar.style.display = 'flex';
                alert('Motor html2canvas cargando... intentá en un segundo.');
            }
        };

        if (typeof html2canvas !== 'function') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = doExport;
            document.head.appendChild(script);
        } else {
            doExport();
        }
    }

    // Ejecutar inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupMediaUploader();
            setupWysiwygTextEditing();
        });
    } else {
        setupMediaUploader();
        setupWysiwygTextEditing();
    }
})();
