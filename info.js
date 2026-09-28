/* ---- Info-page modal helpers ---- */
function openInfoModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}
function closeInfoModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    window.AppRouter?.onModalClosed?.(id);
}
/* Close on backdrop click */
['aboutUsModal','contactUsModal','privacyPolicyModal','termsModal'].forEach(function(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(e){ if (e.target === el) closeInfoModal(id); });
});
