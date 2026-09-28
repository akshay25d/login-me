// Client routes: /customers, /pdf-tools, and other workspaces.
const dashboardPanelIds = [
    'welcome-section',
    'performance-section',
    'services-section',
    'customers-section',
    'transactions-section'
];
const dashboardSectionAliases = {
    'quick-actions-section': 'welcome-section'
};
const HASH_TO_PATH = {
    'welcome-section': '/dashboard',
    'quick-actions-section': '/dashboard',
    'performance-section': '/performance',
    'services-section': '/services',
    'customers-section': '/customers',
    'transactions-section': '/transactions'
};
const APP_ROUTES = {
    '/': { section: 'welcome-section', title: 'CSC Dashboard' },
    '/dashboard': { section: 'welcome-section', title: 'CSC Dashboard' },
    '/welcome': { section: 'welcome-section', title: 'CSC Dashboard' },
    '/services': { section: 'services-section', title: 'CSC Services' },
    '/performance': { section: 'performance-section', title: 'Performance', auth: true },
    '/customers': { section: 'customers-section', title: 'Customers' },
    '/customer': { section: 'customers-section', title: 'Customers' },
    '/customers/new': { section: 'customers-section', title: 'New customer', modal: 'addCustomerModal', opener: 'openNewCustomerModal', auth: true },
    '/transactions': { section: 'transactions-section', title: 'Transactions', auth: true },
    '/pdf-tools': { section: 'welcome-section', title: 'PDF Tools', modal: 'pdfToolsModal', opener: 'openPdfToolsModal' },
    '/passport-photo': { section: 'welcome-section', title: 'Passport Photo', modal: 'passportPhotoModal', opener: 'openPassportPhotoModal' },
    '/photo-studio': { section: 'welcome-section', title: 'Photo Studio', modal: 'photoStudioModal', opener: 'openPhotoStudioModal' },
    '/image-editor': { section: 'welcome-section', title: 'Photo & Signature', modal: 'imageEditorModal', opener: 'openImageEditorModal' },
    '/ai-chat': { section: 'welcome-section', title: 'AI Chat', modal: 'aiChatModal', opener: 'openAiChatModal' },
    '/profile': { section: 'welcome-section', title: 'Profile', modal: 'profileModal', opener: 'openProfileModal', auth: true },
    '/reports': { section: 'welcome-section', title: 'Business Report', modal: 'reportsModal', opener: 'openBusinessReport', auth: true },
    '/bill': { section: 'welcome-section', title: 'Generate Bill', modal: 'billModal', auth: true },
    '/login': { section: 'welcome-section', title: 'Login', modal: 'authModal' },
    '/notifications': { section: 'welcome-section', title: 'Notifications', modal: 'notificationModal' },
    '/about': { section: 'welcome-section', title: 'About Us', modal: 'aboutUsModal' },
    '/contact': { section: 'welcome-section', title: 'Contact Us', modal: 'contactUsModal' },
    '/privacy': { section: 'welcome-section', title: 'Privacy Policy', modal: 'privacyPolicyModal' },
    '/terms': { section: 'welcome-section', title: 'Terms & Conditions', modal: 'termsModal' }
};
const MODAL_TO_PATH = Object.fromEntries(Object.entries(APP_ROUTES).filter(([, route]) => route.modal).map(([path, route]) => [route.modal, path]));
const INFO_MODALS = ['aboutUsModal', 'contactUsModal', 'privacyPolicyModal', 'termsModal'];
const TOOL_MODALS = ['pdfToolsPagePreviewModal', 'panApplicationModal', 'passportPhotoModal', 'imageEditorModal', 'photoStudioModal', 'pdfToolsModal', 'aiChatModal', 'addCustomerModal', 'addTransactionModal', 'profileModal', 'reportsModal', 'billModal', 'authModal', 'notificationModal', ...INFO_MODALS];

const AppRouter = window.AppRouter = {
    applying: false,
    lastSectionPath: '/dashboard',
    currentPath: '/dashboard',
    usesPath() {
        return false; // Hash routes work on static hosts and in repository subdirectories.
    },
    normalize(path) {
        if (!path) return '/dashboard';
        path = String(path).split('?')[0].split('#')[0];
        if (!path.startsWith('/')) path = `/${path}`;
        path = path.replace(/\/+$/, '') || '/';
        if (path === '/') return '/dashboard';
        if (APP_ROUTES[path]) return path;
        return '/dashboard';
    },
    read() {
        const hash = location.hash.replace(/^#/, '');
        if (HASH_TO_PATH[hash]) return HASH_TO_PATH[hash];
        if (hash.startsWith('/')) return this.normalize(hash);
        if (!this.usesPath()) return '/dashboard';
        return this.normalize(location.pathname.replace(/\/index\.html$/i, '') || '/');
    },
    write(path, replace) {
        const next = this.normalize(path);
        if (this.usesPath()) {
            if (replace) history.replaceState({ path: next }, '', next);
            else history.pushState({ path: next }, '', next);
        } else {
            const hash = `#${next}`;
            if (replace) history.replaceState({ path: next }, '', hash);
            else history.pushState({ path: next }, '', hash);
        }
    },
    go(path, options = {}) {
        const next = this.normalize(path);
        if (options.replace) this.write(next, true);
        else if (this.currentPath !== next) this.write(next, false);
        this.apply(next, options);
    },
    apply(path) {
        const next = this.normalize(path);
        const route = APP_ROUTES[next] || APP_ROUTES['/dashboard'];
        this.applying = true;
        this.currentPath = next;
        if (!route.modal) this.lastSectionPath = next;
        paintDashboardSection(route.section);
        closeRoutedModals(route.modal);
        const chip = document.getElementById('current-route-chip');
        if (chip) chip.textContent = next;
        document.title = `${route.title} · Akshay Santra CSC`;
        if (route.auth && !window.isUserLoggedIn?.()) {
            window.openAuthModal?.('Please log in to open this page.');
        } else if (route.opener && typeof window[route.opener] === 'function') {
            if (route.modal === 'photoStudioModal' || route.modal === 'aiChatModal') window[route.opener]();
            else window[route.opener]({ skipRoute: true });
        } else if (route.modal === 'authModal') {
            window.openAuthModal?.();
        } else if (route.modal && INFO_MODALS.includes(route.modal)) {
            openInfoModal(route.modal);
        } else if (route.modal) {
            openModal(route.modal, { skipRoute: true });
        }
        this.applying = false;
        return true;
    },
    syncModal(id) {
        if (this.applying) return;
        const path = MODAL_TO_PATH[id];
        if (path) this.go(path);
    },
    onModalClosed(id) {
        if (this.applying) return;
        if ((id === 'authModal' && APP_ROUTES[this.currentPath]?.auth) || (MODAL_TO_PATH[id] && this.currentPath === MODAL_TO_PATH[id])) {
            const previous = this.lastSectionPath || '/dashboard';
            this.go(APP_ROUTES[previous]?.auth && !window.isUserLoggedIn?.() ? '/dashboard' : previous, { replace: true });
        }
    }
};

function paintDashboardSection(sectionId) {
    sectionId = dashboardSectionAliases[sectionId] || sectionId;
    if (!dashboardPanelIds.includes(sectionId)) return false;
    document.querySelectorAll('[data-dashboard-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== sectionId);
    });
    document.querySelectorAll('[data-dashboard-shortcut]').forEach((shortcut) => {
        const isActive = shortcut.dataset.dashboardShortcut === sectionId;
        shortcut.classList.toggle('is-active', isActive);
        if (isActive) shortcut.setAttribute('aria-current', 'page');
        else shortcut.removeAttribute('aria-current');
    });
    return true;
}

function closeRoutedModals(keepId) {
    TOOL_MODALS.forEach((id) => {
        if (id === keepId) return;
        const modal = document.getElementById(id);
        if (!modal || modal.classList.contains('hidden')) return;
        if (id === 'aiChatModal' && window.closeAiChatModal) {
            const prev = AppRouter.applying;
            AppRouter.applying = true;
            window.closeAiChatModal();
            AppRouter.applying = prev;
            return;
        }
        if (id === 'photoStudioModal' && window.closePhotoStudioModal) {
            const prev = AppRouter.applying;
            AppRouter.applying = true;
            window.closePhotoStudioModal();
            AppRouter.applying = prev;
            return;
        }
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
}

function showDashboardSection(sectionId, options = {}) {
    const requestedSectionId = sectionId;
    sectionId = dashboardSectionAliases[sectionId] || sectionId;
    if (!dashboardPanelIds.includes(sectionId)) return false;
    const path = HASH_TO_PATH[requestedSectionId] || HASH_TO_PATH[sectionId] || '/dashboard';
    AppRouter.go(path, { replace: options.updateHash === false });
    if (options.scroll !== false) {
        const scrollTargetId = dashboardSectionAliases[requestedSectionId] ? requestedSectionId : sectionId;
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return true;
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-app-route], a[href^="/"]');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const path = link.dataset.appRoute || link.getAttribute('href');
    if (!path || !APP_ROUTES[path]) return;
    event.preventDefault();
    AppRouter.go(path);
});

window.addEventListener('popstate', () => AppRouter.apply(AppRouter.read()));
window.addEventListener('hashchange', () => {
    if (!AppRouter.usesPath()) AppRouter.apply(AppRouter.read());
});
document.addEventListener('DOMContentLoaded', () => AppRouter.go(AppRouter.read(), { replace: true }));

function openModal(id, options = {}) {
    const allowedModals = [
        'passportPhotoModal',
        'imageEditorModal',
        'photoStudioModal',
        'pdfToolsModal',
        'pdfToolsPagePreviewModal',
        'authModal',
        'notificationModal',
        'aiChatModal'
    ];
    if (!allowedModals.includes(id) && !window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to access this feature.');
        return;
    }
    if (id === 'aiChatModal' && window.openAiChatModal) {
        window.openAiChatModal();
        if (!options.skipRoute) AppRouter.syncModal(id);
        return;
    }
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        if (id === 'photoStudioModal' || id === 'pdfToolsModal' || id === 'imageEditorModal' || id === 'passportPhotoModal') {
            modal.classList.add('flex');
        }
    }
    if (!options.skipRoute) AppRouter.syncModal(id);
}

function closeModal(id, options = {}) {
    if (id === 'aiChatModal' && window.closeAiChatModal) {
        window.closeAiChatModal();
        if (!options.skipRoute) AppRouter.onModalClosed(id);
        return;
    }
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (!options.skipRoute) AppRouter.onModalClosed(id);
}

function openBusinessReport(options = {}) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to view Business Reports.');
        return;
    }
    window.dashboardStore?.refreshBusinessReport?.();
    openModal('reportsModal', options);
}

function showBusinessReportPeriod(period) {
    window.dashboardStore?.setReportPeriod?.(period);
}

function scrollToServices() {
    showDashboardSection('services-section');
}

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openTool = TOOL_MODALS.find((id) => {
        const modal = document.getElementById(id);
        return modal && !modal.classList.contains('hidden');
    });
    if (!openTool) return;
    if (openTool === 'pdfToolsPagePreviewModal') closePdfToolsPagePreview();
    else if (openTool === 'pdfToolsModal') closePdfToolsModal();
    else if (openTool === 'passportPhotoModal') closePassportPhotoModal();
    else if (openTool === 'imageEditorModal') closeImageEditorModal();
    else if (openTool === 'addCustomerModal') closeCustomerModal();
    else if (openTool === 'addTransactionModal') closeTransactionModal();
    else if (openTool === 'profileModal') closeProfileModal();
    else if (INFO_MODALS.includes(openTool)) closeInfoModal(openTool);
    else closeModal(openTool);
});

// PDF tools: all files remain in the browser. PDF pages are expanded into
// individually manageable items, so one PDF can be mixed with many images.
const pdfToolsPaperSizes = {
    'a1-p': { width: 1683.78, height: 2383.94, label: 'A1 · 594 × 841 mm' },
    'a1-l': { width: 2383.94, height: 1683.78, label: 'A1 landscape · 841 × 594 mm' },
    'a2-p': { width: 1190.55, height: 1683.78, label: 'A2 · 420 × 594 mm' },
    'a2-l': { width: 1683.78, height: 1190.55, label: 'A2 landscape · 594 × 420 mm' },
    'a3-p': { width: 841.89, height: 1190.55, label: 'A3 · 297 × 420 mm' },
    'a3-l': { width: 1190.55, height: 841.89, label: 'A3 landscape · 420 × 297 mm' },
    'a4-p': { width: 595.28, height: 841.89, label: 'A4 · 210 × 297 mm' },
    'a4-l': { width: 841.89, height: 595.28, label: 'A4 landscape · 297 × 210 mm' },
    'a5-p': { width: 419.53, height: 595.28, label: 'A5 · 148 × 210 mm' },
    'a5-l': { width: 595.28, height: 419.53, label: 'A5 landscape · 210 × 148 mm' },
    'a6-p': { width: 297.64, height: 419.53, label: 'A6 · 105 × 148 mm' },
    'a6-l': { width: 419.53, height: 297.64, label: 'A6 landscape · 148 × 105 mm' },
    'letter-p': { width: 612, height: 792, label: 'Letter · 8.5 × 11 in' },
    'letter-l': { width: 792, height: 612, label: 'Letter landscape · 11 × 8.5 in' },
    'legal-p': { width: 612, height: 1008, label: 'Legal · 8.5 × 14 in' },
    'legal-l': { width: 1008, height: 612, label: 'Legal landscape · 14 × 8.5 in' },
    'tabloid-p': { width: 792, height: 1224, label: 'Tabloid · 11 × 17 in' },
    'tabloid-l': { width: 1224, height: 792, label: 'Tabloid landscape · 17 × 11 in' }
};
let pdfToolsItems = [];
const pdfToolsSources = new Map();
let pdfToolsNextId = 1;
let pdfToolsDraggedItemId = null;
let pdfToolsPreviewRevision = 0;
let pdfToolsLargePreviewToken = 0;
let pdfToolsPreviewWorkerConfigured = false;
const pdfToolsPreviewQueue = [];
let pdfToolsPreviewJobsRunning = 0;
const pdfToolsMaxPreviewJobs = 2;

