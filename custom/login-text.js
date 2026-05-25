(function () {
    var TARGETS = ['Bem-vindo', 'Welcome back', 'Welcome', 'Bienvenido'];
    function replace() {
        document.querySelectorAll('h1').forEach(function (h) {
            if (TARGETS.indexOf(h.textContent.trim()) !== -1) {
                h.textContent = 'iAZZAS';
            }
        });
    }
    new MutationObserver(replace).observe(document.documentElement, {
        childList: true, subtree: true, characterData: true
    });
    document.addEventListener('DOMContentLoaded', replace);
})();
