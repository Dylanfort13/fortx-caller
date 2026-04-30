const Auth = (() => {
  const TOKEN_KEY = 'fortx_token';
  const CALLER_KEY = 'fortx_caller';

  function save(token, caller) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CALLER_KEY, JSON.stringify(caller));
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getCaller() {
    const raw = localStorage.getItem(CALLER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CALLER_KEY);
    window.location.href = 'index.html';
  }

  async function login(name, pin) {
    const res = await fetch(`${CONFIG.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    save(data.token, data.caller);
    return data.caller;
  }

  return { save, getToken, getCaller, isLoggedIn, logout, login };
})();