function openPdfToolsModal(options = {}) {
    updatePdfToolsPaperHelp();
    renderPdfToolsList();
    openModal('pdfToolsModal', options);
}

function closePdfToolsModal() {
    closePdfToolsPagePreview();
    closeModal('pdfToolsModal');
}

function clearPdfTools() {
    pdfToolsItems = [];
    pdfToolsSources.clear();
    pdfToolsNextId = 1;
    pdfToolsPreviewRevision += 1;
    pdfToolsLargePreviewToken += 1;
    pdfToolsPreviewQueue.length = 0;
    const files = document.getElementById('pdf-tools-files');
    const folder = document.getElementById('pdf-tools-folder');
    if (files) files.value = '';
    if (folder) folder.value = '';
    setPdfToolsStatus('', 'info');
    renderPdfToolsList();
}

function pdfToolsEscapeText(value) {
    return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function pdfToolsNormaliseFileType(file) {
    const name = String(file.name || '').toLowerCase();
    const type = String(file.type || '').toLowerCase();
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpeg';
    if (type === 'image/png' || name.endsWith('.png')) return 'png';
    if (type === 'image/webp' || name.endsWith('.webp')) return 'webp';
    return '';
}

function formatPdfToolsBytes(value) {
    if (!Number.isFinite(value) || value < 1024) return `${Math.max(0, Math.round(value || 0))} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function setPdfToolsStatus(message, type = 'info') {
    const status = document.getElementById('pdf-tools-status');
    if (!status) return;
    if (!message) {
        status.textContent = '';
        status.className = 'hidden mb-3 rounded-lg px-3 py-2 text-xs';
        return;
    }
    const styles = {
        info: 'border border-violet-200 bg-violet-50 text-violet-800',
        success: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
        error: 'border border-rose-200 bg-rose-50 text-rose-800',
        loading: 'border border-amber-200 bg-amber-50 text-amber-800'
    };
    status.textContent = message;
    status.className = `mb-3 rounded-lg px-3 py-2 text-xs ${styles[type] || styles.info}`;
}

function updatePdfToolsPaperHelp() {
    const selector = document.getElementById('pdf-tools-page-size');
    const help = document.getElementById('pdf-tools-paper-help');
    if (!selector || !help) return;
    help.textContent = pdfToolsPaperSizes[selector.value]?.label || 'Selected paper size';
}

function renderPdfToolsList() {
    const list = document.getElementById('pdf-tools-page-list');
    const count = document.getElementById('pdf-tools-page-count');
    const createButton = document.getElementById('pdf-tools-create-btn');
    if (!list || !count || !createButton) return;

    createButton.disabled = pdfToolsItems.length === 0;
    if (!pdfToolsItems.length) {
        count.textContent = 'No files added yet';
        list.className = 'grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3';
        list.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500"><i class="fa-solid fa-file-circle-plus mb-2 block text-2xl text-slate-300"></i>Add files above to see page previews and arrange them.</div>';
        return;
    }

    const sourceCount = new Set(pdfToolsItems.map((item) => item.sourceId)).size;
    count.textContent = `${pdfToolsItems.length} output page${pdfToolsItems.length === 1 ? '' : 's'} from ${sourceCount} file${sourceCount === 1 ? '' : 's'}`;
    list.className = 'grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3';
    list.innerHTML = pdfToolsItems.map((item, index) => {
        const isPdf = item.kind === 'pdf';
        const detail = isPdf ? `PDF · page ${item.pageIndex + 1} of ${item.pageCount}` : `${item.kind.toUpperCase()} image · ${formatPdfToolsBytes(item.byteLength)}`;
        const preview = item.previewUrl
            ? `<img src="${item.previewUrl}" alt="Preview of ${pdfToolsEscapeText(item.fileName)}" class="h-full w-full object-contain">`
            : item.previewError
                ? `<div class="flex h-full flex-col items-center justify-center gap-1 text-slate-400"><i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-image'} text-2xl"></i><span class="text-[10px]">Preview unavailable</span></div>`
                : `<div class="flex h-full flex-col items-center justify-center gap-2 text-violet-500"><i class="fa-solid fa-spinner fa-spin text-lg"></i><span class="text-[10px]">Loading preview…</span></div>`;
        return `<article id="pdf-tools-page-${item.id}" draggable="true" ondragstart="pdfToolsItemDragStart(event, ${item.id})" ondragenter="pdfToolsItemDragEnter(event, ${item.id})" ondragover="pdfToolsItemDragOver(event, ${item.id})" ondragleave="pdfToolsItemDragLeave(event, ${item.id})" ondrop="pdfToolsItemDrop(event, ${item.id})" ondragend="pdfToolsItemDragEnd(event)" class="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
            <div class="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                <span class="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-extrabold text-white shadow-sm" title="Output position">${index + 1}</span>
                <span class="flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-slate-900/75 text-[10px] text-white shadow-sm" title="Drag to change position"><i class="fa-solid fa-grip-vertical"></i></span>
            </div>
            <div class="h-36 overflow-hidden border-b border-slate-100 bg-slate-100 p-2">${preview}</div>
            <div class="p-2.5">
                <div class="truncate text-xs font-bold text-slate-800" title="${pdfToolsEscapeText(item.fileName)}">${pdfToolsEscapeText(item.fileName)}</div>
                <div class="mt-0.5 truncate text-[10px] text-slate-500">${detail}${item.rotation ? ` · rotated ${item.rotation}°` : ''}</div>
                <div class="mt-2 flex items-center gap-1">
                    <button type="button" onclick="openPdfToolsPagePreview(${item.id})" class="flex-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100" title="Open large preview"><i class="fa-regular fa-eye mr-1"></i>Preview</button>
                    <button type="button" onclick="movePdfToolsItem(${item.id}, -1)" ${index === 0 ? 'disabled' : ''} class="h-7 w-7 rounded border border-slate-200 text-[10px] text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
                    <button type="button" onclick="movePdfToolsItem(${item.id}, 1)" ${index === pdfToolsItems.length - 1 ? 'disabled' : ''} class="h-7 w-7 rounded border border-slate-200 text-[10px] text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
                    <button type="button" onclick="rotatePdfToolsItem(${item.id})" class="h-7 w-7 rounded border border-slate-200 text-[10px] text-slate-600 transition hover:bg-amber-50 hover:text-amber-700" title="Rotate 90 degrees"><i class="fa-solid fa-rotate-right"></i></button>
                    <button type="button" onclick="removePdfToolsItem(${item.id})" class="h-7 w-7 rounded border border-rose-200 text-[10px] text-rose-600 transition hover:bg-rose-50" title="Remove page"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
        </article>`;
    }).join('');
    hydratePdfToolsPreviews();
}

function configurePdfToolsPreviewWorker() {
    if (!window.pdfjsLib) return false;
    if (!pdfToolsPreviewWorkerConfigured) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfToolsPreviewWorkerConfigured = true;
    }
    return true;
}

async function createPdfToolsPreview(item, maximumSide = 210, jpegQuality = 0.76) {
    const source = pdfToolsSources.get(item.sourceId);
    if (!source) throw new Error('Source file is missing.');
    if (item.kind === 'pdf') {
        if (!configurePdfToolsPreviewWorker()) throw new Error('PDF preview engine did not load.');
        const loadingTask = window.pdfjsLib.getDocument({ data: source.bytes.slice(), isEvalSupported: false });
        const documentProxy = await loadingTask.promise;
        try {
            const sourcePage = await documentProxy.getPage(item.pageIndex + 1);
            const baseViewport = sourcePage.getViewport({ scale: 1, rotation: item.rotation });
            const scale = Math.min(maximumSide / baseViewport.width, maximumSide / baseViewport.height, 2);
            const viewport = sourcePage.getViewport({ scale: Math.max(scale, 0.12), rotation: item.rotation });
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext('2d', { alpha: false });
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await sourcePage.render({ canvasContext: context, viewport }).promise;
            return canvas.toDataURL('image/jpeg', jpegQuality);
        } finally {
            await documentProxy.destroy();
        }
    }

    const image = await pdfToolsLoadImage(source);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(maximumSide / sourceWidth, maximumSide / sourceHeight, 2);
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = Math.max(1, Math.round(sourceWidth * Math.max(scale, 0.12)));
    imageCanvas.height = Math.max(1, Math.round(sourceHeight * Math.max(scale, 0.12)));
    const imageContext = imageCanvas.getContext('2d', { alpha: false });
    imageContext.fillStyle = '#ffffff';
    imageContext.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
    if (!item.rotation) return imageCanvas.toDataURL('image/jpeg', jpegQuality);

    const sideways = item.rotation % 180 !== 0;
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = sideways ? imageCanvas.height : imageCanvas.width;
    rotatedCanvas.height = sideways ? imageCanvas.width : imageCanvas.height;
    const rotatedContext = rotatedCanvas.getContext('2d', { alpha: false });
    rotatedContext.fillStyle = '#ffffff';
    rotatedContext.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
    rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotatedContext.rotate((item.rotation * Math.PI) / 180);
    rotatedContext.drawImage(imageCanvas, -imageCanvas.width / 2, -imageCanvas.height / 2);
    return rotatedCanvas.toDataURL('image/jpeg', jpegQuality);
}

function hydratePdfToolsPreviews() {
    const revision = pdfToolsPreviewRevision;
    pdfToolsItems.forEach((item) => {
        if (item.previewUrl || item.previewLoading || item.previewError) return;
        item.previewLoading = true;
        const generation = item.previewGeneration || 0;
        pdfToolsPreviewQueue.push({ id: item.id, revision, generation });
    });
    processPdfToolsPreviewQueue();
}

function processPdfToolsPreviewQueue() {
    while (pdfToolsPreviewJobsRunning < pdfToolsMaxPreviewJobs && pdfToolsPreviewQueue.length) {
        const job = pdfToolsPreviewQueue.shift();
        const item = pdfToolsItems.find((entry) => entry.id === job.id);
        if (!item || job.revision !== pdfToolsPreviewRevision || (item.previewGeneration || 0) !== job.generation || !item.previewLoading) continue;
        pdfToolsPreviewJobsRunning += 1;
        createPdfToolsPreview(item).then((previewUrl) => {
            const liveItem = pdfToolsItems.find((entry) => entry.id === job.id);
            if (!liveItem || job.revision !== pdfToolsPreviewRevision || (liveItem.previewGeneration || 0) !== job.generation) return;
            liveItem.previewUrl = previewUrl;
            liveItem.previewLoading = false;
            renderPdfToolsList();
        }).catch((error) => {
            console.warn('Could not render PDF page preview:', item.fileName, error);
            const liveItem = pdfToolsItems.find((entry) => entry.id === job.id);
            if (!liveItem || job.revision !== pdfToolsPreviewRevision || (liveItem.previewGeneration || 0) !== job.generation) return;
            liveItem.previewError = true;
            liveItem.previewLoading = false;
            renderPdfToolsList();
        }).finally(() => {
            pdfToolsPreviewJobsRunning -= 1;
            processPdfToolsPreviewQueue();
        });
    }
}

async function openPdfToolsPagePreview(id) {
    const item = pdfToolsItems.find((entry) => entry.id === id);
    if (!item) return;
    const title = document.getElementById('pdf-tools-preview-title');
    const detail = document.getElementById('pdf-tools-preview-detail');
    const image = document.getElementById('pdf-tools-preview-image');
    const loading = document.getElementById('pdf-tools-preview-loading');
    const index = pdfToolsItems.findIndex((entry) => entry.id === id);
    const sourceDetail = item.kind === 'pdf' ? `PDF page ${item.pageIndex + 1} of ${item.pageCount}` : `${item.kind.toUpperCase()} image`;
    title.textContent = `Output #${index + 1} - ${item.fileName}`;
    detail.textContent = `${sourceDetail}${item.rotation ? ` · rotated ${item.rotation}°` : ''}`;
    image.classList.add('hidden');
    image.removeAttribute('src');
    loading.classList.remove('hidden');
    openModal('pdfToolsPagePreviewModal');
    const token = ++pdfToolsLargePreviewToken;
    try {
        const previewUrl = await createPdfToolsPreview(item, 1200, 0.92);
        if (token !== pdfToolsLargePreviewToken) return;
        image.src = previewUrl;
        image.classList.remove('hidden');
        loading.classList.add('hidden');
    } catch (error) {
        if (token !== pdfToolsLargePreviewToken) return;
        loading.innerHTML = '<span class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Preview could not be rendered for this page.</span>';
        console.warn('Could not open large PDF preview:', error);
    }
}

function closePdfToolsPagePreview() {
    pdfToolsLargePreviewToken += 1;
    closeModal('pdfToolsPagePreviewModal');
}

function pdfToolsItemDragStart(event, id) {
    pdfToolsDraggedItemId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(id));
    event.currentTarget.classList.add('opacity-50', 'scale-[0.98]');
}

function pdfToolsItemDragEnter(event, id) {
    if (id === pdfToolsDraggedItemId) return;
    event.preventDefault();
    event.currentTarget.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
}

