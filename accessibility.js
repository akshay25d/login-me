(() => {
    'use strict';
    const dialogs = [...document.querySelectorAll('[id$="Modal"]')];
    const focusable = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const visible = element => !element.closest('[inert]') && element.getClientRects().length && !element.disabled;
    let activeDialog = null;
    let returnFocus = null;
    let inertElements = [];

    dialogs.forEach(dialog => {
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.tabIndex = -1;
        if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
            const heading = dialog.querySelector('h2, h3');
            dialog.setAttribute('aria-label', heading?.textContent.trim() || dialog.id.replace(/Modal$/, '').replace(/([A-Z])/g, ' $1'));
        }
    });

    function syncDialogs() {
        const open = dialogs.filter(dialog => !dialog.classList.contains('hidden') && dialog.getClientRects().length);
        const next = open.sort((a, b) => Number(getComputedStyle(a).zIndex || 0) - Number(getComputedStyle(b).zIndex || 0)).at(-1) || null;
        if (next === activeDialog) return;
        inertElements.forEach(element => { element.inert = false; });
        inertElements = [];
        if (!activeDialog && next) returnFocus = document.activeElement;
        activeDialog = next;
        document.body.classList.toggle('modal-open', Boolean(next));
        if (next) {
            let branch = next;
            while (branch.parentElement && branch !== document.body) {
                [...branch.parentElement.children].forEach(sibling => {
                    if (sibling !== branch && !sibling.inert && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
                        sibling.inert = true;
                        inertElements.push(sibling);
                    }
                });
                branch = branch.parentElement;
            }
            const first = [...next.querySelectorAll(focusable)].find(visible);
            (first || next).focus({ preventScroll: true });
        } else if (returnFocus?.isConnected && visible(returnFocus)) {
            returnFocus.focus({ preventScroll: true });
            returnFocus = null;
        }
    }
    const observer = new MutationObserver(syncDialogs);
    dialogs.forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['class', 'style'] }));
    document.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || !activeDialog) return;
        const controls = [...activeDialog.querySelectorAll(focusable)].filter(visible);
        const first = controls[0] || activeDialog;
        const last = controls.at(-1) || activeDialog;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === activeDialog)) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === activeDialog)) {
            event.preventDefault(); first.focus();
        }
    });
    syncDialogs();

    const menuButton = document.querySelector('.dropbtn');
    const menu = document.querySelector('.dropdown');
    const closeMenu = () => {
        menu?.classList.remove('is-open');
        menuButton?.setAttribute('aria-expanded', 'false');
    };
    menuButton?.addEventListener('click', () => {
        const expanded = menu.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(expanded));
    });
    document.addEventListener('click', event => {
        if (!menu?.contains(event.target) || event.target.closest('a')) closeMenu();
    });
    menu?.addEventListener('keydown', event => {
        if (event.key === 'Escape') { closeMenu(); menuButton.focus(); }
    });
    menu?.addEventListener('focusout', event => { if (!menu.contains(event.relatedTarget)) closeMenu(); });

})();
