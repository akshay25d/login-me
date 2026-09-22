/**
 * ==========================================================================
 * PHOTOSHOP WEB STUDIO ENGINE (photoshop-studio.js)
 * Full-featured Photoshop-style Photo Studio & Editor
 * ==========================================================================
 */

(function () {
    'use strict';

    // --- State Object ---
    const PS = {
        // Core Canvases
        mainCanvas: null,      // Visible composited canvas
        mainCtx: null,
        baseCanvas: null,      // Holds the current filtered/adjusted image
        baseCtx: null,
        paintCanvas: null,     // Holds user brush strokes & drawings
        paintCtx: null,
        overlayCanvas: null,   // Holds active tool previews (crop/shape/marquee)
        overlayCtx: null,

        // Source Image (unfiltered original)
        sourceImage: null,
        imageLoaded: false,
        imageName: 'Untitled-1',
        width: 1200,
        height: 800,

        // Viewport & Zoom
        zoom: 1.0,             // 1.0 = 100%
        panX: 0,
        panY: 0,
        isPanning: false,
        panStartX: 0,
        panStartY: 0,
        showGrid: false,

        // Active Tool
        activeTool: 'brush',   // 'move', 'crop', 'marquee', 'brush', 'eraser', 'healer', 'bucket', 'dodge', 'eyedropper', 'text', 'shape', 'hand', 'zoom'
        isInteracting: false,

        // Tool Options
        brush: {
            size: 15,
            opacity: 1.0,
            hardness: 0.8,
            color: '#ffffff'
        },
        eraser: {
            size: 25,
            opacity: 1.0
        },
        healer: {
            size: 20
        },
        dodge: {
            mode: 'dodge', // 'dodge' or 'burn'
            size: 30,
            exposure: 0.2
        },
        shape: {
            type: 'rectangle', // 'rectangle', 'ellipse', 'line', 'arrow'
            fill: '#38bdf8',
            stroke: '#ffffff',
            strokeWidth: 2,
            hasFill: true,
            hasStroke: true
        },
        text: {
            content: 'Double click to edit',
            fontSize: 32,
            fontFamily: 'Inter, sans-serif',
            color: '#ffffff',
            bold: false,
            italic: false
        },
        crop: {
            isActive: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            aspectRatio: 'free', // 'free', '1:1', '35:45', '16:9', '4:3', '2:3'
            draggingHandle: null,
            dragStartX: 0,
            dragStartY: 0,
            initialRect: null
        },
        colors: {
            foreground: '#ffffff',
            background: '#000000'
        },

        // Adjustments
        adjustments: {
            brightness: 0,   // -100 to 100
            contrast: 0,     // -100 to 100
            saturation: 0,   // -100 to 100
            exposure: 0,     // -100 to 100
            warmth: 0,       // -100 (cool) to 100 (warm)
            blur: 0,         // 0 to 40
            sharpen: 0,      // 0 to 100
            vignette: 0,     // 0 to 100
            hueRotate: 0,    // 0 to 360
            bw: false,
            sepia: false,
            invert: false
        },

        // Text Layers
        textLayers: [],
        activeTextId: null,

        // History
        history: [],
        historyIndex: -1,
        maxHistory: 25
    };

    // Make global for inline handlers
    window.PS = PS;

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        initStudio();
    });

    function initStudio() {
        PS.mainCanvas = document.getElementById('ps-main-canvas');
        if (!PS.mainCanvas) return;

        PS.mainCtx = PS.mainCanvas.getContext('2d');

        // Offscreen canvases
        PS.baseCanvas = document.createElement('canvas');
        PS.baseCtx = PS.baseCanvas.getContext('2d');

        PS.paintCanvas = document.createElement('canvas');
        PS.paintCtx = PS.paintCanvas.getContext('2d');

        PS.overlayCanvas = document.getElementById('ps-overlay-canvas');
        PS.overlayCtx = PS.overlayCanvas ? PS.overlayCanvas.getContext('2d') : null;

        setupEventListeners();
        setupDragAndDrop();
        setupShortcuts();
        updateToolOptionsBar();
        updateColorSwatches();
    }

    // --- Modal Open / Close ---
    window.openPhotoStudioModal = function (initialImageUrl) {
        if (typeof window.openModal === 'function') {
            window.openModal('photoStudioModal');
        } else {
            const m = document.getElementById('photoStudioModal');
            if (m) m.classList.remove('hidden');
        }

        // Initialize if first time
        if (!PS.mainCanvas) initStudio();

        // If an image URL or data URI was passed, load it; otherwise if no image, show welcome state
        if (initialImageUrl) {
            loadImageFromUrl(initialImageUrl);
        } else if (!PS.imageLoaded) {
            // Default blank / welcome
            createNewCanvas(1000, 700, true);
        } else {
            fitToScreen();
            render();
        }
    };

    window.closePhotoStudioModal = function () {
        if (typeof window.closeModal === 'function') {
            window.closeModal('photoStudioModal');
        } else {
            const m = document.getElementById('photoStudioModal');
            if (m) m.classList.add('hidden');
        }
    };

    // --- Welcome Overlay Helpers ---
    function showWelcomeOverlay() {
        const overlay = document.getElementById('ps-welcome-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }
    }

    function hideWelcomeOverlay() {
        const overlay = document.getElementById('ps-welcome-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }

    window.psDismissWelcomeOverlay = function () {
        hideWelcomeOverlay();
        if (!PS.imageLoaded) {
            // Give user a clean white working canvas
            PS.baseCtx.fillStyle = '#ffffff';
            PS.baseCtx.fillRect(0, 0, PS.width, PS.height);
            PS.sourceImage = new Image();
            PS.sourceImage.src = PS.baseCanvas.toDataURL();
            PS.imageLoaded = true;
            render();
            pushHistory('New Blank Canvas');
        }
    };

    window.psCreateBlankCanvas = function (w = 1000, h = 700) {
        createNewCanvas(w, h, false);
    };

    function syncBaseToSource(callback) {
        if (!PS.baseCanvas) return;
        const img = new Image();
        img.onload = () => {
            PS.sourceImage = img;
            if (callback) callback();
        };
        img.src = PS.baseCanvas.toDataURL();
    }

    // --- Canvas Creation & Image Loading ---
    function createNewCanvas(width, height, isSample = false) {
        PS.width = width;
        PS.height = height;

        [PS.mainCanvas, PS.baseCanvas, PS.paintCanvas, PS.overlayCanvas].forEach(c => {
            if (c) {
                c.width = width;
                c.height = height;
            }
        });

        // Reset painting & layers
        PS.paintCtx.clearRect(0, 0, width, height);
        PS.textLayers = [];
        resetAdjustments();

        if (isSample) {
            // Draw a subtle dark placeholder
            PS.baseCtx.fillStyle = '#222222';
            PS.baseCtx.fillRect(0, 0, width, height);
            PS.sourceImage = null;
            PS.imageLoaded = false;
            showWelcomeOverlay();
        } else {
            PS.baseCtx.fillStyle = '#ffffff';
            PS.baseCtx.fillRect(0, 0, width, height);
            PS.sourceImage = new Image();
            PS.sourceImage.src = PS.baseCanvas.toDataURL();
            PS.imageLoaded = true;
            hideWelcomeOverlay();
            pushHistory('New Document');
        }

        fitToScreen();
        render();
        updateStatusBar();
    }

    function loadImageElement(img, name = 'Photo') {
        PS.sourceImage = img;
        PS.imageName = name;
        PS.width = img.naturalWidth || img.width || 1200;
        PS.height = img.naturalHeight || img.height || 800;

        [PS.mainCanvas, PS.baseCanvas, PS.paintCanvas, PS.overlayCanvas].forEach(c => {
            if (c) {
                c.width = PS.width;
                c.height = PS.height;
            }
        });

        PS.paintCtx.clearRect(0, 0, PS.width, PS.height);
        PS.textLayers = [];
        PS.imageLoaded = true;
        resetAdjustments();

        hideWelcomeOverlay();
        document.getElementById('ps-doc-title').textContent = `${PS.imageName} @ ${Math.round(PS.zoom * 100)}% (RGB/8)`;

        applyAdjustmentsToBase();
        pushHistory('Open Image');
        fitToScreen();
        render();
        updateStatusBar();
    }

    function loadImageFromUrl(url, name = 'Sample') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => loadImageElement(img, name);
        img.onerror = () => alert('Failed to load image from URL.');
        img.src = url;
    }

    window.psLoadSamplePhoto = function (type = 'portrait') {
        const canvas = document.createElement('canvas');
        canvas.width = type === 'portrait' ? 800 : 1200;
        canvas.height = type === 'portrait' ? 1000 : 800;
        const ctx = canvas.getContext('2d');

        // Draw an aesthetic procedural studio backdrop + subject silhouette
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (type === 'portrait') {
            grad.addColorStop(0, '#3b82f6');
            grad.addColorStop(0.5, '#6366f1');
            grad.addColorStop(1, '#a855f7');
        } else {
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(0.5, '#0369a1');
            grad.addColorStop(1, '#f59e0b');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid/Lighting accent
        const radial = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.4, 50, canvas.width / 2, canvas.height * 0.4, canvas.width * 0.6);
        radial.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        radial.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Studio Subject silhouette or card
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.38, canvas.width * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height * 0.78, canvas.width * 0.34, canvas.height * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Badge text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STUDIO SAMPLE ' + type.toUpperCase(), canvas.width / 2, canvas.height * 0.95);

        const img = new Image();
        img.onload = () => loadImageElement(img, `Sample-${type}.jpg`);
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    };

    window.psHandleFileInput = function (event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => loadImageElement(img, file.name);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // --- Rendering Pipeline ---
    function render() {
        if (!PS.mainCtx) return;

        // Clear visible canvas
        PS.mainCtx.clearRect(0, 0, PS.width, PS.height);

        // 1. Base filtered image
        PS.mainCtx.drawImage(PS.baseCanvas, 0, 0);

        // 2. Paint / drawing layer
        PS.mainCtx.drawImage(PS.paintCanvas, 0, 0);

        // 3. Text layers
        renderTextLayers(PS.mainCtx);

        // Update container transform
        const container = document.getElementById('ps-canvas-container');
        if (container) {
            container.style.width = `${PS.width}px`;
            container.style.height = `${PS.height}px`;
            container.style.transform = `translate(${PS.panX}px, ${PS.panY}px) scale(${PS.zoom})`;
        }

        updateRulers();
    }

    function renderTextLayers(ctx) {
        PS.textLayers.forEach(tl => {
            if (!tl.visible) return;
            ctx.save();
            ctx.font = `${tl.italic ? 'italic ' : ''}${tl.bold ? 'bold ' : ''}${tl.fontSize}px ${tl.fontFamily}`;
            ctx.fillStyle = tl.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // subtle shadow for readability
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.fillText(tl.text, tl.x, tl.y);
            ctx.restore();
        });
    }

    // --- Adjustments & Filters Engine ---
    function applyAdjustmentsToBase() {
        if (!PS.sourceImage || !PS.baseCtx) return;

        PS.baseCtx.clearRect(0, 0, PS.width, PS.height);

        // Build CSS filter string for high-speed hardware accelerated filtering
        const adj = PS.adjustments;
        const b = 100 + adj.brightness;
        const c = 100 + adj.contrast;
        const s = 100 + adj.saturation;
        const blurPx = adj.blur;
        const hue = adj.hueRotate;
        const inv = adj.invert ? 100 : 0;
        const sep = adj.sepia ? 100 : 0;
        const gray = adj.bw ? 100 : 0;

        PS.baseCtx.save();
        PS.baseCtx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${blurPx}px) hue-rotate(${hue}deg) invert(${inv}%) sepia(${sep}%) grayscale(${gray}%)`;
        PS.baseCtx.drawImage(PS.sourceImage, 0, 0, PS.width, PS.height);
        PS.baseCtx.restore();

        // Post-processing: Warmth / Temperature tint
        if (adj.warmth !== 0) {
            PS.baseCtx.save();
            PS.baseCtx.globalCompositeOperation = adj.warmth > 0 ? 'color' : 'color';
            PS.baseCtx.fillStyle = adj.warmth > 0 ? `rgba(255, 150, 20, ${Math.abs(adj.warmth) / 350})` : `rgba(20, 120, 255, ${Math.abs(adj.warmth) / 350})`;
            PS.baseCtx.fillRect(0, 0, PS.width, PS.height);
            PS.baseCtx.restore();
        }

        // Post-processing: Exposure
        if (adj.exposure !== 0) {
            PS.baseCtx.save();
            PS.baseCtx.globalCompositeOperation = adj.exposure > 0 ? 'lighter' : 'multiply';
            const expAlpha = Math.abs(adj.exposure) / 200;
            PS.baseCtx.fillStyle = adj.exposure > 0 ? `rgba(255, 255, 255, ${expAlpha})` : `rgba(0, 0, 0, ${expAlpha})`;
            PS.baseCtx.fillRect(0, 0, PS.width, PS.height);
            PS.baseCtx.restore();
        }

        // Post-processing: Vignette
        if (adj.vignette > 0) {
            PS.baseCtx.save();
            const radius = Math.max(PS.width, PS.height) * 0.75;
            const vigGrad = PS.baseCtx.createRadialGradient(PS.width / 2, PS.height / 2, radius * 0.3, PS.width / 2, PS.height / 2, radius);
            vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vigGrad.addColorStop(1, `rgba(0, 0, 0, ${adj.vignette / 100})`);
            PS.baseCtx.fillStyle = vigGrad;
            PS.baseCtx.fillRect(0, 0, PS.width, PS.height);
            PS.baseCtx.restore();
        }

        // Post-processing: Sharpen
        if (adj.sharpen > 0) {
            applySharpenConvolution(PS.baseCtx, PS.width, PS.height, adj.sharpen / 100);
        }

        render();
    }

    function applySharpenConvolution(ctx, w, h, strength) {
        try {
            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;
            const factor = strength * 0.4;
            // Quick 3x3 sharpen kernel approximation
            for (let i = 0; i < d.length; i += 4) {
                // enhance high frequencies
                d[i] = Math.min(255, Math.max(0, d[i] + (d[i] - 128) * factor));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + (d[i + 1] - 128) * factor));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + (d[i + 2] - 128) * factor));
            }
            ctx.putImageData(imgData, 0, 0);
        } catch (e) {
            // cross-origin protection fallback
        }
    }

    function resetAdjustments() {
        PS.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            warmth: 0,
            blur: 0,
            sharpen: 0,
            vignette: 0,
            hueRotate: 0,
            bw: false,
            sepia: false,
            invert: false
        };
        syncAdjustmentSliders();
    }

    function syncAdjustmentSliders() {
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
            const valDisp = document.getElementById(id + '-val');
            if (valDisp) valDisp.textContent = v;
        };

        setVal('ps-adj-brightness', PS.adjustments.brightness);
        setVal('ps-adj-contrast', PS.adjustments.contrast);
        setVal('ps-adj-saturation', PS.adjustments.saturation);
        setVal('ps-adj-exposure', PS.adjustments.exposure);
        setVal('ps-adj-warmth', PS.adjustments.warmth);
        setVal('ps-adj-blur', PS.adjustments.blur);
        setVal('ps-adj-sharpen', PS.adjustments.sharpen);
        setVal('ps-adj-vignette', PS.adjustments.vignette);
        setVal('ps-adj-huerotate', PS.adjustments.hueRotate);

        const bwBtn = document.getElementById('ps-adj-bw');
        if (bwBtn) bwBtn.classList.toggle('active', PS.adjustments.bw);
        const sepBtn = document.getElementById('ps-adj-sepia');
        if (sepBtn) sepBtn.classList.toggle('active', PS.adjustments.sepia);
        const invBtn = document.getElementById('ps-adj-invert');
        if (invBtn) invBtn.classList.toggle('active', PS.adjustments.invert);
    }

    window.psHandleAdjustmentChange = function (prop, value) {
        PS.adjustments[prop] = parseFloat(value);
        const disp = document.getElementById(`ps-adj-${prop}-val`);
        if (disp) disp.textContent = value;
        applyAdjustmentsToBase();
    };

    window.psToggleAdjustment = function (prop) {
        PS.adjustments[prop] = !PS.adjustments[prop];
        syncAdjustmentSliders();
        applyAdjustmentsToBase();
        pushHistory(`Toggle ${prop.toUpperCase()}`);
    };

    window.psResetAdjustments = function () {
        resetAdjustments();
        applyAdjustmentsToBase();
        pushHistory('Reset Adjustments');
    };

    window.psAutoEnhance = function () {
        PS.adjustments.brightness = 10;
        PS.adjustments.contrast = 15;
        PS.adjustments.saturation = 18;
        PS.adjustments.sharpen = 20;
        PS.adjustments.warmth = 8;
        syncAdjustmentSliders();
        applyAdjustmentsToBase();
        pushHistory('Auto Enhance');
    };

    // Filter Presets
    window.psApplyPreset = function (presetName) {
        resetAdjustments();
        switch (presetName) {
            case 'portrait':
                PS.adjustments.brightness = 8;
                PS.adjustments.contrast = 10;
                PS.adjustments.warmth = 15;
                PS.adjustments.blur = 0.5;
                PS.adjustments.saturation = 10;
                break;
            case 'vintage':
                PS.adjustments.contrast = -10;
                PS.adjustments.saturation = -20;
                PS.adjustments.warmth = 35;
                PS.adjustments.vignette = 40;
                break;
            case 'cinematic':
                PS.adjustments.contrast = 25;
                PS.adjustments.saturation = -10;
                PS.adjustments.warmth = -15;
                PS.adjustments.vignette = 30;
                break;
            case 'noir':
                PS.adjustments.bw = true;
                PS.adjustments.contrast = 45;
                PS.adjustments.brightness = -5;
                PS.adjustments.vignette = 50;
                break;
            case 'cyberpunk':
                PS.adjustments.contrast = 35;
                PS.adjustments.saturation = 50;
                PS.adjustments.hueRotate = 160;
                break;
            case 'hdr':
                PS.adjustments.contrast = 30;
                PS.adjustments.saturation = 35;
                PS.adjustments.sharpen = 40;
                PS.adjustments.exposure = 10;
                break;
            case 'golden':
                PS.adjustments.warmth = 45;
                PS.adjustments.brightness = 10;
                PS.adjustments.contrast = 15;
                PS.adjustments.saturation = 20;
                break;
            case 'normal':
            default:
                break;
        }

        // Highlight active preset card
        document.querySelectorAll('.ps-filter-card').forEach(c => {
            c.classList.toggle('active', c.dataset.preset === presetName);
        });

        syncAdjustmentSliders();
        applyAdjustmentsToBase();
        pushHistory(`Preset: ${presetName}`);
    };

    // --- Tool Switching ---
    window.psSelectTool = function (toolName) {
        PS.activeTool = toolName;

        // Update toolbar active states
        document.querySelectorAll('.ps-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        // Viewport cursor class
        const vp = document.getElementById('ps-canvas-viewport');
        if (vp) {
            vp.className = 'ps-canvas-viewport ps-checkerboard flex-1 w-full h-full relative overflow-hidden';
            if (toolName === 'hand') vp.classList.add('tool-hand');
            else if (toolName === 'text') vp.classList.add('tool-text');
            else if (toolName === 'eyedropper') vp.classList.add('tool-eyedropper');
            else if (['crop', 'marquee', 'shape'].includes(toolName)) vp.classList.add('tool-crosshair');
        }

        // Brush cursor indicator
        const brushCursor = document.getElementById('ps-brush-cursor');
        if (brushCursor) {
            brushCursor.style.display = ['brush', 'eraser', 'healer', 'dodge'].includes(toolName) ? 'block' : 'none';
            updateBrushCursorSize();
        }

        // Crop overlay visibility
        if (toolName === 'crop') {
            startCropMode();
        } else if (PS.crop.isActive) {
            cancelCrop();
        }

        updateToolOptionsBar();
        updateStatusBar();
    };

    function updateToolOptionsBar() {
        const bar = document.getElementById('ps-tool-options-bar');
        if (!bar) return;

        let html = '';
        const tool = PS.activeTool;

        if (tool === 'brush') {
            html = `
                <div class="flex items-center gap-4 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-paintbrush mr-1"></i>Brush Options:</span>
                    <label class="flex items-center gap-2">Size: 
                        <input type="range" min="1" max="120" value="${PS.brush.size}" oninput="PS.brush.size = parseInt(this.value); document.getElementById('ps-opt-bsize').textContent = this.value; window.psUpdateBrushCursor();" class="ps-range w-24">
                        <span id="ps-opt-bsize" class="font-mono w-6">${PS.brush.size}</span>px
                    </label>
                    <label class="flex items-center gap-2">Opacity: 
                        <input type="range" min="5" max="100" value="${Math.round(PS.brush.opacity * 100)}" oninput="PS.brush.opacity = parseInt(this.value)/100; document.getElementById('ps-opt-bop').textContent = this.value;" class="ps-range w-20">
                        <span id="ps-opt-bop" class="font-mono w-6">${Math.round(PS.brush.opacity * 100)}</span>%
                    </label>
                    <label class="flex items-center gap-2">Hardness: 
                        <input type="range" min="0" max="100" value="${Math.round(PS.brush.hardness * 100)}" oninput="PS.brush.hardness = parseInt(this.value)/100;" class="ps-range w-20">
                    </label>
                    <label class="flex items-center gap-1.5 cursor-pointer">
                        <span>Color:</span>
                        <input type="color" value="${PS.colors.foreground}" onchange="psSetForegroundColor(this.value)" class="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer">
                    </label>
                </div>
            `;
        } else if (tool === 'eraser') {
            html = `
                <div class="flex items-center gap-4 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-eraser mr-1"></i>Eraser Options:</span>
                    <label class="flex items-center gap-2">Size: 
                        <input type="range" min="2" max="150" value="${PS.eraser.size}" oninput="PS.eraser.size = parseInt(this.value); document.getElementById('ps-opt-esize').textContent = this.value; window.psUpdateBrushCursor();" class="ps-range w-28">
                        <span id="ps-opt-esize" class="font-mono w-6">${PS.eraser.size}</span>px
                    </label>
                    <label class="flex items-center gap-2">Opacity: 
                        <input type="range" min="10" max="100" value="${Math.round(PS.eraser.opacity * 100)}" oninput="PS.eraser.opacity = parseInt(this.value)/100; document.getElementById('ps-opt-eop').textContent = this.value;" class="ps-range w-20">
                        <span id="ps-opt-eop" class="font-mono w-6">${Math.round(PS.eraser.opacity * 100)}</span>%
                    </label>
                </div>
            `;
        } else if (tool === 'crop') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-crop-simple mr-1"></i>Crop & Straighten:</span>
                    <label class="flex items-center gap-1.5">Aspect Ratio:
                        <select onchange="psSetCropRatio(this.value)" class="bg-[#333333] text-gray-200 border border-[#444] rounded px-2 py-1 text-xs">
                            <option value="free" ${PS.crop.aspectRatio === 'free' ? 'selected' : ''}>Free Transform</option>
                            <option value="1:1" ${PS.crop.aspectRatio === '1:1' ? 'selected' : ''}>1:1 (Square)</option>
                            <option value="35:45" ${PS.crop.aspectRatio === '35:45' ? 'selected' : ''}>35:45 (Indian Passport)</option>
                            <option value="25:35" ${PS.crop.aspectRatio === '25:35' ? 'selected' : ''}>25:35 (Aadhaar / Voter ID)</option>
                            <option value="16:9" ${PS.crop.aspectRatio === '16:9' ? 'selected' : ''}>16:9 (Widescreen)</option>
                            <option value="4:3" ${PS.crop.aspectRatio === '4:3' ? 'selected' : ''}>4:3 (Standard Photo)</option>
                            <option value="2:3" ${PS.crop.aspectRatio === '2:3' ? 'selected' : ''}>2:3 (Portrait 4x6)</option>
                        </select>
                    </label>
                    <button onclick="psCommitCrop()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition flex items-center gap-1">
                        <i class="fa-solid fa-check"></i> Commit (Enter)
                    </button>
                    <button onclick="psCancelCrop()" class="px-2.5 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition">
                        Cancel (Esc)
                    </button>
                </div>
            `;
        } else if (tool === 'text') {
            html = `
                <div class="flex items-center gap-3 text-xs flex-wrap">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-font mr-1"></i>Text Tool:</span>
                    <select onchange="PS.text.fontFamily = this.value;" class="bg-[#333333] text-gray-200 border border-[#444] rounded px-2 py-1 text-xs">
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Impact, sans-serif">Impact (Meme/Bold)</option>
                        <option value="'Courier New', monospace">Courier (Typewriter)</option>
                    </select>
                    <label class="flex items-center gap-1.5">Size:
                        <input type="number" min="10" max="160" value="${PS.text.fontSize}" onchange="PS.text.fontSize = parseInt(this.value);" class="w-14 bg-[#333333] text-gray-200 border border-[#444] rounded px-1.5 py-0.5 text-xs"> px
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <span>Color:</span>
                        <input type="color" value="${PS.text.color}" onchange="PS.text.color = this.value;" class="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer">
                    </label>
                    <button onclick="PS.text.bold = !PS.text.bold; this.classList.toggle('text-sky-400');" class="px-2 py-1 bg-[#333333] hover:bg-[#444] rounded font-bold text-xs">B</button>
                    <button onclick="PS.text.italic = !PS.text.italic; this.classList.toggle('text-sky-400');" class="px-2 py-1 bg-[#333333] hover:bg-[#444] rounded italic text-xs">I</button>
                    <button onclick="psAddTextLayerPrompt()" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold transition flex items-center gap-1">
                        <i class="fa-solid fa-plus"></i> Add Text
                    </button>
                </div>
            `;
        } else if (tool === 'shape') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-shapes mr-1"></i>Shape Options:</span>
                    <select onchange="PS.shape.type = this.value;" class="bg-[#333333] text-gray-200 border border-[#444] rounded px-2 py-1 text-xs">
                        <option value="rectangle">Rectangle</option>
                        <option value="ellipse">Circle / Ellipse</option>
                        <option value="line">Line</option>
                        <option value="arrow">Arrow</option>
                    </select>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <span>Fill:</span>
                        <input type="color" value="${PS.shape.fill}" onchange="PS.shape.fill = this.value;" class="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer">
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <span>Stroke:</span>
                        <input type="color" value="${PS.shape.stroke}" onchange="PS.shape.stroke = this.value;" class="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer">
                    </label>
                    <label class="flex items-center gap-1">Width:
                        <input type="number" min="1" max="40" value="${PS.shape.strokeWidth}" onchange="PS.shape.strokeWidth = parseInt(this.value);" class="w-12 bg-[#333333] text-gray-200 border border-[#444] rounded px-1 text-xs"> px
                    </label>
                </div>
            `;
        } else if (tool === 'healer') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-bandage mr-1"></i>Spot Healing Brush:</span>
                    <span class="text-gray-400">Click blemish or spots to blend and remove.</span>
                    <label class="flex items-center gap-2">Radius: 
                        <input type="range" min="5" max="80" value="${PS.healer.size}" oninput="PS.healer.size = parseInt(this.value); document.getElementById('ps-opt-hsize').textContent = this.value; window.psUpdateBrushCursor();" class="ps-range w-24">
                        <span id="ps-opt-hsize" class="font-mono w-6">${PS.healer.size}</span>px
                    </label>
                </div>
            `;
        } else if (tool === 'dodge') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-sun mr-1"></i>Dodge / Burn:</span>
                    <select onchange="PS.dodge.mode = this.value;" class="bg-[#333333] text-gray-200 border border-[#444] rounded px-2 py-1 text-xs">
                        <option value="dodge">Dodge (Lighten)</option>
                        <option value="burn">Burn (Darken)</option>
                    </select>
                    <label class="flex items-center gap-2">Size: 
                        <input type="range" min="10" max="150" value="${PS.dodge.size}" oninput="PS.dodge.size = parseInt(this.value); window.psUpdateBrushCursor();" class="ps-range w-24">
                    </label>
                    <label class="flex items-center gap-2">Exposure: 
                        <input type="range" min="5" max="100" value="${Math.round(PS.dodge.exposure * 100)}" oninput="PS.dodge.exposure = parseInt(this.value)/100;" class="ps-range w-20">
                    </label>
                </div>
            `;
        } else if (tool === 'bucket') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-fill-drip mr-1"></i>Paint Bucket:</span>
                    <label class="flex items-center gap-1.5 cursor-pointer">
                        <span>Fill Color:</span>
                        <input type="color" value="${PS.colors.foreground}" onchange="psSetForegroundColor(this.value)" class="w-6 h-6 rounded border border-gray-600 bg-transparent cursor-pointer">
                    </label>
                    <span class="text-gray-400">Click any background or color area to flood fill with foreground color.</span>
                </div>
            `;
        } else if (tool === 'marquee') {
            html = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-regular fa-square mr-1"></i>Marquee Selection:</span>
                    <span class="text-gray-400">Drag to select. Press <kbd class="px-1.5 py-0.5 bg-[#333] rounded text-gray-300">Delete</kbd> to erase region or use Bucket to fill.</span>
                    <button onclick="psClearSelection()" class="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition">Deselect (Esc)</button>
                </div>
            `;
        } else {
            html = `
                <div class="flex items-center gap-3 text-xs text-gray-400">
                    <span>Tool: <strong class="text-sky-300 capitalize">${tool}</strong></span>
                    <span>|</span>
                    <span>Use shortcut keys <kbd class="px-1.5 py-0.5 bg-[#333] rounded text-gray-300">V</kbd> <kbd class="px-1.5 py-0.5 bg-[#333] rounded text-gray-300">B</kbd> <kbd class="px-1.5 py-0.5 bg-[#333] rounded text-gray-300">C</kbd> <kbd class="px-1.5 py-0.5 bg-[#333] rounded text-gray-300">T</kbd> for rapid workflow.</span>
                </div>
            `;
        }

        bar.innerHTML = html;
    }

    // --- Interactive Canvas Mouse & Touch Handling ---
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let shapeStartX = 0;
    let shapeStartY = 0;
    let lastTextClickTime = 0;
    let lastTextClickId = null;

    // Crop Drag State
    let cropDrag = {
        active: false,
        handle: null, // 'move', 'tl', 'tr', 'bl', 'br', 'tc', 'bc', 'ml', 'mr', 'new'
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
        origW: 0,
        origH: 0
    };

    function setupEventListeners() {
        const viewport = document.getElementById('ps-canvas-viewport');
        if (!viewport) return;

        viewport.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        // Touch support for tablets / touchscreens
        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) onPointerDown(e);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) onPointerMove(e);
        }, { passive: false });
        window.addEventListener('touchend', onPointerUp);

        // Mouse wheel zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            setZoom(PS.zoom + delta);
        }, { passive: false });

        // Tab switches in right dock
        document.querySelectorAll('.ps-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.tab;
                document.querySelectorAll('.ps-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.ps-dock-content').forEach(p => p.classList.add('hidden'));
                const activePanel = document.getElementById(`ps-dock-${targetId}`);
                if (activePanel) activePanel.classList.remove('hidden');
            });
        });
    }

    function getCanvasCoords(e) {
        if (!PS.mainCanvas) return { x: 0, y: 0, rawClientX: 0, rawClientY: 0 };
        const rect = PS.mainCanvas.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
        const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

        const x = (clientX - rect.left) * (PS.width / (rect.width || 1));
        const y = (clientY - rect.top) * (PS.height / (rect.height || 1));
        return { x: Math.round(x), y: Math.round(y), rawClientX: clientX, rawClientY: clientY };
    }

    function onPointerDown(e) {
        if (e.target.closest('.ps-menu-dropdown')) return;

        const coords = getCanvasCoords(e);
        const tool = PS.activeTool;

        // Spacebar, Hand Tool or Middle Mouse Button: Pan viewport
        if (tool === 'hand' || e.spaceKey || e.button === 1) {
            PS.isPanning = true;
            PS.panStartX = e.clientX - PS.panX;
            PS.panStartY = e.clientY - PS.panY;
            return;
        }

        // Crop Tool Handling
        if (tool === 'crop') {
            const handleEl = e.target.closest('.ps-crop-handle');
            if (handleEl) {
                const hType = handleEl.dataset.handle || ['tl','tr','bl','br','tc','bc','ml','mr'].find(h => handleEl.classList.contains(h)) || 'br';
                cropDrag = {
                    active: true,
                    handle: hType,
                    startX: coords.x,
                    startY: coords.y,
                    origX: PS.crop.x,
                    origY: PS.crop.y,
                    origW: PS.crop.width,
                    origH: PS.crop.height
                };
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (e.target.closest('#ps-crop-overlay')) {
                cropDrag = {
                    active: true,
                    handle: 'move',
                    startX: coords.x,
                    startY: coords.y,
                    origX: PS.crop.x,
                    origY: PS.crop.y,
                    origW: PS.crop.width,
                    origH: PS.crop.height
                };
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Clicked outside crop box -> start dragging new crop rectangle
            cropDrag = {
                active: true,
                handle: 'new',
                startX: coords.x,
                startY: coords.y,
                origX: coords.x,
                origY: coords.y,
                origW: 0,
                origH: 0
            };
            PS.crop.x = coords.x;
            PS.crop.y = coords.y;
            PS.crop.width = 0;
            PS.crop.height = 0;
            updateCropOverlayDom();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Zoom Tool
        if (tool === 'zoom') {
            const factor = e.altKey ? -0.25 : 0.25;
            setZoom(PS.zoom + factor);
            return;
        }

        // Eyedropper Tool
        if (tool === 'eyedropper') {
            sampleCanvasColor(coords.x, coords.y);
            return;
        }

        // Paint Bucket
        if (tool === 'bucket') {
            floodFill(coords.x, coords.y, PS.colors.foreground);
            return;
        }

        // Spot Healer
        if (tool === 'healer') {
            applySpotHealing(coords.x, coords.y, PS.healer.size);
            return;
        }

        // Text Tool
        if (tool === 'text') {
            const hitText = findTextLayerAt(coords.x, coords.y);
            if (hitText) {
                const now = Date.now();
                if (lastTextClickId === hitText.id && (now - lastTextClickTime) < 380) {
                    const newStr = prompt('Edit Text:', hitText.text);
                    if (newStr !== null) {
                        hitText.text = newStr;
                        render();
                        pushHistory('Edit Text');
                    }
                } else {
                    PS.activeTextId = hitText.id;
                    PS.isInteracting = true;
                    hitText.dragOffsetX = coords.x - hitText.x;
                    hitText.dragOffsetY = coords.y - hitText.y;
                    updateLayersList();
                    render();
                }
                lastTextClickTime = now;
                lastTextClickId = hitText.id;
                return;
            }

            // Clicked empty canvas -> create text layer at clicked position!
            const text = prompt('Enter text for photo:', 'Your Text Here');
            if (text) {
                const newLayer = {
                    id: 'text_' + Date.now(),
                    text: text,
                    x: coords.x,
                    y: coords.y,
                    fontSize: PS.text.fontSize || 36,
                    fontFamily: PS.text.fontFamily || 'Inter, sans-serif',
                    color: PS.colors.foreground || PS.text.color || '#ffffff',
                    bold: PS.text.bold || false,
                    italic: PS.text.italic || false,
                    visible: true
                };
                PS.textLayers.push(newLayer);
                PS.activeTextId = newLayer.id;
                updateLayersList();
                render();
                pushHistory(`Add Text: "${text.slice(0, 15)}"`);
            }
            return;
        }

        // Move Tool
        if (tool === 'move') {
            const hitText = findTextLayerAt(coords.x, coords.y);
            if (hitText) {
                PS.activeTextId = hitText.id;
                PS.isInteracting = true;
                hitText.dragOffsetX = coords.x - hitText.x;
                hitText.dragOffsetY = coords.y - hitText.y;
                updateLayersList();
                render();
                return;
            } else {
                // Pan viewport when dragging canvas with Move tool
                PS.isPanning = true;
                PS.panStartX = e.clientX - PS.panX;
                PS.panStartY = e.clientY - PS.panY;
                return;
            }
        }

        // Brush / Eraser / Dodge
        if (['brush', 'eraser', 'dodge'].includes(tool)) {
            isDrawing = true;
            lastX = coords.x;
            lastY = coords.y;

            if (tool === 'brush') {
                drawBrushStroke(coords.x, coords.y, true);
            } else if (tool === 'eraser') {
                drawEraserStroke(coords.x, coords.y, true);
            } else if (tool === 'dodge') {
                applyDodgeBurn(coords.x, coords.y);
            }
            render();
            return;
        }

        // Shapes / Marquee
        if (['shape', 'marquee'].includes(tool)) {
            if (tool === 'marquee') clearOverlay();
            isDrawing = true;
            shapeStartX = coords.x;
            shapeStartY = coords.y;
            return;
        }
    }

    function onPointerMove(e) {
        // Track brush cursor ring
        const brushCursor = document.getElementById('ps-brush-cursor');
        if (brushCursor && brushCursor.style.display !== 'none') {
            brushCursor.style.left = `${e.clientX}px`;
            brushCursor.style.top = `${e.clientY}px`;
        }

        // Update status bar coordinates
        if (PS.mainCanvas) {
            const coords = getCanvasCoords(e);
            const coordDisp = document.getElementById('ps-status-coords');
            if (coordDisp && coords.x >= 0 && coords.x <= PS.width && coords.y >= 0 && coords.y <= PS.height) {
                coordDisp.textContent = `X: ${coords.x}, Y: ${coords.y}`;
            }
        }

        // Crop Box Dragging / Resizing
        if (cropDrag.active) {
            const coords = getCanvasCoords(e);
            const dx = coords.x - cropDrag.startX;
            const dy = coords.y - cropDrag.startY;
            const h = cropDrag.handle;
            const ratio = getNumericCropRatio();

            if (h === 'move') {
                let nx = cropDrag.origX + dx;
                let ny = cropDrag.origY + dy;
                nx = Math.max(0, Math.min(PS.width - PS.crop.width, nx));
                ny = Math.max(0, Math.min(PS.height - PS.crop.height, ny));
                PS.crop.x = Math.round(nx);
                PS.crop.y = Math.round(ny);
            } else if (h === 'new') {
                let x1 = Math.max(0, Math.min(PS.width, Math.min(cropDrag.startX, coords.x)));
                let y1 = Math.max(0, Math.min(PS.height, Math.min(cropDrag.startY, coords.y)));
                let x2 = Math.max(0, Math.min(PS.width, Math.max(cropDrag.startX, coords.x)));
                let y2 = Math.max(0, Math.min(PS.height, Math.max(cropDrag.startY, coords.y)));
                let w = x2 - x1;
                let h = y2 - y1;
                if (ratio) {
                    if (w / Math.max(1, h) > ratio) {
                        w = Math.round(h * ratio);
                    } else {
                        h = Math.round(w / ratio);
                    }
                }
                PS.crop.x = Math.round(x1);
                PS.crop.y = Math.round(y1);
                PS.crop.width = Math.max(10, Math.round(w));
                PS.crop.height = Math.max(10, Math.round(h));
            } else {
                const { origX, origY, origW, origH } = cropDrag;
                const right = origX + origW;
                const bottom = origY + origH;

                if (h.includes('r')) {
                    let newW = Math.max(20, Math.min(PS.width - origX, origW + dx));
                    PS.crop.width = Math.round(newW);
                }
                if (h.includes('l')) {
                    let newX = Math.max(0, Math.min(right - 20, origX + dx));
                    PS.crop.x = Math.round(newX);
                    PS.crop.width = Math.round(right - newX);
                }
                if (h.includes('b')) {
                    let newH = Math.max(20, Math.min(PS.height - origY, origH + dy));
                    PS.crop.height = Math.round(newH);
                }
                if (h.includes('t')) {
                    let newY = Math.max(0, Math.min(bottom - 20, origY + dy));
                    PS.crop.y = Math.round(newY);
                    PS.crop.height = Math.round(bottom - newY);
                }

                if (ratio) {
                    if (h === 'br' || h === 'mr') {
                        PS.crop.height = Math.round(PS.crop.width / ratio);
                        if (PS.crop.y + PS.crop.height > PS.height) {
                            PS.crop.height = PS.height - PS.crop.y;
                            PS.crop.width = Math.round(PS.crop.height * ratio);
                        }
                    } else if (h === 'bl' || h === 'ml') {
                        PS.crop.height = Math.round(PS.crop.width / ratio);
                        if (PS.crop.y + PS.crop.height > PS.height) {
                            PS.crop.height = PS.height - PS.crop.y;
                            PS.crop.width = Math.round(PS.crop.height * ratio);
                            PS.crop.x = right - PS.crop.width;
                        }
                    } else if (h === 'tr') {
                        PS.crop.width = Math.round(PS.crop.height * ratio);
                        if (PS.crop.x + PS.crop.width > PS.width) {
                            PS.crop.width = PS.width - PS.crop.x;
                            PS.crop.height = Math.round(PS.crop.width / ratio);
                            PS.crop.y = bottom - PS.crop.height;
                        }
                    } else if (h === 'tl') {
                        PS.crop.width = Math.round(PS.crop.height * ratio);
                        PS.crop.x = right - PS.crop.width;
                        if (PS.crop.x < 0) {
                            PS.crop.x = 0;
                            PS.crop.width = right;
                            PS.crop.height = Math.round(PS.crop.width / ratio);
                            PS.crop.y = bottom - PS.crop.height;
                        }
                    } else if (h === 'bc') {
                        PS.crop.width = Math.round(PS.crop.height * ratio);
                        if (PS.crop.x + PS.crop.width > PS.width) PS.crop.width = PS.width - PS.crop.x;
                    } else if (h === 'tc') {
                        PS.crop.width = Math.round(PS.crop.height * ratio);
                        if (PS.crop.x + PS.crop.width > PS.width) PS.crop.width = PS.width - PS.crop.x;
                    }
                }
            }

            updateCropOverlayDom();
            return;
        }

        // Panning viewport
        if (PS.isPanning) {
            PS.panX = e.clientX - PS.panStartX;
            PS.panY = e.clientY - PS.panStartY;
            render();
            return;
        }

        // Moving text layer
        if (PS.isInteracting && PS.activeTextId) {
            const textLayer = PS.textLayers.find(t => t.id === PS.activeTextId);
            if (textLayer) {
                const coords = getCanvasCoords(e);
                textLayer.x = coords.x - textLayer.dragOffsetX;
                textLayer.y = coords.y - textLayer.dragOffsetY;
                render();
            }
            return;
        }

        if (!isDrawing) return;

        const coords = getCanvasCoords(e);
        const tool = PS.activeTool;

        if (tool === 'brush') {
            drawBrushStroke(coords.x, coords.y);
            render();
        } else if (tool === 'eraser') {
            drawEraserStroke(coords.x, coords.y);
            render();
        } else if (tool === 'dodge') {
            applyDodgeBurn(coords.x, coords.y);
            render();
        } else if (tool === 'shape') {
            drawShapePreview(shapeStartX, shapeStartY, coords.x, coords.y);
        } else if (tool === 'marquee') {
            drawMarqueePreview(shapeStartX, shapeStartY, coords.x, coords.y);
        }

        lastX = coords.x;
        lastY = coords.y;
    }

    function onPointerUp(e) {
        if (cropDrag.active) {
            cropDrag.active = false;
        }

        if (PS.isPanning) {
            PS.isPanning = false;
        }

        if (PS.isInteracting && PS.activeTextId) {
            PS.isInteracting = false;
            pushHistory('Move Text');
        }

        if (isDrawing) {
            isDrawing = false;
            const tool = PS.activeTool;

            if (tool === 'brush') {
                pushHistory('Brush Stroke');
            } else if (tool === 'eraser') {
                syncBaseToSource();
                pushHistory('Eraser Stroke');
            } else if (tool === 'dodge') {
                syncBaseToSource();
                pushHistory(`Dodge/Burn (${PS.dodge.mode})`);
            } else if (tool === 'shape') {
                const coords = getCanvasCoords(e);
                commitShape(shapeStartX, shapeStartY, coords.x, coords.y);
                clearOverlay();
                pushHistory(`Draw ${PS.shape.type}`);
            } else if (tool === 'marquee') {
                const coords = getCanvasCoords(e);
                const x1 = Math.min(shapeStartX, coords.x);
                const y1 = Math.min(shapeStartY, coords.y);
                const w = Math.abs(coords.x - shapeStartX);
                const h = Math.abs(coords.y - shapeStartY);
                if (w > 5 && h > 5) {
                    PS.marqueeSelection = { x: x1, y: y1, w: w, h: h, active: true };
                    drawMarqueeSelection();
                } else {
                    PS.marqueeSelection = null;
                    clearOverlay();
                }
            }
        }
    }

    // --- Drawing Tool Implementations ---
    function drawBrushStroke(x, y, isFirstPoint = false) {
        const ctx = PS.paintCtx;
        ctx.save();
        ctx.strokeStyle = PS.colors.foreground;
        ctx.fillStyle = PS.colors.foreground;
        ctx.lineWidth = PS.brush.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = PS.brush.opacity;

        ctx.beginPath();
        if (isFirstPoint) {
            ctx.arc(x, y, PS.brush.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawEraserStroke(x, y, isFirstPoint = false) {
        // Erase on paint canvas
        PS.paintCtx.save();
        PS.paintCtx.globalCompositeOperation = 'destination-out';
        PS.paintCtx.lineWidth = PS.eraser.size;
        PS.paintCtx.lineCap = 'round';
        PS.paintCtx.lineJoin = 'round';
        PS.paintCtx.globalAlpha = PS.eraser.opacity;
        PS.paintCtx.beginPath();
        if (isFirstPoint) {
            PS.paintCtx.arc(x, y, PS.eraser.size / 2, 0, Math.PI * 2);
            PS.paintCtx.fill();
        } else {
            PS.paintCtx.moveTo(lastX, lastY);
            PS.paintCtx.lineTo(x, y);
            PS.paintCtx.stroke();
        }
        PS.paintCtx.restore();

        // Also erase on base canvas (photo pixels to transparency)
        PS.baseCtx.save();
        PS.baseCtx.globalCompositeOperation = 'destination-out';
        PS.baseCtx.lineWidth = PS.eraser.size;
        PS.baseCtx.lineCap = 'round';
        PS.baseCtx.lineJoin = 'round';
        PS.baseCtx.globalAlpha = PS.eraser.opacity;
        PS.baseCtx.beginPath();
        if (isFirstPoint) {
            PS.baseCtx.arc(x, y, PS.eraser.size / 2, 0, Math.PI * 2);
            PS.baseCtx.fill();
        } else {
            PS.baseCtx.moveTo(lastX, lastY);
            PS.baseCtx.lineTo(x, y);
            PS.baseCtx.stroke();
        }
        PS.baseCtx.restore();
    }

    function applyDodgeBurn(x, y) {
        const radius = PS.dodge.size / 2;
        const ctx = PS.baseCtx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();

        ctx.globalCompositeOperation = PS.dodge.mode === 'dodge' ? 'screen' : 'multiply';
        ctx.globalAlpha = PS.dodge.exposure;
        ctx.fillStyle = PS.dodge.mode === 'dodge' ? '#ffffff' : '#000000';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
    }

    function applySpotHealing(x, y, radius) {
        const ctx = PS.baseCtx;
        try {
            const diameter = radius * 2;
            const sampleX = Math.max(0, x - radius);
            const sampleY = Math.max(0, y - radius);
            const imgData = ctx.getImageData(sampleX, sampleY, diameter, diameter);
            const d = imgData.data;

            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < d.length; i += 4) {
                r += d[i];
                g += d[i + 1];
                b += d[i + 2];
                count++;
            }
            if (count > 0) {
                const avgR = Math.round(r / count);
                const avgG = Math.round(g / count);
                const avgB = Math.round(b / count);

                ctx.save();
                const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                grad.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 0.85)`);
                grad.addColorStop(0.7, `rgba(${avgR}, ${avgG}, ${avgB}, 0.5)`);
                grad.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                syncBaseToSource();
                pushHistory('Spot Healing');
                render();
            }
        } catch (e) { }
    }

    function sampleCanvasColor(x, y) {
        try {
            const pixel = PS.mainCtx.getImageData(x, y, 1, 1).data;
            const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
            psSetForegroundColor(hex);
            window.psSelectTool('brush');
        } catch (e) { }
    }

    function floodFill(startX, startY, fillColor) {
        if (startX < 0 || startX >= PS.width || startY < 0 || startY >= PS.height) return;

        // If there's an active marquee selection, fill just the marquee region!
        if (PS.marqueeSelection && PS.marqueeSelection.active) {
            const m = PS.marqueeSelection;
            PS.baseCtx.save();
            PS.baseCtx.fillStyle = fillColor;
            PS.baseCtx.fillRect(m.x, m.y, m.w, m.h);
            PS.baseCtx.restore();
            syncBaseToSource();
            pushHistory('Fill Selection');
            render();
            return;
        }

        const ctx = PS.baseCtx;
        const imgData = ctx.getImageData(0, 0, PS.width, PS.height);
        const data = imgData.data;

        const startIndex = (startY * PS.width + startX) * 4;
        const startR = data[startIndex];
        const startG = data[startIndex + 1];
        const startB = data[startIndex + 2];
        const startA = data[startIndex + 3];

        // Parse fill color
        const tempEl = document.createElement('div');
        tempEl.style.color = fillColor;
        document.body.appendChild(tempEl);
        const rgbMatch = window.getComputedStyle(tempEl).color.match(/\d+/g);
        document.body.removeChild(tempEl);
        const fillR = rgbMatch ? parseInt(rgbMatch[0], 10) : 0;
        const fillG = rgbMatch ? parseInt(rgbMatch[1], 10) : 0;
        const fillB = rgbMatch ? parseInt(rgbMatch[2], 10) : 0;
        const fillA = 255;

        // Exit if target color matches fill color
        if (Math.abs(startR - fillR) < 5 && Math.abs(startG - fillG) < 5 && Math.abs(startB - fillB) < 5 && Math.abs(startA - fillA) < 5) {
            return;
        }

        const tolerance = 40;
        function colorMatch(idx) {
            const dr = Math.abs(data[idx] - startR);
            const dg = Math.abs(data[idx + 1] - startG);
            const db = Math.abs(data[idx + 2] - startB);
            const da = Math.abs(data[idx + 3] - startA);
            return (dr + dg + db + da) <= tolerance * 4;
        }

        const queue = [startX, startY];
        const visited = new Uint8Array(PS.width * PS.height);
        visited[startY * PS.width + startX] = 1;

        let filledCount = 0;
        const maxPixels = PS.width * PS.height;

        while (queue.length > 0 && filledCount < maxPixels) {
            const cy = queue.pop();
            const cx = queue.pop();
            const idx = (cy * PS.width + cx) * 4;

            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = fillA;
            filledCount++;

            const neighbors = [
                [cx + 1, cy],
                [cx - 1, cy],
                [cx, cy + 1],
                [cx, cy - 1]
            ];

            for (let i = 0; i < 4; i++) {
                const nx = neighbors[i][0];
                const ny = neighbors[i][1];
                if (nx >= 0 && nx < PS.width && ny >= 0 && ny < PS.height) {
                    const pos = ny * PS.width + nx;
                    if (!visited[pos]) {
                        visited[pos] = 1;
                        if (colorMatch(pos * 4)) {
                            queue.push(nx, ny);
                        }
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        syncBaseToSource();
        pushHistory('Bucket Fill');
        render();
    }

    function drawMarqueePreview(x1, y1, x2, y2) {
        if (!PS.overlayCtx) return;
        clearOverlay();
        const ctx = PS.overlayCtx;
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const w = x2 - x1;
        const h = y2 - y1;
        ctx.strokeRect(x1, y1, w, h);
        ctx.strokeStyle = '#000000';
        ctx.lineDashOffset = 4;
        ctx.strokeRect(x1, y1, w, h);
        ctx.restore();
    }

    function drawMarqueeSelection() {
        if (!PS.overlayCtx || !PS.marqueeSelection || !PS.marqueeSelection.active) return;
        clearOverlay();
        const m = PS.marqueeSelection;
        const ctx = PS.overlayCtx;
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(m.x, m.y, m.w, m.h);
        ctx.strokeStyle = '#0078d4';
        ctx.lineDashOffset = 5;
        ctx.strokeRect(m.x, m.y, m.w, m.h);
        ctx.restore();
    }

    window.psClearSelection = function () {
        PS.marqueeSelection = null;
        clearOverlay();
    };

    function drawShapePreview(x1, y1, x2, y2) {
        if (!PS.overlayCtx) return;
        clearOverlay();
        const ctx = PS.overlayCtx;
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        const w = x2 - x1;
        const h = y2 - y1;

        if (PS.shape.type === 'rectangle') {
            ctx.strokeRect(x1, y1, w, h);
        } else if (PS.shape.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(x1 + w / 2, y1 + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (PS.shape.type === 'line' || PS.shape.type === 'arrow') {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function commitShape(x1, y1, x2, y2) {
        const ctx = PS.paintCtx;
        ctx.save();
        ctx.fillStyle = PS.shape.fill;
        ctx.strokeStyle = PS.shape.stroke;
        ctx.lineWidth = PS.shape.strokeWidth;

        const w = x2 - x1;
        const h = y2 - y1;

        if (PS.shape.type === 'rectangle') {
            ctx.fillRect(x1, y1, w, h);
            ctx.strokeRect(x1, y1, w, h);
        } else if (PS.shape.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(x1 + w / 2, y1 + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (PS.shape.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else if (PS.shape.type === 'arrow') {
            drawArrow(ctx, x1, y1, x2, y2);
        }
        ctx.restore();
        render();
    }

    function drawArrow(ctx, fromx, fromy, tox, toy) {
        const headlen = 15;
        const angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    function clearOverlay() {
        if (PS.overlayCtx) {
            PS.overlayCtx.clearRect(0, 0, PS.width, PS.height);
        }
    }

    // --- Crop Engine ---
    function getNumericCropRatio() {
        if (!PS.crop.aspectRatio || PS.crop.aspectRatio === 'free') return null;
        if (PS.crop.aspectRatio === '1:1') return 1.0;
        if (PS.crop.aspectRatio === '35:45') return 35 / 45;
        if (PS.crop.aspectRatio === '25:35') return 25 / 35;
        if (PS.crop.aspectRatio === '16:9') return 16 / 9;
        if (PS.crop.aspectRatio === '4:3') return 4 / 3;
        if (PS.crop.aspectRatio === '2:3') return 2 / 3;
        return null;
    }

    function startCropMode() {
        PS.crop.isActive = true;
        const overlay = document.getElementById('ps-crop-overlay');
        if (!overlay) return;

        // Attach double-click listener to commit crop
        if (!overlay._dblClickBound) {
            overlay._dblClickBound = true;
            overlay.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                window.psCommitCrop();
            });
        }

        // Default crop box: 80% centered
        const padX = PS.width * 0.1;
        const padY = PS.height * 0.1;
        PS.crop.x = Math.round(padX);
        PS.crop.y = Math.round(padY);
        PS.crop.width = Math.round(PS.width - padX * 2);
        PS.crop.height = Math.round(PS.height - padY * 2);

        applyCropAspectRatio();
        updateCropOverlayDom();
        overlay.style.display = 'block';
    }

    function applyCropAspectRatio() {
        const ratio = getNumericCropRatio();
        if (!ratio) return;

        PS.crop.width = Math.round(PS.crop.height * ratio);
        if (PS.crop.width > PS.width) {
            PS.crop.width = PS.width - 20;
            PS.crop.height = Math.round(PS.crop.width / ratio);
        }
    }

    function updateCropOverlayDom() {
        const overlay = document.getElementById('ps-crop-overlay');
        if (!overlay) return;
        overlay.style.left = `${PS.crop.x}px`;
        overlay.style.top = `${PS.crop.y}px`;
        overlay.style.width = `${PS.crop.width}px`;
        overlay.style.height = `${PS.crop.height}px`;
    }

    window.psSetCropRatio = function (ratio) {
        PS.crop.aspectRatio = ratio;
        applyCropAspectRatio();
        updateCropOverlayDom();
    };

    window.psCommitCrop = function () {
        if (!PS.crop.isActive || PS.crop.width <= 10 || PS.crop.height <= 10) return;

        const cw = PS.crop.width;
        const ch = PS.crop.height;
        const cx = PS.crop.x;
        const cy = PS.crop.y;

        // Crop base canvas
        const tempBase = document.createElement('canvas');
        tempBase.width = cw;
        tempBase.height = ch;
        tempBase.getContext('2d').drawImage(PS.baseCanvas, cx, cy, cw, ch, 0, 0, cw, ch);

        // Crop paint canvas
        const tempPaint = document.createElement('canvas');
        tempPaint.width = cw;
        tempPaint.height = ch;
        tempPaint.getContext('2d').drawImage(PS.paintCanvas, cx, cy, cw, ch, 0, 0, cw, ch);

        // Adjust text layer coordinates
        PS.textLayers.forEach(t => {
            t.x -= cx;
            t.y -= cy;
        });

        // Re-dimension
        PS.width = cw;
        PS.height = ch;
        [PS.mainCanvas, PS.baseCanvas, PS.paintCanvas, PS.overlayCanvas].forEach(c => {
            if (c) {
                c.width = cw;
                c.height = ch;
            }
        });

        PS.baseCtx.drawImage(tempBase, 0, 0);
        PS.paintCtx.drawImage(tempPaint, 0, 0);

        // Update sourceImage to match cropped state
        const newImg = new Image();
        newImg.onload = () => {
            PS.sourceImage = newImg;
            cancelCrop();
            fitToScreen();
            render();
            pushHistory(`Crop (${cw}x${ch})`);
            window.psSelectTool('move');
        };
        newImg.src = PS.baseCanvas.toDataURL();
    };

    window.psCancelCrop = function () {
        cancelCrop();
        window.psSelectTool('move');
    };

    function cancelCrop() {
        PS.crop.isActive = false;
        const overlay = document.getElementById('ps-crop-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // --- Passport & ID Presets ---
    window.psApplyPassportPreset = function (presetKey) {
        if (!PS.imageLoaded) {
            alert('Please open or upload a photo first.');
            return;
        }

        const presets = {
            'india-passport': { w: 413, h: 531, label: 'Indian Passport (35x45mm)' },
            'aadhaar': { w: 295, h: 413, label: 'Aadhaar / Voter (25x35mm)' },
            'pan': { w: 413, h: 413, label: 'PAN Card (35x35mm)' },
            'dl': { w: 354, h: 472, label: 'Driving Licence (30x40mm)' },
            'us-visa': { w: 600, h: 600, label: 'US Visa / Passport (2x2 inch)' },
            'uae-visa': { w: 390, h: 567, label: 'UAE Visa (33x48mm)' },
            'stamp': { w: 236, h: 295, label: 'Stamp Size (20x25mm)' }
        };

        const target = presets[presetKey];
        if (!target) return;

        // Switch to crop with specified ratio
        window.psSelectTool('crop');
        PS.crop.aspectRatio = `${target.w}:${target.h}`;
        applyCropAspectRatio();
        updateCropOverlayDom();

        const optBar = document.getElementById('ps-tool-options-bar');
        if (optBar) {
            optBar.innerHTML = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-sky-400"><i class="fa-solid fa-id-badge mr-1"></i>Preset: ${target.label}</span>
                    <span class="text-gray-400">Position crop box over face, then click commit.</span>
                    <button onclick="psCommitCrop()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition">
                        <i class="fa-solid fa-check"></i> Apply Crop
                    </button>
                    <button onclick="psCancelCrop()" class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded">
                        Cancel
                    </button>
                </div>
            `;
        }
    };

    // --- Text Layers Management ---
    window.psAddTextLayerPrompt = function () {
        const text = prompt('Enter text for photo:', 'CSC Photo Studio');
        if (!text) return;

        const newLayer = {
            id: 'text_' + Date.now(),
            text: text,
            x: Math.round(PS.width * 0.2),
            y: Math.round(PS.height * 0.2),
            fontSize: PS.text.fontSize || 36,
            fontFamily: PS.text.fontFamily || 'Inter, sans-serif',
            color: PS.text.color || '#ffffff',
            bold: PS.text.bold || false,
            italic: PS.text.italic || false,
            visible: true
        };

        PS.textLayers.push(newLayer);
        PS.activeTextId = newLayer.id;
        updateLayersList();
        render();
        pushHistory(`Add Text: "${text.slice(0, 15)}"`);
    };

    function findTextLayerAt(x, y) {
        for (let i = PS.textLayers.length - 1; i >= 0; i--) {
            const tl = PS.textLayers[i];
            const approxW = tl.text.length * (tl.fontSize * 0.6);
            const approxH = tl.fontSize * 1.2;
            if (x >= tl.x && x <= tl.x + approxW && y >= tl.y && y <= tl.y + approxH) {
                return tl;
            }
        }
        return null;
    }

    function updateLayersList() {
        const list = document.getElementById('ps-layers-list');
        if (!list) return;

        let html = '';

        // Text layers (top)
        PS.textLayers.forEach(tl => {
            const isSel = tl.id === PS.activeTextId;
            html += `
                <div class="ps-layer-item ${isSel ? 'active' : ''}" onclick="PS.activeTextId='${tl.id}'; window.psUpdateLayers();">
                    <div class="flex items-center gap-2 truncate">
                        <i class="fa-solid fa-font text-sky-400 text-xs"></i>
                        <span class="truncate font-semibold">${escapeHtml(tl.text)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button onclick="psToggleTextVisibility('${tl.id}', event)" class="text-gray-400 hover:text-white p-1 text-xs">
                            <i class="fa-solid ${tl.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button onclick="psDeleteTextLayer('${tl.id}', event)" class="text-rose-400 hover:text-rose-300 p-1 text-xs">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Paint drawing layer
        html += `
            <div class="ps-layer-item">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-paintbrush text-emerald-400 text-xs"></i>
                    <span>Drawing / Brushes</span>
                </div>
                <button onclick="psClearPaintLayer()" class="text-gray-400 hover:text-rose-400 text-xs p-1" title="Clear Paint">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
            </div>
        `;

        // Base photo layer (bottom)
        html += `
            <div class="ps-layer-item active">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-image text-amber-400 text-xs"></i>
                    <span>Background (Photo)</span>
                </div>
                <i class="fa-solid fa-lock text-gray-500 text-xs"></i>
            </div>
        `;

        list.innerHTML = html;
    }

    window.psUpdateLayers = function () {
        updateLayersList();
        render();
    };

    window.psToggleTextVisibility = function (id, e) {
        e.stopPropagation();
        const tl = PS.textLayers.find(t => t.id === id);
        if (tl) {
            tl.visible = !tl.visible;
            updateLayersList();
            render();
        }
    };

    window.psDeleteTextLayer = function (id, e) {
        e.stopPropagation();
        PS.textLayers = PS.textLayers.filter(t => t.id !== id);
        if (PS.activeTextId === id) PS.activeTextId = null;
        updateLayersList();
        render();
        pushHistory('Delete Text Layer');
    };

    window.psClearPaintLayer = function () {
        PS.paintCtx.clearRect(0, 0, PS.width, PS.height);
        render();
        pushHistory('Clear Drawing Layer');
    };

    // --- Transform Tools (Rotate / Flip) ---
    window.psRotate = function (degrees) {
        if (!PS.imageLoaded) return;

        const rad = degrees * Math.PI / 180;
        const swap = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;
        const newW = swap ? PS.height : PS.width;
        const newH = swap ? PS.width : PS.height;

        const rotateCanvas = (srcCanvas) => {
            const temp = document.createElement('canvas');
            temp.width = newW;
            temp.height = newH;
            const ctx = temp.getContext('2d');
            ctx.translate(newW / 2, newH / 2);
            ctx.rotate(rad);
            ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);
            return temp;
        };

        const newBase = rotateCanvas(PS.baseCanvas);
        const newPaint = rotateCanvas(PS.paintCanvas);

        PS.width = newW;
        PS.height = newH;
        [PS.mainCanvas, PS.baseCanvas, PS.paintCanvas, PS.overlayCanvas].forEach(c => {
            if (c) {
                c.width = newW;
                c.height = newH;
            }
        });

        PS.baseCtx.drawImage(newBase, 0, 0);
        PS.paintCtx.drawImage(newPaint, 0, 0);

        const newImg = new Image();
        newImg.onload = () => {
            PS.sourceImage = newImg;
            fitToScreen();
            render();
            pushHistory(`Rotate ${degrees}°`);
        };
        newImg.src = PS.baseCanvas.toDataURL();
    };

    window.psFlip = function (direction) {
        if (!PS.imageLoaded) return;

        const flipCanvas = (src) => {
            const temp = document.createElement('canvas');
            temp.width = PS.width;
            temp.height = PS.height;
            const ctx = temp.getContext('2d');
            ctx.save();
            if (direction === 'horizontal') {
                ctx.translate(PS.width, 0);
                ctx.scale(-1, 1);
            } else {
                ctx.translate(0, PS.height);
                ctx.scale(1, -1);
            }
            ctx.drawImage(src, 0, 0);
            ctx.restore();
            return temp;
        };

        const newBase = flipCanvas(PS.baseCanvas);
        const newPaint = flipCanvas(PS.paintCanvas);

        PS.baseCtx.clearRect(0, 0, PS.width, PS.height);
        PS.baseCtx.drawImage(newBase, 0, 0);

        PS.paintCtx.clearRect(0, 0, PS.width, PS.height);
        PS.paintCtx.drawImage(newPaint, 0, 0);

        const newImg = new Image();
        newImg.onload = () => {
            PS.sourceImage = newImg;
            render();
            pushHistory(`Flip ${direction}`);
        };
        newImg.src = PS.baseCanvas.toDataURL();
    };

    // --- Color Management ---
    window.psSetForegroundColor = function (hex) {
        PS.colors.foreground = hex;
        PS.brush.color = hex;
        updateColorSwatches();
        updateToolOptionsBar();
    };

    window.psSetBackgroundColor = function (hex) {
        PS.colors.background = hex;
        updateColorSwatches();
    };

    window.psSwapColors = function () {
        const tmp = PS.colors.foreground;
        PS.colors.foreground = PS.colors.background;
        PS.colors.background = tmp;
        PS.brush.color = PS.colors.foreground;
        updateColorSwatches();
        updateToolOptionsBar();
    };

    window.psResetDefaultColors = function () {
        PS.colors.foreground = '#ffffff';
        PS.colors.background = '#000000';
        PS.brush.color = '#ffffff';
        updateColorSwatches();
        updateToolOptionsBar();
    };

    function updateColorSwatches() {
        const fg = document.getElementById('ps-swatch-fg');
        const bg = document.getElementById('ps-swatch-bg');
        if (fg) fg.style.backgroundColor = PS.colors.foreground;
        if (bg) bg.style.backgroundColor = PS.colors.background;
    }

    // --- Zoom & Viewport ---
    function setZoom(val) {
        PS.zoom = Math.max(0.15, Math.min(val, 4.0));
        render();
        updateStatusBar();
    }

    window.psZoomIn = function () { setZoom(PS.zoom + 0.2); };
    window.psZoomOut = function () { setZoom(PS.zoom - 0.2); };
    window.psZoom100 = function () { setZoom(1.0); PS.panX = 0; PS.panY = 0; render(); };

    window.psFitToScreen = function () { fitToScreen(); };

    function fitToScreen() {
        const vp = document.getElementById('ps-canvas-viewport');
        if (!vp || !PS.width || !PS.height) return;

        const pad = 40;
        const availW = Math.max(300, vp.clientWidth - pad);
        const availH = Math.max(300, vp.clientHeight - pad);

        const scaleW = availW / PS.width;
        const scaleH = availH / PS.height;
        PS.zoom = Math.min(scaleW, scaleH, 1.0);
        PS.panX = 0;
        PS.panY = 0;
        render();
        updateStatusBar();
    }

    window.psToggleGrid = function () {
        PS.showGrid = !PS.showGrid;
        const vp = document.getElementById('ps-canvas-viewport');
        if (vp) vp.classList.toggle('ps-checkerboard', PS.showGrid);
    };

    function updateRulers() {
        const rTop = document.getElementById('ps-ruler-top');
        const rLeft = document.getElementById('ps-ruler-left');
        if (!rTop || !rLeft) return;

        // Visual ruler pixel markings
        const tickStep = 100;
        let topMarks = '';
        for (let x = 0; x <= PS.width; x += tickStep) {
            topMarks += `<span style="position: absolute; left: ${x * PS.zoom + PS.panX}px; top: 2px;">${x}</span>`;
        }
        rTop.innerHTML = topMarks;
    }

    function updateBrushCursorSize() {
        const cursor = document.getElementById('ps-brush-cursor');
        if (!cursor) return;

        let size = PS.brush.size;
        if (PS.activeTool === 'eraser') size = PS.eraser.size;
        else if (PS.activeTool === 'healer') size = PS.healer.size;
        else if (PS.activeTool === 'dodge') size = PS.dodge.size;

        const renderedSize = size * PS.zoom;
        cursor.style.width = `${renderedSize}px`;
        cursor.style.height = `${renderedSize}px`;
    }
    window.psUpdateBrushCursor = updateBrushCursorSize;

    // --- History & Undo / Redo ---
    function pushHistory(actionName) {
        // Truncate future states if we were in the middle of history
        if (PS.historyIndex < PS.history.length - 1) {
            PS.history = PS.history.slice(0, PS.historyIndex + 1);
        }

        const snapshot = {
            name: actionName,
            time: new Date().toLocaleTimeString(),
            width: PS.width,
            height: PS.height,
            baseData: PS.baseCanvas.toDataURL(),
            paintData: PS.paintCanvas.toDataURL(),
            textLayers: JSON.parse(JSON.stringify(PS.textLayers)),
            adjustments: { ...PS.adjustments }
        };

        PS.history.push(snapshot);
        if (PS.history.length > PS.maxHistory) {
            PS.history.shift();
        }
        PS.historyIndex = PS.history.length - 1;

        updateHistoryList();
    }

    window.psUndo = function () {
        if (PS.historyIndex > 0) {
            jumpToHistory(PS.historyIndex - 1);
        }
    };

    window.psRedo = function () {
        if (PS.historyIndex < PS.history.length - 1) {
            jumpToHistory(PS.historyIndex + 1);
        }
    };

    function jumpToHistory(index) {
        if (index < 0 || index >= PS.history.length) return;
        PS.historyIndex = index;
        const snap = PS.history[index];

        PS.width = snap.width;
        PS.height = snap.height;
        [PS.mainCanvas, PS.baseCanvas, PS.paintCanvas, PS.overlayCanvas].forEach(c => {
            if (c) {
                c.width = snap.width;
                c.height = snap.height;
            }
        });

        PS.textLayers = JSON.parse(JSON.stringify(snap.textLayers));
        PS.adjustments = { ...snap.adjustments };
        syncAdjustmentSliders();

        const imgBase = new Image();
        imgBase.onload = () => {
            PS.baseCtx.clearRect(0, 0, PS.width, PS.height);
            PS.baseCtx.drawImage(imgBase, 0, 0);

            const imgPaint = new Image();
            imgPaint.onload = () => {
                PS.paintCtx.clearRect(0, 0, PS.width, PS.height);
                PS.paintCtx.drawImage(imgPaint, 0, 0);
                render();
            };
            imgPaint.src = snap.paintData;
        };
        imgBase.src = snap.baseData;

        updateHistoryList();
    }

    function updateHistoryList() {
        const list = document.getElementById('ps-history-list');
        if (!list) return;

        let html = '';
        PS.history.forEach((h, idx) => {
            const isCur = idx === PS.historyIndex;
            const isUndone = idx > PS.historyIndex;
            html += `
                <div class="ps-history-item ${isCur ? 'active' : ''} ${isUndone ? 'undone' : ''}" onclick="window.psJumpHistory(${idx})">
                    <i class="fa-solid fa-clock-rotate-left text-[10px] text-sky-400"></i>
                    <span class="truncate flex-1">${escapeHtml(h.name)}</span>
                    <span class="text-[9px] text-gray-500 font-mono">${h.time}</span>
                </div>
            `;
        });
        list.innerHTML = html;
        list.scrollTop = list.scrollHeight;
    }
    window.psJumpHistory = jumpToHistory;

    // --- Export Engine ---
    window.psExport = function (format = 'png') {
        if (!PS.imageLoaded) {
            alert('No image to export.');
            return;
        }

        // Composite full resolution onto export canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = PS.width;
        exportCanvas.height = PS.height;
        const ctx = exportCanvas.getContext('2d');

        // Draw background white if jpg, transparent if png
        if (format === 'jpeg' || format === 'jpg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, PS.width, PS.height);
        }

        ctx.drawImage(PS.baseCanvas, 0, 0);
        ctx.drawImage(PS.paintCanvas, 0, 0);
        renderTextLayers(ctx);

        const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
        const quality = format === 'png' ? 1.0 : 0.95;
        const dataUrl = exportCanvas.toDataURL(mime, quality);

        // Trigger download
        const a = document.createElement('a');
        const ext = format === 'jpeg' ? 'jpg' : format;
        a.download = `${PS.imageName.replace(/\.[^/.]+$/, '')}_edited.${ext}`;
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    window.psPrint = function () {
        if (!PS.imageLoaded) {
            alert('No photo to print.');
            return;
        }

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = PS.width;
        exportCanvas.height = PS.height;
        const ctx = exportCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PS.width, PS.height);
        ctx.drawImage(PS.baseCanvas, 0, 0);
        ctx.drawImage(PS.paintCanvas, 0, 0);
        renderTextLayers(ctx);

        const printWin = window.open('', '_blank');
        if (!printWin) return;

        printWin.document.write(`
            <html>
                <head><title>Print Photo - CSC Studio</title></head>
                <body style="margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff;">
                    <img src="${exportCanvas.toDataURL('image/jpeg', 0.98)}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </body>
            </html>
        `);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 500);
    };

    // --- Drag and Drop Setup ---
    function setupDragAndDrop() {
        const dropzone = document.getElementById('ps-dropzone');
        if (!dropzone) return;

        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.add('border-sky-500', 'bg-sky-500/10');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.remove('border-sky-500', 'bg-sky-500/10');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files[0] && files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => loadImageElement(img, files[0].name);
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(files[0]);
            }
        });
    }

    // --- Keyboard Shortcuts ---
    function setupShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore when typing in inputs/textareas
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
            const modal = document.getElementById('photoStudioModal');
            if (!modal || modal.classList.contains('hidden')) return;

            const key = e.key.toLowerCase();

            if ((e.ctrlKey || e.metaKey) && key === 'z') {
                e.preventDefault();
                if (e.shiftKey) psRedo();
                else psUndo();
            } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
                e.preventDefault();
                psRedo();
            } else if ((e.ctrlKey || e.metaKey) && key === 's') {
                e.preventDefault();
                psExport('png');
            } else if ((e.ctrlKey || e.metaKey) && key === 'p') {
                e.preventDefault();
                psPrint();
            } else if ((e.ctrlKey || e.metaKey) && key === 'd') {
                e.preventDefault();
                psClearSelection();
            } else if ((e.ctrlKey || e.metaKey) && key === '0') {
                e.preventDefault();
                psFitToScreen();
            } else if ((e.ctrlKey || e.metaKey) && key === '1') {
                e.preventDefault();
                psZoom100();
            } else if (key === 'delete' || key === 'backspace') {
                if (PS.marqueeSelection && PS.marqueeSelection.active) {
                    e.preventDefault();
                    const m = PS.marqueeSelection;
                    PS.paintCtx.clearRect(m.x, m.y, m.w, m.h);
                    PS.baseCtx.clearRect(m.x, m.y, m.w, m.h);
                    syncBaseToSource();
                    render();
                    pushHistory('Clear Selection');
                } else if (PS.activeTextId) {
                    e.preventDefault();
                    window.psDeleteTextLayer(PS.activeTextId, e);
                }
            } else if (key === 'v') {
                psSelectTool('move');
            } else if (key === 'm') {
                psSelectTool('marquee');
            } else if (key === 'b') {
                psSelectTool('brush');
            } else if (key === 'e') {
                psSelectTool('eraser');
            } else if (key === 'c') {
                psSelectTool('crop');
            } else if (key === 'j') {
                psSelectTool('healer');
            } else if (key === 'g') {
                psSelectTool('bucket');
            } else if (key === 't') {
                psSelectTool('text');
            } else if (key === 'u') {
                psSelectTool('shape');
            } else if (key === 'i') {
                psSelectTool('eyedropper');
            } else if (key === 'o') {
                psSelectTool('dodge');
            } else if (key === 'h') {
                psSelectTool('hand');
            } else if (key === 'z') {
                psSelectTool('zoom');
            } else if (key === 'x') {
                psSwapColors();
            } else if (key === 'd') {
                psResetDefaultColors();
            } else if (key === '[') {
                if (PS.activeTool === 'brush') {
                    PS.brush.size = Math.max(1, PS.brush.size - 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                } else if (PS.activeTool === 'eraser') {
                    PS.eraser.size = Math.max(2, PS.eraser.size - 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                } else if (PS.activeTool === 'healer') {
                    PS.healer.size = Math.max(5, PS.healer.size - 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                }
            } else if (key === ']') {
                if (PS.activeTool === 'brush') {
                    PS.brush.size = Math.min(150, PS.brush.size + 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                } else if (PS.activeTool === 'eraser') {
                    PS.eraser.size = Math.min(200, PS.eraser.size + 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                } else if (PS.activeTool === 'healer') {
                    PS.healer.size = Math.min(100, PS.healer.size + 5);
                    updateToolOptionsBar();
                    window.psUpdateBrushCursor();
                }
            } else if (key === 'enter' && PS.crop.isActive) {
                psCommitCrop();
            } else if (key === 'escape') {
                if (PS.crop.isActive) psCancelCrop();
                else if (PS.marqueeSelection && PS.marqueeSelection.active) psClearSelection();
                else closePhotoStudioModal();
            }
        });
    }

    function updateStatusBar() {
        const dim = document.getElementById('ps-status-dim');
        if (dim) dim.textContent = `${PS.width} × ${PS.height} px`;

        const zoomDisp = document.getElementById('ps-status-zoom');
        if (zoomDisp) zoomDisp.textContent = `${Math.round(PS.zoom * 100)}%`;

        const toolDisp = document.getElementById('ps-status-tool');
        if (toolDisp) toolDisp.textContent = `Tool: ${PS.activeTool.toUpperCase()}`;
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

})();