function pdfToolsItemDragOver(event, id) {
    if (id === pdfToolsDraggedItemId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function pdfToolsItemDragLeave(event) {
    event.currentTarget.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
}

function pdfToolsItemDrop(event, targetId) {
    event.preventDefault();
    event.currentTarget.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
    const draggedId = Number(event.dataTransfer.getData('text/plain')) || pdfToolsDraggedItemId;
    if (!draggedId || draggedId === targetId) return;
    const sourceIndex = pdfToolsItems.findIndex((item) => item.id === draggedId);
    if (sourceIndex < 0) return;
    const [movedItem] = pdfToolsItems.splice(sourceIndex, 1);
    const targetIndex = pdfToolsItems.findIndex((item) => item.id === targetId);
    pdfToolsItems.splice(Math.max(0, targetIndex), 0, movedItem);
    pdfToolsDraggedItemId = null;
    renderPdfToolsList();
}

function pdfToolsItemDragEnd(event) {
    pdfToolsDraggedItemId = null;
    event.currentTarget.classList.remove('opacity-50', 'scale-[0.98]');
    document.querySelectorAll('#pdf-tools-page-list article').forEach((card) => card.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2'));
}

function movePdfToolsItem(id, direction) {
    const index = pdfToolsItems.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= pdfToolsItems.length) return;
    [pdfToolsItems[index], pdfToolsItems[target]] = [pdfToolsItems[target], pdfToolsItems[index]];
    renderPdfToolsList();
}

function rotatePdfToolsItem(id) {
    const item = pdfToolsItems.find((entry) => entry.id === id);
    if (!item) return;
    item.rotation = (item.rotation + 90) % 360;
    item.previewUrl = '';
    item.previewError = false;
    item.previewLoading = false;
    item.previewGeneration = (item.previewGeneration || 0) + 1;
    renderPdfToolsList();
}

function rotateAllPdfToolsItems() {
    if (!pdfToolsItems.length) return;
    pdfToolsItems.forEach((item) => {
        item.rotation = (item.rotation + 90) % 360;
        item.previewUrl = '';
        item.previewError = false;
        item.previewLoading = false;
        item.previewGeneration = (item.previewGeneration || 0) + 1;
    });
    renderPdfToolsList();
    setPdfToolsStatus('All pages rotated by 90°.', 'info');
}

function reversePdfToolsItems() {
    if (pdfToolsItems.length < 2) return;
    pdfToolsItems.reverse();
    renderPdfToolsList();
    setPdfToolsStatus('Page order reversed.', 'info');
}

function removePdfToolsItem(id) {
    const removed = pdfToolsItems.find((item) => item.id === id);
    pdfToolsItems = pdfToolsItems.filter((item) => item.id !== id);
    if (removed && !pdfToolsItems.some((item) => item.sourceId === removed.sourceId)) pdfToolsSources.delete(removed.sourceId);
    renderPdfToolsList();
}

function pdfToolsDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-rose-500', 'bg-rose-50');
}

function pdfToolsDragLeave(event) {
    event.currentTarget.classList.remove('border-rose-500', 'bg-rose-50');
}

function pdfToolsDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-rose-500', 'bg-rose-50');
    addPdfToolsFiles(Array.from(event.dataTransfer?.files || []));
}

function pdfToolsFilesSelected(event) {
    addPdfToolsFiles(Array.from(event.target.files || []));
    event.target.value = '';
}

async function addPdfToolsFiles(files) {
    const accepted = files.filter((file) => pdfToolsNormaliseFileType(file));
    const rejected = files.length - accepted.length;
    if (!accepted.length) {
        setPdfToolsStatus('Choose PDF, JPG, JPEG, PNG, or WEBP files.', 'error');
        return;
    }
    try { await ensurePdfLibraries(); } catch (error) {
        alert(error.message);
        return;
    }
    if (!window.PDFLib) {
        setPdfToolsStatus('PDF engine did not load. Check your internet connection and refresh the page.', 'error');
        return;
    }

    setPdfToolsStatus(`Reading ${accepted.length} file${accepted.length === 1 ? '' : 's'}…`, 'loading');
    let addedPages = 0;
    const issues = [];
    for (const file of accepted) {
        const kind = pdfToolsNormaliseFileType(file);
        const sourceId = `pdf-source-${Date.now()}-${pdfToolsNextId}`;
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (kind === 'pdf') {
                const source = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
                const pageCount = source.getPageCount();
                if (!pageCount) throw new Error('The PDF has no pages.');
                pdfToolsSources.set(sourceId, { kind, bytes, fileName: file.name, pageCount });
                for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
                    pdfToolsItems.push({ id: pdfToolsNextId++, sourceId, kind, fileName: file.name, pageIndex, pageCount, rotation: 0, byteLength: file.size });
                    addedPages += 1;
                }
            } else {
                pdfToolsSources.set(sourceId, { kind, bytes, fileName: file.name, mimeType: file.type });
                pdfToolsItems.push({ id: pdfToolsNextId++, sourceId, kind, fileName: file.name, pageIndex: 0, pageCount: 1, rotation: 0, byteLength: file.size });
                addedPages += 1;
            }
        } catch (error) {
            console.warn('Could not add PDF tool file:', file.name, error);
            issues.push(file.name);
        }
    }
    renderPdfToolsList();
    const issueText = issues.length ? ` Could not read: ${issues.slice(0, 2).join(', ')}${issues.length > 2 ? ` and ${issues.length - 2} more` : ''}.` : '';
    const rejectedText = rejected ? ` ${rejected} unsupported file${rejected === 1 ? ' was' : 's were'} skipped.` : '';
    setPdfToolsStatus(`${addedPages} page${addedPages === 1 ? '' : 's'} added.${rejectedText}${issueText}`, issues.length ? 'info' : 'success');
}

function getPdfToolsPaperSize() {
    const key = document.getElementById('pdf-tools-page-size')?.value || 'a4-p';
    return pdfToolsPaperSizes[key] || pdfToolsPaperSizes['a4-p'];
}

function fitPdfToolsBox(sourceWidth, sourceHeight, targetWidth, targetHeight, margin) {
    const availableWidth = Math.max(1, targetWidth - margin * 2);
    const availableHeight = Math.max(1, targetHeight - margin * 2);
    const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return { width, height, x: (targetWidth - width) / 2, y: (targetHeight - height) / 2 };
}

function pdfToolsDataUrlToBytes(dataUrl) {
    const raw = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
    return bytes;
}

function pdfToolsLoadImage(source) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([source.bytes], { type: source.mimeType || `image/${source.kind}` });
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('The image could not be opened.'));
        };
        image.src = url;
    });
}

