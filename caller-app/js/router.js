const Router = (() => {
  const views = {};
  let currentView = null;
  let container = null;

  function init(containerEl) {
    container = containerEl;
    window.addEventListener('hashchange', navigate);
    navigate();
  }

  function register(name, renderFn) {
    views[name] = renderFn;
  }

  function navigate() {
    const hash = window.location.hash.slice(1) || 'home';
    const viewNames = Object.keys(views);
    const target = viewNames.includes(hash) ? hash : 'home';

    if (currentView === target) return;
    currentView = target;

    container.innerHTML = '';
    container.className = 'view-container anim-fade-in';
    views[target](container);

    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === target);
    });
  }

  function go(name) {
    window.location.hash = name;
  }

  return { init, register, navigate, go };
})();
