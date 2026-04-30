const API = (() => {
  async function request(path, opts = {}) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE}${path}`, { ...opts, headers });
    if (res.status === 401) {
      Auth.logout();
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Request failed');
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function get(path) { return request(path); }
  function post(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
  function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }

  return {
    getMe: () => get('/me'),
    getCurrentLeads: () => get('/leads/current'),
    logCall: (data) => post('/calls/log', data),
    demoAgreed: (data) => post('/calls/demo-agreed', data),
    requestMoreLeads: () => post('/leads/request-more', {}),
    getLeaderboard: () => get('/stats/leaderboard'),
    getMyStreaks: () => get('/stats/me/streaks'),
    setGoal: (target) => post('/goals/set', { target_calls: target }),
    getTodayGoal: () => get('/goals/today'),
    getMyCommissions: () => get('/commissions/me'),
    adminGetCallers: () => get('/admin/callers'),
    adminAddCaller: (data) => post('/admin/callers', data),
    adminPatchCommission: (id, data) => patch(`/admin/commissions/${id}`, data),
  };
})();