async function pdfToolsEmbedImage(output, source, qualityProfile) {
    if (qualityProfile === 'original' && source.kind === 'jpeg') return output.embedJpg(source.bytes);
    if (qualityProfile === 'original' && source.kind === 'png') return output.embedPng(source.bytes);

    const profiles = {
        compact: { quality: 0.60, maxSide: 1800 },
        balanced: { quality: 0.82, maxSide: 2600 },
        high: { quality: 0.94, maxSide: 4200 },
        original: { quality: 0.98, maxSide: 6000 }
    };
    const profile = profiles[qualityProfile] || profiles.balanced;
    const image = await pdfToolsLoadImage(source);
    const scale = Math.min(1, profile.maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return output.embedJpg(pdfToolsDataUrlToBytes(canvas.toDataURL('image/jpeg', profile.quality)));
}

function addPdfToolsStamp(page, text, position, font) {
    if (!text) return;
    const { width, height } = page.getSize();
    const size = Math.min(14, Math.max(8, Math.round(Math.min(width, height) / 48)));
    const padding = Math.max(16, size * 1.4);
    const textWidth = font.widthOfTextAtSize(text, size);
    let x = width - textWidth - padding;
    let y = padding;
    if (position === 'bottom-left') x = padding;
    if (position === 'top-right') y = height - size - padding;
    if (position === 'top-left') { x = padding; y = height - size - padding; }
    if (position === 'center') { x = (width - textWidth) / 2; y = (height - size) / 2; }
    page.drawText(text, { x, y, size, font, color: PDFLib.rgb(0.20, 0.23, 0.30), opacity: 0.68 });
}

async function createPdfFromTools() {
    if (!pdfToolsItems.length) return;
    try { await ensurePdfLibraries(); } catch (error) {
        alert(error.message);
        return;
    }
    if (!window.PDFLib) {
        setPdfToolsStatus('PDF engine did not load. Refresh the page and try again.', 'error');
        return;
    }
    const button = document.getElementById('pdf-tools-create-btn');
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Creating PDF…';
    setPdfToolsStatus(`Creating ${pdfToolsItems.length}-page PDF. Please keep this window open…`, 'loading');

    try {
        const output = await PDFLib.PDFDocument.create();
        const paper = getPdfToolsPaperSize();
        const margin = Number(document.getElementById('pdf-tools-margin')?.value || 0);
        const fitPdfs = Boolean(document.getElementById('pdf-tools-fit-pdf')?.checked);
        const qualityProfile = document.getElementById('pdf-tools-image-quality')?.value || 'balanced';
        const stampText = String(document.getElementById('pdf-tools-stamp-text')?.value || '').trim();
        const stampPosition = document.getElementById('pdf-tools-stamp-position')?.value || 'bottom-right';
        const stampFont = stampText ? await output.embedFont(PDFLib.StandardFonts.Helvetica) : null;
        const loadedPdfs = new Map();

        for (let index = 0; index < pdfToolsItems.length; index += 1) {
            const item = pdfToolsItems[index];
            const source = pdfToolsSources.get(item.sourceId);
            if (!source) throw new Error(`Source file is missing for ${item.fileName}.`);
            let page;
            if (item.kind === 'pdf') {
                if (!loadedPdfs.has(item.sourceId)) loadedPdfs.set(item.sourceId, await PDFLib.PDFDocument.load(source.bytes, { ignoreEncryption: true }));
                const sourcePdf = loadedPdfs.get(item.sourceId);
                if (!fitPdfs) {
                    const [copiedPage] = await output.copyPages(sourcePdf, [item.pageIndex]);
                    page = output.addPage(copiedPage);
                } else {
                    page = output.addPage([paper.width, paper.height]);
                    // Blank PDF pages may omit Contents; they still belong in the output.
                    if (sourcePdf.getPage(item.pageIndex).node.Contents()) {
                        const [embeddedPage] = await output.embedPdf(sourcePdf, [item.pageIndex]);
                        const rotation = ((sourcePdf.getPage(item.pageIndex).getRotation().angle % 360) + 360) % 360;
                        const sideways = rotation === 90 || rotation === 270;
                        const fitted = fitPdfToolsBox(sideways ? embeddedPage.height : embeddedPage.width,
                            sideways ? embeddedPage.width : embeddedPage.height, paper.width, paper.height, margin);
                        page.drawPage(embeddedPage, {
                            x: fitted.x + (rotation === 180 || rotation === 270 ? fitted.width : 0),
                            y: fitted.y + (rotation === 90 || rotation === 180 ? fitted.height : 0),
                            width: sideways ? fitted.height : fitted.width,
                            height: sideways ? fitted.width : fitted.height,
                            rotate: PDFLib.degrees(-rotation)
                        });
                    }
                }
            } else {
                const image = await pdfToolsEmbedImage(output, source, qualityProfile);
                page = output.addPage([paper.width, paper.height]);
                const fitted = fitPdfToolsBox(image.width, image.height, paper.width, paper.height, margin);
                page.drawImage(image, fitted);
            }
            if (item.rotation) page.setRotation(PDFLib.degrees((page.getRotation().angle + item.rotation) % 360));
            if (stampFont) addPdfToolsStamp(page, stampText, stampPosition, stampFont);
            setPdfToolsStatus(`Creating page ${index + 1} of ${pdfToolsItems.length}…`, 'loading');
        }

        const pdfBytes = await output.save({ useObjectStreams: true });
        const enteredName = String(document.getElementById('pdf-tools-output-name')?.value || 'merged-document').trim();
        const safeName = (enteredName || 'merged-document').replace(/[\\/:*?"<>|]+/g, '-').replace(/\.pdf$/i, '') || 'merged-document';
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const download = document.createElement('a');
        download.href = url;
        download.download = `${safeName}.pdf`;
        document.body.appendChild(download);
        download.click();
        download.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        setPdfToolsStatus(`PDF downloaded successfully - ${pdfToolsItems.length} page${pdfToolsItems.length === 1 ? '' : 's'}, ${formatPdfToolsBytes(blob.size)}.`, 'success');
    } catch (error) {
        console.error('PDF creation failed:', error);
        setPdfToolsStatus(`Could not create this PDF: ${error.message || 'Please check the selected files and try again.'}`, 'error');
    } finally {
        button.disabled = pdfToolsItems.length === 0;
        button.innerHTML = originalLabel;
    }
}

const imageEditorDefaults = {
    view: { crop: 100, zoom: 100, panX: 0, panY: 0 },
    filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0 },
    output: { width: 600, height: 400 },
    format: 'png'
};
const imageEditorFramePresets = {
    photo: [
        { id: 'india-passport', name: 'Indian Passport', detail: '35 × 45 mm', width: 413, height: 531 },
        { id: 'visa-2x2', name: 'Visa / US Passport', detail: '2 × 2 inch', width: 600, height: 600 },
        { id: 'pan-photo', name: 'PAN Card Photo', detail: '213 × 213 px', width: 213, height: 213 },
        { id: 'aadhaar-photo', name: 'Aadhaar / Voter', detail: '25 × 35 mm', width: 295, height: 413 },
        { id: 'exam-photo', name: 'Exam / SSC Photo', detail: '200 × 230 px', width: 200, height: 230 },
        { id: 'id-square', name: 'Square ID Photo', detail: '300 × 300 px', width: 300, height: 300 }
    ],
    signature: [
        { id: 'exam-signature', name: 'Exam / SSC Sign', detail: '140 × 60 px', width: 140, height: 60 },
        { id: 'upsc-signature', name: 'UPSC / Bank Sign', detail: '350 × 100 px', width: 350, height: 100 },
        { id: 'pan-signature', name: 'PAN Card Sign', detail: '360 × 180 px', width: 360, height: 180 },
        { id: 'railway-signature', name: 'Railway Sign', detail: '300 × 100 px', width: 300, height: 100 },
        { id: 'form-signature', name: 'Form Standard Sign', detail: '600 × 200 px', width: 600, height: 200 }
    ]
};
const imageEditorDrafts = {
    photo: createImageEditorDraft(600, 400),
    signature: createImageEditorDraft(600, 200)
};
let imageEditorActiveType = 'photo';
const imageEditorStepByType = { photo: 0, signature: 0 };
const imageEditorStepDetails = [
    { short: 'Frame', photo: 'Suggested standard photo frame', signature: 'Suggested standard signature frame' },
    { short: 'Crop', photo: 'Photo crop, zoom & move', signature: 'Signature crop, zoom & move' },
    { short: 'Filter', photo: 'Photo filters', signature: 'Signature filters' },
    { short: 'Output', photo: 'Photo output size & format', signature: 'Signature output size & format' }
];

function createImageEditorDraft(width, height) {
    return {
        image: null,
        fileName: '',
        isEditing: false,
        view: { ...imageEditorDefaults.view },
        framePresetId: 'custom',
        filters: { ...imageEditorDefaults.filters },
        output: { width, height },
        format: imageEditorDefaults.format,
        targetFileSizeKb: null,
        resultBlob: null,
        resultUrl: ''
    };
}

function activeImageEditorDraft() {
    return imageEditorDrafts[imageEditorActiveType];
}

function imageEditorElement(id) {
    return document.getElementById(id);
}

function updateImageEditorStatus(message = '', tone = 'info') {
    const status = imageEditorElement('image-editor-status');
    if (!status) return;
    if (!message) {
        status.textContent = '';
        status.className = 'hidden rounded-lg px-3 py-2 text-xs';
        return;
    }
    const styles = {
        error: 'bg-rose-50 text-rose-700 border border-rose-200',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        info: 'bg-cyan-50 text-cyan-800 border border-cyan-200'
    };
    status.textContent = message;
    status.className = `rounded-lg px-3 py-2 text-xs ${styles[tone] || styles.info}`;
}

function revokeImageEditorResult(draft) {
    if (draft.resultUrl) URL.revokeObjectURL(draft.resultUrl);
    draft.resultUrl = '';
    draft.resultBlob = null;
    if (draft === activeImageEditorDraft()) {
        imageEditorElement('image-editor-download-btn')?.classList.add('hidden');
        imageEditorElement('image-editor-download-group')?.classList.add('hidden');
    }
}

function openImageEditorModal(options = {}) {
    if (!options.skipRoute || imageEditorStepByType.photo === undefined) {
        imageEditorStepByType.photo = 0;
    }
    selectImageEditorType('photo');
    openModal('imageEditorModal', options);
}

function closeImageEditorModal() {
    closeModal('imageEditorModal');
}

function selectImageEditorType(type) {
    imageEditorActiveType = type === 'signature' ? 'signature' : 'photo';
    const isPhoto = imageEditorActiveType === 'photo';
    const photoTab = imageEditorElement('image-editor-photo-tab');
    const signatureTab = imageEditorElement('image-editor-signature-tab');
    if (photoTab) {
        photoTab.className = `rounded-lg px-3 py-2.5 text-xs font-bold transition ${isPhoto ? 'bg-cyan-600 text-white shadow-sm' : 'text-cyan-800 hover:bg-white'}`;
        photoTab.setAttribute('aria-pressed', String(isPhoto));
    }
    if (signatureTab) {
        signatureTab.className = `rounded-lg px-3 py-2.5 text-xs font-bold transition ${!isPhoto ? 'bg-cyan-600 text-white shadow-sm' : 'text-cyan-800 hover:bg-white'}`;
        signatureTab.setAttribute('aria-pressed', String(!isPhoto));
    }
    const draft = activeImageEditorDraft();
    updateImageEditorTypeCopy();
    const uploadLabel = imageEditorElement('image-editor-upload-label');
    if (uploadLabel) uploadLabel.textContent = isPhoto ? 'Photo' : 'Signature';
    const upload = imageEditorElement('image-editor-upload');
    if (upload) upload.value = '';
    const fileName = imageEditorElement('image-editor-file-name');
    if (fileName) fileName.textContent = draft.fileName || `PNG, JPG, JPEG, or WEBP · processed only in this browser`;
    const editButton = imageEditorElement('image-editor-edit-btn');
    if (editButton) editButton.disabled = !draft.image;
    imageEditorElement('image-editor-controls')?.classList.toggle('hidden', !draft.isEditing);
    setImageEditorControlValues();
    renderImageEditorFramePresets();
    setImageEditorStep(imageEditorStepByType[imageEditorActiveType]);
    renderImageEditorPreview();
    if (draft.resultBlob) {
        imageEditorElement('image-editor-download-group')?.classList.remove('hidden');
        imageEditorElement('image-editor-download-btn')?.classList.remove('hidden');
    } else {
        imageEditorElement('image-editor-download-group')?.classList.add('hidden');
        imageEditorElement('image-editor-download-btn')?.classList.add('hidden');
    }
    updateImageEditorStatus();
}

function imageEditorFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        event.target.value = '';
        updateImageEditorStatus('Please choose a PNG, JPG, JPEG, or WEBP image.', 'error');
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        event.target.value = '';
        updateImageEditorStatus('Choose an image smaller than 15 MB.', 'error');
        return;
    }

    const draft = activeImageEditorDraft();
    revokeImageEditorResult(draft);
    const reader = new FileReader();
    reader.onerror = () => updateImageEditorStatus('The image could not be read. Please try another file.', 'error');
    reader.onload = () => {
        const image = new Image();
        image.onerror = () => updateImageEditorStatus('The selected file is not a supported image.', 'error');
        image.onload = () => {
            draft.image = image;
            draft.fileName = file.name;
            draft.isEditing = false;
            draft.view = { ...imageEditorDefaults.view };
            draft.framePresetId = 'custom';
            draft.filters = { ...imageEditorDefaults.filters };
            if (imageEditorActiveType === 'signature') draft.output = { width: 600, height: 200 };
            else draft.output = { width: 600, height: 400 };
            draft.format = 'png';
            draft.targetFileSizeKb = null;
            imageEditorStepByType[imageEditorActiveType] = 0;
            imageEditorElement('image-editor-file-name').textContent = `${file.name} · ${image.naturalWidth} × ${image.naturalHeight}px`;
            imageEditorElement('image-editor-edit-btn').disabled = false;
            imageEditorElement('image-editor-controls').classList.add('hidden');
            setImageEditorControlValues();
            renderImageEditorPreview();
            updateImageEditorStatus('Image loaded. Select Edit Image to begin.', 'success');
        };
        image.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function beginImageEdit() {
    const draft = activeImageEditorDraft();
    if (!draft.image) {
        updateImageEditorStatus('Upload an image before editing.', 'error');
        return;
    }
    draft.isEditing = true;
    imageEditorElement('image-editor-controls').classList.remove('hidden');
    setImageEditorControlValues();
    renderImageEditorFramePresets();
    setImageEditorStep(imageEditorStepByType[imageEditorActiveType]);
    renderImageEditorPreview();
    updateImageEditorStatus('Choose a frame, then use crop, zoom, and move to position the photo or signature.', 'info');
}

function setImageEditorStep(step) {
    const maxStep = imageEditorStepDetails.length - 1;
    const selectedStep = Math.max(0, Math.min(maxStep, Number(step) || 0));
    const isPhoto = imageEditorActiveType === 'photo';
    imageEditorStepByType[imageEditorActiveType] = selectedStep;

    document.querySelectorAll('[data-image-editor-step-panel]').forEach((panel) => {
        panel.classList.toggle('hidden', Number(panel.dataset.imageEditorStepPanel) !== selectedStep);
    });

    imageEditorStepDetails.forEach((detail, index) => {
        const button = imageEditorElement(`image-editor-step-button-${index}`);
        if (!button) return;
        const isActive = index === selectedStep;
        button.className = `rounded-lg px-1 py-2 text-[10px] font-bold transition ${isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`;
        button.setAttribute('aria-pressed', String(isActive));
        button.innerHTML = `${index + 1}<br><span class="font-medium">${detail.short}</span>`;
    });

    const count = imageEditorElement('image-editor-step-count');
    const title = imageEditorElement('image-editor-step-title');
    const progress = imageEditorElement('image-editor-step-progress');
    const previous = imageEditorElement('image-editor-step-prev');
    const next = imageEditorElement('image-editor-step-next');
    const finalActions = imageEditorElement('image-editor-final-actions');
    const nextLabels = ['Next: Crop', 'Next: Filters', 'Next: Output'];
    if (count) count.textContent = `Step ${selectedStep + 1} of ${imageEditorStepDetails.length}`;
    if (title) title.textContent = imageEditorStepDetails[selectedStep][isPhoto ? 'photo' : 'signature'];
    if (progress) progress.style.width = `${(selectedStep + 1) / imageEditorStepDetails.length * 100}%`;
    if (previous) previous.disabled = selectedStep === 0;
    if (next) {
        next.classList.toggle('hidden', selectedStep === maxStep);
        next.disabled = selectedStep === maxStep;
        next.innerHTML = `${nextLabels[selectedStep] || 'Next'} <i class="fa-solid fa-arrow-right ml-1"></i>`;
    }
    finalActions?.classList.toggle('hidden', selectedStep !== maxStep);
}

function moveImageEditorStep(direction) {
    setImageEditorStep(imageEditorStepByType[imageEditorActiveType] + Number(direction || 0));
}

function valueFromImageEditorControl(id, fallback) {
    const value = Number(imageEditorElement(id)?.value);
    return Number.isFinite(value) ? value : fallback;
}

function clampImageEditorView(draft) {
    draft.view.crop = Math.min(100, Math.max(25, draft.view.crop));
    draft.view.zoom = Math.min(300, Math.max(100, draft.view.zoom));
    draft.view.panX = Math.min(100, Math.max(-100, draft.view.panX));
    draft.view.panY = Math.min(100, Math.max(-100, draft.view.panY));
}

function getImageEditorFramePreset(presetId, type = imageEditorActiveType) {
    return imageEditorFramePresets[type]?.find((preset) => preset.id === presetId) || null;
}

function updateImageEditorTypeCopy() {
    const isPhoto = imageEditorActiveType === 'photo';
    const frameHeading = imageEditorElement('image-editor-frame-heading');
    const positionHeading = imageEditorElement('image-editor-position-heading');
    const positionHelp = imageEditorElement('image-editor-position-help');
    const suggestedHelp = imageEditorElement('image-editor-suggested-frames-help');
    if (frameHeading) frameHeading.innerHTML = `<i class="fa-solid fa-id-card-clip mr-1 text-cyan-600"></i>Suggested standard ${isPhoto ? 'photo' : 'signature'} frames`;
    if (positionHeading) positionHeading.innerHTML = `<i class="fa-solid fa-crop-simple mr-1 text-cyan-600"></i>${isPhoto ? 'Photo' : 'Signature'} crop, zoom &amp; move`;
    if (positionHelp) positionHelp.textContent = `Use the selected frame as the crop shape, then zoom and move the ${isPhoto ? 'photo' : 'signature'} until it is positioned correctly.`;
    if (suggestedHelp) suggestedHelp.textContent = isPhoto
        ? 'Choose a commonly used photo frame, then use crop, zoom, and move to position the image.'
        : 'Choose a commonly used signature frame, then use crop, zoom, and move to position the image.';
}

function renderImageEditorFramePresets() {
    const container = imageEditorElement('image-editor-frame-presets');
    const activeFrame = imageEditorElement('image-editor-active-frame');
    const draft = activeImageEditorDraft();
    if (!container || !activeFrame) return;
    const selectedPreset = getImageEditorFramePreset(draft.framePresetId);
    container.replaceChildren();
    imageEditorFramePresets[imageEditorActiveType].forEach((preset) => {
        const isSelected = preset.id === draft.framePresetId;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `rounded-lg border px-2 py-1.5 text-left transition ${isSelected ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm' : 'border-cyan-200 bg-white text-cyan-800 hover:border-cyan-400 hover:bg-cyan-50'}`;
        button.innerHTML = `<span class="block text-[10px] font-bold leading-tight">${preset.name}</span><span class="block text-[9px] opacity-80">${preset.detail}</span>`;
        button.onclick = () => applyImageEditorFramePreset(preset.id);
        container.appendChild(button);
    });
    activeFrame.textContent = selectedPreset
        ? `Active frame: ${selectedPreset.name} · ${selectedPreset.detail}`
        : `Active frame: Custom · ${draft.output.width} × ${draft.output.height} px`;
}

function fitImageEditorFrameToOutput(draft) {
    draft.view = { ...imageEditorDefaults.view };
}

function updateImageEditorFramePresetForCustomSize(draft) {
    const preset = getImageEditorFramePreset(draft.framePresetId);
    if (preset && (draft.output.width !== preset.width || draft.output.height !== preset.height)) {
        draft.framePresetId = 'custom';
    }
}

function applyImageEditorFramePreset(presetId) {
    const preset = getImageEditorFramePreset(presetId);
    if (!preset) return;
    const draft = activeImageEditorDraft();
    draft.output = { width: preset.width, height: preset.height };
    draft.framePresetId = preset.id;
    fitImageEditorFrameToOutput(draft);
    revokeImageEditorResult(draft);
    if (draft.isEditing) {
        setImageEditorControlValues();
        renderImageEditorFramePresets();
        renderImageEditorPreview();
        updateImageEditorStatus(`${preset.name} frame applied. Use crop, zoom, and move to reposition the ${imageEditorActiveType === 'photo' ? 'photo' : 'signature'}.`, 'info');
    }
}

function setImageEditorControlValues() {
    const draft = activeImageEditorDraft();
    const values = {
        'image-editor-crop': draft.view.crop,
        'image-editor-zoom': draft.view.zoom,
        'image-editor-move-x': draft.view.panX,
        'image-editor-move-y': draft.view.panY,
        'image-editor-brightness': draft.filters.brightness,
        'image-editor-contrast': draft.filters.contrast,
        'image-editor-grayscale': draft.filters.grayscale,
        'image-editor-sepia': draft.filters.sepia,
        'image-editor-width': draft.output.width,
        'image-editor-height': draft.output.height,
        'image-editor-format': draft.format,
        'image-editor-target-size-kb': draft.targetFileSizeKb ?? ''
    };
    Object.entries(values).forEach(([id, value]) => {
        const control = imageEditorElement(id);
        if (control) control.value = value;
    });
    ['brightness', 'contrast', 'grayscale', 'sepia'].forEach((name) => {
        const label = imageEditorElement(`image-editor-${name}-value`);
        if (label) label.textContent = `${draft.filters[name]}%`;
    });
    const cropValue = imageEditorElement('image-editor-crop-value');
    const zoomValue = imageEditorElement('image-editor-zoom-value');
    const moveXValue = imageEditorElement('image-editor-move-x-value');
    const moveYValue = imageEditorElement('image-editor-move-y-value');
    if (cropValue) cropValue.textContent = `${draft.view.crop}%`;
    if (zoomValue) zoomValue.textContent = `${draft.view.zoom}%`;
    if (moveXValue) moveXValue.textContent = draft.view.panX === 0 ? 'Centre' : (draft.view.panX > 0 ? 'Right' : 'Left');
    if (moveYValue) moveYValue.textContent = draft.view.panY === 0 ? 'Centre' : (draft.view.panY > 0 ? 'Down' : 'Up');
    updateImageEditorTargetSizeHelp();
}

function updateImageEditorControls() {
    const draft = activeImageEditorDraft();
    if (!draft.isEditing) return;
    draft.view.crop = valueFromImageEditorControl('image-editor-crop', draft.view.crop);
    draft.view.zoom = valueFromImageEditorControl('image-editor-zoom', draft.view.zoom);
    draft.view.panX = valueFromImageEditorControl('image-editor-move-x', draft.view.panX);
    draft.view.panY = valueFromImageEditorControl('image-editor-move-y', draft.view.panY);
    clampImageEditorView(draft);
    draft.filters.brightness = Math.min(150, Math.max(50, valueFromImageEditorControl('image-editor-brightness', draft.filters.brightness)));
    draft.filters.contrast = Math.min(160, Math.max(50, valueFromImageEditorControl('image-editor-contrast', draft.filters.contrast)));
    draft.filters.saturation = Math.min(200, Math.max(0, valueFromImageEditorControl('image-editor-saturation', draft.filters.saturation ?? 100)));
    draft.filters.grayscale = Math.min(100, Math.max(0, valueFromImageEditorControl('image-editor-grayscale', draft.filters.grayscale)));
    draft.filters.sepia = Math.min(100, Math.max(0, valueFromImageEditorControl('image-editor-sepia', draft.filters.sepia)));
    draft.output.width = Math.min(4000, Math.max(1, Math.round(valueFromImageEditorControl('image-editor-width', draft.output.width))));
    draft.output.height = Math.min(4000, Math.max(1, Math.round(valueFromImageEditorControl('image-editor-height', draft.output.height))));
    draft.format = imageEditorElement('image-editor-format')?.value || draft.format;
    const targetFileSizeControl = imageEditorElement('image-editor-target-size-kb');
    const targetFileSizeValue = Number(targetFileSizeControl?.value);
    draft.targetFileSizeKb = targetFileSizeControl?.value === '' || !Number.isFinite(targetFileSizeValue)
        ? null
        : Math.min(10240, Math.max(1, Math.round(targetFileSizeValue)));
    updateImageEditorFramePresetForCustomSize(draft);
    revokeImageEditorResult(draft);
    setImageEditorControlValues();
    renderImageEditorFramePresets();
    renderImageEditorPreview();
}

function setImageEditorSize(width, height) {
    const draft = activeImageEditorDraft();
    draft.output = { width, height };
    updateImageEditorFramePresetForCustomSize(draft);
    if (draft.isEditing) {
        revokeImageEditorResult(draft);
        setImageEditorControlValues();
        renderImageEditorFramePresets();
        renderImageEditorPreview();
    }
}

function setImageEditorOriginalSize() {
    const draft = activeImageEditorDraft();
    if (!draft.image) return;
    draft.output = {
        width: Math.min(4000, draft.image.naturalWidth),
        height: Math.min(4000, draft.image.naturalHeight)
    };
    updateImageEditorFramePresetForCustomSize(draft);
    if (draft.isEditing) {
        revokeImageEditorResult(draft);
        setImageEditorControlValues();
        renderImageEditorFramePresets();
        renderImageEditorPreview();
    }
}

function resetImageEditorCropAndPosition() {
    const draft = activeImageEditorDraft();
    draft.view = { ...imageEditorDefaults.view };
    if (draft.isEditing) {
        revokeImageEditorResult(draft);
        setImageEditorControlValues();
        renderImageEditorPreview();
    }
}

// Retained for compatibility with any saved page markup that still calls the old handler.
function resetImageEditorCrop() {
    resetImageEditorCropAndPosition();
}

function getImageEditorSourceRect(draft) {
    const imageWidth = draft.image.naturalWidth;
    const imageHeight = draft.image.naturalHeight;
    const imageRatio = imageWidth / imageHeight;
    const frameRatio = draft.output.width / draft.output.height;
    let baseWidth;
    let baseHeight;
    if (imageRatio > frameRatio) {
        baseHeight = imageHeight;
        baseWidth = imageHeight * frameRatio;
    } else {
        baseWidth = imageWidth;
        baseHeight = imageWidth / frameRatio;
    }
    const selectionScale = (draft.view.crop / 100) / (draft.view.zoom / 100);
    const sourceWidth = Math.max(1, baseWidth * selectionScale);
    const sourceHeight = Math.max(1, baseHeight * selectionScale);
    const availableX = Math.max(0, imageWidth - sourceWidth);
    const availableY = Math.max(0, imageHeight - sourceHeight);
    const sourceX = availableX / 2 + availableX / 2 * (draft.view.panX / 100);
    const sourceY = availableY / 2 + availableY / 2 * (draft.view.panY / 100);
    return { sourceX, sourceY, sourceWidth, sourceHeight };
}

function renderImageEditorPreview() {
    const draft = activeImageEditorDraft();
    const canvas = imageEditorElement('image-editor-canvas');
    const emptyPreview = imageEditorElement('image-editor-empty-preview');
    const previewNote = imageEditorElement('image-editor-preview-note');
    if (!canvas || !emptyPreview || !previewNote) return;
    if (!draft.image || !draft.isEditing) {
        canvas.classList.add('hidden');
        emptyPreview.classList.remove('hidden');
        previewNote.classList.add('hidden');
        return;
    }
    canvas.width = draft.output.width;
    canvas.height = draft.output.height;
    const context = canvas.getContext('2d');
    const { sourceX, sourceY, sourceWidth, sourceHeight } = getImageEditorSourceRect(draft);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const saturationVal = draft.filters.saturation ?? 100;
    context.filter = `brightness(${draft.filters.brightness}%) contrast(${draft.filters.contrast}%) saturate(${saturationVal}%) grayscale(${draft.filters.grayscale}%) sepia(${draft.filters.sepia}%)`;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(draft.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    context.filter = 'none';
    canvas.classList.remove('hidden');
    emptyPreview.classList.add('hidden');
    previewNote.classList.remove('hidden');
}

function updateImageEditorTargetSizeHelp() {
    const help = imageEditorElement('image-editor-target-size-help');
    const draft = activeImageEditorDraft();
    if (!help) return;
    if (!draft.targetFileSizeKb) {
        help.textContent = 'Optional. Type 30, 50, or another target. JPEG gives the closest possible file size; PNG stays lossless.';
        return;
    }
    help.textContent = draft.format === 'png'
        ? `Target: ${draft.targetFileSizeKb} KB. PNG is lossless, so its final size cannot be precisely compressed to a target.`
        : `Target: ${draft.targetFileSizeKb} KB. The editor will use the closest possible JPEG quality without crossing the target when possible.`;
}

function canvasToImageEditorBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

async function createImageEditorResultBlob(canvas, draft) {
    const mimeType = draft.format === 'png' ? 'image/png' : 'image/jpeg';
    const targetBytes = draft.targetFileSizeKb ? draft.targetFileSizeKb * 1024 : null;
    if (!targetBytes) {
        return { blob: await canvasToImageEditorBlob(canvas, mimeType, 0.92), result: 'normal' };
    }
    if (mimeType === 'image/png') {
        return { blob: await canvasToImageEditorBlob(canvas, mimeType), result: 'png' };
    }

    const lowestQualityBlob = await canvasToImageEditorBlob(canvas, mimeType, 0.05);
    if (!lowestQualityBlob) return { blob: null, result: 'error' };
    if (lowestQualityBlob.size > targetBytes) return { blob: lowestQualityBlob, result: 'minimum-above-target' };

    const highestQualityBlob = await canvasToImageEditorBlob(canvas, mimeType, 0.98);
    if (!highestQualityBlob) return { blob: null, result: 'error' };
    if (highestQualityBlob.size <= targetBytes) return { blob: highestQualityBlob, result: 'below-target-at-maximum-quality' };

    let bestBlob = lowestQualityBlob;
    let low = 0.05;
    let high = 0.98;
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const quality = (low + high) / 2;
        const blob = await canvasToImageEditorBlob(canvas, mimeType, quality);
        if (!blob) continue;
        if (blob.size <= targetBytes) {
            bestBlob = blob;
            low = quality;
        } else {
            high = quality;
        }
    }
    return { blob: bestBlob, result: 'targeted' };
}

function imageEditorResultStatusMessage(draft, result, blob) {
    const actualSize = `${(blob.size / 1024).toFixed(1)} KB`;
    if (!draft.targetFileSizeKb) return `Edits are ready (${actualSize}). Select Download Edited Image to save the file.`;
    const target = `${draft.targetFileSizeKb} KB`;
    if (result === 'png') return `PNG is lossless, so the file is ${actualSize}; the ${target} target could not be applied exactly.`;
    if (result === 'minimum-above-target') return `The smallest available JPEG is ${actualSize}, which is above the ${target} target. Reduce the output dimensions for a smaller file.`;
    if (result === 'below-target-at-maximum-quality') return `The highest-quality JPEG is ${actualSize}, below the ${target} target. It was kept at maximum quality.`;
    return `Edits are ready at ${actualSize}, close to the ${target} target. Select Download Edited Image to save the file.`;
}

async function submitImageEdit() {
    const draft = activeImageEditorDraft();
    if (!draft.image || !draft.isEditing) {
        updateImageEditorStatus('Upload and edit an image before submitting.', 'error');
        return;
    }
    updateImageEditorControls();
    const canvas = imageEditorElement('image-editor-canvas');
    updateImageEditorStatus('Preparing your edited image…', 'info');
    try {
        const { blob, result } = await createImageEditorResultBlob(canvas, draft);
        if (!blob) {
            updateImageEditorStatus('The edited image could not be created. Please try again.', 'error');
            return;
        }
        revokeImageEditorResult(draft);
        draft.resultBlob = blob;
        draft.resultUrl = URL.createObjectURL(blob);
        if (draft === activeImageEditorDraft()) {
            const dlGroup = imageEditorElement('image-editor-download-group');
            if (dlGroup) dlGroup.classList.remove('hidden');
            imageEditorElement('image-editor-download-btn')?.classList.remove('hidden');
            updateImageEditorStatus(imageEditorResultStatusMessage(draft, result, blob), 'success');
        }
    } catch (error) {
        updateImageEditorStatus('The edited image could not be created. Please try again.', 'error');
    }
}

function downloadEditedImage() {
    const draft = activeImageEditorDraft();
    if (!draft.resultBlob || !draft.resultUrl) {
        updateImageEditorStatus('Submit the edits before downloading.', 'error');
        return;
    }
    const baseName = (draft.fileName || imageEditorActiveType).replace(/\.[^.]+$/, '') || imageEditorActiveType;
    const link = document.createElement('a');
    link.href = draft.resultUrl;
    link.download = `${baseName}-edited.${draft.format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    updateImageEditorStatus(`Download started in ${draft.format.toUpperCase()} format.`, 'success');
}

async function copyEditedImageToClipboard() {
    const draft = activeImageEditorDraft();
    if (!draft.resultBlob) {
        updateImageEditorStatus('Generate output before copying to clipboard.', 'error');
        return;
    }
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            // Browsers require PNG for clipboard image
            const canvas = imageEditorElement('image-editor-canvas');
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    updateImageEditorStatus('Could not copy image to clipboard.', 'error');
                    return;
                }
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                updateImageEditorStatus('Image copied to clipboard! You can paste (Ctrl+V) directly into application forms.', 'success');
            }, 'image/png');
        } else {
            updateImageEditorStatus('Clipboard copying is not supported on this browser. Use Download instead.', 'info');
        }
    } catch (err) {
        console.warn('Clipboard write error:', err);
        updateImageEditorStatus('Could not copy to clipboard. Please use the Download button.', 'info');
    }
}

// Service Catalog Category Filtering
function filterServiceCategory(category, btnElement) {
    const tabs = document.querySelectorAll('#service-category-tabs button');
    tabs.forEach(tab => {
        tab.className = "px-3 py-1.5 rounded-lg bg-white text-gray-600 hover:bg-gray-100 border border-gray-200";
    });
    btnElement.className = "px-3 py-1.5 rounded-lg bg-purple-600 text-white shadow-sm font-semibold border border-purple-600 active-tab";

    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Live Service Search
function filterServices() {
    const query = document.getElementById('service-search-input').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        const name = card.dataset.name || '';
        if (name.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Live Customer Table Search
function filterCustomerTable() {
    const query = document.getElementById('customer-search-input').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#customers-table-body tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Quick Action Triggers
function triggerQuickAction(actionName) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.(`Please log in to use "${actionName}".`);
        return;
    }
    openModal('billModal');
    document.getElementById('bill-service-name').value = actionName;
    document.getElementById('bill-amount').value = actionName.includes('Print') ? '20' : '50';
    updateBillTotal();
}

// ============================================================
// PASSPORT PHOTO PRINT STUDIO — Split-panel, 3-step redesign
// ============================================================
const passportPhotoState = window.passportPhotoState = {
    imageUrl: '',
    fileName: '',
    image: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    bgColor: 'original',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    currentSlide: 1   // 1=Photo Setup, 2=Crop & Adjust, 3=Color Edit
};

// ── Step indicator ──────────────────────────────────────────
function updatePpsStepIndicator(activeSlide) {
    for (let i = 1; i <= 3; i++) {
        const stepEl  = document.getElementById(`pps-step-${i}`);
        const numEl   = document.getElementById(`pps-step-num-${i}`);
        if (!stepEl || !numEl) continue;
        stepEl.classList.remove('is-active', 'is-done');
        if (i < activeSlide) {
            stepEl.classList.add('is-done');
            numEl.innerHTML = '<i class="fa-solid fa-check text-[9px]"></i>';
        } else if (i === activeSlide) {
            stepEl.classList.add('is-active');
            numEl.textContent = String(i);
        } else {
            numEl.textContent = String(i);
        }
    }
    // Connector lines
    const line1 = document.getElementById('pps-line-1');
    const line2 = document.getElementById('pps-line-2');
    if (line1) line1.classList.toggle('is-done', activeSlide > 1);
    if (line2) line2.classList.toggle('is-done', activeSlide > 2);
}

// ── Nav bar renderer ────────────────────────────────────────
function renderPpsNav(slideNum) {
    const nav = document.getElementById('pps-nav');
    if (!nav) return;
    const hasPhoto = !!passportPhotoState.image;
    if (slideNum === 1) {
        nav.innerHTML = `
            <button type="button" onclick="closePassportPhotoModal()" class="pps-btn-back">
                <i class="fa-solid fa-xmark"></i> Cancel
            </button>
            <button type="button" onclick="goToPassportSlide(2)" ${hasPhoto ? '' : 'disabled'} class="pps-btn-next" id="pps-next-1">
                Crop &amp; Adjust <i class="fa-solid fa-arrow-right"></i>
            </button>`;
    } else if (slideNum === 2) {
        nav.innerHTML = `
            <button type="button" onclick="goToPassportSlide(1)" class="pps-btn-back">
                <i class="fa-solid fa-arrow-left"></i> Back
            </button>
            <button type="button" onclick="goToPassportSlide(3)" class="pps-btn-next">
                Color Edit <i class="fa-solid fa-arrow-right"></i>
            </button>`;
    } else if (slideNum === 3) {
        nav.innerHTML = `
            <button type="button" onclick="goToPassportSlide(2)" class="pps-btn-back">
                <i class="fa-solid fa-arrow-left"></i> Back
            </button>
            <button type="button" onclick="showPassportPhotoLayout()" class="pps-btn-generate">
                <i class="fa-solid fa-print"></i> Generate A4 Layout
            </button>`;
    }
}

// -- Slide transition -----------------------------------------
function goToPassportSlide(n) {
    if (!passportPhotoState.image && n > 1) {
        alert('Please upload a photo first.');
        return;
    }
    passportPhotoState.currentSlide = n;
    const track = document.getElementById('pps-slides-track');
    if (track) track.style.transform = `translateX(-${(n - 1) * 100}%)`;
    updatePpsStepIndicator(n);
    renderPpsNav(n);
    setTimeout(() => updatePassportCropPreview(), 50);
}

// -- Left panel state -----------------------------------------
function showPpsUploadZone() {
    const zone    = document.getElementById('pps-upload-zone');
    const preview = document.getElementById('pps-preview-panel');
    if (zone)    zone.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
}

let ppsGuidesVisible = true;
let isDraggingPpsPreview = false;
let ppsDragStartX = 0;
let ppsDragStartY = 0;
let ppsInitialPanX = 0;
let ppsInitialPanY = 0;

function togglePassportGuides() {
    ppsGuidesVisible = !ppsGuidesVisible;
    const guides = document.getElementById('pps-live-guides');
    const btn = document.getElementById('pps-toggle-guides-btn');
    if (guides) guides.classList.toggle('hidden', !ppsGuidesVisible);
    if (btn) btn.classList.toggle('is-active', ppsGuidesVisible);
}

function updatePassportBackdropBadge() {
    const swatch = document.getElementById('pps-backdrop-swatch');
    const nameEl = document.getElementById('pps-backdrop-name');
    if (!swatch || !nameEl) return;
    const colorNames = {
        'original': 'Original',
        '#ffffff': 'White',
        '#cbe4fb': 'Light Blue',
        '#e2e8f0': 'Light Gray'
    };
    nameEl.textContent = colorNames[passportPhotoState.bgColor] || passportPhotoState.bgColor;
    if (passportPhotoState.bgColor === 'original') {
        swatch.style.backgroundColor = 'transparent';
        swatch.style.backgroundImage = 'radial-gradient(#94a3b8 1px, transparent 1px)';
        swatch.style.backgroundSize = '4px 4px';
    } else {
        swatch.style.backgroundImage = 'none';
        swatch.style.backgroundColor = passportPhotoState.bgColor;
    }
}

function initPpsDragEvents() {
    const stage = document.getElementById('pps-live-stage');
    if (!stage || stage.dataset.dragInit === 'true') return;
    stage.dataset.dragInit = 'true';

    const onPointerDown = (e) => {
        if (!passportPhotoState.image) return;
        isDraggingPpsPreview = true;
        ppsDragStartX = e.clientX;
        ppsDragStartY = e.clientY;
        ppsInitialPanX = passportPhotoState.panX;
        ppsInitialPanY = passportPhotoState.panY;
        if (stage.setPointerCapture) {
            try { stage.setPointerCapture(e.pointerId); } catch (_) {}
        }
    };

    const onPointerMove = (e) => {
        if (!isDraggingPpsPreview || !passportPhotoState.image) return;
        const deltaX = e.clientX - ppsDragStartX;
        const deltaY = e.clientY - ppsDragStartY;

        const config = getPassportPhotoConfig();
        const frameWidth = stage.clientWidth || 220;
        const frameHeight = frameWidth * (config.height / config.width);
        const metrics = getPassportCropMetrics(frameWidth, frameHeight);
        if (!metrics) return;

        if (metrics.travelX > 0) {
            passportPhotoState.panX = Math.max(-1, Math.min(1, ppsInitialPanX + deltaX / metrics.travelX));
        }
        if (metrics.travelY > 0) {
            passportPhotoState.panY = Math.max(-1, Math.min(1, ppsInitialPanY + deltaY / metrics.travelY));
        }
        syncPassportEditControls();
        updatePassportCropPreview();
    };

    const onPointerUp = (e) => {
        isDraggingPpsPreview = false;
        if (stage.releasePointerCapture) {
            try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
        }
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);

    stage.addEventListener('wheel', (e) => {
        if (!passportPhotoState.image) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        passportPhotoState.zoom = Math.max(1, Math.min(3, passportPhotoState.zoom + delta));
        syncPassportEditControls();
        updatePassportCropPreview();
    }, { passive: false });
}

window.addEventListener('resize', () => {
    if (passportPhotoState.image) {
        updatePassportCropPreview();
    }
});

function showPpsPreviewPanel(imageUrl, fileName) {
    const zone         = document.getElementById('pps-upload-zone');
    const preview      = document.getElementById('pps-preview-panel');
    const previewImg   = document.getElementById('pps-fixed-preview');
    const filenameLbl  = document.getElementById('pps-preview-filename');

    if (zone)        zone.classList.add('hidden');
    if (preview)     preview.classList.remove('hidden');
    if (previewImg)  previewImg.src = imageUrl;
    if (filenameLbl) filenameLbl.textContent = fileName || 'photo.jpg';

    initPpsDragEvents();
    updatePassportCropPreview();
}

// -- Layout view toggle ---------------------------------------
function showPpsLayoutView() {
    const body   = document.getElementById('pps-body');
    const layout = document.getElementById('pps-layout-view');
    if (body)   body.classList.add('hidden');
    if (layout) { layout.classList.remove('hidden'); layout.style.display = 'flex'; }
}

function hidePpsLayoutView() {
    const body   = document.getElementById('pps-body');
    const layout = document.getElementById('pps-layout-view');
    if (body)   body.classList.remove('hidden');
    if (layout) { layout.classList.add('hidden'); layout.style.display = ''; }
}

// -- Replace photo button -------------------------------------
function triggerReplacePhoto() {
    const input = document.getElementById('passport-photo-file');
    if (input) input.click();
}

// -- Existing helpers -----------------------------------------
function handlePassportBgChoice(colorVal) {
    passportPhotoState.bgColor = colorVal;
    updatePassportBackdropBadge();
    updatePassportCropPreview();
}

function rotatePassportPhoto() {
    passportPhotoState.rotation = (passportPhotoState.rotation + 90) % 360;
    updatePassportCropPreview();
}

function getPassportPhotoConfig() {
    const sizeSelect = document.getElementById('passport-photo-size');
    const [width, height] = sizeSelect.value.split('x').map(Number);
    const count = Number(document.getElementById('passport-photo-count').value);
    const sizeLabel = sizeSelect.options[sizeSelect.selectedIndex].dataset.label;
    const paperWidth = 190; // A4 width minus 10 mm margins on each side
    const paperHeight = 277; // A4 height minus 10 mm margins on each side
    const gap = 3;
    const columns = Math.max(1, Math.floor((paperWidth + gap) / (width + gap)));
    const rows = Math.max(1, Math.floor((paperHeight + gap) / (height + gap)));
    const capacity = columns * rows;

    return {
        width,
        height,
        count,
        sizeLabel,
        columns,
        rows,
        capacity,
        sheetCount: Math.ceil(count / capacity)
    };
}

function getPassportPhotoFilterCss() {
    return `brightness(${passportPhotoState.brightness}%) contrast(${passportPhotoState.contrast}%) saturate(${passportPhotoState.saturation}%) grayscale(${passportPhotoState.grayscale}%) sepia(${passportPhotoState.sepia}%) blur(${passportPhotoState.blur}px)`;
}

function getPassportCropMetrics(frameWidth, frameHeight) {
    const source = passportPhotoState.image;
    if (!source) return null;

    const naturalW = source.naturalWidth || source.width || 0;
    const naturalH = source.naturalHeight || source.height || 0;
    if (naturalW <= 0 || naturalH <= 0) return null;

    const rot = (passportPhotoState.rotation % 360 + 360) % 360;
    const isRotatedSideways = (rot === 90 || rot === 270);
    const effW = isRotatedSideways ? naturalH : naturalW;
    const effH = isRotatedSideways ? naturalW : naturalH;

    const baseScale = Math.max(frameWidth / effW, frameHeight / effH);
    const zoom = Number(passportPhotoState.zoom) || 1;
    const drawWidth = naturalW * baseScale * zoom;
    const drawHeight = naturalH * baseScale * zoom;
    const visualWidth = isRotatedSideways ? drawHeight : drawWidth;
    const visualHeight = isRotatedSideways ? drawWidth : drawHeight;

    const travelX = Math.max(0, (visualWidth - frameWidth) / 2);
    const travelY = Math.max(0, (visualHeight - frameHeight) / 2);

    const panX = Number(passportPhotoState.panX) || 0;
    const panY = Number(passportPhotoState.panY) || 0;
    const offsetX = Math.round(panX * travelX * 10) / 10;
    const offsetY = Math.round(panY * travelY * 10) / 10;
    const cx = frameWidth / 2 + offsetX;
    const cy = frameHeight / 2 + offsetY;

    return {
        drawWidth: Math.round(drawWidth),
        drawHeight: Math.round(drawHeight),
        visualWidth,
        visualHeight,
        travelX,
        travelY,
        offsetX,
        offsetY,
        cx,
        cy
    };
}

function updatePassportCropPreview() {
    const editor = document.getElementById('passport-photo-editor');
    if (!passportPhotoState.image) {
        if (editor) editor.classList.add('hidden');
        return;
    }

    if (editor) editor.classList.remove('hidden');
    const config = getPassportPhotoConfig();
    const filterCss = getPassportPhotoFilterCss();
    const rotDeg = passportPhotoState.rotation;
    const bg = passportPhotoState.bgColor !== 'original' ? passportPhotoState.bgColor : '#ffffff';

    // 1. Update Left Side Live Preview Stage
    const liveStage = document.getElementById('pps-live-stage');
    const liveImg = document.getElementById('pps-fixed-preview');
    if (liveStage && liveImg) {
        liveStage.style.aspectRatio = `${config.width} / ${config.height}`;
        liveStage.style.backgroundColor = bg;

        const liveFrameWidth = liveStage.clientWidth || 220;
        const liveFrameHeight = liveFrameWidth * (config.height / config.width);
        const liveMetrics = getPassportCropMetrics(liveFrameWidth, liveFrameHeight);
        if (liveMetrics) {
            liveImg.src = passportPhotoState.imageUrl;
            liveImg.style.width = `${liveMetrics.drawWidth}px`;
            liveImg.style.height = `${liveMetrics.drawHeight}px`;
            liveImg.style.left = '50%';
            liveImg.style.top = '50%';
            liveImg.style.transform = `translate(calc(-50% + ${liveMetrics.offsetX}px), calc(-50% + ${liveMetrics.offsetY}px)) rotate(${rotDeg}deg)`;
            liveImg.style.filter = filterCss;
        }
    }

    // 2. Update Secondary Crop Stage inside Slide 2
    const cropStage = document.getElementById('passport-crop-stage');
    const cropImage = document.getElementById('passport-crop-image');
    if (cropStage && cropImage) {
        cropStage.style.aspectRatio = `${config.width} / ${config.height}`;
        cropStage.style.backgroundColor = bg;

        const cropFrameWidth = cropStage.clientWidth || 220;
        const cropFrameHeight = cropFrameWidth * (config.height / config.width);
        const cropMetrics = getPassportCropMetrics(cropFrameWidth, cropFrameHeight);
        if (cropMetrics) {
            cropImage.src = passportPhotoState.imageUrl;
            cropImage.style.width = `${cropMetrics.drawWidth}px`;
            cropImage.style.height = `${cropMetrics.drawHeight}px`;
            cropImage.style.left = '50%';
            cropImage.style.top = '50%';
            cropImage.style.transform = `translate(calc(-50% + ${cropMetrics.offsetX}px), calc(-50% + ${cropMetrics.offsetY}px)) rotate(${rotDeg}deg)`;
            cropImage.style.filter = filterCss;
        }
    }

    // 3. Update badges and metadata
    const badgeText = document.getElementById('pps-badge-text');
    if (badgeText) {
        badgeText.textContent = `${config.width} � ${config.height} mm � Ready`;
    }
    updatePassportBackdropBadge();
}

function syncPassportEditControlLabels() {
    document.getElementById('passport-crop-zoom-value').textContent = `${Math.round(passportPhotoState.zoom * 100)}%`;
    document.getElementById('passport-crop-x-value').textContent = passportPhotoState.panX === 0 ? 'Centre' : (passportPhotoState.panX > 0 ? 'Right' : 'Left');
    document.getElementById('passport-crop-y-value').textContent = passportPhotoState.panY === 0 ? 'Centre' : (passportPhotoState.panY > 0 ? 'Down' : 'Up');
    document.getElementById('passport-photo-brightness-value').textContent = `${passportPhotoState.brightness}%`;
    document.getElementById('passport-photo-contrast-value').textContent = `${passportPhotoState.contrast}%`;
    document.getElementById('passport-photo-saturation-value').textContent = `${passportPhotoState.saturation}%`;
    document.getElementById('passport-photo-blur-value').textContent = `${passportPhotoState.blur}px`;
}

function syncPassportEditControls() {
    document.getElementById('passport-crop-zoom').value = Math.round(passportPhotoState.zoom * 100);
    document.getElementById('passport-crop-x').value = Math.round(passportPhotoState.panX * 100);
    document.getElementById('passport-crop-y').value = Math.round(passportPhotoState.panY * 100);
    document.getElementById('passport-photo-brightness').value = passportPhotoState.brightness;
    document.getElementById('passport-photo-contrast').value = passportPhotoState.contrast;
    document.getElementById('passport-photo-saturation').value = passportPhotoState.saturation;
    document.getElementById('passport-photo-blur').value = passportPhotoState.blur;
    syncPassportEditControlLabels();
}

function updatePassportCropFromControls() {
    passportPhotoState.zoom = Number(document.getElementById('passport-crop-zoom').value) / 100;
    passportPhotoState.panX = Number(document.getElementById('passport-crop-x').value) / 100;
    passportPhotoState.panY = Number(document.getElementById('passport-crop-y').value) / 100;
    syncPassportEditControlLabels();
    updatePassportCropPreview();
}

function updatePassportColourFromControls() {
    passportPhotoState.brightness = Number(document.getElementById('passport-photo-brightness').value);
    passportPhotoState.contrast   = Number(document.getElementById('passport-photo-contrast').value);
    passportPhotoState.saturation = Number(document.getElementById('passport-photo-saturation').value);
    passportPhotoState.blur       = Number(document.getElementById('passport-photo-blur').value);
    if (document.getElementById('passport-photo-filter').value !== 'bw') {
        passportPhotoState.grayscale = 0;
    }
    if (document.getElementById('passport-photo-filter').value !== 'warm') {
        passportPhotoState.sepia = 0;
    }
    document.getElementById('passport-photo-filter').value = 'custom';
    syncPassportEditControlLabels();
    updatePassportCropPreview();
}

function resetPassportCrop() {
    passportPhotoState.zoom = 1;
    passportPhotoState.panX = 0;
    passportPhotoState.panY = 0;
    passportPhotoState.rotation = 0;
    syncPassportEditControls();
    updatePassportCropPreview();
}

function resetPassportPhotoEdits() {
    passportPhotoState.zoom = 1;
    passportPhotoState.panX = 0;
    passportPhotoState.panY = 0;
    passportPhotoState.rotation = 0;
    passportPhotoState.bgColor = 'original';
    passportPhotoState.brightness = 100;
    passportPhotoState.contrast = 100;
    passportPhotoState.saturation = 100;
    passportPhotoState.grayscale = 0;
    passportPhotoState.sepia = 0;
    passportPhotoState.blur = 0;
    document.getElementById('passport-photo-filter').value = 'original';
    const bgOriginal = document.querySelector('input[name="passport-bg-choice"][value="original"]');
    if (bgOriginal) bgOriginal.checked = true;
    syncPassportEditControls();
    updatePassportCropPreview();
}

function applyPassportPhotoFilterPreset() {
    const presets = {
        original: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, blur: 0 },
        natural:  { brightness: 103, contrast: 102, saturation: 104, grayscale: 0, sepia: 0, blur: 0 },
        vivid:    { brightness: 103, contrast: 112, saturation: 130, grayscale: 0, sepia: 0, blur: 0 },
        warm:     { brightness: 103, contrast: 104, saturation: 108, grayscale: 0, sepia: 14, blur: 0 },
        soft:     { brightness: 108, contrast: 92,  saturation: 88,  grayscale: 0, sepia: 0, blur: 0.4 },
        bw:       { brightness: 105, contrast: 118, saturation: 0,   grayscale: 100, sepia: 0, blur: 0 }
    };
    const filterName = document.getElementById('passport-photo-filter').value;
    if (filterName === 'custom') return;
    Object.assign(passportPhotoState, presets[filterName]);
    syncPassportEditControls();
    updatePassportCropPreview();
}

function handlePassportPhotoSizeChange() {
    updatePassportPhotoSelectionSummary();
    resetPassportCrop();
}

function createProcessedPassportPhoto() {
    if (!passportPhotoState.image) return '';
    const config = getPassportPhotoConfig();
    const dpi = 300;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((config.width / 25.4) * dpi);
    canvas.height = Math.round((config.height / 25.4) * dpi);
    const context = canvas.getContext('2d');
    const metrics = getPassportCropMetrics(canvas.width, canvas.height);
    if (!metrics) return '';

    context.fillStyle = passportPhotoState.bgColor !== 'original' ? passportPhotoState.bgColor : '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = getPassportPhotoFilterCss();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    context.save();
    context.translate(metrics.cx, metrics.cy);
    context.rotate((passportPhotoState.rotation * Math.PI) / 180);
    context.drawImage(
        passportPhotoState.image,
        -metrics.drawWidth / 2,
        -metrics.drawHeight / 2,
        metrics.drawWidth,
        metrics.drawHeight
    );
    context.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
}

function downloadPassportSinglePhoto() {
    const dataUrl = createProcessedPassportPhoto();
    if (!dataUrl) return;
    const config = getPassportPhotoConfig();
    const link = document.createElement('a');
    link.download = `passport-photo-${config.width}x${config.height}mm.jpg`;
    link.href = dataUrl;
    link.click();
}

function downloadPassportPhotoSheet() {
    const config = getPassportPhotoConfig();
    const processedPhoto = createProcessedPassportPhoto();
    if (!processedPhoto) return;

    const dpi = 300;
    const a4WidthPx  = Math.round((210 / 25.4) * dpi);
    const a4HeightPx = Math.round((297 / 25.4) * dpi);
    const marginPx   = Math.round((10 / 25.4) * dpi);
    const gapPx      = Math.round((3 / 25.4) * dpi);
    const photoWidthPx  = Math.round((config.width  / 25.4) * dpi);
    const photoHeightPx = Math.round((config.height / 25.4) * dpi);

    const canvas = document.createElement('canvas');
    canvas.width = a4WidthPx;
    canvas.height = a4HeightPx;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4WidthPx, a4HeightPx);

    const img = new Image();
    img.onload = () => {
        const photosOnSheet = Math.min(config.count, config.capacity);
        for (let i = 0; i < photosOnSheet; i++) {
            const col = i % config.columns;
            const row = Math.floor(i / config.columns);
            const x = marginPx + col * (photoWidthPx + gapPx);
            const y = marginPx + row * (photoHeightPx + gapPx);

            ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx);

            // Light border outline for cutting guide
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
        }

        const link = document.createElement('a');
        link.download = `passport-sheet-${config.count}-photos-A4.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    };
    img.src = processedPhoto;
}

// ── setPassportPhotoStep: compatibility shim + new behaviour ─
function setPassportPhotoStep(step) {
    if (step === 'layout') {
        showPpsLayoutView();
        updatePpsStepIndicator(4); // all 3 steps done
        // Mark all done
        for (let i = 1; i <= 3; i++) {
            const stepEl = document.getElementById(`pps-step-${i}`);
            const numEl  = document.getElementById(`pps-step-num-${i}`);
            if (stepEl) { stepEl.classList.remove('is-active'); stepEl.classList.add('is-done'); }
            if (numEl)  numEl.innerHTML = '<i class="fa-solid fa-check text-[9px]"></i>';
        }
        const l1 = document.getElementById('pps-line-1');
        const l2 = document.getElementById('pps-line-2');
        if (l1) l1.classList.add('is-done');
        if (l2) l2.classList.add('is-done');
        return;
    }
    // 'upload' — go back to step 1
    hidePpsLayoutView();
    goToPassportSlide(1);
}

function resetPassportPhotoStudio() {
    if (passportPhotoState.imageUrl) URL.revokeObjectURL(passportPhotoState.imageUrl);
    passportPhotoState.imageUrl = '';
    passportPhotoState.fileName = '';
    passportPhotoState.image = null;
    passportPhotoState.currentSlide = 1;

    // Reset file input
    const fileInput = document.getElementById('passport-photo-file');
    if (fileInput) fileInput.value = '';

    // Reset left panel to upload state
    showPpsUploadZone();

    // Reset right panel to slide 1
    const track = document.getElementById('pps-slides-track');
    if (track) track.style.transform = 'translateX(0)';
    updatePpsStepIndicator(1);
    renderPpsNav(1);

    // Hide layout view, show edit body
    hidePpsLayoutView();

    // Reset form values
    const sizeEl  = document.getElementById('passport-photo-size');
    const countEl = document.getElementById('passport-photo-count');
    if (sizeEl)  sizeEl.value = '35x45';
    if (countEl) countEl.value = '8';

    // Clear print area
    const printArea = document.getElementById('passport-print-area');
    if (printArea) printArea.replaceChildren();

    updatePassportPhotoSelectionSummary();
    resetPassportPhotoEdits();
}

function openPassportPhotoModal(options = {}) {
    const modal = document.getElementById('passportPhotoModal');
    const alreadyOpen = modal && !modal.classList.contains('hidden');
    if (!alreadyOpen) resetPassportPhotoStudio();
    openModal('passportPhotoModal', options);
}

function closePassportPhotoModal() {
    resetPassportPhotoStudio();
    closeModal('passportPhotoModal');
}

function passportPhotoSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file.');
        event.target.value = '';
        return;
    }

    if (passportPhotoState.imageUrl) URL.revokeObjectURL(passportPhotoState.imageUrl);
    passportPhotoState.imageUrl = URL.createObjectURL(file);
    passportPhotoState.fileName = file.name;
    passportPhotoState.image = null;

    // Show fixed preview on left panel immediately
    showPpsPreviewPanel(passportPhotoState.imageUrl, file.name);

    // Disable next on slide 1 while image loads
    renderPpsNav(passportPhotoState.currentSlide);

    const selectedImageUrl = passportPhotoState.imageUrl;
    const sourceImage = new Image();
    sourceImage.onload = () => {
        if (passportPhotoState.imageUrl !== selectedImageUrl) return;
        passportPhotoState.image = sourceImage;
        resetPassportPhotoEdits();
        const badgeText = document.getElementById('pps-badge-text');
        if (badgeText) badgeText.textContent = 'Photo Ready';
        renderPpsNav(passportPhotoState.currentSlide);
        setTimeout(() => updatePassportCropPreview(), 50);
    };
    sourceImage.onerror = () => {
        if (passportPhotoState.imageUrl !== selectedImageUrl) return;
        alert('This image could not be opened. Please choose another photo.');
        showPpsUploadZone();
        renderPpsNav(passportPhotoState.currentSlide);
    };
    sourceImage.src = selectedImageUrl;
}

