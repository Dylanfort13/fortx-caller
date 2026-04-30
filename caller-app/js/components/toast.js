const Toast = (() => {
  let container;

  function init() {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  function show(message, type = '') {
    if (!container) init();
    const el = document.createElement('div');
    el.className = `toast ${type ? 'toast-' + type : ''}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  return { init, show };
})();