function updatePassportPhotoSelectionSummary() {
    const config = getPassportPhotoConfig();
    const sheetText = config.sheetCount === 1 ? '1 A4 sheet' : `${config.sheetCount} A4 sheets`;
    const el = document.getElementById('passport-selection-summary');
    if (el) el.textContent = `${config.count} ${config.sizeLabel} photos, organised across ${sheetText}.`;
}

function renderPassportPhotoSheets() {
    const config = getPassportPhotoConfig();
    const processedPhoto = createProcessedPassportPhoto();
    if (!processedPhoto) return;
    const printArea = document.getElementById('passport-print-area');
    const fragment = document.createDocumentFragment();

    for (let sheetIndex = 0; sheetIndex < config.sheetCount; sheetIndex += 1) {
        const sheet = document.createElement('div');
        sheet.className = 'passport-print-sheet passport-sheet-preview';
        sheet.style.setProperty('--photo-columns', config.columns);
        sheet.style.setProperty('--photo-width', `${config.width}mm`);
        sheet.style.setProperty('--photo-height', `${config.height}mm`);

        const firstPhotoIndex = sheetIndex * config.capacity;
        const photosOnSheet = Math.min(config.capacity, config.count - firstPhotoIndex);
        for (let photoIndex = 0; photoIndex < photosOnSheet; photoIndex += 1) {
            const cell = document.createElement('div');
            cell.className = 'passport-photo-cell';
            const image = document.createElement('img');
            image.src = processedPhoto;
            image.alt = `Passport photo ${firstPhotoIndex + photoIndex + 1}`;
            cell.appendChild(image);
            sheet.appendChild(cell);
        }
        fragment.appendChild(sheet);
    }
    printArea.replaceChildren(fragment);
    const summaryEl = document.getElementById('passport-layout-summary');
    if (summaryEl) summaryEl.textContent = `${config.count} copies • ${config.sizeLabel} • ${config.capacity} photos per A4 • ${config.sheetCount} sheet${config.sheetCount === 1 ? '' : 's'} ready`;
}

function showPassportPhotoLayout() {
    if (!passportPhotoState.image) {
        alert('Please wait for the customer photo to finish loading.');
        return;
    }
    renderPassportPhotoSheets();
    setPassportPhotoStep('layout');
}

function showPassportPhotoUpload() {
    setPassportPhotoStep('upload');
}

function printPassportPhotoSheet() {
    if (!passportPhotoState.imageUrl) return;
    document.body.classList.add('passport-photo-printing');
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('passport-photo-printing');
    }, { once: true });
    window.print();
}


let editingCustomerId = null;
let selectedProfilePhotoFile = null;
let profilePhotoPreviewObjectUrl = null;

function showFormAlert(id, message, isError = true) {
    const alert = document.getElementById(id);
    if (!alert) return;
    alert.textContent = message;
    alert.className = `mb-3 rounded-lg px-3 py-2 text-xs ${isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`;
}

function clearFormAlert(id) {
    const alert = document.getElementById(id);
    if (!alert) return;
    alert.textContent = '';
    alert.className = 'hidden mb-3 rounded-lg px-3 py-2 text-xs';
}

function openProfileModal(options = {}) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to view or edit profile.');
        return;
    }
    resetProfilePhotoSelection();
    window.dashboardStore?.populateProfileForm();
    document.getElementById('profile-current-password').value = '';
    clearFormAlert('profile-form-alert');
    openModal('profileModal', options);
}

function closeProfileModal() {
    resetProfilePhotoSelection();
    window.dashboardStore?.populateProfileForm();
    document.getElementById('profile-current-password').value = '';
    clearFormAlert('profile-form-alert');
    closeModal('profileModal');
}

function resetProfilePhotoSelection() {
    selectedProfilePhotoFile = null;
    if (profilePhotoPreviewObjectUrl) {
        URL.revokeObjectURL(profilePhotoPreviewObjectUrl);
        profilePhotoPreviewObjectUrl = null;
    }
    const input = document.getElementById('profile-photo-file');
    if (input) input.value = '';
    const label = document.getElementById('profile-photo-file-name');
    if (label) label.textContent = 'JPG, PNG or WEBP · Maximum 5 MB';
}

function profilePhotoSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedImageTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
        resetProfilePhotoSelection();
        window.dashboardStore?.populateProfileForm();
        showFormAlert('profile-form-alert', 'Choose a JPG, PNG, or WEBP image that is 5 MB or smaller.');
        return;
    }

    if (profilePhotoPreviewObjectUrl) URL.revokeObjectURL(profilePhotoPreviewObjectUrl);
    selectedProfilePhotoFile = file;
    profilePhotoPreviewObjectUrl = URL.createObjectURL(file);
    const preview = document.getElementById('profile-photo-preview');
    if (preview) preview.src = profilePhotoPreviewObjectUrl;
    const label = document.getElementById('profile-photo-file-name');
    if (label) label.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    clearFormAlert('profile-form-alert');
}

function profileErrorMessage(error) {
    const messages = {
        'auth/wrong-password': 'The current password is incorrect.',
        'auth/invalid-credential': 'The current password is incorrect.',
        'auth/email-already-in-use': 'That email address is already in use by another account.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/requires-recent-login': 'Please log out and log in again before changing your email.',
        'auth/operation-not-allowed': 'Email changes are not enabled for this Firebase project. Check Firebase Authentication settings.',
        'storage/unauthorized': 'Photo upload permission was denied. Deploy the Firebase Storage rules first.',
        'storage/unknown': 'The photo could not be uploaded. Please check Firebase Storage and try again.'
    };
    return messages[error?.code] || 'Profile could not be saved. Please try again.';
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    const saveButton = document.getElementById('profile-save-btn');
    const profileUpdate = {
        email: document.getElementById('profile-email').value,
        address: document.getElementById('profile-address').value,
        centerName: document.getElementById('profile-center-name').value,
        currentPassword: document.getElementById('profile-current-password').value,
        photoFile: selectedProfilePhotoFile
    };

    clearFormAlert('profile-form-alert');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
        const result = await window.dashboardStore.updateUserProfile(profileUpdate);
        document.getElementById('profile-current-password').value = '';
        if (result.photoUploaded) resetProfilePhotoSelection();
        showFormAlert('profile-form-alert', result.emailVerificationSent
            ? 'Address saved. A verification link was sent to the new email address.'
            : 'Profile updated successfully.', false);
    } catch (error) {
        showFormAlert('profile-form-alert', profileErrorMessage(error));
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

function openNewCustomerModal(options = {}) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to add customers.');
        return;
    }
    const modal = document.getElementById('addCustomerModal');
    const alreadyOpen = modal && !modal.classList.contains('hidden');
    if (!alreadyOpen) {
        editingCustomerId = null;
        document.getElementById('add-customer-form').reset();
        document.getElementById('customer-modal-title').textContent = 'Add New Customer';
        document.getElementById('customer-save-btn').textContent = 'Save Customer';
        clearFormAlert('customer-form-alert');
    }
    openModal('addCustomerModal', options);
}

function closeCustomerModal() {
    editingCustomerId = null;
    document.getElementById('add-customer-form').reset();
    clearFormAlert('customer-form-alert');
    closeModal('addCustomerModal');
}

function openQuickServiceModal(serviceName) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.(`Please log in to apply for "${serviceName}".`);
        return;
    }
    openNewCustomerModal();
    document.getElementById('modal-cust-service').value = serviceName;
}

function openAddTransactionModal(type) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.(`Please log in to record ${type} transactions.`);
        return;
    }
    document.getElementById('add-transaction-form').reset();
    document.getElementById('modal-txn-type').value = type;
    document.getElementById('txn-type-title').innerText = type;
    clearFormAlert('transaction-form-alert');
    openModal('addTransactionModal');
}

function closeTransactionModal() {
    document.getElementById('add-transaction-form').reset();
    clearFormAlert('transaction-form-alert');
    closeModal('addTransactionModal');
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    const saveButton = document.getElementById('customer-save-btn');
    const originalLabel = editingCustomerId ? 'Update Customer' : 'Save Customer';
    const customer = {
        name: document.getElementById('modal-cust-name').value,
        phone: document.getElementById('modal-cust-phone').value,
        service: document.getElementById('modal-cust-service').value,
        amount: document.getElementById('modal-cust-amount').value,
        status: document.getElementById('modal-cust-status').value,
        paymentMethod: document.getElementById('modal-cust-method').value
    };

    clearFormAlert('customer-form-alert');
    saveButton.disabled = true;
    saveButton.textContent = editingCustomerId ? 'Updating…' : 'Saving…';
    try {
        await window.dashboardStore.saveCustomer(customer, editingCustomerId);
        closeCustomerModal();
    } catch (error) {
        showFormAlert('customer-form-alert', error.message || 'Customer could not be saved. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalLabel;
    }
}

function startCustomerEdit(customer) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to edit customer details.');
        return;
    }
    editingCustomerId = customer.id;
    document.getElementById('modal-cust-name').value = customer.name || '';
    document.getElementById('modal-cust-phone').value = customer.phone || '';
    document.getElementById('modal-cust-service').value = customer.service || '';
    document.getElementById('modal-cust-amount').value = customer.amount ?? '';
    document.getElementById('modal-cust-status').value = customer.status || 'Paid';
    document.getElementById('modal-cust-method').value = customer.paymentMethod || 'UPI';
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    document.getElementById('customer-save-btn').textContent = 'Update Customer';
    clearFormAlert('customer-form-alert');
    openModal('addCustomerModal');
}

async function deleteCustomerRecord(customer) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to delete customer records.');
        return;
    }
    if (!confirm(`Delete ${customer.name || 'this customer'} permanently?`)) return;
    try {
        await window.dashboardStore.deleteCustomer(customer.id);
    } catch (error) {
        alert(error.message || 'Customer could not be deleted. Please try again.');
    }
}

async function confirmCustomerTransaction(customer, button) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to confirm transactions.');
        return;
    }
    if (customer.transactionId) {
        alert('A transaction has already been recorded for this customer.');
        return;
    }

    const confirmationMessage = `Confirm payment of Rs. ${Number(customer.amount || 0).toFixed(2)} from ${customer.name || 'this customer'}?\n\nThis will add an Income entry to Recent Transactions.`;
    if (!confirm(confirmationMessage)) return;

    const originalIcon = button?.innerHTML;
    if (button) {
        button.disabled = true;
        button.classList.add('opacity-60', 'cursor-wait');
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        await window.dashboardStore.recordCustomerTransaction(customer.id);
    } catch (error) {
        alert(error.message || 'The customer transaction could not be recorded. Please try again.');
        if (button) {
            button.disabled = false;
            button.classList.remove('opacity-60', 'cursor-wait');
            button.innerHTML = originalIcon;
        }
    }
}

function viewCustomerRecord(customer) {
    if (!window.isUserLoggedIn?.()) {
        window.openAuthModal?.('Please log in to view customer receipts.');
        return;
    }
    openModal('billModal');
    document.getElementById('bill-cust-name').value = customer.name || '';
    document.getElementById('bill-service-name').value = customer.service || '';
    document.getElementById('bill-amount').value = Number(customer.amount) || 0;
    document.getElementById('bill-gst').value = 0;
    updateBillTotal();
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const saveButton = document.getElementById('transaction-save-btn');
    const transaction = {
        name: document.getElementById('modal-txn-name').value,
        category: document.getElementById('modal-txn-cat').value,
        amount: document.getElementById('modal-txn-amount').value,
        method: document.getElementById('modal-txn-method').value,
        type: document.getElementById('modal-txn-type').value
    };

    clearFormAlert('transaction-form-alert');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
        await window.dashboardStore.saveTransaction(transaction);
        closeTransactionModal();
    } catch (error) {
        showFormAlert('transaction-form-alert', error.message || 'Transaction could not be saved. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Record Transaction';
    }
}

// Bill Dynamic Calculation
function updateBillTotal() {
    const amt = Math.max(0, Number(document.getElementById('bill-amount').value) || 0);
    const gst = Math.max(0, Number(document.getElementById('bill-gst').value) || 0);
    const total = amt + gst;
    document.getElementById('bill-total-disp').innerText = `₹${total.toFixed(2)}`;
}

// Print only the receipt, keeping the dashboard and modal controls off paper.
function printInvoice() {
    if (!document.getElementById('bill-cust-name').value.trim() || !document.getElementById('bill-service-name').value.trim()) {
        alert('Enter a customer name and service before printing.');
        return;
    }
    if (!['bill-amount', 'bill-gst'].every(id => document.getElementById(id).reportValidity())) return;
    updateBillTotal();
    document.getElementById('inv-date').textContent = new Date().toLocaleDateString('en-IN');
    document.getElementById('inv-no').textContent = `#INV-${Date.now().toString(36).toUpperCase()}`;
    document.body.classList.add('invoice-printing');
    window.addEventListener('afterprint', () => document.body.classList.remove('invoice-printing'), { once: true });
    window.print();
}

// Load the PDF engines once, only when a file operation needs them. Failed loads can retry.
let pdfLibrariesPromise;
function ensurePdfLibraries() {
    if (!pdfLibrariesPromise) {
        const load = (src, globalName) => new Promise((resolve, reject) => {
            if (window[globalName]) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => {
                script.remove();
                reject(new Error('PDF tools could not load. Check your connection and try again.'));
            };
            document.head.appendChild(script);
        });
        pdfLibrariesPromise = Promise.all([
            load('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib'),
            load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib')
        ]).catch(error => { pdfLibrariesPromise = null; throw error; });
    }
    return pdfLibrariesPromise;
}
